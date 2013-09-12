(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define(function(require) {
    var EntrySettings, Models, config, _ref;
    config = require('config');
    Models = {
      Base: require('models/base')
    };
    return EntrySettings = (function(_super) {
      __extends(EntrySettings, _super);

      function EntrySettings() {
        _ref = EntrySettings.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      EntrySettings.prototype.initialize = function(models, options) {
        this.projectId = options.projectId;
        return this.entryId = options.entryId;
      };

      EntrySettings.prototype.url = function() {
        return config.baseUrl + ("projects/" + this.projectId + "/entries/" + this.entryId + "/settings");
      };

      return EntrySettings;

    })(Models.Base);
  });

}).call(this);
