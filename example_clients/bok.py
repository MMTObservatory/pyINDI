#!/usr/bin/python3.8
""" pyindi_panel_bok.py
Uses the INDIWebApp class to build an pyINDI client as a tornado web 
application.
"""
# Python imports
from pathlib import Path
import sys
import logging
import tornado
import tornado.web

# Append to path to access pyindi
sys.path.insert(0, str(Path.cwd().parent))

# Local imports
from pyindi.webclient import INDIWebApp, INDIHandler

# Configure logging
logging.basicConfig(level=logging.INFO)

# Configuration
WEBPORT = 5905 # The port for the web app
INDIPORT = 7624 # The indiserver port
INDIHOST = '10.30.1.2' # Where the indiserver is running
PYINDI_PANEL_PAGE = "pyindi-panel.html" # Name of the generic indi panel
NINETY_PRIME_PAGE = "ninety-prime.html"
DEVICES = [ # Append device names to array
    'GALIL-DMC-2280',
    'Flatfield'
]

# Build classes with path to go to for page
# These are the handlers
class PYINDIPanel(INDIHandler):
    def get(self):
        self.indi_render(Path.cwd()/PYINDI_PANEL_PAGE, device_name=DEVICES)
class NinetyPrime(INDIHandler):
    def get(self):
        self.indi_render(Path.cwd()/NINETY_PRIME_PAGE, device_name=DEVICES)

# Build the web app
web_app = INDIWebApp(webport=WEBPORT, indihost=INDIHOST, indiport=INDIPORT)
imgs = Path('./imgs')
imgs.mkdir(exist_ok=True)

print(f"Go to http://<server_name>:{WEBPORT}")
print(f"If the server is on localhost go to:")
print(f"http://localhost:{WEBPORT}/")

# Attach handlers and build the application
# Pass a tuple, the first value is the path, second is the class
web_app.build_app(
    [
        (r"/", PYINDIPanel),
        (r"/ninety-prime", NinetyPrime),
        (r"/imgs/(.*)", tornado.web.StaticFileHandler, {"path": imgs})
    ],
    debug=True
)
