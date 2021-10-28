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

