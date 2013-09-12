(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define(function(require) {
    var AnnotationType, Models, _ref;
    Models = {
      Base: require('models/base')
    };
    return AnnotationType = (function(_super) {
      __extends(AnnotationType, _super);

      function AnnotationType() {
        _ref = AnnotationType.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      AnnotationType.prototype.defaults = function() {
        return {
          creator: null,
          modifier: null,
          name: '',
          description: '',
          annotationTypeMetadataItems: [],
          createdOn: '',
          modifiedOn: ''
        };
      };

      return AnnotationType;

    })(Models.Base);
  });

}).call(this);
