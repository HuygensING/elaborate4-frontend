(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define(function(require) {
    var Collections, Models, Transcription, ajax, config, token, _ref;
    config = require('config');
    ajax = require('managers2/ajax');
    token = require('managers2/token');
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
        this.listenToAnnotations();
        return this.on('change:body', function() {
          return _this.save();
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

      Transcription.prototype.listenToAnnotations = function() {
        var _this = this;
        if (this.get('annotations') != null) {
          return this.listenToOnce(this.get('annotations'), 'sync', function() {
            _this.listenTo(_this.get('annotations'), 'add', _this.addAnnotation);
            return _this.listenTo(_this.get('annotations'), 'remove', _this.removeAnnotation);
          });
        }
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

      Transcription.prototype.sync = function(method, model, options) {
        var jqXHR,
          _this = this;
        if (method === 'create') {
          ajax.token = token.get();
          jqXHR = ajax.post({
            url: this.url(),
            dataType: 'text',
            data: JSON.stringify({
              textLayer: model.get('textLayer'),
              body: model.get('body')
            })
          });
          jqXHR.done(function(data, textStatus, jqXHR) {
            var url, xhr;
            if (jqXHR.status === 201) {
              url = jqXHR.getResponseHeader('Location');
              xhr = ajax.get({
                url: url
              });
              return xhr.done(function(data, textStatus, jqXHR) {
                return options.success(data);
              });
            }
          });
          return jqXHR.fail(function(response) {
            return console.log('fail', response);
          });
        } else if (method === 'update') {
          ajax.token = token.get();
          jqXHR = ajax.put({
            url: this.url(),
            data: JSON.stringify({
              body: model.get('body')
            })
          });
          jqXHR.done(function(response) {
            return console.log('done', response);
          });
          return jqXHR.fail(function(response) {
            return console.log('fail', response);
          });
        } else {
          return Transcription.__super__.sync.apply(this, arguments);
        }
      };

      return Transcription;

    })(Models.Base);
  });

}).call(this);
