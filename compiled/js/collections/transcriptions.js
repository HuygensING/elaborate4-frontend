(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define(function(require) {
    var Base, Models, Transcriptions, config, _ref;
    config = require('config');
    Base = require('collections/base');
    Models = {
      Transcription: require('models/transcription')
    };
    return Transcriptions = (function(_super) {
      __extends(Transcriptions, _super);

      function Transcriptions() {
        _ref = Transcriptions.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      Transcriptions.prototype.model = Models.Transcription;

      Transcriptions.prototype.initialize = function(models, options) {
        this.projectId = options.projectId;
        return this.entryId = options.entryId;
      };

      Transcriptions.prototype.url = function() {
        return config.baseUrl + ("projects/" + this.projectId + "/entries/" + this.entryId + "/transcriptions");
      };

      Transcriptions.prototype.setCurrent = function(model) {
        if (model != null) {
          this.current = model;
        } else {
          this.current = this.at(0);
        }
        return this.trigger('current:change', this.current);
      };

      return Transcriptions;

    })(Base);
  });

}).call(this);
