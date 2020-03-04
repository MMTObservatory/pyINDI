import tornado.web, tornado.ioloop, tornado.websocket
import time
import asyncio
from lxml import etree
from tornado.queues import Queue
from collections import namedtuple
import json
from pathlib import Path

class WebHandler(tornado.web.RequestHandler):

    def get(self, device):
        
        self.render("www/index.html", device_name=device)



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
        self.reader, self.writer = await asyncio.open_connection(
                        self.host, self.port)
        self.running = 1
        self.writer.write(b"<getProperties version='1.7'/>")
        while self.running:
            data = await self.reader.read(5000)
            for client in self.get_clients():
                client.write_message(data)

        self.writer.close()


    async def web2indiserver(self):
        while 1:# We should figure out a condition to quit
            fromweb = await self.web2indiQ.get() 
            self.writer.write(fromweb.encode())

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
    client = INDIClient
    
    def open(self):
        self.client.add_client(self)


    def on_message(self, message):
        self.client.web2indiQ.put(message)

    def on_close(self):
        self.client.clients.remove(self)


class INDIWebApp():

    static_path = Path(__file__).parent/"www/static"

    def __init__(self, loop=None, webport=8888, indihost="localhost", indiport=7624):
        """
        Arguments:
        loop: The tornado IOLoop can not be an asyncio event loop.
        webport: The port of the webserver. .
        indihost: the name or IP address of the computer hosting the indi
        server.
        indiport: THe port the indi server is running on. 
        """

        self.app = tornado.web.Application([
                    (r"/dev/(.*)", WebHandler),
                    (r"/indi-websocket", INDIWebsocket)
                        ],
                        static_path=self.static_path)

        self.app.listen(webport)

        if loop is None:
            loop = tornado.ioloop.IOLoop.current()

        self.mainloop = loop

        self.client = INDIClient(port=indiport, host=indihost)

        # Tornado.IOLoop has not equivalent to call_soon
        # To make this compatible
        self.mainloop.add_callback(self.client.parse_incoming_xml)
        self.mainloop.add_callback(self.client.web2indiserver)

    def start(self):
        self.mainloop.start()




