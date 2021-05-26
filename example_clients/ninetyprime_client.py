#!/usr/bin/python3.8
from pathlib import Path
import sys
import logging
import tornado
import datetime
logging.basicConfig(level=logging.DEBUG)
sys.path.insert(0, str(Path.cwd().parent))
import tornado.web
from pyindi.webclient import INDIWebApp, INDIHandler


"""
THis script uses the INDIWebApp class to build an INDI
client as a tornado web application. The root page is 
client.html (in this directory)

"""

WEBPORT = 5905
INDIPORT = 7624

class Skeleton(INDIHandler):
    def __init__(self, html, device):
        self._html = html
        self._device = device

    def get(self):
        self.indi_render(
            Path.cwd()/'ninetyprime-observer.html',
            device_name=device
        )



class Skeleton(INDIHandler):

    def get(self):

        self.indi_render(Path.cwd()/"ninetyprime-observer.html", device_name="Dome Simulator")

webapp = INDIWebApp(webport=WEBPORT)
imgs = Path('./imgs')
imgs.mkdir(exist_ok=True)

print(f"Go to http://<server_name>:{WEBPORT}/")
print(f"If the server is on localhost go to:")
print(f"http://localhost:{WEBPORT}/")


# Build and start the application. 
webapp.build_app(
    [(r"/", Skeleton),
    (r"/imgs/(.*)", tornado.web.StaticFileHandler, {"path": imgs})],
    debug=True
)
