/*jslint white: true, vars: true, plusplus: true, nomen: true, unparam: true */
/*globals $, JS9, Fitsy, imexam */ 


(function() {
    "use strict";


    function hxrgReadPixelStack(fits, n, index, deliver, data) {
        var last, i;

	if ( n === 0 ) {
	    data = [];
	} else {
	    data[n-1] = fits.pixel;
	}

	n += 1;

	if ( n >= fits.nhdu ) {
	    last = data[0];

	    for ( i = 1; i < n; i++ ) {
		data[i-1] = data[i];
	    }

	    data[n-1] = last;

		deliver(data);

	    return;
	}

	Fitsy.readPixel(fits, fits.hdu[n], index, function() { hxrgReadPixelStack(fits, n, index, deliver, data); });
    }

    function pixtUpdate(im, xreg) {
	var hxrg = [], i;
	var div  = this.div;

	hxrgReadPixelStack(im.raw.hdu.fits, 0, [xreg.pos.y, xreg.pos.x], function(data) {

	    for ( i = 0; i < data.length; i++ ) {
		hxrg[i] = [i, data[i]];
	    }

            $(div).empty();
	    $.plot(div, [hxrg]);
	});
    }

    function pixtInit() {
	imexam.fixupDiv(this);
        $(this.div).append("<p style='padding: 20px 0px 0px 20px; margin: 0px'>create, click, move, or resize a region to see the pixel stack<br>");
    }

    JS9.RegisterPlugin("HxRG", "PixelStack", pixtInit, {
	    menu: "analysis",

            menuItem: "Pixel Stack",
            winTitle: "Pixel Stack",
	    help:     "imexam/imexam.html#rghxrg",

	    toolbarSeparate: true,
	    toolbarHTML: " ",

            onregionschange: pixtUpdate,
            winDims: [250, 250],
    });

}());
