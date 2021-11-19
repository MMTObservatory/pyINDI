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

DEVICES = [
    #"DOME-NG-INDI",
    #"FOCUS-NG-INDI",
    #"TCS-NG-INDI",
    #"Mirror Cover",
    #"Upper Dome"
    #"Dome Simulator"
    'GALIL-DMC-2280'
    #'ZWO CCD ASI294MM Pro'
]
"""
THis script uses the INDIWebApp class to build an INDI
client as a tornado web application. The root page is 
client.html (in this directory)

"""

class Skeleton(INDIHandler):

    def get(self):

        self.indi_render(Path.cwd()/"client.html", device_name=DEVICES)

webport = 5905
indiport = 7624

wa = INDIWebApp(webport=webport, indihost='10.30.1.2')
imgs = Path('./imgs')
imgs.mkdir(exist_ok=True)

print(f"go to http://<server_name>:{webport}/")
print(f"If the server is on localhost go to:")
print(f"http://localhost:{webport}/")


# Build and start the application. 
wa.build_app(
    [(r"/", Skeleton),
     (r"/imgs/(.*)", tornado.web.StaticFileHandler, {"path": imgs})],
    debug=True
)

