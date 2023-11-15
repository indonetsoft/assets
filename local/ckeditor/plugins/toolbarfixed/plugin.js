/*
*   Plugin developed by Aldo Expert
*   LICENCE: GPL, LGPL, MPL
*/

CKEDITOR.plugins.add( 'toolbarfixed', {
    init: function( editor ) {
		errorFixed = [];
		if( typeof(jQuery)=="undefined" ) errorFixed.push("jQuery");
		if( typeof(UIkit)=="undefined" ) errorFixed.push("UIkit");
		if( errorFixed.length > 0 ) {
			console.log("ckEditor plugin fixed only work with:\n" + errorFixed.join(" and "));
		} else {
			setTimeout(function(){
				$('.cke_top').each(function(){
					$(this).attr('uk-sticky', 'offset: 0; bottom: true');
				});
				UIkit.sticky('.cke_top[uk-sticky]', {});
			}, 1500);
		}
    }
});
