(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
/*jslint white: true, vars: true, plusplus: true, nomen: true, unparam: true */
/*globals $, JS9, Option */ 

"use strict";

(function() {

    var xhr = require("./xhr");

    var Remote = require("./remote-service");

    require("./image-services");
    require("./catalog-services");


    function serviceGo(div, display) {
	function status(text) {
	    $(div).find(".status").html(text);
	}
		
	
	var form = $(div).find(".JS9Archive-form")[0];

	if ( form.ra.value === "" || form.dec.value === "" ) {
	    return;
	}

	var w = parseFloat(form.width.value);
	var h = parseFloat(form.height.value);

	if ( form.dec.value[0] !== "-" && form.dec.value[0] !== "+" ) {
	    form.dec.value  = "+" + form.dec.value;
	}
	if ( w > 60 ) {
	    form.width.value = "60";
	    w = 60;
	}
	if ( h > 60 ) {
	    form.height.value = "60";
	    h = 60;
	}

	var msrv = $(form).find(".server-menu")[0];
	var msrc = $(form).find(".source-menu")[0];

	var service = msrv.options[msrv.selectedIndex].value;
	var source  = msrc.options[msrc.selectedIndex].value;
	var server  = Remote.Services[service];

	var text    = msrc.options[msrc.selectedIndex].innerHTML;
	

	server.retrieve({ name: form.object.value, e: "J2000", h: h.toString(), w: w.toString()
			, r: form.ra.value, d: form.dec.value
			, c: form.gzip.checked
			, s: source
			, source : text

			, CORS: form.CORS.checked
			, display: display
		      }
		    , status);
    }

    function getRADec(div, display) {
	var owcssys, txeq;

	function status(text) {
	    $(div).find(".status").html(text);
	}

	var form = $(div).find(".JS9Archive-form")[0];

	if ( form.object.value !== "" ) {
	    var simurl = JS9.globalOpts.simbadProxy || "https://js9.si.edu/cgi-bin/simbad-proxy.cgi";
	    var simbad = encodeURI(simurl + '?' + form.object.value);

	    xhr({ url: simbad, title: "Name", status: status }, function(e, xhr) {
		var coords = xhr.responseText.trim().split(" ");

		if ( coords[0][1] !== ":" ) {
		    form.ra.value  = coords[0];
		    form.dec.value = coords[1];
		} else {
		    status("<span style='color: red;'>Object not found?</span>");
		}
	    });
	} else {
	    var im = JS9.GetImage({display: display});

	    owcssys = im.getWCSSys();
	    if( owcssys === "image" || owcssys === "physical" ){
		txeq = JS9.globalOpts.xeqPlugins;
		JS9.globalOpts.xeqPlugins = false;
		im.setWCSSys("native", false);
	    }

	    var coords = JS9.pix2wcs(im.raw.wcs, im.raw.header.NAXIS1/2, im.raw.header.NAXIS2/2).split(/ +/);

	    var c0     = JS9.PixToWCS(im.raw.header.NAXIS1/2+1, im.raw.header.NAXIS2/2+1, {display: im});
	    //var coords = c0.str.split(" ");

	    form.ra.value  = coords[0] || "";
	    form.dec.value = coords[1] || "";

	    var c1 = JS9.PixToWCS(1,                      im.raw.header.NAXIS2/2+1, {display: im});
	    var c2 = JS9.PixToWCS(im.raw.header.NAXIS1+1, im.raw.header.NAXIS2/2+1, {display: im});

	    form.width.value = Math.floor(Math.abs((c1.ra-c2.ra)*60)*Math.cos(c0.dec/57.2958)*10)/10;

	    c1 = JS9.PixToWCS(im.raw.header.NAXIS1/2+1, 1, {display: im});
	    c2 = JS9.PixToWCS(im.raw.header.NAXIS1/2+1, im.raw.header.NAXIS2+1, {display: im});

	    form.height.value = Math.floor(Math.abs((c1.dec-c2.dec)*60)*10)/10;

	    if( owcssys === "image" || owcssys === "physical" ){
		im.setWCSSys(owcssys, false);
		JS9.globalOpts.xeqPlugins = txeq;
	    }
	}
    }

    function populateOptions(s) {
	var select = s[0];
	var dataArray = $(s).data("menu");
	var submenu   = $(s).data("submenu");

	select.options.length = 0;
	$.each(dataArray, function(index, data) {
	    select.options[select.options.length] = new Option(data.text, data.value);
	});

	

	if ( submenu !== undefined ) {

	    $(submenu).data("menu", dataArray[select.selectedIndex].subdata);
	    populateOptions(submenu);

	    s.change(function() {
		$(submenu).data("menu", dataArray[select.selectedIndex].subdata);
		populateOptions(submenu);
	    });
	}
    }

    function archInit() {
	var div = this.div;
	var win = this.winHandle;
	var disclose = win ? "" : 'style="display:none;"';

	div.innerHTML = `<form class="JS9Archive-form">
            <p>
	    <select class="service-menu JS9Select"></select>
	    <select class="server-menu JS9Select"></select>
	    <select class="source-menu JS9Select"></select>
	    <p>
	    <table width="98%">
	    <tr><td>RA:  	</td><td>	<input type=text name=ra	size=12> </td>
		<td>Dec: 	</td><td>	<input type=text name=dec	size=12> </td>
		<td><input type=button value="Set RA/Dec" class="get-ra-dec JS9Button2"> </td>
	    <tr><td>Width: </td><td>	<input type=text name=width	size=12 value=15> </td>
		<td>Height: </td><td>	<input type=text name=height	size=12 value=15> </td>
                <td>
                    <input type=checkbox name=CORS checked>CORS
		    <input type=checkbox name=gzip> compress
                </td>
	    </tr>
	    <tr><td>Object: </td> <td> <input type=text name=object size=12> </td>
		<td>&nbsp;</td>
		<td>&nbsp;</td>
		<td>&nbsp;</td>
            </tr>
            <tr>
		<td>&nbsp;</td>
		<td>&nbsp;</td>
		<td>&nbsp;</td>
		<td>&nbsp;</td>
		<td>&nbsp;</td>
            </tr>
            <tr>
		<td colspan="4"><span class=status></td>
	        <td>
                    <input type=button value="Cancel" class="service-cancel JS9Button2" ${disclose}>
                    &nbsp;
                    <input type=button value="Get Data" class="service-go JS9RunButton">
                </td>
            </tr>
	    </table>
	    </form>`;

	var mtyp = $(div).find(".service-menu");
	var msrv = $(div).find(".server-menu");
	var msrc = $(div).find(".source-menu");

	$(mtyp).data("submenu", msrv);
	$(msrv).data("submenu", msrc);

	var display = this.display;

	$(div).find(".service-cancel").on("mouseup", function() { if( win ){ win.close(); } });
	$(div).find(".service-go").on("mouseup", function() { serviceGo(div, display); });
	$(div).find(".get-ra-dec").on("mouseup", function() { getRADec (div, display); });
	
	var imgmenu = [];
	$.each(Remote.Services, function(i, service) {
	    if ( service.type !== "image-service" ) { return; }

	    imgmenu.push({ text: service.params.text, value: service.params.value, subdata: service.params.surveys });
	});

	var catmenu = [];
	$.each(Remote.Services, function(i, service) {
	    if ( service.type !== "catalog-service" ) { return; }

	    catmenu.push({ text: service.params.text, value: service.params.value, subdata: service.params.surveys });
	});

	$(mtyp).data("menu", [ { text: "Image Servers",   value: "imgserv", subdata: imgmenu }
			     , { text: "Catalog Servers", value: "catserv", subdata: catmenu }]);

	populateOptions(mtyp);
    }

    JS9.RegisterPlugin("DataSources", "ArchivesCatalogs", archInit, {

	    menu:     "view",

	    menuItem: "Archives & Catalogs",
	    winTitle: "Archives & Catalogs",
	    winDims: [610, 210],

	    help:	"archive/archive.html"
    });

}());



},{"./catalog-services":3,"./image-services":5,"./remote-service":6,"./xhr":10}],2:[function(require,module,exports){
/*jslint white: true, vars: true, plusplus: true, nomen: true, unparam: true */
/*globals $, JS9 */

"use strict";


var RemoteService = require("./remote-service");

var Starbase = require("./starbase");
var strtod   = require("./strtod");
var template = require("./template");
var xhr      = require("./xhr");

// use starbase code in js9archive? (otherwise use code in JS9)
var use_internal = false;

function CatalogService(params) {
    RemoteService.Register(params.value, this);

    this.type   = "catalog-service";
    this.params = params;

    this.table2cat = function(im, table) {
	var i, j;
	var shape = this.params.shape;

	var xcol = table[this.params.xcol];
	var ycol = table[this.params.ycol];

	var wcol = 1;
	var hcol = 1;


	var pos_func = function(im, x, y) {
	    var coords = JS9.WCSToPix(x, y, {display: im});

	    if( coords ){
		return { x: coords.x, y: coords.y };
	    }
	    return null;
	};
	var sizefunc;

	switch ( shape ) {
	 case "box":
	    sizefunc = function(row) {
		    return { width: 7, height: 7 };
		};
	    break;
	 case "circle":
	    sizefunc = function(row) {
		    return { radius: 3.5};
		};
	    break;
	 case "ellipse":
	    sizefunc = function(row) {
		    return { width: 7, height: 7 };
		};
	    break;
	}

	var regs = [], pos, siz, reg;
	for ( i = 0, j = 0; i < table.data.length; i++ ) {
	    pos = pos_func(im, table.data[i][xcol]*15, table.data[i][ycol]);
	    if( pos ){
		siz = sizefunc(im, table.data[i][wcol], table.data[i][hcol]);

		reg = {   id: i.toString(), shape: shape
			  , x: pos.x, y: pos.y
			  , width: siz.width, height: siz.height, radius: siz.radius
			  , angle: 0
		          , data: {ra: table.data[i][xcol]*15, dec: table.data[i][ycol]}
		      };

		regs[j++] = reg;
	    }
	}

	return regs;
    };

    this.retrieve = function (values, messages) {

	this.params.calc(values);
	values.units = this.params.units;

	var url = template(this.params.url, values);
	
	var catalog = this;

	var reply = xhr({ url: url, title: "Catalog", status: messages, CORS: values.CORS }, function(e) {
	    var table, im, gopts, opts, shapes;
	    im = JS9.GetImage({display: values.display});
	    if( use_internal ){
		table = new Starbase(reply.responseText, {type: {default: strtod}, units: values.units, skip: "#\n"});
		gopts = $.extend(true, {}, JS9.Catalogs.opts, {tooltip: "$xreg.data.ra $xreg.data.dec"});
		opts = {color: "yellow"};

		if( !table.data.length ){
		    JS9.error("no catalog objects found");
		}

		JS9.NewShapeLayer(values.name, gopts, {display: im});
		JS9.RemoveShapes(values.name, {display: im});

		shapes = catalog.table2cat(im, table);

		JS9.AddShapes(values.name, shapes, opts, {display: im});
	    } else {
		table = reply.responseText;
		gopts = {};
		gopts.units = values.units;
		JS9.LoadCatalog(values.name, table, gopts, {display: im});
	    }
	});
    };
}

module.exports = CatalogService;



},{"./remote-service":6,"./starbase":7,"./strtod":8,"./template":9,"./xhr":10}],3:[function(require,module,exports){
/*jslint white: true, vars: true, plusplus: true, nomen: true, unparam: true */
/*globals */

"use strict";

var strtod   = require("./strtod");

var CatalogService = require("./catalog-service");

	var saoCat = new CatalogService({
	      text:  "SAO"
	    , value: "saoCat"		
	    , surveys: [   { value: "tmc",	text: "Two Mass Catalog"	}
			 , { value: "gsc2",	text: "Guide Star Catalog 2"		}
			]
	    , url: "http://www.cfa.harvard.edu/catalog/scat?catalog={s}&ra={r}&dec={d}&width={w}&height={h}&system={e}&compress={c}"
	    , calc: function(values) {
		    if ( values.c ) {
			values.c = "gzip";
		    }
		    values.w    = values.w*60;
		    values.h    = values.h*60;
		    values.name = values.source + "@" + this.text;
		}

	    , shape: "circle"
	    , xcol:  "ra", ycol: "dec"
	
	});

	var vizCat = new CatalogService({
	      text: "VizieR"
	    , value: "vizCat"		
	    , surveys: [   { value: "II/246",		text: "2MASS"				}
			 , { value: "2MASX",		text: "2MASS Extended Source"		}
			 , { value: "B/DENIS",		text: "DENIS 3rd Release 2005"		}
			 , { value: "GLIMPSE",		text: "Spitzer's GLIMPSE"		}
			 , { value: "GSC2.3",		text: "GSC-II Catalog, Version 2.3.2"	}
			 , { value: "HIP2",		text: "Hipparcos (2007)"		}
			 , { value: "IRAS",		text: "IRAS "				}
			 , { value: "NVSS",		text: "NRAO VLA Sky Survey"		}
			 , { value: "SDSS-DR9",		text: "SDSS Photometric Catalog"	}
			 , { value: "Tycho-2",		text: "Tycho-2"				}
			 , { value: "UCAC4",		text: "UCAC 4th Release"		}
			 , { value: "USNO-A2",		text: "USNO-A2"				}
			 , { value: "USNO-B1",		text: "USNO-B1"				}
			 , { value: "WISE",		text: "WISE"				}
			]
	    , url: "http://vizier.u-strasbg.fr/viz-bin/asu-tsv?-source={s}&-out.add=_RAJ,_DEJ&-c={r}{d}&-c.bm={w}x{h}&-oc.form=s&-out.meta=h"
	    , calc: function(values) {
		    if ( values.c ) {
			values.c = "gzip";
		    }
		    //values.r = (strtod(values.r) * 15).toFixed(4);
		    //values.d =  strtod(values.d);
		    //values.d = (values.d < 0 ? "-" : "+" ) + values.d.toFixed(4);

		    values.name = values.source + "@" + this.text;
		}

	    , shape: "box"
	    , xcol:  "_RAJ2000", ycol: "_DEJ2000"
	
	});

},{"./catalog-service":2,"./strtod":8}],4:[function(require,module,exports){
/*jslint white: true, vars: true, plusplus: true, nomen: true, unparam: true */
/*globals xhr, Blob, JS9 */

"use strict";


var RemoteService = require("./remote-service");
var template      = require("./template");
var xhr           = require("./xhr");

function ImageService(params) {
    RemoteService.Register(params.value, this);

    this.type   = "image-service";
    this.params = params;

    this.retrieve = function (values, messages) {

	var display = values.display;

	params.calc(values);

	var url = template(params.url, values);

	
	xhr({ url: url, title: "Image", status: messages, type: 'blob', CORS: values.CORS }, function(e, xhr) {

	    if ( params.handler === undefined ) {
		var blob      = new Blob([xhr.response]);
		blob.name = values.name;

		JS9.fits.handleFITSFile(blob, { display: display });
	    } else {
	    	params.handler(e, xhr, params, values);
	    }
	});
    };
}

module.exports = ImageService;

},{"./remote-service":6,"./template":9,"./xhr":10}],5:[function(require,module,exports){
/*jslint white: true, vars: true, plusplus: true, nomen: true, unparam: true */
/*globals */

"use strict";

var ImageService = require("./image-service");

	var imageName = function (values) {
	    var plus = "";
	    var name;

	    if ( values.name !== "" ) {
		name = values.source + "_" + values.name;
	    } else {
	        name = values.source + "_" + values.r + plus + values.d;
	    }
	    name = name.replace(/\s+/g,"_") + ".fits";

	    return name;
	};

	var saoDSS = new ImageService({
	      text: "DSS1@SAO"
	    , value: "saoDSS"
	    , surveys: [ { value: "DSS1", text: "DSS1" } ]
	    , url: "http://www.cfa.harvard.edu/archive/dss?r={r}&d={d}&w={w}&h={h}&e={e}&c={c}"
	    , calc: function(values) {
		    if ( values.c ) {
			values.c = "gzip";
		    }
		    values.name  = imageName(values);
		}
	});

	var stsDSS = new ImageService({
	      text: "DSS@STScI"
	    , value: "stsDSS"
	    , surveys: [   { value: "poss2ukstu_ir",	text: "STScI DSS2 IR"	}
			 , { value: "poss2ukstu_red",	text: "STScI DSS2 Red"	}
			 , { value: "poss2ukstu_blue",	text: "STScI DSS2 Blue"	}
			 , { value: "poss1_red", 	text: "STScI DSS1 Red"	}
			 , { value: "poss1_blue",	text: "STScI DSS1 Blue"	}
			]
	    , url: "http://stdatu.stsci.edu/cgi-bin/dss_search?r={r}&d={d}&w={w}&h={h}&e={e}&c={c}&v={s}&f=fits"
	    , calc: function(values) {
		    if ( values.c ) {
			values.c = "gz";
		    } else {
			values.c = "none";
		    }
		    values.name  = imageName(values);
		}
	});

	var esoDSS = new ImageService({
	      text: "DSS@ESO"
	    , value: "esoDSS"
	    , surveys: [   { value: "DSS2-infrared",	text: "ESO DSS2 IR"	}
			 , { value: "DSS2-red",    	text: "ESO DSS2 Red"	}
			 , { value: "DSS2-blue",	text: "ESO DSS2 Blue"	}
			 , { value: "DSS1",		text: "ESO DSS1"	}
			]
	    , url: "http://archive.eso.org/dss/dss?ra={r}&dec={d}&equinox=J2000&x={w}&y={h}&mime-type={c}&Sky-Survey={s}"
	    , calc: function(values) {
		    if ( values.c ) {
			values.c = "display/gz-fits";
		    } else {
			values.c = "application/x-fits";
		    }
		    values.name  = imageName(values);
		}
	});

	var ipac2m  = new ImageService({
	      text: "2Mass@IPAC"
	    , value: "ipac2m"
	    , surveys: [   { value: "j", 		text: "IPAC 2Mass J"		}
			 , { value: "h", 		text: "IPAC 2Mass H"		}
			 , { value: "k", 		text: "IPAC 2Mass K"		}
			]
	    , url: "http://irsa.ipac.caltech.edu/cgi-bin/Oasis/2MASSImg/nph-2massimg?objstr={r},{d}&size={radius}&band={s}"
	    , calc: function(values) {
		    values.radius = Math.floor(Math.sqrt(values.w*values.w+values.h*values.h)*60);
		    values.name   = imageName(values);
		}
	});

//	var dasch  = new ImageService({
//	      text: "DASCH"
//	    , value: "dasch"
//	    , surveys: [   { value: "plates", 		text: "Plates"		} ]
//
//	    , url: "http://dasch.rc.fas.harvard.edu/showtext.php?listflag=0&dateflag=dateform=j%20&coordflag=&radius=200&daterange=&seriesflag=&plateNumberflag=&classflag=&typeflag=%20-T%20wcsfit%20&pessimisticflag=&bflag=-j&nstars=5000&locstring=12:00:00%2030:00:00%20J2000"
//
//	    , calc: function(values) {
//		    values.radius = Math.min(Math.floor(Math.sqrt(values.w*values.w+values.h*values.h)*60), 600);
//		    values.name   = imageName(values);
//	    }
//
//	    , picker: "<input type=button value='pick' class='picker JS9Button2'>"
//	    , controls: "<tr>><td>Series</td>   <td><input type=text size=10 name=series></td>		\n\
//	    		      <td>Plate No</td> <td><input type=text size=10 name=plate></td>           \n\
//	    		      <td>Class</td>    <td><input type=text size=10 name=class></td></tr>      \n\
//	    		  <tr><td>Date From</td><td><input type=text size=10 name=datefr></td>          \n\
//	    		      <td>Date To</td>  <td><input type=text size=10 name=dateto></td></tr>      \n\
//			 "
//	    , handler: function (e, xhr, params, values) {
//
//	    }
//	});

//	var cds = new ImageService({
//	      text: "CDS Aladin Server"
//	    , value: "aladin@cds"
//	    , surveys: [   { value: "j", 		text: "IPAC 2Mass J"		}
//			 , { value: "h", 		text: "IPAC 2Mass H"		}
//			 , { value: "k", 		text: "IPAC 2Mass K"		}
//			]
//	    , url: "http://irsa.ipac.caltech.edu/cgi-bin/Oasis/2MASSImg/nph-2massimg?objstr={r},{d}&size={radius}&band={s}"
//	    , calc: function(values) {
//		    values.radius = Math.floor(Math.sqrt(values.w*values.w+values.h*values.h)*60);
//		    values.name   = imageName(values);
//		}
//	});

//	skyvew  = new ImageService({
//	      id: "skyvew"
//	    , "surveys", [ ]
//	    , url: "http://skys.gsfc.nasa.gov/cgi-bin/images?VCOORD={ra},{dec}&SURVEY={s}&SFACTR={size}&RETURN=FITS"
//	    , calc: function(values) {
//		    values.size = Math.floor((values.w+values.h)/2)
//		    values.name = values.name + "_" + values.source;
//		}
//	})


},{"./image-service":4}],6:[function(require,module,exports){
/*jslint white: true, vars: true, plusplus: true, nomen: true, unparam: true */

"use strict";


exports.Services = {};

exports.Register = function(name, obj) {
	exports.Services[name] = obj;
};

},{}],7:[function(require,module,exports){
/*jslint white: true, vars: true, plusplus: true, nomen: true, unparam: true */

"use strict";

function I(x) { return x; }

function starbase_Dashline(dash) {
    var i;

    for ( i = 0; i < dash.length; i++ ) {
	if ( dash[i].match(/^-+$/) === null ) {
	    return 0;
	}
    }

    return i;
}

function Starbase(data, opts) {
    var i, j, skips, done;

    opts = opts || {};

    this.head = {};
    this.type = [];
    this.data = [];

    data = data.replace(/\s+$/,"").split("\n");
    var line = 0;

    if ( opts.skip ) {
	skips = opts.skip.split("");
	for(; line < data.length; line++){
	    if( (skips[0] !== data[line][0])             &&
		(skips[1] !== "\n" || data[line] !== "") ){
		break;
	    }
	}
    }

    // make sure we have a header to process
    if( (data[line] === undefined) || (data[line+1] === undefined) ){
	return;
    }

    this.headline = data[line++].trim().split(/ *\t */);
    if ( opts.units ) {
	this.unitline = data[line++].trim().split(/ *\t */);
    }
    this.dashline = data[line++].trim().split(/ *\t */);

    var dashes = starbase_Dashline(this.dashline);

    // Read lines until the dashline is found
    //
    while ( dashes === 0 || dashes !== this.headline.length ) {

	if ( !opts.units ) {
	    this.headline = this.dashline;
	} else {
	    this.headline = this.unitline;
	    this.unitline = this.dashline;
	}

	this.dashline = data[line++].trim().split(/ *\t */);

	dashes = starbase_Dashline(this.dashline);
    }

    // Create a vector of type converters
    //
    for ( i = 0; i < this.headline.length; i++ ) {
	if ( opts.type && opts.type[this.headline[i]] ) {
	    this.type[i] = opts.type[this.headline[i]];
	} else {
	    if ( opts.type && opts.type.default ) {
		this.type[i] = opts.type.default;
	    } else {
		this.type[i] = I;
	    }
	}
    }

    // Read the data in and convert to type[]
    //
    for ( j = 0; line < data.length; line++, j++ ) {
	// skip means end of data
	if( (skips[0] === data[line][0])             ||
	    (skips[1] === "\n" && data[line] === "") ){
	    break;
	}

	this.data[j] = data[line].split('\t');

	for ( i = 0; i < this.data[j].length; i++ ) {
	    this.data[j][i] = this.type[i](this.data[j][i]);
	}
    }

    for ( i = 0; i < this.headline.length; i++ ) {
	this[this.headline[i]] = i;
    }
}

module.exports = Starbase;


},{}],8:[function(require,module,exports){
/*jslint white: true, vars: true, plusplus: true, nomen: true, unparam: true */
/*globals */ 

'use strict';

function Strtod(str) {
    var l = str.trim().split(/[: ]/);
    var x;

    if ( l.length === 3 ) {
	var sign = 1;

	if ( l[0].substr(0, 1) === "-" ) {
	    sign = -1;
	}

	var h = parseFloat(l[0]);
	var m = parseFloat(l[1]);
	var s = parseFloat(l[2]);

	x = sign * (Math.abs(h) + m/60.0 + s/3600.0);
    } else {
	x = parseFloat(str);
    }

    if ( isNaN(x) ) { return str; }

    return x;
}

module.exports = Strtod;

},{}],9:[function(require,module,exports){
/*jslint white: true, vars: true, plusplus: true, nomen: true, unparam: true */

"use strict";


    function strrep(str, n) {
	var i, s = '';

	for ( i = 0; i < n; i++ ) { s += str; }

	return s;
    }

function template(text,data) {
	    
    return text.replace(/\{([a-zA-Z0-9_.%]*)\}/g,
	function(m,key){
	    var type, prec, widt = 0, fmt, i;
	    var val = data;
	
	    key = key.split("%");

	    if ( key.length <= 1 ) {
		fmt = "%s";
	    } else {
		fmt = key[1];
	    }

	    key = key[0];
	    key = key.split(".");

	    for ( i = 0; i < key.length; i++ ) {
		if ( val.hasOwnProperty(key[i]) ) {
		    val = val[key[i]];
		} else {
		    return "";
		}
	    }

	    type = fmt.substring(fmt.length-1);
	    prec = fmt.substring(0, fmt.length-1);

	    prec = prec.split(".");

	    widt = prec[0] | 0;
	    prec = prec[1] | 0;

	    switch ( type ) {
	     case "s":
		val = val.toString();
		break;
	     case "f":
		val = val.toFixed(prec);
		break;
	     case "d":
		val = val.toFixed(0);
		break;
	    }

	    if ( widt !== 0 && widt > val.length ) {
		if ( widt > 0 ) {
		    val = strrep(" ", widt-val.length) + val;
		} else {
		    val = val + strrep(" ", widt-val.length);
		}
	    }

	    return val;
	}
    );
}

module.exports = template;

},{}],10:[function(require,module,exports){
/*jslint white: true, vars: true, plusplus: true, nomen: true, unparam: true */
/*globals XMLHttpRequest */ 

'use strict';

    function xhr(params, func) {
	var status = params.status;
	var title = "";

	var corsurl = JS9.globalOpts.corsProxy || "https://js9.si.edu/cgi-bin/CORS-proxy.cgi";

	if ( params.CORS ) {
	    params.url = params.url.replace(/\?/g, "@");
	    params.url = params.url.replace(/&/g, "!");
	    //params.url = params.url.replace(/\+/g, "");

	    params.url = encodeURI(params.url);

	    params.url= corsurl + "?Q=" + params.url;
	}

	if( JS9.DEBUG > 1 ){
	    JS9.log("archive/catalog url: %s", params.url);
	}

	var _xhr = new XMLHttpRequest();

	_xhr.open('GET', params.url, true);

	if ( params.title ) {
	    title = params.title;
	}
	if ( params.type ) {
	    _xhr.responseType = params.type;
	}

	if ( status !== undefined ) {
	    
	    _xhr.addEventListener("progress"	, function(e) { status(title + " progress " + e.loaded.toString());	});
	    _xhr.addEventListener("error"	, function(e) { status(title + " service error"); 			});
	    _xhr.addEventListener("abort"	, function(e) { status(title + " service aborted"); 			});
	}
	_xhr.onload = function(e) {
	    if ( this.readyState === 4 ) {
		if ( this.status === 200 || this.status === 0 ) {
		    if ( status !== undefined ) { status(""); }
		    func(e, this);
		}
	    }
	};
	_xhr.send();

	return _xhr;
    }

module.exports = xhr;


},{}]},{},[1]);

/*globals $, JS9, Fitsy */

"use strict";

(function() {

    function reBinImage(div, display) {
	let hdu, opts, npos;
	let im   = JS9.GetImage({display: display});
	let form = $(div).find(".js9BinningForm")[0];
	let rebin = function(im, hdu, display){
	    let ss;
	    let rexp = /(\[.*[a-zA-Z0-9_].*\])\[.*\]/;
	    let topts = {display: display};
	    if( form.separate.checked ){
		// replace old extensions with new
		// would be better to combine them, but ...
		if( form.filter.value ){
		    ss = '[' + form.filter.value.replace(/\s+/g,"") + ']';
		    topts.id = im.id.replace(rexp, "$1") + ss;
		    if( im.fitsFile ){
			topts.file = im.fitsFile.replace(rexp, "$1") + ss;
		    } else {
			topts.file = topts.id;
		    }
		}
		JS9.checkNew(new JS9.Image(hdu, topts));
	    } else {
		JS9.RefreshImage(hdu, topts);
	    }
	};
	if ( !im || !im.raw ) { return; }

	hdu = im.raw.hdu;

	switch(JS9.fitsLibrary()){
	case "fitsy":
	    if ( hdu.imtab === "image" ) {
		JS9.error("image binning not implemented");
	    } else {
		opts = $.extend(true, {}, JS9.fits.opts,
	        { table: { xcen: form.xcen.value , ycen: form.ycen.value,
			   xdim: form.xdim.value , ydim: form.ydim.value,
			   bin: form.bin.value , filter: form.filter.value }
	        });
		Fitsy.readTableHDUData(hdu.fits, hdu, opts, function(hdu){
		    rebin(im, hdu, display);
		});
	    }
	    break;
	case "cfitsio":
	    opts = {xcen: 0, ycen: 0, xdim: 0, ydim: 0, bin: 1, filter: ""};
	    if( JS9.isNumber(form.xcen.value) ){
		opts.xcen = parseFloat(form.xcen.value);
	    }
	    if( JS9.isNumber(form.ycen.value) ){
		opts.ycen = parseFloat(form.ycen.value);
	    }
	    npos = im.maybePhysicalToImage({x: opts.xcen, y: opts.ycen});
	    if( npos ){
		opts.xcen = npos.x;
		opts.ycen = npos.y;
	    }
	    if( JS9.isNumber(form.xdim.value) ){
		opts.xdim = Math.floor(parseFloat(form.xdim.value));
	    }
	    if( JS9.isNumber(form.ydim.value) ){
		opts.ydim = Math.floor(parseFloat(form.ydim.value));
	    }
	    if( JS9.isNumber(form.bin.value) ){
		opts.bin = parseFloat(form.bin.value);
	    } else {
		opts.bin = form.bin.value;
	    }
	    opts.filter = form.filter.value;
	    opts.separate = $(form.separate).prop("checked");
	    opts.binMode = $('input[name="binmode"]:checked').val();
	    im.displaySection(opts);
	    break;
	}
    }

    function centerBinImage(xdim, ydim, div, display) {
	let im   = JS9.GetImage({display: display});
	let form = $(div).find(".js9BinningForm")[0];
	let fdims = im.fileDimensions();
	form.xcen.value = 0;
	form.ycen.value = 0;
	if( xdim > 0 ){
	    form.xdim.value = xdim;
	} else {
	    form.xdim.value = fdims.xdim;
	}
	if( ydim > 0 ){
	    form.ydim.value = ydim;
	} else {
	    form.ydim.value = fdims.ydim;
	}
	reBinImage(div, display);
    }

    function getBinParams(div, display) {
	let im, ipos, lpos, form, hdu, bin;
	if ( display === undefined ) {
	    div     = this.div;
	    display = this.display;
	}
	im   = JS9.GetImage({display: display});

	if ( im ) {
	    form = $(div).find(".js9BinningForm")[0];

	    if ( im.raw.hdu !== undefined ) {
		hdu = im.raw.hdu;
		hdu.bin = hdu.bin || 1;
		hdu.binMode = hdu.binMode || JS9.globalOpts.binMode || "s";
		form.rebin.disabled = false;
	        if ( hdu.table !== undefined ) {
		    // get current center
		    ipos = im.getPan();
		    // convert to physial (file) coords
		    lpos = im.imageToLogicalPos({x: ipos.ox, y: ipos.oy});
		    form.xcen.value = String(Math.floor(lpos.x + 0.5));
		    form.ycen.value = String(Math.floor(lpos.y + 0.5));
		    form.bin.value = String(hdu.table.bin);
		    form.xdim.value = String(Math.floor(hdu.table.xdim));
		    form.ydim.value = String(Math.floor(hdu.table.ydim));
		    form.filter.value = hdu.table.filter || "";
		    form.bin.disabled = false;
		    form.xcen.disabled = false;
		    form.ycen.disabled = false;
		    form.xdim.disabled = false;
		    form.ydim.disabled = false;
		    // form.binmode.disabled = false;
		    form.filter.disabled = false;
		} else {
		    hdu.bin = hdu.bin || 1;
		    bin = hdu.bin > 0 ? hdu.bin : 1 / Math.abs(hdu.bin);
		    // hack: if a parent file was used to make this image,
		    // calculate binning from its LTM/TLV parameters
		    if( im.parentFile && im.raw.header     && 
			im.raw.header.LTM1_1 !== undefined ){
			bin = 1.0 / Math.abs(im.raw.header.LTM1_1);
		    }
		    // get image center from raw data
		    // ipos = {x: im.raw.width / 2, y: im.raw.height / 2};
		    // get current center
		    ipos = im.getPan();
		    // convert to physial (file) coords
		    lpos = im.imageToLogicalPos({x: ipos.ox, y: ipos.oy});
		    // form.xcen.value = String(Math.floor(lpos.x + 0.5));
		    // form.ycen.value = String(Math.floor(lpos.y + 0.5));
		    form.xcen.value = String(Math.floor(lpos.x + 0.5*(bin-1)));
		    form.ycen.value = String(Math.floor(lpos.y + 0.5*(bin-1)));
		    form.bin.value = String(hdu.bin);
		    form.xdim.value = String(Math.floor(hdu.naxis1 * bin));
		    form.ydim.value = String(Math.floor(hdu.naxis2 * bin));
		    if( JS9.globalOpts.enableImageFilter ){
			form.filter.value = im.raw.filter || "";
		    } else {
			form.filter.value = "";
		    }
		    form.bin.disabled = false;
		    form.xcen.disabled = false;
		    form.ycen.disabled = false;
		    form.xdim.disabled = false;
		    form.ydim.disabled = false;
		    form.binmode.disabled = false;
		    if( JS9.globalOpts.enableImageFilter ){
			form.filter.disabled = false;
		    } else {
			form.filter.disabled = true;
			form.filter.style.backgroundColor="#E0E0E0";
		    }
		}
		if( hdu.binMode === "a" ){
		    $('input:radio[class="avg-pixels"]').prop('checked',true);
		} else {
		    $('input:radio[class="sum-pixels"]').prop('checked',true);
		}
	    } else {
		form.rebin.disabled = true;
	    }
	}
    }

    function binningInit() {
	let binblock, binblocked;
	let that = this;
	let html = "";
	let div = this.div;
	let display = this.display;
	let win = this.winHandle;
	let disclose = win ? "" : 'style="display:none;"';
	let im  = JS9.GetImage({display: this.display});

	if( !im || (im && !im.raw.hdu) ){
	    div.innerHTML = '<p style="padding: 5px"><center>FITS image sections, with binning and filtering</center>';
	    return;
	}

	if( im.imtab === "image" ){
	    binblock = "Block";
	    binblocked = "blocked";
	} else {
	    binblock = "Bin";
	    binblocked = "binned";
	}

	html = `<form class="js9BinningForm js9Form">
	        <table style="margin:0px; cellspacing:0; border-collapse:separate; border-spacing:4px 10px;">
	           <tr>	<td><input type=button class="js9-binning-full JS9Button2" value="Load full image" style="text-align:right;"></td>
			<td>&nbsp;</td>
			<td>&nbsp;</td>
			<td>&nbsp;</td>
		   </tr>
	           <tr>	<td>Center:</td>
			<td><input type=text name=xcen size=10 style="text-align:right;"></td>
			<td><input type=text name=ycen size=10 style="text-align:right;"></td>
			<td>&nbsp(center position of section)</td>
		   </tr>
	           <tr>	<td>Size:</td>
			<td><input type=text name=xdim size=10 style="text-align:right;"></td>
			<td><input type=text name=ydim size=10 style="text-align:right;"></td>
			<td>&nbsp(width, height of section)</td>
		   </tr>
                   <tr>	<td>${binblock}:</td>
			<td><input type=text name=bin value=1 size=10 style="text-align:right;"></td>
			<td></td>
			<td>&nbsp(apply ${binblock.toLowerCase()} factor to ${im.imtab})</td>
		   </tr>`;

	if( im.imtab === "image" ){
	    html += `
	           <tr>	<td>Mode:</td>
                        <td><input type=radio name=binmode value="s" class="sum-pixels" style="text-align:left;">sum</td>
                        <td><input type=radio name=binmode value="a" class="avg-pixels" style="text-align:left;">average</td>
			<td>&nbsp(sum or avg ${binblocked} pixels?)</td>
		   </tr>`;
	} else {
	    html += `
	           <tr>	<td>Mode:</td>
                        <td><input type=checkbox name=xbinmode value="s" class="sum-pixels" style="text-align:left;" checked disabled>sum</td>
			<td></td>
			<td>&nbsp(binned tables are summed)</td>
		   </tr>`;
	}
	html += `  <tr>	<td>Filter:</td>
			<td colspan="2"><textarea name=filter rows="1" cols="22" style="text-align:left;" autocapitalize="off" autocorrect="off"></textarea></td>
			<td>&nbsp(event/row filter for table)</td>
		   </tr>
	           <tr>	<td>Separate:</td>
                        <td><input type=checkbox name=separate class="js9-binning-sep" style="text-align:left;"></td>
			<td></td>
			<td>&nbsp(display as separate image?)</td>
		   </tr>
		   <tr>
			<td>&nbsp;</td>
			<td>&nbsp;</td>
			<td>&nbsp;</td>
                        <td>
                            <input type=button name=close value="Cancel" class="js9-binning-close JS9Button2" ${disclose}'>
                            &nbsp;
			    <input type=button name=rebin value="Get Data" class="js9-binning-rebin JS9RunButton">
                        </td>
		   </tr>
	    </table>
	    </form>`;
        $(div).html(html);

	// button and checkbox actions
	$(div).find(".js9-binning-full").on("click", function ()  { centerBinImage(0, 0, div, display); });
	$(div).find(".js9-binning-rebin").on("click", function () { reBinImage(div, display); });
	$(div).find(".js9-binning-close").on("click", function () { if( win ){ win.close(); } });
	$(div).find(".js9-binning-sep").change(function() { that.sep = $(this).prop("checked"); });
	$(div).find(".js9-binning-sep").prop("checked", !!that.sep);

	// set up to rebin when <cr> is pressed, if necessary
	if( JS9.globalOpts.runOnCR ){
	    $(div).find(".js9BinningForm").data("enterfunc", "rebin");
	}

	// get current params
	if ( im ) {
	    getBinParams(div, display);
	}
    }

    JS9.RegisterPlugin("FITS", "Binning", binningInit, {
	    menu: "view",

            winTitle: "Image Sections, with Binning and Filtering",
	    winResize: true,

            menuItem: "Bin/Filter/Section",

	    onplugindisplay:  binningInit,
	    onimageload:      binningInit,
	    onimagedisplay:   binningInit,
	    onsetpan:         binningInit,
	    onsetzoom:        binningInit,

	    help:     "fitsy/binning.html",

            winDims: [520, 280]
    });
}());
/*
 * image blend plugin (February 25, 2016)
 */

/*global $, JS9, sprintf */

"use strict";

// create our namespace, and specify some meta-information and params
JS9.Blend = {};
JS9.Blend.CLASS = "JS9";      // class of plugins (1st part of div class)
JS9.Blend.NAME = "Blend";     // name of this plugin (2nd part of div class)
JS9.Blend.WIDTH =  550;	  // width of light window
JS9.Blend.HEIGHT = 270;	  // height of light window
JS9.Blend.BASE = JS9.Blend.CLASS + JS9.Blend.NAME;  // CSS base class name

JS9.Blend.blendModeHTML='When <b>Image Blending</b> is turned on, the images you select below will be combined using your chosen blend mode and optional opacity. See <a href="https://www.w3.org/TR/compositing-1/" target="blank">W3C Compositing and Blending</a> for info about compositing and blending.<p> <input type="checkbox" class="blendModeCheck" id="active" name="imageBlending" value="active" onclick="javascript:JS9.Blend.xblendmode(\'%s\', this)"><b>Image Blending</b>';

JS9.Blend.imageHTML="<span style='float: left'>$active &nbsp;&nbsp; $blend &nbsp;&nbsp; $opacity</span>&nbsp;&nbsp; <span id='blendFile'>$imfile</span>";

JS9.Blend.activeHTML='<input class="blendActiveCheck" type="checkbox" id="active" name="active" value="active" onclick="javascript:JS9.Blend.xactive(\'%s\', \'%s\', this)">blend using:';

JS9.Blend.blendHTML='<select class="blendModeSelect JS9Select" onchange="JS9.Blend.xblend(\'%s\', \'%s\', this)"><option selected disabled>blend mode</option><option value="normal">normal</option><option value="screen">screen</option><option value="multiply">multiply</option><option value="overlay">overlay</option><option value="darken">darken</option><option value="lighten">lighten</option><option value="color-dodge">color-dodge</option><option value="color-burn">color-burn</option><option value="hard-light">hard-light</option><option value="soft-light">soft-light</option><option value="difference">difference</option><option value="exclusion">exclusion</option><option value="hue">hue</option><option value="saturation">saturation</option><option value="color">color</option> <option value="luminosity">luminosity</option><option selected disabled>composite mode</option><option value="source-atop">source-atop</option><option value="source-in">source-in</option><option value="source-out">source-out</option><option value="source-over">source-over</option><option value="destination-atop">destination-atop</option><option value="destination-in">destination-in</option><option value="destination-out">destination-out</option><option value="destination-over">destination-over</option></select>';

JS9.Blend.opacityHTML='<select class="blendOpacitySelect JS9Select" onchange="JS9.Blend.xopacity(\'%s\', \'%s\', this)"><option selected disabled>opacity</option><option value="1.00">opaque</option><option value="0.95">0.95</option><option value="0.90">0.90</option><option value="0.85">0.85</option><option value="0.80">0.80</option><option value="0.75">0.75</option><option value="0.70">0.70</option><option value="0.65">0.65</option><option value="0.60">0.60</option><option value="0.55">0.55</option><option value="0.50">0.50</option><option value="0.45">0.45</option><option value="0.40">0.40</option><option value="0.35">0.35</option><option value="0.30">0.30</option><option value="0.25">0.25</option><option value="0.20">0.20</option><option value="0.10">0.10</option><option value="0.00">transparent</option></select>';

JS9.Blend.imfileHTML='<b>%s</b>';

JS9.Blend.nofileHTML='<p><span id="blendNoFile">[Images will appear here as they are loaded]</span>';

// change active state
JS9.Blend.xactive = function(did, id, target){
    let bl;
    const im = JS9.lookupImage(id, did);
    const active = target.checked;
    if( im ){
	// change active mode
	bl = im.blendImage();
	if( bl.active !== active ){
	    im.blendImage(active);
	}
    }
};

// change blend mode
JS9.Blend.xblend = function(did, id, target){
    let bl, mode;
    const im = JS9.lookupImage(id, did);
    if( target.selectedIndex >= 0 ){
	mode = target.options[target.selectedIndex].value;
    }
    if( im ){
	// change the blend mode
	if( JS9.notNull(mode) ){
	    bl = im.blendImage();
	    if( bl.mode !== mode ){
		im.blendImage(mode);
	    }
	}
    }
};

// change opacity
JS9.Blend.xopacity = function(did, id, target){
    let bl, opacity;
    const im = JS9.lookupImage(id, did);
    if( target.selectedIndex >= 0 ){
	opacity = target.options[target.selectedIndex].value;
    }
    if( im ){
	// change opacity
	if( JS9.notNull(opacity) ){
	    bl = im.blendImage();
	    opacity = parseFloat(opacity);
	    if( bl.opacity !== opacity ){
		im.blendImage(null, opacity);
	    }
	}
    }
};

// change global blend mode for this display
JS9.Blend.xblendmode = function(id, target){
    const display = JS9.getDynamicDisplayOr(JS9.lookupDisplay(id));
    const blendMode = target.checked;
    // change global blend mode
    if( display ){
        JS9.BlendDisplay(blendMode, {display: display});
    }
};

// get a BlendImage id based on the file image id
JS9.Blend.imid = function(im){
    const id = `${im.display.id}_${im.id}`;
    return `${id.replace(/[^A-Za-z0-9_]/g, "_")}BlendImage`;
};

// get a class unique between displays
JS9.Blend.dispclass = function(im){
    const id = `${JS9.Blend.BASE}_${im.display.id}`;
    return id.replace(/[^A-Za-z0-9_]/g, "_");
};

// set global blend option in the GUI
JS9.Blend.displayBlend = function(im){
    let disp;
    if( im ){
	disp = im.display;
	this.divjq.find(".blendModeCheck").prop("checked", disp.blendMode);
    }
};

// set image blend options in the GUI
JS9.Blend.imageBlend = function(im, dochange){
    let s, bl, id, el, el2;
    // get the current options
    bl = im.blendImage();
    // get id associated with this image
    id = JS9.Blend.imid(im);
    if( bl ){
	el = this.divjq.find(`#${id}`);
	el.find(".blendActiveCheck").prop("checked", bl.active);
	if( bl.mode !== undefined ){
	    el2 = el.find(".blendModeSelect").val(bl.mode);
	    if( dochange ){
		el2.change();
	    }
	}
	if( bl.opacity !== undefined ){
	    if( typeof bl.opacity === "number" ){
		s = bl.opacity.toFixed(2);
	    } else {
		s = bl.opacity;
	    }
	    el2 = el.find(".blendOpacitySelect").val(s);
	    if( dochange ){
		el2.change();
	    }
	}
    }
};

// change the active image
JS9.Blend.activeImage = function(im){
    let id, dcls;
    if( im ){
	id = JS9.Blend.imid(im);
	dcls = `${JS9.Blend.dispclass(im)}_Image`;
	$(`.${dcls}`)
	    .removeClass(`${JS9.Blend.BASE}ImageActive`)
	    .addClass(`${JS9.Blend.BASE}ImageInactive`);
	$(`#${id}`)
	    .removeClass(`${JS9.Blend.BASE}ImageInactive`)
	    .addClass(`${JS9.Blend.BASE}ImageActive`);
    }
};

// add an image to the list of available images
JS9.Blend.addImage = function(im){
    let s, id, divjq, dcls, dispid, imid;
    const opts = [];
    const cls = `${JS9.Blend.BASE}Image`;
    if( !im ){
	return;
    }
    // convenience variables
    imid = im.id;
    dispid = im.display.id;
    // unique id
    id = JS9.Blend.imid(im);
    // get class for this layer 
    dcls = `${JS9.Blend.dispclass(im)}_Image`;
    // value to pass to the macro expander
    opts.push({name: "imid", value: imid});
    opts.push({name: "active", value: sprintf(JS9.Blend.activeHTML, 
					      dispid, imid)});
    opts.push({name: "opacity", value: sprintf(JS9.Blend.opacityHTML, 
					       dispid,  imid)});
    opts.push({name: "blend", value: sprintf(JS9.Blend.blendHTML, 
					     dispid,  imid)});
    opts.push({name: "imfile", value: sprintf(JS9.Blend.imfileHTML, 
					      imid)});
    // remove initial message
    if( !this.blendDivs ){
	this.blendImageContainer.html("");
    }
    // create the html for this image
    s = JS9.Image.prototype.expandMacro.call(im, JS9.Blend.imageHTML, opts);
    // add image html to the image container
    divjq = $("<div>")
	.addClass(cls)
	.addClass(dcls)
	.attr("id", id)
	.prop("imid", imid)
	.html(s)
	.appendTo(this.blendImageContainer);
    divjq.on("mousedown touchstart", () => {
	    im.displayImage();
	    JS9.Blend.activeImage.call(this, im);
    });
    // set the current options
    JS9.Blend.imageBlend.call(this, im, false);
    // set the current options
    JS9.Blend.displayBlend.call(this, im);
    // one more div in the stack
    this.blendDivs++;
    //make it the current one
    JS9.Blend.activeImage(im);
};

// remove an image to the list of available images
JS9.Blend.removeImage = function(im){
    let id;
    if( im ){
	id = JS9.Blend.imid(im);
	$(`#${id}`).remove();
	this.blendDivs--;
	if( this.blendDivs === 0 ){
	    this.blendImageContainer.html(JS9.Blend.nofileHTML);
	}
	return true;
    }
    return false;
};

// constructor: add HTML elements to the plugin
JS9.Blend.init = function(width, height){
    let i, im, omode, display;
    // on entry, these elements have already been defined:
    // this.div:      the DOM element representing the div for this plugin
    // this.divjq:    the jquery object representing the div for this plugin
    // this.id:       the id ofthe div (or the plugin name as a default)
    // this.display:  the display object associated with this plugin
    // this.dispMode: display mode (for internal use)
    //
    // create container to hold image container and header
    // allow size specification for divs
    if( this.winType === "div" ){
	// set width and height on div
	this.width = this.divjq.attr("data-width");
	if( !this.width  ){
	    this.width = width || JS9.Blend.WIDTH;
	}
	this.divjq.css("width", this.width);
	this.width = parseInt(this.divjq.css("width"), 10);
	this.height = this.divjq.attr("data-height");
	if( !this.height ){
	    this.height = height || JS9.Blend.HEIGHT;
	}
	this.divjq.css("height", this.height);
	this.height = parseInt(this.divjq.css("height"), 10);
    }
    // clean main container
    this.divjq.html("");
    // no images/divs loaded yet
    this.blendDivs = 0;
    // allow scrolling on the plugin
    this.divjq.addClass("JS9PluginScrolling");
    // main container
    this.blendContainer = $("<div>")
	.addClass(`${JS9.Blend.BASE}Container`)
	.attr("id", `${this.id}BlendContainer`)
	.appendTo(this.divjq);
    // header
    this.blendHeader = $("<div>")
	.addClass(`${JS9.Blend.BASE}Header`)
	.attr("id", `${this.display.id}Header`)
	.html(sprintf(JS9.Blend.blendModeHTML, this.display.id))
	.appendTo(this.blendContainer);
    // container to hold images
    this.blendImageContainer = $("<div>")
	.addClass(`${JS9.Blend.BASE}ImageContainer`)
	.attr("id", `${this.id}BlendImageContainer`)
        .html(JS9.Blend.nofileHTML)
	.appendTo(this.blendContainer);
    // add currently loaded images (but avoid multiple redisplays)
    display = JS9.getDynamicDisplayOr(this.display);
    omode = display.blendMode;
    display.blendMode = false;
    for(i=0; i<JS9.images.length; i++){
	im = JS9.images[i];
	if( im.display === display ){
	    JS9.Blend.addImage.call(this, im);
	}
    }
    // final redisplay
    display.blendMode = omode;
    if( display.image ){
	display.image.displayImage();
    }
    // set global blend mode
    this.divjq.find(".blendModeCheck")
	.prop("checked", !!display.blendMode);
    // the images within the image container will be sortable
    this.blendImageContainer.sortable({
	start: (event, ui) => {
	    this.oidx = ui.item.index();
	},
	stop: (event, ui) => {
	    const nidx = ui.item.index();
	    // change JS9 image array to reflect the change
	    this.display.moveImageInStack(this.oidx, nidx);
	    // redisplay in case something changed
	    if( this.display.image ){
		this.display.image.displayImage();
	    }
	    delete this.oidx;
	}
    });
};

// callback when dynamic selection is made
JS9.Blend.dysel = function(){
    let omode;
    const odisplay = JS9.getDynamicDisplayOr("previous");
    // turn off blend for previously selected display
    if( odisplay ){
	omode = odisplay.blendMode;
	odisplay.blendMode = false;
	if( odisplay.image ){
	    odisplay.image.displayImage();
	}
    }
    // re-init the plugin
    JS9.Blend.init.call(this);
    // restore blend mode for previous display
    if( odisplay ){
	odisplay.blendMode = omode;
    }
};

// callback when global blend option is set externally
JS9.Blend.displayblend = function(im){
    // disp gives access to display object
    if( im ){
	JS9.Blend.displayBlend.call(this, im);
    }
};

// callback when blend options are set externally
JS9.Blend.imageblend = function(im){
    // im gives access to image object
    if( im ){
	JS9.Blend.imageBlend.call(this, im, false);
    }
};

// callback when an image is loaded
JS9.Blend.imageload = function(im){
    const display = JS9.getDynamicDisplayOr(this.display);
    if( im && im.display === display ){
	JS9.Blend.addImage.call(this, im);
    }
};

// callback when image is displayed
JS9.Blend.imagedisplay = function(im){
    JS9.Blend.activeImage.call(this, im);
};

// callback when image is displayed
JS9.Blend.imageclose = function(im){
    JS9.Blend.removeImage.call(this, im);
};

// callback when a session is loaded
JS9.Blend.sessionload = function(im){
    if( im ){
	JS9.Blend.init.call(this);
    }
};

// add this plugin into JS9
JS9.RegisterPlugin(JS9.Blend.CLASS, JS9.Blend.NAME, JS9.Blend.init,
		   {menuItem: "Blending",
		    dynamicSelect: true,
		    onplugindisplay: JS9.Blend.init,
		    ondynamicselect: JS9.Blend.dysel,
		    ondisplayblend: JS9.Blend.displayblend,
		    onimageblend: JS9.Blend.imageblend,
		    onimageload: JS9.Blend.imageload,
		    onimagedisplay: JS9.Blend.imagedisplay,
		    onimageclose: JS9.Blend.imageclose,
		    onsessionload: JS9.Blend.sessionload,
		    help: "help/blend.html",
		    winTitle: "Image Blending",
		    winResize: true,
		    winDims: [JS9.Blend.WIDTH, JS9.Blend.HEIGHT]});

/*
 * image blink plugin (March 10, 2016)
 */

/*global $, JS9, sprintf */

"use strict";

// create our namespace, and specify some meta-information and params
JS9.Blink = {};
JS9.Blink.CLASS = "JS9";      // class of plugins (1st part of div class)
JS9.Blink.NAME = "Blink";     // name of this plugin (2nd part of div class)
JS9.Blink.WIDTH =  512;	  // width of light window
JS9.Blink.HEIGHT = 270;	  // height of light window
JS9.Blink.BASE = JS9.Blink.CLASS + JS9.Blink.NAME;  // CSS base class name

// blink rate in milliseconds
JS9.Blink.rate = 1000;

JS9.Blink.blinkModeHTML='When <b>Blink Images</b> is turned on, selected images will be displayed at the specified blink rate. You also can blink the selected images manually. The blink sequence can be changed by moving images around in the stack. <p>$mode&nbsp;&nbsp;&nbsp;&nbsp;$rate&nbsp;&nbsp;&nbsp;&nbsp;$manual';

JS9.Blink.modeHTML='<input type="checkbox" id="active" name="blinkImages" value="active" onclick="javascript:JS9.Blink.xblinkmode(\'%s\', this)"><b>Blink Images</b>';

JS9.Blink.rateHTML='<select class="JS9Select" id="blinkRateSelect" onfocus="this.selectedIndex=0;" onchange="JS9.Blink.xrate(\'%s\',this)"><option selected disabled>blink rate</option><option value="0.1">0.1</option><option value="0.25">0.25</option><option value="0.5">0.5</option><option value="1.0">1.0</option><option value="2.0">2.0</option><option value="3.0">3.0</option><option value="4.0">4.0</option><option value="5.0">5.0</option><option value="6.0">6.0</option><option value="7.0">7.0</option><option value="8.0">8.0</option><option value="9.0">9.0</option><option value="10.0">10.0</option><option value="15.0">15.0</option><option value="20.0">20.0</option><option value="30.0">30.0</option></select>';

JS9.Blink.manualHTML='<input type="button" class="JS9Button2" id="manual" name="manualBlink" value="blink manually" onclick="javascript:JS9.Blink.xblink1(\'%s\', this)">';

JS9.Blink.imageHTML="<span style='float: left'>$active&nbsp;&nbsp;</span><span id='blinkFile'>$imfile</span>";

JS9.Blink.activeHTML='<input class="blinkActiveCheck" type="checkbox" id="active" name="active" value="active" onclick="javascript:JS9.Blink.xactive(\'%s\', \'%s\', this)">blink';

JS9.Blink.imfileHTML='<b>%s</b>';

JS9.Blink.nofileHTML='<p><span id="blinkNoFile">[Images will appear here as they are loaded]</span>';

// start blinking
JS9.Blink.start = function(display){
    let im;
    let done = false;
    const plugin = display.pluginInstances.JS9Blink;
    const saveidx = plugin.idx;
    // sanity check
    if( !plugin ){
	return;
    }
    while( !done ){
	im = JS9.images[plugin.idx];
	if( (im.display === display) && im.tmp.blinkMode ){
	    im.displayImage("display");
	    done = true;
	}
	if( ++plugin.idx >= JS9.images.length ){
	    plugin.idx = 0;
	}
	if( plugin.idx === saveidx ){
	    done = true;
	}
    }
    if( display.blinkMode ){
	display.pluginInstances.JS9Blink.tid = window.setTimeout(() => {
	    JS9.Blink.start(display);
	}, plugin.rate);
    }
};

// stop blinking
JS9.Blink.stop = function(display){
    const plugin = display.pluginInstances.JS9Blink;
    // sanity check
    if( !plugin ){
	return;
    }
    if( plugin.tid ){
	window.clearTimeout(plugin.tid);
	delete plugin.tid;
    }
    display.blinkMode = false;
    plugin.idx = 0;
};

// change active state
JS9.Blink.xactive = function(did, id, target){
    const im = JS9.lookupImage(id, did);
    const active = target.checked;
    if( im ){
	im.tmp.blinkMode = active;
    }
};

// change global blink mode for this display
JS9.Blink.xblinkmode = function(id, target){
    const display = JS9.getDynamicDisplayOr(JS9.lookupDisplay(id));
    const blinkMode = target.checked;
    // change global blink mode
    if( display ){
	$(".blinkActive").prop("disabled", !blinkMode);
	if( blinkMode ){
	    display.blinkMode = true;
	    JS9.Blink.start(display);
	} else {
	    JS9.Blink.stop(display);
	}
    }
};

// change global blink mode for this display
// eslint-disable-next-line no-unused-vars
JS9.Blink.xblink1 = function(id, target){
    const display = JS9.getDynamicDisplayOr(JS9.lookupDisplay(id));
    const plugin = display ? display.pluginInstances.JS9Blink : null;
    // sanity check
    if( !plugin || !display ){
	return;
    }
    // blink once
    if( JS9.images[plugin.idx] === display.image ){
	if( ++plugin.idx >= JS9.images.length ){
	    plugin.idx = 0;
	}
    }
    JS9.Blink.start(display);
};

// change blink rate
JS9.Blink.xrate = function(id, target){
    const display = JS9.getDynamicDisplayOr(JS9.lookupDisplay(id));
    const plugin = display ? display.pluginInstances.JS9Blink : null;
    const rate = Math.floor(target.options[target.selectedIndex].value * 1000);
    // sanity check
    if( !plugin || !display ){
	return;
    }
    if( !Number.isNaN(rate) ){
	plugin.rate = rate;
    }
};

// get a BlinkImage id based on the file image id
JS9.Blink.imid = function(im){
    const id = `${im.display.id}_${im.id}`;
    return `${id.replace(/[^A-Za-z0-9_]/g, "_")}BlinkImage`;
};

// get a class unique between displays
JS9.Blink.dispclass = function(im){
    const id = `${JS9.Blink.BASE}_${im.display.id}`;
    return id.replace(/[^A-Za-z0-9_]/g, "_");
};

// change the active image
JS9.Blink.activeImage = function(im){
    let id, dcls;
    if( im ){
	id = JS9.Blink.imid(im);
	dcls = `${JS9.Blink.dispclass(im)}_Image`;
	$(`.${dcls}`)
	    .removeClass(`${JS9.Blink.BASE}ImageActive`)
	    .addClass(`${JS9.Blink.BASE}ImageInactive`);
	$(`#${id}`)
	    .removeClass(`${JS9.Blink.BASE}ImageInactive`)
	    .addClass(`${JS9.Blink.BASE}ImageActive`);
    }
};

// add an image to the list of available images
JS9.Blink.addImage = function(im){
    let s, id, divjq, dcls, dispid, imid;
    const opts = [];
    const cls = `${JS9.Blink.BASE}Image`;
    if( !im ){
	return;
    }
    // convenience variables
    imid = im.id;
    dispid = im.display.id;
    // unique id
    id = JS9.Blink.imid(im);
    // get class for this layer 
    dcls = `${JS9.Blink.dispclass(im)}_Image`;
    // value to pass to the macro expander
    opts.push({name: "imid", value: im.id});
    opts.push({name: "active", value: sprintf(JS9.Blink.activeHTML, 
					      dispid, imid)});
    opts.push({name: "imfile", value: sprintf(JS9.Blink.imfileHTML, 
					      imid)});
    // remove initial message
    if( !this.blinkDivs ){
	this.blinkImageContainer.html("");
    }
    // create the html for this image
    s = im.expandMacro(JS9.Blink.imageHTML, opts);
    // add image html to the image container
    divjq = $("<div>")
	.addClass(cls)
	.addClass(dcls)
	.attr("id", id)
	.prop("imid", imid)
	.html(s)
	.appendTo(this.blinkImageContainer);
    divjq.on("mousedown touchstart", () => {
	im.displayImage();
	JS9.Blink.activeImage.call(this, im);
    });
    // one more div in the stack
    this.blinkDivs++;
    // no blinking yet
    im.tmp.blinkMode = false;
    //make it the current one
    JS9.Blink.activeImage(im);
};

// remove an image from the list of available images
JS9.Blink.removeImage = function(im){
    let id;
    if( im ){
	id = JS9.Blink.imid(im);
	$(`#${id}`).remove();
	this.blinkDivs--;
	if( this.blinkDivs === 0 ){
	    this.blinkImageContainer.html(JS9.Blink.nofileHTML);
	}
	delete im.tmp.blinkMode;
	return true;
    }
    return false;
};

// constructor: add HTML elements to the plugin
JS9.Blink.init = function(){
    let i, s, im, display, dispid;
    const opts = [];
    // on entry, these elements have already been defined:
    // this.div:      the DOM element representing the div for this plugin
    // this.divjq:    the jquery object representing the div for this plugin
    // this.id:       the id ofthe div (or the plugin name as a default)
    // this.display:  the display object associated with this plugin
    // this.dispMode: display mode (for internal use)
    //
    // create container to hold image container and header
    // initialize params
    if( this.idx === undefined ){
	this.idx = 0;
    }
    if( this.rate === undefined ){
	this.rate = JS9.Blink.rate;
    }
    // clean main container
    this.divjq.html("");
    // no images/divs loaded yet
    this.blinkDivs = 0;
    // allow scrolling on the plugin
    this.divjq.addClass("JS9PluginScrolling");
    // main container
    this.blinkContainer = $("<div>")
	.addClass(`${JS9.Blink.BASE}Container`)
	.attr("id", `${this.id}BlinkContainer`)
        .css("overflow", "auto")
	.appendTo(this.divjq);
    dispid = this.display.id;
    opts.push({name: "mode", value: sprintf(JS9.Blink.modeHTML, 
					    dispid)});
    opts.push({name: "manual", value: sprintf(JS9.Blink.manualHTML, 
					      dispid)});
    opts.push({name: "rate", value: sprintf(JS9.Blink.rateHTML, 
					    dispid)});
    s = JS9.Image.prototype.expandMacro.call(null, JS9.Blink.blinkModeHTML, 
					     opts);
    // header
    this.blinkHeader = $("<div>")
	.addClass(`${JS9.Blink.BASE}Header`)
	.attr("id", `${dispid}Header`)
	.html(s)
	.appendTo(this.blinkContainer);
    // container to hold images
    this.blinkImageContainer = $("<div>")
	.addClass(`${JS9.Blink.BASE}ImageContainer`)
	.attr("id", `${this.id}BlinkImageContainer`)
        .html(JS9.Blink.nofileHTML)
	.appendTo(this.blinkContainer);
    display = JS9.getDynamicDisplayOr(this.display);
    // start with blink mode turned off
    display.blinkMode = false;
    // add currently loaded images
    for(i=0; i<JS9.images.length; i++){
	im = JS9.images[i];
	if( im.display === display ){
	    JS9.Blink.addImage.call(this, im);
	}
    }
    // the images within the image container will be sortable
    this.blinkImageContainer.sortable({
	start: (event, ui) => {
	    this.oidx = ui.item.index();
	},
	stop: (event, ui) => {
	    const nidx = ui.item.index();
	    // change JS9 image array to reflect the change
	    this.display.moveImageInStack(this.oidx, nidx);
	    // redisplay in case something changed
	    if( this.display.image ){
		this.display.image.displayImage();
	    }
	    delete this.oidx;
	}
    });
};

// callback when dynamic selection is made
JS9.Blink.dysel = function(){
    const odisplay = JS9.getDynamicDisplayOr("previous");
    // turn off blink for previously selected display
    if( odisplay ){
	JS9.Blink.stop(odisplay);
    }
    // re-init the plugin
    JS9.Blink.init.call(this);
};

// callback when an image is loaded
JS9.Blink.imageload = function(im){
    const display = JS9.getDynamicDisplayOr(this.display);
    if( im && im.display === display ){
	JS9.Blink.addImage.call(this, im);
    }
};

// callback when image is displayed
JS9.Blink.imagedisplay = function(im){
    JS9.Blink.activeImage.call(this, im);
};

// callback when image is closed
JS9.Blink.imageclose = function(im){
    JS9.Blink.removeImage.call(this, im);
};

// add this plugin into JS9
JS9.RegisterPlugin(JS9.Blink.CLASS, JS9.Blink.NAME, JS9.Blink.init,
		   {menuItem: "Blinking",
		    dynamicSelect: true,
		    onplugindisplay: JS9.Blink.init,
		    ondynamicselect: JS9.Blink.dysel,
		    onimageload: JS9.Blink.imageload,
		    onimagedisplay: JS9.Blink.imagedisplay,
		    onimageclose: JS9.Blink.imageclose,
		    help: "help/blink.html",
		    winTitle: "Image Blinking",
		    winResize: true,
		    winDims: [JS9.Blink.WIDTH, JS9.Blink.HEIGHT]});

/*
 * colormap generation plugin (Feb 13, 2019)
 */

/*global JS9, $, sprintf, tinycolor */

"use strict";

// create our namespace, and specify some meta-information and params
JS9.Cmaps = {};
JS9.Cmaps.CLASS = "JS9";      	// class of plugins (1st part of div class)
JS9.Cmaps.NAME = "Cmaps";     	// name of this plugin (2nd part of div class)
JS9.Cmaps.WIDTH =  600;	  	// width of light window
JS9.Cmaps.HEIGHT = 270;	  	// height of light window
JS9.Cmaps.BASE = JS9.Cmaps.CLASS + JS9.Cmaps.NAME;  // CSS base class name

// defaults
JS9.Cmaps.DEFMODE = "equidistant";
JS9.Cmaps.DEFNMAP = 3;
JS9.Cmaps.DEFASSIGN = true;
JS9.Cmaps.DEFNAME = "cmap";
JS9.Cmaps.DEFTOL = Math.pow(8,2);
JS9.Cmaps.DEFTIMEOUT = 0;
JS9.Cmaps.COLORCLASS = "cmapsColorPicker";
JS9.Cmaps.CMAPCLASS = "cmapsSelect";
JS9.Cmaps.CHECKCLASS = "cmapsActiveCheck";

JS9.Cmaps.headerHTML = `Select a color&nbsp;&nbsp;<input type="color" value="#FF0000" class="${JS9.Cmaps.COLORCLASS}">&nbsp;&nbsp;or a &nbsp;&nbsp;<select class="${JS9.Cmaps.CMAPCLASS} JS9Select" onchange="JS9.Cmaps.xCmap('%s',this)"></select>&nbsp;&nbsp;colormap to create&nbsp;&nbsp;<input type="number" onchange="JS9.Cmaps.xNslice('%s',this)" value="${JS9.Cmaps.DEFNMAP}" min="1" max="36" size="3" style="width:40px;box-sizing: border-box;">&nbsp;&nbsp;<select class="cmapsMode JS9Select" onchange="JS9.Cmaps.xMode('%s',this)">&nbsp;&nbsp;<option value="equidistant">equidistant</option><option value="analogous">analogous</option></select><p>slices of the <a href="https://en.wikipedia.org/wiki/Color_wheel" target="_blank">colorwheel</a>,&nbsp;&nbsp;the first&nbsp;&nbsp;<input type="number" onchange="JS9.Cmaps.xNmap('%s',this)" value="${JS9.Cmaps.DEFNMAP}" min="1" max="36" size="3" style="width:40px;box-sizing: border-box;">&nbsp;of which will be used to create colormaps.<p><input type="checkbox" onchange="JS9.Cmaps.xAssignCmaps('%s',this)" checked> assign the new colormaps to these images:`;

JS9.Cmaps.imageHTML="<span style='float: left'>$active</span>&nbsp;&nbsp; <span style='float: right'>$imfile</span>";

JS9.Cmaps.activeHTML=`<input class="${JS9.Cmaps.CHECKCLASS}" type="checkbox" id="active" name="active" value="active" onclick="javascript:JS9.Cmaps.xActive('%s', '%s', this)">&nbsp;`;

JS9.Cmaps.imfileHTML='<b>%s</b>';

JS9.Cmaps.nofileHTML='<div class="JS9cmapsNoFile">[Colormap generation options will appear here after an image is loaded]</div>';

// equidistant colormaps
JS9.Cmaps.equidistant = function(color, results, slices) {
    let i;
    const hsl = tinycolor(color).toHsl();
    const hue = hsl.h;
    const slice = 360 / slices;
    const ret = [];
    for(i=0; i<results; i++){
        hsl.h = (hue + (i * slice)) % 360;
        ret.push(tinycolor(hsl));
    }
    return ret;
};

// generate colors using one of the complementary algorithms
JS9.Cmaps.mkColors = function(mode, color, nmap, nslice) {
    // sanity check
    if( !color || !nmap || !nslice ){ return; }
    mode = mode || "equidistant";
    switch(mode){
    case "analogous":
	return tinycolor(color).analogous(nmap, nslice);
    case "equidistant":
	return JS9.Cmaps.equidistant(tinycolor(color), nmap, nslice);
    default:
	return [tinycolor(color)];
    }
};

// assign generated colormaps to the active images
JS9.Cmaps.assignCmaps = function(display){
    let clen, container;
    let cur = 0;
    const cid = `.${JS9.Cmaps.BASE}Image`;
    const elid2 = `.${JS9.Cmaps.CHECKCLASS}`;
    // sanity checks
    if( !display.cmaps.names || !display.cmaps.names.length ){ return; }
    // container element from plugin for this display
    container = display.cmaps.that.cmapsImageContainer;
    if( container.length ){
	// number of colormaps to assign
	clen = display.cmaps.names.length;
	// look for image inside this container
	container.find(cid).each((idx, el) => {
	    const qel = $(el);
	    const imid = qel.prop("imid");
	    const im = JS9.lookupImage(imid);
	    const qel2 = qel.find(elid2);
	    // if the image exists and is active
	    if( im && (cur < clen) && qel2.prop("checked") ){
		im.setColormap(display.cmaps.names[cur++]);
		im.displayImage();
	    }
	});
    }
};

// give a colormap, generate new complementary colormaps
JS9.Cmaps.mkCmapsFromCmap = function(display, cmap, nmap, nslice, opts){
    let i, j, tcolor, tcolors, color, index, rgb, mode, cbase;
    const colors = [];
    const vertices = [];
    const rgbs = [];
    const fmt = "rgb (%s,%s,%s)";
    const xrgb3 = (rgb) => {
	return [rgb.r/255, rgb.g/255, rgb.b/255];
    };
    const mkColorCell = (cmap, index) => {
	return JS9.Colormap.prototype.mkColorCell.call(cmap, index);
    };
    // sanity check
    if( !cmap || !nmap || !nslice ){ return; }
    // opts is optional
    opts = opts || {};
    // mode (equidistant, analogous, etc.)
   mode = opts.mode || JS9.Cmaps.DEFMODE;
    // base for colormap name
    cbase = cmap.name;
    // reset names
    display.cmaps.names = [];
    // process "lut" or "sao" type cmaps
    switch(cmap.type){
    case "lut":
	// create n new colormaps
	for(i=0; i<nmap; i++){
	    display.cmaps.names[i] = `${cbase}_${String(i+1)}`;
	    colors[i] = [];
	}
	for(i=0; i<cmap.colors.length; i++){
	    color = sprintf(fmt,
			    Math.floor(cmap.colors[i][0]*255+0.5),
			    Math.floor(cmap.colors[i][1]*255+0.5),
			    Math.floor(cmap.colors[i][2]*255+0.5));
	    tcolors = JS9.Cmaps.mkColors(mode, color, nmap, nslice);
	    for(j=0; j<nmap; j++){
		colors[j].push(xrgb3(tcolors[j].toRgb()));
	    }
	}
	// add new colormaps or edit existing
	for(i=0; i<nmap; i++){
	    cmap = JS9.lookupColormap(display.cmaps.names[i], false);
	    if( cmap ){
		cmap.colors = colors[i];
	    } else {
		JS9.AddColormap(display.cmaps.names[i], colors[i],
				{toplevel: false});
	    }
	}
	if( opts.assign ){
	    JS9.Cmaps.assignCmaps(display);
	}
        break;
    case "sao":
	// create n new colormaps
	for(i=0; i<nmap; i++){
	    display.cmaps.names[i] = `${cmap.name}_${String(i+1)}`;
	    vertices[i] = [[], [], []];
	}
	// for each color (red, green, blue)
	for(i=0; i<3; i++){
	    // for each vertex of this color
	    for(j=0; j<cmap.vertices[i].length; j++){
		index = cmap.vertices[i][j][0];
		rgb = mkColorCell(cmap, index*JS9.COLORSIZE);
		// get rgb for this index and add to array
		rgbs.push({index: index, rgb: rgb});
	    }
	}
	// sort array in ascending order
	rgbs.sort( (a,b) => {
	    if( a.index > b.index ){
		return 1;
	    } else if( a.index < b.index ){
		return -1;
	    }
	    return 0;
	});
	// remove duplicates
	for(i=rgbs.length-2; i>=0; i--){
	    if( rgbs[i].index === rgbs[i+1].index ){
		rgbs.splice(i+1, 1);
	    }
	}
	// generate new colors for each vertex
	for(i=0; i<rgbs.length; i++){
	    color = sprintf(fmt,
			    rgbs[i].rgb[0],
			    rgbs[i].rgb[1],
			    rgbs[i].rgb[2]);
	    tcolors = JS9.Cmaps.mkColors(mode, color, nmap, nslice);
	    // and add these vertices to each array
	    for(j=0; j<nmap; j++){
		tcolor = xrgb3(tcolors[j].toRgb());
		vertices[j][0].push([rgbs[i].index, tcolor[0]]);
		vertices[j][1].push([rgbs[i].index, tcolor[1]]);
		vertices[j][2].push([rgbs[i].index, tcolor[2]]);
	    }
	}
	// add new colormaps or edit existing
	for(i=0; i<nmap; i++){
	    cmap = JS9.lookupColormap(display.cmaps.names[i], false);
	    if( cmap ){
		cmap.vertices = vertices[i];
	    } else {
		JS9.AddColormap(display.cmaps.names[i],
				vertices[i][0],
				vertices[i][1],
				vertices[i][2],
				{toplevel: false});
	    }
	}
	if( opts.assign ){
	    JS9.Cmaps.assignCmaps(display);
	}
        break;
    default:
	break;
    }
};

// give a color, generate new complementary colormaps
JS9.Cmaps.mkCmapsFromColor = function(display, cname, nmap, nslice, opts){
    let color, rgb, tol, diff, mode, cbase;
    // sanity check
    if( !cname || !nmap || !nslice ){ return; }
    // opts is optional
    opts = opts || {};
    // default mode is "equidistant"
    mode = opts.mode || "equidistant";
    // base for colormap name
    cbase = display.id || JS9.Cmaps.DEFNAME;
    // tol passed?
    if( opts.rgbtol !== undefined ){
	tol = opts.rgbtol;
    } else {
	tol = display.cmaps.tol;
    }
    // it was a color
    color = tinycolor(cname);
    // RGB represention
    rgb = color.toRgb();
    // optimization: make sure the color has changed "enough"
    // before we change the colormap
    diff = Math.pow(Math.abs(rgb.r - display.cmaps.orgb.r), 2) +
           Math.pow(Math.abs(rgb.g - display.cmaps.orgb.g), 2) +
           Math.pow(Math.abs(rgb.b - display.cmaps.orgb.b), 2);
    if( diff < tol ){
	return 0;
    }
    if( display.cmaps.timeOutID ){ 
	return 0;
    }
    // use timeout to ensure redisplay gets into the event loop
    display.cmaps.timeOutID = window.setTimeout(() => {
	let i, tcolors, cmap;
	// reset names
	display.cmaps.names = [];
	// generate nmap colors
	tcolors = JS9.Cmaps.mkColors(mode, color, nmap, nslice);
	// save for next iteration
	display.cmaps.orgb.r = rgb.r;
	display.cmaps.orgb.g = rgb.g;
	display.cmaps.orgb.b = rgb.b;
	// process each colormap
	for(i=0; i<nmap; i++){
            rgb = tcolors[i].toRgb();
            display.cmaps.names[i] = `${cbase}_${String(i+1)}`;
	    cmap = JS9.lookupColormap(display.cmaps.names[i], false);
	    // add new colormaps or edit existing
	    if( cmap ){
		switch(cmap.type){
		case "lut":
		    // convert to sao type
		    cmap.type = "sao";
                    cmap.vertices = [[[0,0],[1,rgb.r/255]],
 		                     [[0,0],[1,rgb.g/255]],
		                     [[0,0],[1,rgb.b/255]]];
                    break;
		case "sao":
                    cmap.vertices = [[[0,0],[1,rgb.r/255]],
 		                     [[0,0],[1,rgb.g/255]],
		                     [[0,0],[1,rgb.b/255]]];
                    break;
		}
            } else {
		JS9.AddColormap(display.cmaps.names[i],
				[[0,0],[1,rgb.r/255]],
				[[0,0],[1,rgb.g/255]],
				[[0,0],[1,rgb.b/255]],
				{toplevel: false});
            }
	}
	if( opts.assign ){
	    JS9.Cmaps.assignCmaps(display);
	}
	display.cmaps.timeOutID = null;
    }, JS9.Cmaps.DEFTIMEOUT);
};

// give either a color or a colormap, generate new complementary colormaps
JS9.Cmaps.mkCmaps = function(display, cname, nmap, nslice, opts){
    let cmap;
    // sanity check
    if( !cname || !nmap || !nslice ){ return 0; }
    // color or colormap?
    cmap = JS9.lookupColormap(cname, false);
    // were we passed a color map?
    if( cmap ){
	// make colormaps from this colormap
	JS9.Cmaps.mkCmapsFromCmap(display, cmap, nmap, nslice, opts);
    } else {
	// make colormaps from this color
	JS9.Cmaps.mkCmapsFromColor(display, cname, nmap, nslice, opts);
    }
};

// set the active flag for an image
JS9.Cmaps.xActive = function(id){
    const display = JS9.lookupDisplay(id);
    if( !display ){ return; }
    if( display.cmaps.assign ){
	JS9.Cmaps.assignCmaps(display);
    }
};

// set the algorithm for generating colormaps
JS9.Cmaps.xMode = function(id, target){
    const display = JS9.lookupDisplay(id);
    if( !display ){ return; }
    display.cmaps.mode = target.options[target.selectedIndex].value;
    JS9.Cmaps.mkCmaps(display, display.cmaps.lastCname,
		      display.cmaps.nmap, display.cmaps.nslice,
		      {mode: display.cmaps.mode,
		       assign: display.cmaps.assign,
		       rgbtol: 0});
};

// set the number of colormaps to generate
JS9.Cmaps.xNmap = function(id, target){
    const display = JS9.lookupDisplay(id);
    if( !display ){ return; }
    display.cmaps.nmap = parseInt(target.value, 10) || 1;
    JS9.Cmaps.mkCmaps(display, display.cmaps.lastCname,
		      display.cmaps.nmap, display.cmaps.nslice,
		      {mode: display.cmaps.mode,
		       assign: display.cmaps.assign,
		       rgbtol: 0});
};

// set the number of slices to generate
JS9.Cmaps.xNslice = function(id, target){
    const display = JS9.lookupDisplay(id);
    if( !display ){ return; }
    display.cmaps.nslice = parseInt(target.value, 10) || 1;
    JS9.Cmaps.mkCmaps(display, display.cmaps.lastCname,
		      display.cmaps.nmap, display.cmaps.nslice,
		      {mode: display.cmaps.mode,
		       assign: display.cmaps.assign,
		       rgbtol: 0});
};

// select the colormap to use as a basis for colormap generation
JS9.Cmaps.xCmap = function(id, target){
    const display = JS9.lookupDisplay(id);
    const cname = target.options[target.selectedIndex].value;
    if( !display ){ return; }
    JS9.Cmaps.mkCmaps(display, cname,
		      display.cmaps.nmap, display.cmaps.nslice,
		      {mode: display.cmaps.mode,
		       assign: display.cmaps.assign,
		       rgbtol: 0});
    display.cmaps.lastCname = cname;
};

// set the global flag to assign new colormaps to images
JS9.Cmaps.xAssignCmaps = function(id, target){
    const display = JS9.lookupDisplay(id);
    if( !display ){ return; }
    display.cmaps.assign = $(target).prop("checked");
    if( display.cmaps.assign ){
	JS9.Cmaps.assignCmaps(display);
    }
};

// get an id based on the file image id
JS9.Cmaps.imid = function(im){
    const id = `${im.display.id}_${im.id}`;
    return `${id.replace(/[^A-Za-z0-9_]/g, "_")}CmapsImage`;
};

// get a class unique between displays
JS9.Cmaps.dispclass = function(){
    const id = `${JS9.Cmaps.BASE}_${this.display.id}`;
    return id.replace(/[^A-Za-z0-9_]/g, "_");
};

// change the active image
JS9.Cmaps.activeImage = function(im){
    let id, dcls;
    if( im ){
	id = JS9.Cmaps.imid.call(this, im);
	dcls = `${JS9.Cmaps.dispclass.call(this)}_Image`;
	$(`.${dcls}`)
	    .removeClass(`${JS9.Cmaps.BASE}ImageActive`)
	    .addClass(`${JS9.Cmaps.BASE}ImageInactive`);
	$(`#${id}`)
	    .removeClass(`${JS9.Cmaps.BASE}ImageInactive`)
	    .addClass(`${JS9.Cmaps.BASE}ImageActive`);
    }
};

// add an image to the list of available images
JS9.Cmaps.addImage = function(im){
    let s, id, divjq, dcls, dispid, imid;
    const opts = [];
    const cls = `${JS9.Cmaps.BASE}Image`;
    if( !im ){
	return;
    }
    // convenience variables
    imid = im.id;
    dispid = this.display.id;
    // unique id
    id = JS9.Cmaps.imid.call(this, im);
    // get class for this layer 
    dcls = `${JS9.Cmaps.dispclass.call(this)}_Image`;
    // value to pass to the macro expander
    opts.push({name: "imid", value: imid});
    opts.push({name: "active", value: sprintf(JS9.Cmaps.activeHTML, 
					      dispid, imid)});
    opts.push({name: "imfile", value: sprintf(JS9.Cmaps.imfileHTML, 
					      imid)});
    // create the html for this image
    s = JS9.Image.prototype.expandMacro.call(im, JS9.Cmaps.imageHTML, opts);
    // add image html to the image container
    divjq = $("<div>")
	.addClass(cls)
	.addClass(dcls)
	.addClass(`${JS9.Cmaps.BASE}ImageInactive`)
	.prop("id", id)
	.prop("imid", imid)
	.html(s)
	.appendTo(this.cmapsImageContainer);
    divjq.on("mousedown touchstart", () => {
	if( dispid === im.display.id ){
	    im.displayImage();
	    JS9.Cmaps.activeImage.call(this, im);
	}
    });
    // make it the current one (if its display in this display)
    if( this.display.id === im.display.id ){
	JS9.Cmaps.activeImage.call(this, im);
    }
};

// remove an image to the list of available images
JS9.Cmaps.removeImage = function(im){
    let id;
    if( im ){
	id = JS9.Cmaps.imid.call(this, im);
	$(`#${id}`).remove();
	return true;
    }
    return false;
};

// plugin initialization
JS9.Cmaps.init = function(width, height){
    let i, dispid, html, el1, el2;
    const elid1 = `.${JS9.Cmaps.COLORCLASS}`;
    const elid2 = `.${JS9.Cmaps.CMAPCLASS}`;
    const display = this.display;
    // on entry, these elements have already been defined:
    // this.div:      the DOM element representing the div for this plugin
    // this.divjq:    the jquery object representing the div for this plugin
    // this.id:       the id ofthe div (or the plugin name as a default)
    // this.display:  the display object associated with this plugin
    // this.dispMode: display mode (for internal use)
    //
    // allow scrolling on the plugin
    this.divjq.addClass("JS9PluginScrolling");
    // allow size specification for divs
    if( this.winType === "div" ){
	// set width and height on div
	this.width = this.divjq.attr("data-width");
	if( !this.width  ){
	    this.width = width || JS9.Cmaps.WIDTH;
	}
	this.divjq.css("width", this.width);
	this.width = parseInt(this.divjq.css("width"), 10);
	this.height = this.divjq.attr("data-height");
	if( !this.height ){
	    this.height = height || JS9.Cmaps.HEIGHT;
	}
	this.divjq.css("height", this.height);
	this.height = parseInt(this.divjq.css("height"), 10);
    }
    // not much to do until colormaps are available
    if( !JS9.colormaps || !JS9.colormaps.length ){
	this.divjq.html(JS9.Cmaps.nofileHTML);
	return;
    }
    // init cmaps object once
    if( !display.cmaps ){
	display.cmaps = {};
	display.cmaps.mode = JS9.Cmaps.DEFMODE;
	display.cmaps.nmap = JS9.Cmaps.DEFNMAP;
	display.cmaps.nslice = JS9.Cmaps.DEFNMAP;
	display.cmaps.assign = JS9.Cmaps.DEFASSIGN;
	display.cmaps.tol = JS9.Cmaps.DEFTOL;
	display.cmaps.lastCname = null;
	display.cmaps.names = [];
	display.cmaps.ims = [];
	display.cmaps.orgb = {r: 0, g: 0, b: 0};
	display.cmaps.that = this;
    }
    // clear main div
    this.divjq.html("");
    // add main container
    this.cmapsContainer = $("<div>")
	.addClass(`${JS9.Cmaps.BASE}Container`)
	.attr("id", `${this.id}CMapsContainer`)
	.appendTo(this.divjq);
    // add header
    dispid = this.display.id;
    html = sprintf(JS9.Cmaps.headerHTML,
		   dispid, dispid, dispid, dispid, dispid);
    this.cmapsHeader = $("<div>")
	.addClass(`${JS9.Cmaps.BASE}Header`)
	.attr("display", this.display.id)
	.attr("id", `${this.display.id}CMapsHeader`)
	.html(html)
	.appendTo(this.cmapsContainer);
    // container to hold images
    this.cmapsImageContainer = $("<div>")
	.addClass(`${JS9.Cmaps.BASE}ImageContainer`)
	.attr("id", `${this.id}CmapsImageContainer`)
	.appendTo(this.cmapsContainer);
    for(i=0; i<JS9.images.length; i++){
	JS9.Cmaps.addImage.call(this, JS9.images[i]);
    }
    // the images within the image container will be sortable
    this.cmapsImageContainer.sortable({
	start: (event, ui) => {
	    this.oidx = ui.item.index();
	},
	stop: (event, ui) => {
	    const nidx = ui.item.index();
	    // change JS9 image array to reflect the change
	    this.display.moveImageInStack(this.oidx, nidx);
	    // redisplay in case something changed
	    if( this.display.image ){
		this.display.image.displayImage();
	    }
	    delete this.oidx;
	}
    });
    // convenience variables
    el1 = this.cmapsContainer.find(elid1);
    el2 = this.cmapsContainer.find(elid2);
    // set up colormap select menu
    el2.each( () => {
	let i, cmap;
	for(i=0; i<JS9.colormaps.length; i++){
	    cmap = JS9.colormaps[i].name;
	    $(elid2).append($('<option>', {value: cmap, text: cmap}));
	}
    });
    // only do once
    if( !display.cmaps.inited ){
	// set up event callbacks
	if( !JS9.globalOpts.internalColorPicker ||
	    !$.fn.spectrum.inputTypeColorSupport() ){
	    el1.spectrum({showButtons: false,
			  showInput: true,
			  preferredFormat: "hex6"});
	    // when the color is changed via the spectrum
	    el1.on('move.spectrum', (evt, tinycolor) => {
		const cname = tinycolor.toHex();
		JS9.Cmaps.mkCmaps(display, cname,
				  display.cmaps.nmap, display.cmaps.nslice,
				  {mode: display.cmaps.mode,
				   assign: display.cmaps.assign});
		display.cmaps.lastCname = cname;
	    });
	    // when the color is changed via the text box
	    el1.on("change", (evt) => {
		const cname = tinycolor($(evt.currentTarget).val()).toHex();
		JS9.Cmaps.mkCmaps(display, cname,
				  display.cmaps.nmap, display.cmaps.nslice,
				  {mode: display.cmaps.mode,
				   assign: display.cmaps.assign});
		display.cmaps.lastCname = cname;
	    });
	}
	el1.on("input", (evt) => {
	    const cname = evt.target.value;
	    const pdisplay = $(evt.target).parent().attr("display");
	    if( pdisplay !== display.id ){
		return;
	    }
            JS9.Cmaps.mkCmaps(display, cname,
			      display.cmaps.nmap, display.cmaps.nslice,
			      {mode: display.cmaps.mode,
			       assign: display.cmaps.assign});
	    display.cmaps.lastCname = cname;
	});
	display.cmaps.inited = true;
    }
};

// callback when an image is loaded
JS9.Cmaps.imageload = function(im){
    let i, display, pinst;
    if( !this.display.cmaps ){
	JS9.Cmaps.init.call(this);
    } else {
	JS9.Cmaps.addImage.call(this, im);
    }
    // add image to other displays as well
    for(i=0; i<JS9.displays.length; i++){
	display = JS9.displays[i];
	if( display.image && display.id !== im.display.id ){
	    pinst = display.pluginInstances.JS9Cmaps;
	    if( pinst && pinst.isActive("onimageload") ){
		JS9.Cmaps.addImage.call(pinst, im);
	    }
	}
    }
};

// callback when image is displayed
JS9.Cmaps.imagedisplay = function(im){
    JS9.Cmaps.activeImage.call(this, im);
};

// callback when image is displayed
JS9.Cmaps.imageclose = function(im){
    let i, display, pinst;
    JS9.Cmaps.removeImage.call(this, im);
    // remove image from other displays as well
    for(i=0; i<JS9.displays.length; i++){
	display = JS9.displays[i];
	if( display.image && display.id !== im.display.id ){
	    pinst = display.pluginInstances.JS9Cmaps;
	    if( pinst && pinst.isActive("onimageclose") ){
		JS9.Cmaps.removeImage.call(pinst, im);
	    }
	}
    }
};

// add this plugin into JS9
JS9.RegisterPlugin(JS9.Cmaps.CLASS, JS9.Cmaps.NAME, JS9.Cmaps.init,
		   {menuItem: "Colormaps",
		    help: "help/cmaps.html",
		    onimageload: JS9.Cmaps.imageload,
		    onimagedisplay: JS9.Cmaps.imagedisplay,
		    onimageclose: JS9.Cmaps.imageclose,
		    winTitle: "Create Colormaps",
		    winResize: true,
		    winDims: [JS9.Cmaps.WIDTH, JS9.Cmaps.HEIGHT]});
/*
 * colorbar plugin (March 8, 2016)
 */

/*global $, JS9, Uint8Array */

"use strict";

// create our namespace, and specify some meta-information and params
JS9.Colorbar = {};
JS9.Colorbar.CLASS = "JS9";      // class of plugins (1st part of div class)
JS9.Colorbar.NAME = "Colorbar";  // name of this plugin (2nd part of div class)
JS9.Colorbar.WIDTH =  512;	 // width of light window
JS9.Colorbar.HEIGHT = 40;	 // height of light window
JS9.Colorbar.BASE = JS9.Colorbar.CLASS + JS9.Colorbar.NAME;
// if TRUE, use psColors, otherwise use unscaled colorCells
JS9.Colorbar.SCALED = false;
// number of ticks in the colorbar
JS9.Colorbar.TICKS = 10;
// height of colorbar inside plugin
JS9.Colorbar.COLORBARHEIGHT = 16;
// JS9.Colorbar.COLORBARFONT = "11pt Arial";
// max label length before we start skipping some labels
JS9.Colorbar.MAXLABELSIZE  = 10;
JS9.Colorbar.STATICSIZE    =  4;
JS9.Colorbar.STATICPADDING =  3;
// how much to add for Infinity
JS9.Colorbar.INFINITY = 10;

// redraw colorbar on display
JS9.Colorbar.display = function(im){
    let i, j, prec, idx, idx0, colorBuf, tval, ix, iy, lastix, done;
    let dmin, dmax, dval, color, label, dolabel;
    const tlabels = [];
    const canvasWidth = this.colorbarWidth;
    const canvasHeight = this.colorbarHeight;
    const colorImg = this.ctx.getImageData(0, 0, canvasWidth, canvasHeight);
    const colorData = colorImg.data;
    const colorWidth = canvasWidth * 4;
    const colorBuf0 = new Uint8Array(colorData.buffer, 0, colorWidth);
    const drawLabel = (ix, iy, label, dolabel) => {
	this.textctx.textAlign = "center";
	this.textctx.beginPath();
	this.textctx.moveTo(ix, iy);
	this.textctx.lineWidth = 1;
	this.textctx.lineTo(ix, iy+5);
	this.textctx.stroke();
	if( dolabel ){
	    this.textctx.fillText(label, ix, iy+15);
	}
    };
    if( im.staticObj ){
	// find min and max in the static range
	dmin = 0
	dmax = 0;
	for(i=0; i<im.staticObj.colors.length; i++){
	    color = im.staticObj.colors[i];
	    if( color.min < dmin ){
		if( color.max === -Infinity ){
		    dmin = dmin - JS9.Colorbar.INFINITY;
		} else {
		    dmin = color.min;
		}
	    }
	    if( color.max > dmax ){
		if( color.max === Infinity ){
		    dmax = dmax + JS9.Colorbar.INFINITY ;
		} else {
		    dmax = color.max;
		}
	    }
	}
	// first line gets colors from static lookup
	idx0 = (dmax - dmin) / canvasWidth;
	for(i=0, j=0; i<canvasWidth; i++, j+=4){
	    dval = Math.floor(i * idx0);
	    color = JS9.lookupStaticColor(im, dval);
	    colorData[j]   = color.red;
	    colorData[j+1] = color.green;
	    colorData[j+2] = color.blue;
	    colorData[j+3] = color.alpha;
	}
    } else {
	// scaled or unscaled display?
	if( this.scaled ){
	    colorBuf = im.psColors;
	} else {
	    colorBuf = im.colorCells;
	}
	// sanity check
	if( !colorBuf ){
	    JS9.Colorbar.imageclear(im);
	    return;
	}
	// first line gets colors from main display's rgb array
	idx0 = colorBuf.length / canvasWidth;
	for(i=0, j=0; i<canvasWidth; i++, j+=4){
	    idx = Math.floor(i * idx0);
	    colorData[j]   = colorBuf[idx][0];
	    colorData[j+1] = colorBuf[idx][1];
	    colorData[j+2] = colorBuf[idx][2];
	    colorData[j+3] = 255;
	}
    }
    // other lines get a copy of the first line
    for(i=1; i<canvasHeight; i++){
	colorData.set(colorBuf0, i * colorWidth);
    }
    // display colorbar
    this.ctx.putImageData(colorImg, 0, 0);
    // if we are not displaying the tick marks, we're done
    if( !this.showTicks ){
	return;
    }
    // clear tick display
    this.textctx.clear();
    if( im.staticObj ){
	prec = JS9.floatPrecision(dmin, dmax);
	lastix = -99999;
	for(i=0; i<im.staticObj.colors.length; i++){
	    color = im.staticObj.colors[i];
	    label = JS9.floatFormattedString(color.min, prec, 0);
	    ix = Math.ceil(color.min / idx0) + 1;
	    iy = 0;
	    // if the label is going to be wide, skip even ones
	    if( (Math.abs(ix - lastix) <= JS9.Colorbar.STATICPADDING)        ||
		((label.length >= JS9.Colorbar.STATICSIZE) && (i % 2 === 0)) ){
		dolabel = false;
	    } else {
		lastix = ix;
		dolabel = true;
	    }
	    drawLabel(ix, iy, label, dolabel);
	}
    } else {
	// display tick marks
	idx0 = im.psInverse.length / this.ticks;
	// get precision estimate
	prec = JS9.floatPrecision(Math.min(im.params.scalemin,im.psInverse[0]),
	     Math.max(im.params.scalemax, im.psInverse[im.psInverse.length-1]));
	// make labels, with a feeble attempt to avoid duplicates
	for(j=0; j<5; j++){
	    done = true;
	    // gather array of labels
	    for(i=0; i<this.ticks; i++){
		tval = im.psInverse[Math.floor(i*idx0)];
		tlabels[i] = JS9.floatFormattedString(tval, prec, j);
	    }
	    // look for dups
	    for(i=1; i<this.ticks; i++){
		if( tlabels[i-1] === tlabels[i] ){
		    done = false;
		}
	    }
	    // done if no dups
	    if( done ){
		break;
	    }
	}
	// draw tick marks and labels
	for(i=1; i<this.ticks; i++){
	    // skip repeats
	    if( (i > 1) && (tlabels[i] === tlabels[i-1]) ){
		continue;
	    }
	    ix = (i/this.ticks)*this.width;
	    iy = 0;
	    // if the label is going to be wide, skip even ones
	    if( (tlabels[i].length >= JS9.Colorbar.MAXLABELSIZE) &&
		(i % 2 === 0) ){
		dolabel = false;
	    } else {
		dolabel = true;
	    }
	    drawLabel(ix, iy, tlabels[i], dolabel);
	}
    }
};

// constructor: add HTML elements to the plugin
JS9.Colorbar.init = function(width, height){
    const ratio = JS9.PIXEL_RATIO || 1;
    // on entry, these elements have already been defined:
    // this.div:      the DOM element representing the div for this plugin
    // this.divjq:    the jquery object representing the div for this plugin
    // this.id:       the id of the div (or the plugin name as a default)
    // this.display:  the display object associated with this plugin
    // this.dispMode: display mode (for internal use)
    //
    // set width and height of plugin itself
    // display the tick marks? this will influence some height params ...
    this.showTicks = this.divjq.attr("data-showTicks");
    if( this.showTicks === undefined ){
	this.showTicks = true;
    } else if( this.showTicks === "true" ){
	this.showTicks = true;
    } else {
	this.showTicks = false;
    }
    this.width = this.divjq.attr("data-width");
    if( !this.width  ){
	this.width = width || JS9.Colorbar.WIDTH;
    }
    this.divjq.css("width", this.width);
    this.width = parseInt(this.divjq.css("width"), 10);
    this.height = this.divjq.attr("data-height");
    if( !this.height ){
	// no tick mark display: default height becomes colorbar height
	if( this.showTicks ){
	    this.height = height || JS9.Colorbar.HEIGHT;
	} else {
	    this.height = height || JS9.Colorbar.COLORBARHEIGHT;
	}
    }
    this.divjq.css("height", this.height);
    this.height = parseInt(this.divjq.css("height"), 10);
    // height of colorbar inside plugin
    this.colorbarWidth = this.width;
    this.colorbarHeight = parseInt(this.divjq.attr("data-colorbarHeight"), 10);
    if( !this.colorbarHeight ){
	this.colorbarHeight  = JS9.Colorbar.COLORBARHEIGHT;
    }
    // but no larger than the overall height
    this.colorbarHeight = Math.min(this.height, this.colorbarHeight);
    // display scaled or unscaled colorbar?
    this.scaled = this.divjq.attr("data-scaled");
    if( this.scaled === undefined ){
	this.scaled  = JS9.Colorbar.SCALED;
    } else if( this.scaled === "true" ){
	this.scaled = true;
    } else {
	this.scaled = false;
    }
    // tick marks
    this.ticks = this.divjq.attr("data-ticks");
    if( !this.ticks ){
	this.ticks = JS9.Colorbar.TICKS;
    }
    // clean plugin container
    this.divjq.html("");
    // colorbar container
    this.colorbarContainer = $("<div>")
	.addClass(`${JS9.Colorbar.BASE}Container`)
	.attr("id", `${this.id}Container`)
        .attr("width", this.width)
        .attr("height", this.height)
	.appendTo(this.divjq);
    // main canvas
    this.colorbarjq = $("<canvas>")
	.addClass(`${JS9.Colorbar.BASE}Canvas`)
	.attr("id", `${this.id}Canvas`)
        .attr("width", this.width-1)
        .attr("height", this.colorbarHeight)
	.appendTo(this.colorbarContainer);
    this.ctx = this.colorbarjq[0].getContext("2d");
    // set up for text display?
    if( this.showTicks ){
	// numeric text and tick marks
	// (height and width changes deal with HiDPI text blur problems!)
	this.textjq = $("<canvas>")
	    .addClass(`${JS9.Colorbar.BASE}TextCanvas`)
	    .attr("id", `${this.id}TextCanvas`)
            .attr("width", this.width * ratio)
            .attr("height", (this.height - this.colorbarHeight) * ratio)
            .css("width", `${this.width}px`)
            .css("height", `${this.height - this.colorbarHeight}px`)
	    .appendTo(this.colorbarContainer);
	this.textctx = this.textjq[0].getContext("2d");
	// font specified in data property of div element?
	this.colorbarFont = this.divjq.attr("data-colorbarFont");
	if( this.colorbarFont ){
	    this.textctx.font = this.colorbarFont;
	} else if( JS9.Colorbar.COLORBARFONT ){
	    this.textctx.font = JS9.Colorbar.COLORBARFONT;
	}
	this.textctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    }
    // display current colorbar, if necessary
    if( this.display.image ){
	JS9.Colorbar.display.call(this, this.display.image);
    }
};

// callback when image is (re-)displayed
JS9.Colorbar.imagedisplay = function(im){
    if( im ){
	JS9.Colorbar.display.call(this, im);
    }
};

// callback when image is cleared or closed
JS9.Colorbar.imageclear = function(im){
    if( im && (im === im.display.image) ){
	// clear buffers
	if( this.ctx ){
	    this.ctx.clear();
	}
	if( this.textctx ){
	    this.textctx.clear();
	}
    }
};

// dynamic change
JS9.Colorbar.dynamic = function(im){
    let colorbar;
    if( im ){
	colorbar = im.display.pluginInstances.JS9Colorbar;
	if( colorbar && colorbar.isDynamic ){
	    JS9.Colorbar.imagedisplay.call(this, im);
	}
    }
};

// add this plugin into JS9
JS9.RegisterPlugin(JS9.Colorbar.CLASS, JS9.Colorbar.NAME, JS9.Colorbar.init,
		   {menuItem: "Colorbar",
		    dynamicSelect: true,
		    ondynamicselect: JS9.Colorbar.dynamic,
		    onimagedisplay: JS9.Colorbar.imagedisplay,
		    onimageclear: JS9.Colorbar.imageclear,
		    onimageclose: JS9.Colorbar.imageclear,
		    help: "help/colorbar.html",
		    winTitle: "Colorbar",
		    winDims: [JS9.Colorbar.WIDTH, JS9.Colorbar.HEIGHT]});
/*
 * color controls plugin (March 18, 2020)
 */

/*global $, JS9, sprintf */

"use strict";

// create our namespace, and specify some meta-information and params
JS9.Color = {};
JS9.Color.CLASS = "JS9";      // class of plugins
JS9.Color.NAME = "Color";     // name of this plugin
JS9.Color.WIDTH = 512;        // width of light window
JS9.Color.HEIGHT = 140;       // height of light window
JS9.Color.BASE = JS9.Color.CLASS + JS9.Color.NAME;
JS9.Color.RUNMENU = true;     // does changing the menu execute run?

JS9.Color.colorHTML=`<p><div class='JS9ColorLinegroup'>$cmaps1&nbsp;&nbsp;$cmaps2&nbsp;&nbsp;$cmaps&nbsp;&nbsp;$filters</div>
<p>
<div class='JS9ColorLinegroup'>$conbibtn&nbsp;&nbsp;$contrast&nbsp;&nbsp;$bias</div>
<p>
<div class='JS9ColorLinegroup'>$run&nbsp;&nbsp;$opacity&nbsp;&nbsp;$from&nbsp;&nbsp;$opfloor&nbsp;&nbsp;$opopacity&nbsp;&nbsp;$opoverlay&nbsp;&nbsp;$opmask</div>`
;

JS9.Color.cmaps1HTML = '<select class="JS9Select JS9Cmaps1 JS9ColorSelect JS9ColorCol1" name="cmaps1" onchange="JS9.Color.xsetcolor(\'%s\', \'%s\', \'top\', this)">%s</select>';

JS9.Color.cmaps2HTML = '<select class="JS9Select JS9Cmaps2 JS9ColorSelect JS9ColorCol2" name="cmaps2" onchange="JS9.Color.xsetcolor(\'%s\', \'%s\', \'other\', this)">%s</select>';

JS9.Color.cmapsHTML = '<input type="button" class="JS9Button2 JS9ColorCmaps JS9ColorButton JS9ColorCol3" name="cmaps" value="Create cmaps" onclick="javascript:JS9.DisplayPlugin(\'JS9Cmaps\', {\'display\': \'%s\'})">';

JS9.Color.filtersHTML = '<input type="button" class="JS9Button2 JS9ColorFilters JS9ColorButton JS9ColorCol4" name="filters" value="Image filters" onclick="javascript:JS9.DisplayPlugin(\'JS9Filters\', {\'display\': \'%s\'})">';

JS9.Color.conbibtnHTML = '<input type="button" class="JS9Button2 JS9ColorConBiBtn JS9ColorButton JS9ColorCol1" name="conbibtn" value="Contrast/bias &rarr;" onclick="javascript:JS9.Color.xconbi(\'%s\', \'%s\', this)">';

JS9.Color.contrastHTML = '<input type="text" class="JS9ColorContrast JS9ColorInput JS9ColorCol2 js9Input" name="contrast" value="%s" autocapitalize="off" autocorrect="off" placeholder="contrast">';

JS9.Color.biasHTML = '<input type="text" class="JS9ColorBias JS9ColorInput JS9ColorCol3 js9Input" name="bias" value="%s" autocapitalize="off" autocorrect="off" placeholder="bias">';

JS9.Color.runHTML = '<input type="button" class="JS9Button2 JS9ColorRun JS9ColorButton JS9ColorCol1" name="run" value="Opacity &rarr;" onclick="javascript:JS9.Color.xopacity(\'%s\', \'%s\', this)">';

JS9.Color.opacityHTML = '<input type="text" class="JS9ColorOpacity JS9ColorInput JS9ColorCol2 js9Input" name="opacity" value="" autocapitalize="off" autocorrect="off">';

JS9.Color.fromHTML = '<select class="JS9Select JS9ColorFrom JS9ColorSelect JS9ColorCol3" name="from" onchange="JS9.Color.xfrom(\'%s\', \'%s\', this)">%s</select>';

JS9.Color.opfloorHTML = '<input type="text" class="JS9ColorOpFloor JS9ColorInput JS9ColorCol4 js9Input" name="opfloor" value="%s" autocapitalize="off" autocorrect="off">';

JS9.Color.opopacityHTML = '<select class="JS9Select JS9ColorOpOpacity JS9ColorSelect JS9ColorCol4" name="opopacity" onchange="JS9.Color.xsetfile(\'%s\', \'%s\', \'opacity\', this)">%s</select>';

JS9.Color.opoverlayHTML = '<select class="JS9Select JS9ColorOpOverlay JS9ColorSelect JS9ColorCol4" name="opoverlay" onchange="JS9.Color.xsetfile(\'%s\', \'%s\', \'overlay\', this)">%s</select>';

JS9.Color.opmaskHTML = '<select class="JS9Select JS9ColorOpMask JS9ColorSelect JS9ColorCol4" name="opmask" onchange="JS9.Color.xsetfile(\'%s\', \'%s\', \'mask\', this)">%s</select>';

JS9.Color.fmt = function(val, n){
    val = val + 0.5 * Math.pow(10,-(n+1));
    return val.toFixed(n);
};

// change color via menu
JS9.Color.xsetcolor = function(did, id, which, target){
    const im = JS9.lookupImage(id, did);
    if( im ){
	if( typeof target === "object" ){
	    im.setColormap(target.value);
	}
	switch(which){
	case "top":
	    if( typeof target === "string" ){
		$(".JS9Cmaps1 option").filter(function(){
		    return $(this).text().trim() === target;
		}).prop("selected", true);
	    }
	    $(".JS9Cmaps2").prop("selectedIndex", 0);
	    break;
	case "other":
	    if( typeof target === "string" ){
		$(".JS9Cmaps2 option").filter(function(){
		    return $(this).text().trim() === target;
		}).prop("selected", true);
	    }
	    $(".JS9Cmaps1").prop("selectedIndex", 0);
	    break;
	default:
	    break;
	}
    }
};

// set contrast and bias
JS9.Color.xconbi = function(did, id, target){
    let s1, s2, pel;
    const im = JS9.lookupImage(id, did);
    if( im ){
	pel = $(target).parent();
	s1 = pel.find("[name='contrast']").val();
	s2 = pel.find("[name='bias']").val();
	if( JS9.isNumber(s1) && JS9.isNumber(s2) ){
	    im.setColormap(parseFloat(s1), parseFloat(s2));
	}
    }
};

// set global opacity
JS9.Color.xopacity = function(did, id, target){
    let s1, s2, obj, plugin;
    const pel = $(target).parent();
    const from = pel.find("[name='from']").val();
    const im = JS9.lookupImage(id, did);
    if( im ){
	plugin = im.display.pluginInstances.JS9Color;
	switch(from){
	case "floor":
	    if( plugin.lastfrom.match(/mask|global/) ){
		s1 = String(im.params.flooropacity);
	    } else {
		s1 = pel.find("[name='opacity']").val();
		if( s1 === undefined ){
		    s1 = String(im.params.flooropacity);
		}
	    }
	    s2 = pel.find("[name='opfloor']").val();
	    if( s1.match(/resetall/) ){
		im.setOpacity("resetall");
	    } else if( !s1 || s1.match(/reset/) ){
		im.setOpacity("resetfloor");
	    } else if( JS9.isNumber(s1) && JS9.isNumber(s2) ){
		im.setOpacity(parseFloat(s2), parseFloat(s1));
	    }
	    break;
	case "opacity":
	case "overlay":
	case "mask":
	    s1 = pel.find(`[name='op${from}']`).val();
	    if( s1 !== "none" ){
		obj = {mode: from};
		if( from === "mask" ){
		    if( plugin.lastfrom.match(/floor|global/) ){
			s2 = String(im.mask.vopacity || 0);
		    } else {
			s2 = pel.find("[name='opacity']").val();
			if( s2 === undefined ){
			    s2 = String(im.mask.vopacity || 0);
			}
		    }
		    if( s1 && JS9.isNumber(s2) ){
			obj.opacity = parseFloat(s2);
		    }
		}
		im.maskImage(s1, obj);
	    }
	    break;
	case "global":
	default:
	    if( plugin.lastfrom.match(/floor|mask/) ){
		s1 = String(im.getOpacity().opacity);
	    } else {
		s1 = pel.find("[name='opacity']").val();
		if( s1 === undefined ){
		    s1 = String(im.getOpacity().opacity);
		}
	    }
	    if( s1.match(/resetall/) ){
		im.setOpacity("resetall");
	    } else if( !s1 || s1.match(/reset/) ){
		im.setOpacity("reset");
	    } else if( JS9.isNumber(s1) ){
		im.setOpacity(parseFloat(s1));
	    }
	    break;
	}
	JS9.Color.refrom.call(plugin, im);
	JS9.Color.reopacity.call(plugin, im);
    }
};

// set where we are getting opacity from
JS9.Color.xfrom = function(did, id, target){
    let plugin;
    const pel = $(target).parent();
    const from = target.value;
    const im = JS9.lookupImage(id, did);
    if( im ){
	plugin = im.display.pluginInstances.JS9Color;
	JS9.Color.refrom.call(plugin, im);
	JS9.Color.reopacity.call(plugin, im);
	if( plugin.runmenu ){
	    // as if we clicked run
	    pel.find("[name='run']").click();
	}
    }
    plugin.lastfrom = from;
};

JS9.Color.xsetfile = function(did, id, mode, target){
    let obj, s;
    const pel = $(target).parent();
    const im = JS9.lookupImage(id, did);
    if( im ){
	if( target.value === "none" ){
	    im.maskImage(false);
	} else {
	    obj = {mode: mode};
	    switch(mode){
	    case "mask":
		s = pel.find("[name='opacity']").val();
		if( JS9.isNumber(s) ){
		    obj.opacity = parseFloat(s);
		}
		break;
	    default:
		break;
	    }
	    im.maskImage(target.value, obj);
	}
    }
};

// when contrast/bias changes
JS9.Color.reconbi = function(){
    let obj;
    const pel = this.colorContainer;
    if( this.display.image ){
	obj = this.display.image.getColormap();
	pel.find("[name='contrast']").val(JS9.Color.fmt(obj.contrast, 4));
	pel.find("[name='bias']").val(JS9.Color.fmt(obj.bias, 4));
    }
};

// display elemements based on current from value
JS9.Color.refrom = function(im){
    let from;
    const pel = this.colorContainer;
    from = pel.find("[name='from']").val() || "global";
    im = im || this.display.image;
    if( im ){
	switch(from){
	case "global":
	    pel.find(".JS9ColorOpacity").css("display", "block")
		.attr("placeholder", "global opacity");
	    pel.find(".JS9ColorOpFloor").css("display", "none");
	    pel.find(".JS9ColorOpOpacity").css("display", "none");
	    pel.find(".JS9ColorOpOverlay").css("display", "none");
	    pel.find(".JS9ColorOpMask").css("display", "none");
	    break;
	case "floor":
	    pel.find(".JS9ColorOpacity").css("display", "block")
		.attr("placeholder", "floor opacity");
	    pel.find(".JS9ColorOpFloor").css("display", "block")
		.attr("placeholder", "floor value");
	    pel.find(".JS9ColorOpOpacity").css("display", "none");
	    pel.find(".JS9ColorOpOverlay").css("display", "none");
	    pel.find(".JS9ColorOpMask").css("display", "none");
	    break;
	case "opacity":
	    pel.find(".JS9ColorOpacity").css("display", "none");
	    pel.find(".JS9ColorOpFloor").css("display", "none");
	    pel.find(".JS9ColorOpOpacity").css("display", "block");
	    pel.find(".JS9ColorOpOverlay").css("display", "none");
	    pel.find(".JS9ColorOpMask").css("display", "none");
	    break;
	case "overlay":
	    pel.find(".JS9ColorOpacity").css("display", "none");
	    pel.find(".JS9ColorOpFloor").css("display", "none");
	    pel.find(".JS9ColorOpOpacity").css("display", "none");
	    pel.find(".JS9ColorOpOverlay").css("display", "block");
	    pel.find(".JS9ColorOpMask").css("display", "none");
	    break;
	case "mask":
	    pel.find(".JS9ColorOpacity").css("display", "block")
		.attr("placeholder", "non-mask opacity");
	    pel.find(".JS9ColorOpFloor").css("display", "none");
	    pel.find(".JS9ColorOpOpacity").css("display", "none");
	    pel.find(".JS9ColorOpOverlay").css("display", "none");
	    pel.find(".JS9ColorOpMask").css("display", "block");
	    break;
	default:
	    break;
	}
    }
};

// redisplay opacity value
JS9.Color.reopacity = function(im){
    let from, obj, opacity, value;
    const pel = this.colorContainer;
    from = pel.find("[name='from']").val() || "global";
    im = im || this.display.image;
    if( im ){
	switch(from){
	case "floor":
	    obj = im.getOpacity();
	    opacity = obj.flooropacity;
	    value = obj.floorvalue;
	    if( value ){
		value = JS9.Color.fmt(value, 4);
	    }
	    pel.find("[name='opfloor']").val(value);
	    break;
	case "opacity":
	case "overlay":
	    opacity = "";
	    return;
	case "mask":
	    opacity = im.mask.vopacity || 0;
	    break;
	case "global":
	default:
	    opacity = im.getOpacity().opacity;
	    break;
	}
	if( typeof opacity === "number" ){
	    opacity = JS9.Color.fmt(opacity, 4);
	}
	pel.find("[name='opacity']").val(opacity);
    }
};

// re-init when a different image is displayed
JS9.Color.display = function(){
    let plugin;
    let im = this.display.image;
    if( im && (im === this.lastimage) ){
	plugin = im.display.pluginInstances.JS9Color;
	JS9.Color.refrom.call(plugin, im);
	JS9.Color.reopacity.call(plugin, im);
    } else {
	JS9.Color.init.call(this);
    }
};

// clear when an image closes
JS9.Color.close = function(){
    JS9.Color.init.call(this, {mode: "clear"});
};

// constructor: add HTML elements to the plugin
JS9.Color.init = function(opts){
    let s, t, im, mopts, imid, dispid, obj, cmap, which;
    const getCmaps1Options = () => {
	let i, name;
	let res = "<option selected disabled>Top cmaps</option>";
	for(i=0; i<JS9.globalOpts.topColormaps.length; i++){
	    name = JS9.globalOpts.topColormaps[i];
	    res += `<option>${name}</option>`;
	}
	return res;
    };
    const getCmaps2Options = () => {
	let i, name;
	let res = "<option selected disabled>Other cmaps</option>";
	for(i=0; i<JS9.colormaps.length; i++){
	    name = JS9.colormaps[i].name;
	    if( !JS9.globalOpts.topColormaps.includes(name) ){
		res += `<option>${name}</option>`;
	    }
	}
	return res;
    };
    const getFromOptions = () => {
	let res;
	let filesel = "";
	let masksel = "";
	let overlaysel = "";
	let floorsel = "";
	let globsel = "";
	if( im && im.mask.active && im.mask.im ){
	    switch(im.mask.mode){
	    case "mask":
		masksel = "selected";
		break;
	    case "opacity":
		filesel = "selected";
		break;
	    case "overlay":
		overlaysel = "selected";
		break;
	    }
	} else if( im.params.flooropacity !== undefined  ){
	    floorsel = "selected";
	} else {
	    globsel = "selected";
	}
	res = `<option disabled>mode:</option>
	       <option value="global" ${globsel}>default</option>
	       <option value="floor" ${floorsel}>floor &le;&nbsp;&nbsp;&rarr;</option>
	       <option value="mask" ${masksel}>mask &rarr;</option>
	       <option value="opacity" ${filesel}>opacity &rarr;</option>
	       <option value="overlay" ${overlaysel}>overlay &rarr;</option>`;
	return res;
    };
    const getFloorOptions = (im) => {
	let s = "";
	if( im ){
	    s = im.params.floorvalue || "";
	}
	return s;
    };
    const getFileOptions = (im, mode) => {
	let i, res, tim, sel;
	res = `<option selected disabled>${mode} files</option>
	       <option value="none" selected>none</option>`;
	for(i=0; i<JS9.images.length; i++){
	    tim = JS9.images[i];
	    if( tim === im ){
		continue;
	    }
	    // mask must be the same size as the image
	    if( tim.raw.width  !== im.raw.width  ||
		tim.raw.height !== im.raw.height ){
		continue;
	    }
	    if( im.mask.active && im.mask.im === tim ){
		sel = "selected";
	    } else {
		sel = "";
	    }
	    res += `<option value="${tim.id}" ${sel}>${tim.id}</option>`;
	}
	return res;
    };
    // on entry, these elements have already been defined:
    // this.div:      the DOM element representing the div for this plugin
    // this.divjq:    the jquery object representing the div for this plugin
    // this.id:       the id ofthe div (or the plugin name as a default)
    // this.display:  the display object associated with this plugin
    // this.dispMode: display mode (for internal use)
    //
    // opts is optional
    opts = opts || {};
    // set width and height of plugin itself
    this.width = this.divjq.attr("data-width");
    if( !this.width  ){
	this.width  = JS9.Color.WIDTH;
    }
    this.divjq.css("width", this.width);
    this.width = parseInt(this.divjq.css("width"), 10);
    this.height = this.divjq.attr("data-height");
    if( !this.height ){
	this.height  = JS9.Color.HEIGHT;
    }
    this.divjq.css("height", this.height);
    this.height = parseInt(this.divjq.css("height"), 10);
    // does changing the menu execute run?
    this.runmenu = this.divjq.attr("data-runmenu");
    if( this.runmenu === undefined ){
	this.runmenu = JS9.Color.RUNMENU;
    }
    // haven't used the from menu yet
    this.lastfrom = "";
    // clear out html
    this.divjq.html("");
    // set up new html
    this.colorContainer = $("<div>")
	.addClass(`${JS9.Color.BASE}Container`)
	.attr("id", `${this.id}Container`)
        .attr("width", this.width)
        .attr("height", this.height)
	.appendTo(this.divjq);
    // do we have an image?
    im = this.display.image;
    if( im && (opts.mode !== "clear") ){
	// convenience variables
	imid = im.id;
	dispid = im.display.id;
	mopts = [];
	t = sprintf(JS9.Color.cmaps1HTML, dispid, imid, getCmaps1Options());
	mopts.push({name: "cmaps1", value: t});
	t = sprintf(JS9.Color.cmaps2HTML, dispid, imid, getCmaps2Options());
	mopts.push({name: "cmaps2", value: t});
	t = sprintf(JS9.Color.cmapsHTML, dispid);
	mopts.push({name: "cmaps", value: t});
	t = sprintf(JS9.Color.filtersHTML, dispid);
	mopts.push({name: "filters", value: t});

	t = sprintf(JS9.Color.conbibtnHTML, dispid, imid);
	mopts.push({name: "conbibtn", value: t});
	t = sprintf(JS9.Color.contrastHTML, im.getColormap().contrast);
	mopts.push({name: "contrast", value: t});
	t = sprintf(JS9.Color.biasHTML, im.getColormap().bias);
	mopts.push({name: "bias", value: t});

	t = sprintf(JS9.Color.runHTML, dispid, imid);
	mopts.push({name: "run", value: t});
	t = sprintf(JS9.Color.opacityHTML);
	mopts.push({name: "opacity", value: t});
	t = sprintf(JS9.Color.fromHTML, dispid, imid, getFromOptions(im));
	mopts.push({name: "from", value: t});

	t = sprintf(JS9.Color.opfloorHTML, getFloorOptions(im));
	mopts.push({name: "opfloor", value: t});

	t = sprintf(JS9.Color.opopacityHTML, dispid, imid, getFileOptions(im, "opacity"));
	mopts.push({name: "opopacity", value: t});
	t = sprintf(JS9.Color.opoverlayHTML, dispid, imid, getFileOptions(im, "overlay"));
	mopts.push({name: "opoverlay", value: t});
	t = sprintf(JS9.Color.opmaskHTML, dispid, imid, getFileOptions(im, "mask"));
	mopts.push({name: "opmask", value: t});

	s = im.expandMacro(JS9.Color.colorHTML, mopts);
	this.lastimage = im;
    } else {
	s = "<p><center>Color parameters will appear here.</center>";
    }
    this.colorContainer.html(s);
    if( im ){
	// init run on cr, if necessary
	if( JS9.globalOpts.runOnCR ){
	    this.colorContainer.find("[name='contrast']")
		.data("enterfunc", "conbibtn");
	    this.colorContainer.find("[name='bias']")
		.data("enterfunc", "conbibtn");
	    this.colorContainer.find("[name='opacity']")
		.data("enterfunc", "run");
	    this.colorContainer.find("[name='opfloor']")
		.data("enterfunc", "run");
	}
	JS9.Color.reopacity.call(this, im);
	JS9.Color.refrom.call(this, im);
	// init the appropriate menu with the current colormap
	obj = im.getColormap();
	cmap = obj.colormap;
	which = JS9.globalOpts.topColormaps.includes(cmap) ? "top" : "other";
	JS9.Color.xsetcolor(im.display.id, im.id, which, cmap);
    }
};

// add this plugin into JS9
JS9.RegisterPlugin(JS9.Color.CLASS, JS9.Color.NAME,
		   JS9.Color.init,
		   {menu: "color",
		    menuItem: "Color Controls ...",
		    onplugindisplay: JS9.Color.init,
		    onsetcolormap: JS9.Color.init,
		    onchangecontrastbias: JS9.Color.reconbi,
		    onsetopacity: JS9.Color.reopacity,
		    onimagedisplay: JS9.Color.display,
		    onimageclose: JS9.Color.close,
		    help: "help/colorcontrols.html",
		    winTitle: "Color Controls",
		    winDims: [JS9.Color.WIDTH, JS9.Color.HEIGHT]});
/*
 * JS9 console: a window into which commands can be entered
 * basic idea borrowed from goosh.org, to whom grateful acknowledgement is made
 */

/*global $, JS9 */

"use strict";

// create our namespace, and specify some meta-information and params
JS9.Console = {};
JS9.Console.CLASS = "JS9";      // class of plugins (1st part of div class)
JS9.Console.NAME = "Console";	// name of this plugin (2nd part of div class)
JS9.Console.WIDTH =  512;	// width of light window
JS9.Console.HEIGHT = 300;	// height of light window

// html used by the console plugin
JS9.Console.HTML =
"<table class='JS9CmdTable'>" +
"<tr class='JS9Tr'>"+
"<td><div id='JS9CmdPrompt' class='JS9CmdPrompt'>@@PR@@</div></td>" +
"<td class='JS9CmdTd'><input type='text' class='JS9CmdIn' autocapitalize='off' autocorrect='off' autocomplete='off' value='' /></td>" +
"</tr>" +
"</table>";

JS9.Console.init = function(width, height){
    // mark as valid
    this.display.conMode = 2;
    // set up history
    this.hist = [];
    this.histpos = 0;
    this.histtemp = 0;
    // add ability to handle events to this div
    // this.divjq.attr("tabindex", "0");
    // add container into the div
    this.consoleConjq = $("<div>")
	.addClass("JS9ConsoleContainer")
	.appendTo(this.divjq);
    // light wins: size is set by containing window
    // for others, we need to set the size
    if( this.winType !== "light" ){
	// set width and height on div
	this.width = this.divjq.attr("data-width");
	if( !this.width  ){
	    this.width  = width || JS9.CONWIDTH;
	}
	this.divjq.css("width", this.width);
	this.width = parseInt(this.divjq.css("width"), 10);
	this.height = this.divjq.attr("data-height");
	if( !this.height ){
	    this.height = height || JS9.CONHEIGHT;
	}
	this.divjq.css("height", this.height);
	this.height = parseInt(this.divjq.css("height"), 10);
	this.consoleConjq
	    .css("width", this.width)
	    .css("height", this.height);
    }
    // add ability to handle events to this div
    this.consoleConjq.attr("tabindex", "0");
    // event handlers:
    // history processing
    this.consoleConjq.on("keydown", this, (evt) => {
	return JS9.Console.keyDownCB(evt);
    });
    // welcome message
    JS9.Console.out.call(this, "Type 'help' for a list of commands", "info");
    // ready next input
    JS9.Console.inp.call(this);
};

// prepare for new input
// called with plugin as this
JS9.Console.inp = function(){
    let el;
    const prompt = "js9>";
    // make previous command input read-only
    this.consoleConjq.find(".JS9CmdIn:last").attr("readonly", "readonly");
    // add new input element
    this.consoleConjq.append(JS9.Console.HTML.replace(/@@PR@@/g,prompt));
    // focus on it
    // and prevent Apple ipads from autocapitalizing, etc.
    el = this.consoleConjq.find(".JS9CmdIn:last");
    el.focus()
	.attr("autocapitalize", "off")
	.attr("autocorrect", "off")
	.attr("autocomplete", "off");
    JS9.jupyterFocus(el.parent());
    // allow chaining
    return this;
};

// output results
// called with plugin object as this
JS9.Console.out = function(s, c){
    // message type
    switch(c.toLowerCase()){
    case "error":
	s = `ERROR: ${s}`;
	c = "Error";
	break;
    case "info":
	c = "Info";
	break;
    case "out":
	c = "Out";
	break;
    default:
	c = "Out";
	break;
    }
    // create a new output element
    $("<div>").addClass(`JS9Cmd${c}`).html(s).appendTo(this.consoleConjq);
    // allow chaining
    return this;
};

// execute a command
// called with plugin object as this
JS9.Console.xeq = function(){
    let i, cmd, obj, msg;
    const cmdstring = this.consoleConjq.find(".JS9CmdIn:last").val();
    const tokens = cmdstring.trim().split(/\s+/);
    const args = [];
    // skip blank lines
    if( !tokens[0] ){
	return this;
    }
    cmd = tokens[0];
    // create args array
    for(i=1; i<tokens.length; i++){
	// handle pseudo-null strings specially
	if( tokens[i].match(/^"\s*"$/) || tokens[i].match(/^'\s*'$/) ){
	    args.push("");
	} else {
	    args.push(tokens[i]);
	}
    }
    // save history, if necessary
    if( !this.hist.length || cmdstring !== this.hist[this.hist.length-1] ){
	this.hist.push(cmdstring);
    }
    this.histpos = this.hist.length;
    // lookup and xeq, if possible
    try{
	obj = JS9.lookupCommand(cmd);
	if( obj ){
	    obj.getDisplayInfo(this.display);
	    switch(obj.getWhich(args)){
	    case "get":
		msg = obj.get(args) || "";
		JS9.Console.out.call(this, msg, "ok");
		break;
	    case "set":
		msg = obj.set(args);
		if( msg ){
		    JS9.Console.out.call(this, msg, "ok");
		}
		break;
	    default:
		msg = `unknown cmd type for '${cmd}'`;
		JS9.error(msg);
		break;
	    }
	} else if( JS9.publics[cmd] ){
	    args.push({display: this.display});
	    msg = JS9.publics[cmd](...args) || "";
	    if( typeof msg === "object" ){
		if( msg instanceof JS9.Display || msg instanceof JS9.Image ){
		    msg = "";
		} else {
		    try{ msg = JSON.stringify(msg); }
		    catch(e) { msg = ""; }
		}
	    }
	    if( typeof msg === "string" && msg !== "OK" ){
		if( msg.match(/^ERROR:/) ){
		    JS9.error(msg);
		} else {
		    JS9.Console.out.call(this, msg, "ok");
		}
	    }
	} else {
	    msg = `unknown command '${cmd}'`;
	    if( args.length > 0 ){
		msg = `${msg} ${args}`;
	    }
	    JS9.error(msg);
	}
    } catch(e){
	// output error
	JS9.Console.out.call(this, e.message, "error");
    }
    // allow chaining
    return this;
};

// console keydown: assumes console obj is passed in evt.data
JS9.Console.keyDownCB = function(evt){
    let v;
    const obj = evt.data;
    const keycode = evt.which || evt.keyCode;
    // history idea and basic algorithm from goosh.org,
    // to whom grateful acknowledgement is made
    // this prevents keypress on FF (and others)
    // https://developer.mozilla.org/en-US/docs/Web/Reference/Events/keydown
    // evt.preventDefault();
    if( JS9.specialKey(evt) ){
	return;
    }
    v = obj.consoleConjq.find(".JS9CmdIn:last");
    v.focus();
    if(obj.hist.length && ((keycode===38) || (keycode===40))){
	if( obj.hist[obj.histpos] ){
	    obj.hist[obj.histpos] = v.val();
	} else {
	    obj.histtemp = v.val();
	}
	switch(keycode){
	case  38:
	    obj.histpos--;
	    if( obj.histpos < 0 ){
		obj.histpos = 0;
	    }
	    break;
	case 40:
	    obj.histpos++;
	    if( obj.histpos > obj.hist.length ){
		obj.histpos = obj.hist.length;
	    }
	    break;
	default:
	    JS9.error("internal keycode switch mixup");
	}
	if( obj.hist[obj.histpos] ){
	    v.val(obj.hist[obj.histpos]);
	} else {
	    v.val(obj.histtemp);
	}
    }
    // xeq command when new-line is pressed and re-init
    if( keycode === 13 ){
	// turn off alerts to user
	JS9.globalOpts.alerts = false;
	JS9.Console.xeq.call(obj);
	// turn on alerts to user
	JS9.globalOpts.alerts = true;
	JS9.Console.inp.call(obj);
    }
};

JS9.RegisterPlugin("JS9", "Console", JS9.Console.init,
		   {menuItem: "Console",
		    help: "help/console.html",
		    winTitle: "Console",
		    winResize: true,
		    winDims: [JS9.Console.WIDTH, JS9.Console.HEIGHT]});
/*
 * FITS 3D cube plugin (April 29, 2016)
 */

/*global $, JS9, sprintf */

"use strict";

// create our namespace, and specify some meta-information and params
JS9.Cube = {};
JS9.Cube.CLASS = "JS9";  // class of plugins (1st part of div class)
JS9.Cube.NAME = "Cube";  // name of this plugin (2nd part of div class)
JS9.Cube.WIDTH = 512;	 // width of light window
JS9.Cube.HEIGHT = 240;	 // height of light window
JS9.Cube.BASE = JS9.Cube.CLASS + JS9.Cube.NAME;

JS9.Cube.cubeHTML="<div class='JS9CubeLinegroup'>$header</div><p><div class='JS9CubeLinegroup'><span class='JS9CubeSpan' style='float: left'>$range&nbsp;&nbsp;&nbsp;&nbsp;$value&nbsp;&nbsp;&nbsp;&nbsp;$extname</span><span class='JS9CubeSpan' style='float: right'>$order</span></div><div class='JS9CubeLinegroup'><span class='JS9CubeSpan' style='float: left'>$first&nbsp;$next&nbsp;$prev&nbsp;$last</span><span class='JS9CubeSpan' style='float: right'>$blink&nbsp;$stop&nbsp;$rate</span></div><p><div class='JS9CubeLinegroup'>$header2</div><p><div class='JS9CubeLinegroup'><span class='JS9CubeSpan' style='float: left'>$load</span></div>";

JS9.Cube.headerHTML='Use the slider, text box, navigation or blink buttons to display a slice of a <b>FITS data cube</b>. Use the menu at the right to specify the slice axis.';

JS9.Cube.rangeHTML='<span class="JS9CubeRangeLine">1<input type="range" min="1" max="%s" value="%s" class="JS9CubeRange" onchange="JS9.Cube.xrange(\'%s\', \'%s\', this)">%s</span>';

JS9.Cube.valueHTML='<input type="text" class="JS9CubeValue" min="1" max="%s" value="%s" onchange="JS9.Cube.xvalue(\'%s\', \'%s\', this)" size="4">';

JS9.Cube.firstHTML='<input type="button" class="JS9CubeBtn JS9Button2" value="First" onclick="JS9.Cube.xfirst(\'%s\', \'%s\', this)">';

JS9.Cube.nextHTML='<input type="button" class="JS9CubeBtn JS9Button2" value="Next" onclick="JS9.Cube.xnext(\'%s\', \'%s\', this)">';

JS9.Cube.prevHTML='<input type="button" class="JS9CubeBtn JS9Button2" value="Prev" onclick="JS9.Cube.xprev(\'%s\',\'%s\', this)">';

JS9.Cube.lastHTML='<input type="button" class="JS9CubeBtn JS9Button2" value="Last" onclick="JS9.Cube.xlast(\'%s\', \'%s\', this)">';

JS9.Cube.blinkHTML='<input type="button" class="JS9CubeBtn JS9Button2" value="Blink" onclick="JS9.Cube.xstart(\'%s\', \'%s\', this)">';

JS9.Cube.stopHTML='<input type="button" class="JS9CubeBtn JS9Button2" value="Stop" onclick="JS9.Cube.xstop(\'%s\', \'%s\', this)">';

JS9.Cube.extnameHTML='<span class="JS9CubeRangeLine">%s</span>';

JS9.Cube.orderHTML='<select class="JS9CubeOrder JS9Select" onchange="JS9.Cube.xorder(\'%s\', \'%s\', this)"><option value="$slice:*:*">$slice : * : *</option><option value="*:$slice:*">* : $slice : *</option><option value="*:*:$slice">* : * : $slice</option></select>';

JS9.Cube.rateHTML='<select class="JS9CubeRate JS9Select" onchange="JS9.Cube.xrate(\'%s\', \'%s\', this)"><option selected disabled>Rate</option><option value=".1">0.1 sec</option><option value=".25">0.25 sec</option><option value=".5">0.5 sec</option><option value="1" default>1 sec</option><option value="2">2 sec</option><option value="5">5 sec</option></select>';

JS9.Cube.header2HTML='Or load each slice separately into JS9:';

JS9.Cube.loadHTML='<input type="button" class="JS9CubeBtn JS9Button2" value="Load All" onclick="JS9.Cube.loadall(\'%s\',\'%s\', this)">';

JS9.Cube.doSlice = function(im, slice, elarr){
    let i, s;
    const opts={};
    const plugin = im.display.pluginInstances[JS9.Cube.BASE];
    // are we still working on the previous slice?
    if( im.parentFile && plugin.inProcess ){
	// if so, return
	return;
    }
    for(i=0; i<elarr.length; i++){
	plugin.divjq.find(elarr[i]).val(slice);
    }
    s = im.expandMacro(plugin.slice, [{name: "slice", value: slice}]);
    plugin.sval = slice;
    plugin.inProcess = true;
    // display slice and signal process complete
    im.displaySlice(s, opts, () => {plugin.inProcess = false;});
};

// change range
JS9.Cube.xrange = function(did, id, target){
    let slice;
    const im = JS9.lookupImage(id, did);
    if( im ){
	slice = parseInt(target.value, 10);
	JS9.Cube.doSlice(im, slice, [".JS9CubeValue"]);
    }
};

// change slice value
JS9.Cube.xvalue = function(did, id, target){
    let slice;
    const im = JS9.lookupImage(id, did);
    if( im ){
	slice = parseInt(target.value, 10);
	JS9.Cube.doSlice(im, slice, [".JS9CubeRange"]);
    }
};

// first cube
// eslint-disable-next-line no-unused-vars
JS9.Cube.xfirst = function(did, id, target){
    let slice;
    const im = JS9.lookupImage(id, did);
    if( im ){
	slice = 1;
	JS9.Cube.doSlice(im, slice, [".JS9CubeValue", ".JS9CubeRange"]);
    }
};

// next cube
// eslint-disable-next-line no-unused-vars
JS9.Cube.xnext = function(did, id, target){
    let s, slice, plugin, header;
    const im = JS9.lookupImage(id, did);
    if( im ){
	if( im.parent && im.parent.raw && im.parent.raw.header ){
	    header = im.parent.raw.header;
	} else {
	    header = im.raw.header;
	}
	plugin = im.display.pluginInstances[JS9.Cube.BASE];
	slice = plugin.sval + 1;
	s = `NAXIS${plugin.sidx}`;
	if( slice > header[s] ){
	    slice = 1;
	}
	JS9.Cube.doSlice(im, slice, [".JS9CubeValue", ".JS9CubeRange"]);
    }
};

// prev cube
// eslint-disable-next-line no-unused-vars
JS9.Cube.xprev = function(did, id, target){
    let s, slice, plugin, header;
    const im = JS9.lookupImage(id, did);
    if( im ){
	if( im.parent && im.parent.raw && im.parent.raw.header ){
	    header = im.parent.raw.header;
	} else {
	    header = im.raw.header;
	}
	plugin = im.display.pluginInstances[JS9.Cube.BASE];
	slice = plugin.sval - 1;
	if( slice < 1 ){
	    s = `NAXIS${plugin.sidx}`;
	    slice = header[s];
	}
	JS9.Cube.doSlice(im, slice, [".JS9CubeValue", ".JS9CubeRange"]);
    }
};

// last cube
// eslint-disable-next-line no-unused-vars
JS9.Cube.xlast = function(did, id, target){
    let s, slice, plugin, header;
    const im = JS9.lookupImage(id, did);
    if( im ){
	if( im.parent && im.parent.raw && im.parent.raw.header ){
	    header = im.parent.raw.header;
	} else {
	    header = im.raw.header;
	}
	plugin = im.display.pluginInstances[JS9.Cube.BASE];
	s = `NAXIS${plugin.sidx}`;
	slice = header[s];
	JS9.Cube.doSlice(im, slice, [".JS9CubeValue", ".JS9CubeRange"]);
    }
};

// cube arrangement
JS9.Cube.xorder = function(did, id, target){
    let i, arr, plugin, header;
    const im = JS9.lookupImage(id, did);
    if( im ){
	if( im.parent && im.parent.raw && im.parent.raw.header ){
	    header = im.parent.raw.header;
	} else {
	    header = im.raw.header;
	}
	plugin = im.display.pluginInstances[JS9.Cube.BASE];
	plugin.slice = target.value;
	arr = plugin.slice.split(/[ ,:]/);
	for(i=0; i<arr.length; i++){
	    if( arr[i] !== "*" ){
		plugin.sidx = i+1;
		plugin.sval = 1;
		plugin.smax = header[`NAXIS${plugin.sidx}`];
	    }
	}
	$(".JS9CubeRange").prop("max", plugin.smax);
	JS9.Cube.doSlice(im, plugin.sval, [".JS9CubeValue", ".JS9CubeRange"]);
    }
};

// blink
JS9.Cube.blink = function(did, id, target){
    let plugin;
    const im = JS9.lookupImage(id, did);
    if( im ){
	plugin = im.display.pluginInstances[JS9.Cube.BASE];
	if( plugin.blinkMode === false ){
	    delete plugin.blinkMode;
	    return;
	}
	JS9.Cube.xnext(did, id, target);
	if( plugin.blinkMode === undefined ){
	    plugin.blinkMode = true;
	} 
	JS9.Cube.tid = window.setTimeout(() => {
	    JS9.Cube.blink(did, id, target);
	}, plugin.rate);
    }
};

// start blink
JS9.Cube.xstart = function(did, id, target){
    let plugin;
    const im = JS9.lookupImage(id, did);
    if( im ){
	plugin = im.display.pluginInstances[JS9.Cube.BASE];
	if( !plugin.blinkMode ){
	    JS9.Cube.blink(did, id, target);
	}
    }
};

// stop blink
// eslint-disable-next-line no-unused-vars
JS9.Cube.xstop = function(did, id, target){
    let plugin;
    const im = JS9.lookupImage(id, did);
    if( im ){
	plugin = im.display.pluginInstances[JS9.Cube.BASE];
	plugin.inProcess = false;
	if( plugin.blinkMode ){
	    if( plugin.tid ){
		window.clearTimeout(plugin.tid);
		delete plugin.tid;
	    }
	    plugin.blinkMode = false;
	}
    }
};

// blink rate
JS9.Cube.xrate = function(did, id, target){
    let plugin;
    const im = JS9.lookupImage(id, did);
    if( im ){
	plugin = im.display.pluginInstances[JS9.Cube.BASE];
	plugin.rate = Math.floor(parseFloat(target.value) * 1000);
    }
};

// load all slices separately
// eslint-disable-next-line no-unused-vars
JS9.Cube.loadall = function(did, id, target){
    const im = JS9.lookupImage(id, did);
    if( im ){
	im.displaySlice("all");
    }
};


// re-init when a different image is displayed
JS9.Cube.display = function(){
    if( this.lastimage !== this.display.image ){
	JS9.Cube.init.call(this);
    }
};

// clear when an image closes
JS9.Cube.close = function(){
    // ensure plugin display is reset
    JS9.Cube.init.call(this, {mode: "clear"});
};

// constructor: add HTML elements to the plugin
JS9.Cube.init = function(opts){
    let i, s, im, arr, mopts, imid, dispid, header;
    // on entry, these elements have already been defined:
    // this.div:      the DOM element representing the div for this plugin
    // this.divjq:    the jquery object representing the div for this plugin
    // this.id:       the id ofthe div (or the plugin name as a default)
    // this.display:  the display object associated with this plugin
    // this.dispMode: display mode (for internal use)
    //
    // opts is optional
    opts = opts || {};
    // set width and height of plugin itself
    this.width = this.divjq.attr("data-width");
    if( !this.width  ){
	this.width  = JS9.Cube.WIDTH;
    }
    this.divjq.css("width", this.width);
    this.width = parseInt(this.divjq.css("width"), 10);
    this.height = this.divjq.attr("data-height");
    if( !this.height ){
	this.height  = JS9.Cube.HEIGHT;
    }
    this.divjq.css("height", this.height);
    this.height = parseInt(this.divjq.css("height"), 10);
    // height of cube inside plugin
    this.cubeWidth = this.width;
    this.cubeHeight = parseInt(this.divjq.attr("data-cubeHeight"), 10);
    if( !this.cubeHeight ){
	this.cubeHeight  = JS9.Cube.CUBEHEIGHT;
    }
    // do we have an image?
    im = this.display.image;
    if( im && (opts.mode !== "clear") ){
	if( im.parent && im.parent.raw && im.parent.raw.header ){
	    header = im.parent.raw.header;
	} else {
	    header = im.raw.header;
	}
	// convenience variables
	imid = im.id;
	dispid = im.display.id;
	if( im.slice ){
	    this.slice = im.slice.replace(/[0-9][0-9]*/,"$slice");
	    arr = im.slice.split(/[ ,:]/);
	    for(i=0; i<arr.length; i++){
		if( arr[i] !== "*" ){
		    this.sidx = i+1;
		    this.smax = header[`NAXIS${this.sidx}`];
		    this.sval = parseInt(arr[i], 10);
		}
	    }
	} else {
	    this.slice = "*:*:$slice";
	    this.smax = header.NAXIS3;
	    this.sidx = 3;
	    this.sval = 1;
	}
	if( !this.rate ){
	    this.rate = 1000;
	}
	if( this.tid !== undefined ){
	    window.clearTimeout(this.tid);
	    delete this.tid;
	}
	if( this.blinkMode !== undefined ){
	    delete this.blinkMode;
	}
	if( header.NAXIS > 2 ){
	    mopts = [];
	    mopts.push({name: "header",  value: JS9.Cube.headerHTML});
	    mopts.push({name: "range",
		       value: sprintf(JS9.Cube.rangeHTML, this.smax, this.sval,
				      dispid, imid, this.smax)});
	    mopts.push({name: "value",
		       value: sprintf(JS9.Cube.valueHTML, this.smax, this.sval,
				      dispid, imid)});
	    mopts.push({name: "first",
		       value: sprintf(JS9.Cube.firstHTML, dispid, imid)});
	    mopts.push({name: "next",
		       value: sprintf(JS9.Cube.nextHTML, dispid, imid)});
	    mopts.push({name: "prev",
		       value: sprintf(JS9.Cube.prevHTML, dispid, imid)});
	    mopts.push({name: "last",
		       value: sprintf(JS9.Cube.lastHTML, dispid, imid)});
	    mopts.push({name: "blink",
		       value: sprintf(JS9.Cube.blinkHTML, dispid, imid)});
	    mopts.push({name: "stop",
		       value: sprintf(JS9.Cube.stopHTML, dispid, imid)});
	    mopts.push({name: "order",
		       value: sprintf(JS9.Cube.orderHTML, dispid, imid)});
	    mopts.push({name: "rate",
		       value: sprintf(JS9.Cube.rateHTML, dispid, imid)});
	    mopts.push({name: "extname",
		       value: sprintf(JS9.Cube.extnameHTML, 
				      header.EXTNAME || "")});
	    mopts.push({name: "header2",  value: JS9.Cube.header2HTML});
	    mopts.push({name: "load",
		       value: sprintf(JS9.Cube.loadHTML, dispid, imid)});
	    s = im.expandMacro(JS9.Cube.cubeHTML, mopts);
	} else {
	    s = "<p><center>This image is not a FITS data cube.</center>";
	}
	this.lastimage = im;
    } else {
	    s = "<p><center>FITS cube processing will appear here.</center>";
    }
    // clear out old html
    this.divjq.html("");
    // set up new html
    this.cubeContainer = $("<div>")
	.addClass(`${JS9.Cube.BASE}Container`)
	.attr("id", `${this.id}Container`)
        .attr("width", this.width)
        .attr("height", this.height)
	.appendTo(this.divjq);
    this.cubeContainer.html(s);
    // set current values
    this.divjq.find(".JS9CubeRange").prop("max", this.smax);
    this.divjq.find(".JS9CubeValue").prop("max", this.smax);
    this.divjq.find(".JS9CubeOrder").val(this.slice);
};

// add this plugin into JS9
JS9.RegisterPlugin(JS9.Cube.CLASS, JS9.Cube.NAME, JS9.Cube.init,
		   {menuItem: "Data Cube",
		    onplugindisplay: JS9.Cube.init,
		    onimageload: JS9.Cube.init,
		    onimagedisplay: JS9.Cube.display,
		    onimageclose: JS9.Cube.close,
		    help: "help/cube.html",
		    winTitle: "FITS Data Cubes",
		    winDims: [JS9.Cube.WIDTH, JS9.Cube.HEIGHT]});
/*
 * visibility of JS9 in-page plugin divs (January 13, 2017)
 */

/*global $, JS9, sprintf */

"use strict";

// create our namespace, and specify some meta-information and params
JS9.Divs = {};
JS9.Divs.CLASS = "JS9";	// class of plugins (1st part of div class)
JS9.Divs.NAME = "Divs"; // name of this plugin (2nd part of div class)
JS9.Divs.WIDTH =  400;	// width of light window
JS9.Divs.HEIGHT = 146;	// height of light window
JS9.Divs.BASE = JS9.Divs.CLASS + JS9.Divs.NAME;  // CSS base class name

JS9.Divs.headerHTML='JS9 plugin divs can be hidden or made visible below.';

JS9.Divs.divHTML="<span style='float: left'>$visible&nbsp;&nbsp;</span>&nbsp;&nbsp; <span class='JS9DivsSpan'>$div&nbsp;&nbsp</span>";

JS9.Divs.nodivsHTML='<p><span class="JS9NoDivs">[No JS9 divs have been created for this display]</span>';

JS9.Divs.visibleHTML='<input class="JS9DivsVisibleCheck" type="checkbox" id="visible" name="visible" value="visible" onclick="javascript:JS9.Divs.xvisible(\'%s\', \'%s\', this)">visible';

JS9.Divs.divNameHTML='<b>%s</b>';

// make shape div visible/invisible
JS9.Divs.xvisible = function(display, plugin, target){
    let mode, instance;
    const div = JS9.lookupDisplay(display);
    if( div ){
	instance = div.pluginInstances[plugin];
	if( instance ){
	    if( target.checked ){
		mode = "visible";
	    } else {
		mode = "hidden";
	    }
	}
	// the plugin container contains the plugin and maybe a toolbar
	instance.divjq.closest(".JS9PluginContainer").css("visibility", mode);
    }
};

// add a div to the list
JS9.Divs.addDiv = function(plugin){
    let s, divjq;
    const cls = `${JS9.Divs.BASE}Div`;
    const opts = [];
    // sanity checks
    if( !plugin || !this.display.pluginInstances[plugin] ){
	return;
    }
    // first time through, clear html
    if( !this. ndiv ){
	this.divsDivContainer.html("");
    }
    // value to pass to the macro expander
    opts.push({name: "visible", value: sprintf(JS9.Divs.visibleHTML, 
					       this.display.id, plugin)});
    opts.push({name: "div", value: sprintf(JS9.Divs.divNameHTML, 
					   plugin)});
    // create the html for this div
    s = JS9.Image.prototype.expandMacro.call(null, JS9.Divs.divHTML, opts);
    // add div html to the div container
    divjq = $("<div>")
	.addClass(cls)
        .html(s)
	.appendTo(this.divsDivContainer);
    // set or unset visibility buton
    divjq.find(".JS9DivsVisibleCheck").prop("checked", 
    this.display.pluginInstances[plugin].divjq.css("visibility") === "visible");
    // another div was added
    this.ndiv++;
};

// constructor: add HTML elements to the plugin
JS9.Divs.init = function(opts){
    let key, instances;
    // on entry, these elements have already been defined:
    // this.div:      the DOM element representing the div for this plugin
    // this.divjq:    the jquery object representing the div for this plugin
    // this.id:       the id of the div (or the plugin name as a default)
    // this.display:  the display object associated with this plugin
    // this.dispMode: display mode (for internal use)
    //
    // opts is optional
    opts = opts || {};
    // create container to hold div container and header
    // clean main container
    this.divjq.html("");
    // no divs yet
    this.ndiv = 0;
    // allow scrolling on the plugin
    this.divjq.addClass("JS9PluginScrolling");
    // main container
    this.divsContainer = $("<div>")
	.addClass(`${JS9.Divs.BASE}Container`)
	.attr("id", `${this.id}DivsContainer`)
        .css("overflow", "auto")
	.appendTo(this.divjq);
    // header
    this.divsHeader = $("<div>")
	.addClass(`${JS9.Divs.BASE}Header`)
	.attr("id", `${this.display.id}Header`)
	.html(JS9.Divs.headerHTML)
	.appendTo(this.divsContainer);
    // container to hold divs
    this.divsDivContainer = $("<div>")
	.addClass(`${JS9.Divs.BASE}DivContainer`)
	.attr("id", `${this.id}DivsDivContainer`)
        .html(JS9.Divs.nodivsHTML)
	.appendTo(this.divsContainer);
    // done if we are only clearing
    if( opts.mode === "clear" ){
	return;
    }
    // add current in-page plugin divs
    instances = this.display.pluginInstances;
    for( key in instances ){
	if( instances.hasOwnProperty(key) ){
	    if( instances[key].winType === "div" ){
		JS9.Divs.addDiv.call(this, key);
	    }
	}
    }
};

// add this plugin into JS9
JS9.RegisterPlugin(JS9.Divs.CLASS, JS9.Divs.NAME, JS9.Divs.init,
		   {menuItem: "Show/Hide Plugins",
		    onplugindisplay: JS9.Divs.init,
		    help: "help/divs.html",
		    winTitle: "Show/Hide Plugins",
		    winResize: true,
		    winDims: [JS9.Divs.WIDTH, JS9.Divs.HEIGHT]});
/*
 * image filters plugin (November 2, 2019)
 */

/*global $, JS9, sprintf */

"use strict";

// create our namespace, and specify some meta-information and params
JS9.Filters = {};
JS9.Filters.CLASS = "JS9";       // class of plugins
JS9.Filters.NAME = "Filters";    // name of this plugin
JS9.Filters.WIDTH = 325;         // width of light window
JS9.Filters.HEIGHT = 520;        // height of light window
JS9.Filters.BASE = JS9.Filters.CLASS + JS9.Filters.NAME;

// image filters with no args
JS9.Filters.noargfilters = {
    edge: {def: null},
    invert: {def: null},
    luminance: {def: null},
    median: {def: null},
    sobel: {def: null}
};

// image filters accepting args
JS9.Filters.argfilters = {
    blur: {min: 0, max: 100, step: 1, init: 0, def: 30},
    brighten: {min: 1, max: 100, step: 1, init: 0, def: 10},
    darken: {min: 0, max: 1, step: 0.01, init: 0, def: .66},
    duotone: {min: 0, max: 2, step: 1, init: 0, def: 2},
    emboss: {min: 0, max: 100, step: 1, init: 0, def: 100},
    gamma: {min: 0, max: 2, step: 0.01, init: 0, def: 0.2},
    lighten: {min: 1, max: 2, step: 0.01, init: 0, def: 1.33},
    noise: {min: 0, max: 100, step: 1, init: 0, def: 30},
    pixelate: {min: 0, max: 20, step: 1, init: 0, def: 2},
    scatter: {min: 0, max: 10, step: 1, init: 0, def: 5},
    sepia: {min: 0, max: 100, step: 1, init: 0, def: 100},
    sharpen: {min: 0, max: 100, step: 1, init: 0, def: 20},
    solarize: {min: 0, max: 100, step: 1, init: 0, def: 50}
};

JS9.Filters.headerHTML=`
<center>
<div class="JS9FiltersLineheader">
<span class="JS9FiltersHeader">
Image Filters:<br>
click for default settings or use the sliders
</span>
</center>
</div>
`;

JS9.Filters.noargfilterHTML=`
<span class="JS9FiltersName JS9FiltersCol1">
<input type="button" name="%sbutton" value="%s" class="JS9Button2 JS9FiltersButton" onclick="JS9.Filters.xfilter(this, '%s', '%s', '%s', %s)"></span>
`;

JS9.Filters.argfilterHTML=`
<span class="JS9FiltersName JS9FiltersCol1">
<input type="button" name="%sbutton" value="%s" class="JS9Button2 JS9FiltersButton" onclick="JS9.Filters.xfilter(this, '%s', '%s', '%s', %s)"></span>
<span class="JS9FiltersRange JS9FiltersCol2"><input type="range" min="%s" max="%s" step="%s" value="%s" name="%s" class="JS9FiltersRange" onchange="JS9.Filters.xgenfilter('%s', '%s', '%s', this)"></span>
<span class="JS9FiltersRangeVal">
<input type="text" name="%sval" class="JS9FiltersValue JS9FiltersCol3" min="0" max="100" value="0" onchange="JS9.Filters.xgenval('%s', '%s', '%s', this)"></span>
`;

JS9.Filters.undoHTML=`
<span class="JS9FiltersUndo JS9FiltersCol1">
<input type="button" id="undo" name="undo" value="undo" class="JS9FiltersUndoButton JS9Button2" onclick="JS9.Filters.xundo(this, '%s', '%s')"></span>
`;

// update gui filter param value
JS9.Filters.updateval = function(target, filter, val){
    if( target && $(target).length > 0 ){
	if( filter ){
	    $(target)
		.closest(`.${JS9.Filters.BASE}Container`)
		.find(`[name='${filter}']`)
		.prop("value", val);
	    $(target)
		.closest(`.${JS9.Filters.BASE}Container`)
		.find(`[name='${filter}val']`)
		.prop("value", val);
	    $(target)
		.closest(`.${JS9.Filters.BASE}Container`)
		.find(`[name='undo']`)
		.prop("value", `undo ${filter}`)
	        .css("width", "100px");
	} else {
	    $(target)
		.closest(`.${JS9.Filters.BASE}Container`)
		.find(`[name='undo']`)
		.prop("value", `undo`)
	        .css("width", "70px");
	}
    }
}


// execute default filter
JS9.Filters.xfilter = function(target, did, id, filter, val){
    let pinst, data;
    let oval = val;
    const im = JS9.lookupImage(id, did);
    if( im ){
	pinst = im.display.pluginInstances[JS9.Filters.BASE];
	pinst.stack = pinst.stack || [];
	if( pinst.stack.length &&
	    pinst.stack[pinst.stack.length - 1].filter === filter ){
	    im.rgb.img.data.set(pinst.stack[pinst.stack.length - 1].data);
	    pinst.stack[pinst.stack.length - 1].val = val;
	} else {
	    data = new Uint8ClampedArray(im.rgb.img.data);
	    pinst.stack.push({filter, val, data});
	}
	if( JS9.notNull(val) ){
	    switch(filter){
	    case "duotone":
		if( val === 0 ){
		    val = "r";
		} else if( val === 1 ){
		    val = "g";
		} else {
		    val = "b";
		}
		break;
	    case "darken":
		val = 1 - val;
		break;
	    }
	    im.filterRGBImage(filter, val);
	} else {
	    im.filterRGBImage(filter);
	}
	// update GUI values
	JS9.Filters.updateval(target, filter, oval);
    }
};

// undo the last filter
JS9.Filters.xundo = function(target, did, id){
    let i, pinst, obj, filter, val;
    const im = JS9.lookupImage(id, did);
    if( im ){
	pinst = im.display.pluginInstances[JS9.Filters.BASE];
	if( pinst.stack && pinst.stack.length ){
	    obj = pinst.stack.pop();
	    im.rgb.img.data.set(obj.data);
	    im.displayImage("display");
	    JS9.Filters.updateval(target, obj.filter, 0);
	}
	if( pinst.stack && pinst.stack.length ){
	    for(i=0; i<pinst.stack.length; i++){
		filter = pinst.stack[i].filter;
		val = pinst.stack[i].val;
		JS9.Filters.updateval(target, filter, val);
	    }
	} else {
	    JS9.Filters.updateval(target, null, null);
	}
    }
};

// change the filter
JS9.Filters.xgenfilter = function(did, id, filter, target){
    let val;
    const im = JS9.lookupImage(id, did);
    if( im ){
	val = parseFloat(target.value)
	JS9.Filters.xfilter(target, did, id, filter, val);
	$(target)
	    .closest(`.${JS9.Filters.BASE}Container`)
	    .find(`[name='${filter}val']`)
	    .prop("value", val);
    }
};

JS9.Filters.xgenval = function(did, id, filter, target){
    let val;
    const im = JS9.lookupImage(id, did);
    if( im ){
	val = parseFloat(target.value)
	JS9.Filters.xfilter(target, did, id, filter, val);
	$(target)
	    .closest(`.${JS9.Filters.BASE}Container`)
	    .find(`[name='${filter}']`)
	    .prop("value", val);
    }
};

// re-init (avoiding recursion)
JS9.Filters.reinit = function(){
    const pinst = this.display.pluginInstances[JS9.Filters.BASE];
    if( !this.inProcess && pinst.stack && pinst.stack.length ){
	this.inProcess = true;
	delete pinst.stack;
	JS9.Filters.init.call(this);
	this.inProcess = false;
    }
};

// re-init when a different image is displayed
JS9.Filters.display = function(){
    let pinst;
    if( this.lastimage !== this.display.image ){
	pinst = this.display.pluginInstances[JS9.Filters.BASE];
	this.inProcess = true;
	delete pinst.stack;
	JS9.Filters.init.call(this);
	this.inProcess = false;
    }
};

// clear when an image closes
JS9.Filters.close = function(){
    // ensure plugin display is reset
    JS9.Filters.init.call(this, {mode: "clear"});
};

// constructor: add HTML elements to the plugin
JS9.Filters.init = function(opts){
    let s, t, im, mopts, imid, dispid, html, key, obj;
    // on entry, these elements have already been defined:
    // this.div:      the DOM element representing the div for this plugin
    // this.divjq:    the jquery object representing the div for this plugin
    // this.id:       the id ofthe div (or the plugin name as a default)
    // this.display:  the display object associated with this plugin
    // this.dispMode: display mode (for internal use)
    //
    // opts is optional
    opts = opts || {};
    // set width and height of plugin itself
    this.width = this.divjq.attr("data-width");
    if( !this.width  ){
	this.width  = JS9.Filters.WIDTH;
    }
    this.divjq.css("width", this.width);
    this.width = parseInt(this.divjq.css("width"), 10);
    this.height = this.divjq.attr("data-height");
    if( !this.height ){
	this.height  = JS9.Filters.HEIGHT;
    }
    this.divjq.css("height", this.height);
    this.height = parseInt(this.divjq.css("height"), 10);
    // clear out html
    this.divjq.html("");
    html = JS9.Filters.headerHTML;
    // param values for image processing
    delete this.stack;
    // set up new html
    this.filtersContainer = $("<div>")
	.addClass(`${JS9.Filters.BASE}Container`)
	.attr("id", `${this.id}Container`)
        .attr("width", this.width)
        .attr("height", this.height)
	.appendTo(this.divjq);
    // do we have an image?
    im = this.display.image;
    if( im && (opts.mode !== "clear") ){
	// convenience variables
	imid = im.id;
	dispid = im.display.id;
	mopts = [];
	// add space before the filters
	html += `<div class='JS9FiltersLinegroup'>&nbsp;</div>`;
	// add the arg filters
	for( key in JS9.Filters.argfilters ){
	    if( JS9.Filters.argfilters.hasOwnProperty(key) ){
		obj = JS9.Filters.argfilters[key];
		mopts.push({name: key, 
			    value: sprintf(JS9.Filters.argfilterHTML,
					   key,
					   key,
					   dispid, imid, key, obj.def,
					   obj.min, obj.max, obj.step, obj.init,
					   key,
					   dispid, imid, key,
					   key, 
					   dispid, imid, key)});
		// add this line to the main html spec
		html += `<div class='JS9FiltersLinegroup'>$${key}</div>`;
	    }
	}
	// add the noarg filterfs
	for( key in JS9.Filters.noargfilters ){
	    if( JS9.Filters.noargfilters.hasOwnProperty(key) ){
		mopts.push({name: key, 
			    value: sprintf(JS9.Filters.noargfilterHTML,
					   key,
					   key,
					   dispid, imid, key, null,
					   key,
					   dispid, imid, key,
					   key, 
					   dispid, imid, key)});
		// add this line to the main html spec
		html += `<div class='JS9FiltersLinegroup'>$${key}</div>`;
	    }
	}
	// add space before the undo
	html += `<div class='JS9FiltersLinegroup'>&nbsp;</div>`;
	// add undo to the main html spec
	html += `<div class='JS9FiltersLinegroup'>$undo</div>`;
	t = sprintf(JS9.Filters.undoHTML, dispid, imid);
	mopts.push({name: "undo", value: t});
	// expand macros to generate html
	s = im.expandMacro(html, mopts);
	this.lastimage = im;
    } else {
	s = "<p><center>Image filters will appear here.</center>";
    }
    this.filtersContainer.html(s);
};

// add this plugin into JS9
JS9.RegisterPlugin(JS9.Filters.CLASS, JS9.Filters.NAME,
		   JS9.Filters.init,
		   {menuItem: "Image Filters",
		    onplugindisplay: JS9.Filters.init,
		    onchangecontrastbias: JS9.Filters.reinit,
		    onsetpan: JS9.Filters.reinit,
		    onsetcolormap: JS9.Filters.reinit,
		    onimagedisplay: JS9.Filters.display,
		    onimageclose: JS9.Filters.close,
		    help: "help/filters.html",
		    winTitle: "Image Filters",
		    winDims: [JS9.Filters.WIDTH, JS9.Filters.HEIGHT]});
/*
 * imarith plugin (March 8, 2016)
 */

/*global $, JS9, sprintf */

"use strict";

// create our namespace, and specify some meta-information and params
JS9.Imarith = {};
JS9.Imarith.CLASS = "JS9";      // class of plugins (1st part of div class)
JS9.Imarith.NAME = "Imarith";  // name of this plugin (2nd part of div class)
JS9.Imarith.WIDTH =  512;	 // width of light window
JS9.Imarith.HEIGHT = 170;	 // height of light window
JS9.Imarith.BASE = JS9.Imarith.CLASS + JS9.Imarith.NAME;

JS9.Imarith.imageHTML="<div class='JS9ImarithLinegroup'>Choose an op (add, subtract, multiply, divide, min, max) and an operand (number or image) and click Run. Reset will revert to the original data.</div><div class='JS9ImarithLinegroup'><span class='JS9ImarithSpan' style='float: left'><b>$imid</b> &nbsp;&nbsp; $op &nbsp;&nbsp; $arg1 &nbsp;&nbsp; $num</span></div><p><div class='JS9ImarithLinegroup'><span style='float: right'>$cancel $reset $run</span></div>";

JS9.Imarith.opHTML='<select class=JS9ImarithOp" onchange="JS9.Imarith.xop(\'%s\', \'%s\', this)"><option value="" selected disabled>op</option><option value="add">add</option><option value="sub">sub</option><option value="mul">mul</option><option value="div">div</option><option value="min">min</option><option value="max">max</option></select>';

JS9.Imarith.arg1HTML='<select class="JS9Select JS9ImarithArg1" onchange="JS9.Imarith.xarg1(\'%s\', \'%s\', this)"><option val="" selected disabled>operand</option><option value="num">number &#8594;</option>%s</select>';

JS9.Imarith.numHTML='<input type="text" class="JS9ImarithNum" value="" onchange="JS9.Imarith.xnum(\'%s\', \'%s\', this)" size="10" placeholder="number">';

JS9.Imarith.cancelHTML='<input type="button" class="JS9Button2 JS9ImarithBtn" value="Cancel" onclick="JS9.Imarith.xcancel(\'%s\', \'%s\', this)">';

JS9.Imarith.resetHTML='<input type="button" class="JS9Button2 JS9ImarithBtn" value="Reset" onclick="JS9.Imarith.xreset(\'%s\', \'%s\', this)">';

JS9.Imarith.runHTML='<input type="button" class="JS9RunButton JS9ImarithBtn" value="Run" onclick="JS9.Imarith.xrun(\'%s\', \'%s\', this)">';

// change op
JS9.Imarith.xop = function(did, id, target){
    const op = target.options[target.selectedIndex].value;
    const im = JS9.lookupImage(id, did);
    // save new op in instance record
    if( im && op ){
	im.display.pluginInstances.JS9Imarith.op = op;
    }
};

// change arg1
JS9.Imarith.xarg1 = function(did, id, target){
    const im = JS9.lookupImage(id, did);
    const arg1 = target.options[target.selectedIndex].value;
    // save new arg1 in instance record
    if( im && arg1 ){
	im.display.pluginInstances.JS9Imarith.arg1 = arg1;
	if( arg1 === "num" ){
	    $(".JS9ImarithNum").css("visibility", "visible");
	} else {
	    $(".JS9ImarithNum").css("visibility", "hidden");
	}
    }
};

// change num
JS9.Imarith.xnum = function(did, id, target){
    const im = JS9.lookupImage(id, did);
    const num = target.value;
    // save new num in instance record
    if( JS9.isNumber(num) ){
	im.display.pluginInstances.JS9Imarith.num = parseFloat(num);
    } else {
	if( num ){
	    JS9.error(`please enter a real number: ${num}`);
	}
    }
};

// cancel window
// eslint-disable-next-line no-unused-vars
JS9.Imarith.xcancel = function(did, id, target){
    let plugin;
    const display = JS9.lookupDisplay(did);
    if( display ){
	plugin = display.pluginInstances.JS9Imarith;
	if( plugin && plugin.winHandle ){
	    plugin.winHandle.close();
	}
    }
};

// reset to original data
// eslint-disable-next-line no-unused-vars
JS9.Imarith.xreset = function(did, id, target){
    const im = JS9.lookupImage(id, did);
    if( im ){
	im.imarithData("reset");
    }
};

// run image arithmetic
// eslint-disable-next-line no-unused-vars
JS9.Imarith.xrun = function(did, id, target){
    let arg1, plugin;
    const im = JS9.lookupImage(id, did);
    if( im ){
	plugin = im.display.pluginInstances.JS9Imarith;
	if( !plugin.op || !plugin.arg1 ){
	    JS9.error("please select an operation and an operand");
	}
	if( plugin.arg1 === "num" ){
	    if( plugin.num === undefined ){
		JS9.error("please enter a real number for the operand");
	    }
	    arg1 = plugin.num;
	} else {
	    arg1 = plugin.arg1;
	}
	im.imarithData(plugin.op, arg1);
    }
};

// init when a different image is displayed
JS9.Imarith.display = function(){
    if( this.lastimage !== this.display.image ){
	JS9.Imarith.init.call(this);
    }
};

// clear when an image closes
JS9.Imarith.close = function(){
    // ensure plugin display is reset
    JS9.Imarith.init.call(this, {mode: "clear"});
};

// constructor: add HTML elements to the plugin
JS9.Imarith.init = function(opts){
    let i, s, im, tim, mopts, imid, dispid;
    let images = "";
    // on entry, these elements have already been defined:
    // this.div:      the DOM element representing the div for this plugin
    // this.divjq:    the jquery object representing the div for this plugin
    // this.id:       the id ofthe div (or the plugin name as a default)
    // this.display:  the display object associated with this plugin
    // this.dispMode: display mode (for internal use)
    //
    // opts is optional
    opts = opts || {};
    // set width and height of plugin itself
    this.width = this.divjq.attr("data-width");
    if( !this.width  ){
	this.width  = JS9.Imarith.WIDTH;
    }
    this.divjq.css("width", this.width);
    this.width = parseInt(this.divjq.css("width"), 10);
    this.height = this.divjq.attr("data-height");
    if( !this.height ){
	this.height  = JS9.Imarith.HEIGHT;
    }
    this.divjq.css("height", this.height);
    this.height = parseInt(this.divjq.css("height"), 10);
    // height of imarith inside plugin
    this.imarithWidth = this.width;
    this.imarithHeight = parseInt(this.divjq.attr("data-imarithHeight"), 10);
    if( !this.imarithHeight ){
	this.imarithHeight  = JS9.Imarith.IMARITHHEIGHT;
    }
    // reset param values
    delete this.arg1;
    delete this.op;
    delete this.num;
    // do we have an image?
    im = this.display.image;
    if( im && (opts.mode !== "clear") ){
	// convenience variables
	imid = im.id;
	dispid = im.display.id;
	// make the last one
	this.lastim = im.id;
	// get list of images which can be operands (other than this one)
	for(i=0; i<JS9.images.length; i++){
	    tim = JS9.images[i];
	    if( tim !== im ){
		images += `<option value="${tim.id}">${tim.id}</option>`;
	    }
	}
	// create the html for this image
	mopts = [];
	mopts.push({name: "images", value: images});
	mopts.push({name: "imid", value: imid});
	mopts.push({name: "op", value: sprintf(JS9.Imarith.opHTML, 
					       dispid, imid)});
	mopts.push({name: "arg1", value: sprintf(JS9.Imarith.arg1HTML,
						 dispid, imid, images)});
	mopts.push({name: "num", value: sprintf(JS9.Imarith.numHTML,
						dispid, imid)});
	mopts.push({name: "cancel", value: sprintf(JS9.Imarith.cancelHTML,
						  dispid, imid)});
	mopts.push({name: "reset", value: sprintf(JS9.Imarith.resetHTML,
						  dispid, imid)});
	mopts.push({name: "run", value: sprintf(JS9.Imarith.runHTML,
						dispid, imid)});
 	s = JS9.Image.prototype.expandMacro.call(im, JS9.Imarith.imageHTML,
						 mopts);
	this.lastimage = im;
    } else {
	s = "<p><center>Image arithmetic will appear here.</center>";
    }
    // clear out old html
    this.divjq.html("");
    // set up new html
    this.imarithContainer = $("<div>")
	.addClass(`${JS9.Imarith.BASE}Container`)
	.attr("id", `${this.id}Container`)
        .attr("width", this.width)
        .attr("height", this.height)
	.appendTo(this.divjq);
    this.imarithContainer.html(s);
    this.imarithContainer.find(".JS9ImarithNum").css("visibility", "hidden");
};

// add this plugin into JS9
JS9.RegisterPlugin(JS9.Imarith.CLASS, JS9.Imarith.NAME, JS9.Imarith.init,
		   {menuItem: "Imarith",
		    onplugindisplay: JS9.Imarith.init,
		    onimageload: JS9.Imarith.init,
		    onimagedisplay: JS9.Imarith.display,
		    onimageclose: JS9.Imarith.close,
		    help: "help/imarith.html",
		    winTitle: "Image Arithmetic",
		    winDims: [JS9.Imarith.WIDTH, JS9.Imarith.HEIGHT]});
/*
 * Info plugin
 */

/*global $, JS9, jQuery, sprintf */

"use strict";

// create our namespace, and specify some meta-information and params
JS9.Info = {};
JS9.Info.CLASS = "JS9";
JS9.Info.NAME = "Info";
JS9.Info.WIDTH = 325;	// width of js9Info box
JS9.Info.HEIGHT = 250;	// height of js9Info box
JS9.Info.REGHEIGHT = 75;// extra height for region display

JS9.Info.opts = {
    // info url
    infoURL: "./params/info.html",
    infoObj: {
	file: '<tr><td><input type="text" class="column0" value="file" readonly="readonly"></td><td colspan="2"><input type="text" name="id" class="input2" value="" readonly="readonly" onclick="this.scrollLeft=this.scrollWidth;"></td></tr>',
	object: '<tr><td><input type="text" class="column0" value="object" readonly="readonly"></td><td colspan="2"><input type="text" name="object" class="input2" value="" readonly="readonly"></td></tr>',
	wcscen: '<tr><td><input type="text" class="column0" value="center" readonly="readonly"></td><td colspan="2"><input type="text" name="wcscen" class="input2" value="" readonly="readonly"></td></tr>',
	wcsfov: '<tr><td><input type="text" class="column0" value="fov" readonly="readonly"></td><td colspan="2"><input type="text" name="wcsfovpix" class="input2" value="" readonly="readonly"></td></tr>',
	value: '<tr><td><input type="text" class="column0" value="value" readonly="readonly"></td><td colspan="2"><input type="text" name="val" class="input2" value="" readonly="readonly"></td></tr>',
	impos: '<tr><td><input type="text" class="column0" value="image" readonly="readonly"></td><td colspan="2"><input type="text" name="ipos" class="input2" value="" readonly="readonly"></td></tr>',
	disppos: '<tr><td><input type="text" class="column0" value="display" readonly="readonly"></td><td colspan="2"><input type="text" name="dpos" class="input2" value="" readonly="readonly"></td></tr>',
	physpos: '<tr><td><input type="text" class="column0" value="physical" readonly="readonly"></td><td colspan="2"><input type="text" name="ppos" class="input2" value="" readonly="readonly"></td></tr>',
	wcspos: '<tr><td><input type="text" class="column0" value="wcs" name="wcssys" readonly="readonly"></td><td colspan="2"><input type="text" name="wcspos" class="input2" value="" readonly="readonly"></td></tr>',
	 regions: '<tr><td><input type="text" class="column0" value="regions" readonly="readonly"></td><td colspan="2"><textarea class="text2" name="regions" rows="4" value="" readonly="readonly"></textarea></td></tr>',
	 progress: '<tr><td colspan="2"><div class="JS9Progress"><progress name="progress" class="JS9ProgressBar" value="0" max="100"></progress></div></td></tr>'
    }
};

// init plugin
JS9.Info.init = function(){
    let i, key, opts, obj, infoHTML;
    // only init if we are displaying a new image
    // i.e., avoid re-init when changing contrast/bias
    if( this.display.image && this.display.image === this.lastimage ){
	switch(this.display.image.callingPlugin){
	case "onplugindisplay":
	case "onimagerefresh":
	case "onupdateprefs":
	    break;
	default:
	    return;
	}
	this.lastimage = this.display.image;
    }
    // generate the web page
    opts = JS9.globalOpts.infoBox;
    obj = JS9.Info.opts.infoObj;
    infoHTML = '<table name="info" class="js9InfoTable">';
    for(i=0; i<opts.length; i++){
	key = opts[i];
	// aesthetic condideration: skip wcs display if we have no wcs
	if( key.match(/^wcs/)            &&
	    JS9.globalOpts.infoBoxResize &&
	    this.display.image && !(this.display.image.raw.wcs>0) ){
	    continue;
	}
	if( key.match(/^regions/)                       &&
	    JS9.globalOpts.regDisplay === "lightwin" ){
	    continue;
	}
	// add html for this line of the display
	if( key in obj ){
	    infoHTML += obj[key];
	}
    }
    infoHTML += '</table>';
    // reset previous
    if( this.infoConjq ){
	this.infoConjq.html("");
    }
    // set width and height on div
    this.width = this.divjq.attr("data-width");
    if( !this.width  ){
	this.width  = JS9.Info.WIDTH;
    }
    this.divjq.css("width", this.width);
    this.width = parseInt(this.divjq.css("width"), 10);
    this.height = this.divjq.attr("data-height");
    if( !this.height ){
	this.height = JS9.Info.HEIGHT;
	if( JS9.globalOpts.regDisplay !== "lightwin" ){
	    this.height += JS9.Info.REGHEIGHT;
	}
    }
    this.divjq.css("height", this.height);
    this.height = parseInt(this.divjq.css("height"), 10);
    // add container to the high-level div
    this.infoConjq = $("<div>")
	.addClass("JS9Container")
	.append(infoHTML)
	.appendTo(this.divjq);
    // save the jquery element for later processing
    this.jq = this.infoConjq.find("[name='info']");
};

// display a message on the image canvas or info plugin
// call with display as context
JS9.Info.display = function(type, message, target, force){
    let s, t;
    let tobj, split, area, tokens, rexp, color, info, key, el, jel, rid, im;
    let disp = this;
    // backward compatibility -- allow context to be Image
    if( this.display ){
	disp = this.display;
    }
    im = disp.image;
    // if image is context
    if( disp.pluginInstances ){
	info = disp.pluginInstances.JS9Info;
    }
    // where are we displaying?
    if( info && info.status === "active" && (!target || !force) ){
	// if info plugin is active, use it
	tobj = info;
    } else if( target ){
	// if specific info target was specified, use it
	if( target === disp ){
	    // passed disp in as a target
	    tobj = disp;
	    target = null;
	} else if( target instanceof jQuery ){
	    tobj = target;
	} else if( typeof target === "object" ){
	    tobj = $(target);
	} else {
	    tobj = $(`#${target}`);
	}
	if( !tobj.length ){
	    // fallback if the target element does not exist
	    tobj = disp;
	    target = null;
	}
	this.lasttarget = target;
    } else {
	// use image context
	tobj = disp;
	this.lasttarget = disp;
    }
    // handle progress specially
    if( type === "progress" ){
	if( tobj === info ){
	    el = info.jq;
	} else {
	    el = tobj.divjq;
	}
	if( el.length > 0 ){
	    el = el.find("[name='progress']");
	    switch(typeof message){
	    case "string":
	    case "boolean":
		if( message ){
		    if( message === "indeterminate" ){
			el.removeAttr("value");
		    }
		    el.parent().css("display", "inline-block");
		} else {
		    el.parent().css("display", "none");
		    el.attr("value", 0);
		}
		break;
	    case "object":
		if( message[1] ){
		    el.attr("max", message[1]);
		}
		el.attr("value", message[0]);
		break;
	    }
	}
	return;
    }
    // plugin-based display: fill in html form
    // (except if this is regions info and we are displaying in a lightwin)
    if( tobj === info &&
	(type !== "regions" || JS9.globalOpts.regDisplay !== "lightwin") ){
	switch( typeof message ){
	case "string":
	    jel = info.jq.find(`[name='${type}']`);
	    if( jel.length > 0 ){
		jel.val(message);
	    } else {
		// fallback to image display, if necessary
		if( JS9.globalOpts.fallbackDisplay ){
		    tobj = disp;
		}
	    }
	    break;
	case "object":
	    // process all key in the object
	    for( key in message ){
		if( message.hasOwnProperty(key) ){
		    // set value, if possible
		    jel = info.jq.find(`[name='${key}']`);
		    if( jel.length > 0 ){
			jel.val(message[key]);
		    }
		}
	    }
	    break;
	}
	// return if we did not change the target object
	if( tobj !== disp ){
	    return disp;
	}
    }
    // display-based message
    switch(type){
    case "regions":
	// display regions in a light window?
	if( JS9.globalOpts.regDisplay === "lightwin" ){
	    rid = `${disp.id}_regions`;
	    el = $(`#${rid}`);
	    // does window exist (and is not closed)?
	    if( el.length && !el[0].isClosed ){
		// found the window: fill the message area
		area = el.find(".JS9Message");
	    } else if( message ) {
		// start a light window and recurse to display the message
		$(JS9.lightOpts[JS9.LIGHTWIN].topid).arrive(`#${rid}`,
	        { fireOnAttributesModification: true },
	        () => {
		    JS9.Info.display.call(this, type, message, target, force);
		});
		t = "Regions";
		if( im ){
		    t += `: ${im.id}`;
		}
		t += " ";
		t += sprintf(JS9.IDFMT, this.id);
		JS9.lightWin(rid, "inline", "<div class='JS9Message'></div>",
			     t, JS9.lightOpts[JS9.LIGHTWIN].regWin0);
		return;
	    } else {
		// don't bring up a light window just to clear it!
		return;
	    }
	} else if( target ){
	    area = tobj;
	} else {
	    area = tobj.regionsArea;
	    tobj.infoheight = tobj.infoArea.height() + 4;
	    tobj.regheight = Math.max(tobj.infoheight * 2 + 10,
			 tobj.infoheight + tobj.regionsArea.height() + 10);
	    if( !disp.image || (disp.image.iy > tobj.regheight) ){
		color = JS9.textColorOpts.inimage;
	    } else {
		color = JS9.textColorOpts.regions;
	    }
	}
	split = ";";
	break;
    case "info":
    default:
	if( target ){
	    area = tobj;
	} else {
	    area = tobj.infoArea;
	    tobj.infoheight = tobj.infoArea.height() + 4;
	    if( !disp.image || (disp.image.iy > tobj.infoheight) ){
		color = JS9.textColorOpts.inimage;
	    } else {
		color = JS9.textColorOpts.info;
	    }
	    split = "";
	}
	break;
    }
    // massage the message before display, if necessary
    switch( typeof message ){
    case "string":
	s = message;
	break;
    case "object":
	key = `vstr${JS9.globalOpts.valposWidth}`;
	s = message[key] || message.vstrmedium || message.vstr || "";
	break;
    }
    if( split !== "" ){
	tokens = s.split(split);
	if( tokens.length > 2 ){
	    rexp = new RegExp(split, "g");
	    s = s.replace(rexp, "<br>");
	}
    }
    // set the color
    if( color ){
	area.css("color", color);
    }
    // display the message
    area.html(s);
    // allow chaining
    return disp;
};
JS9.Display.prototype.displayMessage = JS9.Info.display;
// backwards compatibility
JS9.Image.prototype.displayMessage = JS9.Info.display;

// clear an info message
JS9.Info.clear = function(which){
    let disp = this;
    // backward compatibility -- allow context to be Image
    if( this.display ){
	disp = this.display;
    }
    if( which ){
	disp.displayMessage(which, "");
    } else {
	disp.displayMessage("info", "");
	disp.displayMessage("regions", "");
	disp.displayMessage("progress", false);
    }
    // allow chaining
    return disp;
};
JS9.Display.prototype.clearMessage = JS9.Info.clear;
// backwards compatibility
JS9.Image.prototype.clearMessage = JS9.Info.clear;

// when a plugin window is brought up:
// save valpos and set to true
JS9.Info.pluginDisplay = function(im){
    let disp;
    if( im && im.display ){
	if( im.tmp ){
	    im.tmp.info_ovalpos = im.params.valpos;
	}
	im.params.valpos = true;
	// clear previous, if necessary
	if( this.display.lasttarget ){
	    disp = this.display;
	    disp.displayMessage("info", "", disp.lasttarget, true);
	    disp.displayMessage("regions", "", disp.lasttarget, true);
	    disp.displayMessage("progress", false, disp.lasttarget, true);
	    delete disp.lasttarget;
	}
    }
};

// when a plugin window is closed, reset valpos to previous
JS9.Info.pluginClose = function(im){
    if( im && im.display ){
	if( im.tmp && (im.tmp.info_ovalpos !== undefined) ){
	    im.params.valpos = im.tmp.info_ovalpos;
	}
    }
};

// having added the prototype displayMessage, we can define a public routine
JS9.mkPublic("DisplayMessage", function(...args){
    let got, type, message, target;
    const obj = JS9.parsePublicArgs(args);
    const display = JS9.lookupDisplay(obj.display);
    if( !display ){
	JS9.error("invalid display for display message");
    }
    type = obj.argv[0];
    message = obj.argv[1];
    target = obj.argv[2];
    got = display.displayMessage(type, message, target);
    if( got === display ){
	got = "OK";
    }
    return got;
});

// add this plugin into JS9
JS9.RegisterPlugin("JS9", "Info", JS9.Info.init,
		   {menuItem: "InfoBox",
		    help: "help/info.html",
		    dynamicSelect: true,
		    onplugindisplay: JS9.Info.pluginDisplay,
		    onpluginclose: JS9.Info.pluginClose,
		    onimagedisplay: JS9.Info.init,
		    onimagerefresh: JS9.Info.init,
		    onupdateprefs: JS9.Info.init,
		    winTitle: "Info",
		    winResize: true,
		    winDims: [JS9.Info.WIDTH, JS9.Info.HEIGHT]});
/*
 * keyboard plugin (September 21, 2016)
 */

/*global $, JS9, sprintf, fabric */

"use strict";

// create our namespace, and specify some meta-information and params
JS9.Keyboard = {};
JS9.Keyboard.CLASS = "JS9";         // class of plugin
JS9.Keyboard.NAME = "Keyboard";     // name of this plugin
JS9.Keyboard.WIDTH =  450;	    // width of light window
JS9.Keyboard.HEIGHT = 420;	    // height of light window
JS9.Keyboard.BASE = JS9.Keyboard.CLASS + JS9.Keyboard.NAME;

JS9.Keyboard.actionHTML="<div class='JS9KeyboardText'><button class='JS9Button JS9KeyboardButton' type='button' value='%s'>%s</button></div><div class='JS9KeyboardAction'>%s</div>";

// get an id based on the action
JS9.Keyboard.actionid = function(cname, aname){
    return (`${cname}_${aname}`).replace(/[^A-Za-z0-9_]/g, "_");
};

// add to the action list
JS9.Keyboard.addAction = function(container, cname, aname){
    let s, id, divjq;
    id = JS9.Keyboard.actionid(cname, aname);
    // create the html for this action
    s = sprintf(JS9.Keyboard.actionHTML, aname, cname, aname);
    // add action html to the action container
    divjq = $("<div class='JS9KeyboardItem'>")
	.attr("id", id)
	.html(s)
	.appendTo(container);
    divjq.find('.JS9KeyboardButton').on("click", (evt) => {
	const action = evt.currentTarget.value;
	const im = this.display.image;
	if( im && action && JS9.Keyboard.Actions[action] ){
	    JS9.Keyboard.Actions[action](im, im.ipos, evt);
	}
    });
    return divjq;
};

// common code for arrow key processing
JS9.Keyboard.arrowKey = function(im, evt, inc, active){
    let cpos;
    // change display and image position, redisplay magnifier
    im.pos.x += inc.x;
    im.pos.y += inc.y;
    im.ipos = im.displayToImagePos(im.pos);
    if( JS9.hasOwnProperty("MouseTouch") ){
	im.valpos = null;
	JS9.MouseTouch.Actions["display value/position"](im, im.ipos, evt);
    }
    if( JS9.hasOwnProperty("Magnifier") ){
	JS9.Magnifier.display(im, im.ipos);
    }
    if( JS9.globalOpts.regArrowCrosshair && JS9.hasOwnProperty("Crosshair") ){
	im.tmp.arrowCrosshair = true;
	im.tmp.arrowCrosshairVisible = true;
	if( active ){
	    if( active.pub ){
		if(  active.pub.shape === "polygon"              &&
		     active.pub.pts && active.pub.pts.length > 1 ){
		    cpos = JS9.centroidPolygon(active.pub.pts);
		} else {
		    cpos = {x: active.pub.x, y: active.pub.y};
		}
		JS9.Crosshair.display(im, cpos, evt);
	    }
	} else {
	    JS9.Crosshair.display(im, im.ipos, evt);
	}
	delete im.tmp.arrowCrosshair;
    }
};

// ---------------------------------------------------------------------
//
// Keyboard.Actions: callbacks when on key press
//
// the keyboardActions array is in JS9.globalOpts determine
// the initial mapping of keyboard configuration to callback, e.g.:
//
//  JS9.globalOpts.keyboardActions = {'?': 'copy valpos to clipboard',
//                                     '/': 'copy wcs coords to clipboard',
//					...
//                                    };
//
// You can add your own to the Keyboard.Actions object and use them in the
// globalOpts.keyboardActions object
//
// ---------------------------------------------------------------------
JS9.Keyboard.Actions = {};

// eslint-disable-next-line no-unused-vars
JS9.Keyboard.Actions["open local file"] = function(im, ipos, evt){
    if( window.isElectron && typeof evt.data === "object" ){
	evt.data.displayLoadForm();
    } else {
	JS9.OpenFileMenu({display: evt.data});
    }
};

// eslint-disable-next-line no-unused-vars
JS9.Keyboard.Actions["close image"] = function(im, ipos, evt){
    if( im ){
	im.closeImage();
    }
};

// eslint-disable-next-line no-unused-vars
JS9.Keyboard.Actions["new JS9 light window"] = function(im, ipos, evt){
    let opts;
    if( evt && evt.data && evt.data.id ){
	opts = {clone: evt.data.id};
    }
    JS9.LoadWindow(null, opts, "light");
};

// eslint-disable-next-line no-unused-vars
JS9.Keyboard.Actions["copy wcs position to clipboard"] = function(im, ipos, evt){
    let s, arr, opts;
    // sanity check
    if( !im || !im.raw.wcs || !ipos ){
	return;
    }
    // get wcs coords of current position
    s = JS9.pix2wcs(im.raw.wcs, ipos.x, ipos.y).trim();
    if( JS9.globalOpts.copyWcsPosFormat ){
	arr = s.split(/\s+/);
	opts = [{name: "ra",  value: arr[0]},
		{name: "dec", value: arr[1]},
		{name: "sys", value: arr[2]}];
	s = im.expandMacro(JS9.globalOpts.copyWcsPosFormat, opts);
    }
    // copy to clipboard
    JS9.CopyToClipboard(s, im);
    return s;
};

// eslint-disable-next-line no-unused-vars
JS9.Keyboard.Actions["copy physical position to clipboard"] = function(im, ipos, evt){
    let phys, s;
    // sanity check
    if( !im || !ipos ){
	return;
    }
    // get physical coords from image coords
    phys = im.imageToLogicalPos(ipos);
    s = sprintf("%f %f", phys.x, phys.y);
    // copy to clipboard
    JS9.CopyToClipboard(s, im);
    return s;
};

// eslint-disable-next-line no-unused-vars
JS9.Keyboard.Actions["copy pixel value to clipboard"] = function(im, ipos, evt){
    let s, val, prec;
    // sanity check
    if( !im || !ipos ){
	return;
    }
    // value at current position
    val = im.raw.data[Math.floor(ipos.y-0.5) * im.raw.width +
		      Math.floor(ipos.x-0.5)];
    prec = JS9.floatPrecision(im.params.scalemin, im.params.scalemax);
    s = JS9.floatFormattedString(val, prec, 3);
    // copy to clipboard
    JS9.CopyToClipboard(s, im);
    return s;
};

// eslint-disable-next-line no-unused-vars
JS9.Keyboard.Actions["copy value and position to clipboard"] = function(im, ipos, evt){
    let s, key, ovalpos;
    // sanity check
    if( !im || !ipos ){
	return;
    }
    // set valpos in case its turned off
    ovalpos = im.setParam("valpos", true);
    // get current valpos
    s = im.updateValpos(ipos, false);
    // restore original valpos
    im.setParam("valpos", ovalpos);
    // process valpos string
    key = `vstr${ JS9.globalOpts.valposWidth}`;
    if( s && s[key]){
	// reformat from html to text
	s = s[key].replace(/&nbsp;/g, " ");
    } else {
	// use blank space (otherwise, nothing is copied)
	s = " ";
    }
    // copy to clipboard
    JS9.CopyToClipboard(s, im);
    return s;
};

// eslint-disable-next-line no-unused-vars
JS9.Keyboard.Actions["edit selected region(s)"] = function(im, ipos, evt){
    let layer, ao;
    // sanity check
    if( !im ){
	return;
    }
    layer = im.layers.regions;
    if( layer ){
	ao = layer.canvas.getActiveObject();
	if( ao && ao.type !== "activeSelection" ){
	    // no active selection, edit this region
	    im.displayRegionsForm(ao);
	} else {
	    // active selection or no regions: multi
	    im.displayRegionsForm(null, {multi: true});
	}
    }
};

// eslint-disable-next-line no-unused-vars
JS9.Keyboard.Actions["add last region selected in regions menu"] = function(im, ipos, evt){
    let opts = {ireg: true};
    let key = JS9.globalOpts.regMenuSelected || "circle";
    // sanity check
    if( !im ){
	return;
    }
    opts.x = ipos.x;
    opts.y = ipos.y;
    return im.addShapes("regions", key, opts);
};

// eslint-disable-next-line no-unused-vars
JS9.Keyboard.Actions["toggle selected region: source/background"] = function(im, ipos, evt){
    // sanity check
    if( !im ){
	return;
    }
    return im.toggleRegionTags("selected", "source", "background");
};

// eslint-disable-next-line no-unused-vars
JS9.Keyboard.Actions["toggle selected region: include/exclude"] = function(im, ipos, evt){
    // sanity check
    if( !im ){
	return;
    }
    return im.toggleRegionTags("selected", "include", "exclude");
};

// eslint-disable-next-line no-unused-vars
JS9.Keyboard.Actions["tag selected region as 'source'"] = function(im, ipos, evt){
    // sanity check
    if( !im ){
	return;
    }
    return JS9.Keyboard.editregion(im, "source", "background");
};

// eslint-disable-next-line no-unused-vars
JS9.Keyboard.Actions["tag selected region as 'background'"] = function(im, ipos, evt){
    // sanity check
    if( !im ){
	return;
    }
    return JS9.Keyboard.editregion(im, "background", "source");
};

// eslint-disable-next-line no-unused-vars
JS9.Keyboard.Actions["tag selected region as 'include'"] = function(im, ipos, evt){
    // sanity check
    if( !im ){
	return;
    }
    return JS9.Keyboard.editregion(im, "include", "exclude");
};

// eslint-disable-next-line no-unused-vars
JS9.Keyboard.Actions["tag selected region as 'exclude'"] = function(im, ipos, evt){
    // sanity check
    if( !im ){
	return;
    }
    return JS9.Keyboard.editregion(im, "exclude", "include");
};

// eslint-disable-next-line no-unused-vars
JS9.Keyboard.Actions["toggle full screen mode"] = function(im, ipos, evt){
    const display = evt.data;
    if( (display.width  === display.width0)  &&
	(display.height === display.height0) ){
	display.resize("full", {center: true});
    } else {
	display.resize("reset");
    }
};

// eslint-disable-next-line no-unused-vars
JS9.Keyboard.Actions["reset zoom"] = function(im, ipos, evt){
    // sanity check
    if( !im ){
	return;
    }
    im.setZoom("1");
};

// eslint-disable-next-line no-unused-vars
JS9.Keyboard.Actions["zoom in"] = function(im, ipos, evt){
    // sanity check
    if( !im ){
	return;
    }
    im.setZoom("*2");
};

// eslint-disable-next-line no-unused-vars
JS9.Keyboard.Actions["zoom out"] = function(im, ipos, evt){
    // sanity check
    if( !im ){
	return;
    }
    im.setZoom("/2");
};

// eslint-disable-next-line no-unused-vars
JS9.Keyboard.Actions["display next image"] = function(im, ipos, evt){
    // sanity check
    if( !im ){
	return;
    }
    im.display.nextImage(1);
};

// eslint-disable-next-line no-unused-vars
JS9.Keyboard.Actions["display previous image"] = function(im, ipos, evt){
    // sanity check
    if( !im ){
	return;
    }
    im.display.nextImage(-1);
};

// eslint-disable-next-line no-unused-vars
JS9.Keyboard.Actions["open a local FITS file"] = function(im, ipos, evt){
    // nb: evt.data is always the js9 display (so no image needed here)
    JS9.OpenFileMenu({display: evt.data});
};

// eslint-disable-next-line no-unused-vars
JS9.Keyboard.Actions["save image as a FITS file"] = function(im, ipos, evt){
    // sanity check
    if( !im ){
	return;
    }
    im.saveFITS();
};

// eslint-disable-next-line no-unused-vars
JS9.Keyboard.Actions["save image as a PNG file"] = function(im, ipos, evt){
    // sanity check
    if( !im ){
	return;
    }
    im.savePNG();
};

// eslint-disable-next-line no-unused-vars
JS9.Keyboard.Actions["save regions as a text file"] = function(im, ipos, evt){
    // sanity check
    if( !im ){
	return;
    }
    im.saveRegions();
};

// eslint-disable-next-line no-unused-vars
JS9.Keyboard.Actions["move region/position up"] = function(im, ipos, evt){
    let canvas, layerName, active;
    let inc = 1;
    if( evt ){
	evt.preventDefault();
    }
    // sanity check
    if( !im ){ return; }
    if( JS9.specialKey(evt) ){ inc *= 5; }
    layerName = im.layer || "regions";
    canvas = im.display.layers[layerName].canvas;
    if( fabric.major_version === 1 ){
	active = canvas.getActiveObject() || canvas.getActiveGroup();
    } else {
	active = canvas.getActiveObject();
    }
    if( active ){
	im.changeShapes(layerName, "selected", {deltay: inc});
    }
    JS9.Keyboard.arrowKey(im, evt, {x: 0, y: inc * -1}, active);
    canvas.fire("mouse:up");
};

JS9.Keyboard.Actions["move region/position down"] = function(im, ipos, evt){
    let canvas, layerName, active;
    let inc = -1;
    if( evt ){
	evt.preventDefault();
    }
    // sanity check
    if( !im ){ return; }
    if( JS9.specialKey(evt) ){ inc *= 5; }
    layerName = im.layer || "regions";
    canvas = im.display.layers[layerName].canvas;
    if( fabric.major_version === 1 ){
	active = canvas.getActiveObject() || canvas.getActiveGroup();
    } else {
	active = canvas.getActiveObject();
    }
    if( active ){
	im.changeShapes(layerName, "selected", {deltay: inc});
    }
    JS9.Keyboard.arrowKey(im, evt, {x: 0, y: inc * -1}, active);
    canvas.fire("mouse:up");
};

JS9.Keyboard.Actions["move region/position left"] = function(im, ipos, evt){
    let canvas, layerName, active;
    let inc = -1;
    if( evt ){
	evt.preventDefault();
    }
    // sanity check
    if( !im ){ return; }
    if( JS9.specialKey(evt) ){ inc *= 5; }
    layerName = im.layer || "regions";
    canvas = im.display.layers[layerName].canvas;
    if( fabric.major_version === 1 ){
	active = canvas.getActiveObject() || canvas.getActiveGroup();
    } else {
	active = canvas.getActiveObject();
    }
    if( active ){
	im.changeShapes(layerName, "selected", {deltax: inc});
    }
    JS9.Keyboard.arrowKey(im, evt, {x: inc, y: 0}, active);
    canvas.fire("mouse:up");
};

JS9.Keyboard.Actions["move region/position right"] = function(im, ipos, evt){
    let canvas, layerName, active;
    let inc = 1;
    if( evt ){
	evt.preventDefault();
    }
    // sanity check
    if( !im ){ return; }
    if( JS9.specialKey(evt) ){ inc *= 5; }
    layerName = im.layer || "regions";
    canvas = im.display.layers[layerName].canvas;
    if( fabric.major_version === 1 ){
	active = canvas.getActiveObject() || canvas.getActiveGroup();
    } else {
	active = canvas.getActiveObject();
    }
    if( active ){
	im.changeShapes(layerName, "selected", {deltax: inc});
    }
    JS9.Keyboard.arrowKey(im, evt, {x: inc, y: 0}, active);
    canvas.fire("mouse:up");
};
// eslint-disable-next-line no-unused-vars
JS9.Keyboard.Actions["remove selected region"] = function(im, ipos, evt){
    let canvas, layerName;
    if( evt ){
	evt.preventDefault();
    }
    // sanity check
    if( !im ){ return; }
    layerName = im.layer || "regions";
    canvas = im.display.layers[layerName].canvas;
    im.removeShapes(layerName, "selected");
    im.display.clearMessage(layerName);
    canvas.fire("mouse:up");
};

JS9.Keyboard.Actions["raise region layer to top"] = function(im, ipos, evt){
    if( evt ){
	evt.preventDefault();
    }
    // sanity check
    if( !im ){ return; }
    im.activeShapeLayer("regions");
};

JS9.Keyboard.Actions["toggle active shape layers"] = function(im, ipos, evt){
    if( evt ){
	evt.preventDefault();
    }
    // sanity check
    if( !im ){ return; }
    im.toggleShapeLayers();
};

JS9.Keyboard.Actions["send selected region to back"] = function(im, ipos, evt){
    if( evt ){
	evt.preventDefault();
    }
    // sanity check
    if( !im ){ return; }
    im.changeShapes("regions", "selected", {send: "back"});
};

// eslint-disable-next-line no-unused-vars
JS9.Keyboard.Actions["copy region(s) to clipboard"] = function(im, ipos, evt){
    let s;
    // sanity check
    if( !im ){ return; }
    // get selected or all region(s)
    s = im.listRegions(null, {mode: 1});
    // copy to clipboard
    JS9.CopyToClipboard(s, im);
    return s;
};

// eslint-disable-next-line no-unused-vars
JS9.Keyboard.Actions["copy selected region(s) to clipboard"] = function(im, ipos, evt){
    let s;
    // sanity check
    if( !im ){ return; }
    // get selected region(s)
    s = im.listRegions("selected", {mode: 1});
    // copy to clipboard
    JS9.CopyToClipboard(s, im);
    return s;
};

// eslint-disable-next-line no-unused-vars
JS9.Keyboard.Actions["copy all regions to clipboard"] = function(im, ipos, evt){
    let s;
    // sanity check
    if( !im ){ return; }
    // get all regions
    s = im.listRegions("all", {mode: 1});
    // copy to clipboard
    JS9.CopyToClipboard(s, im);
    return s;
};

// eslint-disable-next-line no-unused-vars
JS9.Keyboard.Actions["paste regions from local clipboard"] = function(im, ipos, evt){
    return JS9.Regions.pasteFromClipboard.call(im, false);
};

// eslint-disable-next-line no-unused-vars
JS9.Keyboard.Actions["paste regions to current position"] = function(im, ipos, evt){
    return JS9.Regions.pasteFromClipboard.call(im, true);
};

// eslint-disable-next-line no-unused-vars
JS9.Keyboard.Actions["undo remove of region(s)"] = function(im, ipos, evt){
    if( im ){
	im.unremoveRegions();
    }
};

// eslint-disable-next-line no-unused-vars
JS9.Keyboard.Actions["select region"] = function(im, ipos, evt){
    let i, layer, canvas, obj, objs;
    // sanity check
    if( !im ){ return; }
    layer = im.layer || "regions";
    canvas = im.layers[layer].canvas;
    objs = canvas.getObjects();
    for(i=0; i<objs.length; i++){
	obj = objs[i];
	if( canvas.containsPoint(null, obj, im.pos) ){
	    canvas.setActiveObject(obj);
	    break;
	}
    }
};

// eslint-disable-next-line no-unused-vars
JS9.Keyboard.Actions["select all regions"] = function(im, ipos, evt){
    let layer, canvas, selection;
    // sanity check
    if( !im || fabric.major_version === 1 ){ return; }
    layer = im.layer || "regions";
    canvas = im.layers[layer].canvas;
    selection = new fabric.ActiveSelection(canvas.getObjects(), {
	canvas: canvas
    });
    canvas.setActiveObject(selection);
    canvas.renderAll();
};

JS9.Keyboard.Actions["refresh image"] = function(im, ipos, evt){
    // sanity check
    if( !im ){ return; }
    if( evt ){
	evt.preventDefault();
    }
    im.refreshImage();
};

JS9.Keyboard.Actions["display full image"] = function(im, ipos, evt){
    // sanity check
    if( !im ){ return; }
    if( evt ){
	evt.preventDefault();
    }
    im.displaySection("full");
};

JS9.Keyboard.Actions["display selected cutouts"] = function(im, ipos, evt){
    // sanity check
    if( !im ){ return; }
    if( evt ){
	evt.preventDefault();
    }
    im.displaySection("selected");
};

// eslint-disable-next-line no-unused-vars
JS9.Keyboard.Actions["toggle coordinate grid"] = function(im, ipos, evt){
    JS9.Grid.toggle(im);
};

// eslint-disable-next-line no-unused-vars
JS9.Keyboard.Actions["toggle crosshair"] = function(im, ipos, evt){
    // sanity check
    if( !im ){ return; }
    if( evt ){
	evt.preventDefault();
    }
    im.params.crosshair = !im.params.crosshair;
    if( !im.params.crosshair ){
	JS9.Crosshair.hide(im);
    }
};

// eslint-disable-next-line no-unused-vars
JS9.Keyboard.Actions["toggle mouse/touch plugin"] = function(im, ipos, evt){
    if( im ){
	im.display.displayPlugin("JS9MouseTouch");
    }
};

// eslint-disable-next-line no-unused-vars
JS9.Keyboard.Actions["toggle keyboard actions plugin"] = function(im, ipos, evt){
    if( im ){
	im.display.displayPlugin("JS9Keyboard");
    }
};

// eslint-disable-next-line no-unused-vars
JS9.Keyboard.Actions["toggle preferences plugin"] = function(im, ipos, evt){
    if( im ){
	im.display.displayPlugin("JS9Preferences");
    }
};

// eslint-disable-next-line no-unused-vars
JS9.Keyboard.Actions["toggle shape layers plugin"] = function(im, ipos, evt){
    if( im ){
	im.display.displayPlugin("JS9Layers");
    }
};

// eslint-disable-next-line no-unused-vars
JS9.Keyboard.Actions["pan to mouse position"] = function(im, ipos, evt){
    if( im ){
	im.setPan("mouse");
    }
};

// eslint-disable-next-line no-unused-vars
JS9.Keyboard.Actions["flip image around x axis"] = function(im){
    if( im ){
	im.setFlip("x");
    }
};

// eslint-disable-next-line no-unused-vars
JS9.Keyboard.Actions["flip image around y axis"] = function(im){
    if( im ){
	im.setFlip("y");
    }
};

// eslint-disable-next-line no-unused-vars
JS9.Keyboard.Actions["rotate image by 90 degrees"] = function(im){
    if( im ){
	im.setRot90(90);
    }
};

// eslint-disable-next-line no-unused-vars
JS9.Keyboard.Actions["rotate image by -90 degrees"] = function(im){
    if( im ){
	im.setRot90(-90);
    }
};

// get action associated with the current keyboard
JS9.Keyboard.getAction = function(im, evt){
    let action;
    const s = JS9.eventToCharStr(evt);
    // look for an action associated with this key
    if( s ){
	action = JS9.globalOpts.keyboardActions[s];
    }
    return action;
};

// execute the keyboard action routine
JS9.Keyboard.action = function(im, ipos, evt, action){
    action = action || JS9.Keyboard.getAction(im, evt);
    // call the keyboard action
    if( action && JS9.Keyboard.Actions[action] ){
	JS9.Keyboard.Actions[action](im, ipos, evt);
	// extended plugins
	if( im && JS9.globalOpts.extendedPlugins ){
	    im.xeqPlugins("keydown", "onkeyboardaction", evt);
	}
    }
};

JS9.Keyboard.editregion= function(im, xnew, xold){
    let i, j, s, tags;
    // get selected region
    s = im.getShapes("regions", "selected");
    if( s.length ){
	for(i=0; i<s.length; i++){
	    tags = s[i].tags;
	    for(j=0; j<tags.length; j++){
		if( tags[j] === xnew ){
		    // already have this tag
		    xnew = "";
		    break;
		}
		if( tags[j] === xold ){
		    // switch with "opposite" tag
		    tags[j] = xnew;
		    xnew = "";
		    break;
		}
	    }
	    // add new tag?
	    if( xnew ){
		tags.push(xnew);
	    }
	}
	im.changeShapes("regions", "selected", {tags: tags});
    }
};

// constructor: add HTML elements to the plugin
JS9.Keyboard.init = function(){
    let s, key;
    // on entry, these elements have already been defined:
    // this.div:      the DOM element representing the div for this plugin
    // this.divjq:    the jquery object representing the div for this plugin
    // this.id:       the id ofthe div (or the plugin name as a default)
    // this.display:  the display object associated with this plugin
    // this.dispMode: display mode (for internal use)
    //
    // create container to hold action container and header
    // clean main container
    this.divjq.html("");
    // allow scrolling on the plugin
    this.divjq.addClass("JS9PluginScrolling");
    // main container
    this.keyboardContainer = $("<div>")
	.addClass(`${JS9.Keyboard.BASE}Container`)
	.attr("id", `${this.id}KeyboardContainer`)
	.appendTo(this.divjq);
    s = `<div class='${JS9.Keyboard.BASE}Header'><b>Keys and their actions (or click the buttons):</b></div><p>`;
    this.keyboardHeadContainer = $("<div>")
	.addClass(`${JS9.Keyboard.BASE}Container`)
	.attr("id", `${this.id}KeyboardHeadContainer`)
        .html(s)
	.appendTo(this.keyboardContainer);
    // container to hold keyboard actions
    this.keyboardActionContainer = $("<div>")
	.addClass(`${JS9.Keyboard.BASE}ActionContainer`)
	.attr("id", `${this.id}ActionContainer`)
        .html("")
	.appendTo(this.keyboardContainer);
    // add actions
    for(key in JS9.globalOpts.keyboardActions ){
	if( JS9.globalOpts.keyboardActions.hasOwnProperty(key) ){
	    s = JS9.globalOpts.keyboardActions[key];
	    JS9.Keyboard.addAction.call(this, this.keyboardActionContainer,
					key, s);
	}
    }
 };

JS9.RegisterPlugin(JS9.Keyboard.CLASS, JS9.Keyboard.NAME,
		   JS9.Keyboard.init,
		   {menuItem: "Keyboard Actions",
		    onplugindisplay: JS9.Keyboard.init,
		    help: "help/keyboard.html",
		    winTitle: "Keyboard Actions",
		    winResize: true,
		    winDims: [JS9.Keyboard.WIDTH,JS9.Keyboard.HEIGHT]});
/*
 * shape layer plugin (October 7, 2016)
 */

/*global $, JS9, sprintf */

"use strict";

// create our namespace, and specify some meta-information and params
JS9.Layers = {};
JS9.Layers.CLASS = "JS9";	// class of plugins (1st part of div class)
JS9.Layers.NAME = "Layers";     // name of this plugin (2nd part of div class)
JS9.Layers.WIDTH =  460;	// width of light window
JS9.Layers.HEIGHT = 250;	// height of light window
JS9.Layers.BASE = JS9.Layers.CLASS + JS9.Layers.NAME;  // CSS base class name

JS9.Layers.headerHTML='Shape layers can be hidden or made visible below. The topmost visible layer in the stack is <b>active</b>: it responds to mouse and touch events. Move a layer to the top of the stack to make it active.';

JS9.Layers.layerHTML="<span style='float: left'>$visible&nbsp;&nbsp;$save&nbsp;&nbsp;</span>&nbsp;&nbsp; <span class='JS9LayersSpan'>$layer&nbsp;&nbsp</span>";

JS9.Layers.nolayersHTML='<p><span class="JS9NoLayers">[Layers will appear here as they are created]</span>';

JS9.Layers.visibleHTML='<input class="JS9LayersVisibleCheck" type="checkbox" id="visible" name="visible" value="visible" onclick="javascript:JS9.Layers.xvisible(\'%s\', \'%s\', \'%s\', this)">visible';

JS9.Layers.saveBothHTML='<select class="JS9Select JS9LayersSaveBothSelect" onfocus="this.selectedIndex=0;" onchange="JS9.Layers.xsave(\'%s\', \'%s\', \'%s\', this)"><option selected disabled>save as ...</option><option value="catalog">catalog</option><option value="regions">regions</option><option value="svg">svg</option></select>';

JS9.Layers.saveRegionsHTML='<select class="JS9LayersSaveSelect" onfocus="this.selectedIndex=0;" onchange="JS9.Layers.xsave(\'%s\', \'%s\', \'%s\', this)"><option selected disabled>save as ...</option><option value="regions">regions</option><option value="svg">svg</option></select>';

JS9.Layers.layerNameHTML='<b>%s</b>';

// get an id based on the file image id and layer
JS9.Layers.imid = function(im, layer){
    const id = `${im.display.id}_${im.id}_${layer}_`;
    return `${id.replace(/[^A-Za-z0-9_]/g, "_")}Layer`;
};

// get a class unique between displays
JS9.Layers.dispclass = function(im){
    const id = `${JS9.Layers.BASE}_${im.display.id}`;
    return id.replace(/[^A-Za-z0-9_]/g, "_");
};

// change the active image
JS9.Layers.activeLayer = function(im, pinst){
    let i, s, id, dcls, order;
    if( im ){
	order = pinst.layersLayerContainer.sortable("toArray");
	if( (order.length === 1) && !order[0] ){
	    return;
	}
	for(i=0; i<order.length; i++){
	    order[i] = $(`#${order[i]}`).attr("layer");
	}
	s = im.activeShapeLayer(order);
	id = JS9.Layers.imid(im, s);
	dcls = `${JS9.Layers.dispclass(im)}_Layer`;
	$(`.${dcls}`)
	    .removeClass(`${JS9.Layers.BASE}LayerActive`)
	    .addClass(`${JS9.Layers.BASE}LayerInactive`);
	$(`#${id}`)
	    .removeClass(`${JS9.Layers.BASE}LayerInactive`)
	    .addClass(`${JS9.Layers.BASE}LayerActive`);
    }
};

// make shape layer visible/invisible
JS9.Layers.xvisible = function(did, id, layer, target){
    let pinst, mode;
    const im = JS9.lookupImage(id, did);
    if( im ){
	if( target.checked ){
	    mode = true;
	} else {
	    mode = false;
	}
	// change visibility
	im.showShapeLayer(layer, mode);
	// might have changed the active layer
	pinst = im.display.pluginInstances[JS9.Layers.BASE];
	// set active layer
	JS9.Layers.activeLayer(im, pinst, true);
    }
};

// save layer (catalog or regions)
// eslint-disable-next-line no-unused-vars
JS9.Layers.xsave = function(did, id, layer, target){
    const im = JS9.lookupImage(id, did);
    const save = target.options[target.selectedIndex].value;
    if( im ){
	if( save === "catalog" ){
	    im.saveCatalog(null, layer);
	} else if( save === "regions" ){
	    im.saveRegions(null, null, layer);
	} else if( save === "svg" ){
	    im.saveRegions(null, null, {layer: layer, type: "svg"});
	}
    }
};

// add a layer to the list
JS9.Layers.addLayer = function(im, layer){
    let l, s, id, divjq, zindex, added, dcls, imid, dispid;
    const cls = `${JS9.Layers.BASE}Layer`;
    const opts = [];
    // sanity checks
    if( !im || !layer || !im.layers[layer] ||
	(im.layers[layer].dlayer.dtype !== "main") ){
	return;
    }
    // first time through, clear html
    if( !this. nlayer ){
	this.layersLayerContainer.html("");
    }
    // convenience variables
    imid = im.id;
    dispid = im.display.id;
    // get current z-index
    zindex = parseInt(im.display.layers[layer].divjq.css("z-index"), 10);
    // get unique id for this layer
    id = JS9.Layers.imid(im, layer);
    // get class for this layer 
    dcls = `${JS9.Layers.dispclass(im)}_Layer`;
    // value to pass to the macro expander
    opts.push({name: "imid", value: imid});
    opts.push({name: "visible", value: sprintf(JS9.Layers.visibleHTML, 
					       dispid, imid, layer)});
    if( im.layers[layer].catalog ){
	opts.push({name: "save", value: sprintf(JS9.Layers.saveBothHTML,
						dispid, imid, layer)});
    } else {
	opts.push({name: "save", value: sprintf(JS9.Layers.saveRegionsHTML,
						dispid, imid, layer)});
    }
    if( JS9.DEBUG > 1 ){
	l = `${layer} layer [zindex: ${zindex}]`;
    } else {
	l = `${layer} layer`;
    }
    opts.push({name: "layer", value: sprintf(JS9.Layers.layerNameHTML, l)});
    // create the html for this layer
    s = JS9.Image.prototype.expandMacro.call(im, JS9.Layers.layerHTML, opts);
    // add layer html to the layer container
    divjq = $("<div>")
	.addClass(cls)
	.addClass(dcls)
	.attr("id", id)
	.attr("layer", layer)
	.prop("imid", imid)
        .html(s);
    if( !this.nlayer ){
	divjq.appendTo(this.layersLayerContainer);
    } else {
	this.layersLayerContainer.find(`.${cls}`).each((idx, item) => {
		let tlayer, tzindex;
		const jqitem = $(item);
		if( !added ){
		    tlayer = jqitem.attr("layer");
		    if( tlayer ){
			tzindex = parseInt(im.display.layers[tlayer].divjq
					   .css("z-index"), 10);
			if( Math.abs(zindex) > Math.abs(tzindex) ){
			    divjq.insertBefore(jqitem);
			    added = true;
			}
		    }
		}
	    });
	    if( !added ){
		divjq.appendTo(this.layersLayerContainer);
	    }
    }
    // set of unset visibility buton
    divjq.find(".JS9LayersVisibleCheck").prop("checked", !!im.layers[layer].show);
    // another layer was added
    this.nlayer++;
};

// init when a different image is displayed
JS9.Layers.display = function(){
    if( this.lastimage !== this.display.image ){
	JS9.Layers.init.call(this);
    }
};

// clear when an image closes
JS9.Layers.close = function(){
    // ensure plugin display is reset
    JS9.Layers.init.call(this, {mode: "clear"});
};

// constructor: add HTML elements to the plugin
JS9.Layers.init = function(opts){
    let key, im;
    // on entry, these elements have already been defined:
    // this.div:      the DOM element representing the div for this plugin
    // this.divjq:    the jquery object representing the div for this plugin
    // this.id:       the id ofthe div (or the plugin name as a default)
    // this.display:  the display object associated with this plugin
    // this.dispMode: display mode (for internal use)
    //
    // opts is optional
    opts = opts || {};
    // create container to hold layer container and header
    // clean main container
    this.divjq.html("");
    // no layers yet
    this.nlayer = 0;
    // allow scrolling on the plugin
    this.divjq.addClass("JS9PluginScrolling");
    // main container
    this.layersContainer = $("<div>")
	.addClass(`${JS9.Layers.BASE}Container`)
	.attr("id", `${this.id}LayersContainer`)
        .css("overflow", "auto")
	.appendTo(this.divjq);
    // header
    this.layersHeader = $("<div>")
	.addClass(`${JS9.Layers.BASE}Header`)
	.attr("id", `${this.display.id}Header`)
	.html(JS9.Layers.headerHTML)
	.appendTo(this.layersContainer);
    // container to hold layers
    this.layersLayerContainer = $("<div>")
	.addClass(`${JS9.Layers.BASE}LayerContainer`)
	.attr("id", `${this.id}LayersLayerContainer`)
        .html(JS9.Layers.nolayersHTML)
	.appendTo(this.layersContainer);
    // done if we are only clearing
    if( opts.mode === "clear" ){
	return;
    }
    // add current shape layers
    if( this.display.image ){
	im = this.display.image;
	for( key in im.layers ){
	    if( key === "crosshair" ){
		continue;
	    }
	    if( im.layers.hasOwnProperty(key) ){
		JS9.Layers.addLayer.call(this, im, key);
	    }
	}
	this.lastimage = im;
    }
    // the layers within the layer container will be sortable
    // the top one responds to events
    this.layersLayerContainer.sortable({
	// eslint-disable-next-line no-unused-vars
	start: (event, ui) => {
	    return;
	},
	// eslint-disable-next-line no-unused-vars
	stop: (event, ui) => {
	    JS9.Layers.activeLayer(im, this);
	    return;
	}
    });
    // set initial active layer
    JS9.Layers.activeLayer(im, this);
};

// add this plugin into JS9
JS9.RegisterPlugin(JS9.Layers.CLASS, JS9.Layers.NAME, JS9.Layers.init,
		   {menuItem: "Shape Layers",
		    onplugindisplay: JS9.Layers.init,
		    onshapelayercreate: JS9.Layers.init,
		    onshapelayershow: JS9.Layers.init,
		    onshapelayeractive: JS9.Layers.init,
		    onshapelayerhide: JS9.Layers.init,
		    onimageload: JS9.Layers.init,
		    onimagedisplay: JS9.Layers.display,
		    onimageclose: JS9.Layers.close,
		    help: "help/layers.html",
		    winTitle: "Shape Layers",
		    winResize: true,
		    winDims: [JS9.Layers.WIDTH, JS9.Layers.HEIGHT]});
/*
 * Magnifier plugin
 */

/*global $, JS9, fabric */

"use strict";

// create our namespace, and specify some meta-information and params
JS9.Magnifier = {};
JS9.Magnifier.CLASS = "JS9";
JS9.Magnifier.NAME = "Magnifier";
JS9.Magnifier.WIDTH =  JS9.WIDTH/2;	// width of light window
JS9.Magnifier.HEIGHT = JS9.HEIGHT/2;	// height of light window
JS9.Magnifier.SWIDTH =  250;		// width of div
JS9.Magnifier.SHEIGHT = 250;		// height of div

// defaults for magnifier
JS9.Magnifier.opts = {
    // override fabric defaults
    originX: "left",
    originY: "top",
    hasControls: false,
    hasRotatingPoint: false,
    hasBorders: false,
    selectable: false,
    // initial magnifier zoom
    zoom: 4,
    // canvas options
    canvas: {
	selection: false
    },
    // magnifier box colors
    tagcolors: {
	defcolor: "#00FF00"
    }
};

// call a JS9 routine from a button in the magnifier plugin toolbar
// the plugin instantiation saves the display id in the toolbar div
JS9.Magnifier.bcall = function(...args){
    let dispid, im;
    let [which, cmd, arg1] = args;
    // the button plugintoolbar div has data containing the id of the display
    dispid = $(which).closest("div[class^=JS9PluginToolbar]").data("displayid");
    if( dispid ){
	im = JS9.getImage(dispid);
    } else {
	JS9.error(`can't find display for cmd: ${cmd}`);
    }
    if( !im ){
	JS9.error(`can't find image for cmd: ${cmd}`);
    }
    switch(cmd){
    case "zoomMagnifier":
	if( args.length < 3 ){
	    JS9.error(`missing arg(s) for cmd: ${cmd}`);
	}
	try{
	    JS9.Magnifier.zoom(im, arg1);
	} catch(e){
	    JS9.error("error calling zoomMagnifier()", e);
	}
	break;
    default:
        break;
    }
};

// html used by the magnifier plugin
JS9.Magnifier.HTML =
`${"<span>" +
"<button type='button' class='JS9Button' onClick='JS9.Magnifier.bcall(this, \"zoomMagnifier\", \"x2\"); return false'>x2</button>" +
"<button type='button' class='JS9Button' onClick='JS9.Magnifier.bcall(this, \"zoomMagnifier\", \"/2\"); return false'>/2</button>" +
"<button type='button' class='JS9Button' onClick='JS9.Magnifier.bcall(this, \"zoomMagnifier\", \""}${JS9.Magnifier.opts.zoom}"); return false'>${JS9.Magnifier.opts.zoom}</button>` +
`</span>`;

// JS9 Magnifier constructor
JS9.Magnifier.init = function(width, height){
    // set width and height on div
    this.width = this.divjq.attr("data-width");
    if( !this.width  ){
	this.width = width || JS9.Magnifier.WIDTH;
    }
    this.divjq.css("width", this.width);
    this.width = parseInt(this.divjq.css("width"), 10);
    this.height = this.divjq.attr("data-height");
    if( !this.height ){
	this.height = height || JS9.Magnifier.HEIGHT;
    }
    this.divjq.css("height", this.height);
    this.height = parseInt(this.divjq.css("height"), 10);
    // create DOM canvas element
    this.canvas = document.createElement("canvas");
    // jquery version for event handling and DOM manipulation
    this.canvasjq = $(this.canvas);
    // set class
    this.canvasjq.addClass("JS9Magnifier");
    // required so graphical layers will be on top:
    this.canvasjq.css("z-index", JS9.ZINDEX);
    // how do we allow users to set the size of the canvas??
    // it doesn't go into the CSS and we have no canvas on the Web page ...
    this.canvasjq.attr("width", this.width);
    this.canvasjq.attr("height", this.height);
    // drawing context
    this.context = this.canvas.getContext("2d");
    // turn off anti-aliasing
    if( !JS9.ANTIALIAS ){
	this.context.imageSmoothingEnabled = false;
    }
    // add container with canvas to the high-level div
    this.containerjq = $("<div>")
	.addClass("JS9Container")
	.append(this.canvasjq)
	.appendTo(this.divjq);
    // add magnifier graphics layer to the display
    // the magnifier will be appended to the div of the plugin
    this.display.newShapeLayer("magnifier", JS9.Magnifier.opts, this.divjq);
};

// display the magnified image on the magnifier canvas
JS9.Magnifier.display = function(im, ipos){
    let pos, tval, magDisp, zoom;
    let canvas, sx, sy, sw, sh, dx, dy, dw, dh;
    // sanity check
    // only display if we have a magnifier present
    if(!im || !im.display.pluginInstances.JS9Magnifier ||
       (im.display.pluginInstances.JS9Magnifier.status !== "active")){
	return;
    }
    // don't display if a mouse button is pressed while moving, or
    // if two or more touch buttons are pressed while moving
    if( (im.clickState > 0) || (im.clickState < -1) ){
	return;
    }
    // image init: add magnifier object to image, if necessary
    if( !im.magnifier ){
	im.magnifier = {zoom: JS9.Magnifier.opts.zoom, posx: 0, posy: 0};
    }
    magDisp = im.display.pluginInstances.JS9Magnifier;
    canvas = im.display.canvas;
    zoom = im.magnifier.zoom;
    sw = Math.floor(magDisp.width / zoom);
    sh = Math.floor(magDisp.height / zoom);
    if( ipos ){
	pos = im.imageToDisplayPos(ipos);
	sx = pos.x - (sw/2);
	sy = pos.y - (sh/2);
	im.magnifier.posx = sx;
	im.magnifier.posy = sy;
    } else {
	sx = im.magnifier.posx;
	sy = im.magnifier.posy;
    }
    // default destination parameters
    dx = 0;
    dy = 0;
    dw = magDisp.canvas.width;
    dh = magDisp.canvas.height;
    // adjust for boundaries
    if( sx < 0 ){
	sw += sx;
	dx -= (sx * zoom);
	dw += (sx * zoom);
	sx = 0;
    }
    tval = (sx + sw) - canvas.width;
    if( tval > 0  ){
	sw -= tval;
	dw = sw * zoom;
    }
    if( sy < 0 ){
	sh += sy;
	dy -= (sy * zoom);
	dh += (sy * zoom);
	sy = 0;
    }
    tval = sy + sh- canvas.height;
    if( tval > 0 ){
	sh -= tval;
	dh = sh * zoom;
    }
    // display magnifier image
    magDisp.context.clear();
    magDisp.context.drawImage(canvas, sx, sy, sw, sh, dx, dy, dw, dh);
    // overlay regions by drawing the fabric.js canvas into the magnifier
    if( JS9.globalOpts.magnifierRegions &&
	im.display.layers && im.display.layers.regions ){
	canvas = im.display.layers.regions.canvas.getElement();
	sx *= fabric.devicePixelRatio;
	sy *= fabric.devicePixelRatio;
	sw *= fabric.devicePixelRatio;
	sh *= fabric.devicePixelRatio;
	magDisp.context.drawImage(canvas, sx, sy, sw, sh, dx, dy, dw, dh);
    }
    // stuff we only do once
    if( !im.magnifier.boxid ){
	// add the center point to the magnifier, if necessary
	im.magnifier.boxid = im.addShapes("magnifier", "box");
	// make background black, which looks better at the edge
	$(magDisp.canvas).css("background-color", "black");
    }
    // center point size and position, based on zoom
    // (subtract 1 to center the box on the pixel 2/4/2020)
    if( im.magnifier.ozoom !== zoom ){
	im.changeShapes("magnifier", im.magnifier.boxid,
			{left: magDisp.width/2-1, top:  magDisp.height/2-1, 
			 width: zoom, height: zoom});
	im.magnifier.ozoom = im.magnifier.zoom;
    }
};

// zoom the rectangle inside the magnifier (RGB) image
// part of magnifier plugin
JS9.Magnifier.zoom = function(im, zval){
    let magnifier, ozoom, nzoom;
    // sanity check
    if( !im || !im.magnifier ){
	return;
    }
    magnifier = im.magnifier;
    // get old zoom
    ozoom = magnifier.zoom;
    // determine new zoom
    switch(zval.charAt(0)){
    case "x":
    case "*":
	nzoom = ozoom * parseFloat(zval.slice(1));
	break;
    case "/":
	nzoom = ozoom / parseFloat(zval.slice(1));
	break;
    default:
	nzoom = parseFloat(zval);
	break;
    }
    // sanity check
    if( !nzoom || (nzoom < 1) ){
	nzoom = 1;
    }
    // save old value, set new value
    magnifier.ozoom = magnifier.zoom;
    magnifier.zoom = nzoom;
    // redisplay
    JS9.Magnifier.display(im);
};

// clear the magnifier
JS9.Magnifier.clear = function(im){
    const magnifier = im.display.pluginInstances.JS9Magnifier;
    if( magnifier && (im === im.display.image) ){
	magnifier.context.clear();
	im.removeShapes("magnifier", "all");
	im.magnifier.boxid = null;
	im.magnifier.ozoom = 0;
	// restore original background color
	$(magnifier.canvas).css("background-color", "#E9E9E9");
    }
    return im;
};

// add this plugin into JS9
JS9.RegisterPlugin(JS9.Magnifier.CLASS, JS9.Magnifier.NAME, JS9.Magnifier.init,
		   {menuItem: "Magnifier",
		    help: "help/magnifier.html",
		    dynamicSelect: true,
		    toolbarSeparate: false,
		    toolbarHTML: JS9.Magnifier.HTML,
		    onplugindisplay: JS9.Magnifier.display,
		    onregionsmove: JS9.Magnifier.display,
		    onmousemove: JS9.Magnifier.display,
		    onimagedisplay: JS9.Magnifier.display,
		    onimageclose: JS9.Magnifier.clear,
		    onimageclear: JS9.Magnifier.clear,
		    winTitle: "Magnifier",
		    winDims: [JS9.Magnifier.WIDTH,  JS9.Magnifier.HEIGHT],
		    divArgs: [JS9.Magnifier.SWIDTH,  JS9.Magnifier.SHEIGHT]});
/*
 * Multi-Extension FITS module (March 31, 2016)
 */

/*global $, JS9 */

"use strict";

// create our namespace, and specify some meta-information and params
JS9.Mef = {};
JS9.Mef.CLASS = "JS9";    // class of plugins (1st part of div class)
JS9.Mef.NAME = "Mef";     // name of this plugin (2nd part of div class)
JS9.Mef.WIDTH =  800;	  // width of light window
JS9.Mef.HEIGHT = 240;	  // height of light window
JS9.Mef.BASE = JS9.Mef.CLASS + JS9.Mef.NAME;  // CSS base class name

// change global separate mode for this display
JS9.Mef.xseparate = function(id, target){
    const display = JS9.lookupDisplay(id);
    const separate = target.checked;
    // change separate mode for this instance
    if( display ){
	display.pluginInstances[JS9.Mef.BASE].separate = separate;
    }
};

// load all images
// eslint-disable-next-line no-unused-vars
JS9.Mef.xall = function(id, target){
    const display = JS9.lookupDisplay(id);
    // display all image extensions
    if( display && display.image ){
	display.pluginInstances[JS9.Mef.BASE].separate = true;
	display.image.displayExtension("all");
    }
};

// get an MefExtension id based on the file image id
JS9.Mef.imid = function(im, i, noext){
    let id = `${im.display.id}_${im.id}`;
    if( noext ){
	id = id.replace(/\[[a-zA-Z0-9][a-zA-Z0-9_]*\]/g,"");
    }
    return `${id.replace(/[^A-Za-z0-9_]/g, "_")}_MefExtension_${i}`;
};

// change the active extension
JS9.Mef.activeExtension = function(im, i){
    let clas, classbase;
    if( im ){
	classbase = `${im.display.id}_${JS9.Mef.BASE}`;
	$(`.${classbase  }Extension`)
	    .removeClass(`${JS9.Mef.BASE}ExtensionActive`)
	    .addClass(`${JS9.Mef.BASE}ExtensionInactive`);
	clas = JS9.Mef.imid(im, i, true);
	$(`.${clas}` )
	    .removeClass(`${JS9.Mef.BASE}ExtensionInactive`)
	    .addClass(`${JS9.Mef.BASE}ExtensionActive`);
    }
};

// re-init when a different image is displayed
JS9.Mef.display = function(){
    if( this.lastimage !== this.display.image ){
	JS9.Mef.init.call(this);
    }
};

// clear when an image closes
JS9.Mef.close = function(){
    // ensure plugin display is reset
    JS9.Mef.init.call(this, {mode: "clear"});
};

// constructor: add HTML elements to the plugin
JS9.Mef.init = function(opts){
    let i, im, id, clas, obj, s, sid, div, htmlString, classbase;
    const addExt = (o, s, k) => {
	let c, j;
	let got = "";
	let doit = true;
	switch(o.type){
	case "image":
	    // look for 2D image
	    if( o.naxes.length < 2 ){
		doit = false;
	    }
	    break;
	case "table":
	case "ascii":
	    // look for x and y columns
	    for(j=0; j<o.cols.length; j++){
		c = o.cols[j];
		if( c.name === "X" || c.name === "x" ){
		    got += "x";
		}
		if( c.name === "Y" || c.name === "y" ){
		    got += "y";
		}
	    }
	    if( got !== "xy" && got !== "yx" ){
		doit = false;
	    }
	    break;
	}
	if( doit ){
	    htmlString = `<pre>&nbsp;&nbsp;${s}</pre>`;
	} else {
	    htmlString = `<pre>&nbsp;&nbsp;<span class='JS9MefStrike'><span>${s}</span></span></pre>`;
	}
	id = JS9.Mef.imid(im, k);
	clas = JS9.Mef.imid(im, k, true);
	classbase = `${im.display.id}_${JS9.Mef.BASE}`;
	div = $("<div>")
	    .addClass(clas)
	    .addClass(`${classbase   }Extension`)
	    .addClass(`${JS9.Mef.BASE   }Extension`)
	    .addClass(`${JS9.Mef.BASE}ExtensionInactive`)
	    .attr("id", id)
	    .html(htmlString)
	    .appendTo(this.mefContainer);
	if( doit ){
	    div.on("mousedown touchstart", () => {
		im.displayExtension(o.hdu, {separate: this.separate});
		JS9.Mef.activeExtension(im, o.hdu);
	    });
	}
    };
    // on entry, these elements have already been defined:
    // this.div:      the DOM element representing the div for this plugin
    // this.divjq:    the jquery object representing the div for this plugin
    // this.id:       the id ofthe div (or the plugin name as a default)
    // this.display:  the display object associated with this plugin
    // this.dispMode: display mode (for internal use)
    //
    // opts is optional
    opts = opts || {};
    // allow scrolling on the plugin
    this.divjq.addClass("JS9PluginScrolling");
    // clean main container
    this.divjq.html("");
    // add mef container to main
    this.mefContainer = $("<div>")
	.addClass(`${JS9.Mef.BASE}Container`)
	.attr("id", `${this.id}MefContainer`)
	.appendTo(this.divjq);
    // separate mode
    if( this.separate === undefined ){
	this.separate = false;
    }
    im  = this.display.image;
    if( !im || (opts.mode === "clear") ){
	this.mefContainer.html("<p><center>FITS HDU extensions will be displayed here.</center>");
	return;
    }
    if( !im.hdus ){
	this.mefContainer.html("<p><center>No FITS HDU extensions are present in this image.</center>");
	return;
    }
    this.lastimage = im;
    // reset main container
    s = `<div class='${JS9.Mef.BASE}Header'><span><b>Click on a FITS HDU extension to display it:</b></span>`;
    // add the checkbox for displaying each extension separately
    sid = JS9.Mef.imid(im, "Separate");
    s += `&nbsp;&nbsp;<span><input type="checkbox" id="${sid}" name="separate" value="separate" onclick="javascript:JS9.Mef.xseparate('${this.display.id}', this)"><b>&nbsp;as a separate image</b></span><span style="float: right"><input type="button" class="JS9Button2" id="${sid}" name="all" value="Display all images" onclick="javascript:JS9.Mef.xall('${this.display.id}', this)"></span></div>`;
    this.mefContainer.html(s);
    // add a formatted string for each extension
    for(i=0; i<im.hdus.length; i++){
	obj = im.hdus[i];
	s = JS9.hdus2Str([obj]).trim();
	addExt(obj, s, i);
    }
    $(`#${sid}`).prop("checked", this.separate);
    // make the currently displayed extension active
    if( im.raw.hdu.fits.extnum !== undefined ){
	JS9.Mef.activeExtension(im, im.raw.hdu.fits.extnum);
    }
};

// add this plugin into JS9
JS9.RegisterPlugin(JS9.Mef.CLASS, JS9.Mef.NAME, JS9.Mef.init,
		   {menuItem: "Extensions",
		    help: "help/mef.html",
		    onplugindisplay: JS9.Mef.init,
		    onimageload: JS9.Mef.init,
		    onimagedisplay: JS9.Mef.display,
		    onimageclose: JS9.Mef.close,
		    winTitle: "Multi-Extension FITS",
		    winResize: true,
		    winDims: [JS9.Mef.WIDTH, JS9.Mef.HEIGHT]});

/*
 * JS9 menubar to manage menubar and its menus
 */

/*global $, JS9, sprintf */

"use strict";

// create our namespace, and specify some meta-information and params
JS9.Menubar = {};
JS9.Menubar.CLASS = "JS9";
JS9.Menubar.NAME = "Menubar";
JS9.Menubar.WIDTH = JS9.WIDTH || 512;	// width of Menubar
JS9.Menubar.HEIGHT = "auto";		// height of Menubar

// menu buttons in the menubar
// NB: names must match actual menus, menu labels are arbitrary
JS9.Menubar.buttonOptsArr = [{name: "file", label: "File"},
			     {name: "edit", label: "Edit"},
			     {name: "view", label: "View"},
			     {name: "zoom", label: "Zoom"},
			     {name: "scale", label: "Scale"},
			     {name: "color", label: "Color"},
			     {name: "region", label: "Regions"},
			     {name: "wcs", label: "WCS"},
			     {name: "analysis", label: "Analysis"},
			     {name: "help", label: "Help"}];

// map correspondance between menu items and keyboard actions
JS9.Menubar.keyMap = {
    "open ...": "open local file",
    "open local ...": "open local file",
    "toggle: src/bkgd": "toggle selected region: source/background",
    "crosshair for this image": "toggle crosshair",
    "toggle: incl/excl": "toggle selected region: include/exclude",
    "full image": "display full image",
    "selected cutouts": "display selected cutouts",
    "refreshed image": "refresh image",
    "light window": "new JS9 light window",
    "active shape layers": "toggle active shape layers",
    "Keyboard Actions": "toggle keyboard actions plugin",
    "Mouse/Touch": "toggle mouse/touch plugin",
    "Preferences": "toggle preferences plugin",
    "Shape Layers": "toggle shape layers plugin",
    "copy": "copy region(s) to clipboard",
    "edit": "edit selected region(s)",
    "paste to current pos": "paste regions to current position",
    "paste to original pos": "paste regions from local clipboard",
    "undo remove": "undo remove of region(s)",
    "to back": "send selected region to back",
    "copy wcs pos": "copy wcs position to clipboard",
    "copy value/pos": "copy value and position to clipboard",
    "zoom 1": "reset zoom",
    "zoom in": "zoom in",
    "zoom out": "zoom out"
};

// backwards compatibility, pre-1.10
if( JS9.menuButtonOptsArr ){
    JS9.Menubar.buttonOptsArr = JS9.menuButtonOptsArr;
}

// avoid repeated errors in the console when we try to laod a missing menu image
JS9.Menubar.EMPTYIMG = "data:image/svg+xml;base64,PHN2ZyBpZD0iTGF5ZXJfMSIgZGF0YS1uYW1lPSJMYXllciAxIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxODYuMTIgMTcxLjkyIj48ZGVmcz48c3R5bGU+LmNscy0xe2ZpbGw6bm9uZTt9PC9zdHlsZT48L2RlZnM+PHRpdGxlPmVtcHR5PC90aXRsZT48cmVjdCBjbGFzcz0iY2xzLTEiIHdpZHRoPSIxODYuMTIiIGhlaWdodD0iMTcxLjkyIi8+PC9zdmc+";       // inline version of images/empty.svg

JS9.Menubar.missing = {};

// return image unless its known to be missing ... then return empty image
JS9.Menubar.menuImage = function(s){
    if( JS9.Menubar.missing[s] ){
	return JS9.Menubar.EMPTYIMG;
    } else {
	if( JS9.inline && JS9.inline[s] ){
	    // inline image is available
	    return JS9.inline[s];
	} else if( JS9.allinone ){
	    // allinone has to return blank
	    return JS9.Menubar.EMPTYIMG;
	} else if( s.charAt(0) !== "/" ){
	    // external image relative to install directory
	    return JS9.InstallDir(s);
	} else {
	    // external image with full pathname
	    return s;
	}
    }
};

// get displays associated with this menubar, taking supermenus into account
JS9.Menubar.getDisplays = function(mode, key){
    let i, d, s, disp;
    const arr = [];
    mode = mode || "any";
    key = key || "";
    // handle super menu specially ... but only if its not a "super_" request
    if( this.id.search(JS9.SUPERMENU) >= 0 && !key.match(/^super_/) ){
	if( mode !== "all" && this.selectedDisplay ){
	    // make sure display still exists
	    if( $.inArray(this.selectedDisplay, JS9.displays) >= 0 ){
		return [this.selectedDisplay];
	    }
	    this.selectedDislay = null;
	}
	d = this.divjq.data("displays") || "*";
	s = d.split(",");
	if( s[0] === "*" ){
	    for(i=0; i<JS9.displays.length; i++){
		arr.push(JS9.displays[i]);
	    }
	} else {
	    for(i=0; i<s.length; i++){
		disp = JS9.lookupDisplay(s[i]);
		if( disp ){
		    arr.push(disp);
		}
	    }
	}
    } else if( this.divjq.data("js9id") === "*" ){
	arr.push(JS9.getDynamicDisplayOr(JS9.displays[0]));
    }
    if( !arr.length ){
	arr.push(this.display);
    }
    return arr;
};

// this callback happens when a click is registered on a display
// we then go through the supermenus, and if one of them contains this display,
// we set its selectedDisplay value so use of the supermenu is then aimed
// only at the selected display
// also used to unset previously set selectedDisplay
//
// called by JS9.mouseupCB with no context, passing current image object
JS9.Menubar.onclick = function(disp){
    let i, arr, supermenu;
    if( (typeof disp === "string") && (disp !== "all") ){
	disp = JS9.lookupDisplay(disp);
    }
    for(i=0; i<JS9.supermenus.length; i++){
	supermenu = JS9.supermenus[i];
	arr = JS9.Menubar.getDisplays.call(supermenu, "all");
	if( ($.inArray(disp, arr) >= 0) || (disp === "all") ){
	    if( JS9.bugs.webkit_resize ){
		$(".JS9").find(".JS9Image").removeClass("JS9Highlight");
	    } else {
		$(".JS9").removeClass("JS9Highlight");
	    }
	    if( (disp === supermenu.selectedDisplay) || (disp === "all") ){
		// unselect
		supermenu.selectedDisplay = null;
	    } else {
		// select
		supermenu.selectedDisplay = disp;
		if( JS9.bugs.webkit_resize ){
		    $(disp.divjq).find(".JS9Image").addClass("JS9Highlight");
		} else {
		    $(disp.divjq).addClass("JS9Highlight");
		}
	    }
	}
    }
};

// reset: invalidate the reverse key map when preferences change
// eslint-disable-next-line no-unused-vars
JS9.Menubar.reset = function(im){
    JS9.Menubar.rkeyMap = null;
};

// create the standard menus and user-defined menus
// each consists of a contextMenu() call and a "mousedown" callback
// to display the menu
JS9.Menubar.createMenus = function(){
    // eslint-disable-next-line no-unused-vars
    const mypos = (opt,  x,  y) => {
	let pos;
	if( !window.hasOwnProperty("Jupyter") ){
	    opt.$menu.position({
		my:  'left top',
		at:  JS9.globalOpts.menuPosition || "left bottom",
		of:  opt.$trigger,
		collision: "fit"
	    });
	} else {
	    // Jupyter gets the wrong position when using $trigger ...
	    pos = opt.$trigger.offset();
	    opt.$menu.css({"left": pos.left+20, "top": pos.top+10});
	}
    };
    const onhide = () => {
	const tdisp = this.display;
	if( JS9.bugs.hide_menu && tdisp.image ){
	    tdisp.image.displayImage("rgb");
	}
    };
    const xname = (name, xact) => {
	let key, hstr, tact;
	let obj = {name: name};
	const gkeyActions = JS9.globalOpts.keyboardActions;
	const act = JS9.Menubar.keyMap[name];
	if( !JS9.Menubar.rkeyMap ){
	    JS9.Menubar.rkeyMap = {};
	    for( key in gkeyActions ){
		if( gkeyActions.hasOwnProperty(key) ){
		    JS9.Menubar.rkeyMap[gkeyActions[key]] = key;
		}
	    }
	    JS9.Menubar.keyActions = $.extend(true, {}, gkeyActions);
	}
	if( JS9.notNull(act) && JS9.Menubar.rkeyMap ){
	    key = JS9.Menubar.rkeyMap[act];
	    if( key ){
		hstr = `<span>${name}<span class="JS9MenubarKeyAction">&nbsp;&nbsp;&nbsp;&nbsp;${key}</span></span>`;
		obj = {name: hstr, isHtmlName: true};
	    }
	} else if( xact && JS9.Menubar.rkeyMap ){
	    for( tact in JS9.Menubar.rkeyMap ){
		if( JS9.Menubar.rkeyMap.hasOwnProperty(tact) && tact === xact ){
		    key = JS9.Menubar.rkeyMap[tact];
		    if( key ){
			hstr = `<span>${name}<span class="JS9MenubarKeyAction">&nbsp;&nbsp;&nbsp;;&nbsp;${key}</span></span>`;
			obj = {name: hstr, isHtmlName: true};
		    }
		}
	    }
	}
	return obj;
    };
    const xeqUserMenu = (evt) => {
	const menu = evt.data;
	evt.preventDefault();
	$(`#${menu.name}UserMenu${this.id}`).contextMenu();
    };
    const addUserMenu = (menu) => {
	if( !menu || !menu.name || !menu.title || !menu.options  ){
	    return;
	}
	// define contextMenu actions
	$.contextMenu({
            selector: `#${menu.name }UserMenu${this.id}`,
	    zIndex: JS9.MENUZINDEX,
	    events: { hide: onhide },
	    position: mypos,
            build: () => {
		let i, opt, hstr, obj;
		const items = {};
		for(i=0; i<menu.options.length; i++){
		    opt = menu.options[i];
		    obj = xname(opt.name, opt.shortcut);
		    if( opt.image ){
			hstr = `<div class='JS9MenubarUserImage' name='${opt.name}'><img src='${opt.image}' name='${menu.name}_${opt.name}' alt='${opt.name}' class='JS9MenubarUserImage JS9MenubarUserImageOption' >` + `&nbsp;&nbsp;${obj.name}</div>`;
			items[opt.name] = {name: hstr, isHtmlName: true};
		    } else {
			items[opt.name] = obj;
		    }
		}
		return {
		    callback: (key, kopt) => {
		    JS9.Menubar.getDisplays.call(this).forEach((val) => {
			let i, s, args, hstr;
			const udisp = val;
			for(i=0; i<menu.options.length; i++){
			    opt = menu.options[i];
			    if( key !== opt.name ){
				continue;
			    }
			    if( typeof JS9.publics[opt.cmd] === "function" ){
				if( typeof opt.args === "function" ){
				    // execute function to get array
				    args = opt.args(udisp, udisp.image);
				} else {
				    // clone array and any objects it contains
				    args =
				    JSON.parse(JSON.stringify(opt.args||[]));
				}
				args.push({display: udisp});
				JS9.publics[opt.cmd](...args);
				// update the menu title
				if( opt.updateTitle !== false ){
				if( opt.image && menu.updateTitle &&
				    opt.updateTitle !== false     &&
				    menu.updateTitle.match(/(both|image)/) ){
				    if( menu.updateTitle === "both" ){
					hstr = `<div style='white-space:nowrap;'><img src='${opt.image}' name='${menu.name}' alt='${opt.name}' class='JS9MenubarUserImage JS9MenubarUserImageTitle' >` + `&nbsp;&nbsp;${opt.name}</div>`;
				    } else if( menu.updateTitle === "image" ){
					hstr = `<div style='white-space:nowrap;'><img src='${opt.image}' name='${menu.name}' alt='${opt.name}' class='JS9MenubarUserImage JS9MenubarUserImageTitle' ></div>`;
				    }
				    $(kopt.selector).html(hstr);
				} else if( typeof menu.updateTitle === "function" ){
				    try{
					s = menu.updateTitle(udisp.image,
							     menu.name,
							     opt.name);
				    }
				    catch(e){ s = (opt.name || menu.name); }
				    $(kopt.selector).text(s);
				} else if( menu.updateTitle && opt.name ){
				    $(kopt.selector).text(opt.name);
				}
				}
			    } else {
				JS9.error(`unknown func for user menubar: ${opt.cmd}`);
			    }
			}
		    });
		    },
		    items: items
		};
	    }
	});
    };
    const addUserMenus = () => {
	let i, menu;
	if( JS9.globalOpts.userMenuBar ){
	    for(i=0; i<JS9.globalOpts.userMenuBar.length; i++){
		menu = JS9.globalOpts.userMenuBar[i];
		if( !menu || !menu.name || !menu.title  ){
		    continue;
		}
		$(`#${menu.name}UserMenu${this.id}`).on("mousedown",
							 menu, xeqUserMenu);
		addUserMenu(menu);
	    }
	}
    };
    // File menu: make button open the contextMenu
    $(`#fileMenu${this.id}`).on("mousedown", (evt) => {
        evt.preventDefault();
        $(`#fileMenu${this.id}`).contextMenu();
    });
    $.contextMenu({
        selector: `#fileMenu${this.id}`,
	zIndex: JS9.MENUZINDEX,
	events: { hide: onhide },
	position: mypos,
	// 'click' prevents long menus from executing a random menu option
	// it has to be put into the first context menu that is registered
	itemClickEvent: JS9.globalOpts.menuClickEvent || "click",
        build: () => {
	    let i, m, im, name, s1, arr, cdisp, got, iobj, cel;
	    let plugin, pname, pinst;
	    let lastxclass="";
	    let n = 0;
	    const items = {};
	    const tdisp = JS9.Menubar.getDisplays.call(this)[0];
	    const tim = tdisp.image;
	    const imlen = JS9.images.length;
	    // the number of images in this display ...
	    for(i=0, got=0; i<imlen; i++){
		im = JS9.images[i];
		if( im.display === tdisp ){
		    got++;
		}
	    }
	    // affects the position of menu title ...
	    if( !got || got >= JS9.globalOpts.imagesFileSubmenu ){
		items.filetitle = {
		    name: "Files and Displays:",
		    disabled: true
		};
	    }
	    // .. because images can be in top-level menu or a submenu
	    if( got && got < JS9.globalOpts.imagesFileSubmenu ){
		items.imagestitle = {
		    name: "Images:",
		    disabled: true
		};
		iobj = items;
	    } else if( got ){
		items.images = {
		    name: "images ...",
		    items: {
			imagestitle: {
			    name: "display this image:",
			    disabled: true
			}
		    }
		};
		iobj = items.images.items;
	    }
	    // add images from this display
	    for(i=0; i<imlen; i++){
		im = JS9.images[i];
		if( im.display === tdisp ){
		    name = im.id;
		    if( tdisp.rgb.active ){
			if( im === tdisp.rgb.rim){
			    name += " (red)";
			}
			if( im === tdisp.rgb.gim){
			    name += " (green)";
			}
			if( im === tdisp.rgb.bim){
			    name += " (blue)";
			}
		    }
		    iobj[name] = xname(name);
		    if( tdisp.image && (tdisp.image.id === im.id) ){
			iobj[name].icon = JS9.globalOpts.menuSelected;
		    }
		}
	    }
	    // add the rest of the menu
	    if( got && got < JS9.globalOpts.imagesFileSubmenu ){
		items[`sep${n++}`] = "------";
		items.filetitle = {
		    name: "Files and Displays:",
		    disabled: true
		};
	    }
	    if( window.electron ){
		items.openboth  = xname("open ...");
	    } else {
		items.openlocal = xname("open local ...");
		items.openremote = xname("open remote ...");
		if( !window.hasOwnProperty("Jupyter") ){
		    items.openremote.disabled = false;
		} else {
		    items.openremote.disabled = true;
		}
	    }
	    items.disps = {
		name: "display ...",
		items: {
		    dispstitle: {
			name: "display:",
			disabled: true
		    }
		}
	    };
	    items.disps.items.header = xname("FITS header");
	    items.disps.items.hdus = xname("FITS HDUs");
	    if( !tim ){
		items.disps.items.header.disabled = true;
	    }
	    if( !tim || !tim.hdus ){
		items.disps.items.hdus.disabled = true;
	    }
	    items.disps.items.refresh = xname("refreshed image");
	    items.disps.items.full = xname("full image");
	    items.disps.items.cutout = xname("selected cutouts");
	    items.disps.items.pageid = xname("page id");
	    if( !tim || !tim.raw || !tim.raw.hdu || !tim.raw.hdu.fits ){
		items.disps.items.refresh.disabled = true;
		items.disps.items.full.disabled = true;
		items.disps.items.cutout.disabled = true;
	    }
	    items.moveto = {
		name: "move ...",
		items: {
		    movetotitle: {
			name: "move to this display:",
			disabled: true
		    }
		}
	    };
	    if( tim ){
		items.moveto.disabled = false;
		for(i=0; i<JS9.displays.length; i++){
		    if( $(`#${JS9.displays[i].id}`).length > 0 &&
			tdisp !== JS9.displays[i]    	     ){
			s1 = `moveto_${JS9.displays[i].id}`;
			items.moveto.items[s1] = xname(JS9.displays[i].id);
		    }
		}
		items.moveto.items.moveto_newdisp = xname("a new display");
	    } else {
		items.moveto.disabled = true;
	    }
	    items.separates = {
		name: "separate ...",
		items: {
		}
	    };
	    if( !JS9.images.length ){
		items.separates.disabled = true;
	    }
	    items.separates.items.separate = xname("separate these images");
	    if( !tim ){
		items.separates.items.separate.disabled = true;
	    }
	    items.separates.items.gather = xname("gather all images here");
	    if( tim && JS9.images.length === 1 ){
		items.separates.items.gather.disabled = true;
	    }
	    items.saveas = {
		name: "save ...",
		items: {
		    saveastitle: {
			name: "save all data as:",
			disabled: true
		    },
		    savefitsentire: xname("FITS"),
		    saveastitle2: {
			name: "save displayed data as:",
			disabled: true
		    },
		    savefits: xname("FITS"),
		    savejpeg: xname("JPEG"),
		    savepng: xname("PNG")
		}
	    };
	    if( !tim ){
		items.saveas.disabled = true;
	    }
	    items.closes = {
		name: "close ...",
		items: {
		    closestitle: {
			name: "close:",
			disabled: true
		    }
		}
	    };
	    if( !tim ){
		items.closes.disabled = true;
	    }
	    items.closes.items.close = xname("this image");
	    items.closes.items.closeall = xname("all images");
	    items.closes.items.free = xname("this image's memory");
	    items.closes.items.removeproxy = xname("proxy file");
	    if( !tim || !tim.raw || !tim.raw.hdu || !tim.raw.hdu.fits ){
		items.closes.items.free.disabled = true;
	    }
	    if( !tim || !tim.proxyFile ){
		items.closes.items.removeproxy.disabled = true;
	    }
	    items.catalogs = {
		name: "catalog ...",
		items: {
		}
	    };
	    if( !tim ){
		items.catalogs.disabled = true;
	    }
	    items.catalogs.items.loadcatalog = xname("load ...");
	    items.catalogs.items.savecatalog = xname("save active");
	    items.createmosaic = {
		name: "mosaic ...",
		items: {
		    createmosaictitle: {
			name: "create a mosaic using:",
			disabled: true
		    },
		    mosaiccurrent: xname("images in the current file"),
		    mosaicdisplay: xname("images in this display")
		}
	    };
	    if( !tim ){
		items.createmosaic.disabled = true;
	    }
	    items.sessions = {
		name: "session ...",
		items: {
		}
	    };
	    items.sessions.items.loadsession = xname("load ...");
	    items.sessions.items.savesession = {
		name: "save ...",
		items: {
		    savesessiontitle: {
			name: "include these images:",
			disabled: true
		    },
		    savecurrent: xname("the current image"),
		    savedisplay: xname("all images in this display")
		}
	    };
	    items.windows = {
		name: "window ...",
		items: {
		    windowstitle: {
			name: "create a new:",
			disabled: true
		    }
		}
	    };
	    items.windows.items.lite = xname("light window");
	    items.windows.items.xnew = xname("separate window");
	    if( window.electron ){
		items.windows.items.xnew.disabled = true;
	    }
	    if( window.electron ){
		items.electronHelper = xname("connect to JS9 helper");
		if(  JS9.helper.connected ){
		    items.electronHelper.disabled = true;
		}
	    }
	    // super menu
	    if( this.issuper ){
		arr = JS9.Menubar.getDisplays.call(this, "all");
		items.supermenu = {
		    name: "supermenu ...",
		    items: {
			supertitle: {
			    name: "target this display:",
			    disabled: true
			}
		    }
		};
		for(i=0, m=0; i<arr.length; i++){
		    cdisp = arr[i];
		    name = cdisp.id;
		    items.supermenu.items[`super_${name}`] = xname(name);
		    if( this.selectedDisplay === cdisp ){
			items.supermenu.items[`super_${name}`].icon = JS9.globalOpts.menuSelected;
			m++;
		    }
		}
		name = "all displays";
		items.supermenu.items.super_all = xname(name);
		if( !m ){
		    items.supermenu.items.super_all.icon = JS9.globalOpts.menuSelected;
		}
	    }
	    cel = tdisp.divjq.closest(".JS9GridContainer");
	    if( !tim                                                      ||
		tdisp.winid                                               ||
		(cel.length > 0  && cel.find(".JS9GridItem").length > 1)  ){
		items.removedisplay = xname("remove this display");
	    }
	    items[`sep${n++}`] = "------";
	    items.print = xname("print ...");
	    if( !tim ){
		items.print.disabled = true;
	    }
	    if( window.electron ){
		items.windowPrint = xname("print window ...");
		items.windowPDF = xname("save window to pdf");
		if( window.electron.app ){
		    items.saveScript = xname("save messaging script");
		}
	    }
	    // plugins
	    for(i=0; i<JS9.plugins.length; i++){
		plugin = JS9.plugins[i];
		pname = plugin.name;
		if( plugin.opts.menuItem && (plugin.opts.menu === "file") ){
		    pinst = tdisp.pluginInstances[pname];
		    if( !pinst || pinst.winHandle ){
			if( plugin.xclass !== lastxclass ){
			    items["sep" + n] = "------";
			    n = n + 1;
			}
			lastxclass = plugin.xclass;
			items[pname] = xname(plugin.opts.menuItem);
			if( pinst && (pinst.status === "active") ){
			    items[pname].icon = JS9.globalOpts.menuSelected;
			}
		    }
		}
	    }
	    return {
		// eslint-disable-next-line no-unused-vars
                callback: (key, opt) => {
		    let uplugin;
		    JS9.Menubar.getDisplays.call(this, "any", key)
			.forEach((val) => {
			let j, s, t, kid, unew;
			const udisp = val;
			let uim = udisp.image;
			// make sure display is still valid
			if( $.inArray(udisp, JS9.displays) < 0 ){
			    return;
			}
			switch(key){
			case "refresh":
			    if( uim && uim.raw.hdu && uim.raw.hdu.fits ){
				uim.refreshImage();
			    }
			    break;
			case "full":
			    if( uim && uim.raw.hdu && uim.raw.hdu.fits ){
				uim.displaySection("full");
			    }
			    break;
			case "cutout":
			    if( uim && uim.raw.hdu && uim.raw.hdu.fits ){
				uim.displaySection("selected");
			    }
			    break;
			case "free":
			    if( uim && uim.raw.hdu && uim.raw.hdu.fits ){
				JS9.cleanupFITSFile(uim.raw.hdu.fits, true);
			    }
			    break;
			case "close":
			    if( uim ){
				uim.closeImage();
			    }
			    break;
			case "closeall":
			    if( udisp ){
				// close all images in this display
				JS9.CloseDisplay(udisp.id);
			    }
			    break;
			case "removeproxy":
			    if( uim ){
				uim.removeProxyFile();
			    }
			    break;
			case "removedisplay":
			    if( udisp ){
				// remove this display
				JS9.RemoveDisplay(udisp.id);
			    }
			    break;
			case "savecurrent":
			    if( udisp && uim ){
				JS9.SaveSession({mode: "image"},
						{display: udisp});
			    }
			    break;
			case "savedisplay":
			    if( udisp ){
				JS9.SaveSession({mode: "display"},
						{display: udisp});
			    }
			    break;
			case "loadsession":
			    if( udisp ){
				JS9.OpenSessionMenu({display: udisp});
			    }
			    break;
			case "loadcatalog":
			    if( udisp ){
				JS9.OpenCatalogsMenu({display: udisp});
			    }
			    break;
			case "savecatalog":
			    if( uim ){
				uim.saveCatalog();
			    }
			    break;
			case "mosaiccurrent":
			    if( udisp && uim ){
				JS9.CreateMosaic("current", {display: udisp});
			    }
			    break;
			case "mosaicdisplay":
			    if( udisp ){
				JS9.CreateMosaic("all", {display: udisp});
			    }
			    break;
			case "header":
			    if( uim ){
				if( uim.raw.header ){
				    uim.displayAnalysis("text",
					JS9.raw2FITS(uim.raw, {addcr: true}),
					{title: `FITS Header: ${uim.id}`});
				} else {
				    JS9.error(`no FITS header for ${uim.id}`);
				}
			    }
			    break;
			case "hdus":
			    if( uim ){
				if( uim.hdus ){
				    uim.displayAnalysis("text",
						   JS9.hdus2Str(uim.hdus),
						   {title: `FITS HDUs: ${uim.id}`,
						    winformat: "width=800px,height=200px,resize=1,scrolling=1"});
				} else {
				    JS9.error(`no FITS header for ${uim.id}`);
				}
			    }
			    break;
			case "lite":
			    JS9.LoadWindow(null, {clone: udisp.id}, "light");
			    break;
			case "xnew":
			    JS9.LoadWindow(null, null, "new");
			    break;
			case "electronHelper":
			    // Electron.js: send message to main
			    if( window.electron ){
				try{
				    window.electron.sendMsg("startHelper");
				}
				catch(e){ /* empty */ }
			    }
			    break;
			case "pageid":
			    s = `<center><p>pageid: ${JS9.helper.pageid||"none"}</center>`;
					
			    t = "JS9 page id";
			    // add display to title
			    t += sprintf(JS9.IDFMT, udisp.id);
			    JS9.lightWin(`fileid${JS9.uniqueID()}`,
					 "inline", s, t,
					 JS9.lightOpts[JS9.LIGHTWIN].lineWin);
			    break;
			case "openboth":
			    if( udisp ){
				udisp.displayLoadForm();
			    }
			    break;
			case "openlocal":
			    if( udisp ){
				JS9.OpenFileMenu({display: udisp});
			    }
			    break;
			case "openremote":
			    if( udisp ){
				udisp.displayLoadForm({remote: true});
			    }
			    break;
			case "savefits":
			case "savefitsentire":
			    if( uim ){
				s = uim.id.replace(/\.png/i, ".fits")
				          .replace(/\.gz$/i, "")
				          .replace(/\[.*\]/,"");
				if( key === "savefits" ){
				    uim.saveFITS(s, "display");
				} else {
				    uim.saveFITS(s);
				}
			    }
			    break;
			case "savepng":
			    if( uim ){
				s = uim.id.replace(/\.fit[s]?/i, ".png")
				          .replace(/\.gz$/i, "")
				          .replace(/\[.*\]/,"");
				uim.savePNG(s);
			    }
			    break;
			case "savejpeg":
			    if( uim ){
				s = uim.id.replace(/\.fit[s]?/i, ".jpeg")
				          .replace(/\.png$/i, ".jpeg")
				          .replace(/\.gz$/i, "")
				          .replace(/\[.*\]/,"");
				uim.saveJPEG(s);
			    }
			    break;
			case "print":
			    if( uim ){
				uim.print();
			    }
			    break;
			case "windowPrint":
			    if( window.electron ){
				JS9.WindowPrint();
			    }
			    break;
			case "windowPDF":
			    if( window.electron ){
				JS9.WindowToPDF();
			    }
			    break;
			case "saveScript":
			    if( window.electron && window.electron.app ){
				JS9.SaveScript();
			    }
			    break;
			case "separate":
			    if( udisp ){
				udisp.separate();
			    }
			    break;
			case "gather":
			    if( udisp ){
				if( (this.id.search(JS9.SUPERMENU) >= 0) &&
				    !this.selectedDisplay 		 ){
				    JS9.error("gather requires a selected display");
				}
				udisp.gather();
			    }
			    break;
			default:
			    // maybe its a supermenu request
			    if( key.match(/^super_/) ){
				unew = key.replace(/^super_/,"");
				JS9.Menubar.onclick.call(this, unew);
				return;
			    }
			    // maybe it's a moveto request
			    if( key.match(/^moveto_/) ){
				unew = key.replace(/^moveto_/,"");
				if( unew === "newdisp" ){
				    // separate the current image
				    udisp.separate({images:[uim],
						    firstinplace:false});
				} else {
				    // move current image to specified display
				    uim.moveToDisplay(unew);
				}
				return;
			    }
			    // maybe it's a plugin
			    for(j=0; j<JS9.plugins.length; j++){
				uplugin = JS9.plugins[j];
				if( uplugin.name === key ){
				    udisp.displayPlugin(uplugin);
				    return;
				}
			    }
			    // maybe its an image
			    for(j=0; j<JS9.images.length; j++){
				uim = JS9.images[j];
				kid = key.replace(/ *\((red|green|blue)\)/,"");
				if( (udisp.id === uim.display.id) &&
				    (uim.id === kid) ){
				    // display image, 2D graphics, etc.
				    uim.displayImage("all");
				    uim.refreshLayers();
				    udisp.clearMessage();
				    break;
				}
			    }
			    break;
			}
			});
                    },
		    items: items
		};
            }
    });
    // Edit menu: make button open the contextMenu
    $(`#editMenu${this.id}`).on("mousedown", (evt) => {
        evt.preventDefault();
        $(`#editMenu${this.id}`).contextMenu();
    });
    // define contextMenu actions
    $.contextMenu({
        selector: `#editMenu${this.id}`,
	zIndex: JS9.MENUZINDEX,
	events: { hide: onhide },
	position: mypos,
        build: () => {
	    let n=0;
	    const items = {};
	    // plugins
	    items.edittitle1 = {
		name: "Regions:",
		disabled: true
	    };
	    items.configReg = xname("edit");
	    items.copyReg = xname("copy");
	    items.pastePos = xname("paste to current pos");
	    items.pasteReg = xname("paste to original pos");
	    items.undoRemove = xname("undo remove");
	    items[`sep${n++}`] = "------";
	    items.edittitle2 = {
		name: "Position/Value:",
		disabled: true
	    };
	    items.copyWCSPos = xname("copy wcs pos");
	    items.copyValPos = xname("copy value/pos");
	    return {
		callback: (key) => {
		    JS9.Menubar.getDisplays.call(this).forEach((val) => {
		        let s, ulayer, uao;
			const udisp = val;
			const uim = udisp.image;
			// make sure display is still valid
			if( $.inArray(udisp, JS9.displays) < 0 ){
			    return;
			}
			switch(key){
			case "configReg":
			    if( uim ){
				ulayer = uim.layers.regions;
				if( ulayer ){
				    uao = ulayer.canvas.getActiveObject();
				    if( uao && uao.type !== "activeSelection" ){
					// no active selection, edit this region
					uim.displayRegionsForm(uao);
				    } else {
					// active selection or no regions: multi
					uim.displayRegionsForm(null,
							       {multi: true});
				    }
				}
			    }
			    break;
			case "copyReg":
			    if( uim ){
				s = uim.listRegions(null, {mode: 1});
				JS9.CopyToClipboard(s);
			    }
			    break;
			case "pasteReg":
			    if( uim ){
				JS9.Regions.pasteFromClipboard.call(uim);
			    }
			    break;
			case "pastePos":
			    if( uim ){
				JS9.Regions.pasteFromClipboard.call(uim,
								    true);
			    }
			    break;
			case "undoRemove":
			    if( uim ){
				uim.unremoveRegions();
			    }
			    break;
			case "copyWCSPos":
			    if( JS9.hasOwnProperty("Keyboard") ){
				JS9.Keyboard.Actions["copy wcs position to clipboard"](uim, uim.ipos);
			    }
			    break;
			case "copyValPos":
			    if( JS9.hasOwnProperty("Keyboard") ){
				JS9.Keyboard.Actions["copy value and position to clipboard"](uim, uim.ipos);
			    }
			    break;
			default:
			    break;
			}
		    });
		},
		items: items
	    };
	}
    });
    // ViewMac menu: make button open the contextMenu
    $(`#viewMacMenu${this.id}`).on("mousedown", (evt) => {
        evt.preventDefault();
        $(`#viewMacMenu${this.id}`).contextMenu();
    });
    // define contextMenu actions
    $.contextMenu({
        selector: `#viewMacMenu${this.id}`,
	zIndex: JS9.MENUZINDEX,
	events: { hide: onhide },
	position: mypos,
        build: () => {
	    let i, menu;
	    const items = {};
	    items.edittitle1 = {
		name: "View:",
		disabled: true
	    };
	    for(i=0; i<this.macmenus.length; i++){
		menu = this.macmenus[i];
		items[menu.name] = {
		    name: `${menu.title  } ...`
		};
	    }
	    return {
		callback: (key) => {
		    switch(key){
		    default:
			$(`#${key}Menu${this.id}`).contextMenu();
			break;
		    }
		},
		items: items
	    };
	}
    });
    // View menu: make button open the contextMenu
    $(`#viewMenu${this.id}`).on("mousedown", (evt) => {
        evt.preventDefault();
        $(`#viewMenu${this.id}`).contextMenu();
    });
    // define contextMenu actions
    $.contextMenu({
        selector: `#viewMenu${this.id}`,
	zIndex: JS9.MENUZINDEX,
	events: { hide: onhide },
	position: mypos,
        build: () => {
	    let i, key;
	    let plugin, pname, pinst;
	    let lastxclass="";
	    let n = 0;
	    const items = {};
	    const tdisp = JS9.Menubar.getDisplays.call(this)[0];
	    const tim = tdisp.image;
	    const editResize = (disp, obj) => {
		let v1, v2, arr;
		delete tdisp.tmp.editingMenu;
		if( obj.resize ){
		    arr = obj.resize.split(/[\s,/]+/);
		    switch(arr.length){
		    case 0:
			break;
		    case 1:
			if( tim ){
			    v1 = tim.wcs2imlen(arr[0]);
			    disp.resize(v1, v1);
			} else if( JS9.isNumber(arr[0]) ){
			    v1 = parseInt(arr[0], 10);
			    disp.resize(v1, v1);
			}
			break;
		    default:
			if( tim && tim.wcs ){
			    v1 = tim.wcs2imlen(arr[0]);
			    v2 = tim.wcs2imlen(arr[1]);
			    disp.resize(v1, v2);
			} else if( JS9.isNumber(arr[0]) && 
				   JS9.isNumber(arr[1]) ){
			    v1 = parseInt(arr[0], 10);
			    v2 = parseInt(arr[1], 10);
			    disp.resize(v1, v2);
			}
			break;
		    }
		}
	    };
	    const keyResize = (e) => {
		JS9.Menubar.getDisplays.call(this).forEach((val) => {
		    const obj = $.contextMenu.getInputValues(e.data);
		    const keycode = e.which || e.keyCode;
		    const vdisp = val;
		    // make sure display is still valid
		    if( $.inArray(vdisp, JS9.displays) < 0 ){
			return;
		    }
		    switch( keycode ){
		    case 9:
		    case 13:
			editResize(vdisp, obj);
			break;
		    default:
			vdisp.tmp.editingMenu = true;
			break;
		    }
		});
	    };
	    // plugins
	    items[`sep${n++}`] = {name: "Plugins:"};
	    items[`sep${n-1}`].disabled = true;
	    for(i=0; i<JS9.plugins.length; i++){
		plugin = JS9.plugins[i];
		pname = plugin.name;
		if( plugin.opts.menuItem && (plugin.opts.menu === "view") ){
		    pinst = tdisp.pluginInstances[pname];
		    if( !pinst || pinst.winHandle ){
			if( plugin.xclass !== lastxclass ){
			    // items["sep" + n] = "------";
			    n = n + 1;
			}
			lastxclass = plugin.xclass;
			items[pname] = xname(plugin.opts.menuItem);
			if( pinst && (pinst.status === "active") ){
			    items[pname].icon = JS9.globalOpts.menuSelected;
			}
		    }
		}
	    }
	    items[`sep${n++}`] = "------";
	    items.vdispstitle = {
		name: "Display Options:",
		disabled: true
	    };
	    items.vdisps = {
		name: "show ...",
		items: {
		    vdispstitle: {
			name: "show options:",
			disabled: true
		    }
		}
	    };
	    items.vdisps.items.valpos = xname("value/position");
	    items.vdisps.items.valposdisp = xname("display coords in val/pos");
	    // disable if we don't have info plugin
	    if( !JS9.hasOwnProperty("Info") ){
		items.vdisps.items.valpos.disabled = true;
		items.vdisps.items.valposdisp.disabled = true;
	    } else if( tdisp.image ){
		if( tdisp.image.params.valpos ){
		    items.vdisps.items.valpos.icon = JS9.globalOpts.menuSelected;
		}
		if( JS9.globalOpts.valposDCoords ){
		    items.vdisps.items.valposdisp.icon = JS9.globalOpts.menuSelected;
		}
	    }
	    items.vdisps.items.toggleLayers = xname("active shape layers");
	    if( tim && !tim.toggleLayers ){
		items.vdisps.items.toggleLayers.icon = JS9.globalOpts.menuSelected;
	    }
	    items.vdisps.items.xhair = xname("crosshair for this image");
	    // disable if we don't have info plugin
	    if( !JS9.hasOwnProperty("Crosshair") || !tim ){
		items.vdisps.items.xhair.disabled = true;
	    } else if( tim && tim.params.crosshair ){
		items.vdisps.items.xhair.icon = JS9.globalOpts.menuSelected;
	    }
	    items.vdisps.items.xhairwcs = xname("match wcs crosshairs");
	    // disable if we don't have info plugin
	    if( !JS9.hasOwnProperty("Crosshair") ){
		items.vdisps.items.xhairwcs.disabled = true;
	    } else if( JS9.globalOpts.wcsCrosshair ){
		items.vdisps.items.xhairwcs.icon = JS9.globalOpts.menuSelected;
	    }
	    items.vdisps.items.toolbar = xname("toolbar tooltips");
	    // disable if we don't have toolbar plugin
	    if( !JS9.hasOwnProperty("Toolbar") ){
		items.vdisps.items.toolbar.disabled = true;
	    } else if( JS9.GetToolbar("showTooltips") ){
		items.vdisps.items.toolbar.icon = JS9.globalOpts.menuSelected;
	    }
	    if( !JS9.allinone ){
		items.vdisps.items.logo = xname("js9 logo");
		if( JS9.globalOpts.logoDisplay ){
		    items.vdisps.items.logo.icon = JS9.globalOpts.menuSelected;
		}
	    }
	    items.vdisps.items.inherit = xname("new images inherit current params");
	    if( tdisp.image && tdisp.image.params.inherit ){
		items.vdisps.items.inherit.icon = JS9.globalOpts.menuSelected;
	    }
	    items.vdisps.items.rawlayer = {
		name: "raw data sources ...",
		items: {}
	    };
	    if( tim && tim.raws.length > 1 ){
		items.vdisps.items.rawlayer.items.whichrawtitle = {
		    name: "current raw data:"
		};
		for(i=0; i<tim.raws.length; i++){
		    key = `rawlayer_${tim.raws[i].id}`;
		    items.vdisps.items.rawlayer.items[key] = {
			name: tim.raws[i].id
		    };
		    if( tim.raw === tim.raws[i] ){
			items.vdisps.items.rawlayer.items[key].icon = JS9.globalOpts.menuSelected;
		    }
		}
		items.vdisps.items.rawlayer.items[`sep${n++}`] = "------";
		items.vdisps.items.rawlayer.items.rawlayer_remove = xname("remove");
	    } else {
		items.vdisps.items.rawlayer.disabled = true;
	    }
	    items.resizes = {
		name: "resize ...",
		items: {
		    resizestitle: {
			name: "resize the display:",
			disabled: true
		    }
		}
	    };
	    items.resizes.items.resize = {
		events: {keyup: keyResize},
		name: "change width/height:",
		type: "text"
	    };
	    items.resizes.items.imagesize = xname("set to image size");
	    items.resizes.items.fullsize = xname("set size to full window");
	    items.resizes.items.resetsize = xname("reset to original size");
	    if( !JS9.globalOpts.resize ){
		items.resizes.items.resize.disabled = true;
		items.resizes.items.fullsize.disabled = true;
		items.resizes.items.imagesize.disabled = true;
		items.resizes.items.resetsize.disabled = true;
	    } else if( !tim ){
		items.resizes.items.imagesize.disabled = true;
	    }
	    return {
		callback: (key) => {
		    JS9.Menubar.getDisplays.call(this).forEach((val) => {
		        let ii, uplugin, s;
			const udisp = val;
			const uim = udisp.image;
			// make sure display is still valid
			if( $.inArray(udisp, JS9.displays) < 0 ){
			    return;
			}
			switch(key){
			case "valpos":
			    if( uim ){
				uim.toggleValpos();
			    }
			    break;
			case "valposdisp":
			    JS9.globalOpts.valposDCoords =
				!JS9.globalOpts.valposDCoords;
			    break;
			case "xhair":
			    if( uim ){
				uim.toggleCrosshair();
			    }
			    break;
			case "xhairwcs":
			    if( uim ){
				uim.toggleWCSCrosshair();
			    }
			    break;
			case "toolbar":
			    s = !JS9.GetToolbar("showTooltips");
			    JS9.SetToolbar("showTooltips", s);
			    break;
			case "logo":
			    JS9.globalOpts.logoDisplay =
				!JS9.globalOpts.logoDisplay;
			    s = JS9.globalOpts.logoDisplay ? "block" : "none";
			    for(ii=0; ii<JS9.displays.length; ii++){
				JS9.displays[ii].iconjq.css("display", s);
			    }
			    break;
			case "toggleLayers":
			    if( uim ){
				uim.toggleShapeLayers();
			    }
			    break;
			case "inherit":
			    if( uim ){
				uim.params.inherit = !uim.params.inherit;
			    }
			    break;
			case "fullsize":
			    udisp.resize("full", {center: true});
			    break;
			case "imagesize":
			    udisp.resize("image");
			    break;
			case "resetsize":
			    udisp.resize("reset");
			    break;
			default:
			    // maybe it's a plugin
			    for(ii=0; ii<JS9.plugins.length; ii++){
				uplugin = JS9.plugins[ii];
				if( uplugin.name === key ){
				    udisp.displayPlugin(uplugin);
				    return;
				}
			    }
			    // maybe its a raw data layer
			    if( tim && key.match(/^rawlayer_/) ){
				s = key.replace(/^rawlayer_/, "");
				if( s === "remove" ){
				    if( tim.raw.id !== JS9.RAWID0 ){
					for(i=0; i<tim.raws.length; i++){
					    if( tim.raw === tim.raws[i] ){
						tim.rawDataLayer(tim.raw.id,
								 "remove");
					    }
					}
				    }
				} else {
				    tim.rawDataLayer(s);
				}
			    }
			    break;
			}
		    });
		},
		events: {
		    show: (opt) => {
			const udisp = this.display;
			const obj = {};
			if( udisp  ){
			    obj.resize = sprintf("%d %d",
						 udisp.width, udisp.height);
			    $.contextMenu.setInputValues(opt, obj);
			    JS9.jupyterFocus(".context-menu-item");
			}
		    },
		    hide: (opt) => {
			let obj;
			const udisp = this.display;
			if( udisp ){
			    // if a key was pressed, do the edit
			    if( udisp.tmp.editingMenu ){
				obj = $.contextMenu.getInputValues(opt);
				editResize(udisp, obj);
			    }
			}
		    }
		},
		items: items
	    };
	}
    });
    // Zoom menu: make button open the contextMenu
    $(`#zoomMenu${this.id}`).on("mousedown", (evt) => {
        evt.preventDefault();
        $(`#zoomMenu${this.id}`).contextMenu();
    });
    // define contextMenu actions
    $.contextMenu({
        selector: `#zoomMenu${this.id}`,
	zIndex: JS9.MENUZINDEX,
	events: { hide: onhide },
	position: mypos,
        build: () => {
	    let i, zoom, zoomp, name, name2, nim, s1;
	    let plugin, pname, pinst;
	    let lastxclass="";
	    let n = 0;
	    const tdisp = JS9.Menubar.getDisplays.call(this)[0];
	    const tim = tdisp.image;
	    const editZoom = (im, obj) => {
		delete tdisp.tmp.editingMenu;
		// allow numbers or strings
		if( !Number.isNaN(obj.zoom) ){
		    im.setZoom(obj.zoom);
		}
	    };
	    const editRotate = (im, obj) => {
		delete tdisp.tmp.editingMenu2;
		// allow numbers or strings
		if( !Number.isNaN(obj.rotate) ){
		    im.setRotate(obj.rotate);
		}
	    };
	    const keyZoom = (e) => {
		JS9.Menubar.getDisplays.call(this).forEach((val) => {
		    const obj = $.contextMenu.getInputValues(e.data);
		    const keycode = e.which || e.keyCode;
		    const vdisp = val;
		    const vim = vdisp.image;
		    // make sure display is still valid
		    if( $.inArray(vdisp, JS9.displays) < 0 ){
			return;
		    }
		    switch( keycode ){
		    case 9:
		    case 13:
			if( vim ){
			    editZoom(vim, obj);
			}
			break;
		    default:
			vdisp.tmp.editingMenu = true;
			break;
		    }
		});
	    };
	    const keyRotate = (e) => {
		JS9.Menubar.getDisplays.call(this).forEach((val) => {
		    const obj = $.contextMenu.getInputValues(e.data);
		    const keycode = e.which || e.keyCode;
		    const vdisp = val;
		    const vim = vdisp.image;
		    // make sure display is still valid
		    if( $.inArray(vdisp, JS9.displays) < 0 ){
			return;
		    }
		    switch( keycode ){
		    case 9:
		    case 13:
			if( vim ){
			    editRotate(vim, obj);
			}
			break;
		    default:
			vdisp.tmp.editingMenu2 = true;
			break;
		    }
		});
	    };
	    const items = {};
	    items.zoomtitle = {
		name: "Zoom Factors:",
		disabled: true
	    };
	    for(i=JS9.imageOpts.topZooms; i>=1; i--){
		zoom = Math.pow(2,-i);
		zoomp = Math.pow(2,i);
		name = `zoom${zoom}`;
		name2 = `zoom 1/${zoomp}`;
		items[name] = xname(name2);
		if( tim && (tim.rgb.sect.zoom === zoom) ){
		    items[name].icon = JS9.globalOpts.menuSelected;
		}
	    }
	    for(i=0; i<=JS9.imageOpts.topZooms; i++){
		zoom = Math.pow(2,i);
		name = `zoom${zoom}`;
		name2 = `zoom ${zoom}`;
		items[name] = xname(name2);
		if( tim && (tim.rgb.sect.zoom === zoom) ){
		    items[name].icon = JS9.globalOpts.menuSelected;
		}
	    }
	    items.morezooms = {
		name: "more zooms ...",
		items: {
		    morezoomstitle: {
			name: "Zoom Factors:",
			disabled: true
		    }
		}
	    };
	    for(i=JS9.imageOpts.zooms; i>JS9.imageOpts.topZooms; i--){
		zoom = Math.pow(2,-i);
		zoomp = Math.pow(2,i);
		name = `zoom${zoom}`;
		name2 = `zoom 1/${zoomp}`;
		items.morezooms.items[name] = xname(name2);
		if( tim && (tim.rgb.sect.zoom === zoom) ){
		    items.morezooms.items[name].icon = JS9.globalOpts.menuSelected;
		}
	    }
	    for(i=JS9.imageOpts.topZooms+1; i<=JS9.imageOpts.zooms; i++){
		zoom = Math.pow(2,i);
		name = `zoom${zoom}`;
		name2 = `zoom ${zoom}`;
		items.morezooms.items[name] = xname(name2);
		if( tim && (tim.rgb.sect.zoom === zoom) ){
		    items.morezooms.items[name].icon = JS9.globalOpts.menuSelected;
		}
	    }
	    items.zoom = {
		events: {keyup: keyZoom},
		name: "numeric zoom:",
		type: "text"
	    };
	    items[`sep${n++}`] = "------";
	    items.zoomiotitle = {
		name: "Zoom In/Out:",
		disabled: true
	    };
	    items.zoomIn = xname("zoom in");
	    items.zoomOut = xname("zoom out");
	    items.zoomToFit = xname("zoom to fit");
	    items[`sep${n++}`] = "------";
	    items.panzoomtitle = {
		name: "Pand and Zoom:",
		disabled: true
	    };
	    items.center = xname("pan to center");
	    items.alignpanzoom = {
		name: "align pan/zoom ...",
		items: {
		    alignpanzoomtitle: {
			name: "to this image:",
			disabled: true
		    }
		}
	    };
	    for(i=0, nim=0; i<JS9.images.length; i++){
		if( JS9.images[i].raw.wcs ){
		    if( (tim === JS9.images[i]) &&
			(this.id.search(JS9.SUPERMENU) < 0) ){
			continue;
		    }
		    s1 = `alignpanzoom_${JS9.images[i].id}`;
		    items.alignpanzoom.items[s1] = {
			name: JS9.images[i].id
		    };
		    nim++;
		}
	    }
	    if( nim === 0 ){
		items.alignpanzoom.items.notasks = {
		    name: "[none]",
		    disabled: true,
		    events: {keyup() {return;}}
		};
	    } else {
		items.alignpanzoom.disabled = false;
	    }
	    items.reset = xname("reset pan/zoom");
	    items.pantoclick = {
		name: "(pan to mouse: Meta-click)",
		disabled: true,
	    };
	    items[`sep${n++}`] = "------";
	    items.fliptitle = {
		name: "Flip:",
		disabled: true
	    };
	    items.flipX = xname("x axis");
	    if( !tim || !tim.raw || !tim.raw.hdu || !tim.raw.hdu.fits ){
		items.flipX.disabled = true;
	    }
	    items.flipY = xname("y axis");
	    if( !tim || !tim.raw || !tim.raw.hdu || !tim.raw.hdu.fits ){
		items.flipY.disabled = true;
	    }
	    items[`sep${n++}`] = "------";
	    items.rot90title = {
		name: "Rotate:",
		disabled: true
	    };
	    items.rot90_90 = xname("90 left");
	    if( !tim || !tim.raw || !tim.raw.hdu || !tim.raw.hdu.fits ){
		items.rot90_90.disabled = true;
	    }
	    items.rot90_270 = xname("90 right");
	    if( !tim || !tim.raw || !tim.raw.hdu || !tim.raw.hdu.fits ){
		items.rot90_270.disabled = true;
	    }
	    items.rotate = {
		events: {keyup: keyRotate},
		name: "rotation angle:",
		type: "text"
	    };
	    items[`sep${n++}`] = "------";
	    items.northisup = xname("align: north is up");
	    if( !tim || !tim.raw || !tim.raw.hdu || !tim.raw.hdu.fits ||
		!tim.raw.wcs || tim.raw.wcs <= 0){
		items.northisup.disabled = true;
	    }
	    items.resetall = xname("reset flip/rot90/rotate");
	    items[`sep${n++}`] = "------";
	    // plugins
	    for(i=0; i<JS9.plugins.length; i++){
		plugin = JS9.plugins[i];
		pname = plugin.name;
		if( plugin.opts.menuItem && (plugin.opts.menu === "zoom") ){
		    pinst = tdisp.pluginInstances[pname];
		    if( !pinst || pinst.winHandle ){
			if( plugin.xclass !== lastxclass ){
			    // items["sep" + n] = "------";
			    n = n + 1;
			}
			lastxclass = plugin.xclass;
			items[pname] = xname(plugin.opts.menuItem);
			if( pinst && (pinst.status === "active") ){
			    items[pname].icon = JS9.globalOpts.menuSelected;
			}
		    }
		}
	    }
	    return {
		callback: (key) => {
		    let ii, uplugin;
		    JS9.Menubar.getDisplays.call(this).forEach((val) => {
			const udisp = val;
			const uim = udisp.image;
			// make sure display is still valid
			if( $.inArray(udisp, JS9.displays) < 0 ){
			    return;
			}
			if( uim ){
			    switch(key){
			    case "zoomIn":
				uim.setZoom("x2");
				break;
			    case "zoomOut":
				uim.setZoom("/2");
				break;
			    case "zoomToFit":
				uim.setZoom("tofit");
				break;
			    case "center":
				uim.setPan();
				break;
			    case "reset":
				uim.setZoom("1");
				uim.setPan();
				break;
			    case "flipX":
				uim.setFlip("x");
				break;
			    case "flipY":
				uim.setFlip("y");
				break;
			    case "rot90_90":
				uim.setRot90(90);
				break;
			    case "rot90_270":
				uim.setRot90(-90);
				break;
			    case "northisup":
				uim.setRot90("reset");
				uim.setRotate("northisup");
				break;
			    case "resetall":
				uim.setFlip("reset");
				uim.setRot90("reset");
				uim.setRotate("reset");
				break;
			    default:
				// maybe it's a plugin
				for(ii=0; ii<JS9.plugins.length; ii++){
				    uplugin = JS9.plugins[ii];
				    if( uplugin.name === key ){
					udisp.displayPlugin(uplugin);
					return;
				    }
				}
				// look for a numeric zoom
				if( key.match(/^zoom/) ){
				    uim.setZoom(key.slice(4));
				} else if( key.match(/^alignpanzoom_/) ){
				    uim.alignPanZoom(key.slice(13));
				}
				break;
			    }
			}
		    });
		},
		events: {
		    show: (opt) => {
			const udisp = this.display;
			const uim = udisp.image;
			const obj = {};
			if( uim  ){
			    obj.zoom =
				JS9.floatToString(uim.rgb.sect.zoom);
			    obj.rotate =
				JS9.floatToString(uim.params.rotate||0);
			}
			$.contextMenu.setInputValues(opt, obj);
			JS9.jupyterFocus(".context-menu-item");
		    },
		    hide: (opt) => {
			let obj;
			const udisp = this.display;
			const uim = udisp.image;
			if( uim ){
			    // if a key was pressed, do the edit
			    if( udisp.tmp.editingMenu ){
				obj = $.contextMenu.getInputValues(opt);
				editZoom(uim, obj);
			    }
			    if( udisp.tmp.editingMenu2 ){
				obj = $.contextMenu.getInputValues(opt);
				editRotate(uim, obj);
			    }
			}
		    }
		},
		items: items
	    };
	}
    });
    // Scale menu: make button open the contextMenu
    $(`#scaleMenu${this.id}`).on("mousedown", (evt) => {
        evt.preventDefault();
        $(`#scaleMenu${this.id}`).contextMenu();
    });
    // define contextMenu actions
    $.contextMenu({
        selector: `#scaleMenu${this.id}`,
	zIndex: JS9.MENUZINDEX,
	events: { hide: onhide },
	position: mypos,
        build: () => {
	    let i, s1, s2;
	    let plugin, pname, pinst;
	    let lastxclass="";
	    let n = 0;
	    const items = {};
	    const tdisp = JS9.Menubar.getDisplays.call(this)[0];
	    const editScale = (im, obj) => {
		let dval1 = im.params.scalemin;
		let dval2 = im.params.scalemax;
		delete tdisp.tmp.editingMenu;
		if( JS9.isNumber(obj.scalemin) ){
		    dval1 = parseFloat(obj.scalemin);
		}
		if( JS9.isNumber(obj.scalemax) ){
		    dval2 = parseFloat(obj.scalemax);
		}
		im.setScale(dval1, dval2);
		im.displayImage("colors");
	    };
	    const keyScale = (e) => {
		JS9.Menubar.getDisplays.call(this).forEach((val) => {
		    const obj = $.contextMenu.getInputValues(e.data);
		    const keycode = e.which || e.keyCode;
		    const vdisp = val;
		    const vim = vdisp.image;
		    // make sure display is still valid
		    if( $.inArray(vdisp, JS9.displays) < 0 ){
			return;
		    }
		    switch( keycode ){
		    case 9:
		    case 13:
			if( vim ){
			    editScale(vim, obj);
			}
			break;
		    default:
			vdisp.tmp.editingMenu = true;
			break;
		    }
		});
	    };
	    items.scaletitle = {name: "Scaling Algorithms:",
				disabled: true};
	    for(i=0; i<JS9.scales.length; i++){
		s1 = JS9.scales[i];
		s2 = s1;
		items[s1] = xname(s2);
		if( tdisp.image && (tdisp.image.params.scale === s1) ){
		    items[s1].icon = JS9.globalOpts.menuSelected;
		}
	    }
	    items[`sep${n++}`] = "------";
	    items.dlims = {
		name: "data limits ...",
		items: {
		    title: {
			name: "set data limits to:",
			disabled: true
		    },
		    dataminmax: {
			name: "data min/max"
		    },
		    zscale: {
			name: "zscale z1/z2"
		    },
		    zmax: {
			name: "zscale z1/data max"
		    }
		}
	    };
	    items.scalemin = {
		events: {keyup: keyScale},
		name: "low:",
		type: "text"
	    };
	    items.scalemax = {
		events: {keyup: keyScale},
		name: "high:",
		type: "text"
	    };
	    items[`sep${n++}`] = "------";
	    // plugins
	    for(i=0; i<JS9.plugins.length; i++){
		plugin = JS9.plugins[i];
		pname = plugin.name;
		if( plugin.opts.menuItem && (plugin.opts.menu === "scale") ){
		    pinst = tdisp.pluginInstances[pname];
		    if( !pinst || pinst.winHandle ){
			if( plugin.xclass !== lastxclass ){
			    // items["sep" + n] = "------";
			    n = n + 1;
			}
			lastxclass = plugin.xclass;
			items[pname] = xname(plugin.opts.menuItem);
			if( pinst && (pinst.status === "active") ){
			    items[pname].icon = JS9.globalOpts.menuSelected;
			}
		    }
		}
	    }
	    return {
                callback: (key) => {
		    let ii, uplugin;
		    JS9.Menubar.getDisplays.call(this).forEach((val) => {
			const udisp = val;
			const uim = udisp.image;
			// make sure display is still valid
			if( $.inArray(udisp, JS9.displays) < 0 ){
			    return;
			}
			if( uim ){
			    switch(key){
			    default:
				// maybe it's a plugin
				for(ii=0; ii<JS9.plugins.length; ii++){
				    uplugin = JS9.plugins[ii];
				    if( uplugin.name === key ){
					udisp.displayPlugin(uplugin);
					return;
				    }
				}
				uim.setScale(key);
				break;
			    }
			}
		    });
		},
		events: {
		    show: (opt) => {
			const udisp = this.display;
			const uim = udisp.image;
			const obj = {};
			if( uim  ){
			    obj.scalemin =
				JS9.floatToString(uim.params.scalemin);
			    obj.scalemax =
				JS9.floatToString(uim.params.scalemax);
			}
			$.contextMenu.setInputValues(opt, obj);
			JS9.jupyterFocus(".context-menu-item");
		    },
		    hide: (opt) => {
			let obj;
			const udisp = this.display;
			const uim = udisp.image;
			if( uim ){
			    // if a key was pressed, do the edit
			    if( udisp.tmp.editingMenu ){
				obj = $.contextMenu.getInputValues(opt);
				editScale(uim, obj);
			    }
			}
		    }
		},
		items: items
	    };
	}
    });
    // Color menu: make button open the contextMenu
    $(`#colorMenu${this.id}`).on("mousedown", (evt) => {
        evt.preventDefault();
        $(`#colorMenu${this.id}`).contextMenu();
    });
    // define contextMenu actions
    $.contextMenu({
        selector: `#colorMenu${this.id}`,
	zIndex: JS9.MENUZINDEX,
	events: { hide: onhide },
	position: mypos,
        build: () => {
	    let i, s1, s2, hstr, img;
	    let plugin, pname, pinst;
	    let lastxclass="";
	    let n = 0;
	    const items = {};
	    const tdisp = JS9.Menubar.getDisplays.call(this)[0];
	    const editColor = (im, obj) => {
		delete tdisp.tmp.editingMenu;
		if( obj.contrast && !Number.isNaN(obj.contrast) ){
		    im.params.contrast = parseFloat(obj.contrast);
		}
		if( obj.bias && !Number.isNaN(obj.bias) ){
		    im.params.bias = parseFloat(obj.bias);
		}
		if( obj.opacity.match(/reset/) || obj.opacity.trim() === "" ){
		    im.setOpacity("reset");
		} else if( !Number.isNaN(obj.opacity) ){
		    im.setOpacity(parseFloat(obj.opacity));
		}
		im.displayImage("colors");
	    };
	    const keyColor = (e) => {
		JS9.Menubar.getDisplays.call(this).forEach((val) => {
		    const obj = $.contextMenu.getInputValues(e.data);
		    const keycode = e.which || e.keyCode;
		    const vdisp = val;
		    const vim = vdisp.image;
		    // make sure display is still valid
		    if( $.inArray(vdisp, JS9.displays) < 0 ){
			return;
		    }
		    switch( keycode ){
		    case 9:
		    case 13:
			editColor(vim, obj);
			break;
		    default:
			vdisp.tmp.editingMenu = true;
			break;
		    }
		});
	    };
	    items.cmaptitle = {
		name: "Colormaps:",
		disabled: true
	    };
	    for(i=0; i<JS9.globalOpts.topColormaps.length; i++){
		s1 = JS9.globalOpts.topColormaps[i];
		s2 = s1;
		if( JS9.globalOpts.menuImages ){
		    img = JS9.Menubar.menuImage(`images/voyager/color_${s2}.png`);
		    hstr = `<div class='JS9MenubarImage' name='${s2}'><img src='${img}' name='color_${s2}' class='JS9MenubarImage JS9MenubarImageOption' onerror='JS9.Menubar.missing["color_${s2}.png"]=true; this.src="${JS9.Menubar.EMPTYIMG}"' >` + `&nbsp;&nbsp;${s2}</div>`;
		    items[s1] = {name: hstr, isHtmlName: true};
		} else {
		    items[s1] = xname(s2);
		}
		if( tdisp.image && (tdisp.image.cmapObj.name === s1) ){
		    items[s1].icon = JS9.globalOpts.menuSelected;
		}
	    }
	    items.morecmaps = {
		name: "more colormaps ...",
		items: {
		    morecmapstitle: {
			name: "Colormaps:",
			disabled: true
		    }
		}
	    };
	    for(i=0; i<JS9.colormaps.length; i++){
		s1 = JS9.colormaps[i].name;
		if( !JS9.globalOpts.topColormaps.includes(s1) ){
		    s2 = s1;
		    if( JS9.globalOpts.menuImages ){
			img = JS9.Menubar.menuImage(`images/voyager/color_${s2}.png`);
			hstr = `<div class='JS9MenubarImage' name='${s2}'><img src='${img}' name='color_${s2}' class='JS9MenubarImage JS9MenubarImageOption' onerror='JS9.Menubar.missing["color_${s2}.png"]=true; this.src="${JS9.Menubar.EMPTYIMG}"' >` + `&nbsp;&nbsp;${s2}</div>`;
			items.morecmaps.items[s1] = {name: hstr, isHtmlName: true};
		    } else {
			items.morecmaps.items[s1] = xname(s2);
		    }
		    if( tdisp.image && (tdisp.image.cmapObj.name === s1) ){
			items.morecmaps.items[s1].icon = JS9.globalOpts.menuSelected;
		    }
                }
	    }
	    items[`sep${n++}`] = "------";
	    items.imfilter = xname("image filters ...");
	    items[`sep${n++}`] = "------";
	    items.contrast = {
		events: {keyup: keyColor},
		name: "contrast:",
		type: "text"
	    };
	    items.bias = {
		events: {keyup: keyColor},
		name: "bias:",
		type: "text"
	    };
	    items.reset = xname("reset contrast & bias");
	    items[`sep${n++}`] = "------";
	    items.opacity = {
		events: {keyup: keyColor},
		name: "opacity:",
		type: "text"
	    };
	    items[`sep${n++}`] = "------";
	    items.loadcmap = xname("load ...");
	    items.savecmap = xname("save");
	    items[`sep${n++}`] = "------";
	    items.invert = xname("invert");
	    if( tdisp.image && tdisp.image.params.invert ){
		items.invert.icon = JS9.globalOpts.menuSelected;
	    }
	    items.rgb = xname("rgb mode");
	    if( tdisp.rgb.active ){
		items.rgb.icon = JS9.globalOpts.menuSelected;
	    }
	    items[`sep${n++}`] = "------";
	    // plugins
	    for(i=0; i<JS9.plugins.length; i++){
		plugin = JS9.plugins[i];
		pname = plugin.name;
		if( plugin.opts.menuItem && (plugin.opts.menu === "color") ){
		    pinst = tdisp.pluginInstances[pname];
		    if( !pinst || pinst.winHandle ){
			if( plugin.xclass !== lastxclass ){
			    // items["sep" + n] = "------";
			    n = n + 1;
			}
			lastxclass = plugin.xclass;
			items[pname] = xname(plugin.opts.menuItem);
			if( pinst && (pinst.status === "active") ){
			    items[pname].icon = JS9.globalOpts.menuSelected;
			}
		    }
		}
	    }
	    return {
		callback: (key) => {
		    let ii, uplugin;
		    JS9.Menubar.getDisplays.call(this).forEach((val) => {
			const udisp = val;
			const uim = udisp.image;
			// make sure display is still valid
			if( $.inArray(udisp, JS9.displays) < 0 ){
			    return;
			}
			switch(key){
			case "loadcmap":
			    JS9.OpenColormapMenu({display: udisp});
			    break;
			case "savecmap":
			    JS9.SaveColormap({display: udisp});
			    break;
			case "imfilter":
			    JS9.DisplayPlugin("JS9Filters", {display: udisp});
			    break;
			default:
			    // maybe it's a plugin
			    for(ii=0; ii<JS9.plugins.length; ii++){
				uplugin = JS9.plugins[ii];
				if( uplugin.name === key ){
				    udisp.displayPlugin(uplugin);
				    return;
				}
			    }
			    // set the colormap
			    if( uim ){
				uim.setColormap(key);
			    }
			}
		    });
		},
		events: {
		    show: (opt) => {
			const udisp = this.display;
			const uim = udisp.image;
			const obj = {};
			if( uim  ){
			    obj.contrast =
				JS9.floatToString(uim.params.contrast);
			    obj.bias =
				JS9.floatToString(uim.params.bias);
			    obj.opacity =
				JS9.floatToString(uim.params.opacity);
			    obj.sigma =
				JS9.floatToString(uim.params.sigma);
			}
			$.contextMenu.setInputValues(opt, obj);
			JS9.jupyterFocus(".context-menu-item");
		    },
		    hide: (opt) => {
			let obj;
			const udisp = this.display;
			const uim = udisp.image;
			if( uim ){
			    // if a key was pressed, do the edit
			    if( udisp.tmp.editingMenu ){
				obj = $.contextMenu.getInputValues(opt);
				editColor(uim, obj);
			    }
			}
		    }
		},
		items: items
	    };
	}
    });
    // Region menu: make button open the contextMenu
    $(`#regionMenu${this.id}`).on("mousedown", (evt) => {
        evt.preventDefault();
        $(`#regionMenu${this.id}`).contextMenu();
    });
    // define contextMenu actions
    $.contextMenu({
        selector: `#regionMenu${this.id}`,
	zIndex: JS9.MENUZINDEX,
	events: { hide: onhide },
	position: mypos,
        build: () => {
	    let i, s1, reg, img, key;
	    const tdisp = JS9.Menubar.getDisplays.call(this)[0];
	    const tim = tdisp.image;
	    const items = {};
	    const getregval = (key, val) => {
		switch(key){
		case "color":
		    // lookup color
		    if( val.charAt(0) !== "#" && JS9.colorToHex(val) === val ){
			return null;
		    }
		    break;
		case "strokeWidth":
		    // number
		    if( !JS9.isNumber(val) ){
			return null;
		    }
		    val = parseFloat(val);
		    break;
		case "strokeDashArray":
		    // space or comma-separated list of numbers
		    val = val.split(/[\s,]+/);
		    if( !val || !val.length ){
			return null;
		    }
		    if( val.length < 2 ){
			val[1] = "0";
		    }
		    if( !JS9.isNumber(val[0]) || !JS9.isNumber(val[1])  ){
			return null;
		    }
		    val[0] = parseFloat(val[0]);
		    val[1] = parseFloat(val[1]);
		    break;
		default:
		    // text
		    break;
		}
		return val;
	    };
	    const editRegions = (im, obj, which) => {
		let key, val;
		const opts = {};
		if( which ){
		    key = which.substring(3);
		    val = obj[which];
		    if( key && val && im.tmp[`editingReg${which}`] ){
			delete im.tmp[`editingReg${which}`];
			val = getregval(key, val);
			if( val ){
			    opts[key] = val;
			    im.changeShapes("regions", "selected", opts);
			}
		    }
		} else {
		    for( which in obj ){
			if( obj.hasOwnProperty(which) ){
			    key = which.substring(3);
			    val = obj[which];
			    if( key && val && im.tmp[`editingReg${which}`] ){
				delete im.tmp[`editingReg${which}`];
				val = getregval(key, val);
				if( val ){
				    opts[key] = val;
				}
			    }
			}
		    }
		    if( Object.keys(opts).length ){
			im.changeShapes("regions", "selected", opts);
		    }
		}
	    };
	    items.regiontitle = {
		name: "Regions:",
		disabled: true
	    };
	    if( JS9.globalOpts.menuImages ){
		for(i=0; i<JS9.regions.length; i++){
		    reg = JS9.regions[i];
		    img = JS9.Menubar.menuImage(`images/voyager/regions_${reg}.svg`);
		    items[reg] = {name: `<div class='JS9MenubarImage' name='${reg}'><img src='${img}' name='regions_${reg}' class='JS9MenubarImage JS9MenubarImageOption' onerror='JS9.Menubar.missing["regions_${reg}.svg"]=true; this.src="${JS9.Menubar.EMPTYIMG}"' >` + `&nbsp;&nbsp;${reg}</div>`,
				  isHtmlName: true};
		}
	    } else {
		for(i=0; i<JS9.regions.length; i++){
		    reg = JS9.regions[i];
		    items[reg] = xname(reg);
		}
	    }
	    items.sep1 = "------";
	    items.createRegions = xname("menu adds region @ center");
	    if( JS9.globalOpts.regMenuCreate ){
		items.createRegions.icon = JS9.globalOpts.menuSelected;
	    }
	    for( key in JS9.globalOpts.keyboardActions ){
		if( JS9.globalOpts.keyboardActions.hasOwnProperty(key) ){
		    if( JS9.globalOpts.keyboardActions[key] ===
			"add last region selected in regions menu" ){
			items.notCreateRegions = {
			    name: `('${key}' adds region @ mouse)`,
			    disabled: true,
			};
		    }
		}
	    }
	    
	    items.sep1a = "------";
	    items.listRegions  = xname("list");
	    items.loadRegions  = xname("load ...");
	    items.saveRegions  = xname("save ...");
	    items.copyto  = {
		name: "copy to ...",
		items: {
		    copytotitle: {
			name: "choose image:",
			disabled: true
		    }
		}
	    };
	    items.removeRegions  = xname("remove");
	    items.sep2 = "------";
	    items.selectRegions = xname("select all");
	    items.selectedRegions = xname("selected ...");
	    items.sep3 = "------";
	    items.onchange = {
		name: "onchange ...",
		items: {
		    listonchange: xname("list on change"),
		    xeqonchange: xname("xeq on change")
		}
	    };
	    if( tim && tim.params.listonchange ){
		items.onchange.items.listonchange.icon = JS9.globalOpts.menuSelected;
	    }
	    if( tim && tim.params.xeqonchange ){
		items.onchange.items.xeqonchange.icon = JS9.globalOpts.menuSelected;
	    }
	    if( tim && (JS9.images.length > 1) ){
		for(i=0; i<JS9.images.length; i++){
		    if( tim !== JS9.images[i] ){
			s1 = `copyto_${JS9.images[i].id}`;
			items.copyto.items[s1] = xname(JS9.images[i].id);
		    }
		}
		items.copyto.items.copyto_all = xname("all images");
		items.copyto.disabled = false;
	    } else {
		items.copyto.disabled = true;
	    }
	    // disable if we don't have info plugin
	    if( !JS9.hasOwnProperty("Info") ){
		items.listRegions.disabled = true;
	    }
	    return {
		callback: (key) => {
		    JS9.Menubar.getDisplays.call(this).forEach((val) => {
			let uid, ulayer, uao, uopts;
			const udisp = val;
			const uim = udisp.image;
			// make sure display is still valid
			if( $.inArray(udisp, JS9.displays) < 0 ){
			    return;
			}
			if( uim ){
			    switch(key){
			    case "loadRegions":
				JS9.OpenRegionsMenu({display: udisp});
				break;
			    case "listRegions":
				uim.listRegions(null, {mode: 2});
				break;
			    case "createRegions":
				JS9.globalOpts.regMenuCreate =
				    !JS9.globalOpts.regMenuCreate;
				break;
			    case "removeRegions":
				uim.removeShapes("regions", null);
				udisp.clearMessage("regions");
				break;
			    case "saveRegions":
				ulayer = uim.layers.regions;
				if( ulayer ){
				    uao = ulayer.canvas.getActiveObject();
				    uopts = {type: "save"};
				    if( uao && uao.type !== "activeSelection" ){
					uim.displayRegionsForm(uao, uopts);
				    } else {
					uim.displayRegionsForm(null, uopts);
				    }
				}
				break;
			    case "selectRegions":
				if( JS9.hasOwnProperty("Keyboard") ){
				    JS9.Keyboard.Actions["select all regions"](uim, uim.ipos);
				}
				break;
			    case "selectedRegions":
				ulayer = uim.layers.regions;
				if( ulayer ){
				    uao = ulayer.canvas.getActiveObject();
				    if( uao && uao.type !== "activeSelection" ){
					// no active selection, edit this region
					uim.displayRegionsForm(uao);
				    } else {
					// active selection or no regions: multi
					uim.displayRegionsForm(null,
							       {multi: true});
				    }
				}
				break;
			    case "xeqonchange":
				uim.params.xeqonchange = !uim.params.xeqonchange;
				break;
			    case "listonchange":
				uim.params.listonchange = !uim.params.listonchange;
				break;
			    default:
				// maybe it's a copyto request
				if( key.match(/^copyto_/) ){
				    uid = key.replace(/^copyto_/,"");
				    uim.copyRegions(uid);
				    return;
				}
				// otherwise it's new region
				JS9.globalOpts.regMenuSelected = key;
				if( JS9.globalOpts.regMenuCreate ){
				    uim.addShapes("regions", key, {ireg: true});
				}
				break;
			    }
			}
		    });
		},
		events: {
		    show: (opt) => {
			const obj = {color: ""};
			$.contextMenu.setInputValues(opt, obj);
			JS9.jupyterFocus(".context-menu-item");
		    },
		    hide: (opt) => {
			let obj;
			const udisp = this.display;
			const uim = udisp.image;
			if( uim ){
			    // if a key was pressed, do the edit
			    obj = $.contextMenu.getInputValues(opt);
			    editRegions(uim, obj);
			}
		    }
		},
		items: items
	    };
	}
    });
    // WCS menu: make button open the contextMenu
    $(`#wcsMenu${this.id}`).on("mousedown", (evt) => {
        evt.preventDefault();
        $(`#wcsMenu${this.id}`).contextMenu();
    });
    // define contextMenu actions
    $.contextMenu({
        selector: `#wcsMenu${this.id}`,
	zIndex: JS9.MENUZINDEX,
	events: { hide: onhide },
	position: mypos,
        build: () => {
	    let i, s1, s2, key, altwcs, sys, units;
	    let n=0, nwcs=0, got=0;
	    const items = {};
	    const tdisp = JS9.Menubar.getDisplays.call(this)[0];
	    const tim = tdisp.image;
	    const editRotate = (im, obj) => {
		delete tdisp.tmp.editingMenu;
		if( JS9.isNumber(obj.rot) ){
		    im.rotateData(parseFloat(obj.rot));
		}
	    };
	    const keyRotate = (e) => {
		JS9.Menubar.getDisplays.call(this).forEach((val) => {
		    const obj = $.contextMenu.getInputValues(e.data);
		    const keycode = e.which || e.keyCode;
		    const vdisp = val;
		    const vim = vdisp.image;
		    // make sure display is still valid
		    if( $.inArray(vdisp, JS9.displays) < 0 ){
			return;
		    }
		    switch( keycode ){
		    case 9:
		    case 13:
			if( vim ){
			    editRotate(vim, obj);
			}
			break;
		    default:
			vdisp.tmp.editingMenu = true;
			break;
		    }
		});
	    };
	    items.wcssystitle = {
		name: "WCS Systems:",
		disabled: true
	    };
	    if( !tim || (tim && tim.raw.wcs && tim.raw.wcs > 0) ){
		sys = JS9.wcssyss;
	    } else {
		sys = ["image", "physical"];
	    }
	    for(i=0; i<sys.length; i++){
		s1 = sys[i];
		s2 = s1;
		items[s1] = xname(s2);
		if( tim && (tim.params.wcssys === s1) ){
		    items[s1].icon = JS9.globalOpts.menuSelected;
		    got++;
		}
	    }
	    // if we don't know which wcssys is current, assume native or image
	    if( !got ){
		if( !tim || (tim && tim.raw.wcs && tim.raw.wcs > 0) ){
		    s1 = "native";
		} else {
		    s1 = "image";
		}
		items[s1].icon = JS9.globalOpts.menuSelected;
	    }
	    items[`sep${n++}`] = "------";
	    items.wcsutitle = {
		name: "WCS Units:",
		disabled: true
	    };
	    if( !tim || (tim && tim.raw.wcs && tim.raw.wcs > 0) ){
		units = JS9.wcsunitss;
	    } else {
		units = ["pixels"];
	    }
	    for(i=0; i<units.length; i++){
		s1 = units[i];
		s2 = s1;
		items[s1] = xname(s2);
		if( tim && (tim.params.wcsunits === s1) ){
		    items[s1].icon = JS9.globalOpts.menuSelected;
		}
	    }
	    items[`sep${n++}`] = "------";
	    items.altwcs = {
		name: "alternate wcs",
		items: {
		    altwcstitle: {
			name: "choose a wcs:",
			disabled: true
		    }
		}
	    };
	    if( !tim || !tim.raw || !tim.raw.altwcs ){
		items.altwcs.disabled = true;
	    } else {
		altwcs = tim.raw.altwcs;
		for( key in altwcs ){
		    if( altwcs.hasOwnProperty(key) ){
			s1 = `altwcs_${key}`;
			if( altwcs[key].header.WCSNAME ){
			    s2 = `${altwcs[key].header.WCSNAME  
				}    (${key})`;
			} else {
			    s2 = key;
			}
			items.altwcs.items[s1] = xname(s2);
			if( tim.raw.wcs === altwcs[key].wcs ){
			    items.altwcs.items[s1].icon = JS9.globalOpts.menuSelected;
			}
			nwcs++;
		    }
		}
		// disable if we only have the default wcs
		if( nwcs < 2 ){
		    items.altwcs.disabled = true;
		    items.altwcs.items.notasks = {
			name: "[none]",
			disabled: true,
			events: {keyup() {return;}}
		    };
		}
	    }
	    items[`sep${n++}`] = "------";
	    items.reproject = {
		name: "wcs reproject ...",
		items: {
		    reprojtitle: {
			name: "this image, using the wcs from:",
			disabled: true
		    }
		}

	    };
	    for(i=0, nwcs=0; i<JS9.images.length; i++){
		if( JS9.images[i].raw.wcs ){
		    if( (tim === JS9.images[i]) &&
			(this.id.search(JS9.SUPERMENU) < 0) ){
			continue;
		    }
		    s1 = `reproject_${JS9.images[i].id}`;
		    items.reproject.items[s1] = {
			name: JS9.images[i].id
		    };
		    nwcs++;
		}
	    }
	    if( nwcs === 0 ){
		items.reproject.items.notasks = {
		    name: "[none]",
		    disabled: true,
		    events: {keyup() {return;}}
		};
	    } else {
		items.reproject.disabled = false;
		items.reproject.items[`sep${n++}`] = "------";
		items.reproject.items.reproject_all = {
		    name: "all images in this display, using this wcs"
		};
		items.reproject.items[`sep${n++}`] = "------";
		items.reproject.items.reproject_wcsalign = {
		    name: "display wcs-aligned"
		};
		if( tim && (tim.params.wcsalign) ){
		    items.reproject.items.reproject_wcsalign.icon = JS9.globalOpts.menuSelected;
		}
	    }
	    items.reproject.items[`sep${n++}`] = "------";
	    items.reproject.items.rotatetitle = {
		name: "by rotating this image:",
		disabled: true
	    };
	    items.reproject.items.reproject_northup = {
		name: "so north is up"
	    };
	    items.reproject.items.rot = {
		events: {keyup: keyRotate},
		name: "by this angle in deg:",
		type: "text"
	    };
	    if( !tim || !tim.raw || !tim.raw.header || !tim.raw.wcsinfo ){
		items.reproject.disabled = true;
	    }
	    items.reproject.items[`sep${n++}`] = "------";
	    items.reproject.items.reproject_revert = {
		name: "revert"
	    };
	    return {
                callback: (key) => {
		    JS9.Menubar.getDisplays.call(this).forEach((val) => {
			let file, s;
			const rexp = new RegExp(key);
			const udisp = val;
			const uim = udisp.image;
			// make sure display is still valid
			if( $.inArray(udisp, JS9.displays) < 0 ){
			    return;
			}
			if( uim ){
			    // maybe it's an alt wcs request
			    if( key.match(/^altwcs_/) ){
				s = key.replace(/^altwcs_/,"");
				uim.setWCS(s);
				return;
			    }
			    // maybe it's a wcs reprojection request
			    if( key.match(/^reproject_/) ){
				if( key === "reproject_wcsalign" ){
				    uim.params.wcsalign = !uim.params.wcsalign;
				    uim.displayImage("display");
				} else if( key === "reproject_northup" ){
				    uim.rotateData("northisup");
				} else if( key === "reproject_revert" ){
				    if( uim.raw.id !== JS9.RAWID0 ){
					for(i=0; i<uim.raws.length; i++){
					    if( uim.raw === uim.raws[i] ){
						uim.rawDataLayer(uim.raw.id,
								 "remove");
					    }
					}
				    }
				} else if( key === "reproject_all" ){
				    uim.reprojectData("all");
				}  else {
				    file = key.replace(/^reproject_/,"");
				    uim.reprojectData(file);
				}
				return;
			    }
			    // otherwise it's a wcs directive
			    if( JS9.wcssyss.join("@").search(rexp) >=0 ){
				uim.setWCSSys(key);
				uim.updateShapes("regions", "all", "wcs");
			    } else if( JS9.wcsunitss.join("@").search(rexp)>=0){
				uim.setWCSUnits(key);
				uim.updateShapes("regions", "all", "wcs");
			    } else {
				JS9.error(`unknown wcs sys/units: ${key}`);
			    }
			}
		    });
		},
		events: {
		    show: (opt) => {
			const udisp = this.display;
			const uim = udisp.image;
			const obj = {};
			if( uim ){
			    obj.rot = "";
			    $.contextMenu.setInputValues(opt, obj);
			    JS9.jupyterFocus(".context-menu-item");
			}
		    },
		    hide: (opt) => {
			let obj;
			const udisp = this.display;
			const uim = udisp.image;
			if( uim ){
			    obj = $.contextMenu.getInputValues(opt);
			    // if a key was pressed, do the edit
			    if( udisp.tmp.editingMenu ){
				editRotate(uim, obj);
			    }
			}
		    }
		},
		items: items
	    };
	}
    });
    // Analysis menu: make button open the contextMenu
    $(`#analysisMenu${this.id}`).on("mousedown", (evt) => {
        evt.preventDefault();
        $(`#analysisMenu${this.id}`).contextMenu();
    });
    // define contextMenu actions
    $.contextMenu({
        selector: `#analysisMenu${this.id}`,
	zIndex: JS9.MENUZINDEX,
	events: { hide: onhide },
	position: mypos,
        build: () => {
	    let i, j, s, apackages, atasks;
	    let plugin, pinst, pname;
	    let lastxclass="";
	    let n = 0;
	    let ntask = 0;
	    const items = {};
	    const tdisp = JS9.Menubar.getDisplays.call(this)[0];
	    const im = tdisp.image;
	    const editAnalysis = (im, obj) => {
		delete tdisp.tmp.editingMenu;
		obj.sigma = obj.sigma || "0";
		if( obj.sigma === "none" ){
		    obj.sigma = "0";
		}
		try{ im.params.sigma = parseFloat(obj.sigma); }
		catch(e){ im.params.sigma = 0; }
		im.gaussBlurData(im.params.sigma);
	    };
	    const keyAnalysis = (e) => {
		JS9.Menubar.getDisplays.call(this).forEach((val) => {
		    const obj = $.contextMenu.getInputValues(e.data);
		    const keycode = e.which || e.keyCode;
		    const vdisp = val;
		    const vim = vdisp.image;
		    // make sure display is still valid
		    if( $.inArray(vdisp, JS9.displays) < 0 ){
			return;
		    }
		    switch( keycode ){
		    case 9:
		    case 13:
			editAnalysis(vim, obj);
			break;
		    default:
			vdisp.tmp.editingMenu = true;
			break;
		    }
		});
	    };
	    for(i=0; i<JS9.plugins.length; i++){
		plugin = JS9.plugins[i];
		pname = plugin.name;
		if( plugin.opts.menuItem &&
		    (plugin.opts.menu === "analysis") ){
		    pinst = tdisp.pluginInstances[pname];
		    if( !pinst || pinst.winHandle ){
			if( plugin.xclass !== lastxclass ){
			    if( n > 0 ){
				items[`sep${n++}`] = "------";
			    }
			    items[`sep${n++}`] =
				{name: `${plugin.xclass} Plugins:`};
			    items[`sep${n-1}`].disabled = true;
			}
			lastxclass = plugin.xclass;
			items[pname] = {
			    name: plugin.opts.menuItem
			};
			if( pinst && (pinst.status === "active") ){
			    items[pname].icon = JS9.globalOpts.menuSelected;
			}
			n++;
		    }
		}
	    }
	    // no server side analysis for all-in-one configuration
	    if( !JS9.allinone ){
		if( n > 0 ){
		    items[`sep${n++}`] = "------";
		}
	        items.localtitle = {
		    name: "Client-side Analysis:",
		    disabled: true
	        };
		items.grid = xname("Coordinate Grid");
		if( !im || !im.raw.wcs || im.raw.wcs <=0 ){
		    items.grid.disabled = true;
		} else {
		    if( im.displayCoordGrid() ){ items.grid.icon = JS9.globalOpts.menuSelected; }
		}
		items.regcnts = xname("Counts in Regions");
		items.radprof = xname("Radial Profile");
		if( !JS9.globalOpts.internalRegcnts ||
		    !im || !im.raw || !im.raw.hdu || !im.raw.hdu.vfile ){
		    items.regcnts.disabled = true;
		    items.radprof.disabled = true;
		}
		if( im && im.raw.header.NAXIS === 3 ){
		    items.cnts3d = xname("3D Counts in Regions");
		    items.plot3d = xname("3D Plot using Regions");
		    if( !JS9.globalOpts.internalRegcnts ||
			!im || !im.raw || !im.raw.hdu || !im.raw.hdu.vfile ){
			items.cnts3d.disabled = true;
			items.plot3d.disabled = true;
		    }
		}
		items.sigma = {
		    events: {keyup: keyAnalysis},
		    name: "Blur, equivalent sigma:",
		    type: "text"
		};
		items[`sep${n++}`] = "------";
	        items.remotetitle = {
		    name: "Server-side Analysis:",
		    disabled: true
	        };
		if( im && im.analysisPackages ){
		    apackages = im.analysisPackages;
		    // m = 0;
		    for(j=0; j<apackages.length; j++){
			atasks = apackages[j];
			for(i=0; i<atasks.length; i++){
			    if( !im.validateAnalysis(atasks[i]) ){
				continue;
			    }
			    // separator
			    if( atasks[i].rtype &&
				atasks[i].rtype.match(/^---/) ){
				items[`sep${n++}`] = "------";
				items[atasks[i].name] = {
				    name: `${atasks[i].title}:`,
				    disabled: true
				};
				continue;
			    }
			    s = atasks[i].title;
			    if( atasks[i].purl ){
				s += " ...";
			    }
			    items[atasks[i].name] = {
				name: s
			    };
			    ntask++;
			    // m++;
			}
		    }
		}
		if( !ntask ){
		    items.notasks = {
			name: "[none]",
			disabled: true,
			events: {keyup() {return;}}
		    };
		    if( JS9.globalOpts.loadProxy &&
			im && im.raw && im.raw.hdu && im.raw.hdu.vfile ){
			items.upload = {
			    name: "upload FITS to make tasks available"
			};
			if( !JS9.helper.connected ||
			    (JS9.helper.type !== "nodejs" &&
			     JS9.helper.type !== "socket.io") ){
			    items.upload.disabled = true;
			}
		    }
		}
		items[`sep${n++}`] = "------";
		items.sconfig = {
		    name: "server-side params ...",
		    items: {
		    }
		};
		items.sconfig.items.dpath = xname("set data analysis path ...");
		if( JS9.globalOpts.dataPathModify === false ){
		    items.sconfig.items.dpath.disabled = true;
		}
		items.sconfig.items.fpath = xname("set this image file's path ...");
		if( !im ||
		    (document.domain && document.domain !== "localhost") ){
		    items.sconfig.items.fpath.disabled = true;
		}
	    }
	    return {
                callback: (key) => {
		    JS9.Menubar.getDisplays.call(this).forEach((val) => {
			let a, s, did, ii, tplugin;
			const udisp = val;
			const uim = udisp.image;
			// make sure display is still valid
			if( $.inArray(udisp, JS9.displays) < 0 ){
			    return;
			}
			// first look for a plugin -- no image rquired
			for(ii=0; ii<JS9.plugins.length; ii++){
			    tplugin = JS9.plugins[ii];
			    if( tplugin.name === key ){
				udisp.displayPlugin(tplugin);
				return;
			    }
			}
			// the rest need an image loaded
			if( uim ){
			    switch(key){
			    case "regcnts":
				JS9.CountsInRegions("$sregions", "$bregions",
						    {lightwin: true},
						    {display: udisp.id});
				break;
			    case "radprof":
				JS9.RadialProfile("$sregions", "$bregions",
						  {display: udisp.id});
				break;
			    case "cnts3d":
				s = JS9.globalOpts.plot3d.cube;
				JS9.CountsInRegions("$sregions", "$bregions",
						    {lightwin: true,
						    cmdswitches: `-c ${s}`},
						    {display: udisp.id});
				break;
			    case "plot3d":
				JS9.Plot3D("$sregions", "$bregions", null,
					   {display: udisp.id});
				break;
			    case "dpath":
				// call this once window is loaded
			        $(JS9.lightOpts[JS9.LIGHTWIN].topid)
				    .arrive("#dataPathForm",
					    {onceOnly: true}, () => {
						$('#dataPath').val(JS9.globalOpts.dataPath);
					    });
				did = uim.displayAnalysis("textline",
					  JS9.InstallDir(JS9.analOpts.dpathURL),
					  {title: "Data path for analysis"});
				// save display id
				$(did).data("dispid", udisp.id);
				$(did).data("imid", uim.id);
				break;
			    case "fpath":
				// call this once window is loaded
			        $(JS9.lightOpts[JS9.LIGHTWIN].topid)
				    .arrive("#filePathForm",
					    {onceOnly: true}, () => {
						$('#filePath').val(uim.file);
					    });
				did = uim.displayAnalysis("textline",
					  JS9.InstallDir(JS9.analOpts.fpathURL),
					  {title: "File path for this image"});
				// save display id
				$(did).data("dispid", udisp.id);
				$(did).data("imid", uim.id);
				break;
			    case "grid":
				uim.displayCoordGrid(!uim.displayCoordGrid());
				break;
			    case "upload":
				uim.uploadFITSFile();
				break;
			    default:
				// look for analysis routine
				a = uim.lookupAnalysis(key);
				if( a ){
				    // load param url to run analysis task
				    // param url is relative to js9 install dir
				    if( a.purl ){
					did = uim.displayAnalysis("params",
								  JS9.InstallDir(a.purl),
								  {title: `${a.title}: ${uim.fitsFile}`,
								   winformat: a.pwin});
					// save info for running the task
					$(did).data("dispid", udisp.id)
				            .data("aname", a.name);
				    } else {
					// else run task directly
					uim.runAnalysis(a.name);
				    }
				}
				return;
			    }
			}
		    });
		},
		events: {
		    show:(opt) => {
			const udisp = this.display;
			const uim = udisp.image;
			const obj = {};
			if( uim  ){
			    obj.sigma = JS9.floatToString(uim.params.sigma);
			}
			$.contextMenu.setInputValues(opt, obj);
			JS9.jupyterFocus(".context-menu-item");
		    },
		    hide: (opt) => {
			let obj;
			const udisp = this.display;
			const uim = udisp.image;
			if( uim ){
			    // if a key was pressed, do the edit
			    if( udisp.tmp.editingMenu ){
				obj = $.contextMenu.getInputValues(opt);
				editAnalysis(uim, obj);
			    }
			}
		    }
		},
		items: items
	    };
	}
    });
    // Help menu: make button open the contextMenu
    $(`#helpMenu${this.id}`).on("mousedown", (evt) => {
        evt.preventDefault();
        $(`#helpMenu${this.id}`).contextMenu();
    });
    // define contextMenu actions
    $.contextMenu({
        selector: `#helpMenu${this.id}`,
	zIndex: JS9.MENUZINDEX,
	events: { hide: onhide },
	position: mypos,
        build: () => {
	    let t, key, val;
	    let n = 1;
	    let last = "";
	    const items = {};
	    items.js9help = {
		name: "General help ...", 
		items: {
		    helptitle: {
			name: "General help:",
			disabled: true
		    }
		}
	    };
	    // first, internal js9 pages
	    for( key in JS9.helpOpts ){
		if( JS9.helpOpts.hasOwnProperty(key) ){
		    val = JS9.helpOpts[key];
		    if( val.heading === "JS9Help" ){
			last = val.type;
			items.js9help.items[key] = {
			    name: val.title
			};
		    }
		}
	    }
	    items[`sep${n++}`] = "------";
	    items.pluginhelp = {
		name: "JS9 plugins ...", 
		items: {
		    helptitle: {
			name: "JS9 plugins:",
			disabled: true
		    }
		}
	    };
	    // second, the JS9 core plugins
	    for( key in JS9.helpOpts ){
		if( JS9.helpOpts.hasOwnProperty(key) ){
		    val = JS9.helpOpts[key];
		    if( val.heading === "JS9" ){
			last = val.type;
			items.pluginhelp.items[key] = {
			    name: val.title.replace(/ \.\.\./, "")
			};
		    }
		}
	    }
	    // last, the others
	    for( key in JS9.helpOpts ){
		if( JS9.helpOpts.hasOwnProperty(key) ){
		    val = JS9.helpOpts[key];
		    if( val.heading === "JS9Help" || 
			val.heading === "JS9" ){
			continue;
		    }
		    if( (last !== "") && (val.type !== last) ){
			items[`sep${n++}`] = "------";
			if( val.heading ){
			    t = `${val.heading  } plugins`;
			    items[`sep${n++}`] = {
				name: `${t} ...`,
				items: {
				    title: {
					name: `${t}:`,
					disabled: true
				    }
				}
			    };
			}
		    }
		    last = val.type;
		    items[`sep${n-1}`].items[key] = {name: val.title};
		}
	    }
	    items[`sep${n++}`] = "------";
	    items.about = xname("about JS9");
	    return {
		callback: (key) => {
		    switch(key){
		    case "about":
			alert(`JS9 ${JS9.VERSION}: astronomical image display everywhere\nEric Mandel, Alexey Vikhlinin\ncontact: emandel@cfa.harvard.edu\n${JS9.COPYRIGHT}`);
			break;
		    default:
			JS9.DisplayHelp(key);
			break;
		    }
		},
		items: items
	    };
	}
    });
    // user-defined menus
    addUserMenus();
};

// initialize the menu
JS9.Menubar.init = function(width, height){
    let i, j, m, ss, tt, menu, html;
    this.issuper = this.id.search(JS9.SUPERMENU) >= 0;
    // save object in super array, if necessary
    if( this.issuper ){
	JS9.supermenus.push(this);
    }
    this.style = this.divjq.attr("data-style") ||
	         JS9.globalOpts.menubarStyle   ||
                 "classic";
    this.style = this.style.toLowerCase();
    // set width and height on div
    this.width = this.divjq.attr("data-width");
    if( !this.width  ){
        this.width = width || JS9.Menubar.WIDTH;
    }
    this.divjq.css("width", this.width);
    this.width = parseInt(this.divjq.css("width"), 10);
    this.height = this.divjq.attr("data-height");
    this.buttonClass = this.divjq.attr("data-buttonClass") || "JS9Button" ;
    this.containerClass = "JS9MenubarContainer";
    // special handling of some known button classes
    if( this.buttonClass.match(/-flat/) ){
	this.containerClass += "-flat";
    } else if( this.buttonClass.match(/-border/) ){
	this.containerClass += "-border";
    }
    this.backgroundColor = this.divjq.attr("data-backgroundColor");
    if( !this.height  ){
	this.height = height || JS9.MENUHEIGHT;
    }
    this.divjq.css("height", this.height);
    this.height = parseInt(this.divjq.css("height"), 10);
    // look for usermenu directive, either for this element or globally
    this.usermenus = this.divjq.attr("data-usermenus") === "true" ||
	JS9.globalOpts.userMenus;
    // generate html for this menubar
    html = "<span id='JS9Menus_@@ID@@'>";
    for(j=0; j<JS9.globalOpts.menuBar.length; j++){
	menu = JS9.globalOpts.menuBar[j];
	for(i=0; i<JS9.Menubar.buttonOptsArr.length; i++){
	    ss = JS9.Menubar.buttonOptsArr[i].name;
	    if( menu === ss ){
		tt = JS9.Menubar.buttonOptsArr[i].label;
		// no help available for all-in-one configuration
		if( JS9.allinone && (ss === "help") ){
		    break;
		}
		if( ss[0] === "#" ){
		    if( this.syle === "classic" ){
			ss = ss.slice(1);
			if( ss[1] !== "#" ){
			    html += `<button type='button' id='${ss}Menu@@ID@@' class='${this.buttonClass}' disabled='disabled'>${tt} </button>`;
			}
		    }
		} else {
		    if( this.style === "classic" ){
			html += `<button type='button' id='${ss}Menu@@ID@@' class='${this.buttonClass}'>${tt}</button>`;
		    } else {
			switch(ss){
			case "file":
			case "edit":
			    html += `<button type='button' id='${ss}Menu@@ID@@' class='${this.buttonClass}'>${tt}</button>`;
			    break;
			case "help":
			    html += `<span style='float:right'><button type='button' id='${ss}Menu@@ID@@' class='${this.buttonClass}'>${tt}</button></span>`;
			    break;
			default:
			    if( !this.macmenus ){
				html += `${"<span style='position:relative;'><button type='button' id='"+"viewMacMenu@@ID@@' class='"}${this.buttonClass}'>`+`View`+`</button>`;
				this.macmenus = [];
			    }
			    if( tt === "View" ){
				tt = "Plugins";
			    }
			    html += `<button type='button' id='${ss}Menu@@ID@@' class='${this.buttonClass}' style='position:absolute;top:0px;left:0px;visibility:hidden;zindex:-1'>`+``+`</button>`;
			    this.macmenus.push({name: ss, title: tt});
			    break;
			}
		    }
		}
		break;
	    }
	}
    }
    // close mac-style span on View menu
    if( this.macmenus ){
	html += "</span>";
    }
    // user-defined menus
    if( this.usermenus && JS9.globalOpts.userMenuBar ){
	html += JS9.globalOpts.userMenuDivider || "";
	for(j=0; j<JS9.globalOpts.userMenuBar.length; j++){
	    menu = JS9.globalOpts.userMenuBar[j];
	    if( !menu || !menu.name || !menu.title || !menu.options  ){
		continue;
	    }
	    if( menu.imageTitle ){
		m = `<div class='JS9MenubarUserImage'><img src='${menu.imageTitle  }' name='${menu.name}' alt='${menu.title}' class='JS9MenubarUserImage JS9MenubarUserImageTitle' >` + `</div>`;
	    } else {
		m = menu.title;
	    }
	    html += `<button type='button' id='${menu.name}UserMenu@@ID@@' class='${this.buttonClass}'>${m}</button>`;
	}
    }
    // hidden menus
    html += "<button type='button' id='hiddenRegionMenu@@ID@@'class='JS9Button' style='display:none'>R</button>";
    html += "<button type='button' id='hiddenAnchorMenu@@ID@@'class='JS9Button' style='display:none'>R</button>";
    html += "</span>";
    // link back the menubar in the display
    this.display.menubar = this;
    // define menubar
    this.html = html.replace(/@@ID@@/g,this.id);
    // add container to the high-level div
    this.menuConjq = $("<div>")
	.addClass(this.containerClass)
	.attr("width", this.width)
	.attr("height", this.height)
	.html(this.html)
	.appendTo(this.divjq);
    // menubar background color
    if( this.backgroundColor ){
	this.menuConjq.css("background", this.backgroundColor);
    }
    // create the standard menus
    JS9.Menubar.createMenus.call(this);
};

JS9.RegisterPlugin("JS9", "Menubar", JS9.Menubar.init,
		   {onupdateprefs: JS9.Menubar.reset,
		    dynamicSelect: true,
		    winDims: [JS9.Menubar.WIDTH, JS9.Menubar.HEIGHT]});

/*
 * Panner plugin
 */

/*global $, JS9 */

"use strict";

// create our namespace, and specify some meta-information and params
JS9.Panner = {};
JS9.Panner.CLASS = "JS9";
JS9.Panner.NAME = "Panner";
JS9.Panner.WIDTH =  320;	// width of light window
JS9.Panner.HEIGHT = 320;	// height of light window
JS9.Panner.SWIDTH =  250;	// width of div
JS9.Panner.SHEIGHT = 250;	// height of div
JS9.Panner.VSIZE = 30;
JS9.Panner.NORTH = {
    color: "#00FF00", text: "N", fontSize: 12, fontFamily: "Helvetica",
    strokeWidth: 1, strokeDashArray: [2,1]
};
JS9.Panner.EAST  = {
    color: "#FFFF00",  text: "E", fontSize: 12, fontFamily: "Helvetica",
    strokeWidth: 1, strokeDashArray: [2,1]
};

// defaults for panner
JS9.Panner.opts = {
    // override fabric defaults
    hasControls: false,
    hasRotatingPoint: false,
    hasBorders: false,
    // initial panner zoom
    zoom: 4,
    // canvas options
    canvas: {
	selection: true
    },
    // panner box colors
    tagcolors: {
	defcolor: "#00FF00"
    }
};

// call a JS9 routine from a button in the panner plugin toolbar
// the plugin instantiation saves the display id in the toolbar div
JS9.Panner.bcall = function(...args){
    let dispid, pinst, im;
    let [which, cmd, arg1] = args;
    // the button plugintoolbar div has data containing the id of the display
    dispid = $(which).closest("div[class^=JS9PluginToolbar]").data("displayid");
    if( dispid ){
	im = JS9.getImage(JS9.getDynamicDisplayOr(dispid));
	pinst = im.display.pluginInstances.JS9Panner;
    } else {
	JS9.error(`can't find display for cmd: ${cmd}`);
    }
    if( !im ){
	JS9.error(`can't find image for cmd: ${cmd}`);
    }
    switch(cmd){
    case "zoomPanner":
	if( args.length < 3 ){
	    JS9.error(`missing arg(s) for cmd: ${cmd}`);
	}
	try{
	    JS9.Panner.zoom.call(pinst, im, arg1);
	} catch(e){
	    JS9.error("error calling zoomPanner()", e);
	}
	break;
    case "panImage":
	try{
	    im.setPan();
	} catch(e){
	    JS9.error("error calling setPan()", e);
	}
	break;
    default:
        break;
    }
};

// html used by the panner plugin
JS9.Panner.HTML =
"<span>" +
"<button type='button' class='JS9Button' onClick='JS9.Panner.bcall(this, \"zoomPanner\", \"x2\"); return false'>x2</button>" +
"<button type='button' class='JS9Button' onClick='JS9.Panner.bcall(this, \"zoomPanner\", \"/2\"); return false'>/2</button>" +
"<button type='button' class='JS9Button' onClick='JS9.Panner.bcall(this, \"zoomPanner\", \"1\"); return false'>z1</button>" +
"<button type='button' class='JS9Button' onClick='JS9.Panner.bcall(this, \"panImage\"); return false'>center</button>" +
"</span>";

// JS9 Panner constructor
JS9.Panner.init = function(width, height){
    // set width and height on div
    this.width = this.divjq.attr("data-width");
    if( !this.width  ){
	this.width  = width  || JS9.Panner.WIDTH;
    }
    this.divjq.css("width", this.width);
    this.width = parseInt(this.divjq.css("width"), 10);
    this.height = this.divjq.attr("data-height");
    if( !this.height ){
	this.height = height || JS9.Panner.HEIGHT;
    }
    this.divjq.css("height", this.height);
    this.height = parseInt(this.divjq.css("height"), 10);
    // create DOM canvas element
    this.canvas = document.createElement("canvas");
    // jquery version for event handling and DOM manipulation
    this.canvasjq = $(this.canvas);
    // set class
    this.canvasjq.addClass("JS9Panner");
    // required so graphical layers will be on top:
    this.canvasjq.css("z-index", JS9.ZINDEX);
    // how do we allow users to set the size of the canvas??
    // it doesn't go into the CSS and we have no canvas on the Web page ...
    this.canvasjq.attr("width", this.width);
    this.canvasjq.attr("height", this.height);
    // drawing context
    this.context = this.canvas.getContext("2d");
    // turn off anti-aliasing
    if( !JS9.ANTIALIAS ){
	this.context.imageSmoothingEnabled = false;
	this.context.webkitImageSmoothingEnabled = false;
	this.context.msImageSmoothingEnabled = false;
    }
    // add container with canvas to the high-level div
    this.containerjq = $("<div>")
	.addClass("JS9Container")
	.append(this.canvasjq)
	.appendTo(this.divjq);
    // display current image in panner
    if( this.display.image ){
	JS9.Panner.disp.call(this, this.display.image);
    }
};

// create panner (RGB) image from scaled colorCells
// sort of from: tksao1.0/frame/truecolor.c, but not really
// part of panner plugin
JS9.Panner.create = function(im){
    let panDisp, panner, sect, img;
    let x0, y0, xblock, yblock;
    let i, j, ii, jj, kk;
    let ioff, ooff;
    let width, height;
    let pos, ix, iy, temp;
    let dlayer;
    // sanity checks
    if( !im || !im.raw                        ||
	(!im.rgbFile && !im.colorData)        ||
	!im.display.pluginInstances.JS9Panner ){
	return null;
    }
    // add panner object to image, if necessary
    if( !im.panner ){
	im.panner = {};
    }
    // init zoom factor, if necessary
    if( !im.panner.zoom ){
	im.panner.zoom = 1;
    }
    // convenience variables
    panDisp = im.display.pluginInstances.JS9Panner;
    panner = im.panner;
    sect = im.rgb.sect;
    // size image
    width = Math.min(im.raw.width, panDisp.width);
    height = Math.min(im.raw.height, panDisp.height);
    // block RGB image to fit into panner window
    panner.xblock = im.raw.width / width;
    panner.yblock = im.raw.height / height;
    if( panner.xblock > panner.yblock ){
	height = Math.floor(height / panner.xblock * panner.yblock + 0.5);
	panner.yblock = panner.xblock;
    } else if( panner.yblock > panner.xblock ){
	width = Math.floor(width / panner.yblock * panner.xblock + 0.5);
	panner.xblock = panner.yblock;
    }
    // create an RGB image the same size as the raw data
    img = im.display.context.createImageData(width,height);
    // calculate block factors and starting points based on zoom and block
    if( panner.zoom === 1 ){
	xblock = panner.xblock;
	yblock = panner.yblock;
	x0 = 0;
	y0 = 0;
    } else {
	xblock = panner.xblock / panner.zoom;
	yblock = panner.yblock / panner.zoom;
	// x0, y0 is the corner of the section of the image we can display in
	// the panner (we can't display the whole image if we are zoomed).
	x0 = Math.max(0, ((sect.x0 + sect.x1) - (width  * xblock)) / 2);
	y0 = Math.max(0, ((sect.y0 + sect.y1) - (height * yblock)) / 2);
    }
    // save lower limits for display
    panner.x0 = x0;
    panner.y0 = y0;
    // save as panner image
    panner.img = img;
    panner.ix = 0;
    panner.iy = 0;
    if( im.rgbFile ){
	// for a static RGB file, access the RGB data directly
	for(j=0; j<height; j++){
	    jj = Math.floor(y0 + (j * yblock)) * im.offscreen.img.width;
	    kk = j * width;
	    for(i=0; i<width; i++){
		ii = Math.floor(x0 + (i * xblock));
		ioff = (ii + jj) * 4;
		ooff = (kk + i) * 4;
		img.data[ooff]   = im.offscreen.img.data[ioff];
		img.data[ooff+1] = im.offscreen.img.data[ioff+1];
		img.data[ooff+2] = im.offscreen.img.data[ioff+2];
		img.data[ooff+3] = 255;
	    }
	}
	return im;
    }
    // index into scaled data using previously calc'ed data value to get RGB
    for(j=0; j<height; j++){
	jj = Math.floor(y0 + ((height-j-1) * yblock)) * im.raw.width;
	kk = j * width;
	for(i=0; i<width; i++){
	    ii = Math.floor(x0 + (i * xblock));
	    ioff = im.colorData[ii + jj];
	    ooff = (kk + i) * 4;
	    if( im.psColors[ioff] ){
		img.data[ooff]   = im.psColors[ioff][0];
		img.data[ooff+1] = im.psColors[ioff][1];
		img.data[ooff+2] = im.psColors[ioff][2];
		img.data[ooff+3] = 255;
	    }
	}
    }
    // add panner shape layer to the display (but only once)
    if( this.display.layers.panner ){
	// if this is a dynamic plugin panner (where js9id is "*"),
	// we might have to fiddle the panner shape layer objs, i.e.
	// in the display (general obj) and the image (instance obj).
	// this is because dynamics use one shape layer for all instances,
	// and (obviously) it starts out in one of the displays.
	if( this.display.image && this.isDynamic ){
	    if( this.display.layers.panner && !im.display.layers.panner ){
		im.display.layers.panner = this.display.layers.panner;
	    }
	    if( this.display.image.layers.panner && !im.layers.panner ){
		im.layers.panner = this.display.image.layers.panner;
	    }
	}
	return im;
    }
    dlayer = this.display.newShapeLayer("panner", JS9.Panner.opts, this.divjq);
    // add a callback to pan when the panning rectangle is moved
    dlayer.canvas.on("object:modified", (opts) => {
	let im, disp, panDisp;
	disp = JS9.getDynamicDisplayOr(this.display);
	if( disp && disp.image ){
	    im = disp.image;
	} else {
	    im = this.display.image;
	}
	if( im ){
	    panDisp = im.display.pluginInstances.JS9Panner;
	    pos = opts.target.getCenterPoint();
	    // rotations will change the pan direction
	    if( im.params.rot90 === 90 ){
		temp = pos.x;
		pos.x = panDisp.height - pos.y;
		pos.y = temp;
	    } else if( im.params.rot90 === 180 ){
		pos.x = panDisp.width - pos.x;
		pos.y = panDisp.height - pos.y;
	    } else if( im.params.rot90 === -90 ){
		temp = panDisp.width - pos.x;
		pos.x = pos.y;
		pos.y = temp;
	    }
	    // flips will change the pan position
	    if( im.params.flip === "x" ){
		pos.x = panDisp.width - pos.x;
	    } else if( im.params.flip === "y" ){
		pos.y = panDisp.height - pos.y;
	    } else if( im.params.flip === "xy" ){
		pos.x = panDisp.width - pos.x;
		pos.y = panDisp.height - pos.y;
	    }
	    // rotations will change the pan position
	    if( im.params.rotate ){
		pos = JS9.rotatePoint(pos,
				      im.params.rotate,
				      {x:panDisp.width/2, y:panDisp.height/2});
	    }
	    ix = ((pos.x - im.panner.ix) *
		  im.panner.xblock / im.panner.zoom) + im.panner.x0;
	    iy = ((dlayer.canvas.height - (pos.y + im.panner.iy)) *
		  im.panner.yblock / im.panner.zoom) + im.panner.y0;
	    // pan the image
	    try{
		// avoid triggering a re-pan
		panDisp.status = "inactive";
		// pan image
		im.setPan(ix, iy);
	    }
	    catch(e){JS9.log("couldn't pan image", e);}
	    finally{panDisp.status = "active";}
	}
    });
    return im;
};

// display the image on the panner canvas
JS9.Panner.disp = function(im){
    let panDisp, panner, sect, tblkx, tblky;
    let obj, nx, ny, nwidth, nheight, cenx, ceny, pos;
    let npos1, npos2, nobj, nobjt;
    let epos1, epos2, eobj, eobjt;
    let angle, xflip, yflip, wcsinfo, w2, h2, m, ctx, temp;
    const FUDGE = 1;
    const img2canvas = (im, img) => {
	let context, canvas;
	let panner = im.display.pluginInstances.JS9Panner;
	if( !panner.offscreenRGB ){
	    canvas = document.createElement("canvas");
	    context = canvas.getContext("2d");
	    // turn off anti-aliasing
	    if( !JS9.ANTIALIAS ){
		context.imageSmoothingEnabled = false;
	    }
	    panner.offscreenRGB = {canvas, context};
	}
	panner.offscreenRGB.canvas.width= img.width;
	panner.offscreenRGB.canvas.height = img.height;
	panner.offscreenRGB.context.putImageData(img, 0, 0);
	return panner.offscreenRGB.canvas;
    };
    // sanity check
    // only display if we have an image and panner present
    if( !im                                                       ||
	!im.display.pluginInstances.JS9Panner                     ||
	im.display.pluginInstances.JS9Panner.status !== "active"  ){
	return;
    }
    // always remake make panner image (might be zooming, for example)
    if( !JS9.Panner.create.call(this, im) ){
	return;
    }
    // convenience variables
    wcsinfo  = im.raw.wcsinfo || {cdelt1: 1, cdelt2: 1, crot: 0};
    panner = im.panner;
    panDisp = im.display.pluginInstances.JS9Panner;
    sect = im.rgb.sect;
    cenx = panDisp.width/2;
    ceny = panDisp.height/2;
    ctx = panDisp.context;
    // we're done if there is no panner image
    if( !panner.img ){
	return;
    }
    // offsets into display
    if( panner.img.width < panDisp.canvas.width ){
	panner.ix = Math.floor((panDisp.canvas.width - panner.img.width)/2);
    }
    if( panner.img.height < panDisp.canvas.height ){
        panner.iy = Math.floor((panDisp.canvas.height - panner.img.height)/2);
    }
    // clear first
    JS9.Panner.clear.call(this, im);
    // save context
    ctx.save();
    // do we need to apply the canvas transform?
    if( im.params.transform ){
	// this is the transform matrix
	m = im.params.transform;
	// translate origin to center of display
	w2 = panner.img.width / 2;
	h2 = panner.img.height / 2;
	ctx.translate(w2, h2);
	// set new transform
	ctx.transform(m[0][0], m[0][1], m[1][0], m[1][1], m[2][0], m[2][1]);
	// translate back to 0, 0
	ctx.translate(-w2, -h2);
    }
    // draw the image into the context
    // ctx.putImageData(panner.img, panner.ix, panner.iy);
    ctx.drawImage(img2canvas(im, panner.img), panner.ix, panner.iy);
    // restore original context
    ctx.restore();
    // display panner rectangle
    // convenience variables
    tblkx = panner.zoom / panner.xblock;
    tblky = panner.zoom / panner.yblock;
    // size of rectangle
    // nwidth = sect.width * tblkx / sect.zoom * bin;
    // nheight = sect.height * tblky / sect.zoom * bin;
    nwidth = im.display.width * tblkx / sect.zoom;
    nheight = im.display.height * tblky / sect.zoom;
    // position of the rectangle
    nx = (sect.x0 - panner.x0) * tblkx + panner.ix;
    ny = (panDisp.height - 1) - ((sect.y1 - panner.y0) * tblky + panner.iy);
    // adjust if section is entirely inside the display
    if( im.display.width > sect.width ){
	nx -= (im.display.width - sect.width) * tblkx / sect.zoom / 2;
    }
    if( im.display.height > sect.height ){
	ny -= (im.display.height - sect.height) * tblky / sect.zoom / 2;
    }
    // why is the fudge needed???
    nx  += FUDGE;
    ny  += FUDGE;
    // convert to center pos
    nx += nwidth / 2;
    ny += nheight / 2;
    // nice integer values
    nx = Math.floor(nx);
    ny = Math.floor(ny);
    nwidth = Math.floor(nwidth);
    nheight = Math.floor(nheight);
    // hide rectangle if it covers the full panner
    if( nwidth >= panDisp.width && nheight >= panDisp.height ){
	nx = panDisp.width / 2;
	ny = panDisp.height / 2;
	nwidth = panDisp.width + 10;
	nheight = panDisp.height + 10;
    }
    // rotations will change the pan direction
    if( im.params.rot90 === 90 ){
	temp = nx;
	nx = panDisp.height - ny;
	ny = temp;
    } else if( im.params.rot90 === 180 ){
	nx = panDisp.width - nx;
	ny = panDisp.height - ny;
    } else if( im.params.rot90 === -90 ){
	temp = panDisp.width - nx;
	nx = ny;
	ny = temp;
    }
    // flips will change the pan position
    if( im.params.flip === "x" ){
	nx = panDisp.width - nx;
    } else if( im.params.flip === "y" ){
	ny = panDisp.height - ny;
    } else if( im.params.flip === "xy" ){
	nx = panDisp.width - nx;
	ny = panDisp.height - ny;
    }
    // rotations will change the pan position
    if( im.params.rotate ){
	pos = JS9.rotatePoint({x: nx, y: ny},
			      - im.params.rotate,
			      {x:panDisp.width/2, y:panDisp.height/2});
	nx = pos.x;
	ny = pos.y;
    }
    // object containing position and size parameters:
    obj = {left: nx, top: ny, width: nwidth, height: nheight};
    // create the box
    if( !im.panner.boxid ){
	im.panner.boxid = im.addShapes("panner", "box", obj);
    } else {
	im.changeShapes("panner", im.panner.boxid, obj);
    }
    // clear direction vectors
    if( im.panner.northid ){
	im.removeShapes("panner", im.panner.northid);
	im.removeShapes("panner", im.panner.northidt);
    }
    if( im.panner.eastid ){
	im.removeShapes("panner", im.panner.eastid);
	im.removeShapes("panner", im.panner.eastidt);
    }
    // done if we are not displaying the directions vectors or no wcs
    if( !JS9.globalOpts.pannerDirections || !im.raw.wcs || im.raw.wcs <= 0 ){
	return im;
    }
    // get north is up info
    nobj = im.getNorthIsUp();
    // angle
    angle = nobj.angle;
    // take existing rotation into account
    if( JS9.notNull(im.params.rot90) ){
	angle -= im.params.rot90;
    }
    // take existing rotation into account
    if( JS9.notNull(im.params.rotate) ){
	angle -= im.params.rotate;
    }
    // flip
    xflip = nobj.xflip ? -1 : 1;
    yflip = nobj.yflip ? -1 : 1;
    switch(im.params.flip){
    case "x":
	xflip *= -1;
	break;
    case "y":
	yflip *= -1;
	break;
    case "xy":
	xflip *= -1;
	yflip *= -1;
	break;
    default:
	break;
    }
    // this is the line pointing north
    npos1 = {x: cenx, y: ceny};
    if( wcsinfo.cdelt2 >= 0 ){
	npos2 = {x: cenx, y: ceny - JS9.Panner.VSIZE * yflip};
    } else {
	npos2 = {x: cenx, y: ceny + JS9.Panner.VSIZE * yflip};
    }
    npos2 = JS9.rotatePoint(npos2, angle, npos1);
    nobj = {color: JS9.Panner.NORTH.color,
	    strokeWidth: JS9.Panner.NORTH.strokeWidth,
	    strokeDashArray: JS9.Panner.NORTH.strokeDashArray,
	    points: [npos1, npos2],
	    changeable: false,
	    // hack around fabric.js problems
	    originX: "left", originY: "top", noLeftTop: true};
    im.panner.northid = im.addShapes("panner", "line", nobj);
    // this is the text 'N'
    nobjt = {color: JS9.Panner.NORTH.color,
	     text: JS9.Panner.NORTH.text,
	     fontSize: JS9.Panner.NORTH.fontSize,
	     fontFamily: JS9.Panner.NORTH.fontFamily,
	     changeable: false,
	     left: npos2.x, top: npos2.y};
    im.panner.northidt = im.addShapes("panner", "text", nobjt);
    // this is the line pointing east
    epos1 = {x: cenx, y: ceny};
    if( wcsinfo.cdelt1 < 0 ){
	epos2 = {x: cenx - JS9.Panner.VSIZE * xflip, y: ceny};
    } else {
	epos2 = {x: cenx + JS9.Panner.VSIZE * xflip, y: ceny};
    }
    epos2 = JS9.rotatePoint(epos2, angle, epos1);
    eobj = {color: JS9.Panner.EAST.color,
	    strokeWidth: JS9.Panner.EAST.strokeWidth,
	    strokeDashArray: JS9.Panner.EAST.strokeDashArray,
	    changeable: false,
	    points: [epos1, epos2],
	    // hack around fabric.js problems
	    originX: "left", originY: "top", noLeftTop: true};
    im.panner.eastid = im.addShapes("panner", "line", eobj);
    // this is the text 'E'
    eobjt = {color: JS9.Panner.EAST.color,
	     text: JS9.Panner.EAST.text,
	     fontSize: JS9.Panner.EAST.fontSize,
	     fontFamily: JS9.Panner.EAST.fontFamily,
	     changeable: false,
	     left: epos2.x, top: epos2.y};
    im.panner.eastidt = im.addShapes("panner", "text", eobjt);
    return im;
};

// zoom the rectangle inside the panner (RGB) image
JS9.Panner.zoom = function(im, zval){
    let panner, ozoom, nzoom;
    // sanity check
    if( !im || !im.panner || !im.display.pluginInstances.JS9Panner ){
	return;
    }
    panner = im.panner;
    // get old zoom
    ozoom = panner.zoom;
    // determine new zoom
    switch(zval.charAt(0)){
    case "*":
    case "x":
    case "X":
	nzoom = Math.min(Math.min(this.width, this.height),
			 ozoom * parseFloat(zval.slice(1)));
	break;
    case "/":
	nzoom = Math.max(1, ozoom / parseFloat(zval.slice(1)));
	break;
    default:
	nzoom = parseFloat(zval);
	break;
    }
    // sanity check
    if( !nzoom || (nzoom < 1) ){
	nzoom = 1;
    }
    panner.zoom = nzoom;
    // redisplay the panner
    JS9.Panner.disp.call(this, im);
    return im;
};

// dynamic selection change
JS9.Panner.dysel = function(im){
    let panner;
    if( im ){
	panner = im.display.pluginInstances.JS9Panner;
	if( panner && panner.isDynamic ){
	    JS9.Panner.disp.call(this, im);
	}
    }
};

// clear the panner
JS9.Panner.clear = function(im){
    let panner, display;
    if( im ){
	display = JS9.getDynamicDisplayOr(this.display);
	panner = im.display.pluginInstances.JS9Panner;
	if( panner && (im.display === display) ){
	    panner.context.clear();
	    im.removeShapes("panner", "all");
	    im.panner.boxid = null;
	}
	return im;
    }
};

// add this plugin into JS9
JS9.RegisterPlugin(JS9.Panner.CLASS, JS9.Panner.NAME, JS9.Panner.init,
		   {menuItem: "Panner",
		    help: "help/panner.html",
		    dynamicSelect: true,
		    toolbarSeparate: false,
		    toolbarHTML: JS9.Panner.HTML,
		    ondynamicselect: JS9.Panner.dysel,
		    onplugindisplay: JS9.Panner.disp,
		    onimagedisplay: JS9.Panner.disp,
		    onimageclose: JS9.Panner.clear,
		    onimageclear: JS9.Panner.clear,
		    onupdateprefs: JS9.Panner.disp,
		    onsetwcssys: JS9.Panner.disp,
		    winTitle: "Panner",
		    winDims: [JS9.Panner.WIDTH,  JS9.Panner.HEIGHT],
		    divArgs: [JS9.Panner.SWIDTH, JS9.Panner.SHEIGHT]});
/*
 * pan/zoom controls plugin (October 30, 2019)
 */

/*global $, JS9, sprintf */

"use strict";

// create our namespace, and specify some meta-information and params
JS9.PanZoom = {};
JS9.PanZoom.CLASS = "JS9";      // class of plugins
JS9.PanZoom.NAME = "PanZoom";   // name of this plugin
JS9.PanZoom.WIDTH = 530;        // width of light window
JS9.PanZoom.HEIGHT = 110;       // height of light window
JS9.PanZoom.BASE = JS9.PanZoom.CLASS + JS9.PanZoom.NAME;

JS9.PanZoom.panzoomHTML="<p><div class='JS9PanZoomLinegroup'>$pan&nbsp;&nbsp;$zoom&nbsp;&nbsp;$flip&nbsp;&nbsp;$rot90&nbsp;&nbsp;$rotate</div><p><div class='JS9PanZoomLinegroup'>$panto $pos1 $pos2 $wcssys $wcsunits</div>";

JS9.PanZoom.panHTML = '<select class="JS9Select JS9PanZoomSelect JS9PanZoomCol1" name="pan" onchange="JS9.PanZoom.xsetpan(\'%s\', \'%s\', this)">%s</select>';

JS9.PanZoom.zoomHTML = '<select class="JS9Select JS9PanZoomSelect JS9PanZoomCol2" name="zoom" onchange="JS9.PanZoom.xsetzoom(\'%s\', \'%s\', this)">%s</select>';

JS9.PanZoom.flipHTML = '<select class="JS9Select JS9PanZoomSelect JS9PanZoomCol3" name="flip" onchange="JS9.PanZoom.xsetflip(\'%s\', \'%s\', this)">%s</select>';

JS9.PanZoom.rot90HTML = '<select class="JS9Select JS9PanZoomSelect JS9PanZoomCol4" name="rot90" onchange="JS9.PanZoom.xsetrot90(\'%s\', \'%s\', this)">%s</select>';

JS9.PanZoom.rotateHTML = '<input type="text" class="JS9PanZoomInput JS9PanZoomCol5 js9Input" name="rotate" autocapitalize="off" autocorrect="off" onkeydown="JS9.PanZoom.xsetrot(\'%s\', \'%s\', this, event)" value="%s" placeholder="angle or reset">';

JS9.PanZoom.pantoHTML = '<input type="button" class="JS9Button2 JS9PanZoomButton JS9PanZoomCol1" name="panto" value="Pan to &rarr;" onclick="javascript:JS9.PanZoom.xpanto(\'%s\', \'%s\', this)">';

JS9.PanZoom.pos1HTML = '<input type="text" class="JS9PanZoomInput JS9PanZoomCol2 js9Input" name="pos1" value="%s" autocapitalize="off" autocorrect="off" placeholder="x position">';

JS9.PanZoom.pos2HTML = '<input type="text" class="JS9PanZoomInput JS9PanZoomCol3 js9Input" name="pos2" value="%s" autocapitalize="off" autocorrect="off" placeholder="y position">';

JS9.PanZoom.sysHTML = '<select class="JS9Select JS9PanZoomSelect JS9PanZoomCol4" name="wcssys" onchange="JS9.PanZoom.xsetwcssys(\'%s\', \'%s\', this)">%s</select>';

JS9.PanZoom.unitsHTML = '<select class="JS9Select JS9PanZoomSelect JS9PanZoomCol5" name="wcsunits" onchange="JS9.PanZoom.xsetwcsunits(\'%s\', \'%s\', this)">%s</select>';

// change pan via menu
JS9.PanZoom.xsetpan = function(did, id, target){
    const im = JS9.lookupImage(id, did);
    if( im ){
	switch(target.value){
	case "center":
	    im.setPan();
	    break;
	default:
	    break;
	}
    }
};

// change zoom via menu
JS9.PanZoom.xsetzoom = function(did, id, target){
    let arr, arr2, zval, zoom;
    const im = JS9.lookupImage(id, did);
    if( im ){
	switch(target.value){
	case "in":
	case "out":
	case "to fit":
	    zoom = im.parseZoom(target.value);
	    if( JS9.isNumber(zoom) ){
		im.setZoom(zoom);
	    }
	    break;
	default:
	    // format: "zoom" zoom
	    arr = target.value.split(/\s+/);
	    if( arr.length === 2 ){
		// format zoom or 1/zoom
		arr2 = arr[1].split("/");
		if( arr2.length === 1 ){
		    zval = parseFloat(arr2[0]);
		} else {
		    zval = 1 / parseFloat(arr2[1]);
		}
		im.setZoom(zval);
	    }
	    break;
	}
    }
};

// change flip via menu
JS9.PanZoom.xsetflip = function(did, id, target){
    const im = JS9.lookupImage(id, did);
    if( im ){
	switch(target.value){
	case "x axis":
	    im.setFlip("x");
	    break;
	case "y axis":
	    im.setFlip("y");
	    break;
	case "reset":
	    im.setFlip("reset");
	    break;
	default:
	    break;
	}
    }
};

// change rotation by 90 degrees via menu
JS9.PanZoom.xsetrot90 = function(did, id, target){
    const im = JS9.lookupImage(id, did);
    if( im ){
	switch(target.value){
	case "90 left":
	    im.setRot90(90);
	    break;
	case "90 right":
	    im.setRot90(-90);
	    break;
	case "reset rotate":
	    im.setRot90("reset");
	    im.setRotate("reset");
	    break;
	case "align: north is up":
	    im.setRot90("reset");
	    im.setRotate("northisup");
	    break;
	case "reset flip/rot90/rotate":
	    im.setFlip("reset");
	    im.setRot90("reset");
	    im.setRotate("reset");
	    break;
	default:
	    break;
	}
    }
    return false;
};

// change rotation by degrees via text box
JS9.PanZoom.xsetrot = function(did, id, target, evt){
    let rot, pinst;
    const im = JS9.lookupImage(id, did);
    if( im ){
	if( evt.keyCode !== 13 ){ return; }
	rot = $(target).val().trim();
	if( rot ){
	    if( rot === "reset" ){
		im.setRotate("reset");
		im.setRot90("reset");
		return;
	    }
	    pinst = im.display.pluginInstances.JS9PanZoom;
	    // do this before setting rotation
	    if( pinst ){
		pinst.rot = rot;
	    }
	    im.setRotate(rot);
	    // do this after setting rotation
	    if( pinst ){
		pinst.divjq.find(`input[name="rotate"]`).focus().caretToEnd();
	    }
	}
    }
};

// pan to the position specified in the pos1,pos2 input elements
JS9.PanZoom.xpanto = function(did, id, target){
    let owcssys, arr, p1, p2, s1, s2, wcssys, pel, phys;
    const im = JS9.lookupImage(id, did);
    if( im ){
	pel = $(target).parent();
	wcssys = pel.find("[name='wcssys']").val();
	s1 = pel.find("[name='pos1']").val();
	s2 = pel.find("[name='pos2']").val();
	if( s1 && s2 && wcssys ){
	    owcssys = im.getWCSSys();
	    im.setWCSSys(wcssys);
	    p1 = JS9.saostrtod(s1);
	    if( JS9.isHMS(wcssys) ){
		p1 *= 15.0;
	    }
	    p2 = JS9.saostrtod(s2);
	    switch(wcssys){
	    case "image":
		break;
	    case "physical":
		phys =  im.logicalToImagePos({x: p1, y: p2});
		p1 = phys.x;
		p2 = phys.y;
		break;
	    default:
		if( im.raw.wcs && im.raw.wcs > 0 ){
		    arr = JS9.wcs2pix(im.raw.wcs, p1, p2).trim().split(/\s+/);
		    p1 = parseFloat(arr[0]);
		    p2 = parseFloat(arr[1]);
		}
	    }
	    im.setPan(p1, p2);
	    im.setWCSSys(owcssys);
	}
    }
};

// change the wcs system
JS9.PanZoom.xsetwcssys = function(did, id, target){
    let owcssys, owcsunits, pel, pos1, pos2;
    const nwcssys = target.value;
    const im = JS9.lookupImage(id, did);
    if( im ){
	owcssys = im.getWCSSys();
	owcsunits = im.getWCSUnits();
	im.setWCSSys(nwcssys);
	im.tmp.wcssysPanZoom = nwcssys;
	pos1 = JS9.PanZoom.getPos(im, "x");
	pos2 = JS9.PanZoom.getPos(im, "y");
	pel = $(target).parent();
	pel.find("[name='pos1']").val(pos1);
	pel.find("[name='pos2']").val(pos2);
	if( im.getWCSUnits() !== (im.tmp.wcsunitsPanZoom||owcsunits) ){
	    JS9.PanZoom.xsetwcsunits(did, id, {value: im.getWCSUnits()});
	}
	im.setWCSSys(owcssys);
	im.setWCSUnits(owcsunits);
    }
}

// change the wcs units
JS9.PanZoom.xsetwcsunits = function(did, id, target){
    let owcssys, owcsunits, pel, pos1, pos2;
    const nwcsunits = target.value;
    const im = JS9.lookupImage(id, did);
    if( im ){
	owcsunits = im.getWCSUnits();
	owcssys = im.getWCSSys();
	im.setWCSUnits(nwcsunits);
	im.tmp.wcsunitsPanZoom = nwcsunits;
	pos1 = JS9.PanZoom.getPos(im, "x");
	pos2 = JS9.PanZoom.getPos(im, "y");
	pel = $(target).parent();
	pel.find("[name='pos1']").val(pos1);
	pel.find("[name='pos2']").val(pos2);
	if( im.getWCSSys() !== (im.tmp.wcssysPanZoom||owcssys) ){
	    JS9.PanZoom.xsetwcssys(did, id, {value: im.getWCSSys()});
	}
	im.setWCSSys(owcssys);
	im.setWCSUnits(owcsunits);
    }
}

// get position string based on wcssys
JS9.PanZoom.getPos = function(im, which){
    let s, res, phys, ipos, owcssys, owcsunits, wcssys, wcsunits;
    if( im ){
	ipos = im.getPan();
	owcssys = im.getWCSSys();
	owcsunits = im.getWCSUnits();
	wcssys = im.tmp.wcssysPanZoom || owcssys;
	wcsunits = im.tmp.wcsunitsPanZoom || owcsunits;
	if( owcssys !== wcssys ){
	    im.setWCSSys(wcssys);
	}
	if( owcsunits !== wcsunits ){
	    im.setWCSUnits(wcsunits);
	}
	switch(wcssys){
	case "image":
	    res = String(ipos[which]);
	    break;
	case "physical":
	    phys =  im.imageToLogicalPos(ipos);
	    res = String(phys[which]);
	    break;
	default:
	    if( im.raw.wcs && im.raw.wcs > 0 ){
		s = JS9.pix2wcs(im.raw.wcs, ipos.x, ipos.y).trim().split(/\s+/);
		res = which === "x" ? s[0] : s[1];
	    } else {
		res = String(ipos[which]);
	    }
	    break;
	}
	if( owcssys !== wcssys ){
	    im.setWCSSys(owcssys);
	}
	if( owcsunits !== wcsunits ){
	    im.setWCSUnits(owcsunits);
	}
    }
    return res;
};

// re-init (avoiding recursion)
JS9.PanZoom.reinit = function(){
    if( !this.inProcess ){
	this.inProcess = true;
	JS9.PanZoom.init.call(this);
	this.inProcess = false;
    }
};

// re-init when a different image is displayed
JS9.PanZoom.display = function(){
    if( this.lastimage !== this.display.image ){
	this.inProcess = true;
	JS9.PanZoom.init.call(this);
	this.inProcess = false;
    }
};

// clear when an image closes
JS9.PanZoom.close = function(){
    // ensure plugin display is reset
    JS9.PanZoom.init.call(this, {mode: "clear"});
};

// constructor: add HTML elements to the plugin
JS9.PanZoom.init = function(opts){
    let s, t, im, mopts, imid, dispid;
    const getPanOptions = () => {
	let res = "<option selected disabled>Pan</option>";
	res += `<option>center</option>`;
	return res;
    };
    const getZoomOptions = () => {
	let i, zoom, name;
	let res = "<option selected disabled>Zoom</option>";
	res += `<option>in</option>`;
	res += `<option>out</option>`;
	res += `<option>to fit</option>`;
	res += `<option disabled>─────</option>`;
	for(i=JS9.imageOpts.zooms; i>0; i--){
	    zoom = Math.pow(2,i);
	    name = `zoom 1/${zoom}`;
	    res += `<option>${name}</option>`;
	}
	for(i=0; i<=JS9.imageOpts.zooms; i++){
	    zoom = Math.pow(2,i);
	    name = `zoom ${zoom}`;
	    res += `<option>${name}</option>`;
	}
	return res;
    };
    const getFlipOptions = () => {
	let res = "<option selected disabled>Flip</option>";
	res += `<option>x axis</option>`;
	res += `<option>y axis</option>`;
	res += `<option>reset</option>`;
	return res;
    };
    const getRot90Options = () => {
	let res = "<option selected disabled>Rotate</option>";
	res += `<option>90 left</option>`;
	res += `<option>90 right</option>`;
	res += `<option>reset rotate</option>`;
	res += `<option disabled>─────</option>`;
	res += `<option>align: north is up</option>`;
	res += `<option>reset flip/rot90/rotate</option>`;
	return res;
    };
    const getRotOptions = (im) => {
	let res = 0;
	if( im ){
	    if( JS9.globalOpts.rotateRelative &&
		this.rot && this.rot !== "reset" ){
		res = this.rot;
	    } else {
		res = im.getRotate() || "0";
	    }
	}
	return res;
    };
    const getSysOptions = (im) => {
	let i, sys;
	let res = "<option selected disabled>WCS Systems</option>";
	const wcssys = im.tmp.wcssysPanZoom || im.getWCSSys();
	if( im ){
	    if( im.raw.wcs && im.raw.wcs > 0 ){
		sys = JS9.wcssyss;
	    } else {
		sys = ["image", "physical"];
	    }
	    for(i=0; i<sys.length; i++){
		if( wcssys === sys[i] ){
		    res += `<option selected>${sys[i]}</option>`;
		} else {
		    res += `<option>${sys[i]}</option>`;
		}
	    }
	}
	return res;
    };
    const getUnitsOptions = (im) => {
	let i, units;
	let res = "<option selected disabled>WCS Units</option>";
	const wcsunits = im.tmp.wcsunitsPanZoom || im.getWCSUnits();
	if( im ){
	    if( im.raw.wcs && im.raw.wcs > 0 ){
		units = ["degrees", "sexagesimal", "pixels"];
	    } else {
		units = ["pixels"];
	    }
	    for(i=0; i<units.length; i++){
		if( wcsunits === units[i] ){
		    res += `<option selected>${units[i]}</option>`;
		} else {
		    res += `<option>${units[i]}</option>`;
		}
	    }
	}
	return res;
    };
    const getPos = (im, which) => {
	return JS9.PanZoom.getPos(im, which);
    };
    // on entry, these elements have already been defined:
    // this.div:      the DOM element representing the div for this plugin
    // this.divjq:    the jquery object representing the div for this plugin
    // this.id:       the id ofthe div (or the plugin name as a default)
    // this.display:  the display object associated with this plugin
    // this.dispMode: display mode (for internal use)
    //
    // opts is optional
    opts = opts || {};
    // set width and height of plugin itself
    this.width = this.divjq.attr("data-width");
    if( !this.width  ){
	this.width  = JS9.PanZoom.WIDTH;
    }
    this.divjq.css("width", this.width);
    this.width = parseInt(this.divjq.css("width"), 10);
    this.height = this.divjq.attr("data-height");
    if( !this.height ){
	this.height  = JS9.PanZoom.HEIGHT;
    }
    this.divjq.css("height", this.height);
    this.height = parseInt(this.divjq.css("height"), 10);
    // clear out html
    this.divjq.html("");
    this.lastTextWidth = 0;
    // set up new html
    this.panzoomContainer = $("<div>")
	.addClass(`${JS9.PanZoom.BASE}Container`)
	.attr("id", `${this.id}Container`)
        .attr("width", this.width)
        .attr("height", this.height)
	.appendTo(this.divjq);
    // do we have an image?
    im = this.display.image;
    if( im && (opts.mode !== "clear") ){
	// convenience variables
	imid = im.id;
	dispid = im.display.id;
	mopts = [];
	t = sprintf(JS9.PanZoom.panHTML, dispid, imid, getPanOptions());
	mopts.push({name: "pan", value: t});
	t = sprintf(JS9.PanZoom.zoomHTML, dispid, imid, getZoomOptions());
	mopts.push({name: "zoom", value: t});
	t = sprintf(JS9.PanZoom.flipHTML, dispid, imid, getFlipOptions());
	mopts.push({name: "flip", value: t});
	t = sprintf(JS9.PanZoom.rot90HTML, dispid, imid, getRot90Options());
	mopts.push({name: "rot90", value: t});
	t = sprintf(JS9.PanZoom.rotateHTML, dispid, imid, getRotOptions(im));
	mopts.push({name: "rotate", value: t});
	t = sprintf(JS9.PanZoom.pantoHTML, dispid, imid);
	mopts.push({name: "panto", value: t});
	t = sprintf(JS9.PanZoom.pos1HTML, getPos(im, "x"));
	mopts.push({name: "pos1", value: t});
	t = sprintf(JS9.PanZoom.pos2HTML, getPos(im, "y"));
	mopts.push({name: "pos2", value: t});
	t = sprintf(JS9.PanZoom.sysHTML, dispid, imid, getSysOptions(im));
	mopts.push({name: "wcssys", value: t});
	t = sprintf(JS9.PanZoom.unitsHTML, dispid, imid, getUnitsOptions(im));
	mopts.push({name: "wcsunits", value: t});
	s = im.expandMacro(JS9.PanZoom.panzoomHTML, mopts);
	this.lastimage = im;
    } else {
	s = "<p><center>Pan/Zoom parameters will appear here.</center>";
    }
    this.panzoomContainer.html(s);
    if( im ){
	// init run on cr, if necessary
	if( JS9.globalOpts.runOnCR ){
	    this.panzoomContainer.find("[name='pos1']")
		.data("enterfunc", "panto");
	    this.panzoomContainer.find("[name='pos2']")
		.data("enterfunc", "panto");
	}
    }
};

// add this plugin into JS9
JS9.RegisterPlugin(JS9.PanZoom.CLASS, JS9.PanZoom.NAME,
		   JS9.PanZoom.init,
		   {menu: "zoom",
		    menuItem: "Pan/Zoom Controls ...",
		    onplugindisplay: JS9.PanZoom.init,
		    onsetpan: JS9.PanZoom.reinit,
		    onsetzoom: JS9.PanZoom.reinit,
		    onsetwcssys: JS9.PanZoom.reinit,
		    onsetwcsunits: JS9.PanZoom.reinit,
		    onimagedisplay: JS9.PanZoom.display,
		    onimageclose: JS9.PanZoom.close,
		    help: "help/zoomcontrols.html",
		    winTitle: "Pan/Zoom Controls",
		    winDims: [JS9.PanZoom.WIDTH, JS9.PanZoom.HEIGHT]});
/*
 * preferences plugin (14 April 2015)
 */

/*global $, JS9, ddtabcontent */

"use strict";

// To specify the JS9 display instance to link to a given PREFS div,
// use the HTML5 dataset syntax: 
//    <div class="JS9Prefs" data-js9id="JS9"></div>

// create our namespace, and specify some meta-information and params
JS9.Prefs = {};
JS9.Prefs.CLASS = "JS9";        // class of plugins (1st part of div class)
JS9.Prefs.NAME = "Preferences"; // name of this plugin (2nd part of div class)
JS9.Prefs.WIDTH =  750;         // default width of window
JS9.Prefs.HEIGHT = 400;	        // default height of window

JS9.Prefs.imagesSchema = {
    "title": "Image Preferences",
    "description": "Preferences for each displayed image",
    "properties": {
	"colormap": {
	    "type": "string",
	    "helper": "default color map"
	},
	"contrast": {
	    "type": "number",
	    "helper": "default color contrast"
	},
	"bias": {
	    "type": "number",
	    "helper": "default color bias"
	},
	"scale": {
	    "type": "string",
	    "helper": "default scale algorithm"
	},
	"scaleclipping": {
	    "type": "string",
	    "helper": "'dataminmax' or 'zscale'"
	},
	"zscalecontrast": {
	    "type": "number",
	    "helper": "default from ds9"
	},
	"zscalesamples": {
	    "type": "number",
	    "helper": "default from ds9"
	},
	"zscaleline": {
	    "type": "number",
	    "helper": "default from ds9"
	},
	"exp": {
	    "type": "number",
	    "helper": "default exp value for scaling"
	},
	"wcssys": {
	    "type": "string",
	    "helper": "current WCS system"
	},
	"wcsunits": {
	    "type": "string",
	    "helper": "current WCS units"
	},
	"lcs": {
	    "type": "string",
	    "helper": "default logical coordinate system"
	},
	"opacity": {
	    "type": "number",
	    "helper": "opacity for images (0.0 to 1.0)"
	},
	"zoom": {
	    "type": "number",
	    "helper": "default zoom factor"
	},
	"zooms": {
	    "type": "number",
	    "helper": "how many zooms in each direction?"
	},
	"nancolor": {
	    "type": "string",
	    "helper": "6-digit #hex color for NaN values"
	},
	"listonchange": {
	    "type": "boolean",
	    "helper": "list after a region change?"
	},
	"whichonchange": {
	    "type": "string",
	    "helper": "list 'all' or 'selected'?"
	},
	"valpos": {
	    "type": "boolean",
	    "helper": "display value/position?"
	},
	"inherit": {
	    "type": "boolean",
	    "helper": "new images inherit current params?"
	},
	"invert": {
	    "type": "boolean",
	    "helper": "by default, invert colormap?"
	},
	"disable": {
	    "type": "mobject",
	    "helper": "array of core funcs to disable"
	}
    }
};
    
JS9.Prefs.regionsSchema = {
    "title": "Region Preferences",
    "description": "Preferences for each displayed region",
    "type": "object",
    "properties": {
	"iradius": {
	    "type": "number",
	    "helper": "annulus: initial inner radius"
	},
	"oradius": {
	    "type": "number",
	    "helper": "annulus: initial outer radius"
	},
	"nannuli": {
	    "type": "number",
	    "helper": "annulus: initial number of annuli"
	},
	"width": {
	    "type": "number",
	    "helper": "box: initial width"
	},
	"height": {
	    "type": "number",
	    "helper": "box: initial height"
	},
	"radius": {
	    "type": "number",
	    "helper": "circle: initial radius"
	},
	"r1": {
	    "type": "number",
	    "helper": "ellipse: initial radius1"
	},
	"r2": {
	    "type": "number",
	    "helper": "ellipse: initial radius2"
	},
	"ptshape": {
	    "type": "string",
	    "helper": "point shape: box, circle, ellipse"
	},
	"ptsize": {
	    "type": "number",
	    "helper": "point size"
	},
	"points": {
	    "type": "string",
	    "helper": "array of x,y relative positions"
	},
	"angle": {
	    "type": "number",
	    "helper": "box, ellipse: initial angle in degrees"
	},
	"tags": {
	    "type": "string",
	    "helper": "initial tags for a region"
	},
	"strokeWidth": {
	    "type": "number",
	    "helper": "region stroke width"
	},
	"fontFamily": {
	    "type": "string",
	    "helper": "region font"
	},
	"fontSize": {
	    "type": "string",
	    "helper": "region font size"
	},
	"fontStyle": {
	    "type": "string",
	    "helper": "region font style"
	},
	"fontWeight": {
	    "type": "string",
	    "helper": "region font weight"
	},
	"textAlign": {
	    "type": "string",
	    "helper": "text alignment"
	}
    }
};

JS9.Prefs.gridSchema = {
    "title": "Grid Preferences",
    "description": "Preferences for wcs coordinate grids",
    "type": "object",
    "properties": {
	"strokeWidth": {
	    "type": "number",
	    "helper": "grid stroke width"
	},
	"lineColor": {
	    "type": "string",
	    "helper": "color of grid lines"
	},
	"raLines": {
	    "type": "number",
	    "helper": "approx. number of RA grid lines"
	},
	"raAngle": {
	    "type": "number",
	    "helper": "rotation for RA label"
	},
	"raSkip": {
	    "type": "number",
	    "helper": "number of RA lines to skip"
	},
	"decLines": {
	    "type": "number",
	    "helper": "approx. number of Dec grid lines"
	},
	"decAngle": {
	    "type": "number",
	    "helper": "rotation for Dec label"
	},
	"decSkip": {
	    "type": "number",
	    "helper": "number of Dec lines to skip"
	},
	"labelColor": {
	    "type": "string",
	    "helper": "color of text labels"
	},
	"labelFontFamily": {
	    "type": "string",
	    "helper": "label font"
	},
	"labelFontSize": {
	    "type": "string",
	    "helper": "label font size"
	},
	"labelFontStyle": {
	    "type": "string",
	    "helper": "label font style"
	},
	"labelFontWeight": {
	    "type": "string",
	    "helper": "label font weight"
	},
	"labelRAOffx": {
	    "type": "number",
	    "helper": "x offset of RA labels"
	},
	"labelRAOffy": {
	    "type": "number",
	    "helper": "y offset of RA labels"
	},
	"labelDecOffx": {
	    "type": "number",
	    "helper": "x offset of Dec labels"
	},
	"labelDecOffy": {
	    "type": "number",
	    "helper": "y offset of Dec labels"
	},
	"degPrec": {
	    "type": "number",
	    "helper": "precision for degree labels"
	},
	"sexaPrec": {
	    "type": "number",
	    "helper": "precision for sexagesimal labels"
	},
	"reduceDims": {
	    "type": "boolean",
	    "helper": "reduce lines of smaller image dim?"
	},
	"stride": {
	    "type": "number",
	    "helper": "fineness of grid lines"
	},
	"margin": {
	    "type": "number",
	    "helper": "edge margin for displaying a grid line"
	},
	"labelMargin": {
	    "type": "number",
	    "helper": "edge margin for displaying a label"
	},
	"cover": {
	    "type": "string",
	    "helper": "grid lines cover: display or image"
	}
    }
};

// schema for each source
JS9.Prefs.fitsSchema = {
    "title": "FITS Preferences",
    "description": "Preferences for processing FITS files",
    "properties": {
	"extlist": {
	    "type": "string",
	    "helper": "default binary table extensions"
	},
	"xdim": {
	    "type": "string",
	    "helper": "x dim of image section from table"
	},
	"ydim": {
	    "type": "string",
	    "helper": "y dim of image section from table"
	},
	"bin": {
	    "type": "string",
	    "helper": "bin factor for tables"
	},
	"ixdim": {
	    "type": "string",
	    "helper": "x dim of image section from image"
	},
	"iydim": {
	    "type": "string",
	    "helper": "y dim of image section from table"
	},
	"ibin": {
	    "type": "string",
	    "helper": "bin factor for images"
	},
	"binMode": {
	    "type": "string",
	    "helper": "'s' for summing, 'a' for averaging"
	},
	"clear": {
	    "type": "string",
	    "helper": "clear image's virtual file memory"
	}
    }
};

// catalogs schema
JS9.Prefs.catalogsSchema = {
    "title": "Catalogs Preferences",
    "description": "Preferences for loading tab-delimited catalogs",
    "properties": {
	"ras": {
	    "type": "mobject",
	    "helper": "RA patterns to look for in table"
	},
	"decs": {
	    "type": "mobject",
	    "helper": "Dec patterns to look for in table"
	},
	"wcssys": {
	    "type": "string",
	    "helper": "wcs system of catalog"
	},
	"shape": {
	    "type": "string",
	    "helper": "shape of objects"
	},
	"color": {
	    "type": "string",
	    "helper": "color of objects"
	},
	"width": {
	    "type": "number",
	    "helper": "width of box objects"
	},
	"height": {
	    "type": "number",
	    "helper": "height of box objects"
	},
	"radius": {
	    "type": "number",
	    "helper": "radius of circle objects"
	},
	"r1": {
	    "type": "number",
	    "helper": "r1 of ellipse objects"
	},
	"r2": {
	    "type": "number",
	    "helper": "r2 of ellipse objects"
	},
	"tooltip": {
	    "type": "string",
	    "helper": "tooltip format for objects"
	},
	"skip": {
	    "type": "string",
	    "helper": "comment character in table"
	}
    }
};

// global schema for the page
JS9.Prefs.globalsSchema = {
    "title": "Global Preferences",
    "description": "Global preferences for all JS9 displays",
    "properties": {
	"topColormaps": {
	    "type": "mobject",
	    "helper": "array of top-level colormaps"
	},
	"infoBox": {
	    "type": "mobject",
	    "helper": "array of infoBox items to display"
	},
	"statusBar": {
	    "type": "string",
	    "helper": "format of statusbar display"
	},
	"toolBar": {
	    "type": "mobject",
	    "helper": "array of toolbar tools to display"
	},
	"separate": {
	    "type": "mobject",
	    "helper": "options when separating images"
	},
	"mouseActions": {
	    "type": "mobject",
	    "helper": "array of mouse actions"
	},
	"touchActions": {
	    "type": "mobject",
	    "helper": "array of touch actions"
	},
	"keyboardActions": {
	    "type": "mobject",
	    "helper": "object containing keyboard actions"
	},
	"centerDivs": {
	    "type": "mobject",
	    "helper": "divs used when centering"
	},
	"resizeDivs": {
	    "type": "mobject",
	    "helper": "divs used when resizing"
	},
	"plot3d": {
	    "type": "mobject",
	    "helper": "options for 3D data cube plot"
	},
	"syncOps": {
	    "type": "mobject",
	    "helper": "ops to sync between images"
	},
	"wcsUnits": {
	    "type": "mobject",
	    "helper": "default units for WCS systems"
	},
	"copyWcsPosFormat": {
	    "type": "string",
	    "helper": "format string using: $ra $dec $sys"
	},
	"fallbackDisplay": {
	    "type": "string",
	    "helper": "can messages fallback to display win?"
	},
	"regDisplay": {
	    "type": "string",
	    "helper": "show regions in 'lightwin' or 'display'"
	},
	"regConfigSize": {
	    "type": "string",
	    "helper": "size of region dialog: small, medium"
	},
	"lightWinClose": {
	    "type": "string",
	    "helper": "ask,close,move when closing lightwin"
	},
	"fits2fits": {
	    "type": "string",
	    "helper": "make rep file?: true,false,size>N"
	},
	"dynamicSelect": {
	    "type": "string",
	    "helper": "select display: click, move, false"
	},
	"metaClickPan": {
	    "type": "boolean",
	    "helper": "meta-click pans to mouse position?"
	},
	"mousetouchZoom": {
	    "type": "boolean",
	    "helper": "scroll/pinch to zoom?"
	},
	"clickToFocus": {
	    "type": "boolean",
	    "helper": "click display to focus?"
	},
	"valposDCoords": {
	    "type": "boolean",
	    "helper": "valpos shows display coords?"
	},
	"regListDCoords": {
	    "type": "boolean",
	    "helper": "list regions preserving dcoords? "
	},
	"toolbarTooltips": {
	    "type": "boolean",
	    "helper": "show tooltips in Toolbar plugin?"
	},
	"updateTitlebar": {
	    "type": "boolean",
	    "helper": "update titlebar with image id?"
	},
	"logoDisplay": {
	    "type": "boolean",
	    "helper": "show JS9 logo?"
	},
	"reloadRefresh": {
	    "type": "boolean",
	    "helper": "does a reload refresh the data?"
	},
	"reloadRefreshReg": {
	    "type": "boolean",
	    "helper": "reloading regions file removes prev?"
	},
	"regionsToClipboard": {
	    "type": "boolean",
	    "helper": "region mods to pseudo-clipboard?"
	},
	"syncReciprocate": {
	    "type": "boolean",
	    "helper": "reciprocal image sync'ing?"
	},
	"syncWCS": {
	    "type": "boolean",
	    "helper": "sync using wcs (e.g. pan)?"
	},
	"nextImageMask": {
	    "type": "boolean",
	    "helper": "nextImage() show image masks?"
	},
	"panWithinDisplay": {
	    "type": "boolean",
	    "helper": "keep panned image within the display?"
	},
	"pannerDirections": {
	    "type": "boolean",
	    "helper": "show direction vectors in panner?"
	},
	"magnifierRegions": {
	    "type": "boolean",
	    "helper": "show regions in magnifier?"
	},
	"xeqPlugins": {
	    "type": "boolean",
	    "helper": "execute plugin callbacks?"
	},
	"extendedPlugins": {
	    "type": "boolean",
	    "helper": "execute extended plugins?"
	},
	"intensivePlugins": {
	    "type": "boolean",
	    "helper": "execute intensive plugins?"
	},
	"svgBorder": {
	    "type": "boolean",
	    "helper": "add border when exporting SVG?"
	},
	"fits2png": {
	    "type": "boolean",
	    "helper": "convert FITS to PNG rep files?"
	}
    }
};

// favorites schema for the page
JS9.Prefs.favoritesSchema = {
    "title": "Favorites Preferences",
    "description": "Favorites for all JS9 displays",
    "properties": {
	"scales": {
	    "type": "mobject",
	    "helper": "array of favorite scales"
	},
	"colormaps": {
	    "type": "mobject",
	    "helper": "array of favorite colormaps"
	},
	"regions": {
	    "type": "mobject",
	    "helper": "array of favorite regions"
	},
	"wcs": {
	    "type": "mobject",
	    "helper": "array of favorite wcs systems"
	}
    }
};

// source object for preferences
JS9.Prefs.sources = [
    {name: "globals",  schema: JS9.Prefs.globalsSchema},
    {name: "images",   schema: JS9.Prefs.imagesSchema},
    {name: "fits",     schema: JS9.Prefs.fitsSchema},
    {name: "regions",  schema: JS9.Prefs.regionsSchema},
    {name: "grid",     schema: JS9.Prefs.gridSchema},
    {name: "catalogs", schema: JS9.Prefs.catalogsSchema},
    {name: "favorites", schema: JS9.Prefs.favoritesSchema}
];

// init preference plugin
JS9.Prefs.init = function(){
    let i, s, obj, key, props, sources, source, id, pid, html, prompt;
    // create the div containing one tab for each of the sources
    sources = JS9.Prefs.sources;
    pid = `${this.id}prefsTabs`;
    html = "<div style='padding: 8px'>";
    html += `<div id='${pid}' class='indentmenu'>\n`;
    html += "<ul>";
    // create a tab for each source
    for(i=0; i<sources.length; i++){
	source = sources[i];
	id = this.id + JS9.Prefs.CLASS + JS9.Prefs.NAME + source.name;
	html += `  <li><a href='#' rel='${id}Div'>${source.name}</a></li>\n`;
    }
    html += "</ul>";
    html += "<br style='clear:left'></div></div><p>\n";
    // create each param form (displayed by clicking each tab)
    for(i=0; i<sources.length; i++){
	source = sources[i];
	id = this.id + JS9.Prefs.CLASS + JS9.Prefs.NAME + source.name;
	// source-specific pre-processing
	switch( source.name ){
	case "images":
	    source.data = JS9.imageOpts;
	    break;
	case "regions":
	    source.data = JS9.Regions.opts;
	    break;
	case "grid":
	    source.data = JS9.Grid.opts;
	    break;
	case "fits":
	    // make up "nicer" option values from raw object
	    source.data = {extlist: JS9.fits.options.extlist,
			   xdim: JS9.fits.options.table.xdim,
			   ydim: JS9.fits.options.table.ydim,
			   bin: JS9.fits.options.table.bin,
			   ixdim: JS9.fits.options.image.xdim,
			   iydim: JS9.fits.options.image.ydim,
			   ibin: JS9.fits.options.image.bin,
			   binMode: JS9.globalOpts.binMode,
			   clear: JS9.globalOpts.clearImageMemory};
	    break;
	case "catalogs":
	    source.data = JS9.globalOpts.catalogs;
	    break;
	case "globals":
	    source.data = JS9.globalOpts;
	    break;
	case "favorites":
	    source.data = JS9.favorites;
	    break;
	default:
	    JS9.error(`unknown source for preferences: ${source.name}`);
	    break;
	}
	html += `<div id='${id}Div' class='tabcontent'>`;
	html += `<form id='${id}Form' class='js9AnalysisForm' style='max-height: ${this.height-90}px; overflow: hidden'>`;
	html += `<center><b>${source.schema.description}</b></center><p>`;
	props = source.schema.properties;
	for( key in props ){
	    if( props.hasOwnProperty(key) ){
		obj = props[key];
		prompt = obj.prompt || `${key}:`;
		switch(obj.type){
		case "boolean":
		    if( source.data[key] ){
			s = "checked";
		    } else {
			s = "";
		    }
		    html += `<div class='linegroup'><span class='column_R1'><b>${prompt}</b></span><span class='column_R2'><input type='checkbox' name='${key}' value='true' ${s}></span><span class='column_R4l'>${obj.helper}</span></div>`;
		    break;
		default:
		    if( typeof source.data[key] === "object" ){
			if( obj.type === "mobject" ){
			    s = JSON.stringify(source.data[key], null, 2);
			} else {
			    s = JSON.stringify(source.data[key]);
			}
		    } else {
			s = source.data[key];
		    }
		    if( obj.type === "mobject" ){
			html += `<div class='linegroup' style='height:64px'><span class='column_R1'><b>${prompt}</b></span><span class='column_R2l'><textarea name='${key}' class='text_R' rows='5' style='overflow-x: hidden; resize: none'>${s}</textarea></span><span class='column_R4l'>${obj.helper}</span></div>`;
		    } else {
			html += `<div class='linegroup'><span class='column_R1'><b>${prompt}</b></span><span class='column_R2l'><input type='text' name='${key}' class='text_R' value='${s}'></span><span class='column_R4l'>${obj.helper}</span></div>`;
		    }
		    break;
		}
	    }
	}
	html += `<input id='${this.id}_applyPrefs' name='Apply' type='button' class='button' value='Apply' onclick='JS9.Prefs.applyForm.call(this);' style='margin: 8px'>`;
	// manage stored preferences
	if( window.hasOwnProperty("localStorage") &&
	    JS9.globalOpts.localStorage           ){
	    html += `<input id='${this.id}_savePrefs' name='Save' type='button' class='button' value='Save' onclick='JS9.Prefs.saveForm.call(this)' style='margin: 8px'>`;
	    html += `<input id='${this.id}_showPrefs' name='Show' type='button' class='button' value='Show Saved' onclick='JS9.Prefs.showForm.call(this)' style='margin: 8px'>`;
	    html += "<input id='delete' name='Delete' type='button' class='button' value='Delete Saved' onclick='JS9.Prefs.deleteForm.call(this)' style='margin: 8px'>";
	}
	// light windows get a close button
	if( this.winType === "light" ){
	    html += `<input id='${this.id}_closePrefs' name='Close' type='button' class='button' value='Close' onclick='const form = $(this).closest("form"); const winid = form.data("winid"); winid.close(); return false;' style='float: right; margin: 8px'>`;
	}
	html += "</form>";
	html += "</div>";
    }
    // allow scrolling on the plugin
    this.divjq.addClass("JS9PluginScrolling");
    // set the html for this div
    this.divjq.html(html);
    // for each source, set data values which we will need in button callbacks
    for(i=0; i<sources.length; i++){
	source = sources[i];
	id = this.id + JS9.Prefs.CLASS + JS9.Prefs.NAME + source.name;
	$( `#${id}Form`).data("display", this.display);
	$( `#${id}Form`).data("source", source);
	if( this.winType === "light" ){
	    $( `#${id}Form`).data("winid", this.winHandle);
	}
    }
    // now init the tab content
    this.tabs = new ddtabcontent(pid); //enter ID of Tab Container
    this.tabs.setpersist(false); //toogle persistence of the tabs' state
    this.tabs.setselectedClassTarget("link"); //"link" or "linkparent"
    this.tabs.init();
};

// action for Apply in Form
JS9.Prefs.applyForm = function(){
    let arr, arr2;
    const form = $(this).closest("form");
    const display = form.data("display");
    const source = form.data("source");
    const winid = form.data("winid");
    arr = form.serializeArray();
    arr2 = arr.concat($(`#${form.attr("id")} input[type=checkbox]:not(:checked)`).map((i, e) => {return {"name": e.name, "value": "false"};}).get());
    JS9.Prefs.processForm(source, arr2, display, winid);
    return false;
};

// action for Save in Form
JS9.Prefs.saveForm = function(){
    const form = $(this).closest("form");
    const source = form.data("source");
    JS9.Prefs.applyForm.call(this);
    try{ localStorage.setItem(source.name, JSON.stringify(source.data,null,2));
	 JS9.userOpts[source.name] = localStorage.getItem(source.name); }
    catch(e){ JS9.error(`could not save prefs: ${source.name}`); }
    return false;
};

// action for Show in Form
JS9.Prefs.showForm = function(){
    let s, t;
    const form = $(this).closest("form");
    const source = form.data("source");
    try{ s = localStorage.getItem(source.name); }
    catch(e){ /* empty */ }
    if( s && (s !== "null") ){
	t = `<pre>${s}</pre>`;
    } else {
	t = `<p><center>No saved prefs: %{source.name}</center>`;
    }
    JS9.lightWin(`savedPrefs${JS9.uniqueID()}`, "inline", t, 
		 `Saved prefs: ${source.name}`, 
		 JS9.lightOpts[JS9.LIGHTWIN].textWin);
    return false;
};

// action for Delete in Form
JS9.Prefs.deleteForm = function(){
    const form = $(this).closest("form");
    const source = form.data("source");
    try{ localStorage.removeItem(source.name);
	delete JS9.userOpts[source.name]; }
    catch(e){ /* empty */ }
    return false;
};

// process new preferences in the preference form
// eslint-disable-next-line no-unused-vars
JS9.Prefs.processForm = function(source, arr, display, winid){
    let i, j, s, key, val, obj, rlayer;
    const len = arr.length;
    // source-specific pre-processing
    switch( source.name ){
    case "images":
	obj = JS9.imageOpts;
	break;
    case "regions":
	obj = JS9.Regions.opts;
	break;
    case "grid":
	obj = JS9.Grid.opts;
	break;
    case "fits":
	obj = JS9.fits.options;
	break;
    case "catalogs":
	obj = JS9.globalOpts.catalogs;
	break;
    case "globals":
	obj = JS9.globalOpts;
	break;
    case "favorites":
	obj = JS9.favorites;
	break;
    default:
	JS9.error(`unknown source for preferences: ${source.name}`);
	break;
    }
    for(i=0; i<len; i++){
	key = arr[i].name;
	val = arr[i].value;
	if( val === "true" ){
	    val = true;
	}
	if( val === "false" ){
	    val = false;
	}
	switch( typeof obj[key] ){
	case "boolean":
	    break;
	case "number":
	    val = parseFloat(val);
	    break;
	case "object":
	    try{ val = JSON.parse(val); }
	    catch(e){ JS9.error(`invalid JSON (see jsonlint.com): ${val}`, e); }
	    break;
	default:
	    break;
	}
	if( obj[key] !== val ){
	    switch( source.name ){
	    case "images":
		// set new option value
	        obj[key] = val;
		// set the current image's internal params as well
		if( display && display.image ){
	            if( key === "disable" ){
			// overwrite the current disable list
			display.image.params.disable = val;
		    } else {
			display.image.setParam(key, val);
		    }
		}
	        break;
	    case "regions":
		// set new option value
	        obj[key] = val;
		// change option value in each display's region layer as well
		for(j=0; j<JS9.displays.length; j++){
		    rlayer = JS9.displays[j].layers.regions;
		    if( rlayer ){
			rlayer.opts[key] = val;
		    }
		}
		break;
	    case "fits":
	        // put our "nicer" option values back into raw object
	        // note the values are still strings
	        switch(key){
 	        case "xdim":
		    obj.table.xdim = Math.floor(parseFloat(val));
	            break;
	        case "ydim":
		    obj.table.ydim = Math.floor(parseFloat(val));
	            break;
	        case "bin":
		    obj.table.bin = Math.floor(parseFloat(val));
	            break;
	        case "ixdim":
		    obj.image.xdim = Math.floor(parseFloat(val));
	            break;
	        case "iydim":
		    obj.image.ydim = Math.floor(parseFloat(val));
	            break;
	        case "ibin":
		    obj.image.bin = Math.floor(parseFloat(val));
	            break;
		case "binMode":
		    JS9.globalOpts.binMode = val;
		    break;
		case "clear":
		    JS9.globalOpts.clearImageMemory = val;
		    break;
	        default:
	            obj[key] = val;
	            break;
	        }
		source.data[key] = val;
	        break;
	    case "catalogs":
	        switch(key){
 	        case "skip":
		    // add back blank lines
		    obj[key] = `${val}\n`;
		    break;
		default:
	            obj[key] = val;
		    break;
		}
		break;
	    case "globals":
	        switch(key){
 	        case "toolBar":
	            // set new option value
	            obj[key] = val;
		    // re-init toolbar
		    JS9.SetToolbar("init");
		    break;
 	        case "toolbarTooltips":
	            // set new option value
	            obj[key] = val;
		    break;
 	        case "logoDisplay":
	            // set new option value
	            obj[key] = val;
		    // re-init toolbar
		    JS9.SetToolbar("init");
		    s = val ? "block" : "none";
		    for(j=0; j<JS9.displays.length; j++){
			JS9.displays[j].iconjq.css("display", s);
		    }
		    break;
		case "separate":
	            // set new option value
	            obj[key] = val;
		    break;
		default:
	            // set new option value
	            obj[key] = val;
		    break;
		}
		break;
	    case "favorites":
		// set new option value
	        obj[key] = val;
		break;
	    default:
		// set new option value
	        obj[key] = val;
	        break;
	    }
	}
    }
    // extended plugins
    if( JS9.globalOpts.extendedPlugins ){
	for(j=0; j<JS9.displays.length; j++){
	    if( JS9.displays[j].image ){
		JS9.displays[j].image.xeqPlugins("image", "onupdateprefs");
	    }
	}
    }
};

// add preference plugin into JS9
JS9.RegisterPlugin(JS9.Prefs.CLASS, JS9.Prefs.NAME, JS9.Prefs.init,
		   {menu: "file",
		    menuItem: "Preferences",
		    help: "help/prefs.html",
		    winTitle: "User Preferences",
		    winResize: true,
		    winDims: [JS9.Prefs.WIDTH, JS9.Prefs.HEIGHT]});
/*
 * scale clipping limits plugin (August 17, 2018)
 */

/*global $, JS9, sprintf */

"use strict";

// create our namespace, and specify some meta-information and params
JS9.ScaleLimits = {};
JS9.ScaleLimits.CLASS = "JS9";      // class of plugins (1st part of div class)
JS9.ScaleLimits.NAME = "Scale";     // name of this plugin (2nd part of div class)
JS9.ScaleLimits.WIDTH = 512;	      // width of light window
JS9.ScaleLimits.HEIGHT = 400;	      // height of light window
JS9.ScaleLimits.WIDTHOFFSET = 40;   // width offset where plot canvas starts
JS9.ScaleLimits.HEIGHTOFFSET = 210; // height offset where plot canvas starts
JS9.ScaleLimits.BASE = JS9.ScaleLimits.CLASS + JS9.ScaleLimits.NAME;
// default scaling
JS9.ScaleLimits.XSCALE="linear";
JS9.ScaleLimits.YSCALE="log";
// number of points in the distribution
JS9.ScaleLimits.NDIST=512;
// timeout hack for cleaning up flot
JS9.ScaleLimits.TIMEOUT=250;
// size of limits marker for annotation 
JS9.ScaleLimits.CARET=4;
// size of xval text in pixels
JS9.ScaleLimits.XTEXTHEIGHT=14;
// font for xval text without size
JS9.ScaleLimits.XTEXTFONT="Ariel";
// font for xval text without size
JS9.ScaleLimits.XTEXTCOLOR="black";
// where to place the xval (as a fraction of plot size)
JS9.ScaleLimits.XTEXTFRAC = 0.75;
JS9.ScaleLimits.YTEXTFRAC = 0.15;
// plot colors
// see: https://htmlcolorcodes.com/color-picker/
JS9.ScaleLimits.PLOTCOLOR = "#030AE4";
JS9.ScaleLimits.XLOCOLOR  = "#FF0000";
JS9.ScaleLimits.XHICOLOR  = "#00FF00";
// axis font
JS9.ScaleLimits.AXISFONT = {size: 12, family: "Ariel", color: "black"};
JS9.ScaleLimits.AXISFANCY = true;
// data options
JS9.ScaleLimits.dataOpts = {
    bars: {show: true, align: "center", barWidth: 0.1},
    clickable: true,
    hoverable: true,
    data: []
};
// plot options
JS9.ScaleLimits.plotOpts = {
    selection: {
	mode:      "x"
    },
    grid: {
	hoverable: true
    }
};

JS9.ScaleLimits.scalelimsHTML="<div class='JS9ScaleLinegroup'>$header</div><div class='JS9ScaleLinegroup'>$scales&nbsp;&nbsp;$limits&nbsp;&nbsp;$axes</div><p><div class='JS9ScaleLinegroup'>$plot</div><p><div class='JS9ScaleLinegroup'><span class='JS9ScaleSpan' style='float: left'>&nbsp;&nbsp;$lo&nbsp;&nbsp;&nbsp;&nbsp;$hi</span></div>";

JS9.ScaleLimits.headerHTML='Set clipping limits via the Data Limits menu, or by selecting part of the Pixel Distribution plot, or by changing the Low and/or High limit.';

JS9.ScaleLimits.scalesHTML='<select class="JS9Select JS9ScaleSelect" onchange="JS9.ScaleLimits.xsetscale(\'%s\', \'%s\', this)">%s</select>';

JS9.ScaleLimits.limitsHTML='<select class="JS9Select JS9ScaleSelect" onchange="JS9.ScaleLimits.xsetlims(\'%s\', \'%s\', this)"><option selected disabled>Data Limits</option><option value="dataminmax">data min/max</option><option value="zscale_z1_z2">zscale z1/z2</option><option value="zscale_z1_datamax">zscale z1/max</option></select>';

JS9.ScaleLimits.axesHTML='<select class="JS9Select JS9ScaleSelect" onchange="JS9.ScaleLimits.xaxes(\'%s\', \'%s\', this)"><option selected disabled>Plot Axes</option><option disabled>x axis:</option><option value="xlinear">linear</option><option value="xlog">log</option><option disabled>y axis:</option><option value="ylinear">linear</option><option value="ylog">log</option></select>';

JS9.ScaleLimits.plotHTML='<div><center>Pixel Distribution: %s</center></div><div class="JS9ScalePlot" style="width:%spx;height:%spx"></div>';

JS9.ScaleLimits.loHTML='Low:&nbsp;&nbsp;<input type="text" class="JS9ScaleValue" value=\'%s\' onchange="JS9.ScaleLimits.xsetlo(\'%s\', \'%s\', this)" size="16">';

JS9.ScaleLimits.hiHTML='High:&nbsp;&nbsp;<input type="text" class="JS9ScaleValue" value=\'%s\' onchange="JS9.ScaleLimits.xsethi(\'%s\', \'%s\', this)" size="16">';

// change scale
JS9.ScaleLimits.xsetscale = function(did, id, target){
    const im = JS9.lookupImage(id, did);
    if( im ){
	im.setScale(target.value);
    }
};

// change low clipping limit
JS9.ScaleLimits.xsetlo = function(did, id, target){
    let val;
    const im = JS9.lookupImage(id, did);
    if( im ){
	val = parseFloat(target.value);
	im.setScale(val, im.params.scalemax);
    }
};

// change high clipping limit
JS9.ScaleLimits.xsethi = function(did, id, target){
    let val;
    const im = JS9.lookupImage(id, did);
    if( im ){
	val = parseFloat(target.value);
	im.setScale(im.params.scalemin, val);
    }
};

// other ways to determine limits
JS9.ScaleLimits.xsetlims = function(did, id, target){
    const im = JS9.lookupImage(id, did);
    if( im ){
	switch(target.value){
	case "dataminmax":
	    im.setScale("dataminmax", im.raw.dmin, im.raw.dmax);
	    break;
	case "zscale_z1_z2":
	    im.setScale("zscale", im.params.z1, im.params.z2);
	    break;
	case "zscale_z1_datamax":
	    im.setScale("zmax", im.params.z1, im.raw.dmax);
	    break;
	default:
	    break;
	}
    }
};

// log10 scaling
JS9.ScaleLimits.log10 = function(v){
    return v <= 0 ? null : Math.log(v) / Math.LN10;
};

// other ways to determine limits
JS9.ScaleLimits.xaxes = function(did, id, target){
    let plugin;
    const im = JS9.lookupImage(id, did);
    if( im ){
	// get current plugin instance
	plugin = im.display.pluginInstances[JS9.ScaleLimits.BASE];
	// sanity check
	if( !plugin || !plugin.plot ){
	    return;
	}
	// change the scale for the specified axis
	switch(target.value){
	case "xlinear":
	    plugin.xscale = "linear";
	    JS9.ScaleLimits.doplot.call(plugin, im);
	    break;
	case "xlog":
	    plugin.xscale = "log";
	    JS9.ScaleLimits.doplot.call(plugin, im);
	    break;
	case "ylinear":
	    plugin.yscale = "linear";
	    JS9.ScaleLimits.doplot.call(plugin, im);
	    break;
	case "ylog":
	    plugin.yscale = "log";
	    JS9.ScaleLimits.doplot.call(plugin, im);
	    break;
	default:
	    break;
	}
    }
    // reset top-level
    $(target).val("Plot Axes").prop("selected", true);
};

JS9.ScaleLimits.getPixelDist = function(im, ndist){
    let i, idx;
    const dist = [];
    const dmin = im.raw.dmin;
    const drange = im.raw.dmax - im.raw.dmin;
    const imlen = im.raw.width * im.raw.height;
    for(i=0; i<ndist; i++){
        dist[i] = 0;
    }
    for(i=0; i<imlen; i++){
//        idx = Math.floor((im.raw.data[i] / drange) * ndist + 0.5);
        idx = Math.floor(((im.raw.data[i] - dmin) / drange) * ndist + 0.5);
        if( idx >= 0 && idx < ndist ){
            dist[idx] += 1;
	}
    }
    return dist;
};

JS9.ScaleLimits.to10E = function(i){
    const superscripts = ["⁰", "¹", "²", "³", "⁴", "⁵", "⁶", "⁷", "⁸", "⁹"];
    if( JS9.ScaleLimits.AXISFANCY && i >= 0 && i <= 9 ){
	return `10${superscripts[i]}`;
    }
    return `10E${String(i)}`;
};

JS9.ScaleLimits.doplot = function(im){
    let i, j, s, el, xmin, xmax;
    let dist, distmin, distmax, ntick, tickinc;
    const dmin = im.raw.dmin;
    const drange = im.raw.dmax - im.raw.dmin;
    const pobj =  $.extend(true, {}, JS9.ScaleLimits.dataOpts);
    const popts = $.extend(true, {}, JS9.ScaleLimits.plotOpts);
    const gettickinc = (datarange) => {
	let tickinc;
	if( datarange < 10 ){
            tickinc = 1;
	} else if( datarange < 50 ){
            tickinc = 5;
	} else if( datarange < 250 ){
            tickinc = 10;
	} else if( datarange < 500 ){
            tickinc = 50;
	} else if( datarange < 2500 ){
            tickinc = 100;
	} else if( datarange < 5000 ){
            tickinc = 500;
	} else if( datarange < 25000 ){
            tickinc = 1000;
	} else if( datarange < 50000 ){
            tickinc = 5000;
	} else if( datarange < 250000 ){
            tickinc = 10000;
	} else if( datarange < 500000 ){
            tickinc = 50000;
	} else if( datarange < 2500000 ){
            tickinc = 100000;
	} else if( datarange < 5000000 ){
            tickinc = 500000;
	} else if( datarange < 25000000 ){
            tickinc = 1000000;
	} else {
            tickinc = 10000000;
	}
	return tickinc;
    };
    const annotate = (plot, x, color) => {
	const ctx = plot.getCanvas().getContext("2d");
	const size = JS9.ScaleLimits.CARET;
	const o = plot.pointOffset({x: x, y: 0});
	ctx.beginPath();
	ctx.moveTo(o.left, o.top);
	ctx.lineTo(o.left - size, o.top - (size*2));
	ctx.lineTo(o.left + size, o.top - (size*2));
	ctx.lineTo(o.left, o.top);
	ctx.fillStyle = color;
	ctx.fill();
    };
    // flag we have just started
    this.plotComplete = false;
    // plot options
    if( this.plotColor ){
	pobj.color = this.plotColor;
    }
    // pixel distribution
    dist = JS9.ScaleLimits.getPixelDist(im, this.ndist);
    // convert to flot data
    for(i=0; i<this.ndist; i++){
        pobj.data[i] = [i, dist[i]];
    }      
    // xaxis
    popts.xaxis = popts.xaxis || {};
    popts.xaxis.font = JS9.ScaleLimits.AXISFONT;
    if( this.xscale === "linear"  ){
	popts.xaxis.transform = null;
	popts.xaxis.ticks = [];
	tickinc = gettickinc(drange);
	ntick = Math.floor(drange/tickinc + 0.5) + 1;
	for(i=0; i<ntick; i++){
            j = i * tickinc;
	    s = String(j);
            popts.xaxis.ticks[i] = [(j - dmin) * this.ndist / drange, s];
	}
    } else if( this.xscale === "log"  ){
	popts.xaxis.transform = JS9.ScaleLimits.log10;
	popts.xaxis.min = 1;
	popts.xaxis.ticks = [];
	ntick = JS9.ScaleLimits.log10(this.ndist) + 1;
	for(i=0; i<ntick; i++){
	    j = Math.floor( (Math.pow(10, i) - dmin) * this.ndist / drange);
            popts.xaxis.ticks[i] = [j, JS9.ScaleLimits.to10E(i)];
	}
    }
    // plot location of current scaling min and max for annotations
    xmin = ((im.params.scalemin - dmin) / drange) * this.ndist;
    xmax = ((im.params.scalemax - dmin) / drange) * this.ndist;
    // y axis
    popts.yaxis = popts.yaxis || {};
    popts.yaxis.font = JS9.ScaleLimits.AXISFONT;
    if( this.yscale === "linear"  ){
	popts.yaxis.transform = null;
	popts.yaxis.ticks = null;
    } else if( this.yscale === "log"  ){
	popts.yaxis.transform = JS9.ScaleLimits.log10;
	popts.yaxis.min = 1;
	popts.yaxis.ticks = [];
	// distribution limits
	for(i=0; i<this.ndist; i++){
            if( distmin === undefined || dist[i] < distmin ){
		distmin = dist[i];
            }
            if( distmax === undefined || dist[i] > distmax ){
		distmax = dist[i];
            }
	}      
	ntick = JS9.ScaleLimits.log10(distmax - distmin + 1);
	for(i=0; i<ntick; i++){
            popts.yaxis.ticks[i] = [Math.pow(10, i), JS9.ScaleLimits.to10E(i)];
	}
    }
    el = this.divjq.find(".JS9ScalePlot");
    // this timeout stuff avoids generating plots too quickly in succession
    if( this.timeout ){
	// don't do previous plot
	window.clearTimeout(this.timeout);
	this.timeout = null;
    }
    // select limits
    el.off("plotselected");
    el.on("plotselected", (event, ranges) => {
	let start = ranges.xaxis.from;
	let end   = ranges.xaxis.to;
	if( this.xscale === "log" ){
	    start = Math.pow(10, start);
	    end = Math.pow(10, end);
	}
	start = start * drange / this.ndist + dmin;
	end   = end   * drange / this.ndist + dmin;
	im.setScale("user", start, end);
    });
    el.off("plothover");
    el.on("plothover", (event, pos) => {
	let ctx, text, s, x, y, w, h, xval;
	let px = pos.x;
	// sanity checks
	if( !this.plot || !this.plotComplete ){ 
	    return;
	}
	if( this.xscale === "log" ){
	    px = Math.pow(10, px);
	}
	xval = px * drange / this.ndist + dmin;
	if( !Number.isFinite(xval) ){
	    return;
	}
	s = JS9.floatToString(xval);
	// display x value in upper right corner of plot
	ctx = this.plot.getCanvas().getContext("2d");
	ctx.save();
	ctx.textBaseline = 'top';
	ctx.font = `${JS9.ScaleLimits.XTEXTHEIGHT  }px ${JS9.ScaleLimits.XTEXTFONT}`;
	ctx.fillStyle = JS9.ScaleLimits.XTEXTCOLOR || "black";
	text = ctx.measureText(s);
	w = Math.max(this.lastTextWidth, text.width + 2);
	h = JS9.ScaleLimits.XTEXTHEIGHT + 2;
	x = this.plotWidth  * JS9.ScaleLimits.XTEXTFRAC;
	y = this.plotHeight * JS9.ScaleLimits.YTEXTFRAC;
	ctx.clearRect(x, y, w, h);
	ctx.fillText(s, x, y); 
	ctx.restore();
	this.lastTextWidth = w;
    });
    this.timeout = window.setTimeout( () => {
	this.plot = $.plot(el, [pobj], popts);
	this.timeout = null;
	annotate(this.plot, xmin, this.xlocolor);
	annotate(this.plot, xmax, this.xhicolor);
	this.plotComplete = true;
    }, JS9.ScaleLimits.TIMEOUT);
};

// re-init when a different image is displayed
JS9.ScaleLimits.display = function(){
    if( this.lastimage !== this.display.image ){
	JS9.ScaleLimits.init.call(this);
    }
};

// clear when an image closes
JS9.ScaleLimits.close = function(){
    // ensure plugin display is reset
    JS9.ScaleLimits.init.call(this, {mode: "clear"});
};

// constructor: add HTML elements to the plugin
JS9.ScaleLimits.init = function(opts){
    let s, im, mopts, imid, dispid;
    const getScales = () => {
	let i;
	let res = "<option selected disabled>Scales</option>";
	for(i=0; i<JS9.scales.length; i++){
	    res += `<option>${JS9.scales[i]}</option>`;
	}
	return res;
    };
    // on entry, these elements have already been defined:
    // this.div:      the DOM element representing the div for this plugin
    // this.divjq:    the jquery object representing the div for this plugin
    // this.id:       the id ofthe div (or the plugin name as a default)
    // this.display:  the display object associated with this plugin
    // this.dispMode: display mode (for internal use)
    //
    // opts is optional
    opts = opts || {};
    // set width and height of plugin itself
    this.width = this.divjq.attr("data-width");
    if( !this.width  ){
	this.width  = JS9.ScaleLimits.WIDTH;
    }
    this.divjq.css("width", this.width);
    this.width = parseInt(this.divjq.css("width"), 10);
    this.height = this.divjq.attr("data-height");
    if( !this.height ){
	this.height  = JS9.ScaleLimits.HEIGHT;
    }
    this.divjq.css("height", this.height);
    this.height = parseInt(this.divjq.css("height"), 10);
    // set width and height of plot
    this.plotWidth = this.plotWidth || this.divjq.attr("data-plotWidth");
    if( !this.plotWidth  ){
	this.plotWidth  = this.width - JS9.ScaleLimits.WIDTHOFFSET;
    }
    this.plotHeight = this.plotHeight || this.divjq.attr("data-plotHeight");
    if( !this.plotHeight  ){
	this.plotHeight  = this.height - JS9.ScaleLimits.HEIGHTOFFSET;
    }
    // initial scaling
    this.xscale = this.xscale || this.divjq.attr("data-xscale");
    if( !this.xscale ){
	this.xscale  = JS9.ScaleLimits.XSCALE;
    }
    this.yscale = this.yscale || this.divjq.attr("data-yscale");
    if( !this.yscale ){
	this.yscale  = JS9.ScaleLimits.YSCALE;
    }
    // plot colors
    this.plotColor = this.plotColor || this.divjq.attr("data-plotColor");
    if( !this.plotColor ){
	this.plotColor  = JS9.ScaleLimits.PLOTCOLOR;
    }
    // plot color
    this.xlocolor = this.xlocolor || this.divjq.attr("data-xlocolor");
    if( !this.xlocolor ){
	this.xlocolor  = JS9.ScaleLimits.XLOCOLOR;
    }
    // plot color
    this.xhicolor = this.xhicolor || this.divjq.attr("data-xhicolor");
    if( !this.xhicolor ){
	this.xhicolor  = JS9.ScaleLimits.XHICOLOR;
    }
    // set number of distribution points
    this.ndist = this.divjq.attr("data-ndist");
    if( !this.ndist  ){
	this.ndist  = JS9.ScaleLimits.NDIST;
    }
    // clear out html
    this.divjq.html("");
    this.lastTextWidth = 0;
    // set up new html
    this.scalelimsContainer = $("<div>")
	.addClass(`${JS9.ScaleLimits.BASE}Container`)
	.attr("id", `${this.id}Container`)
        .attr("width", this.width)
        .attr("height", this.height)
	.appendTo(this.divjq);
    // do we have an image?
    im = this.display.image;
    if( im && (opts.mode !== "clear") ){
	// convenience variables
	imid = im.id;
	dispid = im.display.id;
	mopts = [];
	mopts.push({name: "header",
		    value: JS9.ScaleLimits.headerHTML});
	mopts.push({name: "scales",
		    value: sprintf(JS9.ScaleLimits.scalesHTML,
				   dispid, imid, getScales())});
	mopts.push({name: "limits",
		    value: sprintf(JS9.ScaleLimits.limitsHTML,
				   dispid, imid)});
	mopts.push({name: "axes",
		    value: sprintf(JS9.ScaleLimits.axesHTML,
				   dispid, imid)});
	mopts.push({name: "plot",
		    value: sprintf(JS9.ScaleLimits.plotHTML,
				   imid, this.plotWidth, this.plotHeight)});
	mopts.push({name: "lo",
		    value: sprintf(JS9.ScaleLimits.loHTML,
				   JS9.floatToString(im.params.scalemin),
				   dispid, imid)});
	mopts.push({name: "hi",
		    value: sprintf(JS9.ScaleLimits.hiHTML,
				   JS9.floatToString(im.params.scalemax),
				   dispid, imid)});
	s = im.expandMacro(JS9.ScaleLimits.scalelimsHTML, mopts);
	this.lastimage = im;
    } else {
	s = "<p><center>Scale parameters will appear here.</center>";
    }
    this.scalelimsContainer.html(s);
    // set up initial plot, if possible
    if( im ){
	JS9.ScaleLimits.doplot.call(this, im);
    }
};

// add this plugin into JS9
JS9.RegisterPlugin(JS9.ScaleLimits.CLASS, JS9.ScaleLimits.NAME,
		   JS9.ScaleLimits.init,
		   {menu: "scale",
		    menuItem: "Scale Controls ...",
		    onplugindisplay: JS9.ScaleLimits.init,
		    onsetscale: JS9.ScaleLimits.init,
		    onimagedisplay: JS9.ScaleLimits.display,
		    onimageclose: JS9.ScaleLimits.close,
		    help: "help/scalecontrols.html",
		    winTitle: "Scale Controls",
		    winDims: [JS9.ScaleLimits.WIDTH, JS9.ScaleLimits.HEIGHT]});
/*
 * image separate/gather plugin (July 26, 2018)
 */

/*global $, JS9, sprintf */

"use strict";

// create our namespace, and specify some meta-information and params
JS9.Separate = {};
JS9.Separate.CLASS = "JS9";       // class of plugins (1st part of div class)
JS9.Separate.NAME = "Separate";   // name of this plugin (2nd part of div class)
JS9.Separate.WIDTH =  512;	  // width of light window
JS9.Separate.HEIGHT = 336;	  // height of light window
JS9.Separate.BASE = JS9.Separate.CLASS + JS9.Separate.NAME;  // CSS base class name

JS9.Separate.topHTML='$separate<p>$gather';

JS9.Separate.separateHTML='<b>separate selected</b> images or <b>separate all</b> images into different displays. The topmost (selected) image remains in place, and the presence or absence of its menubar, toolbar, and colorbar will be replicated in the new displays:<p><div><input type="button" class="separateButton1 JS9Button2" name="separate" value="separate selected" onclick="javascript:JS9.Separate.separate.call(this, \'%s\', \'selected\');">;<input type="button" class="separateButton2 JS9Button2" name="separate" value="separate all" onclick="javascript:JS9.Separate.separate.call(this, \'%s\', \'all\');"><span style=\'float: right\'><select class="separateLayoutSelect JS9Select" onchange="JS9.Separate.xlayout.call(this, \'%s\')"><option selected disabled>layout</option><option value="auto">auto</option><option value="horizontal">horizontal</option><option value="vertical">vertical</option></select></span></div><p>';

JS9.Separate.gatherHTML='<b>gather selected</b> images or  <b>gather all</b> images into this display:<p><div><input type="button" class="separateButton1 JS9Button2" name="gather" value="gather selected" onclick="javascript:JS9.Separate.gather.call(this, \'%s\', \'selected\');"><input type="button" class="separateButton2 JS9Button2" name="gather" value="gather all" onclick="javascript:JS9.Separate.gather.call(this, \'%s\', \'all\');"></div><p>';

JS9.Separate.imageHTML="<span style='float: left'>$active&nbsp;&nbsp;</span><span id='separateFile'>$imfile</span>";

JS9.Separate.activeHTML='<input class="separateActiveCheck" type="checkbox" id="active" name="active" value="active" onclick="javascript:JS9.Separate.xactive.call(this, \'%s\')">select';

JS9.Separate.imfileHTML='<b>%s</b>';

JS9.Separate.nofileHTML='<p><span id="NoFile">[Images will appear here as they are loaded]</span>';

// change active state
JS9.Separate.xactive = function(id){
    const im = JS9.lookupImage(id);
    const active = this.checked;
    if( im ){
	im.tmp.separateMode = active;
    }
};

// change active state
JS9.Separate.xlayout = function(id){
    let plugin;
    const display = JS9.getDynamicDisplayOr(JS9.lookupDisplay(id));
    if( !display ){ return; }
    plugin = display.pluginInstances.JS9Separate;
    if( plugin && this.selectedIndex >= 0 ){
	plugin.separateLayout = this.options[this.selectedIndex].value;
    }
};

// separate images
JS9.Separate.separate = function(id, which){
    let i, im, plugin, arr;
    const opts = {};
    const display = JS9.getDynamicDisplayOr(JS9.lookupDisplay(id));
    if( !display ){ return; }
    plugin = display.pluginInstances.JS9Separate;
    if( plugin && plugin.separateLayout ){
	opts.layout = plugin.separateLayout;
    }
    switch(which){
    case "selected":
	arr = [];
	for(i=0; i<JS9.images.length; i++){
	    im = JS9.images[i];
	    if( im.tmp.separateMode ){
		arr.push(im);
	    }
	}
	if( !arr.length ){ return; }
	opts.images = arr;
	break;
    default:
	break;
    }
    display.separate(opts);
};

// gather images
JS9.Separate.gather = function(id, which){
    let i, im, arr;
    const opts = {};
    const display = JS9.getDynamicDisplayOr(JS9.lookupDisplay(id));
    if( !display ){ return; }
    switch(which){
    case "all":
	display.gather();
	break;
    case "selected":
	arr = [];
	for(i=0; i<JS9.images.length; i++){
	    im = JS9.images[i];
	    if( im.tmp.separateMode ){
		arr.push(im);
	    }
	}
	if( !arr.length ){ return; }
	opts.images = arr;
	break;
    }
    display.gather(opts);
};

// get a SeparateImage id based on the file image id
JS9.Separate.imid = function(im){
    const id = `${im.display.id}_${im.id}`;
    return `${id.replace(/[^A-Za-z0-9_]/g, "_")}SeparateImage`;
};

// get a class unique between displays
JS9.Separate.dispclass = function(im){
    const id = `${JS9.Separate.BASE}_${im.display.id}`;
    return id.replace(/[^A-Za-z0-9_]/g, "_");
};

// change the active image
JS9.Separate.activeImage = function(im){
    let id, dcls;
    if( im ){
	id = JS9.Separate.imid(im);
	dcls = `${JS9.Separate.dispclass(im)}_Image`;
	$(`.${dcls}`)
	    .removeClass(`${JS9.Separate.BASE}ImageActive`)
	    .addClass(`${JS9.Separate.BASE}ImageInactive`);
	$(`#${id}`)
	    .removeClass(`${JS9.Separate.BASE}ImageInactive`)
	    .addClass(`${JS9.Separate.BASE}ImageActive`);
    }
};

// add an image to the list of available images
JS9.Separate.addImage = function(im){
    let s, id, divjq, dcls, imid;
    const opts = [];
    const cls = `${JS9.Separate.BASE}Image`;
    if( !im ){
	return;
    }
    // convenience variables
    imid = im.id;
    // unique id
    id = JS9.Separate.imid(im);
    // get class for this layer 
    dcls = `${JS9.Separate.dispclass(im)}_Image`;
    // value to pass to the macro expander
    opts.push({name: "imid",   value: im.id});
    opts.push({name: "active", value: sprintf(JS9.Separate.activeHTML, 
					      imid)});
    opts.push({name: "imfile", value: sprintf(JS9.Separate.imfileHTML, 
					      imid)});
    // remove initial message
    if( !this.separateDivs ){
	this.separateImageContainer.html("");
    }
    // create the html for this image
    s = JS9.Image.prototype.expandMacro.call(im, JS9.Separate.imageHTML, opts);
    // add image html to the image container
    divjq = $("<div>")
	.addClass(cls)
	.addClass(dcls)
	.attr("id", id)
	.prop("imid", imid)
	.html(s)
	.appendTo(this.separateImageContainer);
    divjq.on("mousedown touchstart", () => {
	    im.displayImage();
	    JS9.Separate.activeImage(im);
    });
    // one more div in the stack
    this.separateDivs++;
    // check the selected box, if necessary
    divjq.find('.separateActiveCheck')
	.prop('checked', im.tmp.separateMode === true);
    //make it the current one
    JS9.Separate.activeImage(im);
};

// remove an image from the list of available images
JS9.Separate.removeImage = function(im){
    let id;
    if( im ){
	id = JS9.Separate.imid(im);
	$(`#${id}`).remove();
	this.separateDivs--;
	if( this.separateDivs === 0 ){
	    this.separateImageContainer.html(JS9.Separate.nofileHTML);
	}
	delete im.tmp.separateMode;
	return true;
    }
    return false;
};

// constructor: add HTML elements to the plugin
JS9.Separate.init = function(){
    let i, s, im, display, dispid;
    const opts = [];
    // on entry, these elements have already been defined:
    // this.div:      the DOM element representing the div for this plugin
    // this.divjq:    the jquery object representing the div for this plugin
    // this.id:       the id ofthe div (or the plugin name as a default)
    // this.display:  the display object associated with this plugin
    // this.dispMode: display mode (for internal use)
    //
    // create container to hold image container and header
    // clean main container
    this.divjq.html("");
    // no images/divs loaded yet
    this.separateDivs = 0;
    // allow scrolling on the plugin
    this.divjq.addClass("JS9PluginScrolling");
    // main container
    this.separateContainer = $("<div>")
	.addClass(`${JS9.Separate.BASE}Container`)
	.attr("id", `${this.id}SeparateContainer`)
        .css("overflow", "auto")
	.appendTo(this.divjq);
    dispid = this.display.id;
    opts.push({name: "separate", value: sprintf(JS9.Separate.separateHTML, 
						dispid, dispid, dispid)});
    opts.push({name: "gather",   value: sprintf(JS9.Separate.gatherHTML, 
						dispid, dispid)});
    s = JS9.Image.prototype.expandMacro.call(null, JS9.Separate.topHTML, 
					     opts);
    // header
    this.separateHeader = $("<div>")
	.addClass(`${JS9.Separate.BASE}Header`)
	.attr("id", `${dispid}Header`)
	.html(s)
	.appendTo(this.separateContainer);
    // container to hold images
    this.separateImageContainer = $("<div>")
	.addClass(`${JS9.Separate.BASE}ImageContainer`)
	.attr("id", `${this.id}SeparateImageContainer`)
        .html(JS9.Separate.nofileHTML)
	.appendTo(this.separateContainer);
    display = JS9.getDynamicDisplayOr(this.display);
    // add currently loaded images
    for(i=0; i<JS9.images.length; i++){
	im = JS9.images[i];
	if( im.display === display ){
	    JS9.Separate.addImage.call(this, im);
	}
    }
    // the images within the image container will be sortable
    this.separateImageContainer.sortable({
	start: (event, ui) => {
	    this.oidx = ui.item.index();
	},
	stop: (event, ui) => {
	    const nidx = ui.item.index();
	    // change JS9 image array to reflect the change
	    this.display.moveImageInStack(this.oidx, nidx);
	    // redisplay in case something changed
	    if( this.display.image ){
		this.display.image.displayImage();
	    }
	    delete this.oidx;
	}
    });
};

// callback when an image is loaded
JS9.Separate.imageload = function(im){
    const display = JS9.getDynamicDisplayOr(this.display);
    if( im && im.display === display ){
	JS9.Separate.addImage.call(this, im);
    }
};

// callback when image is displayed
JS9.Separate.imagedisplay = function(im){
    JS9.Separate.activeImage.call(this, im);
};

// callback when image is displayed
JS9.Separate.imageclose = function(im){
    JS9.Separate.removeImage.call(this, im);
};

// callback when image is displayed
JS9.Separate.reinit = function(im){
    if( im ){
	JS9.Separate.init.call(this);
    }
};

// add this plugin into JS9
JS9.RegisterPlugin(JS9.Separate.CLASS, JS9.Separate.NAME, JS9.Separate.init,
		   {menuItem: "Separate/Gather",
		    dynamicSelect: true,
		    onplugindisplay: JS9.Separate.init,
		    ondynamicselect: JS9.Separate.reinit,
		    ongatherdisplay: JS9.Separate.reinit,
		    onimageload: JS9.Separate.imageload,
		    onimagedisplay: JS9.Separate.imagedisplay,
		    onimageclose: JS9.Separate.imageclose,
		    help: "help/separate.html",
		    winTitle: "Separate/Gather Images",
		    winResize: true,
		    winDims: [JS9.Separate.WIDTH, JS9.Separate.HEIGHT]});

/*
 * status plugin (February 20, 2020)
 */

/*global $, JS9 */

"use strict";

// create our namespace, and specify some meta-information and params
JS9.Statusbar = {};
JS9.Statusbar.CLASS = "JS9";      // class of plugins (1st part of div class)
JS9.Statusbar.NAME = "Statusbar"; // name of this plugin (2nd part of div class)
JS9.Statusbar.WIDTH =  512;       // width of light window
JS9.Statusbar.HEIGHT = 32;        // height of light window
JS9.Statusbar.COLORWIDTH =  120;  // width of colorbar, if present
JS9.Statusbar.COLORHEIGHT = 14;   // height of colorbar, if present
JS9.Statusbar.BASE = JS9.Statusbar.CLASS + JS9.Statusbar.NAME;

// mouse over: highlight a bit
JS9.Statusbar.mover = function(target){
    $(target).removeClass("JS9StatusbarItemNoHighlight JS9StatusbarItemHighlight2");
    $(target).addClass("JS9StatusbarItemHighlight");
};

// mouse out: no highlight
JS9.Statusbar.mout = function(target){
    $(target).removeClass("JS9StatusbarItemHighlight JS9StatusbarItemHighlight2");
    $(target).addClass("JS9StatusbarItemNoHighlight");
};

// mouse down: hightlight fully
JS9.Statusbar.mdown = function(target){
    // unhighlight
    $(target).removeClass("JS9StatusbarItemNoHighlight JS9StatusbarItemHighlight");
    $(target).addClass("JS9StatusbarItemHighlight2");
};

// mouse up: xeq action, hightlight a bit
JS9.Statusbar.mup = function(target, id){
    let s, arr;
    $(target).removeClass("JS9StatusbarItemNoHighlight JS9StatusbarItemHighlight2");
    $(target).addClass("JS9StatusbarItemHighlight");
    // look at the html for this element
    s = $(target).attr("name");
    if( s ){
	// is there a hint about what sort of menu status it contains?
	arr = s.match(/file|image|edit|view|zoom|rot|flip|scale|color|regions|wcs|analysis|mag/i);
    }
    // bring up a control plugin, if possible
    if( arr && arr[0] ){
	switch(arr[0]){
	case "file":
	case "image":
	    JS9.DisplayPlugin("FITSBinning", {display: id});
	    break;
	case "edit":
	    break;
	case "view":
	    break;
	case "flip":
	case "rot":
	case "mag":
	case "zoom":
	    JS9.DisplayPlugin("JS9PanZoom", {display: id});
	    break;
	case "scale":
	    JS9.DisplayPlugin("JS9Scale", {display: id});
	    break;
	case "color":
	    JS9.DisplayPlugin("JS9Color", {display: id});
	    break;
	case "regions":
	    break;
	case "wcs":
	    break;
	case "analysis":
	    break;
	}
    }
}

// redraw status on display
JS9.Statusbar.display = function(im){
    let i, s, t, oarr, arr, elements, index, pinst, statusbar;
    let html = "";
    let delim = /;/;
    if( im && JS9.globalOpts.statusBar ){
	statusbar = JS9.globalOpts.statusBar;
	// remove colorbar if colorbar plugin is instantiated
	pinst = im.display.pluginInstances.JS9Colorbar;
	if( pinst && pinst.isActive() && !this.mycolorbar ){
	    statusbar = statusbar.replace(/\$colorbar;? */, "");
	}
	// escape brackets and parens before macro expansion, then unescape
	s = statusbar
	    .replace(/\(/g, " __OP__ ")
	    .replace(/\)/g, " __CP__ ")
	    .replace(/\[/g, " __OB__ ")
	    .replace(/\]/g, " __CB__ ");
	s = im.expandMacro(s)
	    .replace(/ __OP__ /g, "(")
	    .replace(/ __CP__ /g, ")")
	    .replace(/ __OB__ /g, "[")
	    .replace(/ __CB__ /g, "]");
	if( this.statusBar !== statusbar ){
	    // original statusbar items
	    oarr = statusbar.split(delim);
	    // current values of items in the status bar
	    arr = s.split(delim);
	    for(i=0; i<arr.length; i++){
		t = `<div name='__dummy__' class='JS9StatusbarItem JS9StatusbarItemNoHighlight' onmousedown='JS9.Statusbar.mdown(this)' onmouseup='JS9.Statusbar.mup(this, "${this.display.id}")' onmouseover='JS9.Statusbar.mover(this)' onmouseout='JS9.Statusbar.mout(this)'>${arr[i]}</div>`
		.replace(/\$img\(([^()]+)\)/g, "<img src='$1' name='$1' class='JS9StatusbarImageItem JS9StatusbarItemNoHighlight'>")
		.replace(/\$colorbar/g, `<div name='JS9Colorbar' id='${this.id.replace(/Statusbar/, "Colorbar")}' class='JS9Colorbar JS9StatusbarPluginItem' data-width="${this.colorwidth}px" data-height="${this.colorheight}px" data-colorbarHeight="${this.colorheight}px" data-showTicks="false" ></div>`)
		.replace(/__dummy__/, oarr[i].replace(/\s+/, "_"));
		html += t;
	    }
	    // set statusbar
	    this.statusContainer.html(html);
	    // colorbar plugin: run AddDivs, remove colorbar from resize list
	    if( statusbar.match(/\$colorbar/) ){
		JS9.AddDivs({display: im});
		this.mycolorbar = this.display.pluginInstances.JS9Colorbar;
		index = JS9.globalOpts.resizeDivs.indexOf("JS9Colorbar");
		if( index >= 0 ){
		    JS9.globalOpts.resizeDivs.splice(index, 1);
		}
	    }
	    // save the format to detect future changes
	    this.statusBar = statusbar;
	} else {
	    // elements associated with items in statusbar
	    elements = this.divjq.find(`.JS9StatusbarItem`);
	    arr = s.split(delim);
	    // for each element ...
	    for(i=0; i<elements.length; i++){
		// that is not a plugin ...
		if( arr[i].match(/\$colorbar/) ){
		    // dynamic colorbars have to be displayed manually, since
		    // the colorbar has no way to know the image changed
		    if( this.mycolorbar && this.isDynamic ){
			JS9.Colorbar.display.call(this.mycolorbar, im);
		    }
		} else if( arr[i].match(/\$img/) ){
		    t = arr[i].match(/\$img\((.*)\)/);
		    if( t && t[1] ){
			if( t[1].charAt(0) !== "/" ){
			    t[1] = JS9.InstallDir(t[1]);
			}
			$(elements[i]).find("img").attr("src", t[1]);
		    }
		} else {
		    // set new value
		    $(elements[i]).html(arr[i]);
		}
	    }
	}
    } else {
	// clear statusbar but leave it intact
	if( this.statusBar ){
	    arr = this.statusBar.split(delim);
	    elements = this.divjq.find(`.JS9StatusbarItem`);
	    for(i=0; i<elements.length; i++){
		if( !arr[i].match(/\$colorbar/) ){
		    $(elements[i]).html("");
		}
	    }
	}
    }
};

// constructor: add HTML elements to the plugin
// eslint-disable-next-line no-unused-vars
JS9.Statusbar.init = function(width, height){
    // on entry, these elements have already been defined:
    // this.div:      the DOM element representing the div for this plugin
    // this.divjq:    the jquery object representing the div for this plugin
    // this.id:       the id of the div (or the plugin name as a default)
    // this.display:  the display object associated with this plugin
    // this.dispMode: display mode (for internal use)
    //
    // set width and height of plugin itself
    this.width = this.divjq.attr("data-width");
    if( !this.width  ){
	this.width = width || JS9.Statusbar.WIDTH;
    }
    this.divjq.css("width", this.width);
    this.width = parseInt(this.divjq.css("width"), 10);
    this.height = this.divjq.attr("data-height");
    if( !this.height  ){
	this.height = height || JS9.Statusbar.HEIGHT;
    }
    this.divjq.css("height", this.height);
    this.height = parseInt(this.divjq.css("height"), 10);
    this.colorwidth = parseInt(this.divjq.attr("data-colorbarWidth"), 10) || JS9.Statusbar.COLORWIDTH;
    this.colorheight = parseInt(this.divjq.attr("data-colorbarHeight"), 10) || JS9.Statusbar.COLORHEIGHT;
    // clean plugin container
    this.divjq.html("");
    // status container
    this.statusContainer = $("<div>")
	.addClass(`${JS9.Statusbar.BASE}Container`)
	.attr("id", `${this.id}Container`)
        .attr("width", this.width)
        .attr("height", this.height)
	.appendTo(this.divjq);
    // display current status, if necessary
    if( this.display.image ){
	JS9.Statusbar.display.call(this, this.display.image);
    }
};

// callback when image is (re-)displayed
JS9.Statusbar.imagedisplay = function(im){
    if( im ){
	JS9.Statusbar.display.call(this, im);
    }
};

// callback when image is cleared or closed
// eslint-disable-next-line no-unused-vars
JS9.Statusbar.imageclear = function(im){
    JS9.Statusbar.display.call(this, null);
};

// dynamic change
JS9.Statusbar.dynamic = function(im){
    let status;
    if( im ){
	status = im.display.pluginInstances.JS9Statusbar;
	if( status && status.isDynamic ){
	    JS9.Statusbar.imagedisplay.call(this, im);
	}
    }
};

// add this plugin into JS9
JS9.RegisterPlugin(JS9.Statusbar.CLASS, JS9.Statusbar.NAME, JS9.Statusbar.init,
		   {menuItem: "Statusbar",
		    dynamicSelect: true,
		    ondynamicselect: JS9.Statusbar.dynamic,
		    onimagedisplay: JS9.Statusbar.imagedisplay,
		    onimageclear: JS9.Statusbar.imageclear,
		    onimageclose: JS9.Statusbar.imageclear,
		    onsetwcssys: JS9.Statusbar.imagedisplay,
		    onsetwcsunits: JS9.Statusbar.imagedisplay,
		    help: "help/statusbar.html",
		    winTitle: "Statusbar",
		    winDims: [JS9.Statusbar.WIDTH, JS9.Statusbar.HEIGHT]});
/*
 * image sync plugin (September 2, 2018)
 * whenever an operation is performed on this image, sync the target images
 */

/*global JS9, $ */

"use strict";

JS9.Sync = {};
JS9.Sync.CLASS = "JS9";     // class of plugins (1st part of div class)
JS9.Sync.NAME = "Sync";     // name of this plugin (2nd part of div class)

// process ops input to [un]sync
// called in image context
JS9.Sync.getOps = function(ops){
    let i, j, op;
    const xops = [];
    //  default from above ...
    ops = ops || JS9.globalOpts.syncOps;
    if( !$.isArray(ops) ){ ops = [ops]; }
    for(i=0, j=0; i<ops.length; i++){
	op = ops[i];
	switch(op){
	case "wcs":
	    // wcs is actually two operations
	    xops[j++] = "wcssys";
	    xops[j++] = "wcunits";
	    break;
	default:
	    xops[j++] = op;
	    break;
	}
    }
    return xops;
};

// process ims input to [un]sync
// called in image context
JS9.Sync.getIms = function(ims){
    let i, j, xim;
    const xims = [];
    ims = ims || JS9.images;
    if( !$.isArray(ims) ){ ims = [ims]; }
    for(i=0, j=0; i<ims.length; i++){
	// if image ids were passed, look up corresponding image objects
	if( typeof ims[i] === "string" ){
	    xim = JS9.lookupImage(ims[i]);
	} else {
	    xim = ims[i];
	}
	// exclude the originating image
	if( xim &&
	    (xim.id !== this.id || (xim.display.id !== this.display.id)) ){
	    xims[j++] = xim;
	}
    }
    return xims;
};

// sync image(s) when operations are performed on an originating image
// called in the image context
JS9.Sync.sync = function(...args){
    let i, j, xop, xim, xops, xims, xlen;
    let [ops, ims, opts] = args;
    const arr = [];
    // make sure sink object exists
    this.syncs = this.syncs || {active: true};
    // opts is optional
    opts = opts || {reciprocate: JS9.globalOpts.syncReciprocate};
    // 1 boolean arg: turn on/off sync'ing
    if( args.length === 1 && typeof ops === "boolean" ){
	this.syncs.active = ops;
	return;
    }
    // get regularized args
    xops = JS9.Sync.getOps.call(this, ops);
    xims = JS9.Sync.getIms.call(this, ims);
    xlen = xims.length;
    // reverse current image and target images?
    if( opts.reverse ){
	delete opts.reverse;
	for(i=0; i<xlen; i++){
	    JS9.Sync.sync.call(xims[i], xops, [this]);
	}
	return;
    }
    // for each op (colormap, pan, etc.)
    for(i=0; i<xops.length; i++){
	// current op
	xop = xops[i];
	this.syncs[xop] = this.syncs[xop] || [];
	ims = this.syncs[xop];
	// add images not already in the list
	for(j=0; j<xlen; j++){
	    xim = xims[j];
	    if( $.inArray(xim, ims) < 0 ){
		// add to list
		ims.push(xim);
		// we'll sync each new target image
		arr.push({im: this, xim: xim, xop: xop, xarg: null});
	    }
	}
    }
    // reciprocal sync'ing between all images?
    if( opts.reciprocate ){
	JS9.Sync.reciprocating = true;
	opts.reciprocate = false;
	for(i=0, xim=this; i<xlen; i++){
	    xims.push(xim);
	    xim = xims.shift();
	    JS9.Sync.sync.call(xim, xops, xims, opts);
	}
	delete JS9.Sync.reciprocating;
    }
    // use wcs for syncing
    if( JS9.notNull(opts.syncwcs) ){
	this.tmp.syncwcs = opts.syncwcs;
    } else {
	this.tmp.syncwcs = JS9.globalOpts.syncWCS;
    }
    // sync target image, if necessary
    if( !JS9.Sync.reciprocating ){
	// sync the target images
	JS9.Sync.xeqSync.call(this, arr);
	// flag we are ready to sync on user events
	JS9.Sync.ready = true;
    }
};

// unsync one or more images
// called in the image context
JS9.Sync.unsync = function(ops, ims, opts){
    let i, op, tims, xops, xims, xlen, xim;
    // sanity check
    if( !this.syncs ){
	return;
    }
    // opts is optional
    opts = opts || {reciprocate: JS9.globalOpts.syncReciprocate};
    // get regularized args
    xops = JS9.Sync.getOps.call(this, ops);
    xims = JS9.Sync.getIms.call(this, ims);
    xlen = xims.length;
    // reverse current image and target images?
    if( opts.reverse ){
	delete opts.reverse;
	for(i=0; i<xlen; i++){
	    JS9.Sync.unsync.call(xims[i], xops, [this]);
	}
	return;
    }
    // for each op in this image ...
    for( op in this.syncs ){
	if( this.syncs.hasOwnProperty(op) ){
	    // skip this op if its not in the specified op list
	    if( xops && $.inArray(op, xops) < 0 ){
		continue;
	    }
	    // if no target images specified, delete the whole thing
	    if( !xims ){
		delete this.syncs[op];
	    } else {
		// get target image array for this image
		tims = this.syncs[op];
		// for each target image ...
		for(i=tims.length-1; i>=0; i--){
		    // remove if it was specified for removal
		    if( $.inArray(tims[i], xims) >= 0 ){
			tims.splice(i, 1);
		    }
		}
		// remove empty target image array
		if( !tims.length ){
		    delete this.syncs[op];
		
		}
	    }
	}
    }
    // remove empty sink object from image
    if( !Object.keys(this.syncs).length ){
	delete this.syncs;
    }
    // reciprocal sync'ing between all images?
    if( opts.reciprocate ){
	JS9.Sync.reciprocating = true;
	opts.reciprocate = false;
	for(i=0, xim=this; i<xlen; i++){
	    xims.push(xim);
	    xim = xims.shift();
	    JS9.Sync.unsync.call(xim, xops, xims, opts);
	}
	delete JS9.Sync.reciprocating;
    }
};

// perform a sync action on target images using params from originating image
// called in image context
JS9.Sync.xeqSync = function(arr){
    let i, j, k, obj, pos, wcscen, xim, xarr, xobj, xdata, key, diff;
    let mydata, myobj, myid, rarr, rstr, args, nflip;
    let displays = {};
    const oval = JS9.globalOpts.xeqPlugins;
    const thisid = `${this.id}_${this.display.id}`;
    const regmatch = (r1, r2) => {
	// check for a target region with the same syncid as the current region
	if( !r1.data || !r1.data.syncid ){ return false; }
	if( !r2.data || !r2.data.syncid ){ return false; }
	return r1.data.syncid === r2.data.syncid;
    };
    const calcFlip = (flip) => {
	let i, arr;
	let nx = 0;
	let ny = 0;
	let nflip = "";
	arr = flip.split("");
	for(i=0; i<arr.length; i++){
	    switch(arr[i]){
	    case "x":
		nx++;
		break;
	    case "y":
		ny++;
		break;
	    }
	}
	if( nx % 2 === 1 ){ nflip += "x"; }
	if( ny % 2 === 1 ){ nflip += "y"; }
	return nflip || "";
    }
    // don't recurse!
    if( this.tmp.syncRunning ){ return; }
    this.tmp.syncRunning = true;
    // sync all target images with this operation (but swallow errors)
    try{
	// do regions first to avoid problems with changes to the current image
	for(i=0; i<arr.length; i++){
	    obj = arr[i];
	    if( obj.xop === "regions" ){
		arr.splice(i, 1);
		arr.unshift(obj);
	    }
	}
	// process all operations
	for(i=0; i<arr.length; i++){
	    obj = arr[i];
	    xim = obj.xim;
	    // don't recurse on target image
	    if( xim.syncs ){
		if( xim.tmp.syncRunning ){ continue; }
		xim.tmp.syncRunning = true;
		// if image is not displayed, we'll need to redisplay original
		if( xim !== xim.display.image ){
		    if( !displays[xim.display.id] ){
			displays[xim.display.id] = xim.display.image;
		    }
		}
	    }
	    try{
		switch(obj.xop){
		case "alignment":
		    xim.alignPanZoom(this);
		    break;
		case "colormap":
		    xim.setColormap(this.params.colormap);
		    break;
		case "contrastbias":
		    xim.setColormap(this.params.contrast, this.params.bias);
		    break;
		case "flip":
		    if( this.params.flip != xim.params.flip ){
			nflip = calcFlip(this.params.flip + xim.params.flip);
			xim.setFlip(nflip);
		    }
		    break;
		case "pan":
		    pos = this.getPan();
		    if( this.tmp.syncwcs && this.raw.wcs > 0 ){
			wcscen = JS9.pix2wcs(this.raw.wcs, pos.ox, pos.oy);
			xim.setPan({wcs: wcscen});
		    } else {
			xim.setPan(pos.ox, pos.oy);
		    }
		    break;
		case "regions":
		    // reset args
		    args = [];
		    xarr = null;
		    if( obj.xarg ){
			// region object of the current region
			args.push(obj.xarg);
		    } else {
			// Try to sync all regions in the current image to
			// regions in the target. We will add regions which do
			// not exist in the target, and update those which do.
			if( !rarr ){
			    // get current regions, if necessary
			    rarr = this.getShapes("regions");
			}
			// get regions in the target
			xarr = xim.getShapes("regions");
			// sync all current regions to the target,
			// either adding or updating
			for(j=0; j<rarr.length; j++){
			    // assume we will create a new region
			    rarr[j].mode = "add";
			    // look through the target regions
			    for(k=0; k<xarr.length; k++){
				// if target matches the current region ...
				if( regmatch(xarr[k], rarr[j]) ){
				    // update it as an existing region
				    rarr[j].mode = "update";
				    break;
				}
			    }
			    // we'll either add or update this region
			    args.push(rarr[j]);
			}
		    }
		    // process all regions ...
		    for(j=0; j<args.length; j++){
			// get a copy of the regions object so we can change it
			myobj = $.extend(true, {}, args[j]);
			// get a sync id
			if( myobj.data && myobj.data.syncid ){
			    // reuse its syncid, if possible
			    myid = myobj.data.syncid;
			} else {
			    // otherwise, make up our own syncid
			    myid = `${thisid}_${myobj.id}`;
			}
			// process the action for this region ...
			switch(myobj.mode){
			case "add":
			    // data object with syncid
			    mydata = {doexport: false, syncid: myid};
			    // add the syncid to the new region in this display
			    JS9.globalOpts.xeqPlugins = false;
			    this.changeShapes("regions",
					      myobj.id, {data: mydata});
			    JS9.globalOpts.xeqPlugins = oval;
			    // get the region object for this region
			    rstr = this.listRegions(myobj.id, {mode: 1});
			    // use it to add this region to the target
			    xim.addShapes("regions", rstr, {data: mydata});
			    break;
			case "remove":
			    // get all regions in the target
			    if( !xarr ){
				xarr = xim.getShapes("regions");
			    }
			    for(k=0; k<xarr.length; k++){
				xobj = xarr[k];
				xdata = xobj.data;
				// skip unsync'ed regions
				if( !xdata || !xdata.syncid ){ continue; }
				// if this region is sync'ed remove it
				if( xdata.syncid === myid ){
				    // remove region from the target
				    xim.removeShapes("regions", myid);
				}
			    }
			    break;
			case "move":
			case "update":
			    // account for difference in image scales, angles
			    // no scale factor
			    delete myobj.sizeScale;
			    if( this.raw.wcsinfo && xim.raw.wcsinfo ){
				// scale factor
				if( xim.raw.wcsinfo.cdelt1 ){
				    myobj.sizeScale =
					this.raw.wcsinfo.cdelt1 / xim.raw.wcsinfo.cdelt1;
				}
				// angle for shapes accepting angles
				if( xim.raw.wcsinfo.crot ){
				    if( myobj.shape === "box"     ||
					myobj.shape === "ellipse" ||
					(myobj.shape === "text"   &&
					 !myobj.parent)           ){
					myobj.angle += xim.raw.wcsinfo.crot;
				    }
				}
			    }
			    // get target regions, if necessary
			    if( !xarr ){
				xarr = xim.getShapes("regions");
			    }
			    for(k=0; k<xarr.length; k++){
				xobj = xarr[k];
				xdata = xobj.data;
				if( !xdata || !xdata.syncid ){ continue; }
				if( xdata.syncid === myid ){
				    // apply changes to target region
				    xim.changeShapes("regions", myid, myobj);
				}
			    }
			    break;
			}
		    }
		    break;
		case "rot90":
		    if( this.params.rot90 != xim.params.rot90 ){
			diff = (this.params.rot90 - xim.params.rot90) || 0;
			switch(diff){
			case   90:
			case -270:
			    xim.setRot90(90);
			    break;
			case  -90:
			case  270:
			    xim.setRot90(-90);
			    break;
			default:
			    break;
			}
		    }
		    break;
		case "rotate":
		    if( this.params.rotate != xim.params.rotate ){
			diff = (this.params.rotate - xim.params.rotate) || 0;
			xim.setRotate(diff);
		    }
		    break;
		case "scale":
		    xim.setScale(this.params.scale);
		    break;
		case "wcssys":
		    xim.setWCSSys(this.params.wcssys);
		    break;
		case "wcsunits":
		    xim.setWCSUnits(this.params.wcsunits);
		    break;
		case "zoom":
		    xim.setZoom(this.params.zoom);
		    break;
		}
	    }
	    catch(e){ /* empty */ }
	    finally{
		// done sync'ing
		delete xim.tmp.syncRunning;
	    }
	}
	// revert to display of orginal image where necessary
	for( key in displays ){
	    if( displays.hasOwnProperty(key) ){
		displays[key].displayImage();
	    }
	}
    }
    catch(e){ /* empty */ }
    finally{
	this.displayImage();
	delete this.tmp.syncRunning;
    }
};

// sync images, if necessary
// inner routine called by JS9.xeqPlugins callbacks
// called in image context
JS9.Sync.maybeSync = function(ops, arg){
    let i, j, ims, op, arr;
    // sanity check
    if( !JS9.Sync.ready || !this.syncs || this.tmp.syncRunning ){
	return;
    }
    if( !$.isArray(ops) ){
	ops = [ops];
    }
    // do we need to sync images for this operation?
    if( this.syncs && this.syncs.active ){
	for(j=0; j<ops.length; j++){
	    op = ops[j];
	    if( $.isArray(this.syncs[op]) && this.syncs[op].length ){
		// setup sync of all target images
		ims = this.syncs[op];
		arr = [];
		for(i=0; i<ims.length; i++){
		    arr.push({xim: ims[i], xop: op, xarg: arg});
		}
		// sync target images
		JS9.Sync.xeqSync.call(this, arr);
	    }
	}
    }
};

// called when plugin is intialized on a display
JS9.Sync.init = function(){
    return this;
};

// callbacks which can be synchronized:
// onsetcolormap
JS9.Sync.setcolormap = function(im){
    if( !im ){ return; }
    JS9.Sync.maybeSync.call(im, "colormap");
};

// onchangecontrastbias
JS9.Sync.changecontrastbias = function(im){
    if( !im ){ return; }
    JS9.Sync.maybeSync.call(im, "contrastbias");
};

// onsetflip
JS9.Sync.setflip = function(im){
    if( !im ){ return; }
    JS9.Sync.maybeSync.call(im, ["flip","alignment"]);
};

// onsetpan
JS9.Sync.setpan = function(im){
    if( !im ){ return; }
    JS9.Sync.maybeSync.call(im, ["pan","alignment"]);
};

// onsetrot90
JS9.Sync.setrot90 = function(im){
    if( !im ){ return; }
    JS9.Sync.maybeSync.call(im, ["rot90","alignment"]);
};

// onsetrotate
JS9.Sync.setrotate = function(im){
    if( !im ){ return; }
    JS9.Sync.maybeSync.call(im, ["rotate","alignment"]);
};

// onregionschange
JS9.Sync.regionschange = function(im, xreg){
    if( !im ){ return; }
    switch(xreg.mode){
    case "select":
    case "unselect":
	break;
    default:
	JS9.Sync.maybeSync.call(im, "regions", xreg);
	break;
    }
};

// onsetscale
JS9.Sync.setscale = function(im){
    if( !im ){ return; }
    JS9.Sync.maybeSync.call(im, "scale");
};

// onsetwssys
JS9.Sync.setwcssys = function(im){
    if( !im ){ return; }
    JS9.Sync.maybeSync.call(im, "wcssys");
};

// onsetwcsunits
JS9.Sync.setwcsunits = function(im){
    if( !im ){ return; }
    JS9.Sync.maybeSync.call(im, "wcsunits");
};

// onsetzoom
JS9.Sync.setzoom = function(im){
    if( !im ){ return; }
    JS9.Sync.maybeSync.call(im, ["zoom","alignment"]);
};

// re-init other syncUI interfaces when an image is loaded here
JS9.Sync.loadimage = function(im){
    let i, pinst;
    if( !im ){ return; }
    for(i=0; i<JS9.displays.length; i++){
	pinst = JS9.displays[i].pluginInstances.JS9SyncUI;
	if( pinst && pinst.isActive() ){
	    JS9.SyncUI.init.call(pinst);
	}
    }
};

// clean up an image when its closed
// re-init other syncUI interfaces when an image is closed here
JS9.Sync.closeimage = function(im){
    let i, pinst;
    if( !im ){ return; }
    // remove this image from all other image sync lists
    for(i=0; i<JS9.images.length; i++){
	JS9.Sync.unsync.call(JS9.images[i], null, [im]);
    }
    for(i=0; i<JS9.displays.length; i++){
	pinst = JS9.displays[i].pluginInstances.JS9SyncUI;
	if( pinst && pinst.isActive() ){
	    JS9.SyncUI.init.call(pinst);
	}
    }
};

// add to image prototype and create public API
JS9.Image.prototype.syncImages = JS9.Sync.sync;
JS9.mkPublic("SyncImages", "syncImages");
JS9.Image.prototype.unsyncImages = JS9.Sync.unsync;
JS9.mkPublic("UnsyncImages", "unsyncImages");

// register the plugin
JS9.RegisterPlugin(JS9.Sync.CLASS, JS9.Sync.NAME, JS9.Sync.init,
		   {onsetcolormap:   JS9.Sync.setcolormap,
		    onsetflip:       JS9.Sync.setflip,
		    onsetpan:        JS9.Sync.setpan,
		    onregionschange: JS9.Sync.regionschange,
		    onsetrot90:      JS9.Sync.setrot90,
		    onsetrotate:     JS9.Sync.setrotate,
		    onsetscale:      JS9.Sync.setscale,
		    onsetwcssys:     JS9.Sync.setwcssys,
		    onsetwcsunits:   JS9.Sync.setwcsunits,
		    onsetzoom:       JS9.Sync.setzoom,
		    onchangecontrastbias: JS9.Sync.changecontrastbias,
		    onimageload:     JS9.Sync.loadimage,
		    onimageclose:    JS9.Sync.closeimage,
		    winDims: [0, 0]});
/*
 * image sync ui plugin (September 2, 2018)
 * user interface for virtual sync plugin
 */

/*global JS9, $, sprintf */

"use strict";

JS9.SyncUI = {};
JS9.SyncUI.CLASS = "JS9";     // class of plugins (1st part of div class)
JS9.SyncUI.NAME = "SyncUI";   // name of this plugin (2nd part of div class)
JS9.SyncUI.WIDTH =  512;      // width of light window
JS9.SyncUI.HEIGHT = 430;      // height of light window
JS9.SyncUI.BASE = JS9.SyncUI.CLASS + JS9.SyncUI.NAME;  // CSS base class name

JS9.SyncUI.HEADER = "<div class='JS9SyncUIText'><br><b>%s:</b></div>";
JS9.SyncUI.NCOL = 3;	     // number of columns in the ops display
JS9.SyncUI.COLWIDTH = 175;   // width of each ops column

JS9.SyncUI.headerHTML="Synchronize two or more images, so that when an operation is performed on one image, it also is performed on the other(s). Or sync once only.";

JS9.SyncUI.opHTML="$opactive&nbsp;&nbsp;$opname";

JS9.SyncUI.opactiveHTML='<input class="JS9SyncUIOpCheck" type="checkbox" name="%s" value="active"">';

JS9.SyncUI.opnameHTML='<b>%s</b>';

JS9.SyncUI.imageHTML="$imactive&nbsp;&nbsp;$imfile";

JS9.SyncUI.imactiveHTML='<input class="JS9SyncUIImCheck" type="checkbox" name="%s" value="active">';

JS9.SyncUI.imfileHTML='<b>%s</b>';

JS9.SyncUI.nofileHTML='<p><span class="JS9SyncUINoFile">[Images will appear here as they are loaded]</span>';

JS9.SyncUI.optsHTML='<div class="JS9SyncUIOptsRow">$reciprocate&nbsp;&nbsp;$syncwcs</div>';

JS9.SyncUI.reciprocalHTML='<span class="JS9SyncUIOpts" style="position:absolute; left:%spx; top:0px"><input class="JS9SyncUIOptsCheck" type="checkbox" name="%s" value="active" onchange="javascript:JS9.SyncUI.xrecip(\'%s\', this)">&nbsp;&nbsp;<b>%s</b></span>';

JS9.SyncUI.syncwcsHTML='<span class="JS9SyncUIOpts" style="position:absolute; left:%spx; top:0px"><input class="JS9SyncUIOptsCheck" type="checkbox" name="%s" value="active" onchange="javascript:JS9.SyncUI.xsyncwcs(\'%s\', this)">&nbsp;&nbsp;<b>%s</b></span>';

JS9.SyncUI.footerHTML='<div class="JS9SyncUIButtons" <p><span style="float:right;">$cancel&nbsp;&nbsp;$sync&nbsp;&nbsp;&nbsp;&nbsp;$once&nbsp;&nbsp;&nbsp;&nbsp;$unsync</span></div>';

JS9.SyncUI.cancelHTML='<span class="JS9SyncUIButton"><input type="button" class="JS9Button2 JS9SyncUIButton" id="active" name="sync" value="Cancel" onclick="javascript:JS9.SyncUI.xcancel(\'%s\', this)" %s></span>';

JS9.SyncUI.syncHTML='<span class="JS9SyncUIButton"><input type="button" class="JS9RunButton JS9SyncUIButton" id="active" name="sync" value="Sync Repeatedly" onclick="javascript:JS9.SyncUI.xsync(\'%s\', this)"></span>';

JS9.SyncUI.onceHTML='<span class="JS9SyncUIButton"><input type="button" class="JS9RunButton JS9SyncUIButton" id="active" name="once" value="Sync Once" onclick="javascript:JS9.SyncUI.xonce(\'%s\', this)"></span>';

JS9.SyncUI.unsyncHTML='<span class="JS9SyncUIButton"><input type="button" class="JS9RunButton JS9SyncUIButton" id="active" name="unsync" value="Unsync" onclick="javascript:JS9.SyncUI.xunsync(\'%s\', this)"></span>';


JS9.SyncUI.getImsOpsOpts = function(el){
    const container = el.closest(".JS9SyncUIContainer");
    const ops = [];
    const ims = [];
    const opts = {};
    if( container.length ){
	// gather all selected images
	container.find(".JS9SyncUIImCheck").each((index, element) => {
	    let name = $(element).prop("name");
	    let checked = $(element).prop("checked");
	    if( checked ){
		ims.push(name);
	    }
	});
	// gather all selected ops
	container.find(".JS9SyncUIOpCheck").each((index, element) => {
	    let name = $(element).prop("name");
	    let checked = $(element).prop("checked");
	    if( checked ){
		ops.push(name);
	    }
	});
	// get opts
	container.find(".JS9SyncUIOptsCheck").each((index, element) => {
	    let name = $(element).prop("name");
	    let checked = $(element).prop("checked");
	    opts[name] = checked;
	});
    }
    return {ims, ops, opts};
};

// cancel
// eslint-disable-next-line no-unused-vars
JS9.SyncUI.xcancel = function(did, target){
    let plugin;
    const display = JS9.getDynamicDisplayOr(JS9.lookupDisplay(did));
    if( display ){
	plugin = display.pluginInstances.JS9SyncUI;
	if( plugin && plugin.winHandle ){
	    plugin.winHandle.close();
	}
    }
};

// sync
JS9.SyncUI.xsync = function(did, target){
    let im;
    const display = JS9.getDynamicDisplayOr(JS9.lookupDisplay(did));
    if( display.image ){
	im = display.image;
	// get ims and opts
	const {ims, ops, opts} = JS9.SyncUI.getImsOpsOpts($(target));
	// sync images, if necessary
	if( ims.length && ops.length ){
	    im.syncImages(ops, ims, opts);
	}
	JS9.SyncUI.setCheckboxes(im);
    }
};

// sync once
JS9.SyncUI.xonce = function(did, target){
    let im;
    const display = JS9.getDynamicDisplayOr(JS9.lookupDisplay(did));
    if( display.image ){
	im = display.image;
	// get ims and opts
	const {ims, ops} = JS9.SyncUI.getImsOpsOpts($(target));
	// copy params, if necessary
	if( ims.length && ops.length ){
	    im.copyParams(ops, ims);
	    JS9.SyncUI.setCheckboxes(im);
	}
    }
};

// unsync
JS9.SyncUI.xunsync = function(did, target){
    let im;
    const display = JS9.getDynamicDisplayOr(JS9.lookupDisplay(did));
    if( display.image ){
	im = display.image;
	// get ims and opts
	const {ims, ops, opts} = JS9.SyncUI.getImsOpsOpts($(target));
	// unsync images, if necessary
	if( ims.length && ops.length ){
	    im.unsyncImages(ops, ims, opts);
	}
	JS9.SyncUI.setCheckboxes(im);
    }
};

JS9.SyncUI.xrecip = function(did, target){
    let pinst;
    const display = JS9.getDynamicDisplayOr(JS9.lookupDisplay(did));
    if( display ){
	pinst = display.pluginInstances.JS9SyncUI;
	pinst.syncReciprocate = $(target).is(':checked');
    }
};

JS9.SyncUI.xsyncwcs = function(did, target){
    let pinst;
    const display = JS9.getDynamicDisplayOr(JS9.lookupDisplay(did));
    if( display ){
	pinst = display.pluginInstances.JS9SyncUI;
	pinst.syncWCS = $(target).is(':checked');
    }
};

// get a SyncImage id based on the file image id
JS9.SyncUI.imid = function(im){
    const id = `${im.display.id}_${im.id}`;
    return `${id.replace(/[^A-Za-z0-9_]/g, "_")}SyncImage`;
};

// set checkbox for sync'ed options
JS9.SyncUI.setCheckboxes = function(im){
    let i, j, id, op, syncops, pinst;
    // sanity check
    if( !im ){
	return
    }
    // get current instance of this plugin
    pinst = im.display.pluginInstances.JS9SyncUI;
    // first turn all checkboxes off
    pinst.syncContainer.find(".JS9SyncUIOpCheck").prop("checked", false);
    pinst.syncContainer.find(".JS9SyncUIImCheck").prop("checked", false);
    pinst.syncContainer.find(".JS9SyncUIOptsCheck").prop("checked", false);
    // then turn on currently syn'ed options
    syncops = JS9.globalOpts.syncOps;
    // for each sync'ed op in this image ...
    if( im.syncs ){
	for(i=0; i<syncops.length; i++){
	    // get the op
	    op = syncops[i];
	    if( $.isArray(im.syncs[op]) ){
		// turn on the checkbox associated with this op
		pinst.syncContainer
		    .find(".JS9SyncUIOpCheck")
		    .filter(`[name='${op}']`)
		    .prop("checked", true);
		// for each file associated with the sync'ed op
		for(j=0; j<im.syncs[op].length; j++){
		    if( JS9.isImage(im.syncs[op][j]) ){
			// jquery doesn't like brackets in names
			id = im.syncs[op][j].id.replace(/\[.*\]/, "");
			// turn on the checkbox associated with this file
			pinst.syncContainer
			    .find(".JS9SyncUIImCheck")
			    .filter(`[name^='${id}']`)
			    .prop("checked", true);
		    }
		}
	    }
	}
    }
    // options
    pinst.syncContainer
	.find(".JS9SyncUIOptsCheck")
	.filter(`[name="reciprocate"]`)
	.prop("checked", pinst.syncReciprocate);
    pinst.syncContainer
	.find(".JS9SyncUIOptsCheck")
	.filter(`[name="syncwcs"]`)
	.prop("checked", pinst.syncWCS);
};

// add a sync op to the list of available ops
JS9.SyncUI.addOp = function(op, ncol){
    let s, left, top, opname;
    const opts = [];
    const cls = `${JS9.SyncUI.BASE}Op`;
    // pre-processing
    switch(op){
    case "contrastbias":
	opname = "contrast/bias";
	break;
    case "wcs":
	opname = "wcs sys/units";
	break;
    default:
	opname = op;
	break;
    }
    // value to pass to the macro expander
    opts.push({name: "op", value: op});
    opts.push({name: "opactive", value: sprintf(JS9.SyncUI.opactiveHTML, op)});
    opts.push({name: "opname", value: sprintf(JS9.SyncUI.opnameHTML, opname)});
    // create the html for this op
    s = JS9.Image.prototype.expandMacro.call(null, JS9.SyncUI.opHTML, opts);
    this.syncOpDivs++;
    // add op to the op container at the specified column
    left = ncol * JS9.SyncUI.COLWIDTH;
    top = 0;
    return `<span class="JS9SyncUIOp" style="position:absolute; left:${left}px; top:${top}px" id="${cls}">${s}</span>`;
};

// add an image to the list of available images
JS9.SyncUI.addImage = function(im){
    let s, id, imid;
    const opts = [];
    const cls = `${JS9.SyncUI.BASE}ImageRow`;
    if( !im ){
	return;
    }
    // convenience variables
    imid = im.id;
    // unique id
    id = JS9.SyncUI.imid(im);
    // value to pass to the macro expander
    opts.push({name: "imid", value: im.id});
    opts.push({name: "imactive", value: sprintf(JS9.SyncUI.imactiveHTML, imid)});
    opts.push({name: "imfile", value: sprintf(JS9.SyncUI.imfileHTML, imid)});
    // create the html for this image
    s = im.expandMacro(JS9.SyncUI.imageHTML, opts);
    // one more div in the stack
    this.syncImageDivs++;
    // return image html to add to the image container
    return `<div class="${cls}" id="${id}">${s}</div>`;
};

// remove an image from the list of available images
JS9.SyncUI.removeImage = function(im){
    let id;
    if( im ){
	id = JS9.SyncUI.imid(im);
	$(`#${id}`).remove();
	this.syncImageDivs--;
	if( !this.syncImageDivs ){
	    this.syncImageContainer.html("");
	}
	return true;
    }
    return false;
};

// constructor: add HTML elements to the plugin
JS9.SyncUI.init = function(){
    let i, j, s, im, op, dispid, imhead, ophead, opts, nrow, idx, syncops, html;
    // on entry, these elements have already been defined:
    // this.div:      the DOM element representing the div for this plugin
    // this.divjq:    the jquery object representing the div for this plugin
    // this.id:       the id ofthe div (or the plugin name as a default)
    // this.display:  the display object associated with this plugin
    // this.dispMode: display mode (for internal use)
    //
    // sanity check since we are always active
    if( !this.divjq || !this.divjq.is(":visible") ){
	return;
    }
    // clean main container
    this.divjq.html("");
    // no images/divs loaded yet
    this.syncOpDivs = 0;
    this.syncImageDivs = 0;
    // allow scrolling on the plugin
    this.divjq.addClass("JS9PluginScrolling");
    // init reciprocate
    if( JS9.isNull(this.syncReciprocate) ){
	this.syncReciprocate = JS9.globalOpts.syncReciprocate;
    }
    // init syncwcs
    if( JS9.isNull(this.syncWCS) ){
	this.syncWCS = JS9.globalOpts.syncWCS;
    }
    // convenience variables
    dispid = this.display.id;
    if( this.display.image ){
	this.lastim = this.display.image;
	imhead = sprintf(JS9.SyncUI.HEADER,
			 `Images that can be synced with ${this.lastim.id}`);
    } else {
	this.lastim = null;
	imhead = sprintf(JS9.SyncUI.HEADER,
			 `Images that can be synced`);
    }
    // main container
    this.syncContainer = $("<div>")
	.addClass(`${JS9.SyncUI.BASE}Container`)
	.attr("id", `${this.id}SyncContainer`)
        .css("overflow", "auto")
	.appendTo(this.divjq);
    s = JS9.Image.prototype.expandMacro.call(null, JS9.SyncUI.headerHTML);
    // header
    this.syncHeader = $("<div>")
	.addClass(`${JS9.SyncUI.BASE}Header`)
	.attr("id", `${dispid}Header`)
	.html(s)
	.appendTo(this.syncContainer);
    // container to hold images
    this.syncImageContainer = $("<div>")
	.addClass(`${JS9.SyncUI.BASE}ImageContainer`)
	.attr("id", `${this.id}SyncImageContainer`)
	.html(imhead)
	.appendTo(this.syncContainer);
    // add images
    html = "";
    for(i=0; i<JS9.images.length; i++){
	im = JS9.images[i];
	if( im !== this.display.image && im.getStatus("close") !== "closing" ){
	    html += JS9.SyncUI.addImage.call(this, im);
	}
    }
    html = html || JS9.SyncUI.nofileHTML;
    this.syncImageContainer.append(html);
    // add sync operations
    // NB: this double loop originally was written such that each div and span
    // was added to the DOM separately ... but not all of the spans actually
    // were added properly. This stackoverflow page:
    // https://stackoverflow.com/questions/1539841/wait-until-previous-append-is-complete
    // give the hint to generate one long html string and add all the spans
    // at once, which seems to work properly.
    // container to hold ops
    this.syncOpContainer = $("<div>")
	.addClass(`${JS9.SyncUI.BASE}OpContainer`)
	.attr("id", `${this.id}SyncOpContainer`)
        .html(sprintf(JS9.SyncUI.HEADER, "Operations that can be synced"))
	.appendTo(this.syncContainer);
    syncops = JS9.globalOpts.syncOps;
    nrow = Math.floor((syncops.length + JS9.SyncUI.NCOL - 1) / JS9.SyncUI.NCOL);
    for(j=0; j<nrow; j++){
	html = `<div class="${JS9.SyncUI.BASE}OpRow" id="${this.id}SyncOpRow">`;
	for(i=0; i<JS9.SyncUI.NCOL; i++){
	    idx = i * nrow + j;
	    if( syncops[idx] ){
		op = syncops[idx];
		html += JS9.SyncUI.addOp.call(this, op, i);
	    }
	}
	html += "</div>";
	this.syncOpContainer.append(html);
    }
    // options
    // container to hold images
    ophead = sprintf(JS9.SyncUI.HEADER, `Sync options`);
    this.syncOptsContainer = $("<div>")
	.addClass(`${JS9.SyncUI.BASE}OptsContainer`)
	.attr("id", `${this.id}SyncOptsContainer`)
	.html(ophead)
	.appendTo(this.syncContainer);
    opts = [];
    opts.push({name: "reciprocate", value: sprintf(JS9.SyncUI.reciprocalHTML, JS9.SyncUI.COLWIDTH * 0, "reciprocate", dispid, "reciprocal sync")});
    opts.push({name: "syncwcs", value: sprintf(JS9.SyncUI.syncwcsHTML, JS9.SyncUI.COLWIDTH * 1, "syncwcs", dispid, "sync using wcs")});
    s = JS9.Image.prototype.expandMacro.call(null, JS9.SyncUI.optsHTML, opts);
    // footer
    this.syncOpts = $("<div>")
	.attr("id", `${dispid}Opts`)
	.html(s)
	.appendTo(this.syncOptsContainer);
    // footer containing run buttons
    opts = [];
    opts.push({name: "cancel", value: sprintf(JS9.SyncUI.cancelHTML, dispid,
	       this.winHandle ? "" : 'style="display:none;"')});
    opts.push({name: "sync", value: sprintf(JS9.SyncUI.syncHTML, dispid)});
    opts.push({name: "once", value: sprintf(JS9.SyncUI.onceHTML, dispid)});
    opts.push({name: "unsync", value: sprintf(JS9.SyncUI.unsyncHTML, dispid)});
    s = JS9.Image.prototype.expandMacro.call(null, JS9.SyncUI.footerHTML, opts);
    // footer
    this.syncFooter = $("<div>")
	.addClass(`${JS9.SyncUI.BASE}Footer`)
	.attr("id", `${dispid}Footer`)
	.html(s)
	.appendTo(this.syncContainer);
    // initialize sync values for this image
    if( this.display.image ){
	JS9.SyncUI.setCheckboxes(this.display.image);
    }
};

// callback when plugin is redisplayed
// eslint-disable-next-line no-unused-vars
JS9.SyncUI.reinit = function(im){
    JS9.SyncUI.init.call(this);
};

// callback when an image is loaded
JS9.SyncUI.imageload = function(im){
    if( !im ){ return; }
    JS9.SyncUI.init.call(this);
};

// callback when an image is displayed
JS9.SyncUI.imagedisplay = function(im){
    if( im && im !== this.lastim ){
	JS9.SyncUI.init.call(this);
    }
};

// clean up an image when its closed
JS9.SyncUI.imageclose = function(im){
    let i;
    if( !im ){ return; }
    // remove this image from all other image sync lists
    for(i=0; i<JS9.images.length; i++){
	JS9.SyncUI.unsync.call(JS9.images[i], null, [im]);
    }
    JS9.SyncUI.init.call(this);
};

// register the plugin
JS9.RegisterPlugin(JS9.SyncUI.CLASS, JS9.SyncUI.NAME, JS9.SyncUI.init,
		   {menuItem:        "Sync Images",
		    onplugindisplay: JS9.SyncUI.reinit,
		    onimagedisplay:  JS9.SyncUI.imagedisplay,
		    onimageload:     JS9.SyncUI.imageload,
		    onimageclose:    JS9.SyncUI.imageclose,
		    help:            "help/syncui.html",
		    winTitle:        "Sync Images",
		    winDims: [JS9.SyncUI.WIDTH, JS9.SyncUI.HEIGHT]});
/*
 * toolbar plugin (February 6, 2018)
 */

/*global $, JS9 */

"use strict";

// create our namespace, and specify some meta-information and params
JS9.Toolbar = {};
JS9.Toolbar.CLASS = "JS9";        // class of plugins (1st part of div class)
JS9.Toolbar.NAME = "Toolbar";    // name of plugin (2nd part of div class)
JS9.Toolbar.WIDTH =  512;	 // width of light window
JS9.Toolbar.HEIGHT = 36;         // height of light window
JS9.Toolbar.BASE = JS9.Toolbar.CLASS + JS9.Toolbar.NAME;
JS9.Toolbar.IMAGEWIDTH  = 24;
JS9.Toolbar.IMAGEHEIGHT = 24;
JS9.Toolbar.TOOLBARHEIGHT = 36;
// hacky offsets to place tooltips nicely
// why are lighwins different from static elements?
JS9.Toolbar.TOOLTIPX = 30;
JS9.Toolbar.TOOLTIPY = 50;
JS9.Toolbar.TOOLTIPLX = 30;
JS9.Toolbar.TOOLTIPLY = 82;

JS9.Toolbar.tools = [
  {
    "name": "linear",
    "tip": "linear scale",
    "cmd": "SetScale",
    "args": ["linear"]
  },
  {
    "name": "log",
    "tip": "log scale",
    "cmd": "SetScale",
    "args": ["log"]
  },
  {
    "name": "histeq",
    "tip": "histogram equalization",
    "cmd": "SetScale",
    "args": ["histeq"]
  },
  {
    "name": "power",
    "tip": "power scale",
    "cmd": "SetScale",
    "args": ["power"]
  },
  {
    "name": "sqrt",
    "tip": "square root scale",
    "cmd": "SetScale",
    "args": ["sqrt"]
  },
  {
    "name": "asinh",
    "tip": "asinh scale",
    "cmd": "SetScale",
    "args": ["asinh"]
  },
  {
    "name": "sinh",
    "tip": "sinh scale",
    "cmd": "SetScale",
    "args": ["sinh"]
  },
  {
    "name": "squared",
    "tip": "squared scale",
    "cmd": "SetScale",
    "args": ["squared"]
  },
  {
    "name": "annulus",
    "tip": "annulus region",
    "image": "images/voyager/regions_annulus.svg",
    "cmd": "AddRegions",
    "args": ["annulus"]
  },
  {
    "name": "box",
    "tip": "box region",
    "image": "images/voyager/regions_box.svg",
    "cmd": "AddRegions",
    "args": ["box"]
  },
  {
    "name": "circle",
    "tip": "circle region",
    "image": "images/voyager/regions_circle.svg",
    "cmd": "AddRegions",
    "args": ["circle"]
  },
  {
    "name": "ellipse",
    "tip": "ellipse region",
    "image": "images/voyager/regions_ellipse.svg",
    "cmd": "AddRegions",
    "args": ["ellipse"]
  },
  {
    "name": "line",
    "tip": "line region",
    "image": "images/voyager/regions_line.svg",
    "cmd": "AddRegions",
    "args": ["line"]
  },
  {
    "name": "polygon",
    "tip": "polygon region",
    "image": "images/voyager/regions_polygon.svg",
    "cmd": "AddRegions",
    "args": ["polygon"]
  },
  {
    "name": "text",
    "tip": "text region",
    "image": "images/voyager/regions_text.svg",
    "cmd": "AddRegions",
    "args": ["text"]
  },
  {
    "name": "inc/excl",
    "tip": "toggle selected region incl/excl",
    // "image": "images/toolbar/dax_images/incexl.png",
    "cmd": "ToggleRegionTags",
    "args": ["selected", "include", "exclude"]
  },
  {
    "name": "src/bkg",
    "tip": "toggle selected region src/bkg",
    // "image": "images/toolbar/dax_images/srcbkg.png",
    "cmd": "ToggleRegionTags",
    "args": ["selected", "source", "background"]
  },
  {
    "name": "remove",
    "tip": "remove selected region",
    // "image": "images/toolbar/dax_images/erase.png",
    "cmd": "RemoveRegions",
    "args": ["selected"]
  },
  {
    "name": "zoom+",
    "image": "images/voyager/zoom_in.svg",
    "tip": "zoom in",
    "cmd": "SetZoom",
    "args": ["x2"]
  },
  {
    "name": "zoom-",
    "image": "images/voyager/zoom_out.svg",
    "tip": "zoom out",
    "cmd": "SetZoom",
    "args": ["/2"]
  },
  {
    "name": "zoom1",
    "tip": "zoom 1",
    "image": "images/voyager/zoom_1.svg",
    "cmd": "SetZoom",
    "args": [1]
  },
  {
    "name": "zoomtofit",
    "tip": "zoom to fit",
    "image": "images/voyager/zoom_tofit.svg",
    "cmd": "SetZoom",
    "args": ["toFit"]
  },
  {
    "name": "open",
    "tip": "open local file dialog box",
    "cmd": "OpenFileMenu",
    "args": []
  },
  {
    "name": "infobox",
    "tip": "toggle infobox display",
    "cmd": "DisplayPlugin",
    "args": ["JS9Info"]
  },
  {
    "name": "magnifier",
    "tip": "toggle magnifier display",
    // "image": "images/toolbar/dax_images/mag.png",
    "cmd": "DisplayPlugin",
    "args": ["JS9Magnifier"]
  },
  {
    "name": "panner",
    "tip": "toggle panner display",
    // "image": "images/toolbar/dax_images/pan.png",
    "cmd": "DisplayPlugin",
    "args": ["JS9Panner"]
  },
  {
    "name": "prefs",
    "tip": "toggle preferences display",
    "cmd": "DisplayPlugin",
    "args": ["JS9Preferences"]
  }
];

JS9.Toolbar.tooltip = function(tool, tooltip, e){
    let x, y, w, offset;
    if( tooltip ){
	offset = $(e.currentTarget).position();
	this.tooltip.html(tooltip);
	if( this.winType === "light" ){
	    x = offset.left + JS9.Toolbar.TOOLTIPLX;
	    y = offset.top - JS9.Toolbar.TOOLTIPLY;
	} else {
	    x = offset.left + JS9.Toolbar.TOOLTIPX;
	    y = offset.top - JS9.Toolbar.TOOLTIPY;
	}
	w = this.tooltip.width();
	// desperate attempt to place the tooltip properly
	if( (x + w + 20) > this.width ){
	    x = offset.left - w - 20;
	}
	this.tooltip.css({left: x, top: y, display: "inline-block"});
    } else {
	this.tooltip.html("").css({left: -9999, display: "none"});
    }
    return;
};

// add a tool to the toolbar
JS9.Toolbar.addTool = function(tool){
    let div, btn, img;
    // special processing: no args means return current list of tools
    if( !tool ){
	return JS9.Toolbar.tools;
    }
    // special processing: add "break" between section
    if( tool === "$break" ){
	$("<hr>").appendTo(this.activeToolbar);
	return;
    }
    // sanity check on a real tool
    if( !tool.name || !tool.cmd ){
	JS9.error(`invalid input to JS9.toolbar: ${JSON.stringify(tool)}`);
    }
    // enclosing div
    div = $("<div>")
	.addClass(`${JS9.Toolbar.BASE}ButtonDiv`)
	.appendTo(this.activeToolbar);
    // create the button
    if( tool.image ){
	// relative path: add install dir prefix
	img = tool.image;
	if( JS9.inline && JS9.inline[img] ){
	    // inline version is available
	    img = JS9.inline[img];
	} else if( img.charAt(0) !== "/" ){
	    // external version
	    img = JS9.InstallDir(img);
	}
	btn = $("<input>")
	    .addClass(`${JS9.Toolbar.BASE}ImageButton`)
	    .attr("type", "image")
	    .attr("src", img)
	    .attr("width", JS9.Toolbar.IMAGEWIDTH)
	    .attr("height", JS9.Toolbar.IMAGEHEIGHT)
	    .attr("alt", tool.name)
	    .appendTo(div);
    } else {
	btn = $("<input>")
	    .addClass(`${JS9.Toolbar.BASE}ButtonButton`)
	    .attr("type", "button")
	    .attr("value", tool.name)
	    .appendTo(div);
    }
    // set up the callback to the JS9 public access routine
    btn.on("click", () => {
	let args;
	const display = this.display;
	// special processing for commands
	switch(tool.cmd){
        default:
            if( typeof JS9.publics[tool.cmd] === "function" ){
                // clone the array and any objects it contains
                args = JSON.parse(JSON.stringify(tool.args||[]));
                args.push({display: display});
                JS9.publics[tool.cmd](...args);
            } else {
		JS9.error(`unknown JS9 func for toolbar: ${tool.cmd}`);
	    }
            break;
        }
    });
    // tool tip is optional
    if( JS9.globalOpts.toolbarTooltips ){
	btn.on("mouseover", (e) => {
	    JS9.Toolbar.tooltip.call(this, tool, tool.tip||tool.name, e);
	});
	btn.on("mouseout", (e) => {
	    JS9.Toolbar.tooltip.call(this, tool, null, e);
	});
    }
    // return something possible useful
    tool.btn = btn;
    return tool;
};

// constructor: add HTML elements to the plugin
JS9.Toolbar.init = function(width, height){
    let i, j, tool, name;
    // on entry, these elements have already been defined:
    // this.div:      the DOM element representing the div for this plugin
    // this.divjq:    the jquery object representing the div for this plugin
    // this.id:       the id of the div (or the plugin name as a default)
    // this.display:  the display object associated with this plugin
    // this.dispMode: display mode (for internal use)
    //
    this.width = this.divjq.attr("data-width");
    if( !this.width  ){
	this.width = width || JS9.Toolbar.WIDTH;
    }
    this.divjq.css("width", this.width);
    this.width = parseInt(this.divjq.css("width"), 10);
    this.height = this.divjq.attr("data-height");
    if( !this.height ){
	this.height = height || JS9.Toolbar.HEIGHT;
    }
    this.divjq.css("height", this.height);
    this.height = parseInt(this.divjq.css("height"), 10);
    // clean plugin container
    this.divjq.html("");
    // toolbar container
    this.toolbarContainer = $("<div>")
	.addClass(`${JS9.Toolbar.BASE}Container`)
	.attr("id", `${this.id}Container`)
	.appendTo(this.divjq);
    // toolbar
    this.activeToolbar = $("<div>")
	.addClass(`${JS9.Toolbar.BASE}Div`)
	.attr("id", `${this.id}Toolbar`)
        .css("width", this.width)
        .css("height", this.height)
        .css("min-height", JS9.Toolbar.TOOLBARHEIGHT)
	.appendTo(this.toolbarContainer);
    // add a tooltip
    this.tooltip = $("<div>")
	.attr("id", `tooltip_${this.id}`)
	.addClass("JS9ToolbarTooltip")
	.appendTo(this.divjq);
    // add tools from globalOpts to the list
    for(j=0; j<JS9.globalOpts.toolBar.length; j++){
	name = JS9.globalOpts.toolBar[j];
	for(i=0; i<JS9.Toolbar.tools.length; i++){
	    tool = JS9.Toolbar.tools[i];
	    if( name === tool.name ){
		JS9.Toolbar.addTool.call(this, tool);
	    }
	}
    }
    // add a break between important tools and the rest
    JS9.Toolbar.addTool.call(this, "$break");
    // add tools not in the globalOpts to the bottom of the list
    for(i=0; i<JS9.Toolbar.tools.length; i++){
	tool = JS9.Toolbar.tools[i];
	if( $.inArray(tool.name, JS9.globalOpts.toolBar) < 0 ){
	    JS9.Toolbar.addTool.call(this, tool);
	}
    }
    return JS9.Toolbar.tools;
};

// public access routines

// GetToolbar: get current tools
JS9.mkPublic("GetToolbar", function(...args){
    let arg1;
    const obj = JS9.parsePublicArgs(args);
    arg1 = obj.argv[0];
    if( arg1 === "showTooltips" ){
	return JS9.globalOpts.toolbarTooltips;
    }
    return JS9.Toolbar.tools;
});

// SetToolbar: add new tools to the toolbar
JS9.mkPublic("SetToolbar", function(...args){
    let i, arg1, arg2;
    const obj = JS9.parsePublicArgs(args);
    const reinit = () => {
	let i, display, pinst;
	for(i=0; i<JS9.displays.length; i++){
	    display = JS9.displays[i];
	    pinst = display.pluginInstances.JS9Toolbar;
	    if( pinst ){
		JS9.Toolbar.init.call(pinst);
	    }
	}
    };
    arg1 = obj.argv[0];
    arg2 = obj.argv[1];
    // no args: reinit toolbar and return
    if( !arg1 ){
	return;
    }
    // special processing
    if( arg1 === "init" ){
	// reinit toolbar
	reinit();
	return;
    } else if( arg1 === "showTooltips" ){
	// change value
	JS9.globalOpts.toolbarTooltips = !!arg2;
	// reinit toolbar
	reinit();
	return;
    } else if( typeof arg1 === "string" ){
	// arg1 can be an object or json
	try{ arg1 = JSON.parse(arg1); }
	catch(e){ JS9.error(`can't parse json for SetToolBar: ${arg1}`, e); }
	// add one new tool
	JS9.Toolbar.tools.push(arg1);
	// reinit toolbar
	reinit();
    } else if( $.isArray(arg1) ){
	// array of new tools
	for(i=0; i<arg1.length; i++){
	    JS9.Toolbar.tools.push(arg1[i]);
	}
	// reinit toolbar
	reinit();
    } else if( typeof arg1 === "object" ){
	// add one new tool
	JS9.Toolbar.tools.push(arg1);
	// reinit toolbar
	reinit();
    }
    return null;
});

// add plugin into JS9
JS9.RegisterPlugin(JS9.Toolbar.CLASS, JS9.Toolbar.NAME, JS9.Toolbar.init,
		   {menuItem: "Toolbar",
		    help: "help/toolbar.html",
		    winTitle: "Toolbar",
		    winDims: [JS9.Toolbar.WIDTH, JS9.Toolbar.HEIGHT]});
require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"./imexam":[function(require,module,exports){
/*jslint white: true, vars: true, plusplus: true, nomen: true, unparam: true, bitwise: true */
/*globals Float32Array, Int32Array, JS9, $ */ 

"use strict";

var ndops =                     require("typed-array-function");
    ndops = ndops.extend(ndops, require("typed-array-ops"));
    ndops = ndops.extend(ndops, require("typed-numeric-uncmin"));

    ndops.rotate  = require("typed-array-rotate");

ndops.mask    = require("./mask.js");
var template  = require("./template");

var typed = ndops;

ndops.zeros   = function zeros(shape, Type) {
  var i, sz = 1;
  var ishape = [];
  if ( Type === undefined ) {
	Type = Float32Array;
  }

  for(i=0; i<shape.length; ++i) {
    ishape.push(Math.floor(shape[i]));
    sz *= ishape[i];
  }

  return ndops.ndarray(new Type(sz), ishape);
};

ndops.fill = typed(function (a, func) {
    var index = [];
    // ----
	a = func.apply(undefined, index);
});




      exports.fixupDiv = function (plugin) {

	if ( plugin.winType === "div" ) {
	    plugin.outerdivjq.find(".drag-handle").html(plugin.plugin.opts.winTitle);

	    var toolbar = plugin.outerdivjq.find(".JS9PluginToolbar-div");

	    toolbar.css("cursor", "default");
	    toolbar.css("right", 0);
	}
      };

var imops = {};

ndops.maxvalue = ndops.sup;
ndops.minvalue = ndops.inf;

ndops.size = function(shape) {
        var i;
        var size = 1;
        for ( i = 0; i < shape.length; i++ ) {
            size *= shape[i];
        }

        return size;
};


ndops.reshape = function(a, shape) {

    if ( a.size !== ndops.size(shape) ) {
        throw new Error("sizes not equil " + a.size + " != ", + ndops.size(shape));
    }

    return ndops.ndarray(a.data, shape);
};

ndops.section = function(a, sect) {
        var x1 = sect[0][0];
        var x2 = sect[0][1];
        var y1 = sect[1][0];
        var y2 = sect[1][1];

        return a.lo(y1, x1).hi(y2-y1, x2-x1);
};

ndops.print = function(a, width, prec) {
    var x, y;
    var line;

    if ( width === undefined ) { width = 7; }
    if ( prec === undefined  ) { prec  = 3; }

    if ( a.shape.length === 1 ) {
        line = "";
        for (x=0;x<a.shape[0];++x) {
            line += a.get(x).toFixed(prec) + " ";
            //if ( x > 17 ) { break;}
        }
        console.log(line);
    } else {
        for ( y = a.shape[0]-1; y >= 0; --y ) {
          line = "";
          for ( x = 0; x < a.shape[1]; ++x ) {
            line += a.get(y, x).toFixed(prec) + " ";
          }

          console.log(line);
        }
        console.log("\n");
    }
};

ndops._hist = typed(function (a, width , min, max) {
    var size = Math.floor((max-min) / width);
    var  h   = new Int32Array(size+1);

    // -----
    if( !isNaN(a) ){
        var bin = Math.max(0, Math.min(size, Math.round((a-min)/width))) | 0;	// | is truncate
        h[bin]++;
    }
    // -----

   return h;
});



ndops.hist = function(a, width, min, max) {
    var hist = {};
    var reply;

    if ( min === undefined ) {
        min = ndops.minvalue(a);
    }
    if ( max === undefined ) {
        max = ndops.maxvalue(a);
    }
    if ( width === undefined ) {
        width = Math.max(1, (max-min) / 250);
    }

    hist.raw   = a;

    hist.min   = min;
    hist.max   = max;
    hist.width = width;

    reply = ndops._hist(a, width, min, max);
    hist.data = ndops.ndarray(reply, [reply.length]);

    return hist;
};

ndops.proj = function(a, axis) {
        var sect;
	var i;

        //var proj = ndops.ndarray(ndops._proj(a, axis, new Float32Array(a.shape[axis === 0 ? 1 : 0]), [a.shape[axis === 0 ? 1 : 0]]));
        
	var proj = {};
        proj.n   = a.shape[axis === 1 ? 0 : 1];
	proj.x   = a.shape[axis];

        proj.sum = [];
        proj.avg = [];
        proj.med = [];

        var copy = ndops.assign(ndops.zeros(a.shape), a);

        for ( i = 0; i < proj.n; i++ ) {
            if ( axis === 0 ) {
                sect = ndops.section(copy, [[i, i+1], [0, proj.x]]);
            } else {
                sect = ndops.section(copy, [[0, proj.x], [i, i+1]]);
            }

            proj.sum[i] = ndops.sum(sect);
            proj.avg[i] = ndops.sum(sect)/proj.n;
            proj.med[i] = ndops.median(sect);
        }

        return proj;
};

ndops.qcenter = typed(function (a) {
	var start = [], end = [];
	var max = Number.MIN_VALUE;
	var idx;
	var iX = 0, iY = 0;

	start[0]++;
	start[1]++;
	  end[0]--;
	  end[1]--;

	// ----
	    var sum = 
		    + a[iY-1][iX-1] 
		    + a[iY-1][iX  ] 
		    + a[iY-1][iX+1] 
		    + a[iY  ][iX-1] 
		    + a[iY  ][iX  ]
		    + a[iY  ][iX+1] 
		    + a[iY+1][iX-1] 
		    + a[iY+1][iX  ] 
		    + a[iY+1][iX+1];

	    if ( max < sum ) {
		max = sum;
		idx = [iX, iY];
	    }
	// ----

	return idx;
});

ndops._imcnts = typed({ consider: { c: false } }, function (c, a, b) { c[b] += a; });

ndops.imcnts = function (a, b, n) {
    var reply = {};
    reply.cnts = ndops.ndarray(ndops._imcnts(new Float32Array(n), a, b));
    reply.area = ndops.hist(b, 1, 0, n-1).data;

    return reply;
};


ndops._centroid = typed(function (a, nx, ny) {
    var sum   = 0;
    var sumx  = 0;
    var sumy  = 0;
    var sumxx = 0;
    var sumyy = 0;

    var r = nx*nx+ny*ny;

    var iX = 0, iY = 0;

    // ----
	if ( a > 0 && iX*iX + iY*iY < r ) {
	    sum    += a;
	    sumx   += a * iX;
	    sumxx  += a * iX * iX;
	    sumy   += a * iY;
	    sumyy  += a * iY * iY;
	}

    // ----

    var reply = {};

    reply.sum  = sum;
    reply.cenx = sumx/sum;
    reply.ceny = sumy/sum;

    reply.rmom = ( sumxx - sumx * sumx / sum + sumyy - sumy * sumy / sum ) / sum;

    if ( reply.rmom <= 0 ) {
	reply.fwhm = -1.0;
    } else {
	reply.fwhm = Math.sqrt(reply.rmom)  * 2.354 / Math.sqrt(2.0);
    }

    return reply;
});

ndops.centroid = function(a) {
    var reply = ndops._centroid(a, a.shape[0], a.shape[1]);

    return reply;
};

ndops.flatten = function() {
        var size = 0;
	var i, n, a;

        for ( i = 0; i < arguments.length; i++ ) {
            size += arguments[i].size;
        }

        var reply = ndops.zeros([size]);
        var off   = 0;

        for ( n = 0; n < arguments.length; n++ ) {
            a = arguments[n];

            ndops.assign(ndops.ndarray(reply.data, a.shape, undefined, off), a);

            off += a.size;
        }

        return reply;
};

ndops.median = function(a) {
        var data = ndops.assign(ndops.zeros(a.shape), a);

	Array.prototype.sort.call(data.data, function(a, b) { return a-b; });

        var reply = data.data[Math.round((data.size-1)/2.0)];

        return reply;
};


ndops.rms = typed(function (a) {
    var sum = 0;
    var squ = 0;
    // ----
    if( !isNaN(a) ){
	sum +=   a;
	squ += a*a;
    }
    // ----

    var mean = sum/a.size;

    return Math.sqrt((squ - 2*mean*sum + a.size*mean*mean)/(a.size-1));
});

ndops.rmsClipped = typed(function (a, min, max) {
    var n = 0;
    var sum = 0;
    var squ = 0;
    // ----
	if ( !isNaN(a) && (min === null || a > min) && (max === null || a < max) ) {
	    n++;
	    sum +=   a;
	    squ += a*a;
	}
    // ----

    var mean = sum/n;

    return Math.sqrt((squ - 2*mean*sum + n*mean*mean)/(n-1));
});

ndops.meanClipped = typed(function (a, min, max) {
    var n = 0;
    var sum = 0;
    // ----
	if ( !isNaN(a) && (min === null || a > min) && (max === null || a < max) ) {
	    n++;
	    sum +=   a;
	}
    // ----

    return sum/n;
});

imops.backgr = function(data, width) {
        var back = {};

        var pixels = ndops.flatten(
                             ndops.section(data, [[0, width], [0, data.shape[1]]])
                           , ndops.section(data, [[data.shape[0]-width, data.shape[0]], [0, data.shape[1]]])
                           , ndops.section(data, [[width, data.shape[0]-width], [0, width]])
                           , ndops.section(data, [[width, data.shape[0]-width], [data.shape[1]-width, data.shape[1]]]));


        back.noise = ndops.rms(pixels);
        back.value = ndops.median(pixels);

        return back;
};

imops.mksection = function(x, y, w, h) {
        return [[Math.floor(x-(w/2)), Math.floor(x+(w/2))],
		[Math.floor(y-(h/2)), Math.floor(y+(h/2))]];
};

imops._rproj = typed(function (a, cx, cy, radius, length) {
    var rad = new Float32Array(length);
    var val = new Float32Array(length);
    var r = Math.sqrt(radius*radius);
    var i = 0;

    var iX = 0, iY = 0;

    // ----
	var d = Math.sqrt((iY-cy)*(iY-cy) + (iX-cx)*(iX-cx));

	if ( (d <= r) && !isNaN(a) ) {
	    rad[i] = d;
	    val[i] = a;

	    i++;
	}
    // ----
    
    return { rad: rad.subarray(0, i), val: val.subarray(0, i), n: i };
});

function sortArrays(a, b) {
    var indexed;

    indexed = Array.prototype.map.call(a, function(itm, i){ return [itm, i, b[i]]; });

    indexed.sort(function(a, b){ return a[0]-b[0]; });

    indexed.map(function(itm, i) {
	a[i] = itm[0];
	b[i] = itm[2];
    });
}

imops.rproj = function(im, center) {
    var radius = (im.shape[0]/2 + im.shape[1]/2) / 2;
    var data   = imops._rproj(im, center[1], center[0], radius, im.size);

    sortArrays(data.rad, data.val);

    return { radi: ndops.ndarray(data.rad, [data.rad.length])
	   , data: ndops.ndarray(data.val, [data.rad.length]), radius: radius };
};


imops._encen = typed(function (a, cx, cy, radius) {
    var reply = new Float32Array(radius);
    var sum = 0;
    var RSq = radius*radius;

    var tot = 0;
    var i;

    var iX = 0, iY = 0;

    // ----
	var x = iX - cx;
	var y = iY - cy;

	var rsq = x*x+y*y;

	if ( a > 0 && rsq < RSq ) { 
	    reply[Math.round(Math.sqrt(rsq))] += a;
	    sum += a;
	}
    // ----


    for ( i = 0; i < radius; i++ ) {
	tot += reply[i];

	reply[i] = tot / sum;
    }

    return reply;
});



imops.encen = function(im, center) {
    var radius = Math.floor((im.shape[0]/2 + im.shape[1]/2) / 2);

    var reply = imops._encen(im, center[1], center[0], radius);

    return ndops.ndarray(reply, [reply.length]);
};

ndops.indexof = function(a, x) {
    var i;

    for ( i = 0; i < a.shape[0]; i++ ) {

	if ( x < a.get(i) ) { break; }
    }

    if ( i === 0          ) { return 0; }
    if ( i === a.shape[0] ) { return a.shape[0]; }

    return i + (x - a.get(i))/(a.get(i) - a.get(i-1));
};

ndops.gauss1d = function(radi, x0) {
    var reply = ndops.zeros(radi.shape);

    var a = x0[0];
    var b = 0; 		// x0[1];
    var c = x0[1];
    var d = x0[2];

    ndops.fill(reply, function(i) {
        var x = radi.data[i]-b;

        return a * Math.pow(2.71828, - x*x / (2*c*c)) + d;
    });

    return reply;    
};

ndops.gsfit1d = function(radi, data, x0) {

    var reply = typed.uncmin(function(x) {
	var modl = ndops.gauss1d(radi, x);

	ndops.sub(modl, modl, data);
	ndops.mul(modl, modl, modl);
	ndops.fill(modl, function(i) {
	    return modl.get(i)/(radi.get(i)*radi.get(i));
	});

	var sum = ndops.sum(modl);

	return Math.sqrt(sum/radi.shape[0]);

    }, x0, 0.000001);

    // console.log(reply.message);

    return reply.solution;
};

function reg2section(xreg) {

    switch ( xreg.shape ) {

	case "annulus":
            xreg.width  = xreg.radii[xreg.radii.length-1]*2;
            xreg.height = xreg.radii[xreg.radii.length-1]*2;

            break;

       	case "circle":
            xreg.width  = xreg.radius*2;
            xreg.height = xreg.radius*2;

            break;

       	case "ellipse":
            xreg.width  = xreg.r1*2;
            xreg.height = xreg.r2*2;

            break;

       	case "polygon":
        case "line":
	    var i, xx = 0, yy = 0, minx = 1000000, maxx = 0, miny = 1000000, maxy = 0;

	    for ( i = 0; i < xreg.pts.length; i++ ) {
		xx += xreg.pts[i].x;
		yy += xreg.pts[i].y;

		if ( xreg.pts[i].x > maxx ) { maxx = xreg.pts[i].x; }
		if ( xreg.pts[i].x < minx ) { minx = xreg.pts[i].x; }
		if ( xreg.pts[i].y > maxy ) { maxy = xreg.pts[i].y; }
		if ( xreg.pts[i].y < miny ) { miny = xreg.pts[i].y; }
	    }

	    xreg.x = xx/xreg.pts.length;
	    xreg.y = yy/xreg.pts.length;

	    if( xreg.shape === "line" && xreg.pts.length === 2 ){
                xreg.width = Math.sqrt(((xreg.pts[0].x - xreg.pts[1].x)  *
                                        (xreg.pts[0].x - xreg.pts[1].x)) +
                                       ((xreg.pts[0].y - xreg.pts[1].y)  *
                                        (xreg.pts[0].y - xreg.pts[1].y)));
                xreg.height = JS9.globalOpts.imexamLineHeight || 1;
		xreg.angle = Math.atan2(xreg.pts[1].y - xreg.pts[0].y,
					xreg.pts[1].x - xreg.pts[0].x);
		xreg.angle = xreg.angle * 180 / Math.PI;
	    } else {
	        xreg.width  = maxx - minx;
		xreg.height = maxy - miny;
	    }
	    break;

	case "text":
	    xreg.width = 10;
	    xreg.height = 10;
	    break;

       	default:
	    break;
    }

    return imops.mksection(xreg.x, xreg.y, xreg.width, xreg.height);
}

exports.getRegionData = function (im, xreg) {
    var section = reg2section(xreg);
    var im_2d   = ndops.ndarray(im.raw.data, [im.raw.height, im.raw.width]);
    var imag;

    if ( xreg.angle && xreg.angle !== 0 ) {
	imag = ndops.zeros([xreg.height, xreg.width]);

	ndops.rotate(imag, im_2d, xreg.angle/57.29577951, xreg.y, xreg.x);
    } else {
	imag = ndops.section(im_2d, section);
    }

    return imag;
};

exports.convolve1d = typed(function(kernel, data, output) {
    var i, j, x;
    var half = Math.round(kernel.shape[0]/2.0);

    for ( i = 0; i < data.shape[0]; i++ ) {
	for ( j = 0; j < kernel.shape[0]; j++ ) {
	    x = i+j-half;

	    if ( x >= 0 && x < data.shape[0] ) {
		output[i] += kernel[j] * data[x];
	    }
	}
    }
});

exports.convolve2dSep = function(kernel, data, output) {
    var x, y, i, xx, yy; 

    var nx =   data.shape[1];
    var ny =   data.shape[0];
    var nk = kernel.shape[0];

    var half = Math.floor(nk/2.0);

    // Run the kernel 1d over each row
    //
    for ( y = 0; y < ny; y++ ) {
        for ( x = 0; x < nx; x++ ) {
	    output[y][x] = 0;

    	    for ( i = 0; i < nk; i++ ) {
		xx = x+i-half;

		if ( xx > 0 && xx < nx ) {
		    output[y][x] += data[y][xx]*kernel[i];
		}
	    }
	}
    }

    // Run the kernel 1d over each column
    //
    for ( x = 0; x < nx; x++ ) {
	for ( y = 0; y < ny; y++ ) {

    	    for ( i = 0; i < nk; i++ ) {
		yy = y+i-half;

		if ( yy > 0 && yy < ny ) {
		    output[y][x] += data[y+i][x]*kernel[i];
		}
	    }
	}
    }
};


exports.reg2section = reg2section;
exports.template = template;

exports.ndops    = ndops;
exports.typed    = ndops;
exports.imops    = imops;


},{"./mask.js":1,"./template":12,"typed-array-function":4,"typed-array-ops":5,"typed-array-rotate":8,"typed-numeric-uncmin":10}],1:[function(require,module,exports){
/*jslint white: true, vars: true, plusplus: true, nomen: true, unparam: true */
/*globals $ */ 

"use strict";

// source
// background
// exclude

(function() {
    var raster = require("./raster");

    function hasTag(reg, tag) {
	var i;

	for ( i = 0; i < reg.tags.length; i++ ) {
	    if ( reg.tags[i] === tag ) { return true; }
	}

	return false;
    }
    exports.hasTag = hasTag;

    exports.listRegions = function (regs) {
	var i, j;
	var reg, regno = 1;

	var reply = [];

	for ( i = 0; i < regs.length; i++ ) {
	    reg = regs[i];

	    switch ( reg.shape ) {
	     case "annulus":
		for ( j = 0; j < reg.radii.length; j++ ) {
		    if ( reg.radii[j] !== 0.0 ) {
			reply[regno-1] = $.extend($.extend({}, reg), { regno: regno++, shape: "circle", radius: reg.radii[j] });
		    }
		}
	     	break;
	     default:
		reply[regno-1] = $.extend({ regno: regno++ }, reg);
		break;
	    }
	}

	return reply;
    };

    exports.drawRegions = function (regs, buffer, width) {
	var reg, t, i;

	var type = [ "include", "exclude" ];

	for ( t = 0; t < 2; t++ ) {
	    for ( i = regs.length - 1; i >= 0; i-- ) {
		reg = regs[i];

		if ( hasTag(reg, type[t]) ) {
		    switch ( reg.shape ) {
		     case "polygon": raster.drawPolygon(buffer, width, reg.pts,                          reg.regno); 				 break;
		     case "circle":  raster.drawCircle( buffer, width, reg.x, reg.y, reg.radius, reg.regno); 				 break;
		     case "box":     raster.drawBox(    buffer, width, reg.x, reg.y, reg.width,  reg.height, reg.angle, reg.regno); break;
		     case "ellipse": raster.drawEllipse(buffer, width, reg.x, reg.y, reg.r1,     reg.r2,   reg.angle, reg.regno); break;
		    }
		}
	    }
	}
    };
}());


},{"./raster":11}],2:[function(require,module,exports){
"use strict"

var iota = require("iota-array")

var arrayMethods = [
  "concat",
  "join",
  "slice",
  "toString",
  "indexOf",
  "lastIndexOf",
  "forEach",
  "every",
  "some",
  "filter",
  "map",
  "reduce",
  "reduceRight"
]

function compare1st(a, b) {
  return a[0] - b[0]
}

function order() {
  var stride = this.stride
  var terms = new Array(stride.length)
  var i
  for(i=0; i<terms.length; ++i) {
    terms[i] = [Math.abs(stride[i]), i]
  }
  terms.sort(compare1st)
  var result = new Array(terms.length)
  for(i=0; i<result.length; ++i) {
    result[i] = terms[i][1]
  }
  return result
}

function compileConstructor(dtype, dimension) {
  var className = ["View", dimension, "d", dtype].join("")
  if(dimension < 0) {
    className = "View_Nil" + dtype
  }
  var useGetters = (dtype === "generic")
  
  if(dimension === -1) {
    //Special case for trivial arrays
    var code = 
      "function "+className+"(a){this.data=a;};\
var proto="+className+".prototype;\
proto.dtype='"+dtype+"';\
proto.index=function(){return -1};\
proto.size=0;\
proto.dimension=-1;\
proto.shape=proto.stride=proto.order=[];\
proto.lo=proto.hi=proto.transpose=proto.step=\
function(){return new "+className+"(this.data);};\
proto.get=proto.set=function(){};\
proto.pick=function(){return null};\
return function construct_"+className+"(a){return new "+className+"(a);}"
    var procedure = new Function(code)
    return procedure()
  } else if(dimension === 0) {
    //Special case for 0d arrays
    var code =
      "function "+className+"(a,d) {\
this.data = a;\
this.offset = d\
};\
var proto="+className+".prototype;\
proto.dtype='"+dtype+"';\
proto.index=function(){return this.offset};\
proto.dimension=0;\
proto.size=1;\
proto.shape=\
proto.stride=\
proto.order=[];\
proto.lo=\
proto.hi=\
proto.transpose=\
proto.step=function "+className+"_copy() {\
return new "+className+"(this.data,this.offset)\
};\
proto.pick=function "+className+"_pick(){\
return TrivialArray(this.data);\
};\
proto.valueOf=proto.get=function "+className+"_get(){\
return "+(useGetters ? "this.data.get(this.offset)" : "this.data[this.offset]")+
"};\
proto.set=function "+className+"_set(v){\
return "+(useGetters ? "this.data.set(this.offset,v)" : "this.data[this.offset]=v")+"\
};\
return function construct_"+className+"(a,b,c,d){return new "+className+"(a,d)}"
    var procedure = new Function("TrivialArray", code)
    return procedure(CACHED_CONSTRUCTORS[dtype][0])
  }

  var code = ["'use strict'"]
    
  //Create constructor for view
  var indices = iota(dimension)
  var args = indices.map(function(i) { return "i"+i })
  var index_str = "this.offset+" + indices.map(function(i) {
        return ["this._stride", i, "*i",i].join("")
      }).join("+")
  code.push("function "+className+"(a,"+
    indices.map(function(i) {
      return "b"+i
    }).join(",")+","+
    indices.map(function(i) {
      return "c"+i
    }).join(",")+",d){this.data=a")
  for(var i=0; i<dimension; ++i) {
    code.push("this._shape"+i+"=b"+i+"|0")
  }
  for(var i=0; i<dimension; ++i) {
    code.push("this._stride"+i+"=c"+i+"|0")
  }
  code.push("this.offset=d|0}",
    "var proto="+className+".prototype",
    "proto.dtype='"+dtype+"'",
    "proto.dimension="+dimension)
  
  //view.stride and view.shape
  var strideClassName = "VStride" + dimension + "d" + dtype
  var shapeClassName = "VShape" + dimension + "d" + dtype
  var props = {"stride":strideClassName, "shape":shapeClassName}
  for(var prop in props) {
    var arrayName = props[prop]
    code.push(
      "function " + arrayName + "(v) {this._v=v} var aproto=" + arrayName + ".prototype",
      "aproto.length="+dimension)
    
    var array_elements = []
    for(var i=0; i<dimension; ++i) {
      array_elements.push(["this._v._", prop, i].join(""))
    }
    code.push(
      "aproto.toJSON=function " + arrayName + "_toJSON(){return [" + array_elements.join(",") + "]}",
      "aproto.valueOf=aproto.toString=function " + arrayName + "_toString(){return [" + array_elements.join(",") + "].join()}")
    
    for(var i=0; i<dimension; ++i) {
      code.push(["Object.defineProperty(aproto,", i, ",{get:function(){return this._v._", prop, i, "},set:function(v){return this._v._", prop, i, "=v|0},enumerable:true})"].join(""))
    }
    for(var i=0; i<arrayMethods.length; ++i) {
      if(arrayMethods[i] in Array.prototype) {
        code.push(["aproto.", arrayMethods[i], "=Array.prototype.", arrayMethods[i]].join(""))
      }
    }
    code.push(["Object.defineProperty(proto,'",prop,"',{get:function ", arrayName, "_get(){return new ", arrayName, "(this)},set: function ", arrayName, "_set(v){"].join(""))
    for(var i=0; i<dimension; ++i) {
      code.push(["this._", prop, i, "=v[", i, "]|0"].join(""))
    }
    code.push("return v}})")
  }
  
  //view.size:
  code.push(["Object.defineProperty(proto,'size',{get:function ",className,"_size(){\
return ", indices.map(function(i) { return ["this._shape", i].join("") }).join("*"),
"}})"].join(""))

  //view.order:
  if(dimension === 1) {
    code.push("proto.order=[0]")
  } else {
    code.push("Object.defineProperty(proto,'order',{get:")
    if(dimension < 4) {
      code.push(["function ",className,"_order(){"].join(""))
      if(dimension === 2) {
        code.push("return (Math.abs(this._stride0)>Math.abs(this._stride1))?[1,0]:[0,1]}})")
      } else if(dimension === 3) {
        code.push(
"var s0=Math.abs(this._stride0),s1=Math.abs(this._stride1),s2=Math.abs(this._stride2);\
if(s0>s1){\
if(s1>s2){\
return [2,1,0];\
}else if(s0>s2){\
return [1,2,0];\
}else{\
return [1,0,2];\
}\
}else if(s0>s2){\
return [2,0,1];\
}else if(s2>s1){\
return [0,1,2];\
}else{\
return [0,2,1];\
}}})")
      }
    } else {
      code.push("ORDER})")
    }
  }
  
  //view.set(i0, ..., v):
  code.push([
"proto.set=function ",className,"_set(", args.join(","), ",v){"].join(""))
  if(useGetters) {
    code.push(["return this.data.set(", index_str, ",v)}"].join(""))
  } else {
    code.push(["return this.data[", index_str, "]=v}"].join(""))
  }
  
  //view.get(i0, ...):
  code.push(["proto.get=function ",className,"_get(", args.join(","), "){"].join(""))
  if(useGetters) {
    code.push(["return this.data.get(", index_str, ")}"].join(""))
  } else {
    code.push(["return this.data[", index_str, "]}"].join(""))
  }
  
  //view.index:
  code.push([
    "proto.index=function ",
      className,
      "_index(", args.join(), "){return ", 
      index_str, "}"].join(""))

  //view.hi():
  code.push(["proto.hi=function ",className,"_hi(",args.join(","),"){return new ", className, "(this.data,",
    indices.map(function(i) {
      return ["(typeof i",i,"!=='number'||i",i,"<0)?this._shape", i, ":i", i,"|0"].join("")
    }).join(","), ",",
    indices.map(function(i) {
      return "this._stride"+i
    }).join(","), ",this.offset)}"].join(""))
  
  //view.lo():
  var a_vars = indices.map(function(i) { return "a"+i+"=this._shape"+i })
  var c_vars = indices.map(function(i) { return "c"+i+"=this._stride"+i })
  code.push(["proto.lo=function ",className,"_lo(",args.join(","),"){var b=this.offset,d=0,", a_vars.join(","), ",", c_vars.join(",")].join(""))
  for(var i=0; i<dimension; ++i) {
    code.push([
"if(typeof i",i,"==='number'&&i",i,">=0){\
d=i",i,"|0;\
b+=c",i,"*d;\
a",i,"-=d}"].join(""))
  }
  code.push(["return new ", className, "(this.data,",
    indices.map(function(i) {
      return "a"+i
    }).join(","),",",
    indices.map(function(i) {
      return "c"+i
    }).join(","), ",b)}"].join(""))
  
  //view.step():
  code.push(["proto.step=function ",className,"_step(",args.join(","),"){var ",
    indices.map(function(i) {
      return "a"+i+"=this._shape"+i
    }).join(","), ",",
    indices.map(function(i) {
      return "b"+i+"=this._stride"+i
    }).join(","),",c=this.offset,d=0,ceil=Math.ceil"].join(""))
  for(var i=0; i<dimension; ++i) {
    code.push([
"if(typeof i",i,"==='number'){\
d=i",i,"|0;\
if(d<0){\
c+=b",i,"*(a",i,"-1);\
a",i,"=ceil(-a",i,"/d)\
}else{\
a",i,"=ceil(a",i,"/d)\
}\
b",i,"*=d\
}"].join(""))
  }
  code.push(["return new ", className, "(this.data,",
    indices.map(function(i) {
      return "a" + i
    }).join(","), ",",
    indices.map(function(i) {
      return "b" + i
    }).join(","), ",c)}"].join(""))
  
  //view.transpose():
  var tShape = new Array(dimension)
  var tStride = new Array(dimension)
  for(var i=0; i<dimension; ++i) {
    tShape[i] = ["a[i", i, "]"].join("")
    tStride[i] = ["b[i", i, "]"].join("")
  }
  code.push(["proto.transpose=function ",className,"_transpose(",args,"){", 
    args.map(function(n,idx) { return n + "=(" + n + "===undefined?" + idx + ":" + n + "|0)"}).join(";"),
    ";var a=this.shape,b=this.stride;return new ", className, "(this.data,", tShape.join(","), ",", tStride.join(","), ",this.offset)}"].join(""))
  
  //view.pick():
  code.push(["proto.pick=function ",className,"_pick(",args,"){var a=[],b=[],c=this.offset"].join(""))
  for(var i=0; i<dimension; ++i) {
    code.push(["if(typeof i",i,"==='number'&&i",i,">=0){c=(c+this._stride",i,"*i",i,")|0}else{a.push(this._shape",i,");b.push(this._stride",i,")}"].join(""))
  }
  code.push("var ctor=CTOR_LIST[a.length+1];return ctor(this.data,a,b,c)}")
    
  //Add return statement
  code.push(["return function construct_",className,"(data,shape,stride,offset){return new ", className,"(data,",
    indices.map(function(i) {
      return "shape["+i+"]"
    }).join(","), ",",
    indices.map(function(i) {
      return "stride["+i+"]"
    }).join(","), ",offset)}"].join(""))

  //Compile procedure
  var procedure = new Function("CTOR_LIST", "ORDER", code.join("\n"))
  return procedure(CACHED_CONSTRUCTORS[dtype], order)
}

function arrayDType(data) {
  if(data instanceof Float64Array) {
    return "float64";
  } else if(data instanceof Float32Array) {
    return "float32"
  } else if(data instanceof Int32Array) {
    return "int32"
  } else if(data instanceof Uint32Array) {
    return "uint32"
  } else if(data instanceof Uint8Array) {
    return "uint8"
  } else if(data instanceof Uint16Array) {
    return "uint16"
  } else if(data instanceof Int16Array) {
    return "int16"
  } else if(data instanceof Int8Array) {
    return "int8"
  } else if(data instanceof Uint8ClampedArray) {
    return "uint8_clamped"
  } else if(data instanceof Array) {
    return "array"
  }
  return "generic"
}

var CACHED_CONSTRUCTORS = {
  "float32":[],
  "float64":[],
  "int8":[],
  "int16":[],
  "int32":[],
  "uint8":[],
  "uint16":[],
  "uint32":[],
  "array":[],
  "uint8_clamped":[],
  "generic":[]
}

;(function() {
  for(var id in CACHED_CONSTRUCTORS) {
    CACHED_CONSTRUCTORS[id].push(compileConstructor(id, -1))
  }
});

function wrappedNDArrayCtor(data, shape, stride, offset) {
  if(data === undefined) {
    var ctor = CACHED_CONSTRUCTORS.array[0]
    return ctor([])
  } else if(typeof data === "number") {
    data = [data]
  }
  if(shape === undefined) {
    shape = [ data.length ]
  }
  var d = shape.length
  if(stride === undefined) {
    stride = new Array(d)
    for(var i=d-1, sz=1; i>=0; --i) {
      stride[i] = sz
      sz *= shape[i]
    }
  }
  if(offset === undefined) {
    offset = 0
    for(var i=0; i<d; ++i) {
      if(stride[i] < 0) {
        offset -= (shape[i]-1)*stride[i]
      }
    }
  }
  var dtype = arrayDType(data)
  var ctor_list = CACHED_CONSTRUCTORS[dtype]
  while(ctor_list.length <= d+1) {
    ctor_list.push(compileConstructor(dtype, ctor_list.length-1))
  }
  var ctor = ctor_list[d+1]
  return ctor(data, shape, stride, offset)
}

module.exports = wrappedNDArrayCtor

},{"iota-array":3}],3:[function(require,module,exports){
"use strict"

function iota(n) {
  var result = new Array(n)
  for(var i=0; i<n; ++i) {
    result[i] = i
  }
  return result
}

module.exports = iota
},{}],4:[function(require,module,exports){
/*jslint white: true, vars: true, plusplus: true, nomen: true, unparam: true, evil: true, regexp: true, bitwise: true */
/*jshint node: true, -W099: true, laxbreak:true, laxcomma:true, multistr:true, smarttabs:true */
/*globals typed, Int8Array, Uint8Array, Int16Array, Uint16Array, Int32Array, Uint32Array, Float32Array, Float64Array */ 

"use strict";

(function() {
    var ndarray = require("ndarray-nobuffer");

    var types = {
	    int8  :   Int8Array
	  , uint8 :  Uint8Array
	  , int16 :  Int16Array
	  , uint16:  Uint16Array
	  , int32:   Int32Array
	  , uint32:  Uint32Array
	  , float32: Float32Array
	  , float64: Float64Array
    };

    function dim(x) {
    	if ( x.shape ) { return x.shape; }

	var ret = [];
	while( typeof x === "object" ) {
	    ret.push(x.length);
	    x = x[0];
	}

	return ret;
    }

    function rep(s,v,k) {
	if ( v === undefined ) { v = 0; }
	if ( k === undefined ) { k = 0; }
	var n = s[k], ret = [], i;
	if(k === s.length-1) {
	    for(i=n-2;i>=0;i-=2) { ret[i+1] = v; ret[i] = v; }
	    if(i===-1) { ret[0] = v; }
	    return ret;
	}
	for(i=n-1;i>=0;i--) { ret[i] = rep(s,v,k+1); }
	return ret;
    }

    function repeat(pattern, count) {
	if (count < 1) { return ''; }

	var result = '';
	while (count > 0) {
	    if ( count & 1 ) { result += pattern; }

	    count >>= 1; pattern += pattern;
	}
	return result;
    }




    function replaceIdentifierRefs(str, func) {
	var reply = "";

	var state = -1, match, index, first, i = 0, x;

	while ( i < str.length ) {
	    match = str.match(/[a-zA-Z_][a-zA-Z0-9_]*/);		// Find an identifier in the string.

	    if ( !match ) { break; }

	    reply += str.substr(i, match.index);

	    index = [];
	    i     = match.index + match[0].length;

	    x = true;
	    while ( x && i < str.length ) {
		while ( str[i] === ' ' ) { i++; }

		switch ( str[i] ) {
		 case "[": 
		    state = 1;
		    first = i+1;
		    i++;

		    while ( state ) {
			if ( str[i] === ']' ) {
			    if ( state === 1 ) { index.push(str.substring(first, i)); }
			    state--;
			}
			if ( str[i] === '[' ) { state++; }
			i++;
		    }
		    break;
		 case "." : 
		    first = i;
		    i++;
		    while ( str[i] === ' ' ) { i++; }
		    while ( str[i].match(/[ a-zA-Z0-9_]/) !== null ) { i++; }

		    index.push(str.substring(first, i));

		    break;
		 default: 
		    x = false;
		    break;
		}
	    }

	    reply += func(match[0], index);
	    str    = str.substr(i);
	    i = 0;
	}

	return reply + str.substr(i);
    }


    function typedArrayFunctionConstructor() {
        var actuals = arguments;
	var i, j;
	var args;
	var text;
	var hash = {};

	var body;

	if ( this.cache === undefined ) {
	    if ( typeof this.func === "string" ) {
		text = this.func;
	    } else {
		text = this.func.toString();
	    }
	    this.text = text;

	    var x = text.match(/function [A-Za-z0-9_]*\(([^()]*)\)[^{]*\{([\S\s]*)\}[\S\s]*/);	// }

	    args = x[1].split(",").map(function(s) { return s.trim(); });
	    this.args = args;

	    this.prep = "";
	    this.post = "";

	    body = x[2].split(/\/\/ ----+/);

	    if ( body.length > 1 ) {
		this.prep = body[0];
		this.post = body[2];
		this.body = body[1];
	    } else {
		this.body = body[0];
	    }
	    if ( this.post === "" || this.post === undefined ) {
		this.post = "\nreturn " + args[0] + ";";
	    }
	} 
	args = this.args;
	text = this.text;

	var opts = this.opts;

	if ( opts === undefined ) { opts = {}; }

	var type = "";
	var dime = 0;
	var func;

	for ( i = 0; i < args.length; i++ ) {
	    if ( actuals[i] !== null && actuals[i] !== undefined && typeof actuals[i] === "object"
	     && (opts.consider === undefined || ( typeof opts.consider === "object" && opts.consider[args[i]] !== false )) ) {

		hash[args[i]] = actuals[i];

		if ( !actuals[i].shape ) {
		    actuals[i].shape = dim(actuals[i]);
		}

		dime = Math.max(actuals[i].shape.length, dime);

		if ( actuals[i].data ) {
		    type += " " + actuals[i].dtype + " " + actuals[i].offset + " " + " " + actuals[i].stride;
		} else {
		    type += " O";
		}

	    } else {
		type += " X";
	    }
       	}
	type = dime + type;

	if ( this.cache ) {
	    func = this.cache[type];

	    if ( func ) { return func; }
	}

	var prep = this.prep;
	    body = this.body;
	var post = this.post;
	var dims = [];

	var indicies = [ "iW", "iV", "iU", "iZ", "iY", "iX" ];
	var hasIndex = false;

	// Match each source code identifier and any associated array indexing.  Extract
	// the indicies and recursivly replace them also.
	//
	function replaceArrayRefs(text) {

	    return replaceIdentifierRefs(text, function (id, indx) {
		var k, offset, reply;

		if ( id === "index" ) { hasIndex = true; }

		for ( k = 0; k < indx.length; k++ ) {
		    indx[k] = replaceArrayRefs(indx[k]);
		}

		var arg = hash[id];
		var dimen;
		var joinStr, bracket, fixindx;


		if ( arg !== undefined && typeof arg === "object" ) {

		    if ( indx.length >= 1 && indx[indx.length-1].trim() === ".length" ) {
		        indx[0] = ".shape";
			indx[1] = indx.length-1;
			indx.length = 2;
		    }

		    if ( indx.length >= 1 && indx[0][0] === "." ) {
		        if ( indx.length >= 2 && indx[0].trim() === ".shape" ) {
			    if ( arg.data ) {
				reply = id + ".shape[" + indx[1] + "]";
			    } else {
				reply = id + repeat("[0]", indx[1]) + ".length";
			    } 
			} else {
			    reply = id + indx[0].trim();
			}
		    } else {
			if ( arg.data ) {
			    dimen = arg.dimension;


			    if ( indx.length !== 0 && indx.length < arg.dimension ) {
				id = id + ".data.subarray";
				bracket = "()";
				fixindx = indx.length;
			    } else {
				id = id + ".data";
				bracket = "[]";
				fixindx = arg.dimension;
			    }

			    joinStr = " + ";
			} else {
			    dimen = arg.shape.length;
			    joinStr = "][";
			    offset  = "";
			    bracket = "[]";
			}

			var indi = indicies.slice(6-dimen);

			if ( ( opts.loops === undefined || opts.loops === true ) && ( indx.length === 0 || dimen === indx.length ) ) {
			    for ( i = 0; i < dimen; i++ ) {
				if ( indx[i] === undefined ) { indx[i] = indi[i]; } 
				if ( dims[i] === undefined ) { dims[i] = 0; }

				dims[i] = Math.max(dims[i], arg.shape[i]);
			    }
			}

			if ( arg.data ) {
			    for ( i = 0; i < fixindx; i++ ) {
				if ( arg.stride[i] !== 1 ) { indx[i] =  "(" + indx[i] + ")*" + arg.stride[i]; }
			    }

			    if ( arg.offset !== 0 ) { 	offset = arg.offset + " + ";
			    } else {			offset = ""; }
			}

			if ( indx.length ) {
			    reply = id + bracket[0] + offset + indx.join(joinStr) + bracket[1] + " ";
			} else {
			    reply = id;
			}
		    }
		} else {
		    reply = id;

		    for ( i = 0; i <  indx.length; i++ ) {
			if ( indx[i][0] === "." ) {
			    reply += indx[i].trim();
			} else {
			    reply += "[" + indx[i].trim() + "]";
			}
		    }
		    reply += " ";
		}
		
		return reply;
	    });
	}

	body = replaceArrayRefs(body);

	var indx = indicies.slice(6-dims.length);
	var indi = indicies.slice(6-dims.length).reverse();
	dims.reverse();

	var init = "\n";
	var setp = "\n";

	var indxZero = "";
	var indxIncr = "";

	if ( opts.loops === undefined || opts.loops === true ) {
	    init += "	var index = [" + rep([dims.length], 0).join(",") + "];\n";
	    init += "	var start = [" + rep([dims.length], 0).join(",") + "];\n";
	    init += "	var   end = [" + rep([dims.length], 0).join(",") + "];\n\n";

	    for ( i = 0; i < dims.length; i++ ) {

		for ( j = 0; j < args.length; j++ ) {
		    if ( hash[args[j]] && actuals[j] !== undefined && typeof actuals[j] === "object" ) {
			init += "	end[" + i + "] = " + args[j] + ".shape[" + i + "];\n";
			break;
		    }
		}
	    }
	    init += "\n";

	    for ( i = 0; i < dims.length; i++ ) {
		setp += "	var "   + indx[i] + "start = start[" + i + "];\n";
		setp += "	var   " + indx[i] + "end =   end[" + i + "];\n";

	    }
	    setp += "\n";
	    for ( i = 0; i < dims.length; i++ ) {
		if ( hasIndex ) {
		    indxZero = "index[" + (dims.length - i - 1) + "] = 0;\n";
		    indxIncr = "	index[" + (dims.length - i - 1) + "]++\n";
		}
		    
		body = indxZero + "for ( var " + indi[i] + " = " + indi[i] + "start; " + indi[i] + " < " + indi[i] + "end; " + indi[i] + "++ ) {\n	" + body + "\n" + indxIncr + "\n    }";
	    }
	}

	func  = "// Array optimized funciton\n";
	func += "// " + type + "\n";
	func += "return function (" + args.join(",") + ") {\n'use strict';\n\n" + init + prep + setp + body + post + "\n}";

	if ( typed.debug ) { console.log(func); }

	if ( this.cache === undefined ) { this.cache = {}; }

	func = new Function(func)();
	this.cache[type] = func;

	return func;
    }


    function typedArrayFunctionExecute() {
	var func  = typedArrayFunctionConstructor.apply(this, arguments);

	var reply = func.apply(typed, arguments);

	return reply;
    }

    function typed(opts, func) {
	if ( func === undefined ) {
	    func = opts;
	    opts = undefined;
	}

	var objst = { func: func, opts: opts };
	var reply = typedArrayFunctionExecute.bind(objst);

	reply.baked = typedArrayFunctionConstructor.bind(objst);

	return reply;
    }

    var size = typed(function (a) {
	var prd = 1;
	// ----
	    prd *= a;
	// ----
	return prd;
    });

    function array(shape, DType, value) {
        var reply;
	var i, n;

	if ( typeof value !== "number" ) {
	    value = 0;
	}

	if ( DType && DType.dtype ) 	 { DType = DType.dtype;  }
	if ( typeof DType === "string" ) { DType = types[DType]; }

        if ( typeof DType === "function" ) {
	    n = size(shape);
	    reply = ndarray(new DType(n), shape);

	    for ( i = 0; i < n; i++ ) { reply.data[i] = value; }
	} else {
	    reply = rep(shape, value);
	}

	reply.shape = shape;

	return reply;
    }

    function clone (x) {
	return typed.assign(typed.array(typed.dim(x), x), x);
    }

    function iota(i, n) {
	if ( n === undefined ) {
	    n = i;
	    i = 0;
	}
	var j, result = [];
	for ( j = 0; j<n; j++ ) { result[j] = i; i += 1; }   

	return result;
    }


    function extend(obj) {
	var i, key;

	for( i = 1; i < arguments.length; i++) {
	    for ( key in arguments[i] ) {
		if ( arguments[i].hasOwnProperty(key) ) {
		    obj[key] = arguments[i][key];
		}
	    }
	}
	return obj;
    }

    function print(a, width, prec) {
	var x, y;
	var line;

	if ( width === undefined ) { width = 7; }
	if ( prec === undefined  ) { prec  = 3; }

	if ( a.shape.length === 1 ) {
	    line = "";
	    for (x=0;x<a.shape[0];++x) {
		line += a.get(x).toFixed(prec) + " ";
		//if ( x > 17 ) { break;}
	    }
	    console.log(line);
	} else {
	    for ( y = a.shape[0]-1; y >= 0; --y ) {
	      line = "";
	      for ( x = 0; x < a.shape[1]; ++x ) {
		line += a.get(y, x).toFixed(prec) + " ";
	      }

	      console.log(line);
	    }
	    console.log("\n");
	}
    }

    function section(a, sect) {
	    var x1 = sect[0][0];
	    var x2 = sect[0][1];
	    var y1 = sect[1][0];
	    var y2 = sect[1][1];

	    return a.lo(y1, x1).hi(y2-y1, x2-x1);
    }

    module.exports         = typed;
    module.exports.ndarray = ndarray;
    module.exports.section = section;
    module.exports.extend  = extend;
    module.exports.array   = array;
    module.exports.clone   = clone;
    module.exports.print   = print;
    module.exports.iota    = iota;
    module.exports.rep     = rep;
    module.exports.dim     = dim;

    module.exports.epsilon = 2.220446049250313e-16;
}());


},{"ndarray-nobuffer":2}],5:[function(require,module,exports){
/*jslint white: true, vars: true, plusplus: true, nomen: true, unparam: true, evil: true, regexp: true */
/*globals */ 

"use strict";

(function () {
    var i;
    var typed = require("typed-array-function");

    var ops = {}, opname, op;
    module.exports = ops;

    function twofourthr(ops) {				// Allocate an output array as needed
        var dima, dimb, shape;

	return function (a, b, c) {
	    if ( c === undefined ) {
	 	dima = typed.dim(a);
	 	dimb = typed.dim(b);

		if ( dima.length > dimb.length ) {
		    shape = dima;
		} else {
		    shape = dimb;
		} 
	    	c = b; b = a; a = typed.array(shape, b);
	    }

	    return ops(a, b, c);
	};
    }
    function onefourtwo(ops) {				// Allocate an output array as needed
	return function (a, b) {
	    if ( b === undefined ) { b = a; a = typed.array(typed.dim(b), b); }

	    return ops(a, b);
	};
    }

    function twofourthr_bake(op) {
	return function(a, b, c) {
	    if ( c === undefined )  { return twofourthr(op.baked(a, b, c)); }

	    return op.baked(a, b, c);
	};
    }
    function onefourtwo_bake(op) {
	return function(a, b) {
	    if ( b === undefined )  { return onefourtwo(op.baked(a, b)); }

	    return op.baked(a, b);
	};
    }


    var assign_ops = { add:  "+", sub:  "-", mul:  "*", div:  "/",
		       mod:  "%", band: "&", bor:  "|", bxor: "^",
		       lshift: "<<", rshift: ">>", rrshift: ">>>"
    };

      for(opname in assign_ops) {
	if ( assign_ops.hasOwnProperty(opname) ) {
	    op = assign_ops[opname];

	    ops[opname + "3"]       = typed("function (a, b, c)    {            a = b " + op + " c; }");
	    ops[opname + "_mask"]   = typed("function (a, b, c, m) { if ( m ) { a = b " + op + " c; } }");
	    ops[opname + "eq"]      = typed("function (a, b   )    {            a " + op + "= b;    }  ");
	    ops[opname + "eq_mask"] = typed("function (a, b   , m) { if ( m ) { a " + op + "= b;    } }");

	    ops[opname]       = twofourthr     (ops[opname + "3"]);
	    ops[opname].baked = twofourthr_bake(ops[opname + "3"]);

	    ops[opname + "s"]   = ops[opname];
	    ops[opname + "seq"] = ops[opname + "eq"];
	}
      }

    var binary_ops = { and: "&&", or: "||",
		       eq: "===", neq: "!==", lt: "<",
		       gt: ">", leq: "<=", geq: ">=" };

      for(opname in binary_ops) {
	if ( binary_ops.hasOwnProperty(opname) ) {
	    op = binary_ops[opname];

	    ops[opname + "3"]            = typed("function (a, b, c)    {            a = b " + op + " c; }");
	    ops[opname + "_mask"]        = typed("function (a, b, c, m) { if ( m ) { a = b " + op + " c; } }");
	    ops[opname + "eq"]           = typed("function (a, b   )    {            a = a " + op + " b; }  ");
	    ops[opname + "eq_mask"]      = typed("function (a, b   , m) { if ( m ) { a = a " + op + " b; } }");

	    ops[opname]       = twofourthr     (ops[opname + "3"]);
	    ops[opname].baked = twofourthr_bake(ops[opname + "3"]);

	    ops[opname + "s"]   = ops[opname];
	    ops[opname + "seq"] = ops[opname + "eq"];
	}
      }


    var unary_ops = { not: "!", bnot: "~", neg: "-", recip: "1.0/" };

      for(opname in unary_ops) {
	if ( unary_ops.hasOwnProperty(opname) ) {
	    op = unary_ops[opname];
		
	    ops[opname + "2"]            = typed("function (a, b   )    {            a = " + op + " b; }");
	    ops[opname + "_mask"]        = typed("function (a, b   , m) { if ( m ) { a = " + op + " b; } }");
	    ops[opname + "eq"]           = typed("function (a      )    {            a = " + op + " a; }");
	    ops[opname + "eq" + "_mask"] = typed("function (a      , m) { if ( m ) { a = " + op + " a; } }");

	    ops[opname]       = onefourtwo     (ops[opname + "2"]);
	    ops[opname].baked = onefourtwo_bake(ops[opname + "2"]);
	}
      }

    var math_unary = [ "Math.abs", "Math.exp", "Math.floor", "Math.log", "Math.round", "Math.sqrt"
		    , "Math.acos", "Math.asin", "Math.atan", "Math.ceil", "Math.cos", "Math.sin", "Math.tan"
		    , "isFinite", "isNaN" ]; 

      for( i = 0; i < math_unary.length; i++ ) {
	    op = math_unary[i];

	    opname = op.split(".")

	    if ( opname.length == 2 ) {
		opname = opname[1]
	    } else {
		opname = opname[0]
	    }

	    ops[opname + "2"]            = typed("function (a, b   )    {            a = " + op + "(b); }");
	    ops[opname + "_mask"]        = typed("function (a, b   , m) { if ( m ) { a = " + op + "(b); } }");
	    ops[opname + "eq"]           = typed("function (a      )    {            a = " + op + "(a); }");
	    ops[opname + "eq" + "_mask"] = typed("function (a      , m) { if ( m ) { a = " + op + "(a); } }");

	    ops[opname]       = onefourtwo     (ops[opname + "2"]);
	    ops[opname].baked = onefourtwo_bake(ops[opname + "2"]);
      }

    var math_comm = [ "max", "min" ];

      for( i = 0; i < math_comm.length; i++ ) {
	opname = op = math_comm[i];

	ops[opname + "3"]            = typed("function (a, b, c)    {            a = Math." + op + "(b, c); }");
	ops[opname + "_mask"]        = typed("function (a, b, c, m) { if ( m ) { a = Math." + op + "(b, c); } }");

	ops[opname]       = twofourthr     (ops[opname + "3"]);
	ops[opname].baked = twofourthr_bake(ops[opname + "3"]);

	ops[opname + "s"]        = ops[opname];
	ops[opname + "s" + "eq"] = ops[opname];
      }

    var math_noncomm = [ "atan2", "pow" ];

      for( i = 0; i < math_noncomm.length; i++ ) {
	opname = op = math_noncomm[i];

	ops[opname + "3"]            = typed("function (a, b, c)    {            a = Math." + op + "(b, c); }");
	ops[opname + "_mask"]        = typed("function (a, b, c, m) { if ( m ) { a = Math." + op + "(b, c); } }");

	ops[opname]       = twofourthr     (ops[opname + "3"]);
	ops[opname].baked = twofourthr_bake(ops[opname + "3"]);

	ops[opname + "s"]        = ops[opname];
	ops[opname + "s" + "eq"] = ops[opname];
      }

    ops.assign   = typed(function (a, b) { a = b; });
    ops.equals   = typed(function (a, b) { if ( a !== b )   { return false; } });
    ops.any      = typed(function (a) { if ( a )            { return true;  } });
    ops.all      = typed(function (a) { if (!a )            { return false; } });
    ops.random   = typed(function (a)    { a = Math.random(); });
    ops.sum  = typed(function (a) {
	var sum = 0; 
	// ----
	    sum += a;
	// ----
	return sum;
    });
    ops.prod = typed(function (a) {
	var prd = 1;
	// ----
	    prd *= a;
	// ----
	return prd;
    });

    ops.inf  = typed(function (a) {
	var inf =  Infinity;
	// ----
	    if ( a < inf ) { inf = a; }
	// ----
	return inf;
    });
    ops.sup  = typed(function (a) {
	var sup = -Infinity;
	// ----
	    if ( a > sup ) { sup = a; }
	// ----
	return sup;
    });


    ops.norm2Squared = typed(function (a) {
	var norm2 = 0;
	// ----    
	    norm2 += a*a;
	// ----    
	return norm2;
    });
    ops.norm2 = function (a) { return Math.sqrt(ops.norm2Squared(a)); };

	//norm1
	//norminf

	//argmin
	//argmax

}());
 

},{"typed-array-function":4}],6:[function(require,module,exports){
"use strict"

function interp1d(arr, x) {
  var ix = Math.floor(x)
    , fx = x - ix
    , s0 = 0 <= ix   && ix   < arr.shape[0]
    , s1 = 0 <= ix+1 && ix+1 < arr.shape[0]
    , w0 = s0 ? +arr.get(ix)   : 0.0
    , w1 = s1 ? +arr.get(ix+1) : 0.0
  return (1.0-fx)*w0 + fx*w1
}

function interp2d(arr, x, y) {
  var ix = Math.floor(x)
    , fx = x - ix
    , s0 = 0 <= ix   && ix   < arr.shape[0]
    , s1 = 0 <= ix+1 && ix+1 < arr.shape[0]
    , iy = Math.floor(y)
    , fy = y - iy
    , t0 = 0 <= iy   && iy   < arr.shape[1]
    , t1 = 0 <= iy+1 && iy+1 < arr.shape[1]
    , w00 = s0&&t0 ? arr.get(ix  ,iy  ) : 0.0
    , w01 = s0&&t1 ? arr.get(ix  ,iy+1) : 0.0
    , w10 = s1&&t0 ? arr.get(ix+1,iy  ) : 0.0
    , w11 = s1&&t1 ? arr.get(ix+1,iy+1) : 0.0
  return (1.0-fy) * ((1.0-fx)*w00 + fx*w10) + fy * ((1.0-fx)*w01 + fx*w11)
}

function interp3d(arr, x, y, z) {
  var ix = Math.floor(x)
    , fx = x - ix
    , s0 = 0 <= ix   && ix   < arr.shape[0]
    , s1 = 0 <= ix+1 && ix+1 < arr.shape[0]
    , iy = Math.floor(y)
    , fy = y - iy
    , t0 = 0 <= iy   && iy   < arr.shape[1]
    , t1 = 0 <= iy+1 && iy+1 < arr.shape[1]
    , iz = Math.floor(z)
    , fz = z - iz
    , u0 = 0 <= iz   && iz   < arr.shape[2]
    , u1 = 0 <= iz+1 && iz+1 < arr.shape[2]
    , w000 = s0&&t0&&u0 ? arr.get(ix,iy,iz)       : 0.0
    , w010 = s0&&t1&&u0 ? arr.get(ix,iy+1,iz)     : 0.0
    , w100 = s1&&t0&&u0 ? arr.get(ix+1,iy,iz)     : 0.0
    , w110 = s1&&t1&&u0 ? arr.get(ix+1,iy+1,iz)   : 0.0
    , w001 = s0&&t0&&u1 ? arr.get(ix,iy,iz+1)     : 0.0
    , w011 = s0&&t1&&u1 ? arr.get(ix,iy+1,iz+1)   : 0.0
    , w101 = s1&&t0&&u1 ? arr.get(ix+1,iy,iz+1)   : 0.0
    , w111 = s1&&t1&&u1 ? arr.get(ix+1,iy+1,iz+1) : 0.0
  return (1.0-fz) * ((1.0-fy) * ((1.0-fx)*w000 + fx*w100) + fy * ((1.0-fx)*w010 + fx*w110)) + fz * ((1.0-fy) * ((1.0-fx)*w001 + fx*w101) + fy * ((1.0-fx)*w011 + fx*w111))
}

function interpNd(arr) {
  var d = arr.shape.length|0
    , ix = new Array(d)
    , fx = new Array(d)
    , s0 = new Array(d)
    , s1 = new Array(d)
    , i, t
  for(i=0; i<d; ++i) {
    t = +arguments[i+1]
    ix[i] = Math.floor(t)
    fx[i] = t - ix[i]
    s0[i] = (0 <= ix[i]   && ix[i]   < arr.shape[i])
    s1[i] = (0 <= ix[i]+1 && ix[i]+1 < arr.shape[i])
  }
  var r = 0.0, j, w, idx
i_loop:
  for(i=0; i<(1<<d); ++i) {
    w = 1.0
    idx = arr.offset
    for(j=0; j<d; ++j) {
      if(i & (1<<j)) {
        if(!s1[j]) {
          continue i_loop
        }
        w *= fx[j]
        idx += arr.stride[j] * (ix[j] + 1)
      } else {
        if(!s0[j]) {
          continue i_loop
        }
        w *= 1.0 - fx[j]
        idx += arr.stride[j] * ix[j]
      }
    }
    r += w * arr.data[idx]
  }
  return r
}

function interpolate(arr, x, y, z) {
  switch(arr.shape.length) {
    case 0:
      return 0.0
    case 1:
      return interp1d(arr, x)
    case 2:
      return interp2d(arr, x, y)
    case 3:
      return interp3d(arr, x, y, z)
    default:
      return interpNd.apply(undefined, arguments)
  }
}
module.exports = interpolate
module.exports.d1 = interp1d
module.exports.d2 = interp2d
module.exports.d3 = interp3d

},{}],7:[function(require,module,exports){
/*jslint white: true, vars: true, plusplus: true, nomen: true, unparam: true, bitwise: true */

"use strict";

var interp = require("ndarray-linear-interpolate");
var typed = require("typed-array-function");

var do_warp = typed(function (dest, func, interp) {
    var warped = dest.shape.slice(0);

    var iX = 0, iY = 0, iZ = 0;

    // ----
	func(warped, [iX, iY, iZ]);
	dest = interp.apply(undefined, warped);
    // ----
});
        
var do_warp_1 = typed(function (dest, func, interp, src) {
    var warped = [0];
    var SRC = src;

    var iX = 0;

    // ----
	func(warped, [iX]);
	dest = interp(SRC, warped[0]);
    // ----
});

var do_warp_2 = typed(function (dest, func, interp, src) {
    var warped = [0, 0];
    var SRC = src;

    var iX = 0, iY = 0;

    // ----
	func(warped, [iY, iX]);
	dest = interp(SRC, warped[0], warped[1]);
    // ----
});

var do_warp_3 = typed(function (dest, func, interp, src) {
    var warped = [0, 0, 0];
    var SRC = src;

    var iX = 0, iY = 0, iZ = 0;

    // ----
	func(warped, [iZ, iY, iX]);
	dest = interp(SRC, warped[0], warped[1], warped[2]);
    // ----
});

module.exports = function warp(dest, src, func) {
  switch(src.shape.length) {
    case 1:
      do_warp_1(dest, func, interp.d1, src);
      break;
    case 2:
      do_warp_2(dest, func, interp.d2, src);
      break;
    case 3:
      do_warp_3(dest, func, interp.d3, src);
      break;
    default:
      do_warp(dest, func, interp.bind(undefined, src));
      break;
  }
  return dest;
};

},{"ndarray-linear-interpolate":6,"typed-array-function":4}],8:[function(require,module,exports){
/*jslint white: true, vars: true, plusplus: true, nomen: true, unparam: true, bitwise: true */

"use strict";

var warp = require("typed-array-warp");


function rotateImage(out, inp, theta, iX, iY, oX, oY) {
  var c = Math.cos(theta);
  var s = Math.sin(-theta);
  iX = iX || inp.shape[0]/2.0;
  iY = iY || inp.shape[1]/2.0;
  oX = oX || out.shape[0]/2.0;
  oY = oY || out.shape[1]/2.0;
  var a = iX - c * oX + s * oY;
  var b = iY - s * oX - c * oY;
  warp(out, inp, function(y,x) {
    y[0] = c * x[0] - s * x[1] + a;
    y[1] = s * x[0] + c * x[1] + b;
  });
  return out;
}

module.exports = rotateImage;

},{"typed-array-warp":7}],9:[function(require,module,exports){
/*jslint white: true, vars: true, plusplus: true, nomen: true, unparam: true, evil: true, regexp: true, bitwise: true */
/*jshint node: true, -W099: true, laxbreak:true, laxcomma:true, multistr:true, smarttabs:true */
/*globals */ 

"use strict";

var typed   = require("typed-array-function");
var numeric = typed;


typed.dot = function dot(x,y) {
    var d = numeric.dim;

    var dimx = d(x);
    var dimy = d(y);

    switch(d(x).length*1000+d(y).length) {
	case 2002: return numeric.dotMM(numeric.array([dimx[0], dimy[1]], x.dtype), x,y);
	case 2001: return numeric.dotMV(x,y);
	case 1002: return numeric.dotVM(x,y);
	case 1001: return numeric.dotVV(x,y);
	case 1000: return numeric.mulVS(x,y);
	case 1: return numeric.mulSV(x,y);
	case 0: return x*y;
	default: throw new Error('numeric.dot only works on vectors and matrices');
    }
};

numeric.dotVV = function dotVV(x,y) {
    var i,n=x.length,i1,ret = x[n-1]*y[n-1];

    for(i=n-2;i>=1;i-=2) {
	i1 = i-1;
	ret += x[i]*y[i] + x[i1]*y[i1];
    }
    if(i===0) { ret += x[0]*y[0]; }

    return ret;
};

numeric.dotMV = function dotMV(x,y) {
    var i, p = x.length;
    var ret = this.array([p], x.dtype), dotVV = this.dotVV;
    for(i=p-1;i>=0;i--) { ret[i] = dotVV(x[i],y); }
    return ret;
};

numeric.dotVM = function dotVM(x,y) {
    var j,k,p,q,ret,woo,i0;
    p = x.length; q = y[0].length;
    ret = numeric.array([q], x.dtype);
    for(k=q-1;k>=0;k--) {
	woo = x[p-1]*y[p-1][k];
	for(j=p-2;j>=1;j-=2) {
	    i0 = j-1;
	    woo += x[j]*y[j][k] + x[i0]*y[i0][k];
	}
	if(j===0) { woo += x[0]*y[0][k]; }
	ret[k] = woo;
    }
    return ret;
};

numeric.dotMM = function dotMM(reply,x,y) {
    var i,j,k,r=reply.shape[1],foo,bar,woo,i0;

    var p = x.length;
    var q = y.length;

    for(i=p-1;i>=0;i--) {
	foo = reply[i];
	bar = x[i];

	for(k=r-1;k>=0;k--) {
	    woo = bar[q-1]*y[q-1][k];
	    for(j=q-2;j>=1;j-=2) {
		i0 = j-1;
		woo += bar[j]*y[j][k] + bar[i0]*y[i0][k];
	    }
	    if(j===0) { woo += bar[0]*y[0][k]; }
	    foo[k] = woo;
	}
	//ret[i] = foo;
    }
};

numeric.diag = function diag(d) {
    var i,i1,j,n = d.length, A = this.array([n, n], d.dtype), Ai;
    for(i=n-1;i>=0;i--) {
	Ai = A[i];
	i1 = i+2;
	for(j=n-1;j>=i1;j-=2) {
	    Ai[j] = 0;
	    Ai[j-1] = 0;
	}
	if(j>i) { Ai[j] = 0; }
	Ai[i] = d[i];
	for(j=i-1;j>=1;j-=2) {
	    Ai[j] = 0;
	    Ai[j-1] = 0;
	}
	if(j===0) { Ai[0] = 0; }
	//A[i] = Ai;
    }
    return A;
};
numeric.identity = function identity(n, type) { return this.diag(this.array([n],type,1)); };

numeric.tensorXX = function tensor(A,x,y) {
    var m = x.length, n = y.length, Ai, i,j,xi;


    for(i=m-1;i>=0;i--) {
	Ai = A[i];
	xi = x[i];
	for(j=n-1;j>=3;--j) {
	    Ai[j] = xi * y[j];
	    --j;
	    Ai[j] = xi * y[j];
	    --j;
	    Ai[j] = xi * y[j];
	    --j;
	    Ai[j] = xi * y[j];
	}
	while(j>=0) { Ai[j] = xi * y[j]; --j; }
    }

    //console.log(x, y, A[0], A[1]);
};
numeric.tensorXX = typed({ loops: false }, numeric.tensorXX);
numeric.tensor   = function tensor(x,y) {

    if(typeof x === "number" || typeof y === "number") { return numeric.mul(x,y); }
    var s1 = numeric.dim(x);
    var s2 = numeric.dim(y);
    if(s1.length !== 1 || s2.length !== 1) {
	throw new Error('numeric: tensor product is only defined for vectors');
    }
    
    return numeric.tensorXX(numeric.array([s1[0], s2[0]], x.dtype), x, y);
};


numeric.dotVV = typed({ loops: false }, numeric.dotVV);
numeric.dotVM = typed({ loops: false }, numeric.dotVM);
numeric.dotMV = typed({ loops: false }, numeric.dotMV);
numeric.dotMM = typed({ loops: false }, numeric.dotMM);
numeric.diag  = typed({ loops: false }, numeric.diag);


},{"typed-array-function":4}],10:[function(require,module,exports){


var numeric =                         require("typed-array-function");
    numeric = numeric.extend(numeric, require("typed-array-ops"));
    numeric = numeric.extend(numeric, require("typed-matrix-ops"));

//9. Unconstrained optimization
exports.gradient = function gradient(f,x) {
    var n = x.length;
    var f0 = f(x);
    if(isNaN(f0)) throw new Error('gradient: f(x) is a NaN!');
    var i,x0 = numeric.clone(x),f1,f2, J = Array(n);
    var errest,roundoff,max = Math.max,eps = 1e-3,abs = Math.abs, min = Math.min;
    var t0,t1,t2,it=0,d1,d2,N;
    for(i=0;i<n;i++) {
        var h = max(1e-6*f0,1e-8);
        while(1) {
            ++it;
            if(it>20) { throw new Error("Numerical gradient fails"); }
            x0[i] = x[i]+h;
            f1 = f(x0);
            x0[i] = x[i]-h;
            f2 = f(x0);
            x0[i] = x[i];
            if(isNaN(f1) || isNaN(f2)) { h/=16; continue; }
            J[i] = (f1-f2)/(2*h);
            t0 = x[i]-h;
            t1 = x[i];
            t2 = x[i]+h;
            d1 = (f1-f0)/h;
            d2 = (f0-f2)/h;
            N = max(abs(J[i]),abs(f0),abs(f1),abs(f2),abs(t0),abs(t1),abs(t2),1e-8);
            errest = min(max(abs(d1-J[i]),abs(d2-J[i]),abs(d1-d2))/N,h/N);
            if(errest>eps) { h/=16; }
            else break;
            }
    }
    return J;
}
exports.uncmin = function uncmin(f,x0,tol,gradient,maxit,callback,options) {
    var grad = exports.gradient;
    if(typeof options === "undefined") { options = {}; }
    if(typeof tol === "undefined") { tol = 1e-8; }
    if(typeof gradient === "undefined") { gradient = function(x) { return grad(f,x); }; }
    if(typeof maxit === "undefined") maxit = 1000;
    x0 = numeric.clone(x0);
    var n = x0.length;
    var f0 = f(x0),f1,df0;
    if(isNaN(f0)) throw new Error('uncmin: f(x0) is a NaN!');
    var max = Math.max, norm2 = numeric.norm2;
    tol = max(tol,numeric.epsilon);
    var step,g0,g1,H1 = options.Hinv || numeric.identity(n);
    var dot = numeric.dot, sub = numeric.sub, add = numeric.add, ten = numeric.tensor, div = numeric.div, mul = numeric.mul;

    var all = numeric.all, isfinite = numeric.isFinite, neg = numeric.neg;
    var it=0,i,s,x1,y,Hy,Hs,ys,i0,t,nstep,t1,t2;
    var msg = "";
    g0 = gradient(x0);
    while(it<maxit) {
        if(typeof callback === "function") { if(callback(it,x0,f0,g0,H1)) { msg = "Callback returned true"; break; } }
        if(!all(isfinite(g0))) { msg = "Gradient has Infinity or NaN"; break; }
        step = neg(dot(H1,g0));
        if(!all(isfinite(step))) { msg = "Search direction has Infinity or NaN"; break; }
        nstep = norm2(step);
        if(nstep < tol) { msg="Newton step smaller than tol"; break; }
        t = 1;
        df0 = dot(g0,step);
        // line search
        x1 = x0;
        while(it < maxit) {
            if(t*nstep < tol) { break; }
            s  = mul(step,t);
            x1 = add(x0,s);
            f1 = f(x1);
            if(f1-f0 >= 0.1*t*df0 || isNaN(f1)) {
                t *= 0.5;
                ++it;
                continue;
            }
            break;
        }
        if(t*nstep < tol) { msg = "Line search step size smaller than tol"; break; }
        if(it === maxit) { msg = "maxit reached during line search"; break; }
        g1 = gradient(x1);

        y  = sub(g1,g0);
        ys = dot(y,s);
        Hy = dot(H1,y);

        H1 = sub(add(H1,
                mul(
                        (ys+dot(y,Hy))/(ys*ys),
                        ten(s,s)    )),
                div(add(ten(Hy,s),ten(s,Hy)),ys));
        x0 = x1;
        f0 = f1;
        g0 = g1;
        ++it;

    }
    return {solution: x0, f: f0, gradient: g0, invHessian: H1, iterations:it, message: msg};
}

},{"typed-array-function":4,"typed-array-ops":5,"typed-matrix-ops":9}],11:[function(require,module,exports){
/*jslint white: true, vars: true, plusplus: true, nomen: true, unparam: true */
/*globals */ 

"use strict";

(function() {

    // http://cogsandlevers.blogspot.com/2013/11/scanline-based-filled-polygons.html
    //
    function drawHLine(buffer, width, x1, x2, y, k, rop) {

	if ( x1 < 0     ) { x1 = 0;     }
	if ( x2 > width ) { x2 = width; }

	var ofs = x1 + y * width; 			// calculate the offset into the buffer
        var x;

	switch ( rop ) { 				// draw all of the pixels
	 case undefined:
	 case "set": for (x = x1; x < x2; x++) { buffer[ofs++]  = k; } break;
	 case "add": for (x = x1; x < x2; x++) { buffer[ofs++] += k; } break;
	}
    }

    function scanline(x1, y1, x2, y2, miny, edges) {
	var x, y, xi;

	if (y1 > y2) { 					// flip the points if need be
	     y = y1; y1 = y2; y2 = y;
	     x = x1; x1 = x2; x2 = x;
	}

	y1 = Math.floor(y1)+1;
	y2 = Math.floor(y2);

	//if ( y2 < y1 ) { y2++ }

	x = x1; 					// start at the start
	var dx = (x2 - x1) / (y2 - y1); 		// change in x over change in y will give us the gradient
	var ofs = Math.round(y1 - miny); 		// the offset the start writing at (into the array)

	for ( y = y1; y <= y2; y++ ) { 		// cover all y co-ordinates in the line

	    xi = Math.floor(x) + 1;

	    // check if we've gone over/under the max/min
	    //
	    if ( edges[ofs].minx > xi ) { edges[ofs].minx = xi; }
	    if ( edges[ofs].maxx < xi ) { edges[ofs].maxx = xi; }

	    x += dx; 					// move along the gradient
	    ofs ++; 					// move along the buffer

	}
    }

    function _drawPolygon(buffer, width, points, color, rop) {
	var i;
	var miny = points[0].y-1; 			// work out the minimum and maximum y values
	var maxy = points[0].y-1;

	for ( i = 1; i < points.length; i++ ) {
	    if ( points[i].y-1 < miny) { miny = points[i].y-1; }
	    if ( points[i].y-1 > maxy) { maxy = points[i].y-1; }
	}

	var h = maxy - miny; 				// the height is the size of our edges array
	var edges = [];

	for ( i = 0; i <= h+1; i++ ) { 			// build the array with unreasonable limits
	    edges.push({ minx:  1000000, maxx: -1000000 });
	}

	for ( i = 0; i < points.length-1; i++ ) { 	// process each line in the polygon
	    scanline(points[i  ].x-1, points[i  ].y-1
		   , points[i+1].x-1, points[i+1].y-1, miny, edges);
	}
	scanline(points[i].x-1, points[i].y-1, points[0].x-1, points[0].y-1, miny, edges);

	// draw each horizontal line
	for ( i = 0; i < edges.length; i++ ) {
	    drawHLine( buffer, width
		     , Math.floor(edges[i].minx)
		     , Math.floor(edges[i].maxx)
		     , Math.floor(i + miny), color, rop);
	}
    }

    function d2r(d) { return d * (Math.PI / 180); }

    function rotPoints(points, angle, about) {
	var x, y, i;
	var reply = [];

	angle = d2r(angle);

	var sin = Math.sin(angle);
	var cos = Math.cos(angle);

	for ( i = 0; i < points.length; i++ ) {
	    x = about.x + (((points[i].x-about.x) * cos) - ((points[i].y-about.y) * sin));
	    y = about.y + (((points[i].x-about.x) * sin) + ((points[i].y-about.y) * cos));

	    reply.push({ x: x, y: y });
	}

	return reply;
    }

    function polyEllipse(x, y, w, h) {
	var ex, ey, i;
	var reply = [];

	for ( i = 0; i < 2 * Math.PI; i += 0.01 ) {
	    ex = x + w*Math.cos(i);
	    ey = y + h*Math.sin(i);

	    reply.push({ x: ex, y: ey });
	}

	return reply;
    }

    function polyBox(x, y, w, h) {
	return [  { x: x-w/2, y: y-h/2 }
		, { x: x-w/2, y: y+h/2 }
		, { x: x+w/2, y: y+h/2 }
		, { x: x+w/2, y: y-h/2 } ];
    }

    exports.drawPolygon = function (buffer, width, points,    color, rop)       { _drawPolygon(buffer, width, points,                      color, rop); };
    exports.drawCircle  = function (buffer, width, x, y, rad, color, rop)       { _drawPolygon(buffer, width, polyEllipse(x, y, rad, rad), color, rop); };
    exports.drawEllipse = function (buffer, width, x, y, h, w, rot, color, rop) { _drawPolygon(buffer, width, rotPoints(polyEllipse(x, y, h, w), rot, { x: x, y: y }), color, rop); };
    exports.drawBox     = function (buffer, width, x, y, h, w, rot, color, rop) { _drawPolygon(buffer, width, rotPoints(polyBox    (x, y, h, w), rot, { x: x, y: y }), color, rop); };
}());

},{}],12:[function(require,module,exports){
/*jslint white: true, vars: true, plusplus: true, nomen: true, unparam: true */

"use strict";


    function strrep(str, n) {
	var i, s = '';

	for ( i = 0; i < n; i++ ) { s += str; }

	return s;
    }

function template(text,data) {
    return text.replace(/\{([a-zA-Z0-9_.%]*)\}/g,
	function(m,key){
	    var type, prec, widt = 0, fmt, i;
	    var val = data;
	
	    key = key.split("%");

	    if ( key.length <= 1 ) {
		fmt = "%s";
	    } else {
		fmt = key[1];
	    }

	    key = key[0];
	    key = key.split(".");

	    for ( i = 0; i < key.length; i++ ) {
		if ( val.hasOwnProperty(key[i]) ) {
		    val = val[key[i]];
		} else {
		    return "";
		}
	    }

	    type = fmt.substring(fmt.length-1);
	    prec = fmt.substring(0, fmt.length-1);

	    prec = prec.split(".");

	    widt = prec[0] | 0;
	    prec = prec[1] | 0;

	    switch ( type ) {
	     case "s":
		val = val.toString();
		break;
	     case "f":
		val = val.toFixed(prec);
		break;
	     case "d":
		val = val.toFixed(0);
		break;
	    }

	    if ( widt !== 0 && widt > val.length ) {
		if ( widt > 0 ) {
		    val = strrep(" ", widt-val.length) + val;
		} else {
		    val = val + strrep(" ", widt-val.length);
		}
	    }

	    return val;
	}
    );
}

module.exports = template;

},{}]},{},[]);

/*jslint white: true, vars: true, plusplus: true, nomen: true, unparam: true */
/*globals $, JS9 */ 

"use strict";


(function() {
    var imexam = require("./imexam");

    var encen_template = " 						\
    	<div style='position:absolute;right: 10px;bottom:50px'>		\
        <table>								\
	    <tr><td>ee50</td><td align=right>{ee50%.2f}</td><tr>	\
	    <tr><td>ee80</td><td align=right>{ee80%.2f}</td><tr>	\
        </table>							\
	</div>";

    function energUpdate(im, xreg) {
        var div = this.div;

	    var imag = imexam.getRegionData(im, xreg);

            var backgr  = imexam.imops.backgr(imag, 4).value;
            var data    = imexam.ndops.assign(imexam.ndops.zeros(imag.shape), imag);

            imexam.ndops.subs(data, imag, backgr);

            var qcenter  = imexam.ndops.qcenter(data);
            var centroid = imexam.ndops.centroid(data, qcenter);

	    var encen = imexam.imops.encen(data, [centroid.ceny, centroid.cenx]);

	    var stat       = {};
	    stat.ee80  = imexam.ndops.indexof(encen, 0.80);
	    stat.ee50  = imexam.ndops.indexof(encen, 0.50);

	    var edata = [];
	    var i;

	    for ( i = 0;  i < encen.shape[0]; i++ ) {
		edata[i] = [i, encen.get(i)];
	    }

            $(div).empty();
	    var plot = $.plot(div, [edata]
		    , { selection: { mode: "xy" } });

	    $(div).append(imexam.template(encen_template, stat));
    }

    function energInit() {
	imexam.fixupDiv(this);
        $(this.div).append("<p style='padding: 20px 0px 0px 20px; margin: 0px'>create, click, move, or resize a region to see encircled energy<br>");
    }

    JS9.RegisterPlugin("ImExam", "EncEnergy", energInit, {
	    menu: "analysis",

            menuItem: "Encircled Energy",
            winTitle: "Encircled Energy",
	    help:     "imexam/imexam.html#enener",

	    dynamicSelect: true,

	    toolbarSeparate: true,

            onregionschange: energUpdate,
            winDims: [250, 250],
    });

}());
/*jslint white: true, vars: true, plusplus: true, nomen: true, unparam: true, continue: true */
/*globals $, JS9, greg */ 

"use strict";


(function () {
    var imexam = require("./imexam");

/*
    $("table").delegate('td','mouseover mouseleave', function(e) {
	if (e.type == 'mouseover') {
	    $(this).parent().addClass("hover");
	    $("colgroup").eq($(this).index()).addClass("hover");
	} else {
	    $(this).parent().removeClass("hover");
	    $("colgroup").eq($(this).index()).removeClass("hover");
	}
    });
 */

    function strrep(str, n, x) {
        var i;
	var rx = new RegExp(x, "g");

	var s = '';
	for ( i = 0; i < n; i++ ) {
	    s += str.replace(rx, i);
	}
	return s;
    }

    function htmlTable(x, y) {
	var t = "<table cellpadding=0 cellspacing=0>";

	t      += strrep( "<tr>"
		+ strrep("<td ><input class='col%x row%y' type=entry size=6 name=cell%y.%x value=0></td>", x, "%x") 
		+ "</tr>\n", y, "%y");
	t    += "</table>";

	return t;
    }


  //   $(this).css({"font-size" : newFontSize, "line-height" : newFontSize/1.2 + "px"});

    function pxtablUpdate(im, point) {
            var im_2d   = imexam.ndops.ndarray(im.raw.data, [im.raw.height, im.raw.width]);
	    var i = 0, j = 0;
	    var x, y;


	    var pxtabl = $(this.div).find(".pxtabl")[0];

	    pxtabl["cell" + j + "." + i].value = "col\\row";

	    j = 0;
	    for ( i = 1; i < 10; i++ ) {
		x = point.x + i - 5;

		if ( x > 0 && x <= im.raw.width ) {
		    pxtabl["cell" + j + "." + i].value = x.toFixed(0);
		} else {
		    pxtabl["cell" + j + "." + i].value = "";
		}
	    }

	    i = 0;
	    for ( j = 1; j < 10; j++ ) {
		y = point.y + j - 5;

		if ( y > 0 && y <= im.raw.height ) {
		    pxtabl["cell" + (10-j) + "." + i].value = y.toFixed(0);
		} else {
		    pxtabl["cell" + (10-j) + "." + i].value = "";
		}
	    }

	    for ( j = 1; j < 10; j++ ) {
	    for ( i = 1; i < 10; i++ ) {
		x = (point.x + i - 5 - 0.5)|0;
		y = (point.y + j - 5 - 0.5)|0;

		if ( x >= 0 && x < im.raw.width && y >= 0 && y < im.raw.height ) {
		    pxtabl["cell" + (10-j) + "." + i].value = im_2d.get(y, x).toPrecision(4);
		} else {
		    pxtabl["cell" + (10-j) + "." + i].value = "";
		}
	    }
	    }
    }

    function pxtablInit() {
	imexam.fixupDiv(this);

	$(this.div).html("<form class=pxtabl>" + htmlTable(10, 10) + "</form>");
	$(this.div).find(".row5").css("background", "lightblue");
	$(this.div).find(".col5").css("background", "lightblue");
	$(this.div).find(":input").css("font-size", "11");
    }

    JS9.RegisterPlugin("ImExam", "PxTabl", pxtablInit, {
	    menu: "view",

            menuItem: "Pixel Table",
            winTitle: "Pixel Table",
	    winResize: true,

	    toolbarSeparate: true,

            onmousemove: pxtablUpdate,
            winDims: [625, 240],
    });
}());

/*jslint white: true, vars: true, plusplus: true, nomen: true, unparam: true */
/*globals $, JS9 */ 

"use strict";


(function() {
    var imexam = require("./imexam");

    var rproj_template = "<div style='position:absolute;right: 10px;top:30px'> \
                    <table> \
                                    <tr><td>peak        </td><td align=right>{a%.2f}</td><tr> \
                                    <tr><td>sigma       </td><td align=right>{c%.2f}</td><tr> \
                                    <tr><td>bias        </td><td align=right>{d%.2f}</td><tr> \
                    </table> \
                    </div>";

    function rprojUpdate(im, xreg) {
        var div = this.div;

	    var imag = imexam.getRegionData(im, xreg);

            var max     = imexam.ndops.maxvalue(imag);
            var backgr  = imexam.imops.backgr(imag, 4).value;
            var data    = imexam.ndops.assign(imexam.ndops.zeros(imag.shape), imag);

            imexam.ndops.subs(data, imag, backgr);

            var qcenter  = imexam.ndops.qcenter(data);
            var centroid = imexam.ndops.centroid(data, qcenter);

            var rproj    = imexam.imops.rproj(imag, [centroid.ceny, centroid.cenx]);

            var fit = imexam.ndops.gsfit1d(rproj.radi, rproj.data, [max, centroid.fwhm/2.355, backgr]);
	
            var fitv = { a: fit[0], b: 0, c: fit[1], d: fit[2] };

            var rdata = [];
            var rfdat = [];
            var r;

            for ( r = 0;  r < rproj.radi.shape[0]; r++ ) {
                    rdata[r] = [rproj.radi.get(r), rproj.data.get(r)];
            }

            rproj.samp = imexam.ndops.zeros([div.offsetWidth/2]);

            imexam.ndops.fill(rproj.samp, function(r) { return rproj.radius*r/(div.offsetWidth/2); });


            rproj.modl = imexam.ndops.gauss1d(rproj.samp, fit);

            for ( r = 0;  r < rproj.modl.shape[0]; r++ ) {
		rfdat[r] = [rproj.samp.get(r), rproj.modl.get(r)];
            }

            $(div).empty();
            var plot = $.plot(div, [{ data: rdata, points: { radius: 1, show: true } }, { data: rfdat }]
		    , { zoomStack: true, selection: { mode: "xy" } });

            $(div).append(imexam.template(rproj_template, fitv));
    }

    function rprojInit() {
	imexam.fixupDiv(this);
        $(this.div).append("<p style='padding: 20px 0px 0px 20px; margin: 0px'>create, click, move, or resize a region to see radial projection<br>");
    }

    JS9.RegisterPlugin("ImExam", "RadialProj", rprojInit, {
	    menu: "analysis",

            menuItem: "Radial Proj",
            winTitle: "Radial Proj",
	    help:     "imexam/imexam.html#r_proj",

	    dynamicSelect: true,

	    toolbarSeparate: true,

            onregionschange: rprojUpdate,
            winDims: [250, 250],
    });

}());
/*jslint white: true, vars: true, plusplus: true, nomen: true, unparam: true */
/*globals $, JS9 */ 

"use strict";


(function() {
    var imexam = require("./imexam");

    var reghistemplate = "<div class='annotation' style='position:absolute;right: 10px;top:30px'> \
                    <table> \
                                    <tr><td>rms        </td><td align=right>{rms%.2f}</td><tr> \
                                    <tr><td>mean       </td><td align=right>{mean%.2f}</td><tr> \
                    </table> \
                    </div>";

    function histStats(div, plot, range) {
        var i, j = 0;
        var axes = plot.getAxes();

    	var xmin = axes.xaxis.options.min;
    	var xmax = axes.xaxis.options.max;
	var hist = $(div).data("hist");
 	var data = hist.raw;

	var rms  = imexam.ndops.rmsClipped( data, xmin, xmax);
	var mean = imexam.ndops.meanClipped(data, xmin, xmax);

	$(div).find(".annotation").empty();

	$(div).append(imexam.template(reghistemplate, { rms: rms, mean: mean }));
    }

    function histUpdate(im, xreg) {
        var div = this.div;

	    var imag = imexam.getRegionData(im, xreg);

            var hist    = imexam.ndops.hist(imag);
            hist.sum    = imexam.ndops.sum(hist.data);

	    $(div).data("hist", hist);

            var n = 0;
            var skip = hist.sum * 0.001;
            var h = 0, i, value;

            $(div).empty();

            var hdata = [];

            for ( i = 0; i < hist.data.shape[0]; i++ ) {
                n += hist.data.get(i);

                if ( n > skip &&  n < hist.sum - skip ) { 
		    value = hist.data.get(i);

		    hdata[h] = [i*hist.width+hist.min, value];
		    h++;
		}
            }

            var plot = $.plot(div, [hdata], { zoomStack: true, zoomFunc: histStats, selection: { mode: "x" } });

	    histStats(div, plot, undefined);

//	    $.plot.zoomStackIn(plot, undefined, { xaxis: { from: xmin 		, to: xmax }
//		    				, yaxis: { from: axes.yaxis.min , to: axes.yaxis.max } }
//					, histStats);
    }

    function histInit() {
	imexam.fixupDiv(this);
        $(this.div).append("<p style='padding: 20px 0px 0px 20px; margin: 0px'>create, click, move, or resize a region to see histogram<br>");
    }

    JS9.RegisterPlugin("ImExam", "Histogram", histInit, {
	    menu: "analysis",

            menuItem: "Histogram",
            winTitle: "Histogram",
	    help:     "imexam/imexam.html#rghist",

	    dynamicSelect: true,

	    toolbarSeparate: true,
	    toolbarHTML: " ",

            onregionschange: histUpdate,
            winDims: [250, 250],
    });

}());
/*jslint white: true, vars: true, plusplus: true, nomen: true, unparam: true */
/*globals $, JS9, require */ 

"use strict";


(function() {
    var imexam = require("./imexam");

    // eslint-disable-next-line no-multi-str
    var statTemplate = "                                                                                \
        <table width=100% style='padding-right: 6px; padding-left: 0px'>                                \
            <tr><td align=right>position x</td> <td align=right>{reg.x%.2f}              </td>          \
            <td align=right>y</td>              <td align=right>{reg.y%.2f}             </td></tr>      \
            <tr><td align=right>box width</td>      <td align=right>{reg.width%.2f}         </td>       \
            <td align=right>height</td>         <td align=right>{reg.height%.2f}        </td></tr>      \
            <tr><td align=right>min</td>        <td align=right>{min%.2f}               </td>           \
            <td align=right>max</td>            <td align=right>{max%.2f}               </td></tr>      \
            <tr><td align=right>totcounts</td>     <td align=right colspan=3>{totcnts.sum%.2f}</tr>   \
            <tr><td align=right>bscounts</td>     <td align=right colspan=3>{bscnts.sum%.2f}</tr>     \
            <tr><td align=right>bkgd</td>     <td align=right>{bkgd.value%.2f}      </td>             \
            <td align=right>noise</td>          <td align=right>{bkgd.noise%.2f}      </td></tr>      \
            <tr><td align=right>centroid x</td> <td align=right>{bscnts.cenx%.2f}     </td>           \
            <td align=right>y</td>              <td align=right>{bscnts.ceny%.2f}     </td></tr>      \
            <tr><td align=right>FWHM</td>       <td align=right>{bscnts.fwhm%.2f}     </td>           \
            <td align=right></td>            <td align=right>{bscnts.rms%.2f}      </td></tr>         \
        </table>";

    function regionStats(im, xreg){
        var section = imexam.reg2section(xreg);
	var imag    = imexam.getRegionData(im, xreg);

        var data    = imexam.ndops.assign(imexam.ndops.zeros(imag.shape), imag);
        var data2   = imexam.ndops.assign(imexam.ndops.zeros(imag.shape), imag);

        var stats   = {};

	if( !im || !xreg ){
	    return null;
	}

        stats.reg = xreg;
        stats.min = imexam.ndops.minvalue(imag);
        stats.max = imexam.ndops.maxvalue(imag);
        stats.bkgd  = imexam.imops.backgr(imag, 4);

	// background-subtracted data
        imexam.ndops.subs(data, imag, stats.bkgd.value);
        stats.bscnts = imexam.ndops.centroid(data, imexam.ndops.qcenter(data));
        stats.bscnts.cenx += section[0][0];
        stats.bscnts.ceny += section[1][0];

	// total counts
        stats.totcnts = imexam.ndops.centroid(data2, imexam.ndops.qcenter(data2));
        stats.totcnts.cenx += section[0][0];
        stats.totcnts.ceny += section[1][0];

	return stats;
    }

    function statUpdate(im, xreg) {
        var div = this.div;

        $(div).html(imexam.template(statTemplate, regionStats(im, xreg)));
    }

    function statInit() {
	imexam.fixupDiv(this);
        $(this.div).append("<p style='padding: 20px 0px 0px 20px; margin: 0px'>create, click, move, or resize a region to see stats<br>");
    }

    // add method to JS9 Image object and to public API
    JS9.Image.prototype.getRegionStats = function(xreg){
	return regionStats(this, xreg);
    };
    JS9.mkPublic("GetRegionStats", "getRegionStats");

    JS9.RegisterPlugin("ImExam", "RegionStats", statInit, {
	    menu: "analysis",

            winTitle: "Region Stats",
            menuItem: "Region Stats",
	    help:     "imexam/imexam.html#rgstat",

	    dynamicSelect: true,

	    toolbarSeparate: true,

            onregionschange: statUpdate,
            winDims: [250, 250]
    });
}());
/*jslint white: true, vars: true, plusplus: true, nomen: true, unparam: true */
/*globals $, JS9 */ 



(function() {
    "use strict";

    var imexam = require("./imexam");


    var projToolbar = "                                	\
		<div style='float:right; margin:10px'>  \
                 <select class='proj_menu JS9Select'>	\
                        <option>sum</option>            \
                        <option>avg</option>            \
                        <option>med</option>            \
		 </select>				\
		</div>";


		// <input type=checkbox class='proj_chek' name=fit><span style='width: 40px; float:right; text-align: left;'>fit</span>	\

    function projUpdate(im, xreg) {
	var div, proj, menx, chek;

        if ( im === undefined ) {
	    div  = xreg.div;
	    proj = xreg.proj;
	    menx = xreg.menu;
	    chek = xreg.chek;
	} else {
	    div  = this.div; 
	    menx = this.outerdivjq.find(".proj_menu")[0];
	    chek = this.outerdivjq.find(".proj_chek")[0];

            proj = imexam.ndops.proj(imexam.getRegionData(im, xreg), this.plugin.opts.xyproj);

	    // eslint-disable-next-line no-unused-vars
	    $(menx).change(function (event) {
		    projUpdate(undefined, { div: div, proj: proj, menu: menx, chek: chek });
		});
	    // eslint-disable-next-line no-unused-vars
	    $(chek).change(function (event) {
		    projUpdate(undefined, { div: div, proj: proj, menu: menx, chek: chek });
		});
	}


	var xdata = [];
	var  data;
	var x;

	var proj_type = menx.options[menx.selectedIndex].value;
	

	$(div).empty();

	if ( proj_type === "sum" ) {
		data = proj.sum;
	}
	if ( proj_type === "avg" ) {
		data = proj.avg;
	}
	if ( proj_type === "med" ) {
		data = proj.med;
	}


	for ( x = 0;  x < data.length; x++ ) {
		xdata[x] = [x, data[x]];
	}

	$.plot(div, [xdata], { zoomStack: true, selection: { mode: "xy" } });
    }

    function projInit() {
	imexam.fixupDiv(this);
        $(this.div).append("<p style='padding: 20px 0px 0px 20px; margin: 0px'>create, click, move, or resize a region to see projection<br>");
    }

    JS9.RegisterPlugin("ImExam", "XProj", projInit, {
	    menu: "analysis",

            menuItem: "X Projection",
	    winTitle: "X Projection",
	    help:     "imexam/imexam.html#xyproj",

	    dynamicSelect: true,

	    toolbarSeparate: true,
	    toolbarHTML: projToolbar,

            onregionschange: projUpdate,

            winDims: [250, 250],

            xyproj: 0
    });

    JS9.RegisterPlugin("ImExam", "YProj", projInit, {
	    menu: "analysis",

            menuItem: "Y Projection",
	    winTitle: "Y Projection",
	    help:     "imexam/imexam.html#xyproj",

	    dynamicSelect: true,

	    toolbarSeparate: true,
	    toolbarHTML: projToolbar,

            onregionschange: projUpdate,

            winDims: [250, 250],

            xyproj: 1
    });
}());
(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/*jslint white: true, vars: true, plusplus: true, nomen: true, unparam: true, continue: true */
/*globals $, JS9, imexam, greg */ 


(function () {
    "use strict";

    var imexam = require("./imexam");

    require("./JSSurfacePlot-V1.7/javascript/SurfacePlot");
    require("./JSSurfacePlot-V1.7/javascript/ColourGradient");

    function surface(div, data) {

        var surf     = imexam.ndops.zeros(data.shape),
            minvalue = imexam.ndops.minvalue(data),
            maxvalue = imexam.ndops.maxvalue(data),
            range    = maxvalue - minvalue;

        var  surfacePlot = $(div).data("surfplot");
        var fillPly = true;
        

        surf.getNumberOfRows = function () {
            return this.shape[1];
        };
        surf.getNumberOfColumns = function () {
            return this.shape[0];
        };
        surf.getFormattedValue = function (i, j) {
            return this.get(j, i).toString();
        };


        if ( surfacePlot === undefined ) {
            div.innerHTML = "";

            surfacePlot = new greg.ross.visualisation.SurfacePlot(div);

            $(div).data("surfplot", surfacePlot);
        }

        // Define a colour gradient.
        var colour1 = {red:   0, green:   0, blue: 255};
        var colour2 = {red:   0, green: 255, blue: 255};
        var colour3 = {red:   0, green: 255, blue:   0};
        var colour4 = {red: 255, green: 255, blue:   0};
        var colour5 = {red: 255, green:   0, blue:   0};
        var colours = [colour1, colour2, colour3, colour4, colour5];
        
        // Axis labels.
        var xAxisHeader = "X";
        var yAxisHeader = "Y";
        var zAxisHeader = "Z";

        var tooltipStrings = [];

        var numRows = surf.getNumberOfRows();
        var numCols = surf.getNumberOfColumns();
        var idx = 0;

        var height = div.offsetHeight;
        var width  = div.offsetWidth;
        var i, j, value;

        for (i = 0; i < numRows; i++) {
            for (j = 0; j < numCols; j++) {
                value = data.get(j, i);

                surf.set(j, i, (value-minvalue)/(range*2.25));

                if ( value !== undefined ) {
		    tooltipStrings[idx] = "x:" + i + ", y:" + j + " = " + value.toFixed(2);
		}
                idx++;
            }
        }
        
        var options = {xPos: 0, yPos: 0, width: width, height: height, colourGradient: colours, fillPolygons: fillPly,
                tooltips: tooltipStrings, xTitle: xAxisHeader, yTitle: yAxisHeader, zTitle: zAxisHeader, restrictXRotation: false};

        surfacePlot.draw(surf, options);
    }

    function pluginUpdate(im, xreg) {
            surface(this.div, imexam.getRegionData(im, xreg));
    }

    function pluginInit() {
	imexam.fixupDiv(this);
        $(this.div).append("<p style='padding: 20px 0px 0px 20px; margin: 0px'>create, click, move, or resize a region to see 3d plot<br>");
    }

    JS9.RegisterPlugin("ImExam", "3dPlot", pluginInit, {
	    menu: "analysis",

            menuItem: "3dPlot",
            winTitle: "3dPlot",
	    help:     "imexam/imexam.html#3dplot",

	    dynamicSelect: true,

	    toolbarSeparate: true,

            onregionschange: pluginUpdate,
            winDims: [250, 250],
    });
}());

},{"./JSSurfacePlot-V1.7/javascript/ColourGradient":2,"./JSSurfacePlot-V1.7/javascript/SurfacePlot":3,"./imexam":undefined}],2:[function(require,module,exports){
/*
 * ColourGradient.js
 *
 *
 * Copyright (c) 2011 Greg Ross
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * Redistributions of source code must retain the above copyright notice,
 * this list of conditions and the following disclaimer.
 *
 * Redistributions in binary form must reproduce the above copyright
 * notice, this list of conditions and the following disclaimer in the
 * documentation and/or other materials provided with the distribution.
 *
 * Neither the name of the project's author nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS
 * FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED
 * TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
 * LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 * NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 */

/**
 * Class that is used to define a path through RGB space.
 * @author Greg Ross
 * @constructor
 * @param minValue the value that will return the first colour on the path in RGB space
 * @param maxValue the value that will return the last colour on the path in RGB space
 * @param rgbColourArray the set of colours that defines the dirctional path through RGB space.
 * The length of the array must be greater than two.
 */
greg.ross.visualisation.ColourGradient = function(minValue, maxValue, rgbColourArray)
{
	function RGB2HTML(red, green, blue)
	{
	    var decColor = red + 256 * green + 65536 * blue;
	    return decColor.toString(16);
	}

	/**
	 * Return a colour from a position on the path in RGB space that is proportioal to
	 * the number specified in relation to the minimum and maximum values from which the
	 * bounds of the path are derived.
	 * @member greg.ross.visualisation.ColourGradient
	 * @param value
	 */
	this.getColour = function(value)
	{
		if ( isNaN(value) || value < minValue || value > maxValue || rgbColourArray.length == 1)
		{
			var colr = {
				red: rgbColourArray[0].red,
				green:rgbColourArray[0].green,
				blue:rgbColourArray[0].blue
			};
			
			return colr;
		}
			
		var scaledValue = mapValueToZeroOneInterval(value, minValue, maxValue);
		
		return getPointOnColourRamp(scaledValue);
	}
	
	function getPointOnColourRamp(value)
	{
		var numberOfColours = rgbColourArray.length;
		var scaleWidth = 1 / (numberOfColours - 1);
		var index = (value / scaleWidth);
		var index = parseInt(index + "");

		index = index >=  (numberOfColours - 1) ? (numberOfColours - 2): index;

		var rgb1 = rgbColourArray[index];
		var rgb2 = rgbColourArray[index + 1];
		
		var closestToOrigin, furthestFromOrigin;
		
		if (distanceFromRgbOrigin(rgb1) > distanceFromRgbOrigin(rgb2))
		{
			closestToOrigin = rgb2;
			furthestFromOrigin = rgb1;
		}
		else
		{
			closestToOrigin = rgb1;
			furthestFromOrigin = rgb2;
		}
		
		var t;
		
		if (closestToOrigin == rgb2)
			t = 1 - mapValueToZeroOneInterval(value, index * scaleWidth, (index + 1) * scaleWidth);
		else
			t = mapValueToZeroOneInterval(value, index * scaleWidth, (index + 1) * scaleWidth);
			
		var diff = [
			t * (furthestFromOrigin.red - closestToOrigin.red),
			t * (furthestFromOrigin.green - closestToOrigin.green), 
			t * (furthestFromOrigin.blue - closestToOrigin.blue)];
		
		var r = closestToOrigin.red + diff[0];
		var g = closestToOrigin.green + diff[1];
		var b = closestToOrigin.blue + diff[2];
		
		r = parseInt(r);
		g = parseInt(g);
		b = parseInt(b);
		
		var colr = {
			red:r,
			green:g,
			blue:b
		};
		
		return colr;
	}

	function distanceFromRgbOrigin(rgb)
	{
		return (rgb.red * rgb.red) + (rgb.green * rgb.green) + (rgb.blue * rgb.blue);
	}

	function mapValueToZeroOneInterval(value, minValue, maxValue)
	{
		if (minValue == maxValue) return 0;
		
		var factor = (value - minValue) / (maxValue - minValue);
		return factor;
	}
}


},{}],3:[function(require,module,exports){
/*
 * SurfacePlot.js
 *
 *
 * Copyright (c) 2011 Greg Ross
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * Redistributions of source code must retain the above copyright notice,
 * this list of conditions and the following disclaimer.
 *
 * Redistributions in binary form must reproduce the above copyright
 * notice, this list of conditions and the following disclaimer in the
 * documentation and/or other materials provided with the distribution.
 *
 * Neither the name of the project's author nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS
 * FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED
 * TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
 * LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 * NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 */
/*
 * Register the name space
 * ***********************
 */
function registerNameSpace(ns){
    var nsParts = ns.split(".");
    var root = window;
    var n = nsParts.length;
    
    for (var i = 0; i < n; i++) {
        if (typeof root[nsParts[i]] == "undefined") 
            root[nsParts[i]] = new Object();
        
        root = root[nsParts[i]];
    }
}

registerNameSpace("greg.ross.visualisation");

/*
 * This is the main class and entry point of the tool
 * and represents the Google viz API.
 * ***************************************************
 */
greg.ross.visualisation.SurfacePlot = function(container){
    this.containerElement = container;
}

greg.ross.visualisation.SurfacePlot.prototype.draw = function(data, options) {
    var xPos = options.xPos;
    var yPos = options.yPos;
    var w = options.width;
    var h = options.height;
    var colourGradient = options.colourGradient;
    var fillPolygons = options.fillPolygons;
    var tooltips = options.tooltips;
    var xTitle = options.xTitle;
    var yTitle = options.yTitle;
    var zTitle = options.zTitle;
	var restrictXRotation = options.restrictXRotation;
    
    if (this.surfacePlot == undefined) 
        this.surfacePlot = new greg.ross.visualisation.JSSurfacePlot(xPos, yPos, w, h, colourGradient, this.containerElement, tooltips, fillPolygons, xTitle, yTitle, zTitle, restrictXRotation);
    
    this.surfacePlot.redraw(data);
}

/*
 * This class does most of the work.
 * *********************************
 */
greg.ross.visualisation.JSSurfacePlot = function(x, y, width, height, colourGradient, targetElement, tooltips, fillRegions, xTitle, yTitle, zTitle, restrictXRotation){
    this.targetDiv;
    var id = allocateId();
    var canvas;
    var canvasContext = null;
    
    var scale = greg.ross.visualisation.JSSurfacePlot.DEFAULT_SCALE;
    
    var currentZAngle = greg.ross.visualisation.JSSurfacePlot.DEFAULT_Z_ANGLE;
    var currentXAngle = greg.ross.visualisation.JSSurfacePlot.DEFAULT_X_ANGLE;
    
    this.data = null;
	var canvas_support_checked = false;
	var canvas_supported = true;
    var data3ds = null;
    var displayValues = null;
    var numXPoints;
    var numYPoints;
    var transformation;
    var cameraPosition;
    var colourGradient;
    var colourGradientObject;
    var renderPoints = false;
    
    var mouseDown1 = false;
    var mouseDown3 = false;
    var mousePosX = null;
    var mousePosY = null;
    var lastMousePos = new greg.ross.visualisation.Point(0, 0);
    var mouseButton1Up = null;
    var mouseButton3Up = null;
    var mouseButton1Down = new greg.ross.visualisation.Point(0, 0);
    var mouseButton3Down = new greg.ross.visualisation.Point(0, 0);
    var closestPointToMouse = null;
    var xAxisHeader = "";
    var yAxisHeader = "";
    var zAxisHeader = "";
    var xAxisTitleLabel = new greg.ross.visualisation.Tooltip(true);
    var yAxisTitleLabel = new greg.ross.visualisation.Tooltip(true);
    var zAxisTitleLabel = new greg.ross.visualisation.Tooltip(true);
    var tTip = new greg.ross.visualisation.Tooltip(false);
    
    function init(){
        transformation = new greg.ross.visualisation.Th3dtran();
        
        createTargetDiv();
        
        if (!targetDiv) 
            return;
        
        createCanvas();
    }
    
    function hideTooltip(){
        tTip.hide();
    }
    
    function displayTooltip(e){
        var position = new greg.ross.visualisation.Point(e.x, e.y);
        tTip.show(tooltips[closestPointToMouse], 200);
    }
    
    function render(data){
        canvasContext.clearRect(0, 0, canvas.width, canvas.height);
        canvasContext.fillStyle = '#000';
        canvasContext.fillRect(0, 0, canvas.width, canvas.height);
        this.data = data;
        
        var canvasWidth = width;
        var canvasHeight = height;
        
        var minMargin = 20;
        var drawingDim = canvasWidth - minMargin * 2;
        var marginX = minMargin;
        var marginY = minMargin;
        
        transformation.init();
        transformation.rotate(currentXAngle, 0.0, currentZAngle);
        transformation.scale(scale);
        transformation.translate(drawingDim / 2.0 + marginX, (drawingDim / 3.0*2) + marginY, 0.0);
        
        cameraPosition = new greg.ross.visualisation.Point3D(drawingDim / 2.0 + marginX, drawingDim / 2.0 + marginY, -1000.0);
        
        if (renderPoints) {
            for (i = 0; i < data3ds.length; i++) {
                var point3d = data3ds[i];
                canvasContext.fillStyle = '#ff2222';
                var transformedPoint = transformation.ChangeObjectPoint(point3d);
                transformedPoint.dist = distance(transformedPoint, cameraPosition);
                
                var x = transformedPoint.ax;
                var y = transformedPoint.ay;
                
                canvasContext.beginPath();
                var dotSize = greg.ross.visualisation.JSSurfacePlot.DATA_DOT_SIZE;
                
                canvasContext.arc((x - (dotSize / 2)), (y - (dotSize / 2)), 1, 0, self.Math.PI * 2, true);
                canvasContext.fill();
            }
        }
        
        var axes = createAxes();
        var polygons = createPolygons(data3ds);
        
        for (i = 0; i < axes.length; i++) {
            polygons[polygons.length] = axes[i];
        }
        
        // Sort the polygons so that the closest ones are rendered last
        // and therefore are not occluded by those behind them.
        // This is really Painter's algorithm.
        polygons.sort(greg.ross.visualisation.PolygonComaparator);
        //polygons = sort(polygons);
        
        canvasContext.lineWidth = 1;
        canvasContext.strokeStyle = '#888';
        canvasContext.lineJoin = "round";
        
        for (i = 0; i < polygons.length; i++) {
            var polygon = polygons[i];
            
            if (polygon.isAnAxis()) {
                var p1 = polygon.getPoint(0);
                var p2 = polygon.getPoint(1);
                
                canvasContext.beginPath();
                canvasContext.moveTo(p1.ax, p1.ay);
                canvasContext.lineTo(p2.ax, p2.ay);
                canvasContext.stroke();
            }
            else {
                var p1 = polygon.getPoint(0);
                var p2 = polygon.getPoint(1);
                var p3 = polygon.getPoint(2);
                var p4 = polygon.getPoint(3);
                
                var colourValue = (p1.lz * 1.0 + p2.lz * 1.0 + p3.lz * 1.0 + p4.lz * 1.0) / 4.0;
                
                // if (colourValue < 0) 
                    // colourValue *= -1;
                
                var rgbColour = colourGradientObject.getColour(colourValue);
                var colr = "rgb(" + rgbColour.red + "," + rgbColour.green + "," + rgbColour.blue + ")";
                canvasContext.fillStyle = colr;
                
                canvasContext.beginPath();
                canvasContext.moveTo(p1.ax, p1.ay);
                canvasContext.lineTo(p2.ax, p2.ay);
                canvasContext.lineTo(p3.ax, p3.ay);
                canvasContext.lineTo(p4.ax, p4.ay);
                canvasContext.lineTo(p1.ax, p1.ay);
                
                if (fillRegions) 
                    canvasContext.fill();
                else 
                    canvasContext.stroke();
            }
        }
        
        canvasContext.stroke();
        
        if (supports_canvas()) 
            renderAxisText(axes);
    }
    
    function renderAxisText(axes){
        var xLabelPoint = new greg.ross.visualisation.Point3D(0.0, 0.5, 0.0);
        var yLabelPoint = new greg.ross.visualisation.Point3D(-0.5, 0.0, 0.0);
        var zLabelPoint = new greg.ross.visualisation.Point3D(-0.5, 0.5, 0.5);
        
        var transformedxLabelPoint = transformation.ChangeObjectPoint(xLabelPoint);
        var transformedyLabelPoint = transformation.ChangeObjectPoint(yLabelPoint);
        var transformedzLabelPoint = transformation.ChangeObjectPoint(zLabelPoint);
        
        var xAxis = axes[0];
        var yAxis = axes[1];
        var zAxis = axes[2];
        
        canvasContext.fillStyle = '#fff';
        
        if (xAxis.distanceFromCamera > yAxis.distanceFromCamera) {
            var xAxisLabelPosX = transformedxLabelPoint.ax;
            var xAxisLabelPosY = transformedxLabelPoint.ay;
            canvasContext.fillText(xTitle, xAxisLabelPosX, xAxisLabelPosY);
        }
        
        if (xAxis.distanceFromCamera < yAxis.distanceFromCamera) {
            var yAxisLabelPosX = transformedyLabelPoint.ax;
            var yAxisLabelPosY = transformedyLabelPoint.ay;
            canvasContext.fillText(yTitle, yAxisLabelPosX, yAxisLabelPosY);
        }
        
        if (xAxis.distanceFromCamera < zAxis.distanceFromCamera) {
            var zAxisLabelPosX = transformedzLabelPoint.ax;
            var zAxisLabelPosY = transformedzLabelPoint.ay;
            canvasContext.fillText(zTitle, zAxisLabelPosX, zAxisLabelPosY);
        }
    }
    
    var sort = function(array){
        var len = array.length;
        
        if (len < 2) {
            return array;
        }
        
        var pivot = Math.ceil(len / 2);
        return merge(sort(array.slice(0, pivot)), sort(array.slice(pivot)));
    }
    
    var merge = function(left, right){
        var result = [];
        while ((left.length > 0) && (right.length > 0)) {
            if (left[0].distanceFromCamera < right[0].distanceFromCamera) {
                result.push(left.shift());
            }
            else {
                result.push(right.shift());
            }
        }
        
        result = result.concat(left, right);
        return result;
    }
    
    
    function createAxes(){
        var axisOrigin = new greg.ross.visualisation.Point3D(-0.5, 0.5, 0);
        var xAxisEndPoint = new greg.ross.visualisation.Point3D(0.5, 0.5, 0);
        var yAxisEndPoint = new greg.ross.visualisation.Point3D(-0.5, -0.5, 0);
        var zAxisEndPoint = new greg.ross.visualisation.Point3D(-0.5, 0.5, 1);
        
        var transformedAxisOrigin = transformation.ChangeObjectPoint(axisOrigin);
        var transformedXAxisEndPoint = transformation.ChangeObjectPoint(xAxisEndPoint);
        var transformedYAxisEndPoint = transformation.ChangeObjectPoint(yAxisEndPoint);
        var transformedZAxisEndPoint = transformation.ChangeObjectPoint(zAxisEndPoint);
        
        var axes = new Array();
        
        var xAxis = new greg.ross.visualisation.Polygon(cameraPosition, true);
        xAxis.addPoint(transformedAxisOrigin);
        xAxis.addPoint(transformedXAxisEndPoint);
        xAxis.calculateCentroid();
        xAxis.calculateDistance();
        axes[axes.length] = xAxis;
        
        var yAxis = new greg.ross.visualisation.Polygon(cameraPosition, true);
        yAxis.addPoint(transformedAxisOrigin);
        yAxis.addPoint(transformedYAxisEndPoint);
        yAxis.calculateCentroid();
        yAxis.calculateDistance();
        axes[axes.length] = yAxis;
        
        var zAxis = new greg.ross.visualisation.Polygon(cameraPosition, true);
        zAxis.addPoint(transformedAxisOrigin);
        zAxis.addPoint(transformedZAxisEndPoint);
        zAxis.calculateCentroid();
        zAxis.calculateDistance();
        axes[axes.length] = zAxis;
        
        return axes;
    }
    
    function createPolygons(data3D){
        var i;
        var j;
        var polygons = new Array();
        var index = 0;
        
        for (i = 0; i < numXPoints - 1; i++) {
            for (j = 0; j < numYPoints - 1; j++) {
                var polygon = new greg.ross.visualisation.Polygon(cameraPosition, false);
                
                var p1 = transformation.ChangeObjectPoint(data3D[j + (i * numYPoints)]);
                var p2 = transformation.ChangeObjectPoint(data3D[j + (i * numYPoints) + numYPoints]);
                var p3 = transformation.ChangeObjectPoint(data3D[j + (i * numYPoints) + numYPoints + 1]);
                var p4 = transformation.ChangeObjectPoint(data3D[j + (i * numYPoints) + 1]);
                
                polygon.addPoint(p1);
                polygon.addPoint(p2);
                polygon.addPoint(p3);
                polygon.addPoint(p4);
                polygon.calculateCentroid();
                polygon.calculateDistance();
                
                polygons[index] = polygon;
                index++;
            }
        }
        
        return polygons;
    }
    
    function getDefaultColourRamp(){
        var colour1 = {
            red: 0,
            green: 0,
            blue: 255
        };
        var colour2 = {
            red: 0,
            green: 255,
            blue: 255
        };
        var colour3 = {
            red: 0,
            green: 255,
            blue: 0
        };
        var colour4 = {
            red: 255,
            green: 255,
            blue: 0
        };
        var colour5 = {
            red: 255,
            green: 0,
            blue: 0
        };
        return [colour1, colour2, colour3, colour4, colour5];
    }
    
    this.redraw = function(data){
        numXPoints = data.getNumberOfRows() * 1.0;
        numYPoints = data.getNumberOfColumns() * 1.0;
        
        var minZValue = Number.MAX_VALUE;
        var maxZValue = Number.MIN_VALUE;
        
        for (var i = 0; i < numXPoints; i++) {
            for (var j = 0; j < numYPoints; j++) {
                var value = data.getFormattedValue(i, j) * 1.0;
                
                if (value < minZValue) 
                    minZValue = value;
                
                if (value > maxZValue) 
                    maxZValue = value;
            }
        }
        
        var cGradient;
        
        if (colourGradient) 
            cGradient = colourGradient;
        else 
            cGradient = getDefaultColourRamp();
            
        // if (minZValue < 0 && (minZValue*-1) > maxZValue)
          // maxZValue = minZValue*-1;
          
        colourGradientObject = new greg.ross.visualisation.ColourGradient(minZValue, maxZValue, cGradient);
        
        var canvasWidth = width;
        var canvasHeight = height;
        
        var minMargin = 20;
        var drawingDim = canvasWidth - minMargin * 2;
        var marginX = minMargin;
        var marginY = minMargin;
        
        if (canvasWidth > canvasHeight) {
            drawingDim = canvasHeight - minMargin * 2;
            marginX = (canvasWidth - drawingDim) / 2;
        }
        else 
            if (canvasWidth < canvasHeight) {
                drawingDim = canvasWidth - minMargin * 2;
                marginY = (canvasHeight - drawingDim) / 2;
            }
        
        var xDivision = 1 / (numXPoints - 1);
        var yDivision = 1 / (numYPoints - 1);
        var xPos, yPos;
        var i, j;
        var numPoints = numXPoints * numYPoints;
        data3ds = new Array();
        var index = 0;
        
        // Calculate 3D points.
        for (i = 0, xPos = -0.5; i < numXPoints; i++, xPos += xDivision) {
            for (j = 0, yPos = 0.5; j < numYPoints; j++, yPos -= yDivision) {
                var x = xPos;
                var y = yPos;
                
                data3ds[index] = new greg.ross.visualisation.Point3D(x, y, data.getFormattedValue(i, j));
                index++;
            }
        }
        
        render(data);
    }
    
    function allocateId(){
        var count = 0;
        var name = "surfacePlot";
        
        do {
            count++;
        }
        while (document.getElementById(name + count))
        
        return name + count;
    }
    
    function createTargetDiv(){
        this.targetDiv = document.createElement("div");
        this.targetDiv.id = id;
        this.targetDiv.className = "surfaceplot";
        this.targetDiv.style.background = '#ffffff'
        this.targetDiv.style.position = 'absolute';
        
        if (!targetElement) 
            document.body.appendChild(this.targetDiv);
        else {
            this.targetDiv.style.position = 'relative';
            targetElement.appendChild(this.targetDiv);
        }
        
        this.targetDiv.style.left = x + "px";
        this.targetDiv.style.top = y + "px";
    }
    
    function getInternetExplorerVersion()    // Returns the version of Internet Explorer or a -1
    // (indicating the use of another browser).
    {
        var rv = -1; // Return value assumes failure.
        if (navigator.appName == 'Microsoft Internet Explorer') {
            var ua = navigator.userAgent;
            var re = new RegExp("MSIE ([0-9]{1,}[\.0-9]{0,})");
            if (re.exec(ua) != null) 
                rv = parseFloat(RegExp.$1);
        }
        return rv;
    }
    
    function supports_canvas(){
		if (canvas_support_checked) return canvas_supported;
		
		 canvas_support_checked = true;
         canvas_supported = !!document.createElement('canvas').getContext;
		 return canvas_supported;
    }
    
    function createCanvas(){
        canvas = document.createElement("canvas");
        
        if (!supports_canvas()) {
            G_vmlCanvasManager.initElement(canvas);
            canvas.style.width = width;
            canvas.style.height = height;
        }
        
        canvas.className = "surfacePlotCanvas";
        canvas.setAttribute("width", width);
        canvas.setAttribute("height", height);
        canvas.style.left = '0px';
        canvas.style.top = '0px';
        
        targetDiv.appendChild(canvas);
        
        canvasContext = canvas.getContext("2d");
        canvasContext.font = "bold 18px sans-serif";
        canvasContext.clearRect(0, 0, canvas.width, canvas.height);
        
        canvasContext.fillStyle = '#000';
        
        canvasContext.fillRect(0, 0, canvas.width, canvas.height);
        
        canvasContext.beginPath();
        canvasContext.rect(0, 0, canvas.width, canvas.height);
        canvasContext.strokeStyle = '#888';
        canvasContext.stroke();
        
        canvas.onmousemove = mouseIsMoving;
        canvas.onmouseout = hideTooltip;
        canvas.onmousedown = mouseDownd;
        canvas.onmouseup = mouseUpd;

        //added by edupont
        canvas.addEventListener("touchstart", mouseDownd, false);
		canvas.addEventListener("touchmove", mouseIsMoving, false);
		canvas.addEventListener("touchend", mouseUpd, false);
		canvas.addEventListener("touchcancel", hideTooltip, false);
    }
    
    function mouseDownd(e){
        if (isShiftPressed(e)) {
            mouseDown3 = true;
            mouseButton3Down = getMousePositionFromEvent(e);
        }
        else {
            mouseDown1 = true;
            mouseButton1Down = getMousePositionFromEvent(e);
        }
    }
    
    function mouseUpd(e){
        if (mouseDown1) {
            mouseButton1Up = lastMousePos;
        }
        else 
            if (mouseDown3) {
                mouseButton3Up = lastMousePos;
            }
        
        mouseDown1 = false;
        mouseDown3 = false;
    }
    
    function mouseIsMoving(e){
        var currentPos = getMousePositionFromEvent(e);
        
        if (mouseDown1) {
            hideTooltip();
            calculateRotation(currentPos);
        }
        else 
            if (mouseDown3) {
                hideTooltip();
                calculateScale(currentPos);
            }
            else {
                closestPointToMouse = null;
                var closestDist = Number.MAX_VALUE;
                
                for (var i = 0; i < data3ds.length; i++) {
                    var point = data3ds[i];
                    var dist = distance({
                        x: point.ax,
                        y: point.ay
                    }, currentPos);
                    
                    if (dist < closestDist) {
                        closestDist = dist;
                        closestPointToMouse = i;
                    }
                }
                
                if (closestDist > 16) {
                    hideTooltip();
                    return;
                }
                
                displayTooltip(currentPos);
            }
			
			return false;
    }
    
    function isShiftPressed(e){
        var shiftPressed = 0;
        
        if (parseInt(navigator.appVersion) > 3) {
            var evt = navigator.appName == "Netscape" ? e : event;
            
            if (navigator.appName == "Netscape" && parseInt(navigator.appVersion) == 4) {
                // NETSCAPE 4 CODE
                var mString = (e.modifiers + 32).toString(2).substring(3, 6);
                shiftPressed = (mString.charAt(0) == "1");
            }
            else {
                // NEWER BROWSERS [CROSS-PLATFORM]
                shiftPressed = evt.shiftKey;
            }
            
            if (shiftPressed) 
                return true;
        }
        
        return false;
    }
    
    function getMousePositionFromEvent(e){
        if (getInternetExplorerVersion() > -1) {
            var e = window.event;
            
            if (e.srcElement.getAttribute('Stroked') == true) {
                if (mousePosX == null || mousePosY == null) 
                    return;
            }
            else {
                mousePosX = e.offsetX;
                mousePosY = e.offsetY;
            }
        }
        else 
            if (e.layerX || e.layerX == 0) // Firefox
            {
                mousePosX = e.layerX;
                mousePosY = e.layerY;
            }
            else if (e.offsetX || e.offsetX == 0) // Opera
            {
                mousePosX = e.offsetX;
                mousePosY = e.offsetY;
            }
			else if (e.touches[0].pageX || e.touches[0].pageX == 0) //touch events
            {
	            mousePosX = e.touches[0].pageX;
	            mousePosY = e.touches[0].pageY;
            }
        
        var currentPos = new greg.ross.visualisation.Point(mousePosX, mousePosY);
        
        return currentPos;
    }
    
    function calculateRotation(e){
        lastMousePos = new greg.ross.visualisation.Point(greg.ross.visualisation.JSSurfacePlot.DEFAULT_Z_ANGLE, greg.ross.visualisation.JSSurfacePlot.DEFAULT_X_ANGLE);
        
        if (mouseButton1Up == null) {
            mouseButton1Up = new greg.ross.visualisation.Point(greg.ross.visualisation.JSSurfacePlot.DEFAULT_Z_ANGLE, greg.ross.visualisation.JSSurfacePlot.DEFAULT_X_ANGLE);
        }
        
        if (mouseButton1Down != null) {
            lastMousePos = new greg.ross.visualisation.Point(mouseButton1Up.x + (mouseButton1Down.x - e.x),//
 mouseButton1Up.y + (mouseButton1Down.y - e.y));
        }
        
        currentZAngle = lastMousePos.x % 360;
        currentXAngle = lastMousePos.y % 360;
		
		if (restrictXRotation) {
			
			if (currentXAngle < 0) 
				currentXAngle = 0;
			else 
				if (currentXAngle > 90) 
					currentXAngle = 90;
					
		}
        
        closestPointToMouse = null;
        render(data);
    }
    
    function calculateScale(e){
        lastMousePos = new greg.ross.visualisation.Point(0, greg.ross.visualisation.JSSurfacePlot.DEFAULT_SCALE / greg.ross.visualisation.JSSurfacePlot.SCALE_FACTOR);
        
        if (mouseButton3Up == null) {
            mouseButton3Up = new greg.ross.visualisation.Point(0, greg.ross.visualisation.JSSurfacePlot.DEFAULT_SCALE / greg.ross.visualisation.JSSurfacePlot.SCALE_FACTOR);
        }
        
        if (mouseButton3Down != null) {
            lastMousePos = new greg.ross.visualisation.Point(mouseButton3Up.x + (mouseButton3Down.x - e.x),//
 mouseButton3Up.y + (mouseButton3Down.y - e.y));
        }
        
        scale = lastMousePos.y * greg.ross.visualisation.JSSurfacePlot.SCALE_FACTOR;
        
        if (scale < greg.ross.visualisation.JSSurfacePlot.MIN_SCALE) 
            scale = greg.ross.visualisation.JSSurfacePlot.MIN_SCALE + 1;
        else 
            if (scale > greg.ross.visualisation.JSSurfacePlot.MAX_SCALE) 
                scale = greg.ross.visualisation.JSSurfacePlot.MAX_SCALE - 1;
        
        lastMousePos.y = scale / greg.ross.visualisation.JSSurfacePlot.SCALE_FACTOR;
        
        closestPointToMouse = null;
        render(data);
    }
    
    init();
}

/**
 * Given two coordinates, return the Euclidean distance
 * between them
 */
function distance(p1, p2){
    return Math.sqrt(((p1.x - p2.x) *
    (p1.x -
    p2.x)) +
    ((p1.y - p2.y) * (p1.y - p2.y)));
}

/*
 * Matrix3d: This class represents a 3D matrix.
 * ********************************************
 */
greg.ross.visualisation.Matrix3d = function(){
    this.matrix = new Array();
    this.numRows = 4;
    this.numCols = 4;
    
    this.init = function(){
        this.matrix = new Array();
        
        for (var i = 0; i < this.numRows; i++) {
            this.matrix[i] = new Array();
        }
    }
    
    this.getMatrix = function(){
        return this.matrix;
    }
    
    this.matrixReset = function(){
        for (var i = 0; i < this.numRows; i++) {
            for (var j = 0; j < this.numCols; j++) {
                this.matrix[i][j] = 0;
            }
        }
    }
    
    this.matrixIdentity = function(){
        this.matrixReset();
        this.matrix[0][0] = this.matrix[1][1] = this.matrix[2][2] = this.matrix[3][3] = 1;
    }
    
    this.matrixCopy = function(newM){
        var temp = new greg.ross.visualisation.Matrix3d();
        var i, j;
        
        for (i = 0; i < this.numRows; i++) {
            for (j = 0; j < this.numCols; j++) {
                temp.getMatrix()[i][j] = (this.matrix[i][0] * newM.getMatrix()[0][j]) + (this.matrix[i][1] * newM.getMatrix()[1][j]) + (this.matrix[i][2] * newM.getMatrix()[2][j]) + (this.matrix[i][3] * newM.getMatrix()[3][j]);
            }
        }
        
        for (i = 0; i < this.numRows; i++) {
            this.matrix[i][0] = temp.getMatrix()[i][0];
            this.matrix[i][1] = temp.getMatrix()[i][1];
            this.matrix[i][2] = temp.getMatrix()[i][2];
            this.matrix[i][3] = temp.getMatrix()[i][3];
        }
    }
    
    this.matrixMult = function(m1, m2){
        var temp = new greg.ross.visualisation.Matrix3d();
        var i, j;
        
        for (i = 0; i < this.numRows; i++) {
            for (j = 0; j < this.numCols; j++) {
                temp.getMatrix()[i][j] = (m2.getMatrix()[i][0] * m1.getMatrix()[0][j]) + (m2.getMatrix()[i][1] * m1.getMatrix()[1][j]) + (m2.getMatrix()[i][2] * m1.getMatrix()[2][j]) + (m2.getMatrix()[i][3] * m1.getMatrix()[3][j]);
            }
        }
        
        for (i = 0; i < this.numRows; i++) {
            m1.getMatrix()[i][0] = temp.getMatrix()[i][0];
            m1.getMatrix()[i][1] = temp.getMatrix()[i][1];
            m1.getMatrix()[i][2] = temp.getMatrix()[i][2];
            m1.getMatrix()[i][3] = temp.getMatrix()[i][3];
        }
    }
    
    this.init();
}

/*
 * Point3D: This class represents a 3D point.
 * ******************************************
 */
greg.ross.visualisation.Point3D = function(x, y, z){
    this.displayValue = "";
    
    this.lx;
    this.ly;
    this.lz;
    this.lt;
    
    this.wx;
    this.wy;
    this.wz;
    this.wt;
    
    this.ax;
    this.ay;
    this.az;
    this.at;
    
    this.dist;
    
    this.initPoint = function(){
        this.lx = this.ly = this.lz = this.ax = this.ay = this.az = this.at = this.wx = this.wy = this.wz = 0;
        this.lt = this.wt = 1;
    }
    
    this.init = function(x, y, z){
        this.initPoint();
        this.lx = x;
        this.ly = y;
        this.lz = z;
        
        this.ax = this.lx;
        this.ay = this.ly;
        this.az = this.lz;
    }
    
    function multiply(p){
        var Temp = new Point3D();
        Temp.lx = this.lx * p.lx;
        Temp.ly = this.ly * p.ly;
        Temp.lz = this.lz * p.lz;
        return Temp;
    }
    
    function getDisplayValue(){
        return displayValue;
    }
    
    function setDisplayValue(displayValue){
        this.displayValue = displayValue;
    }
    
    this.init(x, y, z);
}

/*
 * Polygon: This class represents a polygon on the surface plot.
 * ************************************************************
 */
greg.ross.visualisation.Polygon = function(cameraPosition, isAxis){
    this.points = new Array();
    this.cameraPosition = cameraPosition;
    this.isAxis = isAxis;
    this.centroid = null;
    this.distanceFromCamera = null;
    
    this.isAnAxis = function(){
        return this.isAxis;
    }
    
    this.addPoint = function(point){
        this.points[this.points.length] = point;
    }
    
    this.distance = function(){
        return this.distance2(this.cameraPosition, this.centroid);
    }
    
    this.calculateDistance = function(){
        this.distanceFromCamera = this.distance();
    }
    
    this.calculateCentroid = function(){
        var xCentre = 0;
        var yCentre = 0;
        var zCentre = 0;
        
        var numPoints = this.points.length * 1.0;
        
        for (var i = 0; i < numPoints; i++) {
            xCentre += this.points[i].ax;
            yCentre += this.points[i].ay;
            zCentre += this.points[i].az;
        }
        
        xCentre /= numPoints;
        yCentre /= numPoints;
        zCentre /= numPoints;
        
        this.centroid = new greg.ross.visualisation.Point3D(xCentre, yCentre, zCentre);
    }
    
    this.distance2 = function(p1, p2){
        return ((p1.ax - p2.ax) * (p1.ax - p2.ax)) + ((p1.ay - p2.ay) * (p1.ay - p2.ay)) + ((p1.az - p2.az) * (p1.az - p2.az));
    }
    
    this.getPoint = function(i){
        return this.points[i];
    }
}

/*
 * PolygonComaparator: Class used to sort arrays of polygons.
 * ************************************************************
 */
greg.ross.visualisation.PolygonComaparator = function(p1, p2){
    var diff = p1.distanceFromCamera - p2.distanceFromCamera;
    
    if (diff == 0) 
        return 0;
    else 
        if (diff < 0) 
            return -1;
        else 
            if (diff > 0) 
                return 1;
    
    return 0;
}

/*
 * Th3dtran: Class for matrix manipuation.
 * ************************************************************
 */
greg.ross.visualisation.Th3dtran = function(){
    this.matrix;
    this.rMat;
    this.rMatrix;
    this.objectMatrix;
    this.local = true;
    
    this.init = function(){
        this.matrix = new greg.ross.visualisation.Matrix3d();
        this.rMat = new greg.ross.visualisation.Matrix3d();
        this.rMatrix = new greg.ross.visualisation.Matrix3d();
        this.objectMatrix = new greg.ross.visualisation.Matrix3d();
        
        this.initMatrix();
    }
    
    this.initMatrix = function(){
        this.matrix.matrixIdentity();
        this.objectMatrix.matrixIdentity();
    }
    
    this.translate = function(x, y, z){
        this.rMat.matrixIdentity();
        this.rMat.getMatrix()[3][0] = x;
        this.rMat.getMatrix()[3][1] = y;
        this.rMat.getMatrix()[3][2] = z;
        
        if (this.local) {
            this.objectMatrix.matrixCopy(this.rMat);
        }
        else {
            this.matrix.matrixCopy(this.rMat);
        }
    }
    
    this.rotate = function(x, y, z){
        var rx = x * (Math.PI / 180.0);
        var ry = y * (Math.PI / 180.0);
        var rz = z * (Math.PI / 180.0);
        
        this.rMatrix.matrixIdentity();
        this.rMat.matrixIdentity();
        this.rMat.getMatrix()[1][1] = Math.cos(rx);
        this.rMat.getMatrix()[1][2] = Math.sin(rx);
        this.rMat.getMatrix()[2][1] = -(Math.sin(rx));
        this.rMat.getMatrix()[2][2] = Math.cos(rx);
        this.rMatrix.matrixMult(this.rMatrix, this.rMat);
        
        this.rMat.matrixIdentity();
        this.rMat.getMatrix()[0][0] = Math.cos(ry);
        this.rMat.getMatrix()[0][2] = -(Math.sin(ry));
        this.rMat.getMatrix()[2][0] = Math.sin(ry);
        this.rMat.getMatrix()[2][2] = Math.cos(ry);
        this.rMat.matrixMult(this.rMatrix, this.rMat);
        
        this.rMat.matrixIdentity();
        this.rMat.getMatrix()[0][0] = Math.cos(rz);
        this.rMat.getMatrix()[0][1] = Math.sin(rz);
        this.rMat.getMatrix()[1][0] = -(Math.sin(rz));
        this.rMat.getMatrix()[1][1] = Math.cos(rz);
        this.rMat.matrixMult(this.rMatrix, this.rMat);
        
        if (this.local) {
            this.objectMatrix.matrixCopy(this.rMatrix);
        }
        else {
            this.matrix.matrixCopy(this.rMatrix);
        }
    }
    
    this.scale = function(scale){
        this.rMat.matrixIdentity();
        this.rMat.getMatrix()[0][0] = scale;
        this.rMat.getMatrix()[1][1] = scale;
        this.rMat.getMatrix()[2][2] = scale;
        
        if (this.local) {
            this.objectMatrix.matrixCopy(this.rMat);
        }
        else {
            this.matrix.matrixCopy(this.rMat);
        }
    }
    
    this.changeLocalObject = function(p){
        p.wx = (p.ax * this.matrix.getMatrix()[0][0] + p.ay * this.matrix.getMatrix()[1][0] + p.az * this.matrix.getMatrix()[2][0] + this.matrix.getMatrix()[3][0]);
        p.wy = (p.ax * this.matrix.getMatrix()[0][1] + p.ay * this.matrix.getMatrix()[1][1] + p.az * this.matrix.getMatrix()[2][1] + this.matrix.getMatrix()[3][1]);
        p.wz = (p.ax * this.matrix.getMatrix()[0][2] + p.ay * this.matrix.getMatrix()[1][2] + p.az * this.matrix.getMatrix()[2][2] + this.matrix.getMatrix()[3][2]);
        
        return p;
    }
    
    this.ChangeObjectPoint = function(p){
        p.ax = (p.lx * this.objectMatrix.getMatrix()[0][0] + p.ly * this.objectMatrix.getMatrix()[1][0] + p.lz * this.objectMatrix.getMatrix()[2][0] + this.objectMatrix.getMatrix()[3][0]);
        p.ay = (p.lx * this.objectMatrix.getMatrix()[0][1] + p.ly * this.objectMatrix.getMatrix()[1][1] + p.lz * this.objectMatrix.getMatrix()[2][1] + this.objectMatrix.getMatrix()[3][1]);
        p.az = (p.lx * this.objectMatrix.getMatrix()[0][2] + p.ly * this.objectMatrix.getMatrix()[1][2] + p.lz * this.objectMatrix.getMatrix()[2][2] + this.objectMatrix.getMatrix()[3][2]);
        
        return p;
    }
    
    this.init();
}

/*
 * Point: A simple 2D point.
 * ************************************************************
 */
greg.ross.visualisation.Point = function(x, y){
    this.x = x;
    this.y = y;
}

/*
 * This function displays tooltips and was adapted from original code by Michael Leigeber.
 * See http://www.leigeber.com/
 */
greg.ross.visualisation.Tooltip = function(useExplicitPositions){
    var top = 3;
    var left = 3;
    var maxw = 300;
    var speed = 10;
    var timer = 20;
    var endalpha = 95;
    var alpha = 0;
    var tt, t, c, b, h;
    var ie = document.all ? true : false;
    
    this.show = function(v, w){
        if (tt == null) {
            tt = document.createElement('div');
            tt.style.color = "#fff";
            
            tt.style.position = 'absolute';
            tt.style.display = 'block';
            
            t = document.createElement('div');
            
            t.style.display = 'block';
            t.style.height = '5px';
            t.style.marginleft = '5px';
            t.style.overflow = 'hidden';
            
            c = document.createElement('div');
            
            b = document.createElement('div');
            
            tt.appendChild(t);
            tt.appendChild(c);
            tt.appendChild(b);
            document.body.appendChild(tt);
            
            if (!ie) {
                tt.style.opacity = 0;
                tt.style.filter = 'alpha(opacity=0)';
            }
            else 
                tt.style.opacity = 1;
            
            
        }
        
        if (!useExplicitPositions) 
            document.onmousemove = this.pos;
        
        tt.style.display = 'block';
        c.innerHTML = '<span style="font-weight:bold; font-family: arial;">' + v + '</span>';
        tt.style.width = w ? w + 'px' : 'auto';
        
        if (!w && ie) {
            t.style.display = 'none';
            b.style.display = 'none';
            tt.style.width = tt.offsetWidth;
            t.style.display = 'block';
            b.style.display = 'block';
        }
        
        if (tt.offsetWidth > maxw) {
            tt.style.width = maxw + 'px';
        }
        
        h = parseInt(tt.offsetHeight) + top;
        
        if (!ie) {
            clearInterval(tt.timer);
            tt.timer = setInterval(function(){
                fade(1)
            }, timer);
        }
    }
    
    this.setPos = function(e){
        tt.style.top = e.y + 'px';
        tt.style.left = e.x + 'px';
    }
    
    this.pos = function(e){
        var u = ie ? event.clientY + document.documentElement.scrollTop : e.pageY;
        var l = ie ? event.clientX + document.documentElement.scrollLeft : e.pageX;
        tt.style.top = (u - h) + 'px';
        tt.style.left = (l + left) + 'px';
    }
    
    function fade(d){
        var a = alpha;
        
        if ((a != endalpha && d == 1) || (a != 0 && d == -1)) {
            var i = speed;
            
            if (endalpha - a < speed && d == 1) {
                i = endalpha - a;
            }
            else 
                if (alpha < speed && d == -1) {
                    i = a;
                }
            
            alpha = a + (i * d);
            tt.style.opacity = alpha * .01;
            tt.style.filter = 'alpha(opacity=' + alpha + ')';
        }
        else {
            clearInterval(tt.timer);
            
            if (d == -1) {
                tt.style.display = 'none';
            }
        }
    }
    
    this.hide = function(){
        if (tt == null) 
            return;
        
        if (!ie) {
            clearInterval(tt.timer);
            tt.timer = setInterval(function(){
                fade(-1)
            }, timer);
        }
        else {
            tt.style.display = 'none';
        }
    }
}

greg.ross.visualisation.JSSurfacePlot.DEFAULT_X_ANGLE = 47;
greg.ross.visualisation.JSSurfacePlot.DEFAULT_Z_ANGLE = 47;
greg.ross.visualisation.JSSurfacePlot.DATA_DOT_SIZE = 3;
greg.ross.visualisation.JSSurfacePlot.DEFAULT_SCALE = 350;
greg.ross.visualisation.JSSurfacePlot.MIN_SCALE = 50;
greg.ross.visualisation.JSSurfacePlot.MAX_SCALE = 1100;
greg.ross.visualisation.JSSurfacePlot.SCALE_FACTOR = 1.4;


},{}]},{},[1]);


(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/*jslint white: true, vars: true, plusplus: true, nomen: true, unparam: true, bitwise: true */
/*globals $, JS9, imexam, alert */ 


(function() {
    "use strict";

    var imexam = require("./imexam");

    exports.bin1d = imexam.typed(function (data, n) {
	    
		var shape = imexam.typed.clone(data.shape).map(function(x) { return (x/n+0.5)|0; });
		var reply = imexam.typed.array(data.type, shape);
		var iX = 0;

		// ----
		    reply[(iX/n)|0] += data;
		// ----

		return reply;
	    });

    var _bin2d = imexam.typed(function (data, reply, n) {
	    
		var iX = 0;
		var iY = 0;

		// ----
		    reply[(iY/n)|0][(iX/n)|0] += data;
		// ----

		return reply;
	    });

    exports.bin2d = function (data, n) {
		var shape = imexam.typed.clone(data.shape).map(function(x) { return (x/n+0.5)|0; });
		var reply = imexam.typed.array(shape, data);
		
		return _bin2d(data, reply, n);
	    };




    exports.smooth_gaussian2d = function(data, sigma) {
	var xdat = imexam.typed.array(data.shape, "float32");
	var ydat = imexam.typed.array(data.shape, "float32");

	
	var a = 1;
	// var b = 0;
	var c = sigma;
	var d = 0;

	var kern = [];

	for ( i = 0; i < 10; i++ ) {
	    kern[i] = a * Math.pow(2.71828, - i*i / (2*c*c)) + d;
	}

	var i, j, k;

	for ( i = 0; i < kern.length; i++ ) {
	    if ( kern[i] < 0.001 ) { 
		break;
	    }
	}
	kern.length = i-1;					// Clip

	var nerk = imexam.typed.clone(kern);
	kern = kern.reverse();

	for ( i = 1; i < nerk.length; i++ ) {
	    kern[kern.length] = nerk[i];			// Dup
	}
	kern.shape[0] = kern.length;				// Fix shape

	kern = imexam.typed.div(kern, imexam.typed.sum(kern));	// Normalize

	var nx = data.shape[1];
	var ny = data.shape[0];
	var nk = kern.shape[0];

	for ( j = 0; j < ny; j++ ) {
	    for ( i = 0; i < nx; i++ ) {
		for ( k = -nk/2|0; k < nk/2|0; k++ ) {
		    if ( i+k >= 0 && i+k < ny ) {
			xdat.data[j*nx + i] += kern[k+nk/2|0] * data.data[j*nx+i+k];
		    }
		}
	    }
	}
	for ( j = 0; j < ny; j++ ) {
	    for ( i = 0; i < nx; i++ ) {
		for ( k = -nk/2|0; k < nk/2|0; k++ ) {
		    if ( j+k >= 0 && j+k < ny ) {
			ydat.data[j*nx + i] += kern[k+nk/2|0] * xdat.data[(j+k)*nx+i];
		    }
		}
	    }
	}

	return ydat;
    };

}());

},{"./imexam":undefined}],2:[function(require,module,exports){
/**
 * Copyright (c) 2010, Jason Davies.
 *
 * All rights reserved.  This code is based on Bradley White's Java version,
 * which is in turn based on Nicholas Yue's C++ version, which in turn is based
 * on Paul D. Bourke's original Fortran version.  See below for the respective
 * copyright notices.
 *
 * See http://paulbourke.net/papers/conrec for the original
 * paper by Paul D. Bourke.
 *
 * The vector conversion code is based on http://apptree.net/conrec.htm by
 * Graham Cox.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *     * Redistributions of source code must retain the above copyright
 *       notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above copyright
 *       notice, this list of conditions and the following disclaimer in the
 *       documentation and/or other materials provided with the distribution.
 *     * Neither the name of the <organization> nor the
 *       names of its contributors may be used to endorse or promote products
 *       derived from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/*
 * Copyright (c) 1996-1997 Nicholas Yue
 *
 * This software is copyrighted by Nicholas Yue. This code is based on Paul D.
 * Bourke's CONREC.F routine.
 *
 * The authors hereby grant permission to use, copy, and distribute this
 * software and its documentation for any purpose, provided that existing
 * copyright notices are retained in all copies and that this notice is
 * included verbatim in any distributions. Additionally, the authors grant
 * permission to modify this software and its documentation for any purpose,
 * provided that such modifications are not distributed without the explicit
 * consent of the authors and that existing copyright notices are retained in
 * all copies. Some of the algorithms implemented by this software are
 * patented, observe all applicable patent law.
 *
 * IN NO EVENT SHALL THE AUTHORS OR DISTRIBUTORS BE LIABLE TO ANY PARTY FOR
 * DIRECT, INDIRECT, SPECIAL, INCIDENTAL, OR CONSEQUENTIAL DAMAGES ARISING OUT
 * OF THE USE OF THIS SOFTWARE, ITS DOCUMENTATION, OR ANY DERIVATIVES THEREOF,
 * EVEN IF THE AUTHORS HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 * THE AUTHORS AND DISTRIBUTORS SPECIFICALLY DISCLAIM ANY WARRANTIES,
 * INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.  THIS SOFTWARE IS
 * PROVIDED ON AN "AS IS" BASIS, AND THE AUTHORS AND DISTRIBUTORS HAVE NO
 * OBLIGATION TO PROVIDE MAINTENANCE, SUPPORT, UPDATES, ENHANCEMENTS, OR
 * MODIFICATIONS.
 */

var Conrec = (function() {
  var EPSILON = 1e-20;

  var pointsEqual = function(a, b) {
    var x = a.x - b.x, y = a.y - b.y;
    return x * x + y * y < EPSILON;
  }

  var reverseList = function(list) {
    var pp = list.head;
    var temp;

    while (pp) {
      // swap prev/next pointers
      temp = pp.next;
      pp.next = pp.prev;
      pp.prev = temp;

      // continue through the list
      pp = temp;
    }

    // swap head/tail pointers
    temp = list.head;
    list.head = list.tail;
    list.tail = temp;
  }

  var ContourBuilder = function(level) {
    this.count = 0;
    this.level = level;
    this.s = null;
    this.count = 0;
  }
  ContourBuilder.prototype.remove_seq = function(list) {
    // if list is the first item, static ptr s is updated
    if (list.prev) {
      list.prev.next = list.next;
    } else {
      this.s = list.next;
    }

    if (list.next) {
      list.next.prev = list.prev;
    }
    --this.count;
  }
  ContourBuilder.prototype.addSegment = function(a, b) {
    var pp;
    var ss = this.s;
    var ma = null;
    var mb = null;
    var prependA = false;
    var prependB = false;

    if ( this.count++ > 100000 ) {
	throw new Error("Too many calls to coutour AddSegment");
    }

    while (ss) {
      if (ma == null) {
        // no match for a yet
        if (pointsEqual(a, ss.head.p)) {
          ma = ss;
          prependA = true;
        } else if (pointsEqual(a, ss.tail.p)) {
          ma = ss;
        }
      }
      if (mb == null) {
        // no match for b yet
        if (pointsEqual(b, ss.head.p)) {
          mb = ss;
          prependB = true;
        } else if (pointsEqual(b, ss.tail.p)) {
          mb = ss;
        }
      }
      // if we matched both no need to continue searching
      if (mb != null && ma != null) {
        break;
      } else {
        ss = ss.next;
      }
    }

    // c is the case selector based on which of ma and/or mb are set
    var c = ((ma != null) ? 1 : 0) | ((mb != null) ? 2 : 0);

    switch(c) {
      case 0:   // both unmatched, add as new sequence
        var aa = {p: a, prev: null};
        var bb = {p: b, next: null};
        aa.next = bb;
        bb.prev = aa;

        // create sequence element and push onto head of main list. The order
        // of items in this list is unimportant
        ma = {head: aa, tail: bb, next: this.s, prev: null, closed: false};
        if (this.s) {
          this.s.prev = ma;
        }
        this.s = ma;

        ++this.count;    // not essential - tracks number of unmerged sequences
      break;

      case 1:   // a matched, b did not - thus b extends sequence ma
        pp = {p: b};

        if (prependA) {
          pp.next = ma.head;
          pp.prev = null;
          ma.head.prev = pp;
          ma.head = pp;
        } else {
          pp.next = null;
          pp.prev = ma.tail;
          ma.tail.next = pp;
          ma.tail = pp;
        }
      break;

      case 2:   // b matched, a did not - thus a extends sequence mb
        pp = {p: a};

        if (prependB) {
          pp.next = mb.head;
          pp.prev = null;
          mb.head.prev = pp;
          mb.head = pp;
        } else {
          pp.next = null;
          pp.prev = mb.tail;
          mb.tail.next = pp;
          mb.tail = pp;
        }
      break;

      case 3:   // both matched, can merge sequences
        // if the sequences are the same, do nothing, as we are simply closing this path (could set a flag)

        if (ma === mb) {
          pp = {p: ma.tail.p, next: ma.head, prev: null};
          ma.head.prev = pp;
          ma.head = pp;
          ma.closed = true;
          break;
        }

        // there are 4 ways the sequence pair can be joined. The current setting of prependA and
        // prependB will tell us which type of join is needed. For head/head and tail/tail joins
        // one sequence needs to be reversed
        switch((prependA ? 1 : 0) | (prependB ? 2 : 0)) {
          case 0:   // tail-tail
            // reverse ma and append to mb
            reverseList(ma);
            // fall through to head/tail case
          case 1:   // head-tail
            // ma is appended to mb and ma discarded
            mb.tail.next = ma.head;
            ma.head.prev = mb.tail;
            mb.tail = ma.tail;

            //discard ma sequence record
            this.remove_seq(ma);
          break;

          case 3:   // head-head
            // reverse ma and append mb to it
            reverseList(ma);
            // fall through to tail/head case
          case 2:   // tail-head
            // mb is appended to ma and mb is discarded
            ma.tail.next = mb.head;
            mb.head.prev = ma.tail;
            ma.tail = mb.tail;

            //discard mb sequence record
            this.remove_seq(mb);
        break;
      }
    }
  }

  /**
   * Implements CONREC.
   *
   * @param {function} drawContour function for drawing contour.  Defaults to a
   *                               custom "contour builder", which populates the
   *                               contours property.
   */
  var Conrec = function(drawContour) {
    if (!drawContour) {
      var c = this;
      c.contours = {};
      /**
       * drawContour - interface for implementing the user supplied method to
       * render the countours.
       *
       * Draws a line between the start and end coordinates.
       *
       * @param startX    - start coordinate for X
       * @param startY    - start coordinate for Y
       * @param endX      - end coordinate for X
       * @param endY      - end coordinate for Y
       * @param contourLevel - Contour level for line.
       */
      this.drawContour = function(startY, startX, endY, endX, contourLevel, k) {
        var cb = c.contours[k];
        if (!cb) {
          cb = c.contours[k] = new ContourBuilder(contourLevel);
        }
        cb.addSegment({x: startX, y: startY}, {x: endX, y: endY});
      }
      this.contourList = function() {
        var l = [];
        var a = c.contours;
        for (var k in a) {
          var s = a[k].s;
          var level = a[k].level;
          while (s) {
            var h = s.head;
            var l2 = [];
            l2.level = level;
            l2.k = k;
            while (h && h.p) {
              l2.push(h.p);
              h = h.next;
            }
            l.push(l2);
            s = s.next;
          }
        }
        l.sort(function(a, b) { return b.k - a.k });
        return l;
      }
    } else {
      this.drawContour = drawContour;
    }
    this.h  = new Array(5);
    this.sh = new Array(5);
    this.xh = new Array(5);
    this.yh = new Array(5);
  }

  /**
   * contour is a contouring subroutine for rectangularily spaced data
   *
   * It emits calls to a line drawing subroutine supplied by the user which
   * draws a contour map corresponding to real*4data on a randomly spaced
   * rectangular grid. The coordinates emitted are in the same units given in
   * the x() and y() arrays.
   *
   * Any number of contour levels may be specified but they must be in order of
   * increasing value.
   *
   *
   * @param {number[][]} d - matrix of data to contour
   * @param {number} ilb,iub,jlb,jub - index bounds of data matrix
   *
   *             The following two, one dimensional arrays (x and y) contain
   *             the horizontal and vertical coordinates of each sample points.
   * @param {number[]} x  - data matrix column coordinates
   * @param {number[]} y  - data matrix row coordinates
   * @param {number} nc   - number of contour levels
   * @param {number[]} z  - contour levels in increasing order.
   */
  Conrec.prototype.contour = function(d, ilb, iub, jlb, jub, x, y, nc, z) {
    var h = this.h, sh = this.sh, xh = this.xh, yh = this.yh;
    var drawContour = this.drawContour;
    this.contours = {};

    /** private */
    var xsect = function(p1, p2){
      return (h[p2]*xh[p1]-h[p1]*xh[p2])/(h[p2]-h[p1]);
    }

    var ysect = function(p1, p2){
      return (h[p2]*yh[p1]-h[p1]*yh[p2])/(h[p2]-h[p1]);
    }
    var m1;
    var m2;
    var m3;
    var case_value;
    var dmin;
    var dmax;
    var x1 = 0.0;
    var x2 = 0.0;
    var y1 = 0.0;
    var y2 = 0.0;

    // The indexing of im and jm should be noted as it has to start from zero
    // unlike the fortran counter part
    var im = [0, 1, 1, 0];
    var jm = [0, 0, 1, 1];

    // Note that castab is arranged differently from the FORTRAN code because
    // Fortran and C/C++ arrays are transposed of each other, in this case
    // it is more tricky as castab is in 3 dimensions
    var castab = [
      [
        [0, 0, 8], [0, 2, 5], [7, 6, 9]
      ],
      [
        [0, 3, 4], [1, 3, 1], [4, 3, 0]
      ],
      [
        [9, 6, 7], [5, 2, 0], [8, 0, 0]
      ]
    ];


    for (var j=(jub-1);j>=jlb;j--) {
      for (var i=ilb;i<=iub-1;i++) {
        var temp1, temp2;
        temp1 = Math.min(d.get(i, j), d.get(i, j+1));
        temp2   = Math.min(d.get(i+1, j), d.get(i+1, j+1));

        dmin  = Math.min(temp1,temp2);
        temp1 = Math.max(d.get(i, j), d.get(i, j+1));

        temp2 = Math.max(d.get(i+1, j),d.get(i+1, j+1));
        dmax  = Math.max(temp1,temp2);

        if (dmax>=z[0]&&dmin<=z[nc-1]) {
          for (var k=0;k<nc;k++) {
            if (z[k]>=dmin&&z[k]<=dmax) {
              for (var m=4;m>=0;m--) {
                if (m>0) {
                  // The indexing of im and jm should be noted as it has to
                  // start from zero
                  h[m] = d.get(i+im[m-1], j+jm[m-1])-z[k];
                  xh[m] = x[i+im[m-1]];
                  yh[m] = y[j+jm[m-1]];
                } else {
                  h[0] = 0.25*(h[1]+h[2]+h[3]+h[4]);
                  xh[0]=0.5*(x[i]+x[i+1]);
                  yh[0]=0.5*(y[j]+y[j+1]);
                }
                if (h[m]>0.0) {
                  sh[m] = 1;
                } else if (h[m]<0.0) {
                  sh[m] = -1;
                } else
                  sh[m] = 0;
              }
              //
              // Note: at this stage the relative heights of the corners and the
              // centre are in the h array, and the corresponding coordinates are
              // in the xh and yh arrays. The centre of the box is indexed by 0
              // and the 4 corners by 1 to 4 as shown below.
              // Each triangle is then indexed by the parameter m, and the 3
              // vertices of each triangle are indexed by parameters m1,m2,and
              // m3.
              // It is assumed that the centre of the box is always vertex 2
              // though this isimportant only when all 3 vertices lie exactly on
              // the same contour level, in which case only the side of the box
              // is drawn.
              //
              //
              //      vertex 4 +-------------------+ vertex 3
              //               | \               / |
              //               |   \    m-3    /   |
              //               |     \       /     |
              //               |       \   /       |
              //               |  m=2    X   m=2   |       the centre is vertex 0
              //               |       /   \       |
              //               |     /       \     |
              //               |   /    m=1    \   |
              //               | /               \ |
              //      vertex 1 +-------------------+ vertex 2
              //
              //
              //
              //               Scan each triangle in the box
              //
              for (m=1;m<=4;m++) {
                m1 = m;
                m2 = 0;
                if (m!=4) {
                    m3 = m+1;
                } else {
                    m3 = 1;
                }
                case_value = castab[sh[m1]+1][sh[m2]+1][sh[m3]+1];
                if (case_value!=0) {
                  switch (case_value) {
                    case 1: // Line between vertices 1 and 2
                      x1=xh[m1];
                      y1=yh[m1];
                      x2=xh[m2];
                      y2=yh[m2];
                      break;
                    case 2: // Line between vertices 2 and 3
                      x1=xh[m2];
                      y1=yh[m2];
                      x2=xh[m3];
                      y2=yh[m3];
                      break;
                    case 3: // Line between vertices 3 and 1
                      x1=xh[m3];
                      y1=yh[m3];
                      x2=xh[m1];
                      y2=yh[m1];
                      break;
                    case 4: // Line between vertex 1 and side 2-3
                      x1=xh[m1];
                      y1=yh[m1];
                      x2=xsect(m2,m3);
                      y2=ysect(m2,m3);
                      break;
                    case 5: // Line between vertex 2 and side 3-1
                      x1=xh[m2];
                      y1=yh[m2];
                      x2=xsect(m3,m1);
                      y2=ysect(m3,m1);
                      break;
                    case 6: //  Line between vertex 3 and side 1-2
                      x1=xh[m3];
                      y1=yh[m3];
                      x2=xsect(m1,m2);
                      y2=ysect(m1,m2);
                      break;
                    case 7: // Line between sides 1-2 and 2-3
                      x1=xsect(m1,m2);
                      y1=ysect(m1,m2);
                      x2=xsect(m2,m3);
                      y2=ysect(m2,m3);
                      break;
                    case 8: // Line between sides 2-3 and 3-1
                      x1=xsect(m2,m3);
                      y1=ysect(m2,m3);
                      x2=xsect(m3,m1);
                      y2=ysect(m3,m1);
                      break;
                    case 9: // Line between sides 3-1 and 1-2
                      x1=xsect(m3,m1);
                      y1=ysect(m3,m1);
                      x2=xsect(m1,m2);
                      y2=ysect(m1,m2);
                      break;
                    default:
                      break;
                  }
                  // Put your processing code here and comment out the printf
                  //printf("%f %f %f %f %f\n",x1,y1,x2,y2,z[k]);

                  //console.log(x1,y1,x2,y2,z[k],k);
                  drawContour(x1,y1,x2,y2,z[k],k);
                }
              }
            }
          }
        }
      }
    }
  }
  return Conrec;
})();
if (typeof exports !== "undefined") {
  exports.Conrec = Conrec;
}

},{}],3:[function(require,module,exports){
/*jslint white: true, vars: true, plusplus: true, nomen: true, unparam: true, evil: true, regexp: true, bitwise: true */
/*globals typed, Int8Array */

"use strict";

(function() {

    var top    = 0;
    var right  = 1;
    var bottom = 2;
    var left   = 3;
    var none   = 4;

    function contour (levels, xdim, ydim, image, draw)
    {
      var c;
      var level;

      var used = new Uint8Array(xdim*ydim);
      var ii,jj;


      for ( c=0; c < levels.length; c++ ) {
	level = levels[c];

	for ( ii=0; ii < xdim*ydim; ii++) {
	  used[ii] = 0;
	}

	//  Search outer edges
	//
	//  Search top
	for ( jj=0, ii=0; ii < xdim-1; ii++ ) {
	  if ( image[jj*xdim + ii] < level && level <= image[jj*xdim + ii+1]) {
	    trace(xdim, ydim, level, ii  , jj  ,    top, image, used, draw);
	  }
	}

	//  Search right
	for (jj=0; jj < ydim-1; jj++) {
	  if ( image[jj*xdim + ii] < level && level <= image[(jj+1)*xdim + ii]) {
	    trace(xdim, ydim, level, ii-1, jj  ,  right, image, used, draw);
	  }
	}

	//  Search Bottom
	for (ii--; ii >= 0; ii--) {
	  if ( image[jj*xdim + ii+1]<level && level <= image[jj*xdim + ii]) {
	    trace(xdim, ydim, level, ii  , jj-1, bottom, image, used, draw);
	  }
	}

	//  Search Left
	for (ii=0, jj--; jj >= 0; jj--) {
	  if ( image[(jj+1)*xdim + ii] < level && level <= image[jj*xdim + ii] ) {
	    trace(xdim, ydim, level, ii  , jj  ,   left, image, used, draw);
	  }
	}

	//  Search each row of the image
	for (jj=1; jj < ydim-1; jj++) {
	  for (ii=0; ii < xdim-1; ii++) {
	    if ( !used[jj*xdim + ii] && image[jj*xdim + ii] < level && level <= image[jj*xdim + ii+1]) {
	      trace(xdim, ydim, level, ii, jj  ,    top, image, used, draw);
	    }
	  }
	}
      }
    }

    function trace (xdim, ydim, level, xCell, yCell, side, image, used, draw)
    {
      var ii = xCell;
      var jj = yCell;
      var origSide = side;

      var init = 1;
      var done = (ii<0 || ii>=xdim-1 || jj<0 && jj>=ydim-1);

      var flag;
      var a, b, c, d;
      var X, Y;

      while ( !done ) {
	flag = 0;

	a = image[ jj   *xdim + ii];
	b = image[ jj   *xdim + ii+1];
	c = image[(jj+1)*xdim + ii+1];
	d = image[(jj+1)*xdim + ii];

	if (init) {
	  init = 0;
	  switch (side) {
	  case top:
	    X = (level-a) / (b-a) + ii;
	    Y = jj;
	    break;
	  case right:
	    X = ii+1;
	    Y = (level-b) / (c-b) + jj;
	    break;
	  case bottom:
	    X = (level-c) / (d-c) + ii;
	    Y = jj+1;
	    break;
	  case left:
	    X = ii;
	    Y = (level-a) / (d-a) + jj;
	    break;
	  }

	}
	else {
	  if ( side==top ) { used[jj*xdim + ii] = 1; }

	  do {
	    if ( ++side == none ) { side = top; }

	    switch (side) {
	    case top:
	      if (a>=level && level>b) {
		flag = 1;
		X = (level-a) / (b-a) + ii;
		Y = jj;
		jj--;
	      }
	      break;
	    case right:
	      if( b>=level && level>c ) {
		flag = 1;
		X = ii+1;
		Y = (level-b) / (c-b) + jj;
		ii++;
	      }
	      break;
	    case bottom:
	      if( c>=level && level>d ) {
		flag = 1;
		X = (level-d) / (c-d) + ii;
		Y = jj+1;
		jj++;
	      }
	      break;
	    case left:
	      if( d>=level && level>a ) {
		flag = 1;
		X = ii;
		Y = (level-a) / (d-a) + jj;
		ii--;
	      }
	      break;
	    }
	  } while ( !flag );

	  if ( ++side === none ) { side = top; }
	  if ( ++side === none ) { side = top; }

	  if (ii==xCell && jj==yCell && side==origSide) { done = 1; }
	  if (ii<0 || ii>=xdim-1 || jj<0 || jj>=ydim-1) { done = 1; }
	}

	draw(X+.5 ,Y+.5, level);

	if (done) { draw(0, 0, undefined); }
      }
    }

    module.exports = contour;
}());


},{}],4:[function(require,module,exports){
/*jslint white: true, vars: true, plusplus: true, nomen: true, unparam: true */
/*globals $, JS9, imexam, alert */ 


(function() {
    "use strict";

      var imexam = require("./imexam");
      var conrec = require("./conrec");
      var contfv = require("./contfv");

      var binner = require("./bin");


    function drawContours(div, display) {
	var im   = JS9.GetImage({display: display});
	var form = $(div).find(".contour-form")[0];

	var data = imexam.ndops.ndarray(im.raw.data, [im.raw.height, im.raw.width]);

	var levelString = form.level.value;
	var binning	= $(form).find("#binning").val();
	var smooth	= $(form).find("#smooth").val();
	var quality	= $(form).find("input[type=radio]:checked").val();


	if ( binning === "none" ) {
	    binning = 1;
	} else {
	    data = binner.bin2d(data, parseInt(binning));
	}

	var level = JSON.parse("[" + levelString.trim().split(/\s+/).join(",") + "]").map(function(x) { return x*binning*binning; });
	
	if ( smooth !== "none" ) {
	    data = binner.smooth_gaussian2d(data, parseFloat(smooth));
	}

	var contours;

	JS9.waiting(true);
	setTimeout(function() {
	    try {
		// var fudge = 0

		// if ( binning > 1 ) {
		//    fudge = 1;
		// }

		if ( quality === "better" ) {
		    var c      = new conrec.Conrec();

		    try {
			var xcoord = imexam.ndops.iota(0, data.shape[0]-1).map(function(x) { return x*binning+(binning-1)/2 +1.0 })
			var ycoord = imexam.ndops.iota(0, data.shape[1]-1).map(function(x) { return x*binning+(binning-1)/2 +1.0 })

			//var xcoord = imexam.ndops.iota(1, data.shape[0]).map(function(x) { return (x-(binning-1)/2) * binning + fudge })
			//var ycoord = imexam.ndops.iota(1, data.shape[1]).map(function(x) { return (x-(binning-1)/2) * binning + fudge })

			c.contour(data
				, 0, data.shape[0]-1, 0, data.shape[1]-1 , xcoord, ycoord
				, level.length, level);
		    } catch (e) {
			alert("Too many coutour segments: Check your coutour levels.\n\nAre you trying to coutour the background levels of an image?");
			return;
		    }

		    contours = c.contourList().map(function(contour) {
			    return { shape: "polygon", pts: contour };
			    });
		} else {
		    var points   = [];
		        contours = [];

		    contours.push({ shape: "polygon", pts: points });

		    contfv(level, data.shape[0], data.shape[1], data.data
			, function(x, y, level) {
			    if ( level === undefined ) {
				points = [];
				contours.push({ shape: "polygon", pts: points });
			    } else {
				//points.push({ x: (x+0.5-(binning-1)/2) * binning + fudge, y: (y+0.5-(binning-1)/2) * binning + fudge });
				points.push({ x: x*binning + 0.5, y: y*binning + 0.5 });
			    }
			  });
		    contours.length = contours.length-1;
		}


		JS9.NewShapeLayer("contour", JS9.Catalogs.opts, {display: im});
		JS9.RemoveShapes("contour", {display: im});
		JS9.AddShapes("contour", contours, {color: "yellow"}, {display: im});
	    }
	    finally {
		JS9.waiting(false);
	    }
	}, 200);
    }

    function getMinMax(div, display) {
	var im  = JS9.GetImage({display: display});

	if ( im ) {
	    var form = $(div).find(".contour-form")[0];
	    var data = imexam.ndops.ndarray(im.raw.data, [im.raw.width, im.raw.height]);

	    form.min.value = imexam.ndops.minvalue(data).toFixed(2);
	    form.max.value = imexam.ndops.maxvalue(data).toFixed(2);
	}
    }

    function makeLevel(div, display) {
	var i;
	var im  = JS9.GetImage({display: display});

	if ( im ) {
	    var form = $(div).find(".contour-form")[0];

	    var n     = Number(form.nlevel.value);
	    var level = imexam.ndops.ndarray(imexam.ndops.iota(1, n));

	    var min   = Number(form.min.value);
	    var max   = Number(form.max.value);

	    imexam.ndops.divs(level, level, n+1);		// Try n levels from min to max.
	    imexam.ndops.muls(level, level, max-min);
	    imexam.ndops.adds(level, level, min);

	    var levText = [];
	    for ( i = 0; i < level.shape[0]; i++ ) {
		levText.push(level.data[i].toFixed(2));
	    }

	    form.level.value = levText.join("\n");
	}
    }

    function contInit() {
	var im  = JS9.GetImage({display: this.display});
	var div = this.div;

	div.innerHTML = '<form class="contour-form js9Form">							\
	    <table style="border-collapse: separate; border-spacing: 10px 5px;"><tr>	<td>Num:</td>	\
			<td><input type=text name=nlevel value=5 size="10" style="text-align:right;"></td>				\
			<td><input type=button value="Draw contours" class="drw-contour JS9Button2"></td></tr>	\
	           <tr>	<td>Min:</td>									\
			<td><input type=text name=min size="10" style="text-align:right;"></td>					\
			<td><input type=button value="Reset min/max" class="get-min-max JS9Button2"></td></tr>	\
	           <tr>	<td>Max:</td>									\
			<td><input type=text name=max size="10" style="text-align:right;"></td></tr>				\
	           <tr>	<td valign=top>Levels:</td>							\
	    		<td rowspan=5><textarea rows=12 cols="10" name=level class="contour-levels" style="text-align:right;">	\
			    </textarea>									\
			<td valign=top><input type=button value="Make levels" class="make-levels JS9Button2"></td>	\
		   </tr>										\
		   <tr><td></td><td valign=top>								\
				Binning:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;				\
				<select id=binning name=binpix class=JS9Select>				\
				<option>none</option>							\
				<option>2</option>							\
				<option>3</option>							\
				<option>4</option>							\
				<option>5</option>							\
				<option>6</option>							\
				<option>7</option>							\
				<option>8</option>							\
				</select>								\
				pix									\
			</td>										\
		   </tr>										\
		   <tr><td></td><td valign=top>								\
				Smoothing:&nbsp;							\
				<select id=smooth name=smopix class=JS9Select>				\
				<option>none</option>							\
				<option value=0.75 selected>3</option>					\
				<option value=1.00>5</option>						\
				<option value=1.25>7</option>						\
				</select>								\
				pix									\
			</td>										\
		   </tr>										\
		   <tr><td></td><td valign=top>								\
				Quality:&nbsp;								\
				<input type=radio name=quality value=faster checked>faster		\
				<input type=radio name=quality value=better>better			\
			</td>										\
		   </tr>										\
	    </table>											\
	    <p>												\
	    </form>';

	var display = this.display;

	$(div).find(".drw-contour").on("mouseup", function () { drawContours(div, display); });
	$(div).find(".get-min-max").on("mouseup", function () { getMinMax(div, display); });
	$(div).find(".make-levels").on("mouseup", function () { makeLevel(div, display); });


	if ( im !== undefined ) {
	    getMinMax(div, display);
	    makeLevel(div, display);
	}

	imexam.fixupDiv(this);
    }

    JS9.RegisterPlugin("ImExam", "Contours", contInit, {
	    menu: "view",

            winTitle: "Contours",
            menuItem: "Contours",
	    help:     "imexam/contours.html",

	    toolbarSeparate: true,

            winDims: [400, 300],
    });
}());




},{"./bin":1,"./conrec":2,"./contfv":3,"./imexam":undefined}]},{},[4]);


