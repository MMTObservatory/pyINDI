/* Globals */
var indi_types = ""; // All INDI types we accept
var ws; // The persistent web socket connection
var read_write = false; // The websocket will trigger this true if connected
var setPropertyCallbacks = {} // Stores callbacks for properties
var partial_doc = ""; // accumulate xml in pieces

document.addEventListener("DOMContentLoaded", () => {
  /* Initialize the list of types that updateProperties will handle */
  ApprovedOp.forEach((op) => {
    ApprovedTypes.forEach((type) => {
      if (indi_types.length) {
        indi_types += ", "; // Append , and space if there already is part of str
      }
      indi_types += `${op}${type}Vector`;
    })
  })

  /** *
  * This bit of code adds the delProperty tag to list of accpeted
  * INDI types. Functionally this does nothing because I went with
  * the scrapeDeleteProperties similar to how messages are handled
  * The delProperty is scraped long before the indi_types are checked
  * if this PR is approved we should delete this bit and the ApprovedTags
  * array in the constants.js.
  *
  * Scott S. 6/1/2022
  */
  ApprovedTags.forEach((tag) => {
    if (indi_types.length) {
        indi_types += ", "; // Append , and space if there already is part of str
      }
      indi_types += `${tag}`;

  })
  console.log(`Accepting ${indi_types}`);

  // create web server connection
  wsStart();
})

/**
 * Creates websocket connection. Responsible for event listeners for websocket.
 * If websocket closes will try again in WS_RETRY millaseconds. Error codes
 * aren't worried about because we never get information from websocket errors
 * due to security risks.
 */
const wsStart = () => {
  if ("WebSocket" in window) {

    // create web socket
    var loc = window.location;
    if (loc.port != Config.READONLY_PORT) {
      read_write = true;
    }
    const url = `ws://${loc.host}${Config.WS_PAGE}`;
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
      setTimeout(() => {wsStart()}, Config.WS_RETRY);
    };

    ws.onerror = (event) => {
      console.error(`Web Socket error`)
    };
  }

  else {
    alert("Web Socket is not supported by this Browser");
  }
}

/**
 * Wrapper over the websocket that keeps trying if the websocket would
 * suddenly disconnect.
 * @param {String} msg Message to send over the websocket.
 */
const wsSend = (msg) => {
  if (ws && ws.readyState == ws.OPEN) {
    ws.send(msg);
  }
  else {
    setTimeout(() => {wsSend(msg);}, Config.WS_SEND_WAIT);
  }

  return;
}

/**
 * Sets an indi property. The first parameter must indicate the property data
 * type, which is either Number, Text, Switch, or Light. The second parameter
 * must indicate the INDI device and property name as a string separated by a
 * period, e.g.: "Telescope.Position". The remaining parameters must be INDI
 * property element-value pairs.
 *
 * The message is only sent if READ_WRITE is true.
 *
 * @example
 * setIndi("Number", "Telescope.Position", "RA", "2 31 49", "Dec", "89 15.84");
 * This is sent as:
 * <newNumberVector device="Telescope" name="Position">
 *  <oneNumber name="RA">2 31 49</oneNumber>
 *    <oneNumber name="Dec">89 15.84</oneNumber>
 *  </newNumberVector>
 * @param  {...any} theArgs Arguments to build indi xml property to send.
 */
const setindi = (...theArgs) => {
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

  // Log to console if enabled.
  Config.INDI_CONSOLE_DEBUG && console.log(`${msgprefix}${setcmd}`);

  return;
}

/**
 * API function for setting up a callback function when a given INDI property
 * arrives. Also requests these properties from the indiserver. This only
 * supports one callback per property per page. Properties are specified as
 * INDI device and property name separated by a period, e.g.:
 * "Telescope.Position". If property name is '*', eg 'Telescope.*', then ALL
 * properties with the given device will be called. Property callbacks must be
 * a javascript function that takes the property mapped as a javascript object
 * parameter.
 * @param {String} property Property name.
 * @param {Function} callback Function to apply on property.
 * @param {Boolean} init If false, sends get property and get blob.
 */
const setPropertyCallback = (property, callback, init=false) => {
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
    console.log('Getting prop')
    ws.send(getprop);
    console.log('Getting blob')
    ws.send(getblob);
  }

  return;
};

/**
 * Flattens an INDI property's XML element into a javascript object. This
 * copies the flattenIndi function but uses a nesting approach (less
 * flattened). Note that step, min, max attributes and the value for Properties
 *  of type Number are converted to numeric type, all others are string type.
 * Also, BLOBs are already unpacked from base64.
 * @param {XMLDocument} xml The parsed xml.
 * @returns {Object} Contains all information from INDI property.
 */
function flattenIndiLess(xml) {
  var indi = {};

  // firefox breaks content into 4096 byte chunks. this collapes them all again. see:
  // https://bugzilla.mozilla.org/show_bug.cgi?id=423442
  // https://bugzilla.mozilla.org/show_bug.cgi?id=194231
  xml.normalize();

  var isnum = false;
  var isblob = false;

  if (xml.nodeName.includes("Number")) {
    isnum = true;
    indi.metainfo = "nvp";
  }
  else if (xml.nodeName.includes("Blob")) {
    isblob = true;
    indi.metainfo = "bvp";
  }
  else if (xml.nodeName.includes("Text")) {
    indi.metainfo = "tvp";
  }
  else if (xml.nodeName.includes("Light")) {
    indi.metainfo = "lvp";
  }
  else if (xml.nodeName.includes("Switch")) {
    indi.metainfo = "svp";
  }

  // Slice nodeName to init new, set, or def
  indi.op = xml.nodeName.substring(0,3);

  // Build indi
  for (var i = 0; i < xml.attributes.length; i++) {
    var attr = xml.attributes[i];
    indi[attr.name] = attr.value;
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
          indi[`${name}.${attr.name}`] = parseFloat(attr.value);
        }
        else {
          children[i][attr.name] = attr.value;
          indi[`${name}.${attr.name}`] = attr.value;
        }
      }

      // Text values are in their own separate child node
      if (child.firstChild ) {
        var val = child.firstChild.nodeValue;
        if (isnum) {
          indi[name] = parseFloat(val.trim());
          children[i].value = indi[name];
        }
        else if (isblob) {
          // Clean base64
          indi[name] = window.atob(val.replace (/[^A-Za-z0-9+/=]/g, ""));
        }
        else {
          indi[name] = val.trim();
          children[i].value = indi[name];
        }
      }
    }
    else {
      indi[name] = "";
    }
    indi.values = children;
    i++;
  }

  return indi;
}

/**
 * Function which fires callbacks interested in the given received INDI
 * messages. The given text can be a fragment or contain more than one complete
 * document.
 * @param {String} xml_text XML text from INDI
 */
const updateProperties = (xml_text) => {
  if (!xml_text) {
    return;
  }
  // Append next chunk
  partial_doc += xml_text;

  // Process any/all complete INDI messages in partial_doc
  while (true) {
    // Find first opening tag, done if none
    partial_doc = scrapeMessages(partial_doc);
    partial_doc = scrapeDeleteProperty(partial_doc);

    var start_match = XmlRegex.XML_START.exec(partial_doc);

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

      // Gets function from handleProperty callback in client.html
      // If property doesn't exist specified then use general
      var callback = setPropertyCallbacks[`${device}.${name}`] || setPropertyCallbacks[`${device}.*`] || setPropertyCallbacks['*.*'];

      if (callback) {
        var indi = flattenIndiLess(root_node);
        callback(indi);
      }
    }
    catch (e) {
      console.warn(`Parse failed: ${e} ${device} ${name}`);
      return;
    }
  }

  return;
}

/**
 * Function that scrapes the incoming xml for delProperty tags
 * debugging is enabled.
 * @param {XMLDocument} partial_doc XML text from INDI.
 * @returns {XMLDocument} Copy of the partial document put in.
 */
const scrapeDeleteProperty = (partial_doc) => {
  try {
     var cp_partial_doc = partial_doc;

    while ((match = XmlRegex.XML_DELPROPERTY.exec(partial_doc))) {
      // Parse match
      const parser = new DOMParser();
      var dom = parser.parseFromString(match, "application/xml");
      var root_node = dom.documentElement; // Root node


      var device = root_node.getAttribute("device");
      var name = root_node.getAttribute("name");
      var timestamp = root_node.getAttribute("timestamp");

      // Call the delete handler.
      var indi = {};
      indi.device = device;
      indi.name = name;
      indi.timestamp = timestamp;
      updater.delete(indi);

      // Removes delProperty from xml.
      cp_partial_doc = cp_partial_doc.replace(match[0], "")
    }
  }
  catch (e) {
    console.warn(`Trouble parsing delete: ${e}`);
  }
  return cp_partial_doc;
}

/**
 * Function that scrapes the incoming xml for messages and prints to console if
 * debugging is enabled.
 * @param {XMLDocument} partial_doc XML text from INDI.
 * @returns {XMLDocument} Copy of the partial document put in.
 */
const scrapeMessages = (partial_doc) => {
  try {
    var cp_partial_doc = partial_doc;

    while ((match = XmlRegex.XML_MESSAGE.exec(partial_doc))) {
      //TODO: We should check for device here.
      // Parse match
      const parser = new DOMParser();
      var dom = parser.parseFromString(match, "application/xml");
      var root_node = dom.documentElement; // Root node

      var msg = root_node.getAttribute("message");
      var device = root_node.getAttribute("device");
      var timestamp = root_node.getAttribute("timestamp");

      // Log message if enabled.
      Config.INDI_CONSOLE_DEBUG && console.log(`${timestamp} ${device} ${msg}`);
      logging.log(msg, timestamp, device);

      // Removes message from xml.
      cp_partial_doc = cp_partial_doc.replace(match[0], "")
    }
  }
  catch (e) {
    console.warn(`Trouble parsing message: ${e}`);
  }
  return cp_partial_doc;
}
