#!/usr/bin/python3.8


from pathlib import Path
import sys
import logging
import tornado
import datetime
logging.basicConfig(level=logging.DEBUG)
sys.path.insert(0, str(Path.cwd().parent))
import tornado.web
from pyindi.webclient import INDIWebApp, INDIHandler, INDIWebClient


class TestDevice(INDIHandler):

    def get(self):

        self.indi_render(Path.cwd()/"test.html", device_name="mydev")


def handle_blob(blob):
    now = datetime.datetime.now()
    tstr = now.strftime("%d%m%y-%H%M%S")
    fname = f"imgs/{blob['name']}_{tstr}.{blob['format']}"
    logging.debug(f"saving blob to {fname}")

    with open(fname, 'wb') as fd:
        fd.write(blob['data'])


wa = INDIWebApp(webport=5905, handle_blob=handle_blob, indiport=7624)
imgs = Path('./imgs')
imgs.mkdir(exist_ok=True)

wa.build_app(
    [(r"/", TestDevice),
     (r"/imgs/(.*)", tornado.web.StaticFileHandler, {"path": imgs})],
    debug=True)
