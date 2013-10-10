(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define(function(require) {
    var Base, Entries, Models, config, _ref;
    config = require('config');
    Base = require('collections/base');
    Models = {
      Entry: require('models/entry')
    };
    return Entries = (function(_super) {
      __extends(Entries, _super);

      function Entries() {
        _ref = Entries.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      Entries.prototype.model = Models.Entry;

      Entries.prototype.initialize = function(models, options) {
        Entries.__super__.initialize.apply(this, arguments);
        this.projectId = options.projectId;
        return this.current = null;
      };

      Entries.prototype.url = function() {
        return config.baseUrl + ("projects/" + this.projectId + "/entries");
      };

      Entries.prototype.setCurrent = function(modelID) {
        var model;
        model = this.get(modelID);
        this.trigger('current:change', model);
        return this.current = model;
      };

      Entries.prototype.previous = function() {
        var model, previousIndex;
        previousIndex = this.indexOf(this.current) - 1;
        model = this.at(previousIndex);
        return this.setCurrent(model);
      };

      Entries.prototype.next = function() {
        var model, nextIndex;
        nextIndex = this.indexOf(this.current) + 1;
        model = this.at(nextIndex);
        return this.setCurrent(model);
      };

      return Entries;

    })(Base);
  });

}).call(this);
