from .client import INDIClientSingleton as INDIClient
from .client import INDIClientContainer

import tornado.web, tornado.websocket
from pathlib import Path
import asyncio
from xml.sax import ContentHandler
from xml.sax.expatreader import ExpatParser
import logging
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
              | webclient.py                                                      |
              | ------------                  ___________                         |
              |                 _____get()____|to_indiQ |<---put()-------         |
              |                 |             -----------               |         |
              |                 |                                       |         |
____________  |           ______V_____                      httpclients |         |
|          | <---writer---|          |                     _______________        |
|indiserver|  |  TCP/IP   |INDIWeb-  |                     |---->client_1|<-websoc-->webpage_1
|          | ----reader-->|  Client  |-read_from_iserver()>|---->client_2|<-websoc-->webpage_2
------------  |           ------------               |     |---->...     |<-websoc-->...
              |                 ^                    |     |---->client_n|<-websoc-->webpage_n
              |                 |                    |     ---------------        |
              |                 |                    V                            |
              |         _____________            ____________                     |
              |         |BlobHandler|<--feed()---|BlobClient|                     |
              |         -------------            ------------                     |
              ---------------------------------------------------------------------    
    
    In this module, the raw xml data is sent to the webpage to be parsed.
    In parallel, the blobclient parses the xml looking only for blob data.
    This allows us to do useful things with the blob data like save fits
    files to disk. 
"""


class IndiHandler(tornado.web.RequestHandler):
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
    js9head = r"""
          <link type="text/css" rel="stylesheet" href="/indi/static/js9/js9support.css">
          <link type="text/css" rel="stylesheet" href="/indi/static/js9/js9.css">
          <link rel="apple-touch-icon" href="images/js9-apple-touch-icon.png">
          <script type="text/javascript" src="/indi/static/js9/js9prefs.js"></script>
          <script type="text/javascript" src="/indi/static/js9/js9support.min.js"></script>
          <script type="text/javascript" src="/indi/static/js9/js9.min.js"></script>
          <script type="text/javascript" src="/indi/static/js9/js9plugins.js"></script>

        """

    static_path = Path(__file__).parent/"www/"
    def indi_render(self, *args, **kwargs):
        """
        
        """
        fname = args[0]
        kwargs.update(indihead=self.indihead)
        kwargs.update(js9head=self.js9head)

        if type(fname) != str:
            fname = str(fname)

        self.render(fname, **kwargs)


class DefaultIndex(IndiHandler):

    def get(self):
        
        self.indi_render( self.static_path/"index.html" )


class INDIWebClient(INDIClient):


    def start(self, handle_blob, *args, **kwargs):
        super().start(*args, **kwargs)
        self.lastblob = {}
        self.httpclients = set()
        self.httpclients.add(BlobClient())
        self.blob_handler = handle_blob

    
    async def xml_from_indiserver(self, data):
        """
        Called by parent class.
        Send xml data to each http client
        """

        for client in self.get_httpclients():
            client.write_message(data)

    # These methods are how we keep up with the clients
    def get_httpclients(self):
        return self.httpclients

    def add_httpclient(self, client):
        self.httpclients.add(client)


    def remove_client(self, client):
        self.httpclients.remove(client)

    # Blob stuff
    def put_blob(self, bindata, **attr):
        
        self.lastblob.update({"data":bindata})
        self.lastblob.update(attr)
        self.handle_blob(self.lastblob)

    def handle_blob(self, blob):
        if self.blob_handler is None:
            warning = f"""
                Blob {blob['name']} is not being handled. 
                This is probably not what you want. 
                Override the handle_blob method to 
                change this behavior."""

            logging.warning(warning)
        
        else:
            self.blob_handler(blob)

    def get_blob(self):
        return self.lastblob

class BlobHandler(ContentHandler):

    blobnames = set()
    reading = False
    current_blob = None

    def __init__(self):
        self.indiclient = INDIWebClient()
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
                logging.warning(f"Error with start of BLOB element {error}")


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
            Called when the end tag is reached.
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
                bindata = b64decode(self.current_blob.read())
                
                self.indiclient.put_blob(bindata, **self.attr)

            except Exception as error:
                logging.warning(f"Error putting blob {error}")
                
            

class BlobClient:

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


class INDIWebSocket(tornado.websocket.WebSocketHandler):
    """
    This class handles the websocket traffic and 
    registers new http clients with the INDIWebClient class
    """

    def __init__(self, *args, **kwargs):
        self.client = INDIWebClient()
        super().__init__(*args, **kwargs)
    
    def open(self):
        logging.debug(f"We have a client {self}")
        self.client.add_httpclient(self)


    async def on_message(self, message):
        logging.debug(f"we have message {message}")
        await self.client.xml_to_indiserver(message)

    def on_close(self):
        logging.debug(f"closing ws connection {self}")
        self.client.httpclients.remove(self)

       

class BlobRequestHandler(tornado.web.RequestHandler):
    indiclient = INDIWebClient()

    def get(self, ftype):
        
        # Meta data only
        blob = self.indiclient.get_blob()
        if blob is None:
            self.write({"Error": "No blob data. Perhaps we have not received one yet."})
            return 
        if ftype == 'json':
            meta = {k:v for k,v in blob.items() if k != "data"}
            meta.update({'type':str(type(blob['data']))})
            self.write(meta)
        elif ftype == 'raw':
            
            self.write(blob['data'])
        else:
            resp = {"Error": f"Can not understand file type {ftype}"}
            resp.update({k:v for k,v in blob.items() if k != "data"})

        



class INDIWebApp:
    """
        This class takes the indiclient
        and builds it into a tornado webapp
        
    """
    # The files in this path will alway be available
    # http://<HOST>/static/
    static_path = Path(__file__).parent/"www/static"

    def __init__(self, loop=None, webport=8888, indihost="localhost",
            indiport=7624, handle_blob=None):
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

        self.client = INDIWebClient()

        self.client.start(handle_blob, port=indiport, host=indihost)

        self.mainloop.add_callback(self.client.connect)



    def build_app(self, handlers=None, **settings):

        """
            build_app
            Description:
                This function builds the tornado web app.
            Its arguments are whatever you would want to
            give to tornado.web.Application instantiation.
        """

        indiws_route = r"/indi/websocket"
        indistatic_route = r"/indi/static/(.*)"
        lastblob_route = r"/indi/blob/lastblob.([a-z]*)"

        # Add the default page
        handlers.append((r"/indi/index.html", DefaultIndex))

        
        handlers.append((lastblob_route, BlobRequestHandler))

        hasroot = False
        for hdl in handlers:
            if indiws_route == hdl[0]:
                raise ValueError(f"{indiws_route} route is used by pyindi. Please choose another.")

            elif indistatic_route == hdl[0]:
                raise ValueError(f"{indistatic_route} route is used by pyindi. Please choose another.")

            if r'/' == hdl[0]:
                hasroot = False

        if not hasroot:
        # Make a page at root if we don't have one. 
            handlers.append((r'/', DefaultIndex))
            



        # Insert the websocket handler.
        handlers.insert(0, (indiws_route, INDIWebSocket))
        
        # Insert the static indi stuff. 
        handlers.insert(0, (
                indistatic_route, 
                tornado.web.StaticFileHandler, 
                {"path": self.static_path}))

        self.app = tornado.web.Application(
                handlers,
                **settings
                )

        self.app.listen(self.port)

        self.mainloop.start()



