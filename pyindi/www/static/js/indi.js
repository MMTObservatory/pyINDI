/* Globals */
var pyindi = null; // Selector for pyindi gui

/**
 * Initializes the devices passed in from Tornado application.
 * @param {Array} devices List of devices supplied by Torando application.
 */
const initialize = (devices, customGui=true) => {
	if (customGui) {
		console.log("Custom GUI selected")
	}
	else {
		builder.gui();
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
}

