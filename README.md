# pyINDI
Pure Python 3.7+ implementation of INDI for client and server

[![Powered by AstroPy](http://img.shields.io/badge/powered%20by-AstroPy-orange.svg?style=flat)](http://www.astropy.org)

# Client

## Simple Webclient
If all you want to do is recv and send indi properties from a webpage, see `simple_webclient.py` in the example_clients.py. With that script you can give the path to the html file you wish to use and you are off. If you had the page `indi.html` in your current directory you could simply use the command line:

```
python simple_webclient.py indi.html
```

In order to access indi via the webclient you will need to include a few things in the head tag:

```html
        <script src="//code.jquery.com/jquery-1.12.4.js"></script>
	    <script src="//code.jquery.com/ui/1.12.1/jquery-ui.js"></script>

    	<!--These libraries are built with pyINDI
	    and are available at /static/ using
    	pyINDI's client libarary.-->
	
	    <link rel="stylesheet" href="/static/indi/indi.css">
    	<script src="/static/indi/indi.js"></script>
	    <script src="/static/indi/utility.js"></script>
	    <script src="/static/indi/maps-indi.js"></script>
```        
you can also include this by adding 
```
{% autoescape None %}
{{ indihead }}
```
inside the head tag of you html.

The above scripts give you access to the functions:
- setPropertyCallback
- setINDI
- showMapMessage
    

 This is most of what you need to interact with the INDI driver.
 [See this link for an example](https://github.com/MMTObservatory/pyINDI/blob/master/example_clients/client.html)

## Slightly More Complex Webclient
You can also build your own tornado app. You would have to model it on the `INDIWebclient` class in `client.py`

