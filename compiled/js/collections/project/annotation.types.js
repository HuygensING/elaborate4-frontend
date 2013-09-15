(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define(function(require) {
    var AnnotationTypes, Base, Models, config, _ref;
    config = require('config');
    Base = require('collections/base');
    Models = {
      AnnotationType: require('models/project/annotation.type')
    };
    return AnnotationTypes = (function(_super) {
      __extends(AnnotationTypes, _super);

      function AnnotationTypes() {
        _ref = AnnotationTypes.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      AnnotationTypes.prototype.model = Models.AnnotationType;

      AnnotationTypes.prototype.initialize = function(models, options) {
        AnnotationTypes.__super__.initialize.apply(this, arguments);
        return this.projectId = options.projectId;
      };

      AnnotationTypes.prototype.url = function() {
        return config.baseUrl + ("projects/" + this.projectId + "/annotationtypes");
      };

      AnnotationTypes.prototype.comparator = function(annotationType) {
        return annotationType.get('description');
      };

      return AnnotationTypes;

    })(Base);
  });

}).call(this);
