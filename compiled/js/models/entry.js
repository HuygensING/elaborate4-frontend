(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define(function(require) {
    var Collections, Entry, Models, config, _ref;
    config = require('config');
    Models = {
      Base: require('models/base'),
      Settings: require('models/entry.settings')
    };
    Collections = {
      Transcriptions: require('collections/transcriptions'),
      Facsimiles: require('collections/facsimiles')
    };
    return Entry = (function(_super) {
      __extends(Entry, _super);

      function Entry() {
        _ref = Entry.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      Entry.prototype.defaults = function() {
        return {
          name: '',
          publishable: false
        };
      };

      Entry.prototype.parse = function(attrs) {
        attrs.transcriptions = new Collections.Transcriptions([], {
          projectId: this.collection.projectId,
          entryId: attrs.id
        });
        attrs.settings = new Models.Settings([], {
          projectId: this.collection.projectId,
          entryId: attrs.id
        });
        attrs.facsimiles = new Collections.Facsimiles([], {
          projectId: this.collection.projectId,
          entryId: attrs.id
        });
        return attrs;
      };

      return Entry;

    })(Models.Base);
  });

}).call(this);
