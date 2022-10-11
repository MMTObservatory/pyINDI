#!/usr/bin/python3.8
from pathlib import Path
from tornado.web import StaticFileHandler
from pyindi.webclient import INDIWebApp, INDIHandler
import os
import json
import argparse
import sys

parser = argparse.ArgumentParser(description='INDI Web Client')
parser.add_argument('--indihost', type=str, default='localhost', help="INDI host")
parser.add_argument('--indiport', type=str, default="7624", help="INDI port")
parser.add_argument('--webport', type=str, default="5905", help="Web port")
parser.add_argument('--tempdir', type=str, default=None, help="Template directory")
parser.add_argument('--template', type=str, default=None, help="Template file")
parser.add_argument('--devices', type=str, default=None, help="comma separated list of devices")

args = parser.parse_args()

if args.devices is None:
    devicejson = '["*"]'
else:
    devicejson = json.dumps(args.devices.split(","))



# Configuration

WEBPORT = int(os.environ.get("INDIWEBPORT", args.webport)) # The port for the web app
INDIPORT = int(os.environ.get("INDIPORT", args.indiport)) # The indiserver port
INDIHOST = os.environ.get("INDIHOST", args.indihost) # Where the indiserver is running
DEVICEJSON = os.environ.get("INDIDEVICEJSON", devicejson) # The device json file

DEVICES = json.loads(DEVICEJSON)

CURRENT_DIR = Path(__file__).parent # The current directory
TEMPLATE_DIR = os.environ.get("INDITEMPLATEDIR", None) # The template directory
if TEMPLATE_DIR is None:
    TEMPLATE_DIR = CURRENT_DIR

TEMPLATE = os.environ.get("INDITEMPLATEFILE", "gui.html") # The template file



# Build handlers with path for rendering, each path should have a handler
class GUI(INDIHandler):
    def get(self):
        # Pass additional variables to appear in the html template
        self.indi_render(TEMPLATE_DIR / TEMPLATE, devices=DEVICES, 
                         example_variable="Hello World")

web_app = INDIWebApp(webport=WEBPORT, indihost=INDIHOST, indiport=INDIPORT)
# If storing images, create image directory
# imgs = Path("./imgs")
# imgs.mkdir(exist_ok=True)

print(f"Connecting to indiserver at {INDIHOST}:{INDIPORT} with devices {DEVICES}")
print(f"Go to http://<server_name>:{WEBPORT}")
print(f"If the server is on localhost go to:")
print(f"http://localhost:{WEBPORT}/")

# Attach handlers and build the application
# For images, use tornado.web.StaticFileHandler and link the path
web_app.build_app(
    [
        (r"/", GUI)
        # (r"/imgs/(.*)", StaticFileHandler, {"path": imgs})
    ],
)
