(function() {
  require.config({
    paths: {
      'faceted-search': '../lib/faceted-search/stage/js/main',
      'jquery': '../lib/jquery/jquery',
      'underscore': '../lib/underscore-amd/underscore',
      'backbone': '../lib/backbone-amd/backbone',
      'domready': '../lib/requirejs-domready/domReady',
      'text': '../lib/requirejs-text/text',
      'managers': '../lib/managers/dev',
      'helpers': '../lib/helpers/dev',
      'views2': '../lib/views2/compiled',
      'html': '../html',
      'viewshtml': '../lib/views2/compiled'
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
      }
    }
  });

  require(['domready', 'app', 'underscore'], function(domready, app, _) {
    return domready(function() {
      return app.init();
    });
  });

}).call(this);
