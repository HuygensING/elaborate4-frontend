(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define(function(require) {
    var Annotation, Models, ajax, config, token, _ref;
    ajax = require('hilib/managers/ajax');
    token = require('hilib/managers/token');
    ajax.token = token.get();
    config = require('config');
    Models = {
      Base: require('models/base')
    };
    return Annotation = (function(_super) {
      __extends(Annotation, _super);

      function Annotation() {
        _ref = Annotation.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      Annotation.prototype.urlRoot = function() {
        return config.baseUrl + ("projects/" + this.collection.projectId + "/entries/" + this.collection.entryId + "/transcriptions/" + this.collection.transcriptionId + "/annotations");
      };

      Annotation.prototype.set = function(attrs, options) {
        var attr;
        if (_.isString(attrs) && attrs.substr(0, 9) === 'metadata.') {
          attr = attrs.substr(9);
          return this.attributes['metadata'][attr] = options;
        } else {
          return Annotation.__super__.set.apply(this, arguments);
        }
      };

      Annotation.prototype.defaults = function() {
        return {
          annotationMetadataItems: [],
          annotationNo: 'newannotation',
          annotationType: {
            id: 1
          },
          body: '',
          createdOn: '',
          creator: null,
          modifiedOn: '',
          modifier: null,
          metadata: {}
        };
      };

      Annotation.prototype.sync = function(method, model, options) {
        var jqXHR,
          _this = this;
        if (method === 'create') {
          jqXHR = ajax.post({
            url: this.url(),
            data: JSON.stringify({
              body: this.get('body'),
              typeId: this.get('annotationType').id,
              metadata: this.get('metadata')
            }),
            dataType: 'text'
          });
          jqXHR.done(function(data, textStatus, jqXHR) {
            var xhr;
            if (jqXHR.status === 201) {
              xhr = ajax.get({
                url: jqXHR.getResponseHeader('Location')
              });
              return xhr.done(function(data, textStatus, jqXHR) {
                return options.success(data);
              });
            }
          });
          return jqXHR.fail(function(a, b, c) {
            return console.log('fail', a, b, c);
          });
        } else if (method === 'update') {
          ajax.token = token.get();
          jqXHR = ajax.put({
            url: this.url(),
            data: JSON.stringify({
              body: this.get('body'),
              typeId: this.get('annotationType').id,
              metadata: this.get('metadata')
            })
          });
          jqXHR.done(function(response) {
            return options.success(response);
          });
          return jqXHR.fail(function(response) {
            return console.log('fail', response);
          });
        } else {
          return Annotation.__super__.sync.apply(this, arguments);
        }
      };

      return Annotation;

    })(Models.Base);
  });

}).call(this);
