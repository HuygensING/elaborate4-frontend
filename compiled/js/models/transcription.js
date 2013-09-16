(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define(function(require) {
    var Collections, Models, Transcription, config, _ref;
    config = require('config');
    Models = {
      Base: require('models/base')
    };
    Collections = {
      Annotations: require('collections/annotations')
    };
    return Transcription = (function(_super) {
      __extends(Transcription, _super);

      function Transcription() {
        _ref = Transcription.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      Transcription.prototype.defaults = function() {
        return {
          annotations: null,
          textLayer: '',
          title: '',
          body: ''
        };
      };

      Transcription.prototype.initialize = function() {
        var _this = this;
        Transcription.__super__.initialize.apply(this, arguments);
        return this.listenToOnce(this.get('annotations'), 'sync', function() {
          _this.listenTo(_this.get('annotations'), 'add', _this.addAnnotation);
          return _this.listenTo(_this.get('annotations'), 'remove', _this.removeAnnotation);
        });
      };

      Transcription.prototype.parse = function(attrs) {
        attrs.annotations = new Collections.Annotations([], {
          transcriptionId: attrs.id,
          entryId: this.collection.entryId,
          projectId: this.collection.projectId
        });
        return attrs;
      };

      Transcription.prototype.addAnnotation = function(model) {
        var $body;
        $body = $("<div>" + (this.get('body')) + "</div>");
        $body.find('[data-id="newannotation"]').attr('data-id', model.get('annotationNo'));
        return this.resetAnnotationOrder($body);
      };

      Transcription.prototype.removeAnnotation = function(model) {
        var jqXHR,
          _this = this;
        jqXHR = model.destroy();
        return jqXHR.done(function() {
          var $body;
          $body = $("<div>" + (_this.get('body')) + "</div>");
          $body.find("[data-id='" + (model.get('annotationNo')) + "']").remove();
          return _this.resetAnnotationOrder($body);
        });
      };

      Transcription.prototype.resetAnnotationOrder = function($body) {
        var _this = this;
        $body.find('sup[data-marker="end"]').each(function(index, sup) {
          return sup.innerHTML = index + 1;
        });
        return this.set('body', $body.html());
      };

      return Transcription;

    })(Models.Base);
  });

}).call(this);
