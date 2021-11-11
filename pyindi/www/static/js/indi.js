/* CONSTANTS */
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

// GLOBALS
var pyindi; // Selector for pyindi gui

/* BUILDERS

Description
--------
These functions are responsible for building the html elements
and assigning data attributes, classes, and ids. They return
the element that was built.

Every new INDI group requires a fieldset and each INDI device
requires a new div. 

Functions
---------
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
	pyindi = document.createElement("div");
	pyindi.classList.add("pyindi");

	var nav = buildNav();

	pyindi.appendChild(nav)
	document.body.appendChild(pyindi);

	return pyindi;
}

const buildNav = () => {
	var nav = document.createElement("nav");
	nav.classList.add("pyindi-nav");

	var div = document.createElement("div");
	div.classList.add("pyindi-row");

	

	var aGithub = document.createElement("a");
	aGithub.classList.add("fab", "fa-github", "icon");
	aGithub.href = "https://github.com/so-mops/pyINDI";
	aGithub.title = "Source Code";
	aGithub.target = "_blank";
	var navBar1 = document.createElement("div");
	navBar1.classList.add("pyindi-col", "pyindi-h4");
	var navBar2 = document.createElement("div");
	navBar2.classList.add("pyindi-col","text-center", "pyindi-h4");
	var navBar3 = document.createElement("div");
	navBar3.classList.add("pyindi-col", "text-right", "pyindi-h4");
	navBar2.textContent = "pyINDI";
	var iDarkMode = document.createElement("i");
	iDarkMode.classList.add("fas", "fa-moon", "icon");

	iDarkMode.addEventListener("click", (event) => {
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
	navBar1.appendChild(aGithub);
	div.appendChild(navBar1);
	div.appendChild(navBar2);
	navBar3.appendChild(iDarkMode)
	div.appendChild(navBar3);
	nav.appendChild(div);

	document.body.appendChild(nav);

	return nav;
	
}

const buildFooter = () => {

	return;
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
	section : HTML object that was just built
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
		// Next sibling is the p so go to next
		//let nextSibling = event.target.nextElementSibling.nextElementSibling;
		//hide(nextSibling);

		let deviceDiv = document.querySelector(`div.pyindi-group[data-group="${INDI.group}"][data-device="${INDI.device}"]`);
		console.log(deviceDiv);
		hide(deviceDiv);

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
	INDI   : Object that contains all information about the indi property

	Returns
	-------
	div : HTML object that was just built
	*/
	var div = document.createElement("div");

	div.setAttribute("data-device", INDI.device);
	div.setAttribute("data-group", INDI.group);
	div.id = genGroupID(INDI);
	div.classList.add("pyindi-group");

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
		// Next sibling is the p so go to next
		//let nextSibling = event.target.nextElementSibling.nextElementSibling;
		//hide(nextSibling);
		
		let fieldset = document.querySelector(`fieldset[data-group="${INDI.group}"][data-device="${INDI.device}"]`);
		console.log(fieldset);
		hide(fieldset);

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

const buildVectorAndProperties = (selector, INDI, appendTo) => {
	/* Handles building vector and the properties with it

	Description
	-----------
	Called for each new property type

	Arguments
	---------
	selector : string to select vector
	INDI     : Object that contains all information about the indi property
	appendTo : html item to append to

	Returns
	-------
	None
	*/
	// If doesn't exist then build it! 
	if (!document.querySelector(`#${selector}`)) {
		console.log(`Creating new ${INDI.metainfo}=${genVectorID(INDI)}`);
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
	section : HTML object that was just built
	*/
	var fieldset = document.createElement("fieldset");

	fieldset.classList.add("pyindi-vector"); // Get class meta
	//fieldset.id = nosp(INDI.name);
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
	INDI    : Object that contains all information about the indi property
	vphtmldef : HTML object to append new properties to

	Returns
	-------
	vphtmldef : HTML object that was modified to add new properties
	*/
	INDI.values.forEach((tp) => {
		// Create div that the indi text row will exist
		var div = document.createElement("div");
		
		//div.id = nosp(tp.name);
		var id = genPropertyID(INDI, tp);
		div.id = id;
		div.classList.add("fix-div", "pyindi-row");

		// Create label for indi text row
		var label = document.createElement("label");
		label.textContent = tp.label;
		label.classList.add("pyindi-property-label", "pyindi-col");
		label.htmlFor = id;

		div.appendChild(label);

		// Build ro and wo
		var ro = document.createElement("label");

		ro.readOnly = true;
		ro.classList.add("pyindi-property", "pyindi-ro", "pyindi-col");
		ro.textContent = tp.value;

		var wo = document.createElement("input");
		wo.classList.add("pyindi-property", "pyindi-wo", "pyindi-col");
		//wo.id = `${nosp(INDI.device)}__${nosp(tp.name)}`;

		// If "Enter" is pressed on writeonly area, send new text to indi
		wo.addEventListener("keyup", (event) => {
			if (event.key === "Enter") {
				event.preventDefault() // TODO Test if needed
				let value = event.target.value;
				setindi("Text", genINDI(INDI), tp.name, value);
			}
		});

		wo.addEventListener("keydown", (event) => {
			if (event.key === "Enter") {
				event.preventDefault();
			}
		})

		// Determine if it is readonly, writeonly, or both and append
		switch (INDI.perm) {
			case INDIPERM_RO:
				div.appendChild(ro);
				break;
			case INDIPERM_RW:
				div.appendChild(ro);
				div.appendChild(wo);
				break;
			case INDIPERM_WO:
				div.appendChild(wo);
				break;
			default:
		}

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
	INDI    : Object that contains all information about the indi property
	vphtmldef : HTML object to append new properties to

	Returns
	-------
	vphtmldef : HTML object that was modified to add new properties
	*/
	INDI.values.forEach((np) => {
		// Create div that the indi text row will exist
		var div = document.createElement("div");

		var id = genPropertyID(INDI, np);
		div.id = id;
		div.setAttribute("data-format", np.format);
		div.classList.add("fix-div", "pyindi-row");

		// Create label for indi text row
		var label = document.createElement("label");
		label.textContent = np.label;
		label.classList.add("pyindi-property-label", "pyindi-col");
		label.htmlFor = id;

		div.appendChild(label);

		// Build ro and wo
		var ro = document.createElement("label");
		ro.textContent = np.value;
		ro.classList.add("pyindi-property", "pyindi-ro", "pyindi-col");

		var wo = document.createElement("input");
		wo.classList.add("pyindi-property", "pyindi-wo", "pyindi-col")

		// If "Enter" is pressed on writeonly area, send new text to indi
		wo.addEventListener("keyup", (event) => {
			if (event.key === "Enter") {
				event.preventDefault() // TODO Test if needed
				let value = event.target.value;
				setindi("Number", genINDI(INDI), np.name, value);
			}
		});
		wo.addEventListener("keydown", (event) => {
			if (event.key === "Enter") {
				event.preventDefault();
			}
		})

		// Determine if it is readonly, writeonly, or both and append
		switch (INDI.perm) {
			case INDIPERM_RO:
				div.appendChild(ro);
				break;
			case INDIPERM_RW:
				div.appendChild(ro);
				div.appendChild(wo);
				break;
			case INDIPERM_WO:
				div.appendChild(wo);
				break;
			default:
		}
		// Append the div to the fieldset
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
	INDI    : Object that contains all information about the indi property
	vphtmldef : HTML object to append new properties to

	Returns
	-------
	vphtmldef : HTML object that was modified to add new properties
	*/
	var type = indisw2selector(INDI.rule);
	// Keeping div empty while I build everything else
	INDI.values.forEach((sp) => {
		var span = document.createElement("span");
		var id = genPropertyID(INDI, sp);
		//span.setAttribute("INDIname", sp.name);
		//span.id = id;

		// Create label for button text
		var label = document.createElement("label")
		label.classList.add("pyindi-switch-label");
		label.htmlFor = id;
		label.textContent = sp.label

		// Create radio button
		var input = document.createElement("input");
		input.type = type;
		input.id = id;
		input.setAttribute("name", nosp(INDI.name));
		input.setAttribute("data-device", INDI.device);
		input.setAttribute("data-vector", INDI.name);
		input.setAttribute("data-name", sp.name);
		input.classList.add("pyindi-switch-input");
		input.value = nosp(sp.name);
		//input.setAttribute("indiname", nosp(sp.name));
		input.checked = sp.value === "On" ? true : false;
		
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
	INDI    : Object that contains all information about the indi property
	vphtmldef : HTML object to append new properties to

	Returns
	-------
	vphtmldef : HTML object that was modified to add new properties
	*/
	INDI.values.forEach((lp) => {
		var span = document.createElement("span"); // To store each light in
		var id = genPropertyID(INDI, lp);
		var label = document.createElement("label");

		//label.id = lp.label; This was in the pyindi code, probably a bug
		label.classList.add("pyindi-light-label");
		label.id = id;
		label.textContent = lp.label;
		label.style.backgroundColor = indistate2css(lp.value);

		// Append all
		span.appendChild(label)
		appendTo.appendChild(span);
	});

	return appendTo;
};

/* NEW INDI INFORMATION

Description
-----------
These functions are responsible for handling new information
from the websocket. If the payload is new, build the appropriate
type and return the html object built or update the information
and return the selector string to the html object.

Functions
---------
- newDevice
- newGroup
- newVector
- newText
- newNumber
- newSwitch
- newLight
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
	html     : HTML object that was just built
	selector : String selector for that object
	*/
	var selector = genDeviceID(INDI);

	// If vpselector is empty, build
	if (!document.querySelector(`#${selector}`)) {
		console.debug(`Creating new device=${INDI.device}`);

		// Doesn't exist, build the section and add attributes and classes
		var html = buildDevice(INDI);

		// Append to specified or to the body
		appendTo ? appendTo.appendChild(html) : pyindi.appendChild(html);
	}

	return document.querySelector(selector);
}

const newGroup = (INDI, appendTo=null) => {
	/* Creates a new group

	Description
	-----------
	Called when new group comes over the websocket.

	Arguments
	---------
	INDI   : Object that contains all information about the indi property
	appendTo : HTML object to append the new HTML elements

	Returns
	-------
	vphtmldef  : HTML object that was just built
	vpselector : String selector for that object
	*/
	var selector = genGroupID(INDI);

	// If vpselector is empty, build
	if (!document.querySelector(`#${selector}`)) {
		console.debug(`Creating new group=${INDI.device}-${INDI.group}`);

		// Doesn't exists, build and add attributes and classes
		var html = buildGroup(INDI);

		if (appendTo != null) {
			appendTo.appendChild(html);
		}
		else {
			// Append to the parent section
			var parent = genDeviceID(INDI);
			document.querySelector(`#${parent}`).appendChild(html);
		}

		return html;
	}
	
	return document.querySelector(selector);
};

const newText = (INDI, appendTo=null) => {
	/* Creates a new text 
	
	Description
	-----------
	Called when new text property comes over the websocket.

	Arguments
	---------
	INDI   : Object that contains all information about the indi property
	appendTo : HTML object to append the new HTML elements

	Returns
	-------
	vphtmldef  : HTML object that was just built
	vpselector : String selector for that object
	*/
	var selector = genVectorID(INDI);	
	buildVectorAndProperties(selector, INDI, appendTo);
	
	// Update values from indi
	INDI.values.forEach((tp) => {
		var tpSelector = genPropertyID(INDI, tp); // Need to still get ro
		var ro = document.querySelector(`#${tpSelector} .pyindi-ro`);

		// Handle null content
		ro.textContent = isNull(tp.value) ? "" : tp.value
	})

	// Update LED color on indistate
	updateLedState(INDI);

	return document.querySelector(selector);
}



const newNumber = (INDI, appendTo=null) => {
	/* Creates a new number

	Description
	-----------
	Called when new number property comes over the websocket.

	Arguments
	---------
	INDI   : Object that contains all information about the indi property
	appendTo : HTML object to append the new HTML elements

	Returns
	-------
	vphtmldef  : HTML object that was just built
	vpselector : String selector for that object
	*/
	var selector = genVectorID(INDI);
	buildVectorAndProperties(selector, INDI, appendTo);
	
	// Update values from indi
	INDI.values.forEach((np) => {
		var npSelector = genPropertyID(INDI, np); // Need to still get ro
		var property = document.querySelector(`#${npSelector}`);
		var ro = document.querySelector(`#${npSelector} .pyindi-ro`);

		var format = property.getAttribute("data-format");
		var value = formatNumber(np.value, format);
		
		ro.textContent = value;
	})

	// Update LED color on indistate
	updateLedState(INDI);

	return document.querySelector(selector)
}

const newSwitch = (INDI, appendTo=null) => {
	/* Creates a new switch

	Description
	-----------
	Called when new switch property comes over the websocket.

	Arguments
	---------
	INDI   : Object that contains all information about the indi property
	appendTo : HTML object to append the new HTML elements

	Returns
	-------
	vphtmldef  : HTML object that was just built
	vpselector : String selector for that object
	*/
	var selector = genVectorID(INDI);
	buildVectorAndProperties(selector, INDI, appendTo);

	// Update values from indi
	INDI.values.forEach((sp) => {
		var spSelector = genPropertyID(INDI, sp);

		let sw = document.querySelector(`#${spSelector}`);
		let label = document.querySelector(`label[for="${sw.id}"]`);

		// Update the color of the switch depending on checked
		var active = "pyindi-switch-label-active";
		sw.checked = sp.value === "On" ? true : false;

		sw.checked ? label.classList.add(active) : label.classList.remove(active);
	});

	// Update LED color on indistate
	updateLedState(INDI);

	return document.querySelector(selector);
}

const newLight = (INDI, appendTo=null) => {
	/* Creates a new light

	Description
	-----------
	Called when new light property comes over the websocket.

	Arguments
	---------
	INDI   : Object that contains all information about the indi property
	appendTo : HTML object to append the new HTML elements

	Returns
	-------
	vphtmldef  : HTML object that was just built
	vpselector : String selector for that object
	*/
	var selector = genVectorID(INDI);
	buildVectorAndProperties(selector, INDI, appendTo);
	
	// Update values from indi
	INDI.values.forEach((lp) => {
		var lpSelector = genPropertyID(INDI, lp);
		var light = document.querySelector(`#${lpSelector}`);

		// Update the color of the light depending on indistate
		var colors = indistate2css(lp.value);
		light.style.backgroundColor = colors["background-color"]
		light.style.color = colors["color"]

		// Assign class for blinking
		/* let blink = indistate2blink(lp.value);
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
		} */
	});

	// Update LED color on indistate
	updateLedState(INDI);

	return document.querySelector(selector);
}  

/* UTILITIES

Description
--------
These functions are responsible for providing utilties to
manage INDI properties.

Functions
---------
- indistate2css   : converts INDI state to styling
- indisw2selector : converts INDI switch to selector types
- formatNumber    : Formats incoming indi numbers
- nosp            : Replaces space with _
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
	var vpselector = genVectorID(INDI);
	var led = document.querySelector(`#${vpselector} .led`)
	led.style.backgroundColor = indistate2css(INDI.state)["background-color"];
}

const formatNumber = (numStr, fStr) => {
	/* Format indi numbers
	
	Description
	-----------
	Format the floating point INDI numbers but don't mess with 
	the sexagesimal stuff.

	Arguments
	---------
	numStr : the number as a string
	fStr   : the INDI format string

	Returns
	-------
	outStr : the correct formatted number as string
	*/
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
Notes
-----
Sometimes groups and vectors have the same name which causes a collision in the
ids. I bypassed this by using a "-" between group and devices and a "__"
between vectors and their properties.
*/
genDeviceID = (INDI) => {
	return nosp(INDI.device);
}
genGroupID = (INDI) => {
	return `${genDeviceID(INDI)}-${nosp(INDI.group)}`;
}
genVectorID = (INDI) => {
	// Cannot use group because it is not sent in SET indi commands
	return `${genDeviceID(INDI)}__${nosp(INDI.name)}`;
}
genPropertyID = (INDI, prop) => {
	return `${genVectorID(INDI)}__${nosp(prop.name)}`;
}
genINDI = (INDI) => {
	return `${INDI.device}.${INDI.name}`;
}

const nosp = (str) => {
	/* Replaces spaces with _ */
	return str.replace(/ /g, '_');
}

const hide = (nextSibling) => {
	/* Toggles hiding and showing all siblings */
	while (nextSibling) { // Returns null if no next sibling
		// Toggle the hide class
		nextSibling.classList.toggle("hide");
		nextSibling = nextSibling.nextElementSibling;
	}
	return;
}

const isNull = (value) => {
	return (value === undefined || value === null);
}
