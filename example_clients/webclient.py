#!/usr/bin/python3.8

from pathlib import Path
import sys
import logging

logging.basicConfig(level=logging.DEBUG)
sys.path.insert(0, str(Path.cwd().parent))


from pyindi import INDIWebApp

app = INDIWebApp( webport=8888, indiport=7600 )
app.add_page(r"/dev", Path.cwd()/"client.html")

app.start()


