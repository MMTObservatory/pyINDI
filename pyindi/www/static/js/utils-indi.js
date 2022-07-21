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
	},

	/**
	 * Given an input, returs the parent fieldset vector
	 * @param {HTMLElement} ele The number to format.
	 * @returns {HTMLElement} THe parent fieldset vector
	 */
	parentVectorIsDeleted(ele) {
		while (!ele.classList.contains("pyindi-vector")) {
			ele = ele.parentElement
		}
		return ele.classList.contains("pyindi-deleted")
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

if (typeof module !== "undefined" && typeof module.exports !== "undefined") {
  module.exports = { generateId, utilities, converter };
}
