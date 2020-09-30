import time
import asyncio
from lxml import etree
from tornado.queues import Queue
from collections import namedtuple
import json
from pathlib import Path
import logging



"""
    INDIClient runs two tasks that are infinite loops and run 
    in parallel with the asyncio.gather function. These
    tasks, read_from_indiserver and write_to_indiserver, are 
    explained in the class diagram below. 

        Overall INDI server/client scheme
        --------------------------------------------
       
              ___________________________________________________________       
              | INDIClient                                              |   
              | ----------                                              |
 ____________ |                                                         |
 |          | |             ________________________             _______________________
 |          |---->reader--->|read_from_indiserver()|------------>|xml_from_indiserver()|
 |indiserver| |             ------------------------             -----------------------
 |          | |                                                         |
 |          | |             _______________________              _______|_______________
 |          |<-----writer---|write_to_indiserver()|<--to_indiQ<--|xml_to_indiserver()  |
 ------------ |             -----------------------              -----------------------
              |                                                         |
              -----------------------------------------------------------

    To build an INDIClient application sublcass INDIClient and override
    the xml_from_indiserver to retrieve data from the indiserver and
    use the xml_to_indiserver method to send data to the indiserver. An
    example of this is in webclient.py in this package.  

    TODO:
        it would be nice to remove tornado dependencies in this module. 

"""

class INDIClient:
    """This class sends/recvs INDI data to/from the indiserver 
    tcp/ip socket. See the above diagram for help understanding
    its data flow.  """

    to_indiQ = Queue()


    def start(self, host="localhost", port=7624, read_width=30000):
        self.port = port
        self.host = host
        self.read_width=read_width
        self.lastblob = None


    async def xml_from_indiserver(self, data):

        raise NotImplemented("This method should be implemented by the subclass")


    async def read_from_indiserver(self):

        """Read data from self.reader and then call
        xml_from_indiserver with this data as an arg."""

        while self.running:
            try:
                if self.reader.at_eof():
                    raise Exception("INDI server closed")

                # Read data from indiserver
                data = await self.reader.read(self.read_width)
                await self.xml_from_indiserver(data)


            except Exception as err:
                self.running = 0
                logging.warning(f"Could not read from INDI server {err}")
                raise

        self.writer.close()
        await self.writer.wait_closed()
        logging.warning(f"Finishing read_from_indiserver task")
        

    async def connect(self):
        """Attempt to connect to the indiserver in a loop.
        """
        while 1:
            
            task = None
            try: 
                self.reader, self.writer = await asyncio.open_connection(
                        self.host, self.port)
                logging.debug(f"Connected to indiserver {self.host}:{self.port}")
                self.running = True

                self.task = asyncio.gather(self.read_from_indiserver(),
                        self.write_to_indiserver() )
                await self.task
                logging.debug("INDI client tasks finished. indiserver crash?")
                logging.debug("Attempting to connect again")
                
            except ConnectionRefusedError:
                self.running = False
                logging.debug("Can not connect to INDI server\n")

            except asyncio.TimeoutError:
                logging.debug("Lost connection to INDI server\n")

            finally:
                if task is not None:
                    task.cancel()

            await asyncio.sleep(2.0)

    
    async def xml_to_indiserver(self, xml):
        """
        put the xml argument in the 
        to_indiQ. 
        """
        await self.to_indiQ.put(xml)
        
        

    async def write_to_indiserver(self):
        """Collect INDI data from the from the to_indiQ.
        and send it on its way to the indiserver. 
        """

        while self.running:
            try:
                to_indi = await asyncio.wait_for( self.to_indiQ.get(), 10 )
                logging.debug(f"writing this to indi {to_indi}")
            except asyncio.TimeoutError as error:
                # This allows us to check the self.running state
                # if there is no data in the to_indiQ
                continue
            try:
                self.writer.write(to_indi.encode())
                await self.writer.drain()
            except Exception as err:
                self.running = 0
                logging.debug(f"Could not write to INDI server {err}")

        logging.debug("Finishing write_to_indiserver task")


    
class INDIClientSingleton(INDIClient):
    """
    INDIClient as a singleton. This works well
    if you only want one client and you want 
    to be able to easily access that client
    by simple instantiation. 
    """

    _instance = None

    def __new__(cls, *args, **kwargs):
        """
        Make it a singleton
        """
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance



class INDIClientContainer:

    def __new__(cls, *args, **kwargs):
        """
        Make it a singleton
        """
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._clients = []

        return cls._instance
            

    def create_client(self, *args, **kwargs):
        
        if "client_class" in kwargs:
            if issubclass(kwargs["client_class"], INDIClient):
                client_class = kwargs["client_class"]
                del kwargs["client_class"]
            else:
                raise TypeError(f"client_class must be subclass of INDIClient.")
        else:
            client_class = INDIClient

        client = client_class()
        client.start(*args, **kwargs)
        
        self._clients.append(client)

        return client

    def new_client(self, client=INDIClient):

        self._clients.append(client)
     
   
    def __getitem__(self, key):

        return self._clients[key]
        

