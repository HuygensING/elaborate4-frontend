(function() {
  define(function(require) {
    var Backbone, MainRouter, Models, Views, projects;
    Backbone = require('backbone');
    MainRouter = require('routers/main');
    Models = {
      currentUser: require('models/currentUser')
    };
    projects = require('collections/projects');
    Views = {
      Header: require('views/ui/header')
    };
    /* DEBUG*/

    Backbone.on('authorized', function() {
      return console.log('[debug] authorized');
    });
    Backbone.on('unauthorized', function() {
      return console.log('[debug] unauthorized');
    });
    return {
      /* /DEBUG*/

      init: function() {
        var mainRouter,
          _this = this;
        mainRouter = new MainRouter();
        Models.currentUser.authorize({
          authorized: function() {
            return projects.getCurrent(function(current) {
              var header;
              header = new Views.Header({
                managed: false
              });
              $('#container').prepend(header.render().$el);
              Backbone.history.start({
                pushState: true
              });
              console.log('projects/' + projects.current.get('name'));
              return mainRouter.navigate('projects/' + projects.current.get('name'), {
                trigger: true
              });
            });
          },
          unauthorized: function() {
            Backbone.history.start({
              pushState: true
            });
            return mainRouter.navigate('login', {
              trigger: true
            });
          }
        });
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
