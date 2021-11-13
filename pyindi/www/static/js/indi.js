/* Constants *****************************************************************/
const INDIPERM_RO = "ro";
const INDIPERM_WO = "wo";
const INDIPERM_RW = "rw";
const INDISTATES = {
	"Idle": {
		"background-color": "var(--indistate-idle)",
		"color": "var(--text-light)"
	},
	"Ok": {
		"background-color": "var(--indistate-ok)",
		"color": "var(--text-light-active)"
	},
	"Busy": {
		"background-color": "var(--indistate-busy)",
		"color": "var(--text-light-active)"
	},
	"Alert": {
		"background-color": "var(--indistate-alert)",
		"color": "var(--text-light-active)"
	},
	"Unknown": {
		"background-color": "var(--indistate-unknown)",
		"color": "var(--text-light-active)"
	}
};
const BLINKING_LIGHTS = false;
const INDIBLINKS = {
	"Idle" : null,
	"Ok": null,
	"Busy": "blinking-busy",
	"Alert": "blinking-alert",
	"Unknown": null
}
const INDISWRULES = {
	"OneOfMany": "radio",
	"AtMostOne": "radio",
	"AnyOfMany": "checkbox"
}

/* Globals *******************************************************************/
var pyindi; // Selector for pyindi gui
var customGUI = true; // Flips to false if buildpyINDI is called

/* Builders *******************************************************************

Description
--------
These functions are responsible for building the html elements
and assigning data attributes, classes, and ids. They return
the element that was built.

Every new INDI group requires a fieldset and each INDI device
requires a new div. 

Functions
---------
- buildpyINDI              : Builds the generic pyINDI GUI
- buildNav                 : Builds the navbar for pyindi generic GUI
- buildDevice              : builds div to hold new device
- buildGroup               : builds group to hold new group
- buildVectorAndProperties : handles all vector and properties
- buildVector              : builds fieldset to hold new vector
- buildNumbers             : builds INDI number when new number is received
- buildTexts               : builds INDI text when new text is received
- buildSwitches            : builds INDI switches when new switch is received
- buildLights              : builds INDI lights when new light is received
*/

const buildpyINDI = () => {
	/* Builds the pyindi gui */
	// Update custom GUI since this was called
	customGUI = false;

	pyindi = document.createElement("div");
	pyindi.classList.add("pyindi");

	var nav = buildNav();
	var logViewer = buildINDILogViewer();

	pyindi.appendChild(nav);
	pyindi.appendChild(logViewer);

	document.body.appendChild(pyindi);

	return pyindi;
}

const buildINDILogViewer = () => {
	/* Builds a log viewer for INDI messages */
	var div = document.createElement("div");
	div.classList.add("pyindi-log-viewer");

	// Store in global variable for now so maps-indi can get to it
	logger = document.createElement("div");
	logger.classList.add("pyindi-log-container");

	div.appendChild(logger);
	return div;

}

const buildNav = () => {
	/* Builds navbar for pyindi */
	var nav = document.createElement("nav");
	nav.classList.add("pyindi-nav");

	var div = document.createElement("div");
	div.classList.add("pyindi-row");

	// Create link to source code for users to file issues
	var link = document.createElement("a");
	link.classList.add("fab", "fa-github", "icon");
	link.href = "https://github.com/so-mops/pyINDI";
	link.title = "Source Code";
	link.target = "_blank";

	// Create dark mode icon toggle
	var icon = document.createElement("i");
	icon.classList.add("fas", "fa-moon", "icon");

	icon.addEventListener("click", (event) => {
		if (event.target.classList.contains("fa-sun")) {
			event.target.classList.add("fa-moon");
			event.target.classList.remove("fa-sun");
			document.documentElement.setAttribute("data-theme", "light");
		}
		else {
			event.target.classList.add("fa-sun");
			event.target.classList.remove("fa-moon");
			document.documentElement.setAttribute("data-theme", "dark");
		}
	})

	// Build three nav items for navbar
	for (let i = 0; i < 3; i++) {
		let navItem = document.createElement("div");
		navItem.classList.add("pyindi-col", "pyindi-h4")
		switch (i) {
			case 0:
				navItem.appendChild(link);
				break;
			case 1:
				navItem.classList.add("text-center");
				navItem.textContent = "pyINDI";
				break;
			case 2:
				navItem.classList.add("text-right");
				navItem.appendChild(icon);
				break;
			default:
		}
		div.appendChild(navItem)
	}
	nav.appendChild(div);

	return nav;
}

const buildDevice = (INDI) => {
	/* Builds the default section for new device

	Description
	-----------
	Called when the device doesn't exist on page

	Arguments
	---------
	INDI : Object that contains all information about the indi property

	Returns
	-------
	div : HTML object that was just built
	*/
	var div = document.createElement("div");
	div.setAttribute("data-device", INDI.device);
	div.id = genDeviceID(INDI);
	div.classList.add("pyindi-device");

	// Build header div for header
	var header = document.createElement("div");
	header.classList.add("pyindi-device-header");

	// Build icon for min/max
	var i = document.createElement("i");
	i.classList.add("fas", "fa-plus-circle", "minmax"); // fontawesome

	

	// Handle the minimize and maximize button click
	i.addEventListener("click", (event) => {
		if (event.target.classList.contains("fa-minus-circle")) {
			event.target.classList.add("fa-plus-circle");
			event.target.classList.remove("fa-minus-circle");
		}
		else {
			event.target.classList.add("fa-minus-circle");
			event.target.classList.remove("fa-plus-circle");
		}

		// Get first group in device and hide siblings
		let group = document.querySelector(`div.pyindi-group[data-group="${INDI.group}"][data-device="${INDI.device}"]`);
		hideSibling(group);
	})
	
	// Build label for device
	var p = document.createElement("p");

	p.classList.add("pyindi-h1");
	p.textContent = INDI.device;

	// Append all
	header.appendChild(i);
	header.appendChild(p);
	div.appendChild(header);

	return div;
};

const buildGroup = (INDI) => {
	/* Builds the default div for new group

	Description
	-----------
	Called when the group doesn't exist on page

	Arguments
	---------
	INDI : Object that contains all information about the indi property

	Returns
	-------
	div : HTML object that was just built
	*/
	var div = document.createElement("div");

	div.setAttribute("data-device", INDI.device);
	div.setAttribute("data-group", INDI.group);
	div.id = genGroupID(INDI);
	div.classList.add("pyindi-group");
	customGUI ? "" : div.classList.add("hide");

	// Build header group
	var header = document.createElement("div");
	header.classList.add("pyindi-group-header");

	// Build icon for min/max
	var i = document.createElement("i");
	i.classList.add("fas", "fa-minus-circle", "minmax"); // fontawesome

	// Handle the minimize and maximize button click
	i.addEventListener("click", (event) => {
		if (event.target.classList.contains("fa-minus-circle")) {
			event.target.classList.add("fa-plus-circle");
			event.target.classList.remove("fa-minus-circle");
		}
		else {
			event.target.classList.add("fa-minus-circle");
			event.target.classList.remove("fa-plus-circle");
		}
		
		// Get first child then hide all children in group
		let vector = document.querySelector(`fieldset[data-group="${INDI.group}"][data-device="${INDI.device}"]`);
		hideSibling(vector);

	})
  
	// Build the title for group
	var p = document.createElement("p");
	p.textContent = INDI.group;
	p.classList.add("pyindi-h2");

	// Append all
	header.appendChild(i);
	header.appendChild(p);
	div.appendChild(header);

	return div;
};

const buildVectorAndProperties = (vectorSelector, INDI, appendTo) => {
	/* Handles building vector and the properties with it

	Description
	-----------
	Called for each new property type

	Arguments
	---------
	vectorSelector : string to select vector
	INDI           : Object that contains all information about the indi property
	appendTo       : html item to append to

	Returns
	-------
	None
	*/
	// If doesn't exist then build it! 
	if (!document.querySelector(`#${vectorSelector}`)) {
		console.debug(`Creating new ${INDI.metainfo}=${genVectorID(INDI)}`);
		var html = buildVector(INDI);

		switch (INDI.metainfo) {
			case "nvp":
				html = buildNumbers(INDI, html);
				break;
			case "svp":
				html = buildSwitches(INDI, html);
				break;
			case "tvp":
				html = buildTexts(INDI, html);
				break;
			case "lvp":
				html = buildLights(INDI, html);
				break;
			default:
				console.warn(`INDI metainfo=${INDI.metainfo} not recognized!`)
		}

		// Append to designated spot unless null then append to group
		if (appendTo) {
			appendTo.appendChild(html);
		}
		else {
			var group = `#${genGroupID(INDI)}`;
			document.querySelector(group).appendChild(html);
		}
	}

	return;
}

const buildVector = (INDI) => {
	/* Builds the default fieldset for new vector

	Description
	-----------
	Called when the vector doesn't exist on page

	Arguments
	---------
	INDI : Object that contains all information about the indi property

	Returns
	-------
	fieldset : HTML object that was just built
	*/
	var fieldset = document.createElement("fieldset");

	fieldset.classList.add("pyindi-vector");
	fieldset.id = genVectorID(INDI);
	fieldset.setAttribute("data-device", INDI.device);
	fieldset.setAttribute("data-group", INDI.group);
	fieldset.setAttribute("data-vector", INDI.name);

	// Create legend for fieldset
	var legend = document.createElement("legend");

	// Create span led in legend for indistate
	var led = document.createElement("span");
	led.classList.add("led");

	// Create text node for legend to not overwrite the led span
	var text = document.createTextNode(INDI.label);

	// Build fieldset by appending all
	legend.appendChild(led);
	legend.appendChild(text);
	fieldset.appendChild(legend);

	return fieldset
};

const buildTexts = (INDI, appendTo) => {
	/* Builds all text properties

	Description
	-----------
	Called when the text doesn't exist on page

	Arguments
	---------
	INDI     : Object that contains all information about the indi property
	appendTo : HTML object to append new properties to

	Returns
	-------
	appendTo : HTML object that was modified to add new properties
	*/
	INDI.values.forEach((property) => {
		// Create div that the indi text row will exist
		var div = document.createElement("div");
		
		var id = genPropertyID(INDI, property);
		div.id = id;
		div.classList.add("fix-div", "pyindi-row");

		// Create label for indi text row
		var label = document.createElement("label");
		label.textContent = property.label;
		label.classList.add("pyindi-property-label", "pyindi-col");
		label.htmlFor = id;

		div.appendChild(label);

		// Build ro and wo
		var ro = document.createElement("label");

		ro.readOnly = true;
		ro.classList.add("pyindi-property", "pyindi-ro", "pyindi-col");
		ro.textContent = property.value;

		var wo = document.createElement("input");
		wo.classList.add("pyindi-property", "pyindi-wo", "pyindi-col");
		//wo.id = `${noSpecial(INDI.device)}__${noSpecial(property.name)}`;

		// If "Enter" is pressed on writeonly area, send new text to indi
		wo.addEventListener("keyup", (event) => {
			if (event.key === "Enter") {
				event.preventDefault() // TODO Test if needed
				let value = event.target.value;
				setindi("Text", genINDI(INDI), property.name, value);
			}
		});

		// Determine if it is readonly, writeonly, or both and append
		div = appendROWO(INDI.perm, div, ro, wo);

		// Append the div to the fieldset
		appendTo.appendChild(div);

	});
	return appendTo;
};

const buildNumbers = (INDI, appendTo) => {
	/* Builds all number properties

	Description
	-----------
	Called when the number doesn't exist on page

	Arguments
	---------
	INDI     : Object that contains all information about the indi property
	appendTo : HTML object to append new properties to

	Returns
	-------
	appendTo : HTML object that was modified to add new properties
	*/
	INDI.values.forEach((property) => {
		// Create div that the indi labal, ro, and wo will exist in
		var div = document.createElement("div");

		var id = genPropertyID(INDI, property);
		div.id = id;
		div.setAttribute("data-format", property.format);

		div.classList.add("fix-div", "pyindi-row");

		// Create label for indi text row
		var label = document.createElement("label");
		label.textContent = property.label;
		label.classList.add("pyindi-property-label", "pyindi-col");
		label.htmlFor = id;

		div.appendChild(label);

		// Build ro and wo
		var ro = document.createElement("label"); // Make textarea for no resize
		ro.textContent = property.value;
		ro.classList.add("pyindi-property", "pyindi-ro", "pyindi-col");

		var wo = document.createElement("input");
		wo.classList.add("pyindi-property", "pyindi-wo", "pyindi-col")

		// Add min and max data attributes
		var tipStr = '';
		if (property.hasOwnProperty("min")) {
			wo.setAttribute("data-min", property.min);
			tipStr += `Minimum value = ${property.min} `;
		}
		if (property.hasOwnProperty("max")) {
			wo.setAttribute("data-max", property.max);
			tipStr += `Maximum value = ${property.max} `;
		}

		// Display invalid for numbers out of range
		var tip = document.createElement("div");
		tip.textContent = tipStr;
		tip.classList.add("hide", "text-right", "tip");

		// If "Enter" is pressed on writeonly area, send new text to indi
		wo.addEventListener("keyup", (event) => {
			if (event.key === "Enter") {
				event.preventDefault() // TODO Test if needed
				let value = event.target.value;
				
				// Test if in range 
				let min = parseFloat(wo.getAttribute("data-min"));
				let max = parseFloat(wo.getAttribute("data-max"));
				
				if (value < min) {
					// Add class
					wo.classList.add("invalid");
					tip.classList.remove("hide");
				}
				else if (value > max) {
					// Add class
					wo.classList.add("invalid");
					tip.classList.remove("hide");
				}
				else {
					wo.classList.remove("invalid");
					tip.classList.add("hide")
					setindi("Number", genINDI(INDI), property.name, value);
				}
			}
		});

		// Determine if it is readonly, writeonly, or both and append
		div = appendROWO(INDI.perm, div, ro, wo);
		

		// Append the tip to div and div to the fieldset
		div.appendChild(tip);
		appendTo.appendChild(div);

	});
	return appendTo;
};

const buildSwitches = (INDI, appendTo) => {
	/* Builds all switch properties

	Description
	-----------
	Called when the switch doesn't exist on page

	Arguments
	---------
	INDI     : Object that contains all information about the indi property
	appendTo : HTML object to append new properties to

	Returns
	-------
	appendTo : HTML object that was modified to add new properties
	*/
	var type = indisw2selector(INDI.rule);

	INDI.values.forEach((property) => {
		var span = document.createElement("span");
		var id = genPropertyID(INDI, property);

		// Create label for button text
		var label = document.createElement("label")
		label.classList.add("pyindi-switch-label");
		label.htmlFor = id;
		label.textContent = property.label

		// Create button
		var input = document.createElement("input");
		input.type = type;
		input.id = id;
		input.name = noSpecial(INDI.name);

		input.classList.add("pyindi-switch-input");
		input.value = noSpecial(property.name);

		input.checked = property.value === "On" ? true : false;
		
		// Create event listeners for input button
		input.addEventListener("change", (event) => {
			let name = event.target.value
			let value = event.target.checked ? "On" : "Off"
			setindi("Switch", genINDI(INDI), name, value);
		})
		
		// Append all
		span.appendChild(input);
		span.appendChild(label);
		appendTo.appendChild(span);
	})

	return appendTo;
};

const buildLights = (INDI, appendTo) => {
	/* Builds all light properties

	Description
	-----------
	Called when the light doesn't exist on page

	Arguments
	---------
	INDI     : Object that contains all information about the indi property
	appendTo : HTML object to append new properties to

	Returns
	-------
	appendTo : HTML object that was appended to
	*/
	INDI.values.forEach((property) => {
		var span = document.createElement("span"); // To store each light in
		var id = genPropertyID(INDI, property);
		var label = document.createElement("label");

		label.classList.add("pyindi-light-label");
		label.id = id;
		label.textContent = property.label;
		label.style.backgroundColor = indistate2css(property.value);

		// Append all
		span.appendChild(label)
		appendTo.appendChild(span);
	});

	return appendTo;
};

/* Handlers for New INDI payloads *********************************************

Description
-----------
These functions are responsible for handling new information
from the websocket. If the payload is new, build the appropriate
type and return the html object built or update the information
and return the selector string to the html object.

Functions
---------
- newDevice : Handles new device from INDI and builds if not exist
- newGroup  : Handles new group from INDI and builds if not exist
- newText   : Handles new text from INDI and builds if not exist
- newNumber : Handles new number from INDI and builds if not exist
- newSwitch : Handles new switch from INDI and builds if not exist
- newLight  : Handles new light from INDI and builds if not exist
*/
const newDevice = (INDI, appendTo=null) => {
	/* Creates a new device

	Description
	-----------
	Called when new device comes over the websocket.

	Arguments
	---------
	INDI     : Object that contains all information about the indi property
	appendTo : HTML object to append the new HTML elements

	Returns
	-------
	deviceSelector : INDI device HTML object
	*/
	var deviceSelector = genDeviceID(INDI);

	// If vpselector is empty, build
	if (!document.querySelector(`#${deviceSelector}`)) {
		console.debug(`Creating new device=${INDI.device}`);

		// Doesn't exist, build the section and add attributes and classes
		var html = buildDevice(INDI);

		// Append to specified or to the pyindi gui
		appendTo ? appendTo.appendChild(html) : pyindi.appendChild(html);
	}

	return document.querySelector(deviceSelector);
}

const newGroup = (INDI, appendTo=null) => {
	/* Creates a new group

	Description
	-----------
	Called when new group comes over the websocket.

	Arguments
	---------
	INDI     : Object that contains all information about the indi property
	appendTo : HTML object to append the new HTML elements

	Returns
	-------
	groupSelector : INDI group HTML object
	*/
	var groupSelector = genGroupID(INDI);

	// If vpselector is empty, build
	if (!document.querySelector(`#${groupSelector}`)) {
		console.debug(`Creating new group=${INDI.device}-${INDI.group}`);

		// Doesn't exists, build and add attributes and classes
		var html = buildGroup(INDI);

		if (appendTo != null) {
			appendTo.appendChild(html);
		}
		else {
			// Append to the parent section
			var parentSelector = genDeviceID(INDI);
			document.querySelector(`#${parentSelector}`).appendChild(html);
		}
	}
	
	return document.querySelector(groupSelector);
};

const newText = (INDI, appendTo=null) => {
	/* Creates a new text 
	
	Description
	-----------
	Called when new text property comes over the websocket.

	Arguments
	---------
	INDI     : Object that contains all information about the indi property
	appendTo : HTML object to append the new HTML elements

	Returns
	-------
	vectorSelector : INDI vector HTML object
	*/
	var vectorSelector = genVectorID(INDI);	
	buildVectorAndProperties(vectorSelector, INDI, appendTo);
	
	// Update values from indi
	INDI.values.forEach((property) => {
		var propertySelector = genPropertyID(INDI, property);
		var parent = document.querySelector(`#${propertySelector}`);
		var ro = document.querySelector(`#${propertySelector} .pyindi-ro`);

		// Handle case if wo only, then ro will not exist
		if (ro) {
			// Handle null content
			ro.textContent = isNull(property.value) ? "" : property.value
		}
	})

	// Update LED color on indistate
	updateLedState(INDI);

	return document.querySelector(vectorSelector);
}

const newNumber = (INDI, appendTo=null) => {
	/* Creates a new number

	Description
	-----------
	Called when new number property comes over the websocket.

	Arguments
	---------
	INDI     : Object that contains all information about the indi property
	appendTo : HTML object to append the new HTML elements

	Returns
	-------
	vectorSelector : INDI vector HTML object
	*/
	var vectorSelector = genVectorID(INDI);
	buildVectorAndProperties(vectorSelector, INDI, appendTo);
	
	// Update values from indi
	INDI.values.forEach((property) => {
		var propertySelector = genPropertyID(INDI, property);
		var parent = document.querySelector(`#${propertySelector}`);
		var ro = document.querySelector(`#${propertySelector} .pyindi-ro`);

		// Handle case if wo only, then ro will not exist
		if (ro) {
			var format = parent.getAttribute("data-format");
			var value = formatNumber(property.value, format);

			ro.textContent = value;
		}
	})

	// Update LED color on indistate
	updateLedState(INDI);

	return document.querySelector(vectorSelector)
}

const newSwitch = (INDI, appendTo=null) => {
	/* Creates a new switch

	Description
	-----------
	Called when new switch property comes over the websocket.

	Arguments
	---------
	INDI     : Object that contains all information about the indi property
	appendTo : HTML object to append the new HTML elements

	Returns
	-------
	vectorSelector : INDI vector HTML object
	*/
	var vectorSelector = genVectorID(INDI);
	buildVectorAndProperties(vectorSelector, INDI, appendTo);

	// Update values from indi
	INDI.values.forEach((property) => {
		var propertySelector = genPropertyID(INDI, property);

		let sw = document.querySelector(`#${propertySelector}`);
		let label = document.querySelector(`label[for="${sw.id}"]`);

		// Update the color of the switch depending on checked
		var active = "pyindi-switch-label-active";
		sw.checked = property.value === "On" ? true : false;

		sw.checked ? label.classList.add(active) : label.classList.remove(active);
	});

	// Update LED color on indistate
	updateLedState(INDI);

	return document.querySelector(vectorSelector);
}

const newLight = (INDI, appendTo=null) => {
	/* Creates a new light

	Description
	-----------
	Called when new light vector comes over the websocket.

	Arguments
	---------
	INDI     : Object that contains all information about the indi property
	appendTo : HTML object to append the new HTML elements

	Returns
	-------
	vectorSelector : INDI vector HTML object
	*/
	var vectorSelector = genVectorID(INDI);
	buildVectorAndProperties(vectorSelector, INDI, appendTo);
	
	// Update values from indi
	INDI.values.forEach((property) => {
		var propertySelector = genPropertyID(INDI, property);
		var light = document.querySelector(`#${propertySelector}`);

		// Update the color of the light depending on indistate
		var colors = indistate2css(property.value);
		light.style.backgroundColor = colors["background-color"]
		light.style.color = colors["color"]

		// Assign class for blinking if enabled
		if (BLINKING_LIGHTS) {
			let blink = indistate2blink(property.value);
			if (!blink) {
				// No blink so remove 
				light.classList.remove("blinking-busy", "blinking-alert")
			}
			else if (blink === "blinking-busy") {
				light.classList.remove("blinking-alert");
				light.classList.add(blink)
			}
			else if (blink === "blinking-alert") {
				light.classList.remove("blinking-busy");
				light.classList.add(blink)
			}
		}
	});

	// Update LED color on indistate
	updateLedState(INDI);

	return document.querySelector(vectorSelector);
}  

/* Utilities ******************************************************************

Description
--------
These functions are responsible for providing utilties to
manage INDI properties.

Functions
---------
- indistate2css   : converts INDI state to styling
- indistate2blink : converts INDI state to blinking for lights
- indisw2selector : converts INDI switch to selector types
- updateLEDState  : gets LED and updates style depending on indistate
- formatNumber    : Formats incoming INDI numbers
- genDeviceID     : Generates device ID attribute
- genGroupID      : Generates group ID attribute
- genVectorID     : Generates vector ID attribute
- genPropertyID   : Generates property ID attribute
- genINDI         : Builds payload to send back to indiserver
- noSpace         : Replaces space with _
- noSpecial       : Replaces special characters
- hideSibling     : Toggles hiding and showing all siblings
- isNull          : Checks if null or undefined
*/
const indistate2css = (INDIState) => {
	/* Converts indi state to styling for alerts */
	var state = INDISTATES["Unknown"] // Default return
	if (INDISTATES.hasOwnProperty(INDIState)) {
		state = INDISTATES[INDIState];
	}
	else {
		console.warn(`${INDIState} is not valid INDI state, should be ${Object.keys(INDISTATES)}`);
	}
	
	return state
}

const indistate2blink = (INDIState) => {
	/* Converts indi state to blinking for lights */
	var blink = null;
	if (INDIBLINKS.hasOwnProperty(INDIState)) {
		blink = INDIBLINKS[INDIState];
	}

	return blink
}

const indisw2selector = (INDIRule) => {
	/* Converts indi switches to selector type */
	var sw = "radio"; // Default return
	if (INDISWRULES.hasOwnProperty(INDIRule)) {
		sw = INDISWRULES[INDIRule];
	}
	else {
		console.warn(`${INDIRule} is not valid INDI rule, should be ${Object.keys(INDISWRULES)}`);
	}

	return sw
}

const updateLedState = (INDI) => {
	/* Gets led and updates style depending on indistate */
	var vectorSelector = genVectorID(INDI);
	var led = document.querySelector(`#${vectorSelector} .led`)
	led.style.backgroundColor = indistate2css(INDI.state)["background-color"];
}

const formatNumber = (numStr, fStr) => {
	/* Format indi numbers */
	num = parseFloat(numStr);
	var outstr;
	var decimal = parseInt(fStr.slice(0, fStr.length - 1).split('.')[1]);
	switch (fStr[fStr.length - 1]) {
		case 'f':
			outStr = isNaN(decimal) ? numStr : String(num.toFixed(decimal));
			break;
		case 'i':
			outStr = String(Math.round(num))
			break;
		default:
			outStr = numStr
	}
	return outStr;
}

/*
Sometimes groups and vectors have the same name which causes a collision in the
ids. I bypassed this by using a "-" between group and devices and a "__"
between vectors and their properties.
*/
genDeviceID = (INDI) => {
	/* Generates device ID attribute */
	return noSpecial(INDI.device);
}

genGroupID = (INDI) => {
	/* Generates group ID attribute */
	return `${genDeviceID(INDI)}-${noSpecial(INDI.group)}`;
}

genVectorID = (INDI) => {
	/* Generates vector ID attribute */
	// Cannot use group because it is not sent in SET indi commands
	return `${genDeviceID(INDI)}__${noSpecial(INDI.name)}`;
}

genPropertyID = (INDI, prop) => {
	/* Generates property ID attribute */
	return `${genVectorID(INDI)}__${noSpecial(prop.name)}`;
}

genINDI = (INDI) => {
	/* Builds payload to send back to indiserver */
	return `${INDI.device}.${INDI.name}`;
}

const noSpace = (str) => {
	/* Replaces spaces with _ */
	return str.replace(/ /g, '_');
}

const noSpecial = (str) => {
	/* Replaces special characters */
	return noSpace(str).replace(/[&\/\\#,+()$~%.'":*?<>{}]/g, '')
}

const hideSibling = (nextSibling) => {
	/* Toggles hiding and showing all siblings */
	while (nextSibling) { // Returns null if no next sibling
		// Toggle the hide class
		nextSibling.classList.toggle("hide");
		nextSibling = nextSibling.nextElementSibling;
	}
	return;
}

const isNull = (value) => {
	/* Checks if null or undefined */
	return (value === undefined || value === null);
}

const appendROWO = (INDIperm, appendTo, ro, wo) => {
	/* Depending on perm, append ro or wo or both */
	switch (INDIperm) {
		case INDIPERM_RO:
			appendTo.appendChild(ro);
			break;
		case INDIPERM_RW:
			appendTo.appendChild(ro);
			appendTo.appendChild(wo);
			break;
		case INDIPERM_WO:
			appendTo.appendChild(wo);
			break;
		default:
	}

	return appendTo
}
