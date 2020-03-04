#!/usr/bin/env python


from lxml import etree
import asyncio
import sys
import logging
import datetime
from enum import Enum
from typing import Union, Callable
import os
# import base64

from abc import ABC
from pathlib import Path

"""
The Base classes for the pyINDI device. Definitions
are adapted from the INDI white paper:
http://www.clearskyinstitute.com/INDI/INDI.pdf
For now we will only by supporting version 1.7

Naming convention are based on the indilib c++ version:
http://www.indilib.org/api/index.html
"""


now = datetime.datetime.now()
timestr = now.strftime("%H%M%S-%a")

if Path("/src").exists():
    """
    TODO: The logging path should be a
    configureable or an environment variable.
    """
    logging.basicConfig(format="%(asctime)-15s %(message)s",
                        filename=f'/src/{timestr}.log',
                        level=logging.DEBUG)
else:
    logging.basicConfig(format="%(asctime)-15s %(message)s",
                        filename=f'{timestr}.log',
                        level=logging.DEBUG)


async def stdio(limit=asyncio.streams._DEFAULT_LIMIT, loop=None):

    """
    Collect the stdio as async streams. This is a shameless
    ctrl-c ctrl-v of this stackoverflow:
    https://stackoverflow.com/questions/52089869/how-to-\
            create-asyncio-stream-reader-writer-for-stdin-stdout
    """
    if loop is None:
        loop = asyncio.get_event_loop()
    reader = asyncio.StreamReader(limit=limit, loop=loop)
    await loop.connect_read_pipe(
                    lambda: asyncio.StreamReaderProtocol(reader, loop=loop),
                    sys.stdin)
    writer_transport, writer_protocol = await loop.connect_write_pipe(
                    lambda: asyncio.streams.FlowControlMixin(loop=loop),
                            os.fdopen(sys.stdout.fileno(), 'wb'))
    writer = asyncio.streams.StreamWriter(
                        writer_transport, writer_protocol, None, loop)
    return reader, writer


def print(msg: Union[str, bytes]):
    """
    This was the old way of writing to stdout
    We use the stdio fxn now. 
    """

    if type(msg) == bytes:
        msg = msg.decode()
    sys.stdout.write(msg)
    sys.stdout.flush()
    return




class INDIEnumMember(int):
    """
    ## INDIEnumMember
    This sublcasses the int class to match
    the standard enum int type but adds
    a string in the assignment to allow
    for comparison with the raw xml
    attribute.
    """

    def __new__(cls, value: int, string: str):
        """
        Overload the assignment method to add the
        string.
        """

        obj = int.__new__(cls, value)
        obj.string = string
        return obj

    def __eq__(self, other):
        if isinstance(other, str):
            return self.string == other
        elif isinstance(other, Enum):
            return self.value == other.value
        return False

    def __repr__(self):
        return f"<{self.__name__}: {self.string}>"


class INDIEnum(INDIEnumMember, Enum):
    """
    ## INDIEnum
    There are many INDI attributes in the XML protocol that
    require the attribute value to be one of a small set of
    strings. An example is the INDI state attribute. The
    state can be one of  Idle|Ok|Busy|Alert .

    I would like to compare the string value of the attribute
    with the Enum type associated with it. This way
    we can have simple looking code like:

    ```
    ivp.state = IPState.IDLE
    ivp.state == "Idle"  returns True
    ivp.state == IPState.IDLE # returns True
    ```

    To make this happen I had to get clever with the
    python Enum and subclass the int type for enum
    members. See INDIEnumMember above.
    """

    def __new__(cls, value: int, string: str):
        obj = INDIEnumMember.__new__(cls, value, string)
        obj._value_ = value

        return obj

    def __str__(self):
        return self.string

    def __repr__(self):
        return f"<IPState: {self.string}>"


class IPState(INDIEnum):
    """
    INDI state property.
    This is an attribute of all
    vector properties--Number,
    Text, Light and Switch.
    """
    IDLE = (0, "Idle")
    OK = (1, "Ok")
    BUSY = (2, "Busy")
    ALERT = (3, "Alert")


class IPerm(INDIEnum):
    """
    INDI permissions
    """
    RO = (0, "ro")
    WO = (1, "wo")
    RW = (2, "rw")


class ISRule(INDIEnum):
    """
    INDI switch rule
    """

    ONEOFMANY = (0, "OneOfMany")
    ATMOST1 = (1, "AtMostOne")
    NOFMANY = (2, "AnyOfMany")


class ISState(INDIEnum):
    """
    INDI Switch State
    """
    OFF = (0, "Off")
    ON = (1, "On")

    @staticmethod
    def fromstring(string):
        if "Off" in string:
            return ISState.OFF

        elif "On" in string:
            return ISState.ON

        raise ValueError(f"ISState must be either Off or On not {string}")


class IVectorProperty(ABC):
    """
    INDI Vector asbstractions

    TODO: Any member of any subclass of this class should
    be handled by setter and getter decorators. 
    
    """
    dtd = etree.DTD(
            (Path(__file__).parent/"data/indi.dtd").open())

    def __init__(self,
                 device: str, name: str, state: IPState,
                 label: str = None, group: str = None):

        self.device = device
        self.name = name

        if label is None:
            label = name

        self.label = label
        self.group = group

        self._state = state

        if hasattr(self, "np"):
            self.iprops = self.np
        elif hasattr(self, "tp"):
            self.iprops = self.tp
        elif hasattr(self, "lp"):
            self.iprops = self.lp
        elif hasattr(self, "sp"):
            self.iprops = self.sp
        elif hasattr(self, "bp"):
            self.iprops = self.bp
        else:
            raise AttributeError("Must have np, tp, lp, sp, bp attribute")

    @property
    def state(self):
        return self._state

    @state.setter
    def state(self, val):
        if val not in IPState:
            raise ValueError("{val} is not one of {list(IPState)}")
        for st in IPState:
            if st == val:
                self._state = st

    def Def(self, msg=None):
        """
        This will put together the defXXX xml element
        for any vector property. It uses the dtd files
        to map the xml attributes members of this class.
        """
        tagname = "def"+self.tagcontext
        dtd_elements = {tag.name: tag for tag in self.dtd.iterelements()}
        if tagname not in dtd_elements:
            raise AttributeError(
                                 "{tagname} not defined in \
                                 Document Type Definition")

        ele_definition = dtd_elements[tagname]
        ele = etree.Element(ele_definition.name)
        for attribute in ele_definition.iterattributes():
            if hasattr(self, attribute.name):
                ele.set(attribute.name, str(getattr(self, attribute.name)))
        for prop in self.iprops:
            ele.append(prop.Def())

        if msg is not None:
            ele.set("message", msg)

        return ele

    def Set(self, msg=None):
        """
        This will put together the setXXX xml element
        for any vector property. It uses the dtd file(s)
        to map aml attribute to members of this class.
        """
        tagname = "set"+self.tagcontext
        dtd_elements = {tag.name: tag for tag in self.dtd.iterelements()}
        if tagname not in dtd_elements:
            raise AttributeError(
                                 f"{tagname} not defined in \
                                 Document Type Definition")

        ele_definition = dtd_elements[tagname]
        ele = etree.Element(ele_definition.name)
        for attribute in ele_definition.iterattributes():
            if hasattr(self, attribute.name):
                ele.set(attribute.name, str(getattr(self, attribute.name)))
        for prop in self.iprops:
            ele.append(prop.Set())

        if msg is not None:
            ele.set("message", msg)

        return ele


class IProperty:
    dtd = etree.DTD(
            (Path(__file__).parent/"data/indi.dtd").open())

    def __init__(self, name: str, label: str = None):

        if label is None:
            label = name

        self.label = label
        self.name = name

    def Def(self):
        tagname = "def"+self.tagcontext
        dtd_elements = {tag.name: tag for tag in self.dtd.iterelements()}

        if tagname not in dtd_elements:
            raise AttributeError(
                                 f"{tagname} not defined in \
                                 Document Type Definition")

        ele_definition = dtd_elements[tagname]
        ele = etree.Element(ele_definition.name)
        for attribute in ele_definition.iterattributes():
            if hasattr(self, attribute.name):
                ele.set(attribute.name, str(getattr(self, attribute.name)))

        # Blob definitions have empty data.
        if not isinstance(self, IBLOB):
            ele.text = str(getattr(self, self.valuename))

        return ele

    def Set(self):
        tagname = "one"+self.tagcontext
        dtd_elements = {tag.name: tag for tag in self.dtd.iterelements()}

        if tagname not in dtd_elements:
            raise AttributeError(
                                 f"{tagname} not defined in \
                                 Document Type Definition")

        ele_definition = dtd_elements[tagname]
        ele = etree.Element(ele_definition.name)
        for attribute in ele_definition.iterattributes():
            if hasattr(self, attribute.name):
                ele.set(attribute.name, str(getattr(self, attribute.name)))

        ele.text = str(getattr(self, self.valuename))

        return ele


class INumberVector(IVectorProperty):

    tagcontext = "NumberVector"

    def __init__(self,
                 np: list,
                 device: str,
                 name: str,
                 state: IPState,
                 perm: IPerm,
                 timeout: float = 0,
                 timestamp: datetime.datetime = None,
                 label: str = None,
                 group: str = None):
        """
         ## Arguments:
         * np: List of INumber properties in the INumberVector
         * device: Name of indi device
         * name: Name of INumberVector
         * state: State

        """

        self.perm = perm
        self.np = np
        super().__init__(device, name, state, label, group)


class INumber(IProperty):

    tagcontext = "Number"
    valuename = "value"

    def __init__(self,
                 name: str,
                 format: str,
                 min: float,
                 max: float,
                 step: float,
                 value: float,
                 label: str = None):

        super().__init__(name, label)

        self.format = format
        self.min = min
        self.max = max
        self.step = step
        self.value = value


class ITextVector(IVectorProperty):

    tagcontext = "TextVector"

    def __init__(self,
                 tp: list,  # List of IText properties
                 device: str,
                 name: str,
                 state: IPState,
                 perm: IPerm,
                 timeout: float = 0,
                 timestamp: datetime.datetime = None,
                 label: str = None,
                 group: str = None):
        """
         ## Arguments:
         * np: List of INumber properties in the INumberVector
         * device: Name of indi device
         * name: Name of INumberVector
         * state: State

        """

        self.perm = perm
        self.tp = tp
        super().__init__(device, name, state, label, group)


class IText(IProperty):

    tagcontext = "Text"
    valuename = "text"

    def __init__(self,
                 name: str,
                 text: str,
                 label: str = None):

        super().__init__(name, label)
        self.text = text


class ILightVector(IVectorProperty):

    tagcontext = "LightVector"

    def __init__(self,
                 lp: list,  # List of IText properties
                 device: str,
                 name: str,
                 state: IPState,
                 timeout: float = 0,
                 timestamp: datetime.datetime = None,
                 label: str = None,
                 group: str = None):
        """
         ## Arguments:
         * np: List of INumber properties in the INumberVector
         * device: Name of indi device
         * name: Name of INumberVector
         * state: State

        """

        self.lp = lp
        super().__init__(device, name, state, label, group)


class ILight(IProperty):

    tagcontext = "Light"
    valuename = "state"

    def __init__(self,
                 name: str,
                 state: IPState,
                 label: str = None):

        super().__init__(name, label)

        self.state = state


class ISwitchVector(IVectorProperty):

    tagcontext = "SwitchVector"

    def __init__(self,
                 sp: list,  # List of ISwitch properties
                 device: str,
                 name: str,
                 state: IPState,
                 rule: ISRule,
                 perm: IPerm,
                 label: str = None,
                 group: str = None):
        """
         ## Arguments:
         * np: List of INumber properties in the INumberVector
         * device: Name of indi device
         * name: Name of INumberVector
         * state: State

        """

        self.perm = perm

        self.sp = sp
        self.rule = rule
        super().__init__(device, name, state, label, group)


class ISwitch(IProperty):

    tagcontext = "Switch"
    valuename = "state"

    def __init__(self,
                 name: str,
                 state: ISState,
                 label: str = None):

        super().__init__(name, label)

        self.state = state


class IBLOBVector(IVectorProperty):

    tagcontext = "BLOBVector"

    def __init__(self,
                 bp: list,  # List of IText properties
                 device: str,
                 name: str,
                 state: IPState,
                 perm: IPerm,
                 label: str = None,
                 timeout: str = None,
                 group: str = None):
        """
         ## Arguments:
         * np: List of INumber properties in the INumberVector
         * device: Name of indi device
         * name: Name of INumberVector
         * state: State

        """

        self.perm = perm
        self.bp = bp
        super().__init__(device, name, state, label, group)


class IBLOB(IProperty):

    tagcontext = "BLOB"
    valuename = "data"

    def __init__(self,
                 name: str,
                 format: str,
                 label: str = None):
        super().__init__(name, label)
        self.format = format
        self.data = None




class device(ABC):
    """
    Handle the stdin/stdout xml.
    

    Thoughts on Concurrency:
    Concurrency in this class is handled via asyncio.
    Its individual methods are NOT threadsafe and each
    call should be executed in the same thread. If your 
    device requires lots of IO bound calls, as most 
    devices will, it is recommended that you also use
    asyncio to handle concurrency. If your device 
    hase CPU bound activities it is recommended that you
    use a multi processing paradigm.

    Either way you should use the mainloop member
    of this class to utilize concurrency. With IO 
    bound calls use the many available futures/task
    methods. With CPU bound you should use 
    self.mainloop.run_in_executor to run tasks 
    in a process pool. 
    
    
    """


    def __init__(self, loop=None, config=None, name=None):

        """
        Arguments:
        loop: the asyncio event loop
        config: the configureable info from ConfigParser
        name: Name of the device defaulting to name of the class
        """

        if loop is None:
            self.mainloop = asyncio.get_event_loop()
        else:
            self.mainloop = loop

        if name is not None:
            self._devname = self.__class__.__name__
        else:
            self._devname = name

        self.props = []
        self.config = config
        self.timer_queue = asyncio.Queue()

        self.reader, self.writer = \
                self.mainloop.run_until_complete(stdio(loop=self.mainloop))


    def name(self):
        return self._devname


    def __repr__(self):
        return f"<{self.name()}>"


    def start(self):
        """
        Start up the mainloop, grab the stdio and run the xml reader.
        This method can hide the asynchronicity from subclasses. Simply
        instantiate the subclass and call this method in the same thread
        and you never have to know that this is asyncio. 
        """

        self.mainloop.run_until_complete( self.run() )


    async def run(self):
        """
        Read stdin and try to parse as xml

        TODO: Create a real condition for the
        while loop. IT would be nice to be able
        to shutdown gracefully. 
        """

        inp = ""
        while 1:

            inp += (await self.reader.readline()).decode()
            try:
                # TODO: This should be done with a feed parser
                xml = etree.fromstring(inp)
                inp = ""

            except etree.XMLSyntaxError as error:
                # This is not the best way to check
                # for completed xml. 
                logging.debug(f"{error} {inp}")
                continue

            logging.debug(etree.tostring(xml, pretty_print=True))
            if xml.tag == "getProperties":
                if "device" in xml.attrib:
                    self.ISGetProperties(xml.attrib['device'])
                else:
                    self.ISGetProperties()

            elif xml.tag == "newNumberVector":
                try:
                    names = [ele.attrib["name"] for ele in xml]
                    values = [float(ele.text) for ele in xml]
                    self.ISNewNumber(
                                     xml.attrib["device"],
                                     xml.attrib["name"], values, names)

                except Exception as error:
                    logging.debug(f"{error}")
                    logging.debug(etree.tostring(xml))
                    raise
            elif xml.tag == "newTextVector":
                try:
                    names = [ele.attrib["name"] for ele in xml]
                    values = [str(ele.text) for ele in xml]
                    self.ISNewText(
                                   xml.attrib["device"],
                                   xml.attrib["name"], values, names)
                except Exception as error:
                    logging.debug(f"{error}")
                    logging.debug(etree.tostring(xml))
                    raise

            elif xml.tag == "newSwitchVector":
                try:
                    names = [ele.attrib["name"] for ele in xml]
                    values = [ISState.fromstring(ele.text) for ele in xml]
                    self.ISNewSwitch(
                                     xml.attrib["device"],
                                     xml.attrib["name"], values, names)
                except Exception as error:
                    logging.debug(f"{error}")
                    logging.debug(etree.tostring(xml))
                    raise

    def IEAddTimer(self, millisecs: int, funct_or_coroutine: Callable, *args):
        """
        create a callback to be executed after a delay.

        9 times out of 10 this will be appended to the bottom 
        of the callback so that this is called in a loop. 
        I hope make this functonality happen with a simple 
        decorator over the callback function. 
        """
        self.mainloop.call_soon_threadsafe(
            self.mainloop.call_later,
            millisecs/1000.0,
            funct_or_coroutine,
            *args)


    def ISNewNumber(dev: str, name: str, values: list, names: list):
        raise NotImplementedError(
                                  "Device driver must \
                                  overload ISNewNumber method.")

    def IUFind(self, device, name, group=None):
        """
        Modeled after the IUFindXXX set of equations
        [see here](http://www.indilib.org/api/group__\
                dutilFunctions.html#gac8609374933e4aaea5a16cbafcc51ce2)
        """
        for p in self.props:
            if p.name == name and p.device == device:
                if group is not None:
                    if p.group == group:
                        return p
                else:
                    return p

        # We could let this return None but not finding a
        # property seems to be a pretty important issue.
        raise ValueError(f"Could not find {device}, {name} in {self.props}")

    def ISGetProperties(self):
        raise NotImplementedError(
                                  f"Subclass of {self.__name__} must \
                                  implement ISGetProperties")

    def IDMessage(self, msg: str, 
            timestamp: Union[str, datetime.datetime, None]=None):

        if type(timestamp) == datetime.datetime:
            timestamp = timestamp.isoformat()

        elif timestamp is None:
            timestamp = datetime.datetime.now().isoformat()

        xml = f'<message message="{msg}" '
        xml+= f'timestamp="{timestamp}" '
        xml+= f'device="{self.name()}"> '
        xml+= f'</message>'

        self.writer.write(xml.encode())

    def IDSetNumber(self, n: INumberVector, msg=None):
        self.IDSet(n)
        

    def IDSetText(self, t: ITextVector, msg=None):
        self.IDSet(t)

    def IDSetLight(self, l: ILightVector, msg=None):
        self.IDSet(l)

    def IDSetSwitch(self, s: ISwitchVector, msg=None):
        self.IDSet(s)

    def IDSet(self, vector: IVectorProperty, msg=None):
        if isinstance(vector, IBLOB) or isinstance(vector, IBLOBVector):
            raise("Must use IDSetBLOB to send BLOB to client.")
        self.writer.write(etree.tostring(vector.Set(msg), pretty_print=True))

    def IDSetBLOB(self, blob):
        self.writer.write(etree.tostring(blob.Set()))

    def IDDef(self, prop, msg=None):

        # register the property internally
        self.props.append(prop)
        # Send it to the indiserver
        self.writer.write((etree.tostring(prop.Def(msg), pretty_print=True)))
        #self.mainloop.call_soon(self.writer.drain())
