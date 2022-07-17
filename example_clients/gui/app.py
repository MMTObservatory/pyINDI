from pyindi.webclient import INDIWebApp, INDIHandler

# The port for the web app
WEBPORT = 5905
# The indiserver port
INDIPORT = 7624
# Where the indiserver is running
INDIHOST = "localhost"
# All devices are called by an asterisk
DEVICES = ["*"]

web_app = INDIWebApp(webport=WEBPORT, indihost=INDIHOST, indiport=INDIPORT)

print(f"Go to http://<server_name>:{WEBPORT}")
print("If the server is on localhost go to:")
print(f"http://localhost:{WEBPORT}")

web_app.build_app()
