/**
 * @fileOverview Media plugin
 */

( function() {
	var pluginName = 'mediaelement';

	CKEDITOR.plugins.add( pluginName, {
		requires: ['dialog','fakeobjects'],
		icons: 'mediaelement',
		hidpi: true,
		onLoad: function() {
			var cssStyles_audio = null;
			var cssStyles_video = null;
			cssStyles_audio = [
						'.cke_mediaelement_audio {',
							'background: url(' + CKEDITOR.getUrl( this.path + 'images/audio.png' ) + ') no-repeat center;',
							'width: 380px !important;',
							'height: 30px !important;',
							'cursor: pointer;',
							'display: inline;',
						'}'
						].join( '' ); // Increase specificity to override other styles, e.g. block outline.
			cssStyles_video = [
						'.cke_mediaelement_video {',
							'background: url(' + CKEDITOR.getUrl( this.path + 'images/video.png' ) + ') no-repeat center;',
							'width: 350px !important;',
							'height: 250px !important;',
							'cursor: pointer;',
							'display: inline;',
						'}'
						].join( '' ); // Increase specificity to override other styles, e.g. block outline.
			// Add the style that renders our placeholder.
			CKEDITOR.addCss( cssStyles_audio );
			CKEDITOR.addCss( cssStyles_video );

			cssStyles_audio_custom = [
						'.cke_mediaelement_audio[data-cke-realelement*="data-features"] {',
							'background: url(' + CKEDITOR.getUrl( this.path + 'images/audio_custom.png' ) + ') no-repeat center;',
						'}'
						].join( '' );
			cssStyles_video_custom = [
						'.cke_mediaelement_video[data-cke-realelement*="data-features"] {',
							'background: url(' + CKEDITOR.getUrl( this.path + 'images/video_custom.png' ) + ') no-repeat center;',
						'}'
						].join( '' );
			CKEDITOR.addCss( cssStyles_audio_custom );
			CKEDITOR.addCss( cssStyles_video_custom );
		},
		init: function( editor ) {
//			var pluginName = 'mediaelement';
			var allowed = ['audio[!src,width,height,data-features]','video[!src,width,height,data-features]'],
				required = ['audio[src]','video[src]'];

			editor.addCommand( pluginName, new CKEDITOR.dialogCommand( pluginName, {
				allowedContent: allowed,
				requiredContent: required,
			} ) );
			editor.ui.addButton( pluginName, {
				label: 'Insert Media Element',
				command: pluginName,
				toolbar: 'insert, 11'
			});
			CKEDITOR.dialog.add( pluginName, this.path + 'dialogs/dialog.js' );

			if ( editor.contextMenu ) {
				editor.addMenuGroup( 'mediaelementGroup' );
				editor.addMenuItem( 'mediaelementItem', {
					label: 'Edit Media Element',
					icon: CKEDITOR.getUrl( this.path ) + 'icons/mediaelement.png',
					command: pluginName,
					group: 'mediaelementGroup'
				});

				editor.contextMenu.addListener( function( element, selection ) {
					var realHtml = element && element.getAttribute('data-cke-realelement'),
						realFragment = realHtml && new CKEDITOR.htmlParser.fragment.fromHtml( decodeURIComponent( realHtml ) ),
						realElement = realFragment && realFragment.children[0];
					if ( ( element.hasClass('cke_mediaelement_audio') || element.hasClass('cke_mediaelement_video') ) && realElement && ( realElement.name=='audio' || realElement.name=='video' ) )			
						return { mediaelementItem: CKEDITOR.TRISTATE_OFF };
				});
			}

			editor.on( 'pluginsLoaded', function( evt ) {
				CKEDITOR.plugins.mediaelement.styleUrl = ( editor.config.mediaelement.styleUrl ) ? CKEDITOR.getUrl( editor.config.mediaelement.styleUrl ) : CKEDITOR.plugins.mediaelement.styleUrl ;
				CKEDITOR.plugins.mediaelement.scriptUrl = ( editor.config.mediaelement.scriptUrl ) ? CKEDITOR.getUrl( editor.config.mediaelement.scriptUrl ) : CKEDITOR.plugins.mediaelement.scriptUrl ;
//				evt.data.dataValue = evt.data.dataValue.replace( /<\/head>/,
//					'<script src="' + ( editor.config.mathJaxLib ? CKEDITOR.getUrl( editor.config.mathJaxLib ) : cdn ) + '"><\/script><\/head>' );
			} );

		},
		afterInit: function(editor) {
			// Adds the comment processing rules to the data filter, so comments
			// are replaced by fake elements.
			editor.dataProcessor.dataFilter.addRules({
				elements: {
					'audio': function( element ) {
						var attributes = element.attributes;
						var value = 'audio';
						return editor.createFakeParserElement(
							element,
							'cke_mediaelement_' + value,
							'hr'
						);
					},
					'video': function( element ) {
						var attributes = element.attributes;
						var value = 'video';
						return editor.createFakeParserElement(
							element,
							'cke_mediaelement_' + value,
							'hr'
						);
					},
				},
			});
		} // end function afterInit
	});

	CKEDITOR.plugins.mediaelement = {};
	CKEDITOR.plugins.mediaelement.styleUrl = 'http://mediaelementjs.com/js/mejs-2.13.1/mediaelementplayer.min.css' ;
	CKEDITOR.plugins.mediaelement.scriptUrl = 'http://mediaelementjs.com/js/mejs-2.13.1/mediaelementplayer.min.js' ;

} ) ();
