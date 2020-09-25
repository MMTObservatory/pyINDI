/* indi.js
 * These functions define the connection to an indiserver using web sockets.
 * Nothing here needs to be edited but lighttpd.conf requires the following:
 *
 * 1. add mod_wstunnel to server.modules
 * 2. add the following snippet:

	$HTTP["url"] =~ "^/indi-websocket" {
	      wstunnel.server = ( "" => ( ( "host" => "127.0.0.1", "port" => "7624" ) ) )
	      wstunnel.ping-interval = 10
	      wstunnel.frame-type = "text"
	      server.stream-request-body  = 2
	      server.stream-response-body = 2
	}

 *
 */

/* one-time function called when page is first loaded.
 * set up web socket and some other init work
 */
var gTypestr = "";                      // all INDI types we accept
var websocket;                          // the persistent web socket connection
var gCanReadWrite = 0;                  // whether this page is allowed to set new INDI property values
const ROport = 8081;                    // setindi() is muted when our page is on this port
const wspage = "/indi/websocket";       // must match URL for wstunnel in lighttpd.conf
$(function() {

    // initialize the list of types that updateProperties will handle.
    var ops = ["set", "def"];
    for (var op in ops) {
        var types = ["Number", "Switch", "Light", "Text", "BLOB"];
        for (var t in types) {
            if (gTypestr.length) {
                gTypestr += ", "
            }
            gTypestr += ops[op] + types[t] + "Vector"
        }
    }
    // console.log(gTypestr);

    // create web server connection
    startWebSocket();
});

/* create a websocket, repeat if it ever closes
 */
function startWebSocket()
{
    if ("WebSocket" in window) {

        // create web socket
        var loc = window.location;
        if (loc.port != ROport)
            gCanReadWrite = true;
        const url = 'ws://' + loc.host + wspage;
        console.log (url);
        websocket = new WebSocket(url);

        // dispatch incoming messages
        websocket.addEventListener ('message', function (event) {
            updateProperties (event.data);
        });

        websocket.addEventListener ('open', function(event) {
            console.log ("WebServer is open");

	    // resend any prior property callbacks
	    for (var property in setPropertyCallbacks) {
		var callback = setPropertyCallbacks[property];
		if (callback) {
		    // console.log ('requesting ' + property);
		    setPropertyCallback(property, callback);
		}
	    }
        });

        // indicate lost connection
        // https://tools.ietf.org/html/rfc6455#section-7.4.1
        websocket.addEventListener ('close', function(event) {

            var reason = "Unknown reason";
                if (event.code == 1000) reason = "Normal closure";
            else if(event.code == 1001) reason = "endpoint going away";
            else if(event.code == 1002) reason = "protocol error";
            else if(event.code == 1003) reason = "endpoint received data type it cannot accept";
            else if(event.code == 1004) reason = "Reserved.";
            else if(event.code == 1005) reason = "No status code present.";
            else if(event.code == 1006) reason = "connection closed without Close control frame";
            else if(event.code == 1007) reason = "data not consistent with the type of the message";
            else if(event.code == 1008) reason = "message that violates its policy";
            else if(event.code == 1009) reason = "message too large.";
            else if(event.code == 1010) reason = "server failed to negotiate extension: " + event.reason;
            else if(event.code == 1011) reason = "server can not fulfill request.";
            else if(event.code == 1015) reason = "failure to perform a TLS handshake";
            console.log ("Web socket closed: " + reason);

	    // discard any partially received documents
	    partial_doc = null;

	    // restart web socket
	    websocket = null;
	    setTimeout (startWebSocket, 1000);
        });

        // error
        websocket.addEventListener ('error', function() {
            // no additional information if reported but we can assume close will follow shortly
            // alert ('Websocket error');
        });

    } else {
        alert ("WebSocket is not supported by this Browser");
    }
}

/* wrapper over websocket.send that can tolerate connection not yet fully open
 */
function wsSend (msg)
{

    if (websocket && websocket.readyState == websocket.OPEN) {
        // console.log("tx: " + msg);
        websocket.send(msg);
    } else
        setTimeout (function() {wsSend(msg);}, 30);
}

/*
 * API function for setting an INDI property.
 * Parameters are variable.
 * The first parameter must indicate the property data type, which is either Number, Text,
 *    Switch, or Light.
 * The second parameter must indicate the INDI device and property name as a string
 *    separated by a period, e.g.: "Telescope.Position"
 * The remaining parameters must be INDI property element-value pairs.
 *
 * Example:
 *   setIndi("Number", "Telescope.Position", "RA", "2 31 49", "Dec", "89 15.846");
 *
 * This is sent as:
 *   <newNumberVector device="Telescope" name="Position">
 *      <oneNumber name="RA">2 31 49</oneNumber>
 *      <oneNumber name="Dec">89 15.846</oneNumber>
 *   </newNumberVector>
 *
 * N.B. the message is only set if !gCanReadWrite
 *
 */
function setindi() {
    // sanity check
    if (arguments.length < 4 || (arguments.length % 2) != 0) {
        alert ('Bug! malformed setindi(' + arguments + ')');
        return;
    }

    // pull out type, device and name
    var type = arguments[0];
    var devname = arguments[1].split(".");
    var device = devname[0];
    var name = devname[1];

    // start
    var xml = '<new' + type + 'Vector device="' + device + '" name="' + name + '">\n';
    var setcmd = arguments[1];
    var sep = '.';

    // add each element
    for (var i = 2; i < arguments.length; i += 2) {
        xml += '  <one' + type + ' name="' + arguments[i] + '">' + 
            scrubEntities(arguments[i+1]) + '</one' + type + '>\n';
        setcmd += sep + arguments[i] + '=' + arguments[i+1];
        sep = ';';
    }

    // closure
    xml += '</new' + type + 'Vector>';

    var msgprefix;
    if (gCanReadWrite) {
        // send
        wsSend (xml);
        msgprefix = "INDI message: ";
    } else {
        alert ("All commands are disabled in Read-Only mode");
        msgprefix = "INDI message (not sent): ";
    }

    // show on page
    var map = {};
    map["message"] = msgprefix + setcmd;
    map["timestamp"] = getTimeStampNow();
    if (typeof showMapMessage != 'undefined')
	showMapMessage (map);
}

/*
 * API function for setting up a callback function when a given INDI property arrives.
 * Also requests these properties from the indiserver.
 * N.B. this only supports one callback per property per page.
 * Properties are specified as INDI device and property name separated by a period, e.g.:
 *   "Telescope.Position"
 * If property name is '*', eg 'Telescope.*', then ALL properties with the given device will
 *   be called.
 * Property callbacks must be a javascript function that takes the property mapped as a
 *  javascript object parameter. See flattenIndi() for details.
 *
 * Example:
 *   setPropertyCallback("Telescope.Focus", function(map) { updatePosition(map) });
 *    This calls the function updatePosition() with the property "Telescope.Focus" when the
 *    telescope focus is changed.
 */
var setPropertyCallbacks = {}
function setPropertyCallback(property, callback) {
    // console.log ("setPropertyCallback("+property+")");
    setPropertyCallbacks[property] = callback;

    // request this property
    var devname = property.split(".");
    var device = devname[0];
    var name = devname[1];
    var getprop = '<getProperties version="1" device="' + device + '"';
    if (name != '*')
        getprop += ' name="' + name + '"';
    getprop += ' />\n';

    // send
    wsSend(getprop);

    // also ask for BLOBs, harmless if not
    var getblob = '<enableBLOB device="' + device + '"';
    if (name != '*')
        getblob += ' name="' + name + '"';
    getblob += '>Also</enableBLOB>\n';

    // send
    // console.log(getblob);
    wsSend(getblob);
}

/*
 * Private function for flattening an INDI property's XML element into a javascript object.
 *
 * Element values are accessed by their name: map['Position'] or map.Position
 * Top level attributes are also accessed by name: map['state'] or map.state (beware name collisions!)
 * Element attributes are accessed after their name: map['Position.label']
 *
 * Note that step, min, max attributes and the value for Properties of type Number are converted to
 *   numeric type, all others are string type. Also, BLOBs are already unpacked from base64.
 */
function flattenIndi(xml) {
    var map = {};

    // firefox breaks content into 4096 byte chunks. this collapes them all again. see:
    // https://bugzilla.mozilla.org/show_bug.cgi?id=423442
    // https://bugzilla.mozilla.org/show_bug.cgi?id=194231
    xml.normalize();

    for (var i = 0; i < xml.attributes.length; i++) {
        var a = xml.attributes[i];
        map[a.name] = a.value;
    }

    map.op = xml.nodeName.substring(0,3);	// new, set or def

    var isnum = xml.nodeName.indexOf("Number") < 0 ? 0 : 1;
    var isblob = xml.nodeName.indexOf("BLOB") < 0 ? 0 : 1;


		
		

    for (var c = 0; c < xml.childNodes.length; c++) {
        var child = xml.childNodes[c];
        var name = $(child).attr("name");
        if (name != undefined) {
            for (var i = 0; i < child.attributes.length; i++) {
                var a = child.attributes[i];
		if (isnum && (a.name=="step" || a.name=="min" || a.name=="max"))
		    map[name + "." + a.name] = parseFloat(a.value);
		else
		    map[name + "." + a.name] = a.value;
            }

	    // text values are in their own separate child node
            if (child.firstChild != undefined) {
		var val = child.firstChild.nodeValue;
		if (isnum)
		    map[name] = parseFloat(jQuery.trim(val));
		else if (isblob)
		    map[name] = window.atob(val.replace (/[^A-Za-z0-9+/=]/g, "")); // clean base64
		else
		    map[name] = jQuery.trim(val);
            } else
		map[name] = "";
        }
    }

    return map;
}


/*
 * Private function for flattening an INDI property's XML element into a javascript object.
 * 
 * This copies the flattenIndi function but uses a nesting approach (less flattened) 
 *  
 * Note that step, min, max attributes and the value for Properties of type Number are converted to
 *   numeric type, all others are string type. Also, BLOBs are already unpacked from base64.
 */
function flattenIndiLess(xml) {
    var map = {};

    // firefox breaks content into 4096 byte chunks. this collapes them all again. see:
    // https://bugzilla.mozilla.org/show_bug.cgi?id=423442
    // https://bugzilla.mozilla.org/show_bug.cgi?id=194231
    xml.normalize();

		var isnum = false;
		var isblob = false;
    if( xml.nodeName.includes("Number") )
		{
			isnum = true;
			map.metainfo = "nvp"; 
		}
		else if( xml.nodeName.includes("Blob") )
		{
			isblob = true;
			map.metainfo = "bvp";
		}
 		else if( xml.nodeName.includes("Text") )
		{
			map.metainfo = "tvp";	
		}
		else if( xml.nodeName.includes("Light") )
			map.metainfo = "lvp";
		else if( xml.nodeName.includes("Switch") )
			map.metainfo = "svp";

    map.op = xml.nodeName.substring(0,3);	// new, set or def

    for (var i = 0; i < xml.attributes.length; i++) 
		{
        var a = xml.attributes[i];
        map[a.name] = a.value;
					
    }



	childObjs = []
	var jj=0;
    for (var c = 0; c < xml.childNodes.length; c++) 
		{
			var child = xml.childNodes[c];
			var name = $(child).attr("name");
			if (name != undefined) 
			{
				childObjs[jj] = {};
				for (var i = 0; i < child.attributes.length; i++) 
				{
					var a = child.attributes[i];
					if (isnum && (a.name=="step" || a.name=="min" || a.name=="max"))
					{
						childObjs[jj][a.name] = parseFloat(a.value);
						map[name + "." + a.name] = parseFloat(a.value);
					}
					else
					{
						childObjs[jj][a.name] = a.value;
						map[name + "." + a.name] = a.value;
					}
				}

					// text values are in their own separate child node
				if (child.firstChild != undefined) 
				{
				var val = child.firstChild.nodeValue;
				if (isnum)
				{
						map[name] = parseFloat(jQuery.trim(val));
						childObjs[jj].value = map[name];
				}
				else if (isblob)
				{
						map[name] = window.atob(val.replace (/[^A-Za-z0-9+/=]/g, "")); // clean base64

				}
				else
				{
						map[name] = jQuery.trim(val);
						childObjs[jj].value = map[name];
				}

				} 
				else
					map[name] = "";
				map.values = childObjs;
				jj++;
		}
	}

    return map;
}


/*
 * Private function which fires callbacks interested in the given received INDI messages.
 * N.B. the given text can be a fragment or contain more than one complete document.
 */
var partial_doc = '';                                   // accumulate xml in pieces
var start_xml_re = /<.e[twf]\S*Vector/;                 // accept <set <new <def <get
var msg_xml_re = /<message\s+.*\/>.*/;
function updateProperties(xml_text) {
    // append next chunk
    if (xml_text == undefined)
        return;
    // console.log(partial_doc.length + " + " + xml_text.length);
    partial_doc += xml_text; 

    // process any/all complete INDI messages in partial_doc
    while (true) 
		{

        // find first opening tag, done if none
        var start_match = start_xml_re.exec(partial_doc);
        if (start_match == undefined || start_match.index < 0)
            break;
        // console.log('start at ' + start_match.index + " with " + start_match[0]);;

        // find next matching closing tag, done if none
        var end_xml_str = start_match[0].replace("<", "</") + ">";      // [0] is the matched string
        var end_idx = partial_doc.indexOf(end_xml_str, start_match.index);
        if (end_idx < 0)
            break;
        var end_after_idx = end_idx+end_xml_str.length;
        // console.log('end at ' + end_after_idx + " with " + end_xml_str);

        // extract property xml and remove from partial_doc
        var xml_doc = partial_doc.substring(start_match.index, end_after_idx);
				

				/*this function doesn't check for <message/> elements
				 * This match will bring it in line with the INDI spec
				 * */
				try
				{
					msg_match = msg_xml_re.exec(partial_doc)
					if (msg_match)
					{
						//TODO: We should check for device here.
						if(typeof showMessage != 'undefined')
						{
							let ele = $.parseXML(msg_match[0]).childNodes[0];
							let msg = ele.attributes["message"].textContent;
							let timestamp = ele.attributes["timestamp"].textContent;

							showMessage(msg, timestamp)
						}
						//TODO remove xml element from partial_doc
					}
				}
				catch(e)
				{
					console.log("Trouble parsing message", e)
				}
					
        partial_doc = partial_doc.substring(end_after_idx);
				

        // parse and spring callback if anyone interested
        try 
				{
					// console.log(xml_doc);
			    // xml_doc = xml_doc.replace(/[^A-Za-z0-9_<>/ ='":-.\n]/g, '');
					$(gTypestr, $.parseXML(xml_doc)).each(function() {
						// console.log("parse ok. length = " + xml_doc.length);
						// handy device and name
						var dev = $(this).attr('device');
						var nam = $(this).attr('name');

						// call callbacks interested in this property
						// console.log (dev + "." + nam);


						var cb = setPropertyCallbacks[dev+'.'+nam] || setPropertyCallbacks[dev+'.*'];
						if (cb) 
						{
							//hack for pyindi style map
							if( typeof doLess == "undefined")
								var map = flattenIndi(this);
							else
								var map = flattenIndiLess(this);
							cb(map);

							if (map["message"] && typeof showMapMessage != 'undefined')
							{
								showMapMessage (map);
							}
						}
          });
				}
        catch(e) 
				{
					console.log ('Parse fail', e);
					throw e
					// console.log ('Parse fail:\n' + xml_doc);
        }
    }
}
