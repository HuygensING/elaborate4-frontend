(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define(function(require) {
    var Collections, Models, ProjectHistory, config, _ref;
    config = require('config');
    Models = {
      History: require('models/project/history')
    };
    Collections = {
      Base: require('collections/base')
    };
    return ProjectHistory = (function(_super) {
      __extends(ProjectHistory, _super);

      function ProjectHistory() {
        _ref = ProjectHistory.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      ProjectHistory.prototype.model = Models.History;

      ProjectHistory.prototype.url = function() {
        return "" + config.baseUrl + "projects/" + this.projectID + "/logentries";
      };

      ProjectHistory.prototype.initialize = function(models, options) {
        ProjectHistory.__super__.initialize.apply(this, arguments);
        return this.projectID = options.projectID;
      };

      return ProjectHistory;

    })(Collections.Base);
  });

}).call(this);
