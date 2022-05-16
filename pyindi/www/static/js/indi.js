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

/**
 * Handles incoming indi objects depending on indi operation such as set,
 * definition, etc.. Can determine to use custom gui or not. Check the return
 * value to see if selector was valid.
 * @param {Object} indi Contains all indi information of property
 * @returns
 */
const handle = (indi) => {
  var htmlElement;

  if (indi.op === IndiOp.DEFINITION) {
    // Handle a custom GUI
    if (builder.customGui) {
      htmlElement = updater.custom(indi);
      // If couldn't locate custom GUI, exit
      if (!htmlElement) {
        return;
      }
    }
    // Handle normally
    else {
      updater.handle(indi);
    }
    // During a definition, still need to update the vector values
    htmlElement = updater.vector(indi);
  }
  // Only update values if set
  else if (indi.op == IndiOp.SET) {
    htmlElement = updater.vector(indi);
  }
  // TODO DELETE etc.

  return htmlElement;
}

