#!/usr/bin/env python3.8

import sys
from pathlib import Path
import asyncio
import base64
from PIL import Image
import cv2
import io
import redis
import json
import logging
try:
    import aiomysql
except Exception as error:
    pass
from configparser import ConfigParser
import os

sys.path.insert(0, str(Path.cwd().parent))
from pyindi import device as INDIDevice


if "PYINDI_CONFIG_PATH" in os.environ:
    configpath = Path(os.environ["PYINDI_CONFIG_PATH"]) /\
            Path("pyindi.ini")
else:
    configpath = Path(os.environ["HOME"]) / Path(".pyindi") /\
            Path("pyindi.ini")


config = ConfigParser()
config.read(str(configpath))


class mount( INDIDevice.device ):
    """mount device class
    
    """
    once = True

    def ISNewNumber( self, dev, name, values, names ):
        pass

    def ISNewText(self, dev, name, texts, names ):
        pass
    
    def ISNewSwitch( self, dev, name, states, names):
        pass


    def repeat( self ):
        
        try:
        
            r = redis.Redis(host="redis.mmto.arizona.edu")
            mkeys = r.keys("mount_mini*")
            values = {key.decode():json.loads(r.get(key).decode())['value'] for key in mkeys}
            nums = self.IUFind(device="mount", name="mount_nums")

            #O(N*N) where N is number of keys :(

            for key, value in values.items():
                for num in nums.np:
                    if num.name == key:
                        num.value = value
                

            
            self.IDSet(nums)
    
            radec = self.IUFind(device="mount", name="EQUATORIAL_EOD_COORD")
            radec.np[0].value = float(values['mount_mini_comra_tod'])
            radec.np[1].value = float(values['mount_mini_comdec_tod'])

            self.IDSet(radec)
            #self.IDMessage("Doing RADEC")


        except Exception as err:
            self.IDMessage(f"There was an error in repeat {err}")
            #self.IDMessage(f"There was an error in repeat {values}")

        self.IEAddTimer( 1000.0, self.repeat )

    


    def ISGetProperties( self, device:str=None ):
        """ISGetProperties
        args:
            device->name of the device

            THis funtion is called when the 
            client or indiserver sends the
            `<getProperties>` tag.
        """

        r = redis.Redis(host="redis.mmto.arizona.edu")
        mkeys = r.keys( "mount_mini*" )
        values = {key.decode():json.loads(r.get(key).decode())['value'] for key in mkeys}
        inums = []
        for key, val in values.items():
            try:
                val = float(val)
                label = key.replace("mount_mini_", "")
                label = label.replace("_", " ")

                inums.append( INDIDevice.INumber(key, "%f", 0, int(1e8), 0,
                    val, label=label.upper()) )

            except ValueError:
                pass

        ivec = INDIDevice.INumberVector(inums, self.__class__.__name__,
                "mount_nums", INDIDevice.IPState.OK, INDIDevice.IPerm.RO,
                label="Mount Numbers"
                )
        
                

        self.IDDef(ivec)

        ra = INDIDevice.INumber('RA', '%9.6m', 0, 24, 0.001, 0.0, "RA")
        dec = INDIDevice.INumber('DEC', '%9.6m', -90, 90, 0.001, 0.0, "Dec")
        radec = INDIDevice.INumberVector(
            
            [ra, dec], 
            self.device,
            "EQUATORIAL_EOD_COORD",
            INDIDevice.IPState.IDLE, 
            INDIDevice.IPerm.RO, 
            label="RaDec")

        self.IDDef(radec)
        


        if self.once:
            self.IEAddTimer(1000, self.repeat )


    async def get_mount_meta(self):
        
        cols = ("ds_name", "type", "description", "redis_name","legendtext",
            "is_numeric", "activetext", "inactivetext", "units", "pointrange"
            )

        conn = await \
        aiomysql.connect(host=self.config["DEFAULT"]['mysql_host'],
                port=self.config["DEFAULT"]["mysql_port"],
                                      user=self.config["DEFAULT"]['mysql_user'],
                                      password=self.config["DEFAULT"]['mysql_host'],
                                      db=self.config["DEFAULT"]["mysql_dbname"],
                                      loop=self.mainloop)

        async with conn.cursor() as cur:
            expr = f"{cols[0]}"
            for col in cols[1:]: expr+=f", {col}"
            expr = f"SELECT {expr} FROM aaa_parameters"
            await cur.execute(expr)
            print(cur.description)
            global r
            r = await cur.fetchall()
            global df
            df = pd.DataFrame(r, columns=cols )
            df.index = df[cols[0]]
            df = df.loc[ [idx for idx in df.index if "mount_mini_" in idx] ]
        
        conn.close()
        return df


device = mount( config=config )
device.start()    

