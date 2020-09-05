#!/usr/bin/python3.8


from pathlib import Path
import sys
import logging
import click

logging.basicConfig(level=logging.DEBUG)
sys.path.insert(0, str(Path.cwd().parent))


from pyindi import INDIWebApp


@click.command()
@click.option('--indiport', type=int, default=7624, show_default=True )
@click.option('--webport', default=8080, type=int, show_default=True )
@click.argument('pages', nargs=-1, required=True)
def main(indiport, webport, pages):
    """
        INDI webclient generator. We use tornado and websockets
        to send INDI lilxml to your webpage. Your page will need to 
        include the following in the head tag:

 
        <script src="//code.jquery.com/jquery-1.12.4.js"></script>
	    <script src="//code.jquery.com/ui/1.12.1/jquery-ui.js"></script>

    	<!--These libraries are built with pyINDI
	    and are available at /static/ using
    	pyINDI's client libarary.-->
	
	    <link rel="stylesheet" href="/static/indi/indi.css">
    	<script src="/static/indi/indi.js"></script>
	    <script src="/static/indi/utility.js"></script>
	    <script src="/static/indi/maps-indi.js"></script>
        
        you can also include this by adding 
        ```
        {% autoescape None %}
        {{ indihead }}
        ```
        inside the head tag of you html.

        The above scripts give scripts give you access to the 
        functions:
            - setPropertyCallback
            - setINDI
            - showMapMessage
            

         This is most of what you need to interact with the INDI driver.
         [See this link for an example](https://github.com/MMTObservatory/pyINDI/blob/master/example_clients/client.html)

    """
    

    for page in pages:
        logging.debug
        app = INDIWebApp( webport=webport, indiport=indiport )
        app.add_page(f"/{page}", Path.cwd()/f"{page}")
        click.echo(app._handlers)
        #app.add_page(r"/vatt-guidebox", Path.cwd()/"vatt-guidebox.html")
        app.start(debug=True)


main()
