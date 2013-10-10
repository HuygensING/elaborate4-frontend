(function() {
  define(function(require) {
    var ajax, token;
    ajax = require('hilib/managers/ajax');
    token = require('hilib/managers/token');
    return {
      syncOverride: function(method, model, options) {
        var data, jqXHR, name, obj, _i, _len, _ref,
          _this = this;
        if (options.attributes != null) {
          obj = {};
          _ref = options.attributes;
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            name = _ref[_i];
            obj[name] = this.get(name);
          }
          data = JSON.stringify(obj);
        } else {
          data = JSON.stringify(model.toJSON());
        }
        if (method === 'create') {
          ajax.token = token.get();
          jqXHR = ajax.post({
            url: this.url(),
            dataType: 'text',
            data: data
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
            data: data
          });
          jqXHR.done(function(response) {
            return _this.trigger('sync');
          });
          return jqXHR.fail(function(response) {
            return console.log('fail', response);
          });
        }
      }
    };
  });

}).call(this);
