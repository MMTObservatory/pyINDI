const INDIPERM_RO = "ro";
const INDIPERM_WO = "wo";
const INDIPERM_RW = "rw";

const INDISTATES = {
	"Idle": "var(--indistate-idle)",
	"Ok": "var(--indistate-ok)",
	"Busy": "var(--indistate-busy)",
	"Alert": "var(--indistate-alert)",
	"Unknown": "var(--indistate-unknown)"
};

const INDISWRULES = {
	"OneOfMany": "radio",
	"AtMostOne": "radio",
	"AnyofMany": "checkbox"
}

const CONFIG ={
	NUM_SIZE:null,
	SHOW_SWITCH_ICON:null
}

/*********************
* formatNumber
* Args: numStr=>the number as a string
*		fStr=> the INDI format string
*
* Description:
*		Format the floating point INDI numbers
* but don't mess with the sexagesimal
* stuff. weh shall let the INDI client
* do that. In fact we should probably
* let the client do the floating point stuff 
* too. 
*
**********************/
function formatNumber(numStr, fStr)
{
	num = parseFloat(numStr);
	console.debug(`[formatNumber] numStr=${numStr} fStr=${fStr}`)
	var outstr;
	var decimal = parseInt(fStr.slice(0, fStr.length-1).split('.')[1] );
	switch (fStr[fStr.length-1]) {
		case 'f':
			outStr = isNaN(decimal) ? numStr : String(num.toFixed(decimal));
			break;
		case 'i':
			outStr = String(Math.round(num))
			break;
		default:
			outStr = numStr
	}
	return outStr;
}

const nosp = (str) => {
	// Replaces spaces with _ and . with __
	return str.replace(/ /g, '_');
}

const nospperiod = (str) => {
	return nosp(str).replace('.', '__');
}

/***********************************************************
* newText 
* Args INDIvp-> object defining the INDI vector propert, 
*		appendTo -> jquery selector for which element to 
*		append the INDivp turned HTML element to.
*
* Desription:
*	Called when the websocket from the indi webclient
*	generates or updates an INDI text. If this a 
*	a never brefore seen INDI text HTML fieldset
*	element is created with the correct value otherwise
*	the element's text is updated. 
*
*
* Returns: a jquery type selector string. 
*
*********************************************************/

const buildFieldset = (INDIvp) => {
	/* Builds the default fieldset for indi vector property. Returns new fieldset*/
	var fieldset = document.createElement("fieldset");

	fieldset.classList.add("INDIvp", `INDI${INDIvp.metainfo}`); // Get class meta
	fieldset.id = nosp(INDIvp.name);
	fieldset.setAttribute("device", INDIvp.device); // FIXME Removed data-
	fieldset.setAttribute("group", INDIvp.group); // FIXME Removed data-

	// Create legend for fieldset
	var legend = document.createElement("legend");

	// Create span led in legend for indistate
	var led = document.createElement("span");
	led.classList.add("led");
	
	// Create text node for legend to not overwrite the led span
	var text = document.createTextNode(INDIvp.label);

	// Build fieldset by appending all
	legend.appendChild(led);
	legend.appendChild(text);
	fieldset.appendChild(legend);

	return fieldset
};

const buildNewNumbers = (INDIvp, vphtmldef) => {
	/* Builds the new indi number */
	INDIvp.values.forEach((np) => {
		// Create div that the indi text row will exist
		var div = document.createElement("div");

		div.id = nosp(np.name);
		div.setAttribute("INDIlabel", np.label); // FIXME Removed data-
		div.setAttribute("INDIname", np.name); // FIXME Removed data-
		div.setAttribute("INDIformat", np.format); // TODO Add data-
		div.classList.add("INumber_div");

		// Create label for indi text row
		var label = document.createElement("label");

		label.textContent = np.label;
		label.classList.add("INumber_label");
		label.htmlFor = `${nosp(INDIvp.device)}__${nosp(np.name)}`;

		div.appendChild(label);

		// Formatting length of numbers
		/* NOT IN USE
		var re = /%(\d+)\.(\d+)[fm]/
		try {
			var numinfo = re.exec(np.format);
			var len = parseInt(numinfo[1]);
		}
		catch (err) {
			var len = 10;
		} 
		*/
		
		// Build ro and wo
		var ro = document.createElement("label");

		ro.classList.add("INumber_ro");
		
		var wo = document.createElement("input");
		wo.classList.add("INumber_wo")
		//wo.id = `nosp(INDIvp.device)__${nosp(INDIvp.name)}`;
		wo.textContent = np.value;

		// If "Enter" is pressed on writeonly area, send new text to indi
		wo.addEventListener("keyup", (event) => {
			if (event.key === "Enter") {
				event.preventDefault() // TODO Test if needed
				let value = event.target.value;
				setindi("Number", `${INDIvp.device}.${INDIvp.name}`, np.name, value);
			}
		});
		// Determine if it is readonly, writeonly, or both and append
		switch (INDIvp.perm) {
			case INDIPERM_RO:
				div.appendChild(ro);
				break;
			case INDIPERM_RW:
				div.appendChild(ro);
				div.appendChild(wo);
				break;
			case INDIPERM_WO:
				div.appendChild(wo);
				break;
			default:
		}
		// Append the div to the fieldset
		vphtmldef.appendChild(div);

	});
	return vphtmldef;
};

const buildNewTexts = (INDIvp, vphtmldef) => {
	/* Builds the new indi text */
	INDIvp.values.forEach((tp) => {
		console.warn(tp);
		// Create div that the indi text row will exist
		var div = document.createElement("div");

		div.id = nosp(tp.name);
		div.setAttribute("INDIlabel", tp.label); // FIXME Removed data-
		div.setAttribute("INDIname", tp.name); // FIXME Removed data-
		div.classList.add("IText_div");

		// Create label for indi text row
		var label = document.createElement("label");

		label.textContent = tp.label;
		label.classList.add("IText_label");
		label.htmlFor = `${nosp(INDIvp.device)}__${nosp(tp.name)}`;

		div.appendChild(label);

		// Build ro and wo
		var ro = document.createElement("textarea");
		
		ro.rows = 1;
		ro.readOnly = true;
		ro.classList.add("IText_ro");
		ro.textContent = tp.value;

		var wo = document.createElement("textarea");
		wo.rows = 1;
		wo.classList.add("IText_wo");

		// If "Enter" is pressed on writeonly area, send new text to indi
		wo.addEventListener("keyup", (event) => {
			if (event.key === "Enter") {
				event.preventDefault() // TODO Test if needed
				let value = event.target.value;
				setindi("Text", `${INDIvp.device}.${INDIvp.name}`, tp.name, value);
			}
		});

		wo.addEventListener("keydown", (event) => {
			if (event.key === "Enter") {
				event.preventDefault();
			}
		})

		// Determine if it is readonly, writeonly, or both and append
		switch (INDIvp.perm) {
			case INDIPERM_RO:
				div.appendChild(ro);
				break;
			case INDIPERM_RW:
				div.appendChild(ro);
				div.appendChild(wo);
				break;
			case INDIPERM_WO:
				div.appendChild(wo);
				break;
			default:
		}

		// Append the div to the fieldset
		vphtmldef.appendChild(div);

	});
	return vphtmldef;
};

const newText = (INDIvp, appendTo) => {
	/*  */
	var vpselector = `fieldset.INDItvp#${nosp(INDIvp.name)}[device="${INDIvp.device}"]`;
	
	// If the vpselector is empty, build
	if (!document.querySelector(vpselector)) {
		var vphtmldef = buildFieldset(INDIvp);
		vphtmldef = buildNewTexts(INDIvp, vphtmldef);

		// Need to figure out how to replace jquery selector for the fieldset
		if (appendTo != undefined) {
			$(vphtmldef).appendTo(appendTo); // TODO Remove jquery
		}

		return $(vphtmldef); // TODO Remove jquery
	}
	
	// Update values from indi
	INDIvp.values.forEach((tp) => {
		var tpselector = `div.IText_div[INDIname="${tp.name}"] textarea.IText_ro`;
		var ro = document.querySelector(`${vpselector} ${tpselector}`);

		ro.textContent = tp.value;
	})

	return vpselector 
}

/***********************************************************
* newNumber 
* Args INDIvp-> object defining the INDI vector propert, 
*		appendTo -> jquery selector for which elemebt to 
*		append the INDivp turned HTML element to.
*
* Desription:
*	Called when the websocket from the indi webclient
*	generates or updates an INDI number. If this a 
*	a never brefore seen INDI number, an HTML fieldset
*	element is created with the correct value otherwise
*	the element's number is updated. 
*
*
* Returns: a jquery type selector string. 
*
*********************************************************/

function newNumber(INDIvp, appendTo) {
	/*  */
	var vpselector = `fieldset.INDInvp#${nosp(INDIvp.name)}[device="${INDIvp.device}"]`;

	// If the vpselector is empty, build
	if (!document.querySelector(vpselector)) {
		var vphtmldef = buildFieldset(INDIvp);
		vphtmldef = buildNewNumbers(INDIvp, vphtmldef);
		
		if(appendTo != undefined)
		{
			$(vphtmldef).appendTo(appendTo);
		}
		return $(vphtmldef)
	}
	
	// Update values from indi
	INDIvp.values.forEach((np) => {
		var formatselector = document.querySelector(`div[INDIname="${np.name}"]`);
		var format = formatselector.getAttribute("indiformat");
		var npselector = `div.INumber_div[INDIname="${np.name}"] label.INumber_ro`;
		var value = formatNumber(np.value, format);
		
		var ro = document.querySelector(`${vpselector} ${npselector}`)
		ro.textContent = value;
	})

	// Return string since already exists
	return vpselector
}
/*end newNumber*/




/***********************************************************
* newSwitch 
* Args INDIvp-> object defining the INDI vector propert, 
*		appendTo -> jquery selector for which elemebt to 
*		append the INDivp turned HTML element to.
*
* Desription:
*	Called when the websocket from the indi webclient
*	generates or updates an INDI switch. If this a 
*	a never brefore seen INDI switch HTML fieldset
*	element is created with the correct value otherwise
*	the element's switch is updated. 
*
*
* Returns: a jquery type selector string. 
*
*********************************************************/

function newSwitch( INDIvp, appendTo )
{
	var nosp_vpname = INDIvp.name.replace( " ", "_" );
	var nosp_dev = INDIvp.device.replace( " ", "_" );
	var vpselector = "fieldset.INDIvp#"+nosp_vpname+"[device='"+INDIvp.device+"']";
	
	var retn = $(vpselector);
	var type = indisw2selector(INDIvp.rule);

	if( $(vpselector).length == 0 )
	{
		
		var vphtmldef = $( "<fieldset class='INDIvp INDIsvp'/>" )
			.prop("id", nosp_vpname)
			.attr("device", INDIvp.device)
			.attr("group", INDIvp.group)
			.append("<legend><span class='led'></span>"+INDIvp.label+"</legend>");
		
		$.each(INDIvp.values, function(ii, sp)
		{		
			var label = sp.label.replace(" ", "_");
			var name = sp.name.replace(' ', '_');
			var spid = nosp_dev+"__"+nosp_vpname+"__"+name;
			var spname = nosp_dev+'__'+nosp_vpname
			vphtmldef.append
			(
				$('<span/>',
				{	
					'INDIname'	:sp.name,
					'class'			:"ISwitch_span",
					'id'				:name,
				})
				.append($('<label/>', 
				{
					'id'				:name,
					'class'			:'ISwitchlabel',
					'for'				:spid,
					'text'			:sp.label

				})).append(
				$('<input/>',
				{
					'type'		:type,
					'id'			:spid,
					'name'		:nosp_vpname,
					'device'	:nosp_dev,
					'vector'	:INDIvp.name,
					'class'		:'ISwitchinput',
                    'value'     :name,
                    'indiname'  :name,
                    'checked'   : sp.value == "On" ? true:false
                    
				}
				)
				.prop( "checked", sp.state )
				.on( 'change', function(event) {
					let name = $(event.target).val();
                    
					let value =$(event.target).prop("checked") ? "On" : "Off";

					setindi("Switch", INDIvp.device+'.'+INDIvp.name, name, value);

                   
					
				} )
			));
			
		});

		
		icon=false; // Was true
		if(CONFIG["SHOW_SWITCH_ICON"] != null)
		{
			var icon = CONFIG["SHOW_SWITCH_ICON"]
		}
		vphtmldef.find( "input[type='"+type+"']" ).checkboxradio();
		
		if( appendTo != undefined )
		{
			vphtmldef.appendTo( appendTo );
			return vpselector;
		}
		return vphtmldef;
	}

	else
	{
		
		$.each(INDIvp.values, function(ii, sp)
		{   
			//var label = sp.label.replace(" ", "_");
			var name = sp.name.replace(' ', '_');
			var spid = nosp_dev +"__"+ nosp_vpname+"__"+name;
            //console.log("setting "+sp.name +"to " +sp.value)
			state = sp.value === "On" ? true: false


			$(vpselector).find('input.ISwitchinput#'+spid).prop('checked', state);
			//console.log($("body fieldset.INDIsvp#"+nosp_vpname+"[device='"+INDIvp.device+"']"))
		});
		
	}
	$(vpselector).find("input[type='"+type+"']").checkboxradio("refresh");
	return vpselector;
}

/*********************************************************
* newGroup
* Args INDIvp-> object defining the INDI vector propert,
*       appendTo -> jquery selector for which element to
*       append the INDivp turned HTML element to.
*
* Desription:
*   
*
*
* Returns:
*
*********************************************************/

const newGroup = (INDIvp) => {
	// Basically works like this, if we need to append we return
	// jquery selector, if not empty then return string
	// We dont append stuff to strings

	// Need to see if the group exists
	// If not, make it and append to section
	// If so, return group to append to
	var nosp_vpgroup = INDIvp.group.replace(" ", "_").toUpperCase();
	var nosp_device = INDIvp.device.replace(" ", "_");
	var vpgroupselector = "div.INDIgroup[group='" + INDIvp.group + "']";
	var vpgroup = $(vpgroupselector);

	if (vpgroup.length == 0) {
		console.log(`Creating new group: ${nosp_vpgroup}`);
		// Doesn't exists, build and add attributes and classes
		var vpgroupdef = $("<div class='INDIgroup'/>")
			.attr("device", INDIvp.device)
			.prop("id", nosp_vpgroup)
			.attr("group", INDIvp.group);
		
			// Build title
			// Build hide/show
			vpgroupdef.append
			(
				$('<span/>',
					{
						'text': INDIvp.group,
						'class': "IGroup_header"
					})
			)

		// Append to the main section
		// TODO determine what we want the main gui to be in
		// Dashboard?
		//vpgroupdef.appendTo($("section#" + nosp_device));
		vpgroupdef.appendTo($("section"));
		return vpgroupdef;
	}

	else {
		console.debug(`Group already exists: ${nosp_vpgroup}`);
		return vpgroup;
	}

}

const newDevice = (INDIvp) => {
	var vpdeviceselector = "section.INDIdevice[device='" + INDIvp.device + "']";
	var nosp_device = INDIvp.device.replace(" ", "_");
	var vpdevice = $(vpdeviceselector);

	if (vpdevice.length == 0) {
		console.log(`Creating new device: ${nosp_device}`);
		// Doesn't exist, build the section and add attributes and classes
		var vpdevicedef = $("<section class='INDIdevice'/>")
			.attr("device", INDIvp.device)
			.prop("id", nosp_device);
		
		vpdevicedef.append(
			$('<span/>',
				{
					"text": INDIvp.device,
					"class": "IDevice_header"
				})
		);

		// Append to body
		vpdevicedef.appendTo($("body"));
		return vpdevicedef;

	}
	else {
		console.debug(`Device already exists: ${nosp_device}`)
		return vpdevice;
	}
}
/*********************************************************
* newLight
* Args INDIvp-> object defining the INDI vector propert, 
*       appendTo -> jquery selector for which element to 
*       append the INDivp turned HTML element to.
*
* Desription:
*   Called when the websocket from the indi webclient
*   generates or updates an INDI switch. If this a 
*   a never brefore seen INDI switch HTML fieldset
*   element is created with the correct value otherwise
*   the element's switch is updated. 
*
*
* Returns: a jquery type selector string. 
*
*********************************************************/
function newLight( INDIvp, appendTo )
{
    var nosp_vpname = INDIvp.name.replace( " ", "_" );
    var nosp_dev = INDIvp.device.replace( " ", "_" );
    var vpselector = "fieldset.INDIvp#"+nosp_vpname+"[device='"+INDIvp.device+"']";


    var retn = $(vpselector);
    type = 'checkbox'

    if( $(vpselector).length == 0 )
    {

        var vphtmldef = $( "<fieldset class='INDIvp INDIlvp'/>" )
            .prop("id", nosp_vpname)
            .attr("device", INDIvp.device)
            .attr("group", INDIvp.group)
            .append("<legend><span class='led'></span>"+INDIvp.label+"</legend>");

        $.each(INDIvp.values, function(ii, lp)
        {       
            var label = lp.label.replace(" ", "_");
            var name = lp.name.replace(' ', '_');
            var lpid = nosp_dev+"__"+name;
            var lpname = nosp_dev+'__'+nosp_vpname;
            var scolor = "transparent";
						var lightclass = indistate2css(lp.value);
            
            vphtmldef.append
            (
                $('<span/>',
                {
                    'INDIlabel' :lp.label,
                    'INDIname'  :lp.name,
                    'class'         :"ILightspan",
                    'id'                :name,
                })
                .append($('<label/>',
                {
                    'id'                :name,
                    'class'         :'ILightlabel',
                    'id'               :lpid,
                    'text'          :lp.label,
					'style'		:	"background-color:"+lightclass

                })));
           
        });

        vphtmldef.find( "input[type='"+type+"']" ).checkboxradio();

        if( appendTo != undefined )
        {
            vphtmldef.appendTo( appendTo );
            return vpselector;
          
        }

        return vphtmldef;
    }

    else
    {
        $.each(INDIvp.values, function(ii, lp)
        {
            var name = lp.name.replace(' ', '_');
            var lpid = nosp_dev +"__"+ name;
            var state = lp.state
						var lightclass = indistate2css(lp.value);
	    
            $(vpselector).find('label#'+lpid+'.ILightlabel').css("background-color", lightclass);

        });
    }
    $(vpselector).find("input[type='"+type+"']").checkboxradio("refresh");
    return vpselector;
}  

/*******************************************************************************
* sendNewSwitch
* args: event-> the javascript event that caused the function to be called (normally a click)
*
* Description:
*	This function is called by an html event. The changed state of the indi switch
* 	is then sent over the websocket to the webclient to update the indi driver. 
*
*
*
*
*
*
*
*
*
*******************************************************************************/
function sendNewSwitch(event)
{
	var fs = $(event.target).closest(".INDIsvp")
	//console.log(event.target);
	var out = {
		"task":"updateSwitch",
		"newSwitch":{
		"device":fs.attr('device'),
		"group":fs.attr('group'),
		"name":fs.prop('id'),
		"sp":[]//{"name":$(event.target).attr("INDIname"),"state":$(event.target).prop("checked")},
		}
	};
	fs.find("input.ISwitchinput").each(function(ii, sp)
	{
		out.newSwitch.sp.push({
			"name":$(sp).closest( "span.ISwitch_span" ).attr( "INDIname" ),
			"label":$(sp).closest( "span.ISwitch_span" ).attr( "INDIlabel" ),
			"state":$(sp).closest( "span.ISwitch_span" ).find("input.ISwitchinput").prop( "checked" ),
			
		})
	})
	//INDIws.send(JSON.stringify(out));
    //console.log("Sending "+out.newSwitch.sp["name"]+" to "+ out.newSwitch.sp["state"])
    setindi("Switch", out.device+'.'+out.name, out.newSwitch.sp["name"], out.newSwitch.sp["state"])
	
	
}


/*******************************************************************************
* sendNewNumber
* args: event-> the javascript event that caused the function to be called (normally a return key)
*
* Description:
*	This function is called by an html event. The changed state of the indi number
* 	is then sent over the websocket to the webclient to update the indi driver. 
*
*
*
*******************************************************************************/

function sendNewNumber(event)
{
	var fn = $(event.target).parent().parent(".INDInvp");
	var INumber = $(event.target)
	var out = {
		"task":"updateNumber",
		"newNumber":{
		"device":fn.attr('device'),
		"group":fn.attr('group'),
		"name":fn.prop('id'),
		"np":[],
		}
	};
	fn.find("div.INumber_div input.INumber_wo").each(function(ii, np)
	{	
		out.newNumber.np.push(
		{
			"name":$(np).closest('div.INumber_div').attr("INDIname"),
			"label":$(np).parent().attr("INDIlabel"),
			"value": $(np).prop("value") 
			
		});
	});
	INDIws.send(JSON.stringify(out));
}



/*******************************************************************************
* sendNewText
* args: event-> the javascript event that caused the function to be called (normally a return key)
*
* Description:
*	This function is called by an html event. The changed state of the indi text
* 	is then sent over the websocket to the webclient to update the indi driver. 
*
*
*
*******************************************************************************/

function sendNewText(event)
{
	var ft = $(event.target).closest(".INDItvp");
	var IText = $(event.target);
	var out = {
		"task":"updateText",
		"newText":{
		"device":ft.attr('device'),
		"group":ft.attr('group'),
		"name":ft.prop('id'),
		"tp":[],
		}
	};

	ft.find("textarea.IText_wo").each(function( ii, tp ) 
	{
		out.newText.tp.push(
		{
			"name":$(IText).closest("div.IText_div").attr("INDIname"),
			"label":$(IText).closest("div.IText_div").attr("INDIlabel"),
			"text":IText.prop("value"),

		});

	}); 
	INDIws.send(JSON.stringify(out));
}

const indistate2css = (INDIvp_state) => {
	/* Converts indi state to styling for alerts */
	var state = INDISTATES["Unknown"] // Default return
	if (INDISTATES.hasOwnProperty(INDIvp_state)) {
		state = INDISTATES[INDIvp_state];
	}
	else {
		console.warn(`${INDIvp_state} is not valid INDI state, should be ${Object.keys(INDISTATES)}`);
	}
	
	return state
}

const indisw2selector = (INDIvp_rule) => {
	/* Converts indi switches to selector type */
	var sw = "radio"; // Default return
	if (INDISWRULES.hasOwnProperty(INDIvp_rule)) {
		sw = INDISWRULES[INDIvp_rule];
	}
	else {
		console.warn(`${INDIvp_rule} is not valid INDI rule, should be ${Object.keys(INDISWRULES)}`);
	}

	return sw
}
