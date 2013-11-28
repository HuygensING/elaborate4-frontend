require.config 
	paths:
		jquery: '../lib/jquery/jquery'
		underscore: '../lib/underscore-amd/underscore'
		backbone: '../lib/backbone-amd/backbone'
		domready: '../lib/requirejs-domready/domReady'
		classList: '../lib/classList.js/classList'
		'faceted-search': '../lib/faceted-search/stage/js/main'
		hilib: '../lib/hilib/compiled'
		html: '../html'
		tpls: '../templates'
		jade: '../lib/jade/runtime'

	shim:
		'underscore':
			exports: '_'
		'backbone':
			deps: ['underscore', 'jquery']
			exports: 'Backbone'
		'faceted-search':
			deps: ['backbone']

# classList is a polyfill for IE8,9
require ['domready', 'app', 'underscore', 'classList'], (domready, app, _) ->
	domready -> app.init()