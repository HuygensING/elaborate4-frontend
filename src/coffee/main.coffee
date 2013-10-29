require.config 
	paths:
		'jquery': '../lib/jquery/jquery'
		# 'ajaxHooks': '../lib/ajaxHooks/src'
		# 'long-press': '../lib/long-press/jquery.longpress'
		'underscore': '../lib/underscore-amd/underscore'
		'backbone': '../lib/backbone-amd/backbone'
		'domready': '../lib/requirejs-domready/domReady'
		'text': '../lib/requirejs-text/text'
		'classList': '../lib/classList.js/classList'
		'faceted-search': '../lib/faceted-search/stage/js/main'
		'hilib': '../lib/hilib/compiled'
		'html': '../html'
		'tpls': '../templates'
		'jade': '../lib/jade/jade'

	shim:
		'underscore':
			exports: '_'
		'backbone':
			deps: ['underscore', 'jquery']
			exports: 'Backbone'
		'faceted-search':
			deps: ['backbone', 'text']
		# 'ajaxHooks/xdr':
		# 	deps: ['jquery']

# classList is a polyfill for IE8,9
require ['domready', 'app', 'underscore', 'classList'], (domready, app, _) ->
	domready -> app.init()