from pyindi.utils import INDIHandler
import sys
import asyncio
from xml.etree import ElementTree as etree


class Debugger(INDIHandler):




    async def main(self, host, port):

        self.start(host=host, port=port)
        tsk = asyncio.create_task(self.connect())
        print(self.handler._watched)
        await asyncio.sleep(0.5)
        await self.getProperties("SBIG CCD")

        await tsk

    @INDIDebugger.new_device
    def on_new_device(self, device):
        pass

    @INDIDebugger.new_group
    def on_new_group(self, device, group):
        pass



    @INDIDebugger.handle_property("SBIG CCD", "CONNECTION")
    def on_connection(self, ele):
        print(self.unwrap_xml(ele))


def callback(ele):
    
    print(etree.tostring(ele).decode())

d=Debugger()
asyncio.run(d.main(*sys.argv[1:]))
