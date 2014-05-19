require.config({
	baseUrl: '/compiled/',
	paths: {
		mocha: '../vendor/mocha/mocha',
		chai: '../vendor/chai/chai',
		jquery: '../vendor/jquery/jquery',
		backbone: '../vendor/backbone-amd/backbone',
		underscore: '../vendor/underscore-amd/underscore',
		hilib: '.'
	}
});

require(['require', 'mocha'], function(require)  {
	mocha.setup('bdd');

	require(['../../.test/tests.js'], function() {
		if (window.mochaPhantomJS) { mochaPhantomJS.run(); }
		else { mocha.run(); }
	});
});