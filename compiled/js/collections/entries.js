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
        return this.currentEntry = null;
      };

      Entries.prototype.url = function() {
        return config.baseUrl + ("projects/" + this.projectId + "/entries");
      };

      Entries.prototype.setCurrentEntry = function(model) {
        this.currentEntry = model;
        return this.publish('currentEntry:change', this.currentEntry);
      };

      Entries.prototype.previous = function() {
        var previousIndex;
        previousIndex = this.indexOf(this.currentEntry) - 1;
        return this.setCurrentEntry(this.at(previousIndex));
      };

      Entries.prototype.next = function() {
        var nextIndex;
        nextIndex = this.indexOf(this.currentEntry) + 1;
        return this.setCurrentEntry(this.at(nextIndex));
      };

      return Entries;

    })(Base);
  });

}).call(this);
