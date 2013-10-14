(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define(function(require) {
    var Base, Models, Projects, config, history, _ref;
    config = require('config');
    history = require('hilib/managers/history');
    Base = require('collections/base');
    Models = {
      Project: require('models/project/main')
    };
    Projects = (function(_super) {
      __extends(Projects, _super);

      function Projects() {
        _ref = Projects.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      Projects.prototype.model = Models.Project;

      Projects.prototype.url = config.baseUrl + 'projects';

      Projects.prototype.initialize = function() {
        Projects.__super__.initialize.apply(this, arguments);
        return this.on('sync', this.setCurrent, this);
      };

      Projects.prototype.fetch = function(options) {
        var _this = this;
        if (options == null) {
          options = {};
        }
        if (!options.error) {
          options.error = function(collection, response, options) {
            if (response.status === 401) {
              sessionStorage.clear();
              return Backbone.history.navigate('login', {
                trigger: true
              });
            }
          };
        }
        return Projects.__super__.fetch.call(this, options);
      };

      Projects.prototype.getCurrent = function(cb) {
        var _this = this;
        if (this.current != null) {
          return cb(this.current);
        } else {
          return this.once('current:change', function() {
            return cb(_this.current);
          });
        }
      };

      Projects.prototype.setCurrent = function(id) {
        var fragmentPart,
          _this = this;
        fragmentPart = history.last() != null ? history.last().split('/') : [];
        if ((id != null) && _.isString(id)) {
          this.current = this.get(id);
        } else if (fragmentPart[1] === 'projects') {
          this.current = this.find(function(p) {
            return p.get('name') === fragmentPart[2];
          });
        } else {
          this.current = this.first();
        }
        this.current.load(function() {
          return _this.trigger('current:change', _this.current);
        });
        return this.current;
      };

      return Projects;

    })(Base);
    return new Projects();
  });

}).call(this);
