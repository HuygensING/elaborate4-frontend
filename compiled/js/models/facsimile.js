(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define(function(require) {
    var Facsimile, Models, ajax, config, token, _ref;
    ajax = require('managers/ajax');
    token = require('managers/token');
    config = require('config');
    Models = {
      Base: require('models/base')
    };
    return Facsimile = (function(_super) {
      __extends(Facsimile, _super);

      function Facsimile() {
        _ref = Facsimile.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      Facsimile.prototype.defaults = function() {
        return {
          name: '',
          filename: '',
          zoomableUrl: ''
        };
      };

      Facsimile.prototype.sync = function(method, model, options) {
        var jqXHR,
          _this = this;
        if (method === 'create') {
          ajax.token = token.get();
          jqXHR = ajax.post({
            url: this.url(),
            dataType: 'text',
            data: JSON.stringify({
              name: model.get('name'),
              filename: model.get('filename'),
              zoomableUrl: model.get('zoomableUrl')
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
        } else {
          return Facsimile.__super__.sync.apply(this, arguments);
        }
      };

      return Facsimile;

    })(Models.Base);
  });

}).call(this);
