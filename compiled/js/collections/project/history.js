(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define(function(require) {
    var Collections, Models, ProjectHistory, config, _ref;
    config = require('config');
    Models = {
      state: require('models/state')
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

      ProjectHistory.prototype.url = function() {
        var id;
        id = Models.state.get('currentProject').id;
        return "" + config.baseUrl + "projects/" + id + "/logentries";
      };

      return ProjectHistory;

    })(Collections.Base);
  });

}).call(this);
