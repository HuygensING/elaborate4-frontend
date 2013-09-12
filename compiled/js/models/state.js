(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define(function(require) {
    var Collections, Models, State, history, _ref;
    history = require('managers/history');
    Models = {
      Base: require('models/base')
    };
    Collections = {
      Projects: require('collections/projects')
    };
    State = (function(_super) {
      __extends(State, _super);

      function State() {
        _ref = State.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      State.prototype.defaults = function() {
        return {
          headerRendered: false,
          currentProject: null,
          projects: new Collections.Projects()
        };
      };

      State.prototype.initialize = function() {
        var _this = this;
        State.__super__.initialize.apply(this, arguments);
        return this.subscribe('authorized', function() {
          return _this.getProjects();
        });
      };

      State.prototype._getCurrentProject = function(cb, prop) {
        var returnProp,
          _this = this;
        returnProp = function(model) {
          var returnVal;
          returnVal = prop != null ? model.get(prop) : model;
          return cb(returnVal);
        };
        if (this.get('currentProject') != null) {
          return returnProp(this.get('currentProject'));
        } else {
          return this.once('change:currentProject', function(stateModel, projectModel, options) {
            return returnProp(projectModel);
          });
        }
      };

      State.prototype.getCurrentProjectId = function(cb) {
        return this._getCurrentProject(cb, 'id');
      };

      State.prototype.getCurrentProjectName = function(cb) {
        return this._getCurrentProject(cb, 'name');
      };

      State.prototype.getCurrentProject = function(cb) {
        return this._getCurrentProject(cb);
      };

      State.prototype.setCurrentProject = function(id) {
        var fragmentPart, project;
        fragmentPart = history.last() != null ? history.last().split('/') : [];
        if (id != null) {
          project = this.get('projects').get(id);
        } else if (fragmentPart[1] === 'projects') {
          project = this.get('projects').find(function(p) {
            return p.get('name') === fragmentPart[2];
          });
        } else {
          project = this.get('projects').first();
        }
        return this.set('currentProject', project);
      };

      State.prototype.onHeaderRendered = function(cb) {
        if (this.get('headerRendered')) {
          return cb();
        } else {
          return this.subscribe('header:render:complete', function() {
            cb();
            return this.set('headerRendered', true);
          });
        }
      };

      State.prototype.getProjects = function() {
        var _this = this;
        return this.get('projects').fetch({
          success: function(collection) {
            return _this.setCurrentProject();
          },
          error: function(collection, response, options) {
            if (response.status === 401) {
              return _this.publish('unauthorized');
            }
          }
        });
      };

      return State;

    })(Models.Base);
    return new State();
  });

}).call(this);
