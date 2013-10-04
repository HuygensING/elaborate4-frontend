(function() {
  require.config({
    paths: {
      'jquery': '../lib/jquery/jquery',
      'long-press': '../lib/long-press/jquery.longpress',
      'underscore': '../lib/underscore-amd/underscore',
      'backbone': '../lib/backbone-amd/backbone',
      'domready': '../lib/requirejs-domready/domReady',
      'text': '../lib/requirejs-text/text',
      'faceted-search': '../lib/faceted-search/stage/js/main',
      'hilib': '../lib/hilib/compiled',
      'html': '../html'
    },
    shim: {
      'underscore': {
        exports: '_'
      },
      'backbone': {
        deps: ['underscore', 'jquery'],
        exports: 'Backbone'
      },
      'faceted-search': {
        deps: ['backbone', 'text']
      },
      'long-press': {
        deps: ['jquery']
      }
    }
  });

  require(['domready', 'app', 'underscore'], function(domready, app, _) {
    return domready(function() {
      return app.init();
    });
  });

}).call(this);
