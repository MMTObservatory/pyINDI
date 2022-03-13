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
		if (!this.logger) {
			if (!this.is_warned) {
				console.warn("Logger not initialized.")
			}
			return;
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
