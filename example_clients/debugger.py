from pyindi.utils import INDIEvents
from pyindi.client import INDIClient
import sys
import asyncio
from xml.etree import ElementTree as etree
import logging
#logging.getLogger().setLevel(logging.DEBUG)

class Debugger(INDIEvents):

    async def main(self, host, port, device=''):

        self.start(host=host, port=port)
        inditask = asyncio.create_task(self.connect())
        await self.connection()
        print(self.conn.reader)
        await self.getProperties()

        await inditask
 

    def new_device(self, device):
        print(f"New device {device}")

    def new_group(self, device, group):
        print(f"new group {group}")

    def new_message(self, msg):
        print("new message {msg}")

    @INDIEvents.handle_property("WAVESERV", "CONNECTION")
    def on_connection(self, ele):
        print(self.unwrap_xml(ele))

    @INDIEvents.handle_property("Telescope Simulator", "*")
    def on_connection(self, ele):
        return
        print(self.unwrap_xml(ele))

    def new_message(self, msg):
        logging.warning(msg.attrib["message"])


class client(INDIClient):

    async def xml_from_indiserver(self, data):

        if "message" in data:
            print(data)

async def main(host, port):
    s=client()
    s.start(host=host, port=port)
    tsk = asyncio.create_task(s.connect())
    for a in range(5):
        if s.conn is None:
            print(None)
        else:
            print(s.conn.reader)
        await asyncio.sleep(0.5)
    

    await asyncio.sleep(10)

d=Debugger()
asyncio.run(d.main(*sys.argv[1:]))
#asyncio.run(main(*sys.argv[1:]))
