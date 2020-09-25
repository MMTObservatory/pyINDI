#!/usr/bin/python3.8


from pathlib import Path
import sys
import logging
import click
import tornado
logging.basicConfig(level=logging.DEBUG)
sys.path.insert(0, str(Path.cwd().parent))


from pyindi.webclient import INDIWebApp, IndiHandler

class Apogee(IndiHandler):

    def get(self):

        self.render("./apogee.html", device_name="Apogee CCD")


wa = INDIWebApp(webport=5905)

wa.build_app([(r"/apogee.html", Apogee)], debug=True)

