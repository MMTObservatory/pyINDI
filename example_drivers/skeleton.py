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
        """Handle new text values"""
        self.IDMessage(f"Updating {name} text")
        self.IUUpdate(device, name, names, values, Set=True)

    def ISNewNumber(self, device, name, names, values):

        """Handle new number values"""
        self.IDMessage(f"Updating {name} number")
        self.IUUpdate(device, name, names, values, Set=True)

    def ISNewSwitch(self, device, name, names, values):

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
