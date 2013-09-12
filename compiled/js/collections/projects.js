(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define(function(require) {
    var Base, Models, Projects, config, _ref;
    config = require('config');
    Base = require('collections/base');
    Models = {
      Project: require('models/project')
    };
    return Projects = (function(_super) {
      __extends(Projects, _super);

      function Projects() {
        _ref = Projects.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      Projects.prototype.model = Models.Project;

      Projects.prototype.url = config.baseUrl + 'projects';

      return Projects;

    })(Base);
  });

}).call(this);
