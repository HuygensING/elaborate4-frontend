(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define(function(require) {
    var Collections, Models, Transcription, ajax, config, token, _ref;
    config = require('config');
    ajax = require('hilib/managers/ajax');
    token = require('hilib/managers/token');
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

      Transcription.prototype.getAnnotations = function(cb) {
        var annotations,
          _this = this;
        if (cb == null) {
          cb = function() {};
        }
        if (this.get('annotations') != null) {
          return cb(this.get('annotations'));
        } else {
          annotations = new Collections.Annotations([], {
            transcriptionId: this.id,
            entryId: this.collection.entryId,
            projectId: this.collection.projectId
          });
          return annotations.fetch({
            success: function(collection) {
              _this.set('annotations', collection);
              _this.listenTo(collection, 'add', _this.addAnnotation);
              _this.listenTo(collection, 'remove', _this.removeAnnotation);
              return cb(collection);
            }
          });
        }
      };

      Transcription.prototype.addAnnotation = function(model) {
        var $body;
        if (model.get('annotationNo') == null) {
          console.error('No annotationNo given!', model.get('annotationNo'));
          return false;
        }
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
        this.set('body', $body.html());
        return this.save();
      };

      Transcription.prototype.set = function(attrs, options) {
        var _this = this;
        if (attrs === 'body') {
          options = options.replace(/<div><br><\/div>/g, '<br>');
          options = options.replace(/<div>(.*?)<\/div>/g, function(match, p1, offset, string) {
            return '<br>' + p1;
          });
        }
        return Transcription.__super__.set.apply(this, arguments);
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
                _this.trigger('sync');
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
            return _this.trigger('sync');
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
