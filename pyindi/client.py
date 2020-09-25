import tornado.web, tornado.ioloop, tornado.websocket
import time
import asyncio
from lxml import etree
from tornado.queues import Queue
from collections import namedtuple
import json
from pathlib import Path
import logging

from xml.sax import ContentHandler
from xml.sax.expatreader import ExpatParser

from io import StringIO, BytesIO

from base64 import b64decode

"""
    This module contains classes and methods to build an INDI
    client webapp. The data flow in this program is a bit 
    confusing. This is made worse because of the somewhat 
    ambiguous terms of server and client. Hopefully this flowchart
    will help:
    

        Overall INDI server/client to webpage scheme
        --------------------------------------------
       
              _____________________________________________________________________       
              | client.py                                                         |
              | ---------                     ___________                         |
              |                 _____get()____|web2indiQ|____put()____________    |
              |                 |             -----------                    |    |
              |                 |                                            |    |
____________  |           ______V_____                      httpclients      |    |
|          | <|--writer---|          |                     _______________   |    |
|indiserver|  |  TCP/IP   |INDIClient|                     |---->client_1|   |    |  
|          | -|--reader-->|          |---indiclient2web()->|---->client_2|   |    | __________
------------  |           ------------               |     |---->...     |<-websoc->|webpages|
              |                 ^                    |     |---->client_n|        | ----------
              |                 |                    |     ---------------        |
              |                 |                    V                            |
              |         _____________            __________________               |
              |         |BlobHandler|<--feed()---|ServerSideClient|               |
              |         -------------            ------------------               |
              ---------------------------------------------------------------------    


   

"""



class WebHandler(tornado.web.RequestHandler):
    """
    Render a simple webpage. 
    The page uses setPropertyCallback
    to render the device given in the url eg:
    If the url string is /dev/(.*) and the 
    url entered into the browser is /dev/mount
    the webpage will send a setPropertyCallback('mount.*')
    and build all the non-BLOB properties into jquery-ui
    widgets. 
    """

    static_path = Path(__file__).parent/"www/index.html"
    
    def get(self, device):
        self.render(str(self.static_path), device_name=device)



class INDIClient:
    """This sends/recvs INDI data to/from the indiserver 
    tcp/ip socket. """

    _instance = None
    blob = None
    blobmeta = None

    def __new__(cls, *args, **kwargs):
        """
        Make it a singleton
        """
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance


    web2indiQ = Queue()
    httpclients = set()
    once = True

    def start(self, host="localhost", port=7624):
        self.port = port
        self.host = host
        self.httpclients.add(ServerSideClient())
        self.lastblob = None

    async def indiclient2web(self):

        """Read data from self.reader and use write_message
        to write that data to each client."""

        self.running = 1
        while self.running:
            try:
                if self.reader.at_eof():
                    raise Exception("INDI server closed")

                # Read data from indiserver
                data = await self.reader.read(1000)
                for client in self.get_httpclients():
                    client.write_message(data)
            except Exception as err:
                self.running = 0
                logging.warning(f"Could not read from INDI server {err}")

        self.writer.close()
        await self.writer.wait_closed()
        logging.warning(f"Finishing indiclient2web task")
        


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

                self.task = asyncio.gather(self.indiclient2web(),
                        self.web2indiserver(), return_exceptions=True)
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



    async def web2indiserver(self):
        """Collect INDI data from the httpclient via the web2indiQ.
        """

        while self.running:
            try:
                fromweb = await asyncio.wait_for( self.web2indiQ.get(), 5 )
            except asyncio.TimeoutError as error:

                # This allows us to check the self.running state
                # if there is no data in the web2indiQ
                continue
            try:
                self.writer.write(fromweb.encode())
                await self.writer.drain()
            except Exception as err:
                self.running = 0
                logging.debug(f"Could not write to INDI server {err}")

        logging.debug("Finishing web2indiserver task")


    
    def put_blob(self, blob, **meta):
        self.lastblob = {}
        self.lastblob.update(meta)
        self.lastblob['data'] = blob.read()
        
        
    
    def get_blob(self):
        return self.lastblob

    # These methods are how we keep up with 
    # The clients. I don't think they need 
    # to be class methods. 
    @classmethod
    def get_httpclients(cls):
        return cls.httpclients

    @classmethod
    def add_httpclient(cls, client):
        cls.httpclients.add(client)


    @classmethod
    def remove_client(cls, client):
        cls.httpclients.remove(client)



class BlobHandler(ContentHandler):

    blobnames = set()
    reading = False

    def __init__(self):
        self.indiclient = INDIClient()

        super().__init__()

    def startElement(self, tag, attr):

        if tag == "defBLOBVector":
            self.blobnames.add(attr["name"])

        if tag == "oneBLOB":
            try:
                logging.debug(f"we have a blob! {tag} {dict(attr)}")
                
                self.reading = True
                self.current_blob = StringIO()
                self.attr = dict(attr)
                self.len = 0

            except Exception as error:
                logging.warning("Error with start of BLOB element {error}")


    def characters(self, content):
        """Read handle character data from the
        xml feed. For the BLOB's this data is 
        base64 encoded. We write this to an 
        in memory file for later processing."""
        if self.reading:

            self.current_blob.write(content.strip())

            #if len(self.current_blob) > int(self.attr["enclen"]):
                #raise RuntimeError("Too much BLOB data!")
                

    
    def endElement(self, tag):
        """
            Called when the end tag is reached
            This is where we finish processing
            the BLOB.
        """
        
        if "blob" in tag.lower():
            logging.debug(f"end tag {tag}")

        if tag == "oneBLOB":
            try:
                logging.debug(f"BLOB finished ")
                self.reading = False
                self.current_blob.seek(0)
                
                # Convert to raw binary. 
                bindata = BytesIO(b64decode(self.current_blob.read()))
                
                self.indiclient.put_blob(bindata, **self.attr)

            except Exception as error:
                logging.warning(f"Error putting blob {error}")
                
            
            
            
            

class ServerSideClient:

    """Sometimes it is necessary to understand the 
    incoming INDI information on the serverside as 
    opposed to sending the raw information to the
    httpclient. 
    
    
    Here we would like to extract BLOB data so that
    it can be saved to disk. To do this we feed the
    xml to the ExpatParser which uses BlobHandler to
    pull out the base64 data and convert it to binary.
    """

    def __init__(self):
        self.parser = ExpatParser()
        self.parser.setContentHandler( BlobHandler() )

        # we need to fake a root element
        self.parser.feed("<root>")

    def write_message(self, data):
        self.parser.feed(data)


class INDIWebsocket(tornado.websocket.WebSocketHandler):
    """
    This class handles the websocket traffic and 
    registers new http clients with the INDIClient class
    """
    client = INDIClient
    
    def open(self):
        self.client.add_httpclient(self)


    def on_message(self, message):
        self.client.web2indiQ.put(message)

    def on_close(self):
        self.client.httpclients.remove(self)


class INDIWebApp():
    """
        This class takes the indiclient
        and builds it into a tornado webapp
        
    """
    # The files in this path will alway be available
    # http://<HOST>/static/
    static_path = Path(__file__).parent/"www/static"

    def __init__(self, loop=None, webport=8888, indihost="localhost",
            indiport=7624):
        """
        Arguments:
        loop: The tornado IOLoop can not be an asyncio event loop.
        webport: The port of the webserver. 
        indihost: the name or IP address of the computer hosting the indi
        server.
        indiport: The port the indi server is running on. 
        """

        self._handlers = None
        self.port = webport
        
        

        if loop is None:
            loop = tornado.ioloop.IOLoop.current()

        self.mainloop = loop

        self.client = INDIClient(port=indiport, host=indihost)

        self.mainloop.add_callback(self.client.connect)


    def add_page(self, url_path: str, path_to_html: str):
        """
        Add a webpage to be rendered by tornado.
        Get data only. 
        """
        html = Path(path_to_html)
        if self._handlers is None:
            self._handlers = []

        class handler(tornado.web.RequestHandler):

            def get(self):

                name = self.get_argument("device_name", None)

                # This bit makes a requirement that the 
                # webpage include a device_name argument
                # perhaps this is a bit draconian. 
                if name is None:
                    self.write(f"URL must contain device_name as http get data. For\
                            example: <br><br><br> http://{self.request.host}/dev?device_name=mydev\
                            ")

                # Convenience vars for the template
                indihead = r"""
                    <script src="//code.jquery.com/jquery-1.12.4.js"></script>
                    <script src="//code.jquery.com/ui/1.12.1/jquery-ui.js"></script>

                    <!--These libraries are built with pyINDI
                    and are available at /static/ using
                    pyINDI's client libarary.-->
                
                    <link rel="stylesheet" href="/static/indi/indi.css">
                    <script src="/static/indi/indi.js"></script>
                    <script src="/static/indi/utility.js"></script>
                    <script src="/static/indi/maps-indi.js"></script>

                    """
                        
                indisocket = f"http://{self.request.host}/indi-websocket"

                return self.render( 
                    str(html), 
                    device_name=name, 
                    indihead=indihead, 
                    indisocket=indisocket)

        self._handlers.append((url_path, handler))


    
        
    def add_handler(self, handler: tuple):
        """Expose tornado.web.Application add_handlers method"""
        if self._handlers is None:
            self._handlers = []
        self._handlers.append(handler)



    def start(self, **settings):
        if self._handlers is None:
            # Add the default page
            self._handlers = [(r"/dev/(.*)", WebHandler)]

        # Add the websocket handler
        self._handlers.append((r"/indi-websocket", INDIWebsocket))
        self.app = tornado.web.Application(
                self._handlers,
                static_path=self.static_path, 
                **settings
                )

        self.app.listen(self.port)

        self.mainloop.start()




