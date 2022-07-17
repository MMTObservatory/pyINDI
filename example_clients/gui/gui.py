#!/usr/bin/python3.8
from pathlib import Path
# from tornado. import StaticFileHandler
from pyindi.webclient import INDIWebApp, INDIHandler

# Configuration
WEBPORT = 5905  # The port for the web app
INDIPORT = 7624  # The indiserver port
INDIHOST = "localhost"  # Where the indiserver is running
DEVICES = ["*"]  # All devices is called by an asterisk
CURRENT_DIR = Path.cwd()  # The current directory
TEMPLATE = "gui.html"


# Build handlers with path for rendering, each path should have a handler
class GUI(INDIHandler):
    def get(self):
        # Pass additional variables to appear in the html template
        self.indi_render(CURRENT_DIR / TEMPLATE, devices=DEVICES,
                         example_variable="Hello World", title="Test GUI")


web_app = INDIWebApp(webport=WEBPORT, indihost=INDIHOST, indiport=INDIPORT)
# If storing images, create image directory
# imgs = Path("/tmp/imgs")
# imgs.mkdir(exist_ok=True)

print(f"Go to http://<server_name>:{WEBPORT}")
print("If the server is on localhost go to:")
print(f"http://localhost:{WEBPORT}/")

# Attach handlers and build the application
# For images, use tornado.web.StaticFileHandler and link the path
web_app.build_app(
    [
        (r"/", GUI),
        # (r"/imgs/(.*)", StaticFileHandler, {"path": imgs})
    ],
)
