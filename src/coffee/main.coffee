require.config 
	paths:
		'faceted-search': '../lib/faceted-search/stage/js/main'
		'jquery': '../lib/jquery/jquery'
		'underscore': '../lib/underscore-amd/underscore'
		'backbone': '../lib/backbone-amd/backbone'
		'domready': '../lib/requirejs-domready/domReady'
		'supertinyeditor': '../lib/supertinyeditor/main'
		'text': '../lib/requirejs-text/text'
		'managers': '../lib/managers/dev'
		'helpers': '../lib/helpers/dev'
		'helpers2': '../lib/helpers2/dev'
		'views2': '../lib/views2'
		'html': '../html'
		'viewshtml': '../lib/views2'

	shim:
		'underscore':
			exports: '_'
		'backbone':
			deps: ['underscore', 'jquery']
			exports: 'Backbone'
		'faceted-search':
			deps: ['backbone', 'text']

require ['domready', 'app', 'underscore'], (domready, app, _) ->
	domready -> app.init()