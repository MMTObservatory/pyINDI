INDIPERM_RO = "ro";
INDIPERM_WO = "wo";
INDIPERM_RW = "rw";

INDISTATE_IDLE = "Idle";
INDISTATE_OK = "Ok";
INDISTATE_BUSY = "Busy";
INDISTATE_ALERT = "Alert";

INDISWRULE_1OFMANY = "OneOfMany";
INDISWRULE_ATMOST1 = "AtMostOne";
INDISWRULE_NOFMANY = "AnyofMany";


CONFIG ={
	NUM_SIZE:null,
	SHOW_SWITCH_ICON:null
	

}


/*********************
* formatNumber
* Args: numStr=>the number as a string
*		fstr=> the INDI format string
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

function formatNumber(numStr, fstr)
{
	num = parseFloat(numStr);
	var outstr;
	var total = parseInt( fstr.slice(0, fstr.length-1).split('.')[0] );
	var decimal = parseInt( fstr.slice(0, fstr.length-1).split('.')[1] );
	switch(fstr[fstr.length-1])
	{
		case 'f':
			if(isNaN(decimal))
				outStr = numStr
			else
				outStr = num.toFixed(decimal);
			
		break;
		case 'i':
			outStr = String( Math.round(num) )
		break;
		default:
			outStr = numStr
	}
	return outStr;
}

function nosp(str)
{
	return str.replace(/ /g, '_').replace('.', '__');
}


/************************************************************
* AddDevice
* args 
*	devname-> indi device name, 
*	container-> the jquery selector string of the containing element
*	tabdevice -> boolean value if true use jquery tabs to seperate
*		devices if not but them in divs
*
*
* Description:
*	When a new device is sent from the INDI driver add it to the 
* 	webpage either using jquery tabs or simply putting eache device
*	in its own div. 
*
************************************************************/
function AddDevice(devname, container, tabdevice)
{
	var devselector = "div.INDIdevice#"+nosp(devname);
	container = (container==undefined)? 'body':container;
	var uler = "ul";

	if($(container).find(uler).length == 0)
	{
		$("<ul/>" ).appendTo(container) 
	}
	if( $(container).find( devselector ).length == 0 ) 
	{
		if(tabdevice)
		{
			var ul = $(container).find(uler);
			$("<li><a href='#"+nosp(devname)+"'>"+devname+"</a></li>").appendTo( ul );
			$("<div/>", {id:nosp(devname)}).addClass("INDIdevice").appendTo( container );
		
			$(container).tabs();
		}
	}
	if (tabdevice)
		$(container).tabs("refresh")
	return devselector;
		
}

/***********************************************************
* newText 
* Args INDIvp-> object defining the INDI vector propert, 
*		appendTo -> jquery selector for which elemebt to 
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

function newText( INDIvp, appendTo )
{
	var nosp_vpname = INDIvp.name.replace( " ", "_" );
	var vpselector = "fieldset.INDItvp#"+nosp_vpname+"[device='"+INDIvp.device+"']";
	var nosp_dev = INDIvp.device.replace( " ", "_" );
	var retn;
	if( $(vpselector).length == 0 )
	{
		var vphtmldef = $("<fieldset class='INDIvp INDItvp'></fieldset>")
			.prop("id", nosp_vpname)
			.attr("device", INDIvp.device)
			.attr("group", INDIvp.group)
			.append("<legend>"+INDIvp.label+"</legend>");
		
		$.each(INDIvp.values, function(ii, tp)
		{	
			var label = tp.label.replace(" ", "_");
			var name = tp.name.replace(' ', '_');
			var tpid = nosp_dev+"__"+name;
	
			vphtmldef.append($('<span/>',
			{
				'id': name,
				'class': 'ITextspan',
				'INDIlabel':tp.label,
				'INDIname':tp.name,
			}
			).append($('<label/>',
			{
				'text':	tp.label,
				'for': tpid	
			})
			).append( function()
			{
				var ro = $('<textarea rows=1 readonly/>').addClass('IText_ro').text(tp.text)
				var wo = $('<textarea rows=1/>').addClass('IText_wo')
				.keypress(function(event)
				{
					if(event.which == 13)	
					{		
						let val = $(event.target).prop("value")
						setindi("Text", INDIvp.device+'.'+INDIvp.name, tp.name, val );

						return false;
					}
				})
				switch(INDIvp.perm)
				{
					case INDIPERM_RO:
							$(this).append(ro);
					break;
					case INDIPERM_RW:
							$(this).append(ro).append(wo);
					break;
					case INDIPERM_WO:
							
							$(this).append(wo);
					break;

				}
			}
			))
		});
		if(appendTo != undefined)
		{
			vphtmldef.appendTo(appendTo);
		}
		return vphtmldef
	}
	
	$.each(INDIvp.values, function(ii, tp)
	{
		
		var name = nosp(tp.name);
		var tpid = nosp_dev+name;
		$(vpselector).find("span[INDIname='"+tp.name+"'] textarea.IText_ro").text(tp.value)
	});

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

function newNumber(INDIvp, appendTo)
{
	var nosp_vpname = INDIvp.name.replace( " ", "_" );
	var vpselector = "fieldset.INDInvp#"+nosp_vpname+"[device='"+INDIvp.device+"']";
	var nosp_dev = INDIvp.device.replace( " ", "_" );
	var retn;
	//we need to create the html
	if( $(vpselector).length == 0 )
	{
		var vphtmldef = $("<fieldset class='INDIvp INDInvp'></fieldset>")
			.prop("id", nosp_vpname)
			.attr("device", INDIvp.device)
			.attr("group", INDIvp.group)
			.append("<legend>"+INDIvp.label+"</legend>");
		
			
		$.each(INDIvp.values, function(ii, np)
		{	

			var label = np.label.replace(" ", "_");
			var name = np.name.replace(' ', '_');
			var npid = nosp_dev+"__"+name;
	
			vphtmldef.append($('<span/>',
			{
				'id': name,
				'class': 'INumberspan',
				'INDIlabel':np.label,
				'INDIname':np.name,
				'INDIformat':np.format
			}
			).append($('<label/>',
			{
				'text':	np.label,
				'for': npid	
			})
			).append( function()
			{
				var re = /%(\d+)\.(\d+)[fm]/
				try
				{
					var numinfo = re.exec(np.format);
					var len = parseInt(numinfo[1]);
				}
				catch(err)
				{
					var len = 5;
				}
				if(CONFIG["NUM_SIZE"] != null)
				{
					len=CONFIG["NUM_SIZE"];
				}
				var ro = $('<span/>', {'class':'INumber_ro'}).css({ width:10*len+'px' })
				var wo = $("<input/>", {'type':'text', 'class':'INumber_wo'}).prop('size',len)
				.attr("value", np.value )
				.keypress(function(event)
				{
					
					if(event.which == 13)	
					{
						let val = $(event.target).val()
						setindi("Number", INDIvp.device+'.'+INDIvp.name, np.name, val );
					}
				})
				switch(INDIvp.perm)
				{
					case INDIPERM_RO:
							$(this).append(ro);
					break;
					case INDIPERM_RW:
							$(this).append(ro).append(wo);
					break;
					case INDIPERM_WO:
							
							$(this).append(wo);
					break;

				}
			}
			))
		});
		if(appendTo != undefined)
		{
			vphtmldef.appendTo(appendTo);
			return vpselector;
		}
		return vphtmldef
	}
	
	$.each( INDIvp.values, function(ii, np)
	{
		
		var format = $(vpselector).find("span.INumberspan[INDIname='"+np.name+"']").attr("indiformat")
		var name = np.name.replace(' ', '_');
		var npid = nosp_dev+name;
		newvalue= formatNumber(np.value, format)
		//$(vpselector).find("span.INumberspan[INDIname='"+np.name+"']  span.INumber_ro").text(Math.round(np.value*10000)/10000)
		$(vpselector).find("span.INumberspan[INDIname='"+np.name+"']  span.INumber_ro").text(newvalue)

	});
	// return the jquery selector
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
	switch(INDIvp.rule)
	{
		case INDISWRULE_1OFMANY:
		case INDISWRULE_ATMOST1:
			type = 'radio'
		break;
		case INDISWRULE_NOFMANY:
			type = 'checkbox';
		break;
		default:
            //console.log("Error unkown SVP rule"+INDIvp.rule);
			type = 'radio'
	}
	
	if( $(vpselector).length == 0 )
	{
		
		var vphtmldef = $( "<fieldset class='INDIvp INDIsvp'/>" )
			.prop("id", nosp_vpname)
			.attr("device", INDIvp.device)
			.attr("group", INDIvp.group)
			.append("<legend>"+INDIvp.label+"</legend>");
		
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
					'class'			:"ISwitchspan",
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
                    console.log($(event.target).prop("checked"))

					setindi("Switch", INDIvp.device+'.'+INDIvp.name, name, value);

                   
					
				} )
			));
			
		});
		icon=true;
		if(CONFIG["SHOW_SWITCH_ICON"] != null)
		{
			var icon = CONFIG["SHOW_SWITCH_ICON"]
		}
		vphtmldef.find( "input[type='"+type+"']" ).checkboxradio({icon:icon});

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
            console.log("setting "+sp.name +"to " +sp.value)
			state = sp.value === "On" ? true: false


			$(vpselector).find('input.ISwitchinput#'+spid).prop('checked', state);
			//console.log($("body fieldset.INDIsvp#"+nosp_vpname+"[device='"+INDIvp.device+"']"))
		});
		
	}
	$(vpselector).find("input[type='"+type+"']").checkboxradio("refresh");
	return vpselector;
}


/*********************************************************
* newLight
* Args INDIvp-> object defining the INDI vector propert, 
*       appendTo -> jquery selector for which elemebt to 
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
            .append("<legend>"+INDIvp.label+"</legend>");

        $.each(INDIvp.values, function(ii, lp)
        {       
            var label = lp.label.replace(" ", "_");
            var name = lp.name.replace(' ', '_');
            var lpid = nosp_dev+"__"+name;
            var lpname = nosp_dev+'__'+nosp_vpname;
            var scolor = "transparent";
            switch(lp.value)
            {
                case INDISTATE_IDLE:
                    lightclass = "var( --indistate-idle )";
                break;
                case INDISTATE_OK: 
                    lightclass = "var( --indistate-ok )'";
                break;
                case INDISTATE_BUSY:
                    lightclass = "var( --indistate-busy )";
                break;
                case INDISTATE_ALERT:
                    lightclass = "var( --indistate-alert )";
                break;
            }
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
	    switch(lp.value)
            {
                case INDISTATE_IDLE:
                    lightclass = "var( --indistate-idle )";
                break;
                case INDISTATE_OK:
                    lightclass = "var( --indistate-ok )";
                break;
                case INDISTATE_BUSY:
                    lightclass = "var( --indistate-busy )";
                break;
                case INDISTATE_ALERT:
                    lightclass = "var( --indistate-alert )";
                break;
                default:
                    lightclass = "var( --indistate-alert )";

            }
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
	console.log(event.target);
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
			"name":$(sp).closest( "span.ISwitchspan" ).attr( "INDIname" ),
			"label":$(sp).closest( "span.ISwitchspan" ).attr( "INDIlabel" ),
			"state":$(sp).closest( "span.ISwitchspan" ).find("input.ISwitchinput").prop( "checked" ),
			
		})
	})
	//INDIws.send(JSON.stringify(out));
    console.log("Sending "+out.newSwitch.sp["name"]+" to "+ out.newSwitch.sp["state"])
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
	fn.find("span.INumberspan input.INumber_wo").each(function(ii, np)
	{	
		out.newNumber.np.push(
		{
			"name":$(np).closest('span.INumberspan').attr("INDIname"),
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
			"name":$(IText).closest("span.ITextspan").attr("INDIname"),
			"label":$(IText).closest("span.ITextspan").attr("INDIlabel"),
			"text":IText.prop("value"),

		});

	}); 
	INDIws.send(JSON.stringify(out));
}


function indistate2css(INDIvp_state)
{
	switch(INDIvp_state)
	{

		case( INDISTATE_IDLE ):
			retn = 'var( --indistate-idle )'
		break;
		case( INDISTATE_OK ):
			retn = 'var( --indistate-ok )'
		break;
		case( INDISTATE_BUSY ):
			retn = 'var( --indistate-busy )'
		break;
		case( INDISTATE_ALERT ):
			retn = 'var( --indistate-alert )'
		break;
		default:
			throw("Unkown State error " + INDIvp_state + " Should be " + INDISTATE_IDLE + ", " +  INDISTATE_OK + ", " +INDISTATE_BUSY + "or " + INDISTATE_ALERTa + "not " + INDIvp_state  );
	
	}
	return retn;

}


