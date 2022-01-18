/* Globals */
var pyindi = null; // Selector for pyindi gui

/**
 * Contains all functions to build pyINDI interface and properties
 * @namespace
 */
const builder = {
	customGui: true,

	/**
	 * Initializes the devices passed in from Tornado application.
	 * @param {Array} devices List of devices supplied by Torando application.
	 */
	init(devices) {
		// Check if using custom gui
		if (UserConfig.CUSTOM_GUI) {
			console.log('Custom gui selected');
		}
		else {
			this.gui();
		}

		// If has asterisk, grab all devices
		if (devices.includes("*")) {
			console.log(`Requesting all devices`);
			setPropertyCallback('*.*', handleProperty, init=true);
		}
		else {
			console.log(`Found ${devices.length} devices`);
			for (let device of devices) {
				console.log(`Configuring device ${device}`);
				// Sets callback property for devices listed and init doesn't run first time through callback
				setPropertyCallback(`${device}.*`, handleProperty, init=true);
			}
		}

		return;
	},

	/**
	 * Builds the default GUI.
	 * @returns {HTMLDivElement} The default GUI.
	 */
	gui() {
		this.customGui = false;
		pyindi = document.createElement("div");
		pyindi.classList.add("pyindi");

		var nav = this.nav();
		var logger = this.logger();

		pyindi.appendChild(nav);
		pyindi.appendChild(logger);

		document.body.appendChild(pyindi);
		return pyindi;
	},

	/**
	 * Builds the logging window and logger.
	 * @returns {HTMLDivElement} The logging window.
	 */
	logger() {
		var div = document.createElement("div");
		div.classList.add("pyindi-log-viewer");

		// Store in object
		var logger = document.createElement("div");
		logger.id = "logger";
		logger.classList.add("pyindi-log-container");
		logging.logger = logger;

		// Make welcome message
		logging.log(UserConfig.LOGGING_WELCOME_MESSAGE);

		div.appendChild(logger);
		return div;
	},

	/**
	 * Builds a tooltip that expands when hovered on.
	 * @param {HTMLFieldSetElement} element The fieldset to attach to.
	 * @param {String} tip The string to display on hover.
	 * @returns {HTMLDivElement} The constructed tooltip.
	 */
	tooltip(element, tip) {
		var legend = element.childNodes[0];
		var div = document.createElement("div");
		var i = document.createElement("i");

		div.classList.add("pyindi-tooltip");
		div.setAttribute("data-title", tip);
		// Fontawesome classes and icon
		i.classList.add("fas", "fa-question-circle", "icon-tooltip");
		
		div.appendChild(i);
		legend.appendChild(div);

		return div;
	},

	/**
	 * Builds the default navbar.
	 * @returns {HTMLElement} A constructed navbar.
	 */
	nav() {
		var nav = document.createElement("nav");
		nav.classList.add("pyindi-nav");

		var div = document.createElement("div");
		div.classList.add("pyindi-row");

		// Create link to source code for users to file issues
		var link = document.createElement("a");
		link.classList.add("fab", "fa-github", "icon");
		link.href = "https://github.com/MMTObservatory/pyINDI";
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
	},

	/**
	 * Builds a device.
	 * @param {Object} indi Contains all information about INDI property.
	 * @returns {HTMLDivElement} The constructed device div.
	 */
	device(indi) {
		var div = document.createElement("div");
		div.setAttribute("data-device", indi.device);
		div.id = generateId.device(indi);
		div.classList.add("pyindi-device", "hidden"); // Add hidden to know state

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
				div.classList.add("hidden");
			}
			else {
				event.target.classList.add("fa-minus-circle");
				event.target.classList.remove("fa-plus-circle");
				div.classList.remove("hidden");
			}

			// Get first group in device and hide siblings
			let group = document.querySelector(`div.pyindi-group[data-group="${indi.group}"][data-device="${indi.device}"]`);
			utilities.hideSibling(group);
		})
		
		// Build label for device
		var p = document.createElement("p");

		p.classList.add("pyindi-h1");
		p.textContent = indi.device;

		// Append all
		header.appendChild(i);
		header.appendChild(p);
		div.appendChild(header);

		return div;
	},

	/**
	 * Builds the group element.
	 * @param {Object} indi Contains all information about INDI property.
	 * @returns {HTMLDivElement} The constructed group element.
	 */
	group(indi) {
		var div = document.createElement("div");

		div.setAttribute("data-device", indi.device);
		div.setAttribute("data-group", indi.group);
		div.id = generateId.group(indi);
		var parent = document.querySelector(`#${generateId.device(indi)}`);
	
		div.classList.add("pyindi-group");
		// If custom GUI don't do this but device has hidden class added for new groups
		if (!this.customGui && parent.classList.contains("hidden")) {
			div.classList.add("hide");
		}
	
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
			let vector = document.querySelector(`fieldset[data-group="${indi.group}"][data-device="${indi.device}"]`);
			utilities.hideSibling(vector);
	
		})
		
		// Build the title for group
		var p = document.createElement("p");
		p.textContent = indi.group;
		p.classList.add("pyindi-h2");
	
		// Append all
		header.appendChild(i);
		header.appendChild(p);
		div.appendChild(header);
	
		return div;
	},

	/**
	 * Handles incoming vector and properties.
	 * @param {String} vectorSelector The ID string of the vector.
	 * @param {Object} indi Contains all information about INDI property.
	 * @param {HTMLElement} appendTo The element to append the vector to.
	 */
	handle(vectorSelector, indi, appendTo) {
		if (!document.getElementById(vectorSelector)) {
			console.debug(`Creating new ${indi.metainfo}=${generateId.vector(indi)}`);
			var html = this.vector(indi);
	
			switch (indi.metainfo) {
				case "nvp":
					html = this.numbers(indi, html);
					break;
				case "svp":
					html = this.switches(indi, html);
					break;
				case "tvp":
					html = this.texts(indi, html);
					break;
				case "lvp":
					html = this.lights(indi, html);
					break;
				default:
					console.warn(`indi metainfo=${indi.metainfo} not recognized!`)
			}
	
			// Append to designated spot unless null then append to group
			if (appendTo) {
				appendTo.appendChild(html);
			}
			else {
				var group = `#${generateId.group(indi)}`;
				document.querySelector(group).appendChild(html);
			}
		}
	
		return;
	},

	/**
	 * Builds the vector fieldset and legend title.
	 * @param {Object} indi Contains all information about INDI property.
	 * @returns {HTMLFieldSetElement} Vector fieldset constructed.
	 */
	vector(indi) {
		var fieldset = document.createElement("fieldset");

		fieldset.classList.add("pyindi-vector");
		fieldset.id = generateId.vector(indi);
		fieldset.setAttribute("data-device", indi.device);
		fieldset.setAttribute("data-group", indi.group);
		fieldset.setAttribute("data-vector", indi.name);
	
		// Create legend for fieldset
		var legend = document.createElement("legend");
	
		// Create span led in legend for indistate
		var led = document.createElement("span");
		led.classList.add("led");
	
		// Create text node for legend to not overwrite the led span
		var text = document.createTextNode(indi.label);
	
		// Build fieldset by appending all
		legend.appendChild(led);
		legend.appendChild(text);
		fieldset.appendChild(legend);
	
		return fieldset;
	},

	/**
	 * Builds the text property
	 * @param {Object} indi Contains all information about INDI property.
	 * @param {HTMLElement} appendTo The element to append to.
	 * @returns {HTMLElement} The element appended to.
	 */
	texts(indi, appendTo) {
		indi.values.forEach((property) => {
			// Create div that the indi text row will exist
			var div = document.createElement("div");
			
			var id = generateId.property(indi, property);
			div.id = id;
			div.classList.add("fix-div", "pyindi-row");
	
			// Create label for indi text row
			var label = document.createElement("label");
			label.textContent = property.label;
			label.classList.add("pyindi-property-label", "pyindi-col");
			label.htmlFor = `${id}__input`;
	
			div.appendChild(label);
	
			// Build ro and wo
			var ro = document.createElement("label");
	
			ro.readOnly = true;
			ro.classList.add("pyindi-property", "pyindi-ro", "pyindi-col");
			ro.textContent = property.value;
	
			var wo = document.createElement("input");
			wo.classList.add("pyindi-property", "pyindi-wo", "pyindi-col");
			wo.id = `${id}__input`;
	
			// If "Enter" is pressed on writeonly area, send new text to indi
			wo.addEventListener("keyup", (event) => {
				if (event.key === "Enter") {
					event.preventDefault() // TODO Test if needed
					let value = event.target.value;
					setindi("Text", generateId.indiXml(indi), property.name, value);
				}
			});
	
			// Determine if it is readonly, writeonly, or both and append
			div = this.readWrite(indi.perm, div, ro, wo);
	
			// Append the div to the fieldset
			appendTo.appendChild(div);
	
		});
		return appendTo;
	},

	/**
	 * Builds the number property
	 * @param {Object} indi Contains all information about INDI property.
	 * @param {HTMLElement} appendTo The element to append to.
	 * @returns {HTMLElement} The element appended to.
	 */
	numbers(indi, appendTo) {
		indi.values.forEach((property) => {
			// Create div that the indi labal, ro, and wo will exist in
			var div = document.createElement("div");
	
			var id = generateId.property(indi, property);
			div.id = id;
			div.setAttribute("data-format", property.format);
	
			div.classList.add("fix-div", "pyindi-row");
	
			// Create label for indi text row
			var label = document.createElement("label");
			label.textContent = property.label;
			label.classList.add("pyindi-property-label", "pyindi-col");
			label.htmlFor = `${id}__input`;
	
			div.appendChild(label);
	
			// Build ro and wo
			var ro = document.createElement("label"); // Make textarea for no resize
			ro.textContent = property.value;
			ro.classList.add("pyindi-property", "pyindi-ro", "pyindi-col");
	
			var wo = document.createElement("input");
			wo.classList.add("pyindi-property", "pyindi-wo", "pyindi-col")
			wo.id = `${id}__input`;
			wo.defaultValue = 0;
	
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
			tip.id = `${id}__tip`;
			tip.classList.add("hide", "text-right", "tip");
	
			wo.addEventListener("blur", (event) => {
				wo.value.length == 0 ? wo.value = 0 : ""; // Fill in 0 if empty
			})
			// If "Enter" is pressed on writeonly area, send new text to indi
			wo.addEventListener("keyup", (event) => {
				if (event.key === "Enter") {
					// Test if ok
					let min = parseFloat(wo.getAttribute("data-min"));
					let max = parseFloat(wo.getAttribute("data-max"));
					let value = event.target.value;
					if (value < min || value > max) { // Even if min/max null will be false
						// Add invalid class
						wo.classList.add("invalid");
						tip.classList.remove("hide");
					}
					else {
						wo.classList.remove("invalid");
						tip.classList.add("hide")
						setindi("Number", generateId.indiXml(indi), property.name, value);
					}
				}
			});
	
			// Determine if it is readonly, writeonly, or both and append
			div = this.readWrite(indi.perm, div, ro, wo);
			
	
			// Append the tip to div and div to the fieldset
			div.appendChild(tip);
			appendTo.appendChild(div);
	
		});
		return appendTo;
	},

	/**
	 * Builds the switch property
	 * @param {Object} indi Contains all information about INDI property.
	 * @param {HTMLElement} appendTo The element to append to.
	 * @returns {HTMLElement} The element appended to.
	 */
	switches(indi, appendTo) {
		var type = converter.indiSwitchToSelector(indi.rule);

		indi.values.forEach((property) => {
			var span = document.createElement("span");
			var id = generateId.property(indi, property);
	
			// Create label for button text
			var label = document.createElement("label")
			label.classList.add("pyindi-switch-label");
			label.htmlFor = id;
			label.textContent = property.label
	
			// Create button
			var input = document.createElement("input");
			input.type = type;
			input.id = id;
			input.name = utilities.noSpecialCharacters(indi.name);
	
			input.classList.add("pyindi-switch-input");
			input.value = utilities.noSpecialCharacters(property.name);
	
			input.checked = property.value === "On" ? true : false;
			
			// Create event listeners for input button
			input.addEventListener("change", (event) => {
				let name = event.target.value
				let value = event.target.checked ? "On" : "Off"
				setindi("Switch", generateId.indiXml(indi), name, value);
			})
			
			// Append all
			span.appendChild(input);
			span.appendChild(label);
			appendTo.appendChild(span);
		})
	
		return appendTo;
	},

	/**
	 * Builds the light property
	 * @param {Object} indi Contains all information about INDI property.
	 * @param {HTMLElement} appendTo The element to append to.
	 * @returns {HTMLElement} The element appended to.
	 */
	lights(indi, appendTo) {
		indi.values.forEach((property) => {
			var span = document.createElement("span"); // To store each light in
			var id = generateId.property(indi, property);
			var label = document.createElement("label");
	
			label.classList.add("pyindi-light-label");
			label.id = id;
			label.textContent = property.label;
			label.style.backgroundColor = converter.indiToCss(property.value);
	
			// Append all
			span.appendChild(label)
			appendTo.appendChild(span);
		});
	
		return appendTo;
	},

	/**
	 * Determines if element is read only, write only, or read and write and
	 * appends element.
	 * @param {String} indiPermission The INDI permission "ro", "wo", or "rw".
	 * @param {HTMLElement} appendTo The element to append to.
	 * @param {HTMLElement} ro The read only element.
	 * @param {HTMLElement} wo The write only elemenet.
	 * @returns {HTMLElement} The element appended to.
	 */
	readWrite(indiPermission, appendTo, ro, wo) {
		switch (indiPermission) {
			case IndiPermissions.READ_ONLY:
				appendTo.appendChild(ro);
				break;
			case IndiPermissions.READ_WRITE_ONLY:
				appendTo.appendChild(ro);
				appendTo.appendChild(wo);
				break;
			case IndiPermissions.WRITE_ONLY:
				appendTo.appendChild(wo);
				break;
			default:
		}
	
		return appendTo;
	},
};

/**
 * Handles updates from incoming xml indi data. Either calls the builder
 * methods if property doesn't have an html element or updates the html
 * element with new data.
 * @namespace
 */
const updater = {
	available: {},

	/**
	 * Updates what indi properties are available or to be omitted.
	 * @param {Object} indi Contains all information about INDI property. 
	 * @param {Boolean=} omit If true, add flag to omit this property.
	 */
	setAvailable(indi, omit = false) {
		var identifier = `${indi.device}.${indi.name}`;
		this.available[identifier] = omit ? false : true;

		return;
	},

	/**
	 * Returns if the property is valid and available.
	 * @param {Object} indi Contains all information about INDI property.
	 * @returns {Boolean} True if property is available, false if not.
	 */
	isAvailable(indi) {
		return this.available[`${indi.device}.${indi.name}`];
	},

	/**
	 * Updates the device html properties. If doesn't exist, build.
	 * @param {Object} indi Contains all information about INDI property.
	 * @param {HTMLElement=} appendTo Element to append to.
	 * @returns {HTMLElement} The element that was updated.
	 */
	device(indi, appendTo = null) {
		var deviceSelector = generateId.device(indi);

		// If vpselector is empty, build
		if (!document.querySelector(`#${deviceSelector}`)) {
			console.debug(`Creating new device=${indi.device}`);

			// Doesn't exist, build the section and add attributes and classes
			var html = builder.device(indi);

			// Append to specified or to the pyindi gui
			appendTo ? appendTo.appendChild(html) : pyindi.appendChild(html);
		}

		return document.getElementById(deviceSelector);
	},

	/**
	 * Updates the group html properties. If doesn't exist, build.
	 * @param {Object} indi Contains all information about INDI property.
	 * @param {HTMLElement=} appendTo Element to append to.
	 * @returns {HTMLElement} The element that was updated.
	 */
	group(indi, appendTo = null) {
		var groupSelector = generateId.group(indi);

		// If vpselector is empty, build
		if (!document.querySelector(`#${groupSelector}`)) {
			console.debug(`Creating new group=${indi.device}-${indi.group}`);
	
			// Doesn't exists, build and add attributes and classes
			var html = builder.group(indi);
	
			if (appendTo != null) {
				appendTo.appendChild(html);
			}
			else {
				// Append to the parent section
				var parentSelector = generateId.device(indi);
				document.querySelector(`#${parentSelector}`).appendChild(html);
			}
		}
		
		return document.getElementById(groupSelector);
	},

	/**
	 * Handles indi payload from getProperties.
	 * @param {Object} indi Contains all information about INDI property.
	 */
	handle(indi) {
		var device = this.device(indi);
		var group = this.group(indi);

		// Update available
		this.setAvailable(indi);

		return;
	},

	/**
	 * Updates the vector html properties. If doesn't exist, build. Then passes
	 * to appropriate property type.
	 * @param {Object} indi Contains all information about INDI property.
	 * @param {HTMLElement=} appendTo Element to append to.
	 * @returns {HTMLElement} The element that was updated.
	 */
	vector(indi, appendTo = null) {
		// If no property exists on GUI, skip
		if (!this.isAvailable(indi)) {
			return;
		}

		var vector;
		switch (indi.metainfo) {
			case "nvp":
				vector = this.numbers(indi, appendTo);
				break;
			case "svp":
				vector = this.switches(indi, appendTo);
				break;
			case "tvp":
				vector = this.texts(indi, appendTo);
				break;
			case "lvp":
				vector = this.lights(indi, appendTo);
				break;
			default:
		}

		return vector;
	},

	/**
	 * Updates the text html properties. If doesn't exist, build.
	 * @param {Object} indi Contains all information about INDI property.
	 * @param {HTMLElement=} appendTo Element to append to.
	 * @returns {HTMLElement} The element that was updated.
	 */
	texts(indi, appendTo = null) {
		var vectorSelector = generateId.vector(indi);	
		builder.handle(vectorSelector, indi, appendTo);
		
		// Update values from indi
		indi.values.forEach((property) => {
			var propertySelector = generateId.property(indi, property);
			var parent = document.querySelector(`#${propertySelector}`);
			var ro = document.querySelector(`#${propertySelector} .pyindi-ro`);
	
			// Handle case if wo only, then ro will not exist
			if (ro) {
				// Handle null content
				ro.textContent = utilities.isNull(property.value) ? "" : property.value
			}
		})
	
		// Update LED color on indistate
		this.led(indi);
	
		return document.getElementById(vectorSelector);
	},

	/**
	 * Updates the number html properties. If doesn't exist, build.
	 * @param {Object} indi Contains all information about INDI property.
	 * @param {HTMLElement=} appendTo Element to append to.
	 * @returns {HTMLElement} The element that was updated.
	 */
	numbers(indi, appendTo = null) {
		var vectorSelector = generateId.vector(indi);
		builder.handle(vectorSelector, indi, appendTo);
		
		// Update values from indi
		indi.values.forEach((property) => {
			var propertySelector = generateId.property(indi, property);
			var parent = document.querySelector(`#${propertySelector}`);
			var ro = document.querySelector(`#${propertySelector} .pyindi-ro`);
	
			// Handle case if wo only, then ro will not exist
			if (ro) {
				var format = parent.getAttribute("data-format");
				var value = utilities.formatNumber(property.value, format);
	
				ro.textContent = value;
			}
		})
	
		// Update LED color on indistate
		this.led(indi);
	
		return document.getElementById(vectorSelector)
	},

	/**
	 * Updates the switch html properties. If doesn't exist, build.
	 * @param {Object} indi Contains all information about INDI property.
	 * @param {HTMLElement=} appendTo Element to append to.
	 * @returns {HTMLElement} The element that was updated.
	 */
	switches(indi, appendTo = null) {
		var vectorSelector = generateId.vector(indi);
		builder.handle(vectorSelector, indi, appendTo);

		// Update values from indi
		indi.values.forEach((property) => {
			var propertySelector = generateId.property(indi, property);

			let sw = document.querySelector(`#${propertySelector}`);
			let label = document.querySelector(`label[for="${sw.id}"]`);

			// Update the color of the switch depending on checked
			var active = "pyindi-switch-label-active";
			sw.checked = property.value === "On" ? true : false;

			sw.checked ? label.classList.add(active) : label.classList.remove(active);
		});

		// Update LED color on indistate
		this.led(indi);

		return document.getElementById(vectorSelector);
	},

	/**
	 * Updates the light html properties. If doesn't exist, build.
	 * @param {Object} indi Contains all information about INDI property.
	 * @param {HTMLElement=} appendTo Element to append to.
	 * @returns {HTMLElement} The element that was updated.
	 */
	lights(indi, appendTo = null) {
		var vectorSelector = generateId.vector(indi);
		builder.handle(vectorSelector, indi, appendTo);
		
		// Update values from indi
		indi.values.forEach((property) => {
			var propertySelector = generateId.property(indi, property);
			var light = document.querySelector(`#${propertySelector}`);
	
			// Update the color of the light depending on indistate
			var colors = converter.indiToCss(property.value);
			light.style.backgroundColor = colors["background-color"]
			light.style.color = colors["color"]
	
			// Assign class for blinking if enabled
			if (UserConfig.BLINKING_BUSY_ALERT_LIGHTS) {
				let blink = converter.indiToBlink(property.value);
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
		this.led(indi);
	
		return document.getElementById(vectorSelector);
	},

	/**
	 * Updates led with the corresponding INDI state.
	 * @param {Object} indi Contains all information about INDI property.
	 */
	led(indi) {
		var vectorSelector = generateId.vector(indi);
		var led = document.querySelector(`#${vectorSelector} .led`)
		led.style.backgroundColor = converter.indiToCss(indi.state)["background-color"];

		return;
	},

	/**
	 * Builds the custom GUI, looks for element to append to with device and vector.
	 * @param {Object} indi Contains all information about INDI property.
	 * @returns {(HTMLElement|undefined)} Returns element if exists, or undefined.
	 */
	custom(indi) {
		// Get the element to build the vector in.
		var deviceSelector = `[data-custom-device="${indi.device}"]`;
		var vectorSelector = `[data-custom-vector="${indi.name}"]`;

		var appendToSelector = `${deviceSelector}${vectorSelector}`; 
		var appendTo = document.querySelector(`${appendToSelector}`);

		// If it doesn't exist, return undefined.
		if (!appendTo) {
			console.debug(`Skipping ${indi.device}.${indi.group}.${indi.name}`);
			updater.setAvailable(indi, omit=true);
			return;
		}

		// Add to available properties and return the vector.
		updater.setAvailable(indi);
		var vector = updater.vector(indi, appendTo);

		return vector;
	}
};

/**
 * Contains methods to convert from a state to another.
 * @namespace
 */
const converter = {
	/**
	 * Converts INDI state to a CSS color styling.
	 * @param {String} indiState The current INDI state.
	 * @returns {Object} Styling to apply. 
	 */
	indiToCss(indiState) {
		var state = IndiStates["Unknown"] // Default return.
		if (IndiStates.hasOwnProperty(indiState)) {
			state = IndiStates[indiState];
		}
		else {
			console.warn(`${indiState} is not valid INDI state, should be ${Object.keys(IndiStates)}`);
		}
		
		return state
	},

	/**
	 * Converts INDI state to blinking state for emergency.
	 * @param {Object} indiState The current INDI state.
	 * @returns {String} The styling to apply.
	 */
	indiToBlink(indiState) {
		var blink = null;
		if (IndiBlinks.hasOwnProperty(indiState)) {
			blink = IndiBlinks[indiState];
		}

		return blink
	},

	/**
	 * Converts switch to html element.
	 * @param {String} indiRule INDI rule to apply to switch.
	 * @returns {String} String describing the switch type, radio or checkbox.
	 */
	indiSwitchToSelector(indiRule) {
		var sw = "radio"; // Default return

		if (IndiSwitchRules.hasOwnProperty(indiRule)) {
			sw = IndiSwitchRules[indiRule];
		}
		else {
			console.warn(`${indiRule} is not valid INDI rule, should be ${Object.keys(IndiSwitchRules)}`);
		}

		return sw
	},
};


/**
 * Generate ID's using the INDI payload. Use these to make selecting by ID easier.
 * Sometimes groups and vectors have the same name which causes a collision in the
 * ids. I bypassed this by using a "-" between group and devices and a "__"
 * between vectors and their properties.
 * @namespace
 */
const generateId = {
	/**
	 * Generates device ID with no special characters or spaces.
	 * @param {Object} indi Contains all information about INDI property.
	 * @returns {String} Device name without special characters or spaces.
	 */
	device(indi) {
		return utilities.noSpecialCharacters(indi.device);
	},

	/**
	 * Generates group ID with no special characters or spaces.
	 * @param {Object} indi Contains all information about INDI property.
	 * @returns {String} Group name without special characters or spaces.
	 */
	group(indi) {
		return `${this.device(indi)}-${utilities.noSpecialCharacters(indi.group)}`;
	},

	/**
	 * Generates vector ID with no special characters or spaces.
	 * @param {Object} indi Contains all information about INDI property.
	 * @returns {String} Vector name without special characters or spaces.
	 */
	vector(indi) {
		return `${this.device(indi)}__${utilities.noSpecialCharacters(indi.name)}`;
	},

	/**
	 * Generates property ID with no special characters or spaces.
	 * @param {Object} indi Contains all information about INDI property.
	 * @param {Object} prop Contains all information about specific property.
	 * @returns {String} Property name without special characters or spaces.
	 */
	property(indi, prop) {
		return `${this.vector(indi)}__${utilities.noSpecialCharacters(prop.name)}`;
	},

	/**
	 * Generates XML INDI with no special characters or spaces.
	 * @param {Object} indi Contains all information about INDI property.
	 * @returns {String} Device name without special characters or spaces.
	 */
	indiXml(indi) {
		return `${indi.device}.${indi.name}`;
	}
};

/**
 * Contains utility methods.
 * @namespace
 */
const utilities = {
	/**
	 * Swaps the spaces in a string with "_"
	 * @param {String} str The string to remove spaces.
	 * @returns {String} The string with spaces swapped with "_".
	 */
	noSpaces(str) {
		return str.replace(/ /g, '_');
	},
	
	/**
	 * Swaps spaces with "_" and removes special charactors.
	 * @param {String} str The string to remove special characters and spaces.
	 * @returns {String} The string with spaces and special characters removed.
	 */
	noSpecialCharacters(str) {
		return this.noSpaces(str).replace(/[&\/\\#,+()$~%.'":*?<>{}]/g, '');
	},

	/**
	 * Toggles "hide" class to sibling.
	 * @param {HTMLElement} nextSibling Element to hide all siblings for.
	 */
	hideSibling(nextSibling) {
		/* Toggles hiding and showing all siblings */
		while (nextSibling) { // Returns null if no next sibling
			// Toggle the hide class
			nextSibling.classList.toggle("hide");
			nextSibling = nextSibling.nextElementSibling;
		}
		return;
	},

	/**
	 * Checks value if null or undefined. Returns true if so.
	 * @param {*} value What to check.
	 * @returns {Boolean} Returns true if null or undefined, else returns false.
	 */
	isNull(value) {
		return (value === undefined || value === null);
	},

	/**
	 * Formats the number string with INDI provided formatter.
	 * @param {String} numStr The number to format.
	 * @param {String} formatStr The INDI formatter.
	 * @returns {String} The formatted number.
	 */
	formatNumber(numStr, formatStr) {
		num = parseFloat(numStr);
		var outStr;
		var decimal = parseInt(formatStr.slice(0, formatStr.length - 1).split('.')[1]);
		switch (formatStr[formatStr.length - 1]) {
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
};

/**
 * Logging methods and objects.
 * @namespace
 */
const logging = {
	logger: null, // Logger element to append messages in

	/**
	 * Log INDI messages to the log window on the GUI. Scrolls to newest message
	 * so newest messages are at the bottom and scrolled to.
	 * @param {String} message Message to log.
	 * @param {String} timestamp The time the message was received.
	 * @param {String} device The device name.
	 */
	log(message, timestamp = "", device = "") {
		if (!this.logger) {
			console.warn("Logger not initialized.")
		}
		// Build log message
		var p = document.createElement("p");
  
		p.classList.add("pyindi-log");
		var loggerHeight = this.logger.scrollHeight;

		// https://stackoverflow.com/questions/25505778/automatically-scroll-down-chat-div
		var isScrolledToBottom = this.logger.scrollHeight - this.logger.clientHeight <= this.logger.scrollTop + 1;

		p.textContent = `${timestamp} ${device} ${message}`
		this.logger.appendChild(p);
		if (isScrolledToBottom) {
			this.logger.scrollTo(0, loggerHeight,);
		}

		return 
	}
};
