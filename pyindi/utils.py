from xml.sax import ContentHandler
from xml.sax.expatreader import ExpatParser
from xml.etree import ElementTree as etree
from .client import INDIClientSingleton


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
        self._groups = {}

        super().__init__()


    # circular reference
    def set_parent(self, parent):
        self.parent = parent
    

    def watch_property(self, device, name, callback=None):
        if callback is None:
            callback = lambda ele:print(ele)
        print(f"adding {device}.{name} to watched list")
        self._watched[f"{device}.{name}"] = callback


    def watch_all(self, device, callback=None):
        self._watchAll = True
        if callback is not None:
            self._watched['f{device}.*'] = callback


    def startElement(self, tag, attr):
        if tag == "root":
            return

        if tag[:3] not in ("set", "def", "one"):
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

    def new_device(self, device):
        for name, fxn in self.parent.new_device_fxns.items():
            fxn(self.parent, device)

    def new_group(self, device, group):
        for name, fxn in self.parent.new_group_fxns.items():
            fxn(self.parent, device, group)


class INDIHandle(INDIClientSingleton):
    """
    Pythonic way of handling INDI xml events
    like def:
    new device, new group and or new property
    or updating a property with set. 
    """
    handler=XMLHandler()
    feeder=XMLFeeder(handler)
    new_device_fxns = {}
    new_group_fxns = {}
    call_on_init = []


    def __init__(self):
        self.handler.set_parent(self)
        for fxn in self.call_on_init:
            fxn(self)


    async def xml_from_indiserver(self, data):
        self.feeder.write_message(data)


    async def getProperties(self, device='', name=None):


        if name is None:
            xml = f"<getProperties version='1.7' device='{device}'/>"
        else:
            xml = f"<getProperties version='1.7' device='{device}' name='{name}'/>"

        await self.xml_to_indiserver(xml)


    def watch(self, device, name, callback=None):
        print(f"calling watch_property {device}.{name}")
        self.handler.watch_property(device, name, callback)

    def devices(self):
        return self.hander._devices
    
    def groups(self):
        return self.hander._groups

    @classmethod
    def new_device(cls, fxn):
        cls.new_device_fxns[fxn.__name__] = fxn

    @classmethod
    def new_group(cls, fxn):
        cls.new_group_fxns[fxn.__name__] = fxn

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
   
