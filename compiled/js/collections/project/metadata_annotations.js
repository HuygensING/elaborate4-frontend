(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define(function(require) {
    var Collections, Models, ProjectMetadataAnnotations, config, _ref;
    config = require('config');
    Models = {
      state: require('models/state')
    };
    Collections = {
      Base: require('collections/base')
    };
    return ProjectMetadataAnnotations = (function(_super) {
      __extends(ProjectMetadataAnnotations, _super);

      function ProjectMetadataAnnotations() {
        _ref = ProjectMetadataAnnotations.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      ProjectMetadataAnnotations.prototype.url = function() {
        var id;
        id = Models.state.get('currentProject').id;
        return "" + config.baseUrl + "projects/" + id + "/annotationtypes";
      };

      ProjectMetadataAnnotations.prototype.initialize = function() {
        return ProjectMetadataAnnotations.__super__.initialize.apply(this, arguments);
      };

      return ProjectMetadataAnnotations;

    })(Collections.Base);
  });

}).call(this);
