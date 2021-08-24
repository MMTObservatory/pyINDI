/************************************
 * utility.js
 * A collection of useful utility functions
 */

/**
 * Pads the left of number n with zeros so the string is w digits wide
 */
function zeropad(n, w) {
    var s = '' + n;
    while (s.length < w) s = '0' + s;
    return s;
}

/**
 * Pads the left of number n with spaces so the string is w digits wide
 */
function spacepad(n, w) {
    var s = '' + n;
    while (s.length < w) s = ' ' + s;
    return s;
}

/**
 * Converts a radian value to degrees
 */
function rad2deg(rad) {
    return rad*180.0/Math.PI;
}

/**
 * Converts a radian value to hours
 */
  function rad2hr(rad) {
    return rad*12.0/Math.PI;
}

/**
 * Converts a degree value to radians
 */
function deg2rad(deg) {
    return deg*Math.PI/180.0;
}

/**
 * Converts an hour value to radians
 */
function hr2rad(hr) {
    return hr*Math.PI/12.0;
}

/**
 * rounds a number v to n decimal places
 */
function round (v, n)
{
    return sprintf ("%." + n + "f", parseFloat(v));
}

/**
 * Return now as an ISO date stamp
 */
function getTimeStampNow() {
    var now = new Date();
    return sprintf ("%04d-%02d-%02dT%02d:%02d:%02d.%03d",
	now.getUTCFullYear(), now.getUTCMonth()+1, now.getUTCDate(),
	now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds(), now.getUTCMilliseconds());
}


/**
 * Formats a decimal number a into sexagesimal format.
 * w is the number of spaces used by the whole part.
 * b is the number of pieces into which the whole is broken:
 *      3600000:  <w>:mm:ss.sss
 *      360000:   <w>:mm:ss.ss
 *      36000:    <w>:mm:ss.s
 *      3600:     <w>:mm:ss
 *      600:      <w>:mm.m
 *      60:       <w>:mm
 */
function sexa(a, w, b)
{
	/* insure a is a number */
	a += 0;

        /* save whether it's negative but do all the rest with a positive */
        isneg = (a < 0);
        if (isneg)
            a = -a;

        /* convert to an integral number of whole portions */
        n = Math.floor(a * b + 0.5);
        d = Math.floor(n/b);
        f = Math.floor(n%b);

        /* form the whole part; "negative 0" is a special case */
        if (isneg && d == 0) {
	    // out = sprintf ("%*s-0", w-2, "");
	    out = spacepad("", w-2) + "-0";
        } else {
	    // out = sprintf ("%*d", w, isneg ? -d : d);
	    out = spacepad (isneg ? -d : d, w);
	}

        /* do the rest */
        switch (b) {
        case 60:        /* dd:mm */
            m = Math.floor(f/(b/60));
            out += sprintf (":%02d", m);
            break;
        case 600:       /* dd:mm.m */
            out += sprintf (":%02d.%1d", f/10, f%10);
            break;
        case 3600:      /* dd:mm:ss */
            m = Math.floor(f/(b/60));
            s = Math.floor(f%(b/60));
            out += sprintf (":%02d:%02d", m, s);
            break;
        case 36000:     /* dd:mm:ss.s*/
            m = Math.floor(f/(b/60));
            s = Math.floor(f%(b/60));
            out += sprintf (":%02d:%02d.%1d", m, s/10, s%10);
            break;
        case 360000:    /* dd:mm:ss.ss */
            m = Math.floor(f/(b/60));
            s = Math.floor(f%(b/60));
            out += sprintf (":%02d:%02d.%02d", m, s/100, s%100);
            break;
        case 3600000:   /* dd:mm:ss.sss */
            m = Math.floor(f/(b/60));
            s = Math.floor(f%(b/60));
            out += sprintf (":%02d:%02d.%03d", m, s/1000, s%1000);
            break;
        default:
	    out = "Bad sexa format";
        }

        return (out);
}

/* handy function to convert seconds into a brief sensible time string
 */
function sensibleSeconds (secs)
{
        function plural(n, name) {
            return (n + ' ' + name + (n == 1 ? '' : 's'));
        }

        var isneg = false;
        if (secs < 0) {
            isneg = true;
            secs = -secs;
        }

        var d = Math.floor(secs/86400);
        secs -= d*86400;
        var h = Math.floor(secs/3600);
        secs -= h*3600;
        var m = Math.floor(secs/60);
        secs -= m*60;
        var s = Math.floor(secs);

        if (d >= 100)
            var ss = d + " days";
        else if (d >= 1)
            var ss = plural(d,'day') + ' ' + plural(h,'hr');
        else if (h >= 1)
            var ss = plural(h,'hr') + ' ' + plural(m,'min');
        else if (m >= 1)
            var ss = plural(m,'min') + " " +  plural (s,'sec');
        else
            var ss = plural (s,'sec');

        return ((isneg ? "-" : "") + ss);
}


/* parse sexagesimal string s and return as a double.
 * allow separater to be either white space or colon ':'.
 * allow negative sign to precede any component.
 * any absent component is set to 0.
 */
function parseSexa (s)
{
	var isneg = (s.indexOf("-") >= 0);		// note and remove - 
	if (isneg)
	    s = s.replace(/-/,"");
	s = trim(s);					// trim white space
	var c = s.split(/[:\s]+/);			// each component
	var v = 0, p = 1;				// value accumulator, power

	for (var i = 0; i < c.length; i++, p *= 60.0)
	    v += parseFloat(c[i])/p;
	return (isneg ? -v : v);			// ok, now honor neg 
}

/* Given the name of an option select component, return the text associated with 
 * current selection.
 */
function getSelectedText(name) {
	var c = document.getElementById(name);
	return c.options[c.selectedIndex].text;
}

/**
 * Returns a shaded color representing the given INDI state.
 */
function stateStyle(state) {
    var style;
    var text = "#fff";
    var fontsize = "0.9em";
    var height = "height:2em";
    var start = "#999";
    var end = "#666";
    var border = "#000";
    var shadow = "#999";

    if (state == "Ok") {
        start = "#4e4";
        end = "#494";
        border = "#080";
        shadow = end;
    }
    else if (state == "On") {
        start = "#0053D8";
        end = "#002C7A";
        border = "#01b";
        shadow = end;
    }
    else if (state == "Busy") {
        start = "#fe0";
        end = "#f90";
        border = "#f80";
        shadow = end;
    }
    else if (state == "Alert") {
        start = "#e44";
        end = "#944";
        border = "#800";
        shadow = end;
    }

    style = height + ";text-align:center;vertical-align:middle;padding:0.25em;font-size:" + fontsize + ";font-family:sans-serif;"
        + "border:1px solid " + border + ";background:" + end + ";color:" + text + ";text-shadow:1px 1px 1px " + shadow + ";"
        + "background-image:-moz-linear-gradient(top," + start + "," + end + ");"
        + "background-image:-webkit-gradient(linear,left top,left bottom,color-stop(0," + start + "),color-stop(1," + end + "));"
        + "-ms-filter:'progid:DXImageTransform.Microsoft.gradient(startColorStr=" + start + ", EndColorStr=" + end + ")'";

    return style;
}


/*  sprintf.js
 * Copyright (c) 2007-2013 Alexandru Marasteanu <hello at alexei dot ro>
 * BSD license.
 * https://github.com/alexei/sprintf.js
 */

(function(ctx) {
	var sprintf = function() {
		var result;
		// for (i = 1; i <  arguments.length; i++)
		    // arguments[i] = parseFloat(arguments[i]);
		if (!sprintf.cache.hasOwnProperty(arguments[0])) {
			sprintf.cache[arguments[0]] = sprintf.parse(arguments[0]);
		}
		try {
		    result = sprintf.format.call(null, sprintf.cache[arguments[0]], arguments);
		} catch (err) {
		    console.log ("Sprintf(" + sprintf.cache[arguments[0]] + "): " + err);
		    result = "?";
		}
		return result;
	};

	sprintf.format = function(parse_tree, argv) {
		var cursor = 1, tree_length = parse_tree.length, node_type = '', arg, output = [], i, k, match, pad, pad_character, pad_length;
		for (i = 0; i < tree_length; i++) {
			node_type = get_type(parse_tree[i]);
			if (node_type === 'string') {
				output.push(parse_tree[i]);
			}
			else if (node_type === 'array') {
				match = parse_tree[i]; // convenience purposes only
				if (match[2]) { // keyword argument
					arg = argv[cursor];
					for (k = 0; k < match[2].length; k++) {
						if (!arg.hasOwnProperty(match[2][k])) {
							throw(sprintf('[sprintf] property "%s" does not exist', match[2][k]));
						}
						arg = arg[match[2][k]];
					}
				}
				else if (match[1]) { // positional argument (explicit)
					arg = argv[match[1]];
				}
				else { // positional argument (implicit)
					arg = argv[cursor++];
				}

				if (/[^s]/.test(match[8]) && (get_type(arg) != 'number')) {
					throw(sprintf('[sprintf] expecting number but found %s', get_type(arg)));
				}
				switch (match[8]) {
					case 'b': arg = arg.toString(2); break;
					case 'c': arg = String.fromCharCode(arg); break;
					case 'd': arg = parseInt(arg, 10); break;
					case 'e': arg = match[7] ? arg.toExponential(match[7]) : arg.toExponential(); break;
					case 'f': arg = match[7] ? parseFloat(arg).toFixed(match[7]) : parseFloat(arg); break;
					case 'o': arg = arg.toString(8); break;
					case 's': arg = ((arg = String(arg)) && match[7] ? arg.substring(0, match[7]) : arg); break;
					case 'u': arg = arg >>> 0; break;
					case 'x': arg = arg.toString(16); break;
					case 'X': arg = arg.toString(16).toUpperCase(); break;
				}
				arg = (/[def]/.test(match[8]) && match[3] && arg >= 0 ? '+'+ arg : arg);
				pad_character = match[4] ? match[4] == '0' ? '0' : match[4].charAt(1) : ' ';
				pad_length = match[6] - String(arg).length;
				pad = match[6] ? str_repeat(pad_character, pad_length) : '';
				output.push(match[5] ? arg + pad : pad + arg);
			}
		}
		return output.join('');
	};

	sprintf.cache = {};

	sprintf.parse = function(fmt) {
		var _fmt = fmt, match = [], parse_tree = [], arg_names = 0;
		while (_fmt) {
			if ((match = /^[^\x25]+/.exec(_fmt)) !== null) {
				parse_tree.push(match[0]);
			}
			else if ((match = /^\x25{2}/.exec(_fmt)) !== null) {
				parse_tree.push('%');
			}
			else if ((match = /^\x25(?:([1-9]\d*)\$|\(([^\)]+)\))?(\+)?(0|'[^$])?(-)?(\d+)?(?:\.(\d+))?([b-fosuxX])/.exec(_fmt)) !== null) {
				if (match[2]) {
					arg_names |= 1;
					var field_list = [], replacement_field = match[2], field_match = [];
					if ((field_match = /^([a-z_][a-z_\d]*)/i.exec(replacement_field)) !== null) {
						field_list.push(field_match[1]);
						while ((replacement_field = replacement_field.substring(field_match[0].length)) !== '') {
							if ((field_match = /^\.([a-z_][a-z_\d]*)/i.exec(replacement_field)) !== null) {
								field_list.push(field_match[1]);
							}
							else if ((field_match = /^\[(\d+)\]/.exec(replacement_field)) !== null) {
								field_list.push(field_match[1]);
							}
							else {
								throw("[sprintf: " + replacement_field + "] huh?");
							}
						}
					}
					else {
						throw("[sprintf: " + replacement_field + "] huh?");
					}
					match[2] = field_list;
				}
				else {
					arg_names |= 2;
				}
				if (arg_names === 3) {
					throw('[sprintf] mixing positional and named placeholders is not (yet) supported');
				}
				parse_tree.push(match);
			}
			else {
				throw("[sprintf: " + _fmt + "] huh?");
			}
			_fmt = _fmt.substring(match[0].length);
		}
		return parse_tree;
	};

	var vsprintf = function(fmt, argv, _argv) {
		_argv = argv.slice(0);
		_argv.splice(0, 0, fmt);
		return sprintf.apply(null, _argv);
	};

	/**
	 * helpers
	 */
	function get_type(variable) {
		return Object.prototype.toString.call(variable).slice(8, -1).toLowerCase();
	}

	function str_repeat(input, multiplier) {
		for (var output = []; multiplier > 0; output[--multiplier] = input) {/* do nothing */}
		return output.join('');
	}

	/**
	 * export to either browser or node.js
	 */
	ctx.sprintf = sprintf;
	ctx.vsprintf = vsprintf;
})(typeof exports != "undefined" ? exports : window);

/* given min and max and an approximate number of divisions desired,
 * fill in ticks[] with nicely spaced values and return how many.
 * N.B. return value, and hence number of entries to ticks[], might be as
 *   much as 2 more than numdiv.
 */
function tickmarks (min, max, numdiv, ticks)
{
	function log10(v) { return Math.log(v) / Math.log(10.0); }
        var n, factor = [1, 2, 5];

        if (typeof min === "string")
            min = parseFloat(min);
        if (typeof max === "string")
            max = parseFloat(max);

	if (min == max) {
	    min -= 0.5;
	    max += 0.5;
	}

        var minscale = Math.abs(max - min);
        var delta = minscale/numdiv;
        for (n = 0; n < 3; n++) {
            var scale;
            var x = delta/factor[n];
            if ((scale = (Math.pow(10.0, Math.ceil(log10(x)))*factor[n])) < minscale)
                minscale = scale;
        }
        delta = minscale;

        var lo = Math.floor(min/delta);
        for (n = 0; (v = delta*(lo+n)) < max+delta; )
            ticks[n++] = v;

        return (n);
}


// draw str in box with given fg and bkg colors
function textbox (ctx, str, x, y, w, h, fg, bkg) {
	ctx.save();

	ctx.strokeStyle = fg;
	ctx.fillStyle = bkg;
	ctx.beginPath();
	    ctx.moveTo (x, y);
	    ctx.lineTo (x+w, y);
	    ctx.lineTo (x+w, y+h);
	    ctx.lineTo (x, y+h);
	    ctx.closePath();
	ctx.stroke();
	ctx.fill();
	ctx.textBaseline = "middle";
	var sw = ctx.measureText(str).width;
	ctx.fillStyle = fg;
	ctx.fillText (str, x+(w-sw)/2, y+h/2);

	ctx.restore();
}
