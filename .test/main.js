require.config({
	baseUrl: '/compiled/js/',
	paths: {
		mocha: '../lib/mocha/mocha',
		chai: '../lib/chai/chai',
		sinon: '../lib/sinon/lib/sinon',
		'sinon-chai': '../lib/sinon-chai/lib/sinon-chai',
		jquery: '../lib/jquery/jquery',
		backbone: '../lib/backbone-amd/backbone',
		underscore: '../lib/underscore-amd/underscore',
		'faceted-search': '../lib/faceted-search/stage/js/main',
		domready: '../lib/requirejs-domready/domReady',
		text: '../lib/requirejs-text/text',
		managers: '../lib/managers/dev',
		managers2: '../lib/managers2/dev',
		helpers: '../lib/helpers/dev',
		helpers2: '../lib/helpers2/dev',
		views2: '../lib/views2/compiled',
		html: '../html',
		viewshtml: '../lib/views2/compiled'
	},
	shim: {
		sinon: {
			exports: 'sinon'
		}
	}
});

require(['require', 'mocha', 'sinon'], function(require)  {
	mocha.setup('bdd');

	require(['../../.test/tests.js'], function() {
		if (window.mochaPhantomJS) { mochaPhantomJS.run(); }
		else { mocha.run(); }
	});
});