from xml.sax import ContentHandler
from xml.sax.expatreader import ExpatParser
from xml.etree import ElementTree as etree
from .client import INDIClientSingleton
import logging
import time
import asyncio


class XMLFeeder:

    def __init__(self, handler=None):
        if handler is None:
            handler = XMLHandler()

        self.parser = ExpatParser()
        self.parser.setContentHandler( handler )

        # we need to fake a root element
        self.parser.feed("<root>")

    def write_message(self, data):
        self.parser.feed(data)


class XMLHandler(ContentHandler):

    blobnames = set()
    reading = False
    current_blob = None


    def __init__(self):
        self._watched = {}
        self._isWatching = False
        self._currentData = None
        self._currentElement = None
        self._rootElement = None
        self._currentKey = None
        self._currentMessage = None
        self._groups = {}

        super().__init__()


    # circular reference
    def set_parent(self, parent):
        self.parent = parent
    

    def watch_property(self, device, name, callback=None):
        if callback is None:
            callback = lambda ele:print(ele)
        logging.debug(f"watching property {device}.{name}")
        self._watched[f"{device}.{name}"] = callback


    def watch_all(self, device, callback=None):
        self._watchAll = True
        if callback is not None:
            self._watched['f{device}.*'] = callback


    def startElement(self, tag, attr):
        logging.debug(f"tag is {tag}")
        if tag == "root":
            return

        if tag[:3] not in ("set", "def", "one", "mes"):
            return

        if self._isWatching:
            newElement = etree.Element(tag, **dict(attr))
            self.currentElement.append(newElement)
            self.currentElement = newElement
            return

        if tag[:3] in ("def", "set"):
            if 'device' not in attr.keys():
                return 
            device = attr.getValue('device')
            name = attr.getValue('name')
            try:
                group = attr.getValue('group')
            except Exception as error:
                group = None

            self._currentKey = f"{device}.{name}"

            
            if device not in self._groups:
                self._groups[device] = [group]
                self.new_device(device)
                
            else:
                if group is None:
                    pass
                elif group not in self._groups[device]:
                    self._groups[device].append(group)
                    self.new_group(device, group)

            if self._currentKey in self._watched:
                self.rootElement = etree.Element(tag, **dict(attr))
                self.currentElement = self.rootElement
                self._isWatching = True

            elif f"{device}.*" in self._watched:
                self.rootElement = etree.Element(tag, **dict(attr))
                self.currentElement = self.rootElement
                self._isWatching = True
                self._currentKey = f'{device}.*'
                
        elif tag == "message":
            #logging.debug(f"we have a message {message.attrib['message']}")
            self.currentMessage = etree.Element(tag, **dict(attr))


    def characters(self, content):
        if self._isWatching:
            if self.currentElement.text is None:

                self.currentElement.text=content
            else:
                self.currentElement.text+=content
                

    
    def endElement(self, tag):
        if self._isWatching:
            
            
            if tag == self.rootElement.tag:
                
                device = self.rootElement.attrib['device']
                name = self.rootElement.attrib['name']
                key=f"{device}.{name}"

                if self._currentKey == key:
                    pass
                elif self._currentKey == f"{device}.*":
                    pass
                else:
                    raise RuntimeError(f"We don't understand the key {key} != {self._currentKey}")

                try:
                    self._watched[self._currentKey](self.rootElement)
                except Exception as error:
                    print(f"{key} callback gave error: {error}")
                    raise
                self._isWatching=False

            elif tag == self.currentElement.tag:
                self.currentElement = self.rootElement

        if tag == "message":
            logging.debug("MESSAGE IS ...")
            self.parent.new_message(self.currentMessage)
            self.currentMessage = None




    def new_device(self, device):
        self.parent.new_device(device)

    def new_group(self, device, group):
        self.parent.new_group(device, group)


class INDIEvents(INDIClientSingleton):
    """
    Pythonic way of handling INDI xml events
    like def:
    new device, new group and or new property
    or updating a property with set. 
    """

    # these are here because the
    # classmethods need to see them.
    handler=XMLHandler()
    feeder=XMLFeeder(handler)
    call_on_init = []


    def __init__(self):   

        # Make the XMLHandler aware of 
        # the INDIHandle client so it can
        # call INDHandle methods corresponding
        # to XML events.
        self.handler.set_parent(self)
        for fxn in self.call_on_init:
            fxn(self)


    async def xml_from_indiserver(self, data):
        logging.debug(f"New data from indiserver {data[:20]}")
        self.feeder.write_message(data)

    
    async def connection(self, timeout=0):
        if timeout > 0:
            start = time.time()
            while (time.time() - start) < timeout:
                if self.is_connected:
                    return
                else:
                    await asyncio.sleep(0.25)
        else:
            while 1:
                if self.is_connected:
                    return
                else:
                    await asyncio.sleep(0.25)



    async def getProperties(self, device='', name=None):


        if name is None:
            xml = f"<getProperties version='1.7' device='{device}'/>\n"
        else:
            xml = f"<getProperties version='1.7' device='{device}' name='{name}'/>\n"

        await self.xml_to_indiserver(xml)


    def watch(self, device, name, callback=None):
        print(f"calling watch_property {device}.{name}")
        self.handler.watch_property(device, name, callback)

    def devices(self):
        return self.hander._devices
    
    def groups(self):
        return self.hander._groups

    def new_device(self, device):
        logging.debug(f"Ignoring new device {device}")

    def new_group(self, device, group):
        logging.debug(f"Ignoring new group {group}")

    def new_msg(self, message):
        logging.debug(f"Ignoring new message {msg}")

#    @classmethod
#    def new_device(cls, fxn):
#        cls.new_device_fxns[fxn.__name__] = fxn
#
#    @classmethod
#    def new_group(cls, fxn):
#        cls.new_group_fxns[fxn.__name__] = fxn

    @classmethod
    def handle_property(cls, device, name):
        print("defining add_callback")
        def add_callback(fxn):
            def init(self):
                with_inst = lambda ele : fxn(self, ele)
                cls.handler.watch_property(device, name, with_inst)
            cls.call_on_init.append(init)

        print("returning add_callback")

        return add_callback

    def unwrap_xml(self, ele):
        props = []
        if ele.tag[:3] in ('def', 'set'):
            for child in ele:
                props.append(
                    dict(
                        tag = child.tag,
                        attrib = child.attrib,
                        text = child.text
                    )
                )

        return dict(
                tag = ele.tag,
                attrib = ele.attrib,
                props = props
                )

    def setindi(self, device, name, values, names):
        pass

