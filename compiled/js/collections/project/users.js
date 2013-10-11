(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define(function(require) {
    var Collections, ProjectUsers, config, _ref;
    config = require('config');
    Collections = {
      Base: require('collections/base')
    };
    return ProjectUsers = (function(_super) {
      __extends(ProjectUsers, _super);

      function ProjectUsers() {
        _ref = ProjectUsers.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      ProjectUsers.prototype.initialize = function(models, options) {
        ProjectUsers.__super__.initialize.apply(this, arguments);
        return this.projectID = options.projectId;
      };

      ProjectUsers.prototype.url = function() {
        return "" + config.baseUrl + "projects/" + this.projectID + "/users";
      };

      return ProjectUsers;

    })(Collections.Base);
  });

}).call(this);
