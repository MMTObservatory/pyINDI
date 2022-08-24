from pyindi.client import INDIClientSingleton as INDIClient
import tornado.web
import tornado.websocket
from pathlib import Path
from xml.sax import ContentHandler
from xml.sax.expatreader import ExpatParser
import logging
from io import StringIO
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


class INDIHandler(tornado.web.RequestHandler):
    js9_head = """
        <link type="text/css" rel="stylesheet" href="/indi/static/js9/js9support.css">
        <link type="text/css" rel="stylesheet" href="/indi/static/js9/js9.css">
        <link rel="apple-touch-icon" href="images/js9-apple-touch-icon.png">
        <script type="text/javascript" src="/indi/static/js9/js9prefs.js"></script>
        <script type="text/javascript" src="/indi/static/js9/js9support.min.js"></script>
        <script type="text/javascript" src="/indi/static/js9/js9.min.js"></script>
        <script type="text/javascript" src="/indi/static/js9/js9plugins.js"></script>
    """
    pyindi_head = """
        <!-- Required meta tags -->
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link rel="apple-touch-icon" sizes="180x180" href="/indi/static/favicon/apple-touch-icon.png">
        <link rel="shortcut icon" type="image/png" sizes="32x32" href="">
        <link rel="shortcut icon" type="image/png" sizes="16x16" href="/indi/static/favicon/favicon-16x16.png">
        <link rel="manifest" href="/indi/static/favicon/site.webmanifest">
        <link href="/indi/static/fontawesome/css/all.css" rel="stylesheet">
        <!-- Load pyINDI scripts -->
        <script src="/indi/static/js/constants.js"></script>
        <script src="/indi/static/js/indi.js"></script>
        <script src="/indi/static/js/builder-indi.js"></script>
        <script src="/indi/static/js/updater-indi.js"></script>
        <script src="/indi/static/js/logger-indi.js"></script>
        <script src="/indi/static/js/utils-indi.js"></script>
        <script src="/indi/static/js/maps-indi.js"></script>
        <!-- Load pyINDI styling -->
        <link rel="stylesheet" href="/indi/static/css/indi.css">
    """
    www_path = Path(__file__).parent / "www"
    static_path = www_path / "static"
    templates_path = www_path / "templates"

    def indi_render(self, *args, **kwargs):
        """Renders the handler."""
        # Make available pyindi styling and js9
        kwargs.update(pyindi_head=self.pyindi_head)
        kwargs.update(js9_head=self.js9_head)

        # Convert filename to string if Path
        fname = args[0]
        if type(fname) != str:
            fname = str(fname)

        self.render(fname, **kwargs)


class DefaultIndex(INDIHandler):
    """Default indi panel view."""
    def get(self):
        """Renders default indi panel view with all devices queried."""
        index_path = self.templates_path / "index.html"
        title = "pyINDI Panel"
        devices = ["*"]
        self.indi_render(index_path, devices=devices, title=title)


class INDIWebClient(INDIClient):
    def start(self, handle_blob, *args, **kwargs):
        super().start(*args, **kwargs)
        self.lastblob = {}
        self.httpclients = set()
        self.httpclients.add(BlobClient())
        self.blob_handler = handle_blob

    async def xml_from_indiserver(self, data):
        """Send XML data to each http client.

        Parameters
        ----------
        data : str
            XML data to send to client.
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

        self.lastblob.update({"data": bindata})
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
                logging.debug("BLOB finished ")
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
        self.parser.setContentHandler(BlobHandler())

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
            meta = {k: v for k, v in blob.items() if k != "data"}
            meta.update({'type': str(type(blob['data']))})
            self.write(meta)
        elif ftype == 'raw':

            self.write(blob['data'])
        else:
            resp = {"Error": f"Can not understand file type {ftype}"}
            resp.update({k: v for k, v in blob.items() if k != "data"})


class INDIWebApp:
    """Takes indi client and builds into Tornado web application.
    """
    # The files in this path will alway be available <http://<HOST>/static/>
    www_path = Path(__file__).parent / "www"
    static_path = www_path / "static"
    templates_path = www_path / "templates"

    # Routes used by indi
    indiws_route = "/indi/websocket"
    indiindex_route = "/indi"
    indistatic_route = r"/indi/static/(.*)"
    inditemplates_route = r"/indi/templates/(.*)"
    lastblob_route = r"/indi/blob/lastblob.([a-z]*)"
    protected_routes = [
        indiws_route,
        indistatic_route,
        inditemplates_route
    ]

    def __init__(self, loop=None, webport=8888, indihost="localhost",
                 indiport=7624, handle_blob=None):
        """Initializes the tornado loop and starts the client.

        Parameters
        ----------
        loop : `tornado.ioloop.IOLoop`, optional
            The tornado IOLoop, by default None.
        webport : int, optional
            Port of the webserver, by default 8888.
        indihost : str, optional
            The name or IP address of the host for indi server, by default "localhost".
        indiport : int, optional
            Port of the indi server, by default 7624
        handle_blob : bool, optional
            Enable to handle blob data, by default None

        Notes
        -----
        - loop cannot be an asyncio event loop.
        """
        self._handlers = None
        self.port = webport

        if loop is None:
            loop = tornado.ioloop.IOLoop.current()

        self.mainloop = loop

        self.client = INDIWebClient()
        self.client.start(handle_blob, port=indiport, host=indihost)
        self.mainloop.add_callback(self.client.connect)

    def indi_handlers(self):
        handlers = []
        indiws_route = r"/indi/websocket"
        indistatic_route = r"/indi/static/(.*)"
        lastblob_route = r"/indi/blob/lastblob.([a-z]*)"

        # Add the default page
        handlers.append((r"/indi/index.html", DefaultIndex))

        handlers.append((lastblob_route, BlobRequestHandler))

        # Insert the websocket handler.
        handlers.insert(0, (indiws_route, INDIWebSocket))

        # Insert the static indi stuff.
        handlers.insert(
            0,
            (
                indistatic_route,
                tornado.web.StaticFileHandler,
                {"path": self.static_path}
            )
        )

        return handlers

    def build_app(self, handlers=None, **settings):
        """Builds the tornado web app and validates handlers.

        Parameters
        ----------
        handlers : list, optional
            Handler info like route and handler class, by default None.

        Raises
        ------
        ValueError
            Raises exception if route is protected indi route.
        """
        # Validate supplied handlers and check for root
        has_root = False
        root = ("/", DefaultIndex)

        if handlers is None:
            handlers = []

        for hdl in handlers:
            if hdl[0] in self.protected_routes:
                raise ValueError(f"{hdl[0]} route is used by pyindi. Please choose another.")

            if hdl[0] == "/":
                has_root = True

        # If doesn't have root, include default
        if not has_root:
            handlers.append(root)

        # Insert the websocket handler and static
        handlers.append((self.indiindex_route, DefaultIndex))
        handlers.append((self.lastblob_route, BlobRequestHandler))
        handlers.append((self.indiws_route, INDIWebSocket))
        handlers.append(
            (
                self.indistatic_route,
                tornado.web.StaticFileHandler,
                {"path": self.static_path}
            )
        )

        # Build app and start loop
        self.app = tornado.web.Application(handlers, **settings)
        self.app.listen(self.port)
        self.mainloop.start()
