#!/usr/bin/python3.8

from pathlib import Path
import sys
sys.path.insert(0, str(Path.cwd().parent))

from pyindi import INDIWebApp

app = INDIWebApp( webport=8888, indiport=7600 )
app.start()


