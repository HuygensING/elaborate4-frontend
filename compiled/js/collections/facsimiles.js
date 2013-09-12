(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define(function(require) {
    var Base, Facsimiles, Models, config, _ref;
    config = require('config');
    Base = require('collections/base');
    Models = {
      Facsimile: require('models/facsimile')
    };
    return Facsimiles = (function(_super) {
      __extends(Facsimiles, _super);

      function Facsimiles() {
        _ref = Facsimiles.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      Facsimiles.prototype.model = Models.Facsimile;

      Facsimiles.prototype.initialize = function(models, options) {
        this.projectId = options.projectId;
        return this.entryId = options.entryId;
      };

      Facsimiles.prototype.url = function() {
        return config.baseUrl + ("projects/" + this.projectId + "/entries/" + this.entryId + "/facsimiles");
      };

      Facsimiles.prototype.setCurrentFacsimile = function(model) {
        if (model != null) {
          this.currentFacsimile = model;
        } else {
          this.currentFacsimile = this.at(0);
        }
        return this.trigger('currentFacsimile:change', this.currentFacsimile);
      };

      return Facsimiles;

    })(Base);
  });

}).call(this);
