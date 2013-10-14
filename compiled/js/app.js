(function() {
  define(function(require) {
    var Backbone, MainRouter, Models, Views, history, projects;
    Backbone = require('backbone');
    history = require('hilib/managers/history');
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
        Backbone.history.start({
          pushState: true
        });
        Models.currentUser.authorize({
          authorized: function() {
            projects.fetch();
            return projects.getCurrent(function(current) {
              var header, url, _ref;
              header = new Views.Header({
                managed: false
              });
              $('#container').prepend(header.render().$el);
              url = (_ref = history.last()) != null ? _ref : 'projects/' + projects.current.get('name');
              return mainRouter.navigate(url, {
                trigger: true
              });
            });
          },
          unauthorized: function() {
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
