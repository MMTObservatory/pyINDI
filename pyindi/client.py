import tornado.web, tornado.ioloop, tornado.websocket
import time
import asyncio
from lxml import etree
from tornado.queues import Queue
from collections import namedtuple
import json
from pathlib import Path
import logging

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
    _instance = None
    def __new__(cls, *args, **kwargs):
        """
        Make it a singleton
        """
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance


    web2indiQ = Queue()
    clients = set()
    once = True
    def __init__(self, host="localhost", port=7624):
        self.clients = set()
        self.port = port
        self.host = host

    async def parse_incoming_xml(self):
        # TODO: This needs to be tolerant of an indi
        # server crash. 
        self.running = 1
        while self.running:
            try:
                if self.reader.at_eof():
                    raise Exception("INDI server closed")

                #data = await asyncio.wait_for(self.reader.read(5000), 5)
                data = await self.reader.read(5000)
                for client in self.get_clients():
                    client.write_message(data)
            except Exception as err:
                self.running = 0
                logging.debug(f"Could not read from INDI server {err}")

        logging.debug(f"Closing connection")
        self.writer.close()
        self.cancel()
        logging.debug(f"Cancelled tasks")
        logging.debug(f"{self.task}")


    async def connect(self):
        while 1:
            
            task = None
            try: 
                self.reader, self.writer = await asyncio.open_connection(
                        self.host, self.port)
                logging.debug("Connected")
                self.running = True

                self.task = asyncio.gather(self.parse_incoming_xml(),
                        self.web2indiserver(), return_exceptions=True)
                await self.task
                logging.debug("Finished!")
                
            except ConnectionRefusedError:
                self.running = False
                logging.debug("Can not connect to INDI server\n")

            except asyncio.TimeoutError:
                logging.debug("Lost connection to INDI server\n")

            finally:
                if task is not None:
                    task.cancel()

            await asyncio.sleep(2.0)


    def cancel(self):
        self.task.cancel()

    async def web2indiserver(self):
        while self.running:# We should figure out a condition to quit
            fromweb = await self.web2indiQ.get() 
            try:
                self.writer.write(fromweb.encode())
                await self.writer.drain()
            except Exception as err:
                self.running = 0
                logging.debug(f"Could not write to INDI server {err}")
        self.cancel()


    @classmethod
    def get_clients(cls):
        return cls.clients

    @classmethod
    def add_client(cls, client):
        cls.clients.add(client)


    @classmethod
    def remove_client(cls):
        cls.clients.remove(client)


class INDIWebsocket(tornado.websocket.WebSocketHandler):
    """
    This class handles the websocket traffic and 
    registers new clients with the INDIClient class
    """
    client = INDIClient
    
    def open(self):
        self.client.add_client(self)


    def on_message(self, message):
        self.client.web2indiQ.put(message)

    def on_close(self):
        self.client.clients.remove(self)


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




