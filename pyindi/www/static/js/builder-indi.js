/**
 * Contains all functions to build pyINDI interface and properties
 * @namespace
 */
 const builder = {
	customGui: true,

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
		logging.log(Config.LOGGING_WELCOME_MESSAGE);

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
    // Check if tooltip already exists
		var legend = element.childNodes[0];
    if (legend.querySelector(".pyindi-tooltip")) {
      return;
    }
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
		div.classList.add("row");

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
			navItem.classList.add("col", "pyindi-h4")
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
		else {
			// If we get here and the item has been deleted previously
			// we should undelete by removing the class.
			var vector = document.getElementById(vectorSelector);
			vector.classList.remove("pyindi-deleted");
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
		led.classList.add("pyindi-led");

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
			div.classList.add("fix-div", "row");

			// Create label for indi text row
			var label = document.createElement("label");
			label.textContent = property.label;
			label.classList.add("pyindi-property-label", "col");
			label.htmlFor = `${id}__input`;

			div.appendChild(label);

			// Build ro and wo
			var ro = document.createElement("label");

			ro.readOnly = true;
			ro.classList.add("pyindi-property", "pyindi-ro", "col");
			ro.textContent = property.value;

			var wo = document.createElement("input");
			wo.classList.add("pyindi-property", "pyindi-wo", "col");
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

			div.classList.add("fix-div", "row");

			// Create label for indi text row
			var label = document.createElement("label");
			label.textContent = property.label;
			label.classList.add("pyindi-property-label", "col");
			label.htmlFor = `${id}__input`;

			div.appendChild(label);

			// Build ro and wo
			var ro = document.createElement("label"); // Make textarea for no resize
			ro.textContent = property.value;
			ro.classList.add("pyindi-property", "pyindi-ro", "col");

			var wo = document.createElement("input");
			wo.classList.add("pyindi-property", "pyindi-wo", "col")
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
