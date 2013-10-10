(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define(function(require) {
    var Collections, Entry, Models, config, syncOverride, _ref;
    config = require('config');
    syncOverride = require('hilib/mixins/model.sync');
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

      Entry.prototype.initialize = function() {
        Entry.__super__.initialize.apply(this, arguments);
        return _.extend(this, syncOverride);
      };

      Entry.prototype.set = function(attrs, options) {
        var settings;
        settings = this.get('settings');
        if ((settings != null) && (settings.get(attrs) != null)) {
          settings.set(attrs, options);
          return this.trigger('change');
        } else {
          return Entry.__super__.set.apply(this, arguments);
        }
      };

      Entry.prototype.clone = function() {
        var newObj;
        newObj = new this.constructor({
          name: this.get('name'),
          publishable: this.get('publishable')
        });
        newObj.set('settings', new Models.Settings(this.get('settings').toJSON(), {
          projectId: this.collection.projectId,
          entryId: this.id
        }));
        return newObj;
      };

      Entry.prototype.updateFromClone = function(clone) {
        this.set('name', clone.get('name'));
        this.set('publishable', clone.get('publishable'));
        return this.get('settings').set(clone.get('settings').toJSON());
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

      Entry.prototype.sync = function(method, model, options) {
        if (method === 'create' || method === 'update') {
          options.attributes = ['name', 'publishable'];
          return this.syncOverride(method, model, options);
        } else {
          return Entry.__super__.sync.apply(this, arguments);
        }
      };

      return Entry;

    })(Models.Base);
  });

}).call(this);
