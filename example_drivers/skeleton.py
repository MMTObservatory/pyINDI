#!/usr/bin/env python
import sys
from pathlib import Path
import random
sys.path.insert(0, str(Path.cwd().parent))
from pyindi.device import device

"""
This file uses a skeleton xml file to initialize and
define properties. Similar to this example at indilib
https://www.indilib.org/developers/driver-howto.html#h2-properties
"""


class SkeletonDevice(device):

    def ISGetProperties(self, device=None):
        """Property Definiations are generated
        by initProperties and buildSkeleton. No
        need to do it here. """
        pass

    def initProperties(self):
        """Build the vector properties from
        the skeleton file."""
        self.buildSkeleton("skeleton.xml")

    def ISNewText(self, device, name, names, values):
        """A new text vector has been updated from 
        the client. In this case we update the text
        vector with the IUUpdate function. In a real
        device driver you would probably want to do 
        something more than that. 

        This function is always called by the 
        mainloop
        """

        self.IDMessage(f"Updating {name} text")
        self.IUUpdate(device, name, names, values, Set=True)

    def ISNewNumber(self, device, name, names, values):

        """A numer vector has been updated from the client.
        In this case we update the number with the IUUpdate
        function. In a real device driver you would want to 
        do something more than this. 

        This function is always called by the 
        mainloop
        """

        self.IDMessage(f"Updating {name} number")
        self.IUUpdate(device, name, names, values, Set=True)

    def ISNewSwitch(self, device, name, names, values):

        """A numer switch has been updated from the client.
        This function handles when a new switch
        
        This function is always called by the 
        mainloop
        """


        self.IDMessage(f"{device}, {name=='CONNECTION'}, {names}, {values}")

        if name == "CONNECTION":

            try:
                lights = self.IUFind("Light Property")
                conn = self.IUUpdate(device, name, names, values)
                if conn["CONNECT"].value == 'Off':
                    for light in lights:
                        light.value = "Idle"
                    conn.state = "Idle"

                    self.IDSet(lights)
                else:
                    conn.state = "Ok"

                self.IDSet(conn)

            except Exception as error:
                self.IDMessage(f"IUUpdate error: {error}")
                raise

    @device.repeat(1000)
    def do_repeate(self):

        self.IDMessage('Running repeat function')

        """
        This function is called after the first get
        properties is initiated and then every 1000ms 
        after that. 
        """

        conn = self.__getitem__("CONNECTION")
        if conn["CONNECT"].value == 'Off':
            return

        states = ('Alert', 'Busy', 'Idle', 'Ok')
        lights = self.IUFind('Light Property')

        for light in lights:
            light.value = random.choice(states)
        self.IDSet(lights)


sk = SkeletonDevice()
sk.start()
