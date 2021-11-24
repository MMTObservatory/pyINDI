/* Constants */
const INDI_OPS = [
  "set",
  "def"
]
const INDI_TYPES = [
  "Number",
  "Text",
  "Switch",
  "Light",
  "BLOB"
]
const INDI_DEBUG = true; // Turn on debugging
const READONLY_PORT = 8081; // setindi() is muted when on this port
const WS_PAGE = "/indi/websocket"; // Must match URL
const WS_SEND_WAIT = 30 // millaseconds, how long to wait to resend
const WS_RETRY = 1000 // millaseconds, how long to wait to reconnect
const XML_START_REGEX = /<.e[twf]\S*Vector/; // accept <set <new <def <get
const XML_MESSAGE_REGEX = /<message\s+.*\/>.*/g;

/* Globals */
var indi_types = ""; // All INDI types we accept
var ws; // The persistent web socket connection
var read_write = false; // The websocket will trigger this true if connected
var setPropertyCallbacks = {} // Stores callbacks for properties
var partial_doc = ""; // accumulate xml in pieces
var logger; // Store element that logger is in

document.addEventListener("DOMContentLoaded", () => {
  /* Initialize the list of types that updateProperties will handle */
  INDI_OPS.forEach((op) => {
    INDI_TYPES.forEach((type) => {
      if (indi_types.length) {
        indi_types += ", "; // Append , and space if there already is part of str
      }
      indi_types += `${op}${type}Vector`;
    })
  })

  console.log(`Accepting ${indi_types}`);

  // Connect to logger
  logger = document.getElementById("logger");
  
  // create web server connection
  wsStart();
})

const wsStart = () => {
  /* Creates websocket connection
  
  Description
  -----------
  Responsible for event listeners for websocket. If websocket closes will try again in WS_RETRY millaseconds. Error codes aren't worried about because we never get information from websocket errors due to security risks.

  Arguments
  ---------
  None

  Returns
  -------
  None
  */
  if ("WebSocket" in window) {

    // create web socket
    var loc = window.location;
    if (loc.port != READONLY_PORT) {
      read_write = true;
    }
    const url = `ws://${loc.host}${WS_PAGE}`;
    console.log(url);
    ws = new WebSocket(url);

    // dispatch incoming messages
    ws.onmessage = (event) => {
      updateProperties(event.data);
    };

    ws.onopen = (event) => {
      console.log("WebSocket is open");
      // resend any prior property callbacks
      for (var property in setPropertyCallbacks) {
        var callback = setPropertyCallbacks[property];
        if (callback) {
          console.log(`Requesting ${property}`);
          setPropertyCallback(property, callback);
        }
      }
    };

    // indicate lost connection
    ws.onclose = (event) => {
      if (event.wasClean) {
        console.warn(`Web Socket connection closed cleanly, code=${event.code} reason=${event.reason}`);
      }
      else {
        console.warn(`Web Socket connection died, code=${event.code} reason=${event.reason}`);
      }

      // discard any partially received documents
      partial_doc = null;

      // restart web socket
      ws = null;
      setTimeout(() => {wsStart()}, WS_RETRY);
    };

    ws.onerror = (event) => {
      console.error(`Web Socket error`)
    };
  }

  else {
    alert("Web Socket is not supported by this Browser");
  }

}

const wsSend = (msg) => {
  /* Sends msg over ws
  
  Description
  -----------
  Wrapper over the websocket that keeps trying if the websocket would suddenly disconnect.

  Arguments
  ---------
  msg : string message to send over ws

  Returns
  -------
  None
  */
  if (ws && ws.readyState == ws.OPEN) {
    ws.send(msg);
  }
  else {
    setTimeout(() => {wsSend(msg);}, WS_SEND_WAIT);
  }

  return;
}

const setindi = (...theArgs) => {
  /* Sets an INDI property
  
  Description
  -----------
  The first parameter must indicate the property data type, which is either 
  Number, Text, Switch, or Light. The second parameter must indicate the INDI 
  device and property name as a string separated by a period, e.g.: "Telescope.
  Position". The remaining parameters must be INDI property element-value pairs.

  The message is only sent if READ_WRITE is true.
  
  Arguments
  ---------
  theArgs : variable amount of arguments

  Example
  -------
  setIndi("Number", "Telescope.Position", "RA", "2 31 49", "Dec", "89 15.846");

  This is sent as:
  <newNumberVector device="Telescope" name="Position">
    <oneNumber name="RA">2 31 49</oneNumber>
    <oneNumber name="Dec">89 15.846</oneNumber>
  </newNumberVector>
  
  Returns
  -------
  None
  */
  // Sanity check
  if (theArgs.length < 4 || (theArgs.length % 2) != 0) {
    alert(`Error! Malformed setindi(${theArgs})\nPlease contact support.`);
    return;
  }

  var type = theArgs[0];
  var devname = theArgs[1].split(".");
  var device = devname[0];
  var name = devname[1];

  // Build xml
  var xml = '<new' + type + 'Vector device="' + device + '" name="' + name + '">\n';
  var setcmd = theArgs[1];
  var sep = '.';

  // Add each element
  for (var i=2; i<theArgs.length; i+=2) {
    xml += `  <one${type} name="${theArgs[i]}">`;
    xml += `${theArgs[i+1]}</one${type}>\n`;
    setcmd += `${sep}${theArgs[i]}=${theArgs[i+1]}`;
    sep = ';';
  }

  // Close xml
  xml += `</new${type}Vector>`;

  var msgprefix;

  if (read_write) {
    // Send xml
    wsSend(xml);
    msgprefix = "Websocket send: ";
  } 
  else {
    alert("All commands are disabled in Read-Only mode");
    msgprefix = "Websocket send (not sent): ";
  }

  showMessage(`${msgprefix}${setcmd}`);

  return;
}

const setPropertyCallback = (property, callback, init=false) => {
  /* Sets property callback

  Description
  -----------
  API function for setting up a callback function when a given INDI property 
  arrives. Also requests these properties from the indiserver. This only 
  supports one callback per property per page. Properties are specified as INDI 
  device and property name separated by a period, e.g.:"Telescope.Position". If 
  property name is '*', eg 'Telescope.*', then ALL properties with the given 
  device will be called. Property callbacks must be a javascript function that 
  takes the property mapped as a javascript object parameter.

  Arguments
  ---------
  theArgs : variable amount of arguments

  Example
  -------
  setPropertyCallback("Telescope.Focus", function(map) { updatePosition(map) });
  
  This calls the function updatePosition() with the property "Telescope.Focus" 
  when the telescope focus is changed.

  Returns
  -------
  None
  */
  setPropertyCallbacks[property] = callback;
  
  // Request this property
  var devname = property.split(".");
  var device = devname[0];
  var name = devname[1];
  var getprop = `<getProperties version="1.7" `;
  //var getprop = `<getProperties version="1.7" `;

  if (device !== '*') {
    getprop += `device="${device}" `;
  }
  if (name !== '*') {
    getprop += `name="${name}" `;
  }

  getprop += `/>\n`;

  // Also ask for BLOBs, harmless if not
  var getblob = `<enableBLOB`;
  if (device !== '*') {
    getblob += ` device="${device}" `;
  }
  if (name != '*') {
    getblob += ` name="${name}"`
  }

  getblob += `>Also</enableBLOB>\n`;

  // Without this check it sends properties twice
  if (!init) {
    ws.send(getprop);
    ws.send(getblob);
  }

  return;
};


function flattenIndiLess(xml) {
  /* Flattens indi xml to Object

  Description
  -----------
  Function for flattening an INDI property's XML element into a javascript 
  object. This copies the flattenIndi function but uses a nesting approach 
  (less flattened). Note that step, min, max attributes and the value for 
  Properties of type Number are converted to numeric type, all others are 
  string type. Also, BLOBs are already unpacked from base64.

  Arguments
  ---------
  xml : parsed xml

  Returns
  -------
  INDI : object with indi properties
  */
  var INDI = {};

  // firefox breaks content into 4096 byte chunks. this collapes them all again. see:
  // https://bugzilla.mozilla.org/show_bug.cgi?id=423442
  // https://bugzilla.mozilla.org/show_bug.cgi?id=194231
  xml.normalize();

  var isnum = false;
  var isblob = false;

  if (xml.nodeName.includes("Number")) {
    isnum = true;
    INDI.metainfo = "nvp"; 
  }
  else if (xml.nodeName.includes("Blob")) {
    isblob = true;
    INDI.metainfo = "bvp";
  }
  else if (xml.nodeName.includes("Text")) {
    INDI.metainfo = "tvp";	
  }
  else if (xml.nodeName.includes("Light")) {
    INDI.metainfo = "lvp";
  }
  else if (xml.nodeName.includes("Switch")) {
    INDI.metainfo = "svp";
  }

  // Slice nodeName to init new, set, or def
  INDI.op = xml.nodeName.substring(0,3);

  // Build INDI
  for (var i = 0; i < xml.attributes.length; i++) {
    var attr = xml.attributes[i];
    INDI[attr.name] = attr.value;	
  }

	children = []
	var i = 0;
  var child_nodes = xml.children;
  for (var j=0; j<child_nodes.length; j++) 
  {
    var child = child_nodes[j];
    var name = child.getAttribute("name");

    if (name != undefined) {
      children[i] = {};

      // Go through child attributes and build INDI
      for (var k=0; k<child.attributes.length; k++) {
        var attr = child.attributes[k];

        if (isnum && (attr.name == "step" || attr.name == "min" || attr.name=="max")) {
          children[i][attr.name] = parseFloat(attr.value);
          INDI[`${name}.${attr.name}`] = parseFloat(attr.value);
        }
        else {
          children[i][attr.name] = attr.value;
          INDI[`${name}.${attr.name}`] = attr.value;
        }
      }

      // Text values are in their own separate child node
      if (child.firstChild ) {
        var val = child.firstChild.nodeValue;
        if (isnum) {
          INDI[name] = parseFloat(val.trim());
          children[i].value = INDI[name];
        }
        else if (isblob) {
          // Clean base64
          INDI[name] = window.atob(val.replace (/[^A-Za-z0-9+/=]/g, "")); 
        }
        else {
          INDI[name] = val.trim();
          children[i].value = INDI[name];
        }
      }
    }
    else {
      INDI[name] = "";
    }
    INDI.values = children;
    i++;
  }

  return INDI;
}

const updateProperties = (xml_text) => {
  /* Parses xml for for callbacks

  Description
  -----------
  Function which fires callbacks interested in the given received INDI messages.
  The given text can be a fragment or contain more than one complete document.

  Arguments
  ---------
  xml_text : xml text from indi

  Returns
  -------
  None
  */
  if (!xml_text) {
    return;
  }
  // Append next chunk
  partial_doc += xml_text; 

  // Process any/all complete INDI messages in partial_doc
  while (true) {
    // Find first opening tag, done if none
    partial_doc = scrapeMessages(partial_doc);

    var start_match = XML_START_REGEX.exec(partial_doc);

    if (!start_match || start_match.index < 0) {
      return;
    }

    // Find next matching closing tag, done if none
    // [0] is the matched string
    var end_xml_str = `${start_match[0].replace("<", "</")}>`; 
    var end_idx = partial_doc.indexOf(end_xml_str, start_match.index);
    if (end_idx < 0) {
      return;
    }
    var end_after_idx = end_idx+end_xml_str.length;

    // Extract property xml and remove from partial_doc
    var xml_doc = partial_doc.substring(start_match.index, end_after_idx);
			
    partial_doc = partial_doc.substring(end_after_idx);
    
    try {
      const parser = new DOMParser();
      var dom = parser.parseFromString(xml_doc, "application/xml");

      // I think I need to filter out the first tag name
      // Only one vector comes in per xml
      var root_node = dom.documentElement; // Root node
      var root_name = root_node.nodeName; // Root name
      var device = root_node.getAttribute("device");
      var name = root_node.getAttribute("name");
      // Check if root name is in list of indi_types
      if (!indi_types.split(', ').includes(root_name)) {
        console.warn(`Bad type: ${root_name}`);
        return;
      }
      
      /*
      // https://www.reddit.com/r/javascript/comments/4xcown/why_are_there_empty_textnodes_in_the_dom/
      var child_nodes = root_node.children; // Keeps out empty text nodes
      for (var i=0; i<child_nodes.length; i++) {
        console.log(child_nodes[i])
      } 
      */

      // Gets function from handleProperty callback in client.html
      // If property doesn't exist specified then use general
      /*
      The rest of this was in a jquery each function and I don't know why because only one xml payload is delivered at a time. Maybe it was designed for multiple in the beginning then converted. For example, if there were more than one root node then this would only go over the first one. Keep this in mind if an error occurs during this part. That could be the fix.
      */
      var callback = setPropertyCallbacks[`${device}.${name}`] || setPropertyCallbacks[`${device}.*`] || setPropertyCallbacks['*.*'];
    
      if (callback) {
        var INDI = flattenIndiLess(root_node);
        callback(INDI);
      }
    }
    catch (e) {
      console.warn(`Parse failed: ${e}`);
      return;
    }
  }

  return;
}

const scrapeMessages = (partial_doc) => {
  /* Parses xml for for messages

  Description
  -----------
  Function that scrapes the incoming xml for messages and prints to console if 
  INDI_DEBUG is true.

  Arguments
  ---------
  partial_doc : xml text from indi

  Returns
  -------
  cp_partial_doc : copy of partial doc put in
  */
  try {
    var cp_partial_doc = partial_doc;

    while ((match = XML_MESSAGE_REGEX.exec(partial_doc))) {
      //TODO: We should check for device here.
      // Parse match
      const parser = new DOMParser();
      var dom = parser.parseFromString(match, "application/xml");
      var root_node = dom.documentElement; // Root node

      var msg = root_node.getAttribute("message");
      var device = root_node.getAttribute("device");
      var timestamp = root_node.getAttribute("timestamp");
       
      showINDIMessage(timestamp, device, msg);

      // Removes message from xml
      cp_partial_doc = cp_partial_doc.replace(match[0], "")
    }
  }
  catch (e) {
    console.warn(`Trouble parsing message: ${e}`);
  }
  return cp_partial_doc;
}
const showINDIMessage = (timestamp, device, message) => {
  if (customGUI && !logger) {
    showMessage(message);
    return;
  }
  
  var p = document.createElement("p");
  
  p.classList.add("pyindi-log");
  var loggerHeight = logger.scrollHeight;

  var isScrolledToBottom = logger.scrollHeight - logger.clientHeight <= logger.scrollTop + 1;

  // https://stackoverflow.com/questions/25505778/automatically-scroll-down-chat-div
  p.textContent = `${timestamp} ${device} ${message}`
  logger.appendChild(p);
  if (isScrolledToBottom) {
    logger.scrollTo(0, loggerHeight,);
  }
}

const showMessage = (message) => {
  /* Prints to the console if INDI_DEBUG is true */
  INDI_DEBUG && console.info(message);
  return;
}

