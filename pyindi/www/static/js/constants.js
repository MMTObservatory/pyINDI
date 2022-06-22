/**
 * Supported INDI permissions
 * @enum {String}
 */
 const IndiPermissions = {
	READ_ONLY: "ro",
	WRITE_ONLY: "wo",
	READ_WRITE_ONLY: "rw",
}
/**
 * INDI state colors and stying.
 * @enum {Object}
 */
const IndiStates = {
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
/**
 * INDI blinking rules for styling.
 * @enum {String}
 */
const IndiBlinks = {
	"Idle" : null,
	"Ok": null,
	"Busy": "blinking-busy",
	"Alert": "blinking-alert",
	"Unknown": null
}
/**
 * Supported INDI switch rules.
 * @enum {String}
 */
const IndiSwitchRules = {
	"OneOfMany": "radio",
	"AtMostOne": "radio",
	"AnyOfMany": "checkbox",
}
/**
 * Indi incoming xml types.
 * @enum
 */
const IndiOp = {
	DEFINITION: "def",
	SET: "set",
	NEW: "new",
	GET: "get",
  DELETE: "del",
  MESSAGE: "mes",
}

/* Constants */
/**
 * pyINDI xml types to parse.
 * @enum {String}
 */
const ApprovedOp = [
  "set",
  "def",
]
/**
 * pyINDI approved properties.
 * @enum {String}
 */
const ApprovedTypes = [
  "Number",
  "Text",
  "Switch",
  "Light",
  "BLOB"
]

/**
 * pyINDI approved xml tags.
 * @enum {String}
 *
*/
const ApprovedTags = [
	"delProperty",
  "message"
]
/**
 * XML Parsing configuration
 * @enum {Regex}
 */
const XmlRegex = {
  XML_START: /<*\S*(Vector|delProperty|message)/, // Get groups and vectors
}
/**
 * Default configuration for backup.
 * @enum
 */
 const Config = {
	CUSTOM_GUI: false, //If true, using custom GUI layout and will not build default
  BLINKING_BUSY_ALERT_LIGHTS: false, // If true, INDI states "busy" and "alert" blink
  LOGGING_WELCOME_MESSAGE: "INDI messages & logs displayed below", // Message to display at start of log
  INDI_CONSOLE_DEBUG: false, // Prints INDI mesages to the console
  READONLY_PORT: 8081, // setindi() is muted when on this port
  WS_PAGE: "/indi/websocket", // Websocket url
  WS_SEND_WAIT: 30, // Millaseconds, how long to wait to resend
  WS_RETRY: 1000, // Millaseconds, how long to wait to reconnect
}

