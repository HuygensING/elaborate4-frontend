(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define(function(require) {
    var Models, ProjectSettings, ajax, config, token, _ref;
    config = require('config');
    token = require('managers/token');
    ajax = require('managers/ajax');
    Models = {
      Base: require('models/base'),
      state: require('models/state')
    };
    return ProjectSettings = (function(_super) {
      __extends(ProjectSettings, _super);

      function ProjectSettings() {
        _ref = ProjectSettings.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      ProjectSettings.prototype.url = function() {
        var id;
        id = Models.state.get('currentProject').id;
        return "" + config.baseUrl + "projects/" + id + "/settings";
      };

      ProjectSettings.prototype.sync = function(method, model, options) {
        var jqXHR,
          _this = this;
        if (method === 'create') {
          ajax.token = token.get();
          jqXHR = ajax.put({
            url: this.url(),
            data: JSON.stringify(this)
          });
          jqXHR.done(function(response) {
            return options.success(response);
          });
          return jqXHR.fail(function() {
            return console.error('Saving ProjectSettings failed!');
          });
        } else {
          return ProjectSettings.__super__.sync.call(this, method, model, options);
        }
      };

      return ProjectSettings;

    })(Models.Base);
  });

}).call(this);
