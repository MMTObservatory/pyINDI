#!/usr/bin/env python


from lxml import etree
import asyncio
import time
import sys
import logging
import datetime
from enum import Enum, auto, unique
from typing import Literal, Union
from io import StringIO

import logging
import functools
now = datetime.datetime.now()
timestr = now.strftime("%H%M%S-%a")
logging.basicConfig(format="%(asctime)-15s %(message)s",filename=f'/src/{timestr}.log',level=logging.DEBUG)


def print(msg):
	if type(msg) == bytes:
		msg = msg.decode()
	sys.stdout.write(msg)
	sys.stdout.flush()

"""
The Base classes for the pyINDI module. Definitions where adapted from the INDI white paper:
http://www.clearskyinstitute.com/INDI/INDI.pdf
For now we will only by supporting version 1.7
"""

class INDIEnumMember(int):
	"""
	There are many INDI attributes in the XML protocol that 
	require the attribute value to be one of a small set of 
	strings. An example is the INDI state attribute. The 
	state can be one of  Idle|Ok|Busy|Alert . 

	I would like to compare the string value of the attribute
	with the Enum type associated with it. This way
	we can have simple looking code like:
	```
	IPState.IDLE == "Idle" # returns True
	IPState.IDLE == IPState.IDLE # returns True 
	```
	"""
	def __new__(cls, value:int, string:str):
		obj = int.__new__(cls, value)
		
		obj.string = string
		
		return obj

	def __eq__(self, other):
		
		if isinstance(other, str):
			return self.string == other
		elif isinstance( other, Enum):
			return self.value == other.value
		
		return False

	def __repr__(self):
		return f"<{self.__name__}: {self.string}>"

class INDIEnum(INDIEnumMember, Enum):
	def __new__(cls, value, string):

		obj = INDIEnumMember.__new__(cls, value, string)
		obj._value_ = value

		return obj

	def __str__( self ):
		return self.string

	def __repr__(self):
		return f"<IPState: {self.string}>"


class IPState( INDIEnum ):

	IDLE = (0, "Idle")
	OK = (1, "Ok")
	BUSY = (2, "Busy")
	ALERT = (3, "Alert")



class IPerm(INDIEnum):

	RO = (0, "ro")
	WO = (1, "wo")
	RW = (2, "rw")
	

class IVectorProperty:
	"""
	INDI Vector asbstractions
	"""
	dtd = etree.DTD(open("/src/number.dtd"))
	def __init__(self, device:str, name:str, state:IPState, label:str=None, group:str=None):

		self.device = device
		self.name = name

		if label is None:
			label = name

		self.label = label
		self.group = group

		self._state = state

		if hasattr(self, "np"):
			self.iprops = self.np
		else:
			raise AttributeError("Must have np attribute")

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

		tagname = "def"+self.tagcontext
		dtd_elements = {tag.name:tag  for tag in self.dtd.iterelements() }
		if tagname not in dtd_elements:
			raise AttributeError("{tagname} not defined in Document Type Definition")
		
		ele_definition = dtd_elements[tagname]
		ele = etree.Element(ele_definition.name)
		for attribute in ele_definition.iterattributes():
			if hasattr( self, attribute.name ):
				ele.set( attribute.name, str(getattr(self, attribute.name)) )
		for prop in self.iprops:
			ele.append(prop.Def())

		if msg is not None:
			ele.set("message", msg)

		return ele

	def Set( self, msg=None ):

		tagname = "set"+self.tagcontext
		dtd_elements = {tag.name:tag  for tag in self.dtd.iterelements() }
		if tagname not in dtd_elements:
			raise AttributeError(f"{tagname} not defined in Document Type Definition")

		ele_definition = dtd_elements[tagname]
		ele = etree.Element(ele_definition.name)
		for attribute in ele_definition.iterattributes():
			if hasattr( self, attribute.name ):
				ele.set( attribute.name, str(getattr(self, attribute.name)) )
		for prop in self.iprops:
			ele.append(prop.Set())

		if msg is not None:
			ele.set("message", msg)

		return ele


class IProperty:
	dtd = etree.DTD(open("/src/number.dtd"))
	def __init__(self, name:str, label:str=None):
		if label is None:
			label = name

		self.label = label
		self.name = name

	def Def(self):
		tagname = "def"+self.tagcontext
		dtd_elements = {tag.name:tag  for tag in self.dtd.iterelements() }

		if tagname not in dtd_elements:
			raise AttributeError(f"{tagname} not defined in Document Type Definition")


		ele_definition = dtd_elements[tagname]
		ele = etree.Element(ele_definition.name)
		for attribute in ele_definition.iterattributes():
			if hasattr( self, attribute.name ):
				ele.set( attribute.name, str(getattr(self, attribute.name)) )


		ele.text = str(getattr(self, self.valuename))
		

		return ele


	def Set( self ):
		tagname = "one"+self.tagcontext
		dtd_elements = {tag.name:tag  for tag in self.dtd.iterelements() }

		if tagname not in dtd_elements:
			raise AttributeError(f"{tagname} not defined in Document Type Definition")

		ele_definition = dtd_elements[tagname]
		ele = etree.Element(ele_definition.name)
		for attribute in ele_definition.iterattributes():
			if hasattr( self, attribute.name ):
				ele.set( attribute.name, str(getattr(self, attribute.name)) )


		ele.text = str(getattr(self, self.valuename))

		return ele

class INumberVector(IVectorProperty):

	
	tagcontext = "NumberVector"
	def __init__(self, 
		np:list, 
		device:str, 
		name:str, 
		state:IPState, 
		perm:IPerm, 
		timeout:float=0, 
		timestamp:datetime.datetime=None, 
		label:str=None, 
		group:str=None ):
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
		name:str, 
		format:str, 
		min:float, 
		max:float, 
		step:float, 
		value:float, 
		label:str=None):

		super().__init__(name, label)

		self.format = format
		self.min = min
		self.max = max
		self.step = step
		self.value = value


class do_the_indi:
	"""
		Handle the stdin/stdout xml.
	"""
	def __init__(self, loop, n=100):
		self.mainloop = loop
		self.n = n
		self.props = []
		self.timer_queue = asyncio.Queue()

	def readstdin(self):
		fd = open("test.dat", "a")
		inp = ""
		for a in range( self.n ):
			# input might not be the best way to read stdin
			# perhaps sys.stdin is better.
			inp += input()
			try:
				xml = etree.fromstring(inp)
				#logging.debug(etree.tostring(xml, pretty_print=True))
				inp = ""
			except etree.XMLSyntaxError as error:
				# This is probably not the best way to check
				# for completed xml. 
				continue
			logging.debug( etree.tostring( xml, pretty_print=True ) )
			if xml.tag == "getProperties":
				self.ISGetProperties()

			elif xml.tag == "newNumberVector":
				try:
					names = [ele.attrib["name"] for ele in xml]
					values = [float(ele.text) for ele in xml]
					self.ISNewNumber(xml.attrib["device"], xml.attrib["name"], values, names)
				except Exception as error:
					logging.debug("error")
					logging.debug(etree.tostring(xml))
					raise

	
	async def get_timers(self):
		run = True
		loop = asyncio.get_running_loop()

		while run:
			callback = loop.call_soon_threadsafe( asyncio.sleep(1.0) )
			time_ms, func, *args = callback.result()
			if asyncio.isfuture(func):
				loop.create_task(func)
			else:
				func()


	def IEAddTimer(self, millisecs:int, funct_or_coroutine, *args):
		logging.debug("IEAddtime called")
		self.mainloop.call_soon_threadsafe(self.mainloop.call_later, millisecs/1000.0, funct_or_coroutine, *args )
		

	async def timer_wrapper(self, millisec:int, funct_or_coroutine):
		loop = loop.get_running_loop()
		if asyncio.iscoroutinefunction(funct_or_coroutine):
			coro = funct_or_coroutine
		else:
			coro = loop.run_in_executor(None, funct_or_coroutine)

		#Wrap the coroutine with the timer. 
		@functools.wraps(coro)
		async def wrapper():
			await asyncio.sleep(millisecs/1000.0)
			await coro()
		await wrapper()



	def ISNewNumber( dev:str, name:str, values:list, names:list ):
		raise NotImplementedError("Device driver must overload ISNewNumber method.")

	def fill(self, ivector):
		self.props.append(ivector)
	
	def getprop(self, device, name, group=None):
		for p in self.props:
			if p.name == name and p.device == device:
				if group is not None:
					if p.group == group:
						return p
				else:
					return p

		raise ValueError(f"Could not find {device}, {name} in {self.props}")
		# Maybe we should raise an exception if 
		# we don't find the indi vector property. 

	def ISGetProperties(self):
		raise NotImplementedError(f"Subclass of {self.__name__} must implement ISGetProperties")

	def IDSetNumber(self, n:INumberVector, msg=None):
		print(etree.tostring(n.Set(msg), pretty_print=True))

	def IDDef(self, prop, msg=None):
		logging.debug("def called")
		self.props.append(prop)
		print( etree.tostring( prop.Def(msg), pretty_print=True ) )





class tester( do_the_indi ):
	once = True
	def ISNewNumber( self, dev, name, values, names ):
		if name == "foo":
			nv = self.getprop(name="foo", device="mydev")
			nv.np[0].value = values[0]
			self.IDSetNumber(nv)

	def testtimer( self ):
		
		logging.debug( "testing timer" )
		numvec = self.getprop( name="foo", device="mydev" )
		if numvec.state == IPState.OK:
			numvec.state = IPState.ALERT
		else:
			numvec.state = IPState.OK
		numvec.np[0].value = numvec.np[0].value+1
		self.IDSetNumber(numvec)
		self.IEAddTimer(1000.0, self.testtimer )

		

	def ISGetProperties(self, device:str=None):

		inum =  INumber("foo", "%f", 0, 100, 1, 3 )
		inv = INumberVector( [inum], "mydev", "foo", IPState.OK, IPerm.RW )
		self.IDDef( inv, None )
		if self.once == True:
			self.once = False
			self.IEAddTimer(1000, self.testtimer)

async def main():
	loop = asyncio.get_running_loop()
	reader = tester( loop, 100 )
	task1 = loop.run_in_executor( None, reader.readstdin )
	await asyncio.gather( task1 )
	logging.debug("We shoud never get here.\n")
	
	

asyncio.run( main(), debug=True )