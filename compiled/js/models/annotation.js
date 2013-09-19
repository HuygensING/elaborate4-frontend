(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define(function(require) {
    var Annotation, Models, ajax, config, token, _ref;
    ajax = require('managers/ajax');
    token = require('managers/token');
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

      Annotation.prototype.defaults = function() {
        return {
          annotationMetadataItems: [],
          annotationNo: null,
          annotationType: {
            id: 1
          },
          body: '',
          createdOn: '',
          creator: null,
          modifiedOn: '',
          modifier: null
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
              typeId: this.get('annotationType').id
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
              typeId: this.get('annotationType').id
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
