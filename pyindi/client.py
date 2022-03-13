#!/usr/bin/env python3

# Python imports
import asyncio
import logging

"""
INDIClient runs the task of reading from the driver from indiserver with
asyncio.gather function. This task is read_from_indiserver.
xml_to_indiserver is called from the websocket class when a message
comes in.

INDIClient runs two tasks that are infinite loops and run 
in parallel with the asyncio.gather function. These
tasks, read_from_indiserver and write_to_indiserver, are 
explained in the class diagram below. 

To build an INDIClient application sublcass INDIClient and override
the xml_from_indiserver to retrieve data from the indiserver and
use the xml_to_indiserver method to send data to the indiserver. An
example of this is in webclient.py in this package.  
"""

class INDIConn:
    """Async class to manage the connection to indiserver
    
    Connection class to manage the connection to indiserver.

    Attributes
    ----------
    writer : asyncio connection stream handler
        Handles writing and draining the stream
    reader : asyncio connection stream handler
        Handles reading the stream
    timeout : int
        Timeout for connecting to indiserver using future wait for
    read_width : int
        Amount to read from the stream per read
    """
    def __init__(self):
        self.writer = None
        self.reader = None
        self.timeout = 3
        self.read_width = 30000

    async def connect(self, host, port):
        """Connects to a ip and port
        
        Parameters
        ----------
        host : string
            Host IP address to connect to
        port : int
            Port to connect to

        Returns
        -------
        None
        """
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
        """Disconnect from the ip and port
        
        If conneceted, will close the writer and wait for it to close.
        Then will reset the writer and reader stream handlers.

        Parameters
        ----------
        None

        Returns
        ------
        None
        """
        # Check if writer is init
        if self.is_connected:
            logging.debug('Disconnecting from indiserver')
            self.writer.close()
            await self.writer.wait_closed()

            # Reset variables
            self.reset()

        return None
        
    def reset(self):
        """Resets the stream parameters
        
        Parameters
        ----------
        None

        Returns
        -------
        None
        """
        logging.debug('Resetting stream')
        self.reader = self.writer = None
        return None

    @property
    def is_connected(self):
        """Returns true if writer and reader have been initialized"""
        return self.writer is not None and self.reader is not None

    async def send_msg(self, msg):
        """Sends a message over the connection
        
        Parameters
        ----------
        msg : string
            The message to send to indiserver

        Returns
        -------
        None
        """
        logging.debug('Sending message')
        msg = msg.encode()
        self.writer.write(msg)
        await self.writer.drain()

        return None
        
    async def recv_msg(self):
        """Receives a message over the connection
        
        Parameters
        ----------
        None

        Arguments
        ---------
        None
        """
        logging.debug('Receiving message')
        if self.reader.at_eof():
            raise Exception("INDI server closed")

        response = await self.reader.read(self.read_width)

        return response.decode()

class INDIClient:
    """Async class that sends 
    
    Connection class to manage the connection to indiserver. This class 
    sends/recvs INDI data to/from the indiserver tcp/ip socket. See the 
    above diagram for help understanding its data flow. 

    Attributes
    ----------
    None
    """
    def start(self, host="localhost", port=7624):
        """Initializes the client
        
        Parameters
        ----------
        host : string
            Host IP address to connect to for indiserver
        port : int
            Port to connect to for indiserver
        
        Returns
        -------
        None
        """
        self.port = port
        self.host = host
        self.lastblob = None
        self.conn = None

    async def connect(self):
        """Attempt to connect to the indiserver in a loop

        Once connected, reads from indiserver. Only exits if there is an
        exception and if so, disconnects, clears tasks, and tries to 
        reconnect in 2 seconds. Repeat this until connects.

        Parameters
        ----------
        None

        Returns
        -------
        None
        """
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
                )
                await self.task
                exc = self.task.exception()
                if exc:
                    raise exc

                logging.debug("INDI client tasks finished. indiserver crash?")
                
            except Exception as error:
                logging.debug(f"INDIClient connect error {error}")

            finally:
                # If gets here, need to disconnect and retry connection
                if task is not None:
                    task.cancel()
                await self.disconnect()

            await asyncio.sleep(2.0)
            logging.debug("Attempting to connect again")

    async def disconnect(self):
        """Disconnects from client when issue
        
        Parameters
        ----------
        None

        Returns
        -------
        None
        """
        if self.is_connected:
            await self.conn.disconnect()
            self.conn = None
        
        return None
            
    @property
    def is_connected(self):
        """Checks if it is connected"""
        return self.conn is not None and self.conn.is_connected

    async def read_from_indiserver(self):
        """Reads in xml from indiserver from the driver
        
        indidriver -> indiserver -> this function

        Parameters
        ----------
        None

        Returns
        -------
        None
        """
        while self.is_connected:
            response = await self.conn.recv_msg()
            await self.xml_from_indiserver(response)
        
        logging.warning("Finished reading from indiserver")
        return None

    async def xml_from_indiserver(self):
        """Sends to all clients listening on websocket

        Starting from read_from_indiserver
        read_from_indiserver -> xml_from_indiserver -> websocket

        Parameters
        ----------
        None

        Returns
        -------
        None
        """
        raise NotImplemented("Implement using a subclass!")

    async def xml_to_indiserver(self, msg):
        """Write to indiserver
        
        Starting from websocket
        websocket -> xml_to_indiserver -> indiserver -> indidriver
        Called from webclient.py class INDIWebSocket

        Parameters
        ----------
        msg : string
            XML string to send to indiserver
        
        Returns
        -------
        None
        """
        if self.is_connected:
            try:
                await self.conn.send_msg(msg)

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

        return None
     
    def __getitem__(self, key):
        return self._clients[key]
        

