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
			if (Config.BLINKING_BUSY_ALERT_LIGHTS) {
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
	},
	/**
	 * Handles the delProperty tag.
	 * @param {String} device name of indi device.
	 * @param {String} name name of indi property.
	 *
	 */
	delete(indi) {
		var selector;
    if (builder.customGui) {
      var deviceSelector = `[data-custom-device="${device}"]`;
 		  var vectorSelector = `[data-custom-vector="${name}"]`;
 		  selector = `${deviceSelector}${vectorSelector}`;
 		}
    // Select using ID
 		else {
 		  selector = `#${generateId.vector(indi)}`;
		}

		var vector = document.querySelector(`${selector}`);
		if (vector) {
			vector.classList.add('pyindi-deleted');
	  }

    return vector;
  }
};
