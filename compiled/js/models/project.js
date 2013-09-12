(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define(function(require) {
    var Collections, Models, Project, _ref;
    Models = {
      Base: require('models/base')
    };
    Collections = {
      Entries: require('collections/entries'),
      AnnotationTypes: require('collections/project/annotation.types')
    };
    return Project = (function(_super) {
      __extends(Project, _super);

      function Project() {
        _ref = Project.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      Project.prototype.defaults = function() {
        return {
          annotationtypes: null,
          createdOn: '',
          creator: null,
          entries: null,
          level1: '',
          level2: '',
          level3: '',
          modifiedOn: '',
          modifier: null,
          name: '',
          projectLeaderId: null,
          textLayers: [],
          title: ''
        };
      };

      Project.prototype.parse = function(attrs) {
        attrs.entries = new Collections.Entries([], {
          projectId: attrs.id
        });
        attrs.annotationtypes = new Collections.AnnotationTypes([], {
          projectId: attrs.id
        });
        return attrs;
      };

      return Project;

    })(Models.Base);
  });

}).call(this);
