(function() {
  define(function(require) {
    var Backbone, MainRouter, Models, Views;
    Backbone = require('backbone');
    MainRouter = require('routers/main');
    Models = {
      currentUser: require('models/currentUser'),
      state: require('models/state')
    };
    Views = {
      Header: require('views/ui/header'),
      Debug: require('views/debug')
    };
    /* DEBUG*/

    Backbone.on('authorized', function() {
      return console.log('[debug] authorized');
    });
    Backbone.on('unauthorized', function() {
      return console.log('[debug] unauthorized');
    });
    Models.state.on('change:currentProject', function() {
      return console.log('[debug] current project changed');
    });
    return {
      /* /DEBUG*/

      init: function() {
        var header, mainRouter;
        mainRouter = new MainRouter();
        Backbone.history.start({
          pushState: true
        });
        header = new Views.Header({
          managed: false
        });
        $('#container').prepend(header.$el);
        $('body').append(new Views.Debug({
          managed: false
        }).$el);
        Models.currentUser.authorize();
        return $(document).on('click', 'a:not([data-bypass])', function(e) {
          var href;
          href = $(this).attr('href');
          if (href != null) {
            e.preventDefault();
            return Backbone.history.navigate(href, {
              'trigger': true
            });
          }
        });
      }
    };
  });

}).call(this);
