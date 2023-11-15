CKEDITOR.plugins.add( 'readmore', {
	onLoad: function() {
		var cssStyles = [
			'{',
				//'background: url(' + CKEDITOR.getUrl( this.path + 'images/readmore_edit.gif?_=20200412164300' ) + ') no-repeat center;',
				'clear: both;',
				'content: \'\';',
				'border-top: #999 2px dashed;',
				'padding: 0;',
				'margin: 16px 16px 24px 16px;',
				'height: 10px;',
				'cursor: default;',
				'text-align: center;',
			'}'
		].join('');
		CKEDITOR.addCss('div.readmore' + cssStyles );
		var cssStyles = [
			'{',
				'content: \'Read more\';',
				'margin-top: -12px;',
				'background: #fff;',
				'border: #999 2px dashed;',
				'padding: 2px 6px;',
				'position: absolute;',
				'font-size: xx-small;',
			'}'
		].join('');
		CKEDITOR.addCss('div.readmore::before' + cssStyles );
	},
	init: function( editor ) {
		if ( editor.blockless ) return;
		// Register the command.
		editor.addCommand('readmore', CKEDITOR.plugins.readmoreCmd );
		// Register the toolbar button.
		editor.ui.addButton && editor.ui.addButton('readmore', {
			label: 'Readmore',
			command: 'readmore',
			toolbar: 'insert,70',
			icon: this.path + 'images/readmore.gif?_=20200412164300'
		});
		// Opera needs help to select the page-break.
		CKEDITOR.env.opera && editor.on('contentDom', function() {
			editor.document.on('click', function( evt ) {
				var target = evt.data.getTarget();
				if ( target.is('div') && target.hasClass('readmore') )
					editor.getSelection().selectElement( target );
			});
		});
	},

});
// TODO Much probably there's no need to expose this object as public object.
CKEDITOR.plugins.readmoreCmd = {
	exec: function( editor ) {
		var divmore = editor.document.getElementsByTag('div');
		for (var i = 0, len = divmore.count() ; i < len ; i++ ) {
			var dmore = divmore.getItem(i);
			if (dmore.hasClass('readmore')) {
				var msg = 'The document already contains a more.\nDo you want to proceed by removing it first?'
				if ( true || confirm(msg) ) { // always remove if having readmore and update position
					dmore.remove();
					break;
				} else {
					return;
				}
			}
		}
		// Create read-only element that represents a print break.
		var pagebreak = CKEDITOR.dom.element.createFromHtml( '<div class="readmore"></div>', editor.document );
		editor.insertElement( pagebreak );
	},
	context: 'div',
};
