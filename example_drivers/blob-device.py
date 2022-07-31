#! /usr/bin/env python3
from pyindi.device import device 
from astropy.io import fits
import asyncio
from io import BytesIO
import numpy as np
import logging

try:
    from PIL import Image
    PIL = True
except Exception as error:
    PIL = False

FORMAT = '%(asctime)s %(message)s'
logging.basicConfig(filename="blob.debug", level=logging.WARN, format=FORMAT, filemode='a')

class BLOBDevice(device):
    """Example pyINDI device to show use of BLOBs in pyINDI
    """

    def ISGetProperties(self, device: str=None) -> None:
        """Define properties in device with IDDef.

        Parameters
        ----------
        device : str, optional
            name of device, by default None
        """
        blob_attribs = dict(
            device=self.device,
            name="blob",
            state="Idle",
            perm="ro",
            label="FITS BLOB"

        )

        blobs = [
            dict(
                name="fits_blob",
                label="FITS BLOB",
                format="fits"
            ),
            dict(
                name="jpg_blob",
                label="JPG BLOB",
                format="jpg"
            )
        ]
        v=self.vectorFactory("BLOB", blob_attribs, blobs)
        self.IDDef(v)

        button_attribs = dict(
            device=self.device,
            name="img",
            label= "Generate Image",
            state="Idle",
            rule="AtMostOne",
            perm="rw",
            

        )
        buttons = [
            dict(
                name="fits",
                label="Generate Fits",
                state="Idle",
            ),

            dict(
                name="jpg",
                label="Generate JPG",
                state="Idle"
                
            )
        ]
        button = self.vectorFactory("Switch", button_attribs, buttons)
        self.IDDef(button)

        
    @device.NewVectorProperty("img")
    def new_img(self, device: str, name: str, values: list, names: list):
        """Generate a new image after a fits or jpg switch property is clicked.

        Parameters
        ----------
        device : str
            Name of the device
        name : str
            Name of the vector property
        values : list
            list of values of the indi property
        names : list
            list of names in the indi property
        """
        sw = self.IUFind("img")
        sw.state = "Alert"
        self.IDSet(sw)
        if "fits" in names:
            self.IDMessage("Generating New FITS Image")
            self.new_fits()
        else:
            self.IDMessage("Generating New JPG Image")
            self.new_jpg()

        sw.state = "Ok"
        self.IDSet(sw)


    def new_jpg(self) -> None:
        """Generate a new JPG image on switch click and submit with
        IDSetBLOB
        """
        if not PIL:
            self.IDMessage("To test JPG images please install PIL\
                 https://pillow.readthedocs.io/en/stable/")
            return 

        data = self.build_star_field(15, peak=254, sigma=2)
        jpg = Image.fromarray(data, mode="L")
        jpg.save("img.jpg")
        blob = self.IUFind("blob")
        
        with open("img.jpg", 'rb') as imgfd:
            bd = imgfd.read()
            blob["jpg_blob"] = bd

        self.IDSetBLOB(blob)


    def new_fits(self) -> None:
        """Generate a new fits on switch click and submit it with IDSetBLOB.
        """

        blob = self.IUFind("blob")
        data = self.build_star_field(15)

        fitsdata = fits.PrimaryHDU(data=data)
        mem = BytesIO()
        fitsdata.writeto(mem)
        mem.seek(0)

        blob["fits_blob"] = mem.read()
        self.IDSetBLOB(blob)


    def build_star_field(self, nstars: int, sigma :int=None, peak :int=None) -> np.array:
        """Use vectorized gauss to build a star field

        Parameters
        ----------
        nstars : int
            number of stars in the fields
        sigma : int, optional
            spread term of the gaussian star generator, by default None
        peak : int, optional
            coefficient of the gaussian star generator, by default None

        Returns
        -------
        np.array
            star field pixel data as numpy array.
        """
        data = np.zeros([255, 255], dtype=int)
        stars = np.random.randint(0,255, size=[20,2])
        xs,ys = np.mgrid[:255,:255]

        for x0,y0 in stars:
            if sigma is None:
                sigma = np.random.randint(1, 5)
                peak = np.random.randint(1, 32)
            star = self.gauss(xs, ys, peak, x0, y0, sigma)
            data = data + star
        
        return data.astype("int8")

    @np.vectorize
    def gauss( 
        x: int, 
        y: int=1, 
        peak: int=5, 
        x0: int=5, 
        y0: int=5, 
        sigma: int=1) -> np.array:
        """Create a gaussian distribution to simulate a star on a ccd. Using
        np.vectorize create a static method (does not pass self).

        Parameters
        ----------
        x : int
           X coordinate of simulated centroid            
        y : int
            Y coordinate of simulated centroid
        peak : int, optional
             Max height of gaussian,by default 5:int
        x0 : int, optional
            X coordinate of centroid, by default 5:int
        y0 : int, optional
            y coordinate of centroid, by default 5:int
        sigma : _type_, optional
            int, by default 1:int

        Returns
        -------
        np.array
            array of the data with star field
        """
        xterm = (x-x0)**2/(2*sigma**2)
        yterm = (y-y0)**2/(2*sigma**2)

        return peak*np.exp(-1*(xterm+yterm)) 


async def main():
    BD = BLOBDevice()
    await BD.astart()

asyncio.run(main())