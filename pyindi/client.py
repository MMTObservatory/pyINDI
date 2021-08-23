import asyncio
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
class INDIConn:
    """Async class to manage the connection to indiserver"""
    def __init__(self):
        self.writer = None
        self.reader = None
        self.timeout = 3
        self.read_width = 30000

    async def connect(self, host, port):
        """Connects to a ip and port"""
        logging.debug('Connecting to indiserver')
        future = asyncio.open_connection(host, int(port))
        # Wait for timeout
        try:
            self.reader, self.writer = await asyncio.wait_for(
                future,
                timeout=self.timeout
            )
        except asyncio.TimeoutError:
            logging.debug('Socket timeout trying to connect')
            raise
        except ConnectionRefusedError:
            logging.debug(f'indiserver is not on')
            raise
        
        return None

    async def disconnect(self):
        """Disconnect from the ip and port"""
        # Check if writer is init
        if self.is_connected:
            logging.debug('Disconnecting from indiserver')
            self.writer.close()
            await self.writer.wait_closed()

            # Reset variables
            self.reset()

        return None
        
    def reset(self):
        """Resets the stream parameters"""
        logging.debug('Resetting stream')
        self.reader = self.writer = None
        return None

    @property
    def is_connected(self):
        return self.writer is not None and self.reader is not None

    @property
    def response(self):
        return self._response

    async def send_msg(self, msg):
        """Sends a message over the connection"""
        logging.debug('Sending message')
        msg = msg.encode()
        self.writer.write(msg)
        await self.writer.drain()

        return None
        
    async def recv_msg(self):
        """Receives a message over the connection"""
        logging.debug('Receiving message')
        if self.reader.at_eof():
                raise Exception("INDI server closed")
        response = await self.reader.read(self.read_width)
        print(response.decode())
        self._response = response.decode()

        return self._response

class INDIClient:
    """This class sends/recvs INDI data to/from the indiserver 
    tcp/ip socket. See the above diagram for help understanding
    its data flow.  """
    def __init__(self):
        return None        

    def start(self, host="localhost", port=7624):
        self.port = port
        self.host = host
        self.lastblob = None
        self.conn = None

    async def xml_from_indiserver(self, data):
        """Model method"""
        raise NotImplemented("This method should be implemented by the subclass")

    async def read_from_indiserver(self):
        """Read data from self.reader and then call xml_from_indiserver with this data as an arg."""
        while self.is_connected:
            response = await self.conn.recv_msg()
            await self.xml_from_indiserver(response)
        
        logging.warning("Finished reading from indiserver")
        return None

    async def connect(self):
        """Attempt to connect to the indiserver in a loop."""
        while True:
            
            task = None
            await self.disconnect()

            try:
                self.conn = INDIConn()
                await self.conn.connect(self.host, self.port)
                logging.debug(
                    f"Connected to indiserver {self.host}:{self.port}"
                )

                self.task = asyncio.gather(
                    self.read_from_indiserver(),
                    return_exceptions=True
                )

                await self.task
                logging.debug("INDI client tasks finished. indiserver crash?")
                
                
            except Exception:
                pass

            finally:
                # If gets here, need to disconnect and retry connection
                if task is not None:
                    task.cancel()
                await self.disconnect()

            await asyncio.sleep(2.0)
            logging.debug("Attempting to connect again")

    async def disconnect(self):
        """Disconnects from client when issue"""
        if self.is_connected:
            await self.conn.disconnect()
            self.conn = None
        
        return None
            
    @property
    def is_connected(self):
        """Checks if it is connected"""
        return self.conn is not None and self.conn.is_connected

    async def xml_to_indiserver(self, xml):
        """Write to indiserver"""
        if self.is_connected:
            try:
                await self.conn.send_msg(xml)

            except Exception as error:
                logging.debug(f"Connection was lost, could not write to indiserver")
                self.disconnect()
                raise
        else:
            logging.critical("Not connected to indiserver")

        return None

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
        

