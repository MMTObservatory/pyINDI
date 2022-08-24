#!/usr/bin/env python

from lxml import etree
import asyncio
import sys
import logging
import datetime
from enum import Enum
from typing import Union, Callable
import os
import base64

from abc import ABC
from pathlib import Path
import functools
import traceback
import inspect

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


async def stdio(limit=asyncio.streams._DEFAULT_LIMIT, loop=None):
    """
    Collect the stdio as async streams. This is a shameless
    ctrl-c ctrl-v of this stackoverflow:
    https://stackoverflow.com/questions/52089869/how-to-\
            create-asyncio-stream-reader-writer-for-stdin-stdout
    """

    if loop is None:
        loop = asyncio.get_event_loop()

    if sys.platform == 'win32':
        # Windows does not support async stdio operations
        reader = WinIO(loop)
        writer = WinIO(loop)
    else:
        reader = asyncio.StreamReader(limit=limit, loop=loop)
        await loop.connect_read_pipe(
            lambda: asyncio.StreamReaderProtocol(reader, loop=loop),
            sys.stdin)

#        writer_transport, writer_protocol = await loop.connect_write_pipe(
#            lambda: asyncio.streams.FlowControlMixin(loop=loop),
#            os.fdopen(sys.stdout.fileno(), 'wb'))
#        writer = asyncio.streams.StreamWriter(
#            writer_transport, writer_protocol, None, loop)
        writer = sys.stdout
    return reader, writer





def printa(msg: Union[str, bytes]):
    """
    This was the old way of writing to stdout
    We use the stdio fxn now.
    """

    if type(msg) == bytes:
        msg = msg.decode()
    sys.stdout.write(msg)
    sys.stdout.flush()
    return


class WinIO:
    """Windows does not support asynchronous stdio
       operations. Instead, this object handles
       those operations in a separate thread."""

    def __init__(self, loop):
        self.loop = loop

    async def readline(self):
        msg = await self.loop.run_in_executor(None, sys.stdin.readline)
        return msg.encode()

    async def read(self, nbytes):
        msg = await self.loop.run_in_executor(
            None,
            functools.partial(sys.stdin.read, nbytes))
        return msg.encode()

    async def write(self, msg):
        print(msg)

    async def drain(self):
        # This does nothing
        await asyncio.sleep(0)


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
        return f"<{self.__class__.__name__}: {self.string}>"


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
        (Path(__file__).parent / "data/indi.dtd").open())

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
        if val not in list(IPState):
            raise ValueError(f"{val} is not one of {list(IPState)}")
        for st in IPState:
            if st == val:
                self._state = st

    def Def(self, msg=None):
        """
        This will put together the defXXX xml element
        for any vector property. It uses the dtd files
        to map the xml attributes members of this class.
        """

        tagname = "def" + self.tagcontext
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

    def __str__(self):
        return f"<I{self.tagcontext} name={self.name}, device={self.device}>"

    def __repr__(self):
        return self.__str__()

    def Set(self, msg=None):
        """
        This will put together the setXXX xml element
        for any vector property. It uses the dtd file(s)
        to map xml attribute to members of this class.
        """
        tagname = "set" + self.tagcontext
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
            logging.warning(prop)
            ele.append(prop.Set())

        if msg is not None:
            ele.set("message", msg)

        return ele

    @property
    def elements(self):
        if isinstance(self, INumberVector):
            return self.np
        elif isinstance(self, ITextVector):
            return self.tp
        elif isinstance(self, ILightVector):
            return self.lp
        elif isinstance(self, ISwitchVector):
            return self.sp
        elif isinstance(self, IBLOBVector):
            return self.bp

    def __getitem__(self, name: str):
        """
        retrieve the IProperty
        """
        for ele in self.elements:
            if ele.name == name:
                return ele

        raise KeyError(f"{name} not in {self.__str__()}")

    def __setitem__(self, name, val):

        for ele in self.elements:
            if ele.name == name:
                ele.value = val
                return

        raise KeyError(f"{name} not in {self.__str__()}")

    def __iter__(self):
        for ele in self.elements:
            yield ele


class IProperty:
    dtd = etree.DTD(
        (Path(__file__).parent / "data/indi.dtd").open())

    def __init__(self, name: str, label: str = None):

        if label is None:
            label = name

        self.label = label
        self.name = name

    def __str__(self):
        return f"<I{self.tagcontext} name={self.name} {self.value}>"

    def __repr__(self):
        return self.__str__()

    def Def(self):
        tagname = "def" + self.tagcontext
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
            ele.text = str(self.value)

        return ele

    def Set(self):
        tagname = "one" + self.tagcontext
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

        ele.text = str(self.value)

        return ele

    @property
    def value(self):
        if isinstance(self, INumber):
            return self._value
        elif isinstance(self, IText):
            return self.text
        elif isinstance(self, ILight):
            return self._state
        elif isinstance(self, ISwitch):
            return self._state
        elif isinstance(self, IBLOB):
            return self.data

        raise TypeError(f"""value method must be called with INumber,
        IText, ILight, ISwitch or IBLOB not {type(self)}
        {isinstance(self, INumber)}
        """)

    @value.setter
    def value(self, val):

        # TODO: We could do some type checking.
        if isinstance(self, INumber):
            self._value = self._value
        elif isinstance(self, IText):
            self.text = val
        elif isinstance(self, ILight):
            self.state = val
        elif isinstance(self, ISwitch):
            self.state = val
        elif isinstance(self, IBLOB):
            self.data = val
        else:
            raise TypeError(f"""
        value method must be called with INumber, IText,
        ILight, ISwitch or IBLOB not {type(self)} {self}
        {isinstance(self, INumber)} {self.tagcontext}
        {type(self) == INumber}
        {self.tagcontext == "Switch"}
        {self.__class__ == ISwitch}
        """)


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
        self._value = value

    @property
    def value(self):
        return self._value

    @value.setter
    def value(self, val):
        try:
            self._value = float(val)
        except Exception:
            raise ValueError(f"""INumber value must be a number not {val}""")


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

    @property
    def value(self):
        return self.text

    @value.setter
    def value(self, val):
        try:
            self.text = str(val)
        except Exception:
            raise ValueError(f"""IText value must be str not {val}""")


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

        self._state = state

    @property
    def value(self):
        return self._state

    @value.setter
    def value(self, val):

        if val in list(IPState):
            self._state = val
        else:
            raise ValueError(f"""ILight value must be in {list(IPState)}""")


class ISwitchVector(IVectorProperty):
    tagcontext = "SwitchVector"

    def __init__(self,
                 sp: list,  # List of ISwitch properties
                 device: str,
                 name: str,
                 state: IPState,
                 rule: ISRule,
                 perm: IPerm,
                 timeout: float = 0,
                 label: str = None,
                 group: str = None,
                 timestamp: str = None):
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

    def __setitem__(self, name, value):

        if value not in list(ISState):
            raise ValueError(
                f"ISwitch value must be in 'On' or 'Off' not {value}")

        # If its one of many we need to set the
        # other items.
        if self.rule == "OneOfMany" and value == 'On':
            exists = False
            for sw in self.elements:

                if sw.name == name:
                    exists = True
                    sw.value = 'On'
                else:
                    sw.value = 'Off'

            if not exists:
                raise KeyError(f"Switch {name} not in {self.name}.")

        else:
            super().__setitem__(name, value)


class ISwitch(IProperty):
    tagcontext = "Switch"
    valuename = "state"

    def __init__(self,
                 name: str,
                 state: ISState,
                 label: str = None):

        super().__init__(name, label)
        self._state = state

    @property
    def value(self):
        return self._state

    @value.setter
    def value(self, val):

        val = str(val)

        if val in list(ISState):
            self._state = val
        else:
            raise ValueError(
                f"""ISwitch value must be either 'Off' or 'On' not {val}""")

    @property
    def state(self):
        return self._state


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
                 group: str = None,
                 timestamp: str = None):
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
                 format: str = None,
                 label: str = None):
        super().__init__(name, label)
        self.format = format
        self.data = None

    @property
    def value(self) -> str:
        """Setter for value property. The information pointed to by this
        property is stored as binary data and returned as base64

        Returns
        -------
        str
            base64 encoded data from the blob
        """

        if self.data is None:
            b64data = ""
        else:
            try:
                b64data = base64.b64encode(self.data).decode()
            except TypeError:
                b64data = ""
                logging.warning(f"Could not convert {type(self.data)} to base64")

        return b64data


    @value.setter
    def value(self, val: bytes):
        if type(val) != bytes:
            raise ValueError("""IBLOB value must by bytes type""")

        self.size = len(val)
        self.data = val


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
    bound calls, use the many available futures/task
    methods. With CPU bound you should use
    self.mainloop.run_in_executor to run tasks
    in a process pool.
    """

    _registrants = []
    _NewPropertyMethods = {}

    def __init__(self, loop=None, config=None, name=None):

        """
        Arguments:
        loop: the asyncio event loop
        config: the configureable info from ConfigParser
        name: Name of the device defaulting to name of the class
        """

        self.props = []
        self.config = config
        self.timer_queue = asyncio.Queue()

        if name is None:
            self._devname = self.__class__.__name__
        else:
            self._devname = name

        self.outq = asyncio.Queue()
        self.handles = []

        self._once = True

        self.repeat_q = asyncio.Queue()

        self.mainloop = loop

    def start(self):
        """
        Start up the mainloop, grab the stdio and run the xml reader.
        This method can hide the asynchronicity from subclasses. Simply
        instantiate the subclass and call this method in the same thread
        and you never have to know that this is asyncio.

        It is probably better to use the astart function but that requires
        astart
        """

        self.mainloop = asyncio.get_event_loop()
        self.reader, self.writer = self.mainloop.run_until_complete(stdio())
        self.running = True
        future = asyncio.gather(
            self.run(),
            self.toindiserver(),
            self.repeat_queuer()
        )

        self.mainloop.run_until_complete(future)

    async def astart(self, *tasks):

        """Start up in async mode
        Arg: tasks -> any coroutines that
        should be run concurantly with the
        other device tasks.
        """

        self.mainloop = asyncio.get_running_loop()
        self.reader, self.writer = await stdio()
        self.running = True
        future = asyncio.gather(
            self.run(),
            self.toindiserver(),
            self.repeat_queuer(),
            *tasks
        )

        await future

    async def repeat_queuer(self):
        while self.running:
            func = await self.repeat_q.get()
            try:
                if inspect.iscoroutinefunction(func):
                    await func(self)
                else:
                    func(self)

            except Exception as error:
                sys.stderr.write(
                    f"There was an exception in the \
                    later decorated fxn {func}:")

                sys.stderr.write(f"{error}")
                sys.stderr.write("See traceback below.")
                traceback.print_exc(file=sys.stderr)

    def exception(self, loop, context):

        raise context['exception']

    def __getitem__(self, name: str):
        """
        Retrieve IVectorProperty that has been
        registered with the device.Set method.
        """

        return self.IUFind(name)

    def name(self):
        return self._devname

    @property
    def device(self):
        return self._devname

    def __repr__(self):
        return f"<{self.name()}>"

    async def toindiserver(self):

        while self.running:
            output = await self.outq.get()

            logging.debug(output.decode())
            self.writer.write(output.decode())
            self.writer.flush()

    async def run(self):
        """
        Read stdin and try to parse as xml

        TODO: Create a real condition for the
        while loop. IT would be nice to be able
        to shutdown gracefully.
        """

        inp = ""
        while self.running:

            inp += (await self.reader.readline()).decode()
            try:
                # TODO: This should be done with a feed parser
                xml = etree.fromstring(inp)
                inp = ""

            except etree.XMLSyntaxError as error:
                # This is not the best way to check
                # for completed xml.
                logging.debug(f"Could not parse xml {error} {inp}")
                continue

            logging.info("Parsed data from client")
            logging.info(etree.tostring(xml, pretty_print=True).decode())
            logging.info("End client data")

            if xml.tag == "getProperties":

                if "device" in xml.attrib:
                    self.ISGetProperties(xml.attrib['device'])

                else:
                    self.ISGetProperties()

                self.initProperties()

                # maybe we should run this concurrently
                # with gather. If it blocks this run loop
                # it will be difficult to debug.
                if "device" in xml.attrib:
                    await self.asyncInitProperties(xml.attrib['device'])
                else:
                    await self.asyncInitProperties()

                if self._once:
                    # This is where the `repeat` decorated
                    # functions are called the first time
                    for reg in self._registrants:

                        initiate_callback = getattr(self, reg.__name__)
                        # initiate_callback is actually the 'get_instance'
                        # function defined in device.repeat.
                        initiate_callback()

                    self._once = False

            elif xml.attrib['name'] in self._NewPropertyMethods:
                names = [ele.attrib["name"] for ele in xml]
                if "Number" in xml.tag:
                    values = [float(ele.text.strip()) for ele in xml]
                else:
                    values = [str(ele.text.strip()) for ele in xml]

                self._NewPropertyMethods[xml.attrib['name']](
                    self,
                    xml.attrib["device"],
                    xml.attrib['name'],
                    values,
                    names
                )

            elif xml.tag == "newNumberVector":

                try:
                    names = [ele.attrib["name"] for ele in xml]
                    values = [float(ele.text.strip()) for ele in xml]
                    self.ISNewNumber(
                        xml.attrib["device"],
                        xml.attrib["name"],
                        values,
                        names)

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
                    # values = [ISState.fromstring(ele.text) for ele in xml]
                    values = [str(ele.text).strip() for ele in xml]
                    self.ISNewSwitch(
                        xml.attrib["device"],
                        xml.attrib["name"],
                        values,
                        names)
                except Exception as error:
                    logging.debug(f"{error}")
                    logging.debug(etree.tostring(xml))
                    raise

    def initProperties(self):
        """"""
        pass

    async def asyncInitProperties(self, device=None):
        """This function is called after the getProperties tags is
        recieved at the same time as initProperties. Override it
        to start async tasks to be run in the event loop."""

        pass

    def IEAddTimer(self, millisecs: int, funct_or_coroutine: Callable, *args):
        """
        create a callback to be executed after a delay.

        If you want to call a method at a regular interval
        use the device.repeat decorator.
        """

        hdl = self.mainloop.call_soon(
            self.mainloop.call_later,
            millisecs / 1000.0,
            funct_or_coroutine,
            *args)

        self.handles.append(hdl)

    async def _debug(self):
        while 1:
            await asyncio.sleep(1.0)

    def buildSkeleton(self, skelfile):
        """
        Build properties from a skeleton File.
        args:
            skelfile: string path to skeleton
            file.
        """

        ok_tags = (
            "defSwitchVector",
            "defTextVector",
            "defNumberVector",
            "defBLOBVector",
            "defLightVector",
        )

        with open(skelfile) as skfd:
            xmlstr = skfd.read()
            xml = etree.fromstring(xmlstr)

        for xml_def in xml.getchildren():
            if xml_def.tag not in ok_tags:
                # Ignore anything not a vector definition.
                continue
            properties = []
            for prop in xml_def.getchildren():

                att = prop.attrib
                att.update({'value': prop.text.strip()})
                properties.append(att)
            try:
                ivec = self.vectorFactory(xml_def.tag, xml_def.attrib, properties)
            except Exception as error:
                logging.error(f"The following error was caused by this xml tag \
                        \n {etree.tostring(xml_def)}")
                logging.error(error)
                raise
            self.IDDef(ivec)

    def ISNewNumber(self, dev: str, name: str, values: list, names: list):
        raise NotImplementedError(
            "Device driver must \
                                  overload ISNewNumber method.")

    def IUFind(self, name, device=None, group=None):
        """
        Find and return the vector property by name.

        Modeled after the IUFindXXX set of equations
        [see here](http://www.indilib.org/api/group__\
                dutilFunctions.html#gac8609374933e4aaea5a16cbafcc51ce2)
        """
        if device is None:
            device = self._devname

        for p in self.props:
            if p.name == name and p.device == device:
                if group is not None:
                    if p.group == group:
                        return p
                else:
                    return p

        # We could let this return None but not finding a
        # property seems to be a pretty important issue.
        raise ValueError(f"Could not find {device}, {name} in props")

    def IUUpdate(self, device, name, values, names, Set=False):
        """
        Update the indi vector property. It looks up
        the indi vector by device name and property name.
        Args:
            device -> name of the device
            name -> name of the vector property
            values -> list of new values
            names -> list of names of the property to be updated
        """

        vp = self.IUFind(name=name, device=device)

        for nm, val in zip(names, values):
            vp[nm] = val

        if Set:
            # LEt clients know
            self.IDSet(vp)

        return vp

    def ISGetProperties(self, device):
        raise NotImplementedError(
            f"Subclass of {self} must \
                                  implement ISGetProperties")

    def IDMessage(
        self, msg: str,
        timestamp: Union[str, datetime.datetime, None] = None,
        msgtype: str = "INFO"
    ):
        """Send a message to the client

        Parameters
        ----------
        msg : str
            The text of the message
        timestamp : Union[str, datetime.datetime, None], optional
            timestamp of the message, by default None
        msgtype : str, optional
            one of "DEBUG", "INFO", "WARN", by default "INFO"
        """
        if type(timestamp) == datetime.datetime:
            timestamp = timestamp.strftime("%Y-%m-%dT%H:%M:%S")

        elif timestamp is None:
            timestamp = datetime.datetime.now().strftime("%Y-%m-%dT%H:%M:%S")

        xml = f'<message message="[{msgtype}] {msg}" '
        xml += f'timestamp="{timestamp}" '
        xml += f'device="{self.name()}"/> '

        self.outq.put_nowait(xml.encode())
        # self.writer.write(xml.encode())

    def IDSetNumber(self, n: INumberVector, msg=None):
        self.IDSet(n, msg)

    def IDSetText(self, t: ITextVector, msg=None):
        self.IDSet(t, msg)

    def IDSetLight(self, ll: ILightVector, msg=None):
        self.IDSet(ll, msg)

    def IDSetSwitch(self, s: ISwitchVector, msg=None):
        self.IDSet(s, msg)

    def IDSet(self, vector: IVectorProperty, msg=None):
        if isinstance(vector, IBLOB) or isinstance(vector, IBLOBVector):
            raise RuntimeError("Must use IDSetBLOB to send BLOB to client.")
        self.outq.put_nowait(etree.tostring(vector.Set(msg), pretty_print=True))
        # self.writer.write(etree.tostring(vector.Set(msg), pretty_print=True))

    def IDSetBLOB(self, blob):
        self.outq.put_nowait(etree.tostring(blob.Set()))
        # self.writer.write(etree.tostring(blob.Set()))

    def IDDef(self, prop, msg=None):

        # register the property internally

        if prop.device != self._devname:
            raise ValueError(
                f"INDI prop {prop.name} device does not match this device, {prop.device} {self._devname}"
            )

        if prop not in self.props:
            self.props.append(prop)
        # Send it to the indiserver
        self.outq.put_nowait((etree.tostring(prop.Def(msg), pretty_print=True)))

        # self.writer.write((etree.tostring(prop.Def(msg), pretty_print=True)))

    @classmethod
    def NewVectorProperty(cls, name: str):

        def get_function(func: Callable):

            cls._NewPropertyMethods[name] = func
            return func

        return get_function

    @classmethod
    def repeat(cls, millis: int):
        """This monstrosity is a decorator
        for methods that are to be called
        after the first ISGetProperties is called
        and then repeated every millis [ms]"""

        def get_function(func: Callable):
            """"Called during class definition.
            Nested functions hereafter are called
            when func is called.
            """
            # Register the function with
            # the class so we know to call
            # it when in ISGetProperties
            # is called
            cls.register(func)

            def get_instance(instance: device):
                """
                Set the function to be called with call_later
                asyncio procedure.

                Called after ISGetProperties is called
                in device.run
                """

                @functools.wraps(func)
                def call_with_error_handling():
                    """Call the function but make sure
                    we have error handling with the traceback"""

                    instance.repeat_q.put_nowait(func)

                    # do it again in millis
                    cl = instance.mainloop.call_later(
                        millis / 1000.0,
                        call_with_error_handling)
                    instance.handles.append(cl)
                    return

                # The below line calls the wrapped
                # function for the first time
                cl = instance.mainloop.call_later(
                    millis / 1000.0,
                    call_with_error_handling)

                instance.handles.append(cl)
                return

            return get_instance

        return get_function

    @classmethod
    def register(cls, registrant: Callable):
        """Register the function """
        cls._registrants.append(registrant)

    @staticmethod
    def vectorFactory(vector_type, attribs, properties):
        """vectorFactory"""

        if 'Number' in vector_type:
            vec = INumberVector([], **attribs)

            for prop in properties:
                iprop = INumber(**prop)
                vec.np.append(iprop)

        elif 'Light' in vector_type:

            vec = ILightVector([], **attribs)

            for prop in properties:

                if 'value' in prop:
                    prop['state'] = prop['value']
                    del prop['value']

                iprop = ILight(**prop)
                vec.lp.append(iprop)

        elif 'Switch' in vector_type:

            vec = ISwitchVector([], **attribs)

            for prop in properties:
                if 'value' in prop:
                    prop['state'] = prop['value']
                    del prop['value']

                iprop = ISwitch(**prop)
                vec.sp.append(iprop)

        elif 'BLOB' in vector_type:
            vec = IBLOBVector([], **attribs)

            for prop in properties:
                if 'value' in prop:
                    del prop['value']

                iprop = IBLOB(**prop)
                vec.bp.append(iprop)

        elif 'Text' in vector_type:
            vec = ITextVector([], **attribs)

            for prop in properties:
                if 'value' in prop:
                    prop['text'] = prop['value']
                    del prop['value']

                iprop = IText(**prop)
                vec.tp.append(iprop)

        else:
            message = f"vector_type argument must be a string containing \
            Light, Number, Switch, Text or BLOB not {vector_type}"
            raise ValueError(message)

        return vec
