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
	"AnyofMany": "checkbox"
}

const CONFIG ={
	NUM_SIZE:null,
	SHOW_SWITCH_ICON:null
}

/* Builders

Description
--------
These functions are responsible for building the html elements
and assigning data attributes, classes, and ids. They return
the element that was built.

Every new INDI group requires a fieldset and each INDI device
requires a new section. 

Functions
---------
- buildDevice   : builds section to hold new INDI device
- buildGroup    : builds group to hold new INDI group
- buildProperty : builds fieldset to hold new INDI group data
- buildNumbers  : builds INDI number when new number is received
- buildTexts    : builds INDI text when new text is received
*/
const buildGroup = (INDIvp) => {
	/* Builds the default div for a new INDI group */
	var div = document.createElement("div");

	div.setAttribute("device", INDIvp.device);
	div.id = nosp(INDIvp.group).toUpperCase();
	div.setAttribute("group", INDIvp.group);
	div.classList.add("INDIgroup");

	// Build the title for group
	var p = document.createElement("p");

	p.textContent = INDIvp.group;
	p.classList.add("IGroup_header");

	// TODO Add min/max button toggle to hide group

	// Append all
	div.appendChild(p);

	return div;
};

const buildDevice = (INDIvp) => {
	/* Builds the default section for new device */
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

const buildProperty = (INDIvp) => {
	/* Builds the default fieldset for indi vector property. Returns new fieldset*/
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

const buildNumbers = (INDIvp, vphtmldef) => {
	/* Builds the new indi number */
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

const buildLights = (INDIvp, appendTo) => {
	/* Builds the new INDI light */
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

const buildSwitches = (INDIvp, appendTo) => {
	/* Builds the new INDI switch */
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
		input.checked && label.classList.add("ui-state-active");
		
		// Create event listeners for input button
		input.addEventListener("change", (event) => {
			let name = event.target.value
			let value = event.target.checked ? "On" : "Off"
			setindi("Switch", `${INDIvp.device}.${INDIvp.name}`, name, value);
		})
		
		// Append all
		span.appendChild(label);
		span.appendChild(input);
		appendTo.appendChild(span);
	})

	return appendTo;
};

const buildTexts = (INDIvp, vphtmldef) => {
	/* Builds the new indi text */
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






/***********************************************************
* newText 
* Args INDIvp-> object defining the INDI vector propert, 
*		appendTo -> jquery selector for which element to 
*		append the INDivp turned HTML element to.
*
* Desription:
*	Called when the websocket from the indi webclient
*	generates or updates an INDI text. If this a 
*	a never brefore seen INDI text HTML fieldset
*	element is created with the correct value otherwise
*	the element's text is updated. 
*
*
* Returns: a jquery type selector string. 
*
*********************************************************/
const newText = (INDIvp, appendTo) => {
	/* Creates a new text */
	var vpselector = `fieldset.INDItvp#${nosp(INDIvp.name)}[device="${INDIvp.device}"]`;
	
	// If the vpselector is empty, build
	if (!document.querySelector(vpselector)) {
		var vphtmldef = buildProperty(INDIvp);
		vphtmldef = buildTexts(INDIvp, vphtmldef);

		// Need to figure out how to replace jquery selector for the fieldset
		if (appendTo != undefined) {
			$(vphtmldef).appendTo(appendTo); // TODO Remove jquery
		}

		return $(vphtmldef); // TODO Remove jquery
	}
	
	// Update values from indi
	INDIvp.values.forEach((tp) => {
		var tpselector = `div.IText_div[INDIname="${tp.name}"] textarea.IText_ro`;
		var ro = document.querySelector(`${vpselector} ${tpselector}`);

		ro.textContent = tp.value;
	})

	return vpselector 
}

/***********************************************************
* newNumber 
* Args INDIvp-> object defining the INDI vector propert, 
*		appendTo -> jquery selector for which elemebt to 
*		append the INDivp turned HTML element to.
*
* Desription:
*	Called when the websocket from the indi webclient
*	generates or updates an INDI number. If this a 
*	a never brefore seen INDI number, an HTML fieldset
*	element is created with the correct value otherwise
*	the element's number is updated. 
*
*
* Returns: a jquery type selector string. 
*
*********************************************************/

function newNumber(INDIvp, appendTo) {
	/*  */
	var vpselector = `fieldset.INDInvp#${nosp(INDIvp.name)}[device="${INDIvp.device}"]`;

	// If the vpselector is empty, build
	if (!document.querySelector(vpselector)) {
		var vphtmldef = buildProperty(INDIvp);
		vphtmldef = buildNumbers(INDIvp, vphtmldef);
		
		if(appendTo != undefined)
		{
			$(vphtmldef).appendTo(appendTo); // TODO Remove jquery
		}
		return $(vphtmldef) // TODO Remove jquery
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

	// Return string since already exists
	return vpselector
}
/*end newNumber*/




/***********************************************************
* newSwitch 
* Args INDIvp-> object defining the INDI vector propert, 
*		appendTo -> jquery selector for which elemebt to 
*		append the INDivp turned HTML element to.
*
* Desription:
*	Called when the websocket from the indi webclient
*	generates or updates an INDI switch. If this a 
*	a never brefore seen INDI switch HTML fieldset
*	element is created with the correct value otherwise
*	the element's switch is updated. 
*
*
* Returns: a jquery type selector string. 
*
*********************************************************/
const newSwitch = (INDIvp, appendTo=null) => {
	/* Builds new indi switches */
	var vpselector = `fieldset.INDIsvp#${nosp(INDIvp.name)}[device="${INDIvp.device}"]`;
	
	// If empty, build property and switches
	if (!document.querySelector(vpselector)) {
		var vphtmldef = buildProperty(INDIvp);
		vphtmldef = buildSwitches(INDIvp, vphtmldef);
		
		if (appendTo != null) {
			appendTo.appendChild(vphtmldef);
		}

		return $(vphtmldef);  // TODO remove jquery
	}

	// Update values from indi
	INDIvp.values.forEach((sp) => {
		var spselector = `${nosp(INDIvp.device)}__${nosp(INDIvp.name)}__${nosp(sp.name)}`;

		let sw = document.querySelector(`input.ISwitchinput#${spselector}`);
		let label = document.querySelector(`label[for="${sw.id}"]`);

		// Update the color of the switch depending on checked
		let active = "ui-state-active";
		sw.checked ? label.classList.add(active) : label.classList.remove(active);
	});

	return vpselector;
}

/*********************************************************
* newGroup
* Args INDIvp-> object defining the INDI vector propert,
*       appendTo -> jquery selector for which element to
*       append the INDivp turned HTML element to.
*
* Desription:
*   
*
*
* Returns:
*
*********************************************************/
const newGroup = (INDIvp, appendTo=null) => {
	/* Creates a new indi group */
	var vpselector = `div.INDIgroup[group="${INDIvp.group}"]`;

	// If vpselector is empty, build
	if (!document.querySelector(vpselector)) {
		console.debug(`Creating new group: ${INDIvp.group}`);

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
	else {
		console.debug(`Group already exists: ${INDIvp.group}`);
		return $(vpselector); // TODO remove jquery
	}
};

const newDevice = (INDIvp, appendTo=null) => {
	/* Creates a new indi device */
	var vpselector = `section.INDIdevice[device="${INDIvp.device}"]`;

	// If vpselector is empty, build
	if (!document.querySelector(vpselector)) {
		console.debug(`Creating new device: ${INDIvp.device}`);

		// Doesn't exist, build the section and add attributes and classes
		var vphtmldef = buildDevice(INDIvp);

		// Append to specified or to the body
		if (appendTo != null) {
			appendTo.appendChild(vphtmldef);
		}
		else {
			document.body.appendChild(vphtmldef);
		}

		return vphtmldef;
	}
	else {
		console.debug(`Device already exists: ${INDIvp.device}`)

		return $(vpselector);  // TODO Remove jquery
	}
}
/*********************************************************
* newLight
* Args INDIvp-> object defining the INDI vector propert, 
*       appendTo -> jquery selector for which element to 
*       append the INDivp turned HTML element to.
*
* Desription:
*   Called when the websocket from the indi webclient
*   generates or updates an INDI switch. If this a 
*   a never brefore seen INDI switch HTML fieldset
*   element is created with the correct value otherwise
*   the element's switch is updated. 
*
*
* Returns: a jquery type selector string. 
*
*********************************************************/
const newLight = (INDIvp, appendTo=null) => {
	/* Creates a new light */
	var vpselector = `fieldset.INDIlvp#${nosp(INDIvp.name)}[device="${INDIvp.device}"]`;

	// If empty, build property and lights
	if(!document.querySelector(vpselector)) {
		var vphtmldef = buildProperty(INDIvp);
		
		vphtmldef = buildLights(INDIvp, vphtmldef);

		if (appendTo != null) {
			appendTo.appendChild(vphtmldef);	
		}

		return $(vphtmldef); // TODO remove jquery
	}
	
	// Update values from indi
	INDIvp.values.forEach((lp) => {
		let lpselector = `label#${nosp(INDIvp.device)}__${nosp(lp.name)}.ILightlabel`;
		let light = document.querySelector(`${vpselector} ${lpselector}`);

		// Update the color of the light depending on indistate
		light.style.backgroundColor = indistate2css(lp.value);
	});

	return vpselector;
}  

/* INDI Utilities

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
- nospperiod      : Replaces space with _ and period with __
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


/*********************
* formatNumber
* Args: numStr=>the number as a string
*		fStr=> the INDI format string
*
* Description:
*		Format the floating point INDI numbers
* but don't mess with the sexagesimal
* stuff. weh shall let the INDI client
* do that. In fact we should probably
* let the client do the floating point stuff
* too.
*
**********************/
const formatNumber = (numStr, fStr) => {
	num = parseFloat(numStr);
	console.debug(`[formatNumber] numStr=${numStr} fStr=${fStr}`)
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

const nosp = (str) => {
	// Replaces spaces with _ and . with __
	return str.replace(/ /g, '_');
}

const nospperiod = (str) => {
	return nosp(str).replace('.', '__');
}
