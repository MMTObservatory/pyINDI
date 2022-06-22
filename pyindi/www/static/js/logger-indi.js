/**
 * Logging methods and objects.
 * @namespace
 */
 const logging = {
	logger: null, // Logger element to append messages in
	is_warned: false, // Display warning message once

	/**
	 * Log INDI messages to the log window on the GUI. Scrolls to newest message
	 * so newest messages are at the bottom and scrolled to.
	 * @param {String} message Message to log.
	 * @param {String} timestamp The time the message was received.
	 * @param {String} device The device name.
	 */
	log(message, timestamp = "", device = "") {
    // If logger doesn't exist, try to find on page with default ID "logger"
		if (!this.logger) {
      // Try to connect to logger once and issue warning if cannot
			if (!this.is_warned) {
        let found_logger = document.getElementById("logger");
        let msg = "Logger not found, create a div with id \"logger\""
        !found_logger ? console.warn(msg) : this.logger = found_logger
        this.is_warned = true;
			}
			return;
		}
		// Build log message
		let p = document.createElement("p");
		p.classList.add("pyindi-log");
		p.textContent = `${timestamp} ${device} ${message}`

    // Keep log size small by removing old log lines
    while (this.logger.children.length >= 200) {
      this.logger.removeChild(this.logger.firstChild)
    }

    // Calculate auto-scroll to new messages
    let isScrolledToBottom = this.logger.scrollHeight - this.logger.clientHeight <= this.logger.scrollTop + 1;
    let loggerHeight = this.logger.scrollHeight;
		// https://stackoverflow.com/questions/25505778/automatically-scroll-down-chat-div
		this.logger.appendChild(p);
		if (isScrolledToBottom) {
			this.logger.scrollTo(0, loggerHeight,);
		}

		return;
	}
};
