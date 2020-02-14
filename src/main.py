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
import base64

import logging
import functools
now = datetime.datetime.now()
timestr = now.strftime("%H%M%S-%a")
logging.basicConfig(format="%(asctime)-15s %(message)s",filename=f'/src/{timestr}.log',level=logging.DEBUG)

# We should remove this import after testing
import cv2
import numpy as np

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
	## INDIEnumMember
	This sublcasses the int class to match
	the standard enum int type but adds
	a string in the assignment to allow
	for comparison with the raw xml 
	attribute. 
	"""
	def __new__(cls, value:int, string:str):
		"""
		Overload the assignment method to add the
		string. 
		"""
		obj = int.__new__(cls, value )
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

	def __new__(cls, value, string):
		obj = INDIEnumMember.__new__(cls, value, string)
		obj._value_ = value

		return obj

	def __str__( self ):
		return self.string

	def __repr__(self):
		return f"<IPState: {self.string}>"


class IPState( INDIEnum ):
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
	INDI 
	"""
	RO = (0, "ro")
	WO = (1, "wo")
	RW = (2, "rw")
	

class ISRule(INDIEnum):

	ONEOFMANY = (0, "OneOfMany")
	ATMOST1 = (1, "AtMostOne")
	NOFMANY = (2, "AnyOfMany")

class ISState(INDIEnum):
	OFF = (0, "Off")
	ON = (1, "On")

	@staticmethod
	def fromstring(string):
		if "Off" in string:
			return ISState.OFF

		elif "On" in string:
			return ISState.ON

		raise ValueError(f"ISState must be either Off or On not {string}")


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
		"""
		This will put together the setXXX xml element
		for any vector property. It uses the dtd file(s)
		to map aml attribute to members of this class. 
		"""
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

		if isinstance(self, IBLOBVector):
			for child in ele:

				logging.debug( str(child.attrib) )
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

		# Blob definitions have empty data. 
		if not isinstance(self, IBLOB):
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


class ITextVector(IVectorProperty):

	
	tagcontext = "TextVector"
	def __init__(self, 
		tp:list, # List of IText properties
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
		self.tp = tp
		super().__init__(device, name, state, label, group)
		



class IText(IProperty):

	tagcontext = "Text"
	valuename = "text"
	def __init__(self, 
		name:str, 
		text:str,
		label:str=None):

		super().__init__(name, label)
		self.text = text


class ILightVector(IVectorProperty):

	
	tagcontext = "LightVector"
	def __init__(self, 
		lp:list, # List of IText properties
		device:str, 
		name:str, 
		state:IPState, 
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

		
		
		self.lp = lp
		super().__init__(device, name, state, label, group)
		


class ILight(IProperty):

	tagcontext = "Light"
	valuename = "state"
	def __init__(self, 
		name:str, 
		state:IPState,
		label:str=None):

		super().__init__(name, label)

		self.state = state


class ISwitchVector(IVectorProperty):

	
	tagcontext = "SwitchVector"
	def __init__(self, 
		sp:list, # List of IText properties
		device:str, 
		name:str, 
		state:IPState, 
		rule:ISRule,
		perm:IPerm,
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

		self.sp = sp
		super().__init__(device, name, state, label, group)
		


class ISwitch(IProperty):

	tagcontext = "Switch"
	valuename = "state"
	def __init__(self, 
		name:str, 
		state:ISState,
		label:str=None):

		super().__init__(name, label)

		self.state = state


class IBLOBVector(IVectorProperty):

	
	tagcontext = "BLOBVector"
	def __init__(self, 
		bp:list, # List of IText properties
		device:str, 
		name:str, 
		state:IPState, 
		perm:IPerm,
		label:str=None,
		timeout:str=None,
		group:str=None ):
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
		name:str, 
		format:str,
		label:str=None):

		super().__init__(name, label)
		self.format = format
		self.data = None



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
			elif xml.tag == "newTextVector":
				try:
					names = [ele.attrib["name"] for ele in xml]
					values = [str(ele.text) for ele in xml]
					self.ISNewText(xml.attrib["device"], xml.attrib["name"], values, names)
				except Exception as error:
					logging.debug("error")
					logging.debug(etree.tostring(xml))
					raise

			elif xml.tag == "newSwitchVector":
				try:
					names = [ele.attrib["name"] for ele in xml]
					values = [ISState.fromstring(ele.text) for ele in xml]
					self.ISNewSwitch(xml.attrib["device"], xml.attrib["name"], values, names)
				except Exception as error:
					logging.debug("error")
					logging.debug(etree.tostring(xml))
					raise			


	def IEAddTimer(self, millisecs:int, funct_or_coroutine, *args):
		self.mainloop.call_soon_threadsafe(
			self.mainloop.call_later, 
			millisecs/1000.0, 
			funct_or_coroutine, 
			*args )
		
	


	async def timer_wrapper(self, 
		millisec:int, 
		funct_or_coroutine):

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
	

	def IUFind(self, device, name, group=None):
		"""
		Modeled after the IUFindXXX set of equations
		[see here](http://www.indilib.org/api/group__dutilFunctions.html#gac8609374933e4aaea5a16cbafcc51ce2)
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
		raise NotImplementedError(f"Subclass of {self.__name__} must implement ISGetProperties")


	def IDSetNumber(self, n:INumberVector, msg=None):
		print(etree.tostring(n.Set(msg), pretty_print=True))

	def IDSetText(self, t:ITextVector, msg=None):
		print(etree.tostring(t.Set(msg), pretty_print=True))


	def IDSetLight(self, l:ILightVector, msg=None):
		print(etree.tostring(l.Set(msg), pretty_print=True))

	def IDSetSwitch(self, s:ISwitchVector, msg=None):
		print(etree.tostring(s.Set(msg), pretty_print=True))

	def IDSet(self, VectorProperty, msg=None):
		print(etree.tostring(VectorProperty.Set(msg), pretty_print=True))


	def IDDef(self, prop, msg=None):
		
		#register the property internally
		self.props.append(prop)
		#Send it to the indiserver
		print( etree.tostring( prop.Def(msg), pretty_print=True ) )
		logging.debug(etree.tostring( prop.Def(msg), pretty_print=True ))




class tester( do_the_indi ):
	once = True

	def ISNewNumber( self, dev, name, values, names ):
		if name == "test":
			nv = self.IUFind(name="test", device="mydev")
			nv.np[0].value = values[0]
			nv.np[1].value = values[1]
			self.IDSetNumber( nv )

	def ISNewText(self, dev, name, texts, names ):
		logging.debug("ISNewText called!!")
		tv = self.IUFind(name="textvec", device="mydev")
		tv.tp[0].text = texts[0]
		tv.state = IPState.ALERT
		self.IDSetText( tv )
	
	def ISNewSwitch( self, dev, name, states, names):
		sv = self.IUFind(name="svec", device="mydev")


	def testtimer( self ):
		if not hasattr(self, "counter"):
			self.counter = 0
			self.IDSet(self.IUFind( name="blobvec", device="mydev" ))
		else:
			self.counter +=1
			self.counter %=4

		logging.debug( "testing timer" )
		numvec = self.IUFind( name="test", device="mydev" )
		numvec.state = list(IPState)[self.counter]
		numvec.np[0].value = numvec.np[0].value+1
		numvec.np[1].value = numvec.np[1].value+2

		textvec = self.IUFind(name="textvec", device="mydev")
		textvec.state = numvec.state
		textvec.tp[0].text = str(list(IPState)[self.counter])

		lightvec = self.IUFind( name="lightvec", device="mydev" )
		lightvec.state = numvec.state
		lightvec.lp[0].state = numvec.state

		switchvec = self.IUFind( name="svec", device="mydev" )
		switchvec.state = numvec.state


		self.IDSet(self.IUFind( name="blobvec", device="mydev" ))
		self.IDSetText( textvec )
		#self.IDSetNumber( numvec )
		#self.IDSetLight( lightvec )
		#self.IDSetSwitch( switchvec )

		self.IEAddTimer( 1000.0, self.testtimer )

	


	def ISGetProperties( self, device:str=None ):

		inum =  INumber( "test", "%f", 0, 100, 1, 3, label="Num 1" )
		inum2 = INumber( "Shoo", "%f", 0, 100, 1, 3, label="Num 2" )
		inv = INumberVector( [inum, inum2], "mydev", "test", IPState.OK, IPerm.RW, label="The Number Vector" )

		itext = IText("text1", "The Text", "Text 1")
		itv = ITextVector([itext], "mydev", "textvec", IPState.OK, IPerm.RW, label="Test the text")

		ilight = ILight("light1", IPState.OK, "Light 1")
		ilv = ILightVector([ilight], "mydev", "lightvec", IPState.OK, label="The Light Vector")

		iswitch = ISwitch("s1", ISState.ON, "The Switch", )
		iswitch2 = ISwitch("s2", ISState.OFF, "The 2nd Switch")
		isv = ISwitchVector([iswitch, iswitch2], "mydev", "svec", IPState.OK, ISRule.ONEOFMANY, IPerm.RW, label="The Switch Vector")

		iblob = IBLOB("b1", "png", "Test Blob")

		ibv = IBLOBVector([iblob], "mydev", "blobvec", IPState.OK, IPerm.RO, "The BLOB Vector")
		iblob.data = 'Zm9vYmFy'

		#iblob.data += bytes([0])

		iblob.size = len( iblob.data )
		#iblob.data = iblob.data.decode()
		iblob.enclen = ((iblob.size + 2) // 3) * 4;

		self.IDDef( inv, None )
		self.IDDef( itv, None )
		self.IDDef( ilv, None )
		self.IDDef( ibv, None )
		self.IDDef( isv, None )

		if self.once == True:
			self.once = False
			self.IEAddTimer( 1000, self.testtimer )


async def main():
	loop = asyncio.get_running_loop()
	reader = tester( loop, 100 )
	task1 = loop.run_in_executor( None, reader.readstdin )
	await asyncio.gather( task1 )
	logging.debug( "We shoud never get here.\n" )
	
	

asyncio.run( main(), debug=True )