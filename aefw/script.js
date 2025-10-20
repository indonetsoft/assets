/*
HOW TO USE
Base64.encode('string');
Base64.decode('string_encrypt');
*/
function Benc(str,loop){for(x=0;x<=loop;x++){str=Base64.encode(str);}return str;}

/*
HOW TO USE
MD5('string');
*/
function Menc(str,loop){for(x=0;x<=loop;x++){str=MD5(str);}return str;}

// BEGIN AEFW
function showNoticeIxpr(stringMessage, _sticky) {
	_sticky = (typeof(_sticky)==="undefined") ? false : _sticky ;
	if( typeof(UIkit)==='undefined' ) alert('UIkit not found');
	if( typeof(UIkit.notification)==='undefined' ) alert('UIkit not found for notification');
	if( typeof(UIkit.notification)!=='undefined' ) {
		UIkit.notification({
		    message: stringMessage,
		    status : 'danger',
		    pos    : 'top-right',
		    timeout: (_sticky) ? 60000 : 5000
		});
	}
}
function showNoticeWxpr(stringMessage, _sticky) {
	_sticky = (typeof(_sticky)==="undefined") ? false : _sticky ;
	if( typeof(UIkit)==='undefined' ) alert('UIkit not found');
	if( typeof(UIkit.notification)==='undefined' ) alert('UIkit not found for notification');
	if( typeof(UIkit.notification)!=='undefined' ) {
		UIkit.notification({
		    message: stringMessage,
		    status : 'warning',
		    pos    : 'top-right',
		    timeout: (_sticky) ? 60000 : 5000
		});
	}
}

// Show PopUp
function PopUp(option) {
	option.url = ( typeof(option.url) == "undefined" ) ? '' : option.url ;
	option.target = ( typeof(option.target) == "undefined" ) ? '' : option.target ;
	option.width = ( typeof(option.width) == "undefined" ) ? 800 : option.width ;
	option.height = ( typeof(option.height) == "undefined" ) ? 600 : option.height ;
	option.head = ( typeof(option.head) == "undefined" ) ? '' : option.head ;
	option.text = ( typeof(option.text) == "undefined" ) ? '' : option.text ;
	option.goprint = ( typeof(option.goprint) == "undefined" ) ? false : option.goprint ;

	var headContent = document.getElementsByTagName('head')[0].innerHTML;
//	var html_open = "<html><head>" + headContent + "</head><body>";
	var html_open = "<html><head>" + option.head + "</head><body>";
	var html_close = "</body></html>";
	//goprint = false;

	if(window.innerWidth){
		LeftPosition = (window.innerWidth - option.width) / 2;
		TopPosition = ((window.innerHeight - option.height) / 4) - 50;
	}else{
		LeftPosition = (parseInt(window.screen.width) - option.width) / 2;
		TopPosition = ((parseInt(window.screen.height) - option.height) / 2) - 50;
	}
	attr = 'location=no,menubar=no,scrollbars=yes,status=yes,resizable=no,width=' + option.width + ',height=' +
	option.height + ',screenX=300,screenY=200,left=' + LeftPosition + ',top=' + TopPosition + '';

	popWin = window.open(option.url, option.target, attr);

	if( option.url=='' ) {
		var popText = popWin.document;
		popText.write(html_open);
		popText.write(option.text);
		popText.write(html_close);
		popText.close();

		popWin.focus();
		if(option.goprint) popWin.body.onload = popWin.print();
	}
	return false;
}
//<a href="#" onclick="popup('','800','600','idareaprint',true); return false;">text link</a>

function asset_dir_url() {
	src = null;
	sc = document.getElementsByTagName("script");
	for(idx = 0; idx < sc.length; idx++) {
		var regex = /script\.js$/gi;
		s = sc.item(idx);
		if(s.src && s.src.match(regex)) {
			src = s.src.replace(regex, '');
		}
	}
	return src;
}

if( typeof(time)==='undefined' ) {
	function time() {
		now = new Date();
		return now.getTime();
	}
}

function escape_string(string) {
	return string.replace(/\\/g, '\\\\').
        replace(/\u0008/g, '\\b').
        replace(/\t/g, '\\t').
        replace(/\n/g, '\\n').
        replace(/\f/g, '\\f').
        replace(/\r/g, '\\r').
        replace(/'/g, '\\\'').
        replace(/"/g, '\\"');
}

function _quotes_(str) {
	if (!str) return '';
	return str
		.replace(/&/g, '&amp;')
		.replace(/"/g, '&quot;')   // double quote
		.replace(/'/g, '&#39;')    // single quote
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');
}

// END AEFW

/* --- Hybrid Responsive Table --- */
function hybridTable() {
	const tables = document.querySelectorAll('.uk-table.uk-table-hybrid');
	tables.forEach(table => {
		const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent.trim());
		table.querySelectorAll('tbody tr').forEach(row => {
			Array.from(row.cells).forEach((cell, i) => {
				if (!cell.hasAttribute('data-label') && headers[i]) {
					cell.setAttribute('data-label', headers[i]);
				}
			});
		});
	});
}
function tableHybrid() {
	return hybridTable();
}
document.addEventListener('DOMContentLoaded', tableHybrid);

$(document).ready(function(e) {
});
