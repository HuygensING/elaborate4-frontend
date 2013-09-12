(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define(function(require) {
    var Annotations, Base, Models, config, _ref;
    config = require('config');
    Base = require('collections/base');
    Models = {
      Annotation: require('models/annotation')
    };
    return Annotations = (function(_super) {
      __extends(Annotations, _super);

      function Annotations() {
        _ref = Annotations.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      Annotations.prototype.model = Models.Annotation;

      Annotations.prototype.initialize = function(models, options) {
        this.projectId = options.projectId, this.entryId = options.entryId, this.transcriptionId = options.transcriptionId;
        return this.fetch();
      };

      Annotations.prototype.url = function() {
        return config.baseUrl + ("projects/" + this.projectId + "/entries/" + this.entryId + "/transcriptions/" + this.transcriptionId + "/annotations");
      };

      return Annotations;

    })(Base);
  });

}).call(this);
