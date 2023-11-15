
( function() {
	var pluginName = 'mediaelement';

	CKEDITOR.dialog.add( pluginName, function ( editor ) {

		var numbering = function( id ) {
				return CKEDITOR.tools.getNextId() + '_' + id;
			},
			mediaelementPreviewLoaderId = numbering('mediaelement');

		var updatePreview = function( dialog ) {
			//Don't load before onShow.
			if ( !dialog.preview ) return 1;

			dialog.commitContent( dialog.preview );
			return 0;
		};

		// Custom commit dialog logic, where we're intended to give inline style
		function commitContent() {
			var args = arguments;
			var inlineStyleField = this.getContentElement('info', 'mediaelementPreview');
			if ( inlineStyleField ) inlineStyleField.commit.apply( inlineStyleField, args );
		}

		return {
			title: 'Media Element Properties',
			minWidth: 400,
			minHeight: 200,

			onLoad : function() {
				this.preview = CKEDITOR.document.getById( mediaelementPreviewLoaderId );
				this.commitContent = commitContent;
			},

			contents: [
				// TAB 1
				{
					id : 'info',
					label: 'Audio/Video',
					accessKey: 'I',
					elements : [
						{
							type : 'vbox',
							children : [
								{
									type: 'radio',
									id: 'type',
									label: 'Type',
									items: [ [ 'Audio (mp3)', 'audio' ], [ 'Video (mp4, flv, ogv, webm)', 'video' ] ],
									default: 'audio',
									required: true,
									validate: CKEDITOR.dialog.validate.notEmpty( "Type field cannot be empty" ),
									onChange: function() {
										updatePreview( this.getDialog() );
									},
									setup : function( element ) {
										value = 'audio';
										if( element.name=='audio' ) value = 'audio';
										if( element.name=='video' ) value = 'video';
										this.setValue( value );
									},
								},
								{
									type: 'text',
									id: 'url',
									label: editor.lang.common.url,
									required: true,
									validate: CKEDITOR.dialog.validate.notEmpty( "Media field cannot be empty" ),
									onChange: function() {
										updatePreview( this.getDialog() );
									},
									setup : function( element ) {
										this.setValue( element.attributes.src );
									},
								},
								{
									type: 'button',
									id: 'browse',
									style: 'float:right',
									label: editor.lang.common.browseServer,
									hidden: true,
									filebrowser: 'info:url',
								},
								//*
								{
									type: 'html',
									id: 'mediaelementPreview',
									style: 'text-align:center;',
									html: '<head>' +
											'<link rel="stylesheet" href="' + CKEDITOR.plugins.mediaelement.styleUrl + '" />' +
											'<script src="' + CKEDITOR.plugins.mediaelement.scriptUrl + '"></script>' +
											'</head>' +
											'<div id="' + mediaelementPreviewLoaderId + '" style="text-align: center"></div>',
									commit : function( element ) {
										var dialog = this.getDialog();
										// Read attributes and update mediaelement Preview;
										var type = dialog.getValueOf('info', 'type');
										var url = dialog.getValueOf('info', 'url');

										var features = new Array();
										if( dialog.getValueOf('features', 'playpause') ) features.push('playpause');
										if( dialog.getValueOf('features', 'progress') ) features.push('progress');
										if( dialog.getValueOf('features', 'current') ) features.push('current');
										if( dialog.getValueOf('features', 'duration') ) features.push('duration');
										if( dialog.getValueOf('features', 'tracks') ) features.push('tracks');
										if( dialog.getValueOf('features', 'volume') ) features.push('volume');
										if( dialog.getValueOf('features', 'fullscreen') ) features.push('fullscreen');
										var dataFeatures = JSON.stringify(features);
										    dataFeatures = encodeURIComponent(dataFeatures);

										if ( url=='' ) return false;
										dataFeatures_script = decodeURIComponent(dataFeatures);
										var content = '';
										switch( type ) {
//											case 'audio': content = '<img src="' + CKEDITOR.plugins.get( pluginName ).path + 'images/audio.png" />'; break;
//											case 'video': content = '<img src="' + CKEDITOR.plugins.get( pluginName ).path + 'images/video.png" />'; break;
											case 'audio': content = '<audio src="' + url + '" data-features="' + dataFeatures + '" class="cke_mediaelement"></audio>'; break;
											case 'video': content = '<video src="' + url + '" data-features="' + dataFeatures + '" class="cke_mediaelement"></video>'; break;
										}
										content = '<script>$(document).ready(function(e) { $(\'.cke_mediaelement\').mediaelementplayer({ features: ' + dataFeatures_script + ', }); });</script>' + content +
													'<p style="text-align: center"><a href="javascript:void(0);" title="Preview" class="cke_dialog_ui_button" onclick="$(\'.cke_mediaelement\').mediaelementplayer({});"><span class="cke_dialog_ui_button">Preview</span></a></p>';				
										dialog.preview.setHtml( content );
									},
								}
								//*/
							]
						}
					]
				},
				//* // TAB 2
				{
					id: 'features',
					//requiredContent: 'a[href]',
					label: 'Features',
					elements: [
						{
							type : 'vbox',
							children : [
								{
									id: 'playpause',
									type: 'checkbox',
									label: 'Play/Pause',
									default: 'checked',
									onChange: function() {
										updatePreview( this.getDialog() );
									},
									setup : function( element ) {
										var dataFeatures = element.attributes['data-features'];
										if(typeof(dataFeatures)!='undefined' && dataFeatures.trim()!=''){
											dataFeatures = (typeof(dataFeatures)!='undefined' && dataFeatures.trim()!='') ? dataFeatures : false ;
											dataFeatures = decodeURIComponent(dataFeatures);
											dataFeatures = JSON.parse(dataFeatures);

											sValue = false;
											var length = dataFeatures.length;
											for(var i = 0; i < length; i++) {
												if( dataFeatures[i].match(/^(playpause)$/gi) ) sValue = true;
											}
										}else sValue = true;
										this.setValue( sValue );
									},
								},
								{
									id: 'progress',
									type: 'checkbox',
									label: 'Progress',
									default: 'checked',
									onChange: function() {
										updatePreview( this.getDialog() );
									},
									setup : function( element ) {
										var dataFeatures = element.attributes['data-features'];
										if(typeof(dataFeatures)!='undefined' && dataFeatures.trim()!=''){
										    dataFeatures = (typeof(dataFeatures)!='undefined' && dataFeatures.trim()!='') ? dataFeatures : false ;
											dataFeatures = decodeURIComponent(dataFeatures);
											dataFeatures = JSON.parse(dataFeatures);

											sValue = false;
											var length = dataFeatures.length;
											for(var i = 0; i < length; i++) {
												if( dataFeatures[i].match(/^(progress)$/gi) ) sValue = true;
											}
										}else sValue = true;
										this.setValue( sValue );
									},
								},
								{
									id: 'current',
									type: 'checkbox',
									label: 'Current',
									default: 'checked',
									onChange: function() {
										updatePreview( this.getDialog() );
									},
									setup : function( element ) {
										var dataFeatures = element.attributes['data-features'];
										if(typeof(dataFeatures)!='undefined' && dataFeatures.trim()!=''){
										    dataFeatures = (typeof(dataFeatures)!='undefined' && dataFeatures.trim()!='') ? dataFeatures : false ;
											dataFeatures = decodeURIComponent(dataFeatures);
											dataFeatures = JSON.parse(dataFeatures);

											sValue = false;
											var length = dataFeatures.length;
											for(var i = 0; i < length; i++) {
												if( dataFeatures[i].match(/^(current)$/gi) ) sValue = true;
											}
										}else sValue = true;
										this.setValue( sValue );
									},
								},
								{
									id: 'duration',
									type: 'checkbox',
									label: 'Duration',
									default: 'checked',
									onChange: function() {
										updatePreview( this.getDialog() );
									},
									setup : function( element ) {
										var dataFeatures = element.attributes['data-features'];
										if(typeof(dataFeatures)!='undefined' && dataFeatures.trim()!=''){
										    dataFeatures = (typeof(dataFeatures)!='undefined' && dataFeatures.trim()!='') ? dataFeatures : false ;
											dataFeatures = decodeURIComponent(dataFeatures);
											dataFeatures = JSON.parse(dataFeatures);

											sValue = false;
											var length = dataFeatures.length;
											for(var i = 0; i < length; i++) {
												if( dataFeatures[i].match(/^(duration)$/gi) ) sValue = true;
											}
										}else sValue = true;
										this.setValue( sValue );
									},
								},
								{
									id: 'tracks',
									type: 'checkbox',
									label: 'Tracks',
									default: 'checked',
									onChange: function() {
										updatePreview( this.getDialog() );
									},
									setup : function( element ) {
										var dataFeatures = element.attributes['data-features'];
										if(typeof(dataFeatures)!='undefined' && dataFeatures.trim()!=''){
										    dataFeatures = (typeof(dataFeatures)!='undefined' && dataFeatures.trim()!='') ? dataFeatures : false ;
											dataFeatures = decodeURIComponent(dataFeatures);
											dataFeatures = JSON.parse(dataFeatures);

											sValue = false;
											var length = dataFeatures.length;
											for(var i = 0; i < length; i++) {
												if( dataFeatures[i].match(/^(tracks)$/gi) ) sValue = true;
											}
										}else sValue = true;
										this.setValue( sValue );
									},
								},
								{
									id: 'volume',
									type: 'checkbox',
									label: 'Volume',
									default: 'checked',
									onChange: function() {
										updatePreview( this.getDialog() );
									},
									setup : function( element ) {
										var dataFeatures = element.attributes['data-features'];
										if(typeof(dataFeatures)!='undefined' && dataFeatures.trim()!=''){
										    dataFeatures = (typeof(dataFeatures)!='undefined' && dataFeatures.trim()!='') ? dataFeatures : false ;
											dataFeatures = decodeURIComponent(dataFeatures);
											dataFeatures = JSON.parse(dataFeatures);

											sValue = false;
											var length = dataFeatures.length;
											for(var i = 0; i < length; i++) {
												if( dataFeatures[i].match(/^(volume)$/gi) ) sValue = true;
											}
										}else sValue = true;
										this.setValue( sValue );
									},
								},
								{
									id: 'fullscreen',
									type: 'checkbox',
									label: 'Fullscreen',
									default: 'checked',
									onChange: function() {
										updatePreview( this.getDialog() );
									},
									setup : function( element ) {
										var dataFeatures = element.attributes['data-features'];
										if(typeof(dataFeatures)!='undefined' && dataFeatures.trim()!=''){
										    dataFeatures = (typeof(dataFeatures)!='undefined' && dataFeatures.trim()!='') ? dataFeatures : false ;
											dataFeatures = decodeURIComponent(dataFeatures);
											dataFeatures = JSON.parse(dataFeatures);

											sValue = false;
											var length = dataFeatures.length;
											for(var i = 0; i < length; i++) {
												if( dataFeatures[i].match(/^(fullscreen)$/gi) ) sValue = true;
											}
										}else sValue = true;
										this.setValue( sValue );
									},
								},
							]
						},
					]
				}
				//*/
			],

			onShow : function(){
				var sel = editor.getSelection(),
					element = sel.getStartElement();

				var realHtml = element && element.getAttribute('data-cke-realelement'),
					realFragment = realHtml && new CKEDITOR.htmlParser.fragment.fromHtml( decodeURIComponent( realHtml ) ),
					realElement = realFragment && realFragment.children[0];

				this.element = realElement;
				if ( ( element.hasClass('cke_mediaelement_audio') || element.hasClass('cke_mediaelement_video') ) && realElement && ( realElement.name=='audio' || realElement.name=='video' ) )			
					this.setupContent( this.element );
			},

			onOk: function() {
				var dialog = this;

				var type = dialog.getValueOf( 'info', 'type' );
				var url = dialog.getValueOf( 'info', 'url' );

				var features = new Array();
				if( dialog.getValueOf('features', 'playpause') ) features.push('playpause');
				if( dialog.getValueOf('features', 'progress') ) features.push('progress');
				if( dialog.getValueOf('features', 'current') ) features.push('current');
				if( dialog.getValueOf('features', 'duration') ) features.push('duration');
				if( dialog.getValueOf('features', 'tracks') ) features.push('tracks');
				if( dialog.getValueOf('features', 'volume') ) features.push('volume');
				if( dialog.getValueOf('features', 'fullscreen') ) features.push('fullscreen');
				var dataFeatures = JSON.stringify(features);
					dataFeatures = encodeURIComponent(dataFeatures);

				if( type!='' ){
					//new CKEDITOR.dom.comment(type)
					var dataElement = editor.document.createElement( type )
																			.setAttribute( 'src', url );
					if(
						!dialog.getValueOf('features', 'playpause') ||
						!dialog.getValueOf('features', 'progress') ||
						!dialog.getValueOf('features', 'current') ||
						!dialog.getValueOf('features', 'duration') ||
						!dialog.getValueOf('features', 'tracks') ||
						!dialog.getValueOf('features', 'volume') ||
						!dialog.getValueOf('features', 'fullscreen') )
																dataElement.setAttribute( 'data-features', dataFeatures );
					// Create the fake element that will be inserted into the document.
					var fakeElement = editor.createFakeElement(
						dataElement,
						'cke_mediaelement_' + type,
						'hr'
					);
					editor.insertElement( fakeElement );
				}
			}
		};
	});
} ) ();
