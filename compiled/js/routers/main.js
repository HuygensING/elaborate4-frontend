(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define(function(require) {
    var Backbone, Fn, MainRouter, Models, Pubsub, Views, currentUser, history, viewManager, _ref;
    Backbone = require('backbone');
    viewManager = require('hilib/managers/view');
    history = require('hilib/managers/history');
    Pubsub = require('hilib/managers/pubsub');
    currentUser = require('models/currentUser');
    Fn = require('hilib/functions/general');
    Models = {
      state: require('models/state')
    };
    Views = {
      Login: require('views/login'),
      ProjectMain: require('views/project/main'),
      ProjectSettings: require('views/project/settings'),
      ProjectHistory: require('views/project/history'),
      Entry: require('views/entry/main')
    };
    return MainRouter = (function(_super) {
      __extends(MainRouter, _super);

      function MainRouter() {
        _ref = MainRouter.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      MainRouter.prototype.initialize = function() {
        var _this = this;
        _.extend(this, Pubsub);
        this.on('route', function() {
          return history.update();
        });
        this.subscribe('authorized', function() {
          if (history.last() != null) {
            return _this.navigate(history.last(), {
              trigger: true
            });
          } else {
            return _this.publish('navigate:project');
          }
        });
        this.subscribe('unauthorized', function() {
          sessionStorage.clear();
          if (Backbone.history.fragment !== 'login') {
            return _this.navigate('login', {
              trigger: true
            });
          }
        });
        this.subscribe('navigate:project:settings', function() {
          return Models.state.getCurrentProjectName(function(name) {
            return _this.navigate("projects/" + name + "/settings", {
              trigger: true
            });
          });
        });
        this.subscribe('navigate:project:history', function() {
          return Models.state.getCurrentProjectName(function(name) {
            return _this.navigate("projects/" + name + "/history", {
              trigger: true
            });
          });
        });
        this.subscribe('navigate:project', function() {
          return Models.state.getCurrentProjectName(function(name) {
            return _this.navigate("projects/" + name, {
              trigger: true
            });
          });
        });
        return this.subscribe('navigate:entry', function(entryID) {
          return Models.state.getCurrentProjectName(function(name) {
            return _this.navigate("projects/" + name + "/entries/" + entryID, {
              trigger: true
            });
          });
        });
      };

      MainRouter.prototype['routes'] = {
        '': 'projectSearch',
        'login': 'login',
        'projects/:name': 'projectSearch',
        'projects/:name/settings/:tab': 'projectSettings',
        'projects/:name/settings': 'projectSettings',
        'projects/:name/history': 'projectHistory',
        'projects/:name/entries/:id': 'entry',
        'projects/:name/entries/:id/transcriptions/:name': 'entry',
        'projects/:name/entries/:id/transcriptions/:name/annotations/:id': 'entry'
      };

      MainRouter.prototype.home = function() {
        return viewManager.show(Views.Home);
      };

      MainRouter.prototype.login = function() {
        return viewManager.show(Views.Login);
      };

      MainRouter.prototype.projectSearch = function(name) {
        return viewManager.show(Views.ProjectMain);
      };

      MainRouter.prototype.projectSettings = function(name, tab) {
        return viewManager.show(Views.ProjectSettings, {
          tabName: tab
        });
      };

      MainRouter.prototype.projectHistory = function(name) {
        return viewManager.show(Views.ProjectHistory);
      };

      MainRouter.prototype.entry = function(projectName, entryID, transcriptionName, annotationID) {
        return viewManager.show(Views.Entry, {
          entryId: entryID,
          transcriptionName: transcriptionName,
          annotationID: annotationID
        });
      };

      return MainRouter;

    })(Backbone.Router);
  });

}).call(this);
