/* CONSTANTS */
const INDIPERM_RO = "ro";
const INDIPERM_WO = "wo";
const INDIPERM_RW = "rw";

const INDISTATES = {
	"Idle": "var(--indistate-idle)",
	"Ok": "var(--indistate-ok)",
	"Busy": "var(--indistate-busy)",
	"Alert": "var(--indistate-alert)",
	"Unknown": "var(--indistate-unknown)"
};

const INDISWRULES = {
	"OneOfMany": "radio",
	"AtMostOne": "radio",
	"AnyOfMany": "checkbox"
}

/* BUILDERS

Description
--------
These functions are responsible for building the html elements
and assigning data attributes, classes, and ids. They return
the element that was built.

Every new INDI group requires a fieldset and each INDI device
requires a new section. 

Functions
---------
- buildDevice   : builds section to hold new device
- buildGroup    : builds group to hold new group
- buildVector   : builds fieldset to hold new vector
- buildNumbers  : builds INDI number when new number is received
- buildTexts    : builds INDI text when new text is received
- buildSwitches : builds INDI switches when new switch is received
- buildLights   : builds INDI lights when new light is received
*/

const buildDevice = (INDIvp) => {
	/* Builds the default section for new device

	Description
	-----------
	Called when the device doesn't exist on page

	Arguments
	---------
	INDIvp : Object that contains all information about the indi property

	Returns
	-------
	section : HTML object that was just built
	*/
	var section = document.createElement("section");

	section.setAttribute("device", INDIvp.device); // TODO Add data-
	section.id = nosp(INDIvp.device)
	section.classList.add("INDIdevice");

	// Build label for device
	var p = document.createElement("p");

	p.classList.add("IDevice_header");
	p.textContent = INDIvp.device;

	// Append all
	section.appendChild(p);

	return section;
};

const buildGroup = (INDIvp) => {
	/* Builds the default div for new group

	Description
	-----------
	Called when the group doesn't exist on page

	Arguments
	---------
	INDIvp   : Object that contains all information about the indi property

	Returns
	-------
	div : HTML object that was just built
	*/
	var div = document.createElement("div");

	div.setAttribute("device", INDIvp.device);
	div.id = nosp(INDIvp.group).toUpperCase();
	div.setAttribute("group", INDIvp.group);
	div.classList.add("INDIgroup");

	// Build icon for min/max
	// TODO do we want this when custom-gui?
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
		let nextSibling = event.target.nextElementSibling.nextElementSibling;
		hide(nextSibling);
	})
  
	// Build the title for group
	var p = document.createElement("p");
	p.textContent = INDIvp.group;
	p.classList.add("IGroup_header");

	// TODO Add min/max button toggle to hide group

	// Append all
	div.appendChild(i);
	div.appendChild(p);

	return div;
};

const buildVector = (INDIvp) => {
	/* Builds the default fieldset for new vector

	Description
	-----------
	Called when the vector doesn't exist on page

	Arguments
	---------
	INDIvp : Object that contains all information about the indi property

	Returns
	-------
	section : HTML object that was just built
	*/
	var fieldset = document.createElement("fieldset");

	fieldset.classList.add("INDIvp", `INDI${INDIvp.metainfo}`); // Get class meta
	fieldset.id = nosp(INDIvp.name);
	fieldset.setAttribute("device", INDIvp.device); // FIXME Removed data-
	fieldset.setAttribute("group", INDIvp.group); // FIXME Removed data-

	// Create legend for fieldset
	var legend = document.createElement("legend");

	// Create span led in legend for indistate
	var led = document.createElement("span");
	led.classList.add("led");

	// Create text node for legend to not overwrite the led span
	var text = document.createTextNode(INDIvp.label);

	// Build fieldset by appending all
	legend.appendChild(led);
	legend.appendChild(text);
	fieldset.appendChild(legend);

	return fieldset
};

const buildTexts = (INDIvp, vphtmldef) => {
	/* Builds all text properties

	Description
	-----------
	Called when the text doesn't exist on page

	Arguments
	---------
	INDIvp    : Object that contains all information about the indi property
	vphtmldef : HTML object to append new properties to

	Returns
	-------
	vphtmldef : HTML object that was modified to add new properties
	*/
	INDIvp.values.forEach((tp) => {
		// Create div that the indi text row will exist
		var div = document.createElement("div");

		div.id = nosp(tp.name);
		div.setAttribute("INDIlabel", tp.label); // FIXME Removed data-
		div.setAttribute("INDIname", tp.name); // FIXME Removed data-
		div.classList.add("IText_div");

		// Create label for indi text row
		var label = document.createElement("label");

		label.textContent = tp.label;
		label.classList.add("IText_label");
		label.htmlFor = `${nosp(INDIvp.device)}__${nosp(tp.name)}`;

		div.appendChild(label);

		// Build ro and wo
		var ro = document.createElement("textarea");

		ro.rows = 1;
		ro.readOnly = true;
		ro.classList.add("IText_ro");
		ro.textContent = tp.value;

		var wo = document.createElement("textarea");
		wo.rows = 1;
		wo.classList.add("IText_wo");
		wo.id = `${nosp(INDIvp.device)}__${nosp(tp.name)}`;

		// If "Enter" is pressed on writeonly area, send new text to indi
		wo.addEventListener("keyup", (event) => {
			if (event.key === "Enter") {
				event.preventDefault() // TODO Test if needed
				let value = event.target.value;
				setindi("Text", `${INDIvp.device}.${INDIvp.name}`, tp.name, value);
			}
		});

		wo.addEventListener("keydown", (event) => {
			if (event.key === "Enter") {
				event.preventDefault();
			}
		})

		// Determine if it is readonly, writeonly, or both and append
		switch (INDIvp.perm) {
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
		vphtmldef.appendChild(div);

	});
	return vphtmldef;
};

const buildNumbers = (INDIvp, vphtmldef) => {
	/* Builds all number properties

	Description
	-----------
	Called when the number doesn't exist on page

	Arguments
	---------
	INDIvp    : Object that contains all information about the indi property
	vphtmldef : HTML object to append new properties to

	Returns
	-------
	vphtmldef : HTML object that was modified to add new properties
	*/
	INDIvp.values.forEach((np) => {
		// Create div that the indi text row will exist
		var div = document.createElement("div");

		div.id = nosp(np.name);
		div.setAttribute("INDIlabel", np.label); // FIXME Removed data-
		div.setAttribute("INDIname", np.name); // FIXME Removed data-
		div.setAttribute("INDIformat", np.format); // TODO Add data-
		div.classList.add("INumber_div");

		// Create label for indi text row
		var label = document.createElement("label");

		label.textContent = np.label;
		label.classList.add("INumber_label");
		label.htmlFor = `${nosp(INDIvp.device)}__${nosp(np.name)}`;

		div.appendChild(label);

		// Build ro and wo
		var ro = document.createElement("label");
		ro.textContent = np.value;
		ro.classList.add("INumber_ro");

		var wo = document.createElement("input");
		wo.classList.add("INumber_wo")
		//wo.id = `nosp(INDIvp.device)__${nosp(INDIvp.name)}`;
		wo.id = `${nosp(INDIvp.device)}__${nosp(np.name)}`;

		// If "Enter" is pressed on writeonly area, send new text to indi
		wo.addEventListener("keyup", (event) => {
			if (event.key === "Enter") {
				event.preventDefault() // TODO Test if needed
				let value = event.target.value;
				setindi("Number", `${INDIvp.device}.${INDIvp.name}`, np.name, value);
			}
		});
		// Determine if it is readonly, writeonly, or both and append
		switch (INDIvp.perm) {
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
		vphtmldef.appendChild(div);

	});
	return vphtmldef;
};

const buildSwitches = (INDIvp, appendTo) => {
	/* Builds all switch properties

	Description
	-----------
	Called when the switch doesn't exist on page

	Arguments
	---------
	INDIvp    : Object that contains all information about the indi property
	vphtmldef : HTML object to append new properties to

	Returns
	-------
	vphtmldef : HTML object that was modified to add new properties
	*/
	var type = indisw2selector(INDIvp.rule);
	// Keeping div empty while I build everything else
	INDIvp.values.forEach((sp) => {
		var span = document.createElement("span");

		span.setAttribute("INDIname", sp.name);
		span.classList.add("ISwitch_span");
		span.id = nosp(sp.name);

		// Create label for button text
		var label = document.createElement("label")

		label.id = nosp(sp.name);
		label.classList.add("ISwitchlabel");
		label.htmlFor = `${nosp(INDIvp.device)}__${nosp(INDIvp.name)}__${nosp(sp.name)}`;
		label.textContent = sp.label

		// Create radio button
		var input = document.createElement("input");
		input.type = type;
		input.id = `${nosp(INDIvp.device)}__${nosp(INDIvp.name)}__${nosp(sp.name)}`;
		input.setAttribute("name", nosp(INDIvp.name));
		input.setAttribute("device", nosp(INDIvp.device));
		input.setAttribute("vector", INDIvp.name);
		input.classList.add("ISwitchinput");
		input.value = nosp(sp.name);
		input.setAttribute("indiname", nosp(sp.name));
		input.checked = sp.value === "On" ? true : false;
		
		// Create event listeners for input button
		input.addEventListener("change", (event) => {
			let name = event.target.value
			let value = event.target.checked ? "On" : "Off"
			setindi("Switch", `${INDIvp.device}.${INDIvp.name}`, name, value);
		})
		
		// Append all
		span.appendChild(input);
		span.appendChild(label);
		appendTo.appendChild(span);
	})

	return appendTo;
};

const buildLights = (INDIvp, appendTo) => {
	/* Builds all light properties

	Description
	-----------
	Called when the light doesn't exist on page

	Arguments
	---------
	INDIvp    : Object that contains all information about the indi property
	vphtmldef : HTML object to append new properties to

	Returns
	-------
	vphtmldef : HTML object that was modified to add new properties
	*/
	INDIvp.values.forEach((lp) => {
		var label = document.createElement("label");

		//label.id = lp.label; This was in the pyindi code, probably a bug
		label.classList.add("ILightlabel");
		label.id = `${nosp(INDIvp.device)}__${nosp(lp.name)}`;
		label.textContent = lp.label;
		label.style.backgroundColor = indistate2css(lp.value);

		// Append all
		appendTo.appendChild(label);
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

const newDevice = (INDIvp, appendTo=null) => {
	/* Creates a new device

	Description
	-----------
	Called when new device comes over the websocket.

	Arguments
	---------
	INDIvp   : Object that contains all information about the indi property
	appendTo : HTML object to append the new HTML elements

	Returns
	-------
	vphtmldef  : HTML object that was just built
	vpselector : String selector for that object
	*/
	var vpselector = `section.INDIdevice[device="${INDIvp.device}"]`;

	// If vpselector is empty, build
	if (!document.querySelector(vpselector)) {
		console.debug(`Creating new device=${INDIvp.device}`);

		// Doesn't exist, build the section and add attributes and classes
		var vphtmldef = buildDevice(INDIvp);

		// Append to specified or to the body
		appendTo ? appendTo.appendChild(vphtmldef) : document.body.appendChild(vphtmldef);
	}

	return document.querySelector(vpselector);
}

const newGroup = (INDIvp, appendTo=null) => {
	/* Creates a new group

	Description
	-----------
	Called when new group comes over the websocket.

	Arguments
	---------
	INDIvp   : Object that contains all information about the indi property
	appendTo : HTML object to append the new HTML elements

	Returns
	-------
	vphtmldef  : HTML object that was just built
	vpselector : String selector for that object
	*/
	var vpselector = `div.INDIgroup[group="${INDIvp.group}"]`;

	// If vpselector is empty, build
	if (!document.querySelector(vpselector)) {
		console.debug(`Creating new group=${INDIvp.device}.${INDIvp.group}`);

		// Doesn't exists, build and add attributes and classes
		var vphtmldef = buildGroup(INDIvp);

		if (appendTo != null) {
			appendTo.appendChild(vphtmldef);
		}
		else {
			// Append to the parent section
			var sectionselector = `section.INDIdevice[device="${INDIvp.device}"]`;
			document.querySelector(sectionselector).appendChild(vphtmldef);
		}

		return vphtmldef;
	}
	
	return document.querySelector(vpselector);
};

const newText = (INDIvp, appendTo=null) => {
	/* Creates a new text 
	
	Description
	-----------
	Called when new text property comes over the websocket.

	Arguments
	---------
	INDIvp   : Object that contains all information about the indi property
	appendTo : HTML object to append the new HTML elements

	Returns
	-------
	vphtmldef  : HTML object that was just built
	vpselector : String selector for that object
	*/
	var vpselector = genvpselector(INDIvp);
	
	// If the vpselector is empty, build
	if (!document.querySelector(vpselector)) {
		console.debug(`Creating new text==${INDIvp.device}.${INDIvp.group}.${INDIvp.name}`);

		var vphtmldef = buildVector(INDIvp);
		vphtmldef = buildTexts(INDIvp, vphtmldef);

		// Append to designated spot unless null then append to group
		if (appendTo) {
			appendTo.appendChild(vphtmldef);
		}
		else {
			var group = gengroupselector(INDIvp);
			document.querySelector(group).appendChild(vphtmldef);
		}
	}
	
	// Update values from indi
	INDIvp.values.forEach((tp) => {
		var tpselector = `div.IText_div[INDIname="${tp.name}"] textarea.IText_ro`;
		var ro = document.querySelector(`${vpselector} ${tpselector}`);

		ro.textContent = tp.value;
	})

	// Update LED color on indistate
	updateLedState(INDIvp);

	return document.querySelector(vpselector);
}

const newNumber = (INDIvp, appendTo=null) => {
	/* Creates a new number

	Description
	-----------
	Called when new number property comes over the websocket.

	Arguments
	---------
	INDIvp   : Object that contains all information about the indi property
	appendTo : HTML object to append the new HTML elements

	Returns
	-------
	vphtmldef  : HTML object that was just built
	vpselector : String selector for that object
	*/
	var vpselector = genvpselector(INDIvp);

	// If the vpselector is empty, build
	if (!document.querySelector(vpselector)) {
		console.debug(`Creating new number==${INDIvp.device}.${INDIvp.group}.${INDIvp.name}`);

		var vphtmldef = buildVector(INDIvp);
		vphtmldef = buildNumbers(INDIvp, vphtmldef);
		
		// Append to designated spot unless null then append to group
		if (appendTo) {
			appendTo.appendChild(vphtmldef);
		}
		else {
			var group = gengroupselector(INDIvp);
			document.querySelector(group).appendChild(vphtmldef);
		}
	}
	
	// Update values from indi
	INDIvp.values.forEach((np) => {
		var formatselector = document.querySelector(`div[INDIname="${np.name}"]`);
		var format = formatselector.getAttribute("indiformat");
		var npselector = `div.INumber_div[INDIname="${np.name}"] label.INumber_ro`;
		var value = formatNumber(np.value, format);
		
		var ro = document.querySelector(`${vpselector} ${npselector}`)
		ro.textContent = value;
	})

	// Update LED color on indistate
	updateLedState(INDIvp);

	return document.querySelector(vpselector)
}

const newSwitch = (INDIvp, appendTo=null) => {
	/* Creates a new switch

	Description
	-----------
	Called when new switch property comes over the websocket.

	Arguments
	---------
	INDIvp   : Object that contains all information about the indi property
	appendTo : HTML object to append the new HTML elements

	Returns
	-------
	vphtmldef  : HTML object that was just built
	vpselector : String selector for that object
	*/
	var vpselector = genvpselector(INDIvp);
	
	// If empty, build property and switches
	if (!document.querySelector(vpselector)) {
		console.debug(`Creating new switch=${INDIvp.device}.${INDIvp.group}.${INDIvp.name}`);

		var vphtmldef = buildVector(INDIvp);
		vphtmldef = buildSwitches(INDIvp, vphtmldef);
		
		// Append to designated spot unless null then append to group
		if (appendTo) {
			appendTo.appendChild(vphtmldef);
		}
		else {
			var group = gengroupselector(INDIvp);
			document.querySelector(group).appendChild(vphtmldef);
		}
	}

	// Update values from indi
	INDIvp.values.forEach((sp) => {
		var spselector = `${nosp(INDIvp.device)}__${nosp(INDIvp.name)}__${nosp(sp.name)}`;

		let sw = document.querySelector(`input.ISwitchinput#${spselector}`);
		let label = document.querySelector(`label[for="${sw.id}"]`);

		// Update the color of the switch depending on checked
		var active = "ISwitchlabel-active";
		sw.checked = sp.value === "On" ? true : false;

		sw.checked ? label.classList.add(active) : label.classList.remove(active);
	});

	// Update LED color on indistate
	updateLedState(INDIvp);

	return document.querySelector(vpselector);
}

const newLight = (INDIvp, appendTo=null) => {
	/* Creates a new light

	Description
	-----------
	Called when new light property comes over the websocket.

	Arguments
	---------
	INDIvp   : Object that contains all information about the indi property
	appendTo : HTML object to append the new HTML elements

	Returns
	-------
	vphtmldef  : HTML object that was just built
	vpselector : String selector for that object
	*/
	var vpselector = genvpselector(INDIvp);

	// If empty, build property and lights
	if(!document.querySelector(vpselector)) {
		console.debug(`Creating new light=${INDIvp.device}.${INDIvp.group}.${INDIvp.name}`);
		var vphtmldef = buildVector(INDIvp);
		
		vphtmldef = buildLights(INDIvp, vphtmldef);

		// Append to designated spot unless null then append to group
		if (appendTo) {
			appendTo.appendChild(vphtmldef);
		}
		else {
			var group = gengroupselector(INDIvp);
			document.querySelector(group).appendChild(vphtmldef);
		}
	}
	
	// Update values from indi
	INDIvp.values.forEach((lp) => {
		let lpselector = `label#${nosp(INDIvp.device)}__${nosp(lp.name)}.ILightlabel`;
		let light = document.querySelector(`${vpselector} ${lpselector}`);

		// Update the color of the light depending on indistate
		light.style.backgroundColor = indistate2css(lp.value);
	});

	// Update LED color on indistate
	updateLedState(INDIvp);

	return document.querySelector(vpselector);
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
- updateSwitches  : Updates the switches on the page
- formatNumber    : Formats incoming indi numbers
- nosp            : Replaces space with _
*/
const indistate2css = (INDIvp_state) => {
	/* Converts indi state to styling for alerts */
	var state = INDISTATES["Unknown"] // Default return
	if (INDISTATES.hasOwnProperty(INDIvp_state)) {
		state = INDISTATES[INDIvp_state];
	}
	else {
		console.warn(`${INDIvp_state} is not valid INDI state, should be ${Object.keys(INDISTATES)}`);
	}
	
	return state
}

const indisw2selector = (INDIvp_rule) => {
	/* Converts indi switches to selector type */
	var sw = "radio"; // Default return
	if (INDISWRULES.hasOwnProperty(INDIvp_rule)) {
		sw = INDISWRULES[INDIvp_rule];
	}
	else {
		console.warn(`${INDIvp_rule} is not valid INDI rule, should be ${Object.keys(INDISWRULES)}`);
	}

	return sw
}

const updateLedState = (INDIvp) => {
	/* Gets led and updates style depending on indistate */
	var vpselector = genvpselector(INDIvp);
	var led = document.querySelector(`${vpselector} .led`)
	led.style.backgroundColor = indistate2css(INDIvp.state);
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

const genvpselector = (INDIvp) => {
	/* Generates vp selector for text, light, switch, number */
	return `fieldset.INDI${INDIvp.metainfo}#${nosp(INDIvp.name)}[device="${INDIvp.device}"]`;
}

const gengroupselector = (INDIvp) => {
	/* Generates group selector */
	return `div.INDIgroup[group="${INDIvp.group}"]`;
}

const nosp = (str) => {
	/* Replaces spaces with _ */
	return str.replace(/ /g, '_');
}

const updateSwitches = (INDIvp) => {
	/* Goes through all updates all switches on page */
	var type = indisw2selector(INDIvp.rule)

	document.querySelectorAll(`input[type="${type}"]`).forEach((sw) => {
		let label = document.querySelector(`label[for="${sw.id}"]`);

		if (sw.checked) {
			label.classList.add("ui-state-active");
		}
		else {
			label.classList.remove("ui-state-active");
		}
	})
};

const hide = (nextSibling) => {
	/* Toggles hiding and showing all siblings */
	while (nextSibling) { // Returns null if no next sibling
		// Toggle the hide class
		nextSibling.classList.toggle("hide");
		nextSibling = nextSibling.nextElementSibling;
	}
	return;
}
