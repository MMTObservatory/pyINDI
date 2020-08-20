#!/usr/bin/python3.8

from pathlib import Path
import sys
import logging

logging.basicConfig(level=logging.DEBUG)
sys.path.insert(0, str(Path.cwd().parent))


from pyindi import INDIWebApp

page = r"/dev"
port = 8888
indiport = 7624


logging.debug(f"Creating webapp on port http://localhost:{port}/{page}")

app = INDIWebApp( webport=8888, indiport=7624 )
app.add_page(r"/dev", Path.cwd()/"client.html")
app.add_page(r"/vatt-guidebox", Path.cwd()/"vatt-guidebox.html")

app.start(debug=True)


