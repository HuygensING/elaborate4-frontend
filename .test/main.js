require.config({
	baseUrl: '/dev/js/',
	paths: {
		mocha: '../lib/mocha/mocha',
		chai: '../lib/chai/chai',
		jquery: '../lib/jquery/jquery',
		backbone: '../lib/backbone-amd/backbone',
		underscore: '../lib/underscore-amd/underscore'
	}
});

require(['require', 'mocha'], function(require)  {
	mocha.setup('bdd');

	require(['../../.test/tests.js'], function() {
		if (window.mochaPhantomJS) { mochaPhantomJS.run(); }
		else { mocha.run(); }
	});
});