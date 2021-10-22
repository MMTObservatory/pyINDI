#!/usr/bin/env python3

import sys
from pathlib import Path

sys.path.insert(0, str(Path.cwd().parent))

import asyncio
import base64
from PIL import Image
import cv2
import io
from pyindi import device as INDIDevice

import logging

class tester( INDIDevice.device ):
    once = True
    more = False

    def ISNewNumber( self, dev, name, values, names ):
            nv = self.IUFind(name="test")

            # Blindly update the values from client. 
            for nm, value in zip(names, values):
                nv[nm].value = value
                logging.debug(f"setting number {nv[nm].value} to {value}")
            self.IDSetNumber(nv)

    def ISNewText(self, dev, name, texts, names ):
        tv = self.IUFind(name="textvec", device="mydev")
        tv.tp[0].text = texts[0]
        tv.state = INDIDevice.IPState.ALERT
        self.IDSetText( tv )
    
    def ISNewSwitch( self, dev, name, states, names):
        sv = self.IUFind(name="svec", device="mydev")
        blob = self.IUFind


    def testtimer( self ):
        if not hasattr(self, "counter"):
            self.counter = 0
            
        else:
            self.counter +=1
            self.counter %=4

        numvec = self.IUFind( name="test", device="mydev" )
        numvec.state = list(INDIDevice.IPState)[self.counter]
        numvec.np[0].value = numvec.np[0].value + 1
        numvec.np[1].value = numvec.np[1].value + 2

        textvec = self.IUFind(name="textvec", device="mydev")
        textvec.state = numvec.state
        textvec.tp[0].text = str(list(INDIDevice.IPState)[self.counter])

        lightvec = self.IUFind( name="lightvec", device="mydev" )
        lightvec.state = numvec.state
        lightvec.lp[0].state = numvec.state

        switchvec = self.IUFind( name="svec", device="mydev" )
        switchvec.state = numvec.state
        switchvec.sp[0].s = True
        blob = self.IUFind( name="blobvec", device="mydev" ).bp[0]

        try:
            cap = cv2.VideoCapture( "http://webcam3.mmto.arizona.edu/mjpg/video.mjpg" )
            ret, frame = cap.read()
            im = Image.fromarray(frame)
            bytedata = io.BytesIO()
            im.save(bytedata, format="png")
            bytedata.seek(0)
            raw = bytedata.read()
            
            
            blob.value = raw
            self.IDSetBLOB(self.IUFind(name="blobvec", device="mydev"))
        except Exception as err:
            logging.debug(f"Could not send blob: {err}")

        self.IDSetText( textvec )
        self.IDSetNumber( numvec )
        self.IDSetLight( lightvec )
        self.IDSetSwitch( switchvec )

        #self.IDMessage("This is a message")

        self.IEAddTimer( 1000.0, self.testtimer )

    


    def ISGetProperties( self, device:str=None ):

        inum =  INDIDevice.INumber( "test", "%f", 0, 100, 1, 3, label="Num 1" )
        inum2 = INDIDevice.INumber( "Shoo", "%f", 0, 100, 1, 3, label="Num 2" )
        inv = INDIDevice.INumberVector( [inum, inum2], "mydev", "test",
                INDIDevice.IPState.OK, INDIDevice.IPerm.RW, label="The Number Vector" )

        itext = INDIDevice.IText("text1", "The Text", "Text 1")
        itv = INDIDevice.ITextVector([itext], "mydev", "textvec",
                INDIDevice.IPState.OK, INDIDevice.IPerm.RW, label="Test the text")

        ilight = INDIDevice.ILight("light1", INDIDevice.IPState.OK, "Light 1")
        ilv = INDIDevice.ILightVector([ilight], "mydev", "lightvec",
                INDIDevice.IPState.OK, label="The Light Vector")

        iswitch = INDIDevice.ISwitch("s1", INDIDevice.ISState.ON, "The Switch", )
        iswitch2 = INDIDevice.ISwitch("s2", INDIDevice.ISState.OFF, "The 2nd Switch")
        isv = INDIDevice.ISwitchVector([iswitch, iswitch2], "mydev", "svec",
                INDIDevice.IPState.OK, INDIDevice.ISRule.ONEOFMANY, 
                INDIDevice.IPerm.RW, label="The Switch Vector")

        iblob = INDIDevice.IBLOB("b1", "png", "Test Blob")

        ibv = INDIDevice.IBLOBVector([iblob], "mydev", "blobvec",
                INDIDevice.IPState.OK, INDIDevice.IPerm.RO, "The BLOB Vector")


        
        self.IDDef( inv, None )
        self.IDDef( itv, None )
        self.IDDef( ilv, None )
        self.IDDef( ibv, None )
        self.IDDef( isv, None )
        if self.once:
            self.IEAddTimer( 1000, self.testtimer )
            self.once = False


if __name__ == "__main__":
    t=tester(name="mydev")
    t.start()
