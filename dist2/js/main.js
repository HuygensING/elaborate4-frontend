(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
//     Backbone.js 1.0.0

//     (c) 2010-2013 Jeremy Ashkenas, DocumentCloud Inc.
//     Backbone may be freely distributed under the MIT license.
//     For all details and documentation:
//     http://backbonejs.org

(function(){

  // Initial Setup
  // -------------

  // Save a reference to the global object (`window` in the browser, `exports`
  // on the server).
  var root = this;

  // Save the previous value of the `Backbone` variable, so that it can be
  // restored later on, if `noConflict` is used.
  var previousBackbone = root.Backbone;

  // Create local references to array methods we'll want to use later.
  var array = [];
  var push = array.push;
  var slice = array.slice;
  var splice = array.splice;

  // The top-level namespace. All public Backbone classes and modules will
  // be attached to this. Exported for both the browser and the server.
  var Backbone;
  if (typeof exports !== 'undefined') {
    Backbone = exports;
  } else {
    Backbone = root.Backbone = {};
  }

  // Current version of the library. Keep in sync with `package.json`.
  Backbone.VERSION = '1.0.0';

  // Require Underscore, if we're on the server, and it's not already present.
  var _ = root._;
  if (!_ && (typeof require !== 'undefined')) _ = require('underscore');

  // For Backbone's purposes, jQuery, Zepto, Ender, or My Library (kidding) owns
  // the `$` variable.
  Backbone.$ = root.jQuery || root.Zepto || root.ender || root.$;

  // Runs Backbone.js in *noConflict* mode, returning the `Backbone` variable
  // to its previous owner. Returns a reference to this Backbone object.
  Backbone.noConflict = function() {
    root.Backbone = previousBackbone;
    return this;
  };

  // Turn on `emulateHTTP` to support legacy HTTP servers. Setting this option
  // will fake `"PUT"` and `"DELETE"` requests via the `_method` parameter and
  // set a `X-Http-Method-Override` header.
  Backbone.emulateHTTP = false;

  // Turn on `emulateJSON` to support legacy servers that can't deal with direct
  // `application/json` requests ... will encode the body as
  // `application/x-www-form-urlencoded` instead and will send the model in a
  // form param named `model`.
  Backbone.emulateJSON = false;

  // Backbone.Events
  // ---------------

  // A module that can be mixed in to *any object* in order to provide it with
  // custom events. You may bind with `on` or remove with `off` callback
  // functions to an event; `trigger`-ing an event fires all callbacks in
  // succession.
  //
  //     var object = {};
  //     _.extend(object, Backbone.Events);
  //     object.on('expand', function(){ alert('expanded'); });
  //     object.trigger('expand');
  //
  var Events = Backbone.Events = {

    // Bind an event to a `callback` function. Passing `"all"` will bind
    // the callback to all events fired.
    on: function(name, callback, context) {
      if (!eventsApi(this, 'on', name, [callback, context]) || !callback) return this;
      this._events || (this._events = {});
      var events = this._events[name] || (this._events[name] = []);
      events.push({callback: callback, context: context, ctx: context || this});
      return this;
    },

    // Bind an event to only be triggered a single time. After the first time
    // the callback is invoked, it will be removed.
    once: function(name, callback, context) {
      if (!eventsApi(this, 'once', name, [callback, context]) || !callback) return this;
      var self = this;
      var once = _.once(function() {
        self.off(name, once);
        callback.apply(this, arguments);
      });
      once._callback = callback;
      return this.on(name, once, context);
    },

    // Remove one or many callbacks. If `context` is null, removes all
    // callbacks with that function. If `callback` is null, removes all
    // callbacks for the event. If `name` is null, removes all bound
    // callbacks for all events.
    off: function(name, callback, context) {
      var retain, ev, events, names, i, l, j, k;
      if (!this._events || !eventsApi(this, 'off', name, [callback, context])) return this;
      if (!name && !callback && !context) {
        this._events = {};
        return this;
      }

      names = name ? [name] : _.keys(this._events);
      for (i = 0, l = names.length; i < l; i++) {
        name = names[i];
        if (events = this._events[name]) {
          this._events[name] = retain = [];
          if (callback || context) {
            for (j = 0, k = events.length; j < k; j++) {
              ev = events[j];
              if ((callback && callback !== ev.callback && callback !== ev.callback._callback) ||
                  (context && context !== ev.context)) {
                retain.push(ev);
              }
            }
          }
          if (!retain.length) delete this._events[name];
        }
      }

      return this;
    },

    // Trigger one or many events, firing all bound callbacks. Callbacks are
    // passed the same arguments as `trigger` is, apart from the event name
    // (unless you're listening on `"all"`, which will cause your callback to
    // receive the true name of the event as the first argument).
    trigger: function(name) {
      if (!this._events) return this;
      var args = slice.call(arguments, 1);
      if (!eventsApi(this, 'trigger', name, args)) return this;
      var events = this._events[name];
      var allEvents = this._events.all;
      if (events) triggerEvents(events, args);
      if (allEvents) triggerEvents(allEvents, arguments);
      return this;
    },

    // Tell this object to stop listening to either specific events ... or
    // to every object it's currently listening to.
    stopListening: function(obj, name, callback) {
      var listeners = this._listeners;
      if (!listeners) return this;
      var deleteListener = !name && !callback;
      if (typeof name === 'object') callback = this;
      if (obj) (listeners = {})[obj._listenerId] = obj;
      for (var id in listeners) {
        listeners[id].off(name, callback, this);
        if (deleteListener) delete this._listeners[id];
      }
      return this;
    }

  };

  // Regular expression used to split event strings.
  var eventSplitter = /\s+/;

  // Implement fancy features of the Events API such as multiple event
  // names `"change blur"` and jQuery-style event maps `{change: action}`
  // in terms of the existing API.
  var eventsApi = function(obj, action, name, rest) {
    if (!name) return true;

    // Handle event maps.
    if (typeof name === 'object') {
      for (var key in name) {
        obj[action].apply(obj, [key, name[key]].concat(rest));
      }
      return false;
    }

    // Handle space separated event names.
    if (eventSplitter.test(name)) {
      var names = name.split(eventSplitter);
      for (var i = 0, l = names.length; i < l; i++) {
        obj[action].apply(obj, [names[i]].concat(rest));
      }
      return false;
    }

    return true;
  };

  // A difficult-to-believe, but optimized internal dispatch function for
  // triggering events. Tries to keep the usual cases speedy (most internal
  // Backbone events have 3 arguments).
  var triggerEvents = function(events, args) {
    var ev, i = -1, l = events.length, a1 = args[0], a2 = args[1], a3 = args[2];
    switch (args.length) {
      case 0: while (++i < l) (ev = events[i]).callback.call(ev.ctx); return;
      case 1: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1); return;
      case 2: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1, a2); return;
      case 3: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1, a2, a3); return;
      default: while (++i < l) (ev = events[i]).callback.apply(ev.ctx, args);
    }
  };

  var listenMethods = {listenTo: 'on', listenToOnce: 'once'};

  // Inversion-of-control versions of `on` and `once`. Tell *this* object to
  // listen to an event in another object ... keeping track of what it's
  // listening to.
  _.each(listenMethods, function(implementation, method) {
    Events[method] = function(obj, name, callback) {
      var listeners = this._listeners || (this._listeners = {});
      var id = obj._listenerId || (obj._listenerId = _.uniqueId('l'));
      listeners[id] = obj;
      if (typeof name === 'object') callback = this;
      obj[implementation](name, callback, this);
      return this;
    };
  });

  // Aliases for backwards compatibility.
  Events.bind   = Events.on;
  Events.unbind = Events.off;

  // Allow the `Backbone` object to serve as a global event bus, for folks who
  // want global "pubsub" in a convenient place.
  _.extend(Backbone, Events);

  // Backbone.Model
  // --------------

  // Backbone **Models** are the basic data object in the framework --
  // frequently representing a row in a table in a database on your server.
  // A discrete chunk of data and a bunch of useful, related methods for
  // performing computations and transformations on that data.

  // Create a new model with the specified attributes. A client id (`cid`)
  // is automatically generated and assigned for you.
  var Model = Backbone.Model = function(attributes, options) {
    var defaults;
    var attrs = attributes || {};
    options || (options = {});
    this.cid = _.uniqueId('c');
    this.attributes = {};
    _.extend(this, _.pick(options, modelOptions));
    if (options.parse) attrs = this.parse(attrs, options) || {};
    if (defaults = _.result(this, 'defaults')) {
      attrs = _.defaults({}, attrs, defaults);
    }
    this.set(attrs, options);
    this.changed = {};
    this.initialize.apply(this, arguments);
  };

  // A list of options to be attached directly to the model, if provided.
  var modelOptions = ['url', 'urlRoot', 'collection'];

  // Attach all inheritable methods to the Model prototype.
  _.extend(Model.prototype, Events, {

    // A hash of attributes whose current and previous value differ.
    changed: null,

    // The value returned during the last failed validation.
    validationError: null,

    // The default name for the JSON `id` attribute is `"id"`. MongoDB and
    // CouchDB users may want to set this to `"_id"`.
    idAttribute: 'id',

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // Return a copy of the model's `attributes` object.
    toJSON: function(options) {
      return _.clone(this.attributes);
    },

    // Proxy `Backbone.sync` by default -- but override this if you need
    // custom syncing semantics for *this* particular model.
    sync: function() {
      return Backbone.sync.apply(this, arguments);
    },

    // Get the value of an attribute.
    get: function(attr) {
      return this.attributes[attr];
    },

    // Get the HTML-escaped value of an attribute.
    escape: function(attr) {
      return _.escape(this.get(attr));
    },

    // Returns `true` if the attribute contains a value that is not null
    // or undefined.
    has: function(attr) {
      return this.get(attr) != null;
    },

    // Set a hash of model attributes on the object, firing `"change"`. This is
    // the core primitive operation of a model, updating the data and notifying
    // anyone who needs to know about the change in state. The heart of the beast.
    set: function(key, val, options) {
      var attr, attrs, unset, changes, silent, changing, prev, current;
      if (key == null) return this;

      // Handle both `"key", value` and `{key: value}` -style arguments.
      if (typeof key === 'object') {
        attrs = key;
        options = val;
      } else {
        (attrs = {})[key] = val;
      }

      options || (options = {});

      // Run validation.
      if (!this._validate(attrs, options)) return false;

      // Extract attributes and options.
      unset           = options.unset;
      silent          = options.silent;
      changes         = [];
      changing        = this._changing;
      this._changing  = true;

      if (!changing) {
        this._previousAttributes = _.clone(this.attributes);
        this.changed = {};
      }
      current = this.attributes, prev = this._previousAttributes;

      // Check for changes of `id`.
      if (this.idAttribute in attrs) this.id = attrs[this.idAttribute];

      // For each `set` attribute, update or delete the current value.
      for (attr in attrs) {
        val = attrs[attr];
        if (!_.isEqual(current[attr], val)) changes.push(attr);
        if (!_.isEqual(prev[attr], val)) {
          this.changed[attr] = val;
        } else {
          delete this.changed[attr];
        }
        unset ? delete current[attr] : current[attr] = val;
      }

      // Trigger all relevant attribute changes.
      if (!silent) {
        if (changes.length) this._pending = true;
        for (var i = 0, l = changes.length; i < l; i++) {
          this.trigger('change:' + changes[i], this, current[changes[i]], options);
        }
      }

      // You might be wondering why there's a `while` loop here. Changes can
      // be recursively nested within `"change"` events.
      if (changing) return this;
      if (!silent) {
        while (this._pending) {
          this._pending = false;
          this.trigger('change', this, options);
        }
      }
      this._pending = false;
      this._changing = false;
      return this;
    },

    // Remove an attribute from the model, firing `"change"`. `unset` is a noop
    // if the attribute doesn't exist.
    unset: function(attr, options) {
      return this.set(attr, void 0, _.extend({}, options, {unset: true}));
    },

    // Clear all attributes on the model, firing `"change"`.
    clear: function(options) {
      var attrs = {};
      for (var key in this.attributes) attrs[key] = void 0;
      return this.set(attrs, _.extend({}, options, {unset: true}));
    },

    // Determine if the model has changed since the last `"change"` event.
    // If you specify an attribute name, determine if that attribute has changed.
    hasChanged: function(attr) {
      if (attr == null) return !_.isEmpty(this.changed);
      return _.has(this.changed, attr);
    },

    // Return an object containing all the attributes that have changed, or
    // false if there are no changed attributes. Useful for determining what
    // parts of a view need to be updated and/or what attributes need to be
    // persisted to the server. Unset attributes will be set to undefined.
    // You can also pass an attributes object to diff against the model,
    // determining if there *would be* a change.
    changedAttributes: function(diff) {
      if (!diff) return this.hasChanged() ? _.clone(this.changed) : false;
      var val, changed = false;
      var old = this._changing ? this._previousAttributes : this.attributes;
      for (var attr in diff) {
        if (_.isEqual(old[attr], (val = diff[attr]))) continue;
        (changed || (changed = {}))[attr] = val;
      }
      return changed;
    },

    // Get the previous value of an attribute, recorded at the time the last
    // `"change"` event was fired.
    previous: function(attr) {
      if (attr == null || !this._previousAttributes) return null;
      return this._previousAttributes[attr];
    },

    // Get all of the attributes of the model at the time of the previous
    // `"change"` event.
    previousAttributes: function() {
      return _.clone(this._previousAttributes);
    },

    // Fetch the model from the server. If the server's representation of the
    // model differs from its current attributes, they will be overridden,
    // triggering a `"change"` event.
    fetch: function(options) {
      options = options ? _.clone(options) : {};
      if (options.parse === void 0) options.parse = true;
      var model = this;
      var success = options.success;
      options.success = function(resp) {
        if (!model.set(model.parse(resp, options), options)) return false;
        if (success) success(model, resp, options);
        model.trigger('sync', model, resp, options);
      };
      wrapError(this, options);
      return this.sync('read', this, options);
    },

    // Set a hash of model attributes, and sync the model to the server.
    // If the server returns an attributes hash that differs, the model's
    // state will be `set` again.
    save: function(key, val, options) {
      var attrs, method, xhr, attributes = this.attributes;

      // Handle both `"key", value` and `{key: value}` -style arguments.
      if (key == null || typeof key === 'object') {
        attrs = key;
        options = val;
      } else {
        (attrs = {})[key] = val;
      }

      // If we're not waiting and attributes exist, save acts as `set(attr).save(null, opts)`.
      if (attrs && (!options || !options.wait) && !this.set(attrs, options)) return false;

      options = _.extend({validate: true}, options);

      // Do not persist invalid models.
      if (!this._validate(attrs, options)) return false;

      // Set temporary attributes if `{wait: true}`.
      if (attrs && options.wait) {
        this.attributes = _.extend({}, attributes, attrs);
      }

      // After a successful server-side save, the client is (optionally)
      // updated with the server-side state.
      if (options.parse === void 0) options.parse = true;
      var model = this;
      var success = options.success;
      options.success = function(resp) {
        // Ensure attributes are restored during synchronous saves.
        model.attributes = attributes;
        var serverAttrs = model.parse(resp, options);
        if (options.wait) serverAttrs = _.extend(attrs || {}, serverAttrs);
        if (_.isObject(serverAttrs) && !model.set(serverAttrs, options)) {
          return false;
        }
        if (success) success(model, resp, options);
        model.trigger('sync', model, resp, options);
      };
      wrapError(this, options);

      method = this.isNew() ? 'create' : (options.patch ? 'patch' : 'update');
      if (method === 'patch') options.attrs = attrs;
      xhr = this.sync(method, this, options);

      // Restore attributes.
      if (attrs && options.wait) this.attributes = attributes;

      return xhr;
    },

    // Destroy this model on the server if it was already persisted.
    // Optimistically removes the model from its collection, if it has one.
    // If `wait: true` is passed, waits for the server to respond before removal.
    destroy: function(options) {
      options = options ? _.clone(options) : {};
      var model = this;
      var success = options.success;

      var destroy = function() {
        model.trigger('destroy', model, model.collection, options);
      };

      options.success = function(resp) {
        if (options.wait || model.isNew()) destroy();
        if (success) success(model, resp, options);
        if (!model.isNew()) model.trigger('sync', model, resp, options);
      };

      if (this.isNew()) {
        options.success();
        return false;
      }
      wrapError(this, options);

      var xhr = this.sync('delete', this, options);
      if (!options.wait) destroy();
      return xhr;
    },

    // Default URL for the model's representation on the server -- if you're
    // using Backbone's restful methods, override this to change the endpoint
    // that will be called.
    url: function() {
      var base = _.result(this, 'urlRoot') || _.result(this.collection, 'url') || urlError();
      if (this.isNew()) return base;
      return base + (base.charAt(base.length - 1) === '/' ? '' : '/') + encodeURIComponent(this.id);
    },

    // **parse** converts a response into the hash of attributes to be `set` on
    // the model. The default implementation is just to pass the response along.
    parse: function(resp, options) {
      return resp;
    },

    // Create a new model with identical attributes to this one.
    clone: function() {
      return new this.constructor(this.attributes);
    },

    // A model is new if it has never been saved to the server, and lacks an id.
    isNew: function() {
      return this.id == null;
    },

    // Check if the model is currently in a valid state.
    isValid: function(options) {
      return this._validate({}, _.extend(options || {}, { validate: true }));
    },

    // Run validation against the next complete set of model attributes,
    // returning `true` if all is well. Otherwise, fire an `"invalid"` event.
    _validate: function(attrs, options) {
      if (!options.validate || !this.validate) return true;
      attrs = _.extend({}, this.attributes, attrs);
      var error = this.validationError = this.validate(attrs, options) || null;
      if (!error) return true;
      this.trigger('invalid', this, error, _.extend(options || {}, {validationError: error}));
      return false;
    }

  });

  // Underscore methods that we want to implement on the Model.
  var modelMethods = ['keys', 'values', 'pairs', 'invert', 'pick', 'omit'];

  // Mix in each Underscore method as a proxy to `Model#attributes`.
  _.each(modelMethods, function(method) {
    Model.prototype[method] = function() {
      var args = slice.call(arguments);
      args.unshift(this.attributes);
      return _[method].apply(_, args);
    };
  });

  // Backbone.Collection
  // -------------------

  // If models tend to represent a single row of data, a Backbone Collection is
  // more analagous to a table full of data ... or a small slice or page of that
  // table, or a collection of rows that belong together for a particular reason
  // -- all of the messages in this particular folder, all of the documents
  // belonging to this particular author, and so on. Collections maintain
  // indexes of their models, both in order, and for lookup by `id`.

  // Create a new **Collection**, perhaps to contain a specific type of `model`.
  // If a `comparator` is specified, the Collection will maintain
  // its models in sort order, as they're added and removed.
  var Collection = Backbone.Collection = function(models, options) {
    options || (options = {});
    if (options.url) this.url = options.url;
    if (options.model) this.model = options.model;
    if (options.comparator !== void 0) this.comparator = options.comparator;
    this._reset();
    this.initialize.apply(this, arguments);
    if (models) this.reset(models, _.extend({silent: true}, options));
  };

  // Default options for `Collection#set`.
  var setOptions = {add: true, remove: true, merge: true};
  var addOptions = {add: true, merge: false, remove: false};

  // Define the Collection's inheritable methods.
  _.extend(Collection.prototype, Events, {

    // The default model for a collection is just a **Backbone.Model**.
    // This should be overridden in most cases.
    model: Model,

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // The JSON representation of a Collection is an array of the
    // models' attributes.
    toJSON: function(options) {
      return this.map(function(model){ return model.toJSON(options); });
    },

    // Proxy `Backbone.sync` by default.
    sync: function() {
      return Backbone.sync.apply(this, arguments);
    },

    // Add a model, or list of models to the set.
    add: function(models, options) {
      return this.set(models, _.defaults(options || {}, addOptions));
    },

    // Remove a model, or a list of models from the set.
    remove: function(models, options) {
      models = _.isArray(models) ? models.slice() : [models];
      options || (options = {});
      var i, l, index, model;
      for (i = 0, l = models.length; i < l; i++) {
        model = this.get(models[i]);
        if (!model) continue;
        delete this._byId[model.id];
        delete this._byId[model.cid];
        index = this.indexOf(model);
        this.models.splice(index, 1);
        this.length--;
        if (!options.silent) {
          options.index = index;
          model.trigger('remove', model, this, options);
        }
        this._removeReference(model);
      }
      return this;
    },

    // Update a collection by `set`-ing a new list of models, adding new ones,
    // removing models that are no longer present, and merging models that
    // already exist in the collection, as necessary. Similar to **Model#set**,
    // the core operation for updating the data contained by the collection.
    set: function(models, options) {
      options = _.defaults(options || {}, setOptions);
      if (options.parse) models = this.parse(models, options);
      if (!_.isArray(models)) models = models ? [models] : [];
      var i, l, model, attrs, existing, sort;
      var at = options.at;
      var sortable = this.comparator && (at == null) && options.sort !== false;
      var sortAttr = _.isString(this.comparator) ? this.comparator : null;
      var toAdd = [], toRemove = [], modelMap = {};

      // Turn bare objects into model references, and prevent invalid models
      // from being added.
      for (i = 0, l = models.length; i < l; i++) {
        if (!(model = this._prepareModel(models[i], options))) continue;

        // If a duplicate is found, prevent it from being added and
        // optionally merge it into the existing model.
        if (existing = this.get(model)) {
          if (options.remove) modelMap[existing.cid] = true;
          if (options.merge) {
            existing.set(model.attributes, options);
            if (sortable && !sort && existing.hasChanged(sortAttr)) sort = true;
          }

        // This is a new model, push it to the `toAdd` list.
        } else if (options.add) {
          toAdd.push(model);

          // Listen to added models' events, and index models for lookup by
          // `id` and by `cid`.
          model.on('all', this._onModelEvent, this);
          this._byId[model.cid] = model;
          if (model.id != null) this._byId[model.id] = model;
        }
      }

      // Remove nonexistent models if appropriate.
      if (options.remove) {
        for (i = 0, l = this.length; i < l; ++i) {
          if (!modelMap[(model = this.models[i]).cid]) toRemove.push(model);
        }
        if (toRemove.length) this.remove(toRemove, options);
      }

      // See if sorting is needed, update `length` and splice in new models.
      if (toAdd.length) {
        if (sortable) sort = true;
        this.length += toAdd.length;
        if (at != null) {
          splice.apply(this.models, [at, 0].concat(toAdd));
        } else {
          push.apply(this.models, toAdd);
        }
      }

      // Silently sort the collection if appropriate.
      if (sort) this.sort({silent: true});

      if (options.silent) return this;

      // Trigger `add` events.
      for (i = 0, l = toAdd.length; i < l; i++) {
        (model = toAdd[i]).trigger('add', model, this, options);
      }

      // Trigger `sort` if the collection was sorted.
      if (sort) this.trigger('sort', this, options);
      return this;
    },

    // When you have more items than you want to add or remove individually,
    // you can reset the entire set with a new list of models, without firing
    // any granular `add` or `remove` events. Fires `reset` when finished.
    // Useful for bulk operations and optimizations.
    reset: function(models, options) {
      options || (options = {});
      for (var i = 0, l = this.models.length; i < l; i++) {
        this._removeReference(this.models[i]);
      }
      options.previousModels = this.models;
      this._reset();
      this.add(models, _.extend({silent: true}, options));
      if (!options.silent) this.trigger('reset', this, options);
      return this;
    },

    // Add a model to the end of the collection.
    push: function(model, options) {
      model = this._prepareModel(model, options);
      this.add(model, _.extend({at: this.length}, options));
      return model;
    },

    // Remove a model from the end of the collection.
    pop: function(options) {
      var model = this.at(this.length - 1);
      this.remove(model, options);
      return model;
    },

    // Add a model to the beginning of the collection.
    unshift: function(model, options) {
      model = this._prepareModel(model, options);
      this.add(model, _.extend({at: 0}, options));
      return model;
    },

    // Remove a model from the beginning of the collection.
    shift: function(options) {
      var model = this.at(0);
      this.remove(model, options);
      return model;
    },

    // Slice out a sub-array of models from the collection.
    slice: function(begin, end) {
      return this.models.slice(begin, end);
    },

    // Get a model from the set by id.
    get: function(obj) {
      if (obj == null) return void 0;
      return this._byId[obj.id != null ? obj.id : obj.cid || obj];
    },

    // Get the model at the given index.
    at: function(index) {
      return this.models[index];
    },

    // Return models with matching attributes. Useful for simple cases of
    // `filter`.
    where: function(attrs, first) {
      if (_.isEmpty(attrs)) return first ? void 0 : [];
      return this[first ? 'find' : 'filter'](function(model) {
        for (var key in attrs) {
          if (attrs[key] !== model.get(key)) return false;
        }
        return true;
      });
    },

    // Return the first model with matching attributes. Useful for simple cases
    // of `find`.
    findWhere: function(attrs) {
      return this.where(attrs, true);
    },

    // Force the collection to re-sort itself. You don't need to call this under
    // normal circumstances, as the set will maintain sort order as each item
    // is added.
    sort: function(options) {
      if (!this.comparator) throw new Error('Cannot sort a set without a comparator');
      options || (options = {});

      // Run sort based on type of `comparator`.
      if (_.isString(this.comparator) || this.comparator.length === 1) {
        this.models = this.sortBy(this.comparator, this);
      } else {
        this.models.sort(_.bind(this.comparator, this));
      }

      if (!options.silent) this.trigger('sort', this, options);
      return this;
    },

    // Figure out the smallest index at which a model should be inserted so as
    // to maintain order.
    sortedIndex: function(model, value, context) {
      value || (value = this.comparator);
      var iterator = _.isFunction(value) ? value : function(model) {
        return model.get(value);
      };
      return _.sortedIndex(this.models, model, iterator, context);
    },

    // Pluck an attribute from each model in the collection.
    pluck: function(attr) {
      return _.invoke(this.models, 'get', attr);
    },

    // Fetch the default set of models for this collection, resetting the
    // collection when they arrive. If `reset: true` is passed, the response
    // data will be passed through the `reset` method instead of `set`.
    fetch: function(options) {
      options = options ? _.clone(options) : {};
      if (options.parse === void 0) options.parse = true;
      var success = options.success;
      var collection = this;
      options.success = function(resp) {
        var method = options.reset ? 'reset' : 'set';
        collection[method](resp, options);
        if (success) success(collection, resp, options);
        collection.trigger('sync', collection, resp, options);
      };
      wrapError(this, options);
      return this.sync('read', this, options);
    },

    // Create a new instance of a model in this collection. Add the model to the
    // collection immediately, unless `wait: true` is passed, in which case we
    // wait for the server to agree.
    create: function(model, options) {
      options = options ? _.clone(options) : {};
      if (!(model = this._prepareModel(model, options))) return false;
      if (!options.wait) this.add(model, options);
      var collection = this;
      var success = options.success;
      options.success = function(resp) {
        if (options.wait) collection.add(model, options);
        if (success) success(model, resp, options);
      };
      model.save(null, options);
      return model;
    },

    // **parse** converts a response into a list of models to be added to the
    // collection. The default implementation is just to pass it through.
    parse: function(resp, options) {
      return resp;
    },

    // Create a new collection with an identical list of models as this one.
    clone: function() {
      return new this.constructor(this.models);
    },

    // Private method to reset all internal state. Called when the collection
    // is first initialized or reset.
    _reset: function() {
      this.length = 0;
      this.models = [];
      this._byId  = {};
    },

    // Prepare a hash of attributes (or other model) to be added to this
    // collection.
    _prepareModel: function(attrs, options) {
      if (attrs instanceof Model) {
        if (!attrs.collection) attrs.collection = this;
        return attrs;
      }
      options || (options = {});
      options.collection = this;
      var model = new this.model(attrs, options);
      if (!model._validate(attrs, options)) {
        this.trigger('invalid', this, attrs, options);
        return false;
      }
      return model;
    },

    // Internal method to sever a model's ties to a collection.
    _removeReference: function(model) {
      if (this === model.collection) delete model.collection;
      model.off('all', this._onModelEvent, this);
    },

    // Internal method called every time a model in the set fires an event.
    // Sets need to update their indexes when models change ids. All other
    // events simply proxy through. "add" and "remove" events that originate
    // in other collections are ignored.
    _onModelEvent: function(event, model, collection, options) {
      if ((event === 'add' || event === 'remove') && collection !== this) return;
      if (event === 'destroy') this.remove(model, options);
      if (model && event === 'change:' + model.idAttribute) {
        delete this._byId[model.previous(model.idAttribute)];
        if (model.id != null) this._byId[model.id] = model;
      }
      this.trigger.apply(this, arguments);
    }

  });

  // Underscore methods that we want to implement on the Collection.
  // 90% of the core usefulness of Backbone Collections is actually implemented
  // right here:
  var methods = ['forEach', 'each', 'map', 'collect', 'reduce', 'foldl',
    'inject', 'reduceRight', 'foldr', 'find', 'detect', 'filter', 'select',
    'reject', 'every', 'all', 'some', 'any', 'include', 'contains', 'invoke',
    'max', 'min', 'toArray', 'size', 'first', 'head', 'take', 'initial', 'rest',
    'tail', 'drop', 'last', 'without', 'indexOf', 'shuffle', 'lastIndexOf',
    'isEmpty', 'chain'];

  // Mix in each Underscore method as a proxy to `Collection#models`.
  _.each(methods, function(method) {
    Collection.prototype[method] = function() {
      var args = slice.call(arguments);
      args.unshift(this.models);
      return _[method].apply(_, args);
    };
  });

  // Underscore methods that take a property name as an argument.
  var attributeMethods = ['groupBy', 'countBy', 'sortBy'];

  // Use attributes instead of properties.
  _.each(attributeMethods, function(method) {
    Collection.prototype[method] = function(value, context) {
      var iterator = _.isFunction(value) ? value : function(model) {
        return model.get(value);
      };
      return _[method](this.models, iterator, context);
    };
  });

  // Backbone.View
  // -------------

  // Backbone Views are almost more convention than they are actual code. A View
  // is simply a JavaScript object that represents a logical chunk of UI in the
  // DOM. This might be a single item, an entire list, a sidebar or panel, or
  // even the surrounding frame which wraps your whole app. Defining a chunk of
  // UI as a **View** allows you to define your DOM events declaratively, without
  // having to worry about render order ... and makes it easy for the view to
  // react to specific changes in the state of your models.

  // Creating a Backbone.View creates its initial element outside of the DOM,
  // if an existing element is not provided...
  var View = Backbone.View = function(options) {
    this.cid = _.uniqueId('view');
    this._configure(options || {});
    this._ensureElement();
    this.initialize.apply(this, arguments);
    this.delegateEvents();
  };

  // Cached regex to split keys for `delegate`.
  var delegateEventSplitter = /^(\S+)\s*(.*)$/;

  // List of view options to be merged as properties.
  var viewOptions = ['model', 'collection', 'el', 'id', 'attributes', 'className', 'tagName', 'events'];

  // Set up all inheritable **Backbone.View** properties and methods.
  _.extend(View.prototype, Events, {

    // The default `tagName` of a View's element is `"div"`.
    tagName: 'div',

    // jQuery delegate for element lookup, scoped to DOM elements within the
    // current view. This should be prefered to global lookups where possible.
    $: function(selector) {
      return this.$el.find(selector);
    },

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // **render** is the core function that your view should override, in order
    // to populate its element (`this.el`), with the appropriate HTML. The
    // convention is for **render** to always return `this`.
    render: function() {
      return this;
    },

    // Remove this view by taking the element out of the DOM, and removing any
    // applicable Backbone.Events listeners.
    remove: function() {
      this.$el.remove();
      this.stopListening();
      return this;
    },

    // Change the view's element (`this.el` property), including event
    // re-delegation.
    setElement: function(element, delegate) {
      if (this.$el) this.undelegateEvents();
      this.$el = element instanceof Backbone.$ ? element : Backbone.$(element);
      this.el = this.$el[0];
      if (delegate !== false) this.delegateEvents();
      return this;
    },

    // Set callbacks, where `this.events` is a hash of
    //
    // *{"event selector": "callback"}*
    //
    //     {
    //       'mousedown .title':  'edit',
    //       'click .button':     'save'
    //       'click .open':       function(e) { ... }
    //     }
    //
    // pairs. Callbacks will be bound to the view, with `this` set properly.
    // Uses event delegation for efficiency.
    // Omitting the selector binds the event to `this.el`.
    // This only works for delegate-able events: not `focus`, `blur`, and
    // not `change`, `submit`, and `reset` in Internet Explorer.
    delegateEvents: function(events) {
      if (!(events || (events = _.result(this, 'events')))) return this;
      this.undelegateEvents();
      for (var key in events) {
        var method = events[key];
        if (!_.isFunction(method)) method = this[events[key]];
        if (!method) continue;

        var match = key.match(delegateEventSplitter);
        var eventName = match[1], selector = match[2];
        method = _.bind(method, this);
        eventName += '.delegateEvents' + this.cid;
        if (selector === '') {
          this.$el.on(eventName, method);
        } else {
          this.$el.on(eventName, selector, method);
        }
      }
      return this;
    },

    // Clears all callbacks previously bound to the view with `delegateEvents`.
    // You usually don't need to use this, but may wish to if you have multiple
    // Backbone views attached to the same DOM element.
    undelegateEvents: function() {
      this.$el.off('.delegateEvents' + this.cid);
      return this;
    },

    // Performs the initial configuration of a View with a set of options.
    // Keys with special meaning *(e.g. model, collection, id, className)* are
    // attached directly to the view.  See `viewOptions` for an exhaustive
    // list.
    _configure: function(options) {
      if (this.options) options = _.extend({}, _.result(this, 'options'), options);
      _.extend(this, _.pick(options, viewOptions));
      this.options = options;
    },

    // Ensure that the View has a DOM element to render into.
    // If `this.el` is a string, pass it through `$()`, take the first
    // matching element, and re-assign it to `el`. Otherwise, create
    // an element from the `id`, `className` and `tagName` properties.
    _ensureElement: function() {
      if (!this.el) {
        var attrs = _.extend({}, _.result(this, 'attributes'));
        if (this.id) attrs.id = _.result(this, 'id');
        if (this.className) attrs['class'] = _.result(this, 'className');
        var $el = Backbone.$('<' + _.result(this, 'tagName') + '>').attr(attrs);
        this.setElement($el, false);
      } else {
        this.setElement(_.result(this, 'el'), false);
      }
    }

  });

  // Backbone.sync
  // -------------

  // Override this function to change the manner in which Backbone persists
  // models to the server. You will be passed the type of request, and the
  // model in question. By default, makes a RESTful Ajax request
  // to the model's `url()`. Some possible customizations could be:
  //
  // * Use `setTimeout` to batch rapid-fire updates into a single request.
  // * Send up the models as XML instead of JSON.
  // * Persist models via WebSockets instead of Ajax.
  //
  // Turn on `Backbone.emulateHTTP` in order to send `PUT` and `DELETE` requests
  // as `POST`, with a `_method` parameter containing the true HTTP method,
  // as well as all requests with the body as `application/x-www-form-urlencoded`
  // instead of `application/json` with the model in a param named `model`.
  // Useful when interfacing with server-side languages like **PHP** that make
  // it difficult to read the body of `PUT` requests.
  Backbone.sync = function(method, model, options) {
    var type = methodMap[method];

    // Default options, unless specified.
    _.defaults(options || (options = {}), {
      emulateHTTP: Backbone.emulateHTTP,
      emulateJSON: Backbone.emulateJSON
    });

    // Default JSON-request options.
    var params = {type: type, dataType: 'json'};

    // Ensure that we have a URL.
    if (!options.url) {
      params.url = _.result(model, 'url') || urlError();
    }

    // Ensure that we have the appropriate request data.
    if (options.data == null && model && (method === 'create' || method === 'update' || method === 'patch')) {
      params.contentType = 'application/json';
      params.data = JSON.stringify(options.attrs || model.toJSON(options));
    }

    // For older servers, emulate JSON by encoding the request into an HTML-form.
    if (options.emulateJSON) {
      params.contentType = 'application/x-www-form-urlencoded';
      params.data = params.data ? {model: params.data} : {};
    }

    // For older servers, emulate HTTP by mimicking the HTTP method with `_method`
    // And an `X-HTTP-Method-Override` header.
    if (options.emulateHTTP && (type === 'PUT' || type === 'DELETE' || type === 'PATCH')) {
      params.type = 'POST';
      if (options.emulateJSON) params.data._method = type;
      var beforeSend = options.beforeSend;
      options.beforeSend = function(xhr) {
        xhr.setRequestHeader('X-HTTP-Method-Override', type);
        if (beforeSend) return beforeSend.apply(this, arguments);
      };
    }

    // Don't process data on a non-GET request.
    if (params.type !== 'GET' && !options.emulateJSON) {
      params.processData = false;
    }

    // If we're sending a `PATCH` request, and we're in an old Internet Explorer
    // that still has ActiveX enabled by default, override jQuery to use that
    // for XHR instead. Remove this line when jQuery supports `PATCH` on IE8.
    if (params.type === 'PATCH' && window.ActiveXObject &&
          !(window.external && window.external.msActiveXFilteringEnabled)) {
      params.xhr = function() {
        return new ActiveXObject("Microsoft.XMLHTTP");
      };
    }

    // Make the request, allowing the user to override any Ajax options.
    var xhr = options.xhr = Backbone.ajax(_.extend(params, options));
    model.trigger('request', model, xhr, options);
    return xhr;
  };

  // Map from CRUD to HTTP for our default `Backbone.sync` implementation.
  var methodMap = {
    'create': 'POST',
    'update': 'PUT',
    'patch':  'PATCH',
    'delete': 'DELETE',
    'read':   'GET'
  };

  // Set the default implementation of `Backbone.ajax` to proxy through to `$`.
  // Override this if you'd like to use a different library.
  Backbone.ajax = function() {
    return Backbone.$.ajax.apply(Backbone.$, arguments);
  };

  // Backbone.Router
  // ---------------

  // Routers map faux-URLs to actions, and fire events when routes are
  // matched. Creating a new one sets its `routes` hash, if not set statically.
  var Router = Backbone.Router = function(options) {
    options || (options = {});
    if (options.routes) this.routes = options.routes;
    this._bindRoutes();
    this.initialize.apply(this, arguments);
  };

  // Cached regular expressions for matching named param parts and splatted
  // parts of route strings.
  var optionalParam = /\((.*?)\)/g;
  var namedParam    = /(\(\?)?:\w+/g;
  var splatParam    = /\*\w+/g;
  var escapeRegExp  = /[\-{}\[\]+?.,\\\^$|#\s]/g;

  // Set up all inheritable **Backbone.Router** properties and methods.
  _.extend(Router.prototype, Events, {

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // Manually bind a single named route to a callback. For example:
    //
    //     this.route('search/:query/p:num', 'search', function(query, num) {
    //       ...
    //     });
    //
    route: function(route, name, callback) {
      if (!_.isRegExp(route)) route = this._routeToRegExp(route);
      if (_.isFunction(name)) {
        callback = name;
        name = '';
      }
      if (!callback) callback = this[name];
      var router = this;
      Backbone.history.route(route, function(fragment) {
        var args = router._extractParameters(route, fragment);
        callback && callback.apply(router, args);
        router.trigger.apply(router, ['route:' + name].concat(args));
        router.trigger('route', name, args);
        Backbone.history.trigger('route', router, name, args);
      });
      return this;
    },

    // Simple proxy to `Backbone.history` to save a fragment into the history.
    navigate: function(fragment, options) {
      Backbone.history.navigate(fragment, options);
      return this;
    },

    // Bind all defined routes to `Backbone.history`. We have to reverse the
    // order of the routes here to support behavior where the most general
    // routes can be defined at the bottom of the route map.
    _bindRoutes: function() {
      if (!this.routes) return;
      this.routes = _.result(this, 'routes');
      var route, routes = _.keys(this.routes);
      while ((route = routes.pop()) != null) {
        this.route(route, this.routes[route]);
      }
    },

    // Convert a route string into a regular expression, suitable for matching
    // against the current location hash.
    _routeToRegExp: function(route) {
      route = route.replace(escapeRegExp, '\\$&')
                   .replace(optionalParam, '(?:$1)?')
                   .replace(namedParam, function(match, optional){
                     return optional ? match : '([^\/]+)';
                   })
                   .replace(splatParam, '(.*?)');
      return new RegExp('^' + route + '$');
    },

    // Given a route, and a URL fragment that it matches, return the array of
    // extracted decoded parameters. Empty or unmatched parameters will be
    // treated as `null` to normalize cross-browser behavior.
    _extractParameters: function(route, fragment) {
      var params = route.exec(fragment).slice(1);
      return _.map(params, function(param) {
        return param ? decodeURIComponent(param) : null;
      });
    }

  });

  // Backbone.History
  // ----------------

  // Handles cross-browser history management, based on either
  // [pushState](http://diveintohtml5.info/history.html) and real URLs, or
  // [onhashchange](https://developer.mozilla.org/en-US/docs/DOM/window.onhashchange)
  // and URL fragments. If the browser supports neither (old IE, natch),
  // falls back to polling.
  var History = Backbone.History = function() {
    this.handlers = [];
    _.bindAll(this, 'checkUrl');

    // Ensure that `History` can be used outside of the browser.
    if (typeof window !== 'undefined') {
      this.location = window.location;
      this.history = window.history;
    }
  };

  // Cached regex for stripping a leading hash/slash and trailing space.
  var routeStripper = /^[#\/]|\s+$/g;

  // Cached regex for stripping leading and trailing slashes.
  var rootStripper = /^\/+|\/+$/g;

  // Cached regex for detecting MSIE.
  var isExplorer = /msie [\w.]+/;

  // Cached regex for removing a trailing slash.
  var trailingSlash = /\/$/;

  // Has the history handling already been started?
  History.started = false;

  // Set up all inheritable **Backbone.History** properties and methods.
  _.extend(History.prototype, Events, {

    // The default interval to poll for hash changes, if necessary, is
    // twenty times a second.
    interval: 50,

    // Gets the true hash value. Cannot use location.hash directly due to bug
    // in Firefox where location.hash will always be decoded.
    getHash: function(window) {
      var match = (window || this).location.href.match(/#(.*)$/);
      return match ? match[1] : '';
    },

    // Get the cross-browser normalized URL fragment, either from the URL,
    // the hash, or the override.
    getFragment: function(fragment, forcePushState) {
      if (fragment == null) {
        if (this._hasPushState || !this._wantsHashChange || forcePushState) {
          fragment = this.location.pathname;
          var root = this.root.replace(trailingSlash, '');
          if (!fragment.indexOf(root)) fragment = fragment.substr(root.length);
        } else {
          fragment = this.getHash();
        }
      }
      return fragment.replace(routeStripper, '');
    },

    // Start the hash change handling, returning `true` if the current URL matches
    // an existing route, and `false` otherwise.
    start: function(options) {
      if (History.started) throw new Error("Backbone.history has already been started");
      History.started = true;

      // Figure out the initial configuration. Do we need an iframe?
      // Is pushState desired ... is it available?
      this.options          = _.extend({}, {root: '/'}, this.options, options);
      this.root             = this.options.root;
      this._wantsHashChange = this.options.hashChange !== false;
      this._wantsPushState  = !!this.options.pushState;
      this._hasPushState    = !!(this.options.pushState && this.history && this.history.pushState);
      var fragment          = this.getFragment();
      var docMode           = document.documentMode;
      var oldIE             = (isExplorer.exec(navigator.userAgent.toLowerCase()) && (!docMode || docMode <= 7));

      // Normalize root to always include a leading and trailing slash.
      this.root = ('/' + this.root + '/').replace(rootStripper, '/');

      if (oldIE && this._wantsHashChange) {
        this.iframe = Backbone.$('<iframe src="javascript:0" tabindex="-1" />').hide().appendTo('body')[0].contentWindow;
        this.navigate(fragment);
      }

      // Depending on whether we're using pushState or hashes, and whether
      // 'onhashchange' is supported, determine how we check the URL state.
      if (this._hasPushState) {
        Backbone.$(window).on('popstate', this.checkUrl);
      } else if (this._wantsHashChange && ('onhashchange' in window) && !oldIE) {
        Backbone.$(window).on('hashchange', this.checkUrl);
      } else if (this._wantsHashChange) {
        this._checkUrlInterval = setInterval(this.checkUrl, this.interval);
      }

      // Determine if we need to change the base url, for a pushState link
      // opened by a non-pushState browser.
      this.fragment = fragment;
      var loc = this.location;
      var atRoot = loc.pathname.replace(/[^\/]$/, '$&/') === this.root;

      // If we've started off with a route from a `pushState`-enabled browser,
      // but we're currently in a browser that doesn't support it...
      if (this._wantsHashChange && this._wantsPushState && !this._hasPushState && !atRoot) {
        this.fragment = this.getFragment(null, true);
        this.location.replace(this.root + this.location.search + '#' + this.fragment);
        // Return immediately as browser will do redirect to new url
        return true;

      // Or if we've started out with a hash-based route, but we're currently
      // in a browser where it could be `pushState`-based instead...
      } else if (this._wantsPushState && this._hasPushState && atRoot && loc.hash) {
        this.fragment = this.getHash().replace(routeStripper, '');
        this.history.replaceState({}, document.title, this.root + this.fragment + loc.search);
      }

      if (!this.options.silent) return this.loadUrl();
    },

    // Disable Backbone.history, perhaps temporarily. Not useful in a real app,
    // but possibly useful for unit testing Routers.
    stop: function() {
      Backbone.$(window).off('popstate', this.checkUrl).off('hashchange', this.checkUrl);
      clearInterval(this._checkUrlInterval);
      History.started = false;
    },

    // Add a route to be tested when the fragment changes. Routes added later
    // may override previous routes.
    route: function(route, callback) {
      this.handlers.unshift({route: route, callback: callback});
    },

    // Checks the current URL to see if it has changed, and if it has,
    // calls `loadUrl`, normalizing across the hidden iframe.
    checkUrl: function(e) {
      var current = this.getFragment();
      if (current === this.fragment && this.iframe) {
        current = this.getFragment(this.getHash(this.iframe));
      }
      if (current === this.fragment) return false;
      if (this.iframe) this.navigate(current);
      this.loadUrl() || this.loadUrl(this.getHash());
    },

    // Attempt to load the current URL fragment. If a route succeeds with a
    // match, returns `true`. If no defined routes matches the fragment,
    // returns `false`.
    loadUrl: function(fragmentOverride) {
      var fragment = this.fragment = this.getFragment(fragmentOverride);
      var matched = _.any(this.handlers, function(handler) {
        if (handler.route.test(fragment)) {
          handler.callback(fragment);
          return true;
        }
      });
      return matched;
    },

    // Save a fragment into the hash history, or replace the URL state if the
    // 'replace' option is passed. You are responsible for properly URL-encoding
    // the fragment in advance.
    //
    // The options object can contain `trigger: true` if you wish to have the
    // route callback be fired (not usually desirable), or `replace: true`, if
    // you wish to modify the current URL without adding an entry to the history.
    navigate: function(fragment, options) {
      if (!History.started) return false;
      if (!options || options === true) options = {trigger: options};
      fragment = this.getFragment(fragment || '');
      if (this.fragment === fragment) return;
      this.fragment = fragment;
      var url = this.root + fragment;

      // If pushState is available, we use it to set the fragment as a real URL.
      if (this._hasPushState) {
        this.history[options.replace ? 'replaceState' : 'pushState']({}, document.title, url);

      // If hash changes haven't been explicitly disabled, update the hash
      // fragment to store history.
      } else if (this._wantsHashChange) {
        this._updateHash(this.location, fragment, options.replace);
        if (this.iframe && (fragment !== this.getFragment(this.getHash(this.iframe)))) {
          // Opening and closing the iframe tricks IE7 and earlier to push a
          // history entry on hash-tag change.  When replace is true, we don't
          // want this.
          if(!options.replace) this.iframe.document.open().close();
          this._updateHash(this.iframe.location, fragment, options.replace);
        }

      // If you've told us that you explicitly don't want fallback hashchange-
      // based history, then `navigate` becomes a page refresh.
      } else {
        return this.location.assign(url);
      }
      if (options.trigger) this.loadUrl(fragment);
    },

    // Update the hash location, either replacing the current entry, or adding
    // a new one to the browser history.
    _updateHash: function(location, fragment, replace) {
      if (replace) {
        var href = location.href.replace(/(javascript:|#).*$/, '');
        location.replace(href + '#' + fragment);
      } else {
        // Some browsers require that `hash` contains a leading #.
        location.hash = '#' + fragment;
      }
    }

  });

  // Create the default Backbone.history.
  Backbone.history = new History;

  // Helpers
  // -------

  // Helper function to correctly set up the prototype chain, for subclasses.
  // Similar to `goog.inherits`, but uses a hash of prototype properties and
  // class properties to be extended.
  var extend = function(protoProps, staticProps) {
    var parent = this;
    var child;

    // The constructor function for the new subclass is either defined by you
    // (the "constructor" property in your `extend` definition), or defaulted
    // by us to simply call the parent's constructor.
    if (protoProps && _.has(protoProps, 'constructor')) {
      child = protoProps.constructor;
    } else {
      child = function(){ return parent.apply(this, arguments); };
    }

    // Add static properties to the constructor function, if supplied.
    _.extend(child, parent, staticProps);

    // Set the prototype chain to inherit from `parent`, without calling
    // `parent`'s constructor function.
    var Surrogate = function(){ this.constructor = child; };
    Surrogate.prototype = parent.prototype;
    child.prototype = new Surrogate;

    // Add prototype properties (instance properties) to the subclass,
    // if supplied.
    if (protoProps) _.extend(child.prototype, protoProps);

    // Set a convenience property in case the parent's prototype is needed
    // later.
    child.__super__ = parent.prototype;

    return child;
  };

  // Set up inheritance for the model, collection, router, view and history.
  Model.extend = Collection.extend = Router.extend = View.extend = History.extend = extend;

  // Throw an error when a URL is needed, and none is supplied.
  var urlError = function() {
    throw new Error('A "url" property or function must be specified');
  };

  // Wrap an optional error callback with a fallback error event.
  var wrapError = function (model, options) {
    var error = options.error;
    options.error = function(resp) {
      if (error) error(model, resp, options);
      model.trigger('error', model, resp, options);
    };
  };

}).call(this);

},{"underscore":89}],2:[function(require,module,exports){

},{}],3:[function(require,module,exports){
arguments[4][1][0].apply(exports,arguments)
},{"underscore":15}],4:[function(require,module,exports){
module.exports=require(1)
},{"underscore":6}],5:[function(require,module,exports){
/*!
 * jQuery JavaScript Library v2.1.0
 * http://jquery.com/
 *
 * Includes Sizzle.js
 * http://sizzlejs.com/
 *
 * Copyright 2005, 2014 jQuery Foundation, Inc. and other contributors
 * Released under the MIT license
 * http://jquery.org/license
 *
 * Date: 2014-01-23T21:10Z
 */

(function( global, factory ) {

	if ( typeof module === "object" && typeof module.exports === "object" ) {
		// For CommonJS and CommonJS-like environments where a proper window is present,
		// execute the factory and get jQuery
		// For environments that do not inherently posses a window with a document
		// (such as Node.js), expose a jQuery-making factory as module.exports
		// This accentuates the need for the creation of a real window
		// e.g. var jQuery = require("jquery")(window);
		// See ticket #14549 for more info
		module.exports = global.document ?
			factory( global, true ) :
			function( w ) {
				if ( !w.document ) {
					throw new Error( "jQuery requires a window with a document" );
				}
				return factory( w );
			};
	} else {
		factory( global );
	}

// Pass this if window is not defined yet
}(typeof window !== "undefined" ? window : this, function( window, noGlobal ) {

// Can't do this because several apps including ASP.NET trace
// the stack via arguments.caller.callee and Firefox dies if
// you try to trace through "use strict" call chains. (#13335)
// Support: Firefox 18+
//

var arr = [];

var slice = arr.slice;

var concat = arr.concat;

var push = arr.push;

var indexOf = arr.indexOf;

var class2type = {};

var toString = class2type.toString;

var hasOwn = class2type.hasOwnProperty;

var trim = "".trim;

var support = {};



var
	// Use the correct document accordingly with window argument (sandbox)
	document = window.document,

	version = "2.1.0",

	// Define a local copy of jQuery
	jQuery = function( selector, context ) {
		// The jQuery object is actually just the init constructor 'enhanced'
		// Need init if jQuery is called (just allow error to be thrown if not included)
		return new jQuery.fn.init( selector, context );
	},

	// Matches dashed string for camelizing
	rmsPrefix = /^-ms-/,
	rdashAlpha = /-([\da-z])/gi,

	// Used by jQuery.camelCase as callback to replace()
	fcamelCase = function( all, letter ) {
		return letter.toUpperCase();
	};

jQuery.fn = jQuery.prototype = {
	// The current version of jQuery being used
	jquery: version,

	constructor: jQuery,

	// Start with an empty selector
	selector: "",

	// The default length of a jQuery object is 0
	length: 0,

	toArray: function() {
		return slice.call( this );
	},

	// Get the Nth element in the matched element set OR
	// Get the whole matched element set as a clean array
	get: function( num ) {
		return num != null ?

			// Return a 'clean' array
			( num < 0 ? this[ num + this.length ] : this[ num ] ) :

			// Return just the object
			slice.call( this );
	},

	// Take an array of elements and push it onto the stack
	// (returning the new matched element set)
	pushStack: function( elems ) {

		// Build a new jQuery matched element set
		var ret = jQuery.merge( this.constructor(), elems );

		// Add the old object onto the stack (as a reference)
		ret.prevObject = this;
		ret.context = this.context;

		// Return the newly-formed element set
		return ret;
	},

	// Execute a callback for every element in the matched set.
	// (You can seed the arguments with an array of args, but this is
	// only used internally.)
	each: function( callback, args ) {
		return jQuery.each( this, callback, args );
	},

	map: function( callback ) {
		return this.pushStack( jQuery.map(this, function( elem, i ) {
			return callback.call( elem, i, elem );
		}));
	},

	slice: function() {
		return this.pushStack( slice.apply( this, arguments ) );
	},

	first: function() {
		return this.eq( 0 );
	},

	last: function() {
		return this.eq( -1 );
	},

	eq: function( i ) {
		var len = this.length,
			j = +i + ( i < 0 ? len : 0 );
		return this.pushStack( j >= 0 && j < len ? [ this[j] ] : [] );
	},

	end: function() {
		return this.prevObject || this.constructor(null);
	},

	// For internal use only.
	// Behaves like an Array's method, not like a jQuery method.
	push: push,
	sort: arr.sort,
	splice: arr.splice
};

jQuery.extend = jQuery.fn.extend = function() {
	var options, name, src, copy, copyIsArray, clone,
		target = arguments[0] || {},
		i = 1,
		length = arguments.length,
		deep = false;

	// Handle a deep copy situation
	if ( typeof target === "boolean" ) {
		deep = target;

		// skip the boolean and the target
		target = arguments[ i ] || {};
		i++;
	}

	// Handle case when target is a string or something (possible in deep copy)
	if ( typeof target !== "object" && !jQuery.isFunction(target) ) {
		target = {};
	}

	// extend jQuery itself if only one argument is passed
	if ( i === length ) {
		target = this;
		i--;
	}

	for ( ; i < length; i++ ) {
		// Only deal with non-null/undefined values
		if ( (options = arguments[ i ]) != null ) {
			// Extend the base object
			for ( name in options ) {
				src = target[ name ];
				copy = options[ name ];

				// Prevent never-ending loop
				if ( target === copy ) {
					continue;
				}

				// Recurse if we're merging plain objects or arrays
				if ( deep && copy && ( jQuery.isPlainObject(copy) || (copyIsArray = jQuery.isArray(copy)) ) ) {
					if ( copyIsArray ) {
						copyIsArray = false;
						clone = src && jQuery.isArray(src) ? src : [];

					} else {
						clone = src && jQuery.isPlainObject(src) ? src : {};
					}

					// Never move original objects, clone them
					target[ name ] = jQuery.extend( deep, clone, copy );

				// Don't bring in undefined values
				} else if ( copy !== undefined ) {
					target[ name ] = copy;
				}
			}
		}
	}

	// Return the modified object
	return target;
};

jQuery.extend({
	// Unique for each copy of jQuery on the page
	expando: "jQuery" + ( version + Math.random() ).replace( /\D/g, "" ),

	// Assume jQuery is ready without the ready module
	isReady: true,

	error: function( msg ) {
		throw new Error( msg );
	},

	noop: function() {},

	// See test/unit/core.js for details concerning isFunction.
	// Since version 1.3, DOM methods and functions like alert
	// aren't supported. They return false on IE (#2968).
	isFunction: function( obj ) {
		return jQuery.type(obj) === "function";
	},

	isArray: Array.isArray,

	isWindow: function( obj ) {
		return obj != null && obj === obj.window;
	},

	isNumeric: function( obj ) {
		// parseFloat NaNs numeric-cast false positives (null|true|false|"")
		// ...but misinterprets leading-number strings, particularly hex literals ("0x...")
		// subtraction forces infinities to NaN
		return obj - parseFloat( obj ) >= 0;
	},

	isPlainObject: function( obj ) {
		// Not plain objects:
		// - Any object or value whose internal [[Class]] property is not "[object Object]"
		// - DOM nodes
		// - window
		if ( jQuery.type( obj ) !== "object" || obj.nodeType || jQuery.isWindow( obj ) ) {
			return false;
		}

		// Support: Firefox <20
		// The try/catch suppresses exceptions thrown when attempting to access
		// the "constructor" property of certain host objects, ie. |window.location|
		// https://bugzilla.mozilla.org/show_bug.cgi?id=814622
		try {
			if ( obj.constructor &&
					!hasOwn.call( obj.constructor.prototype, "isPrototypeOf" ) ) {
				return false;
			}
		} catch ( e ) {
			return false;
		}

		// If the function hasn't returned already, we're confident that
		// |obj| is a plain object, created by {} or constructed with new Object
		return true;
	},

	isEmptyObject: function( obj ) {
		var name;
		for ( name in obj ) {
			return false;
		}
		return true;
	},

	type: function( obj ) {
		if ( obj == null ) {
			return obj + "";
		}
		// Support: Android < 4.0, iOS < 6 (functionish RegExp)
		return typeof obj === "object" || typeof obj === "function" ?
			class2type[ toString.call(obj) ] || "object" :
			typeof obj;
	},

	// Evaluates a script in a global context
	globalEval: function( code ) {
		var script,
			indirect = eval;

		code = jQuery.trim( code );

		if ( code ) {
			// If the code includes a valid, prologue position
			// strict mode pragma, execute code by injecting a
			// script tag into the document.
			if ( code.indexOf("use strict") === 1 ) {
				script = document.createElement("script");
				script.text = code;
				document.head.appendChild( script ).parentNode.removeChild( script );
			} else {
			// Otherwise, avoid the DOM node creation, insertion
			// and removal by using an indirect global eval
				indirect( code );
			}
		}
	},

	// Convert dashed to camelCase; used by the css and data modules
	// Microsoft forgot to hump their vendor prefix (#9572)
	camelCase: function( string ) {
		return string.replace( rmsPrefix, "ms-" ).replace( rdashAlpha, fcamelCase );
	},

	nodeName: function( elem, name ) {
		return elem.nodeName && elem.nodeName.toLowerCase() === name.toLowerCase();
	},

	// args is for internal usage only
	each: function( obj, callback, args ) {
		var value,
			i = 0,
			length = obj.length,
			isArray = isArraylike( obj );

		if ( args ) {
			if ( isArray ) {
				for ( ; i < length; i++ ) {
					value = callback.apply( obj[ i ], args );

					if ( value === false ) {
						break;
					}
				}
			} else {
				for ( i in obj ) {
					value = callback.apply( obj[ i ], args );

					if ( value === false ) {
						break;
					}
				}
			}

		// A special, fast, case for the most common use of each
		} else {
			if ( isArray ) {
				for ( ; i < length; i++ ) {
					value = callback.call( obj[ i ], i, obj[ i ] );

					if ( value === false ) {
						break;
					}
				}
			} else {
				for ( i in obj ) {
					value = callback.call( obj[ i ], i, obj[ i ] );

					if ( value === false ) {
						break;
					}
				}
			}
		}

		return obj;
	},

	trim: function( text ) {
		return text == null ? "" : trim.call( text );
	},

	// results is for internal usage only
	makeArray: function( arr, results ) {
		var ret = results || [];

		if ( arr != null ) {
			if ( isArraylike( Object(arr) ) ) {
				jQuery.merge( ret,
					typeof arr === "string" ?
					[ arr ] : arr
				);
			} else {
				push.call( ret, arr );
			}
		}

		return ret;
	},

	inArray: function( elem, arr, i ) {
		return arr == null ? -1 : indexOf.call( arr, elem, i );
	},

	merge: function( first, second ) {
		var len = +second.length,
			j = 0,
			i = first.length;

		for ( ; j < len; j++ ) {
			first[ i++ ] = second[ j ];
		}

		first.length = i;

		return first;
	},

	grep: function( elems, callback, invert ) {
		var callbackInverse,
			matches = [],
			i = 0,
			length = elems.length,
			callbackExpect = !invert;

		// Go through the array, only saving the items
		// that pass the validator function
		for ( ; i < length; i++ ) {
			callbackInverse = !callback( elems[ i ], i );
			if ( callbackInverse !== callbackExpect ) {
				matches.push( elems[ i ] );
			}
		}

		return matches;
	},

	// arg is for internal usage only
	map: function( elems, callback, arg ) {
		var value,
			i = 0,
			length = elems.length,
			isArray = isArraylike( elems ),
			ret = [];

		// Go through the array, translating each of the items to their new values
		if ( isArray ) {
			for ( ; i < length; i++ ) {
				value = callback( elems[ i ], i, arg );

				if ( value != null ) {
					ret.push( value );
				}
			}

		// Go through every key on the object,
		} else {
			for ( i in elems ) {
				value = callback( elems[ i ], i, arg );

				if ( value != null ) {
					ret.push( value );
				}
			}
		}

		// Flatten any nested arrays
		return concat.apply( [], ret );
	},

	// A global GUID counter for objects
	guid: 1,

	// Bind a function to a context, optionally partially applying any
	// arguments.
	proxy: function( fn, context ) {
		var tmp, args, proxy;

		if ( typeof context === "string" ) {
			tmp = fn[ context ];
			context = fn;
			fn = tmp;
		}

		// Quick check to determine if target is callable, in the spec
		// this throws a TypeError, but we will just return undefined.
		if ( !jQuery.isFunction( fn ) ) {
			return undefined;
		}

		// Simulated bind
		args = slice.call( arguments, 2 );
		proxy = function() {
			return fn.apply( context || this, args.concat( slice.call( arguments ) ) );
		};

		// Set the guid of unique handler to the same of original handler, so it can be removed
		proxy.guid = fn.guid = fn.guid || jQuery.guid++;

		return proxy;
	},

	now: Date.now,

	// jQuery.support is not used in Core but other projects attach their
	// properties to it so it needs to exist.
	support: support
});

// Populate the class2type map
jQuery.each("Boolean Number String Function Array Date RegExp Object Error".split(" "), function(i, name) {
	class2type[ "[object " + name + "]" ] = name.toLowerCase();
});

function isArraylike( obj ) {
	var length = obj.length,
		type = jQuery.type( obj );

	if ( type === "function" || jQuery.isWindow( obj ) ) {
		return false;
	}

	if ( obj.nodeType === 1 && length ) {
		return true;
	}

	return type === "array" || length === 0 ||
		typeof length === "number" && length > 0 && ( length - 1 ) in obj;
}
var Sizzle =
/*!
 * Sizzle CSS Selector Engine v1.10.16
 * http://sizzlejs.com/
 *
 * Copyright 2013 jQuery Foundation, Inc. and other contributors
 * Released under the MIT license
 * http://jquery.org/license
 *
 * Date: 2014-01-13
 */
(function( window ) {

var i,
	support,
	Expr,
	getText,
	isXML,
	compile,
	outermostContext,
	sortInput,
	hasDuplicate,

	// Local document vars
	setDocument,
	document,
	docElem,
	documentIsHTML,
	rbuggyQSA,
	rbuggyMatches,
	matches,
	contains,

	// Instance-specific data
	expando = "sizzle" + -(new Date()),
	preferredDoc = window.document,
	dirruns = 0,
	done = 0,
	classCache = createCache(),
	tokenCache = createCache(),
	compilerCache = createCache(),
	sortOrder = function( a, b ) {
		if ( a === b ) {
			hasDuplicate = true;
		}
		return 0;
	},

	// General-purpose constants
	strundefined = typeof undefined,
	MAX_NEGATIVE = 1 << 31,

	// Instance methods
	hasOwn = ({}).hasOwnProperty,
	arr = [],
	pop = arr.pop,
	push_native = arr.push,
	push = arr.push,
	slice = arr.slice,
	// Use a stripped-down indexOf if we can't use a native one
	indexOf = arr.indexOf || function( elem ) {
		var i = 0,
			len = this.length;
		for ( ; i < len; i++ ) {
			if ( this[i] === elem ) {
				return i;
			}
		}
		return -1;
	},

	booleans = "checked|selected|async|autofocus|autoplay|controls|defer|disabled|hidden|ismap|loop|multiple|open|readonly|required|scoped",

	// Regular expressions

	// Whitespace characters http://www.w3.org/TR/css3-selectors/#whitespace
	whitespace = "[\\x20\\t\\r\\n\\f]",
	// http://www.w3.org/TR/css3-syntax/#characters
	characterEncoding = "(?:\\\\.|[\\w-]|[^\\x00-\\xa0])+",

	// Loosely modeled on CSS identifier characters
	// An unquoted value should be a CSS identifier http://www.w3.org/TR/css3-selectors/#attribute-selectors
	// Proper syntax: http://www.w3.org/TR/CSS21/syndata.html#value-def-identifier
	identifier = characterEncoding.replace( "w", "w#" ),

	// Acceptable operators http://www.w3.org/TR/selectors/#attribute-selectors
	attributes = "\\[" + whitespace + "*(" + characterEncoding + ")" + whitespace +
		"*(?:([*^$|!~]?=)" + whitespace + "*(?:(['\"])((?:\\\\.|[^\\\\])*?)\\3|(" + identifier + ")|)|)" + whitespace + "*\\]",

	// Prefer arguments quoted,
	//   then not containing pseudos/brackets,
	//   then attribute selectors/non-parenthetical expressions,
	//   then anything else
	// These preferences are here to reduce the number of selectors
	//   needing tokenize in the PSEUDO preFilter
	pseudos = ":(" + characterEncoding + ")(?:\\(((['\"])((?:\\\\.|[^\\\\])*?)\\3|((?:\\\\.|[^\\\\()[\\]]|" + attributes.replace( 3, 8 ) + ")*)|.*)\\)|)",

	// Leading and non-escaped trailing whitespace, capturing some non-whitespace characters preceding the latter
	rtrim = new RegExp( "^" + whitespace + "+|((?:^|[^\\\\])(?:\\\\.)*)" + whitespace + "+$", "g" ),

	rcomma = new RegExp( "^" + whitespace + "*," + whitespace + "*" ),
	rcombinators = new RegExp( "^" + whitespace + "*([>+~]|" + whitespace + ")" + whitespace + "*" ),

	rattributeQuotes = new RegExp( "=" + whitespace + "*([^\\]'\"]*?)" + whitespace + "*\\]", "g" ),

	rpseudo = new RegExp( pseudos ),
	ridentifier = new RegExp( "^" + identifier + "$" ),

	matchExpr = {
		"ID": new RegExp( "^#(" + characterEncoding + ")" ),
		"CLASS": new RegExp( "^\\.(" + characterEncoding + ")" ),
		"TAG": new RegExp( "^(" + characterEncoding.replace( "w", "w*" ) + ")" ),
		"ATTR": new RegExp( "^" + attributes ),
		"PSEUDO": new RegExp( "^" + pseudos ),
		"CHILD": new RegExp( "^:(only|first|last|nth|nth-last)-(child|of-type)(?:\\(" + whitespace +
			"*(even|odd|(([+-]|)(\\d*)n|)" + whitespace + "*(?:([+-]|)" + whitespace +
			"*(\\d+)|))" + whitespace + "*\\)|)", "i" ),
		"bool": new RegExp( "^(?:" + booleans + ")$", "i" ),
		// For use in libraries implementing .is()
		// We use this for POS matching in `select`
		"needsContext": new RegExp( "^" + whitespace + "*[>+~]|:(even|odd|eq|gt|lt|nth|first|last)(?:\\(" +
			whitespace + "*((?:-\\d)?\\d*)" + whitespace + "*\\)|)(?=[^-]|$)", "i" )
	},

	rinputs = /^(?:input|select|textarea|button)$/i,
	rheader = /^h\d$/i,

	rnative = /^[^{]+\{\s*\[native \w/,

	// Easily-parseable/retrievable ID or TAG or CLASS selectors
	rquickExpr = /^(?:#([\w-]+)|(\w+)|\.([\w-]+))$/,

	rsibling = /[+~]/,
	rescape = /'|\\/g,

	// CSS escapes http://www.w3.org/TR/CSS21/syndata.html#escaped-characters
	runescape = new RegExp( "\\\\([\\da-f]{1,6}" + whitespace + "?|(" + whitespace + ")|.)", "ig" ),
	funescape = function( _, escaped, escapedWhitespace ) {
		var high = "0x" + escaped - 0x10000;
		// NaN means non-codepoint
		// Support: Firefox
		// Workaround erroneous numeric interpretation of +"0x"
		return high !== high || escapedWhitespace ?
			escaped :
			high < 0 ?
				// BMP codepoint
				String.fromCharCode( high + 0x10000 ) :
				// Supplemental Plane codepoint (surrogate pair)
				String.fromCharCode( high >> 10 | 0xD800, high & 0x3FF | 0xDC00 );
	};

// Optimize for push.apply( _, NodeList )
try {
	push.apply(
		(arr = slice.call( preferredDoc.childNodes )),
		preferredDoc.childNodes
	);
	// Support: Android<4.0
	// Detect silently failing push.apply
	arr[ preferredDoc.childNodes.length ].nodeType;
} catch ( e ) {
	push = { apply: arr.length ?

		// Leverage slice if possible
		function( target, els ) {
			push_native.apply( target, slice.call(els) );
		} :

		// Support: IE<9
		// Otherwise append directly
		function( target, els ) {
			var j = target.length,
				i = 0;
			// Can't trust NodeList.length
			while ( (target[j++] = els[i++]) ) {}
			target.length = j - 1;
		}
	};
}

function Sizzle( selector, context, results, seed ) {
	var match, elem, m, nodeType,
		// QSA vars
		i, groups, old, nid, newContext, newSelector;

	if ( ( context ? context.ownerDocument || context : preferredDoc ) !== document ) {
		setDocument( context );
	}

	context = context || document;
	results = results || [];

	if ( !selector || typeof selector !== "string" ) {
		return results;
	}

	if ( (nodeType = context.nodeType) !== 1 && nodeType !== 9 ) {
		return [];
	}

	if ( documentIsHTML && !seed ) {

		// Shortcuts
		if ( (match = rquickExpr.exec( selector )) ) {
			// Speed-up: Sizzle("#ID")
			if ( (m = match[1]) ) {
				if ( nodeType === 9 ) {
					elem = context.getElementById( m );
					// Check parentNode to catch when Blackberry 4.6 returns
					// nodes that are no longer in the document (jQuery #6963)
					if ( elem && elem.parentNode ) {
						// Handle the case where IE, Opera, and Webkit return items
						// by name instead of ID
						if ( elem.id === m ) {
							results.push( elem );
							return results;
						}
					} else {
						return results;
					}
				} else {
					// Context is not a document
					if ( context.ownerDocument && (elem = context.ownerDocument.getElementById( m )) &&
						contains( context, elem ) && elem.id === m ) {
						results.push( elem );
						return results;
					}
				}

			// Speed-up: Sizzle("TAG")
			} else if ( match[2] ) {
				push.apply( results, context.getElementsByTagName( selector ) );
				return results;

			// Speed-up: Sizzle(".CLASS")
			} else if ( (m = match[3]) && support.getElementsByClassName && context.getElementsByClassName ) {
				push.apply( results, context.getElementsByClassName( m ) );
				return results;
			}
		}

		// QSA path
		if ( support.qsa && (!rbuggyQSA || !rbuggyQSA.test( selector )) ) {
			nid = old = expando;
			newContext = context;
			newSelector = nodeType === 9 && selector;

			// qSA works strangely on Element-rooted queries
			// We can work around this by specifying an extra ID on the root
			// and working up from there (Thanks to Andrew Dupont for the technique)
			// IE 8 doesn't work on object elements
			if ( nodeType === 1 && context.nodeName.toLowerCase() !== "object" ) {
				groups = tokenize( selector );

				if ( (old = context.getAttribute("id")) ) {
					nid = old.replace( rescape, "\\$&" );
				} else {
					context.setAttribute( "id", nid );
				}
				nid = "[id='" + nid + "'] ";

				i = groups.length;
				while ( i-- ) {
					groups[i] = nid + toSelector( groups[i] );
				}
				newContext = rsibling.test( selector ) && testContext( context.parentNode ) || context;
				newSelector = groups.join(",");
			}

			if ( newSelector ) {
				try {
					push.apply( results,
						newContext.querySelectorAll( newSelector )
					);
					return results;
				} catch(qsaError) {
				} finally {
					if ( !old ) {
						context.removeAttribute("id");
					}
				}
			}
		}
	}

	// All others
	return select( selector.replace( rtrim, "$1" ), context, results, seed );
}

/**
 * Create key-value caches of limited size
 * @returns {Function(string, Object)} Returns the Object data after storing it on itself with
 *	property name the (space-suffixed) string and (if the cache is larger than Expr.cacheLength)
 *	deleting the oldest entry
 */
function createCache() {
	var keys = [];

	function cache( key, value ) {
		// Use (key + " ") to avoid collision with native prototype properties (see Issue #157)
		if ( keys.push( key + " " ) > Expr.cacheLength ) {
			// Only keep the most recent entries
			delete cache[ keys.shift() ];
		}
		return (cache[ key + " " ] = value);
	}
	return cache;
}

/**
 * Mark a function for special use by Sizzle
 * @param {Function} fn The function to mark
 */
function markFunction( fn ) {
	fn[ expando ] = true;
	return fn;
}

/**
 * Support testing using an element
 * @param {Function} fn Passed the created div and expects a boolean result
 */
function assert( fn ) {
	var div = document.createElement("div");

	try {
		return !!fn( div );
	} catch (e) {
		return false;
	} finally {
		// Remove from its parent by default
		if ( div.parentNode ) {
			div.parentNode.removeChild( div );
		}
		// release memory in IE
		div = null;
	}
}

/**
 * Adds the same handler for all of the specified attrs
 * @param {String} attrs Pipe-separated list of attributes
 * @param {Function} handler The method that will be applied
 */
function addHandle( attrs, handler ) {
	var arr = attrs.split("|"),
		i = attrs.length;

	while ( i-- ) {
		Expr.attrHandle[ arr[i] ] = handler;
	}
}

/**
 * Checks document order of two siblings
 * @param {Element} a
 * @param {Element} b
 * @returns {Number} Returns less than 0 if a precedes b, greater than 0 if a follows b
 */
function siblingCheck( a, b ) {
	var cur = b && a,
		diff = cur && a.nodeType === 1 && b.nodeType === 1 &&
			( ~b.sourceIndex || MAX_NEGATIVE ) -
			( ~a.sourceIndex || MAX_NEGATIVE );

	// Use IE sourceIndex if available on both nodes
	if ( diff ) {
		return diff;
	}

	// Check if b follows a
	if ( cur ) {
		while ( (cur = cur.nextSibling) ) {
			if ( cur === b ) {
				return -1;
			}
		}
	}

	return a ? 1 : -1;
}

/**
 * Returns a function to use in pseudos for input types
 * @param {String} type
 */
function createInputPseudo( type ) {
	return function( elem ) {
		var name = elem.nodeName.toLowerCase();
		return name === "input" && elem.type === type;
	};
}

/**
 * Returns a function to use in pseudos for buttons
 * @param {String} type
 */
function createButtonPseudo( type ) {
	return function( elem ) {
		var name = elem.nodeName.toLowerCase();
		return (name === "input" || name === "button") && elem.type === type;
	};
}

/**
 * Returns a function to use in pseudos for positionals
 * @param {Function} fn
 */
function createPositionalPseudo( fn ) {
	return markFunction(function( argument ) {
		argument = +argument;
		return markFunction(function( seed, matches ) {
			var j,
				matchIndexes = fn( [], seed.length, argument ),
				i = matchIndexes.length;

			// Match elements found at the specified indexes
			while ( i-- ) {
				if ( seed[ (j = matchIndexes[i]) ] ) {
					seed[j] = !(matches[j] = seed[j]);
				}
			}
		});
	});
}

/**
 * Checks a node for validity as a Sizzle context
 * @param {Element|Object=} context
 * @returns {Element|Object|Boolean} The input node if acceptable, otherwise a falsy value
 */
function testContext( context ) {
	return context && typeof context.getElementsByTagName !== strundefined && context;
}

// Expose support vars for convenience
support = Sizzle.support = {};

/**
 * Detects XML nodes
 * @param {Element|Object} elem An element or a document
 * @returns {Boolean} True iff elem is a non-HTML XML node
 */
isXML = Sizzle.isXML = function( elem ) {
	// documentElement is verified for cases where it doesn't yet exist
	// (such as loading iframes in IE - #4833)
	var documentElement = elem && (elem.ownerDocument || elem).documentElement;
	return documentElement ? documentElement.nodeName !== "HTML" : false;
};

/**
 * Sets document-related variables once based on the current document
 * @param {Element|Object} [doc] An element or document object to use to set the document
 * @returns {Object} Returns the current document
 */
setDocument = Sizzle.setDocument = function( node ) {
	var hasCompare,
		doc = node ? node.ownerDocument || node : preferredDoc,
		parent = doc.defaultView;

	// If no document and documentElement is available, return
	if ( doc === document || doc.nodeType !== 9 || !doc.documentElement ) {
		return document;
	}

	// Set our document
	document = doc;
	docElem = doc.documentElement;

	// Support tests
	documentIsHTML = !isXML( doc );

	// Support: IE>8
	// If iframe document is assigned to "document" variable and if iframe has been reloaded,
	// IE will throw "permission denied" error when accessing "document" variable, see jQuery #13936
	// IE6-8 do not support the defaultView property so parent will be undefined
	if ( parent && parent !== parent.top ) {
		// IE11 does not have attachEvent, so all must suffer
		if ( parent.addEventListener ) {
			parent.addEventListener( "unload", function() {
				setDocument();
			}, false );
		} else if ( parent.attachEvent ) {
			parent.attachEvent( "onunload", function() {
				setDocument();
			});
		}
	}

	/* Attributes
	---------------------------------------------------------------------- */

	// Support: IE<8
	// Verify that getAttribute really returns attributes and not properties (excepting IE8 booleans)
	support.attributes = assert(function( div ) {
		div.className = "i";
		return !div.getAttribute("className");
	});

	/* getElement(s)By*
	---------------------------------------------------------------------- */

	// Check if getElementsByTagName("*") returns only elements
	support.getElementsByTagName = assert(function( div ) {
		div.appendChild( doc.createComment("") );
		return !div.getElementsByTagName("*").length;
	});

	// Check if getElementsByClassName can be trusted
	support.getElementsByClassName = rnative.test( doc.getElementsByClassName ) && assert(function( div ) {
		div.innerHTML = "<div class='a'></div><div class='a i'></div>";

		// Support: Safari<4
		// Catch class over-caching
		div.firstChild.className = "i";
		// Support: Opera<10
		// Catch gEBCN failure to find non-leading classes
		return div.getElementsByClassName("i").length === 2;
	});

	// Support: IE<10
	// Check if getElementById returns elements by name
	// The broken getElementById methods don't pick up programatically-set names,
	// so use a roundabout getElementsByName test
	support.getById = assert(function( div ) {
		docElem.appendChild( div ).id = expando;
		return !doc.getElementsByName || !doc.getElementsByName( expando ).length;
	});

	// ID find and filter
	if ( support.getById ) {
		Expr.find["ID"] = function( id, context ) {
			if ( typeof context.getElementById !== strundefined && documentIsHTML ) {
				var m = context.getElementById( id );
				// Check parentNode to catch when Blackberry 4.6 returns
				// nodes that are no longer in the document #6963
				return m && m.parentNode ? [m] : [];
			}
		};
		Expr.filter["ID"] = function( id ) {
			var attrId = id.replace( runescape, funescape );
			return function( elem ) {
				return elem.getAttribute("id") === attrId;
			};
		};
	} else {
		// Support: IE6/7
		// getElementById is not reliable as a find shortcut
		delete Expr.find["ID"];

		Expr.filter["ID"] =  function( id ) {
			var attrId = id.replace( runescape, funescape );
			return function( elem ) {
				var node = typeof elem.getAttributeNode !== strundefined && elem.getAttributeNode("id");
				return node && node.value === attrId;
			};
		};
	}

	// Tag
	Expr.find["TAG"] = support.getElementsByTagName ?
		function( tag, context ) {
			if ( typeof context.getElementsByTagName !== strundefined ) {
				return context.getElementsByTagName( tag );
			}
		} :
		function( tag, context ) {
			var elem,
				tmp = [],
				i = 0,
				results = context.getElementsByTagName( tag );

			// Filter out possible comments
			if ( tag === "*" ) {
				while ( (elem = results[i++]) ) {
					if ( elem.nodeType === 1 ) {
						tmp.push( elem );
					}
				}

				return tmp;
			}
			return results;
		};

	// Class
	Expr.find["CLASS"] = support.getElementsByClassName && function( className, context ) {
		if ( typeof context.getElementsByClassName !== strundefined && documentIsHTML ) {
			return context.getElementsByClassName( className );
		}
	};

	/* QSA/matchesSelector
	---------------------------------------------------------------------- */

	// QSA and matchesSelector support

	// matchesSelector(:active) reports false when true (IE9/Opera 11.5)
	rbuggyMatches = [];

	// qSa(:focus) reports false when true (Chrome 21)
	// We allow this because of a bug in IE8/9 that throws an error
	// whenever `document.activeElement` is accessed on an iframe
	// So, we allow :focus to pass through QSA all the time to avoid the IE error
	// See http://bugs.jquery.com/ticket/13378
	rbuggyQSA = [];

	if ( (support.qsa = rnative.test( doc.querySelectorAll )) ) {
		// Build QSA regex
		// Regex strategy adopted from Diego Perini
		assert(function( div ) {
			// Select is set to empty string on purpose
			// This is to test IE's treatment of not explicitly
			// setting a boolean content attribute,
			// since its presence should be enough
			// http://bugs.jquery.com/ticket/12359
			div.innerHTML = "<select t=''><option selected=''></option></select>";

			// Support: IE8, Opera 10-12
			// Nothing should be selected when empty strings follow ^= or $= or *=
			if ( div.querySelectorAll("[t^='']").length ) {
				rbuggyQSA.push( "[*^$]=" + whitespace + "*(?:''|\"\")" );
			}

			// Support: IE8
			// Boolean attributes and "value" are not treated correctly
			if ( !div.querySelectorAll("[selected]").length ) {
				rbuggyQSA.push( "\\[" + whitespace + "*(?:value|" + booleans + ")" );
			}

			// Webkit/Opera - :checked should return selected option elements
			// http://www.w3.org/TR/2011/REC-css3-selectors-20110929/#checked
			// IE8 throws error here and will not see later tests
			if ( !div.querySelectorAll(":checked").length ) {
				rbuggyQSA.push(":checked");
			}
		});

		assert(function( div ) {
			// Support: Windows 8 Native Apps
			// The type and name attributes are restricted during .innerHTML assignment
			var input = doc.createElement("input");
			input.setAttribute( "type", "hidden" );
			div.appendChild( input ).setAttribute( "name", "D" );

			// Support: IE8
			// Enforce case-sensitivity of name attribute
			if ( div.querySelectorAll("[name=d]").length ) {
				rbuggyQSA.push( "name" + whitespace + "*[*^$|!~]?=" );
			}

			// FF 3.5 - :enabled/:disabled and hidden elements (hidden elements are still enabled)
			// IE8 throws error here and will not see later tests
			if ( !div.querySelectorAll(":enabled").length ) {
				rbuggyQSA.push( ":enabled", ":disabled" );
			}

			// Opera 10-11 does not throw on post-comma invalid pseudos
			div.querySelectorAll("*,:x");
			rbuggyQSA.push(",.*:");
		});
	}

	if ( (support.matchesSelector = rnative.test( (matches = docElem.webkitMatchesSelector ||
		docElem.mozMatchesSelector ||
		docElem.oMatchesSelector ||
		docElem.msMatchesSelector) )) ) {

		assert(function( div ) {
			// Check to see if it's possible to do matchesSelector
			// on a disconnected node (IE 9)
			support.disconnectedMatch = matches.call( div, "div" );

			// This should fail with an exception
			// Gecko does not error, returns false instead
			matches.call( div, "[s!='']:x" );
			rbuggyMatches.push( "!=", pseudos );
		});
	}

	rbuggyQSA = rbuggyQSA.length && new RegExp( rbuggyQSA.join("|") );
	rbuggyMatches = rbuggyMatches.length && new RegExp( rbuggyMatches.join("|") );

	/* Contains
	---------------------------------------------------------------------- */
	hasCompare = rnative.test( docElem.compareDocumentPosition );

	// Element contains another
	// Purposefully does not implement inclusive descendent
	// As in, an element does not contain itself
	contains = hasCompare || rnative.test( docElem.contains ) ?
		function( a, b ) {
			var adown = a.nodeType === 9 ? a.documentElement : a,
				bup = b && b.parentNode;
			return a === bup || !!( bup && bup.nodeType === 1 && (
				adown.contains ?
					adown.contains( bup ) :
					a.compareDocumentPosition && a.compareDocumentPosition( bup ) & 16
			));
		} :
		function( a, b ) {
			if ( b ) {
				while ( (b = b.parentNode) ) {
					if ( b === a ) {
						return true;
					}
				}
			}
			return false;
		};

	/* Sorting
	---------------------------------------------------------------------- */

	// Document order sorting
	sortOrder = hasCompare ?
	function( a, b ) {

		// Flag for duplicate removal
		if ( a === b ) {
			hasDuplicate = true;
			return 0;
		}

		// Sort on method existence if only one input has compareDocumentPosition
		var compare = !a.compareDocumentPosition - !b.compareDocumentPosition;
		if ( compare ) {
			return compare;
		}

		// Calculate position if both inputs belong to the same document
		compare = ( a.ownerDocument || a ) === ( b.ownerDocument || b ) ?
			a.compareDocumentPosition( b ) :

			// Otherwise we know they are disconnected
			1;

		// Disconnected nodes
		if ( compare & 1 ||
			(!support.sortDetached && b.compareDocumentPosition( a ) === compare) ) {

			// Choose the first element that is related to our preferred document
			if ( a === doc || a.ownerDocument === preferredDoc && contains(preferredDoc, a) ) {
				return -1;
			}
			if ( b === doc || b.ownerDocument === preferredDoc && contains(preferredDoc, b) ) {
				return 1;
			}

			// Maintain original order
			return sortInput ?
				( indexOf.call( sortInput, a ) - indexOf.call( sortInput, b ) ) :
				0;
		}

		return compare & 4 ? -1 : 1;
	} :
	function( a, b ) {
		// Exit early if the nodes are identical
		if ( a === b ) {
			hasDuplicate = true;
			return 0;
		}

		var cur,
			i = 0,
			aup = a.parentNode,
			bup = b.parentNode,
			ap = [ a ],
			bp = [ b ];

		// Parentless nodes are either documents or disconnected
		if ( !aup || !bup ) {
			return a === doc ? -1 :
				b === doc ? 1 :
				aup ? -1 :
				bup ? 1 :
				sortInput ?
				( indexOf.call( sortInput, a ) - indexOf.call( sortInput, b ) ) :
				0;

		// If the nodes are siblings, we can do a quick check
		} else if ( aup === bup ) {
			return siblingCheck( a, b );
		}

		// Otherwise we need full lists of their ancestors for comparison
		cur = a;
		while ( (cur = cur.parentNode) ) {
			ap.unshift( cur );
		}
		cur = b;
		while ( (cur = cur.parentNode) ) {
			bp.unshift( cur );
		}

		// Walk down the tree looking for a discrepancy
		while ( ap[i] === bp[i] ) {
			i++;
		}

		return i ?
			// Do a sibling check if the nodes have a common ancestor
			siblingCheck( ap[i], bp[i] ) :

			// Otherwise nodes in our document sort first
			ap[i] === preferredDoc ? -1 :
			bp[i] === preferredDoc ? 1 :
			0;
	};

	return doc;
};

Sizzle.matches = function( expr, elements ) {
	return Sizzle( expr, null, null, elements );
};

Sizzle.matchesSelector = function( elem, expr ) {
	// Set document vars if needed
	if ( ( elem.ownerDocument || elem ) !== document ) {
		setDocument( elem );
	}

	// Make sure that attribute selectors are quoted
	expr = expr.replace( rattributeQuotes, "='$1']" );

	if ( support.matchesSelector && documentIsHTML &&
		( !rbuggyMatches || !rbuggyMatches.test( expr ) ) &&
		( !rbuggyQSA     || !rbuggyQSA.test( expr ) ) ) {

		try {
			var ret = matches.call( elem, expr );

			// IE 9's matchesSelector returns false on disconnected nodes
			if ( ret || support.disconnectedMatch ||
					// As well, disconnected nodes are said to be in a document
					// fragment in IE 9
					elem.document && elem.document.nodeType !== 11 ) {
				return ret;
			}
		} catch(e) {}
	}

	return Sizzle( expr, document, null, [elem] ).length > 0;
};

Sizzle.contains = function( context, elem ) {
	// Set document vars if needed
	if ( ( context.ownerDocument || context ) !== document ) {
		setDocument( context );
	}
	return contains( context, elem );
};

Sizzle.attr = function( elem, name ) {
	// Set document vars if needed
	if ( ( elem.ownerDocument || elem ) !== document ) {
		setDocument( elem );
	}

	var fn = Expr.attrHandle[ name.toLowerCase() ],
		// Don't get fooled by Object.prototype properties (jQuery #13807)
		val = fn && hasOwn.call( Expr.attrHandle, name.toLowerCase() ) ?
			fn( elem, name, !documentIsHTML ) :
			undefined;

	return val !== undefined ?
		val :
		support.attributes || !documentIsHTML ?
			elem.getAttribute( name ) :
			(val = elem.getAttributeNode(name)) && val.specified ?
				val.value :
				null;
};

Sizzle.error = function( msg ) {
	throw new Error( "Syntax error, unrecognized expression: " + msg );
};

/**
 * Document sorting and removing duplicates
 * @param {ArrayLike} results
 */
Sizzle.uniqueSort = function( results ) {
	var elem,
		duplicates = [],
		j = 0,
		i = 0;

	// Unless we *know* we can detect duplicates, assume their presence
	hasDuplicate = !support.detectDuplicates;
	sortInput = !support.sortStable && results.slice( 0 );
	results.sort( sortOrder );

	if ( hasDuplicate ) {
		while ( (elem = results[i++]) ) {
			if ( elem === results[ i ] ) {
				j = duplicates.push( i );
			}
		}
		while ( j-- ) {
			results.splice( duplicates[ j ], 1 );
		}
	}

	// Clear input after sorting to release objects
	// See https://github.com/jquery/sizzle/pull/225
	sortInput = null;

	return results;
};

/**
 * Utility function for retrieving the text value of an array of DOM nodes
 * @param {Array|Element} elem
 */
getText = Sizzle.getText = function( elem ) {
	var node,
		ret = "",
		i = 0,
		nodeType = elem.nodeType;

	if ( !nodeType ) {
		// If no nodeType, this is expected to be an array
		while ( (node = elem[i++]) ) {
			// Do not traverse comment nodes
			ret += getText( node );
		}
	} else if ( nodeType === 1 || nodeType === 9 || nodeType === 11 ) {
		// Use textContent for elements
		// innerText usage removed for consistency of new lines (jQuery #11153)
		if ( typeof elem.textContent === "string" ) {
			return elem.textContent;
		} else {
			// Traverse its children
			for ( elem = elem.firstChild; elem; elem = elem.nextSibling ) {
				ret += getText( elem );
			}
		}
	} else if ( nodeType === 3 || nodeType === 4 ) {
		return elem.nodeValue;
	}
	// Do not include comment or processing instruction nodes

	return ret;
};

Expr = Sizzle.selectors = {

	// Can be adjusted by the user
	cacheLength: 50,

	createPseudo: markFunction,

	match: matchExpr,

	attrHandle: {},

	find: {},

	relative: {
		">": { dir: "parentNode", first: true },
		" ": { dir: "parentNode" },
		"+": { dir: "previousSibling", first: true },
		"~": { dir: "previousSibling" }
	},

	preFilter: {
		"ATTR": function( match ) {
			match[1] = match[1].replace( runescape, funescape );

			// Move the given value to match[3] whether quoted or unquoted
			match[3] = ( match[4] || match[5] || "" ).replace( runescape, funescape );

			if ( match[2] === "~=" ) {
				match[3] = " " + match[3] + " ";
			}

			return match.slice( 0, 4 );
		},

		"CHILD": function( match ) {
			/* matches from matchExpr["CHILD"]
				1 type (only|nth|...)
				2 what (child|of-type)
				3 argument (even|odd|\d*|\d*n([+-]\d+)?|...)
				4 xn-component of xn+y argument ([+-]?\d*n|)
				5 sign of xn-component
				6 x of xn-component
				7 sign of y-component
				8 y of y-component
			*/
			match[1] = match[1].toLowerCase();

			if ( match[1].slice( 0, 3 ) === "nth" ) {
				// nth-* requires argument
				if ( !match[3] ) {
					Sizzle.error( match[0] );
				}

				// numeric x and y parameters for Expr.filter.CHILD
				// remember that false/true cast respectively to 0/1
				match[4] = +( match[4] ? match[5] + (match[6] || 1) : 2 * ( match[3] === "even" || match[3] === "odd" ) );
				match[5] = +( ( match[7] + match[8] ) || match[3] === "odd" );

			// other types prohibit arguments
			} else if ( match[3] ) {
				Sizzle.error( match[0] );
			}

			return match;
		},

		"PSEUDO": function( match ) {
			var excess,
				unquoted = !match[5] && match[2];

			if ( matchExpr["CHILD"].test( match[0] ) ) {
				return null;
			}

			// Accept quoted arguments as-is
			if ( match[3] && match[4] !== undefined ) {
				match[2] = match[4];

			// Strip excess characters from unquoted arguments
			} else if ( unquoted && rpseudo.test( unquoted ) &&
				// Get excess from tokenize (recursively)
				(excess = tokenize( unquoted, true )) &&
				// advance to the next closing parenthesis
				(excess = unquoted.indexOf( ")", unquoted.length - excess ) - unquoted.length) ) {

				// excess is a negative index
				match[0] = match[0].slice( 0, excess );
				match[2] = unquoted.slice( 0, excess );
			}

			// Return only captures needed by the pseudo filter method (type and argument)
			return match.slice( 0, 3 );
		}
	},

	filter: {

		"TAG": function( nodeNameSelector ) {
			var nodeName = nodeNameSelector.replace( runescape, funescape ).toLowerCase();
			return nodeNameSelector === "*" ?
				function() { return true; } :
				function( elem ) {
					return elem.nodeName && elem.nodeName.toLowerCase() === nodeName;
				};
		},

		"CLASS": function( className ) {
			var pattern = classCache[ className + " " ];

			return pattern ||
				(pattern = new RegExp( "(^|" + whitespace + ")" + className + "(" + whitespace + "|$)" )) &&
				classCache( className, function( elem ) {
					return pattern.test( typeof elem.className === "string" && elem.className || typeof elem.getAttribute !== strundefined && elem.getAttribute("class") || "" );
				});
		},

		"ATTR": function( name, operator, check ) {
			return function( elem ) {
				var result = Sizzle.attr( elem, name );

				if ( result == null ) {
					return operator === "!=";
				}
				if ( !operator ) {
					return true;
				}

				result += "";

				return operator === "=" ? result === check :
					operator === "!=" ? result !== check :
					operator === "^=" ? check && result.indexOf( check ) === 0 :
					operator === "*=" ? check && result.indexOf( check ) > -1 :
					operator === "$=" ? check && result.slice( -check.length ) === check :
					operator === "~=" ? ( " " + result + " " ).indexOf( check ) > -1 :
					operator === "|=" ? result === check || result.slice( 0, check.length + 1 ) === check + "-" :
					false;
			};
		},

		"CHILD": function( type, what, argument, first, last ) {
			var simple = type.slice( 0, 3 ) !== "nth",
				forward = type.slice( -4 ) !== "last",
				ofType = what === "of-type";

			return first === 1 && last === 0 ?

				// Shortcut for :nth-*(n)
				function( elem ) {
					return !!elem.parentNode;
				} :

				function( elem, context, xml ) {
					var cache, outerCache, node, diff, nodeIndex, start,
						dir = simple !== forward ? "nextSibling" : "previousSibling",
						parent = elem.parentNode,
						name = ofType && elem.nodeName.toLowerCase(),
						useCache = !xml && !ofType;

					if ( parent ) {

						// :(first|last|only)-(child|of-type)
						if ( simple ) {
							while ( dir ) {
								node = elem;
								while ( (node = node[ dir ]) ) {
									if ( ofType ? node.nodeName.toLowerCase() === name : node.nodeType === 1 ) {
										return false;
									}
								}
								// Reverse direction for :only-* (if we haven't yet done so)
								start = dir = type === "only" && !start && "nextSibling";
							}
							return true;
						}

						start = [ forward ? parent.firstChild : parent.lastChild ];

						// non-xml :nth-child(...) stores cache data on `parent`
						if ( forward && useCache ) {
							// Seek `elem` from a previously-cached index
							outerCache = parent[ expando ] || (parent[ expando ] = {});
							cache = outerCache[ type ] || [];
							nodeIndex = cache[0] === dirruns && cache[1];
							diff = cache[0] === dirruns && cache[2];
							node = nodeIndex && parent.childNodes[ nodeIndex ];

							while ( (node = ++nodeIndex && node && node[ dir ] ||

								// Fallback to seeking `elem` from the start
								(diff = nodeIndex = 0) || start.pop()) ) {

								// When found, cache indexes on `parent` and break
								if ( node.nodeType === 1 && ++diff && node === elem ) {
									outerCache[ type ] = [ dirruns, nodeIndex, diff ];
									break;
								}
							}

						// Use previously-cached element index if available
						} else if ( useCache && (cache = (elem[ expando ] || (elem[ expando ] = {}))[ type ]) && cache[0] === dirruns ) {
							diff = cache[1];

						// xml :nth-child(...) or :nth-last-child(...) or :nth(-last)?-of-type(...)
						} else {
							// Use the same loop as above to seek `elem` from the start
							while ( (node = ++nodeIndex && node && node[ dir ] ||
								(diff = nodeIndex = 0) || start.pop()) ) {

								if ( ( ofType ? node.nodeName.toLowerCase() === name : node.nodeType === 1 ) && ++diff ) {
									// Cache the index of each encountered element
									if ( useCache ) {
										(node[ expando ] || (node[ expando ] = {}))[ type ] = [ dirruns, diff ];
									}

									if ( node === elem ) {
										break;
									}
								}
							}
						}

						// Incorporate the offset, then check against cycle size
						diff -= last;
						return diff === first || ( diff % first === 0 && diff / first >= 0 );
					}
				};
		},

		"PSEUDO": function( pseudo, argument ) {
			// pseudo-class names are case-insensitive
			// http://www.w3.org/TR/selectors/#pseudo-classes
			// Prioritize by case sensitivity in case custom pseudos are added with uppercase letters
			// Remember that setFilters inherits from pseudos
			var args,
				fn = Expr.pseudos[ pseudo ] || Expr.setFilters[ pseudo.toLowerCase() ] ||
					Sizzle.error( "unsupported pseudo: " + pseudo );

			// The user may use createPseudo to indicate that
			// arguments are needed to create the filter function
			// just as Sizzle does
			if ( fn[ expando ] ) {
				return fn( argument );
			}

			// But maintain support for old signatures
			if ( fn.length > 1 ) {
				args = [ pseudo, pseudo, "", argument ];
				return Expr.setFilters.hasOwnProperty( pseudo.toLowerCase() ) ?
					markFunction(function( seed, matches ) {
						var idx,
							matched = fn( seed, argument ),
							i = matched.length;
						while ( i-- ) {
							idx = indexOf.call( seed, matched[i] );
							seed[ idx ] = !( matches[ idx ] = matched[i] );
						}
					}) :
					function( elem ) {
						return fn( elem, 0, args );
					};
			}

			return fn;
		}
	},

	pseudos: {
		// Potentially complex pseudos
		"not": markFunction(function( selector ) {
			// Trim the selector passed to compile
			// to avoid treating leading and trailing
			// spaces as combinators
			var input = [],
				results = [],
				matcher = compile( selector.replace( rtrim, "$1" ) );

			return matcher[ expando ] ?
				markFunction(function( seed, matches, context, xml ) {
					var elem,
						unmatched = matcher( seed, null, xml, [] ),
						i = seed.length;

					// Match elements unmatched by `matcher`
					while ( i-- ) {
						if ( (elem = unmatched[i]) ) {
							seed[i] = !(matches[i] = elem);
						}
					}
				}) :
				function( elem, context, xml ) {
					input[0] = elem;
					matcher( input, null, xml, results );
					return !results.pop();
				};
		}),

		"has": markFunction(function( selector ) {
			return function( elem ) {
				return Sizzle( selector, elem ).length > 0;
			};
		}),

		"contains": markFunction(function( text ) {
			return function( elem ) {
				return ( elem.textContent || elem.innerText || getText( elem ) ).indexOf( text ) > -1;
			};
		}),

		// "Whether an element is represented by a :lang() selector
		// is based solely on the element's language value
		// being equal to the identifier C,
		// or beginning with the identifier C immediately followed by "-".
		// The matching of C against the element's language value is performed case-insensitively.
		// The identifier C does not have to be a valid language name."
		// http://www.w3.org/TR/selectors/#lang-pseudo
		"lang": markFunction( function( lang ) {
			// lang value must be a valid identifier
			if ( !ridentifier.test(lang || "") ) {
				Sizzle.error( "unsupported lang: " + lang );
			}
			lang = lang.replace( runescape, funescape ).toLowerCase();
			return function( elem ) {
				var elemLang;
				do {
					if ( (elemLang = documentIsHTML ?
						elem.lang :
						elem.getAttribute("xml:lang") || elem.getAttribute("lang")) ) {

						elemLang = elemLang.toLowerCase();
						return elemLang === lang || elemLang.indexOf( lang + "-" ) === 0;
					}
				} while ( (elem = elem.parentNode) && elem.nodeType === 1 );
				return false;
			};
		}),

		// Miscellaneous
		"target": function( elem ) {
			var hash = window.location && window.location.hash;
			return hash && hash.slice( 1 ) === elem.id;
		},

		"root": function( elem ) {
			return elem === docElem;
		},

		"focus": function( elem ) {
			return elem === document.activeElement && (!document.hasFocus || document.hasFocus()) && !!(elem.type || elem.href || ~elem.tabIndex);
		},

		// Boolean properties
		"enabled": function( elem ) {
			return elem.disabled === false;
		},

		"disabled": function( elem ) {
			return elem.disabled === true;
		},

		"checked": function( elem ) {
			// In CSS3, :checked should return both checked and selected elements
			// http://www.w3.org/TR/2011/REC-css3-selectors-20110929/#checked
			var nodeName = elem.nodeName.toLowerCase();
			return (nodeName === "input" && !!elem.checked) || (nodeName === "option" && !!elem.selected);
		},

		"selected": function( elem ) {
			// Accessing this property makes selected-by-default
			// options in Safari work properly
			if ( elem.parentNode ) {
				elem.parentNode.selectedIndex;
			}

			return elem.selected === true;
		},

		// Contents
		"empty": function( elem ) {
			// http://www.w3.org/TR/selectors/#empty-pseudo
			// :empty is negated by element (1) or content nodes (text: 3; cdata: 4; entity ref: 5),
			//   but not by others (comment: 8; processing instruction: 7; etc.)
			// nodeType < 6 works because attributes (2) do not appear as children
			for ( elem = elem.firstChild; elem; elem = elem.nextSibling ) {
				if ( elem.nodeType < 6 ) {
					return false;
				}
			}
			return true;
		},

		"parent": function( elem ) {
			return !Expr.pseudos["empty"]( elem );
		},

		// Element/input types
		"header": function( elem ) {
			return rheader.test( elem.nodeName );
		},

		"input": function( elem ) {
			return rinputs.test( elem.nodeName );
		},

		"button": function( elem ) {
			var name = elem.nodeName.toLowerCase();
			return name === "input" && elem.type === "button" || name === "button";
		},

		"text": function( elem ) {
			var attr;
			return elem.nodeName.toLowerCase() === "input" &&
				elem.type === "text" &&

				// Support: IE<8
				// New HTML5 attribute values (e.g., "search") appear with elem.type === "text"
				( (attr = elem.getAttribute("type")) == null || attr.toLowerCase() === "text" );
		},

		// Position-in-collection
		"first": createPositionalPseudo(function() {
			return [ 0 ];
		}),

		"last": createPositionalPseudo(function( matchIndexes, length ) {
			return [ length - 1 ];
		}),

		"eq": createPositionalPseudo(function( matchIndexes, length, argument ) {
			return [ argument < 0 ? argument + length : argument ];
		}),

		"even": createPositionalPseudo(function( matchIndexes, length ) {
			var i = 0;
			for ( ; i < length; i += 2 ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		}),

		"odd": createPositionalPseudo(function( matchIndexes, length ) {
			var i = 1;
			for ( ; i < length; i += 2 ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		}),

		"lt": createPositionalPseudo(function( matchIndexes, length, argument ) {
			var i = argument < 0 ? argument + length : argument;
			for ( ; --i >= 0; ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		}),

		"gt": createPositionalPseudo(function( matchIndexes, length, argument ) {
			var i = argument < 0 ? argument + length : argument;
			for ( ; ++i < length; ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		})
	}
};

Expr.pseudos["nth"] = Expr.pseudos["eq"];

// Add button/input type pseudos
for ( i in { radio: true, checkbox: true, file: true, password: true, image: true } ) {
	Expr.pseudos[ i ] = createInputPseudo( i );
}
for ( i in { submit: true, reset: true } ) {
	Expr.pseudos[ i ] = createButtonPseudo( i );
}

// Easy API for creating new setFilters
function setFilters() {}
setFilters.prototype = Expr.filters = Expr.pseudos;
Expr.setFilters = new setFilters();

function tokenize( selector, parseOnly ) {
	var matched, match, tokens, type,
		soFar, groups, preFilters,
		cached = tokenCache[ selector + " " ];

	if ( cached ) {
		return parseOnly ? 0 : cached.slice( 0 );
	}

	soFar = selector;
	groups = [];
	preFilters = Expr.preFilter;

	while ( soFar ) {

		// Comma and first run
		if ( !matched || (match = rcomma.exec( soFar )) ) {
			if ( match ) {
				// Don't consume trailing commas as valid
				soFar = soFar.slice( match[0].length ) || soFar;
			}
			groups.push( (tokens = []) );
		}

		matched = false;

		// Combinators
		if ( (match = rcombinators.exec( soFar )) ) {
			matched = match.shift();
			tokens.push({
				value: matched,
				// Cast descendant combinators to space
				type: match[0].replace( rtrim, " " )
			});
			soFar = soFar.slice( matched.length );
		}

		// Filters
		for ( type in Expr.filter ) {
			if ( (match = matchExpr[ type ].exec( soFar )) && (!preFilters[ type ] ||
				(match = preFilters[ type ]( match ))) ) {
				matched = match.shift();
				tokens.push({
					value: matched,
					type: type,
					matches: match
				});
				soFar = soFar.slice( matched.length );
			}
		}

		if ( !matched ) {
			break;
		}
	}

	// Return the length of the invalid excess
	// if we're just parsing
	// Otherwise, throw an error or return tokens
	return parseOnly ?
		soFar.length :
		soFar ?
			Sizzle.error( selector ) :
			// Cache the tokens
			tokenCache( selector, groups ).slice( 0 );
}

function toSelector( tokens ) {
	var i = 0,
		len = tokens.length,
		selector = "";
	for ( ; i < len; i++ ) {
		selector += tokens[i].value;
	}
	return selector;
}

function addCombinator( matcher, combinator, base ) {
	var dir = combinator.dir,
		checkNonElements = base && dir === "parentNode",
		doneName = done++;

	return combinator.first ?
		// Check against closest ancestor/preceding element
		function( elem, context, xml ) {
			while ( (elem = elem[ dir ]) ) {
				if ( elem.nodeType === 1 || checkNonElements ) {
					return matcher( elem, context, xml );
				}
			}
		} :

		// Check against all ancestor/preceding elements
		function( elem, context, xml ) {
			var oldCache, outerCache,
				newCache = [ dirruns, doneName ];

			// We can't set arbitrary data on XML nodes, so they don't benefit from dir caching
			if ( xml ) {
				while ( (elem = elem[ dir ]) ) {
					if ( elem.nodeType === 1 || checkNonElements ) {
						if ( matcher( elem, context, xml ) ) {
							return true;
						}
					}
				}
			} else {
				while ( (elem = elem[ dir ]) ) {
					if ( elem.nodeType === 1 || checkNonElements ) {
						outerCache = elem[ expando ] || (elem[ expando ] = {});
						if ( (oldCache = outerCache[ dir ]) &&
							oldCache[ 0 ] === dirruns && oldCache[ 1 ] === doneName ) {

							// Assign to newCache so results back-propagate to previous elements
							return (newCache[ 2 ] = oldCache[ 2 ]);
						} else {
							// Reuse newcache so results back-propagate to previous elements
							outerCache[ dir ] = newCache;

							// A match means we're done; a fail means we have to keep checking
							if ( (newCache[ 2 ] = matcher( elem, context, xml )) ) {
								return true;
							}
						}
					}
				}
			}
		};
}

function elementMatcher( matchers ) {
	return matchers.length > 1 ?
		function( elem, context, xml ) {
			var i = matchers.length;
			while ( i-- ) {
				if ( !matchers[i]( elem, context, xml ) ) {
					return false;
				}
			}
			return true;
		} :
		matchers[0];
}

function condense( unmatched, map, filter, context, xml ) {
	var elem,
		newUnmatched = [],
		i = 0,
		len = unmatched.length,
		mapped = map != null;

	for ( ; i < len; i++ ) {
		if ( (elem = unmatched[i]) ) {
			if ( !filter || filter( elem, context, xml ) ) {
				newUnmatched.push( elem );
				if ( mapped ) {
					map.push( i );
				}
			}
		}
	}

	return newUnmatched;
}

function setMatcher( preFilter, selector, matcher, postFilter, postFinder, postSelector ) {
	if ( postFilter && !postFilter[ expando ] ) {
		postFilter = setMatcher( postFilter );
	}
	if ( postFinder && !postFinder[ expando ] ) {
		postFinder = setMatcher( postFinder, postSelector );
	}
	return markFunction(function( seed, results, context, xml ) {
		var temp, i, elem,
			preMap = [],
			postMap = [],
			preexisting = results.length,

			// Get initial elements from seed or context
			elems = seed || multipleContexts( selector || "*", context.nodeType ? [ context ] : context, [] ),

			// Prefilter to get matcher input, preserving a map for seed-results synchronization
			matcherIn = preFilter && ( seed || !selector ) ?
				condense( elems, preMap, preFilter, context, xml ) :
				elems,

			matcherOut = matcher ?
				// If we have a postFinder, or filtered seed, or non-seed postFilter or preexisting results,
				postFinder || ( seed ? preFilter : preexisting || postFilter ) ?

					// ...intermediate processing is necessary
					[] :

					// ...otherwise use results directly
					results :
				matcherIn;

		// Find primary matches
		if ( matcher ) {
			matcher( matcherIn, matcherOut, context, xml );
		}

		// Apply postFilter
		if ( postFilter ) {
			temp = condense( matcherOut, postMap );
			postFilter( temp, [], context, xml );

			// Un-match failing elements by moving them back to matcherIn
			i = temp.length;
			while ( i-- ) {
				if ( (elem = temp[i]) ) {
					matcherOut[ postMap[i] ] = !(matcherIn[ postMap[i] ] = elem);
				}
			}
		}

		if ( seed ) {
			if ( postFinder || preFilter ) {
				if ( postFinder ) {
					// Get the final matcherOut by condensing this intermediate into postFinder contexts
					temp = [];
					i = matcherOut.length;
					while ( i-- ) {
						if ( (elem = matcherOut[i]) ) {
							// Restore matcherIn since elem is not yet a final match
							temp.push( (matcherIn[i] = elem) );
						}
					}
					postFinder( null, (matcherOut = []), temp, xml );
				}

				// Move matched elements from seed to results to keep them synchronized
				i = matcherOut.length;
				while ( i-- ) {
					if ( (elem = matcherOut[i]) &&
						(temp = postFinder ? indexOf.call( seed, elem ) : preMap[i]) > -1 ) {

						seed[temp] = !(results[temp] = elem);
					}
				}
			}

		// Add elements to results, through postFinder if defined
		} else {
			matcherOut = condense(
				matcherOut === results ?
					matcherOut.splice( preexisting, matcherOut.length ) :
					matcherOut
			);
			if ( postFinder ) {
				postFinder( null, results, matcherOut, xml );
			} else {
				push.apply( results, matcherOut );
			}
		}
	});
}

function matcherFromTokens( tokens ) {
	var checkContext, matcher, j,
		len = tokens.length,
		leadingRelative = Expr.relative[ tokens[0].type ],
		implicitRelative = leadingRelative || Expr.relative[" "],
		i = leadingRelative ? 1 : 0,

		// The foundational matcher ensures that elements are reachable from top-level context(s)
		matchContext = addCombinator( function( elem ) {
			return elem === checkContext;
		}, implicitRelative, true ),
		matchAnyContext = addCombinator( function( elem ) {
			return indexOf.call( checkContext, elem ) > -1;
		}, implicitRelative, true ),
		matchers = [ function( elem, context, xml ) {
			return ( !leadingRelative && ( xml || context !== outermostContext ) ) || (
				(checkContext = context).nodeType ?
					matchContext( elem, context, xml ) :
					matchAnyContext( elem, context, xml ) );
		} ];

	for ( ; i < len; i++ ) {
		if ( (matcher = Expr.relative[ tokens[i].type ]) ) {
			matchers = [ addCombinator(elementMatcher( matchers ), matcher) ];
		} else {
			matcher = Expr.filter[ tokens[i].type ].apply( null, tokens[i].matches );

			// Return special upon seeing a positional matcher
			if ( matcher[ expando ] ) {
				// Find the next relative operator (if any) for proper handling
				j = ++i;
				for ( ; j < len; j++ ) {
					if ( Expr.relative[ tokens[j].type ] ) {
						break;
					}
				}
				return setMatcher(
					i > 1 && elementMatcher( matchers ),
					i > 1 && toSelector(
						// If the preceding token was a descendant combinator, insert an implicit any-element `*`
						tokens.slice( 0, i - 1 ).concat({ value: tokens[ i - 2 ].type === " " ? "*" : "" })
					).replace( rtrim, "$1" ),
					matcher,
					i < j && matcherFromTokens( tokens.slice( i, j ) ),
					j < len && matcherFromTokens( (tokens = tokens.slice( j )) ),
					j < len && toSelector( tokens )
				);
			}
			matchers.push( matcher );
		}
	}

	return elementMatcher( matchers );
}

function matcherFromGroupMatchers( elementMatchers, setMatchers ) {
	var bySet = setMatchers.length > 0,
		byElement = elementMatchers.length > 0,
		superMatcher = function( seed, context, xml, results, outermost ) {
			var elem, j, matcher,
				matchedCount = 0,
				i = "0",
				unmatched = seed && [],
				setMatched = [],
				contextBackup = outermostContext,
				// We must always have either seed elements or outermost context
				elems = seed || byElement && Expr.find["TAG"]( "*", outermost ),
				// Use integer dirruns iff this is the outermost matcher
				dirrunsUnique = (dirruns += contextBackup == null ? 1 : Math.random() || 0.1),
				len = elems.length;

			if ( outermost ) {
				outermostContext = context !== document && context;
			}

			// Add elements passing elementMatchers directly to results
			// Keep `i` a string if there are no elements so `matchedCount` will be "00" below
			// Support: IE<9, Safari
			// Tolerate NodeList properties (IE: "length"; Safari: <number>) matching elements by id
			for ( ; i !== len && (elem = elems[i]) != null; i++ ) {
				if ( byElement && elem ) {
					j = 0;
					while ( (matcher = elementMatchers[j++]) ) {
						if ( matcher( elem, context, xml ) ) {
							results.push( elem );
							break;
						}
					}
					if ( outermost ) {
						dirruns = dirrunsUnique;
					}
				}

				// Track unmatched elements for set filters
				if ( bySet ) {
					// They will have gone through all possible matchers
					if ( (elem = !matcher && elem) ) {
						matchedCount--;
					}

					// Lengthen the array for every element, matched or not
					if ( seed ) {
						unmatched.push( elem );
					}
				}
			}

			// Apply set filters to unmatched elements
			matchedCount += i;
			if ( bySet && i !== matchedCount ) {
				j = 0;
				while ( (matcher = setMatchers[j++]) ) {
					matcher( unmatched, setMatched, context, xml );
				}

				if ( seed ) {
					// Reintegrate element matches to eliminate the need for sorting
					if ( matchedCount > 0 ) {
						while ( i-- ) {
							if ( !(unmatched[i] || setMatched[i]) ) {
								setMatched[i] = pop.call( results );
							}
						}
					}

					// Discard index placeholder values to get only actual matches
					setMatched = condense( setMatched );
				}

				// Add matches to results
				push.apply( results, setMatched );

				// Seedless set matches succeeding multiple successful matchers stipulate sorting
				if ( outermost && !seed && setMatched.length > 0 &&
					( matchedCount + setMatchers.length ) > 1 ) {

					Sizzle.uniqueSort( results );
				}
			}

			// Override manipulation of globals by nested matchers
			if ( outermost ) {
				dirruns = dirrunsUnique;
				outermostContext = contextBackup;
			}

			return unmatched;
		};

	return bySet ?
		markFunction( superMatcher ) :
		superMatcher;
}

compile = Sizzle.compile = function( selector, group /* Internal Use Only */ ) {
	var i,
		setMatchers = [],
		elementMatchers = [],
		cached = compilerCache[ selector + " " ];

	if ( !cached ) {
		// Generate a function of recursive functions that can be used to check each element
		if ( !group ) {
			group = tokenize( selector );
		}
		i = group.length;
		while ( i-- ) {
			cached = matcherFromTokens( group[i] );
			if ( cached[ expando ] ) {
				setMatchers.push( cached );
			} else {
				elementMatchers.push( cached );
			}
		}

		// Cache the compiled function
		cached = compilerCache( selector, matcherFromGroupMatchers( elementMatchers, setMatchers ) );
	}
	return cached;
};

function multipleContexts( selector, contexts, results ) {
	var i = 0,
		len = contexts.length;
	for ( ; i < len; i++ ) {
		Sizzle( selector, contexts[i], results );
	}
	return results;
}

function select( selector, context, results, seed ) {
	var i, tokens, token, type, find,
		match = tokenize( selector );

	if ( !seed ) {
		// Try to minimize operations if there is only one group
		if ( match.length === 1 ) {

			// Take a shortcut and set the context if the root selector is an ID
			tokens = match[0] = match[0].slice( 0 );
			if ( tokens.length > 2 && (token = tokens[0]).type === "ID" &&
					support.getById && context.nodeType === 9 && documentIsHTML &&
					Expr.relative[ tokens[1].type ] ) {

				context = ( Expr.find["ID"]( token.matches[0].replace(runescape, funescape), context ) || [] )[0];
				if ( !context ) {
					return results;
				}
				selector = selector.slice( tokens.shift().value.length );
			}

			// Fetch a seed set for right-to-left matching
			i = matchExpr["needsContext"].test( selector ) ? 0 : tokens.length;
			while ( i-- ) {
				token = tokens[i];

				// Abort if we hit a combinator
				if ( Expr.relative[ (type = token.type) ] ) {
					break;
				}
				if ( (find = Expr.find[ type ]) ) {
					// Search, expanding context for leading sibling combinators
					if ( (seed = find(
						token.matches[0].replace( runescape, funescape ),
						rsibling.test( tokens[0].type ) && testContext( context.parentNode ) || context
					)) ) {

						// If seed is empty or no tokens remain, we can return early
						tokens.splice( i, 1 );
						selector = seed.length && toSelector( tokens );
						if ( !selector ) {
							push.apply( results, seed );
							return results;
						}

						break;
					}
				}
			}
		}
	}

	// Compile and execute a filtering function
	// Provide `match` to avoid retokenization if we modified the selector above
	compile( selector, match )(
		seed,
		context,
		!documentIsHTML,
		results,
		rsibling.test( selector ) && testContext( context.parentNode ) || context
	);
	return results;
}

// One-time assignments

// Sort stability
support.sortStable = expando.split("").sort( sortOrder ).join("") === expando;

// Support: Chrome<14
// Always assume duplicates if they aren't passed to the comparison function
support.detectDuplicates = !!hasDuplicate;

// Initialize against the default document
setDocument();

// Support: Webkit<537.32 - Safari 6.0.3/Chrome 25 (fixed in Chrome 27)
// Detached nodes confoundingly follow *each other*
support.sortDetached = assert(function( div1 ) {
	// Should return 1, but returns 4 (following)
	return div1.compareDocumentPosition( document.createElement("div") ) & 1;
});

// Support: IE<8
// Prevent attribute/property "interpolation"
// http://msdn.microsoft.com/en-us/library/ms536429%28VS.85%29.aspx
if ( !assert(function( div ) {
	div.innerHTML = "<a href='#'></a>";
	return div.firstChild.getAttribute("href") === "#" ;
}) ) {
	addHandle( "type|href|height|width", function( elem, name, isXML ) {
		if ( !isXML ) {
			return elem.getAttribute( name, name.toLowerCase() === "type" ? 1 : 2 );
		}
	});
}

// Support: IE<9
// Use defaultValue in place of getAttribute("value")
if ( !support.attributes || !assert(function( div ) {
	div.innerHTML = "<input/>";
	div.firstChild.setAttribute( "value", "" );
	return div.firstChild.getAttribute( "value" ) === "";
}) ) {
	addHandle( "value", function( elem, name, isXML ) {
		if ( !isXML && elem.nodeName.toLowerCase() === "input" ) {
			return elem.defaultValue;
		}
	});
}

// Support: IE<9
// Use getAttributeNode to fetch booleans when getAttribute lies
if ( !assert(function( div ) {
	return div.getAttribute("disabled") == null;
}) ) {
	addHandle( booleans, function( elem, name, isXML ) {
		var val;
		if ( !isXML ) {
			return elem[ name ] === true ? name.toLowerCase() :
					(val = elem.getAttributeNode( name )) && val.specified ?
					val.value :
				null;
		}
	});
}

return Sizzle;

})( window );



jQuery.find = Sizzle;
jQuery.expr = Sizzle.selectors;
jQuery.expr[":"] = jQuery.expr.pseudos;
jQuery.unique = Sizzle.uniqueSort;
jQuery.text = Sizzle.getText;
jQuery.isXMLDoc = Sizzle.isXML;
jQuery.contains = Sizzle.contains;



var rneedsContext = jQuery.expr.match.needsContext;

var rsingleTag = (/^<(\w+)\s*\/?>(?:<\/\1>|)$/);



var risSimple = /^.[^:#\[\.,]*$/;

// Implement the identical functionality for filter and not
function winnow( elements, qualifier, not ) {
	if ( jQuery.isFunction( qualifier ) ) {
		return jQuery.grep( elements, function( elem, i ) {
			/* jshint -W018 */
			return !!qualifier.call( elem, i, elem ) !== not;
		});

	}

	if ( qualifier.nodeType ) {
		return jQuery.grep( elements, function( elem ) {
			return ( elem === qualifier ) !== not;
		});

	}

	if ( typeof qualifier === "string" ) {
		if ( risSimple.test( qualifier ) ) {
			return jQuery.filter( qualifier, elements, not );
		}

		qualifier = jQuery.filter( qualifier, elements );
	}

	return jQuery.grep( elements, function( elem ) {
		return ( indexOf.call( qualifier, elem ) >= 0 ) !== not;
	});
}

jQuery.filter = function( expr, elems, not ) {
	var elem = elems[ 0 ];

	if ( not ) {
		expr = ":not(" + expr + ")";
	}

	return elems.length === 1 && elem.nodeType === 1 ?
		jQuery.find.matchesSelector( elem, expr ) ? [ elem ] : [] :
		jQuery.find.matches( expr, jQuery.grep( elems, function( elem ) {
			return elem.nodeType === 1;
		}));
};

jQuery.fn.extend({
	find: function( selector ) {
		var i,
			len = this.length,
			ret = [],
			self = this;

		if ( typeof selector !== "string" ) {
			return this.pushStack( jQuery( selector ).filter(function() {
				for ( i = 0; i < len; i++ ) {
					if ( jQuery.contains( self[ i ], this ) ) {
						return true;
					}
				}
			}) );
		}

		for ( i = 0; i < len; i++ ) {
			jQuery.find( selector, self[ i ], ret );
		}

		// Needed because $( selector, context ) becomes $( context ).find( selector )
		ret = this.pushStack( len > 1 ? jQuery.unique( ret ) : ret );
		ret.selector = this.selector ? this.selector + " " + selector : selector;
		return ret;
	},
	filter: function( selector ) {
		return this.pushStack( winnow(this, selector || [], false) );
	},
	not: function( selector ) {
		return this.pushStack( winnow(this, selector || [], true) );
	},
	is: function( selector ) {
		return !!winnow(
			this,

			// If this is a positional/relative selector, check membership in the returned set
			// so $("p:first").is("p:last") won't return true for a doc with two "p".
			typeof selector === "string" && rneedsContext.test( selector ) ?
				jQuery( selector ) :
				selector || [],
			false
		).length;
	}
});


// Initialize a jQuery object


// A central reference to the root jQuery(document)
var rootjQuery,

	// A simple way to check for HTML strings
	// Prioritize #id over <tag> to avoid XSS via location.hash (#9521)
	// Strict HTML recognition (#11290: must start with <)
	rquickExpr = /^(?:\s*(<[\w\W]+>)[^>]*|#([\w-]*))$/,

	init = jQuery.fn.init = function( selector, context ) {
		var match, elem;

		// HANDLE: $(""), $(null), $(undefined), $(false)
		if ( !selector ) {
			return this;
		}

		// Handle HTML strings
		if ( typeof selector === "string" ) {
			if ( selector[0] === "<" && selector[ selector.length - 1 ] === ">" && selector.length >= 3 ) {
				// Assume that strings that start and end with <> are HTML and skip the regex check
				match = [ null, selector, null ];

			} else {
				match = rquickExpr.exec( selector );
			}

			// Match html or make sure no context is specified for #id
			if ( match && (match[1] || !context) ) {

				// HANDLE: $(html) -> $(array)
				if ( match[1] ) {
					context = context instanceof jQuery ? context[0] : context;

					// scripts is true for back-compat
					// Intentionally let the error be thrown if parseHTML is not present
					jQuery.merge( this, jQuery.parseHTML(
						match[1],
						context && context.nodeType ? context.ownerDocument || context : document,
						true
					) );

					// HANDLE: $(html, props)
					if ( rsingleTag.test( match[1] ) && jQuery.isPlainObject( context ) ) {
						for ( match in context ) {
							// Properties of context are called as methods if possible
							if ( jQuery.isFunction( this[ match ] ) ) {
								this[ match ]( context[ match ] );

							// ...and otherwise set as attributes
							} else {
								this.attr( match, context[ match ] );
							}
						}
					}

					return this;

				// HANDLE: $(#id)
				} else {
					elem = document.getElementById( match[2] );

					// Check parentNode to catch when Blackberry 4.6 returns
					// nodes that are no longer in the document #6963
					if ( elem && elem.parentNode ) {
						// Inject the element directly into the jQuery object
						this.length = 1;
						this[0] = elem;
					}

					this.context = document;
					this.selector = selector;
					return this;
				}

			// HANDLE: $(expr, $(...))
			} else if ( !context || context.jquery ) {
				return ( context || rootjQuery ).find( selector );

			// HANDLE: $(expr, context)
			// (which is just equivalent to: $(context).find(expr)
			} else {
				return this.constructor( context ).find( selector );
			}

		// HANDLE: $(DOMElement)
		} else if ( selector.nodeType ) {
			this.context = this[0] = selector;
			this.length = 1;
			return this;

		// HANDLE: $(function)
		// Shortcut for document ready
		} else if ( jQuery.isFunction( selector ) ) {
			return typeof rootjQuery.ready !== "undefined" ?
				rootjQuery.ready( selector ) :
				// Execute immediately if ready is not present
				selector( jQuery );
		}

		if ( selector.selector !== undefined ) {
			this.selector = selector.selector;
			this.context = selector.context;
		}

		return jQuery.makeArray( selector, this );
	};

// Give the init function the jQuery prototype for later instantiation
init.prototype = jQuery.fn;

// Initialize central reference
rootjQuery = jQuery( document );


var rparentsprev = /^(?:parents|prev(?:Until|All))/,
	// methods guaranteed to produce a unique set when starting from a unique set
	guaranteedUnique = {
		children: true,
		contents: true,
		next: true,
		prev: true
	};

jQuery.extend({
	dir: function( elem, dir, until ) {
		var matched = [],
			truncate = until !== undefined;

		while ( (elem = elem[ dir ]) && elem.nodeType !== 9 ) {
			if ( elem.nodeType === 1 ) {
				if ( truncate && jQuery( elem ).is( until ) ) {
					break;
				}
				matched.push( elem );
			}
		}
		return matched;
	},

	sibling: function( n, elem ) {
		var matched = [];

		for ( ; n; n = n.nextSibling ) {
			if ( n.nodeType === 1 && n !== elem ) {
				matched.push( n );
			}
		}

		return matched;
	}
});

jQuery.fn.extend({
	has: function( target ) {
		var targets = jQuery( target, this ),
			l = targets.length;

		return this.filter(function() {
			var i = 0;
			for ( ; i < l; i++ ) {
				if ( jQuery.contains( this, targets[i] ) ) {
					return true;
				}
			}
		});
	},

	closest: function( selectors, context ) {
		var cur,
			i = 0,
			l = this.length,
			matched = [],
			pos = rneedsContext.test( selectors ) || typeof selectors !== "string" ?
				jQuery( selectors, context || this.context ) :
				0;

		for ( ; i < l; i++ ) {
			for ( cur = this[i]; cur && cur !== context; cur = cur.parentNode ) {
				// Always skip document fragments
				if ( cur.nodeType < 11 && (pos ?
					pos.index(cur) > -1 :

					// Don't pass non-elements to Sizzle
					cur.nodeType === 1 &&
						jQuery.find.matchesSelector(cur, selectors)) ) {

					matched.push( cur );
					break;
				}
			}
		}

		return this.pushStack( matched.length > 1 ? jQuery.unique( matched ) : matched );
	},

	// Determine the position of an element within
	// the matched set of elements
	index: function( elem ) {

		// No argument, return index in parent
		if ( !elem ) {
			return ( this[ 0 ] && this[ 0 ].parentNode ) ? this.first().prevAll().length : -1;
		}

		// index in selector
		if ( typeof elem === "string" ) {
			return indexOf.call( jQuery( elem ), this[ 0 ] );
		}

		// Locate the position of the desired element
		return indexOf.call( this,

			// If it receives a jQuery object, the first element is used
			elem.jquery ? elem[ 0 ] : elem
		);
	},

	add: function( selector, context ) {
		return this.pushStack(
			jQuery.unique(
				jQuery.merge( this.get(), jQuery( selector, context ) )
			)
		);
	},

	addBack: function( selector ) {
		return this.add( selector == null ?
			this.prevObject : this.prevObject.filter(selector)
		);
	}
});

function sibling( cur, dir ) {
	while ( (cur = cur[dir]) && cur.nodeType !== 1 ) {}
	return cur;
}

jQuery.each({
	parent: function( elem ) {
		var parent = elem.parentNode;
		return parent && parent.nodeType !== 11 ? parent : null;
	},
	parents: function( elem ) {
		return jQuery.dir( elem, "parentNode" );
	},
	parentsUntil: function( elem, i, until ) {
		return jQuery.dir( elem, "parentNode", until );
	},
	next: function( elem ) {
		return sibling( elem, "nextSibling" );
	},
	prev: function( elem ) {
		return sibling( elem, "previousSibling" );
	},
	nextAll: function( elem ) {
		return jQuery.dir( elem, "nextSibling" );
	},
	prevAll: function( elem ) {
		return jQuery.dir( elem, "previousSibling" );
	},
	nextUntil: function( elem, i, until ) {
		return jQuery.dir( elem, "nextSibling", until );
	},
	prevUntil: function( elem, i, until ) {
		return jQuery.dir( elem, "previousSibling", until );
	},
	siblings: function( elem ) {
		return jQuery.sibling( ( elem.parentNode || {} ).firstChild, elem );
	},
	children: function( elem ) {
		return jQuery.sibling( elem.firstChild );
	},
	contents: function( elem ) {
		return elem.contentDocument || jQuery.merge( [], elem.childNodes );
	}
}, function( name, fn ) {
	jQuery.fn[ name ] = function( until, selector ) {
		var matched = jQuery.map( this, fn, until );

		if ( name.slice( -5 ) !== "Until" ) {
			selector = until;
		}

		if ( selector && typeof selector === "string" ) {
			matched = jQuery.filter( selector, matched );
		}

		if ( this.length > 1 ) {
			// Remove duplicates
			if ( !guaranteedUnique[ name ] ) {
				jQuery.unique( matched );
			}

			// Reverse order for parents* and prev-derivatives
			if ( rparentsprev.test( name ) ) {
				matched.reverse();
			}
		}

		return this.pushStack( matched );
	};
});
var rnotwhite = (/\S+/g);



// String to Object options format cache
var optionsCache = {};

// Convert String-formatted options into Object-formatted ones and store in cache
function createOptions( options ) {
	var object = optionsCache[ options ] = {};
	jQuery.each( options.match( rnotwhite ) || [], function( _, flag ) {
		object[ flag ] = true;
	});
	return object;
}

/*
 * Create a callback list using the following parameters:
 *
 *	options: an optional list of space-separated options that will change how
 *			the callback list behaves or a more traditional option object
 *
 * By default a callback list will act like an event callback list and can be
 * "fired" multiple times.
 *
 * Possible options:
 *
 *	once:			will ensure the callback list can only be fired once (like a Deferred)
 *
 *	memory:			will keep track of previous values and will call any callback added
 *					after the list has been fired right away with the latest "memorized"
 *					values (like a Deferred)
 *
 *	unique:			will ensure a callback can only be added once (no duplicate in the list)
 *
 *	stopOnFalse:	interrupt callings when a callback returns false
 *
 */
jQuery.Callbacks = function( options ) {

	// Convert options from String-formatted to Object-formatted if needed
	// (we check in cache first)
	options = typeof options === "string" ?
		( optionsCache[ options ] || createOptions( options ) ) :
		jQuery.extend( {}, options );

	var // Last fire value (for non-forgettable lists)
		memory,
		// Flag to know if list was already fired
		fired,
		// Flag to know if list is currently firing
		firing,
		// First callback to fire (used internally by add and fireWith)
		firingStart,
		// End of the loop when firing
		firingLength,
		// Index of currently firing callback (modified by remove if needed)
		firingIndex,
		// Actual callback list
		list = [],
		// Stack of fire calls for repeatable lists
		stack = !options.once && [],
		// Fire callbacks
		fire = function( data ) {
			memory = options.memory && data;
			fired = true;
			firingIndex = firingStart || 0;
			firingStart = 0;
			firingLength = list.length;
			firing = true;
			for ( ; list && firingIndex < firingLength; firingIndex++ ) {
				if ( list[ firingIndex ].apply( data[ 0 ], data[ 1 ] ) === false && options.stopOnFalse ) {
					memory = false; // To prevent further calls using add
					break;
				}
			}
			firing = false;
			if ( list ) {
				if ( stack ) {
					if ( stack.length ) {
						fire( stack.shift() );
					}
				} else if ( memory ) {
					list = [];
				} else {
					self.disable();
				}
			}
		},
		// Actual Callbacks object
		self = {
			// Add a callback or a collection of callbacks to the list
			add: function() {
				if ( list ) {
					// First, we save the current length
					var start = list.length;
					(function add( args ) {
						jQuery.each( args, function( _, arg ) {
							var type = jQuery.type( arg );
							if ( type === "function" ) {
								if ( !options.unique || !self.has( arg ) ) {
									list.push( arg );
								}
							} else if ( arg && arg.length && type !== "string" ) {
								// Inspect recursively
								add( arg );
							}
						});
					})( arguments );
					// Do we need to add the callbacks to the
					// current firing batch?
					if ( firing ) {
						firingLength = list.length;
					// With memory, if we're not firing then
					// we should call right away
					} else if ( memory ) {
						firingStart = start;
						fire( memory );
					}
				}
				return this;
			},
			// Remove a callback from the list
			remove: function() {
				if ( list ) {
					jQuery.each( arguments, function( _, arg ) {
						var index;
						while ( ( index = jQuery.inArray( arg, list, index ) ) > -1 ) {
							list.splice( index, 1 );
							// Handle firing indexes
							if ( firing ) {
								if ( index <= firingLength ) {
									firingLength--;
								}
								if ( index <= firingIndex ) {
									firingIndex--;
								}
							}
						}
					});
				}
				return this;
			},
			// Check if a given callback is in the list.
			// If no argument is given, return whether or not list has callbacks attached.
			has: function( fn ) {
				return fn ? jQuery.inArray( fn, list ) > -1 : !!( list && list.length );
			},
			// Remove all callbacks from the list
			empty: function() {
				list = [];
				firingLength = 0;
				return this;
			},
			// Have the list do nothing anymore
			disable: function() {
				list = stack = memory = undefined;
				return this;
			},
			// Is it disabled?
			disabled: function() {
				return !list;
			},
			// Lock the list in its current state
			lock: function() {
				stack = undefined;
				if ( !memory ) {
					self.disable();
				}
				return this;
			},
			// Is it locked?
			locked: function() {
				return !stack;
			},
			// Call all callbacks with the given context and arguments
			fireWith: function( context, args ) {
				if ( list && ( !fired || stack ) ) {
					args = args || [];
					args = [ context, args.slice ? args.slice() : args ];
					if ( firing ) {
						stack.push( args );
					} else {
						fire( args );
					}
				}
				return this;
			},
			// Call all the callbacks with the given arguments
			fire: function() {
				self.fireWith( this, arguments );
				return this;
			},
			// To know if the callbacks have already been called at least once
			fired: function() {
				return !!fired;
			}
		};

	return self;
};


jQuery.extend({

	Deferred: function( func ) {
		var tuples = [
				// action, add listener, listener list, final state
				[ "resolve", "done", jQuery.Callbacks("once memory"), "resolved" ],
				[ "reject", "fail", jQuery.Callbacks("once memory"), "rejected" ],
				[ "notify", "progress", jQuery.Callbacks("memory") ]
			],
			state = "pending",
			promise = {
				state: function() {
					return state;
				},
				always: function() {
					deferred.done( arguments ).fail( arguments );
					return this;
				},
				then: function( /* fnDone, fnFail, fnProgress */ ) {
					var fns = arguments;
					return jQuery.Deferred(function( newDefer ) {
						jQuery.each( tuples, function( i, tuple ) {
							var fn = jQuery.isFunction( fns[ i ] ) && fns[ i ];
							// deferred[ done | fail | progress ] for forwarding actions to newDefer
							deferred[ tuple[1] ](function() {
								var returned = fn && fn.apply( this, arguments );
								if ( returned && jQuery.isFunction( returned.promise ) ) {
									returned.promise()
										.done( newDefer.resolve )
										.fail( newDefer.reject )
										.progress( newDefer.notify );
								} else {
									newDefer[ tuple[ 0 ] + "With" ]( this === promise ? newDefer.promise() : this, fn ? [ returned ] : arguments );
								}
							});
						});
						fns = null;
					}).promise();
				},
				// Get a promise for this deferred
				// If obj is provided, the promise aspect is added to the object
				promise: function( obj ) {
					return obj != null ? jQuery.extend( obj, promise ) : promise;
				}
			},
			deferred = {};

		// Keep pipe for back-compat
		promise.pipe = promise.then;

		// Add list-specific methods
		jQuery.each( tuples, function( i, tuple ) {
			var list = tuple[ 2 ],
				stateString = tuple[ 3 ];

			// promise[ done | fail | progress ] = list.add
			promise[ tuple[1] ] = list.add;

			// Handle state
			if ( stateString ) {
				list.add(function() {
					// state = [ resolved | rejected ]
					state = stateString;

				// [ reject_list | resolve_list ].disable; progress_list.lock
				}, tuples[ i ^ 1 ][ 2 ].disable, tuples[ 2 ][ 2 ].lock );
			}

			// deferred[ resolve | reject | notify ]
			deferred[ tuple[0] ] = function() {
				deferred[ tuple[0] + "With" ]( this === deferred ? promise : this, arguments );
				return this;
			};
			deferred[ tuple[0] + "With" ] = list.fireWith;
		});

		// Make the deferred a promise
		promise.promise( deferred );

		// Call given func if any
		if ( func ) {
			func.call( deferred, deferred );
		}

		// All done!
		return deferred;
	},

	// Deferred helper
	when: function( subordinate /* , ..., subordinateN */ ) {
		var i = 0,
			resolveValues = slice.call( arguments ),
			length = resolveValues.length,

			// the count of uncompleted subordinates
			remaining = length !== 1 || ( subordinate && jQuery.isFunction( subordinate.promise ) ) ? length : 0,

			// the master Deferred. If resolveValues consist of only a single Deferred, just use that.
			deferred = remaining === 1 ? subordinate : jQuery.Deferred(),

			// Update function for both resolve and progress values
			updateFunc = function( i, contexts, values ) {
				return function( value ) {
					contexts[ i ] = this;
					values[ i ] = arguments.length > 1 ? slice.call( arguments ) : value;
					if ( values === progressValues ) {
						deferred.notifyWith( contexts, values );
					} else if ( !( --remaining ) ) {
						deferred.resolveWith( contexts, values );
					}
				};
			},

			progressValues, progressContexts, resolveContexts;

		// add listeners to Deferred subordinates; treat others as resolved
		if ( length > 1 ) {
			progressValues = new Array( length );
			progressContexts = new Array( length );
			resolveContexts = new Array( length );
			for ( ; i < length; i++ ) {
				if ( resolveValues[ i ] && jQuery.isFunction( resolveValues[ i ].promise ) ) {
					resolveValues[ i ].promise()
						.done( updateFunc( i, resolveContexts, resolveValues ) )
						.fail( deferred.reject )
						.progress( updateFunc( i, progressContexts, progressValues ) );
				} else {
					--remaining;
				}
			}
		}

		// if we're not waiting on anything, resolve the master
		if ( !remaining ) {
			deferred.resolveWith( resolveContexts, resolveValues );
		}

		return deferred.promise();
	}
});


// The deferred used on DOM ready
var readyList;

jQuery.fn.ready = function( fn ) {
	// Add the callback
	jQuery.ready.promise().done( fn );

	return this;
};

jQuery.extend({
	// Is the DOM ready to be used? Set to true once it occurs.
	isReady: false,

	// A counter to track how many items to wait for before
	// the ready event fires. See #6781
	readyWait: 1,

	// Hold (or release) the ready event
	holdReady: function( hold ) {
		if ( hold ) {
			jQuery.readyWait++;
		} else {
			jQuery.ready( true );
		}
	},

	// Handle when the DOM is ready
	ready: function( wait ) {

		// Abort if there are pending holds or we're already ready
		if ( wait === true ? --jQuery.readyWait : jQuery.isReady ) {
			return;
		}

		// Remember that the DOM is ready
		jQuery.isReady = true;

		// If a normal DOM Ready event fired, decrement, and wait if need be
		if ( wait !== true && --jQuery.readyWait > 0 ) {
			return;
		}

		// If there are functions bound, to execute
		readyList.resolveWith( document, [ jQuery ] );

		// Trigger any bound ready events
		if ( jQuery.fn.trigger ) {
			jQuery( document ).trigger("ready").off("ready");
		}
	}
});

/**
 * The ready event handler and self cleanup method
 */
function completed() {
	document.removeEventListener( "DOMContentLoaded", completed, false );
	window.removeEventListener( "load", completed, false );
	jQuery.ready();
}

jQuery.ready.promise = function( obj ) {
	if ( !readyList ) {

		readyList = jQuery.Deferred();

		// Catch cases where $(document).ready() is called after the browser event has already occurred.
		// we once tried to use readyState "interactive" here, but it caused issues like the one
		// discovered by ChrisS here: http://bugs.jquery.com/ticket/12282#comment:15
		if ( document.readyState === "complete" ) {
			// Handle it asynchronously to allow scripts the opportunity to delay ready
			setTimeout( jQuery.ready );

		} else {

			// Use the handy event callback
			document.addEventListener( "DOMContentLoaded", completed, false );

			// A fallback to window.onload, that will always work
			window.addEventListener( "load", completed, false );
		}
	}
	return readyList.promise( obj );
};

// Kick off the DOM ready check even if the user does not
jQuery.ready.promise();




// Multifunctional method to get and set values of a collection
// The value/s can optionally be executed if it's a function
var access = jQuery.access = function( elems, fn, key, value, chainable, emptyGet, raw ) {
	var i = 0,
		len = elems.length,
		bulk = key == null;

	// Sets many values
	if ( jQuery.type( key ) === "object" ) {
		chainable = true;
		for ( i in key ) {
			jQuery.access( elems, fn, i, key[i], true, emptyGet, raw );
		}

	// Sets one value
	} else if ( value !== undefined ) {
		chainable = true;

		if ( !jQuery.isFunction( value ) ) {
			raw = true;
		}

		if ( bulk ) {
			// Bulk operations run against the entire set
			if ( raw ) {
				fn.call( elems, value );
				fn = null;

			// ...except when executing function values
			} else {
				bulk = fn;
				fn = function( elem, key, value ) {
					return bulk.call( jQuery( elem ), value );
				};
			}
		}

		if ( fn ) {
			for ( ; i < len; i++ ) {
				fn( elems[i], key, raw ? value : value.call( elems[i], i, fn( elems[i], key ) ) );
			}
		}
	}

	return chainable ?
		elems :

		// Gets
		bulk ?
			fn.call( elems ) :
			len ? fn( elems[0], key ) : emptyGet;
};


/**
 * Determines whether an object can have data
 */
jQuery.acceptData = function( owner ) {
	// Accepts only:
	//  - Node
	//    - Node.ELEMENT_NODE
	//    - Node.DOCUMENT_NODE
	//  - Object
	//    - Any
	/* jshint -W018 */
	return owner.nodeType === 1 || owner.nodeType === 9 || !( +owner.nodeType );
};


function Data() {
	// Support: Android < 4,
	// Old WebKit does not have Object.preventExtensions/freeze method,
	// return new empty object instead with no [[set]] accessor
	Object.defineProperty( this.cache = {}, 0, {
		get: function() {
			return {};
		}
	});

	this.expando = jQuery.expando + Math.random();
}

Data.uid = 1;
Data.accepts = jQuery.acceptData;

Data.prototype = {
	key: function( owner ) {
		// We can accept data for non-element nodes in modern browsers,
		// but we should not, see #8335.
		// Always return the key for a frozen object.
		if ( !Data.accepts( owner ) ) {
			return 0;
		}

		var descriptor = {},
			// Check if the owner object already has a cache key
			unlock = owner[ this.expando ];

		// If not, create one
		if ( !unlock ) {
			unlock = Data.uid++;

			// Secure it in a non-enumerable, non-writable property
			try {
				descriptor[ this.expando ] = { value: unlock };
				Object.defineProperties( owner, descriptor );

			// Support: Android < 4
			// Fallback to a less secure definition
			} catch ( e ) {
				descriptor[ this.expando ] = unlock;
				jQuery.extend( owner, descriptor );
			}
		}

		// Ensure the cache object
		if ( !this.cache[ unlock ] ) {
			this.cache[ unlock ] = {};
		}

		return unlock;
	},
	set: function( owner, data, value ) {
		var prop,
			// There may be an unlock assigned to this node,
			// if there is no entry for this "owner", create one inline
			// and set the unlock as though an owner entry had always existed
			unlock = this.key( owner ),
			cache = this.cache[ unlock ];

		// Handle: [ owner, key, value ] args
		if ( typeof data === "string" ) {
			cache[ data ] = value;

		// Handle: [ owner, { properties } ] args
		} else {
			// Fresh assignments by object are shallow copied
			if ( jQuery.isEmptyObject( cache ) ) {
				jQuery.extend( this.cache[ unlock ], data );
			// Otherwise, copy the properties one-by-one to the cache object
			} else {
				for ( prop in data ) {
					cache[ prop ] = data[ prop ];
				}
			}
		}
		return cache;
	},
	get: function( owner, key ) {
		// Either a valid cache is found, or will be created.
		// New caches will be created and the unlock returned,
		// allowing direct access to the newly created
		// empty data object. A valid owner object must be provided.
		var cache = this.cache[ this.key( owner ) ];

		return key === undefined ?
			cache : cache[ key ];
	},
	access: function( owner, key, value ) {
		var stored;
		// In cases where either:
		//
		//   1. No key was specified
		//   2. A string key was specified, but no value provided
		//
		// Take the "read" path and allow the get method to determine
		// which value to return, respectively either:
		//
		//   1. The entire cache object
		//   2. The data stored at the key
		//
		if ( key === undefined ||
				((key && typeof key === "string") && value === undefined) ) {

			stored = this.get( owner, key );

			return stored !== undefined ?
				stored : this.get( owner, jQuery.camelCase(key) );
		}

		// [*]When the key is not a string, or both a key and value
		// are specified, set or extend (existing objects) with either:
		//
		//   1. An object of properties
		//   2. A key and value
		//
		this.set( owner, key, value );

		// Since the "set" path can have two possible entry points
		// return the expected data based on which path was taken[*]
		return value !== undefined ? value : key;
	},
	remove: function( owner, key ) {
		var i, name, camel,
			unlock = this.key( owner ),
			cache = this.cache[ unlock ];

		if ( key === undefined ) {
			this.cache[ unlock ] = {};

		} else {
			// Support array or space separated string of keys
			if ( jQuery.isArray( key ) ) {
				// If "name" is an array of keys...
				// When data is initially created, via ("key", "val") signature,
				// keys will be converted to camelCase.
				// Since there is no way to tell _how_ a key was added, remove
				// both plain key and camelCase key. #12786
				// This will only penalize the array argument path.
				name = key.concat( key.map( jQuery.camelCase ) );
			} else {
				camel = jQuery.camelCase( key );
				// Try the string as a key before any manipulation
				if ( key in cache ) {
					name = [ key, camel ];
				} else {
					// If a key with the spaces exists, use it.
					// Otherwise, create an array by matching non-whitespace
					name = camel;
					name = name in cache ?
						[ name ] : ( name.match( rnotwhite ) || [] );
				}
			}

			i = name.length;
			while ( i-- ) {
				delete cache[ name[ i ] ];
			}
		}
	},
	hasData: function( owner ) {
		return !jQuery.isEmptyObject(
			this.cache[ owner[ this.expando ] ] || {}
		);
	},
	discard: function( owner ) {
		if ( owner[ this.expando ] ) {
			delete this.cache[ owner[ this.expando ] ];
		}
	}
};
var data_priv = new Data();

var data_user = new Data();



/*
	Implementation Summary

	1. Enforce API surface and semantic compatibility with 1.9.x branch
	2. Improve the module's maintainability by reducing the storage
		paths to a single mechanism.
	3. Use the same single mechanism to support "private" and "user" data.
	4. _Never_ expose "private" data to user code (TODO: Drop _data, _removeData)
	5. Avoid exposing implementation details on user objects (eg. expando properties)
	6. Provide a clear path for implementation upgrade to WeakMap in 2014
*/
var rbrace = /^(?:\{[\w\W]*\}|\[[\w\W]*\])$/,
	rmultiDash = /([A-Z])/g;

function dataAttr( elem, key, data ) {
	var name;

	// If nothing was found internally, try to fetch any
	// data from the HTML5 data-* attribute
	if ( data === undefined && elem.nodeType === 1 ) {
		name = "data-" + key.replace( rmultiDash, "-$1" ).toLowerCase();
		data = elem.getAttribute( name );

		if ( typeof data === "string" ) {
			try {
				data = data === "true" ? true :
					data === "false" ? false :
					data === "null" ? null :
					// Only convert to a number if it doesn't change the string
					+data + "" === data ? +data :
					rbrace.test( data ) ? jQuery.parseJSON( data ) :
					data;
			} catch( e ) {}

			// Make sure we set the data so it isn't changed later
			data_user.set( elem, key, data );
		} else {
			data = undefined;
		}
	}
	return data;
}

jQuery.extend({
	hasData: function( elem ) {
		return data_user.hasData( elem ) || data_priv.hasData( elem );
	},

	data: function( elem, name, data ) {
		return data_user.access( elem, name, data );
	},

	removeData: function( elem, name ) {
		data_user.remove( elem, name );
	},

	// TODO: Now that all calls to _data and _removeData have been replaced
	// with direct calls to data_priv methods, these can be deprecated.
	_data: function( elem, name, data ) {
		return data_priv.access( elem, name, data );
	},

	_removeData: function( elem, name ) {
		data_priv.remove( elem, name );
	}
});

jQuery.fn.extend({
	data: function( key, value ) {
		var i, name, data,
			elem = this[ 0 ],
			attrs = elem && elem.attributes;

		// Gets all values
		if ( key === undefined ) {
			if ( this.length ) {
				data = data_user.get( elem );

				if ( elem.nodeType === 1 && !data_priv.get( elem, "hasDataAttrs" ) ) {
					i = attrs.length;
					while ( i-- ) {
						name = attrs[ i ].name;

						if ( name.indexOf( "data-" ) === 0 ) {
							name = jQuery.camelCase( name.slice(5) );
							dataAttr( elem, name, data[ name ] );
						}
					}
					data_priv.set( elem, "hasDataAttrs", true );
				}
			}

			return data;
		}

		// Sets multiple values
		if ( typeof key === "object" ) {
			return this.each(function() {
				data_user.set( this, key );
			});
		}

		return access( this, function( value ) {
			var data,
				camelKey = jQuery.camelCase( key );

			// The calling jQuery object (element matches) is not empty
			// (and therefore has an element appears at this[ 0 ]) and the
			// `value` parameter was not undefined. An empty jQuery object
			// will result in `undefined` for elem = this[ 0 ] which will
			// throw an exception if an attempt to read a data cache is made.
			if ( elem && value === undefined ) {
				// Attempt to get data from the cache
				// with the key as-is
				data = data_user.get( elem, key );
				if ( data !== undefined ) {
					return data;
				}

				// Attempt to get data from the cache
				// with the key camelized
				data = data_user.get( elem, camelKey );
				if ( data !== undefined ) {
					return data;
				}

				// Attempt to "discover" the data in
				// HTML5 custom data-* attrs
				data = dataAttr( elem, camelKey, undefined );
				if ( data !== undefined ) {
					return data;
				}

				// We tried really hard, but the data doesn't exist.
				return;
			}

			// Set the data...
			this.each(function() {
				// First, attempt to store a copy or reference of any
				// data that might've been store with a camelCased key.
				var data = data_user.get( this, camelKey );

				// For HTML5 data-* attribute interop, we have to
				// store property names with dashes in a camelCase form.
				// This might not apply to all properties...*
				data_user.set( this, camelKey, value );

				// *... In the case of properties that might _actually_
				// have dashes, we need to also store a copy of that
				// unchanged property.
				if ( key.indexOf("-") !== -1 && data !== undefined ) {
					data_user.set( this, key, value );
				}
			});
		}, null, value, arguments.length > 1, null, true );
	},

	removeData: function( key ) {
		return this.each(function() {
			data_user.remove( this, key );
		});
	}
});


jQuery.extend({
	queue: function( elem, type, data ) {
		var queue;

		if ( elem ) {
			type = ( type || "fx" ) + "queue";
			queue = data_priv.get( elem, type );

			// Speed up dequeue by getting out quickly if this is just a lookup
			if ( data ) {
				if ( !queue || jQuery.isArray( data ) ) {
					queue = data_priv.access( elem, type, jQuery.makeArray(data) );
				} else {
					queue.push( data );
				}
			}
			return queue || [];
		}
	},

	dequeue: function( elem, type ) {
		type = type || "fx";

		var queue = jQuery.queue( elem, type ),
			startLength = queue.length,
			fn = queue.shift(),
			hooks = jQuery._queueHooks( elem, type ),
			next = function() {
				jQuery.dequeue( elem, type );
			};

		// If the fx queue is dequeued, always remove the progress sentinel
		if ( fn === "inprogress" ) {
			fn = queue.shift();
			startLength--;
		}

		if ( fn ) {

			// Add a progress sentinel to prevent the fx queue from being
			// automatically dequeued
			if ( type === "fx" ) {
				queue.unshift( "inprogress" );
			}

			// clear up the last queue stop function
			delete hooks.stop;
			fn.call( elem, next, hooks );
		}

		if ( !startLength && hooks ) {
			hooks.empty.fire();
		}
	},

	// not intended for public consumption - generates a queueHooks object, or returns the current one
	_queueHooks: function( elem, type ) {
		var key = type + "queueHooks";
		return data_priv.get( elem, key ) || data_priv.access( elem, key, {
			empty: jQuery.Callbacks("once memory").add(function() {
				data_priv.remove( elem, [ type + "queue", key ] );
			})
		});
	}
});

jQuery.fn.extend({
	queue: function( type, data ) {
		var setter = 2;

		if ( typeof type !== "string" ) {
			data = type;
			type = "fx";
			setter--;
		}

		if ( arguments.length < setter ) {
			return jQuery.queue( this[0], type );
		}

		return data === undefined ?
			this :
			this.each(function() {
				var queue = jQuery.queue( this, type, data );

				// ensure a hooks for this queue
				jQuery._queueHooks( this, type );

				if ( type === "fx" && queue[0] !== "inprogress" ) {
					jQuery.dequeue( this, type );
				}
			});
	},
	dequeue: function( type ) {
		return this.each(function() {
			jQuery.dequeue( this, type );
		});
	},
	clearQueue: function( type ) {
		return this.queue( type || "fx", [] );
	},
	// Get a promise resolved when queues of a certain type
	// are emptied (fx is the type by default)
	promise: function( type, obj ) {
		var tmp,
			count = 1,
			defer = jQuery.Deferred(),
			elements = this,
			i = this.length,
			resolve = function() {
				if ( !( --count ) ) {
					defer.resolveWith( elements, [ elements ] );
				}
			};

		if ( typeof type !== "string" ) {
			obj = type;
			type = undefined;
		}
		type = type || "fx";

		while ( i-- ) {
			tmp = data_priv.get( elements[ i ], type + "queueHooks" );
			if ( tmp && tmp.empty ) {
				count++;
				tmp.empty.add( resolve );
			}
		}
		resolve();
		return defer.promise( obj );
	}
});
var pnum = (/[+-]?(?:\d*\.|)\d+(?:[eE][+-]?\d+|)/).source;

var cssExpand = [ "Top", "Right", "Bottom", "Left" ];

var isHidden = function( elem, el ) {
		// isHidden might be called from jQuery#filter function;
		// in that case, element will be second argument
		elem = el || elem;
		return jQuery.css( elem, "display" ) === "none" || !jQuery.contains( elem.ownerDocument, elem );
	};

var rcheckableType = (/^(?:checkbox|radio)$/i);



(function() {
	var fragment = document.createDocumentFragment(),
		div = fragment.appendChild( document.createElement( "div" ) );

	// #11217 - WebKit loses check when the name is after the checked attribute
	div.innerHTML = "<input type='radio' checked='checked' name='t'/>";

	// Support: Safari 5.1, iOS 5.1, Android 4.x, Android 2.3
	// old WebKit doesn't clone checked state correctly in fragments
	support.checkClone = div.cloneNode( true ).cloneNode( true ).lastChild.checked;

	// Make sure textarea (and checkbox) defaultValue is properly cloned
	// Support: IE9-IE11+
	div.innerHTML = "<textarea>x</textarea>";
	support.noCloneChecked = !!div.cloneNode( true ).lastChild.defaultValue;
})();
var strundefined = typeof undefined;



support.focusinBubbles = "onfocusin" in window;


var
	rkeyEvent = /^key/,
	rmouseEvent = /^(?:mouse|contextmenu)|click/,
	rfocusMorph = /^(?:focusinfocus|focusoutblur)$/,
	rtypenamespace = /^([^.]*)(?:\.(.+)|)$/;

function returnTrue() {
	return true;
}

function returnFalse() {
	return false;
}

function safeActiveElement() {
	try {
		return document.activeElement;
	} catch ( err ) { }
}

/*
 * Helper functions for managing events -- not part of the public interface.
 * Props to Dean Edwards' addEvent library for many of the ideas.
 */
jQuery.event = {

	global: {},

	add: function( elem, types, handler, data, selector ) {

		var handleObjIn, eventHandle, tmp,
			events, t, handleObj,
			special, handlers, type, namespaces, origType,
			elemData = data_priv.get( elem );

		// Don't attach events to noData or text/comment nodes (but allow plain objects)
		if ( !elemData ) {
			return;
		}

		// Caller can pass in an object of custom data in lieu of the handler
		if ( handler.handler ) {
			handleObjIn = handler;
			handler = handleObjIn.handler;
			selector = handleObjIn.selector;
		}

		// Make sure that the handler has a unique ID, used to find/remove it later
		if ( !handler.guid ) {
			handler.guid = jQuery.guid++;
		}

		// Init the element's event structure and main handler, if this is the first
		if ( !(events = elemData.events) ) {
			events = elemData.events = {};
		}
		if ( !(eventHandle = elemData.handle) ) {
			eventHandle = elemData.handle = function( e ) {
				// Discard the second event of a jQuery.event.trigger() and
				// when an event is called after a page has unloaded
				return typeof jQuery !== strundefined && jQuery.event.triggered !== e.type ?
					jQuery.event.dispatch.apply( elem, arguments ) : undefined;
			};
		}

		// Handle multiple events separated by a space
		types = ( types || "" ).match( rnotwhite ) || [ "" ];
		t = types.length;
		while ( t-- ) {
			tmp = rtypenamespace.exec( types[t] ) || [];
			type = origType = tmp[1];
			namespaces = ( tmp[2] || "" ).split( "." ).sort();

			// There *must* be a type, no attaching namespace-only handlers
			if ( !type ) {
				continue;
			}

			// If event changes its type, use the special event handlers for the changed type
			special = jQuery.event.special[ type ] || {};

			// If selector defined, determine special event api type, otherwise given type
			type = ( selector ? special.delegateType : special.bindType ) || type;

			// Update special based on newly reset type
			special = jQuery.event.special[ type ] || {};

			// handleObj is passed to all event handlers
			handleObj = jQuery.extend({
				type: type,
				origType: origType,
				data: data,
				handler: handler,
				guid: handler.guid,
				selector: selector,
				needsContext: selector && jQuery.expr.match.needsContext.test( selector ),
				namespace: namespaces.join(".")
			}, handleObjIn );

			// Init the event handler queue if we're the first
			if ( !(handlers = events[ type ]) ) {
				handlers = events[ type ] = [];
				handlers.delegateCount = 0;

				// Only use addEventListener if the special events handler returns false
				if ( !special.setup || special.setup.call( elem, data, namespaces, eventHandle ) === false ) {
					if ( elem.addEventListener ) {
						elem.addEventListener( type, eventHandle, false );
					}
				}
			}

			if ( special.add ) {
				special.add.call( elem, handleObj );

				if ( !handleObj.handler.guid ) {
					handleObj.handler.guid = handler.guid;
				}
			}

			// Add to the element's handler list, delegates in front
			if ( selector ) {
				handlers.splice( handlers.delegateCount++, 0, handleObj );
			} else {
				handlers.push( handleObj );
			}

			// Keep track of which events have ever been used, for event optimization
			jQuery.event.global[ type ] = true;
		}

	},

	// Detach an event or set of events from an element
	remove: function( elem, types, handler, selector, mappedTypes ) {

		var j, origCount, tmp,
			events, t, handleObj,
			special, handlers, type, namespaces, origType,
			elemData = data_priv.hasData( elem ) && data_priv.get( elem );

		if ( !elemData || !(events = elemData.events) ) {
			return;
		}

		// Once for each type.namespace in types; type may be omitted
		types = ( types || "" ).match( rnotwhite ) || [ "" ];
		t = types.length;
		while ( t-- ) {
			tmp = rtypenamespace.exec( types[t] ) || [];
			type = origType = tmp[1];
			namespaces = ( tmp[2] || "" ).split( "." ).sort();

			// Unbind all events (on this namespace, if provided) for the element
			if ( !type ) {
				for ( type in events ) {
					jQuery.event.remove( elem, type + types[ t ], handler, selector, true );
				}
				continue;
			}

			special = jQuery.event.special[ type ] || {};
			type = ( selector ? special.delegateType : special.bindType ) || type;
			handlers = events[ type ] || [];
			tmp = tmp[2] && new RegExp( "(^|\\.)" + namespaces.join("\\.(?:.*\\.|)") + "(\\.|$)" );

			// Remove matching events
			origCount = j = handlers.length;
			while ( j-- ) {
				handleObj = handlers[ j ];

				if ( ( mappedTypes || origType === handleObj.origType ) &&
					( !handler || handler.guid === handleObj.guid ) &&
					( !tmp || tmp.test( handleObj.namespace ) ) &&
					( !selector || selector === handleObj.selector || selector === "**" && handleObj.selector ) ) {
					handlers.splice( j, 1 );

					if ( handleObj.selector ) {
						handlers.delegateCount--;
					}
					if ( special.remove ) {
						special.remove.call( elem, handleObj );
					}
				}
			}

			// Remove generic event handler if we removed something and no more handlers exist
			// (avoids potential for endless recursion during removal of special event handlers)
			if ( origCount && !handlers.length ) {
				if ( !special.teardown || special.teardown.call( elem, namespaces, elemData.handle ) === false ) {
					jQuery.removeEvent( elem, type, elemData.handle );
				}

				delete events[ type ];
			}
		}

		// Remove the expando if it's no longer used
		if ( jQuery.isEmptyObject( events ) ) {
			delete elemData.handle;
			data_priv.remove( elem, "events" );
		}
	},

	trigger: function( event, data, elem, onlyHandlers ) {

		var i, cur, tmp, bubbleType, ontype, handle, special,
			eventPath = [ elem || document ],
			type = hasOwn.call( event, "type" ) ? event.type : event,
			namespaces = hasOwn.call( event, "namespace" ) ? event.namespace.split(".") : [];

		cur = tmp = elem = elem || document;

		// Don't do events on text and comment nodes
		if ( elem.nodeType === 3 || elem.nodeType === 8 ) {
			return;
		}

		// focus/blur morphs to focusin/out; ensure we're not firing them right now
		if ( rfocusMorph.test( type + jQuery.event.triggered ) ) {
			return;
		}

		if ( type.indexOf(".") >= 0 ) {
			// Namespaced trigger; create a regexp to match event type in handle()
			namespaces = type.split(".");
			type = namespaces.shift();
			namespaces.sort();
		}
		ontype = type.indexOf(":") < 0 && "on" + type;

		// Caller can pass in a jQuery.Event object, Object, or just an event type string
		event = event[ jQuery.expando ] ?
			event :
			new jQuery.Event( type, typeof event === "object" && event );

		// Trigger bitmask: & 1 for native handlers; & 2 for jQuery (always true)
		event.isTrigger = onlyHandlers ? 2 : 3;
		event.namespace = namespaces.join(".");
		event.namespace_re = event.namespace ?
			new RegExp( "(^|\\.)" + namespaces.join("\\.(?:.*\\.|)") + "(\\.|$)" ) :
			null;

		// Clean up the event in case it is being reused
		event.result = undefined;
		if ( !event.target ) {
			event.target = elem;
		}

		// Clone any incoming data and prepend the event, creating the handler arg list
		data = data == null ?
			[ event ] :
			jQuery.makeArray( data, [ event ] );

		// Allow special events to draw outside the lines
		special = jQuery.event.special[ type ] || {};
		if ( !onlyHandlers && special.trigger && special.trigger.apply( elem, data ) === false ) {
			return;
		}

		// Determine event propagation path in advance, per W3C events spec (#9951)
		// Bubble up to document, then to window; watch for a global ownerDocument var (#9724)
		if ( !onlyHandlers && !special.noBubble && !jQuery.isWindow( elem ) ) {

			bubbleType = special.delegateType || type;
			if ( !rfocusMorph.test( bubbleType + type ) ) {
				cur = cur.parentNode;
			}
			for ( ; cur; cur = cur.parentNode ) {
				eventPath.push( cur );
				tmp = cur;
			}

			// Only add window if we got to document (e.g., not plain obj or detached DOM)
			if ( tmp === (elem.ownerDocument || document) ) {
				eventPath.push( tmp.defaultView || tmp.parentWindow || window );
			}
		}

		// Fire handlers on the event path
		i = 0;
		while ( (cur = eventPath[i++]) && !event.isPropagationStopped() ) {

			event.type = i > 1 ?
				bubbleType :
				special.bindType || type;

			// jQuery handler
			handle = ( data_priv.get( cur, "events" ) || {} )[ event.type ] && data_priv.get( cur, "handle" );
			if ( handle ) {
				handle.apply( cur, data );
			}

			// Native handler
			handle = ontype && cur[ ontype ];
			if ( handle && handle.apply && jQuery.acceptData( cur ) ) {
				event.result = handle.apply( cur, data );
				if ( event.result === false ) {
					event.preventDefault();
				}
			}
		}
		event.type = type;

		// If nobody prevented the default action, do it now
		if ( !onlyHandlers && !event.isDefaultPrevented() ) {

			if ( (!special._default || special._default.apply( eventPath.pop(), data ) === false) &&
				jQuery.acceptData( elem ) ) {

				// Call a native DOM method on the target with the same name name as the event.
				// Don't do default actions on window, that's where global variables be (#6170)
				if ( ontype && jQuery.isFunction( elem[ type ] ) && !jQuery.isWindow( elem ) ) {

					// Don't re-trigger an onFOO event when we call its FOO() method
					tmp = elem[ ontype ];

					if ( tmp ) {
						elem[ ontype ] = null;
					}

					// Prevent re-triggering of the same event, since we already bubbled it above
					jQuery.event.triggered = type;
					elem[ type ]();
					jQuery.event.triggered = undefined;

					if ( tmp ) {
						elem[ ontype ] = tmp;
					}
				}
			}
		}

		return event.result;
	},

	dispatch: function( event ) {

		// Make a writable jQuery.Event from the native event object
		event = jQuery.event.fix( event );

		var i, j, ret, matched, handleObj,
			handlerQueue = [],
			args = slice.call( arguments ),
			handlers = ( data_priv.get( this, "events" ) || {} )[ event.type ] || [],
			special = jQuery.event.special[ event.type ] || {};

		// Use the fix-ed jQuery.Event rather than the (read-only) native event
		args[0] = event;
		event.delegateTarget = this;

		// Call the preDispatch hook for the mapped type, and let it bail if desired
		if ( special.preDispatch && special.preDispatch.call( this, event ) === false ) {
			return;
		}

		// Determine handlers
		handlerQueue = jQuery.event.handlers.call( this, event, handlers );

		// Run delegates first; they may want to stop propagation beneath us
		i = 0;
		while ( (matched = handlerQueue[ i++ ]) && !event.isPropagationStopped() ) {
			event.currentTarget = matched.elem;

			j = 0;
			while ( (handleObj = matched.handlers[ j++ ]) && !event.isImmediatePropagationStopped() ) {

				// Triggered event must either 1) have no namespace, or
				// 2) have namespace(s) a subset or equal to those in the bound event (both can have no namespace).
				if ( !event.namespace_re || event.namespace_re.test( handleObj.namespace ) ) {

					event.handleObj = handleObj;
					event.data = handleObj.data;

					ret = ( (jQuery.event.special[ handleObj.origType ] || {}).handle || handleObj.handler )
							.apply( matched.elem, args );

					if ( ret !== undefined ) {
						if ( (event.result = ret) === false ) {
							event.preventDefault();
							event.stopPropagation();
						}
					}
				}
			}
		}

		// Call the postDispatch hook for the mapped type
		if ( special.postDispatch ) {
			special.postDispatch.call( this, event );
		}

		return event.result;
	},

	handlers: function( event, handlers ) {
		var i, matches, sel, handleObj,
			handlerQueue = [],
			delegateCount = handlers.delegateCount,
			cur = event.target;

		// Find delegate handlers
		// Black-hole SVG <use> instance trees (#13180)
		// Avoid non-left-click bubbling in Firefox (#3861)
		if ( delegateCount && cur.nodeType && (!event.button || event.type !== "click") ) {

			for ( ; cur !== this; cur = cur.parentNode || this ) {

				// Don't process clicks on disabled elements (#6911, #8165, #11382, #11764)
				if ( cur.disabled !== true || event.type !== "click" ) {
					matches = [];
					for ( i = 0; i < delegateCount; i++ ) {
						handleObj = handlers[ i ];

						// Don't conflict with Object.prototype properties (#13203)
						sel = handleObj.selector + " ";

						if ( matches[ sel ] === undefined ) {
							matches[ sel ] = handleObj.needsContext ?
								jQuery( sel, this ).index( cur ) >= 0 :
								jQuery.find( sel, this, null, [ cur ] ).length;
						}
						if ( matches[ sel ] ) {
							matches.push( handleObj );
						}
					}
					if ( matches.length ) {
						handlerQueue.push({ elem: cur, handlers: matches });
					}
				}
			}
		}

		// Add the remaining (directly-bound) handlers
		if ( delegateCount < handlers.length ) {
			handlerQueue.push({ elem: this, handlers: handlers.slice( delegateCount ) });
		}

		return handlerQueue;
	},

	// Includes some event props shared by KeyEvent and MouseEvent
	props: "altKey bubbles cancelable ctrlKey currentTarget eventPhase metaKey relatedTarget shiftKey target timeStamp view which".split(" "),

	fixHooks: {},

	keyHooks: {
		props: "char charCode key keyCode".split(" "),
		filter: function( event, original ) {

			// Add which for key events
			if ( event.which == null ) {
				event.which = original.charCode != null ? original.charCode : original.keyCode;
			}

			return event;
		}
	},

	mouseHooks: {
		props: "button buttons clientX clientY offsetX offsetY pageX pageY screenX screenY toElement".split(" "),
		filter: function( event, original ) {
			var eventDoc, doc, body,
				button = original.button;

			// Calculate pageX/Y if missing and clientX/Y available
			if ( event.pageX == null && original.clientX != null ) {
				eventDoc = event.target.ownerDocument || document;
				doc = eventDoc.documentElement;
				body = eventDoc.body;

				event.pageX = original.clientX + ( doc && doc.scrollLeft || body && body.scrollLeft || 0 ) - ( doc && doc.clientLeft || body && body.clientLeft || 0 );
				event.pageY = original.clientY + ( doc && doc.scrollTop  || body && body.scrollTop  || 0 ) - ( doc && doc.clientTop  || body && body.clientTop  || 0 );
			}

			// Add which for click: 1 === left; 2 === middle; 3 === right
			// Note: button is not normalized, so don't use it
			if ( !event.which && button !== undefined ) {
				event.which = ( button & 1 ? 1 : ( button & 2 ? 3 : ( button & 4 ? 2 : 0 ) ) );
			}

			return event;
		}
	},

	fix: function( event ) {
		if ( event[ jQuery.expando ] ) {
			return event;
		}

		// Create a writable copy of the event object and normalize some properties
		var i, prop, copy,
			type = event.type,
			originalEvent = event,
			fixHook = this.fixHooks[ type ];

		if ( !fixHook ) {
			this.fixHooks[ type ] = fixHook =
				rmouseEvent.test( type ) ? this.mouseHooks :
				rkeyEvent.test( type ) ? this.keyHooks :
				{};
		}
		copy = fixHook.props ? this.props.concat( fixHook.props ) : this.props;

		event = new jQuery.Event( originalEvent );

		i = copy.length;
		while ( i-- ) {
			prop = copy[ i ];
			event[ prop ] = originalEvent[ prop ];
		}

		// Support: Cordova 2.5 (WebKit) (#13255)
		// All events should have a target; Cordova deviceready doesn't
		if ( !event.target ) {
			event.target = document;
		}

		// Support: Safari 6.0+, Chrome < 28
		// Target should not be a text node (#504, #13143)
		if ( event.target.nodeType === 3 ) {
			event.target = event.target.parentNode;
		}

		return fixHook.filter ? fixHook.filter( event, originalEvent ) : event;
	},

	special: {
		load: {
			// Prevent triggered image.load events from bubbling to window.load
			noBubble: true
		},
		focus: {
			// Fire native event if possible so blur/focus sequence is correct
			trigger: function() {
				if ( this !== safeActiveElement() && this.focus ) {
					this.focus();
					return false;
				}
			},
			delegateType: "focusin"
		},
		blur: {
			trigger: function() {
				if ( this === safeActiveElement() && this.blur ) {
					this.blur();
					return false;
				}
			},
			delegateType: "focusout"
		},
		click: {
			// For checkbox, fire native event so checked state will be right
			trigger: function() {
				if ( this.type === "checkbox" && this.click && jQuery.nodeName( this, "input" ) ) {
					this.click();
					return false;
				}
			},

			// For cross-browser consistency, don't fire native .click() on links
			_default: function( event ) {
				return jQuery.nodeName( event.target, "a" );
			}
		},

		beforeunload: {
			postDispatch: function( event ) {

				// Support: Firefox 20+
				// Firefox doesn't alert if the returnValue field is not set.
				if ( event.result !== undefined ) {
					event.originalEvent.returnValue = event.result;
				}
			}
		}
	},

	simulate: function( type, elem, event, bubble ) {
		// Piggyback on a donor event to simulate a different one.
		// Fake originalEvent to avoid donor's stopPropagation, but if the
		// simulated event prevents default then we do the same on the donor.
		var e = jQuery.extend(
			new jQuery.Event(),
			event,
			{
				type: type,
				isSimulated: true,
				originalEvent: {}
			}
		);
		if ( bubble ) {
			jQuery.event.trigger( e, null, elem );
		} else {
			jQuery.event.dispatch.call( elem, e );
		}
		if ( e.isDefaultPrevented() ) {
			event.preventDefault();
		}
	}
};

jQuery.removeEvent = function( elem, type, handle ) {
	if ( elem.removeEventListener ) {
		elem.removeEventListener( type, handle, false );
	}
};

jQuery.Event = function( src, props ) {
	// Allow instantiation without the 'new' keyword
	if ( !(this instanceof jQuery.Event) ) {
		return new jQuery.Event( src, props );
	}

	// Event object
	if ( src && src.type ) {
		this.originalEvent = src;
		this.type = src.type;

		// Events bubbling up the document may have been marked as prevented
		// by a handler lower down the tree; reflect the correct value.
		this.isDefaultPrevented = src.defaultPrevented ||
				// Support: Android < 4.0
				src.defaultPrevented === undefined &&
				src.getPreventDefault && src.getPreventDefault() ?
			returnTrue :
			returnFalse;

	// Event type
	} else {
		this.type = src;
	}

	// Put explicitly provided properties onto the event object
	if ( props ) {
		jQuery.extend( this, props );
	}

	// Create a timestamp if incoming event doesn't have one
	this.timeStamp = src && src.timeStamp || jQuery.now();

	// Mark it as fixed
	this[ jQuery.expando ] = true;
};

// jQuery.Event is based on DOM3 Events as specified by the ECMAScript Language Binding
// http://www.w3.org/TR/2003/WD-DOM-Level-3-Events-20030331/ecma-script-binding.html
jQuery.Event.prototype = {
	isDefaultPrevented: returnFalse,
	isPropagationStopped: returnFalse,
	isImmediatePropagationStopped: returnFalse,

	preventDefault: function() {
		var e = this.originalEvent;

		this.isDefaultPrevented = returnTrue;

		if ( e && e.preventDefault ) {
			e.preventDefault();
		}
	},
	stopPropagation: function() {
		var e = this.originalEvent;

		this.isPropagationStopped = returnTrue;

		if ( e && e.stopPropagation ) {
			e.stopPropagation();
		}
	},
	stopImmediatePropagation: function() {
		this.isImmediatePropagationStopped = returnTrue;
		this.stopPropagation();
	}
};

// Create mouseenter/leave events using mouseover/out and event-time checks
// Support: Chrome 15+
jQuery.each({
	mouseenter: "mouseover",
	mouseleave: "mouseout"
}, function( orig, fix ) {
	jQuery.event.special[ orig ] = {
		delegateType: fix,
		bindType: fix,

		handle: function( event ) {
			var ret,
				target = this,
				related = event.relatedTarget,
				handleObj = event.handleObj;

			// For mousenter/leave call the handler if related is outside the target.
			// NB: No relatedTarget if the mouse left/entered the browser window
			if ( !related || (related !== target && !jQuery.contains( target, related )) ) {
				event.type = handleObj.origType;
				ret = handleObj.handler.apply( this, arguments );
				event.type = fix;
			}
			return ret;
		}
	};
});

// Create "bubbling" focus and blur events
// Support: Firefox, Chrome, Safari
if ( !support.focusinBubbles ) {
	jQuery.each({ focus: "focusin", blur: "focusout" }, function( orig, fix ) {

		// Attach a single capturing handler on the document while someone wants focusin/focusout
		var handler = function( event ) {
				jQuery.event.simulate( fix, event.target, jQuery.event.fix( event ), true );
			};

		jQuery.event.special[ fix ] = {
			setup: function() {
				var doc = this.ownerDocument || this,
					attaches = data_priv.access( doc, fix );

				if ( !attaches ) {
					doc.addEventListener( orig, handler, true );
				}
				data_priv.access( doc, fix, ( attaches || 0 ) + 1 );
			},
			teardown: function() {
				var doc = this.ownerDocument || this,
					attaches = data_priv.access( doc, fix ) - 1;

				if ( !attaches ) {
					doc.removeEventListener( orig, handler, true );
					data_priv.remove( doc, fix );

				} else {
					data_priv.access( doc, fix, attaches );
				}
			}
		};
	});
}

jQuery.fn.extend({

	on: function( types, selector, data, fn, /*INTERNAL*/ one ) {
		var origFn, type;

		// Types can be a map of types/handlers
		if ( typeof types === "object" ) {
			// ( types-Object, selector, data )
			if ( typeof selector !== "string" ) {
				// ( types-Object, data )
				data = data || selector;
				selector = undefined;
			}
			for ( type in types ) {
				this.on( type, selector, data, types[ type ], one );
			}
			return this;
		}

		if ( data == null && fn == null ) {
			// ( types, fn )
			fn = selector;
			data = selector = undefined;
		} else if ( fn == null ) {
			if ( typeof selector === "string" ) {
				// ( types, selector, fn )
				fn = data;
				data = undefined;
			} else {
				// ( types, data, fn )
				fn = data;
				data = selector;
				selector = undefined;
			}
		}
		if ( fn === false ) {
			fn = returnFalse;
		} else if ( !fn ) {
			return this;
		}

		if ( one === 1 ) {
			origFn = fn;
			fn = function( event ) {
				// Can use an empty set, since event contains the info
				jQuery().off( event );
				return origFn.apply( this, arguments );
			};
			// Use same guid so caller can remove using origFn
			fn.guid = origFn.guid || ( origFn.guid = jQuery.guid++ );
		}
		return this.each( function() {
			jQuery.event.add( this, types, fn, data, selector );
		});
	},
	one: function( types, selector, data, fn ) {
		return this.on( types, selector, data, fn, 1 );
	},
	off: function( types, selector, fn ) {
		var handleObj, type;
		if ( types && types.preventDefault && types.handleObj ) {
			// ( event )  dispatched jQuery.Event
			handleObj = types.handleObj;
			jQuery( types.delegateTarget ).off(
				handleObj.namespace ? handleObj.origType + "." + handleObj.namespace : handleObj.origType,
				handleObj.selector,
				handleObj.handler
			);
			return this;
		}
		if ( typeof types === "object" ) {
			// ( types-object [, selector] )
			for ( type in types ) {
				this.off( type, selector, types[ type ] );
			}
			return this;
		}
		if ( selector === false || typeof selector === "function" ) {
			// ( types [, fn] )
			fn = selector;
			selector = undefined;
		}
		if ( fn === false ) {
			fn = returnFalse;
		}
		return this.each(function() {
			jQuery.event.remove( this, types, fn, selector );
		});
	},

	trigger: function( type, data ) {
		return this.each(function() {
			jQuery.event.trigger( type, data, this );
		});
	},
	triggerHandler: function( type, data ) {
		var elem = this[0];
		if ( elem ) {
			return jQuery.event.trigger( type, data, elem, true );
		}
	}
});


var
	rxhtmlTag = /<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w:]+)[^>]*)\/>/gi,
	rtagName = /<([\w:]+)/,
	rhtml = /<|&#?\w+;/,
	rnoInnerhtml = /<(?:script|style|link)/i,
	// checked="checked" or checked
	rchecked = /checked\s*(?:[^=]|=\s*.checked.)/i,
	rscriptType = /^$|\/(?:java|ecma)script/i,
	rscriptTypeMasked = /^true\/(.*)/,
	rcleanScript = /^\s*<!(?:\[CDATA\[|--)|(?:\]\]|--)>\s*$/g,

	// We have to close these tags to support XHTML (#13200)
	wrapMap = {

		// Support: IE 9
		option: [ 1, "<select multiple='multiple'>", "</select>" ],

		thead: [ 1, "<table>", "</table>" ],
		col: [ 2, "<table><colgroup>", "</colgroup></table>" ],
		tr: [ 2, "<table><tbody>", "</tbody></table>" ],
		td: [ 3, "<table><tbody><tr>", "</tr></tbody></table>" ],

		_default: [ 0, "", "" ]
	};

// Support: IE 9
wrapMap.optgroup = wrapMap.option;

wrapMap.tbody = wrapMap.tfoot = wrapMap.colgroup = wrapMap.caption = wrapMap.thead;
wrapMap.th = wrapMap.td;

// Support: 1.x compatibility
// Manipulating tables requires a tbody
function manipulationTarget( elem, content ) {
	return jQuery.nodeName( elem, "table" ) &&
		jQuery.nodeName( content.nodeType !== 11 ? content : content.firstChild, "tr" ) ?

		elem.getElementsByTagName("tbody")[0] ||
			elem.appendChild( elem.ownerDocument.createElement("tbody") ) :
		elem;
}

// Replace/restore the type attribute of script elements for safe DOM manipulation
function disableScript( elem ) {
	elem.type = (elem.getAttribute("type") !== null) + "/" + elem.type;
	return elem;
}
function restoreScript( elem ) {
	var match = rscriptTypeMasked.exec( elem.type );

	if ( match ) {
		elem.type = match[ 1 ];
	} else {
		elem.removeAttribute("type");
	}

	return elem;
}

// Mark scripts as having already been evaluated
function setGlobalEval( elems, refElements ) {
	var i = 0,
		l = elems.length;

	for ( ; i < l; i++ ) {
		data_priv.set(
			elems[ i ], "globalEval", !refElements || data_priv.get( refElements[ i ], "globalEval" )
		);
	}
}

function cloneCopyEvent( src, dest ) {
	var i, l, type, pdataOld, pdataCur, udataOld, udataCur, events;

	if ( dest.nodeType !== 1 ) {
		return;
	}

	// 1. Copy private data: events, handlers, etc.
	if ( data_priv.hasData( src ) ) {
		pdataOld = data_priv.access( src );
		pdataCur = data_priv.set( dest, pdataOld );
		events = pdataOld.events;

		if ( events ) {
			delete pdataCur.handle;
			pdataCur.events = {};

			for ( type in events ) {
				for ( i = 0, l = events[ type ].length; i < l; i++ ) {
					jQuery.event.add( dest, type, events[ type ][ i ] );
				}
			}
		}
	}

	// 2. Copy user data
	if ( data_user.hasData( src ) ) {
		udataOld = data_user.access( src );
		udataCur = jQuery.extend( {}, udataOld );

		data_user.set( dest, udataCur );
	}
}

function getAll( context, tag ) {
	var ret = context.getElementsByTagName ? context.getElementsByTagName( tag || "*" ) :
			context.querySelectorAll ? context.querySelectorAll( tag || "*" ) :
			[];

	return tag === undefined || tag && jQuery.nodeName( context, tag ) ?
		jQuery.merge( [ context ], ret ) :
		ret;
}

// Support: IE >= 9
function fixInput( src, dest ) {
	var nodeName = dest.nodeName.toLowerCase();

	// Fails to persist the checked state of a cloned checkbox or radio button.
	if ( nodeName === "input" && rcheckableType.test( src.type ) ) {
		dest.checked = src.checked;

	// Fails to return the selected option to the default selected state when cloning options
	} else if ( nodeName === "input" || nodeName === "textarea" ) {
		dest.defaultValue = src.defaultValue;
	}
}

jQuery.extend({
	clone: function( elem, dataAndEvents, deepDataAndEvents ) {
		var i, l, srcElements, destElements,
			clone = elem.cloneNode( true ),
			inPage = jQuery.contains( elem.ownerDocument, elem );

		// Support: IE >= 9
		// Fix Cloning issues
		if ( !support.noCloneChecked && ( elem.nodeType === 1 || elem.nodeType === 11 ) &&
				!jQuery.isXMLDoc( elem ) ) {

			// We eschew Sizzle here for performance reasons: http://jsperf.com/getall-vs-sizzle/2
			destElements = getAll( clone );
			srcElements = getAll( elem );

			for ( i = 0, l = srcElements.length; i < l; i++ ) {
				fixInput( srcElements[ i ], destElements[ i ] );
			}
		}

		// Copy the events from the original to the clone
		if ( dataAndEvents ) {
			if ( deepDataAndEvents ) {
				srcElements = srcElements || getAll( elem );
				destElements = destElements || getAll( clone );

				for ( i = 0, l = srcElements.length; i < l; i++ ) {
					cloneCopyEvent( srcElements[ i ], destElements[ i ] );
				}
			} else {
				cloneCopyEvent( elem, clone );
			}
		}

		// Preserve script evaluation history
		destElements = getAll( clone, "script" );
		if ( destElements.length > 0 ) {
			setGlobalEval( destElements, !inPage && getAll( elem, "script" ) );
		}

		// Return the cloned set
		return clone;
	},

	buildFragment: function( elems, context, scripts, selection ) {
		var elem, tmp, tag, wrap, contains, j,
			fragment = context.createDocumentFragment(),
			nodes = [],
			i = 0,
			l = elems.length;

		for ( ; i < l; i++ ) {
			elem = elems[ i ];

			if ( elem || elem === 0 ) {

				// Add nodes directly
				if ( jQuery.type( elem ) === "object" ) {
					// Support: QtWebKit
					// jQuery.merge because push.apply(_, arraylike) throws
					jQuery.merge( nodes, elem.nodeType ? [ elem ] : elem );

				// Convert non-html into a text node
				} else if ( !rhtml.test( elem ) ) {
					nodes.push( context.createTextNode( elem ) );

				// Convert html into DOM nodes
				} else {
					tmp = tmp || fragment.appendChild( context.createElement("div") );

					// Deserialize a standard representation
					tag = ( rtagName.exec( elem ) || [ "", "" ] )[ 1 ].toLowerCase();
					wrap = wrapMap[ tag ] || wrapMap._default;
					tmp.innerHTML = wrap[ 1 ] + elem.replace( rxhtmlTag, "<$1></$2>" ) + wrap[ 2 ];

					// Descend through wrappers to the right content
					j = wrap[ 0 ];
					while ( j-- ) {
						tmp = tmp.lastChild;
					}

					// Support: QtWebKit
					// jQuery.merge because push.apply(_, arraylike) throws
					jQuery.merge( nodes, tmp.childNodes );

					// Remember the top-level container
					tmp = fragment.firstChild;

					// Fixes #12346
					// Support: Webkit, IE
					tmp.textContent = "";
				}
			}
		}

		// Remove wrapper from fragment
		fragment.textContent = "";

		i = 0;
		while ( (elem = nodes[ i++ ]) ) {

			// #4087 - If origin and destination elements are the same, and this is
			// that element, do not do anything
			if ( selection && jQuery.inArray( elem, selection ) !== -1 ) {
				continue;
			}

			contains = jQuery.contains( elem.ownerDocument, elem );

			// Append to fragment
			tmp = getAll( fragment.appendChild( elem ), "script" );

			// Preserve script evaluation history
			if ( contains ) {
				setGlobalEval( tmp );
			}

			// Capture executables
			if ( scripts ) {
				j = 0;
				while ( (elem = tmp[ j++ ]) ) {
					if ( rscriptType.test( elem.type || "" ) ) {
						scripts.push( elem );
					}
				}
			}
		}

		return fragment;
	},

	cleanData: function( elems ) {
		var data, elem, events, type, key, j,
			special = jQuery.event.special,
			i = 0;

		for ( ; (elem = elems[ i ]) !== undefined; i++ ) {
			if ( jQuery.acceptData( elem ) ) {
				key = elem[ data_priv.expando ];

				if ( key && (data = data_priv.cache[ key ]) ) {
					events = Object.keys( data.events || {} );
					if ( events.length ) {
						for ( j = 0; (type = events[j]) !== undefined; j++ ) {
							if ( special[ type ] ) {
								jQuery.event.remove( elem, type );

							// This is a shortcut to avoid jQuery.event.remove's overhead
							} else {
								jQuery.removeEvent( elem, type, data.handle );
							}
						}
					}
					if ( data_priv.cache[ key ] ) {
						// Discard any remaining `private` data
						delete data_priv.cache[ key ];
					}
				}
			}
			// Discard any remaining `user` data
			delete data_user.cache[ elem[ data_user.expando ] ];
		}
	}
});

jQuery.fn.extend({
	text: function( value ) {
		return access( this, function( value ) {
			return value === undefined ?
				jQuery.text( this ) :
				this.empty().each(function() {
					if ( this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9 ) {
						this.textContent = value;
					}
				});
		}, null, value, arguments.length );
	},

	append: function() {
		return this.domManip( arguments, function( elem ) {
			if ( this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9 ) {
				var target = manipulationTarget( this, elem );
				target.appendChild( elem );
			}
		});
	},

	prepend: function() {
		return this.domManip( arguments, function( elem ) {
			if ( this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9 ) {
				var target = manipulationTarget( this, elem );
				target.insertBefore( elem, target.firstChild );
			}
		});
	},

	before: function() {
		return this.domManip( arguments, function( elem ) {
			if ( this.parentNode ) {
				this.parentNode.insertBefore( elem, this );
			}
		});
	},

	after: function() {
		return this.domManip( arguments, function( elem ) {
			if ( this.parentNode ) {
				this.parentNode.insertBefore( elem, this.nextSibling );
			}
		});
	},

	remove: function( selector, keepData /* Internal Use Only */ ) {
		var elem,
			elems = selector ? jQuery.filter( selector, this ) : this,
			i = 0;

		for ( ; (elem = elems[i]) != null; i++ ) {
			if ( !keepData && elem.nodeType === 1 ) {
				jQuery.cleanData( getAll( elem ) );
			}

			if ( elem.parentNode ) {
				if ( keepData && jQuery.contains( elem.ownerDocument, elem ) ) {
					setGlobalEval( getAll( elem, "script" ) );
				}
				elem.parentNode.removeChild( elem );
			}
		}

		return this;
	},

	empty: function() {
		var elem,
			i = 0;

		for ( ; (elem = this[i]) != null; i++ ) {
			if ( elem.nodeType === 1 ) {

				// Prevent memory leaks
				jQuery.cleanData( getAll( elem, false ) );

				// Remove any remaining nodes
				elem.textContent = "";
			}
		}

		return this;
	},

	clone: function( dataAndEvents, deepDataAndEvents ) {
		dataAndEvents = dataAndEvents == null ? false : dataAndEvents;
		deepDataAndEvents = deepDataAndEvents == null ? dataAndEvents : deepDataAndEvents;

		return this.map(function() {
			return jQuery.clone( this, dataAndEvents, deepDataAndEvents );
		});
	},

	html: function( value ) {
		return access( this, function( value ) {
			var elem = this[ 0 ] || {},
				i = 0,
				l = this.length;

			if ( value === undefined && elem.nodeType === 1 ) {
				return elem.innerHTML;
			}

			// See if we can take a shortcut and just use innerHTML
			if ( typeof value === "string" && !rnoInnerhtml.test( value ) &&
				!wrapMap[ ( rtagName.exec( value ) || [ "", "" ] )[ 1 ].toLowerCase() ] ) {

				value = value.replace( rxhtmlTag, "<$1></$2>" );

				try {
					for ( ; i < l; i++ ) {
						elem = this[ i ] || {};

						// Remove element nodes and prevent memory leaks
						if ( elem.nodeType === 1 ) {
							jQuery.cleanData( getAll( elem, false ) );
							elem.innerHTML = value;
						}
					}

					elem = 0;

				// If using innerHTML throws an exception, use the fallback method
				} catch( e ) {}
			}

			if ( elem ) {
				this.empty().append( value );
			}
		}, null, value, arguments.length );
	},

	replaceWith: function() {
		var arg = arguments[ 0 ];

		// Make the changes, replacing each context element with the new content
		this.domManip( arguments, function( elem ) {
			arg = this.parentNode;

			jQuery.cleanData( getAll( this ) );

			if ( arg ) {
				arg.replaceChild( elem, this );
			}
		});

		// Force removal if there was no new content (e.g., from empty arguments)
		return arg && (arg.length || arg.nodeType) ? this : this.remove();
	},

	detach: function( selector ) {
		return this.remove( selector, true );
	},

	domManip: function( args, callback ) {

		// Flatten any nested arrays
		args = concat.apply( [], args );

		var fragment, first, scripts, hasScripts, node, doc,
			i = 0,
			l = this.length,
			set = this,
			iNoClone = l - 1,
			value = args[ 0 ],
			isFunction = jQuery.isFunction( value );

		// We can't cloneNode fragments that contain checked, in WebKit
		if ( isFunction ||
				( l > 1 && typeof value === "string" &&
					!support.checkClone && rchecked.test( value ) ) ) {
			return this.each(function( index ) {
				var self = set.eq( index );
				if ( isFunction ) {
					args[ 0 ] = value.call( this, index, self.html() );
				}
				self.domManip( args, callback );
			});
		}

		if ( l ) {
			fragment = jQuery.buildFragment( args, this[ 0 ].ownerDocument, false, this );
			first = fragment.firstChild;

			if ( fragment.childNodes.length === 1 ) {
				fragment = first;
			}

			if ( first ) {
				scripts = jQuery.map( getAll( fragment, "script" ), disableScript );
				hasScripts = scripts.length;

				// Use the original fragment for the last item instead of the first because it can end up
				// being emptied incorrectly in certain situations (#8070).
				for ( ; i < l; i++ ) {
					node = fragment;

					if ( i !== iNoClone ) {
						node = jQuery.clone( node, true, true );

						// Keep references to cloned scripts for later restoration
						if ( hasScripts ) {
							// Support: QtWebKit
							// jQuery.merge because push.apply(_, arraylike) throws
							jQuery.merge( scripts, getAll( node, "script" ) );
						}
					}

					callback.call( this[ i ], node, i );
				}

				if ( hasScripts ) {
					doc = scripts[ scripts.length - 1 ].ownerDocument;

					// Reenable scripts
					jQuery.map( scripts, restoreScript );

					// Evaluate executable scripts on first document insertion
					for ( i = 0; i < hasScripts; i++ ) {
						node = scripts[ i ];
						if ( rscriptType.test( node.type || "" ) &&
							!data_priv.access( node, "globalEval" ) && jQuery.contains( doc, node ) ) {

							if ( node.src ) {
								// Optional AJAX dependency, but won't run scripts if not present
								if ( jQuery._evalUrl ) {
									jQuery._evalUrl( node.src );
								}
							} else {
								jQuery.globalEval( node.textContent.replace( rcleanScript, "" ) );
							}
						}
					}
				}
			}
		}

		return this;
	}
});

jQuery.each({
	appendTo: "append",
	prependTo: "prepend",
	insertBefore: "before",
	insertAfter: "after",
	replaceAll: "replaceWith"
}, function( name, original ) {
	jQuery.fn[ name ] = function( selector ) {
		var elems,
			ret = [],
			insert = jQuery( selector ),
			last = insert.length - 1,
			i = 0;

		for ( ; i <= last; i++ ) {
			elems = i === last ? this : this.clone( true );
			jQuery( insert[ i ] )[ original ]( elems );

			// Support: QtWebKit
			// .get() because push.apply(_, arraylike) throws
			push.apply( ret, elems.get() );
		}

		return this.pushStack( ret );
	};
});


var iframe,
	elemdisplay = {};

/**
 * Retrieve the actual display of a element
 * @param {String} name nodeName of the element
 * @param {Object} doc Document object
 */
// Called only from within defaultDisplay
function actualDisplay( name, doc ) {
	var elem = jQuery( doc.createElement( name ) ).appendTo( doc.body ),

		// getDefaultComputedStyle might be reliably used only on attached element
		display = window.getDefaultComputedStyle ?

			// Use of this method is a temporary fix (more like optmization) until something better comes along,
			// since it was removed from specification and supported only in FF
			window.getDefaultComputedStyle( elem[ 0 ] ).display : jQuery.css( elem[ 0 ], "display" );

	// We don't have any data stored on the element,
	// so use "detach" method as fast way to get rid of the element
	elem.detach();

	return display;
}

/**
 * Try to determine the default display value of an element
 * @param {String} nodeName
 */
function defaultDisplay( nodeName ) {
	var doc = document,
		display = elemdisplay[ nodeName ];

	if ( !display ) {
		display = actualDisplay( nodeName, doc );

		// If the simple way fails, read from inside an iframe
		if ( display === "none" || !display ) {

			// Use the already-created iframe if possible
			iframe = (iframe || jQuery( "<iframe frameborder='0' width='0' height='0'/>" )).appendTo( doc.documentElement );

			// Always write a new HTML skeleton so Webkit and Firefox don't choke on reuse
			doc = iframe[ 0 ].contentDocument;

			// Support: IE
			doc.write();
			doc.close();

			display = actualDisplay( nodeName, doc );
			iframe.detach();
		}

		// Store the correct default display
		elemdisplay[ nodeName ] = display;
	}

	return display;
}
var rmargin = (/^margin/);

var rnumnonpx = new RegExp( "^(" + pnum + ")(?!px)[a-z%]+$", "i" );

var getStyles = function( elem ) {
		return elem.ownerDocument.defaultView.getComputedStyle( elem, null );
	};



function curCSS( elem, name, computed ) {
	var width, minWidth, maxWidth, ret,
		style = elem.style;

	computed = computed || getStyles( elem );

	// Support: IE9
	// getPropertyValue is only needed for .css('filter') in IE9, see #12537
	if ( computed ) {
		ret = computed.getPropertyValue( name ) || computed[ name ];
	}

	if ( computed ) {

		if ( ret === "" && !jQuery.contains( elem.ownerDocument, elem ) ) {
			ret = jQuery.style( elem, name );
		}

		// Support: iOS < 6
		// A tribute to the "awesome hack by Dean Edwards"
		// iOS < 6 (at least) returns percentage for a larger set of values, but width seems to be reliably pixels
		// this is against the CSSOM draft spec: http://dev.w3.org/csswg/cssom/#resolved-values
		if ( rnumnonpx.test( ret ) && rmargin.test( name ) ) {

			// Remember the original values
			width = style.width;
			minWidth = style.minWidth;
			maxWidth = style.maxWidth;

			// Put in the new values to get a computed value out
			style.minWidth = style.maxWidth = style.width = ret;
			ret = computed.width;

			// Revert the changed values
			style.width = width;
			style.minWidth = minWidth;
			style.maxWidth = maxWidth;
		}
	}

	return ret !== undefined ?
		// Support: IE
		// IE returns zIndex value as an integer.
		ret + "" :
		ret;
}


function addGetHookIf( conditionFn, hookFn ) {
	// Define the hook, we'll check on the first run if it's really needed.
	return {
		get: function() {
			if ( conditionFn() ) {
				// Hook not needed (or it's not possible to use it due to missing dependency),
				// remove it.
				// Since there are no other hooks for marginRight, remove the whole object.
				delete this.get;
				return;
			}

			// Hook needed; redefine it so that the support test is not executed again.

			return (this.get = hookFn).apply( this, arguments );
		}
	};
}


(function() {
	var pixelPositionVal, boxSizingReliableVal,
		// Support: Firefox, Android 2.3 (Prefixed box-sizing versions).
		divReset = "padding:0;margin:0;border:0;display:block;-webkit-box-sizing:content-box;" +
			"-moz-box-sizing:content-box;box-sizing:content-box",
		docElem = document.documentElement,
		container = document.createElement( "div" ),
		div = document.createElement( "div" );

	div.style.backgroundClip = "content-box";
	div.cloneNode( true ).style.backgroundClip = "";
	support.clearCloneStyle = div.style.backgroundClip === "content-box";

	container.style.cssText = "border:0;width:0;height:0;position:absolute;top:0;left:-9999px;" +
		"margin-top:1px";
	container.appendChild( div );

	// Executing both pixelPosition & boxSizingReliable tests require only one layout
	// so they're executed at the same time to save the second computation.
	function computePixelPositionAndBoxSizingReliable() {
		// Support: Firefox, Android 2.3 (Prefixed box-sizing versions).
		div.style.cssText = "-webkit-box-sizing:border-box;-moz-box-sizing:border-box;" +
			"box-sizing:border-box;padding:1px;border:1px;display:block;width:4px;margin-top:1%;" +
			"position:absolute;top:1%";
		docElem.appendChild( container );

		var divStyle = window.getComputedStyle( div, null );
		pixelPositionVal = divStyle.top !== "1%";
		boxSizingReliableVal = divStyle.width === "4px";

		docElem.removeChild( container );
	}

	// Use window.getComputedStyle because jsdom on node.js will break without it.
	if ( window.getComputedStyle ) {
		jQuery.extend(support, {
			pixelPosition: function() {
				// This test is executed only once but we still do memoizing
				// since we can use the boxSizingReliable pre-computing.
				// No need to check if the test was already performed, though.
				computePixelPositionAndBoxSizingReliable();
				return pixelPositionVal;
			},
			boxSizingReliable: function() {
				if ( boxSizingReliableVal == null ) {
					computePixelPositionAndBoxSizingReliable();
				}
				return boxSizingReliableVal;
			},
			reliableMarginRight: function() {
				// Support: Android 2.3
				// Check if div with explicit width and no margin-right incorrectly
				// gets computed margin-right based on width of container. (#3333)
				// WebKit Bug 13343 - getComputedStyle returns wrong value for margin-right
				// This support function is only executed once so no memoizing is needed.
				var ret,
					marginDiv = div.appendChild( document.createElement( "div" ) );
				marginDiv.style.cssText = div.style.cssText = divReset;
				marginDiv.style.marginRight = marginDiv.style.width = "0";
				div.style.width = "1px";
				docElem.appendChild( container );

				ret = !parseFloat( window.getComputedStyle( marginDiv, null ).marginRight );

				docElem.removeChild( container );

				// Clean up the div for other support tests.
				div.innerHTML = "";

				return ret;
			}
		});
	}
})();


// A method for quickly swapping in/out CSS properties to get correct calculations.
jQuery.swap = function( elem, options, callback, args ) {
	var ret, name,
		old = {};

	// Remember the old values, and insert the new ones
	for ( name in options ) {
		old[ name ] = elem.style[ name ];
		elem.style[ name ] = options[ name ];
	}

	ret = callback.apply( elem, args || [] );

	// Revert the old values
	for ( name in options ) {
		elem.style[ name ] = old[ name ];
	}

	return ret;
};


var
	// swappable if display is none or starts with table except "table", "table-cell", or "table-caption"
	// see here for display values: https://developer.mozilla.org/en-US/docs/CSS/display
	rdisplayswap = /^(none|table(?!-c[ea]).+)/,
	rnumsplit = new RegExp( "^(" + pnum + ")(.*)$", "i" ),
	rrelNum = new RegExp( "^([+-])=(" + pnum + ")", "i" ),

	cssShow = { position: "absolute", visibility: "hidden", display: "block" },
	cssNormalTransform = {
		letterSpacing: 0,
		fontWeight: 400
	},

	cssPrefixes = [ "Webkit", "O", "Moz", "ms" ];

// return a css property mapped to a potentially vendor prefixed property
function vendorPropName( style, name ) {

	// shortcut for names that are not vendor prefixed
	if ( name in style ) {
		return name;
	}

	// check for vendor prefixed names
	var capName = name[0].toUpperCase() + name.slice(1),
		origName = name,
		i = cssPrefixes.length;

	while ( i-- ) {
		name = cssPrefixes[ i ] + capName;
		if ( name in style ) {
			return name;
		}
	}

	return origName;
}

function setPositiveNumber( elem, value, subtract ) {
	var matches = rnumsplit.exec( value );
	return matches ?
		// Guard against undefined "subtract", e.g., when used as in cssHooks
		Math.max( 0, matches[ 1 ] - ( subtract || 0 ) ) + ( matches[ 2 ] || "px" ) :
		value;
}

function augmentWidthOrHeight( elem, name, extra, isBorderBox, styles ) {
	var i = extra === ( isBorderBox ? "border" : "content" ) ?
		// If we already have the right measurement, avoid augmentation
		4 :
		// Otherwise initialize for horizontal or vertical properties
		name === "width" ? 1 : 0,

		val = 0;

	for ( ; i < 4; i += 2 ) {
		// both box models exclude margin, so add it if we want it
		if ( extra === "margin" ) {
			val += jQuery.css( elem, extra + cssExpand[ i ], true, styles );
		}

		if ( isBorderBox ) {
			// border-box includes padding, so remove it if we want content
			if ( extra === "content" ) {
				val -= jQuery.css( elem, "padding" + cssExpand[ i ], true, styles );
			}

			// at this point, extra isn't border nor margin, so remove border
			if ( extra !== "margin" ) {
				val -= jQuery.css( elem, "border" + cssExpand[ i ] + "Width", true, styles );
			}
		} else {
			// at this point, extra isn't content, so add padding
			val += jQuery.css( elem, "padding" + cssExpand[ i ], true, styles );

			// at this point, extra isn't content nor padding, so add border
			if ( extra !== "padding" ) {
				val += jQuery.css( elem, "border" + cssExpand[ i ] + "Width", true, styles );
			}
		}
	}

	return val;
}

function getWidthOrHeight( elem, name, extra ) {

	// Start with offset property, which is equivalent to the border-box value
	var valueIsBorderBox = true,
		val = name === "width" ? elem.offsetWidth : elem.offsetHeight,
		styles = getStyles( elem ),
		isBorderBox = jQuery.css( elem, "boxSizing", false, styles ) === "border-box";

	// some non-html elements return undefined for offsetWidth, so check for null/undefined
	// svg - https://bugzilla.mozilla.org/show_bug.cgi?id=649285
	// MathML - https://bugzilla.mozilla.org/show_bug.cgi?id=491668
	if ( val <= 0 || val == null ) {
		// Fall back to computed then uncomputed css if necessary
		val = curCSS( elem, name, styles );
		if ( val < 0 || val == null ) {
			val = elem.style[ name ];
		}

		// Computed unit is not pixels. Stop here and return.
		if ( rnumnonpx.test(val) ) {
			return val;
		}

		// we need the check for style in case a browser which returns unreliable values
		// for getComputedStyle silently falls back to the reliable elem.style
		valueIsBorderBox = isBorderBox &&
			( support.boxSizingReliable() || val === elem.style[ name ] );

		// Normalize "", auto, and prepare for extra
		val = parseFloat( val ) || 0;
	}

	// use the active box-sizing model to add/subtract irrelevant styles
	return ( val +
		augmentWidthOrHeight(
			elem,
			name,
			extra || ( isBorderBox ? "border" : "content" ),
			valueIsBorderBox,
			styles
		)
	) + "px";
}

function showHide( elements, show ) {
	var display, elem, hidden,
		values = [],
		index = 0,
		length = elements.length;

	for ( ; index < length; index++ ) {
		elem = elements[ index ];
		if ( !elem.style ) {
			continue;
		}

		values[ index ] = data_priv.get( elem, "olddisplay" );
		display = elem.style.display;
		if ( show ) {
			// Reset the inline display of this element to learn if it is
			// being hidden by cascaded rules or not
			if ( !values[ index ] && display === "none" ) {
				elem.style.display = "";
			}

			// Set elements which have been overridden with display: none
			// in a stylesheet to whatever the default browser style is
			// for such an element
			if ( elem.style.display === "" && isHidden( elem ) ) {
				values[ index ] = data_priv.access( elem, "olddisplay", defaultDisplay(elem.nodeName) );
			}
		} else {

			if ( !values[ index ] ) {
				hidden = isHidden( elem );

				if ( display && display !== "none" || !hidden ) {
					data_priv.set( elem, "olddisplay", hidden ? display : jQuery.css(elem, "display") );
				}
			}
		}
	}

	// Set the display of most of the elements in a second loop
	// to avoid the constant reflow
	for ( index = 0; index < length; index++ ) {
		elem = elements[ index ];
		if ( !elem.style ) {
			continue;
		}
		if ( !show || elem.style.display === "none" || elem.style.display === "" ) {
			elem.style.display = show ? values[ index ] || "" : "none";
		}
	}

	return elements;
}

jQuery.extend({
	// Add in style property hooks for overriding the default
	// behavior of getting and setting a style property
	cssHooks: {
		opacity: {
			get: function( elem, computed ) {
				if ( computed ) {
					// We should always get a number back from opacity
					var ret = curCSS( elem, "opacity" );
					return ret === "" ? "1" : ret;
				}
			}
		}
	},

	// Don't automatically add "px" to these possibly-unitless properties
	cssNumber: {
		"columnCount": true,
		"fillOpacity": true,
		"fontWeight": true,
		"lineHeight": true,
		"opacity": true,
		"order": true,
		"orphans": true,
		"widows": true,
		"zIndex": true,
		"zoom": true
	},

	// Add in properties whose names you wish to fix before
	// setting or getting the value
	cssProps: {
		// normalize float css property
		"float": "cssFloat"
	},

	// Get and set the style property on a DOM Node
	style: function( elem, name, value, extra ) {
		// Don't set styles on text and comment nodes
		if ( !elem || elem.nodeType === 3 || elem.nodeType === 8 || !elem.style ) {
			return;
		}

		// Make sure that we're working with the right name
		var ret, type, hooks,
			origName = jQuery.camelCase( name ),
			style = elem.style;

		name = jQuery.cssProps[ origName ] || ( jQuery.cssProps[ origName ] = vendorPropName( style, origName ) );

		// gets hook for the prefixed version
		// followed by the unprefixed version
		hooks = jQuery.cssHooks[ name ] || jQuery.cssHooks[ origName ];

		// Check if we're setting a value
		if ( value !== undefined ) {
			type = typeof value;

			// convert relative number strings (+= or -=) to relative numbers. #7345
			if ( type === "string" && (ret = rrelNum.exec( value )) ) {
				value = ( ret[1] + 1 ) * ret[2] + parseFloat( jQuery.css( elem, name ) );
				// Fixes bug #9237
				type = "number";
			}

			// Make sure that null and NaN values aren't set. See: #7116
			if ( value == null || value !== value ) {
				return;
			}

			// If a number was passed in, add 'px' to the (except for certain CSS properties)
			if ( type === "number" && !jQuery.cssNumber[ origName ] ) {
				value += "px";
			}

			// Fixes #8908, it can be done more correctly by specifying setters in cssHooks,
			// but it would mean to define eight (for every problematic property) identical functions
			if ( !support.clearCloneStyle && value === "" && name.indexOf( "background" ) === 0 ) {
				style[ name ] = "inherit";
			}

			// If a hook was provided, use that value, otherwise just set the specified value
			if ( !hooks || !("set" in hooks) || (value = hooks.set( elem, value, extra )) !== undefined ) {
				// Support: Chrome, Safari
				// Setting style to blank string required to delete "style: x !important;"
				style[ name ] = "";
				style[ name ] = value;
			}

		} else {
			// If a hook was provided get the non-computed value from there
			if ( hooks && "get" in hooks && (ret = hooks.get( elem, false, extra )) !== undefined ) {
				return ret;
			}

			// Otherwise just get the value from the style object
			return style[ name ];
		}
	},

	css: function( elem, name, extra, styles ) {
		var val, num, hooks,
			origName = jQuery.camelCase( name );

		// Make sure that we're working with the right name
		name = jQuery.cssProps[ origName ] || ( jQuery.cssProps[ origName ] = vendorPropName( elem.style, origName ) );

		// gets hook for the prefixed version
		// followed by the unprefixed version
		hooks = jQuery.cssHooks[ name ] || jQuery.cssHooks[ origName ];

		// If a hook was provided get the computed value from there
		if ( hooks && "get" in hooks ) {
			val = hooks.get( elem, true, extra );
		}

		// Otherwise, if a way to get the computed value exists, use that
		if ( val === undefined ) {
			val = curCSS( elem, name, styles );
		}

		//convert "normal" to computed value
		if ( val === "normal" && name in cssNormalTransform ) {
			val = cssNormalTransform[ name ];
		}

		// Return, converting to number if forced or a qualifier was provided and val looks numeric
		if ( extra === "" || extra ) {
			num = parseFloat( val );
			return extra === true || jQuery.isNumeric( num ) ? num || 0 : val;
		}
		return val;
	}
});

jQuery.each([ "height", "width" ], function( i, name ) {
	jQuery.cssHooks[ name ] = {
		get: function( elem, computed, extra ) {
			if ( computed ) {
				// certain elements can have dimension info if we invisibly show them
				// however, it must have a current display style that would benefit from this
				return elem.offsetWidth === 0 && rdisplayswap.test( jQuery.css( elem, "display" ) ) ?
					jQuery.swap( elem, cssShow, function() {
						return getWidthOrHeight( elem, name, extra );
					}) :
					getWidthOrHeight( elem, name, extra );
			}
		},

		set: function( elem, value, extra ) {
			var styles = extra && getStyles( elem );
			return setPositiveNumber( elem, value, extra ?
				augmentWidthOrHeight(
					elem,
					name,
					extra,
					jQuery.css( elem, "boxSizing", false, styles ) === "border-box",
					styles
				) : 0
			);
		}
	};
});

// Support: Android 2.3
jQuery.cssHooks.marginRight = addGetHookIf( support.reliableMarginRight,
	function( elem, computed ) {
		if ( computed ) {
			// WebKit Bug 13343 - getComputedStyle returns wrong value for margin-right
			// Work around by temporarily setting element display to inline-block
			return jQuery.swap( elem, { "display": "inline-block" },
				curCSS, [ elem, "marginRight" ] );
		}
	}
);

// These hooks are used by animate to expand properties
jQuery.each({
	margin: "",
	padding: "",
	border: "Width"
}, function( prefix, suffix ) {
	jQuery.cssHooks[ prefix + suffix ] = {
		expand: function( value ) {
			var i = 0,
				expanded = {},

				// assumes a single number if not a string
				parts = typeof value === "string" ? value.split(" ") : [ value ];

			for ( ; i < 4; i++ ) {
				expanded[ prefix + cssExpand[ i ] + suffix ] =
					parts[ i ] || parts[ i - 2 ] || parts[ 0 ];
			}

			return expanded;
		}
	};

	if ( !rmargin.test( prefix ) ) {
		jQuery.cssHooks[ prefix + suffix ].set = setPositiveNumber;
	}
});

jQuery.fn.extend({
	css: function( name, value ) {
		return access( this, function( elem, name, value ) {
			var styles, len,
				map = {},
				i = 0;

			if ( jQuery.isArray( name ) ) {
				styles = getStyles( elem );
				len = name.length;

				for ( ; i < len; i++ ) {
					map[ name[ i ] ] = jQuery.css( elem, name[ i ], false, styles );
				}

				return map;
			}

			return value !== undefined ?
				jQuery.style( elem, name, value ) :
				jQuery.css( elem, name );
		}, name, value, arguments.length > 1 );
	},
	show: function() {
		return showHide( this, true );
	},
	hide: function() {
		return showHide( this );
	},
	toggle: function( state ) {
		if ( typeof state === "boolean" ) {
			return state ? this.show() : this.hide();
		}

		return this.each(function() {
			if ( isHidden( this ) ) {
				jQuery( this ).show();
			} else {
				jQuery( this ).hide();
			}
		});
	}
});


function Tween( elem, options, prop, end, easing ) {
	return new Tween.prototype.init( elem, options, prop, end, easing );
}
jQuery.Tween = Tween;

Tween.prototype = {
	constructor: Tween,
	init: function( elem, options, prop, end, easing, unit ) {
		this.elem = elem;
		this.prop = prop;
		this.easing = easing || "swing";
		this.options = options;
		this.start = this.now = this.cur();
		this.end = end;
		this.unit = unit || ( jQuery.cssNumber[ prop ] ? "" : "px" );
	},
	cur: function() {
		var hooks = Tween.propHooks[ this.prop ];

		return hooks && hooks.get ?
			hooks.get( this ) :
			Tween.propHooks._default.get( this );
	},
	run: function( percent ) {
		var eased,
			hooks = Tween.propHooks[ this.prop ];

		if ( this.options.duration ) {
			this.pos = eased = jQuery.easing[ this.easing ](
				percent, this.options.duration * percent, 0, 1, this.options.duration
			);
		} else {
			this.pos = eased = percent;
		}
		this.now = ( this.end - this.start ) * eased + this.start;

		if ( this.options.step ) {
			this.options.step.call( this.elem, this.now, this );
		}

		if ( hooks && hooks.set ) {
			hooks.set( this );
		} else {
			Tween.propHooks._default.set( this );
		}
		return this;
	}
};

Tween.prototype.init.prototype = Tween.prototype;

Tween.propHooks = {
	_default: {
		get: function( tween ) {
			var result;

			if ( tween.elem[ tween.prop ] != null &&
				(!tween.elem.style || tween.elem.style[ tween.prop ] == null) ) {
				return tween.elem[ tween.prop ];
			}

			// passing an empty string as a 3rd parameter to .css will automatically
			// attempt a parseFloat and fallback to a string if the parse fails
			// so, simple values such as "10px" are parsed to Float.
			// complex values such as "rotate(1rad)" are returned as is.
			result = jQuery.css( tween.elem, tween.prop, "" );
			// Empty strings, null, undefined and "auto" are converted to 0.
			return !result || result === "auto" ? 0 : result;
		},
		set: function( tween ) {
			// use step hook for back compat - use cssHook if its there - use .style if its
			// available and use plain properties where available
			if ( jQuery.fx.step[ tween.prop ] ) {
				jQuery.fx.step[ tween.prop ]( tween );
			} else if ( tween.elem.style && ( tween.elem.style[ jQuery.cssProps[ tween.prop ] ] != null || jQuery.cssHooks[ tween.prop ] ) ) {
				jQuery.style( tween.elem, tween.prop, tween.now + tween.unit );
			} else {
				tween.elem[ tween.prop ] = tween.now;
			}
		}
	}
};

// Support: IE9
// Panic based approach to setting things on disconnected nodes

Tween.propHooks.scrollTop = Tween.propHooks.scrollLeft = {
	set: function( tween ) {
		if ( tween.elem.nodeType && tween.elem.parentNode ) {
			tween.elem[ tween.prop ] = tween.now;
		}
	}
};

jQuery.easing = {
	linear: function( p ) {
		return p;
	},
	swing: function( p ) {
		return 0.5 - Math.cos( p * Math.PI ) / 2;
	}
};

jQuery.fx = Tween.prototype.init;

// Back Compat <1.8 extension point
jQuery.fx.step = {};




var
	fxNow, timerId,
	rfxtypes = /^(?:toggle|show|hide)$/,
	rfxnum = new RegExp( "^(?:([+-])=|)(" + pnum + ")([a-z%]*)$", "i" ),
	rrun = /queueHooks$/,
	animationPrefilters = [ defaultPrefilter ],
	tweeners = {
		"*": [ function( prop, value ) {
			var tween = this.createTween( prop, value ),
				target = tween.cur(),
				parts = rfxnum.exec( value ),
				unit = parts && parts[ 3 ] || ( jQuery.cssNumber[ prop ] ? "" : "px" ),

				// Starting value computation is required for potential unit mismatches
				start = ( jQuery.cssNumber[ prop ] || unit !== "px" && +target ) &&
					rfxnum.exec( jQuery.css( tween.elem, prop ) ),
				scale = 1,
				maxIterations = 20;

			if ( start && start[ 3 ] !== unit ) {
				// Trust units reported by jQuery.css
				unit = unit || start[ 3 ];

				// Make sure we update the tween properties later on
				parts = parts || [];

				// Iteratively approximate from a nonzero starting point
				start = +target || 1;

				do {
					// If previous iteration zeroed out, double until we get *something*
					// Use a string for doubling factor so we don't accidentally see scale as unchanged below
					scale = scale || ".5";

					// Adjust and apply
					start = start / scale;
					jQuery.style( tween.elem, prop, start + unit );

				// Update scale, tolerating zero or NaN from tween.cur()
				// And breaking the loop if scale is unchanged or perfect, or if we've just had enough
				} while ( scale !== (scale = tween.cur() / target) && scale !== 1 && --maxIterations );
			}

			// Update tween properties
			if ( parts ) {
				start = tween.start = +start || +target || 0;
				tween.unit = unit;
				// If a +=/-= token was provided, we're doing a relative animation
				tween.end = parts[ 1 ] ?
					start + ( parts[ 1 ] + 1 ) * parts[ 2 ] :
					+parts[ 2 ];
			}

			return tween;
		} ]
	};

// Animations created synchronously will run synchronously
function createFxNow() {
	setTimeout(function() {
		fxNow = undefined;
	});
	return ( fxNow = jQuery.now() );
}

// Generate parameters to create a standard animation
function genFx( type, includeWidth ) {
	var which,
		i = 0,
		attrs = { height: type };

	// if we include width, step value is 1 to do all cssExpand values,
	// if we don't include width, step value is 2 to skip over Left and Right
	includeWidth = includeWidth ? 1 : 0;
	for ( ; i < 4 ; i += 2 - includeWidth ) {
		which = cssExpand[ i ];
		attrs[ "margin" + which ] = attrs[ "padding" + which ] = type;
	}

	if ( includeWidth ) {
		attrs.opacity = attrs.width = type;
	}

	return attrs;
}

function createTween( value, prop, animation ) {
	var tween,
		collection = ( tweeners[ prop ] || [] ).concat( tweeners[ "*" ] ),
		index = 0,
		length = collection.length;
	for ( ; index < length; index++ ) {
		if ( (tween = collection[ index ].call( animation, prop, value )) ) {

			// we're done with this property
			return tween;
		}
	}
}

function defaultPrefilter( elem, props, opts ) {
	/* jshint validthis: true */
	var prop, value, toggle, tween, hooks, oldfire, display,
		anim = this,
		orig = {},
		style = elem.style,
		hidden = elem.nodeType && isHidden( elem ),
		dataShow = data_priv.get( elem, "fxshow" );

	// handle queue: false promises
	if ( !opts.queue ) {
		hooks = jQuery._queueHooks( elem, "fx" );
		if ( hooks.unqueued == null ) {
			hooks.unqueued = 0;
			oldfire = hooks.empty.fire;
			hooks.empty.fire = function() {
				if ( !hooks.unqueued ) {
					oldfire();
				}
			};
		}
		hooks.unqueued++;

		anim.always(function() {
			// doing this makes sure that the complete handler will be called
			// before this completes
			anim.always(function() {
				hooks.unqueued--;
				if ( !jQuery.queue( elem, "fx" ).length ) {
					hooks.empty.fire();
				}
			});
		});
	}

	// height/width overflow pass
	if ( elem.nodeType === 1 && ( "height" in props || "width" in props ) ) {
		// Make sure that nothing sneaks out
		// Record all 3 overflow attributes because IE9-10 do not
		// change the overflow attribute when overflowX and
		// overflowY are set to the same value
		opts.overflow = [ style.overflow, style.overflowX, style.overflowY ];

		// Set display property to inline-block for height/width
		// animations on inline elements that are having width/height animated
		display = jQuery.css( elem, "display" );
		// Get default display if display is currently "none"
		if ( display === "none" ) {
			display = defaultDisplay( elem.nodeName );
		}
		if ( display === "inline" &&
				jQuery.css( elem, "float" ) === "none" ) {

			style.display = "inline-block";
		}
	}

	if ( opts.overflow ) {
		style.overflow = "hidden";
		anim.always(function() {
			style.overflow = opts.overflow[ 0 ];
			style.overflowX = opts.overflow[ 1 ];
			style.overflowY = opts.overflow[ 2 ];
		});
	}

	// show/hide pass
	for ( prop in props ) {
		value = props[ prop ];
		if ( rfxtypes.exec( value ) ) {
			delete props[ prop ];
			toggle = toggle || value === "toggle";
			if ( value === ( hidden ? "hide" : "show" ) ) {

				// If there is dataShow left over from a stopped hide or show and we are going to proceed with show, we should pretend to be hidden
				if ( value === "show" && dataShow && dataShow[ prop ] !== undefined ) {
					hidden = true;
				} else {
					continue;
				}
			}
			orig[ prop ] = dataShow && dataShow[ prop ] || jQuery.style( elem, prop );
		}
	}

	if ( !jQuery.isEmptyObject( orig ) ) {
		if ( dataShow ) {
			if ( "hidden" in dataShow ) {
				hidden = dataShow.hidden;
			}
		} else {
			dataShow = data_priv.access( elem, "fxshow", {} );
		}

		// store state if its toggle - enables .stop().toggle() to "reverse"
		if ( toggle ) {
			dataShow.hidden = !hidden;
		}
		if ( hidden ) {
			jQuery( elem ).show();
		} else {
			anim.done(function() {
				jQuery( elem ).hide();
			});
		}
		anim.done(function() {
			var prop;

			data_priv.remove( elem, "fxshow" );
			for ( prop in orig ) {
				jQuery.style( elem, prop, orig[ prop ] );
			}
		});
		for ( prop in orig ) {
			tween = createTween( hidden ? dataShow[ prop ] : 0, prop, anim );

			if ( !( prop in dataShow ) ) {
				dataShow[ prop ] = tween.start;
				if ( hidden ) {
					tween.end = tween.start;
					tween.start = prop === "width" || prop === "height" ? 1 : 0;
				}
			}
		}
	}
}

function propFilter( props, specialEasing ) {
	var index, name, easing, value, hooks;

	// camelCase, specialEasing and expand cssHook pass
	for ( index in props ) {
		name = jQuery.camelCase( index );
		easing = specialEasing[ name ];
		value = props[ index ];
		if ( jQuery.isArray( value ) ) {
			easing = value[ 1 ];
			value = props[ index ] = value[ 0 ];
		}

		if ( index !== name ) {
			props[ name ] = value;
			delete props[ index ];
		}

		hooks = jQuery.cssHooks[ name ];
		if ( hooks && "expand" in hooks ) {
			value = hooks.expand( value );
			delete props[ name ];

			// not quite $.extend, this wont overwrite keys already present.
			// also - reusing 'index' from above because we have the correct "name"
			for ( index in value ) {
				if ( !( index in props ) ) {
					props[ index ] = value[ index ];
					specialEasing[ index ] = easing;
				}
			}
		} else {
			specialEasing[ name ] = easing;
		}
	}
}

function Animation( elem, properties, options ) {
	var result,
		stopped,
		index = 0,
		length = animationPrefilters.length,
		deferred = jQuery.Deferred().always( function() {
			// don't match elem in the :animated selector
			delete tick.elem;
		}),
		tick = function() {
			if ( stopped ) {
				return false;
			}
			var currentTime = fxNow || createFxNow(),
				remaining = Math.max( 0, animation.startTime + animation.duration - currentTime ),
				// archaic crash bug won't allow us to use 1 - ( 0.5 || 0 ) (#12497)
				temp = remaining / animation.duration || 0,
				percent = 1 - temp,
				index = 0,
				length = animation.tweens.length;

			for ( ; index < length ; index++ ) {
				animation.tweens[ index ].run( percent );
			}

			deferred.notifyWith( elem, [ animation, percent, remaining ]);

			if ( percent < 1 && length ) {
				return remaining;
			} else {
				deferred.resolveWith( elem, [ animation ] );
				return false;
			}
		},
		animation = deferred.promise({
			elem: elem,
			props: jQuery.extend( {}, properties ),
			opts: jQuery.extend( true, { specialEasing: {} }, options ),
			originalProperties: properties,
			originalOptions: options,
			startTime: fxNow || createFxNow(),
			duration: options.duration,
			tweens: [],
			createTween: function( prop, end ) {
				var tween = jQuery.Tween( elem, animation.opts, prop, end,
						animation.opts.specialEasing[ prop ] || animation.opts.easing );
				animation.tweens.push( tween );
				return tween;
			},
			stop: function( gotoEnd ) {
				var index = 0,
					// if we are going to the end, we want to run all the tweens
					// otherwise we skip this part
					length = gotoEnd ? animation.tweens.length : 0;
				if ( stopped ) {
					return this;
				}
				stopped = true;
				for ( ; index < length ; index++ ) {
					animation.tweens[ index ].run( 1 );
				}

				// resolve when we played the last frame
				// otherwise, reject
				if ( gotoEnd ) {
					deferred.resolveWith( elem, [ animation, gotoEnd ] );
				} else {
					deferred.rejectWith( elem, [ animation, gotoEnd ] );
				}
				return this;
			}
		}),
		props = animation.props;

	propFilter( props, animation.opts.specialEasing );

	for ( ; index < length ; index++ ) {
		result = animationPrefilters[ index ].call( animation, elem, props, animation.opts );
		if ( result ) {
			return result;
		}
	}

	jQuery.map( props, createTween, animation );

	if ( jQuery.isFunction( animation.opts.start ) ) {
		animation.opts.start.call( elem, animation );
	}

	jQuery.fx.timer(
		jQuery.extend( tick, {
			elem: elem,
			anim: animation,
			queue: animation.opts.queue
		})
	);

	// attach callbacks from options
	return animation.progress( animation.opts.progress )
		.done( animation.opts.done, animation.opts.complete )
		.fail( animation.opts.fail )
		.always( animation.opts.always );
}

jQuery.Animation = jQuery.extend( Animation, {

	tweener: function( props, callback ) {
		if ( jQuery.isFunction( props ) ) {
			callback = props;
			props = [ "*" ];
		} else {
			props = props.split(" ");
		}

		var prop,
			index = 0,
			length = props.length;

		for ( ; index < length ; index++ ) {
			prop = props[ index ];
			tweeners[ prop ] = tweeners[ prop ] || [];
			tweeners[ prop ].unshift( callback );
		}
	},

	prefilter: function( callback, prepend ) {
		if ( prepend ) {
			animationPrefilters.unshift( callback );
		} else {
			animationPrefilters.push( callback );
		}
	}
});

jQuery.speed = function( speed, easing, fn ) {
	var opt = speed && typeof speed === "object" ? jQuery.extend( {}, speed ) : {
		complete: fn || !fn && easing ||
			jQuery.isFunction( speed ) && speed,
		duration: speed,
		easing: fn && easing || easing && !jQuery.isFunction( easing ) && easing
	};

	opt.duration = jQuery.fx.off ? 0 : typeof opt.duration === "number" ? opt.duration :
		opt.duration in jQuery.fx.speeds ? jQuery.fx.speeds[ opt.duration ] : jQuery.fx.speeds._default;

	// normalize opt.queue - true/undefined/null -> "fx"
	if ( opt.queue == null || opt.queue === true ) {
		opt.queue = "fx";
	}

	// Queueing
	opt.old = opt.complete;

	opt.complete = function() {
		if ( jQuery.isFunction( opt.old ) ) {
			opt.old.call( this );
		}

		if ( opt.queue ) {
			jQuery.dequeue( this, opt.queue );
		}
	};

	return opt;
};

jQuery.fn.extend({
	fadeTo: function( speed, to, easing, callback ) {

		// show any hidden elements after setting opacity to 0
		return this.filter( isHidden ).css( "opacity", 0 ).show()

			// animate to the value specified
			.end().animate({ opacity: to }, speed, easing, callback );
	},
	animate: function( prop, speed, easing, callback ) {
		var empty = jQuery.isEmptyObject( prop ),
			optall = jQuery.speed( speed, easing, callback ),
			doAnimation = function() {
				// Operate on a copy of prop so per-property easing won't be lost
				var anim = Animation( this, jQuery.extend( {}, prop ), optall );

				// Empty animations, or finishing resolves immediately
				if ( empty || data_priv.get( this, "finish" ) ) {
					anim.stop( true );
				}
			};
			doAnimation.finish = doAnimation;

		return empty || optall.queue === false ?
			this.each( doAnimation ) :
			this.queue( optall.queue, doAnimation );
	},
	stop: function( type, clearQueue, gotoEnd ) {
		var stopQueue = function( hooks ) {
			var stop = hooks.stop;
			delete hooks.stop;
			stop( gotoEnd );
		};

		if ( typeof type !== "string" ) {
			gotoEnd = clearQueue;
			clearQueue = type;
			type = undefined;
		}
		if ( clearQueue && type !== false ) {
			this.queue( type || "fx", [] );
		}

		return this.each(function() {
			var dequeue = true,
				index = type != null && type + "queueHooks",
				timers = jQuery.timers,
				data = data_priv.get( this );

			if ( index ) {
				if ( data[ index ] && data[ index ].stop ) {
					stopQueue( data[ index ] );
				}
			} else {
				for ( index in data ) {
					if ( data[ index ] && data[ index ].stop && rrun.test( index ) ) {
						stopQueue( data[ index ] );
					}
				}
			}

			for ( index = timers.length; index--; ) {
				if ( timers[ index ].elem === this && (type == null || timers[ index ].queue === type) ) {
					timers[ index ].anim.stop( gotoEnd );
					dequeue = false;
					timers.splice( index, 1 );
				}
			}

			// start the next in the queue if the last step wasn't forced
			// timers currently will call their complete callbacks, which will dequeue
			// but only if they were gotoEnd
			if ( dequeue || !gotoEnd ) {
				jQuery.dequeue( this, type );
			}
		});
	},
	finish: function( type ) {
		if ( type !== false ) {
			type = type || "fx";
		}
		return this.each(function() {
			var index,
				data = data_priv.get( this ),
				queue = data[ type + "queue" ],
				hooks = data[ type + "queueHooks" ],
				timers = jQuery.timers,
				length = queue ? queue.length : 0;

			// enable finishing flag on private data
			data.finish = true;

			// empty the queue first
			jQuery.queue( this, type, [] );

			if ( hooks && hooks.stop ) {
				hooks.stop.call( this, true );
			}

			// look for any active animations, and finish them
			for ( index = timers.length; index--; ) {
				if ( timers[ index ].elem === this && timers[ index ].queue === type ) {
					timers[ index ].anim.stop( true );
					timers.splice( index, 1 );
				}
			}

			// look for any animations in the old queue and finish them
			for ( index = 0; index < length; index++ ) {
				if ( queue[ index ] && queue[ index ].finish ) {
					queue[ index ].finish.call( this );
				}
			}

			// turn off finishing flag
			delete data.finish;
		});
	}
});

jQuery.each([ "toggle", "show", "hide" ], function( i, name ) {
	var cssFn = jQuery.fn[ name ];
	jQuery.fn[ name ] = function( speed, easing, callback ) {
		return speed == null || typeof speed === "boolean" ?
			cssFn.apply( this, arguments ) :
			this.animate( genFx( name, true ), speed, easing, callback );
	};
});

// Generate shortcuts for custom animations
jQuery.each({
	slideDown: genFx("show"),
	slideUp: genFx("hide"),
	slideToggle: genFx("toggle"),
	fadeIn: { opacity: "show" },
	fadeOut: { opacity: "hide" },
	fadeToggle: { opacity: "toggle" }
}, function( name, props ) {
	jQuery.fn[ name ] = function( speed, easing, callback ) {
		return this.animate( props, speed, easing, callback );
	};
});

jQuery.timers = [];
jQuery.fx.tick = function() {
	var timer,
		i = 0,
		timers = jQuery.timers;

	fxNow = jQuery.now();

	for ( ; i < timers.length; i++ ) {
		timer = timers[ i ];
		// Checks the timer has not already been removed
		if ( !timer() && timers[ i ] === timer ) {
			timers.splice( i--, 1 );
		}
	}

	if ( !timers.length ) {
		jQuery.fx.stop();
	}
	fxNow = undefined;
};

jQuery.fx.timer = function( timer ) {
	jQuery.timers.push( timer );
	if ( timer() ) {
		jQuery.fx.start();
	} else {
		jQuery.timers.pop();
	}
};

jQuery.fx.interval = 13;

jQuery.fx.start = function() {
	if ( !timerId ) {
		timerId = setInterval( jQuery.fx.tick, jQuery.fx.interval );
	}
};

jQuery.fx.stop = function() {
	clearInterval( timerId );
	timerId = null;
};

jQuery.fx.speeds = {
	slow: 600,
	fast: 200,
	// Default speed
	_default: 400
};


// Based off of the plugin by Clint Helfers, with permission.
// http://blindsignals.com/index.php/2009/07/jquery-delay/
jQuery.fn.delay = function( time, type ) {
	time = jQuery.fx ? jQuery.fx.speeds[ time ] || time : time;
	type = type || "fx";

	return this.queue( type, function( next, hooks ) {
		var timeout = setTimeout( next, time );
		hooks.stop = function() {
			clearTimeout( timeout );
		};
	});
};


(function() {
	var input = document.createElement( "input" ),
		select = document.createElement( "select" ),
		opt = select.appendChild( document.createElement( "option" ) );

	input.type = "checkbox";

	// Support: iOS 5.1, Android 4.x, Android 2.3
	// Check the default checkbox/radio value ("" on old WebKit; "on" elsewhere)
	support.checkOn = input.value !== "";

	// Must access the parent to make an option select properly
	// Support: IE9, IE10
	support.optSelected = opt.selected;

	// Make sure that the options inside disabled selects aren't marked as disabled
	// (WebKit marks them as disabled)
	select.disabled = true;
	support.optDisabled = !opt.disabled;

	// Check if an input maintains its value after becoming a radio
	// Support: IE9, IE10
	input = document.createElement( "input" );
	input.value = "t";
	input.type = "radio";
	support.radioValue = input.value === "t";
})();


var nodeHook, boolHook,
	attrHandle = jQuery.expr.attrHandle;

jQuery.fn.extend({
	attr: function( name, value ) {
		return access( this, jQuery.attr, name, value, arguments.length > 1 );
	},

	removeAttr: function( name ) {
		return this.each(function() {
			jQuery.removeAttr( this, name );
		});
	}
});

jQuery.extend({
	attr: function( elem, name, value ) {
		var hooks, ret,
			nType = elem.nodeType;

		// don't get/set attributes on text, comment and attribute nodes
		if ( !elem || nType === 3 || nType === 8 || nType === 2 ) {
			return;
		}

		// Fallback to prop when attributes are not supported
		if ( typeof elem.getAttribute === strundefined ) {
			return jQuery.prop( elem, name, value );
		}

		// All attributes are lowercase
		// Grab necessary hook if one is defined
		if ( nType !== 1 || !jQuery.isXMLDoc( elem ) ) {
			name = name.toLowerCase();
			hooks = jQuery.attrHooks[ name ] ||
				( jQuery.expr.match.bool.test( name ) ? boolHook : nodeHook );
		}

		if ( value !== undefined ) {

			if ( value === null ) {
				jQuery.removeAttr( elem, name );

			} else if ( hooks && "set" in hooks && (ret = hooks.set( elem, value, name )) !== undefined ) {
				return ret;

			} else {
				elem.setAttribute( name, value + "" );
				return value;
			}

		} else if ( hooks && "get" in hooks && (ret = hooks.get( elem, name )) !== null ) {
			return ret;

		} else {
			ret = jQuery.find.attr( elem, name );

			// Non-existent attributes return null, we normalize to undefined
			return ret == null ?
				undefined :
				ret;
		}
	},

	removeAttr: function( elem, value ) {
		var name, propName,
			i = 0,
			attrNames = value && value.match( rnotwhite );

		if ( attrNames && elem.nodeType === 1 ) {
			while ( (name = attrNames[i++]) ) {
				propName = jQuery.propFix[ name ] || name;

				// Boolean attributes get special treatment (#10870)
				if ( jQuery.expr.match.bool.test( name ) ) {
					// Set corresponding property to false
					elem[ propName ] = false;
				}

				elem.removeAttribute( name );
			}
		}
	},

	attrHooks: {
		type: {
			set: function( elem, value ) {
				if ( !support.radioValue && value === "radio" &&
					jQuery.nodeName( elem, "input" ) ) {
					// Setting the type on a radio button after the value resets the value in IE6-9
					// Reset value to default in case type is set after value during creation
					var val = elem.value;
					elem.setAttribute( "type", value );
					if ( val ) {
						elem.value = val;
					}
					return value;
				}
			}
		}
	}
});

// Hooks for boolean attributes
boolHook = {
	set: function( elem, value, name ) {
		if ( value === false ) {
			// Remove boolean attributes when set to false
			jQuery.removeAttr( elem, name );
		} else {
			elem.setAttribute( name, name );
		}
		return name;
	}
};
jQuery.each( jQuery.expr.match.bool.source.match( /\w+/g ), function( i, name ) {
	var getter = attrHandle[ name ] || jQuery.find.attr;

	attrHandle[ name ] = function( elem, name, isXML ) {
		var ret, handle;
		if ( !isXML ) {
			// Avoid an infinite loop by temporarily removing this function from the getter
			handle = attrHandle[ name ];
			attrHandle[ name ] = ret;
			ret = getter( elem, name, isXML ) != null ?
				name.toLowerCase() :
				null;
			attrHandle[ name ] = handle;
		}
		return ret;
	};
});




var rfocusable = /^(?:input|select|textarea|button)$/i;

jQuery.fn.extend({
	prop: function( name, value ) {
		return access( this, jQuery.prop, name, value, arguments.length > 1 );
	},

	removeProp: function( name ) {
		return this.each(function() {
			delete this[ jQuery.propFix[ name ] || name ];
		});
	}
});

jQuery.extend({
	propFix: {
		"for": "htmlFor",
		"class": "className"
	},

	prop: function( elem, name, value ) {
		var ret, hooks, notxml,
			nType = elem.nodeType;

		// don't get/set properties on text, comment and attribute nodes
		if ( !elem || nType === 3 || nType === 8 || nType === 2 ) {
			return;
		}

		notxml = nType !== 1 || !jQuery.isXMLDoc( elem );

		if ( notxml ) {
			// Fix name and attach hooks
			name = jQuery.propFix[ name ] || name;
			hooks = jQuery.propHooks[ name ];
		}

		if ( value !== undefined ) {
			return hooks && "set" in hooks && (ret = hooks.set( elem, value, name )) !== undefined ?
				ret :
				( elem[ name ] = value );

		} else {
			return hooks && "get" in hooks && (ret = hooks.get( elem, name )) !== null ?
				ret :
				elem[ name ];
		}
	},

	propHooks: {
		tabIndex: {
			get: function( elem ) {
				return elem.hasAttribute( "tabindex" ) || rfocusable.test( elem.nodeName ) || elem.href ?
					elem.tabIndex :
					-1;
			}
		}
	}
});

// Support: IE9+
// Selectedness for an option in an optgroup can be inaccurate
if ( !support.optSelected ) {
	jQuery.propHooks.selected = {
		get: function( elem ) {
			var parent = elem.parentNode;
			if ( parent && parent.parentNode ) {
				parent.parentNode.selectedIndex;
			}
			return null;
		}
	};
}

jQuery.each([
	"tabIndex",
	"readOnly",
	"maxLength",
	"cellSpacing",
	"cellPadding",
	"rowSpan",
	"colSpan",
	"useMap",
	"frameBorder",
	"contentEditable"
], function() {
	jQuery.propFix[ this.toLowerCase() ] = this;
});




var rclass = /[\t\r\n\f]/g;

jQuery.fn.extend({
	addClass: function( value ) {
		var classes, elem, cur, clazz, j, finalValue,
			proceed = typeof value === "string" && value,
			i = 0,
			len = this.length;

		if ( jQuery.isFunction( value ) ) {
			return this.each(function( j ) {
				jQuery( this ).addClass( value.call( this, j, this.className ) );
			});
		}

		if ( proceed ) {
			// The disjunction here is for better compressibility (see removeClass)
			classes = ( value || "" ).match( rnotwhite ) || [];

			for ( ; i < len; i++ ) {
				elem = this[ i ];
				cur = elem.nodeType === 1 && ( elem.className ?
					( " " + elem.className + " " ).replace( rclass, " " ) :
					" "
				);

				if ( cur ) {
					j = 0;
					while ( (clazz = classes[j++]) ) {
						if ( cur.indexOf( " " + clazz + " " ) < 0 ) {
							cur += clazz + " ";
						}
					}

					// only assign if different to avoid unneeded rendering.
					finalValue = jQuery.trim( cur );
					if ( elem.className !== finalValue ) {
						elem.className = finalValue;
					}
				}
			}
		}

		return this;
	},

	removeClass: function( value ) {
		var classes, elem, cur, clazz, j, finalValue,
			proceed = arguments.length === 0 || typeof value === "string" && value,
			i = 0,
			len = this.length;

		if ( jQuery.isFunction( value ) ) {
			return this.each(function( j ) {
				jQuery( this ).removeClass( value.call( this, j, this.className ) );
			});
		}
		if ( proceed ) {
			classes = ( value || "" ).match( rnotwhite ) || [];

			for ( ; i < len; i++ ) {
				elem = this[ i ];
				// This expression is here for better compressibility (see addClass)
				cur = elem.nodeType === 1 && ( elem.className ?
					( " " + elem.className + " " ).replace( rclass, " " ) :
					""
				);

				if ( cur ) {
					j = 0;
					while ( (clazz = classes[j++]) ) {
						// Remove *all* instances
						while ( cur.indexOf( " " + clazz + " " ) >= 0 ) {
							cur = cur.replace( " " + clazz + " ", " " );
						}
					}

					// only assign if different to avoid unneeded rendering.
					finalValue = value ? jQuery.trim( cur ) : "";
					if ( elem.className !== finalValue ) {
						elem.className = finalValue;
					}
				}
			}
		}

		return this;
	},

	toggleClass: function( value, stateVal ) {
		var type = typeof value;

		if ( typeof stateVal === "boolean" && type === "string" ) {
			return stateVal ? this.addClass( value ) : this.removeClass( value );
		}

		if ( jQuery.isFunction( value ) ) {
			return this.each(function( i ) {
				jQuery( this ).toggleClass( value.call(this, i, this.className, stateVal), stateVal );
			});
		}

		return this.each(function() {
			if ( type === "string" ) {
				// toggle individual class names
				var className,
					i = 0,
					self = jQuery( this ),
					classNames = value.match( rnotwhite ) || [];

				while ( (className = classNames[ i++ ]) ) {
					// check each className given, space separated list
					if ( self.hasClass( className ) ) {
						self.removeClass( className );
					} else {
						self.addClass( className );
					}
				}

			// Toggle whole class name
			} else if ( type === strundefined || type === "boolean" ) {
				if ( this.className ) {
					// store className if set
					data_priv.set( this, "__className__", this.className );
				}

				// If the element has a class name or if we're passed "false",
				// then remove the whole classname (if there was one, the above saved it).
				// Otherwise bring back whatever was previously saved (if anything),
				// falling back to the empty string if nothing was stored.
				this.className = this.className || value === false ? "" : data_priv.get( this, "__className__" ) || "";
			}
		});
	},

	hasClass: function( selector ) {
		var className = " " + selector + " ",
			i = 0,
			l = this.length;
		for ( ; i < l; i++ ) {
			if ( this[i].nodeType === 1 && (" " + this[i].className + " ").replace(rclass, " ").indexOf( className ) >= 0 ) {
				return true;
			}
		}

		return false;
	}
});




var rreturn = /\r/g;

jQuery.fn.extend({
	val: function( value ) {
		var hooks, ret, isFunction,
			elem = this[0];

		if ( !arguments.length ) {
			if ( elem ) {
				hooks = jQuery.valHooks[ elem.type ] || jQuery.valHooks[ elem.nodeName.toLowerCase() ];

				if ( hooks && "get" in hooks && (ret = hooks.get( elem, "value" )) !== undefined ) {
					return ret;
				}

				ret = elem.value;

				return typeof ret === "string" ?
					// handle most common string cases
					ret.replace(rreturn, "") :
					// handle cases where value is null/undef or number
					ret == null ? "" : ret;
			}

			return;
		}

		isFunction = jQuery.isFunction( value );

		return this.each(function( i ) {
			var val;

			if ( this.nodeType !== 1 ) {
				return;
			}

			if ( isFunction ) {
				val = value.call( this, i, jQuery( this ).val() );
			} else {
				val = value;
			}

			// Treat null/undefined as ""; convert numbers to string
			if ( val == null ) {
				val = "";

			} else if ( typeof val === "number" ) {
				val += "";

			} else if ( jQuery.isArray( val ) ) {
				val = jQuery.map( val, function( value ) {
					return value == null ? "" : value + "";
				});
			}

			hooks = jQuery.valHooks[ this.type ] || jQuery.valHooks[ this.nodeName.toLowerCase() ];

			// If set returns undefined, fall back to normal setting
			if ( !hooks || !("set" in hooks) || hooks.set( this, val, "value" ) === undefined ) {
				this.value = val;
			}
		});
	}
});

jQuery.extend({
	valHooks: {
		select: {
			get: function( elem ) {
				var value, option,
					options = elem.options,
					index = elem.selectedIndex,
					one = elem.type === "select-one" || index < 0,
					values = one ? null : [],
					max = one ? index + 1 : options.length,
					i = index < 0 ?
						max :
						one ? index : 0;

				// Loop through all the selected options
				for ( ; i < max; i++ ) {
					option = options[ i ];

					// IE6-9 doesn't update selected after form reset (#2551)
					if ( ( option.selected || i === index ) &&
							// Don't return options that are disabled or in a disabled optgroup
							( support.optDisabled ? !option.disabled : option.getAttribute( "disabled" ) === null ) &&
							( !option.parentNode.disabled || !jQuery.nodeName( option.parentNode, "optgroup" ) ) ) {

						// Get the specific value for the option
						value = jQuery( option ).val();

						// We don't need an array for one selects
						if ( one ) {
							return value;
						}

						// Multi-Selects return an array
						values.push( value );
					}
				}

				return values;
			},

			set: function( elem, value ) {
				var optionSet, option,
					options = elem.options,
					values = jQuery.makeArray( value ),
					i = options.length;

				while ( i-- ) {
					option = options[ i ];
					if ( (option.selected = jQuery.inArray( jQuery(option).val(), values ) >= 0) ) {
						optionSet = true;
					}
				}

				// force browsers to behave consistently when non-matching value is set
				if ( !optionSet ) {
					elem.selectedIndex = -1;
				}
				return values;
			}
		}
	}
});

// Radios and checkboxes getter/setter
jQuery.each([ "radio", "checkbox" ], function() {
	jQuery.valHooks[ this ] = {
		set: function( elem, value ) {
			if ( jQuery.isArray( value ) ) {
				return ( elem.checked = jQuery.inArray( jQuery(elem).val(), value ) >= 0 );
			}
		}
	};
	if ( !support.checkOn ) {
		jQuery.valHooks[ this ].get = function( elem ) {
			// Support: Webkit
			// "" is returned instead of "on" if a value isn't specified
			return elem.getAttribute("value") === null ? "on" : elem.value;
		};
	}
});




// Return jQuery for attributes-only inclusion


jQuery.each( ("blur focus focusin focusout load resize scroll unload click dblclick " +
	"mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave " +
	"change select submit keydown keypress keyup error contextmenu").split(" "), function( i, name ) {

	// Handle event binding
	jQuery.fn[ name ] = function( data, fn ) {
		return arguments.length > 0 ?
			this.on( name, null, data, fn ) :
			this.trigger( name );
	};
});

jQuery.fn.extend({
	hover: function( fnOver, fnOut ) {
		return this.mouseenter( fnOver ).mouseleave( fnOut || fnOver );
	},

	bind: function( types, data, fn ) {
		return this.on( types, null, data, fn );
	},
	unbind: function( types, fn ) {
		return this.off( types, null, fn );
	},

	delegate: function( selector, types, data, fn ) {
		return this.on( types, selector, data, fn );
	},
	undelegate: function( selector, types, fn ) {
		// ( namespace ) or ( selector, types [, fn] )
		return arguments.length === 1 ? this.off( selector, "**" ) : this.off( types, selector || "**", fn );
	}
});


var nonce = jQuery.now();

var rquery = (/\?/);



// Support: Android 2.3
// Workaround failure to string-cast null input
jQuery.parseJSON = function( data ) {
	return JSON.parse( data + "" );
};


// Cross-browser xml parsing
jQuery.parseXML = function( data ) {
	var xml, tmp;
	if ( !data || typeof data !== "string" ) {
		return null;
	}

	// Support: IE9
	try {
		tmp = new DOMParser();
		xml = tmp.parseFromString( data, "text/xml" );
	} catch ( e ) {
		xml = undefined;
	}

	if ( !xml || xml.getElementsByTagName( "parsererror" ).length ) {
		jQuery.error( "Invalid XML: " + data );
	}
	return xml;
};


var
	// Document location
	ajaxLocParts,
	ajaxLocation,

	rhash = /#.*$/,
	rts = /([?&])_=[^&]*/,
	rheaders = /^(.*?):[ \t]*([^\r\n]*)$/mg,
	// #7653, #8125, #8152: local protocol detection
	rlocalProtocol = /^(?:about|app|app-storage|.+-extension|file|res|widget):$/,
	rnoContent = /^(?:GET|HEAD)$/,
	rprotocol = /^\/\//,
	rurl = /^([\w.+-]+:)(?:\/\/(?:[^\/?#]*@|)([^\/?#:]*)(?::(\d+)|)|)/,

	/* Prefilters
	 * 1) They are useful to introduce custom dataTypes (see ajax/jsonp.js for an example)
	 * 2) These are called:
	 *    - BEFORE asking for a transport
	 *    - AFTER param serialization (s.data is a string if s.processData is true)
	 * 3) key is the dataType
	 * 4) the catchall symbol "*" can be used
	 * 5) execution will start with transport dataType and THEN continue down to "*" if needed
	 */
	prefilters = {},

	/* Transports bindings
	 * 1) key is the dataType
	 * 2) the catchall symbol "*" can be used
	 * 3) selection will start with transport dataType and THEN go to "*" if needed
	 */
	transports = {},

	// Avoid comment-prolog char sequence (#10098); must appease lint and evade compression
	allTypes = "*/".concat("*");

// #8138, IE may throw an exception when accessing
// a field from window.location if document.domain has been set
try {
	ajaxLocation = location.href;
} catch( e ) {
	// Use the href attribute of an A element
	// since IE will modify it given document.location
	ajaxLocation = document.createElement( "a" );
	ajaxLocation.href = "";
	ajaxLocation = ajaxLocation.href;
}

// Segment location into parts
ajaxLocParts = rurl.exec( ajaxLocation.toLowerCase() ) || [];

// Base "constructor" for jQuery.ajaxPrefilter and jQuery.ajaxTransport
function addToPrefiltersOrTransports( structure ) {

	// dataTypeExpression is optional and defaults to "*"
	return function( dataTypeExpression, func ) {

		if ( typeof dataTypeExpression !== "string" ) {
			func = dataTypeExpression;
			dataTypeExpression = "*";
		}

		var dataType,
			i = 0,
			dataTypes = dataTypeExpression.toLowerCase().match( rnotwhite ) || [];

		if ( jQuery.isFunction( func ) ) {
			// For each dataType in the dataTypeExpression
			while ( (dataType = dataTypes[i++]) ) {
				// Prepend if requested
				if ( dataType[0] === "+" ) {
					dataType = dataType.slice( 1 ) || "*";
					(structure[ dataType ] = structure[ dataType ] || []).unshift( func );

				// Otherwise append
				} else {
					(structure[ dataType ] = structure[ dataType ] || []).push( func );
				}
			}
		}
	};
}

// Base inspection function for prefilters and transports
function inspectPrefiltersOrTransports( structure, options, originalOptions, jqXHR ) {

	var inspected = {},
		seekingTransport = ( structure === transports );

	function inspect( dataType ) {
		var selected;
		inspected[ dataType ] = true;
		jQuery.each( structure[ dataType ] || [], function( _, prefilterOrFactory ) {
			var dataTypeOrTransport = prefilterOrFactory( options, originalOptions, jqXHR );
			if ( typeof dataTypeOrTransport === "string" && !seekingTransport && !inspected[ dataTypeOrTransport ] ) {
				options.dataTypes.unshift( dataTypeOrTransport );
				inspect( dataTypeOrTransport );
				return false;
			} else if ( seekingTransport ) {
				return !( selected = dataTypeOrTransport );
			}
		});
		return selected;
	}

	return inspect( options.dataTypes[ 0 ] ) || !inspected[ "*" ] && inspect( "*" );
}

// A special extend for ajax options
// that takes "flat" options (not to be deep extended)
// Fixes #9887
function ajaxExtend( target, src ) {
	var key, deep,
		flatOptions = jQuery.ajaxSettings.flatOptions || {};

	for ( key in src ) {
		if ( src[ key ] !== undefined ) {
			( flatOptions[ key ] ? target : ( deep || (deep = {}) ) )[ key ] = src[ key ];
		}
	}
	if ( deep ) {
		jQuery.extend( true, target, deep );
	}

	return target;
}

/* Handles responses to an ajax request:
 * - finds the right dataType (mediates between content-type and expected dataType)
 * - returns the corresponding response
 */
function ajaxHandleResponses( s, jqXHR, responses ) {

	var ct, type, finalDataType, firstDataType,
		contents = s.contents,
		dataTypes = s.dataTypes;

	// Remove auto dataType and get content-type in the process
	while ( dataTypes[ 0 ] === "*" ) {
		dataTypes.shift();
		if ( ct === undefined ) {
			ct = s.mimeType || jqXHR.getResponseHeader("Content-Type");
		}
	}

	// Check if we're dealing with a known content-type
	if ( ct ) {
		for ( type in contents ) {
			if ( contents[ type ] && contents[ type ].test( ct ) ) {
				dataTypes.unshift( type );
				break;
			}
		}
	}

	// Check to see if we have a response for the expected dataType
	if ( dataTypes[ 0 ] in responses ) {
		finalDataType = dataTypes[ 0 ];
	} else {
		// Try convertible dataTypes
		for ( type in responses ) {
			if ( !dataTypes[ 0 ] || s.converters[ type + " " + dataTypes[0] ] ) {
				finalDataType = type;
				break;
			}
			if ( !firstDataType ) {
				firstDataType = type;
			}
		}
		// Or just use first one
		finalDataType = finalDataType || firstDataType;
	}

	// If we found a dataType
	// We add the dataType to the list if needed
	// and return the corresponding response
	if ( finalDataType ) {
		if ( finalDataType !== dataTypes[ 0 ] ) {
			dataTypes.unshift( finalDataType );
		}
		return responses[ finalDataType ];
	}
}

/* Chain conversions given the request and the original response
 * Also sets the responseXXX fields on the jqXHR instance
 */
function ajaxConvert( s, response, jqXHR, isSuccess ) {
	var conv2, current, conv, tmp, prev,
		converters = {},
		// Work with a copy of dataTypes in case we need to modify it for conversion
		dataTypes = s.dataTypes.slice();

	// Create converters map with lowercased keys
	if ( dataTypes[ 1 ] ) {
		for ( conv in s.converters ) {
			converters[ conv.toLowerCase() ] = s.converters[ conv ];
		}
	}

	current = dataTypes.shift();

	// Convert to each sequential dataType
	while ( current ) {

		if ( s.responseFields[ current ] ) {
			jqXHR[ s.responseFields[ current ] ] = response;
		}

		// Apply the dataFilter if provided
		if ( !prev && isSuccess && s.dataFilter ) {
			response = s.dataFilter( response, s.dataType );
		}

		prev = current;
		current = dataTypes.shift();

		if ( current ) {

		// There's only work to do if current dataType is non-auto
			if ( current === "*" ) {

				current = prev;

			// Convert response if prev dataType is non-auto and differs from current
			} else if ( prev !== "*" && prev !== current ) {

				// Seek a direct converter
				conv = converters[ prev + " " + current ] || converters[ "* " + current ];

				// If none found, seek a pair
				if ( !conv ) {
					for ( conv2 in converters ) {

						// If conv2 outputs current
						tmp = conv2.split( " " );
						if ( tmp[ 1 ] === current ) {

							// If prev can be converted to accepted input
							conv = converters[ prev + " " + tmp[ 0 ] ] ||
								converters[ "* " + tmp[ 0 ] ];
							if ( conv ) {
								// Condense equivalence converters
								if ( conv === true ) {
									conv = converters[ conv2 ];

								// Otherwise, insert the intermediate dataType
								} else if ( converters[ conv2 ] !== true ) {
									current = tmp[ 0 ];
									dataTypes.unshift( tmp[ 1 ] );
								}
								break;
							}
						}
					}
				}

				// Apply converter (if not an equivalence)
				if ( conv !== true ) {

					// Unless errors are allowed to bubble, catch and return them
					if ( conv && s[ "throws" ] ) {
						response = conv( response );
					} else {
						try {
							response = conv( response );
						} catch ( e ) {
							return { state: "parsererror", error: conv ? e : "No conversion from " + prev + " to " + current };
						}
					}
				}
			}
		}
	}

	return { state: "success", data: response };
}

jQuery.extend({

	// Counter for holding the number of active queries
	active: 0,

	// Last-Modified header cache for next request
	lastModified: {},
	etag: {},

	ajaxSettings: {
		url: ajaxLocation,
		type: "GET",
		isLocal: rlocalProtocol.test( ajaxLocParts[ 1 ] ),
		global: true,
		processData: true,
		async: true,
		contentType: "application/x-www-form-urlencoded; charset=UTF-8",
		/*
		timeout: 0,
		data: null,
		dataType: null,
		username: null,
		password: null,
		cache: null,
		throws: false,
		traditional: false,
		headers: {},
		*/

		accepts: {
			"*": allTypes,
			text: "text/plain",
			html: "text/html",
			xml: "application/xml, text/xml",
			json: "application/json, text/javascript"
		},

		contents: {
			xml: /xml/,
			html: /html/,
			json: /json/
		},

		responseFields: {
			xml: "responseXML",
			text: "responseText",
			json: "responseJSON"
		},

		// Data converters
		// Keys separate source (or catchall "*") and destination types with a single space
		converters: {

			// Convert anything to text
			"* text": String,

			// Text to html (true = no transformation)
			"text html": true,

			// Evaluate text as a json expression
			"text json": jQuery.parseJSON,

			// Parse text as xml
			"text xml": jQuery.parseXML
		},

		// For options that shouldn't be deep extended:
		// you can add your own custom options here if
		// and when you create one that shouldn't be
		// deep extended (see ajaxExtend)
		flatOptions: {
			url: true,
			context: true
		}
	},

	// Creates a full fledged settings object into target
	// with both ajaxSettings and settings fields.
	// If target is omitted, writes into ajaxSettings.
	ajaxSetup: function( target, settings ) {
		return settings ?

			// Building a settings object
			ajaxExtend( ajaxExtend( target, jQuery.ajaxSettings ), settings ) :

			// Extending ajaxSettings
			ajaxExtend( jQuery.ajaxSettings, target );
	},

	ajaxPrefilter: addToPrefiltersOrTransports( prefilters ),
	ajaxTransport: addToPrefiltersOrTransports( transports ),

	// Main method
	ajax: function( url, options ) {

		// If url is an object, simulate pre-1.5 signature
		if ( typeof url === "object" ) {
			options = url;
			url = undefined;
		}

		// Force options to be an object
		options = options || {};

		var transport,
			// URL without anti-cache param
			cacheURL,
			// Response headers
			responseHeadersString,
			responseHeaders,
			// timeout handle
			timeoutTimer,
			// Cross-domain detection vars
			parts,
			// To know if global events are to be dispatched
			fireGlobals,
			// Loop variable
			i,
			// Create the final options object
			s = jQuery.ajaxSetup( {}, options ),
			// Callbacks context
			callbackContext = s.context || s,
			// Context for global events is callbackContext if it is a DOM node or jQuery collection
			globalEventContext = s.context && ( callbackContext.nodeType || callbackContext.jquery ) ?
				jQuery( callbackContext ) :
				jQuery.event,
			// Deferreds
			deferred = jQuery.Deferred(),
			completeDeferred = jQuery.Callbacks("once memory"),
			// Status-dependent callbacks
			statusCode = s.statusCode || {},
			// Headers (they are sent all at once)
			requestHeaders = {},
			requestHeadersNames = {},
			// The jqXHR state
			state = 0,
			// Default abort message
			strAbort = "canceled",
			// Fake xhr
			jqXHR = {
				readyState: 0,

				// Builds headers hashtable if needed
				getResponseHeader: function( key ) {
					var match;
					if ( state === 2 ) {
						if ( !responseHeaders ) {
							responseHeaders = {};
							while ( (match = rheaders.exec( responseHeadersString )) ) {
								responseHeaders[ match[1].toLowerCase() ] = match[ 2 ];
							}
						}
						match = responseHeaders[ key.toLowerCase() ];
					}
					return match == null ? null : match;
				},

				// Raw string
				getAllResponseHeaders: function() {
					return state === 2 ? responseHeadersString : null;
				},

				// Caches the header
				setRequestHeader: function( name, value ) {
					var lname = name.toLowerCase();
					if ( !state ) {
						name = requestHeadersNames[ lname ] = requestHeadersNames[ lname ] || name;
						requestHeaders[ name ] = value;
					}
					return this;
				},

				// Overrides response content-type header
				overrideMimeType: function( type ) {
					if ( !state ) {
						s.mimeType = type;
					}
					return this;
				},

				// Status-dependent callbacks
				statusCode: function( map ) {
					var code;
					if ( map ) {
						if ( state < 2 ) {
							for ( code in map ) {
								// Lazy-add the new callback in a way that preserves old ones
								statusCode[ code ] = [ statusCode[ code ], map[ code ] ];
							}
						} else {
							// Execute the appropriate callbacks
							jqXHR.always( map[ jqXHR.status ] );
						}
					}
					return this;
				},

				// Cancel the request
				abort: function( statusText ) {
					var finalText = statusText || strAbort;
					if ( transport ) {
						transport.abort( finalText );
					}
					done( 0, finalText );
					return this;
				}
			};

		// Attach deferreds
		deferred.promise( jqXHR ).complete = completeDeferred.add;
		jqXHR.success = jqXHR.done;
		jqXHR.error = jqXHR.fail;

		// Remove hash character (#7531: and string promotion)
		// Add protocol if not provided (prefilters might expect it)
		// Handle falsy url in the settings object (#10093: consistency with old signature)
		// We also use the url parameter if available
		s.url = ( ( url || s.url || ajaxLocation ) + "" ).replace( rhash, "" )
			.replace( rprotocol, ajaxLocParts[ 1 ] + "//" );

		// Alias method option to type as per ticket #12004
		s.type = options.method || options.type || s.method || s.type;

		// Extract dataTypes list
		s.dataTypes = jQuery.trim( s.dataType || "*" ).toLowerCase().match( rnotwhite ) || [ "" ];

		// A cross-domain request is in order when we have a protocol:host:port mismatch
		if ( s.crossDomain == null ) {
			parts = rurl.exec( s.url.toLowerCase() );
			s.crossDomain = !!( parts &&
				( parts[ 1 ] !== ajaxLocParts[ 1 ] || parts[ 2 ] !== ajaxLocParts[ 2 ] ||
					( parts[ 3 ] || ( parts[ 1 ] === "http:" ? "80" : "443" ) ) !==
						( ajaxLocParts[ 3 ] || ( ajaxLocParts[ 1 ] === "http:" ? "80" : "443" ) ) )
			);
		}

		// Convert data if not already a string
		if ( s.data && s.processData && typeof s.data !== "string" ) {
			s.data = jQuery.param( s.data, s.traditional );
		}

		// Apply prefilters
		inspectPrefiltersOrTransports( prefilters, s, options, jqXHR );

		// If request was aborted inside a prefilter, stop there
		if ( state === 2 ) {
			return jqXHR;
		}

		// We can fire global events as of now if asked to
		fireGlobals = s.global;

		// Watch for a new set of requests
		if ( fireGlobals && jQuery.active++ === 0 ) {
			jQuery.event.trigger("ajaxStart");
		}

		// Uppercase the type
		s.type = s.type.toUpperCase();

		// Determine if request has content
		s.hasContent = !rnoContent.test( s.type );

		// Save the URL in case we're toying with the If-Modified-Since
		// and/or If-None-Match header later on
		cacheURL = s.url;

		// More options handling for requests with no content
		if ( !s.hasContent ) {

			// If data is available, append data to url
			if ( s.data ) {
				cacheURL = ( s.url += ( rquery.test( cacheURL ) ? "&" : "?" ) + s.data );
				// #9682: remove data so that it's not used in an eventual retry
				delete s.data;
			}

			// Add anti-cache in url if needed
			if ( s.cache === false ) {
				s.url = rts.test( cacheURL ) ?

					// If there is already a '_' parameter, set its value
					cacheURL.replace( rts, "$1_=" + nonce++ ) :

					// Otherwise add one to the end
					cacheURL + ( rquery.test( cacheURL ) ? "&" : "?" ) + "_=" + nonce++;
			}
		}

		// Set the If-Modified-Since and/or If-None-Match header, if in ifModified mode.
		if ( s.ifModified ) {
			if ( jQuery.lastModified[ cacheURL ] ) {
				jqXHR.setRequestHeader( "If-Modified-Since", jQuery.lastModified[ cacheURL ] );
			}
			if ( jQuery.etag[ cacheURL ] ) {
				jqXHR.setRequestHeader( "If-None-Match", jQuery.etag[ cacheURL ] );
			}
		}

		// Set the correct header, if data is being sent
		if ( s.data && s.hasContent && s.contentType !== false || options.contentType ) {
			jqXHR.setRequestHeader( "Content-Type", s.contentType );
		}

		// Set the Accepts header for the server, depending on the dataType
		jqXHR.setRequestHeader(
			"Accept",
			s.dataTypes[ 0 ] && s.accepts[ s.dataTypes[0] ] ?
				s.accepts[ s.dataTypes[0] ] + ( s.dataTypes[ 0 ] !== "*" ? ", " + allTypes + "; q=0.01" : "" ) :
				s.accepts[ "*" ]
		);

		// Check for headers option
		for ( i in s.headers ) {
			jqXHR.setRequestHeader( i, s.headers[ i ] );
		}

		// Allow custom headers/mimetypes and early abort
		if ( s.beforeSend && ( s.beforeSend.call( callbackContext, jqXHR, s ) === false || state === 2 ) ) {
			// Abort if not done already and return
			return jqXHR.abort();
		}

		// aborting is no longer a cancellation
		strAbort = "abort";

		// Install callbacks on deferreds
		for ( i in { success: 1, error: 1, complete: 1 } ) {
			jqXHR[ i ]( s[ i ] );
		}

		// Get transport
		transport = inspectPrefiltersOrTransports( transports, s, options, jqXHR );

		// If no transport, we auto-abort
		if ( !transport ) {
			done( -1, "No Transport" );
		} else {
			jqXHR.readyState = 1;

			// Send global event
			if ( fireGlobals ) {
				globalEventContext.trigger( "ajaxSend", [ jqXHR, s ] );
			}
			// Timeout
			if ( s.async && s.timeout > 0 ) {
				timeoutTimer = setTimeout(function() {
					jqXHR.abort("timeout");
				}, s.timeout );
			}

			try {
				state = 1;
				transport.send( requestHeaders, done );
			} catch ( e ) {
				// Propagate exception as error if not done
				if ( state < 2 ) {
					done( -1, e );
				// Simply rethrow otherwise
				} else {
					throw e;
				}
			}
		}

		// Callback for when everything is done
		function done( status, nativeStatusText, responses, headers ) {
			var isSuccess, success, error, response, modified,
				statusText = nativeStatusText;

			// Called once
			if ( state === 2 ) {
				return;
			}

			// State is "done" now
			state = 2;

			// Clear timeout if it exists
			if ( timeoutTimer ) {
				clearTimeout( timeoutTimer );
			}

			// Dereference transport for early garbage collection
			// (no matter how long the jqXHR object will be used)
			transport = undefined;

			// Cache response headers
			responseHeadersString = headers || "";

			// Set readyState
			jqXHR.readyState = status > 0 ? 4 : 0;

			// Determine if successful
			isSuccess = status >= 200 && status < 300 || status === 304;

			// Get response data
			if ( responses ) {
				response = ajaxHandleResponses( s, jqXHR, responses );
			}

			// Convert no matter what (that way responseXXX fields are always set)
			response = ajaxConvert( s, response, jqXHR, isSuccess );

			// If successful, handle type chaining
			if ( isSuccess ) {

				// Set the If-Modified-Since and/or If-None-Match header, if in ifModified mode.
				if ( s.ifModified ) {
					modified = jqXHR.getResponseHeader("Last-Modified");
					if ( modified ) {
						jQuery.lastModified[ cacheURL ] = modified;
					}
					modified = jqXHR.getResponseHeader("etag");
					if ( modified ) {
						jQuery.etag[ cacheURL ] = modified;
					}
				}

				// if no content
				if ( status === 204 || s.type === "HEAD" ) {
					statusText = "nocontent";

				// if not modified
				} else if ( status === 304 ) {
					statusText = "notmodified";

				// If we have data, let's convert it
				} else {
					statusText = response.state;
					success = response.data;
					error = response.error;
					isSuccess = !error;
				}
			} else {
				// We extract error from statusText
				// then normalize statusText and status for non-aborts
				error = statusText;
				if ( status || !statusText ) {
					statusText = "error";
					if ( status < 0 ) {
						status = 0;
					}
				}
			}

			// Set data for the fake xhr object
			jqXHR.status = status;
			jqXHR.statusText = ( nativeStatusText || statusText ) + "";

			// Success/Error
			if ( isSuccess ) {
				deferred.resolveWith( callbackContext, [ success, statusText, jqXHR ] );
			} else {
				deferred.rejectWith( callbackContext, [ jqXHR, statusText, error ] );
			}

			// Status-dependent callbacks
			jqXHR.statusCode( statusCode );
			statusCode = undefined;

			if ( fireGlobals ) {
				globalEventContext.trigger( isSuccess ? "ajaxSuccess" : "ajaxError",
					[ jqXHR, s, isSuccess ? success : error ] );
			}

			// Complete
			completeDeferred.fireWith( callbackContext, [ jqXHR, statusText ] );

			if ( fireGlobals ) {
				globalEventContext.trigger( "ajaxComplete", [ jqXHR, s ] );
				// Handle the global AJAX counter
				if ( !( --jQuery.active ) ) {
					jQuery.event.trigger("ajaxStop");
				}
			}
		}

		return jqXHR;
	},

	getJSON: function( url, data, callback ) {
		return jQuery.get( url, data, callback, "json" );
	},

	getScript: function( url, callback ) {
		return jQuery.get( url, undefined, callback, "script" );
	}
});

jQuery.each( [ "get", "post" ], function( i, method ) {
	jQuery[ method ] = function( url, data, callback, type ) {
		// shift arguments if data argument was omitted
		if ( jQuery.isFunction( data ) ) {
			type = type || callback;
			callback = data;
			data = undefined;
		}

		return jQuery.ajax({
			url: url,
			type: method,
			dataType: type,
			data: data,
			success: callback
		});
	};
});

// Attach a bunch of functions for handling common AJAX events
jQuery.each( [ "ajaxStart", "ajaxStop", "ajaxComplete", "ajaxError", "ajaxSuccess", "ajaxSend" ], function( i, type ) {
	jQuery.fn[ type ] = function( fn ) {
		return this.on( type, fn );
	};
});


jQuery._evalUrl = function( url ) {
	return jQuery.ajax({
		url: url,
		type: "GET",
		dataType: "script",
		async: false,
		global: false,
		"throws": true
	});
};


jQuery.fn.extend({
	wrapAll: function( html ) {
		var wrap;

		if ( jQuery.isFunction( html ) ) {
			return this.each(function( i ) {
				jQuery( this ).wrapAll( html.call(this, i) );
			});
		}

		if ( this[ 0 ] ) {

			// The elements to wrap the target around
			wrap = jQuery( html, this[ 0 ].ownerDocument ).eq( 0 ).clone( true );

			if ( this[ 0 ].parentNode ) {
				wrap.insertBefore( this[ 0 ] );
			}

			wrap.map(function() {
				var elem = this;

				while ( elem.firstElementChild ) {
					elem = elem.firstElementChild;
				}

				return elem;
			}).append( this );
		}

		return this;
	},

	wrapInner: function( html ) {
		if ( jQuery.isFunction( html ) ) {
			return this.each(function( i ) {
				jQuery( this ).wrapInner( html.call(this, i) );
			});
		}

		return this.each(function() {
			var self = jQuery( this ),
				contents = self.contents();

			if ( contents.length ) {
				contents.wrapAll( html );

			} else {
				self.append( html );
			}
		});
	},

	wrap: function( html ) {
		var isFunction = jQuery.isFunction( html );

		return this.each(function( i ) {
			jQuery( this ).wrapAll( isFunction ? html.call(this, i) : html );
		});
	},

	unwrap: function() {
		return this.parent().each(function() {
			if ( !jQuery.nodeName( this, "body" ) ) {
				jQuery( this ).replaceWith( this.childNodes );
			}
		}).end();
	}
});


jQuery.expr.filters.hidden = function( elem ) {
	// Support: Opera <= 12.12
	// Opera reports offsetWidths and offsetHeights less than zero on some elements
	return elem.offsetWidth <= 0 && elem.offsetHeight <= 0;
};
jQuery.expr.filters.visible = function( elem ) {
	return !jQuery.expr.filters.hidden( elem );
};




var r20 = /%20/g,
	rbracket = /\[\]$/,
	rCRLF = /\r?\n/g,
	rsubmitterTypes = /^(?:submit|button|image|reset|file)$/i,
	rsubmittable = /^(?:input|select|textarea|keygen)/i;

function buildParams( prefix, obj, traditional, add ) {
	var name;

	if ( jQuery.isArray( obj ) ) {
		// Serialize array item.
		jQuery.each( obj, function( i, v ) {
			if ( traditional || rbracket.test( prefix ) ) {
				// Treat each array item as a scalar.
				add( prefix, v );

			} else {
				// Item is non-scalar (array or object), encode its numeric index.
				buildParams( prefix + "[" + ( typeof v === "object" ? i : "" ) + "]", v, traditional, add );
			}
		});

	} else if ( !traditional && jQuery.type( obj ) === "object" ) {
		// Serialize object item.
		for ( name in obj ) {
			buildParams( prefix + "[" + name + "]", obj[ name ], traditional, add );
		}

	} else {
		// Serialize scalar item.
		add( prefix, obj );
	}
}

// Serialize an array of form elements or a set of
// key/values into a query string
jQuery.param = function( a, traditional ) {
	var prefix,
		s = [],
		add = function( key, value ) {
			// If value is a function, invoke it and return its value
			value = jQuery.isFunction( value ) ? value() : ( value == null ? "" : value );
			s[ s.length ] = encodeURIComponent( key ) + "=" + encodeURIComponent( value );
		};

	// Set traditional to true for jQuery <= 1.3.2 behavior.
	if ( traditional === undefined ) {
		traditional = jQuery.ajaxSettings && jQuery.ajaxSettings.traditional;
	}

	// If an array was passed in, assume that it is an array of form elements.
	if ( jQuery.isArray( a ) || ( a.jquery && !jQuery.isPlainObject( a ) ) ) {
		// Serialize the form elements
		jQuery.each( a, function() {
			add( this.name, this.value );
		});

	} else {
		// If traditional, encode the "old" way (the way 1.3.2 or older
		// did it), otherwise encode params recursively.
		for ( prefix in a ) {
			buildParams( prefix, a[ prefix ], traditional, add );
		}
	}

	// Return the resulting serialization
	return s.join( "&" ).replace( r20, "+" );
};

jQuery.fn.extend({
	serialize: function() {
		return jQuery.param( this.serializeArray() );
	},
	serializeArray: function() {
		return this.map(function() {
			// Can add propHook for "elements" to filter or add form elements
			var elements = jQuery.prop( this, "elements" );
			return elements ? jQuery.makeArray( elements ) : this;
		})
		.filter(function() {
			var type = this.type;

			// Use .is( ":disabled" ) so that fieldset[disabled] works
			return this.name && !jQuery( this ).is( ":disabled" ) &&
				rsubmittable.test( this.nodeName ) && !rsubmitterTypes.test( type ) &&
				( this.checked || !rcheckableType.test( type ) );
		})
		.map(function( i, elem ) {
			var val = jQuery( this ).val();

			return val == null ?
				null :
				jQuery.isArray( val ) ?
					jQuery.map( val, function( val ) {
						return { name: elem.name, value: val.replace( rCRLF, "\r\n" ) };
					}) :
					{ name: elem.name, value: val.replace( rCRLF, "\r\n" ) };
		}).get();
	}
});


jQuery.ajaxSettings.xhr = function() {
	try {
		return new XMLHttpRequest();
	} catch( e ) {}
};

var xhrId = 0,
	xhrCallbacks = {},
	xhrSuccessStatus = {
		// file protocol always yields status code 0, assume 200
		0: 200,
		// Support: IE9
		// #1450: sometimes IE returns 1223 when it should be 204
		1223: 204
	},
	xhrSupported = jQuery.ajaxSettings.xhr();

// Support: IE9
// Open requests must be manually aborted on unload (#5280)
if ( window.ActiveXObject ) {
	jQuery( window ).on( "unload", function() {
		for ( var key in xhrCallbacks ) {
			xhrCallbacks[ key ]();
		}
	});
}

support.cors = !!xhrSupported && ( "withCredentials" in xhrSupported );
support.ajax = xhrSupported = !!xhrSupported;

jQuery.ajaxTransport(function( options ) {
	var callback;

	// Cross domain only allowed if supported through XMLHttpRequest
	if ( support.cors || xhrSupported && !options.crossDomain ) {
		return {
			send: function( headers, complete ) {
				var i,
					xhr = options.xhr(),
					id = ++xhrId;

				xhr.open( options.type, options.url, options.async, options.username, options.password );

				// Apply custom fields if provided
				if ( options.xhrFields ) {
					for ( i in options.xhrFields ) {
						xhr[ i ] = options.xhrFields[ i ];
					}
				}

				// Override mime type if needed
				if ( options.mimeType && xhr.overrideMimeType ) {
					xhr.overrideMimeType( options.mimeType );
				}

				// X-Requested-With header
				// For cross-domain requests, seeing as conditions for a preflight are
				// akin to a jigsaw puzzle, we simply never set it to be sure.
				// (it can always be set on a per-request basis or even using ajaxSetup)
				// For same-domain requests, won't change header if already provided.
				if ( !options.crossDomain && !headers["X-Requested-With"] ) {
					headers["X-Requested-With"] = "XMLHttpRequest";
				}

				// Set headers
				for ( i in headers ) {
					xhr.setRequestHeader( i, headers[ i ] );
				}

				// Callback
				callback = function( type ) {
					return function() {
						if ( callback ) {
							delete xhrCallbacks[ id ];
							callback = xhr.onload = xhr.onerror = null;

							if ( type === "abort" ) {
								xhr.abort();
							} else if ( type === "error" ) {
								complete(
									// file: protocol always yields status 0; see #8605, #14207
									xhr.status,
									xhr.statusText
								);
							} else {
								complete(
									xhrSuccessStatus[ xhr.status ] || xhr.status,
									xhr.statusText,
									// Support: IE9
									// Accessing binary-data responseText throws an exception
									// (#11426)
									typeof xhr.responseText === "string" ? {
										text: xhr.responseText
									} : undefined,
									xhr.getAllResponseHeaders()
								);
							}
						}
					};
				};

				// Listen to events
				xhr.onload = callback();
				xhr.onerror = callback("error");

				// Create the abort callback
				callback = xhrCallbacks[ id ] = callback("abort");

				// Do send the request
				// This may raise an exception which is actually
				// handled in jQuery.ajax (so no try/catch here)
				xhr.send( options.hasContent && options.data || null );
			},

			abort: function() {
				if ( callback ) {
					callback();
				}
			}
		};
	}
});




// Install script dataType
jQuery.ajaxSetup({
	accepts: {
		script: "text/javascript, application/javascript, application/ecmascript, application/x-ecmascript"
	},
	contents: {
		script: /(?:java|ecma)script/
	},
	converters: {
		"text script": function( text ) {
			jQuery.globalEval( text );
			return text;
		}
	}
});

// Handle cache's special case and crossDomain
jQuery.ajaxPrefilter( "script", function( s ) {
	if ( s.cache === undefined ) {
		s.cache = false;
	}
	if ( s.crossDomain ) {
		s.type = "GET";
	}
});

// Bind script tag hack transport
jQuery.ajaxTransport( "script", function( s ) {
	// This transport only deals with cross domain requests
	if ( s.crossDomain ) {
		var script, callback;
		return {
			send: function( _, complete ) {
				script = jQuery("<script>").prop({
					async: true,
					charset: s.scriptCharset,
					src: s.url
				}).on(
					"load error",
					callback = function( evt ) {
						script.remove();
						callback = null;
						if ( evt ) {
							complete( evt.type === "error" ? 404 : 200, evt.type );
						}
					}
				);
				document.head.appendChild( script[ 0 ] );
			},
			abort: function() {
				if ( callback ) {
					callback();
				}
			}
		};
	}
});




var oldCallbacks = [],
	rjsonp = /(=)\?(?=&|$)|\?\?/;

// Default jsonp settings
jQuery.ajaxSetup({
	jsonp: "callback",
	jsonpCallback: function() {
		var callback = oldCallbacks.pop() || ( jQuery.expando + "_" + ( nonce++ ) );
		this[ callback ] = true;
		return callback;
	}
});

// Detect, normalize options and install callbacks for jsonp requests
jQuery.ajaxPrefilter( "json jsonp", function( s, originalSettings, jqXHR ) {

	var callbackName, overwritten, responseContainer,
		jsonProp = s.jsonp !== false && ( rjsonp.test( s.url ) ?
			"url" :
			typeof s.data === "string" && !( s.contentType || "" ).indexOf("application/x-www-form-urlencoded") && rjsonp.test( s.data ) && "data"
		);

	// Handle iff the expected data type is "jsonp" or we have a parameter to set
	if ( jsonProp || s.dataTypes[ 0 ] === "jsonp" ) {

		// Get callback name, remembering preexisting value associated with it
		callbackName = s.jsonpCallback = jQuery.isFunction( s.jsonpCallback ) ?
			s.jsonpCallback() :
			s.jsonpCallback;

		// Insert callback into url or form data
		if ( jsonProp ) {
			s[ jsonProp ] = s[ jsonProp ].replace( rjsonp, "$1" + callbackName );
		} else if ( s.jsonp !== false ) {
			s.url += ( rquery.test( s.url ) ? "&" : "?" ) + s.jsonp + "=" + callbackName;
		}

		// Use data converter to retrieve json after script execution
		s.converters["script json"] = function() {
			if ( !responseContainer ) {
				jQuery.error( callbackName + " was not called" );
			}
			return responseContainer[ 0 ];
		};

		// force json dataType
		s.dataTypes[ 0 ] = "json";

		// Install callback
		overwritten = window[ callbackName ];
		window[ callbackName ] = function() {
			responseContainer = arguments;
		};

		// Clean-up function (fires after converters)
		jqXHR.always(function() {
			// Restore preexisting value
			window[ callbackName ] = overwritten;

			// Save back as free
			if ( s[ callbackName ] ) {
				// make sure that re-using the options doesn't screw things around
				s.jsonpCallback = originalSettings.jsonpCallback;

				// save the callback name for future use
				oldCallbacks.push( callbackName );
			}

			// Call if it was a function and we have a response
			if ( responseContainer && jQuery.isFunction( overwritten ) ) {
				overwritten( responseContainer[ 0 ] );
			}

			responseContainer = overwritten = undefined;
		});

		// Delegate to script
		return "script";
	}
});




// data: string of html
// context (optional): If specified, the fragment will be created in this context, defaults to document
// keepScripts (optional): If true, will include scripts passed in the html string
jQuery.parseHTML = function( data, context, keepScripts ) {
	if ( !data || typeof data !== "string" ) {
		return null;
	}
	if ( typeof context === "boolean" ) {
		keepScripts = context;
		context = false;
	}
	context = context || document;

	var parsed = rsingleTag.exec( data ),
		scripts = !keepScripts && [];

	// Single tag
	if ( parsed ) {
		return [ context.createElement( parsed[1] ) ];
	}

	parsed = jQuery.buildFragment( [ data ], context, scripts );

	if ( scripts && scripts.length ) {
		jQuery( scripts ).remove();
	}

	return jQuery.merge( [], parsed.childNodes );
};


// Keep a copy of the old load method
var _load = jQuery.fn.load;

/**
 * Load a url into a page
 */
jQuery.fn.load = function( url, params, callback ) {
	if ( typeof url !== "string" && _load ) {
		return _load.apply( this, arguments );
	}

	var selector, type, response,
		self = this,
		off = url.indexOf(" ");

	if ( off >= 0 ) {
		selector = url.slice( off );
		url = url.slice( 0, off );
	}

	// If it's a function
	if ( jQuery.isFunction( params ) ) {

		// We assume that it's the callback
		callback = params;
		params = undefined;

	// Otherwise, build a param string
	} else if ( params && typeof params === "object" ) {
		type = "POST";
	}

	// If we have elements to modify, make the request
	if ( self.length > 0 ) {
		jQuery.ajax({
			url: url,

			// if "type" variable is undefined, then "GET" method will be used
			type: type,
			dataType: "html",
			data: params
		}).done(function( responseText ) {

			// Save response for use in complete callback
			response = arguments;

			self.html( selector ?

				// If a selector was specified, locate the right elements in a dummy div
				// Exclude scripts to avoid IE 'Permission Denied' errors
				jQuery("<div>").append( jQuery.parseHTML( responseText ) ).find( selector ) :

				// Otherwise use the full result
				responseText );

		}).complete( callback && function( jqXHR, status ) {
			self.each( callback, response || [ jqXHR.responseText, status, jqXHR ] );
		});
	}

	return this;
};




jQuery.expr.filters.animated = function( elem ) {
	return jQuery.grep(jQuery.timers, function( fn ) {
		return elem === fn.elem;
	}).length;
};




var docElem = window.document.documentElement;

/**
 * Gets a window from an element
 */
function getWindow( elem ) {
	return jQuery.isWindow( elem ) ? elem : elem.nodeType === 9 && elem.defaultView;
}

jQuery.offset = {
	setOffset: function( elem, options, i ) {
		var curPosition, curLeft, curCSSTop, curTop, curOffset, curCSSLeft, calculatePosition,
			position = jQuery.css( elem, "position" ),
			curElem = jQuery( elem ),
			props = {};

		// Set position first, in-case top/left are set even on static elem
		if ( position === "static" ) {
			elem.style.position = "relative";
		}

		curOffset = curElem.offset();
		curCSSTop = jQuery.css( elem, "top" );
		curCSSLeft = jQuery.css( elem, "left" );
		calculatePosition = ( position === "absolute" || position === "fixed" ) &&
			( curCSSTop + curCSSLeft ).indexOf("auto") > -1;

		// Need to be able to calculate position if either top or left is auto and position is either absolute or fixed
		if ( calculatePosition ) {
			curPosition = curElem.position();
			curTop = curPosition.top;
			curLeft = curPosition.left;

		} else {
			curTop = parseFloat( curCSSTop ) || 0;
			curLeft = parseFloat( curCSSLeft ) || 0;
		}

		if ( jQuery.isFunction( options ) ) {
			options = options.call( elem, i, curOffset );
		}

		if ( options.top != null ) {
			props.top = ( options.top - curOffset.top ) + curTop;
		}
		if ( options.left != null ) {
			props.left = ( options.left - curOffset.left ) + curLeft;
		}

		if ( "using" in options ) {
			options.using.call( elem, props );

		} else {
			curElem.css( props );
		}
	}
};

jQuery.fn.extend({
	offset: function( options ) {
		if ( arguments.length ) {
			return options === undefined ?
				this :
				this.each(function( i ) {
					jQuery.offset.setOffset( this, options, i );
				});
		}

		var docElem, win,
			elem = this[ 0 ],
			box = { top: 0, left: 0 },
			doc = elem && elem.ownerDocument;

		if ( !doc ) {
			return;
		}

		docElem = doc.documentElement;

		// Make sure it's not a disconnected DOM node
		if ( !jQuery.contains( docElem, elem ) ) {
			return box;
		}

		// If we don't have gBCR, just use 0,0 rather than error
		// BlackBerry 5, iOS 3 (original iPhone)
		if ( typeof elem.getBoundingClientRect !== strundefined ) {
			box = elem.getBoundingClientRect();
		}
		win = getWindow( doc );
		return {
			top: box.top + win.pageYOffset - docElem.clientTop,
			left: box.left + win.pageXOffset - docElem.clientLeft
		};
	},

	position: function() {
		if ( !this[ 0 ] ) {
			return;
		}

		var offsetParent, offset,
			elem = this[ 0 ],
			parentOffset = { top: 0, left: 0 };

		// Fixed elements are offset from window (parentOffset = {top:0, left: 0}, because it is its only offset parent
		if ( jQuery.css( elem, "position" ) === "fixed" ) {
			// We assume that getBoundingClientRect is available when computed position is fixed
			offset = elem.getBoundingClientRect();

		} else {
			// Get *real* offsetParent
			offsetParent = this.offsetParent();

			// Get correct offsets
			offset = this.offset();
			if ( !jQuery.nodeName( offsetParent[ 0 ], "html" ) ) {
				parentOffset = offsetParent.offset();
			}

			// Add offsetParent borders
			parentOffset.top += jQuery.css( offsetParent[ 0 ], "borderTopWidth", true );
			parentOffset.left += jQuery.css( offsetParent[ 0 ], "borderLeftWidth", true );
		}

		// Subtract parent offsets and element margins
		return {
			top: offset.top - parentOffset.top - jQuery.css( elem, "marginTop", true ),
			left: offset.left - parentOffset.left - jQuery.css( elem, "marginLeft", true )
		};
	},

	offsetParent: function() {
		return this.map(function() {
			var offsetParent = this.offsetParent || docElem;

			while ( offsetParent && ( !jQuery.nodeName( offsetParent, "html" ) && jQuery.css( offsetParent, "position" ) === "static" ) ) {
				offsetParent = offsetParent.offsetParent;
			}

			return offsetParent || docElem;
		});
	}
});

// Create scrollLeft and scrollTop methods
jQuery.each( { scrollLeft: "pageXOffset", scrollTop: "pageYOffset" }, function( method, prop ) {
	var top = "pageYOffset" === prop;

	jQuery.fn[ method ] = function( val ) {
		return access( this, function( elem, method, val ) {
			var win = getWindow( elem );

			if ( val === undefined ) {
				return win ? win[ prop ] : elem[ method ];
			}

			if ( win ) {
				win.scrollTo(
					!top ? val : window.pageXOffset,
					top ? val : window.pageYOffset
				);

			} else {
				elem[ method ] = val;
			}
		}, method, val, arguments.length, null );
	};
});

// Add the top/left cssHooks using jQuery.fn.position
// Webkit bug: https://bugs.webkit.org/show_bug.cgi?id=29084
// getComputedStyle returns percent when specified for top/left/bottom/right
// rather than make the css module depend on the offset module, we just check for it here
jQuery.each( [ "top", "left" ], function( i, prop ) {
	jQuery.cssHooks[ prop ] = addGetHookIf( support.pixelPosition,
		function( elem, computed ) {
			if ( computed ) {
				computed = curCSS( elem, prop );
				// if curCSS returns percentage, fallback to offset
				return rnumnonpx.test( computed ) ?
					jQuery( elem ).position()[ prop ] + "px" :
					computed;
			}
		}
	);
});


// Create innerHeight, innerWidth, height, width, outerHeight and outerWidth methods
jQuery.each( { Height: "height", Width: "width" }, function( name, type ) {
	jQuery.each( { padding: "inner" + name, content: type, "": "outer" + name }, function( defaultExtra, funcName ) {
		// margin is only for outerHeight, outerWidth
		jQuery.fn[ funcName ] = function( margin, value ) {
			var chainable = arguments.length && ( defaultExtra || typeof margin !== "boolean" ),
				extra = defaultExtra || ( margin === true || value === true ? "margin" : "border" );

			return access( this, function( elem, type, value ) {
				var doc;

				if ( jQuery.isWindow( elem ) ) {
					// As of 5/8/2012 this will yield incorrect results for Mobile Safari, but there
					// isn't a whole lot we can do. See pull request at this URL for discussion:
					// https://github.com/jquery/jquery/pull/764
					return elem.document.documentElement[ "client" + name ];
				}

				// Get document width or height
				if ( elem.nodeType === 9 ) {
					doc = elem.documentElement;

					// Either scroll[Width/Height] or offset[Width/Height] or client[Width/Height],
					// whichever is greatest
					return Math.max(
						elem.body[ "scroll" + name ], doc[ "scroll" + name ],
						elem.body[ "offset" + name ], doc[ "offset" + name ],
						doc[ "client" + name ]
					);
				}

				return value === undefined ?
					// Get width or height on the element, requesting but not forcing parseFloat
					jQuery.css( elem, type, extra ) :

					// Set width or height on the element
					jQuery.style( elem, type, value, extra );
			}, type, chainable ? margin : undefined, chainable, null );
		};
	});
});


// The number of elements contained in the matched element set
jQuery.fn.size = function() {
	return this.length;
};

jQuery.fn.andSelf = jQuery.fn.addBack;




// Register as a named AMD module, since jQuery can be concatenated with other
// files that may use define, but not via a proper concatenation script that
// understands anonymous AMD modules. A named AMD is safest and most robust
// way to register. Lowercase jquery is used because AMD module names are
// derived from file names, and jQuery is normally delivered in a lowercase
// file name. Do this after creating the global so that if an AMD module wants
// to call noConflict to hide this version of jQuery, it will work.
if ( typeof define === "function" && define.amd ) {
	define( "jquery", [], function() {
		return jQuery;
	});
}




var
	// Map over jQuery in case of overwrite
	_jQuery = window.jQuery,

	// Map over the $ in case of overwrite
	_$ = window.$;

jQuery.noConflict = function( deep ) {
	if ( window.$ === jQuery ) {
		window.$ = _$;
	}

	if ( deep && window.jQuery === jQuery ) {
		window.jQuery = _jQuery;
	}

	return jQuery;
};

// Expose jQuery and $ identifiers, even in
// AMD (#7102#comment:10, https://github.com/jquery/jquery/pull/557)
// and CommonJS for browser emulators (#13566)
if ( typeof noGlobal === strundefined ) {
	window.jQuery = window.$ = jQuery;
}




return jQuery;

}));

},{}],6:[function(require,module,exports){
//     Underscore.js 1.6.0
//     http://underscorejs.org
//     (c) 2009-2014 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
//     Underscore may be freely distributed under the MIT license.

(function() {

  // Baseline setup
  // --------------

  // Establish the root object, `window` in the browser, or `exports` on the server.
  var root = this;

  // Save the previous value of the `_` variable.
  var previousUnderscore = root._;

  // Establish the object that gets returned to break out of a loop iteration.
  var breaker = {};

  // Save bytes in the minified (but not gzipped) version:
  var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;

  // Create quick reference variables for speed access to core prototypes.
  var
    push             = ArrayProto.push,
    slice            = ArrayProto.slice,
    concat           = ArrayProto.concat,
    toString         = ObjProto.toString,
    hasOwnProperty   = ObjProto.hasOwnProperty;

  // All **ECMAScript 5** native function implementations that we hope to use
  // are declared here.
  var
    nativeForEach      = ArrayProto.forEach,
    nativeMap          = ArrayProto.map,
    nativeReduce       = ArrayProto.reduce,
    nativeReduceRight  = ArrayProto.reduceRight,
    nativeFilter       = ArrayProto.filter,
    nativeEvery        = ArrayProto.every,
    nativeSome         = ArrayProto.some,
    nativeIndexOf      = ArrayProto.indexOf,
    nativeLastIndexOf  = ArrayProto.lastIndexOf,
    nativeIsArray      = Array.isArray,
    nativeKeys         = Object.keys,
    nativeBind         = FuncProto.bind;

  // Create a safe reference to the Underscore object for use below.
  var _ = function(obj) {
    if (obj instanceof _) return obj;
    if (!(this instanceof _)) return new _(obj);
    this._wrapped = obj;
  };

  // Export the Underscore object for **Node.js**, with
  // backwards-compatibility for the old `require()` API. If we're in
  // the browser, add `_` as a global object via a string identifier,
  // for Closure Compiler "advanced" mode.
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = _;
    }
    exports._ = _;
  } else {
    root._ = _;
  }

  // Current version.
  _.VERSION = '1.6.0';

  // Collection Functions
  // --------------------

  // The cornerstone, an `each` implementation, aka `forEach`.
  // Handles objects with the built-in `forEach`, arrays, and raw objects.
  // Delegates to **ECMAScript 5**'s native `forEach` if available.
  var each = _.each = _.forEach = function(obj, iterator, context) {
    if (obj == null) return obj;
    if (nativeForEach && obj.forEach === nativeForEach) {
      obj.forEach(iterator, context);
    } else if (obj.length === +obj.length) {
      for (var i = 0, length = obj.length; i < length; i++) {
        if (iterator.call(context, obj[i], i, obj) === breaker) return;
      }
    } else {
      var keys = _.keys(obj);
      for (var i = 0, length = keys.length; i < length; i++) {
        if (iterator.call(context, obj[keys[i]], keys[i], obj) === breaker) return;
      }
    }
    return obj;
  };

  // Return the results of applying the iterator to each element.
  // Delegates to **ECMAScript 5**'s native `map` if available.
  _.map = _.collect = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeMap && obj.map === nativeMap) return obj.map(iterator, context);
    each(obj, function(value, index, list) {
      results.push(iterator.call(context, value, index, list));
    });
    return results;
  };

  var reduceError = 'Reduce of empty array with no initial value';

  // **Reduce** builds up a single result from a list of values, aka `inject`,
  // or `foldl`. Delegates to **ECMAScript 5**'s native `reduce` if available.
  _.reduce = _.foldl = _.inject = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduce && obj.reduce === nativeReduce) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduce(iterator, memo) : obj.reduce(iterator);
    }
    each(obj, function(value, index, list) {
      if (!initial) {
        memo = value;
        initial = true;
      } else {
        memo = iterator.call(context, memo, value, index, list);
      }
    });
    if (!initial) throw new TypeError(reduceError);
    return memo;
  };

  // The right-associative version of reduce, also known as `foldr`.
  // Delegates to **ECMAScript 5**'s native `reduceRight` if available.
  _.reduceRight = _.foldr = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduceRight && obj.reduceRight === nativeReduceRight) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduceRight(iterator, memo) : obj.reduceRight(iterator);
    }
    var length = obj.length;
    if (length !== +length) {
      var keys = _.keys(obj);
      length = keys.length;
    }
    each(obj, function(value, index, list) {
      index = keys ? keys[--length] : --length;
      if (!initial) {
        memo = obj[index];
        initial = true;
      } else {
        memo = iterator.call(context, memo, obj[index], index, list);
      }
    });
    if (!initial) throw new TypeError(reduceError);
    return memo;
  };

  // Return the first value which passes a truth test. Aliased as `detect`.
  _.find = _.detect = function(obj, predicate, context) {
    var result;
    any(obj, function(value, index, list) {
      if (predicate.call(context, value, index, list)) {
        result = value;
        return true;
      }
    });
    return result;
  };

  // Return all the elements that pass a truth test.
  // Delegates to **ECMAScript 5**'s native `filter` if available.
  // Aliased as `select`.
  _.filter = _.select = function(obj, predicate, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeFilter && obj.filter === nativeFilter) return obj.filter(predicate, context);
    each(obj, function(value, index, list) {
      if (predicate.call(context, value, index, list)) results.push(value);
    });
    return results;
  };

  // Return all the elements for which a truth test fails.
  _.reject = function(obj, predicate, context) {
    return _.filter(obj, function(value, index, list) {
      return !predicate.call(context, value, index, list);
    }, context);
  };

  // Determine whether all of the elements match a truth test.
  // Delegates to **ECMAScript 5**'s native `every` if available.
  // Aliased as `all`.
  _.every = _.all = function(obj, predicate, context) {
    predicate || (predicate = _.identity);
    var result = true;
    if (obj == null) return result;
    if (nativeEvery && obj.every === nativeEvery) return obj.every(predicate, context);
    each(obj, function(value, index, list) {
      if (!(result = result && predicate.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if at least one element in the object matches a truth test.
  // Delegates to **ECMAScript 5**'s native `some` if available.
  // Aliased as `any`.
  var any = _.some = _.any = function(obj, predicate, context) {
    predicate || (predicate = _.identity);
    var result = false;
    if (obj == null) return result;
    if (nativeSome && obj.some === nativeSome) return obj.some(predicate, context);
    each(obj, function(value, index, list) {
      if (result || (result = predicate.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if the array or object contains a given value (using `===`).
  // Aliased as `include`.
  _.contains = _.include = function(obj, target) {
    if (obj == null) return false;
    if (nativeIndexOf && obj.indexOf === nativeIndexOf) return obj.indexOf(target) != -1;
    return any(obj, function(value) {
      return value === target;
    });
  };

  // Invoke a method (with arguments) on every item in a collection.
  _.invoke = function(obj, method) {
    var args = slice.call(arguments, 2);
    var isFunc = _.isFunction(method);
    return _.map(obj, function(value) {
      return (isFunc ? method : value[method]).apply(value, args);
    });
  };

  // Convenience version of a common use case of `map`: fetching a property.
  _.pluck = function(obj, key) {
    return _.map(obj, _.property(key));
  };

  // Convenience version of a common use case of `filter`: selecting only objects
  // containing specific `key:value` pairs.
  _.where = function(obj, attrs) {
    return _.filter(obj, _.matches(attrs));
  };

  // Convenience version of a common use case of `find`: getting the first object
  // containing specific `key:value` pairs.
  _.findWhere = function(obj, attrs) {
    return _.find(obj, _.matches(attrs));
  };

  // Return the maximum element or (element-based computation).
  // Can't optimize arrays of integers longer than 65,535 elements.
  // See [WebKit Bug 80797](https://bugs.webkit.org/show_bug.cgi?id=80797)
  _.max = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.max.apply(Math, obj);
    }
    var result = -Infinity, lastComputed = -Infinity;
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      if (computed > lastComputed) {
        result = value;
        lastComputed = computed;
      }
    });
    return result;
  };

  // Return the minimum element (or element-based computation).
  _.min = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.min.apply(Math, obj);
    }
    var result = Infinity, lastComputed = Infinity;
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      if (computed < lastComputed) {
        result = value;
        lastComputed = computed;
      }
    });
    return result;
  };

  // Shuffle an array, using the modern version of the
  // [Fisher-Yates shuffle](http://en.wikipedia.org/wiki/Fisher–Yates_shuffle).
  _.shuffle = function(obj) {
    var rand;
    var index = 0;
    var shuffled = [];
    each(obj, function(value) {
      rand = _.random(index++);
      shuffled[index - 1] = shuffled[rand];
      shuffled[rand] = value;
    });
    return shuffled;
  };

  // Sample **n** random values from a collection.
  // If **n** is not specified, returns a single random element.
  // The internal `guard` argument allows it to work with `map`.
  _.sample = function(obj, n, guard) {
    if (n == null || guard) {
      if (obj.length !== +obj.length) obj = _.values(obj);
      return obj[_.random(obj.length - 1)];
    }
    return _.shuffle(obj).slice(0, Math.max(0, n));
  };

  // An internal function to generate lookup iterators.
  var lookupIterator = function(value) {
    if (value == null) return _.identity;
    if (_.isFunction(value)) return value;
    return _.property(value);
  };

  // Sort the object's values by a criterion produced by an iterator.
  _.sortBy = function(obj, iterator, context) {
    iterator = lookupIterator(iterator);
    return _.pluck(_.map(obj, function(value, index, list) {
      return {
        value: value,
        index: index,
        criteria: iterator.call(context, value, index, list)
      };
    }).sort(function(left, right) {
      var a = left.criteria;
      var b = right.criteria;
      if (a !== b) {
        if (a > b || a === void 0) return 1;
        if (a < b || b === void 0) return -1;
      }
      return left.index - right.index;
    }), 'value');
  };

  // An internal function used for aggregate "group by" operations.
  var group = function(behavior) {
    return function(obj, iterator, context) {
      var result = {};
      iterator = lookupIterator(iterator);
      each(obj, function(value, index) {
        var key = iterator.call(context, value, index, obj);
        behavior(result, key, value);
      });
      return result;
    };
  };

  // Groups the object's values by a criterion. Pass either a string attribute
  // to group by, or a function that returns the criterion.
  _.groupBy = group(function(result, key, value) {
    _.has(result, key) ? result[key].push(value) : result[key] = [value];
  });

  // Indexes the object's values by a criterion, similar to `groupBy`, but for
  // when you know that your index values will be unique.
  _.indexBy = group(function(result, key, value) {
    result[key] = value;
  });

  // Counts instances of an object that group by a certain criterion. Pass
  // either a string attribute to count by, or a function that returns the
  // criterion.
  _.countBy = group(function(result, key) {
    _.has(result, key) ? result[key]++ : result[key] = 1;
  });

  // Use a comparator function to figure out the smallest index at which
  // an object should be inserted so as to maintain order. Uses binary search.
  _.sortedIndex = function(array, obj, iterator, context) {
    iterator = lookupIterator(iterator);
    var value = iterator.call(context, obj);
    var low = 0, high = array.length;
    while (low < high) {
      var mid = (low + high) >>> 1;
      iterator.call(context, array[mid]) < value ? low = mid + 1 : high = mid;
    }
    return low;
  };

  // Safely create a real, live array from anything iterable.
  _.toArray = function(obj) {
    if (!obj) return [];
    if (_.isArray(obj)) return slice.call(obj);
    if (obj.length === +obj.length) return _.map(obj, _.identity);
    return _.values(obj);
  };

  // Return the number of elements in an object.
  _.size = function(obj) {
    if (obj == null) return 0;
    return (obj.length === +obj.length) ? obj.length : _.keys(obj).length;
  };

  // Array Functions
  // ---------------

  // Get the first element of an array. Passing **n** will return the first N
  // values in the array. Aliased as `head` and `take`. The **guard** check
  // allows it to work with `_.map`.
  _.first = _.head = _.take = function(array, n, guard) {
    if (array == null) return void 0;
    if ((n == null) || guard) return array[0];
    if (n < 0) return [];
    return slice.call(array, 0, n);
  };

  // Returns everything but the last entry of the array. Especially useful on
  // the arguments object. Passing **n** will return all the values in
  // the array, excluding the last N. The **guard** check allows it to work with
  // `_.map`.
  _.initial = function(array, n, guard) {
    return slice.call(array, 0, array.length - ((n == null) || guard ? 1 : n));
  };

  // Get the last element of an array. Passing **n** will return the last N
  // values in the array. The **guard** check allows it to work with `_.map`.
  _.last = function(array, n, guard) {
    if (array == null) return void 0;
    if ((n == null) || guard) return array[array.length - 1];
    return slice.call(array, Math.max(array.length - n, 0));
  };

  // Returns everything but the first entry of the array. Aliased as `tail` and `drop`.
  // Especially useful on the arguments object. Passing an **n** will return
  // the rest N values in the array. The **guard**
  // check allows it to work with `_.map`.
  _.rest = _.tail = _.drop = function(array, n, guard) {
    return slice.call(array, (n == null) || guard ? 1 : n);
  };

  // Trim out all falsy values from an array.
  _.compact = function(array) {
    return _.filter(array, _.identity);
  };

  // Internal implementation of a recursive `flatten` function.
  var flatten = function(input, shallow, output) {
    if (shallow && _.every(input, _.isArray)) {
      return concat.apply(output, input);
    }
    each(input, function(value) {
      if (_.isArray(value) || _.isArguments(value)) {
        shallow ? push.apply(output, value) : flatten(value, shallow, output);
      } else {
        output.push(value);
      }
    });
    return output;
  };

  // Flatten out an array, either recursively (by default), or just one level.
  _.flatten = function(array, shallow) {
    return flatten(array, shallow, []);
  };

  // Return a version of the array that does not contain the specified value(s).
  _.without = function(array) {
    return _.difference(array, slice.call(arguments, 1));
  };

  // Split an array into two arrays: one whose elements all satisfy the given
  // predicate, and one whose elements all do not satisfy the predicate.
  _.partition = function(array, predicate) {
    var pass = [], fail = [];
    each(array, function(elem) {
      (predicate(elem) ? pass : fail).push(elem);
    });
    return [pass, fail];
  };

  // Produce a duplicate-free version of the array. If the array has already
  // been sorted, you have the option of using a faster algorithm.
  // Aliased as `unique`.
  _.uniq = _.unique = function(array, isSorted, iterator, context) {
    if (_.isFunction(isSorted)) {
      context = iterator;
      iterator = isSorted;
      isSorted = false;
    }
    var initial = iterator ? _.map(array, iterator, context) : array;
    var results = [];
    var seen = [];
    each(initial, function(value, index) {
      if (isSorted ? (!index || seen[seen.length - 1] !== value) : !_.contains(seen, value)) {
        seen.push(value);
        results.push(array[index]);
      }
    });
    return results;
  };

  // Produce an array that contains the union: each distinct element from all of
  // the passed-in arrays.
  _.union = function() {
    return _.uniq(_.flatten(arguments, true));
  };

  // Produce an array that contains every item shared between all the
  // passed-in arrays.
  _.intersection = function(array) {
    var rest = slice.call(arguments, 1);
    return _.filter(_.uniq(array), function(item) {
      return _.every(rest, function(other) {
        return _.contains(other, item);
      });
    });
  };

  // Take the difference between one array and a number of other arrays.
  // Only the elements present in just the first array will remain.
  _.difference = function(array) {
    var rest = concat.apply(ArrayProto, slice.call(arguments, 1));
    return _.filter(array, function(value){ return !_.contains(rest, value); });
  };

  // Zip together multiple lists into a single array -- elements that share
  // an index go together.
  _.zip = function() {
    var length = _.max(_.pluck(arguments, 'length').concat(0));
    var results = new Array(length);
    for (var i = 0; i < length; i++) {
      results[i] = _.pluck(arguments, '' + i);
    }
    return results;
  };

  // Converts lists into objects. Pass either a single array of `[key, value]`
  // pairs, or two parallel arrays of the same length -- one of keys, and one of
  // the corresponding values.
  _.object = function(list, values) {
    if (list == null) return {};
    var result = {};
    for (var i = 0, length = list.length; i < length; i++) {
      if (values) {
        result[list[i]] = values[i];
      } else {
        result[list[i][0]] = list[i][1];
      }
    }
    return result;
  };

  // If the browser doesn't supply us with indexOf (I'm looking at you, **MSIE**),
  // we need this function. Return the position of the first occurrence of an
  // item in an array, or -1 if the item is not included in the array.
  // Delegates to **ECMAScript 5**'s native `indexOf` if available.
  // If the array is large and already in sort order, pass `true`
  // for **isSorted** to use binary search.
  _.indexOf = function(array, item, isSorted) {
    if (array == null) return -1;
    var i = 0, length = array.length;
    if (isSorted) {
      if (typeof isSorted == 'number') {
        i = (isSorted < 0 ? Math.max(0, length + isSorted) : isSorted);
      } else {
        i = _.sortedIndex(array, item);
        return array[i] === item ? i : -1;
      }
    }
    if (nativeIndexOf && array.indexOf === nativeIndexOf) return array.indexOf(item, isSorted);
    for (; i < length; i++) if (array[i] === item) return i;
    return -1;
  };

  // Delegates to **ECMAScript 5**'s native `lastIndexOf` if available.
  _.lastIndexOf = function(array, item, from) {
    if (array == null) return -1;
    var hasIndex = from != null;
    if (nativeLastIndexOf && array.lastIndexOf === nativeLastIndexOf) {
      return hasIndex ? array.lastIndexOf(item, from) : array.lastIndexOf(item);
    }
    var i = (hasIndex ? from : array.length);
    while (i--) if (array[i] === item) return i;
    return -1;
  };

  // Generate an integer Array containing an arithmetic progression. A port of
  // the native Python `range()` function. See
  // [the Python documentation](http://docs.python.org/library/functions.html#range).
  _.range = function(start, stop, step) {
    if (arguments.length <= 1) {
      stop = start || 0;
      start = 0;
    }
    step = arguments[2] || 1;

    var length = Math.max(Math.ceil((stop - start) / step), 0);
    var idx = 0;
    var range = new Array(length);

    while(idx < length) {
      range[idx++] = start;
      start += step;
    }

    return range;
  };

  // Function (ahem) Functions
  // ------------------

  // Reusable constructor function for prototype setting.
  var ctor = function(){};

  // Create a function bound to a given object (assigning `this`, and arguments,
  // optionally). Delegates to **ECMAScript 5**'s native `Function.bind` if
  // available.
  _.bind = function(func, context) {
    var args, bound;
    if (nativeBind && func.bind === nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
    if (!_.isFunction(func)) throw new TypeError;
    args = slice.call(arguments, 2);
    return bound = function() {
      if (!(this instanceof bound)) return func.apply(context, args.concat(slice.call(arguments)));
      ctor.prototype = func.prototype;
      var self = new ctor;
      ctor.prototype = null;
      var result = func.apply(self, args.concat(slice.call(arguments)));
      if (Object(result) === result) return result;
      return self;
    };
  };

  // Partially apply a function by creating a version that has had some of its
  // arguments pre-filled, without changing its dynamic `this` context. _ acts
  // as a placeholder, allowing any combination of arguments to be pre-filled.
  _.partial = function(func) {
    var boundArgs = slice.call(arguments, 1);
    return function() {
      var position = 0;
      var args = boundArgs.slice();
      for (var i = 0, length = args.length; i < length; i++) {
        if (args[i] === _) args[i] = arguments[position++];
      }
      while (position < arguments.length) args.push(arguments[position++]);
      return func.apply(this, args);
    };
  };

  // Bind a number of an object's methods to that object. Remaining arguments
  // are the method names to be bound. Useful for ensuring that all callbacks
  // defined on an object belong to it.
  _.bindAll = function(obj) {
    var funcs = slice.call(arguments, 1);
    if (funcs.length === 0) throw new Error('bindAll must be passed function names');
    each(funcs, function(f) { obj[f] = _.bind(obj[f], obj); });
    return obj;
  };

  // Memoize an expensive function by storing its results.
  _.memoize = function(func, hasher) {
    var memo = {};
    hasher || (hasher = _.identity);
    return function() {
      var key = hasher.apply(this, arguments);
      return _.has(memo, key) ? memo[key] : (memo[key] = func.apply(this, arguments));
    };
  };

  // Delays a function for the given number of milliseconds, and then calls
  // it with the arguments supplied.
  _.delay = function(func, wait) {
    var args = slice.call(arguments, 2);
    return setTimeout(function(){ return func.apply(null, args); }, wait);
  };

  // Defers a function, scheduling it to run after the current call stack has
  // cleared.
  _.defer = function(func) {
    return _.delay.apply(_, [func, 1].concat(slice.call(arguments, 1)));
  };

  // Returns a function, that, when invoked, will only be triggered at most once
  // during a given window of time. Normally, the throttled function will run
  // as much as it can, without ever going more than once per `wait` duration;
  // but if you'd like to disable the execution on the leading edge, pass
  // `{leading: false}`. To disable execution on the trailing edge, ditto.
  _.throttle = function(func, wait, options) {
    var context, args, result;
    var timeout = null;
    var previous = 0;
    options || (options = {});
    var later = function() {
      previous = options.leading === false ? 0 : _.now();
      timeout = null;
      result = func.apply(context, args);
      context = args = null;
    };
    return function() {
      var now = _.now();
      if (!previous && options.leading === false) previous = now;
      var remaining = wait - (now - previous);
      context = this;
      args = arguments;
      if (remaining <= 0) {
        clearTimeout(timeout);
        timeout = null;
        previous = now;
        result = func.apply(context, args);
        context = args = null;
      } else if (!timeout && options.trailing !== false) {
        timeout = setTimeout(later, remaining);
      }
      return result;
    };
  };

  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.
  _.debounce = function(func, wait, immediate) {
    var timeout, args, context, timestamp, result;

    var later = function() {
      var last = _.now() - timestamp;
      if (last < wait) {
        timeout = setTimeout(later, wait - last);
      } else {
        timeout = null;
        if (!immediate) {
          result = func.apply(context, args);
          context = args = null;
        }
      }
    };

    return function() {
      context = this;
      args = arguments;
      timestamp = _.now();
      var callNow = immediate && !timeout;
      if (!timeout) {
        timeout = setTimeout(later, wait);
      }
      if (callNow) {
        result = func.apply(context, args);
        context = args = null;
      }

      return result;
    };
  };

  // Returns a function that will be executed at most one time, no matter how
  // often you call it. Useful for lazy initialization.
  _.once = function(func) {
    var ran = false, memo;
    return function() {
      if (ran) return memo;
      ran = true;
      memo = func.apply(this, arguments);
      func = null;
      return memo;
    };
  };

  // Returns the first function passed as an argument to the second,
  // allowing you to adjust arguments, run code before and after, and
  // conditionally execute the original function.
  _.wrap = function(func, wrapper) {
    return _.partial(wrapper, func);
  };

  // Returns a function that is the composition of a list of functions, each
  // consuming the return value of the function that follows.
  _.compose = function() {
    var funcs = arguments;
    return function() {
      var args = arguments;
      for (var i = funcs.length - 1; i >= 0; i--) {
        args = [funcs[i].apply(this, args)];
      }
      return args[0];
    };
  };

  // Returns a function that will only be executed after being called N times.
  _.after = function(times, func) {
    return function() {
      if (--times < 1) {
        return func.apply(this, arguments);
      }
    };
  };

  // Object Functions
  // ----------------

  // Retrieve the names of an object's properties.
  // Delegates to **ECMAScript 5**'s native `Object.keys`
  _.keys = function(obj) {
    if (!_.isObject(obj)) return [];
    if (nativeKeys) return nativeKeys(obj);
    var keys = [];
    for (var key in obj) if (_.has(obj, key)) keys.push(key);
    return keys;
  };

  // Retrieve the values of an object's properties.
  _.values = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var values = new Array(length);
    for (var i = 0; i < length; i++) {
      values[i] = obj[keys[i]];
    }
    return values;
  };

  // Convert an object into a list of `[key, value]` pairs.
  _.pairs = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var pairs = new Array(length);
    for (var i = 0; i < length; i++) {
      pairs[i] = [keys[i], obj[keys[i]]];
    }
    return pairs;
  };

  // Invert the keys and values of an object. The values must be serializable.
  _.invert = function(obj) {
    var result = {};
    var keys = _.keys(obj);
    for (var i = 0, length = keys.length; i < length; i++) {
      result[obj[keys[i]]] = keys[i];
    }
    return result;
  };

  // Return a sorted list of the function names available on the object.
  // Aliased as `methods`
  _.functions = _.methods = function(obj) {
    var names = [];
    for (var key in obj) {
      if (_.isFunction(obj[key])) names.push(key);
    }
    return names.sort();
  };

  // Extend a given object with all the properties in passed-in object(s).
  _.extend = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      if (source) {
        for (var prop in source) {
          obj[prop] = source[prop];
        }
      }
    });
    return obj;
  };

  // Return a copy of the object only containing the whitelisted properties.
  _.pick = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    each(keys, function(key) {
      if (key in obj) copy[key] = obj[key];
    });
    return copy;
  };

   // Return a copy of the object without the blacklisted properties.
  _.omit = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    for (var key in obj) {
      if (!_.contains(keys, key)) copy[key] = obj[key];
    }
    return copy;
  };

  // Fill in a given object with default properties.
  _.defaults = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      if (source) {
        for (var prop in source) {
          if (obj[prop] === void 0) obj[prop] = source[prop];
        }
      }
    });
    return obj;
  };

  // Create a (shallow-cloned) duplicate of an object.
  _.clone = function(obj) {
    if (!_.isObject(obj)) return obj;
    return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
  };

  // Invokes interceptor with the obj, and then returns obj.
  // The primary purpose of this method is to "tap into" a method chain, in
  // order to perform operations on intermediate results within the chain.
  _.tap = function(obj, interceptor) {
    interceptor(obj);
    return obj;
  };

  // Internal recursive comparison function for `isEqual`.
  var eq = function(a, b, aStack, bStack) {
    // Identical objects are equal. `0 === -0`, but they aren't identical.
    // See the [Harmony `egal` proposal](http://wiki.ecmascript.org/doku.php?id=harmony:egal).
    if (a === b) return a !== 0 || 1 / a == 1 / b;
    // A strict comparison is necessary because `null == undefined`.
    if (a == null || b == null) return a === b;
    // Unwrap any wrapped objects.
    if (a instanceof _) a = a._wrapped;
    if (b instanceof _) b = b._wrapped;
    // Compare `[[Class]]` names.
    var className = toString.call(a);
    if (className != toString.call(b)) return false;
    switch (className) {
      // Strings, numbers, dates, and booleans are compared by value.
      case '[object String]':
        // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
        // equivalent to `new String("5")`.
        return a == String(b);
      case '[object Number]':
        // `NaN`s are equivalent, but non-reflexive. An `egal` comparison is performed for
        // other numeric values.
        return a != +a ? b != +b : (a == 0 ? 1 / a == 1 / b : a == +b);
      case '[object Date]':
      case '[object Boolean]':
        // Coerce dates and booleans to numeric primitive values. Dates are compared by their
        // millisecond representations. Note that invalid dates with millisecond representations
        // of `NaN` are not equivalent.
        return +a == +b;
      // RegExps are compared by their source patterns and flags.
      case '[object RegExp]':
        return a.source == b.source &&
               a.global == b.global &&
               a.multiline == b.multiline &&
               a.ignoreCase == b.ignoreCase;
    }
    if (typeof a != 'object' || typeof b != 'object') return false;
    // Assume equality for cyclic structures. The algorithm for detecting cyclic
    // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.
    var length = aStack.length;
    while (length--) {
      // Linear search. Performance is inversely proportional to the number of
      // unique nested structures.
      if (aStack[length] == a) return bStack[length] == b;
    }
    // Objects with different constructors are not equivalent, but `Object`s
    // from different frames are.
    var aCtor = a.constructor, bCtor = b.constructor;
    if (aCtor !== bCtor && !(_.isFunction(aCtor) && (aCtor instanceof aCtor) &&
                             _.isFunction(bCtor) && (bCtor instanceof bCtor))
                        && ('constructor' in a && 'constructor' in b)) {
      return false;
    }
    // Add the first object to the stack of traversed objects.
    aStack.push(a);
    bStack.push(b);
    var size = 0, result = true;
    // Recursively compare objects and arrays.
    if (className == '[object Array]') {
      // Compare array lengths to determine if a deep comparison is necessary.
      size = a.length;
      result = size == b.length;
      if (result) {
        // Deep compare the contents, ignoring non-numeric properties.
        while (size--) {
          if (!(result = eq(a[size], b[size], aStack, bStack))) break;
        }
      }
    } else {
      // Deep compare objects.
      for (var key in a) {
        if (_.has(a, key)) {
          // Count the expected number of properties.
          size++;
          // Deep compare each member.
          if (!(result = _.has(b, key) && eq(a[key], b[key], aStack, bStack))) break;
        }
      }
      // Ensure that both objects contain the same number of properties.
      if (result) {
        for (key in b) {
          if (_.has(b, key) && !(size--)) break;
        }
        result = !size;
      }
    }
    // Remove the first object from the stack of traversed objects.
    aStack.pop();
    bStack.pop();
    return result;
  };

  // Perform a deep comparison to check if two objects are equal.
  _.isEqual = function(a, b) {
    return eq(a, b, [], []);
  };

  // Is a given array, string, or object empty?
  // An "empty" object has no enumerable own-properties.
  _.isEmpty = function(obj) {
    if (obj == null) return true;
    if (_.isArray(obj) || _.isString(obj)) return obj.length === 0;
    for (var key in obj) if (_.has(obj, key)) return false;
    return true;
  };

  // Is a given value a DOM element?
  _.isElement = function(obj) {
    return !!(obj && obj.nodeType === 1);
  };

  // Is a given value an array?
  // Delegates to ECMA5's native Array.isArray
  _.isArray = nativeIsArray || function(obj) {
    return toString.call(obj) == '[object Array]';
  };

  // Is a given variable an object?
  _.isObject = function(obj) {
    return obj === Object(obj);
  };

  // Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp.
  each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp'], function(name) {
    _['is' + name] = function(obj) {
      return toString.call(obj) == '[object ' + name + ']';
    };
  });

  // Define a fallback version of the method in browsers (ahem, IE), where
  // there isn't any inspectable "Arguments" type.
  if (!_.isArguments(arguments)) {
    _.isArguments = function(obj) {
      return !!(obj && _.has(obj, 'callee'));
    };
  }

  // Optimize `isFunction` if appropriate.
  if (typeof (/./) !== 'function') {
    _.isFunction = function(obj) {
      return typeof obj === 'function';
    };
  }

  // Is a given object a finite number?
  _.isFinite = function(obj) {
    return isFinite(obj) && !isNaN(parseFloat(obj));
  };

  // Is the given value `NaN`? (NaN is the only number which does not equal itself).
  _.isNaN = function(obj) {
    return _.isNumber(obj) && obj != +obj;
  };

  // Is a given value a boolean?
  _.isBoolean = function(obj) {
    return obj === true || obj === false || toString.call(obj) == '[object Boolean]';
  };

  // Is a given value equal to null?
  _.isNull = function(obj) {
    return obj === null;
  };

  // Is a given variable undefined?
  _.isUndefined = function(obj) {
    return obj === void 0;
  };

  // Shortcut function for checking if an object has a given property directly
  // on itself (in other words, not on a prototype).
  _.has = function(obj, key) {
    return hasOwnProperty.call(obj, key);
  };

  // Utility Functions
  // -----------------

  // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
  // previous owner. Returns a reference to the Underscore object.
  _.noConflict = function() {
    root._ = previousUnderscore;
    return this;
  };

  // Keep the identity function around for default iterators.
  _.identity = function(value) {
    return value;
  };

  _.constant = function(value) {
    return function () {
      return value;
    };
  };

  _.property = function(key) {
    return function(obj) {
      return obj[key];
    };
  };

  // Returns a predicate for checking whether an object has a given set of `key:value` pairs.
  _.matches = function(attrs) {
    return function(obj) {
      if (obj === attrs) return true; //avoid comparing an object to itself.
      for (var key in attrs) {
        if (attrs[key] !== obj[key])
          return false;
      }
      return true;
    }
  };

  // Run a function **n** times.
  _.times = function(n, iterator, context) {
    var accum = Array(Math.max(0, n));
    for (var i = 0; i < n; i++) accum[i] = iterator.call(context, i);
    return accum;
  };

  // Return a random integer between min and max (inclusive).
  _.random = function(min, max) {
    if (max == null) {
      max = min;
      min = 0;
    }
    return min + Math.floor(Math.random() * (max - min + 1));
  };

  // A (possibly faster) way to get the current timestamp as an integer.
  _.now = Date.now || function() { return new Date().getTime(); };

  // List of HTML entities for escaping.
  var entityMap = {
    escape: {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;'
    }
  };
  entityMap.unescape = _.invert(entityMap.escape);

  // Regexes containing the keys and values listed immediately above.
  var entityRegexes = {
    escape:   new RegExp('[' + _.keys(entityMap.escape).join('') + ']', 'g'),
    unescape: new RegExp('(' + _.keys(entityMap.unescape).join('|') + ')', 'g')
  };

  // Functions for escaping and unescaping strings to/from HTML interpolation.
  _.each(['escape', 'unescape'], function(method) {
    _[method] = function(string) {
      if (string == null) return '';
      return ('' + string).replace(entityRegexes[method], function(match) {
        return entityMap[method][match];
      });
    };
  });

  // If the value of the named `property` is a function then invoke it with the
  // `object` as context; otherwise, return it.
  _.result = function(object, property) {
    if (object == null) return void 0;
    var value = object[property];
    return _.isFunction(value) ? value.call(object) : value;
  };

  // Add your own custom functions to the Underscore object.
  _.mixin = function(obj) {
    each(_.functions(obj), function(name) {
      var func = _[name] = obj[name];
      _.prototype[name] = function() {
        var args = [this._wrapped];
        push.apply(args, arguments);
        return result.call(this, func.apply(_, args));
      };
    });
  };

  // Generate a unique integer id (unique within the entire client session).
  // Useful for temporary DOM ids.
  var idCounter = 0;
  _.uniqueId = function(prefix) {
    var id = ++idCounter + '';
    return prefix ? prefix + id : id;
  };

  // By default, Underscore uses ERB-style template delimiters, change the
  // following template settings to use alternative delimiters.
  _.templateSettings = {
    evaluate    : /<%([\s\S]+?)%>/g,
    interpolate : /<%=([\s\S]+?)%>/g,
    escape      : /<%-([\s\S]+?)%>/g
  };

  // When customizing `templateSettings`, if you don't want to define an
  // interpolation, evaluation or escaping regex, we need one that is
  // guaranteed not to match.
  var noMatch = /(.)^/;

  // Certain characters need to be escaped so that they can be put into a
  // string literal.
  var escapes = {
    "'":      "'",
    '\\':     '\\',
    '\r':     'r',
    '\n':     'n',
    '\t':     't',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  var escaper = /\\|'|\r|\n|\t|\u2028|\u2029/g;

  // JavaScript micro-templating, similar to John Resig's implementation.
  // Underscore templating handles arbitrary delimiters, preserves whitespace,
  // and correctly escapes quotes within interpolated code.
  _.template = function(text, data, settings) {
    var render;
    settings = _.defaults({}, settings, _.templateSettings);

    // Combine delimiters into one regular expression via alternation.
    var matcher = new RegExp([
      (settings.escape || noMatch).source,
      (settings.interpolate || noMatch).source,
      (settings.evaluate || noMatch).source
    ].join('|') + '|$', 'g');

    // Compile the template source, escaping string literals appropriately.
    var index = 0;
    var source = "__p+='";
    text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
      source += text.slice(index, offset)
        .replace(escaper, function(match) { return '\\' + escapes[match]; });

      if (escape) {
        source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
      }
      if (interpolate) {
        source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
      }
      if (evaluate) {
        source += "';\n" + evaluate + "\n__p+='";
      }
      index = offset + match.length;
      return match;
    });
    source += "';\n";

    // If a variable is not specified, place data values in local scope.
    if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

    source = "var __t,__p='',__j=Array.prototype.join," +
      "print=function(){__p+=__j.call(arguments,'');};\n" +
      source + "return __p;\n";

    try {
      render = new Function(settings.variable || 'obj', '_', source);
    } catch (e) {
      e.source = source;
      throw e;
    }

    if (data) return render(data, _);
    var template = function(data) {
      return render.call(this, data, _);
    };

    // Provide the compiled function source as a convenience for precompilation.
    template.source = 'function(' + (settings.variable || 'obj') + '){\n' + source + '}';

    return template;
  };

  // Add a "chain" function, which will delegate to the wrapper.
  _.chain = function(obj) {
    return _(obj).chain();
  };

  // OOP
  // ---------------
  // If Underscore is called as a function, it returns a wrapped object that
  // can be used OO-style. This wrapper holds altered versions of all the
  // underscore functions. Wrapped objects may be chained.

  // Helper function to continue chaining intermediate results.
  var result = function(obj) {
    return this._chain ? _(obj).chain() : obj;
  };

  // Add all of the Underscore functions to the wrapper object.
  _.mixin(_);

  // Add all mutator Array functions to the wrapper.
  each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      var obj = this._wrapped;
      method.apply(obj, arguments);
      if ((name == 'shift' || name == 'splice') && obj.length === 0) delete obj[0];
      return result.call(this, obj);
    };
  });

  // Add all accessor Array functions to the wrapper.
  each(['concat', 'join', 'slice'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      return result.call(this, method.apply(this._wrapped, arguments));
    };
  });

  _.extend(_.prototype, {

    // Start chaining a wrapped Underscore object.
    chain: function() {
      this._chain = true;
      return this;
    },

    // Extracts the result from a wrapped and chained object.
    value: function() {
      return this._wrapped;
    }

  });

  // AMD registration happens at the end for compatibility with AMD loaders
  // that may not enforce next-turn semantics on modules. Even though general
  // practice for AMD registration is to be anonymous, underscore registers
  // as a named module because, like jQuery, it is a base library that is
  // popular enough to be bundled in a third party lib, but not be part of
  // an AMD load request. Those cases could generate an error when an
  // anonymous define() is called outside of a loader request.
  if (typeof define === 'function' && define.amd) {
    define('underscore', [], function() {
      return _;
    });
  }
}).call(this);

},{}],7:[function(require,module,exports){
var $, defaultOptions, token;

$ = require('jquery');

$.support.cors = true;

token = require('./token');

defaultOptions = {
  token: true
};

module.exports = {
  get: function(args, options) {
    if (options == null) {
      options = {};
    }
    return this.fire('get', args, options);
  },
  post: function(args, options) {
    if (options == null) {
      options = {};
    }
    return this.fire('post', args, options);
  },
  put: function(args, options) {
    if (options == null) {
      options = {};
    }
    return this.fire('put', args, options);
  },
  poll: function(args) {
    var done, dopoll, testFn, url;
    url = args.url, testFn = args.testFn, done = args.done;
    dopoll = (function(_this) {
      return function() {
        var xhr;
        xhr = _this.get({
          url: url
        });
        return xhr.done(function(data, textStatus, jqXHR) {
          if (testFn(data)) {
            return done(data, textStatus, jqXHR);
          } else {
            return setTimeout(dopoll, 5000);
          }
        });
      };
    })(this);
    return dopoll();
  },
  fire: function(type, args, options) {
    var ajaxArgs;
    options = $.extend({}, defaultOptions, options);
    ajaxArgs = {
      type: type,
      dataType: 'json',
      contentType: 'application/json; charset=utf-8',
      processData: false,
      crossDomain: true
    };
    if (options.token && (token.get() != null)) {
      ajaxArgs.beforeSend = (function(_this) {
        return function(xhr) {
          return xhr.setRequestHeader('Authorization', "" + (token.getType()) + " " + (token.get()));
        };
      })(this);
    }
    return $.ajax($.extend(ajaxArgs, args));
  }
};


},{"./token":8,"jquery":5}],8:[function(require,module,exports){
var Token;

Token = (function() {
  function Token() {}

  Token.prototype.token = null;

  Token.prototype.set = function(token, type) {
    this.token = token;
    if (type == null) {
      type = 'SimpleAuth';
    }
    sessionStorage.setItem('huygens_token_type', type);
    return sessionStorage.setItem('huygens_token', this.token);
  };

  Token.prototype.getType = function() {
    return sessionStorage.getItem('huygens_token_type');
  };

  Token.prototype.get = function() {
    if (this.token == null) {
      this.token = sessionStorage.getItem('huygens_token');
    }
    return this.token;
  };

  Token.prototype.clear = function() {
    sessionStorage.removeItem('huygens_token');
    return sessionStorage.removeItem('huygens_token_type');
  };

  return Token;

})();

module.exports = new Token();


},{}],9:[function(require,module,exports){
var Backbone;

Backbone = require('backbone');

module.exports = {
  subscribe: function(ev, done) {
    return this.listenTo(Backbone, ev, done);
  },
  publish: function() {
    return Backbone.trigger.apply(Backbone, arguments);
  }
};


},{"backbone":4}],10:[function(require,module,exports){
var _;

_ = require('underscore');

module.exports = function(el) {
  if (_.isString(el)) {
    el = document.querySelector(el);
  }
  return {
    el: el,
    q: function(query) {
      return DOM(el.querySelector(query));
    },
    find: function(query) {
      return DOM(el.querySelector(query));
    },
    findAll: function(query) {
      return DOM(el.querySelectorAll(query));
    },
    html: function(html) {
      if (html == null) {
        return el.innerHTML;
      }
      if (html.nodeType === 1 || html.nodeType === 11) {
        el.innerHTML = '';
        return el.appendChild(html);
      } else {
        return el.innerHTML = html;
      }
    },
    hide: function() {
      el.style.display = 'none';
      return this;
    },
    show: function(displayType) {
      if (displayType == null) {
        displayType = 'block';
      }
      el.style.display = displayType;
      return this;
    },
    closest: function(selector) {
      var matchesSelector;
      matchesSelector = el.matches || el.webkitMatchesSelector || el.mozMatchesSelector || el.msMatchesSelector;
      while (el) {
        if (matchesSelector.bind(el)(selector)) {
          return el;
        } else {
          el = el.parentNode;
        }
      }
    },
    append: function(childEl) {
      return el.appendChild(childEl);
    },
    prepend: function(childEl) {
      return el.insertBefore(childEl, el.firstChild);
    },

    /*
    		Native alternative to jQuery's $.offset()
    
    		http://www.quirksmode.org/js/findpos.html
     */
    position: function(parent) {
      var left, loopEl, top;
      if (parent == null) {
        parent = document.body;
      }
      left = 0;
      top = 0;
      loopEl = el;
      while ((loopEl != null) && loopEl !== parent) {
        if (this.hasDescendant(parent)) {
          break;
        }
        left += loopEl.offsetLeft;
        top += loopEl.offsetTop;
        loopEl = loopEl.offsetParent;
      }
      return {
        left: left,
        top: top
      };
    },

    /*
    		Is child el a descendant of parent el?
    
    		http://stackoverflow.com/questions/2234979/how-to-check-in-javascript-if-one-element-is-a-child-of-another
     */
    hasDescendant: function(child) {
      var node;
      node = child.parentNode;
      while (node != null) {
        if (node === el) {
          return true;
        }
        node = node.parentNode;
      }
      return false;
    },
    boundingBox: function() {
      var box;
      box = this.position();
      box.width = el.clientWidth;
      box.height = el.clientHeight;
      box.right = box.left + box.width;
      box.bottom = box.top + box.height;
      return box;
    },
    insertAfter: function(referenceElement) {
      return referenceElement.parentNode.insertBefore(el, referenceElement.nextSibling);
    },
    highlightUntil: function(endNode, highlightClass) {
      if (highlightClass == null) {
        highlightClass = 'highlight';
      }
      return {
        on: function() {
          var currentNode, filter, range, treewalker;
          range = document.createRange();
          range.setStartAfter(el);
          range.setEndBefore(endNode);
          filter = (function(_this) {
            return function(node) {
              var end, r, start;
              r = document.createRange();
              r.selectNode(node);
              start = r.compareBoundaryPoints(Range.START_TO_START, range);
              end = r.compareBoundaryPoints(Range.END_TO_START, range);
              if (start === -1 || end === 1) {
                return NodeFilter.FILTER_SKIP;
              } else {
                return NodeFilter.FILTER_ACCEPT;
              }
            };
          })(this);
          filter.acceptNode = filter;
          treewalker = document.createTreeWalker(range.commonAncestorContainer, NodeFilter.SHOW_ELEMENT, filter, false);
          while (treewalker.nextNode()) {
            currentNode = treewalker.currentNode;
            if ((' ' + currentNode.className + ' ').indexOf(' text ') > -1) {
              currentNode.className = currentNode.className + ' ' + highlightClass;
            }
          }
          return this;
        },
        off: function() {
          var classNames, _i, _len, _ref, _results;
          _ref = document.querySelectorAll('.' + highlightClass);
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            el = _ref[_i];
            classNames = ' ' + el.className + ' ';
            classNames = classNames.replace(' ' + highlightClass + ' ', '');
            _results.push(el.className = classNames.replace(/^\s+|\s+$/g, ''));
          }
          return _results;
        }
      };
    },
    hasClass: function(name) {
      return (' ' + el.className + ' ').indexOf(' ' + name + ' ') > -1;
    },
    addClass: function(name) {
      if (!this.hasClass(name)) {
        return el.className += ' ' + name;
      }
    },
    removeClass: function(name) {
      var names;
      names = ' ' + el.className + ' ';
      names = names.replace(' ' + name + ' ', '');
      return el.className = names.replace(/^\s+|\s+$/g, '');
    },
    toggleClass: function(name) {
      if (this.hasClass(name)) {
        return this.addClass(name);
      } else {
        return this.removeClass(name);
      }
    },
    inViewport: function() {
      var rect;
      rect = el.getBoundingClientRect();
      return rect.top >= 0 && rect.left >= 0 && rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) && rect.right <= (window.innerWidth || document.documentElement.clientWidth);
    }
  };
};


},{"underscore":6}],11:[function(require,module,exports){
var $,
  __hasProp = {}.hasOwnProperty;

$ = require('jquery');

module.exports = {
  closest: function(el, selector) {
    var matchesSelector;
    matchesSelector = el.matches || el.webkitMatchesSelector || el.mozMatchesSelector || el.msMatchesSelector;
    while (el) {
      if (matchesSelector.bind(el)(selector)) {
        return el;
      } else {
        el = el.parentNode;
      }
    }
  },

  /*
  	Generates an ID that starts with a letter
  	
  	Example: "aBc12D34"
  
  	param Number length of the id
  	return String
   */
  generateID: function(length) {
    var chars, text;
    length = (length != null) && length > 0 ? length - 1 : 7;
    chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    text = chars.charAt(Math.floor(Math.random() * 52));
    while (length--) {
      text += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return text;
  },

  /*
  	Deepcopies arrays and object literals
  	
  	return Array or object
   */
  deepCopy: function(object) {
    var newEmpty;
    newEmpty = Array.isArray(object) ? [] : {};
    return $.extend(true, newEmpty, object);
  },
  timeoutWithReset: (function() {
    var timer;
    timer = null;
    return function(ms, cb, onResetFn) {
      if (timer != null) {
        if (onResetFn != null) {
          onResetFn();
        }
        clearTimeout(timer);
      }
      return timer = setTimeout((function() {
        timer = null;
        return cb();
      }), ms);
    };
  })(),

  /*
  	Highlight text between two nodes. 
  
  	Creates a span.hilite between two given nodes, surrounding the contents of the nodes
  
  	Example usage:
  	hl = Fn.highlighter
  		className: 'highlight' # optional
  		tagName: 'div' # optional
  
  	supEnter = (ev) -> hl.on
  		startNode: el.querySelector(#someid) # required
  		endNode: ev.currentTarget # required
  	supLeave = -> hl.off()
  	$(sup).hover supEnter, supLeave
   */
  highlighter: function(args) {
    var className, el, tagName;
    if (args == null) {
      args = {};
    }
    className = args.className, tagName = args.tagName;
    if (className == null) {
      className = 'hilite';
    }
    if (tagName == null) {
      tagName = 'span';
    }
    el = null;
    return {
      on: function(args) {
        var endNode, range, startNode;
        startNode = args.startNode, endNode = args.endNode;
        range = document.createRange();
        range.setStartAfter(startNode);
        range.setEndBefore(endNode);
        el = document.createElement(tagName);
        el.className = className;
        el.appendChild(range.extractContents());
        return range.insertNode(el);
      },
      off: function() {
        return $(el).replaceWith(function() {
          return $(this).contents();
        });
      }
    };
  },

  /*
  	Native alternative to jQuery's $.offset()
  
  	http://www.quirksmode.org/js/findpos.html
   */
  position: function(el, parent) {
    var left, top;
    left = 0;
    top = 0;
    while (el !== parent) {
      left += el.offsetLeft;
      top += el.offsetTop;
      el = el.offsetParent;
    }
    return {
      left: left,
      top: top
    };
  },
  boundingBox: function(el) {
    var box;
    box = $(el).offset();
    box.width = el.clientWidth;
    box.height = el.clientHeight;
    box.right = box.left + box.width;
    box.bottom = box.top + box.height;
    return box;
  },

  /*
  	Is child el a descendant of parent el?
  
  	http://stackoverflow.com/questions/2234979/how-to-check-in-javascript-if-one-element-is-a-child-of-another
   */
  isDescendant: function(parent, child) {
    var node;
    node = child.parentNode;
    while (node != null) {
      if (node === parent) {
        return true;
      }
      node = node.parentNode;
    }
    return false;
  },

  /*
  	Removes an item from an array
   */
  removeFromArray: function(arr, item) {
    var index;
    index = arr.indexOf(item);
    arr.splice(index, 1);
    return arr;
  },

  /* Escape a regular expression */
  escapeRegExp: function(str) {
    return str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  },

  /*
  	Flattens an object
  
  	songs:
  		mary:
  			had:
  				little: 'lamb'
  
  	becomes
  
  	songs:
  		mary.had.little: 'lamb'
  
  	Taken from: http://thedersen.com/projects/backbone-validation
   */
  flattenObject: function(obj, into, prefix) {
    var k, v;
    if (into == null) {
      into = {};
    }
    if (prefix == null) {
      prefix = '';
    }
    for (k in obj) {
      if (!__hasProp.call(obj, k)) continue;
      v = obj[k];
      if (_.isObject(v) && !_.isArray(v) && !_.isFunction(v) && !(v instanceof Backbone.Model) && !(v instanceof Backbone.Collection)) {
        this.flattenObject(v, into, prefix + k + '.');
      } else {
        into[prefix + k] = v;
      }
    }
    return into;
  },
  compareJSON: function(current, changed) {
    var attr, changes, value;
    changes = {};
    for (attr in current) {
      if (!__hasProp.call(current, attr)) continue;
      value = current[attr];
      if (!changed.hasOwnProperty(attr)) {
        changes[attr] = 'removed';
      }
    }
    for (attr in changed) {
      if (!__hasProp.call(changed, attr)) continue;
      value = changed[attr];
      if (current.hasOwnProperty(attr)) {
        if (_.isArray(value) || this.isObjectLiteral(value)) {
          if (!_.isEqual(current[attr], changed[attr])) {
            changes[attr] = changed[attr];
          }
        } else {
          if (current[attr] !== changed[attr]) {
            changes[attr] = changed[attr];
          }
        }
      } else {
        changes[attr] = 'added';
      }
    }
    return changes;
  },
  isObjectLiteral: function(obj) {
    var ObjProto;
    if ((obj == null) || typeof obj !== "object") {
      return false;
    }
    ObjProto = obj;
    while (Object.getPrototypeOf(ObjProto = Object.getPrototypeOf(ObjProto)) !== null) {
      0;
    }
    return Object.getPrototypeOf(obj) === ObjProto;
  },
  getScrollPercentage: function(el) {
    var left, scrolledLeft, scrolledTop, top, totalLeft, totalTop;
    scrolledTop = el.scrollTop;
    totalTop = el.scrollHeight - el.clientHeight;
    scrolledLeft = el.scrollLeft;
    totalLeft = el.scrollWidth - el.clientWidth;
    top = totalTop === 0 ? 0 : Math.floor((scrolledTop / totalTop) * 100);
    left = totalLeft === 0 ? 0 : Math.floor((scrolledLeft / totalLeft) * 100);
    return {
      top: top,
      left: left
    };
  },
  setScrollPercentage: function(el, percentages) {
    if (percentages.top < 5) {
      percentages.top = 0;
    }
    if (percentages.top > 95) {
      percentages.top = 100;
    }
    el.scrollTop = (el.scrollHeight - el.clientHeight) * percentages.top / 100;
    return el.scrollLeft = (el.scrollWidth - el.clientWidth) * percentages.left / 100;
  },
  checkCheckboxes: function(selector, checked, baseEl) {
    var cb, checkboxes, _i, _len, _results;
    if (selector == null) {
      selector = 'input[type="checkbox"]';
    }
    if (checked == null) {
      checked = true;
    }
    if (baseEl == null) {
      baseEl = document;
    }
    checkboxes = baseEl.querySelectorAll(selector);
    _results = [];
    for (_i = 0, _len = checkboxes.length; _i < _len; _i++) {
      cb = checkboxes[_i];
      _results.push(cb.checked = checked);
    }
    return _results;
  },
  setCursorToEnd: function(textEl, windowEl) {
    var range, sel, win;
    win = windowEl != null ? windowEl : window;
    if (windowEl == null) {
      windowEl = textEl;
    }
    windowEl.focus();
    range = document.createRange();
    range.selectNodeContents(textEl);
    range.collapse(false);
    sel = win.getSelection();
    if (sel != null) {
      sel.removeAllRanges();
      return sel.addRange(range);
    }
  },
  arraySum: function(arr) {
    if (arr.length === 0) {
      return 0;
    }
    return arr.reduce(function(prev, current) {
      return current + prev;
    });
  },
  getAspectRatio: function(originalWidth, originalHeight, boxWidth, boxHeight) {
    var heightRatio, widthRatio;
    widthRatio = boxWidth / originalWidth;
    heightRatio = boxHeight / originalHeight;
    return Math.min(widthRatio, heightRatio);
  },
  hasScrollBar: function(el) {
    return el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth;
  },
  hasXScrollBar: function(el) {
    return el.scrollWidth > el.clientWidth;
  },
  hasYScrollBar: function(el) {
    return el.scrollHeight > el.clientHeight;
  }
};


},{"jquery":5}],12:[function(require,module,exports){
var $;

$ = require('jquery');

module.exports = {
  ucfirst: function(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  },

  /*
  	Slugify a string
   */
  slugify: function(str) {
    var from, index, strlen, to;
    from = "àáäâèéëêìíïîòóöôùúüûñç·/_:;";
    to = "aaaaeeeeiiiioooouuuunc-----";
    str = str.trim().toLowerCase();
    strlen = str.length;
    while (strlen--) {
      index = from.indexOf(str[strlen]);
      if (index !== -1) {
        str = str.substr(0, strlen) + to[index] + str.substr(strlen + 1);
      }
    }
    return str.replace(/[^a-z0-9 -]/g, '').replace(/\s+|\-+/g, '-').replace(/^\-+|\-+$/g, '');
  },

  /*
  	Strips the tags from a string
  	
  	Example: "This is a <b>string</b>." => "This is a string."
  	
  	return String
   */
  stripTags: function(str) {
    return $('<span />').html(str).text();
  },

  /*
  	Removes non numbers from a string
  	
  	Example: "Count the 12 monkeys." => "12"
  	
  	return String
   */
  onlyNumbers: function(str) {
    return str.replace(/[^\d.]/g, '');
  },
  hashCode: function(str) {
    var c, chr, hash, i, _i, _len;
    if (str.length === 0) {
      return false;
    }
    hash = 0;
    for (i = _i = 0, _len = str.length; _i < _len; i = ++_i) {
      chr = str[i];
      c = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + c;
      hash = hash & hash;
    }
    return hash;
  },
  insertAt: function(str, needle, index) {
    return str.slice(0, index) + needle + str.slice(index);
  }
};


},{"jquery":5}],13:[function(require,module,exports){
(function (global){
!function(e){if("object"==typeof exports)module.exports=e();else if("function"==typeof define&&define.amd)define(e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.jade=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

/**
 * Merge two attribute objects giving precedence
 * to values in object `b`. Classes are special-cased
 * allowing for arrays and merging/joining appropriately
 * resulting in a string.
 *
 * @param {Object} a
 * @param {Object} b
 * @return {Object} a
 * @api private
 */

exports.merge = function merge(a, b) {
  if (arguments.length === 1) {
    var attrs = a[0];
    for (var i = 1; i < a.length; i++) {
      attrs = merge(attrs, a[i]);
    }
    return attrs;
  }
  var ac = a['class'];
  var bc = b['class'];

  if (ac || bc) {
    ac = ac || [];
    bc = bc || [];
    if (!Array.isArray(ac)) ac = [ac];
    if (!Array.isArray(bc)) bc = [bc];
    a['class'] = ac.concat(bc).filter(nulls);
  }

  for (var key in b) {
    if (key != 'class') {
      a[key] = b[key];
    }
  }

  return a;
};

/**
 * Filter null `val`s.
 *
 * @param {*} val
 * @return {Boolean}
 * @api private
 */

function nulls(val) {
  return val != null && val !== '';
}

/**
 * join array as classes.
 *
 * @param {*} val
 * @return {String}
 */
exports.joinClasses = joinClasses;
function joinClasses(val) {
  return Array.isArray(val) ? val.map(joinClasses).filter(nulls).join(' ') : val;
}

/**
 * Render the given classes.
 *
 * @param {Array} classes
 * @param {Array.<Boolean>} escaped
 * @return {String}
 */
exports.cls = function cls(classes, escaped) {
  var buf = [];
  for (var i = 0; i < classes.length; i++) {
    if (escaped && escaped[i]) {
      buf.push(exports.escape(joinClasses([classes[i]])));
    } else {
      buf.push(joinClasses(classes[i]));
    }
  }
  var text = joinClasses(buf);
  if (text.length) {
    return ' class="' + text + '"';
  } else {
    return '';
  }
};

/**
 * Render the given attribute.
 *
 * @param {String} key
 * @param {String} val
 * @param {Boolean} escaped
 * @param {Boolean} terse
 * @return {String}
 */
exports.attr = function attr(key, val, escaped, terse) {
  if ('boolean' == typeof val || null == val) {
    if (val) {
      return ' ' + (terse ? key : key + '="' + key + '"');
    } else {
      return '';
    }
  } else if (0 == key.indexOf('data') && 'string' != typeof val) {
    return ' ' + key + "='" + JSON.stringify(val).replace(/'/g, '&apos;') + "'";
  } else if (escaped) {
    return ' ' + key + '="' + exports.escape(val) + '"';
  } else {
    return ' ' + key + '="' + val + '"';
  }
};

/**
 * Render the given attributes object.
 *
 * @param {Object} obj
 * @param {Object} escaped
 * @return {String}
 */
exports.attrs = function attrs(obj, terse){
  var buf = [];

  var keys = Object.keys(obj);

  if (keys.length) {
    for (var i = 0; i < keys.length; ++i) {
      var key = keys[i]
        , val = obj[key];

      if ('class' == key) {
        if (val = joinClasses(val)) {
          buf.push(' ' + key + '="' + val + '"');
        }
      } else {
        buf.push(exports.attr(key, val, false, terse));
      }
    }
  }

  return buf.join('');
};

/**
 * Escape the given string of `html`.
 *
 * @param {String} html
 * @return {String}
 * @api private
 */

exports.escape = function escape(html){
  var result = String(html)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  if (result === '' + html) return html;
  else return result;
};

/**
 * Re-throw the given `err` in context to the
 * the jade in `filename` at the given `lineno`.
 *
 * @param {Error} err
 * @param {String} filename
 * @param {String} lineno
 * @api private
 */

exports.rethrow = function rethrow(err, filename, lineno, str){
  if (!(err instanceof Error)) throw err;
  if ((typeof window != 'undefined' || !filename) && !str) {
    err.message += ' on line ' + lineno;
    throw err;
  }
  try {
    str =  str || require('fs').readFileSync(filename, 'utf8')
  } catch (ex) {
    rethrow(err, null, lineno)
  }
  var context = 3
    , lines = str.split('\n')
    , start = Math.max(lineno - context, 0)
    , end = Math.min(lines.length, lineno + context);

  // Error context
  var context = lines.slice(start, end).map(function(line, i){
    var curr = i + start + 1;
    return (curr == lineno ? '  > ' : '    ')
      + curr
      + '| '
      + line;
  }).join('\n');

  // Alter exception message
  err.path = filename;
  err.message = (filename || 'Jade') + ':' + lineno
    + '\n' + context + '\n\n' + err.message;
  throw err;
};

},{"fs":2}],2:[function(require,module,exports){

},{}]},{},[1])
(1)
});
}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"fs":2}],14:[function(require,module,exports){
module.exports=require(5)
},{}],15:[function(require,module,exports){
//     Underscore.js 1.4.4
//     http://underscorejs.org
//     (c) 2009-2013 Jeremy Ashkenas, DocumentCloud Inc.
//     Underscore may be freely distributed under the MIT license.

(function() {

  // Baseline setup
  // --------------

  // Establish the root object, `window` in the browser, or `global` on the server.
  var root = this;

  // Save the previous value of the `_` variable.
  var previousUnderscore = root._;

  // Establish the object that gets returned to break out of a loop iteration.
  var breaker = {};

  // Save bytes in the minified (but not gzipped) version:
  var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;

  // Create quick reference variables for speed access to core prototypes.
  var push             = ArrayProto.push,
      slice            = ArrayProto.slice,
      concat           = ArrayProto.concat,
      toString         = ObjProto.toString,
      hasOwnProperty   = ObjProto.hasOwnProperty;

  // All **ECMAScript 5** native function implementations that we hope to use
  // are declared here.
  var
    nativeForEach      = ArrayProto.forEach,
    nativeMap          = ArrayProto.map,
    nativeReduce       = ArrayProto.reduce,
    nativeReduceRight  = ArrayProto.reduceRight,
    nativeFilter       = ArrayProto.filter,
    nativeEvery        = ArrayProto.every,
    nativeSome         = ArrayProto.some,
    nativeIndexOf      = ArrayProto.indexOf,
    nativeLastIndexOf  = ArrayProto.lastIndexOf,
    nativeIsArray      = Array.isArray,
    nativeKeys         = Object.keys,
    nativeBind         = FuncProto.bind;

  // Create a safe reference to the Underscore object for use below.
  var _ = function(obj) {
    if (obj instanceof _) return obj;
    if (!(this instanceof _)) return new _(obj);
    this._wrapped = obj;
  };

  // Export the Underscore object for **Node.js**, with
  // backwards-compatibility for the old `require()` API. If we're in
  // the browser, add `_` as a global object via a string identifier,
  // for Closure Compiler "advanced" mode.
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = _;
    }
    exports._ = _;
  } else {
    root._ = _;
  }

  // Current version.
  _.VERSION = '1.4.4';

  // Collection Functions
  // --------------------

  // The cornerstone, an `each` implementation, aka `forEach`.
  // Handles objects with the built-in `forEach`, arrays, and raw objects.
  // Delegates to **ECMAScript 5**'s native `forEach` if available.
  var each = _.each = _.forEach = function(obj, iterator, context) {
    if (obj == null) return;
    if (nativeForEach && obj.forEach === nativeForEach) {
      obj.forEach(iterator, context);
    } else if (obj.length === +obj.length) {
      for (var i = 0, l = obj.length; i < l; i++) {
        if (iterator.call(context, obj[i], i, obj) === breaker) return;
      }
    } else {
      for (var key in obj) {
        if (_.has(obj, key)) {
          if (iterator.call(context, obj[key], key, obj) === breaker) return;
        }
      }
    }
  };

  // Return the results of applying the iterator to each element.
  // Delegates to **ECMAScript 5**'s native `map` if available.
  _.map = _.collect = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeMap && obj.map === nativeMap) return obj.map(iterator, context);
    each(obj, function(value, index, list) {
      results[results.length] = iterator.call(context, value, index, list);
    });
    return results;
  };

  var reduceError = 'Reduce of empty array with no initial value';

  // **Reduce** builds up a single result from a list of values, aka `inject`,
  // or `foldl`. Delegates to **ECMAScript 5**'s native `reduce` if available.
  _.reduce = _.foldl = _.inject = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduce && obj.reduce === nativeReduce) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduce(iterator, memo) : obj.reduce(iterator);
    }
    each(obj, function(value, index, list) {
      if (!initial) {
        memo = value;
        initial = true;
      } else {
        memo = iterator.call(context, memo, value, index, list);
      }
    });
    if (!initial) throw new TypeError(reduceError);
    return memo;
  };

  // The right-associative version of reduce, also known as `foldr`.
  // Delegates to **ECMAScript 5**'s native `reduceRight` if available.
  _.reduceRight = _.foldr = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduceRight && obj.reduceRight === nativeReduceRight) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduceRight(iterator, memo) : obj.reduceRight(iterator);
    }
    var length = obj.length;
    if (length !== +length) {
      var keys = _.keys(obj);
      length = keys.length;
    }
    each(obj, function(value, index, list) {
      index = keys ? keys[--length] : --length;
      if (!initial) {
        memo = obj[index];
        initial = true;
      } else {
        memo = iterator.call(context, memo, obj[index], index, list);
      }
    });
    if (!initial) throw new TypeError(reduceError);
    return memo;
  };

  // Return the first value which passes a truth test. Aliased as `detect`.
  _.find = _.detect = function(obj, iterator, context) {
    var result;
    any(obj, function(value, index, list) {
      if (iterator.call(context, value, index, list)) {
        result = value;
        return true;
      }
    });
    return result;
  };

  // Return all the elements that pass a truth test.
  // Delegates to **ECMAScript 5**'s native `filter` if available.
  // Aliased as `select`.
  _.filter = _.select = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeFilter && obj.filter === nativeFilter) return obj.filter(iterator, context);
    each(obj, function(value, index, list) {
      if (iterator.call(context, value, index, list)) results[results.length] = value;
    });
    return results;
  };

  // Return all the elements for which a truth test fails.
  _.reject = function(obj, iterator, context) {
    return _.filter(obj, function(value, index, list) {
      return !iterator.call(context, value, index, list);
    }, context);
  };

  // Determine whether all of the elements match a truth test.
  // Delegates to **ECMAScript 5**'s native `every` if available.
  // Aliased as `all`.
  _.every = _.all = function(obj, iterator, context) {
    iterator || (iterator = _.identity);
    var result = true;
    if (obj == null) return result;
    if (nativeEvery && obj.every === nativeEvery) return obj.every(iterator, context);
    each(obj, function(value, index, list) {
      if (!(result = result && iterator.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if at least one element in the object matches a truth test.
  // Delegates to **ECMAScript 5**'s native `some` if available.
  // Aliased as `any`.
  var any = _.some = _.any = function(obj, iterator, context) {
    iterator || (iterator = _.identity);
    var result = false;
    if (obj == null) return result;
    if (nativeSome && obj.some === nativeSome) return obj.some(iterator, context);
    each(obj, function(value, index, list) {
      if (result || (result = iterator.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if the array or object contains a given value (using `===`).
  // Aliased as `include`.
  _.contains = _.include = function(obj, target) {
    if (obj == null) return false;
    if (nativeIndexOf && obj.indexOf === nativeIndexOf) return obj.indexOf(target) != -1;
    return any(obj, function(value) {
      return value === target;
    });
  };

  // Invoke a method (with arguments) on every item in a collection.
  _.invoke = function(obj, method) {
    var args = slice.call(arguments, 2);
    var isFunc = _.isFunction(method);
    return _.map(obj, function(value) {
      return (isFunc ? method : value[method]).apply(value, args);
    });
  };

  // Convenience version of a common use case of `map`: fetching a property.
  _.pluck = function(obj, key) {
    return _.map(obj, function(value){ return value[key]; });
  };

  // Convenience version of a common use case of `filter`: selecting only objects
  // containing specific `key:value` pairs.
  _.where = function(obj, attrs, first) {
    if (_.isEmpty(attrs)) return first ? null : [];
    return _[first ? 'find' : 'filter'](obj, function(value) {
      for (var key in attrs) {
        if (attrs[key] !== value[key]) return false;
      }
      return true;
    });
  };

  // Convenience version of a common use case of `find`: getting the first object
  // containing specific `key:value` pairs.
  _.findWhere = function(obj, attrs) {
    return _.where(obj, attrs, true);
  };

  // Return the maximum element or (element-based computation).
  // Can't optimize arrays of integers longer than 65,535 elements.
  // See: https://bugs.webkit.org/show_bug.cgi?id=80797
  _.max = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.max.apply(Math, obj);
    }
    if (!iterator && _.isEmpty(obj)) return -Infinity;
    var result = {computed : -Infinity, value: -Infinity};
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      computed >= result.computed && (result = {value : value, computed : computed});
    });
    return result.value;
  };

  // Return the minimum element (or element-based computation).
  _.min = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.min.apply(Math, obj);
    }
    if (!iterator && _.isEmpty(obj)) return Infinity;
    var result = {computed : Infinity, value: Infinity};
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      computed < result.computed && (result = {value : value, computed : computed});
    });
    return result.value;
  };

  // Shuffle an array.
  _.shuffle = function(obj) {
    var rand;
    var index = 0;
    var shuffled = [];
    each(obj, function(value) {
      rand = _.random(index++);
      shuffled[index - 1] = shuffled[rand];
      shuffled[rand] = value;
    });
    return shuffled;
  };

  // An internal function to generate lookup iterators.
  var lookupIterator = function(value) {
    return _.isFunction(value) ? value : function(obj){ return obj[value]; };
  };

  // Sort the object's values by a criterion produced by an iterator.
  _.sortBy = function(obj, value, context) {
    var iterator = lookupIterator(value);
    return _.pluck(_.map(obj, function(value, index, list) {
      return {
        value : value,
        index : index,
        criteria : iterator.call(context, value, index, list)
      };
    }).sort(function(left, right) {
      var a = left.criteria;
      var b = right.criteria;
      if (a !== b) {
        if (a > b || a === void 0) return 1;
        if (a < b || b === void 0) return -1;
      }
      return left.index < right.index ? -1 : 1;
    }), 'value');
  };

  // An internal function used for aggregate "group by" operations.
  var group = function(obj, value, context, behavior) {
    var result = {};
    var iterator = lookupIterator(value || _.identity);
    each(obj, function(value, index) {
      var key = iterator.call(context, value, index, obj);
      behavior(result, key, value);
    });
    return result;
  };

  // Groups the object's values by a criterion. Pass either a string attribute
  // to group by, or a function that returns the criterion.
  _.groupBy = function(obj, value, context) {
    return group(obj, value, context, function(result, key, value) {
      (_.has(result, key) ? result[key] : (result[key] = [])).push(value);
    });
  };

  // Counts instances of an object that group by a certain criterion. Pass
  // either a string attribute to count by, or a function that returns the
  // criterion.
  _.countBy = function(obj, value, context) {
    return group(obj, value, context, function(result, key) {
      if (!_.has(result, key)) result[key] = 0;
      result[key]++;
    });
  };

  // Use a comparator function to figure out the smallest index at which
  // an object should be inserted so as to maintain order. Uses binary search.
  _.sortedIndex = function(array, obj, iterator, context) {
    iterator = iterator == null ? _.identity : lookupIterator(iterator);
    var value = iterator.call(context, obj);
    var low = 0, high = array.length;
    while (low < high) {
      var mid = (low + high) >>> 1;
      iterator.call(context, array[mid]) < value ? low = mid + 1 : high = mid;
    }
    return low;
  };

  // Safely convert anything iterable into a real, live array.
  _.toArray = function(obj) {
    if (!obj) return [];
    if (_.isArray(obj)) return slice.call(obj);
    if (obj.length === +obj.length) return _.map(obj, _.identity);
    return _.values(obj);
  };

  // Return the number of elements in an object.
  _.size = function(obj) {
    if (obj == null) return 0;
    return (obj.length === +obj.length) ? obj.length : _.keys(obj).length;
  };

  // Array Functions
  // ---------------

  // Get the first element of an array. Passing **n** will return the first N
  // values in the array. Aliased as `head` and `take`. The **guard** check
  // allows it to work with `_.map`.
  _.first = _.head = _.take = function(array, n, guard) {
    if (array == null) return void 0;
    return (n != null) && !guard ? slice.call(array, 0, n) : array[0];
  };

  // Returns everything but the last entry of the array. Especially useful on
  // the arguments object. Passing **n** will return all the values in
  // the array, excluding the last N. The **guard** check allows it to work with
  // `_.map`.
  _.initial = function(array, n, guard) {
    return slice.call(array, 0, array.length - ((n == null) || guard ? 1 : n));
  };

  // Get the last element of an array. Passing **n** will return the last N
  // values in the array. The **guard** check allows it to work with `_.map`.
  _.last = function(array, n, guard) {
    if (array == null) return void 0;
    if ((n != null) && !guard) {
      return slice.call(array, Math.max(array.length - n, 0));
    } else {
      return array[array.length - 1];
    }
  };

  // Returns everything but the first entry of the array. Aliased as `tail` and `drop`.
  // Especially useful on the arguments object. Passing an **n** will return
  // the rest N values in the array. The **guard**
  // check allows it to work with `_.map`.
  _.rest = _.tail = _.drop = function(array, n, guard) {
    return slice.call(array, (n == null) || guard ? 1 : n);
  };

  // Trim out all falsy values from an array.
  _.compact = function(array) {
    return _.filter(array, _.identity);
  };

  // Internal implementation of a recursive `flatten` function.
  var flatten = function(input, shallow, output) {
    each(input, function(value) {
      if (_.isArray(value)) {
        shallow ? push.apply(output, value) : flatten(value, shallow, output);
      } else {
        output.push(value);
      }
    });
    return output;
  };

  // Return a completely flattened version of an array.
  _.flatten = function(array, shallow) {
    return flatten(array, shallow, []);
  };

  // Return a version of the array that does not contain the specified value(s).
  _.without = function(array) {
    return _.difference(array, slice.call(arguments, 1));
  };

  // Produce a duplicate-free version of the array. If the array has already
  // been sorted, you have the option of using a faster algorithm.
  // Aliased as `unique`.
  _.uniq = _.unique = function(array, isSorted, iterator, context) {
    if (_.isFunction(isSorted)) {
      context = iterator;
      iterator = isSorted;
      isSorted = false;
    }
    var initial = iterator ? _.map(array, iterator, context) : array;
    var results = [];
    var seen = [];
    each(initial, function(value, index) {
      if (isSorted ? (!index || seen[seen.length - 1] !== value) : !_.contains(seen, value)) {
        seen.push(value);
        results.push(array[index]);
      }
    });
    return results;
  };

  // Produce an array that contains the union: each distinct element from all of
  // the passed-in arrays.
  _.union = function() {
    return _.uniq(concat.apply(ArrayProto, arguments));
  };

  // Produce an array that contains every item shared between all the
  // passed-in arrays.
  _.intersection = function(array) {
    var rest = slice.call(arguments, 1);
    return _.filter(_.uniq(array), function(item) {
      return _.every(rest, function(other) {
        return _.indexOf(other, item) >= 0;
      });
    });
  };

  // Take the difference between one array and a number of other arrays.
  // Only the elements present in just the first array will remain.
  _.difference = function(array) {
    var rest = concat.apply(ArrayProto, slice.call(arguments, 1));
    return _.filter(array, function(value){ return !_.contains(rest, value); });
  };

  // Zip together multiple lists into a single array -- elements that share
  // an index go together.
  _.zip = function() {
    var args = slice.call(arguments);
    var length = _.max(_.pluck(args, 'length'));
    var results = new Array(length);
    for (var i = 0; i < length; i++) {
      results[i] = _.pluck(args, "" + i);
    }
    return results;
  };

  // Converts lists into objects. Pass either a single array of `[key, value]`
  // pairs, or two parallel arrays of the same length -- one of keys, and one of
  // the corresponding values.
  _.object = function(list, values) {
    if (list == null) return {};
    var result = {};
    for (var i = 0, l = list.length; i < l; i++) {
      if (values) {
        result[list[i]] = values[i];
      } else {
        result[list[i][0]] = list[i][1];
      }
    }
    return result;
  };

  // If the browser doesn't supply us with indexOf (I'm looking at you, **MSIE**),
  // we need this function. Return the position of the first occurrence of an
  // item in an array, or -1 if the item is not included in the array.
  // Delegates to **ECMAScript 5**'s native `indexOf` if available.
  // If the array is large and already in sort order, pass `true`
  // for **isSorted** to use binary search.
  _.indexOf = function(array, item, isSorted) {
    if (array == null) return -1;
    var i = 0, l = array.length;
    if (isSorted) {
      if (typeof isSorted == 'number') {
        i = (isSorted < 0 ? Math.max(0, l + isSorted) : isSorted);
      } else {
        i = _.sortedIndex(array, item);
        return array[i] === item ? i : -1;
      }
    }
    if (nativeIndexOf && array.indexOf === nativeIndexOf) return array.indexOf(item, isSorted);
    for (; i < l; i++) if (array[i] === item) return i;
    return -1;
  };

  // Delegates to **ECMAScript 5**'s native `lastIndexOf` if available.
  _.lastIndexOf = function(array, item, from) {
    if (array == null) return -1;
    var hasIndex = from != null;
    if (nativeLastIndexOf && array.lastIndexOf === nativeLastIndexOf) {
      return hasIndex ? array.lastIndexOf(item, from) : array.lastIndexOf(item);
    }
    var i = (hasIndex ? from : array.length);
    while (i--) if (array[i] === item) return i;
    return -1;
  };

  // Generate an integer Array containing an arithmetic progression. A port of
  // the native Python `range()` function. See
  // [the Python documentation](http://docs.python.org/library/functions.html#range).
  _.range = function(start, stop, step) {
    if (arguments.length <= 1) {
      stop = start || 0;
      start = 0;
    }
    step = arguments[2] || 1;

    var len = Math.max(Math.ceil((stop - start) / step), 0);
    var idx = 0;
    var range = new Array(len);

    while(idx < len) {
      range[idx++] = start;
      start += step;
    }

    return range;
  };

  // Function (ahem) Functions
  // ------------------

  // Create a function bound to a given object (assigning `this`, and arguments,
  // optionally). Delegates to **ECMAScript 5**'s native `Function.bind` if
  // available.
  _.bind = function(func, context) {
    if (func.bind === nativeBind && nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
    var args = slice.call(arguments, 2);
    return function() {
      return func.apply(context, args.concat(slice.call(arguments)));
    };
  };

  // Partially apply a function by creating a version that has had some of its
  // arguments pre-filled, without changing its dynamic `this` context.
  _.partial = function(func) {
    var args = slice.call(arguments, 1);
    return function() {
      return func.apply(this, args.concat(slice.call(arguments)));
    };
  };

  // Bind all of an object's methods to that object. Useful for ensuring that
  // all callbacks defined on an object belong to it.
  _.bindAll = function(obj) {
    var funcs = slice.call(arguments, 1);
    if (funcs.length === 0) funcs = _.functions(obj);
    each(funcs, function(f) { obj[f] = _.bind(obj[f], obj); });
    return obj;
  };

  // Memoize an expensive function by storing its results.
  _.memoize = function(func, hasher) {
    var memo = {};
    hasher || (hasher = _.identity);
    return function() {
      var key = hasher.apply(this, arguments);
      return _.has(memo, key) ? memo[key] : (memo[key] = func.apply(this, arguments));
    };
  };

  // Delays a function for the given number of milliseconds, and then calls
  // it with the arguments supplied.
  _.delay = function(func, wait) {
    var args = slice.call(arguments, 2);
    return setTimeout(function(){ return func.apply(null, args); }, wait);
  };

  // Defers a function, scheduling it to run after the current call stack has
  // cleared.
  _.defer = function(func) {
    return _.delay.apply(_, [func, 1].concat(slice.call(arguments, 1)));
  };

  // Returns a function, that, when invoked, will only be triggered at most once
  // during a given window of time.
  _.throttle = function(func, wait) {
    var context, args, timeout, result;
    var previous = 0;
    var later = function() {
      previous = new Date;
      timeout = null;
      result = func.apply(context, args);
    };
    return function() {
      var now = new Date;
      var remaining = wait - (now - previous);
      context = this;
      args = arguments;
      if (remaining <= 0) {
        clearTimeout(timeout);
        timeout = null;
        previous = now;
        result = func.apply(context, args);
      } else if (!timeout) {
        timeout = setTimeout(later, remaining);
      }
      return result;
    };
  };

  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.
  _.debounce = function(func, wait, immediate) {
    var timeout, result;
    return function() {
      var context = this, args = arguments;
      var later = function() {
        timeout = null;
        if (!immediate) result = func.apply(context, args);
      };
      var callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) result = func.apply(context, args);
      return result;
    };
  };

  // Returns a function that will be executed at most one time, no matter how
  // often you call it. Useful for lazy initialization.
  _.once = function(func) {
    var ran = false, memo;
    return function() {
      if (ran) return memo;
      ran = true;
      memo = func.apply(this, arguments);
      func = null;
      return memo;
    };
  };

  // Returns the first function passed as an argument to the second,
  // allowing you to adjust arguments, run code before and after, and
  // conditionally execute the original function.
  _.wrap = function(func, wrapper) {
    return function() {
      var args = [func];
      push.apply(args, arguments);
      return wrapper.apply(this, args);
    };
  };

  // Returns a function that is the composition of a list of functions, each
  // consuming the return value of the function that follows.
  _.compose = function() {
    var funcs = arguments;
    return function() {
      var args = arguments;
      for (var i = funcs.length - 1; i >= 0; i--) {
        args = [funcs[i].apply(this, args)];
      }
      return args[0];
    };
  };

  // Returns a function that will only be executed after being called N times.
  _.after = function(times, func) {
    if (times <= 0) return func();
    return function() {
      if (--times < 1) {
        return func.apply(this, arguments);
      }
    };
  };

  // Object Functions
  // ----------------

  // Retrieve the names of an object's properties.
  // Delegates to **ECMAScript 5**'s native `Object.keys`
  _.keys = nativeKeys || function(obj) {
    if (obj !== Object(obj)) throw new TypeError('Invalid object');
    var keys = [];
    for (var key in obj) if (_.has(obj, key)) keys[keys.length] = key;
    return keys;
  };

  // Retrieve the values of an object's properties.
  _.values = function(obj) {
    var values = [];
    for (var key in obj) if (_.has(obj, key)) values.push(obj[key]);
    return values;
  };

  // Convert an object into a list of `[key, value]` pairs.
  _.pairs = function(obj) {
    var pairs = [];
    for (var key in obj) if (_.has(obj, key)) pairs.push([key, obj[key]]);
    return pairs;
  };

  // Invert the keys and values of an object. The values must be serializable.
  _.invert = function(obj) {
    var result = {};
    for (var key in obj) if (_.has(obj, key)) result[obj[key]] = key;
    return result;
  };

  // Return a sorted list of the function names available on the object.
  // Aliased as `methods`
  _.functions = _.methods = function(obj) {
    var names = [];
    for (var key in obj) {
      if (_.isFunction(obj[key])) names.push(key);
    }
    return names.sort();
  };

  // Extend a given object with all the properties in passed-in object(s).
  _.extend = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      if (source) {
        for (var prop in source) {
          obj[prop] = source[prop];
        }
      }
    });
    return obj;
  };

  // Return a copy of the object only containing the whitelisted properties.
  _.pick = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    each(keys, function(key) {
      if (key in obj) copy[key] = obj[key];
    });
    return copy;
  };

   // Return a copy of the object without the blacklisted properties.
  _.omit = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    for (var key in obj) {
      if (!_.contains(keys, key)) copy[key] = obj[key];
    }
    return copy;
  };

  // Fill in a given object with default properties.
  _.defaults = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      if (source) {
        for (var prop in source) {
          if (obj[prop] == null) obj[prop] = source[prop];
        }
      }
    });
    return obj;
  };

  // Create a (shallow-cloned) duplicate of an object.
  _.clone = function(obj) {
    if (!_.isObject(obj)) return obj;
    return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
  };

  // Invokes interceptor with the obj, and then returns obj.
  // The primary purpose of this method is to "tap into" a method chain, in
  // order to perform operations on intermediate results within the chain.
  _.tap = function(obj, interceptor) {
    interceptor(obj);
    return obj;
  };

  // Internal recursive comparison function for `isEqual`.
  var eq = function(a, b, aStack, bStack) {
    // Identical objects are equal. `0 === -0`, but they aren't identical.
    // See the Harmony `egal` proposal: http://wiki.ecmascript.org/doku.php?id=harmony:egal.
    if (a === b) return a !== 0 || 1 / a == 1 / b;
    // A strict comparison is necessary because `null == undefined`.
    if (a == null || b == null) return a === b;
    // Unwrap any wrapped objects.
    if (a instanceof _) a = a._wrapped;
    if (b instanceof _) b = b._wrapped;
    // Compare `[[Class]]` names.
    var className = toString.call(a);
    if (className != toString.call(b)) return false;
    switch (className) {
      // Strings, numbers, dates, and booleans are compared by value.
      case '[object String]':
        // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
        // equivalent to `new String("5")`.
        return a == String(b);
      case '[object Number]':
        // `NaN`s are equivalent, but non-reflexive. An `egal` comparison is performed for
        // other numeric values.
        return a != +a ? b != +b : (a == 0 ? 1 / a == 1 / b : a == +b);
      case '[object Date]':
      case '[object Boolean]':
        // Coerce dates and booleans to numeric primitive values. Dates are compared by their
        // millisecond representations. Note that invalid dates with millisecond representations
        // of `NaN` are not equivalent.
        return +a == +b;
      // RegExps are compared by their source patterns and flags.
      case '[object RegExp]':
        return a.source == b.source &&
               a.global == b.global &&
               a.multiline == b.multiline &&
               a.ignoreCase == b.ignoreCase;
    }
    if (typeof a != 'object' || typeof b != 'object') return false;
    // Assume equality for cyclic structures. The algorithm for detecting cyclic
    // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.
    var length = aStack.length;
    while (length--) {
      // Linear search. Performance is inversely proportional to the number of
      // unique nested structures.
      if (aStack[length] == a) return bStack[length] == b;
    }
    // Add the first object to the stack of traversed objects.
    aStack.push(a);
    bStack.push(b);
    var size = 0, result = true;
    // Recursively compare objects and arrays.
    if (className == '[object Array]') {
      // Compare array lengths to determine if a deep comparison is necessary.
      size = a.length;
      result = size == b.length;
      if (result) {
        // Deep compare the contents, ignoring non-numeric properties.
        while (size--) {
          if (!(result = eq(a[size], b[size], aStack, bStack))) break;
        }
      }
    } else {
      // Objects with different constructors are not equivalent, but `Object`s
      // from different frames are.
      var aCtor = a.constructor, bCtor = b.constructor;
      if (aCtor !== bCtor && !(_.isFunction(aCtor) && (aCtor instanceof aCtor) &&
                               _.isFunction(bCtor) && (bCtor instanceof bCtor))) {
        return false;
      }
      // Deep compare objects.
      for (var key in a) {
        if (_.has(a, key)) {
          // Count the expected number of properties.
          size++;
          // Deep compare each member.
          if (!(result = _.has(b, key) && eq(a[key], b[key], aStack, bStack))) break;
        }
      }
      // Ensure that both objects contain the same number of properties.
      if (result) {
        for (key in b) {
          if (_.has(b, key) && !(size--)) break;
        }
        result = !size;
      }
    }
    // Remove the first object from the stack of traversed objects.
    aStack.pop();
    bStack.pop();
    return result;
  };

  // Perform a deep comparison to check if two objects are equal.
  _.isEqual = function(a, b) {
    return eq(a, b, [], []);
  };

  // Is a given array, string, or object empty?
  // An "empty" object has no enumerable own-properties.
  _.isEmpty = function(obj) {
    if (obj == null) return true;
    if (_.isArray(obj) || _.isString(obj)) return obj.length === 0;
    for (var key in obj) if (_.has(obj, key)) return false;
    return true;
  };

  // Is a given value a DOM element?
  _.isElement = function(obj) {
    return !!(obj && obj.nodeType === 1);
  };

  // Is a given value an array?
  // Delegates to ECMA5's native Array.isArray
  _.isArray = nativeIsArray || function(obj) {
    return toString.call(obj) == '[object Array]';
  };

  // Is a given variable an object?
  _.isObject = function(obj) {
    return obj === Object(obj);
  };

  // Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp.
  each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp'], function(name) {
    _['is' + name] = function(obj) {
      return toString.call(obj) == '[object ' + name + ']';
    };
  });

  // Define a fallback version of the method in browsers (ahem, IE), where
  // there isn't any inspectable "Arguments" type.
  if (!_.isArguments(arguments)) {
    _.isArguments = function(obj) {
      return !!(obj && _.has(obj, 'callee'));
    };
  }

  // Optimize `isFunction` if appropriate.
  if (typeof (/./) !== 'function') {
    _.isFunction = function(obj) {
      return typeof obj === 'function';
    };
  }

  // Is a given object a finite number?
  _.isFinite = function(obj) {
    return isFinite(obj) && !isNaN(parseFloat(obj));
  };

  // Is the given value `NaN`? (NaN is the only number which does not equal itself).
  _.isNaN = function(obj) {
    return _.isNumber(obj) && obj != +obj;
  };

  // Is a given value a boolean?
  _.isBoolean = function(obj) {
    return obj === true || obj === false || toString.call(obj) == '[object Boolean]';
  };

  // Is a given value equal to null?
  _.isNull = function(obj) {
    return obj === null;
  };

  // Is a given variable undefined?
  _.isUndefined = function(obj) {
    return obj === void 0;
  };

  // Shortcut function for checking if an object has a given property directly
  // on itself (in other words, not on a prototype).
  _.has = function(obj, key) {
    return hasOwnProperty.call(obj, key);
  };

  // Utility Functions
  // -----------------

  // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
  // previous owner. Returns a reference to the Underscore object.
  _.noConflict = function() {
    root._ = previousUnderscore;
    return this;
  };

  // Keep the identity function around for default iterators.
  _.identity = function(value) {
    return value;
  };

  // Run a function **n** times.
  _.times = function(n, iterator, context) {
    var accum = Array(n);
    for (var i = 0; i < n; i++) accum[i] = iterator.call(context, i);
    return accum;
  };

  // Return a random integer between min and max (inclusive).
  _.random = function(min, max) {
    if (max == null) {
      max = min;
      min = 0;
    }
    return min + Math.floor(Math.random() * (max - min + 1));
  };

  // List of HTML entities for escaping.
  var entityMap = {
    escape: {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;'
    }
  };
  entityMap.unescape = _.invert(entityMap.escape);

  // Regexes containing the keys and values listed immediately above.
  var entityRegexes = {
    escape:   new RegExp('[' + _.keys(entityMap.escape).join('') + ']', 'g'),
    unescape: new RegExp('(' + _.keys(entityMap.unescape).join('|') + ')', 'g')
  };

  // Functions for escaping and unescaping strings to/from HTML interpolation.
  _.each(['escape', 'unescape'], function(method) {
    _[method] = function(string) {
      if (string == null) return '';
      return ('' + string).replace(entityRegexes[method], function(match) {
        return entityMap[method][match];
      });
    };
  });

  // If the value of the named property is a function then invoke it;
  // otherwise, return it.
  _.result = function(object, property) {
    if (object == null) return null;
    var value = object[property];
    return _.isFunction(value) ? value.call(object) : value;
  };

  // Add your own custom functions to the Underscore object.
  _.mixin = function(obj) {
    each(_.functions(obj), function(name){
      var func = _[name] = obj[name];
      _.prototype[name] = function() {
        var args = [this._wrapped];
        push.apply(args, arguments);
        return result.call(this, func.apply(_, args));
      };
    });
  };

  // Generate a unique integer id (unique within the entire client session).
  // Useful for temporary DOM ids.
  var idCounter = 0;
  _.uniqueId = function(prefix) {
    var id = ++idCounter + '';
    return prefix ? prefix + id : id;
  };

  // By default, Underscore uses ERB-style template delimiters, change the
  // following template settings to use alternative delimiters.
  _.templateSettings = {
    evaluate    : /<%([\s\S]+?)%>/g,
    interpolate : /<%=([\s\S]+?)%>/g,
    escape      : /<%-([\s\S]+?)%>/g
  };

  // When customizing `templateSettings`, if you don't want to define an
  // interpolation, evaluation or escaping regex, we need one that is
  // guaranteed not to match.
  var noMatch = /(.)^/;

  // Certain characters need to be escaped so that they can be put into a
  // string literal.
  var escapes = {
    "'":      "'",
    '\\':     '\\',
    '\r':     'r',
    '\n':     'n',
    '\t':     't',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  var escaper = /\\|'|\r|\n|\t|\u2028|\u2029/g;

  // JavaScript micro-templating, similar to John Resig's implementation.
  // Underscore templating handles arbitrary delimiters, preserves whitespace,
  // and correctly escapes quotes within interpolated code.
  _.template = function(text, data, settings) {
    var render;
    settings = _.defaults({}, settings, _.templateSettings);

    // Combine delimiters into one regular expression via alternation.
    var matcher = new RegExp([
      (settings.escape || noMatch).source,
      (settings.interpolate || noMatch).source,
      (settings.evaluate || noMatch).source
    ].join('|') + '|$', 'g');

    // Compile the template source, escaping string literals appropriately.
    var index = 0;
    var source = "__p+='";
    text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
      source += text.slice(index, offset)
        .replace(escaper, function(match) { return '\\' + escapes[match]; });

      if (escape) {
        source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
      }
      if (interpolate) {
        source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
      }
      if (evaluate) {
        source += "';\n" + evaluate + "\n__p+='";
      }
      index = offset + match.length;
      return match;
    });
    source += "';\n";

    // If a variable is not specified, place data values in local scope.
    if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

    source = "var __t,__p='',__j=Array.prototype.join," +
      "print=function(){__p+=__j.call(arguments,'');};\n" +
      source + "return __p;\n";

    try {
      render = new Function(settings.variable || 'obj', '_', source);
    } catch (e) {
      e.source = source;
      throw e;
    }

    if (data) return render(data, _);
    var template = function(data) {
      return render.call(this, data, _);
    };

    // Provide the compiled function source as a convenience for precompilation.
    template.source = 'function(' + (settings.variable || 'obj') + '){\n' + source + '}';

    return template;
  };

  // Add a "chain" function, which will delegate to the wrapper.
  _.chain = function(obj) {
    return _(obj).chain();
  };

  // OOP
  // ---------------
  // If Underscore is called as a function, it returns a wrapped object that
  // can be used OO-style. This wrapper holds altered versions of all the
  // underscore functions. Wrapped objects may be chained.

  // Helper function to continue chaining intermediate results.
  var result = function(obj) {
    return this._chain ? _(obj).chain() : obj;
  };

  // Add all of the Underscore functions to the wrapper object.
  _.mixin(_);

  // Add all mutator Array functions to the wrapper.
  each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      var obj = this._wrapped;
      method.apply(obj, arguments);
      if ((name == 'shift' || name == 'splice') && obj.length === 0) delete obj[0];
      return result.call(this, obj);
    };
  });

  // Add all accessor Array functions to the wrapper.
  each(['concat', 'join', 'slice'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      return result.call(this, method.apply(this._wrapped, arguments));
    };
  });

  _.extend(_.prototype, {

    // Start chaining a wrapped Underscore object.
    chain: function() {
      this._chain = true;
      return this;
    },

    // Extracts the result from a wrapped and chained object.
    value: function() {
      return this._wrapped;
    }

  });

}).call(this);

},{}],16:[function(require,module,exports){
var Backbone, ListOptions, Models, _,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Backbone = require('backbone');

_ = require('underscore');

Models = {
  Option: require('../models/list.option')
};

ListOptions = (function(_super) {
  __extends(ListOptions, _super);

  function ListOptions() {
    return ListOptions.__super__.constructor.apply(this, arguments);
  }

  ListOptions.prototype.model = Models.Option;

  ListOptions.prototype.strategies = {
    alpha_asc: function(model) {
      return model.get('name');
    },
    alpha_desc: function(model) {
      return String.fromCharCode.apply(String, _.map(model.get('name').split(''), function(c) {
        return 0xffff - c.charCodeAt();
      }));
    },
    amount_asc: function(model) {
      return +model.get('count');
    },
    amount_desc: function(model) {
      return -1 * +model.get('count');
    }
  };

  ListOptions.prototype.orderBy = function(strategy) {
    this.comparator = this.strategies[strategy];
    return this.sort();
  };

  ListOptions.prototype.initialize = function() {
    return this.comparator = this.strategies.amount_desc;
  };

  ListOptions.prototype.revert = function() {
    this.each((function(_this) {
      return function(option) {
        return option.set('checked', false, {
          silent: true
        });
      };
    })(this));
    return this.trigger('change');
  };

  ListOptions.prototype.updateOptions = function(newOptions) {
    if (newOptions == null) {
      newOptions = [];
    }
    this.each((function(_this) {
      return function(option) {
        return option.set('count', 0, {
          silent: true
        });
      };
    })(this));
    _.each(newOptions, (function(_this) {
      return function(newOption) {
        var opt;
        opt = _this.get(newOption.name);
        if (opt != null) {
          return opt.set('count', newOption.count, {
            silent: true
          });
        } else {
          opt = new Models.Option(newOption);
          return _this.add(opt);
        }
      };
    })(this));
    return this.sort();
  };

  return ListOptions;

})(Backbone.Collection);

module.exports = ListOptions;


},{"../models/list.option":25,"backbone":3,"underscore":15}],17:[function(require,module,exports){
var Backbone, SearchResult, SearchResults, ajax, config, pubsub, token, _,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Backbone = require('backbone');

_ = require('underscore');

pubsub = require('hilib/src/mixins/pubsub');

SearchResult = require('../models/searchresult');

ajax = require('hilib/src/managers/ajax');

token = require('hilib/src/managers/token');

config = require('../config');

SearchResults = (function(_super) {
  __extends(SearchResults, _super);

  function SearchResults() {
    return SearchResults.__super__.constructor.apply(this, arguments);
  }

  SearchResults.prototype.model = SearchResult;

  SearchResults.prototype.initialize = function() {
    _.extend(this, pubsub);
    this.cachedModels = {};
    return this.on('add', this.setCurrent, this);
  };

  SearchResults.prototype.setCurrent = function(current) {
    var message;
    this.current = current;
    message = this.current.options.url != null ? 'change:cursor' : 'change:results';
    return this.trigger(message, this.current);
  };

  SearchResults.prototype.runQuery = function(queryOptions, cache) {
    var cacheString, options, resultRows, searchResult;
    if (cache == null) {
      cache = true;
    }
    if (queryOptions.hasOwnProperty('resultRows')) {
      resultRows = queryOptions.resultRows;
      delete queryOptions.resultRows;
    }
    cacheString = JSON.stringify(queryOptions);
    if (cache && this.cachedModels.hasOwnProperty(cacheString)) {
      return this.setCurrent(this.cachedModels[cacheString]);
    } else {
      this.trigger('request');
      options = {};
      options.cacheString = cacheString;
      options.queryOptions = queryOptions;
      if (resultRows != null) {
        options.resultRows = resultRows;
      }
      searchResult = new SearchResult(null, options);
      return searchResult.fetch({
        success: (function(_this) {
          return function(model) {
            _this.cachedModels[cacheString] = model;
            return _this.add(model);
          };
        })(this)
      });
    }
  };

  SearchResults.prototype.moveCursor = function(direction) {
    var searchResult, url;
    url = direction === '_prev' || direction === '_next' ? this.current.get(direction) : direction;
    if (url != null) {
      if (this.cachedModels.hasOwnProperty(url)) {
        return this.setCurrent(this.cachedModels[url]);
      } else {
        searchResult = new SearchResult(null, {
          url: url
        });
        return searchResult.fetch({
          success: (function(_this) {
            return function(model, response, options) {
              _this.cachedModels[url] = model;
              return _this.add(model);
            };
          })(this)
        });
      }
    }
  };

  return SearchResults;

})(Backbone.Collection);

module.exports = SearchResults;


},{"../config":18,"../models/searchresult":29,"backbone":3,"hilib/src/managers/ajax":7,"hilib/src/managers/token":8,"hilib/src/mixins/pubsub":9,"underscore":15}],18:[function(require,module,exports){
module.exports = {
  baseUrl: '',
  searchPath: '',
  search: true,
  token: null,
  queryOptions: {},
  facetNameMap: {}
};


},{}],19:[function(require,module,exports){
module.exports = {
  BOOLEAN: require('./views/facets/boolean'),
  DATE: require('./views/facets/date'),
  RANGE: require('./views/facets/range'),
  LIST: require('./views/facets/list')
};


},{"./views/facets/boolean":30,"./views/facets/date":31,"./views/facets/list":32,"./views/facets/range":35}],20:[function(require,module,exports){
var $, Backbone, Fn, MainModel, MainView, Views, config, dom, facetViewMap, pubsub, tpl, _,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Backbone = require('backbone');

$ = require('jquery');

Backbone.$ = $;

_ = require('underscore');

Fn = require('hilib/src/utils/general');

dom = require('hilib/src/utils/dom');

pubsub = require('hilib/src/mixins/pubsub');

config = require('./config');

facetViewMap = require('./facetviewmap');

MainModel = require('./models/main');

Views = {
  TextSearch: require('./views/search'),
  Facets: {
    List: require('./views/facets/list'),
    Boolean: require('./views/facets/boolean'),
    Date: require('./views/facets/date')
  }
};

tpl = require('../jade/main.jade');

MainView = (function(_super) {
  __extends(MainView, _super);

  function MainView() {
    return MainView.__super__.constructor.apply(this, arguments);
  }

  MainView.prototype.initialize = function(options) {
    var queryOptions;
    this.facetViews = {};
    _.extend(this, pubsub);
    _.extend(facetViewMap, options.facetViewMap);
    delete options.facetViewMap;
    _.extend(config.facetNameMap, options.facetNameMap);
    delete options.facetNameMap;
    _.extend(config, options);
    queryOptions = _.extend(config.queryOptions, config.textSearchOptions);
    this.render();
    this.model = new MainModel(queryOptions);
    this.listenTo(this.model.searchResults, 'change:results', (function(_this) {
      return function(responseModel) {
        _this.renderFacets();
        return _this.trigger('results:change', responseModel);
      };
    })(this));
    this.listenTo(this.model.searchResults, 'change:cursor', (function(_this) {
      return function(responseModel) {
        return _this.trigger('results:change', responseModel);
      };
    })(this));
    this.listenTo(this.model.searchResults, 'change:page', (function(_this) {
      return function(responseModel, database) {
        return _this.trigger('results:change', responseModel, database);
      };
    })(this));
    this.listenTo(this.model.searchResults, 'request', (function(_this) {
      return function() {
        var bb, div, el, loader, top;
        el = _this.el.querySelector('.faceted-search');
        div = _this.el.querySelector('.overlay');
        div.style.width = el.clientWidth + 'px';
        div.style.height = el.clientHeight + 'px';
        div.style.display = 'block';
        loader = _this.el.querySelector('.overlay div');
        bb = dom(el).boundingBox();
        loader.style.left = bb.left + bb.width / 2 + 'px';
        top = bb.height > document.documentElement.clientHeight ? '50vh' : bb.height / 2 + 'px';
        return loader.style.top = top;
      };
    })(this));
    this.listenTo(this.model.searchResults, 'sync', (function(_this) {
      return function() {
        var el;
        el = _this.el.querySelector('.overlay');
        return el.style.display = 'none';
      };
    })(this));
    return this.listenTo(this.model.searchResults, 'unauthorised', (function(_this) {
      return function() {
        return _this.trigger('unauthorised');
      };
    })(this));
  };

  MainView.prototype.render = function() {
    var rtpl;
    rtpl = tpl();
    this.$el.html(rtpl);
    this.$('.loader').fadeIn('slow');
    return this;
  };

  MainView.prototype.renderFacets = function(data) {
    var View, facetData, fragment, index, textSearch, _ref;
    this.$('.loader').hide();
    this.$('.faceted-search > i.fa-compress').css('visibility', 'visible');
    if (this.model.searchResults.length === 1) {
      fragment = document.createDocumentFragment();
      if (config.search) {
        textSearch = new Views.TextSearch();
        this.$('.search-placeholder').html(textSearch.el);
        this.listenTo(textSearch, 'change', (function(_this) {
          return function(queryOptions) {
            return _this.model.set(queryOptions);
          };
        })(this));
        this.facetViews['textSearch'] = textSearch;
      }
      _ref = this.model.searchResults.current.get('facets');
      for (index in _ref) {
        if (!__hasProp.call(_ref, index)) continue;
        facetData = _ref[index];
        if (facetData.type in facetViewMap) {
          View = facetViewMap[facetData.type];
          this.facetViews[facetData.name] = new View({
            attrs: facetData
          });
          this.listenTo(this.facetViews[facetData.name], 'change', (function(_this) {
            return function(queryOptions) {
              return _this.model.set(queryOptions);
            };
          })(this));
          fragment.appendChild(this.facetViews[facetData.name].el);
        } else {
          console.error('Unknown facetView', facetData.type);
        }
      }
      return this.el.querySelector('.facets').appendChild(fragment);
    } else {
      return this.update();
    }
  };

  MainView.prototype.events = function() {
    return {
      'click i.fa-compress': 'toggleFacets',
      'click i.fa-expand': 'toggleFacets'
    };
  };

  MainView.prototype.toggleFacets = function(ev) {
    var $button, facetNames, index, open, slideFacet;
    $button = $(ev.currentTarget);
    open = $button.hasClass('fa-expand');
    $button.toggleClass('fa-compress');
    $button.toggleClass('fa-expand');
    facetNames = _.keys(this.facetViews);
    index = 0;
    slideFacet = (function(_this) {
      return function() {
        var facet, facetName;
        facetName = facetNames[index++];
        facet = _this.facetViews[facetName];
        if (facet != null) {
          if (facetName === 'textSearch') {
            return slideFacet();
          } else {
            if (open) {
              return facet.showBody(function() {
                return slideFacet();
              });
            } else {
              return facet.hideBody(function() {
                return slideFacet();
              });
            }
          }
        }
      };
    })(this);
    return slideFacet();
  };

  MainView.prototype.page = function(pagenumber, database) {
    return this.model.searchResults.current.page(pagenumber, database);
  };

  MainView.prototype.next = function() {
    return this.model.searchResults.moveCursor('_next');
  };

  MainView.prototype.prev = function() {
    return this.model.searchResults.moveCursor('_prev');
  };

  MainView.prototype.hasNext = function() {
    return this.model.searchResults.current.has('_next');
  };

  MainView.prototype.hasPrev = function() {
    return this.model.searchResults.current.has('_prev');
  };

  MainView.prototype.sortResultsBy = function(field) {
    return this.model.set({
      sort: field
    });
  };

  MainView.prototype.update = function() {
    var data, index, _ref, _results;
    if (this.facetViews.hasOwnProperty('textSearch')) {
      this.facetViews.textSearch.update();
    }
    _ref = this.model.searchResults.current.get('facets');
    _results = [];
    for (index in _ref) {
      if (!__hasProp.call(_ref, index)) continue;
      data = _ref[index];
      _results.push(this.facetViews[data.name].update(data.options));
    }
    return _results;
  };

  MainView.prototype.reset = function() {
    var data, index, _ref;
    if (this.facetViews.hasOwnProperty('textSearch')) {
      this.facetViews.textSearch.reset();
    }
    _ref = this.model.searchResults.last().get('facets');
    for (index in _ref) {
      if (!__hasProp.call(_ref, index)) continue;
      data = _ref[index];
      if (this.facetViews[data.name].reset) {
        this.facetViews[data.name].reset();
      }
    }
    return this.model.reset();
  };

  MainView.prototype.refresh = function(newQueryOptions) {
    return this.model.refresh(newQueryOptions);
  };

  return MainView;

})(Backbone.View);

module.exports = MainView;


},{"../jade/main.jade":46,"./config":18,"./facetviewmap":19,"./models/main":26,"./views/facets/boolean":30,"./views/facets/date":31,"./views/facets/list":32,"./views/search":36,"backbone":3,"hilib/src/mixins/pubsub":9,"hilib/src/utils/dom":10,"hilib/src/utils/general":11,"jquery":14,"underscore":15}],21:[function(require,module,exports){
var BooleanFacet, Models,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Models = {
  Facet: require('./facet')
};

BooleanFacet = (function(_super) {
  __extends(BooleanFacet, _super);

  function BooleanFacet() {
    return BooleanFacet.__super__.constructor.apply(this, arguments);
  }

  BooleanFacet.prototype.set = function(attrs, options) {
    if (attrs === 'options') {
      options = this.parseOptions(options);
    } else if (attrs.options != null) {
      attrs.options = this.parseOptions(attrs.options);
    }
    return BooleanFacet.__super__.set.call(this, attrs, options);
  };

  BooleanFacet.prototype.parseOptions = function(options) {
    var _ref;
    options = (_ref = this.get('options')) != null ? _ref : options;
    if (options.length === 1) {
      options.push({
        name: (!JSON.parse(options[0].name)).toString(),
        count: 0
      });
    }
    return options;
  };

  return BooleanFacet;

})(Models.Facet);

module.exports = BooleanFacet;


},{"./facet":23}],22:[function(require,module,exports){
var DateFacet, Models,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Models = {
  Facet: require('../models/facet')
};

DateFacet = (function(_super) {
  __extends(DateFacet, _super);

  function DateFacet() {
    return DateFacet.__super__.constructor.apply(this, arguments);
  }

  DateFacet.prototype.parse = function(attrs) {
    attrs.options = _.map(_.pluck(attrs.options, 'name'), function(option) {
      return option.substr(0, 4);
    });
    attrs.options = _.unique(attrs.options);
    attrs.options.sort();
    return attrs;
  };

  return DateFacet;

})(Models.Facet);

module.exports = DateFacet;


},{"../models/facet":23}],23:[function(require,module,exports){
var Backbone, Facet, config,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Backbone = require('backbone');

config = require('../config');

Facet = (function(_super) {
  __extends(Facet, _super);

  function Facet() {
    return Facet.__super__.constructor.apply(this, arguments);
  }

  Facet.prototype.idAttribute = 'name';

  Facet.prototype.parse = function(attrs) {
    if (config.facetNameMap.hasOwnProperty(attrs.name)) {
      attrs.title = config.facetNameMap[attrs.name];
    } else {
      config.facetNameMap[attrs.name] = attrs.title;
    }
    return attrs;
  };

  return Facet;

})(Backbone.Model);

module.exports = Facet;


},{"../config":18,"backbone":3}],24:[function(require,module,exports){
var List, Models,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Models = {
  Facet: require('./facet')
};

List = (function(_super) {
  __extends(List, _super);

  function List() {
    return List.__super__.constructor.apply(this, arguments);
  }

  return List;

})(Models.Facet);

module.exports = List;


},{"./facet":23}],25:[function(require,module,exports){
var Backbone, ListOption,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Backbone = require('backbone');

ListOption = (function(_super) {
  __extends(ListOption, _super);

  function ListOption() {
    return ListOption.__super__.constructor.apply(this, arguments);
  }

  ListOption.prototype.idAttribute = 'name';

  ListOption.prototype.defaults = function() {
    return {
      name: '',
      count: 0,
      total: 0,
      checked: false
    };
  };

  ListOption.prototype.parse = function(attrs) {
    attrs.total = attrs.count;
    return attrs;
  };

  return ListOption;

})(Backbone.Model);

module.exports = ListOption;


},{"backbone":3}],26:[function(require,module,exports){
var Backbone, MainModel, SearchResults, _,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Backbone = require('backbone');

_ = require('underscore');

SearchResults = require('../collections/searchresults');

MainModel = (function(_super) {
  __extends(MainModel, _super);

  function MainModel() {
    return MainModel.__super__.constructor.apply(this, arguments);
  }

  MainModel.prototype.defaults = function() {
    return {
      facetValues: [],
      sortParameters: []
    };
  };

  MainModel.prototype.initialize = function(queryOptions, options) {
    this.queryOptions = queryOptions;
    this.searchResults = new SearchResults();
    this.on('change', (function(_this) {
      return function(model, options) {
        return _this.searchResults.runQuery(_.clone(_this.attributes));
      };
    })(this));
    return this.trigger('change');
  };

  MainModel.prototype.set = function(attrs, options) {
    var facetValues;
    if (attrs.facetValue != null) {
      facetValues = _.reject(this.get('facetValues'), function(data) {
        return data.name === attrs.facetValue.name;
      });
      if (attrs.facetValue.values != null) {
        if (attrs.facetValue.values.length > 0) {
          facetValues.push(attrs.facetValue);
        }
      } else {
        facetValues.push(attrs.facetValue);
      }
      attrs.facetValues = facetValues;
      delete attrs.facetValue;
    }
    return MainModel.__super__.set.call(this, attrs, options);
  };

  MainModel.prototype.reset = function() {
    this.clear({
      silent: true
    });
    this.set(this.defaults(), {
      silent: true
    });
    this.set(this.queryOptions, {
      silent: true
    });
    return this.trigger('change');
  };

  MainModel.prototype.refresh = function(newQueryOptions) {
    var key, value;
    if (newQueryOptions == null) {
      newQueryOptions = {};
    }
    for (key in newQueryOptions) {
      if (!__hasProp.call(newQueryOptions, key)) continue;
      value = newQueryOptions[key];
      this.set(key, value);
    }
    return this.searchResults.runQuery(_.clone(this.attributes), false);
  };

  return MainModel;

})(Backbone.Model);

module.exports = MainModel;


},{"../collections/searchresults":17,"backbone":3,"underscore":15}],27:[function(require,module,exports){
var FacetModel, RangeFacet,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

FacetModel = require('../models/facet');

RangeFacet = (function(_super) {
  __extends(RangeFacet, _super);

  function RangeFacet() {
    return RangeFacet.__super__.constructor.apply(this, arguments);
  }

  RangeFacet.prototype.parse = function(attrs) {
    RangeFacet.__super__.parse.apply(this, arguments);
    attrs.options = {
      lowerLimit: +((attrs.options[0].lowerLimit + '').substr(0, 4)),
      upperLimit: +((attrs.options[0].upperLimit + '').substr(0, 4))
    };
    return attrs;
  };

  return RangeFacet;

})(FacetModel);

module.exports = RangeFacet;


},{"../models/facet":23}],28:[function(require,module,exports){
var Backbone, Search, _,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Backbone = require('backbone');

_ = require('underscore');

Search = (function(_super) {
  __extends(Search, _super);

  function Search() {
    return Search.__super__.constructor.apply(this, arguments);
  }

  Search.prototype.defaults = function() {
    return {
      term: '*',
      caseSensitive: false,
      fuzzy: false,
      title: 'Text Search',
      name: 'text_search'
    };
  };

  Search.prototype.queryData = function() {
    var attrs;
    attrs = _.extend({}, this.attributes);
    delete attrs.name;
    delete attrs.title;
    return attrs;
  };

  return Search;

})(Backbone.Model);

module.exports = Search;


},{"backbone":3,"underscore":15}],29:[function(require,module,exports){
var Backbone, SearchResult, ajax, config, token,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Backbone = require('backbone');

ajax = require('hilib/src/managers/ajax');

token = require('hilib/src/managers/token');

config = require('../config');

SearchResult = (function(_super) {
  __extends(SearchResult, _super);

  function SearchResult() {
    return SearchResult.__super__.constructor.apply(this, arguments);
  }

  SearchResult.prototype.defaults = function() {
    return {
      _next: null,
      _prev: null,
      ids: [],
      numFound: null,
      results: [],
      rows: null,
      solrquery: '',
      sortableFields: [],
      start: null,
      term: ''
    };
  };

  SearchResult.prototype.initialize = function(attrs, options) {
    this.options = options;
    SearchResult.__super__.initialize.apply(this, arguments);
    return this.postURL = null;
  };

  SearchResult.prototype.sync = function(method, model, options) {
    var jqXHR;
    if (method === 'read') {
      if (this.options.url != null) {
        return this.getResults(this.options.url, options.success);
      } else {
        jqXHR = ajax.post({
          url: config.baseUrl + config.searchPath,
          data: JSON.stringify(this.options.queryOptions),
          dataType: 'text'
        });
        jqXHR.done((function(_this) {
          return function(data, textStatus, jqXHR) {
            var url;
            if (jqXHR.status === 201) {
              _this.postURL = jqXHR.getResponseHeader('Location');
              url = _this.options.resultRows != null ? _this.postURL + '?rows=' + _this.options.resultRows : _this.postURL;
              return _this.getResults(url, options.success);
            }
          };
        })(this));
        return jqXHR.fail((function(_this) {
          return function(jqXHR, textStatus, errorThrown) {
            if (jqXHR.status === 401) {
              _this.collection.trigger('unauthorized');
            }
            return console.error('Failed getting FacetedSearch results from the server!', arguments);
          };
        })(this));
      }
    }
  };

  SearchResult.prototype.getResults = function(url, done) {
    var jqXHR;
    ajax.token = config.token;
    jqXHR = ajax.get({
      url: url
    });
    jqXHR.done((function(_this) {
      return function(data, textStatus, jqXHR) {
        return done(data);
      };
    })(this));
    return jqXHR.fail((function(_this) {
      return function(jqXHR, textStatus, errorThrown) {
        if (jqXHR.status === 401) {
          _this.collection.trigger('unauthorized');
        }
        return console.error('Failed getting FacetedSearch results from the server!', arguments);
      };
    })(this));
  };

  SearchResult.prototype.page = function(pagenumber, database) {
    var start, url;
    start = this.options.resultRows * (pagenumber - 1);
    url = this.postURL + ("?rows=" + this.options.resultRows + "&start=" + start);
    if (database != null) {
      url += "&database=" + database;
    }
    return this.getResults(url, (function(_this) {
      return function(data) {
        _this.set(data, {
          silent: true
        });
        return _this.collection.trigger('change:page', _this, database);
      };
    })(this));
  };

  return SearchResult;

})(Backbone.Model);

module.exports = SearchResult;


},{"../config":18,"backbone":3,"hilib/src/managers/ajax":7,"hilib/src/managers/token":8}],30:[function(require,module,exports){
var BooleanFacet, Models, StringFn, Views, bodyTpl,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

StringFn = require('hilib/src/utils/string');

Models = {
  Boolean: require('../../models/boolean')
};

Views = {
  Facet: require('./main')
};

bodyTpl = require('../../../jade/facets/boolean.body.jade');

BooleanFacet = (function(_super) {
  __extends(BooleanFacet, _super);

  function BooleanFacet() {
    return BooleanFacet.__super__.constructor.apply(this, arguments);
  }

  BooleanFacet.prototype.className = 'facet boolean';

  BooleanFacet.prototype.events = function() {
    return _.extend({}, BooleanFacet.__super__.events.apply(this, arguments), {
      'click i': 'checkChanged',
      'click label': 'checkChanged'
    });
  };

  BooleanFacet.prototype.checkChanged = function(ev) {
    var $target, option, value, _i, _len, _ref;
    $target = ev.currentTarget.tagName === 'LABEL' ? this.$('i[data-value="' + ev.currentTarget.getAttribute('data-value') + '"]') : $(ev.currentTarget);
    $target.toggleClass('fa-square-o');
    $target.toggleClass('fa-check-square-o');
    value = $target.attr('data-value');
    _ref = this.model.get('options');
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      option = _ref[_i];
      if (option.name === value) {
        option.checked = $target.hasClass('fa-check-square-o');
      }
    }
    return this.trigger('change', {
      facetValue: {
        name: this.model.get('name'),
        values: _.map(this.$('i.fa-check-square-o'), function(cb) {
          return cb.getAttribute('data-value');
        })
      }
    });
  };

  BooleanFacet.prototype.initialize = function(options) {
    BooleanFacet.__super__.initialize.apply(this, arguments);
    this.model = new Models.Boolean(options.attrs, {
      parse: true
    });
    this.listenTo(this.model, 'change:options', this.render);
    return this.render();
  };

  BooleanFacet.prototype.render = function() {
    var rtpl;
    BooleanFacet.__super__.render.apply(this, arguments);
    rtpl = bodyTpl(_.extend(this.model.attributes, {
      ucfirst: StringFn.ucfirst
    }));
    this.$('.body').html(rtpl);
    this.$('header i.fa').remove();
    return this;
  };

  BooleanFacet.prototype.update = function(newOptions) {
    return this.model.set('options', newOptions);
  };

  BooleanFacet.prototype.reset = function() {
    return this.render();
  };

  return BooleanFacet;

})(Views.Facet);

module.exports = BooleanFacet;


},{"../../../jade/facets/boolean.body.jade":37,"../../models/boolean":21,"./main":34,"hilib/src/utils/string":12}],31:[function(require,module,exports){
var DateFacet, Models, StringFn, Views, tpl,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

StringFn = require('hilib/src/utils/string');

Models = {
  Date: require('../../models/date')
};

Views = {
  Facet: require('./main')
};

tpl = require('../../../jade/facets/date.jade');

DateFacet = (function(_super) {
  __extends(DateFacet, _super);

  function DateFacet() {
    return DateFacet.__super__.constructor.apply(this, arguments);
  }

  DateFacet.prototype.className = 'facet date';

  DateFacet.prototype.initialize = function(options) {
    DateFacet.__super__.initialize.apply(this, arguments);
    this.model = new Models.Date(options.attrs, {
      parse: true
    });
    this.listenTo(this.model, 'change:options', this.render);
    return this.render();
  };

  DateFacet.prototype.render = function() {
    var rtpl;
    DateFacet.__super__.render.apply(this, arguments);
    rtpl = tpl(_.extend(this.model.attributes, {
      ucfirst: StringFn.ucfirst
    }));
    this.$('.placeholder').html(rtpl);
    return this;
  };

  DateFacet.prototype.update = function(newOptions) {};

  DateFacet.prototype.reset = function() {};

  return DateFacet;

})(Views.Facet);

module.exports = DateFacet;


},{"../../../jade/facets/date.jade":38,"../../models/date":22,"./main":34,"hilib/src/utils/string":12}],32:[function(require,module,exports){
var Collections, Fn, ListFacet, Models, Views, bodyTpl, menuTpl, _,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

_ = require('underscore');

Fn = require('hilib/src/utils/general');

Models = {
  List: require('../../models/list')
};

Collections = {
  Options: require('../../collections/list.options')
};

Views = {
  Facet: require('./main'),
  Options: require('./list.options')
};

menuTpl = require('../../../jade/facets/list.menu.jade');

bodyTpl = require('../../../jade/facets/list.body.jade');

ListFacet = (function(_super) {
  __extends(ListFacet, _super);

  function ListFacet() {
    return ListFacet.__super__.constructor.apply(this, arguments);
  }

  ListFacet.prototype.className = 'facet list';

  ListFacet.prototype.initialize = function(options) {
    this.options = options;
    ListFacet.__super__.initialize.apply(this, arguments);
    this.model = new Models.List(this.options.attrs, {
      parse: true
    });
    return this.render();
  };

  ListFacet.prototype.render = function() {
    var body, menu;
    ListFacet.__super__.render.apply(this, arguments);
    this.collection = new Collections.Options(this.options.attrs.options, {
      parse: true
    });
    menu = menuTpl({
      model: this.model.attributes,
      selectAll: this.collection.length <= 20
    });
    body = bodyTpl(this.model.attributes);
    this.el.querySelector('header .options').innerHTML = menu;
    this.el.querySelector('.body').innerHTML = body;
    this.optionsView = new Views.Options({
      collection: this.collection,
      facetName: this.model.get('name')
    });
    this.$('.body').html(this.optionsView.el);
    this.listenTo(this.optionsView, 'filter:finished', this.renderFilteredOptionCount);
    this.listenTo(this.optionsView, 'change', (function(_this) {
      return function(data) {
        return _this.trigger('change', data);
      };
    })(this));
    return this;
  };

  ListFacet.prototype.renderFilteredOptionCount = function() {
    var collectionLength, filteredLength;
    filteredLength = this.optionsView.filtered_items.length;
    collectionLength = this.optionsView.collection.length;
    if (filteredLength === 0 || filteredLength === collectionLength) {
      this.$('header .options input[name="filter"]').addClass('nonefound');
      this.$('header small.optioncount').html('');
    } else {
      this.$('header .options input[name="filter"]').removeClass('nonefound');
      this.$('header small.optioncount').html(filteredLength + ' of ' + collectionLength);
    }
    return this;
  };

  ListFacet.prototype.events = function() {
    return _.extend({}, ListFacet.__super__.events.apply(this, arguments), {
      'keyup input[name="filter"]': function(ev) {
        return this.optionsView.filterOptions(ev.currentTarget.value);
      },
      'change header .options input[type="checkbox"][name="all"]': function(ev) {
        return this.optionsView.setCheckboxes(ev);
      },
      'click .orderby i': 'changeOrder'
    });
  };

  ListFacet.prototype.changeOrder = function(ev) {
    var $target, order, type;
    $target = $(ev.currentTarget);
    if ($target.hasClass('active')) {
      if ($target.hasClass('alpha')) {
        $target.toggleClass('fa-sort-alpha-desc');
        $target.toggleClass('fa-sort-alpha-asc');
      } else if ($target.hasClass('amount')) {
        $target.toggleClass('fa-sort-amount-desc');
        $target.toggleClass('fa-sort-amount-asc');
      }
    } else {
      this.$('.active').removeClass('active');
      $target.addClass('active');
    }
    type = $target.hasClass('alpha') ? 'alpha' : 'amount';
    order = $target.hasClass('fa-sort-' + type + '-desc') ? 'desc' : 'asc';
    return this.collection.orderBy(type + '_' + order);
  };

  ListFacet.prototype.update = function(newOptions) {
    return this.optionsView.collection.updateOptions(newOptions);
  };

  ListFacet.prototype.reset = function() {
    return this.optionsView.collection.revert();
  };

  return ListFacet;

})(Views.Facet);

module.exports = ListFacet;


},{"../../../jade/facets/list.body.jade":39,"../../../jade/facets/list.menu.jade":40,"../../collections/list.options":16,"../../models/list":24,"./list.options":33,"./main":34,"hilib/src/utils/general":11,"underscore":15}],33:[function(require,module,exports){
var Backbone, Fn, ListFacetOptions, Models, optionTpl, _,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Backbone = require('backbone');

_ = require('underscore');

Fn = require('hilib/src/utils/general');

Models = {
  List: require('../../models/list')
};

optionTpl = require('../../../jade/facets/list.option.jade');

ListFacetOptions = (function(_super) {
  __extends(ListFacetOptions, _super);

  function ListFacetOptions() {
    this.triggerChange = __bind(this.triggerChange, this);
    return ListFacetOptions.__super__.constructor.apply(this, arguments);
  }

  ListFacetOptions.prototype.className = 'container';

  ListFacetOptions.prototype.initialize = function() {
    this.showing = null;
    this.showingIncrement = 50;
    this.filtered_items = this.collection.models;
    this.listenTo(this.collection, 'sort', (function(_this) {
      return function() {
        _this.filtered_items = _this.collection.models;
        return _this.render();
      };
    })(this));
    return this.render();
  };

  ListFacetOptions.prototype.render = function() {
    var ul;
    this.showing = 50;
    ul = document.createElement('ul');
    ul.style.height = (this.filtered_items.length * 15) + 'px';
    this.el.innerHTML = '';
    this.el.appendChild(ul);
    this.appendOptions();
    return this;
  };

  ListFacetOptions.prototype.renderAll = function() {
    this.render();
    return this.appendAllOptions();
  };

  ListFacetOptions.prototype.appendOptions = function() {
    var option, tpl, _i, _len, _ref;
    tpl = '';
    _ref = this.filtered_items.slice(this.showing - this.showingIncrement, +this.showing + 1 || 9e9);
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      option = _ref[_i];
      tpl += optionTpl({
        option: option
      });
    }
    return this.$('ul').append(tpl);
  };

  ListFacetOptions.prototype.appendAllOptions = function() {
    var option, tpl, _i, _len, _ref;
    tpl = '';
    _ref = this.filtered_items.slice(this.showing);
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      option = _ref[_i];
      tpl += tpl({
        option: option
      });
    }
    return this.$('ul').append(tpl);
  };

  ListFacetOptions.prototype.events = function() {
    return {
      'click i': 'checkChanged',
      'click label': 'checkChanged',
      'scroll': 'onScroll'
    };
  };

  ListFacetOptions.prototype.onScroll = function(ev) {
    var target, topPerc;
    target = ev.currentTarget;
    topPerc = target.scrollTop / target.scrollHeight;
    if (topPerc > (this.showing / 2) / this.collection.length && this.showing < this.collection.length) {
      this.showing += this.showingIncrement;
      if (this.showing > this.collection.length) {
        this.showing = this.collection.length;
      }
      return this.appendOptions();
    }
  };

  ListFacetOptions.prototype.checkChanged = function(ev) {
    var $target, id;
    $target = ev.currentTarget.tagName === 'LABEL' ? this.$('i[data-value="' + ev.currentTarget.getAttribute('data-value') + '"]') : $(ev.currentTarget);
    $target.toggleClass('fa-square-o');
    $target.toggleClass('fa-check-square-o');
    id = $target.attr('data-value');
    this.collection.get(id).set('checked', $target.hasClass('fa-check-square-o'));
    if (this.$('i.fa-check-square-o').length === 0) {
      return this.triggerChange();
    } else {
      return Fn.timeoutWithReset(1000, (function(_this) {
        return function() {
          return _this.triggerChange();
        };
      })(this));
    }
  };

  ListFacetOptions.prototype.triggerChange = function() {
    return this.trigger('change', {
      facetValue: {
        name: this.options.facetName,
        values: _.map(this.$('i.fa-check-square-o'), function(cb) {
          return cb.getAttribute('data-value');
        })
      }
    });
  };


  /*
  	Called by parent (ListFacet) when user types in the search input
   */

  ListFacetOptions.prototype.filterOptions = function(value) {
    var re;
    re = new RegExp(value, 'i');
    this.filtered_items = this.collection.filter(function(item) {
      return re.test(item.id);
    });
    if (this.filtered_items.length === 0) {
      this.filtered_items = this.collection.models;
    }
    this.trigger('filter:finished');
    return this.render();
  };

  ListFacetOptions.prototype.setCheckboxes = function(ev) {
    var model, _i, _len, _ref;
    _ref = this.collection.models;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      model = _ref[_i];
      model.set('checked', ev.currentTarget.checked);
    }
    this.render();
    return this.triggerChange();
  };

  return ListFacetOptions;

})(Backbone.View);

module.exports = ListFacetOptions;


},{"../../../jade/facets/list.option.jade":41,"../../models/list":24,"backbone":3,"hilib/src/utils/general":11,"underscore":15}],34:[function(require,module,exports){
var $, Backbone, Facet, tpl,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Backbone = require('backbone');

$ = require('jquery');

tpl = require('../../../jade/facets/main.jade');

Facet = (function(_super) {
  __extends(Facet, _super);

  function Facet() {
    return Facet.__super__.constructor.apply(this, arguments);
  }

  Facet.prototype.render = function() {
    var rtpl;
    rtpl = tpl(this.model.attributes);
    this.$el.html(rtpl);
    return this;
  };

  Facet.prototype.events = function() {
    return {
      'click h3': 'toggleBody',
      'click header i.openclose': 'toggleMenu'
    };
  };

  Facet.prototype.toggleMenu = function(ev) {
    var $button;
    $button = $(ev.currentTarget);
    $button.toggleClass('fa-plus-square-o');
    $button.toggleClass('fa-minus-square-o');
    this.$('header .options').slideToggle(150);
    return this.$('header .options input[name="filter"]').focus();
  };

  Facet.prototype.hideMenu = function() {
    var $button;
    $button = $('header i.fa');
    $button.addClass('fa-plus-square-o');
    $button.removeClass('fa-minus-square-o');
    return this.$('header .options').slideUp(150);
  };

  Facet.prototype.toggleBody = function(ev) {
    var func;
    func = this.$('.body').is(':visible') ? this.hideBody : this.showBody;
    if (_.isFunction(ev)) {
      return func.call(this, ev);
    } else {
      return func.call(this);
    }
  };

  Facet.prototype.hideBody = function(done) {
    this.hideMenu();
    return this.$('.body').slideUp(100, (function(_this) {
      return function() {
        if (done != null) {
          done();
        }
        return _this.$('header i.fa').fadeOut(100);
      };
    })(this));
  };

  Facet.prototype.showBody = function(done) {
    return this.$('.body').slideDown(100, (function(_this) {
      return function() {
        if (done != null) {
          done();
        }
        return _this.$('header i.fa').fadeIn(100);
      };
    })(this));
  };

  Facet.prototype.update = function(newOptions) {};

  return Facet;

})(Backbone.View);

module.exports = Facet;


},{"../../../jade/facets/main.jade":42,"backbone":3,"jquery":14}],35:[function(require,module,exports){
var Models, RangeFacet, Views, bodyTpl, handleSize,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Models = {
  Range: require('../../models/range')
};

Views = {
  Facet: require('./main')
};

bodyTpl = require('../../../jade/facets/range.body.jade');

handleSize = 12;

RangeFacet = (function(_super) {
  __extends(RangeFacet, _super);

  function RangeFacet() {
    return RangeFacet.__super__.constructor.apply(this, arguments);
  }

  RangeFacet.prototype.className = 'facet range';

  RangeFacet.prototype.initialize = function(options) {
    RangeFacet.__super__.initialize.apply(this, arguments);
    this.draggingMin = false;
    this.dragginMax = false;
    this.model = new Models.Range(options.attrs, {
      parse: true
    });
    this.listenTo(this.model, 'change:options', this.render);
    return this.render();
  };

  RangeFacet.prototype.render = function() {
    var rtpl;
    RangeFacet.__super__.render.apply(this, arguments);
    rtpl = bodyTpl(this.model.attributes);
    this.$('.body').html(rtpl);
    this.$('header i.openclose').hide();
    setTimeout(((function(_this) {
      return function() {
        return _this.postRender();
      };
    })(this)), 0);
    this.$el.mouseleave((function(_this) {
      return function() {
        return _this.stopDragging();
      };
    })(this));
    return this;
  };

  RangeFacet.prototype.postRender = function() {
    var $slider;
    this.$minHandle = this.$('.min-handle');
    this.$maxHandle = this.$('.max-handle');
    this.$minValue = this.$('.min-value');
    this.$maxValue = this.$('.max-value');
    this.$bar = this.$('.bar');
    $slider = this.$('.slider');
    this.sliderWidth = $slider.width();
    this.sliderLeft = $slider.offset().left;
    this.minHandleLeft = handleSize / -2;
    this.maxHandleLeft = this.sliderWidth - (handleSize / 2);
    return this.$maxHandle.css('left', this.maxHandleLeft);
  };

  RangeFacet.prototype.events = function() {
    return {
      'mousedown .max-handle': function() {
        return this.draggingMax = true;
      },
      'mousedown .min-handle': function() {
        return this.draggingMin = true;
      },
      'mouseup': 'stopDragging',
      'mousemove': 'drag',
      'click .slider': 'moveHandle',
      'click button': 'doSearch'
    };
  };

  RangeFacet.prototype.doSearch = function(ev) {
    ev.preventDefault();
    return this.trigger('change', {
      facetValue: {
        name: this.model.get('name'),
        lowerLimit: +(this.$minValue.html() + '0101'),
        upperLimit: +(this.$maxValue.html() + '1231')
      }
    });
  };

  RangeFacet.prototype.moveHandle = function(ev) {
    var left;
    if (!(ev.target === this.el.querySelector('.slider') || ev.target === this.el.querySelector('.bar'))) {
      return;
    }
    left = ev.clientX - this.sliderLeft;
    if (Math.abs(this.$minHandle.position().left - left) < Math.abs(this.$maxHandle.position().left - left)) {
      this.$minHandle.css('left', left - (handleSize / 2));
      this.$bar.css('left', left);
      return this.updateValue(this.$minValue, left);
    } else {
      this.$maxHandle.css('left', left - (handleSize / 2));
      this.$bar.css('right', this.sliderWidth - left);
      return this.updateValue(this.$maxValue, left);
    }
  };

  RangeFacet.prototype.stopDragging = function() {
    this.draggingMin = false;
    return this.draggingMax = false;
  };

  RangeFacet.prototype.drag = function(ev) {
    var left;
    if (this.draggingMin) {
      left = ev.clientX - this.sliderLeft;
      this.minHandleLeft = left - (handleSize / 2);
      if ((-1 < left && left <= this.sliderWidth) && this.maxHandleLeft > this.minHandleLeft) {
        this.$minHandle.css('left', this.minHandleLeft);
        this.$bar.css('left', left);
        this.updateValue(this.$minValue, left);
      }
    }
    if (this.draggingMax) {
      left = ev.clientX - this.sliderLeft;
      this.maxHandleLeft = left - (handleSize / 2);
      if ((-1 < left && left <= this.sliderWidth) && this.maxHandleLeft > this.minHandleLeft) {
        this.$maxHandle.css('left', this.maxHandleLeft);
        this.$bar.css('right', this.sliderWidth - left);
        return this.updateValue(this.$maxValue, left);
      }
    }
  };

  RangeFacet.prototype.updateValue = function($el, left) {
    var ll, ul, value;
    this.$('button').show();
    ll = this.model.get('options').lowerLimit;
    ul = this.model.get('options').upperLimit;
    value = Math.floor((left / this.sliderWidth * (ul - ll)) + ll);
    return $el.html(value);
  };

  RangeFacet.prototype.getLeftPosFromYear = function(year) {
    var left, ll, ul;
    ll = this.model.get('options').lowerLimit;
    ul = this.model.get('options').upperLimit;
    left = ((year - ll) / (ul - ll)) * this.sliderWidth;
    return Math.floor(left);
  };

  RangeFacet.prototype.setMinValue = function(year) {
    var left;
    left = this.getLeftPosFromYear(year);
    this.$minHandle.css('left', left);
    this.$minValue.html(year);
    return this.$bar.css('left', left);
  };

  RangeFacet.prototype.setMaxValue = function(year) {
    var left;
    left = this.getLeftPosFromYear(year);
    this.$maxHandle.css('left', left);
    this.$maxValue.html(year);
    return this.$bar.css('right', this.sliderWidth - left);
  };

  RangeFacet.prototype.update = function(newOptions) {
    if (_.isArray(newOptions)) {
      newOptions = newOptions[0];
    }
    this.setMinValue(+(newOptions.lowerLimit + '').substr(0, 4));
    this.setMaxValue(+(newOptions.upperLimit + '').substr(0, 4));
    return this.$('button').hide();
  };

  RangeFacet.prototype.reset = function() {};

  return RangeFacet;

})(Views.Facet);

module.exports = RangeFacet;


},{"../../../jade/facets/range.body.jade":43,"../../models/range":27,"./main":34}],36:[function(require,module,exports){
var Models, SearchView, Views, bodyTpl, config, menuTpl, _,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

_ = require('underscore');

config = require('../config');

Models = {
  Search: require('../models/search')
};

Views = {
  Facet: require('./facets/main')
};

menuTpl = require('../../jade/facets/search.menu.jade');

bodyTpl = require('../../jade/facets/search.body.jade');

SearchView = (function(_super) {
  __extends(SearchView, _super);

  function SearchView() {
    return SearchView.__super__.constructor.apply(this, arguments);
  }

  SearchView.prototype.className = 'facet search';

  SearchView.prototype.initialize = function(options) {
    SearchView.__super__.initialize.apply(this, arguments);
    this.model = new Models.Search(config.textSearchOptions);
    this.listenTo(this.model, 'change', (function(_this) {
      return function() {
        return _this.trigger('change', _this.model.queryData());
      };
    })(this));
    return this.render();
  };

  SearchView.prototype.render = function() {
    var body, menu;
    SearchView.__super__.render.apply(this, arguments);
    menu = menuTpl({
      model: this.model
    });
    body = bodyTpl({
      model: this.model
    });
    this.$('.options').html(menu);
    this.$('.body').html(body);
    return this;
  };

  SearchView.prototype.events = function() {
    return _.extend({}, SearchView.__super__.events.apply(this, arguments), {
      'click button': function(ev) {
        return ev.preventDefault();
      },
      'click button.active': 'search',
      'keyup input': 'activateSearchButton',
      'change input[type="checkbox"]': 'checkboxChanged'
    });
  };

  SearchView.prototype.checkboxChanged = function(ev) {
    var attr, cb, checkedArray, _i, _len, _ref;
    if (attr = ev.currentTarget.getAttribute('data-attr')) {
      if (attr === 'searchInTranscriptions') {
        this.$('ul.textlayers').toggle(ev.currentTarget.checked);
      }
      this.model.set(attr, ev.currentTarget.checked);
    } else if (attr = ev.currentTarget.getAttribute('data-attr-array')) {
      checkedArray = [];
      _ref = this.el.querySelectorAll('[data-attr-array="' + attr + '"]');
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        cb = _ref[_i];
        if (cb.checked) {
          checkedArray.push(cb.getAttribute('data-value'));
        }
      }
      this.model.set(attr, checkedArray);
    }
    return this.activateSearchButton(true);
  };

  SearchView.prototype.activateSearchButton = function(checkboxChanged) {
    var inputValue;
    if (checkboxChanged == null) {
      checkboxChanged = false;
    }
    if (checkboxChanged.hasOwnProperty('target')) {
      checkboxChanged = false;
    }
    inputValue = this.el.querySelector('input[name="search"]').value;
    if (inputValue.length > 1 && (this.model.get('term') !== inputValue || checkboxChanged)) {
      return this.$('button').addClass('active');
    } else {
      return this.$('button').removeClass('active');
    }
  };

  SearchView.prototype.search = function(ev) {
    var $search, inputValue;
    ev.preventDefault();
    this.$('button').removeClass('active');
    $search = this.$('input[name="search"]');
    $search.addClass('loading');
    inputValue = this.el.querySelector('input[name="search"]').value;
    return this.model.set('term', inputValue);
  };

  SearchView.prototype.update = function() {
    return this.$('input[name="search"]').removeClass('loading');
  };

  SearchView.prototype.reset = function() {
    return this.render();
  };

  return SearchView;

})(Views.Facet);

module.exports = SearchView;


},{"../../jade/facets/search.body.jade":44,"../../jade/facets/search.menu.jade":45,"../config":18,"../models/search":28,"./facets/main":34,"underscore":15}],37:[function(require,module,exports){
var jade = require("jade/runtime");

module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};
var locals_ = (locals || {}),options = locals_.options,ucfirst = locals_.ucfirst;
buf.push("<ul>");
// iterate options
;(function(){
  var $$obj = options;
  if ('number' == typeof $$obj.length) {

    for (var $index = 0, $$l = $$obj.length; $index < $$l; $index++) {
      var option = $$obj[$index];

buf.push("<li><div class=\"row span6\"><div class=\"cell span5\"><i" + (jade.attr("data-value", option.name, true, false)) + (jade.cls([option.checked?'fa fa-check-square-o':'fa fa-square-o'], [true])) + "></i><label" + (jade.attr("data-value", option.name, true, false)) + ">" + (jade.escape(null == (jade.interp = ucfirst(option.name)) ? "" : jade.interp)) + "</label></div><div class=\"cell span1 alignright\"><div class=\"count\">" + (jade.escape(null == (jade.interp = option.count) ? "" : jade.interp)) + "</div></div></div></li>");
    }

  } else {
    var $$l = 0;
    for (var $index in $$obj) {
      $$l++;      var option = $$obj[$index];

buf.push("<li><div class=\"row span6\"><div class=\"cell span5\"><i" + (jade.attr("data-value", option.name, true, false)) + (jade.cls([option.checked?'fa fa-check-square-o':'fa fa-square-o'], [true])) + "></i><label" + (jade.attr("data-value", option.name, true, false)) + ">" + (jade.escape(null == (jade.interp = ucfirst(option.name)) ? "" : jade.interp)) + "</label></div><div class=\"cell span1 alignright\"><div class=\"count\">" + (jade.escape(null == (jade.interp = option.count) ? "" : jade.interp)) + "</div></div></div></li>");
    }

  }
}).call(this);

buf.push("</ul>");;return buf.join("");
};
},{"jade/runtime":13}],38:[function(require,module,exports){
var jade = require("jade/runtime");

module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};
var locals_ = (locals || {}),name = locals_.name,title = locals_.title,options = locals_.options;
buf.push("<header><h3" + (jade.attr("data-name", name, true, false)) + ">" + (jade.escape(null == (jade.interp = title) ? "" : jade.interp)) + "</h3></header><div class=\"body\"><label>From:</label><select>");
// iterate options
;(function(){
  var $$obj = options;
  if ('number' == typeof $$obj.length) {

    for (var $index = 0, $$l = $$obj.length; $index < $$l; $index++) {
      var option = $$obj[$index];

buf.push("<option>" + (jade.escape(null == (jade.interp = option) ? "" : jade.interp)) + "</option>");
    }

  } else {
    var $$l = 0;
    for (var $index in $$obj) {
      $$l++;      var option = $$obj[$index];

buf.push("<option>" + (jade.escape(null == (jade.interp = option) ? "" : jade.interp)) + "</option>");
    }

  }
}).call(this);

buf.push("</select><label>To:</label><select>");
// iterate options.reverse()
;(function(){
  var $$obj = options.reverse();
  if ('number' == typeof $$obj.length) {

    for (var $index = 0, $$l = $$obj.length; $index < $$l; $index++) {
      var option = $$obj[$index];

buf.push("<option>" + (jade.escape(null == (jade.interp = option) ? "" : jade.interp)) + "</option>");
    }

  } else {
    var $$l = 0;
    for (var $index in $$obj) {
      $$l++;      var option = $$obj[$index];

buf.push("<option>" + (jade.escape(null == (jade.interp = option) ? "" : jade.interp)) + "</option>");
    }

  }
}).call(this);

buf.push("</select></div>");;return buf.join("");
};
},{"jade/runtime":13}],39:[function(require,module,exports){
var jade = require("jade/runtime");

module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};

buf.push("<ul></ul>");;return buf.join("");
};
},{"jade/runtime":13}],40:[function(require,module,exports){
var jade = require("jade/runtime");

module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};
var locals_ = (locals || {}),selectAll = locals_.selectAll;
buf.push("<input type=\"checkbox\" name=\"all\"" + (jade.attr("style", selectAll?'visibility:visible':'visibility:hidden', true, false)) + "/><input type=\"text\" name=\"filter\"/><small class=\"optioncount\"></small><div class=\"orderby\"><i class=\"alpha fa fa-sort-alpha-asc\"></i><i class=\"amount active fa fa-sort-amount-desc\"></i></div>");;return buf.join("");
};
},{"jade/runtime":13}],41:[function(require,module,exports){
var jade = require("jade/runtime");

module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};
var locals_ = (locals || {}),option = locals_.option;
buf.push("<li" + (jade.attr("data-count", option.get('count'), true, false)) + "><i" + (jade.attr("data-value", option.id, true, false)) + (jade.cls([option.get('checked')?'fa fa-check-square-o':'fa fa-square-o'], [true])) + "></i><label" + (jade.attr("data-value", option.id, true, false)) + ">" + (null == (jade.interp = option.id === ':empty' ? '<em>(empty)</em>' : option.id) ? "" : jade.interp) + "</label><div class=\"count\">" + (jade.escape(null == (jade.interp = option.get('count') === 0 ? option.get('total') : option.get('count')) ? "" : jade.interp)) + "</div></li>");;return buf.join("");
};
},{"jade/runtime":13}],42:[function(require,module,exports){
var jade = require("jade/runtime");

module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};
var locals_ = (locals || {}),name = locals_.name,title = locals_.title;
buf.push("<div class=\"placeholder pad4\"><header><h3" + (jade.attr("data-name", name, true, false)) + ">" + (jade.escape(null == (jade.interp = title) ? "" : jade.interp)) + "</h3><i class=\"openclose fa fa-plus-square-o\"></i><div class=\"options\"></div></header><div class=\"body\"></div></div>");;return buf.join("");
};
},{"jade/runtime":13}],43:[function(require,module,exports){
var jade = require("jade/runtime");

module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};
var locals_ = (locals || {}),options = locals_.options;
buf.push("<div class=\"slider\"><div class=\"min-handle\"></div><div class=\"max-handle\"></div><div class=\"bar\">&nbsp;</div><div class=\"min-value\">" + (jade.escape(null == (jade.interp = options.lowerLimit) ? "" : jade.interp)) + "</div><div class=\"max-value\">" + (jade.escape(null == (jade.interp = options.upperLimit) ? "" : jade.interp)) + "</div><button>Search?</button></div>");;return buf.join("");
};
},{"jade/runtime":13}],44:[function(require,module,exports){
var jade = require("jade/runtime");

module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};

buf.push("<div class=\"row span4 align middle\"><div class=\"cell span3\"><div class=\"padr4\"><input type=\"text\" name=\"search\"/></div></div><div class=\"cell span1\"><button class=\"search\">Search</button></div></div>");;return buf.join("");
};
},{"jade/runtime":13}],45:[function(require,module,exports){
var jade = require("jade/runtime");

module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};
var locals_ = (locals || {}),model = locals_.model;
buf.push("<div class=\"row span2 align middle\"><div class=\"cell span1 casesensitive\"><input id=\"cb_casesensitive\" type=\"checkbox\" name=\"cb_casesensitive\" data-attr=\"caseSensitive\"/><label for=\"cb_casesensitive\">Match case</label></div><div class=\"cell span1 fuzzy\"><input id=\"cb_fuzzy\" type=\"checkbox\" name=\"cb_fuzzy\" data-attr=\"fuzzy\"/><label for=\"cb_fuzzy\">Fuzzy</label></div></div>");
if ( model.has('searchInAnnotations') || model.has('searchInTranscriptions'))
{
buf.push("<h4>Search</h4><ul class=\"searchins\">");
if ( model.has('searchInTranscriptions'))
{
buf.push("<li class=\"searchin\"><input id=\"cb_searchin_transcriptions\" type=\"checkbox\" data-attr=\"searchInTranscriptions\"" + (jade.attr("checked", model.get('searchInTranscriptions'), true, false)) + "/><label for=\"cb_searchin_transcriptions\">Transcriptions</label>");
if ( model.has('textLayers'))
{
buf.push("<ul class=\"textlayers\">");
// iterate model.get('textLayers')
;(function(){
  var $$obj = model.get('textLayers');
  if ('number' == typeof $$obj.length) {

    for (var $index = 0, $$l = $$obj.length; $index < $$l; $index++) {
      var textLayer = $$obj[$index];

buf.push("<li class=\"textlayer\"><input" + (jade.attr("id", 'cb_textlayer'+textLayer, true, false)) + " type=\"checkbox\" data-attr-array=\"textLayers\"" + (jade.attr("data-value", textLayer, true, false)) + " checked=\"checked\"/><label" + (jade.attr("for", 'cb_textlayer'+textLayer, true, false)) + ">" + (jade.escape(null == (jade.interp = textLayer) ? "" : jade.interp)) + "</label></li>");
    }

  } else {
    var $$l = 0;
    for (var $index in $$obj) {
      $$l++;      var textLayer = $$obj[$index];

buf.push("<li class=\"textlayer\"><input" + (jade.attr("id", 'cb_textlayer'+textLayer, true, false)) + " type=\"checkbox\" data-attr-array=\"textLayers\"" + (jade.attr("data-value", textLayer, true, false)) + " checked=\"checked\"/><label" + (jade.attr("for", 'cb_textlayer'+textLayer, true, false)) + ">" + (jade.escape(null == (jade.interp = textLayer) ? "" : jade.interp)) + "</label></li>");
    }

  }
}).call(this);

buf.push("</ul>");
}
buf.push("</li>");
}
if ( model.has('searchInAnnotations'))
{
buf.push("<li class=\"searchin\"><input id=\"cb_searchin_annotations\" type=\"checkbox\" data-attr=\"searchInAnnotations\"" + (jade.attr("checked", model.get('searchInAnnotations'), true, false)) + "/><label for=\"cb_searchin_annotations\">Annotations</label></li>");
}
buf.push("</ul>");
};return buf.join("");
};
},{"jade/runtime":13}],46:[function(require,module,exports){
var jade = require("jade/runtime");

module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};

buf.push("<div class=\"overlay\"><div><i class=\"fa fa-spinner fa-spin fa-2x\"></i></div></div><div class=\"faceted-search\"><i class=\"fa fa-compress\"></i><form><div class=\"search-placeholder\"></div><div class=\"facets\"><div class=\"loader\"><h4>Loading facets...</h4><br/><i class=\"fa fa-spinner fa-spin fa-2x\"></i></div></div></form></div>");;return buf.join("");
};
},{"jade/runtime":13}],47:[function(require,module,exports){
module.exports=require(1)
},{"underscore":50}],48:[function(require,module,exports){
module.exports=require(13)
},{"fs":2}],49:[function(require,module,exports){
module.exports=require(5)
},{}],50:[function(require,module,exports){
module.exports=require(6)
},{}],51:[function(require,module,exports){
var Backbone, Base, Pubsub,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Backbone = require('backbone');

Pubsub = require('../mixins/pubsub');

Base = (function(_super) {
  __extends(Base, _super);

  function Base() {
    return Base.__super__.constructor.apply(this, arguments);
  }

  Base.prototype.initialize = function() {
    return _.extend(this, Pubsub);
  };

  Base.prototype.removeById = function(id) {
    var model;
    model = this.get(id);
    return this.remove(model);
  };

  Base.prototype.has = function(model) {
    if (this.get(model.cid) != null) {
      return true;
    } else {
      return false;
    }
  };

  return Base;

})(Backbone.Collection);

module.exports = Base;


},{"../mixins/pubsub":63,"backbone":47}],52:[function(require,module,exports){
var $, defaultOptions, token;

$ = require('jquery');

$.support.cors = true;

token = require('./token');

defaultOptions = {
  token: true
};

module.exports = {
  get: function(args, options) {
    if (options == null) {
      options = {};
    }
    return this.fire('get', args, options);
  },
  post: function(args, options) {
    if (options == null) {
      options = {};
    }
    return this.fire('post', args, options);
  },
  put: function(args, options) {
    if (options == null) {
      options = {};
    }
    return this.fire('put', args, options);
  },
  poll: function(args) {
    var done, dopoll, testFn, url;
    url = args.url, testFn = args.testFn, done = args.done;
    dopoll = (function(_this) {
      return function() {
        var xhr;
        xhr = _this.get({
          url: url
        });
        return xhr.done(function(data, textStatus, jqXHR) {
          if (testFn(data)) {
            return done(data, textStatus, jqXHR);
          } else {
            return setTimeout(dopoll, 5000);
          }
        });
      };
    })(this);
    return dopoll();
  },
  fire: function(type, args, options) {
    var ajaxArgs;
    options = $.extend({}, defaultOptions, options);
    ajaxArgs = {
      type: type,
      dataType: 'json',
      contentType: 'application/json; charset=utf-8',
      processData: false,
      crossDomain: true
    };
    if (options.token && (token.get() != null)) {
      ajaxArgs.beforeSend = (function(_this) {
        return function(xhr) {
          return xhr.setRequestHeader('Authorization', "" + (token.getType()) + " " + (token.get()));
        };
      })(this);
    }
    return $.ajax($.extend(ajaxArgs, args));
  }
};


},{"./token":56,"jquery":49}],53:[function(require,module,exports){
var Async, _;

_ = require('underscore');

Async = (function() {
  function Async(names) {
    var name, _i, _len;
    if (names == null) {
      names = [];
    }
    _.extend(this, Backbone.Events);
    this.callbacksCalled = {};
    for (_i = 0, _len = names.length; _i < _len; _i++) {
      name = names[_i];
      this.callbacksCalled[name] = false;
    }
  }

  Async.prototype.called = function(name, data) {
    if (data == null) {
      data = true;
    }
    this.callbacksCalled[name] = data;
    if (_.every(this.callbacksCalled, function(called) {
      return called !== false;
    })) {
      return this.trigger('ready', this.callbacksCalled);
    }
  };

  return Async;

})();

module.exports = Async;


},{"underscore":50}],54:[function(require,module,exports){
var History;

History = (function() {
  function History() {}

  History.prototype.history = [];

  History.prototype.update = function() {
    if (window.location.pathname !== '/login') {
      this.history.push(window.location.pathname);
    }
    return sessionStorage.setItem('history', JSON.stringify(this.history));
  };

  History.prototype.clear = function() {
    return sessionStorage.removeItem('history');
  };

  History.prototype.last = function() {
    return this.history[this.history.length - 1];
  };

  return History;

})();

module.exports = new History();


},{}],55:[function(require,module,exports){
var ModalManager;

ModalManager = (function() {
  function ModalManager() {
    this.modals = [];
  }

  ModalManager.prototype.add = function(modal) {
    var arrLength, m, _i, _len, _ref;
    _ref = this.modals;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      m = _ref[_i];
      m.$('.overlay').css('opacity', '0.2');
    }
    arrLength = this.modals.push(modal);
    modal.$('.overlay').css('z-index', 10000 + (arrLength * 2) - 1);
    modal.$('.modalbody').css('z-index', 10000 + (arrLength * 2));
    return $('body').prepend(modal.$el);
  };

  ModalManager.prototype.remove = function(modal) {
    var index;
    index = this.modals.indexOf(modal);
    this.modals.splice(index, 1);
    if (this.modals.length > 0) {
      this.modals[this.modals.length - 1].$('.overlay').css('opacity', '0.7');
    }
    modal.trigger('removed');
    modal.off();
    return modal.remove();
  };

  return ModalManager;

})();

module.exports = new ModalManager();


},{}],56:[function(require,module,exports){
var Token;

Token = (function() {
  function Token() {}

  Token.prototype.token = null;

  Token.prototype.set = function(token, type) {
    this.token = token;
    if (type == null) {
      type = 'SimpleAuth';
    }
    sessionStorage.setItem('huygens_token_type', type);
    return sessionStorage.setItem('huygens_token', this.token);
  };

  Token.prototype.getType = function() {
    return sessionStorage.getItem('huygens_token_type');
  };

  Token.prototype.get = function() {
    if (this.token == null) {
      this.token = sessionStorage.getItem('huygens_token');
    }
    return this.token;
  };

  Token.prototype.clear = function() {
    sessionStorage.removeItem('huygens_token');
    return sessionStorage.removeItem('huygens_token_type');
  };

  return Token;

})();

module.exports = new Token();


},{}],57:[function(require,module,exports){
var StringFn, ViewManager;

StringFn = require('../utils/string');

ViewManager = (function() {
  var cachedViews, currentView;

  function ViewManager() {}

  currentView = null;

  cachedViews = {};

  ViewManager.prototype.show = function($el, View, options) {
    var el, viewHashCode;
    if (options == null) {
      options = {};
    }
    if (options.append == null) {
      options.append = false;
    }
    if (options.prepend == null) {
      options.prepend = false;
    }
    if (options.cache == null) {
      options.cache = true;
    }
    viewHashCode = StringFn.hashCode(View.toString() + JSON.stringify(options));
    if (!(cachedViews.hasOwnProperty(viewHashCode) && options.cache)) {
      cachedViews[viewHashCode] = new View(options);
    }
    currentView = cachedViews[viewHashCode];
    el = $el[0];
    if (!(options.append || options.prepend)) {
      el.innerHTML = '';
    }
    if (options.prepend && (el.firstChild != null)) {
      el.insertBefore(currentView.el, el.firstChild);
    } else {
      el.appendChild(currentView.el);
    }
    return currentView;
  };

  return ViewManager;

})();

module.exports = new ViewManager();


},{"../utils/string":69}],58:[function(require,module,exports){
var Backbone, Fn, mainTpl, optionMixin;

Backbone = require('backbone');

Fn = require('../../utils/general');

optionMixin = require('./options');

mainTpl = require('./main.jade');

module.exports = {
  dropdownInitialize: function() {
    var models, _base, _base1, _base2, _base3, _ref, _ref1;
    if ((_base = this.options).config == null) {
      _base.config = {};
    }
    this.data = (_ref = this.options.config.data) != null ? _ref : {};
    this.settings = (_ref1 = this.options.config.settings) != null ? _ref1 : {};
    if ((_base1 = this.settings).mutable == null) {
      _base1.mutable = false;
    }
    if ((_base2 = this.settings).editable == null) {
      _base2.editable = false;
    }
    if ((_base3 = this.settings).defaultAdd == null) {
      _base3.defaultAdd = true;
    }
    this.selected = null;
    if (this.data instanceof Backbone.Collection) {
      this.collection = this.data.clone();
    } else if (_.isArray(this.data) && _.isString(this.data[0])) {
      models = this.strArray2optionArray(this.data);
      this.collection = new Backbone.Collection(models);
    } else {
      console.error('No valid data passed to dropdown');
    }
    this.filtered_options = this.collection.clone();
    _.extend(this.filtered_options, optionMixin);
    if (this.settings.mutable) {
      this.listenTo(this.collection, 'add', (function(_this) {
        return function(model, collection, options) {
          _this.selected = model;
          return _this.triggerChange();
        };
      })(this));
    }
    this.listenTo(this.collection, 'add', (function(_this) {
      return function(model, collection, options) {
        _this.trigger('change:data', _this.collection.models);
        return _this.filtered_options.add(model);
      };
    })(this));
    this.listenTo(this.filtered_options, 'add', this.renderOptions);
    this.listenTo(this.filtered_options, 'reset', this.renderOptions);
    this.listenTo(this.filtered_options, 'currentOption:change', (function(_this) {
      return function(model) {
        return _this.$('li[data-id="' + model.id + '"]').addClass('active');
      };
    })(this));
    return this.on('change', (function(_this) {
      return function() {
        return _this.resetOptions();
      };
    })(this));
  },
  dropdownRender: function(tpl) {
    var rtpl;
    if (this.preDropdownRender != null) {
      this.preDropdownRender();
    }
    rtpl = tpl({
      viewId: this.cid,
      selected: this.selected,
      settings: this.settings
    });
    this.$el.html(rtpl);
    this.$optionlist = this.$('ul.list');
    this.renderOptions();
    this.$('input').focus();
    $('body').click((function(_this) {
      return function(ev) {
        if (!(_this.el === ev.target || Fn.isDescendant(_this.el, ev.target))) {
          return _this.hideOptionlist();
        }
      };
    })(this));
    if (this.settings.inputClass != null) {
      this.$('input').addClass(this.settings.inputClass);
    }
    if (this.postDropdownRender != null) {
      this.postDropdownRender();
    }
    return this;
  },
  renderOptions: function() {
    var rtpl;
    rtpl = mainTpl({
      collection: this.filtered_options,
      selected: this.selected
    });
    return this.$optionlist.html(rtpl);
  },
  dropdownEvents: function() {
    var evs;
    evs = {
      'click .caret': 'toggleList',
      'click li.list': 'addSelected'
    };
    evs['keyup input[data-view-id="' + this.cid + '"]'] = 'onKeyup';
    evs['keydown input[data-view-id="' + this.cid + '"]'] = 'onKeydown';
    return evs;
  },
  toggleList: function(ev) {
    this.$optionlist.toggle();
    return this.$('input').focus();
  },
  onKeydown: function(ev) {
    if (ev.keyCode === 38 && this.$optionlist.is(':visible')) {
      return ev.preventDefault();
    }
  },
  onKeyup: function(ev) {
    this.$('.active').removeClass('active');
    if (ev.keyCode === 38) {
      this.$optionlist.show();
      return this.filtered_options.prev();
    } else if (ev.keyCode === 40) {
      this.$optionlist.show();
      return this.filtered_options.next();
    } else if (ev.keyCode === 13) {
      return this.addSelected(ev);
    } else if (ev.keyCode === 27) {
      return this.$optionlist.hide();
    } else {
      return this.filter(ev.currentTarget.value);
    }
  },
  destroy: function() {
    $('body').off('click');
    return this.remove();
  },
  resetOptions: function() {
    this.filtered_options.reset(this.collection.reject((function(_this) {
      return function(model) {
        return _this.selected.get(model.id) != null;
      };
    })(this)));
    this.filtered_options.resetCurrentOption();
    return this.hideOptionlist();
  },
  hideOptionlist: function() {
    return this.$optionlist.hide();
  },
  filter: function(value) {
    var models, re;
    if (this.settings.editable) {
      this.$('button.edit').removeClass('visible');
    }
    this.resetOptions();
    if (value.length > 1) {
      value = Fn.escapeRegExp(value);
      re = new RegExp(value, 'i');
      models = this.collection.filter(function(model) {
        return re.test(model.get('title'));
      });
      if (models.length > 0) {
        this.filtered_options.reset(models);
        this.$optionlist.show();
      }
    }
    if (this.postDropdownFilter != null) {
      return this.postDropdownFilter(models);
    }
  },
  strArray2optionArray: function(strArray) {
    return _.map(strArray, function(item) {
      return {
        id: item,
        title: item
      };
    });
  }
};


},{"../../utils/general":67,"./main.jade":59,"./options":60,"backbone":47}],59:[function(require,module,exports){
var jade = require("jade/runtime");

module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};
var locals_ = (locals || {}),collection = locals_.collection,selected = locals_.selected;
// iterate collection.models
;(function(){
  var $$obj = collection.models;
  if ('number' == typeof $$obj.length) {

    for (var $index = 0, $$l = $$obj.length; $index < $$l; $index++) {
      var model = $$obj[$index];

buf.push("<li" + (jade.attr("data-id", model.id, true, false)) + (jade.cls(['list',selected===model?'active':''], [null,true])) + ">" + (jade.escape(null == (jade.interp = model.get('title')) ? "" : jade.interp)) + "</li>");
    }

  } else {
    var $$l = 0;
    for (var $index in $$obj) {
      $$l++;      var model = $$obj[$index];

buf.push("<li" + (jade.attr("data-id", model.id, true, false)) + (jade.cls(['list',selected===model?'active':''], [null,true])) + ">" + (jade.escape(null == (jade.interp = model.get('title')) ? "" : jade.interp)) + "</li>");
    }

  }
}).call(this);
;return buf.join("");
};
},{"jade/runtime":48}],60:[function(require,module,exports){
define(function(require) {
  return {
    dropdownOptionsInitialize: function() {
      return this.resetCurrentOption();
    },
    resetCurrentOption: function() {
      return this.currentOption = null;
    },
    setCurrentOption: function(model) {
      this.currentOption = model;
      return this.trigger('currentOption:change', this.currentOption);
    },
    prev: function() {
      var previousIndex;
      previousIndex = this.indexOf(this.currentOption) - 1;
      if (previousIndex < 0) {
        previousIndex = this.length - 1;
      }
      return this.setCurrentOption(this.at(previousIndex));
    },
    next: function() {
      var nextIndex;
      nextIndex = this.indexOf(this.currentOption) + 1;
      if (nextIndex > (this.length - 1)) {
        nextIndex = 0;
      }
      return this.setCurrentOption(this.at(nextIndex));
    }
  };
});


},{}],61:[function(require,module,exports){
module.exports = function(attrs) {
  return {
    changedSinceLastSave: null,
    initChangedSinceLastSave: function() {
      var attr, _i, _len, _results;
      this.on('sync', (function(_this) {
        return function() {
          return _this.changedSinceLastSave = null;
        };
      })(this));
      _results = [];
      for (_i = 0, _len = attrs.length; _i < _len; _i++) {
        attr = attrs[_i];
        _results.push(this.on("change:" + attr, (function(_this) {
          return function(model, options) {
            if (_this.changedSinceLastSave == null) {
              return _this.changedSinceLastSave = model.previousAttributes()[attr];
            }
          };
        })(this)));
      }
      return _results;
    },
    cancelChanges: function() {
      var attr, _i, _len;
      for (_i = 0, _len = attrs.length; _i < _len; _i++) {
        attr = attrs[_i];
        this.set(attr, this.changedSinceLastSave);
      }
      return this.changedSinceLastSave = null;
    }
  };
};


},{}],62:[function(require,module,exports){
var ajax, token;

ajax = require('../managers/ajax');

token = require('../managers/token');

module.exports = {
  syncOverride: function(method, model, options) {
    var data, defaults, jqXHR, name, obj, _i, _len, _ref;
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
    defaults = {
      url: this.url(),
      dataType: 'text',
      data: data
    };
    options = $.extend(defaults, options);
    if (method === 'create') {
      ajax.token = token.get();
      jqXHR = ajax.post(options);
      jqXHR.done((function(_this) {
        return function(data, textStatus, jqXHR) {
          var xhr;
          if (jqXHR.status === 201) {
            xhr = ajax.get({
              url: jqXHR.getResponseHeader('Location')
            });
            return xhr.done(function(data, textStatus, jqXHR) {
              _this.trigger('sync');
              return options.success(data);
            });
          }
        };
      })(this));
      return jqXHR.fail((function(_this) {
        return function(response) {
          return console.log('fail', response);
        };
      })(this));
    } else if (method === 'update') {
      ajax.token = token.get();
      jqXHR = ajax.put(options);
      jqXHR.done((function(_this) {
        return function(response) {
          return _this.trigger('sync');
        };
      })(this));
      return jqXHR.fail((function(_this) {
        return function(response) {
          return console.log('fail', response);
        };
      })(this));
    }
  }
};


},{"../managers/ajax":52,"../managers/token":56}],63:[function(require,module,exports){
var Backbone;

Backbone = require('backbone');

module.exports = {
  subscribe: function(ev, done) {
    return this.listenTo(Backbone, ev, done);
  },
  publish: function() {
    return Backbone.trigger.apply(Backbone, arguments);
  }
};


},{"backbone":47}],64:[function(require,module,exports){
var Fn,
  __hasProp = {}.hasOwnProperty;

Fn = require('../utils/general');

module.exports = {
  validate: function(attrs, options) {
    var attr, flatAttrs, invalids, settings, _ref;
    invalids = [];
    flatAttrs = Fn.flattenObject(attrs);
    _ref = this.validation;
    for (attr in _ref) {
      if (!__hasProp.call(_ref, attr)) continue;
      settings = _ref[attr];
      if (!settings.required && flatAttrs[attr].length !== 0) {
        if ((settings.pattern != null) && settings.pattern === 'number') {
          if (!/^\d+$/.test(flatAttrs[attr])) {
            invalids.push({
              attr: attr,
              msg: 'Please enter a valid number.'
            });
          }
        }
      } else if (settings.required && flatAttrs[attr].length === 0) {
        invalids.push({
          attr: attr,
          msg: 'Please enter a value.'
        });
      }
    }
    if (invalids.length) {
      return invalids;
    } else {

    }
  },
  validator: function(args) {
    var invalid, listenToObject, valid;
    valid = args.valid, invalid = args.invalid;
    if (this.model != null) {
      listenToObject = this.model;
      this.model.validate = this.validate;
    } else if (this.collection != null) {
      listenToObject = this.collection;
      this.collection.each((function(_this) {
        return function(model) {
          return model.validate = _this.validate;
        };
      })(this));
      this.listenTo(this.collection, 'add', (function(_this) {
        return function(model, collection, options) {
          return model.validate = _this.validate;
        };
      })(this));
    } else {
      console.error("Validator mixin: no model or collection attached to view!");
      return;
    }
    this.invalidAttrs = {};
    this.listenTo(listenToObject, 'invalid', (function(_this) {
      return function(model, errors, options) {
        return _.each(errors, function(error) {
          if (!_.size(_this.invalidAttrs)) {
            _this.trigger('validator:invalidated');
          }
          _this.invalidAttrs[error.attr] = error;
          return invalid(model, error.attr, error.msg);
        });
      };
    })(this));
    if (valid != null) {
      return this.listenTo(listenToObject, 'change', (function(_this) {
        return function(model, options) {
          var attr, flatChangedAttrs, _results;
          flatChangedAttrs = Fn.flattenObject(model.changedAttributes());
          _results = [];
          for (attr in flatChangedAttrs) {
            if (!__hasProp.call(flatChangedAttrs, attr)) continue;
            if (_this.invalidAttrs.hasOwnProperty(attr)) {
              valid(model, attr);
              delete _this.invalidAttrs[attr];
              if (!_.size(_this.invalidAttrs)) {
                _results.push(_this.trigger('validator:validated'));
              } else {
                _results.push(void 0);
              }
            } else {
              _results.push(void 0);
            }
          }
          return _results;
        };
      })(this));
    }
  }
};


},{"../utils/general":67}],65:[function(require,module,exports){
define(function(require) {
  var DOM;
  return DOM = function(el) {
    if (_.isString(el)) {
      el = document.querySelector(el);
    }
    return {
      el: el,
      q: function(query) {
        return DOM(el.querySelector(query));
      },
      find: function(query) {
        return DOM(el.querySelector(query));
      },
      findAll: function(query) {
        return DOM(el.querySelectorAll(query));
      },
      html: function(html) {
        if (html == null) {
          return el.innerHTML;
        }
        if (html.nodeType === 1 || html.nodeType === 11) {
          el.innerHTML = '';
          return el.appendChild(html);
        } else {
          return el.innerHTML = html;
        }
      },
      hide: function() {
        el.style.display = 'none';
        return this;
      },
      show: function(displayType) {
        if (displayType == null) {
          displayType = 'block';
        }
        el.style.display = displayType;
        return this;
      },
      closest: function(selector) {
        var matchesSelector;
        matchesSelector = el.matches || el.webkitMatchesSelector || el.mozMatchesSelector || el.msMatchesSelector;
        while (el) {
          if (matchesSelector.bind(el)(selector)) {
            return el;
          } else {
            el = el.parentNode;
          }
        }
      },
      append: function(childEl) {
        return el.appendChild(childEl);
      },
      prepend: function(childEl) {
        return el.insertBefore(childEl, el.firstChild);
      },

      /*
      		Native alternative to jQuery's $.offset()
      
      		http://www.quirksmode.org/js/findpos.html
       */
      position: function(parent) {
        var left, loopEl, top;
        if (parent == null) {
          parent = document.body;
        }
        left = 0;
        top = 0;
        loopEl = el;
        while ((loopEl != null) && loopEl !== parent) {
          if (this.hasDescendant(parent)) {
            break;
          }
          left += loopEl.offsetLeft;
          top += loopEl.offsetTop;
          loopEl = loopEl.offsetParent;
        }
        return {
          left: left,
          top: top
        };
      },

      /*
      		Is child el a descendant of parent el?
      
      		http://stackoverflow.com/questions/2234979/how-to-check-in-javascript-if-one-element-is-a-child-of-another
       */
      hasDescendant: function(child) {
        var node;
        node = child.parentNode;
        while (node != null) {
          if (node === el) {
            return true;
          }
          node = node.parentNode;
        }
        return false;
      },
      boundingBox: function() {
        var box;
        box = this.position();
        box.width = el.clientWidth;
        box.height = el.clientHeight;
        box.right = box.left + box.width;
        box.bottom = box.top + box.height;
        return box;
      },
      insertAfter: function(referenceElement) {
        return referenceElement.parentNode.insertBefore(el, referenceElement.nextSibling);
      },
      highlightUntil: function(endNode, highlightClass) {
        if (highlightClass == null) {
          highlightClass = 'highlight';
        }
        return {
          on: function() {
            var currentNode, filter, range, treewalker;
            range = document.createRange();
            range.setStartAfter(el);
            range.setEndBefore(endNode);
            filter = (function(_this) {
              return function(node) {
                var end, r, start;
                r = document.createRange();
                r.selectNode(node);
                start = r.compareBoundaryPoints(Range.START_TO_START, range);
                end = r.compareBoundaryPoints(Range.END_TO_START, range);
                if (start === -1 || end === 1) {
                  return NodeFilter.FILTER_SKIP;
                } else {
                  return NodeFilter.FILTER_ACCEPT;
                }
              };
            })(this);
            filter.acceptNode = filter;
            treewalker = document.createTreeWalker(range.commonAncestorContainer, NodeFilter.SHOW_ELEMENT, filter, false);
            while (treewalker.nextNode()) {
              currentNode = treewalker.currentNode;
              if ((' ' + currentNode.className + ' ').indexOf(' text ') > -1) {
                currentNode.className = currentNode.className + ' ' + highlightClass;
              }
            }
            return this;
          },
          off: function() {
            var classNames, _i, _len, _ref, _results;
            _ref = document.querySelectorAll('.' + highlightClass);
            _results = [];
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
              el = _ref[_i];
              classNames = ' ' + el.className + ' ';
              classNames = classNames.replace(' ' + highlightClass + ' ', '');
              _results.push(el.className = classNames.replace(/^\s+|\s+$/g, ''));
            }
            return _results;
          }
        };
      },
      hasClass: function(name) {
        return (' ' + el.className + ' ').indexOf(' ' + name + ' ') > -1;
      },
      addClass: function(name) {
        if (!this.hasClass(name)) {
          return el.className += ' ' + name;
        }
      },
      removeClass: function(name) {
        var names;
        names = ' ' + el.className + ' ';
        names = names.replace(' ' + name + ' ', '');
        return el.className = names.replace(/^\s+|\s+$/g, '');
      },
      toggleClass: function(name) {
        if (this.hasClass(name)) {
          return this.addClass(name);
        } else {
          return this.removeClass(name);
        }
      },
      inViewport: function() {
        var rect;
        rect = el.getBoundingClientRect();
        return rect.top >= 0 && rect.left >= 0 && rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) && rect.right <= (window.innerWidth || document.documentElement.clientWidth);
      }
    };
  };
});


},{}],66:[function(require,module,exports){
var _;

_ = require('underscore');

module.exports = function(el) {
  if (_.isString(el)) {
    el = document.querySelector(el);
  }
  return {
    el: el,
    q: function(query) {
      return DOM(el.querySelector(query));
    },
    find: function(query) {
      return DOM(el.querySelector(query));
    },
    findAll: function(query) {
      return DOM(el.querySelectorAll(query));
    },
    html: function(html) {
      if (html == null) {
        return el.innerHTML;
      }
      if (html.nodeType === 1 || html.nodeType === 11) {
        el.innerHTML = '';
        return el.appendChild(html);
      } else {
        return el.innerHTML = html;
      }
    },
    hide: function() {
      el.style.display = 'none';
      return this;
    },
    show: function(displayType) {
      if (displayType == null) {
        displayType = 'block';
      }
      el.style.display = displayType;
      return this;
    },
    closest: function(selector) {
      var matchesSelector;
      matchesSelector = el.matches || el.webkitMatchesSelector || el.mozMatchesSelector || el.msMatchesSelector;
      while (el) {
        if (matchesSelector.bind(el)(selector)) {
          return el;
        } else {
          el = el.parentNode;
        }
      }
    },
    append: function(childEl) {
      return el.appendChild(childEl);
    },
    prepend: function(childEl) {
      return el.insertBefore(childEl, el.firstChild);
    },

    /*
    		Native alternative to jQuery's $.offset()
    
    		http://www.quirksmode.org/js/findpos.html
     */
    position: function(parent) {
      var left, loopEl, top;
      if (parent == null) {
        parent = document.body;
      }
      left = 0;
      top = 0;
      loopEl = el;
      while ((loopEl != null) && loopEl !== parent) {
        if (this.hasDescendant(parent)) {
          break;
        }
        left += loopEl.offsetLeft;
        top += loopEl.offsetTop;
        loopEl = loopEl.offsetParent;
      }
      return {
        left: left,
        top: top
      };
    },

    /*
    		Is child el a descendant of parent el?
    
    		http://stackoverflow.com/questions/2234979/how-to-check-in-javascript-if-one-element-is-a-child-of-another
     */
    hasDescendant: function(child) {
      var node;
      node = child.parentNode;
      while (node != null) {
        if (node === el) {
          return true;
        }
        node = node.parentNode;
      }
      return false;
    },
    boundingBox: function() {
      var box;
      box = this.position();
      box.width = el.clientWidth;
      box.height = el.clientHeight;
      box.right = box.left + box.width;
      box.bottom = box.top + box.height;
      return box;
    },
    insertAfter: function(referenceElement) {
      return referenceElement.parentNode.insertBefore(el, referenceElement.nextSibling);
    },
    highlightUntil: function(endNode, highlightClass) {
      if (highlightClass == null) {
        highlightClass = 'highlight';
      }
      return {
        on: function() {
          var currentNode, filter, range, treewalker;
          range = document.createRange();
          range.setStartAfter(el);
          range.setEndBefore(endNode);
          filter = (function(_this) {
            return function(node) {
              var end, r, start;
              r = document.createRange();
              r.selectNode(node);
              start = r.compareBoundaryPoints(Range.START_TO_START, range);
              end = r.compareBoundaryPoints(Range.END_TO_START, range);
              if (start === -1 || end === 1) {
                return NodeFilter.FILTER_SKIP;
              } else {
                return NodeFilter.FILTER_ACCEPT;
              }
            };
          })(this);
          filter.acceptNode = filter;
          treewalker = document.createTreeWalker(range.commonAncestorContainer, NodeFilter.SHOW_ELEMENT, filter, false);
          while (treewalker.nextNode()) {
            currentNode = treewalker.currentNode;
            if ((' ' + currentNode.className + ' ').indexOf(' text ') > -1) {
              currentNode.className = currentNode.className + ' ' + highlightClass;
            }
          }
          return this;
        },
        off: function() {
          var classNames, _i, _len, _ref, _results;
          _ref = document.querySelectorAll('.' + highlightClass);
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            el = _ref[_i];
            classNames = ' ' + el.className + ' ';
            classNames = classNames.replace(' ' + highlightClass + ' ', '');
            _results.push(el.className = classNames.replace(/^\s+|\s+$/g, ''));
          }
          return _results;
        }
      };
    },
    hasClass: function(name) {
      return (' ' + el.className + ' ').indexOf(' ' + name + ' ') > -1;
    },
    addClass: function(name) {
      if (!this.hasClass(name)) {
        return el.className += ' ' + name;
      }
    },
    removeClass: function(name) {
      var names;
      names = ' ' + el.className + ' ';
      names = names.replace(' ' + name + ' ', '');
      return el.className = names.replace(/^\s+|\s+$/g, '');
    },
    toggleClass: function(name) {
      if (this.hasClass(name)) {
        return this.addClass(name);
      } else {
        return this.removeClass(name);
      }
    },
    inViewport: function() {
      var rect;
      rect = el.getBoundingClientRect();
      return rect.top >= 0 && rect.left >= 0 && rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) && rect.right <= (window.innerWidth || document.documentElement.clientWidth);
    }
  };
};


},{"underscore":50}],67:[function(require,module,exports){
var $,
  __hasProp = {}.hasOwnProperty;

$ = require('jquery');

module.exports = {
  closest: function(el, selector) {
    var matchesSelector;
    matchesSelector = el.matches || el.webkitMatchesSelector || el.mozMatchesSelector || el.msMatchesSelector;
    while (el) {
      if (matchesSelector.bind(el)(selector)) {
        return el;
      } else {
        el = el.parentNode;
      }
    }
  },

  /*
  	Generates an ID that starts with a letter
  	
  	Example: "aBc12D34"
  
  	param Number length of the id
  	return String
   */
  generateID: function(length) {
    var chars, text;
    length = (length != null) && length > 0 ? length - 1 : 7;
    chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    text = chars.charAt(Math.floor(Math.random() * 52));
    while (length--) {
      text += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return text;
  },

  /*
  	Deepcopies arrays and object literals
  	
  	return Array or object
   */
  deepCopy: function(object) {
    var newEmpty;
    newEmpty = Array.isArray(object) ? [] : {};
    return $.extend(true, newEmpty, object);
  },
  timeoutWithReset: (function() {
    var timer;
    timer = null;
    return function(ms, cb, onResetFn) {
      if (timer != null) {
        if (onResetFn != null) {
          onResetFn();
        }
        clearTimeout(timer);
      }
      return timer = setTimeout((function() {
        timer = null;
        return cb();
      }), ms);
    };
  })(),

  /*
  	Highlight text between two nodes. 
  
  	Creates a span.hilite between two given nodes, surrounding the contents of the nodes
  
  	Example usage:
  	hl = Fn.highlighter
  		className: 'highlight' # optional
  		tagName: 'div' # optional
  
  	supEnter = (ev) -> hl.on
  		startNode: el.querySelector(#someid) # required
  		endNode: ev.currentTarget # required
  	supLeave = -> hl.off()
  	$(sup).hover supEnter, supLeave
   */
  highlighter: function(args) {
    var className, el, tagName;
    if (args == null) {
      args = {};
    }
    className = args.className, tagName = args.tagName;
    if (className == null) {
      className = 'hilite';
    }
    if (tagName == null) {
      tagName = 'span';
    }
    el = null;
    return {
      on: function(args) {
        var endNode, range, startNode;
        startNode = args.startNode, endNode = args.endNode;
        range = document.createRange();
        range.setStartAfter(startNode);
        range.setEndBefore(endNode);
        el = document.createElement(tagName);
        el.className = className;
        el.appendChild(range.extractContents());
        return range.insertNode(el);
      },
      off: function() {
        return $(el).replaceWith(function() {
          return $(this).contents();
        });
      }
    };
  },

  /*
  	Native alternative to jQuery's $.offset()
  
  	http://www.quirksmode.org/js/findpos.html
   */
  position: function(el, parent) {
    var left, top;
    left = 0;
    top = 0;
    while (el !== parent) {
      left += el.offsetLeft;
      top += el.offsetTop;
      el = el.offsetParent;
    }
    return {
      left: left,
      top: top
    };
  },
  boundingBox: function(el) {
    var box;
    box = $(el).offset();
    box.width = el.clientWidth;
    box.height = el.clientHeight;
    box.right = box.left + box.width;
    box.bottom = box.top + box.height;
    return box;
  },

  /*
  	Is child el a descendant of parent el?
  
  	http://stackoverflow.com/questions/2234979/how-to-check-in-javascript-if-one-element-is-a-child-of-another
   */
  isDescendant: function(parent, child) {
    var node;
    node = child.parentNode;
    while (node != null) {
      if (node === parent) {
        return true;
      }
      node = node.parentNode;
    }
    return false;
  },

  /*
  	Removes an item from an array
   */
  removeFromArray: function(arr, item) {
    var index;
    index = arr.indexOf(item);
    arr.splice(index, 1);
    return arr;
  },

  /* Escape a regular expression */
  escapeRegExp: function(str) {
    return str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  },

  /*
  	Flattens an object
  
  	songs:
  		mary:
  			had:
  				little: 'lamb'
  
  	becomes
  
  	songs:
  		mary.had.little: 'lamb'
  
  	Taken from: http://thedersen.com/projects/backbone-validation
   */
  flattenObject: function(obj, into, prefix) {
    var k, v;
    if (into == null) {
      into = {};
    }
    if (prefix == null) {
      prefix = '';
    }
    for (k in obj) {
      if (!__hasProp.call(obj, k)) continue;
      v = obj[k];
      if (_.isObject(v) && !_.isArray(v) && !_.isFunction(v) && !(v instanceof Backbone.Model) && !(v instanceof Backbone.Collection)) {
        this.flattenObject(v, into, prefix + k + '.');
      } else {
        into[prefix + k] = v;
      }
    }
    return into;
  },
  compareJSON: function(current, changed) {
    var attr, changes, value;
    changes = {};
    for (attr in current) {
      if (!__hasProp.call(current, attr)) continue;
      value = current[attr];
      if (!changed.hasOwnProperty(attr)) {
        changes[attr] = 'removed';
      }
    }
    for (attr in changed) {
      if (!__hasProp.call(changed, attr)) continue;
      value = changed[attr];
      if (current.hasOwnProperty(attr)) {
        if (_.isArray(value) || this.isObjectLiteral(value)) {
          if (!_.isEqual(current[attr], changed[attr])) {
            changes[attr] = changed[attr];
          }
        } else {
          if (current[attr] !== changed[attr]) {
            changes[attr] = changed[attr];
          }
        }
      } else {
        changes[attr] = 'added';
      }
    }
    return changes;
  },
  isObjectLiteral: function(obj) {
    var ObjProto;
    if ((obj == null) || typeof obj !== "object") {
      return false;
    }
    ObjProto = obj;
    while (Object.getPrototypeOf(ObjProto = Object.getPrototypeOf(ObjProto)) !== null) {
      0;
    }
    return Object.getPrototypeOf(obj) === ObjProto;
  },
  getScrollPercentage: function(el) {
    var left, scrolledLeft, scrolledTop, top, totalLeft, totalTop;
    scrolledTop = el.scrollTop;
    totalTop = el.scrollHeight - el.clientHeight;
    scrolledLeft = el.scrollLeft;
    totalLeft = el.scrollWidth - el.clientWidth;
    top = totalTop === 0 ? 0 : Math.floor((scrolledTop / totalTop) * 100);
    left = totalLeft === 0 ? 0 : Math.floor((scrolledLeft / totalLeft) * 100);
    return {
      top: top,
      left: left
    };
  },
  setScrollPercentage: function(el, percentages) {
    if (percentages.top < 5) {
      percentages.top = 0;
    }
    if (percentages.top > 95) {
      percentages.top = 100;
    }
    el.scrollTop = (el.scrollHeight - el.clientHeight) * percentages.top / 100;
    return el.scrollLeft = (el.scrollWidth - el.clientWidth) * percentages.left / 100;
  },
  checkCheckboxes: function(selector, checked, baseEl) {
    var cb, checkboxes, _i, _len, _results;
    if (selector == null) {
      selector = 'input[type="checkbox"]';
    }
    if (checked == null) {
      checked = true;
    }
    if (baseEl == null) {
      baseEl = document;
    }
    checkboxes = baseEl.querySelectorAll(selector);
    _results = [];
    for (_i = 0, _len = checkboxes.length; _i < _len; _i++) {
      cb = checkboxes[_i];
      _results.push(cb.checked = checked);
    }
    return _results;
  },
  setCursorToEnd: function(textEl, windowEl) {
    var range, sel, win;
    win = windowEl != null ? windowEl : window;
    if (windowEl == null) {
      windowEl = textEl;
    }
    windowEl.focus();
    range = document.createRange();
    range.selectNodeContents(textEl);
    range.collapse(false);
    sel = win.getSelection();
    if (sel != null) {
      sel.removeAllRanges();
      return sel.addRange(range);
    }
  },
  arraySum: function(arr) {
    if (arr.length === 0) {
      return 0;
    }
    return arr.reduce(function(prev, current) {
      return current + prev;
    });
  },
  getAspectRatio: function(originalWidth, originalHeight, boxWidth, boxHeight) {
    var heightRatio, widthRatio;
    widthRatio = boxWidth / originalWidth;
    heightRatio = boxHeight / originalHeight;
    return Math.min(widthRatio, heightRatio);
  },
  hasScrollBar: function(el) {
    return el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth;
  },
  hasXScrollBar: function(el) {
    return el.scrollWidth > el.clientWidth;
  },
  hasYScrollBar: function(el) {
    return el.scrollHeight > el.clientHeight;
  }
};


},{"jquery":49}],68:[function(require,module,exports){
var $;

$ = require('jquery');

(function(jQuery) {
  jQuery.expr[":"].contains = $.expr.createPseudo(function(arg) {
    return function(elem) {
      return $(elem).text().toUpperCase().indexOf(arg.toUpperCase()) >= 0;
    };
  });
  jQuery.fn.scrollTo = function(newPos, args) {
    var defaults, extraOffset, options, scrollTop, top;
    defaults = {
      start: function() {},
      complete: function() {},
      duration: 500
    };
    options = $.extend(defaults, args);
    if (options.start) {
      options.start();
    }
    scrollTop = this.scrollTop();
    top = this.offset().top;
    extraOffset = 60;
    newPos = newPos + scrollTop - top - extraOffset;
    if (newPos !== scrollTop) {
      return this.animate({
        scrollTop: newPos
      }, options.duration, options.complete);
    } else {
      return options.complete();
    }
  };
  jQuery.fn.highlight = function(delay) {
    delay = delay || 3000;
    this.addClass('highlight');
    return setTimeout(((function(_this) {
      return function() {
        return _this.removeClass('highlight');
      };
    })(this)), delay);
  };

  /*
  	Render remove button in element
   */
  return jQuery.fn.appendCloseButton = function(args) {
    var $closeButton, close, corner, html;
    if (args == null) {
      args = {};
    }
    corner = args.corner, html = args.html, close = args.close;
    if (html == null) {
      html = '<img src="/images/hilib/icon.close.png">';
    }
    if (corner == null) {
      corner = 'topright';
    }
    $closeButton = $('<div class="closebutton">').html(html);
    $closeButton.css('position', 'absolute');
    $closeButton.css('opacity', '0.2');
    $closeButton.css('cursor', 'pointer');
    switch (corner) {
      case 'topright':
        $closeButton.css('right', '8px');
        $closeButton.css('top', '8px');
        break;
      case 'bottomright':
        $closeButton.css('right', '8px');
        $closeButton.css('bottom', '8px');
    }
    this.prepend($closeButton);
    $closeButton.hover((function(ev) {
      return $closeButton.css('opacity', 100);
    }), (function(ev) {
      return $closeButton.css('opacity', 0.2);
    }));
    return $closeButton.click((function(_this) {
      return function() {
        return close();
      };
    })(this));
  };
})($);


},{"jquery":49}],69:[function(require,module,exports){
var $;

$ = require('jquery');

module.exports = {
  ucfirst: function(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  },

  /*
  	Slugify a string
   */
  slugify: function(str) {
    var from, index, strlen, to;
    from = "àáäâèéëêìíïîòóöôùúüûñç·/_:;";
    to = "aaaaeeeeiiiioooouuuunc-----";
    str = str.trim().toLowerCase();
    strlen = str.length;
    while (strlen--) {
      index = from.indexOf(str[strlen]);
      if (index !== -1) {
        str = str.substr(0, strlen) + to[index] + str.substr(strlen + 1);
      }
    }
    return str.replace(/[^a-z0-9 -]/g, '').replace(/\s+|\-+/g, '-').replace(/^\-+|\-+$/g, '');
  },

  /*
  	Strips the tags from a string
  	
  	Example: "This is a <b>string</b>." => "This is a string."
  	
  	return String
   */
  stripTags: function(str) {
    return $('<span />').html(str).text();
  },

  /*
  	Removes non numbers from a string
  	
  	Example: "Count the 12 monkeys." => "12"
  	
  	return String
   */
  onlyNumbers: function(str) {
    return str.replace(/[^\d.]/g, '');
  },
  hashCode: function(str) {
    var c, chr, hash, i, _i, _len;
    if (str.length === 0) {
      return false;
    }
    hash = 0;
    for (i = _i = 0, _len = str.length; _i < _len; i = ++_i) {
      chr = str[i];
      c = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + c;
      hash = hash & hash;
    }
    return hash;
  },
  insertAt: function(str, needle, index) {
    return str.slice(0, index) + needle + str.slice(index);
  }
};


},{"jquery":49}],70:[function(require,module,exports){
var Backbone, BaseView, Pubsub,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Backbone = require('backbone');

Pubsub = require('../mixins/pubsub');

BaseView = (function(_super) {
  __extends(BaseView, _super);

  function BaseView() {
    return BaseView.__super__.constructor.apply(this, arguments);
  }

  BaseView.prototype.initialize = function() {
    _.extend(this, Pubsub);
    return this.subviews = {};
  };

  BaseView.prototype.destroy = function() {
    var name, subview, _ref;
    _ref = this.subviews;
    for (name in _ref) {
      subview = _ref[name];
      subview.destroy();
    }
    return this.remove();
  };

  return BaseView;

})(Backbone.View);

module.exports = BaseView;


},{"../mixins/pubsub":63,"backbone":47}],71:[function(require,module,exports){
var Collections, ComboList, Views, dom, dropdown, tpl,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

dom = require('../../../utils/dom');

Collections = {
  Base: require('../../../collections/base')
};

Views = {
  Base: require('../../base')
};

tpl = require('./main.jade');

dropdown = require('../../../mixins/dropdown/main');

ComboList = (function(_super) {
  __extends(ComboList, _super);

  function ComboList() {
    return ComboList.__super__.constructor.apply(this, arguments);
  }

  ComboList.prototype.className = 'combolist';

  ComboList.prototype.initialize = function() {
    var models, _base, _base1, _ref;
    ComboList.__super__.initialize.apply(this, arguments);
    if ((_base = this.options).config == null) {
      _base.config = {};
    }
    this.settings = (_ref = this.options.config.settings) != null ? _ref : {};
    if ((_base1 = this.settings).confirmRemove == null) {
      _base1.confirmRemove = false;
    }
    _.extend(this, dropdown);
    this.dropdownInitialize();
    if (this.options.value instanceof Backbone.Collection) {
      this.selected = this.options.value;
    } else if (_.isArray(this.options.value)) {
      models = this.strArray2optionArray(this.options.value);
      this.selected = new Collections.Base(models);
    } else {
      console.error('No valid value passed to combolist');
    }
    this.listenTo(this.selected, 'add', (function(_this) {
      return function(model) {
        _this.dropdownRender(tpl);
        return _this.triggerChange({
          added: model.id
        });
      };
    })(this));
    this.listenTo(this.selected, 'remove', (function(_this) {
      return function(model) {
        _this.dropdownRender(tpl);
        return _this.triggerChange({
          removed: model.id
        });
      };
    })(this));
    return this.dropdownRender(tpl);
  };

  ComboList.prototype.postDropdownRender = function() {
    return this.filtered_options.reset(this.collection.reject((function(_this) {
      return function(model) {
        return _this.selected.get(model.id) != null;
      };
    })(this)));
  };

  ComboList.prototype.events = function() {
    return _.extend(this.dropdownEvents(), {
      'click li.selected span': 'removeSelected',
      'click button.add': 'createModel',
      'keyup input': 'toggleButton'
    });
  };

  ComboList.prototype.toggleButton = function(ev) {
    var button;
    button = dom(this.el).q('button');
    if ((button != null) && ev.currentTarget.value.length > 1 && ev.keyCode !== 13) {
      return button.show('inline-block');
    } else {
      return button.hide();
    }
  };

  ComboList.prototype.createModel = function(ev) {
    var value;
    value = this.el.querySelector('input').value;
    if (this.settings.mutable && value.length > 1) {
      return this.selected.add({
        id: value,
        title: value
      });
    }
  };

  ComboList.prototype.removeSelected = function(ev) {
    var listitemID, remove;
    listitemID = ev.currentTarget.parentNode.getAttribute('data-id');
    remove = (function(_this) {
      return function() {
        return _this.selected.removeById(listitemID);
      };
    })(this);
    if (this.settings.confirmRemove) {
      return this.trigger('confirmRemove', listitemID, remove);
    } else {
      return remove();
    }
  };

  ComboList.prototype.addSelected = function(ev) {
    var model;
    if ((ev.keyCode != null) && ev.keyCode === 13) {
      if (this.filtered_options.currentOption != null) {
        model = this.filtered_options.currentOption;
      }
      if (model == null) {
        this.createModel();
        return;
      }
    } else {
      model = this.collection.get(ev.currentTarget.getAttribute('data-id'));
    }
    return this.selected.add(model);
  };

  ComboList.prototype.triggerChange = function(options) {
    if (options.added == null) {
      options.added = null;
    }
    if (options.removed == null) {
      options.removed = null;
    }
    return this.trigger('change', {
      selected: this.selected.toJSON(),
      added: options.added,
      removed: options.removed
    });
  };

  ComboList.prototype.strArray2optionArray = function(strArray) {
    return _.map(strArray, function(item) {
      return {
        id: item,
        title: item
      };
    });
  };

  return ComboList;

})(Views.Base);

module.exports = ComboList;


},{"../../../collections/base":51,"../../../mixins/dropdown/main":58,"../../../utils/dom":66,"../../base":70,"./main.jade":72}],72:[function(require,module,exports){
var jade = require("jade/runtime");

module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};
var locals_ = (locals || {}),viewId = locals_.viewId,settings = locals_.settings,selected = locals_.selected;
buf.push("<div class=\"input\"><input type=\"text\"" + (jade.attr("data-view-id", viewId, true, false)) + (jade.attr("placeholder", settings.placeholder, true, false)) + "/><div class=\"caret\"></div></div>");
if ( settings.mutable)
{
buf.push("<button class=\"add\">Add</button>");
}
if ( settings.editable)
{
buf.push("<button class=\"edit\">Edit</button>");
}
buf.push("<ul class=\"list\"></ul>");
if ( selected.length > 0)
{
buf.push("<ul class=\"selected\">");
// iterate selected.models
;(function(){
  var $$obj = selected.models;
  if ('number' == typeof $$obj.length) {

    for (var $index = 0, $$l = $$obj.length; $index < $$l; $index++) {
      var model = $$obj[$index];

buf.push("<li" + (jade.attr("data-id", model.id, true, false)) + " class=\"selected\"><span>" + (jade.escape(null == (jade.interp = model.get('title')) ? "" : jade.interp)) + "</span></li>");
    }

  } else {
    var $$l = 0;
    for (var $index in $$obj) {
      $$l++;      var model = $$obj[$index];

buf.push("<li" + (jade.attr("data-id", model.id, true, false)) + " class=\"selected\"><span>" + (jade.escape(null == (jade.interp = model.get('title')) ? "" : jade.interp)) + "</span></li>");
    }

  }
}).call(this);

buf.push("</ul>");
}
else
{
buf.push("<div class=\"empty\">The list is empty.</div>");
};return buf.join("");
};
},{"jade/runtime":48}],73:[function(require,module,exports){
var Collections, EditableList, Views, tpl,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Collections = {
  Base: require('../../../collections/base')
};

Views = {
  Base: require('../../base')
};

tpl = require('./main.jade');

EditableList = (function(_super) {
  __extends(EditableList, _super);

  function EditableList() {
    return EditableList.__super__.constructor.apply(this, arguments);
  }

  EditableList.prototype.className = 'editablelist';

  EditableList.prototype.initialize = function() {
    var value, _base, _base1, _base2, _ref;
    EditableList.__super__.initialize.apply(this, arguments);
    if ((_base = this.options).config == null) {
      _base.config = {};
    }
    this.settings = (_ref = this.options.config.settings) != null ? _ref : {};
    if ((_base1 = this.settings).placeholder == null) {
      _base1.placeholder = '';
    }
    if ((_base2 = this.settings).confirmRemove == null) {
      _base2.confirmRemove = false;
    }
    value = _.map(this.options.value, function(val) {
      return {
        id: val
      };
    });
    this.selected = new Collections.Base(value);
    this.listenTo(this.selected, 'add', this.render);
    this.listenTo(this.selected, 'remove', this.render);
    return this.render();
  };

  EditableList.prototype.render = function() {
    var rtpl;
    rtpl = tpl({
      viewId: this.cid,
      selected: this.selected,
      settings: this.settings
    });
    this.$el.html(rtpl);
    this.triggerChange();
    if (this.settings.inputClass != null) {
      this.$('input').addClass(this.settings.inputClass);
    }
    this.$('input').focus();
    return this;
  };

  EditableList.prototype.events = function() {
    var evs;
    evs = {
      'click li span': 'removeLi',
      'click button': 'addSelected'
    };
    evs['keyup input'] = 'onKeyup';
    return evs;
  };

  EditableList.prototype.removeLi = function(ev) {
    var listitemID;
    listitemID = ev.currentTarget.parentNode.getAttribute('data-id');
    if (this.settings.confirmRemove) {
      return this.trigger('confirmRemove', listitemID, (function(_this) {
        return function() {
          return _this.selected.removeById(listitemID);
        };
      })(this));
    } else {
      return this.selected.removeById(listitemID);
    }
  };

  EditableList.prototype.onKeyup = function(ev) {
    var valueLength;
    valueLength = ev.currentTarget.value.length;
    if (ev.keyCode === 13 && valueLength > 0) {
      return this.addSelected();
    } else if (valueLength > 1) {
      return this.showButton();
    } else {
      return this.hideButton();
    }
  };

  EditableList.prototype.addSelected = function() {
    this.selected.add({
      id: this.el.querySelector('input').value
    });
    return this.el.querySelector('button').style.display = 'none';
  };

  EditableList.prototype.showButton = function(ev) {
    return this.el.querySelector('button').style.display = 'inline-block';
  };

  EditableList.prototype.hideButton = function(ev) {
    return this.el.querySelector('button').style.display = 'none';
  };

  EditableList.prototype.triggerChange = function() {
    return this.trigger('change', this.selected.pluck('id'));
  };

  return EditableList;

})(Views.Base);

module.exports = EditableList;


},{"../../../collections/base":51,"../../base":70,"./main.jade":74}],74:[function(require,module,exports){
var jade = require("jade/runtime");

module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};
var locals_ = (locals || {}),viewId = locals_.viewId,settings = locals_.settings,selected = locals_.selected;
buf.push("<div class=\"input\"><input" + (jade.attr("data-view-id", viewId, true, false)) + (jade.attr("placeholder", settings.placeholder, true, false)) + "/></div><button class=\"add\">Add</button>");
if ( selected.length > 0)
{
buf.push("<ul class=\"selected\">");
// iterate selected.models
;(function(){
  var $$obj = selected.models;
  if ('number' == typeof $$obj.length) {

    for (var $index = 0, $$l = $$obj.length; $index < $$l; $index++) {
      var model = $$obj[$index];

buf.push("<li" + (jade.attr("data-id", model.id, true, false)) + "><span>" + (jade.escape(null == (jade.interp = model.id) ? "" : jade.interp)) + "</span></li>");
    }

  } else {
    var $$l = 0;
    for (var $index in $$obj) {
      $$l++;      var model = $$obj[$index];

buf.push("<li" + (jade.attr("data-id", model.id, true, false)) + "><span>" + (jade.escape(null == (jade.interp = model.id) ? "" : jade.interp)) + "</span></li>");
    }

  }
}).call(this);

buf.push("</ul>");
}
else
{
buf.push("<div class=\"empty\">The list is empty.</div>");
};return buf.join("");
};
},{"jade/runtime":48}],75:[function(require,module,exports){
var Fn, Form, Views, dom, validation,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Fn = require('../../utils/general');

dom = require('../../utils/DOM');

Views = {
  Base: require('../base')
};

validation = require('../../mixins/validation');

Form = (function(_super) {
  __extends(Form, _super);

  function Form() {
    this.renderSubform = __bind(this.renderSubform, this);
    this.addSubform = __bind(this.addSubform, this);
    return Form.__super__.constructor.apply(this, arguments);
  }

  Form.prototype.customAdd = function() {
    return console.error('Form.customAdd is not implemented!');
  };

  Form.prototype.className = 'form';

  Form.prototype.initialize = function() {
    var _ref;
    Form.__super__.initialize.apply(this, arguments);
    if (this.subformConfig == null) {
      this.subformConfig = this.options.subformConfig;
    }
    if (this.subformConfig == null) {
      this.subformConfig = {};
    }
    if (this.Model == null) {
      this.Model = this.options.Model;
    }
    if (this.Model == null) {
      this.Model = Backbone.Model;
    }
    this.tplData = (_ref = this.options.tplData) != null ? _ref : {};
    if (this.tpl == null) {
      this.tpl = this.options.tpl;
    }
    if (this.tpl == null) {
      throw 'Unknow template!';
    }
    this.on('createModels:finished', this.render, this);
    this.createModels();
    this.addValidation();
    return this.addListeners();
  };

  Form.prototype.events = function() {
    var evs;
    evs = {};
    evs['change textarea'] = 'inputChanged';
    evs['change input'] = 'inputChanged';
    evs['change select'] = 'inputChanged';
    evs['keydown textarea'] = 'textareaKeyup';
    evs['click input[type="submit"]'] = 'submit';
    evs['click button[name="submit"]'] = 'submit';
    return evs;
  };

  Form.prototype.inputChanged = function(ev) {
    var model, value;
    ev.stopPropagation();
    this.$(ev.currentTarget).removeClass('invalid').attr('title', '');
    model = this.model != null ? this.model : this.getModel(ev);
    value = ev.currentTarget.type === 'checkbox' ? ev.currentTarget.checked : ev.currentTarget.value;
    if (ev.currentTarget.name !== '') {
      return model.set(ev.currentTarget.name, value);
    }
  };

  Form.prototype.textareaKeyup = function(ev) {
    ev.currentTarget.style.height = '32px';
    return ev.currentTarget.style.height = ev.currentTarget.scrollHeight + 6 + 'px';
  };

  Form.prototype.submit = function(ev) {
    var el;
    ev.preventDefault();
    el = dom(ev.currentTarget);
    if (!el.hasClass('loader')) {
      el.addClass('loader');
      return this.model.save([], {
        success: (function(_this) {
          return function(model, response, options) {
            dom(ev.currentTarget).removeClass('loader');
            _this.trigger('save:success', model, response, options);
            return _this.reset();
          };
        })(this),
        error: (function(_this) {
          return function(model, xhr, options) {
            dom(ev.currentTarget).removeClass('loader');
            return _this.trigger('save:error', model, xhr, options);
          };
        })(this)
      });
    }
  };

  Form.prototype.preRender = function() {};

  Form.prototype.render = function() {
    var View, attr, rtpl, _ref;
    this.preRender();
    this.tplData.viewId = this.cid;
    if (this.model != null) {
      this.tplData.model = this.model;
    }
    if (this.collection != null) {
      this.tplData.collection = this.collection;
    }
    if (this.tpl == null) {
      throw 'Unknow template!';
    }
    rtpl = _.isString(this.tpl) ? _.template(this.tpl, this.tplData) : this.tpl(this.tplData);
    this.$el.html(rtpl);
    this.el.setAttribute('data-view-cid', this.cid);
    if (this.subforms == null) {
      this.subforms = {};
    }
    _ref = this.subforms;
    for (attr in _ref) {
      if (!__hasProp.call(_ref, attr)) continue;
      View = _ref[attr];
      this.addSubform(attr, View);
    }
    this.$('textarea').each((function(_this) {
      return function(index, textarea) {
        return textarea.style.height = textarea.scrollHeight + 6 > 32 ? textarea.scrollHeight + 6 + 'px' : '32px';
      };
    })(this));
    this.postRender();
    return this;
  };

  Form.prototype.postRender = function() {};

  Form.prototype.reset = function() {
    this.model = this.model.clone();
    this.model.clear({
      silent: true
    });
    this.model.set(this.model.defaults());
    this.el.querySelector('[data-model-id]').setAttribute('data-model-id', this.model.cid);
    this.addValidation();
    return this.el.querySelector('form').reset();
  };

  Form.prototype.createModels = function() {
    var _base;
    if (this.model == null) {
      if ((_base = this.options).value == null) {
        _base.value = {};
      }
      this.model = new this.Model(this.options.value);
      if (this.model.isNew()) {
        return this.trigger('createModels:finished');
      } else {
        return this.model.fetch({
          success: (function(_this) {
            return function() {
              return _this.trigger('createModels:finished');
            };
          })(this)
        });
      }
    } else {
      return this.trigger('createModels:finished');
    }
  };

  Form.prototype.addValidation = function() {
    _.extend(this, validation);
    return this.validator({
      invalid: (function(_this) {
        return function(model, attr, msg) {
          dom(_this.el).q('button[name="submit"]').removeClass('loader');
          return _this.$("[data-model-id='" + model.cid + "'] [name='" + attr + "']").addClass('invalid').attr('title', msg);
        };
      })(this)
    });

    /* @on 'validator:validated', => $('button.save').prop('disabled', false).removeAttr('title') */

    /* @on 'validator:invalidated', => $('button.save').prop('disabled', true).attr 'title', 'The form cannot be saved due to invalid values.' */
  };

  Form.prototype.addListeners = function() {
    return this.listenTo(this.model, 'change', (function(_this) {
      return function() {
        return _this.triggerChange();
      };
    })(this));
  };

  Form.prototype.triggerChange = function() {
    var object;
    object = this.model != null ? this.model : this.collection;
    return this.trigger('change', object.toJSON(), object);
  };

  Form.prototype.addSubform = function(attr, View) {
    return this.renderSubform(attr, View, this.model);
  };

  Form.prototype.renderSubform = function(attr, View, model) {
    var htmlSafeAttr, placeholders, value, view;
    value = attr.indexOf('.') > -1 ? Fn.flattenObject(model.attributes)[attr] : model.get(attr);
    if (value == null) {
      console.error('Subform value is undefined!', this.model);
    }
    view = new View({
      value: value,
      config: this.subformConfig[attr]
    });
    htmlSafeAttr = attr.split('.').join('_');
    placeholders = this.el.querySelectorAll("[data-cid='" + model.cid + "'] ." + htmlSafeAttr + "-placeholder");
    if (placeholders.length > 1) {
      _.each(placeholders, (function(_this) {
        return function(placeholder) {
          var el;
          el = Fn.closest(placeholder, '[data-cid]');
          if (el.getAttribute('data-cid') === model.cid && placeholder.innerHTML === '') {
            return placeholder.appendChild(view.el);
          }
        };
      })(this));
    } else {
      placeholders[0].appendChild(view.el);
    }
    this.listenTo(view, 'change', (function(_this) {
      return function(data) {
        return model.set(attr, data);
      };
    })(this));
    this.listenTo(view, 'customAdd', this.customAdd);
    return this.listenTo(view, 'change:data', (function(_this) {
      return function(models) {
        return _this.subformConfig[attr].data = _this.subformConfig[attr].data.reset(models);
      };
    })(this));
  };

  return Form;

})(Views.Base);

module.exports = Form;


},{"../../mixins/validation":64,"../../utils/DOM":65,"../../utils/general":67,"../base":70}],76:[function(require,module,exports){
module.exports = {
  65: 'a',
  66: 'b',
  67: 'c',
  68: 'd',
  69: 'e',
  70: 'f',
  71: 'g',
  72: 'h',
  73: 'i',
  74: 'j',
  75: 'k',
  76: 'l',
  78: 'n',
  79: 'o',
  80: 'p',
  82: 'r',
  83: 's',
  84: 't',
  85: 'u',
  86: 'v',
  87: 'w',
  89: 'y',
  90: 'z',
  187: '=',
  189: '-',
  190: '.',
  222: "'"
};


},{}],77:[function(require,module,exports){
module.exports = {
  'A': 'ĀĂÀÁÂÃÄÅĄⱭ∀Æ',
  'B': 'Ɓ',
  'C': 'ÇĆĈĊČƆ',
  'D': 'ÐĎĐḎƊ',
  'E': 'ÈÉÊËĒĖĘẸĚƏÆƎƐ€',
  'F': 'ƑƩ',
  'G': 'ĜĞĠĢƢ',
  'H': 'ĤĦ',
  'I': 'ÌÍÎÏĪĮỊİIƗĲ',
  'J': 'ĴĲ',
  'K': 'ĶƘ',
  'L': 'ĹĻĽŁΛ',
  'N': 'ÑŃŅŇŊƝ₦',
  'O': 'ÒÓÔÕÖŌØŐŒƠƟ',
  'P': 'Ƥ¶',
  'R': 'ŔŘɌⱤ',
  'S': 'ßſŚŜŞṢŠÞ§',
  'T': 'ŢŤṮƬƮ',
  'U': 'ÙÚÛÜŪŬŮŰŲɄƯƱ',
  'V': 'Ʋ',
  'W': 'ŴẄΩ',
  'Y': 'ÝŶŸƔƳ',
  'Z': 'ŹŻŽƵƷẔ',
  'a': 'āăàáâãäåąɑæαª',
  'b': 'ßβɓ',
  'c': 'çςćĉċč¢ɔ',
  'd': 'ðďđɖḏɖɗ',
  'e': 'èéêëēėęẹěəæεɛ€',
  'f': 'ƒʃƭ',
  'g': 'ĝğġģɠƣ',
  'h': 'ĥħɦẖ',
  'i': 'ìíîïīįịiiɨĳι',
  'j': 'ĵɟĳ',
  'k': 'ķƙ',
  'l': 'ĺļľłλ',
  'n': 'ñńņňŋɲ',
  'o': 'òóôõöōøőœơɵ°',
  'p': 'ƥ¶',
  'r': 'ŕřɍɽ',
  's': 'ßſśŝşṣšþ§',
  't': 'ţťṯƭʈ',
  'u': 'ùúûüūŭůűųưμυʉʊ',
  'v': 'ʋ',
  'w': 'ŵẅω',
  'y': 'ýŷÿɣyƴ',
  'z': 'źżžƶẕʒƹ',
  '$': '£¥€₩₨₳Ƀ¤',
  '!': '¡‼‽',
  '?': '¿‽',
  '%': '‰',
  '.': '…••',
  '-': '±‐–—',
  '+': '±†‡',
  '\'': '′″‴‘’‚‛',
  '"': '“”„‟',
  '<': '≤‹',
  '>': '≥›',
  '=': '≈≠≡'
};


},{}],78:[function(require,module,exports){
var Fn, Longpress, Views, codes, diacritics, shiftcodes,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Fn = require('../../utils/general');

Views = {
  Base: require('../base')
};

codes = require('./codes');

shiftcodes = require('./shiftcodes');

diacritics = require('./diacritics');

Longpress = (function(_super) {
  __extends(Longpress, _super);

  function Longpress() {
    return Longpress.__super__.constructor.apply(this, arguments);
  }

  Longpress.prototype.initialize = function() {
    Longpress.__super__.initialize.apply(this, arguments);
    this.timer = null;
    this.lastKeyCode = null;
    this.keyDown = false;
    this.iframe = this.options.parent.querySelector('iframe');
    this.iframeBody = this.iframe.contentDocument.querySelector('body');
    this.iframeBody.addEventListener('keydown', this.onKeydown.bind(this));
    this.iframeBody.addEventListener('keyup', this.onKeyup.bind(this));
    this.editorBody = this.options.parent;
    return this.editorBody.addEventListener('click', this.onClick.bind(this));
  };

  Longpress.prototype.render = function(pressedChar) {
    var frag, ul;
    ul = document.createElement('ul');
    ul.className = 'longpress';
    frag = document.createDocumentFragment();
    _.each(diacritics[pressedChar], (function(_this) {
      return function(chr) {
        var li;
        li = document.createElement('li');
        li.textContent = chr;
        $(li).mouseenter(function(e) {
          return _this.replaceChar(e.target.textContent);
        });
        return frag.appendChild(li);
      };
    })(this));
    ul.appendChild(frag);
    return ul;
  };

  Longpress.prototype.onKeydown = function(e) {
    var pressedChar;
    if (this.longKeyDown) {
      e.preventDefault();
      return false;
    }
    pressedChar = e.shiftKey ? shiftcodes[e.keyCode] : codes[e.keyCode];
    if (e.keyCode === this.lastKeyCode) {
      e.preventDefault();
      if (pressedChar != null) {
        this.longKeyDown = true;
        if (this.timer == null) {
          this.timer = setTimeout(((function(_this) {
            return function() {
              var list;
              _this.rangeManager.set(_this.iframe.contentWindow.getSelection().getRangeAt(0));
              list = _this.render(pressedChar);
              return _this.show(list);
            };
          })(this)), 300);
        }
      }
    }
    return this.lastKeyCode = e.keyCode;
  };

  Longpress.prototype.onKeyup = function(e) {
    this.longKeyDown = false;
    return this.hide();
  };

  Longpress.prototype.onClick = function(e) {
    if (this.editorBody.querySelector('ul.longpress') != null) {
      e.preventDefault();
      e.stopPropagation();
      return this.resetFocus();
    }
  };

  Longpress.prototype.destroy = function() {
    this.iframeBody.removeEventListener('keydown', this.onKeydown);
    this.iframeBody.removeEventListener('keyup', this.onKeyup);
    this.editorBody.removeEventListener('click', this.onClick);
    return this.remove();
  };

  Longpress.prototype.rangeManager = (function() {
    var currentRange;
    currentRange = null;
    return {
      get: (function(_this) {
        return function() {
          return currentRange;
        };
      })(this),
      set: (function(_this) {
        return function(r) {
          return currentRange = r.cloneRange();
        };
      })(this),
      clear: (function(_this) {
        return function() {
          return currentRange = null;
        };
      })(this)
    };
  })();

  Longpress.prototype.show = function(list) {
    return this.editorBody.appendChild(list);
  };

  Longpress.prototype.hide = function() {
    var list;
    this.lastKeyCode = null;
    list = this.editorBody.querySelector('.longpress');
    if (list != null) {
      clearTimeout(this.timer);
      this.timer = null;
      this.rangeManager.clear();
      return this.editorBody.removeChild(list);
    }
  };

  Longpress.prototype.replaceChar = function(chr) {
    var range;
    range = this.rangeManager.get();
    range.setStart(range.startContainer, range.startOffset - 1);
    range.deleteContents();
    range.insertNode(document.createTextNode(chr));
    range.collapse(false);
    return this.resetFocus();
  };

  Longpress.prototype.resetFocus = function() {
    var sel;
    this.iframe.contentWindow.focus();
    sel = this.iframe.contentWindow.getSelection();
    sel.removeAllRanges();
    return sel.addRange(this.rangeManager.get());
  };

  return Longpress;

})(Views.Base);

module.exports = Longpress;


},{"../../utils/general":67,"../base":70,"./codes":76,"./diacritics":77,"./shiftcodes":79}],79:[function(require,module,exports){
module.exports = {
  65: 'A',
  66: 'B',
  67: 'C',
  68: 'D',
  69: 'E',
  70: 'F',
  71: 'G',
  72: 'H',
  73: 'I',
  74: 'J',
  75: 'K',
  76: 'L',
  78: 'N',
  79: 'O',
  80: 'P',
  82: 'R',
  83: 'S',
  84: 'T',
  85: 'U',
  86: 'V',
  87: 'W',
  89: 'Y',
  90: 'Z',
  49: '!',
  52: '$',
  53: '%',
  187: '+',
  188: '<',
  190: '>',
  191: '?',
  222: '"'
};


},{}],80:[function(require,module,exports){
var Backbone, Modal, dom, modalManager, tpl,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Backbone = require('backbone');

tpl = require('./main.jade');

dom = require('../../utils/dom');

modalManager = require('../../managers/modal');

Modal = (function(_super) {
  __extends(Modal, _super);

  function Modal() {
    return Modal.__super__.constructor.apply(this, arguments);
  }

  Modal.prototype.className = "modal";

  Modal.prototype.defaultOptions = function() {
    return {
      title: '',
      titleClass: '',
      cancelAndSubmit: true,
      cancelValue: 'Cancel',
      submitValue: 'Submit',
      loader: true
    };
  };

  Modal.prototype.initialize = function(options) {
    this.options = options;
    Modal.__super__.initialize.apply(this, arguments);
    return this.render();
  };

  Modal.prototype.render = function() {
    var body, bodyTop, data, marginLeft, offsetTop, rtpl, viewportHeight;
    data = _.extend(this.defaultOptions(), this.options);
    rtpl = tpl(data);
    this.$el.html(rtpl);
    body = dom(this.el).q('.body');
    if (this.options.html) {
      body.html(this.options.html);
    } else {
      body.hide();
    }
    modalManager.add(this);
    if (this.options.width != null) {
      this.$('.modalbody').css('width', this.options.width);
      marginLeft = -1 * parseInt(this.options.width, 10) / 2;
      if (this.options.width.slice(-1) === '%') {
        marginLeft += '%';
      }
      if (this.options.width.slice(-2) === 'vw') {
        marginLeft += 'vw';
      }
      if (this.options.width === 'auto') {
        marginLeft = this.$('.modalbody').width() / -2;
      }
      this.$('.modalbody').css('margin-left', marginLeft);
    }
    if (this.options.height != null) {
      this.$('.modalbody').css('height', this.options.height);
    }
    viewportHeight = document.documentElement.clientHeight;
    offsetTop = this.$('.modalbody').outerHeight() / 2;
    bodyTop = this.$('.modalbody').offset().top;
    if (offsetTop > bodyTop) {
      offsetTop = bodyTop - 20;
    }
    this.$('.modalbody').css('margin-top', -1 * offsetTop);
    return this.$('.modalbody .body').css('max-height', viewportHeight - 100);
  };

  Modal.prototype.events = {
    "click button.submit": 'submit',
    "click button.cancel": function() {
      return this.cancel();
    },
    "click .overlay": function() {
      return this.cancel();
    },
    "keydown input": function(ev) {
      if (ev.keyCode === 13) {
        ev.preventDefault();
        return this.submit(ev);
      }
    }
  };

  Modal.prototype.submit = function(ev) {
    var el;
    el = dom(ev.currentTarget);
    if (!el.hasClass('loader')) {
      this.el.querySelector('button.cancel').style.display = 'none';
      el.addClass('loader');
      return this.trigger('submit');
    }
  };

  Modal.prototype.cancel = function() {
    this.trigger('cancel');
    return this.close();
  };

  Modal.prototype.close = function() {
    this.trigger('close');
    return modalManager.remove(this);
  };

  Modal.prototype.destroy = function() {
    return this.close();
  };

  Modal.prototype.fadeOut = function(delay) {
    var speed;
    if (delay == null) {
      delay = 1000;
    }
    speed = delay === 0 ? 0 : 500;
    this.$(".modalbody").delay(delay).fadeOut(speed);
    return setTimeout(((function(_this) {
      return function() {
        return _this.close();
      };
    })(this)), delay + speed - 100);
  };

  Modal.prototype.message = function(type, message) {
    if (["success", "warning", "error"].indexOf(type) === -1) {
      return console.error("Unknown message type!");
    }
    this.$("p.message").show();
    return this.$("p.message").html(message).addClass(type);
  };

  Modal.prototype.messageAndFade = function(type, message, delay) {
    this.$(".modalbody .body").hide();
    this.$("footer").hide();
    this.message(type, message);
    return this.fadeOut(delay);
  };

  return Modal;

})(Backbone.View);

module.exports = Modal;


},{"../../managers/modal":55,"../../utils/dom":66,"./main.jade":81,"backbone":47}],81:[function(require,module,exports){
var jade = require("jade/runtime");

module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};
var locals_ = (locals || {}),title = locals_.title,titleClass = locals_.titleClass,cancelAndSubmit = locals_.cancelAndSubmit,cancelValue = locals_.cancelValue,submitValue = locals_.submitValue;
buf.push("<div class=\"overlay\"></div><div class=\"modalbody\"><header>");
if ( (title !== ''))
{
buf.push("<h2" + (jade.cls([titleClass], [true])) + ">" + (null == (jade.interp = title) ? "" : jade.interp) + "</h2>");
}
buf.push("<p class=\"message\"></p></header><div class=\"body\"></div>");
if ( (cancelAndSubmit))
{
buf.push("<footer><button class=\"cancel\">" + (jade.escape(null == (jade.interp = cancelValue) ? "" : jade.interp)) + "</button><button class=\"submit\">" + (jade.escape(null == (jade.interp = submitValue) ? "" : jade.interp)) + "</button></footer>");
}
buf.push("</div>");;return buf.join("");
};
},{"jade/runtime":48}],82:[function(require,module,exports){
var Fn, Pagination, Views, tpl,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Fn = require('../../utils/general');

Views = {
  Base: require('../base')
};

tpl = require('./main.jade');

Pagination = (function(_super) {
  __extends(Pagination, _super);

  function Pagination() {
    return Pagination.__super__.constructor.apply(this, arguments);
  }

  Pagination.prototype.className = '';

  Pagination.prototype.initialize = function() {
    var currentPage, _base, _base1;
    Pagination.__super__.initialize.apply(this, arguments);
    if ((_base = this.options).step10 == null) {
      _base.step10 = true;
    }
    if ((_base1 = this.options).triggerPagenumber == null) {
      _base1.triggerPagenumber = true;
    }
    currentPage = (this.options.start != null) && this.options.start > 0 ? (this.options.start / this.options.rowCount) + 1 : 1;
    return this.setCurrentPage(currentPage, true);
  };

  Pagination.prototype.render = function() {
    this.options.pageCount = Math.ceil(this.options.resultCount / this.options.rowCount);
    this.el.innerHTML = tpl(this.options);
    return this;
  };

  Pagination.prototype.events = function() {
    return {
      'click li.prev10.active': 'prev10',
      'click li.prev.active': 'prev',
      'click li.next.active': 'next',
      'click li.next10.active': 'next10'
    };
  };

  Pagination.prototype.prev10 = function() {
    return this.setCurrentPage(this.options.currentPage - 10);
  };

  Pagination.prototype.prev = function() {
    return this.setCurrentPage(this.options.currentPage - 1);
  };

  Pagination.prototype.next = function() {
    return this.setCurrentPage(this.options.currentPage + 1);
  };

  Pagination.prototype.next10 = function() {
    return this.setCurrentPage(this.options.currentPage + 10);
  };

  Pagination.prototype.setCurrentPage = function(pageNumber, silent) {
    var direction;
    if (silent == null) {
      silent = false;
    }
    if (!this.triggerPagenumber) {
      direction = pageNumber < this.options.currentPage ? 'prev' : 'next';
      this.trigger(direction);
    }
    this.options.currentPage = pageNumber;
    this.render();
    if (!silent) {
      return Fn.timeoutWithReset(500, (function(_this) {
        return function() {
          return _this.trigger('change:pagenumber', pageNumber);
        };
      })(this));
    }
  };

  return Pagination;

})(Views.Base);

module.exports = Pagination;


},{"../../utils/general":67,"../base":70,"./main.jade":83}],83:[function(require,module,exports){
var jade = require("jade/runtime");

module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};
var locals_ = (locals || {}),step10 = locals_.step10,pageCount = locals_.pageCount,currentPage = locals_.currentPage;
buf.push("<ul class=\"pagination\">");
if ( (step10 && pageCount >= 10))
{
buf.push("<li" + (jade.cls(['prev10',currentPage>10?'active':''], [null,true])) + ">&laquo;</li>");
}
buf.push("<li" + (jade.cls(['prev',currentPage>1?'active':''], [null,true])) + ">&lsaquo;</li><li class=\"current\">" + (jade.escape(null == (jade.interp = currentPage) ? "" : jade.interp)) + "</li><li class=\"text\">of</li><li class=\"pagecount\">" + (jade.escape(null == (jade.interp = pageCount) ? "" : jade.interp)) + "</li><li" + (jade.cls(['next',currentPage<pageCount?'active':''], [null,true])) + ">&rsaquo;</li>");
if ( (step10 && pageCount >= 10))
{
buf.push("<li" + (jade.cls(['next10',currentPage<=pageCount-10?'active':''], [null,true])) + ">&raquo;</li>");
}
buf.push("</ul>");;return buf.join("");
};
},{"jade/runtime":48}],84:[function(require,module,exports){
var jade = require("jade/runtime");

module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};
var locals_ = (locals || {}),diacritics = locals_.diacritics;
buf.push("<ul class=\"diacritics\">");
// iterate diacritics
;(function(){
  var $$obj = diacritics;
  if ('number' == typeof $$obj.length) {

    for (var $index = 0, $$l = $$obj.length; $index < $$l; $index++) {
      var diacritic = $$obj[$index];

buf.push("<li>" + (jade.escape(null == (jade.interp = diacritic) ? "" : jade.interp)) + "</li>");
    }

  } else {
    var $$l = 0;
    for (var $index in $$obj) {
      $$l++;      var diacritic = $$obj[$index];

buf.push("<li>" + (jade.escape(null == (jade.interp = diacritic) ? "" : jade.interp)) + "</li>");
    }

  }
}).call(this);

buf.push("</ul>");;return buf.join("");
};
},{"jade/runtime":48}],85:[function(require,module,exports){
var jade = require("jade/runtime");

module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};

buf.push("<div class=\"ste-header\"></div><div class=\"ste-body\"></div>");;return buf.join("");
};
},{"jade/runtime":48}],86:[function(require,module,exports){
var __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

define(function(require) {
  var Fn, Longpress, StringFn, SuperTinyEditor, Views, diacriticsTpl, tpl;
  Fn = require('../../utils/general');
  StringFn = require('../../utils/string');
  require('../../utils/jquery.mixin');
  Longpress = require('../longpress/main');
  Views = {
    Base: require('../base')
  };
  tpl = require('./main.jade');
  diacriticsTpl = require('./diacritics.jade');
  return SuperTinyEditor = (function(_super) {
    __extends(SuperTinyEditor, _super);

    function SuperTinyEditor() {
      return SuperTinyEditor.__super__.constructor.apply(this, arguments);
    }

    SuperTinyEditor.prototype.className = 'supertinyeditor';

    SuperTinyEditor.prototype.initialize = function() {
      var _base, _base1, _base2, _base3, _base4;
      SuperTinyEditor.__super__.initialize.apply(this, arguments);
      if ((_base = this.options).cssFile == null) {
        _base.cssFile = '';
      }
      if ((_base1 = this.options).html == null) {
        _base1.html = '';
      }
      if ((_base2 = this.options).width == null) {
        _base2.width = '300';
      }
      if ((_base3 = this.options).height == null) {
        _base3.height = '200';
      }
      if ((_base4 = this.options).wrap == null) {
        _base4.wrap = false;
      }
      this.on('button:save', (function(_this) {
        return function() {};
      })(this));
      return this.render();
    };

    SuperTinyEditor.prototype.render = function() {
      this.el.innerHTML = tpl();
      this.$currentHeader = this.$('.ste-header');
      this.renderControls();
      this.renderIframe();
      return this;
    };

    SuperTinyEditor.prototype.renderControls = function() {
      var controlName, diacritics, diacriticsUL, div, _i, _len, _ref, _results;
      _ref = this.options.controls;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        controlName = _ref[_i];
        div = document.createElement('div');
        if (controlName === 'n') {
          div.className = 'ste-header';
          this.$('.ste-body').before(div);
          _results.push(this.$currentHeader = $(div));
        } else if (controlName === '|') {
          div.className = 'ste-divider';
          _results.push(this.$currentHeader.append(div));
        } else if (controlName === 'diacritics') {
          div.className = 'ste-control-diacritics ' + controlName;
          div.setAttribute('title', StringFn.ucfirst(controlName));
          div.setAttribute('data-action', controlName);
          diacriticsUL = document.createElement('div');
          diacriticsUL.className = 'diacritics-placeholder';
          diacritics = 'ĀĂÀÁÂÃÄÅĄⱭ∀ÆāăàáâãäåąɑæαªƁßβɓÇĆĈĊČƆçςćĉċč¢ɔÐĎĐḎƊðďđɖḏɖɗÈÉÊËĒĖĘẸĚƏÆƎƐ€èéêëēėęẹěəæεɛ€ƑƩƒʃƭĜĞĠĢƢĝğġģɠƣĤĦĥħɦẖÌÍÎÏĪĮỊİIƗĲìíîïīįịiiɨĳιĴĲĵɟĳĶƘķƙĹĻĽŁΛĺļľłλÑŃŅŇŊƝ₦ñńņňŋɲÒÓÔÕÖŌØŐŒƠƟòóôõöōøőœơɵ°Ƥ¶ƥ¶ŔŘɌⱤŕřɍɽßſŚŜŞṢŠÞ§ßſśŝşṣšþ§ŢŤṮƬƮţťṯƭʈÙÚÛÜŪŬŮŰŲɄƯƱùúûüūŭůűųưμυʉʊƲʋŴẄΩŵẅωÝŶŸƔƳýŷÿɣyƴŹŻŽƵƷẔźżžƶẕʒƹ£¥€₩₨₳Ƀ¤¡‼‽¿‽‰…••±‐–—±†‡′″‴‘’‚‛“”„‟≤‹≥›≈≠≡';
          diacriticsUL.innerHTML = diacriticsTpl({
            diacritics: diacritics
          });
          div.appendChild(diacriticsUL);
          _results.push(this.$currentHeader.append(div));
        } else if (controlName === 'wordwrap') {
          div.className = 'ste-control-wordwrap';
          div.setAttribute('title', 'Word wrap');
          div.setAttribute('data-action', controlName);
          _results.push(this.$currentHeader.append(div));
        } else if (controlName.substr(0, 2) === 'b_') {
          controlName = controlName.substr(2);
          div.className = 'ste-button';
          div.setAttribute('data-action', controlName);
          div.setAttribute('title', StringFn.ucfirst(controlName));
          div.innerHTML = StringFn.ucfirst(controlName);
          _results.push(this.$currentHeader.append(div));
        } else {
          div.className = 'ste-control ' + controlName;
          div.setAttribute('title', StringFn.ucfirst(controlName));
          div.setAttribute('data-action', controlName);
          _results.push(this.$currentHeader.append(div));
        }
      }
      return _results;
    };

    SuperTinyEditor.prototype.renderIframe = function() {
      var iframe, steBody;
      iframe = document.createElement('iframe');
      iframe.style.width = this.options.width + 'px';
      iframe.style.height = this.options.height + 'px';
      iframe.src = "about:blank";
      iframe.onload = (function(_this) {
        return function() {
          _this.iframeDocument = iframe.contentDocument;
          _this.iframeDocument.designMode = 'On';
          _this.iframeDocument.open();
          _this.iframeDocument.write("<!DOCTYPE html> <html> <head><meta charset='UTF-8'><link rel='stylesheet' href='" + _this.options.cssFile + "'></head> <body class='ste-iframe-body' spellcheck='false' contenteditable='true'>" + (_this.model.get(_this.options.htmlAttribute)) + "</body> </html>");
          _this.iframeDocument.close();
          _this.iframeBody = _this.iframeDocument.querySelector('body');
          if (_this.options.wrap) {
            _this.iframeBody.style.whiteSpace = 'normal';
          }
          _this.setFocus();
          _this.longpress = new Longpress({
            parent: _this.el.querySelector('.ste-body')
          });
          _this.iframeDocument.addEventListener('scroll', function() {
            if (!_this.autoScroll) {
              return _this.triggerScroll();
            }
          });
          return _this.iframeDocument.addEventListener('keyup', function(ev) {
            return Fn.timeoutWithReset(500, function() {
              _this.triggerScroll();
              return _this.saveHTMLToModel();
            });
          });
        };
      })(this);
      steBody = this.el.querySelector('.ste-body');
      return steBody.appendChild(iframe);
    };

    SuperTinyEditor.prototype.events = function() {
      return {
        'click .ste-control': 'controlClicked',
        'click .ste-control-diacritics ul.diacritics li': 'diacriticClicked',
        'click .ste-control-wordwrap': 'wordwrapClicked',
        'click .ste-button': 'buttonClicked'
      };
    };

    SuperTinyEditor.prototype.buttonClicked = function(ev) {
      var action;
      action = ev.currentTarget.getAttribute('data-action');
      if (action !== 'save' || (action === 'save' && $(ev.currentTarget).hasClass('active'))) {
        return this.trigger('button:' + action);
      }
    };

    SuperTinyEditor.prototype.controlClicked = function(ev) {
      var action;
      action = ev.currentTarget.getAttribute('data-action');
      this.iframeDocument.execCommand(action, false, null);
      this.saveHTMLToModel();
      return this.trigger('control:' + action);
    };

    SuperTinyEditor.prototype.wordwrapClicked = function(ev) {
      var iframeBody;
      iframeBody = $(this.iframeBody);
      iframeBody.toggleClass('wrap');
      return this.trigger('control:wordwrap', iframeBody.hasClass('wrap'));
    };

    SuperTinyEditor.prototype.diacriticClicked = function(ev) {
      var range, sel, textNode;
      sel = this.el.querySelector('iframe').contentWindow.getSelection();
      range = sel.getRangeAt(0);
      range.deleteContents();
      textNode = ev.currentTarget.childNodes[0].cloneNode();
      range.insertNode(textNode);
      range.setStartAfter(textNode);
      range.setEndAfter(textNode);
      sel.removeAllRanges();
      sel.addRange(range);
      this.saveHTMLToModel();
      return this.trigger('control:diacritic', textNode);
    };

    SuperTinyEditor.prototype.destroy = function() {
      this.longpress.destroy();
      return this.remove();
    };

    SuperTinyEditor.prototype.saveHTMLToModel = function() {
      this.$('[data-action="save"]').addClass('active');
      return this.model.set(this.options.htmlAttribute, this.iframeBody.innerHTML);
    };

    SuperTinyEditor.prototype.triggerScroll = function() {
      var iframe, target;
      iframe = this.el.querySelector('iframe');
      target = {
        scrollLeft: $(iframe).contents().scrollLeft(),
        scrollWidth: iframe.contentWindow.document.documentElement.scrollWidth,
        clientWidth: iframe.contentWindow.document.documentElement.clientWidth,
        scrollTop: $(iframe).contents().scrollTop(),
        scrollHeight: iframe.contentWindow.document.documentElement.scrollHeight,
        clientHeight: iframe.contentWindow.document.documentElement.clientHeight
      };
      return this.trigger('scrolled', Fn.getScrollPercentage(target));
    };

    SuperTinyEditor.prototype.setModel = function(model) {
      this.setInnerHTML(model.get(this.options.htmlAttribute));
      this.model = model;
      return this.setFocus();
    };

    SuperTinyEditor.prototype.setInnerHTML = function(html) {
      return this.iframeBody.innerHTML = html;
    };

    SuperTinyEditor.prototype.setIframeHeight = function(height) {
      var iframe;
      iframe = this.el.querySelector('iframe');
      return iframe.style.height = height + 'px';
    };

    SuperTinyEditor.prototype.setIframeWidth = function(width) {
      var iframe;
      iframe = this.el.querySelector('iframe');
      return iframe.style.width = width + 'px';
    };

    SuperTinyEditor.prototype.setFocus = function() {
      var win;
      if ((this.iframeBody != null) && (win = this.el.querySelector('iframe').contentWindow)) {
        return Fn.setCursorToEnd(this.iframeBody, win);
      }
    };

    SuperTinyEditor.prototype.setScrollPercentage = function(percentages) {
      var clientHeight, clientWidth, contentWindow, documentElement, left, scrollHeight, scrollWidth, top;
      contentWindow = this.el.querySelector('iframe').contentWindow;
      documentElement = contentWindow.document.documentElement;
      clientWidth = documentElement.clientWidth;
      scrollWidth = documentElement.scrollWidth;
      clientHeight = documentElement.clientHeight;
      scrollHeight = documentElement.scrollHeight;
      top = (scrollHeight - clientHeight) * percentages.top / 100;
      left = (scrollWidth - clientWidth) * percentages.left / 100;
      this.autoScroll = true;
      contentWindow.scrollTo(left, top);
      return setTimeout(((function(_this) {
        return function() {
          return _this.autoScroll = false;
        };
      })(this)), 200);
    };

    return SuperTinyEditor;

  })(Views.Base);
});


},{"../../utils/general":67,"../../utils/jquery.mixin":68,"../../utils/string":69,"../base":70,"../longpress/main":78,"./diacritics.jade":84,"./main.jade":85}],87:[function(require,module,exports){
module.exports=require(13)
},{"fs":2}],88:[function(require,module,exports){
module.exports=require(5)
},{}],89:[function(require,module,exports){
module.exports=require(6)
},{}],90:[function(require,module,exports){
var $, Backbone, MainRouter, Views, history, projects;

Backbone = require('backbone');

$ = require('jquery');

Backbone.$ = $;

history = require('hilib/src/managers/history');

MainRouter = require('./routers/main');

projects = require('./collections/projects');

Views = {
  Header: require('./views/ui/header')
};


/* DEBUG */

Backbone.on('authorized', function() {
  return console.log('[debug] authorized');
});

Backbone.on('unauthorized', function() {
  return console.log('[debug] unauthorized');
});


/* /DEBUG */

module.exports = function() {
  var mainRouter;
  mainRouter = new MainRouter();
  Backbone.history.start({
    pushState: true
  });
  mainRouter.init();
  return $(document).on('click', 'a:not([data-bypass])', function(e) {
    var href;
    href = $(this).attr('href');
    if (href != null) {
      e.preventDefault();
      return Backbone.history.navigate(href, {
        'trigger': true
      });
    }
  });
};


},{"./collections/projects":97,"./routers/main":117,"./views/ui/header":136,"backbone":1,"hilib/src/managers/history":54,"jquery":88}],91:[function(require,module,exports){
var Annotations, Base, Models, config,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

config = require('../config');

Base = require('./base');

Models = {
  Annotation: require('../models/annotation')
};

Annotations = (function(_super) {
  __extends(Annotations, _super);

  function Annotations() {
    return Annotations.__super__.constructor.apply(this, arguments);
  }

  Annotations.prototype.model = Models.Annotation;

  Annotations.prototype.initialize = function(models, options) {
    return this.projectId = options.projectId, this.entryId = options.entryId, this.transcriptionId = options.transcriptionId, options;
  };

  Annotations.prototype.url = function() {
    return config.baseUrl + ("projects/" + this.projectId + "/entries/" + this.entryId + "/transcriptions/" + this.transcriptionId + "/annotations");
  };

  return Annotations;

})(Base);

module.exports = Annotations;


},{"../config":100,"../models/annotation":103,"./base":92}],92:[function(require,module,exports){
var Backbone, Base, Pubsub, token,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Backbone = require('backbone');

token = require('hilib/src/managers/token');

Pubsub = require('hilib/src/mixins/pubsub');

Base = (function(_super) {
  __extends(Base, _super);

  function Base() {
    return Base.__super__.constructor.apply(this, arguments);
  }

  Base.prototype.token = null;

  Base.prototype.initialize = function() {
    return _.extend(this, Pubsub);
  };

  Base.prototype.sync = function(method, model, options) {
    options.beforeSend = (function(_this) {
      return function(xhr) {
        return xhr.setRequestHeader('Authorization', "" + (token.getType()) + " " + (token.get()));
      };
    })(this);
    return Base.__super__.sync.call(this, method, model, options);
  };

  Base.prototype.removeById = function(id) {
    var model;
    model = this.get(id);
    return this.remove(model);
  };

  return Base;

})(Backbone.Collection);

module.exports = Base;


},{"backbone":1,"hilib/src/managers/token":56,"hilib/src/mixins/pubsub":63}],93:[function(require,module,exports){
var Base, Entries, Models, config,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

config = require('../config');

Base = require('./base');

Models = {
  Entry: require('../models/entry')
};

Entries = (function(_super) {
  __extends(Entries, _super);

  function Entries() {
    return Entries.__super__.constructor.apply(this, arguments);
  }

  Entries.prototype.model = Models.Entry;

  Entries.prototype.initialize = function(models, options) {
    Entries.__super__.initialize.apply(this, arguments);
    this.projectId = options.projectId;
    this.current = null;
    return this.changed = [];
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

module.exports = Entries;


},{"../config":100,"../models/entry":106,"./base":92}],94:[function(require,module,exports){
var Base, Facsimiles, Models, config,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

config = require('../config');

Base = require('./base');

Models = {
  Facsimile: require('../models/facsimile')
};

Facsimiles = (function(_super) {
  __extends(Facsimiles, _super);

  function Facsimiles() {
    return Facsimiles.__super__.constructor.apply(this, arguments);
  }

  Facsimiles.prototype.model = Models.Facsimile;

  Facsimiles.prototype.initialize = function(models, options) {
    this.projectId = options.projectId;
    this.entryId = options.entryId;
    return this.on('remove', (function(_this) {
      return function(model) {
        return model.destroy();
      };
    })(this));
  };

  Facsimiles.prototype.url = function() {
    return config.baseUrl + ("projects/" + this.projectId + "/entries/" + this.entryId + "/facsimiles");
  };

  Facsimiles.prototype.setCurrent = function(model) {
    if ((model == null) || model !== this.current) {
      if (model != null) {
        this.current = model;
      } else {
        this.current = this.at(0);
      }
      this.trigger('current:change', this.current);
    }
    return this.current;
  };

  return Facsimiles;

})(Base);

module.exports = Facsimiles;


},{"../config":100,"../models/facsimile":108,"./base":92}],95:[function(require,module,exports){
var AnnotationTypes, Base, Models, config,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

config = require('../../config');

Base = require('../base');

Models = {
  AnnotationType: require('../../models/project/annotationtype')
};

AnnotationTypes = (function(_super) {
  __extends(AnnotationTypes, _super);

  function AnnotationTypes() {
    return AnnotationTypes.__super__.constructor.apply(this, arguments);
  }

  AnnotationTypes.prototype.model = Models.AnnotationType;

  AnnotationTypes.prototype.url = function() {
    return config.baseUrl + "annotationtypes";
  };

  AnnotationTypes.prototype.comparator = function(annotationType) {
    return annotationType.get('title').toLowerCase();
  };

  return AnnotationTypes;

})(Base);

module.exports = AnnotationTypes;


},{"../../config":100,"../../models/project/annotationtype":109,"../base":92}],96:[function(require,module,exports){
var ProjectHistory, ajax, config, token;

config = require('../../config');

ajax = require('hilib/src/managers/ajax');

token = require('hilib/src/managers/token');

ProjectHistory = (function() {
  ProjectHistory.prototype.fetch = function(done) {
    var jqXHR;
    ajax.token = token.get();
    jqXHR = ajax.get({
      url: this.url
    });
    return jqXHR.done((function(_this) {
      return function(response) {
        return done(response);
      };
    })(this));
  };

  function ProjectHistory(projectID) {
    this.url = "" + config.baseUrl + "projects/" + projectID + "/logentries";
  }

  return ProjectHistory;

})();

module.exports = ProjectHistory;


},{"../../config":100,"hilib/src/managers/ajax":52,"hilib/src/managers/token":56}],97:[function(require,module,exports){
var Base, Models, Projects, config, history,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

config = require('../config');

history = require('hilib/src/managers/history');

Base = require('./base');

Models = {
  Project: require('../models/project/main')
};

Projects = (function(_super) {
  __extends(Projects, _super);

  function Projects() {
    return Projects.__super__.constructor.apply(this, arguments);
  }

  Projects.prototype.model = Models.Project;

  Projects.prototype.url = config.baseUrl + 'projects';

  Projects.prototype.initialize = function() {
    Projects.__super__.initialize.apply(this, arguments);
    return this.on('sync', this.setCurrent, this);
  };

  Projects.prototype.fetch = function(options) {
    if (options == null) {
      options = {};
    }
    if (!options.error) {
      options.error = (function(_this) {
        return function(collection, response, options) {
          if (response.status === 401) {
            sessionStorage.clear();
            return Backbone.history.navigate('login', {
              trigger: true
            });
          }
        };
      })(this);
    }
    return Projects.__super__.fetch.call(this, options);
  };

  Projects.prototype.getCurrent = function(cb) {
    if (this.current != null) {
      return cb(this.current);
    } else {
      return this.once('current:change', (function(_this) {
        return function() {
          return cb(_this.current);
        };
      })(this));
    }
  };

  Projects.prototype.setCurrent = function(id) {
    var fragmentPart;
    fragmentPart = history.last() != null ? history.last().split('/') : [];
    if ((id != null) && _.isString(id)) {
      this.current = this.get(id);
    } else if (fragmentPart[1] === 'projects') {
      this.current = this.find(function(p) {
        return p.get('name') === fragmentPart[2];
      });
    } else {
      this.current = this.first();
    }
    this.current.load((function(_this) {
      return function() {
        return _this.trigger('current:change', _this.current);
      };
    })(this));
    return this.current;
  };

  return Projects;

})(Base);

module.exports = new Projects();


},{"../config":100,"../models/project/main":110,"./base":92,"hilib/src/managers/history":54}],98:[function(require,module,exports){
var Base, Models, StringFn, Transcriptions, config,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

config = require('../config');

Base = require('./base');

StringFn = require('hilib/src/utils/string');

Models = {
  Transcription: require('../models/transcription')
};

Transcriptions = (function(_super) {
  __extends(Transcriptions, _super);

  function Transcriptions() {
    return Transcriptions.__super__.constructor.apply(this, arguments);
  }

  Transcriptions.prototype.model = Models.Transcription;

  Transcriptions.prototype.initialize = function(models, options) {
    this.projectId = options.projectId;
    this.entryId = options.entryId;
    return this.on('remove', (function(_this) {
      return function(model) {
        return model.destroy();
      };
    })(this));
  };

  Transcriptions.prototype.url = function() {
    return config.baseUrl + ("projects/" + this.projectId + "/entries/" + this.entryId + "/transcriptions");
  };

  Transcriptions.prototype.setCurrent = function(model) {
    var transcriptionName;
    if ((model == null) || model !== this.current) {
      if (_.isString(model)) {
        transcriptionName = model;
        this.current = this.find((function(_this) {
          return function(model) {
            return StringFn.slugify(model.get('textLayer')) === StringFn.slugify(transcriptionName);
          };
        })(this));
      } else {
        if (model != null) {
          this.current = model;
        } else {
          this.current = this.findWhere({
            textLayer: 'Diplomatic'
          });
          if (this.current == null) {
            this.first();
          }
        }
      }
      this.trigger('current:change', this.current);
    }
    return this.current;
  };

  return Transcriptions;

})(Base);

module.exports = Transcriptions;


},{"../config":100,"../models/transcription":113,"./base":92,"hilib/src/utils/string":69}],99:[function(require,module,exports){
var Collections, User, Users, config,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

config = require('../config');

User = require('../models/user');

Collections = {
  Base: require('./base')
};

Users = (function(_super) {
  __extends(Users, _super);

  function Users() {
    return Users.__super__.constructor.apply(this, arguments);
  }

  Users.prototype.model = User;

  Users.prototype.url = function() {
    return "" + config.baseUrl + "users";
  };

  Users.prototype.comparator = function(user) {
    var title;
    title = user.get('title');
    if (title != null) {
      return title.toLowerCase();
    } else {
      return '';
    }
  };

  return Users;

})(Collections.Base);

module.exports = Users;


},{"../config":100,"../models/user":114,"./base":92}],100:[function(require,module,exports){
module.exports = {
  baseUrl: 'http://rest.elaborate.huygens.knaw.nl/',
  baseURL: 'http://rest.elaborate.huygens.knaw.nl/',
  roles: {
    'READER': 10,
    'USER': 20,
    'PROJECTLEADER': 30,
    'ADMIN': 40
  }
};


},{}],101:[function(require,module,exports){
var EntryMetadata, ajax, config, token;

config = require('./config');

token = require('hilib/src/managers/token');

ajax = require('hilib/src/managers/ajax');

EntryMetadata = (function() {
  var url;

  url = null;

  function EntryMetadata(projectID) {
    url = "" + config.baseUrl + "projects/" + projectID + "/entrymetadatafields";
  }

  EntryMetadata.prototype.fetch = function(cb) {
    var jqXHR;
    ajax.token = token.get();
    jqXHR = ajax.get({
      url: url
    });
    return jqXHR.done(function(data) {
      return cb(data);
    });
  };

  EntryMetadata.prototype.save = function(newValues, options) {
    var jqXHR;
    ajax.token = token.get();
    jqXHR = ajax.put({
      url: url,
      data: JSON.stringify(newValues)
    });
    return jqXHR.done((function(_this) {
      return function() {
        if (options.success != null) {
          return options.success();
        }
      };
    })(this));
  };

  return EntryMetadata;

})();

module.exports = EntryMetadata;


},{"./config":100,"hilib/src/managers/ajax":52,"hilib/src/managers/token":56}],102:[function(require,module,exports){
var $, app;

$ = require('jquery');

app = require('./app');

$(function() {
  return app.init();
});


},{"./app":90,"jquery":88}],103:[function(require,module,exports){
var Annotation, Backbone, Models, ajax, changedSinceLastSave, config, token,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Backbone = require('backbone');

ajax = require('hilib/src/managers/ajax');

token = require('hilib/src/managers/token');

ajax.token = token.get();

changedSinceLastSave = require('hilib/src/mixins/model.changedsincelastsave');

config = require('../config');

Models = {
  Base: require('./base')
};

Annotation = (function(_super) {
  __extends(Annotation, _super);

  function Annotation() {
    return Annotation.__super__.constructor.apply(this, arguments);
  }

  Annotation.prototype.urlRoot = function() {
    return config.baseUrl + ("projects/" + this.collection.projectId + "/entries/" + this.collection.entryId + "/transcriptions/" + this.collection.transcriptionId + "/annotations");
  };

  Annotation.prototype.defaults = function() {
    return {
      annotationMetadataItems: [],
      annotationNo: 'newannotation',
      annotationType: null,
      body: '',
      createdOn: '',
      creator: null,
      modifiedOn: '',
      modifier: null,
      metadata: {}
    };
  };

  Annotation.prototype.initialize = function() {
    Annotation.__super__.initialize.apply(this, arguments);
    _.extend(this, changedSinceLastSave(['body']));
    return this.initChangedSinceLastSave();
  };

  Annotation.prototype.parse = function(attrs) {
    var item, key, metadataItem, value, _i, _len, _ref;
    if (attrs != null) {
      attrs.metadata = {};
      _ref = attrs.annotationType.metadataItems;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        metadataItem = _ref[_i];
        key = metadataItem.name;
        item = _.find(attrs.annotationMetadataItems, function(item) {
          return item.annotationTypeMetadataItem.name === key;
        });
        value = item != null ? item.data : '';
        attrs.metadata[key] = value;
      }
      return attrs;
    }
  };

  Annotation.prototype.set = function(attrs, options) {
    var attr;
    if (_.isString(attrs) && attrs.substr(0, 9) === 'metadata.') {
      attr = attrs.substr(9);
      if (attr === 'type') {
        if (attr === 'type') {
          return this.trigger('change:metadata:type', parseInt(options, 10));
        }
      } else {
        return this.attributes['metadata'][attr] = options;
      }
    } else {
      return Annotation.__super__.set.apply(this, arguments);
    }
  };

  Annotation.prototype.sync = function(method, model, options) {
    var jqXHR;
    if (method === 'create') {
      jqXHR = ajax.post({
        url: this.url(),
        data: JSON.stringify({
          body: this.get('body'),
          typeId: this.get('annotationType').id,
          metadata: this.get('metadata')
        }),
        dataType: 'text'
      });
      jqXHR.done((function(_this) {
        return function(data, textStatus, jqXHR) {
          var xhr;
          if (jqXHR.status === 201) {
            xhr = ajax.get({
              url: jqXHR.getResponseHeader('Location')
            });
            xhr.done(function(data, textStatus, jqXHR) {
              return options.success(data);
            });
            return xhr.fail(function() {
              return console.log(arguments);
            });
          }
        };
      })(this));
      return jqXHR.fail((function(_this) {
        return function(response) {
          if (response.status === 401) {
            return Backbone.history.navigate('login', {
              trigger: true
            });
          }
        };
      })(this));
    } else if (method === 'update') {
      ajax.token = token.get();
      jqXHR = ajax.put({
        url: this.url(),
        data: JSON.stringify({
          body: this.get('body'),
          typeId: this.get('annotationType').id,
          metadata: this.get('metadata')
        })
      });
      jqXHR.done((function(_this) {
        return function(response) {
          return options.success(response);
        };
      })(this));
      return jqXHR.fail((function(_this) {
        return function(response) {
          if (response.status === 401) {
            return Backbone.history.navigate('login', {
              trigger: true
            });
          }
        };
      })(this));
    } else {
      return Annotation.__super__.sync.apply(this, arguments);
    }
  };

  Annotation.prototype.updateFromClone = function(clone) {
    this.set('annotationType', clone.get('annotationType'));
    return this.set('metadata', clone.get('metadata'));
  };

  return Annotation;

})(Models.Base);

module.exports = Annotation;


},{"../config":100,"./base":104,"backbone":1,"hilib/src/managers/ajax":52,"hilib/src/managers/token":56,"hilib/src/mixins/model.changedsincelastsave":61}],104:[function(require,module,exports){
var Backbone, Base, Pubsub, token,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Backbone = require('backbone');

token = require('hilib/src/managers/token');

Pubsub = require('hilib/src/mixins/pubsub');

Base = (function(_super) {
  __extends(Base, _super);

  function Base() {
    return Base.__super__.constructor.apply(this, arguments);
  }

  Base.prototype.initialize = function() {
    return _.extend(this, Pubsub);
  };

  Base.prototype.sync = function(method, model, options) {
    options.beforeSend = (function(_this) {
      return function(xhr) {
        return xhr.setRequestHeader('Authorization', "" + (token.getType()) + " " + (token.get()));
      };
    })(this);
    return Base.__super__.sync.call(this, method, model, options);
  };

  return Base;

})(Backbone.Model);

module.exports = Base;


},{"backbone":1,"hilib/src/managers/token":56,"hilib/src/mixins/pubsub":63}],105:[function(require,module,exports){
var Collections, CurrentUser, Models, config, token,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

config = require('../config');

token = require('hilib/src/managers/token');

Models = {
  Base: require('./base')
};

Collections = {
  Base: require('../collections/base')
};

CurrentUser = (function(_super) {
  __extends(CurrentUser, _super);

  function CurrentUser() {
    return CurrentUser.__super__.constructor.apply(this, arguments);
  }

  CurrentUser.prototype.defaults = function() {
    return {
      username: '',
      title: '',
      email: '',
      firstName: '',
      lastName: '',
      role: '',
      roleString: '',
      roleNo: '',
      loggedIn: false
    };
  };

  CurrentUser.prototype.initialize = function() {
    CurrentUser.__super__.initialize.apply(this, arguments);
    this.loggedIn = false;
    return this.subscribe('unauthorized', function() {
      return sessionStorage.clear();
    });
  };

  CurrentUser.prototype.parse = function(attrs) {
    if (attrs.title == null) {
      attrs.title = attrs.username;
    }
    attrs.roleNo = config.roles[attrs.role];
    return attrs;
  };

  CurrentUser.prototype.authorized = function() {};

  CurrentUser.prototype.unauthorized = function() {};

  CurrentUser.prototype.navigateToLogin = function() {};

  CurrentUser.prototype.authorize = function(args) {
    this.authorized = args.authorized, this.unauthorized = args.unauthorized, this.navigateToLogin = args.navigateToLogin;
    if (token.get()) {
      return this.fetchUserAttrs({
        done: (function(_this) {
          return function() {
            _this.authorized();
            return _this.loggedIn = true;
          };
        })(this)
      });
    } else {
      return this.navigateToLogin();
    }
  };

  CurrentUser.prototype.login = function(username, password) {
    this.set('username', username);
    return this.fetchUserAttrs({
      username: username,
      password: password,
      done: (function(_this) {
        return function() {
          sessionStorage.setItem('huygens_user', JSON.stringify(_this.attributes));
          _this.authorized();
          return _this.loggedIn = true;
        };
      })(this)
    });
  };

  CurrentUser.prototype.hsidLogin = function(hsid) {
    return this.fetchUserAttrs({
      hsid: hsid,
      done: (function(_this) {
        return function() {
          sessionStorage.setItem('huygens_user', JSON.stringify(_this.attributes));
          _this.authorized();
          return _this.loggedIn = true;
        };
      })(this)
    });
  };

  CurrentUser.prototype.logout = function(args) {
    var jqXHR;
    jqXHR = $.ajax({
      type: 'post',
      url: config.baseUrl + ("sessions/" + (token.get()) + "/logout")
    });
    jqXHR.done(function() {
      sessionStorage.clear();
      return location.reload();
    });
    return jqXHR.fail(function() {
      return console.error('Logout failed');
    });
  };

  CurrentUser.prototype.fetchUserAttrs = function(args) {
    var done, hsid, jqXHR, password, postData, userAttrs, username;
    username = args.username, password = args.password, hsid = args.hsid, done = args.done;
    if (userAttrs = sessionStorage.getItem('huygens_user')) {
      this.set(JSON.parse(userAttrs));
      return done();
    } else {
      if (hsid != null) {
        postData = {
          hsid: hsid
        };
      } else if ((username != null) && (password != null)) {
        postData = {
          username: username,
          password: password
        };
      } else {
        return this.unauthorized();
      }
      jqXHR = $.ajax({
        type: 'post',
        url: config.baseUrl + 'sessions/login',
        data: postData
      });
      jqXHR.done((function(_this) {
        return function(data) {
          var type;
          data.user = _this.parse(data.user);
          if (hsid != null) {
            type = 'Federated';
          }
          token.set(data.token, type);
          _this.set(data.user);
          return done();
        };
      })(this));
      return jqXHR.fail((function(_this) {
        return function() {
          return _this.unauthorized();
        };
      })(this));
    }
  };

  return CurrentUser;

})(Models.Base);

module.exports = new CurrentUser();


},{"../collections/base":92,"../config":100,"./base":104,"hilib/src/managers/token":56}],106:[function(require,module,exports){
var Collections, Entry, Models, ajax, config, syncOverride, token,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

config = require('../config');

ajax = require('hilib/src/managers/ajax');

token = require('hilib/src/managers/token');

syncOverride = require('hilib/src/mixins/model.sync');

Models = {
  Base: require('./base'),
  Settings: require('./entry.settings')
};

Collections = {
  Transcriptions: require('../collections/transcriptions'),
  Facsimiles: require('../collections/facsimiles')
};

Entry = (function(_super) {
  __extends(Entry, _super);

  function Entry() {
    return Entry.__super__.constructor.apply(this, arguments);
  }

  Entry.prototype.urlRoot = function() {
    return config.baseUrl + ("projects/" + this.project.id + "/entries");
  };

  Entry.prototype.defaults = function() {
    return {
      name: '',
      terms: null,
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
      publishable: this.get('publishable'),
      modifier: this.get('modifier'),
      modifiedOn: this.get('modifiedOn')
    });
    newObj.set('settings', new Models.Settings(this.get('settings').toJSON(), {
      projectId: this.project.id,
      entryId: this.id
    }));
    return newObj;
  };

  Entry.prototype.updateFromClone = function(clone) {
    this.set('name', clone.get('name'));
    this.set('publishable', clone.get('publishable'));
    return this.get('settings').set(clone.get('settings').toJSON());
  };

  Entry.prototype.fetchTranscriptions = function(currentTranscriptionName, done) {
    var jqXHR, transcriptions;
    transcriptions = new Collections.Transcriptions([], {
      projectId: this.project.id,
      entryId: this.id
    });
    jqXHR = transcriptions.fetch();
    return jqXHR.done((function(_this) {
      return function() {
        _this.set('transcriptions', transcriptions);
        return done(transcriptions.setCurrent(currentTranscriptionName));
      };
    })(this));
  };

  Entry.prototype.fetchFacsimiles = function(done) {
    var facsimiles, jqXHR;
    facsimiles = new Collections.Facsimiles([], {
      projectId: this.project.id,
      entryId: this.id
    });
    jqXHR = facsimiles.fetch();
    return jqXHR.done((function(_this) {
      return function() {
        _this.set('facsimiles', facsimiles);
        return done(facsimiles.setCurrent());
      };
    })(this));
  };

  Entry.prototype.fetchSettings = function(done) {
    var jqXHR, settings;
    settings = new Models.Settings([], {
      projectId: this.project.id,
      entryId: this.id
    });
    jqXHR = settings.fetch();
    return jqXHR.done((function(_this) {
      return function() {
        _this.set('settings', settings);
        return done();
      };
    })(this));
  };

  Entry.prototype.setPrevNext = function(done) {
    var ids, index, _ref, _ref1;
    ids = this.project.resultSet.get('ids');
    index = ids.indexOf('' + this.id);
    this.prevID = (_ref = ids[index - 1]) != null ? _ref : -1;
    this.nextID = (_ref1 = ids[index + 1]) != null ? _ref1 : -1;
    return done();
  };

  Entry.prototype.fetchPrevNext = function(done) {
    var jqXHR;
    jqXHR = ajax.get({
      url: this.url() + '/prevnext'
    });
    return jqXHR.done((function(_this) {
      return function(response) {
        _this.nextID = response.next;
        _this.prevID = response.prev;
        return done();
      };
    })(this));
  };

  Entry.prototype.sync = function(method, model, options) {
    var data, jqXHR;
    data = JSON.stringify({
      name: this.get('name'),
      publishable: this.get('publishable')
    });
    if (method === 'create') {
      jqXHR = ajax.post({
        url: this.url(),
        data: data,
        dataType: 'text'
      });
      jqXHR.done((function(_this) {
        return function(data, textStatus, jqXHR) {
          var xhr;
          if (jqXHR.status === 201) {
            xhr = ajax.get({
              url: jqXHR.getResponseHeader('Location')
            });
            xhr.done(function(data, textStatus, jqXHR) {
              return options.success(data);
            });
            return xhr.fail(function(response) {
              if (response.status === 401) {
                return Backbone.history.navigate('login', {
                  trigger: true
                });
              }
            });
          }
        };
      })(this));
      return jqXHR.fail((function(_this) {
        return function(response) {
          if (response.status === 401) {
            return Backbone.history.navigate('login', {
              trigger: true
            });
          }
        };
      })(this));
    } else if (method === 'update') {
      jqXHR = ajax.put({
        url: this.url(),
        data: data
      });
      jqXHR.done((function(_this) {
        return function(response) {
          return options.success(response);
        };
      })(this));
      return jqXHR.fail((function(_this) {
        return function(response) {
          if (response.status === 401) {
            return Backbone.history.navigate('login', {
              trigger: true
            });
          }
        };
      })(this));
    } else {
      return Entry.__super__.sync.apply(this, arguments);
    }
  };

  return Entry;

})(Models.Base);

module.exports = Entry;


},{"../collections/facsimiles":94,"../collections/transcriptions":98,"../config":100,"./base":104,"./entry.settings":107,"hilib/src/managers/ajax":52,"hilib/src/managers/token":56,"hilib/src/mixins/model.sync":62}],107:[function(require,module,exports){
var EntrySettings, Models, config,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

config = require('../config');

Models = {
  Base: require('./base')
};

EntrySettings = (function(_super) {
  __extends(EntrySettings, _super);

  function EntrySettings() {
    return EntrySettings.__super__.constructor.apply(this, arguments);
  }

  EntrySettings.prototype.initialize = function(models, options) {
    this.projectId = options.projectId;
    return this.entryId = options.entryId;
  };

  EntrySettings.prototype.url = function() {
    return config.baseUrl + ("projects/" + this.projectId + "/entries/" + this.entryId + "/settings");
  };

  EntrySettings.prototype.sync = function(method, model, options) {
    if (method === 'create') {
      method = 'update';
    }
    return EntrySettings.__super__.sync.apply(this, arguments);
  };

  return EntrySettings;

})(Models.Base);

module.exports = EntrySettings;


},{"../config":100,"./base":104}],108:[function(require,module,exports){
var Facsimile, Models, ajax, config, token,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

ajax = require('hilib/src/managers/ajax');

token = require('hilib/src/managers/token');

config = require('../config');

Models = {
  Base: require('./base')
};

Facsimile = (function(_super) {
  __extends(Facsimile, _super);

  function Facsimile() {
    return Facsimile.__super__.constructor.apply(this, arguments);
  }

  Facsimile.prototype.defaults = function() {
    return {
      name: '',
      filename: '',
      zoomableUrl: ''
    };
  };

  Facsimile.prototype.sync = function(method, model, options) {
    var jqXHR;
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
      jqXHR.done((function(_this) {
        return function(data, textStatus, jqXHR) {
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
        };
      })(this));
      return jqXHR.fail((function(_this) {
        return function(response) {
          if (response.status === 401) {
            return Backbone.history.navigate('login', {
              trigger: true
            });
          }
        };
      })(this));
    } else {
      return Facsimile.__super__.sync.apply(this, arguments);
    }
  };

  return Facsimile;

})(Models.Base);

module.exports = Facsimile;


},{"../config":100,"./base":104,"hilib/src/managers/ajax":52,"hilib/src/managers/token":56}],109:[function(require,module,exports){
var AnnotationType, Models, ajax, config, syncOverride, token,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

config = require('../../config');

ajax = require('hilib/src/managers/ajax');

token = require('hilib/src/managers/token');

syncOverride = require('hilib/src/mixins/model.sync');

Models = {
  Base: require('../base')
};

AnnotationType = (function(_super) {
  __extends(AnnotationType, _super);

  function AnnotationType() {
    return AnnotationType.__super__.constructor.apply(this, arguments);
  }

  AnnotationType.prototype.urlRoot = function() {
    return config.baseUrl + "annotationtypes";
  };

  AnnotationType.prototype.defaults = function() {
    return {
      creator: null,
      modifier: null,
      name: '',
      description: '',
      annotationTypeMetadataItems: [],
      createdOn: '',
      modifiedOn: ''
    };
  };

  AnnotationType.prototype.initialize = function() {
    AnnotationType.__super__.initialize.apply(this, arguments);
    return _.extend(this, syncOverride);
  };

  AnnotationType.prototype.parse = function(attrs) {
    attrs.title = attrs.name;
    return attrs;
  };

  AnnotationType.prototype.sync = function(method, model, options) {
    var jqXHR;
    if (method === 'create') {
      ajax.token = token.get();
      jqXHR = ajax.post({
        url: this.url(),
        dataType: 'text',
        data: JSON.stringify({
          name: model.get('name'),
          description: model.get('description')
        })
      });
      jqXHR.done((function(_this) {
        return function(data, textStatus, jqXHR) {
          var xhr;
          if (jqXHR.status === 201) {
            xhr = ajax.get({
              url: jqXHR.getResponseHeader('Location')
            });
            return xhr.done(function(data, textStatus, jqXHR) {
              return options.success(data);
            });
          }
        };
      })(this));
      return jqXHR.fail((function(_this) {
        return function(response) {
          if (response.status === 401) {
            return Backbone.history.navigate('login', {
              trigger: true
            });
          }
        };
      })(this));
    } else if (method === 'update') {
      ajax.token = token.get();
      jqXHR = ajax.put({
        url: this.url(),
        data: JSON.stringify({
          name: model.get('name'),
          description: model.get('description')
        })
      });
      jqXHR.done((function(_this) {
        return function(response) {
          return _this.trigger('sync');
        };
      })(this));
      return jqXHR.fail((function(_this) {
        return function(response) {
          if (response.status === 401) {
            return Backbone.history.navigate('login', {
              trigger: true
            });
          }
        };
      })(this));
    } else {
      return AnnotationType.__super__.sync.apply(this, arguments);
    }
  };

  return AnnotationType;

})(Models.Base);

module.exports = AnnotationType;


},{"../../config":100,"../base":104,"hilib/src/managers/ajax":52,"hilib/src/managers/token":56,"hilib/src/mixins/model.sync":62}],110:[function(require,module,exports){
var Async, Collections, EntryMetadata, Fn, Models, Project, ProjectAnnotationTypeIDs, ProjectUserIDs, ajax, config, token,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Fn = require('hilib/src/utils/general');

ajax = require('hilib/src/managers/ajax');

token = require('hilib/src/managers/token');

Async = require('hilib/src/managers/async');

config = require('../../config');

Models = {
  Base: require('../base'),
  Settings: require('./settings')
};

EntryMetadata = require('../../entry.metadata');

ProjectUserIDs = require('../../project.user.ids');

ProjectAnnotationTypeIDs = require('../../project.annotationtype.ids');

Collections = {
  Entries: require('../../collections/entries'),
  AnnotationTypes: require('../../collections/project/annotationtypes'),
  Users: require('../../collections/users')
};

Project = (function(_super) {
  __extends(Project, _super);

  function Project() {
    return Project.__super__.constructor.apply(this, arguments);
  }

  Project.prototype.defaults = function() {
    return {
      annotationtypes: null,
      createdOn: '',
      creator: null,
      entries: null,
      entrymetadatafields: null,
      level1: '',
      level2: '',
      level3: '',
      modifiedOn: '',
      modifier: null,
      name: '',
      projectLeaderId: null,
      settings: null,
      textLayers: [],
      title: '',
      userIDs: []
    };
  };

  Project.prototype.parse = function(attrs) {
    attrs.entries = new Collections.Entries([], {
      projectId: attrs.id
    });
    return attrs;
  };

  Project.prototype.addAnnotationType = function(annotationType, done) {
    var ids;
    ids = this.get('annotationtypeIDs');
    ids.push(annotationType.id);
    return this.projectAnnotationTypeIDs.save(ids, {
      success: (function(_this) {
        return function() {
          _this.allannotationtypes.add(annotationType);
          return done();
        };
      })(this)
    });
  };

  Project.prototype.removeAnnotationType = function(id, done) {
    return this.projectAnnotationTypeIDs.save(Fn.removeFromArray(this.get('annotationtypeIDs'), id), {
      success: (function(_this) {
        return function() {
          _this.allannotationtypes.remove(id);
          return done();
        };
      })(this)
    });
  };

  Project.prototype.addUser = function(user, done) {
    var userIDs;
    userIDs = this.get('userIDs');
    userIDs.push(user.id);
    return this.projectUserIDs.save(userIDs, {
      success: (function(_this) {
        return function() {
          _this.allusers.add(user);
          _this.get('members').add(user);
          return done();
        };
      })(this)
    });
  };

  Project.prototype.removeUser = function(id, done) {
    return this.projectUserIDs.save(Fn.removeFromArray(this.get('userIDs'), id), {
      success: (function(_this) {
        return function() {
          _this.allusers.remove(id);
          _this.get('members').removeById(id);
          return done();
        };
      })(this)
    });
  };

  Project.prototype.load = function(cb) {
    var async, settings;
    if (this.get('annotationtypes') === null && this.get('entrymetadatafields') === null && this.get('userIDs').length === 0) {
      async = new Async(['annotationtypes', 'users', 'entrymetadatafields', 'settings']);
      async.on('ready', (function(_this) {
        return function(data) {
          return cb();
        };
      })(this));
      new Collections.AnnotationTypes().fetch({
        success: (function(_this) {
          return function(collection, response, options) {
            _this.allannotationtypes = collection;
            _this.projectAnnotationTypeIDs = new ProjectAnnotationTypeIDs(_this.id);
            return _this.projectAnnotationTypeIDs.fetch(function(data) {
              _this.set('annotationtypeIDs', data);
              _this.set('annotationtypes', new Collections.AnnotationTypes(collection.filter(function(model) {
                return data.indexOf(model.id) > -1;
              })));
              return async.called('annotationtypes');
            });
          };
        })(this)
      });
      new Collections.Users().fetch({
        success: (function(_this) {
          return function(collection) {
            _this.allusers = collection;
            _this.projectUserIDs = new ProjectUserIDs(_this.id);
            return _this.projectUserIDs.fetch(function(data) {
              _this.set('userIDs', data);
              _this.set('members', new Collections.Users(collection.filter(function(model) {
                return data.indexOf(model.id) > -1;
              })));
              return async.called('users');
            });
          };
        })(this)
      });
      new EntryMetadata(this.id).fetch((function(_this) {
        return function(data) {
          _this.set('entrymetadatafields', data);
          return async.called('entrymetadatafields');
        };
      })(this));
      settings = new Models.Settings(null, {
        projectID: this.id
      });
      return settings.fetch({
        success: (function(_this) {
          return function(model) {
            _this.set('settings', model);
            return async.called('settings');
          };
        })(this)
      });
    } else {
      return cb();
    }
  };

  Project.prototype.fetchEntrymetadatafields = function(cb) {
    var jqXHR;
    ajax.token = token.get();
    jqXHR = ajax.get({
      url: config.baseUrl + ("projects/" + this.id + "/entrymetadatafields"),
      dataType: 'text'
    });
    jqXHR.done((function(_this) {
      return function(response) {
        _this.set('entrymetadatafields', response);
        return cb();
      };
    })(this));
    return jqXHR.fail((function(_this) {
      return function(response) {
        if (response.status === 401) {
          return Backbone.history.navigate('login', {
            trigger: true
          });
        }
      };
    })(this));
  };

  Project.prototype.publishDraft = function(cb) {
    var jqXHR;
    ajax.token = token.get();
    jqXHR = ajax.post({
      url: config.baseUrl + ("projects/" + this.id + "/draft"),
      dataType: 'text'
    });
    jqXHR.done((function(_this) {
      return function() {
        var locationUrl;
        locationUrl = jqXHR.getResponseHeader('Location');
        localStorage.setItem('publishDraftLocation', locationUrl);
        return _this.pollDraft(locationUrl, cb);
      };
    })(this));
    return jqXHR.fail((function(_this) {
      return function(response) {
        if (response.status === 401) {
          return Backbone.history.navigate('login', {
            trigger: true
          });
        }
      };
    })(this));
  };

  Project.prototype.pollDraft = function(url, done) {
    return ajax.poll({
      url: url,
      testFn: (function(_this) {
        return function(data) {
          return data.done;
        };
      })(this),
      done: (function(_this) {
        return function(data, textStatus, jqXHR) {
          localStorage.removeItem('publishDraftLocation');
          _this.publish('message', "Publication <a href='" + data.url + "' target='_blank' data-bypass>ready</a>.");
          return done();
        };
      })(this)
    });
  };

  Project.prototype.saveTextlayers = function(done) {
    var jqXHR;
    ajax.token = token.get();
    jqXHR = ajax.put({
      url: config.baseUrl + ("projects/" + this.id + "/textlayers"),
      data: JSON.stringify(this.get('textLayers'))
    });
    jqXHR.done((function(_this) {
      return function() {
        return done();
      };
    })(this));
    return jqXHR.fail((function(_this) {
      return function(response) {
        if (response.status === 401) {
          return Backbone.history.navigate('login', {
            trigger: true
          });
        }
      };
    })(this));
  };

  return Project;

})(Models.Base);

module.exports = Project;


},{"../../collections/entries":93,"../../collections/project/annotationtypes":95,"../../collections/users":99,"../../config":100,"../../entry.metadata":101,"../../project.annotationtype.ids":115,"../../project.user.ids":116,"../base":104,"./settings":111,"hilib/src/managers/ajax":52,"hilib/src/managers/async":53,"hilib/src/managers/token":56,"hilib/src/utils/general":67}],111:[function(require,module,exports){
var Models, ProjectSettings, ajax, config, token,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

config = require('../../config');

token = require('hilib/src/managers/token');

ajax = require('hilib/src/managers/ajax');

Models = {
  Base: require('../base')
};

ProjectSettings = (function(_super) {
  __extends(ProjectSettings, _super);

  function ProjectSettings() {
    return ProjectSettings.__super__.constructor.apply(this, arguments);
  }

  ProjectSettings.prototype.defaults = function() {
    return {
      'Project leader': '',
      'Project title': '',
      'projectType': '',
      'publicationURL': '',
      'Release date': '',
      'Start date': '',
      'Version': '',
      'entry.term_singular': 'entry',
      'entry.term_plural': 'entries',
      'text.font': ''
    };
  };

  ProjectSettings.prototype.url = function() {
    return "" + config.baseUrl + "projects/" + this.projectID + "/settings";
  };

  ProjectSettings.prototype.initialize = function(attrs, options) {
    ProjectSettings.__super__.initialize.apply(this, arguments);
    return this.projectID = options.projectID;
  };

  ProjectSettings.prototype.sync = function(method, model, options) {
    var jqXHR;
    if (method === 'create') {
      ajax.token = token.get();
      jqXHR = ajax.put({
        url: this.url(),
        data: JSON.stringify(this)
      });
      jqXHR.done((function(_this) {
        return function(response) {
          return options.success(response);
        };
      })(this));
      return jqXHR.fail((function(_this) {
        return function(response) {
          if (response.status === 401) {
            return Backbone.history.navigate('login', {
              trigger: true
            });
          }
        };
      })(this));
    } else {
      return ProjectSettings.__super__.sync.call(this, method, model, options);
    }
  };

  return ProjectSettings;

})(Models.Base);

module.exports = ProjectSettingss;


},{"../../config":100,"../base":104,"hilib/src/managers/ajax":52,"hilib/src/managers/token":56}],112:[function(require,module,exports){
var Backbone, Base, ProjectStatistics, ajax, config, token,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Backbone = require('backbone');

config = require('../../config');

ajax = require('hilib/src/managers/ajax');

token = require('hilib/src/managers/token');

Base = require('../base');

ProjectStatistics = (function(_super) {
  __extends(ProjectStatistics, _super);

  function ProjectStatistics() {
    return ProjectStatistics.__super__.constructor.apply(this, arguments);
  }

  ProjectStatistics.prototype.url = function() {
    return "" + config.baseUrl + "projects/" + this.projectID + "/statistics";
  };

  ProjectStatistics.prototype.initialize = function(attrs, options) {
    ProjectStatistics.__super__.initialize.apply(this, arguments);
    return this.projectID = options.projectID;
  };

  ProjectStatistics.prototype.sync = function(method, model, options) {
    var jqXHR;
    if (method === 'read') {
      ajax.token = token.get();
      jqXHR = ajax.get({
        url: this.url()
      });
      jqXHR.done((function(_this) {
        return function(response) {
          return options.success(response);
        };
      })(this));
      return jqXHR.fail((function(_this) {
        return function(response) {
          console.error('Saving ProjectSettings failed!');
          if (response.status === 401) {
            return Backbone.history.navigate('login', {
              trigger: true
            });
          }
        };
      })(this));
    } else {
      return ProjectStatistics.__super__.sync.call(this, method, model, options);
    }
  };

  return ProjectStatistics;

})(Base);

module.exports = ProjectStatistics;


},{"../../config":100,"../base":104,"backbone":1,"hilib/src/managers/ajax":52,"hilib/src/managers/token":56}],113:[function(require,module,exports){
var Collections, Models, Transcription, ajax, changedSinceLastSave, config, token,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

config = require('../config');

ajax = require('hilib/src/managers/ajax');

token = require('hilib/src/managers/token');

changedSinceLastSave = require('hilib/src/mixins/model.changedsincelastsave');

Models = {
  Base: require('./base')
};

Collections = {
  Annotations: require('../collections/annotations')
};

Transcription = (function(_super) {
  __extends(Transcription, _super);

  function Transcription() {
    return Transcription.__super__.constructor.apply(this, arguments);
  }

  Transcription.prototype.defaults = function() {
    return {
      annotations: null,
      textLayer: '',
      title: '',
      body: ''
    };
  };

  Transcription.prototype.initialize = function() {
    Transcription.__super__.initialize.apply(this, arguments);
    _.extend(this, changedSinceLastSave(['body']));
    return this.initChangedSinceLastSave();
  };

  Transcription.prototype.set = function(attrs, options) {
    if (attrs === 'body') {
      options = options.replace(/<div><br><\/div>/g, '<br>');
      options = options.replace(/<div>(.*?)<\/div>/g, (function(_this) {
        return function(match, p1, offset, string) {
          return '<br>' + p1;
        };
      })(this));
      options.trim();
    }
    return Transcription.__super__.set.apply(this, arguments);
  };

  Transcription.prototype.sync = function(method, model, options) {
    var jqXHR;
    if (method === 'create') {
      ajax.token = token.get();
      jqXHR = ajax.post({
        url: this.url(),
        dataType: 'text',
        data: JSON.stringify({
          textLayer: model.get('textLayer'),
          body: model.get('body')
        })
      });
      jqXHR.done((function(_this) {
        return function(data, textStatus, jqXHR) {
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
        };
      })(this));
      return jqXHR.fail((function(_this) {
        return function(response) {
          if (response.status === 401) {
            return Backbone.history.navigate('login', {
              trigger: true
            });
          }
        };
      })(this));
    } else if (method === 'update') {
      ajax.token = token.get();
      jqXHR = ajax.put({
        url: this.url(),
        data: JSON.stringify({
          body: model.get('body')
        })
      });
      jqXHR.done((function(_this) {
        return function(response) {
          _this.trigger('sync');
          return options.success(response);
        };
      })(this));
      return jqXHR.fail((function(_this) {
        return function(response) {
          if (response.status === 401) {
            return Backbone.history.navigate('login', {
              trigger: true
            });
          }
        };
      })(this));
    } else {
      return Transcription.__super__.sync.apply(this, arguments);
    }
  };

  Transcription.prototype.getAnnotations = function(cb) {
    var annotations, jqXHR;
    if (cb == null) {
      cb = function() {};
    }
    if (this.get('annotations') != null) {
      return cb(this.get('annotations'));
    } else {
      annotations = new Collections.Annotations([], {
        transcriptionId: this.id,
        entryId: this.collection.entryId,
        projectId: this.collection.projectId
      });
      jqXHR = annotations.fetch({
        success: (function(_this) {
          return function(collection) {
            _this.set('annotations', collection);
            _this.listenTo(collection, 'add', _this.addAnnotation);
            _this.listenTo(collection, 'remove', _this.removeAnnotation);
            return cb(collection);
          };
        })(this)
      });
      return jqXHR.fail((function(_this) {
        return function(response) {
          if (response.status === 401) {
            return Backbone.history.navigate('login', {
              trigger: true
            });
          }
        };
      })(this));
    }
  };

  Transcription.prototype.addAnnotation = function(model) {
    var $body;
    if (model.get('annotationNo') == null) {
      console.error('No annotationNo given!', model.get('annotationNo'));
      return false;
    }
    $body = $("<div>" + (this.get('body')) + "</div>");
    $body.find('[data-id="newannotation"]').attr('data-id', model.get('annotationNo'));
    return this.resetAnnotationOrder($body);
  };

  Transcription.prototype.removeAnnotation = function(model) {
    var jqXHR;
    jqXHR = model.destroy();
    jqXHR.done((function(_this) {
      return function() {
        var $body;
        $body = $("<div>" + (_this.get('body')) + "</div>");
        $body.find("[data-id='" + (model.get('annotationNo')) + "']").remove();
        return _this.resetAnnotationOrder($body, false);
      };
    })(this));
    return jqXHR.fail((function(_this) {
      return function(response) {
        if (response.status === 401) {
          return Backbone.history.navigate('login', {
            trigger: true
          });
        }
      };
    })(this));
  };

  Transcription.prototype.resetAnnotationOrder = function($body, add) {
    var jqXHR;
    if (add == null) {
      add = true;
    }
    $body.find('sup[data-marker="end"]').each((function(_this) {
      return function(index, sup) {
        return sup.innerHTML = index + 1;
      };
    })(this));
    this.set('body', $body.html());
    jqXHR = this.save(null, {
      success: (function(_this) {
        return function() {
          var message;
          message = add ? "New annotation added." : "Annotation removed.";
          return _this.publish('message', message);
        };
      })(this)
    });
    return jqXHR.fail((function(_this) {
      return function(response) {
        if (response.status === 401) {
          return Backbone.history.navigate('login', {
            trigger: true
          });
        }
      };
    })(this));
  };

  return Transcription;

})(Models.Base);

module.exports = Transcription;


},{"../collections/annotations":91,"../config":100,"./base":104,"hilib/src/managers/ajax":52,"hilib/src/managers/token":56,"hilib/src/mixins/model.changedsincelastsave":61}],114:[function(require,module,exports){
var Models, User, ajax, config, token,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

config = require('../config');

ajax = require('hilib/src/managers/ajax');

token = require('hilib/src/managers/token');

Models = {
  Base: require('./base')
};

User = (function(_super) {
  __extends(User, _super);

  function User() {
    return User.__super__.constructor.apply(this, arguments);
  }

  User.prototype.urlRoot = function() {
    return config.baseUrl + "users";
  };

  User.prototype.validation = {
    username: {
      required: true
    },
    password: {
      required: true
    }
  };

  User.prototype.defaults = function() {
    return {
      username: '',
      email: '',
      firstName: '',
      lastName: '',
      role: 'USER',
      password: ''
    };
  };

  User.prototype.getShortName = function() {
    var name;
    name = this.get('lastName');
    if (name == null) {
      name = this.get('firstName');
    }
    if (name == null) {
      name = 'user';
    }
    return name;
  };

  User.prototype.parse = function(attr) {
    attr.title = attr.title + ' (' + attr.username + ')';
    return attr;
  };

  User.prototype.sync = function(method, model, options) {
    var data, jqXHR;
    if (method === 'create') {
      ajax.token = token.get();
      jqXHR = ajax.post({
        url: this.url(),
        dataType: 'text',
        data: JSON.stringify(model.toJSON())
      });
      jqXHR.done((function(_this) {
        return function(data, textStatus, jqXHR) {
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
        };
      })(this));
      return jqXHR.fail((function(_this) {
        return function(response) {
          options.error(response);
          if (response.status === 401) {
            return Backbone.history.navigate('login', {
              trigger: true
            });
          }
        };
      })(this));
    } else if (method === 'update') {
      data = model.clone().toJSON();
      delete data.title;
      delete data.roleString;
      delete data.loggedIn;
      ajax.token = token.get();
      jqXHR = ajax.put({
        url: this.url(),
        data: JSON.stringify(data)
      });
      jqXHR.done((function(_this) {
        return function(response) {
          return _this.trigger('sync');
        };
      })(this));
      return jqXHR.fail((function(_this) {
        return function(response) {
          options.error(response);
          return jqXHR.fail(function(response) {
            if (response.status === 401) {
              return Backbone.history.navigate('login', {
                trigger: true
              });
            }
          });
        };
      })(this));
    } else {
      return User.__super__.sync.apply(this, arguments);
    }
  };

  return User;

})(Models.Base);

module.exports = User;


},{"../config":100,"./base":104,"hilib/src/managers/ajax":52,"hilib/src/managers/token":56}],115:[function(require,module,exports){
var AnnotationTypeIDs, ajax, config, token;

config = require('./config');

token = require('hilib/src/managers/token');

ajax = require('hilib/src/managers/ajax');

AnnotationTypeIDs = (function() {
  var url;

  url = null;

  function AnnotationTypeIDs(projectID) {
    url = "" + config.baseUrl + "projects/" + projectID + "/annotationtypes";
  }

  AnnotationTypeIDs.prototype.fetch = function(cb) {
    var jqXHR;
    ajax.token = token.get();
    jqXHR = ajax.get({
      url: url
    });
    return jqXHR.done(function(data) {
      return cb(data);
    });
  };

  AnnotationTypeIDs.prototype.save = function(newValues, options) {
    var jqXHR;
    if (options == null) {
      options = {};
    }
    ajax.token = token.get();
    jqXHR = ajax.put({
      url: url,
      data: JSON.stringify(newValues)
    });
    return jqXHR.done((function(_this) {
      return function() {
        if (options.success != null) {
          return options.success();
        }
      };
    })(this));
  };

  return AnnotationTypeIDs;

})();

module.exports = AnnotationTypeIDs;


},{"./config":100,"hilib/src/managers/ajax":52,"hilib/src/managers/token":56}],116:[function(require,module,exports){
var ProjectUserIDs, ajax, config, token;

config = require('./config');

token = require('hilib/src/managers/token');

ajax = require('hilib/src/managers/ajax');

ProjectUserIDs = (function() {
  var url;

  url = null;

  function ProjectUserIDs(projectID) {
    url = "" + config.baseUrl + "projects/" + projectID + "/projectusers";
  }

  ProjectUserIDs.prototype.fetch = function(cb) {
    var jqXHR;
    ajax.token = token.get();
    jqXHR = ajax.get({
      url: url
    });
    return jqXHR.done(function(data) {
      return cb(data);
    });
  };

  ProjectUserIDs.prototype.save = function(newValues, options) {
    var jqXHR;
    if (options == null) {
      options = {};
    }
    ajax.token = token.get();
    jqXHR = ajax.put({
      url: url,
      data: JSON.stringify(newValues)
    });
    return jqXHR.done((function(_this) {
      return function() {
        if (options.success != null) {
          return options.success();
        }
      };
    })(this));
  };

  return ProjectUserIDs;

})();

module.exports = ProjectUserIDs;


},{"./config":100,"hilib/src/managers/ajax":52,"hilib/src/managers/token":56}],117:[function(require,module,exports){
var Backbone, Collections, Fn, MainRouter, Models, Pubsub, Views, history, viewManager,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Backbone = require('backbone');

viewManager = require('hilib/src/managers/view2');

history = require('hilib/src/managers/history');

Pubsub = require('hilib/src/mixins/pubsub');

Fn = require('hilib/src/utils/general');

Models = {
  currentUser: require('../models/currentUser')
};

Collections = {
  projects: require('../collections/projects')
};

Views = {
  Login: require('../views/login'),
  ProjectMain: require('../views/project/main'),
  ProjectSettings: require('../views/project/settings/main'),
  ProjectHistory: require('../views/project/history'),
  Statistics: require('../views/project/statistics'),
  Entry: require('../views/entry/main'),
  Header: require('../views/ui/header')
};

MainRouter = (function(_super) {
  __extends(MainRouter, _super);

  function MainRouter() {
    return MainRouter.__super__.constructor.apply(this, arguments);
  }

  MainRouter.prototype.initialize = function() {
    _.extend(this, Pubsub);
    return this.on('route', (function(_this) {
      return function() {
        return history.update();
      };
    })(this));
  };

  MainRouter.prototype.init = function() {
    return Models.currentUser.authorize({
      authorized: (function(_this) {
        return function() {
          Collections.projects.fetch();
          return Collections.projects.getCurrent(function(project) {
            var header, url, _ref;
            _this.project = project;
            url = (_ref = history.last()) != null ? _ref : 'projects/' + _this.project.get('name');
            _this.navigate(url, {
              trigger: true
            });
            header = new Views.Header({
              project: _this.project
            });
            $('header.main').html(header.el);
            return _this.listenTo(Collections.projects, 'current:change', function(project) {
              _this.project = project;
              return _this.navigate("projects/" + (_this.project.get('name')), {
                trigger: true
              });
            });
          });
        };
      })(this),
      unauthorized: (function(_this) {
        return function() {
          return _this.publish('login:failed');
        };
      })(this),
      navigateToLogin: (function(_this) {
        return function() {
          return _this.navigate('login', {
            trigger: true
          });
        };
      })(this)
    });
  };

  MainRouter.prototype.manageView = function(View, options) {
    return viewManager.show($('div#main'), View, options);
  };

  MainRouter.prototype.routes = {
    '': 'projectMain',
    'login': 'login',
    'projects/:name': 'projectMain',
    'projects/:name/settings/:tab': 'projectSettings',
    'projects/:name/settings': 'projectSettings',
    'projects/:name/history': 'projectHistory',
    'projects/:name/statistics': 'statistics',
    'projects/:name/entries/:id': 'entry',
    'projects/:name/entries/:id/transcriptions/:name': 'entry',
    'projects/:name/entries/:id/transcriptions/:name/annotations/:id': 'entry'
  };

  MainRouter.prototype.login = function() {
    return this.manageView(Views.Login);
  };

  MainRouter.prototype.projectMain = function(projectName) {
    return this.manageView(Views.ProjectMain, {
      projectName: projectName
    });
  };

  MainRouter.prototype.projectSettings = function(projectName, tab) {
    return this.manageView(Views.ProjectSettings, {
      projectName: projectName,
      tabName: tab
    });
  };

  MainRouter.prototype.projectHistory = function(projectName) {
    return this.manageView(Views.ProjectHistory, {
      projectName: projectName
    });
  };

  MainRouter.prototype.statistics = function(projectName) {
    return this.manageView(Views.Statistics, {
      projectName: projectName
    });
  };

  MainRouter.prototype.entry = function(projectName, entryID, transcriptionName, annotationID) {
    var attrs, changedIndex;
    attrs = {
      projectName: projectName,
      entryId: entryID,
      transcriptionName: transcriptionName,
      annotationID: annotationID
    };
    if (this.project != null) {
      changedIndex = this.project.get('entries').changed.indexOf(+entryID);
    }
    if (changedIndex > -1) {
      this.project.get('entries').changed.splice(changedIndex, 1);
      attrs.cache = false;
    }
    return this.manageView(Views.Entry, attrs);
  };

  return MainRouter;

})(Backbone.Router);

module.exports = MainRouter;


},{"../collections/projects":97,"../models/currentUser":105,"../views/entry/main":121,"../views/login":127,"../views/project/history":129,"../views/project/main":130,"../views/project/settings/main":132,"../views/project/statistics":135,"../views/ui/header":136,"backbone":1,"hilib/src/managers/history":54,"hilib/src/managers/view2":57,"hilib/src/mixins/pubsub":63,"hilib/src/utils/general":67}],118:[function(require,module,exports){
var AnnotationEditor, Collections, Views, tpl, viewManager,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

viewManager = require('hilib/src/managers/view2');

Collections = {
  projects: require('../../../collections/projects')
};

Views = {
  Base: require('hilib/src/views/base'),
  SuperTinyEditor: require('hilib/src/views/supertinyeditor/supertinyeditor'),
  Modal: require('hilib/src/views/modal/main'),
  Form: require('hilib/src/views/form/main')
};

tpl = require('../../../../jade/entry/annotation.metadata.jade');

AnnotationEditor = (function(_super) {
  __extends(AnnotationEditor, _super);

  function AnnotationEditor() {
    return AnnotationEditor.__super__.constructor.apply(this, arguments);
  }

  AnnotationEditor.prototype.className = '';

  AnnotationEditor.prototype.initialize = function() {
    AnnotationEditor.__super__.initialize.apply(this, arguments);
    return Collections.projects.getCurrent((function(_this) {
      return function(project) {
        _this.project = project;
        return _this.render();
      };
    })(this));
  };

  AnnotationEditor.prototype.render = function() {
    this.subviews.editor = new Views.SuperTinyEditor({
      cssFile: '/css/main.css',
      controls: ['b_save', 'b_cancel', 'b_metadata', 'n', 'n', 'bold', 'italic', 'underline', 'strikethrough', '|', 'subscript', 'superscript', 'unformat', '|', 'diacritics', '|', 'undo', 'redo'],
      height: this.options.height,
      html: this.model.get('body'),
      htmlAttribute: 'body',
      model: this.model,
      width: this.options.width,
      wrap: true
    });
    this.$el.html(this.subviews.editor.el);
    this.listenTo(this.subviews.editor, 'button:save', this.save);
    this.listenTo(this.subviews.editor, 'button:cancel', (function(_this) {
      return function() {
        return _this.trigger('cancel');
      };
    })(this));
    this.listenTo(this.subviews.editor, 'button:metadata', this.editMetadata);
    this.show();
    return this;
  };

  AnnotationEditor.prototype.events = function() {};

  AnnotationEditor.prototype.show = function(annotation) {
    if (this.visible()) {
      this.hide();
    }
    if (annotation != null) {
      this.model = annotation;
      this.subviews.editor.setModel(this.model);
    }
    this.subviews.editor.$('.ste-header:nth-child(2)').addClass('annotationtext').html(this.model.get('annotatedText'));
    this.setURLPath(this.model.id);
    return this.el.style.display = 'block';
  };

  AnnotationEditor.prototype.hide = function() {
    this.el.style.display = 'none';
    return this.trigger('hide', this.model.get('annotationNo'));
  };

  AnnotationEditor.prototype.visible = function() {
    return this.el.style.display === 'block';
  };

  AnnotationEditor.prototype.setURLPath = function(id) {
    var fragment, index;
    index = Backbone.history.fragment.indexOf('/annotations/');
    fragment = index !== -1 ? Backbone.history.fragment.substr(0, index) : Backbone.history.fragment;
    if (id != null) {
      fragment = fragment + '/annotations/' + id;
    }
    return Backbone.history.navigate(fragment, {
      replace: true
    });
  };

  AnnotationEditor.prototype.save = function(done) {
    if (done == null) {
      done = function() {};
    }
    if (this.model.isNew()) {
      return this.model.save([], {
        success: (function(_this) {
          return function(model) {
            _this.setURLPath(model.id);
            _this.publish('message', "Annotation " + (_this.model.get('annotationNo')) + " saved.");
            _this.trigger('newannotation:saved', model);
            return done();
          };
        })(this),
        error: (function(_this) {
          return function(model, xhr, options) {
            return console.error('Saving annotation failed!', model, xhr, options);
          };
        })(this)
      });
    } else {
      return this.model.save([], {
        success: (function(_this) {
          return function(model) {
            _this.setURLPath(model.id);
            _this.publish('message', "Annotation " + (_this.model.get('annotationNo')) + " saved.");
            return done();
          };
        })(this)
      });
    }
  };

  AnnotationEditor.prototype.editMetadata = function() {
    if (this.subviews.annotationMetadata != null) {
      this.subviews.annotationMetadata.destroy();
    }
    this.subviews.annotationMetadata = new Views.Form({
      tpl: tpl,
      model: this.model.clone(),
      collection: this.project.get('annotationtypes')
    });
    this.subviews.annotationMetadata.model.on('change:metadata:type', (function(_this) {
      return function(annotationTypeID) {
        _this.subviews.annotationMetadata.model.set('metadata', {});
        _this.subviews.annotationMetadata.model.set('annotationType', _this.project.get('annotationtypes').get(annotationTypeID).attributes);
        return _this.subviews.annotationMetadata.render();
      };
    })(this));
    if (this.subviews.modal != null) {
      this.subviews.modal.destroy();
    }
    this.subviews.modal = new Views.Modal({
      title: "Edit annotation metadata",
      html: this.subviews.annotationMetadata.el,
      submitValue: 'Save metadata',
      width: '300px'
    });
    return this.subviews.modal.on('submit', (function(_this) {
      return function() {
        _this.model.updateFromClone(_this.subviews.annotationMetadata.model);
        return _this.save(function() {
          _this.publish('message', "Saved metadata for annotation: " + (_this.model.get('annotationNo')) + ".");
          return _this.subviews.modal.close();
        });
      };
    })(this));
  };

  return AnnotationEditor;

})(Views.Base);

module.exports = AnnotationEditor;


},{"../../../../jade/entry/annotation.metadata.jade":137,"../../../collections/projects":97,"hilib/src/managers/view2":57,"hilib/src/views/base":70,"hilib/src/views/form/main":75,"hilib/src/views/modal/main":80,"hilib/src/views/supertinyeditor/supertinyeditor":86}],119:[function(require,module,exports){
var LayerEditor, StringFn, Views, viewManager,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

viewManager = require('hilib/src/managers/view2');

StringFn = require('hilib/src/utils/string');

Views = {
  Base: require('hilib/src/views/base'),
  SuperTinyEditor: require('hilib/src/views/supertinyeditor/supertinyeditor'),
  Modal: require('hilib/src/views/modal/main')
};

LayerEditor = (function(_super) {
  __extends(LayerEditor, _super);

  function LayerEditor() {
    return LayerEditor.__super__.constructor.apply(this, arguments);
  }

  LayerEditor.prototype.className = '';

  LayerEditor.prototype.initialize = function() {
    LayerEditor.__super__.initialize.apply(this, arguments);
    return this.render();
  };

  LayerEditor.prototype.render = function() {
    this.subviews.editor = new Views.SuperTinyEditor({
      controls: ['b_save', 'n', 'bold', 'italic', 'underline', 'strikethrough', '|', 'subscript', 'superscript', 'unformat', '|', 'diacritics', '|', 'undo', 'redo', '|', 'wordwrap'],
      cssFile: '/css/main.css',
      height: this.options.height,
      html: this.model.get('body'),
      htmlAttribute: 'body',
      model: this.model,
      width: this.options.width
    });
    this.$el.html(this.subviews.editor.el);
    this.listenTo(this.subviews.editor, 'control:wordwrap', (function(_this) {
      return function(wrap) {
        return _this.trigger('wrap', wrap);
      };
    })(this));
    this.listenTo(this.subviews.editor, 'button:save', (function(_this) {
      return function() {
        return _this.model.save(null, {
          success: function() {
            return _this.publish('message', "" + (_this.model.get('textLayer')) + " layer saved.");
          }
        });
      };
    })(this));
    this.show();
    return this;
  };

  LayerEditor.prototype.events = function() {};

  LayerEditor.prototype.show = function(textLayer) {
    if (this.visible()) {
      this.hide();
    }
    if (textLayer != null) {
      this.model = textLayer;
      this.subviews.editor.setModel(this.model);
    }
    this.setURLPath();
    return this.el.style.display = 'block';
  };

  LayerEditor.prototype.hide = function() {
    return this.el.style.display = 'none';
  };

  LayerEditor.prototype.visible = function() {
    return this.el.style.display === 'block';
  };

  LayerEditor.prototype.setURLPath = function() {
    var index, newFragment, newTextLayer, oldFragment, oldTextLayer;
    oldFragment = Backbone.history.fragment;
    index = oldFragment.indexOf('/transcriptions/');
    newFragment = index !== -1 ? oldFragment.substr(0, index) : oldFragment;
    oldTextLayer = oldFragment.substr(index);
    oldTextLayer = oldTextLayer.replace('/transcriptions/', '');
    index = oldTextLayer.indexOf('/');
    if (index !== -1) {
      oldTextLayer = oldTextLayer.substr(0, index);
    }
    newTextLayer = StringFn.slugify(this.model.get('textLayer'));
    newFragment = newFragment + '/transcriptions/' + newTextLayer;
    return Backbone.history.navigate(newFragment, {
      replace: true
    });
  };

  LayerEditor.prototype.remove = function() {
    this.subviews.editor.remove();
    return LayerEditor.__super__.remove.apply(this, arguments);
  };

  return LayerEditor;

})(Views.Base);

module.exports = LayerEditor;


},{"hilib/src/managers/view2":57,"hilib/src/utils/string":69,"hilib/src/views/base":70,"hilib/src/views/modal/main":80,"hilib/src/views/supertinyeditor/supertinyeditor":86}],120:[function(require,module,exports){
var Base, EntryListitem, Fn, tpl,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Fn = require('hilib/src/utils/general');

Base = require('hilib/src/views/base');

tpl = require('../../../jade/entry/listitem.jade');

EntryListitem = (function(_super) {
  __extends(EntryListitem, _super);

  function EntryListitem() {
    return EntryListitem.__super__.constructor.apply(this, arguments);
  }

  EntryListitem.prototype.initialize = function() {
    var _base;
    EntryListitem.__super__.initialize.apply(this, arguments);
    if ((_base = this.options).fulltext == null) {
      _base.fulltext = false;
    }
    return this.render();
  };

  EntryListitem.prototype.render = function() {
    var data, rtpl;
    data = _.extend(this.options, {
      entry: this.model.toJSON(),
      projectName: this.model.project.get('name'),
      generateID: Fn.generateID
    });
    rtpl = tpl(data);
    this.$el.html(rtpl);
    return this;
  };

  return EntryListitem;

})(Base);

module.exports = EntryListitem;


},{"../../../jade/entry/listitem.jade":138,"hilib/src/utils/general":67,"hilib/src/views/base":70}],121:[function(require,module,exports){
var Async, Backbone, Collections, Entry, Fn, Models, StringFn, Views, config, dom, tpl, viewManager,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Backbone = require('backbone');

config = require('../../config');

Fn = require('hilib/src/utils/general');

dom = require('hilib/src/utils/DOM');

viewManager = require('hilib/src/managers/view2');

StringFn = require('hilib/src/utils/string');

require('hilib/src/utils/jquery.mixin');

Async = require('hilib/src/managers/async');

Models = {
  Entry: require('../../models/entry'),
  currentUser: require('../../models/currentUser')
};

Collections = {
  projects: require('../../collections/projects')
};

Views = {
  Base: require('hilib/src/views/base'),
  Submenu: require('./submenu'),
  Preview: require('./preview/main'),
  EditFacsimiles: require('./subsubmenu/facsimiles.edit'),
  Modal: require('hilib/src/views/modal/main'),
  AnnotationEditor: require('./editors/annotation'),
  LayerEditor: require('./editors/layer')
};

tpl = require('../../../jade/entry/main.jade');

Entry = (function(_super) {
  __extends(Entry, _super);

  function Entry() {
    return Entry.__super__.constructor.apply(this, arguments);
  }

  Entry.prototype.className = 'entry';

  Entry.prototype.initialize = function() {
    var async;
    Entry.__super__.initialize.apply(this, arguments);
    async = new Async(['transcriptions', 'facsimiles', 'settings']);
    this.listenToOnce(async, 'ready', (function(_this) {
      return function() {
        return _this.render();
      };
    })(this));
    return Collections.projects.getCurrent((function(_this) {
      return function(project) {
        var jqXHR;
        _this.project = project;
        _this.entry = _this.project.get('entries').get(_this.options.entryId);
        if (_this.entry == null) {
          _this.entry = new Models.Entry({
            id: _this.options.entryId,
            projectID: _this.project.id
          });
          _this.project.get('entries').add(_this.entry);
          _this.entry.project = _this.project;
        }
        jqXHR = _this.entry.fetch({
          success: function(model, response, options) {
            _this.entry.fetchTranscriptions(_this.options.transcriptionName, function(currentTranscription) {
              _this.currentTranscription = currentTranscription;
              return async.called('transcriptions');
            });
            _this.entry.fetchFacsimiles(function(currentFacsimile) {
              _this.currentFacsimile = currentFacsimile;
              return async.called('facsimiles');
            });
            return _this.entry.fetchSettings(function() {
              return async.called('settings');
            });
          }
        });
        return jqXHR.fail(function(response) {
          if (response.status === 401) {
            return Backbone.history.navigate('login', {
              trigger: true
            });
          }
        });
      };
    })(this));
  };

  Entry.prototype.render = function() {
    var rtpl;
    rtpl = tpl({
      entry: this.entry,
      user: Models.currentUser
    });
    this.$el.html(rtpl);
    this.subviews.submenu = new Views.Submenu({
      entry: this.entry,
      user: Models.currentUser,
      project: this.project
    });
    this.$el.prepend(this.subviews.submenu.el);
    this.subviews.subsubmenu = new Views.EditFacsimiles({
      collection: this.entry.get('facsimiles')
    });
    this.$('.subsubmenu .editfacsimiles').html(this.subviews.subsubmenu.el);
    this.renderFacsimile();
    this.renderTranscriptionEditor();
    this.addListeners();
    return this.currentTranscription.getAnnotations((function(_this) {
      return function(annotations) {
        var annotation;
        if (_this.options.annotationID != null) {
          annotation = annotations.get(_this.options.annotationID);
          _this.subviews.preview.setAnnotatedText(annotation);
          return _this.renderAnnotationEditor(annotation);
        }
      };
    })(this));
  };

  Entry.prototype.renderFacsimile = function() {
    var url;
    this.el.querySelector('.left-pane iframe').style.display = 'block';
    this.el.querySelector('.left-pane .preview-placeholder').style.display = 'none';
    if (this.entry.get('facsimiles').current != null) {
      url = this.entry.get('facsimiles').current.get('zoomableUrl');
      this.$('.left-pane iframe').attr('src', 'https://tomcat.tiler01.huygens.knaw.nl/adore-huygens-viewer-2.1/viewer.html?rft_id=' + url);
      return this.$('.left-pane iframe').height(document.documentElement.clientHeight - 89);
    }
  };

  Entry.prototype.renderPreview = function() {
    if (this.subviews.preview != null) {
      return this.subviews.preview.setModel(this.entry);
    } else {
      this.subviews.preview = new Views.Preview({
        model: this.entry
      });
      return this.$('.right-pane .preview-placeholder').append(this.subviews.preview.el);
    }
  };

  Entry.prototype.renderTranscriptionEditor = function() {
    this.renderPreview();
    this.subviews.submenu.render();
    if (!this.subviews.layerEditor) {
      this.subviews.layerEditor = new Views.LayerEditor({
        model: this.currentTranscription,
        height: this.subviews.preview.$el.innerHeight(),
        width: this.subviews.preview.$el.width() - 4
      });
      this.$('.transcription-placeholder').html(this.subviews.layerEditor.el);
    } else {
      this.subviews.layerEditor.show(this.currentTranscription);
    }
    if (this.subviews.annotationEditor != null) {
      return this.subviews.annotationEditor.hide();
    }
  };

  Entry.prototype.renderAnnotationEditor = function(model) {
    var showAnnotationEditor;
    showAnnotationEditor = (function(_this) {
      return function() {
        if (!_this.subviews.annotationEditor) {
          _this.subviews.annotationEditor = new Views.AnnotationEditor({
            model: model,
            height: _this.subviews.preview.$el.innerHeight() - 31,
            width: _this.subviews.preview.$el.width() - 4
          });
          _this.$('.annotation-placeholder').html(_this.subviews.annotationEditor.el);
          _this.listenTo(_this.subviews.annotationEditor, 'cancel', function() {
            return _this.showUnsavedChangesModal({
              model: _this.subviews.annotationEditor.model,
              html: "<p>There are unsaved changes in annotation: " + (_this.subviews.annotationEditor.model.get('annotationNo')) + ".<p>",
              done: function() {
                _this.subviews.preview.removeNewAnnotationTags();
                return _this.renderTranscriptionEditor();
              }
            });
          });
          _this.listenTo(_this.subviews.annotationEditor, 'newannotation:saved', function(annotation) {
            _this.currentTranscription.get('annotations').add(annotation);
            return _this.subviews.preview.highlightAnnotation(annotation.get('annotationNo'));
          });
          _this.listenTo(_this.subviews.annotationEditor, 'hide', function(annotationNo) {
            return _this.subviews.preview.unhighlightAnnotation(annotationNo);
          });
        } else {
          _this.subviews.annotationEditor.show(model);
        }
        _this.subviews.preview.highlightAnnotation(model.get('annotationNo'));
        return _this.subviews.layerEditor.hide();
      };
    })(this);
    return this.showUnsavedChangesModal({
      model: this.subviews.layerEditor.model,
      html: "<p>There are unsaved changes in the " + (this.subviews.layerEditor.model.get('textLayer')) + " layer.</p>",
      done: showAnnotationEditor
    });
  };

  Entry.prototype.events = function() {
    return {
      'click li[data-key="layer"]': 'changeTranscription',
      'click .left-menu ul.facsimiles li[data-key="facsimile"]': 'changeFacsimile',
      'click .left-menu ul.textlayers li[data-key="transcription"]': 'showLeftTranscription',
      'click .middle-menu ul.textlayers li[data-key="transcription"]': 'changeTranscription',
      'click .menu li.subsub': function(ev) {
        return this.subsubmenu.toggle(ev);
      }
    };
  };

  Entry.prototype.showLeftTranscription = function(ev) {
    var transcription, transcriptionID;
    this.$('.left-pane iframe').hide();
    this.$('.left-pane .preview-placeholder').show();
    transcriptionID = ev.hasOwnProperty('target') ? ev.currentTarget.getAttribute('data-value') : ev;
    transcription = this.entry.get('transcriptions').get(transcriptionID);
    if (this.subviews.leftPreview != null) {
      this.subviews.leftPreview.destroy();
    }
    this.subviews.leftPreview = new Views.Preview({
      model: this.entry,
      textLayer: transcription,
      wordwrap: true
    });
    this.$('.left-pane .preview-placeholder').html(this.subviews.leftPreview.el);
    $('.left-menu .facsimiles li.active').removeClass('active');
    $('.left-menu .textlayers li.active').removeClass('active');
    $('.left-menu .textlayers li[data-value="' + transcriptionID + '"]').addClass('active');
    return this.entry.get('facsimiles').current = null;
  };

  Entry.prototype.subsubmenu = (function() {
    var currentMenu;
    currentMenu = null;
    return {
      close: function() {
        $('.subsubmenu').removeClass('active');
        return currentMenu = null;
      },
      toggle: function(ev) {
        var newMenu;
        newMenu = ev.currentTarget.getAttribute('data-key');
        if (currentMenu === newMenu) {
          $(ev.currentTarget).removeClass('rotateup');
          $('.subsubmenu').removeClass('active');
          return currentMenu = null;
        } else {
          if (currentMenu != null) {
            $('.submenu li[data-key="' + currentMenu + '"]').removeClass('rotateup');
          } else {
            $('.subsubmenu').addClass('active');
          }
          $('.submenu li[data-key="' + newMenu + '"]').addClass('rotateup');
          $('.subsubmenu').find('.' + newMenu).appendCloseButton({
            corner: 'bottomright',
            close: (function(_this) {
              return function() {
                return _this.close();
              };
            })(this)
          });
          $('.subsubmenu').find('.' + newMenu).show().siblings().hide();
          return currentMenu = newMenu;
        }
      }
    };
  })();

  Entry.prototype.changeFacsimile = function(ev) {
    var facsimileID, newFacsimile;
    facsimileID = ev.hasOwnProperty('target') ? ev.currentTarget.getAttribute('data-value') : ev;
    $('.left-menu .facsimiles li.active').removeClass('active');
    $('.left-menu .textlayers li.active').removeClass('active');
    $('.left-menu .facsimiles li[data-value="' + facsimileID + '"]').addClass('active');
    newFacsimile = this.entry.get('facsimiles').get(facsimileID);
    if (newFacsimile != null) {
      return this.entry.get('facsimiles').setCurrent(newFacsimile);
    }
  };

  Entry.prototype.showUnsavedChangesModal = function(args) {
    var done, html, model;
    model = args.model, html = args.html, done = args.done;
    if (model.changedSinceLastSave != null) {
      if (this.subviews.modal != null) {
        this.subviews.modal.destroy();
      }
      this.subviews.modal = new Views.Modal({
        title: "Unsaved changes",
        html: html,
        submitValue: 'Discard changes',
        width: '320px'
      });
      return this.subviews.modal.on('submit', (function(_this) {
        return function() {
          model.cancelChanges();
          _this.subviews.modal.close();
          return done();
        };
      })(this));
    } else {
      return done();
    }
  };

  Entry.prototype.changeTranscription = function(ev) {
    var showTranscription;
    ev.stopPropagation();
    showTranscription = (function(_this) {
      return function() {
        var newTranscription, transcriptionID;
        transcriptionID = ev.hasOwnProperty('target') ? ev.currentTarget.getAttribute('data-value') : ev;
        newTranscription = _this.entry.get('transcriptions').get(transcriptionID);
        if (newTranscription !== _this.currentTranscription) {
          return _this.entry.get('transcriptions').setCurrent(newTranscription);
        } else if (!_this.subviews.layerEditor.visible()) {
          return _this.entry.get('transcriptions').trigger('current:change', _this.currentTranscription);
        }
      };
    })(this);
    if ((this.subviews.annotationEditor != null) && this.subviews.annotationEditor.visible()) {
      return this.showUnsavedChangesModal({
        model: this.subviews.annotationEditor.model,
        html: "<p>There are unsaved changes in annotation: " + (this.subviews.annotationEditor.model.get('annotationNo')) + ".</p>",
        done: showTranscription
      });
    } else {
      return this.showUnsavedChangesModal({
        model: this.subviews.layerEditor.model,
        html: "<p>There are unsaved changes in the " + (this.subviews.layerEditor.model.get('textLayer')) + " layer.</p>",
        done: showTranscription
      });
    }
  };

  Entry.prototype.addListeners = function() {
    this.listenTo(this.subviews.preview, 'editAnnotation', this.renderAnnotationEditor);
    this.listenTo(this.subviews.preview, 'annotation:removed', this.renderTranscriptionEditor);
    this.listenTo(this.subviews.preview, 'scrolled', (function(_this) {
      return function(percentages) {
        return _this.subviews.layerEditor.subviews.editor.setScrollPercentage(percentages);
      };
    })(this));
    this.listenTo(this.subviews.layerEditor.subviews.editor, 'scrolled', (function(_this) {
      return function(percentages) {
        return _this.subviews.preview.setScroll(percentages);
      };
    })(this));
    this.listenTo(this.subviews.layerEditor, 'wrap', (function(_this) {
      return function(wrap) {
        return _this.subviews.preview.toggleWrap(wrap);
      };
    })(this));
    this.listenTo(this.entry.get('facsimiles'), 'current:change', (function(_this) {
      return function(current) {
        _this.currentFacsimile = current;
        return _this.renderFacsimile();
      };
    })(this));
    this.listenTo(this.entry.get('facsimiles'), 'add', (function(_this) {
      return function(facsimile, collection) {
        var li;
        _this.$('li[data-key="facsimiles"] span').html("(" + collection.length + ")");
        li = $("<li data-key='facsimile' data-value='" + facsimile.id + "'>" + (facsimile.get('name')) + "</li>");
        _this.$('.submenu .facsimiles').append(li);
        _this.changeFacsimile(facsimile.id);
        _this.subsubmenu.close();
        return _this.publish('message', "Added facsimile: \"" + (facsimile.get('name')) + "\".");
      };
    })(this));
    this.listenTo(this.entry.get('facsimiles'), 'remove', (function(_this) {
      return function(facsimile, collection) {
        _this.$('li[data-key="facsimiles"] span').html("(" + collection.length + ")");
        _this.$('.submenu .facsimiles [data-value="' + facsimile.id + '"]').remove();
        return _this.publish('message', "Removed facsimile: \"" + (facsimile.get('name')) + "\".");
      };
    })(this));
    this.listenTo(this.entry.get('transcriptions'), 'current:change', (function(_this) {
      return function(current) {
        _this.currentTranscription = current;
        return _this.currentTranscription.getAnnotations(function(annotations) {
          return _this.renderTranscriptionEditor();
        });
      };
    })(this));
    this.listenTo(this.entry.get('transcriptions'), 'add', (function(_this) {
      return function(transcription) {
        var li;
        li = $("<li data-key='transcription' data-value='" + transcription.id + "'>" + (transcription.get('textLayer')) + " layer</li>");
        _this.$('.submenu .textlayers').append(li);
        _this.changeTranscription(transcription.id);
        _this.subsubmenu.close();
        return _this.publish('message', "Added text layer: \"" + (transcription.get('textLayer')) + "\".");
      };
    })(this));
    this.listenTo(this.entry.get('transcriptions'), 'remove', (function(_this) {
      return function(transcription) {
        _this.$('.submenu .textlayers [data-value="' + transcription.id + '"]').remove();
        return _this.publish('message', "Removed text layer: \"" + (transcription.get('textLayer')) + "\".");
      };
    })(this));
    return window.addEventListener('resize', (function(_this) {
      return function(ev) {
        return Fn.timeoutWithReset(600, function() {
          _this.renderFacsimile();
          _this.subviews.preview.resize();
          _this.subviews.layerEditor.subviews.editor.setIframeHeight(_this.subviews.preview.$el.innerHeight());
          _this.subviews.layerEditor.subviews.editor.setIframeWidth(_this.subviews.preview.$el.width() - 4);
          if (_this.subviews.annotationEditor != null) {
            _this.subviews.annotationEditor.subviews.editor.setIframeHeight(_this.subviews.preview.$el.innerHeight());
            return _this.subviews.annotationEditor.subviews.editor.setIframeWidth(_this.subviews.preview.$el.width() - 4);
          }
        });
      };
    })(this));
  };

  return Entry;

})(Views.Base);

module.exports = Entry;


},{"../../../jade/entry/main.jade":139,"../../collections/projects":97,"../../config":100,"../../models/currentUser":105,"../../models/entry":106,"./editors/annotation":118,"./editors/layer":119,"./preview/main":124,"./submenu":125,"./subsubmenu/facsimiles.edit":126,"backbone":1,"hilib/src/managers/async":53,"hilib/src/managers/view2":57,"hilib/src/utils/DOM":65,"hilib/src/utils/general":67,"hilib/src/utils/jquery.mixin":68,"hilib/src/utils/string":69,"hilib/src/views/base":70,"hilib/src/views/modal/main":80}],122:[function(require,module,exports){
var AddAnnotationTooltip, Annotation, BaseView, Fn, dom, tpl,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Fn = require('hilib/src/utils/general');

dom = require('hilib/src/utils/DOM');

BaseView = require('hilib/src/views/base');

Annotation = require('../../../models/annotation');

tpl = require('../../../../jade/entry/tooltip.add.annotation.jade');

AddAnnotationTooltip = (function(_super) {
  __extends(AddAnnotationTooltip, _super);

  function AddAnnotationTooltip() {
    return AddAnnotationTooltip.__super__.constructor.apply(this, arguments);
  }

  AddAnnotationTooltip.prototype.className = "tooltip addannotation";

  AddAnnotationTooltip.prototype.events = function() {
    return {
      'change select': 'selectChanged',
      'click button': 'buttonClicked'
    };
  };

  AddAnnotationTooltip.prototype.selectChanged = function(ev) {
    var index, option;
    index = ev.currentTarget.selectedIndex;
    option = ev.currentTarget.options[index];
    return this.newannotation.set('annotationType', this.options.annotationTypes.get(option.value).attributes);
  };

  AddAnnotationTooltip.prototype.buttonClicked = function(ev) {
    this.hide();
    return this.trigger('clicked', this.newannotation);
  };

  AddAnnotationTooltip.prototype.initialize = function() {
    var _ref;
    AddAnnotationTooltip.__super__.initialize.apply(this, arguments);
    this.container = (_ref = this.options.container) != null ? _ref : document.querySelector('body');
    return this.render();
  };

  AddAnnotationTooltip.prototype.render = function() {
    var tooltip;
    this.el.innerHTML = tpl({
      annotationTypes: this.options.annotationTypes
    });
    tooltip = tooltip = document.querySelector('.tooltip.addannotation');
    if (tooltip != null) {
      tooltip.remove();
    }
    dom(this.container).prepend(this.el);
    return this;
  };

  AddAnnotationTooltip.prototype.show = function(position) {
    this.newannotation = new Annotation({
      annotationType: this.options.annotationTypes.at(0)
    });
    this.setPosition(position);
    return this.el.classList.add('active');
  };

  AddAnnotationTooltip.prototype.hide = function() {
    return this.el.classList.remove('active');
  };

  AddAnnotationTooltip.prototype.setPosition = function(position) {
    var boundingBox, left, top;
    boundingBox = Fn.boundingBox(this.container);
    position.left = position.left - boundingBox.left;
    position.top = position.top - boundingBox.top;
    this.$el.removeClass('tipright tipleft tipbottom');
    left = position.left - this.$el.width() / 2;
    top = position.top + 30;
    if (left < 10) {
      left = 10;
      this.$el.addClass('tipleft');
    }
    if (boundingBox.width < (left + this.$el.width())) {
      left = boundingBox.width - this.$el.width() - 10;
      this.$el.addClass('tipright');
    }
    this.$el.css('left', left);
    return this.$el.css('top', top);
  };

  AddAnnotationTooltip.prototype.isActive = function() {
    return this.$el.css('z-index') > 0;
  };

  return AddAnnotationTooltip;

})(BaseView);

module.exports = AddAnnotationTooltip;


},{"../../../../jade/entry/tooltip.add.annotation.jade":143,"../../../models/annotation":103,"hilib/src/utils/DOM":65,"hilib/src/utils/general":67,"hilib/src/views/base":70}],123:[function(require,module,exports){
var BaseView, EditAnnotationTooltip, Fn, dom, tpl,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Fn = require('hilib/src/utils/general');

dom = require('hilib/src/utils/DOM');

BaseView = require('hilib/src/views/base');

tpl = require('../../../../jade/ui/tooltip.jade');

EditAnnotationTooltip = (function(_super) {
  __extends(EditAnnotationTooltip, _super);

  function EditAnnotationTooltip() {
    return EditAnnotationTooltip.__super__.constructor.apply(this, arguments);
  }

  EditAnnotationTooltip.prototype.className = 'tooltip editannotation';

  EditAnnotationTooltip.prototype.initialize = function() {
    var _ref;
    EditAnnotationTooltip.__super__.initialize.apply(this, arguments);
    this.container = (_ref = this.options.container) != null ? _ref : document.querySelector('body');
    return this.render();
  };

  EditAnnotationTooltip.prototype.render = function() {
    var tooltip;
    this.$el.html(tpl({
      interactive: this.options.interactive
    }));
    tooltip = this.container.querySelector('.tooltip.editannotation');
    if (tooltip != null) {
      tooltip.remove();
    }
    return dom(this.container).prepend(this.el);
  };

  EditAnnotationTooltip.prototype.events = function() {
    return {
      'click .edit': 'editClicked',
      'click .delete': 'deleteClicked',
      'click': 'clicked'
    };
  };

  EditAnnotationTooltip.prototype.editClicked = function(ev) {
    return this.trigger('edit', this.model);
  };

  EditAnnotationTooltip.prototype.deleteClicked = function(ev) {
    return this.trigger('delete', this.model);
  };

  EditAnnotationTooltip.prototype.clicked = function(ev) {
    return this.hide();
  };

  EditAnnotationTooltip.prototype.show = function(args) {
    var $el, contentId;
    $el = args.$el, this.model = args.model;
    this.pointedEl = $el[0];
    this.el.style.left = 0;
    this.el.style.top = 0;
    this.el.querySelector('.tooltip-body').innerHTML = '';
    this.el.querySelector('.annotation-type').innerHTML = '';
    contentId = (this.model != null) && (this.model.get('annotationNo') != null) ? this.model.get('annotationNo') : -1;
    if (contentId === +this.el.getAttribute('data-id')) {
      this.hide();
      return false;
    }
    this.el.setAttribute('data-id', contentId);
    if (this.model != null) {
      this.$el.removeClass('newannotation');
      this.el.querySelector('.tooltip-body').innerHTML = this.model.get('body');
      if (this.model.get('annotationType').name != null) {
        this.el.querySelector('.annotation-type').innerHTML = this.model.get('annotationType').name;
      }
    } else {
      this.$el.addClass('newannotation');
    }
    if (this.options.container != null) {
      this.setRelativePosition(dom(this.pointedEl).position(this.options.container));
    } else {
      this.setAbsolutePosition($el.offset());
    }
    return this.el.classList.add('active');
  };

  EditAnnotationTooltip.prototype.hide = function() {
    this.el.removeAttribute('data-id');
    return this.el.classList.remove('active');
  };

  EditAnnotationTooltip.prototype.setRelativePosition = function(position) {
    var boundingBox, left, scrollBottomPos, tooltipBottomPos, top;
    boundingBox = Fn.boundingBox(this.container);
    this.$el.removeClass('tipright tipleft tipbottom');
    left = (this.pointedEl.offsetWidth / 2) + position.left - (this.$el.width() / 2);
    top = position.top + 30;
    if (left < 10) {
      left = 10;
      this.$el.addClass('tipleft');
    }
    if (boundingBox.width < (left + this.$el.width())) {
      left = boundingBox.width - this.$el.width() - 10;
      this.$el.addClass('tipright');
    }
    tooltipBottomPos = top + this.$el.height();
    scrollBottomPos = this.container.scrollTop + this.container.clientHeight;
    if (tooltipBottomPos > scrollBottomPos) {
      top = top - 48 - this.$el.height();
      this.$el.addClass('tipbottom');
    }
    this.$el.css('left', left);
    return this.$el.css('top', top);
  };

  EditAnnotationTooltip.prototype.setAbsolutePosition = function(position) {
    var boundingBox, left, top;
    console.error('Don"t use! This has to be fixed!');
    boundingBox = Fn.boundingBox(this.container);
    this.$el.removeClass('tipright tipleft tipbottom');
    left = position.left - this.$el.width() / 2;
    top = position.top + 30;
    if (boundingBox.left > left) {
      left = boundingBox.left + 10;
      this.$el.addClass('tipleft');
    }
    if (boundingBox.right < (left + this.$el.width())) {
      left = boundingBox.right - this.$el.width() - 10;
      this.$el.addClass('tipright');
    }
    if (boundingBox.bottom < top + this.$el.height()) {
      top = top - 60 - this.$el.height();
      this.$el.addClass('tipbottom');
    }
    this.$el.css('left', left);
    return this.$el.css('top', top);
  };

  EditAnnotationTooltip.prototype.isActive = function() {
    return this.$el.css('z-index') > 0;
  };

  return EditAnnotationTooltip;

})(BaseView);

module.exports = EditAnnotationTooltip;


},{"../../../../jade/ui/tooltip.jade":156,"hilib/src/utils/DOM":65,"hilib/src/utils/general":67,"hilib/src/views/base":70}],124:[function(require,module,exports){
var EntryPreview, Fn, Views, config, dom, tpl,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Fn = require('hilib/src/utils/general');

dom = require('hilib/src/utils/DOM');

config = require('../../../config');

Views = {
  Base: require('hilib/src/views/base'),
  AddAnnotationTooltip: require('./annotation.add.tooltip'),
  EditAnnotationTooltip: require('./annotation.edit.tooltip')
};

tpl = require('../../../../jade/entry/preview.jade');

EntryPreview = (function(_super) {
  __extends(EntryPreview, _super);

  function EntryPreview() {
    return EntryPreview.__super__.constructor.apply(this, arguments);
  }

  EntryPreview.prototype.className = 'preview';

  EntryPreview.prototype.initialize = function() {
    var _base;
    EntryPreview.__super__.initialize.apply(this, arguments);
    this.autoscroll = false;
    this.highlighter = Fn.highlighter();
    this.transcription = this.options.textLayer != null ? this.options.textLayer : this.model.get('transcriptions').current;
    this.interactive = this.options.textLayer != null ? false : true;
    this.addListeners();
    this.render();
    if ((_base = this.options).wordwrap == null) {
      _base.wordwrap = false;
    }
    if (this.options.wordwrap) {
      this.toggleWrap();
    }
    return this.resize();
  };

  EntryPreview.prototype.render = function() {
    var count, data, lineCount, term, _ref, _ref1;
    data = this.transcription.toJSON();
    lineCount = ((_ref = data.body.match(/<br>/g)) != null ? _ref : []).length;
    if (data.body.substr(-4) !== '<br>') {
      lineCount++;
    }
    data.lineCount = lineCount;
    if (data.body.trim() === '') {
      data.lineCount = 0;
    }
    _ref1 = this.model.get('terms');
    for (term in _ref1) {
      if (!__hasProp.call(_ref1, term)) continue;
      count = _ref1[term];
      data.body = data.body.replace(new RegExp(term, "gi"), '<span class="highlight">$&</span>');
    }
    this.el.innerHTML = tpl(data);
    this.renderTooltips();
    this.onHover();
    return this;
  };

  EntryPreview.prototype.renderTooltips = function() {
    if (this.subviews.editAnnotationTooltip != null) {
      this.subviews.editAnnotationTooltip.destroy();
    }
    this.subviews.editAnnotationTooltip = new Views.EditAnnotationTooltip({
      container: this.el.querySelector('.body-container'),
      interactive: this.interactive
    });
    if (this.interactive) {
      this.listenTo(this.subviews.editAnnotationTooltip, 'edit', (function(_this) {
        return function(model) {
          return _this.trigger('editAnnotation', model);
        };
      })(this));
      this.listenTo(this.subviews.editAnnotationTooltip, 'delete', (function(_this) {
        return function(model) {
          if (model.get('annotationNo') === 'newannotation') {
            _this.removeNewAnnotation();
          } else {
            _this.transcription.get('annotations').remove(model);
          }
          return _this.trigger('annotation:removed');
        };
      })(this));
      if (this.subviews.addAnnotationTooltip != null) {
        this.subviews.addAnnotationTooltip.destroy();
      }
      return this.subviews.addAnnotationTooltip = new Views.AddAnnotationTooltip({
        container: this.el.querySelector('.body-container'),
        annotationTypes: this.model.project.get('annotationtypes')
      });
    }
  };

  EntryPreview.prototype.events = function() {
    var hash;
    hash = {
      'click sup[data-marker="end"]': 'supClicked'
    };
    if (this.interactive) {
      hash['mousedown .body-container'] = 'onMousedown';
      hash['mouseup .body-container'] = 'onMouseup';
      hash['scroll'] = 'onScroll';
    }
    return hash;
  };

  EntryPreview.prototype.onScroll = function(ev) {
    if (this.autoscroll = !this.autoscroll) {
      return Fn.timeoutWithReset(200, (function(_this) {
        return function() {
          return _this.trigger('scrolled', Fn.getScrollPercentage(ev.currentTarget));
        };
      })(this));
    }
  };

  EntryPreview.prototype.supClicked = function(ev) {
    var annotation, id;
    if (this.transcription.get('annotations') == null) {
      return console.error('No annotations found!');
    }
    id = ev.currentTarget.getAttribute('data-id');
    annotation = id === 'newannotation' ? this.newAnnotation : this.transcription.get('annotations').findWhere({
      annotationNo: id >> 0
    });
    if (annotation == null) {
      return console.error('Annotation not found! ID:', id, ' Collection:', this.transcription.get('annotations'));
    }
    this.setAnnotatedText(annotation);
    return this.subviews.editAnnotationTooltip.show({
      $el: $(ev.currentTarget),
      model: annotation
    });
  };

  EntryPreview.prototype.onMousedown = function(ev) {
    var downOnAdd, downOnEdit;
    downOnAdd = ev.target === this.subviews.addAnnotationTooltip.el || dom(this.subviews.addAnnotationTooltip.el).hasDescendant(ev.target);
    downOnEdit = ev.target === this.subviews.editAnnotationTooltip.el || dom(this.subviews.editAnnotationTooltip.el).hasDescendant(ev.target);
    if (!(downOnEdit || downOnAdd)) {
      this.subviews.addAnnotationTooltip.hide();
      this.subviews.editAnnotationTooltip.hide();
      return this.stopListening(this.subviews.addAnnotationTooltip);
    }
  };

  EntryPreview.prototype.onMouseup = function(ev) {
    var checkMouseup, upOnAdd, upOnEdit;
    upOnAdd = ev.target === this.subviews.addAnnotationTooltip.el || dom(this.subviews.addAnnotationTooltip.el).hasDescendant(ev.target);
    upOnEdit = ev.target === this.subviews.editAnnotationTooltip.el || dom(this.subviews.editAnnotationTooltip.el).hasDescendant(ev.target);
    checkMouseup = (function(_this) {
      return function() {
        var isInsideMarker, range, sel;
        sel = document.getSelection();
        if (sel.rangeCount === 0 || ev.target.tagName === 'SUP' || ev.target.tagName === 'BUTTON') {
          _this.subviews.addAnnotationTooltip.hide();
          return false;
        }
        range = sel.getRangeAt(0);
        isInsideMarker = range.startContainer.parentNode.hasAttribute('data-marker') || range.endContainer.parentNode.hasAttribute('data-marker');
        if (!(range.collapsed || isInsideMarker || _this.$('[data-id="newannotation"]').length > 0)) {
          if (_this.transcription.changedSinceLastSave != null) {
            return _this.publish('message', "Save the " + (_this.transcription.get('textLayer')) + " layer, before adding a new annotation!");
          } else {
            _this.listenToOnce(_this.subviews.addAnnotationTooltip, 'clicked', function(model) {
              return _this.addNewAnnotation(model, range);
            });
            return _this.subviews.addAnnotationTooltip.show({
              left: ev.pageX,
              top: ev.pageY
            });
          }
        }
      };
    })(this);
    if (!(upOnAdd || upOnEdit)) {
      return setTimeout(checkMouseup, 0);
    }
  };

  EntryPreview.prototype.toggleWrap = function(wrap) {
    return this.$el.toggleClass('wrap', wrap);
  };

  EntryPreview.prototype.setScroll = function(percentages) {
    this.autoscroll = true;
    return setTimeout((function(_this) {
      return function() {
        return Fn.setScrollPercentage(_this.el, percentages);
      };
    })(this));
  };

  EntryPreview.prototype.highlightAnnotation = function(annotationNo) {
    var el, range;
    range = document.createRange();
    range.setStartAfter(this.el.querySelector('span[data-id="' + annotationNo + '"]'));
    range.setEndBefore(this.el.querySelector('sup[data-id="' + annotationNo + '"]'));
    el = document.createElement('span');
    el.className = 'hilite';
    el.setAttribute('data-highlight', '');
    el.appendChild(range.extractContents());
    return range.insertNode(el);
  };

  EntryPreview.prototype.unhighlightAnnotation = function() {
    var docFrag, el;
    el = this.el.querySelector('span[data-highlight]');
    if (el != null) {
      docFrag = document.createDocumentFragment();
      while (el.childNodes.length) {
        docFrag.appendChild(el.firstChild);
      }
      return el.parentNode.replaceChild(docFrag, el);
    }
  };

  EntryPreview.prototype.unhighlightQuery = function() {
    var docFrag, el;
    el = this.el.querySelector('span.highlight');
    if (el != null) {
      docFrag = document.createDocumentFragment();
      while (el.childNodes.length) {
        docFrag.appendChild(el.firstChild);
      }
      return el.parentNode.replaceChild(docFrag, el);
    }
  };

  EntryPreview.prototype.setAnnotatedText = function(annotation) {
    var annotationNo, endNode, range, startNode, text, treewalker;
    annotationNo = annotation.get('annotationNo');
    startNode = this.el.querySelector('span[data-id="' + annotationNo + '"]');
    endNode = this.el.querySelector('sup[data-id="' + annotationNo + '"]');
    range = document.createRange();
    range.setStartAfter(startNode);
    range.setEndBefore(endNode);
    treewalker = document.createTreeWalker(range.cloneContents(), NodeFilter.SHOW_TEXT, {
      acceptNode: (function(_this) {
        return function(node) {
          if (node.parentNode.nodeType === 1 && node.parentNode.tagName === 'SUP' && node.parentNode.hasAttribute('data-id')) {
            return NodeFilter.FILTER_SKIP;
          } else {
            return NodeFilter.FILTER_ACCEPT;
          }
        };
      })(this)
    });
    text = '';
    while (treewalker.nextNode()) {
      text += treewalker.currentNode.textContent;
    }
    return annotation.set('annotatedText', text);
  };

  EntryPreview.prototype.addNewAnnotation = function(newAnnotation, range) {
    var annotations;
    this.unhighlightAnnotation();
    this.newAnnotation = newAnnotation;
    this.addNewAnnotationTags(range);
    annotations = this.transcription.get('annotations');
    newAnnotation.urlRoot = (function(_this) {
      return function() {
        return config.baseUrl + ("projects/" + annotations.projectId + "/entries/" + annotations.entryId + "/transcriptions/" + annotations.transcriptionId + "/annotations");
      };
    })(this);
    this.setAnnotatedText(newAnnotation);
    return this.trigger('editAnnotation', newAnnotation);
  };

  EntryPreview.prototype.addNewAnnotationTags = function(range) {
    var span, sup;
    span = document.createElement('span');
    span.setAttribute('data-marker', 'begin');
    span.setAttribute('data-id', 'newannotation');
    range.insertNode(span);
    sup = document.createElement('sup');
    sup.setAttribute('data-marker', 'end');
    sup.setAttribute('data-id', 'newannotation');
    sup.innerHTML = 'new';
    range.collapse(false);
    range.insertNode(sup);
    return this.setTranscriptionBody();
  };

  EntryPreview.prototype.removeNewAnnotation = function() {
    this.newAnnotation = null;
    return this.removeNewAnnotationTags();
  };

  EntryPreview.prototype.removeNewAnnotationTags = function() {
    this.$('[data-id="newannotation"]').remove();
    return this.setTranscriptionBody();
  };

  EntryPreview.prototype.setTranscriptionBody = function() {
    this.unhighlightQuery();
    this.unhighlightAnnotation();
    return this.transcription.set('body', this.$('.body-container .body').html(), {
      silent: true
    });
  };

  EntryPreview.prototype.onHover = function() {
    var markers, supEnter, supLeave;
    supEnter = (function(_this) {
      return function(ev) {
        var id, startNode;
        id = ev.currentTarget.getAttribute('data-id');
        if (!(startNode = _this.el.querySelector("span[data-id='" + id + "']"))) {
          console.error('No span found');
          return false;
        }
        return _this.highlighter.on({
          startNode: startNode,
          endNode: ev.currentTarget
        });
      };
    })(this);
    supLeave = (function(_this) {
      return function(ev) {
        return _this.highlighter.off();
      };
    })(this);
    markers = this.$('sup[data-marker]');
    markers.off('mouseenter mouseleave');
    return markers.hover(supEnter, supLeave);
  };

  EntryPreview.prototype.resize = function() {
    this.$el.height(document.documentElement.clientHeight - 89 - 78);
    if (Fn.hasYScrollBar(this.el)) {
      return this.el.style.marginRight = 0;
    }
  };

  EntryPreview.prototype.setModel = function(entry) {
    this.unhighlightAnnotation();
    this.model = entry;
    this.transcription = this.model.get('transcriptions').current;
    this.addListeners();
    return this.render();
  };

  EntryPreview.prototype.addListeners = function() {
    this.listenTo(this.transcription, 'current:change', this.render);
    return this.listenTo(this.transcription, 'change:body', this.render);
  };

  return EntryPreview;

})(Views.Base);

module.exports = EntryPreview;


},{"../../../../jade/entry/preview.jade":140,"../../../config":100,"./annotation.add.tooltip":122,"./annotation.edit.tooltip":123,"hilib/src/utils/DOM":65,"hilib/src/utils/general":67,"hilib/src/views/base":70}],125:[function(require,module,exports){
var Async, Base, EntrySubmenu, Fn, StringFn, Views, tpl,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Fn = require('hilib/src/utils/general');

StringFn = require('hilib/src/utils/string');

Async = require('hilib/src/managers/async');

Base = require('hilib/src/views/base');

tpl = require('../../../jade/entry/submenu.jade');

Views = {
  Form: require('hilib/src/views/form/main'),
  Modal: require('hilib/src/views/modal/main')
};

EntrySubmenu = (function(_super) {
  __extends(EntrySubmenu, _super);

  function EntrySubmenu() {
    return EntrySubmenu.__super__.constructor.apply(this, arguments);
  }

  EntrySubmenu.prototype.className = 'submenu';

  EntrySubmenu.prototype.initialize = function() {
    var _ref;
    EntrySubmenu.__super__.initialize.apply(this, arguments);
    return _ref = this.options, this.entry = _ref.entry, this.user = _ref.user, this.project = _ref.project, _ref;
  };

  EntrySubmenu.prototype.render = function() {
    var rtpl;
    rtpl = tpl({
      entry: this.entry,
      user: this.user
    });
    this.$el.html(rtpl);
    if (this.project.resultSet != null) {
      this.entry.setPrevNext((function(_this) {
        return function() {
          return _this.activatePrevNext();
        };
      })(this));
    } else {
      if (!((this.entry.prevID != null) && (this.entry.nextID != null))) {
        this.entry.fetchPrevNext((function(_this) {
          return function() {
            return _this.activatePrevNext();
          };
        })(this));
      }
    }
    return this;
  };

  EntrySubmenu.prototype.events = function() {
    return {
      'click .menu li.active[data-key="previous"]': 'previousEntry',
      'click .menu li.active[data-key="next"]': 'nextEntry',
      'click .menu li[data-key="metadata"]': 'editEntryMetadata',
      'click .menu li[data-key="print"]': 'printEntry'
    };
  };

  EntrySubmenu.prototype.activatePrevNext = function() {
    if (this.entry.prevID > 0) {
      this.$('li[data-key="previous"]').addClass('active');
    }
    if (this.entry.nextID > 0) {
      return this.$('li[data-key="next"]').addClass('active');
    }
  };

  EntrySubmenu.prototype.previousEntry = function() {
    var projectName, transcription;
    projectName = this.entry.project.get('name');
    transcription = StringFn.slugify(this.entry.get('transcriptions').current.get('textLayer'));
    return Backbone.history.navigate("projects/" + projectName + "/entries/" + this.entry.prevID + "/transcriptions/" + transcription, {
      trigger: true
    });
  };

  EntrySubmenu.prototype.nextEntry = function() {
    var projectName, transcription;
    projectName = this.entry.project.get('name');
    transcription = StringFn.slugify(this.entry.get('transcriptions').current.get('textLayer'));
    return Backbone.history.navigate("projects/" + projectName + "/entries/" + this.entry.nextID + "/transcriptions/" + transcription, {
      trigger: true
    });
  };

  EntrySubmenu.prototype.editEntryMetadata = (function() {
    var modal;
    modal = null;
    return function(ev) {
      var entryMetadata;
      if (modal != null) {
        return;
      }
      entryMetadata = new Views.Form({
        tpl: tpls['entry/metadata'],
        tplData: {
          user: this.user,
          generateID: Fn.generateID
        },
        model: this.entry.clone()
      });
      modal = new Views.Modal({
        title: "Edit " + (this.project.get('settings').get('entry.term_singular')) + " metadata",
        html: entryMetadata.el,
        submitValue: 'Save metadata',
        width: '300px'
      });
      modal.on('submit', (function(_this) {
        return function() {
          var async;
          _this.entry.updateFromClone(entryMetadata.model);
          async = new Async(['entry', 'settings']);
          _this.listenToOnce(async, 'ready', function() {
            modal.close();
            return _this.publish('message', "Saved metadata for entry: " + (_this.entry.get('name')) + ".");
          });
          _this.entry.get('settings').save(null, {
            success: function() {
              return async.called('settings');
            }
          });
          return _this.entry.save(null, {
            success: function() {
              return async.called('entry');
            }
          });
        };
      })(this));
      return modal.on('close', function() {
        return modal = null;
      });
    };
  })();

  EntrySubmenu.prototype.printEntry = function(ev) {
    var annotations, currentTranscription, h1, h2, mainDiv, ol, pp, sups;
    pp = document.querySelector('#printpreview');
    if (pp != null) {
      pp.parentNode.removeChild(pp);
    }
    currentTranscription = this.entry.get('transcriptions').current;
    annotations = currentTranscription.get('annotations');
    mainDiv = document.createElement('div');
    mainDiv.id = 'printpreview';
    h1 = document.createElement('h1');
    h1.innerHTML = 'Preview entry: ' + this.entry.get('name');
    h2 = document.createElement('h2');
    h2.innerHTML = 'Project: ' + this.project.get('title');
    mainDiv.appendChild(h1);
    mainDiv.appendChild(h2);
    mainDiv.appendChild(document.querySelector('.preview').cloneNode(true));
    ol = document.createElement('ol');
    ol.className = 'annotations';
    sups = document.querySelectorAll('sup[data-marker="end"]');
    _.each(sups, (function(_this) {
      return function(sup) {
        var annotation, li;
        annotation = annotations.findWhere({
          annotationNo: +sup.getAttribute('data-id')
        });
        li = document.createElement('li');
        li.innerHTML = annotation.get('body');
        return ol.appendChild(li);
      };
    })(this));
    h2 = document.createElement('h2');
    h2.innerHTML = 'Annotations';
    mainDiv.appendChild(h2);
    mainDiv.appendChild(ol);
    document.body.appendChild(mainDiv);
    return window.print();
  };

  return EntrySubmenu;

})(Base);

module.exports = EditFacsimiles;


},{"../../../jade/entry/submenu.jade":141,"hilib/src/managers/async":53,"hilib/src/utils/general":67,"hilib/src/utils/string":69,"hilib/src/views/base":70,"hilib/src/views/form/main":75,"hilib/src/views/modal/main":80}],126:[function(require,module,exports){
var EditFacsimiles, Fn, Views, ajax, token, tpl,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Fn = require('hilib/src/utils/general');

ajax = require('hilib/src/managers/ajax');

token = require('hilib/src/managers/token');

Views = {
  Base: require('hilib/src/views/base')
};

tpl = require('../../../../jade/entry/subsubmenu/facsimiles.edit.jade');

EditFacsimiles = (function(_super) {
  __extends(EditFacsimiles, _super);

  function EditFacsimiles() {
    return EditFacsimiles.__super__.constructor.apply(this, arguments);
  }

  EditFacsimiles.prototype.initialize = function() {
    EditFacsimiles.__super__.initialize.apply(this, arguments);
    this.listenTo(this.collection, 'add', this.render);
    this.listenTo(this.collection, 'remove', this.render);
    return this.render();
  };

  EditFacsimiles.prototype.render = function() {
    var rtpl;
    rtpl = tpl({
      facsimiles: this.collection
    });
    this.$el.html(rtpl);
    return this;
  };

  EditFacsimiles.prototype.events = function() {
    return {
      'click ul.facsimiles li': (function(_this) {
        return function(ev) {
          return $(ev.currentTarget).addClass('destroy');
        };
      })(this),
      'click ul.facsimiles li.destroy .orcancel': 'cancelRemove',
      'click ul.facsimiles li.destroy .name': 'destroyfacsimile',
      'keyup input[name="name"]': 'keyupName',
      'change input[type="file"]': function() {
        return this.el.querySelector('button.addfacsimile').style.display = 'block';
      },
      'click button.addfacsimile': 'addfacsimile'
    };
  };

  EditFacsimiles.prototype.keyupName = function(ev) {
    return this.el.querySelector('form.addfile').style.display = ev.currentTarget.value.length > 0 ? 'block' : 'none';
  };

  EditFacsimiles.prototype.addfacsimile = function(ev) {
    var form, formData, jqXHR;
    ev.stopPropagation();
    ev.preventDefault();
    $(ev.currentTarget).addClass('loader');
    form = this.el.querySelector('form.addfile');
    formData = new FormData(form);
    jqXHR = ajax.post({
      url: 'http://tomcat.tiler01.huygens.knaw.nl/facsimileservice/upload',
      data: formData,
      cache: false,
      contentType: false,
      processData: false
    }, {
      token: false
    });
    return jqXHR.done((function(_this) {
      return function(response) {
        var data;
        $(ev.currentTarget).removeClass('loader');
        data = {
          name: _this.el.querySelector('input[name="name"]').value,
          filename: response[1].originalName,
          zoomableUrl: response[1].jp2url
        };
        return _this.collection.create(data, {
          wait: true
        });
      };
    })(this));
  };

  EditFacsimiles.prototype.cancelRemove = function(ev) {
    var parentLi;
    ev.stopPropagation();
    parentLi = $(ev.currentTarget).parents('li');
    return parentLi.removeClass('destroy');
  };

  EditFacsimiles.prototype.destroyfacsimile = function(ev) {
    var transcriptionID;
    transcriptionID = $(ev.currentTarget).parents('li').attr('data-id');
    return this.collection.remove(this.collection.get(transcriptionID));
  };

  return EditFacsimiles;

})(Views.Base);

module.exports = EditFacsimiles;


},{"../../../../jade/entry/subsubmenu/facsimiles.edit.jade":142,"hilib/src/managers/ajax":52,"hilib/src/managers/token":56,"hilib/src/utils/general":67,"hilib/src/views/base":70}],127:[function(require,module,exports){
var BaseView, Login, ajax, currentUser, history, token, tpl,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

BaseView = require('hilib/src/views/base');

currentUser = require('../models/currentUser');

history = require('hilib/src/managers/history');

ajax = require('hilib/src/managers/ajax');

token = require('hilib/src/managers/token');

tpl = require('../../jade/login.jade');

Login = (function(_super) {
  __extends(Login, _super);

  function Login() {
    return Login.__super__.constructor.apply(this, arguments);
  }

  Login.prototype.className = 'login row span3';

  Login.prototype.initialize = function() {
    var key, param, parameters, path, value, _i, _len, _ref;
    Login.__super__.initialize.apply(this, arguments);
    path = window.location.search.substr(1);
    parameters = path.split('&');
    for (_i = 0, _len = parameters.length; _i < _len; _i++) {
      param = parameters[_i];
      _ref = param.split('='), key = _ref[0], value = _ref[1];
      if (key === 'hsid') {
        this.hsid = value;
      }
    }
    if (this.hsid != null) {
      currentUser.hsidLogin(this.hsid);
    } else {
      this.render();
    }
    return this.subscribe('login:failed', this.loginFailed);
  };

  Login.prototype.render = function() {
    this.$el.html(tpl());
    return this;
  };

  Login.prototype.events = function() {
    return {
      'click input#submit': 'submit',
      'click button.federated-login': 'federatedLogin'
    };
  };

  Login.prototype.submit = function(ev) {
    ev.preventDefault();
    this.el.querySelector('li.login').style.display = 'none';
    this.el.querySelector('li.loggingin').style.display = 'inline-block';
    return currentUser.login(this.$('#username').val(), this.$('#password').val());
  };

  Login.prototype.federatedLogin = function(ev) {
    var form, hsURL, hsUrlEl, loginURL, wl;
    wl = window.location;
    hsURL = wl.origin + wl.pathname;
    loginURL = 'https://secure.huygens.knaw.nl/saml2/login';
    form = $('<form>');
    form.attr({
      method: 'POST',
      action: loginURL
    });
    hsUrlEl = $('<input>').attr({
      name: 'hsurl',
      value: hsURL,
      type: 'hidden'
    });
    form.append(hsUrlEl);
    $('body').append(form);
    return form.submit();
  };

  Login.prototype.loginFailed = function() {
    this.render();
    return this.$('ul.message li').html('Username / password combination unknown!').show();
  };

  return Login;

})(BaseView);

module.exports = Login;


},{"../../jade/login.jade":144,"../models/currentUser":105,"hilib/src/managers/ajax":52,"hilib/src/managers/history":54,"hilib/src/managers/token":56,"hilib/src/views/base":70}],128:[function(require,module,exports){
var EditSelection, Views, ajax, config, token, tpl,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

config = require('../../config');

ajax = require('hilib/src/managers/ajax');

token = require('hilib/src/managers/token');

Views = {
  Base: require('hilib/src/views/base')
};

tpl = require('../../../jade/project/editselection.jade');

EditSelection = (function(_super) {
  __extends(EditSelection, _super);

  function EditSelection() {
    return EditSelection.__super__.constructor.apply(this, arguments);
  }

  EditSelection.prototype.initialize = function() {
    EditSelection.__super__.initialize.apply(this, arguments);
    return this.render();
  };

  EditSelection.prototype.render = function() {
    var rtpl;
    rtpl = tpl(this.model.attributes);
    this.el.innerHTML = rtpl;
    return this;
  };

  EditSelection.prototype.events = function() {
    return {
      'click button[name="savemetadata"]': 'saveMetadata',
      'click button[name="cancel"]': function() {
        return this.trigger('close');
      },
      'keyup input[type="text"]': 'toggleCheckboxes',
      'change input[type="checkbox"]': 'toggleCheckboxes',
      'click i.fa': 'toggleIncludeCheckboxes'
    };
  };

  EditSelection.prototype.emptyInput = function(name) {
    var input;
    input = this.el.querySelector('input[name="' + name + '"]');
    if (input.type === 'checkbox') {
      return input.checked = false;
    } else {
      return input.value = '';
    }
  };

  EditSelection.prototype.toggleIncludeCheckboxes = function(ev) {
    var $target;
    $target = $(ev.currentTarget);
    $target.toggleClass('fa-square-o');
    $target.toggleClass('fa-check-square-o');
    if ($target.hasClass('fa-square-o')) {
      this.emptyInput($target.attr('data-name'));
      $target.removeClass('include');
    } else {
      $target.addClass('include');
    }
    return this.updateSettings();
  };


  /* TODO */


  /* TODO */

  EditSelection.prototype.toggleCheckboxes = function() {
    var $cb, check, input, _i, _len, _ref;
    _ref = this.el.querySelectorAll('input');
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      input = _ref[_i];
      check = false;
      if (input.type === 'checkbox') {
        if (input.checked) {
          check = true;
        }
      } else {
        if (input.value.length > 0) {
          check = true;
        }
      }
      $cb = this.$('i[data-name="' + input.name + '"]');
      if (check) {
        $cb.removeClass('fa-square-o');
        $cb.addClass('fa-check-square-o');
      } else if (!$cb.hasClass('include')) {
        $cb.addClass('fa-square-o');
        $cb.removeClass('fa-check-square-o');
      }
    }
    return this.updateSettings();
  };

  EditSelection.prototype.updateSettings = function() {
    var i, input, name, _i, _j, _len, _len1, _ref, _ref1;
    this.settings = {};
    _ref = this.el.querySelectorAll('input');
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      input = _ref[_i];
      if (input.type === 'checkbox') {
        if (input.checked) {
          this.settings[input.name] = true;
        }
      } else {
        if (input.value.length > 0) {
          this.settings[input.name] = input.value;
        }
      }
    }
    _ref1 = this.el.querySelectorAll('i.fa.include');
    for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
      i = _ref1[_j];
      name = i.getAttribute('data-name');
      input = this.el.querySelector('input[name="' + name + '"]');
      this.settings[name] = input.type === 'checkbox' ? false : '';
    }
    return this.activateSaveButton();
  };

  EditSelection.prototype.activateSaveButton = function() {
    if (_.isEmpty(this.settings) || document.querySelectorAll('.entries input[type="checkbox"]:checked').length === 0) {
      return this.$('button[name="savemetadata"]').addClass('inactive');
    } else {
      return this.$('button[name="savemetadata"]').removeClass('inactive');
    }
  };

  EditSelection.prototype.saveMetadata = function(ev) {
    var entryIDs, jqXHR, saveButton;
    ev.preventDefault();
    if (!$(ev.currentTarget).hasClass('inactive')) {
      entryIDs = _.map(document.querySelectorAll('.entries input[type="checkbox"]:checked'), (function(_this) {
        return function(cb) {
          return +cb.getAttribute('data-id');
        };
      })(this));
      if (entryIDs.length > 0 && !_.isEmpty(this.settings)) {
        saveButton = this.$('button[name="savemetadata"]');
        saveButton.addClass('loader');
        ajax.token = token.get();
        jqXHR = ajax.put({
          url: config.baseUrl + ("projects/" + this.model.id + "/multipleentrysettings"),
          data: JSON.stringify({
            projectEntryIds: entryIDs,
            settings: this.settings
          }),
          dataType: 'text'
        });
        jqXHR.done((function(_this) {
          return function() {
            _this.model.get('entries').changed = _.union(_this.model.get('entries').changed, entryIDs);
            saveButton.removeClass('loader');
            _this.publish('message', 'Metadata of multiple entries saved.');
            _this.trigger('saved');
            return _this.trigger('close');
          };
        })(this));
        return jqXHR.fail((function(_this) {
          return function(response) {
            if (response.status === 401) {
              return Backbone.history.navigate('login', {
                trigger: true
              });
            }
          };
        })(this));
      }
    }
  };

  return EditSelection;

})(Views.Base);

module.exports = EditSelection;


},{"../../../jade/project/editselection.jade":145,"../../config":100,"hilib/src/managers/ajax":52,"hilib/src/managers/token":56,"hilib/src/views/base":70}],129:[function(require,module,exports){
var Collections, ProjectHistory, tpl,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Collections = {
  History: require('../../collections/project/history'),
  projects: require('../../collections/projects')
};

tpl = require('../../../jade/project/history.jade');

ProjectHistory = (function(_super) {
  __extends(ProjectHistory, _super);

  function ProjectHistory() {
    return ProjectHistory.__super__.constructor.apply(this, arguments);
  }

  ProjectHistory.prototype.className = 'projecthistory';

  ProjectHistory.prototype.initialize = function() {
    ProjectHistory.__super__.initialize.apply(this, arguments);
    this.index = 0;
    return Collections.projects.getCurrent((function(_this) {
      return function(project) {
        _this.project = project;
        _this.all = new Collections.History(_this.project.id);
        return _this.all.fetch(function(response) {
          _this.historyChunks = [];
          while (response.length > 0) {
            _this.historyChunks.push(response.splice(0, 500));
          }
          return _this.render();
        });
      };
    })(this));
  };

  ProjectHistory.prototype.render = function() {
    var chunk, chunks, rtpl;
    if (this.index + 1 === this.historyChunks.length) {
      this.el.querySelector('button.more').style.display = 'none';
    }
    chunk = this.historyChunks[this.index];
    _.each(chunk, function(entry) {
      return entry.dateString = new Date(entry.createdOn).toDateString();
    });
    chunks = _.groupBy(chunk, 'dateString');
    rtpl = tpl({
      logEntries: chunks
    });
    this.el.innerHTML = rtpl;
    return this;
  };

  ProjectHistory.prototype.events = function() {
    return {
      'click button.more': 'more'
    };
  };

  ProjectHistory.prototype.more = function(ev) {
    this.index++;
    return this.renderEntries();
  };

  return ProjectHistory;

})(BaseView);

module.exports = ProjectHistory;


},{"../../../jade/project/history.jade":146,"../../collections/project/history":96,"../../collections/projects":97}],130:[function(require,module,exports){
var Collections, Entry, Fn, ProjectMain, Views, config, currentUser, dom, token, tpl, viewManager,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Fn = require('hilib/src/utils/general');

viewManager = require('hilib/src/managers/view2');

dom = require('hilib/src/utils/DOM');

config = require('../../config');

token = require('hilib/src/managers/token');

currentUser = require('../../models/currentUser');

Entry = require('../../models/entry');

Collections = {
  projects: require('../../collections/projects')
};

Views = {
  Base: require('hilib/src/views/base'),
  FacetedSearch: require('faceted-search'),
  Modal: require('hilib/src/views/modal/main'),
  Pagination: require('hilib/src/views/pagination/main'),
  EditSelection: require('./editselection'),
  EntryListitem: require('../entry/listitem')
};

tpl = require('../../../jade/project/main.jade');

ProjectMain = (function(_super) {
  __extends(ProjectMain, _super);

  function ProjectMain() {
    return ProjectMain.__super__.constructor.apply(this, arguments);
  }

  ProjectMain.prototype.className = 'projectsearch';

  ProjectMain.prototype.initialize = function() {
    ProjectMain.__super__.initialize.apply(this, arguments);
    this.resultRows = 50;
    this.subscribe('sortlevels:saved', this.renderLevels);
    return Collections.projects.getCurrent((function(_this) {
      return function(project) {
        _this.project = project;
        return _this.render();
      };
    })(this));
  };

  ProjectMain.prototype.render = function() {
    var rtpl;
    rtpl = tpl({
      user: currentUser,
      settings: this.project.get('settings')
    });
    this.$el.html(rtpl);
    this.renderFacetedSearch();
    this.renderLevels();
    this.pollDraft();
    return this;
  };

  ProjectMain.prototype.renderFacetedSearch = function() {
    this.subviews.facetedSearch = new Views.FacetedSearch({
      baseUrl: config.baseUrl,
      searchPath: 'projects/' + this.project.id + '/search',
      token: token.get(),
      textSearchOptions: {
        textLayers: this.project.get('textLayers'),
        searchInAnnotations: true,
        searchInTranscriptions: true
      },
      queryOptions: {
        resultRows: this.resultRows
      }
    });
    this.$('.faceted-search-placeholder').html(this.subviews.facetedSearch.el);
    this.listenTo(this.subviews.facetedSearch, 'unauthorized', (function(_this) {
      return function() {
        return Backbone.history.navigate('login', {
          trigger: true
        });
      };
    })(this));
    return this.listenTo(this.subviews.facetedSearch, 'results:change', (function(_this) {
      return function(responseModel) {
        _this.project.resultSet = responseModel;
        _this.renderHeader(responseModel);
        return _this.renderResults(responseModel);
      };
    })(this));
  };

  ProjectMain.prototype.renderHeader = function(responseModel) {
    this.el.querySelector('h3.numfound').innerHTML = responseModel.get('numFound') + (" " + (this.project.get('settings').get('entry.term_plural')) + " found");
    this.renderLevels();
    if (this.subviews.pagination != null) {
      this.stopListening(this.subviews.pagination);
      this.subviews.pagination.destroy();
    }
    this.subviews.pagination = new Views.Pagination({
      start: responseModel.get('start'),
      rowCount: this.resultRows,
      resultCount: responseModel.get('numFound')
    });
    this.listenTo(this.subviews.pagination, 'change:pagenumber', (function(_this) {
      return function(pagenumber) {
        return _this.subviews.facetedSearch.page(pagenumber);
      };
    })(this));
    return this.$('.pagination').html(this.subviews.pagination.el);
  };

  ProjectMain.prototype.renderLevels = function() {
    var rtpl;
    rtpl = tpls['project/header.levels']({
      project: this.project
    });
    return this.$('header li.levels').html(rtpl);
  };

  ProjectMain.prototype.renderResults = function(responseModel) {
    var count, entries, entry, entryListitem, found, frag, fulltext, queryOptions, result, term, ulentries, _i, _len, _ref, _ref1, _ref2;
    queryOptions = (_ref = responseModel.options.queryOptions) != null ? _ref : {};
    fulltext = (queryOptions.term != null) && queryOptions.term !== '';
    entries = this.project.get('entries');
    entries.add(responseModel.get('results'), {
      merge: true
    });
    frag = document.createDocumentFragment();
    _ref1 = responseModel.get('results');
    for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
      result = _ref1[_i];
      entry = entries.get(result.id);
      entry.project = this.project;
      found = [];
      _ref2 = entry.get('terms');
      for (term in _ref2) {
        if (!__hasProp.call(_ref2, term)) continue;
        count = _ref2[term];
        found.push(term + ': ' + count);
      }
      entryListitem = new Views.EntryListitem({
        model: entry,
        fulltext: fulltext,
        found: found.join(', ')
      });
      frag.appendChild(entryListitem.el);
    }
    ulentries = this.el.querySelector('ul.entries');
    ulentries.innerHTML = '';
    ulentries.appendChild(frag);
    ulentries.style.height = document.documentElement.clientHeight - dom(ulentries).position().top + 'px';
    document.getElementById('cb_showkeywords').checked = fulltext;
    return this;
  };

  ProjectMain.prototype.events = {
    'click .submenu li[data-key="newsearch"]': function() {
      return this.subviews.facetedSearch.reset();
    },
    'click .submenu li[data-key="newentry"]': 'newEntry',
    'click .submenu li[data-key="editmetadata"]': 'toggleEditMultipleMetadata',
    'click .submenu li[data-key="publish"]': 'publishDraft',
    'click li.levels > button': 'toggleLevels',
    'click li.levels ul button': 'saveLevels',
    'change li.levels ul li select': 'changeLevels',
    'click li.levels ul li i.fa': 'changeAlphaSort',
    'click li[data-key="selectall"]': function() {
      return Fn.checkCheckboxes('.entries input[type="checkbox"]', true, this.el);
    },
    'click li[data-key="deselectall"]': 'uncheckCheckboxes',
    'change #cb_showkeywords': function(ev) {
      if (ev.currentTarget.checked) {
        return this.$('.keywords').show();
      } else {
        return this.$('.keywords').hide();
      }
    },
    'change .entry input[type="checkbox"]': function() {
      return this.subviews.editMultipleEntryMetadata.activateSaveButton();
    }
  };

  ProjectMain.prototype.toggleLevels = function(ev) {
    return this.$('li.levels ul').toggle();
  };

  ProjectMain.prototype.changeLevels = function(ev) {
    var $target, i, select, target, _i, _j, _len, _len1, _ref, _ref1, _results;
    this.$('li.levels ul').addClass('show-save-button');
    target = ev.currentTarget;
    _ref = this.el.querySelectorAll('li.levels ul select');
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      select = _ref[_i];
      if (select.name !== target.name && select.value === target.value) {
        select.selectedIndex = 0;
      }
    }
    _ref1 = this.el.querySelectorAll('li.levels ul li i.fa');
    _results = [];
    for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
      i = _ref1[_j];
      $target = this.$(i);
      $target.addClass('fa-sort-alpha-asc');
      _results.push($target.removeClass('fa-sort-alpha-desc'));
    }
    return _results;
  };

  ProjectMain.prototype.changeAlphaSort = function(ev) {
    var $target;
    this.$('li.levels ul').addClass('show-save-button');
    $target = this.$(ev.currentTarget);
    $target.toggleClass('fa-sort-alpha-asc');
    return $target.toggleClass('fa-sort-alpha-desc');
  };

  ProjectMain.prototype.saveLevels = function() {
    var li, select, sortParameter, sortParameters, _i, _len, _ref;
    sortParameters = [];
    _ref = this.el.querySelectorAll('li.levels ul li[name]');
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      li = _ref[_i];
      select = li.querySelector('select');
      sortParameter = {};
      sortParameter.fieldname = select.options[select.selectedIndex].value;
      sortParameter.direction = $(li).find('i.fa').hasClass('fa-sort-alpha-asc') ? 'asc' : 'desc';
      sortParameters.push(sortParameter);
    }
    return this.subviews.facetedSearch.refresh({
      sortParameters: sortParameters
    });
  };

  ProjectMain.prototype.toggleEditMultipleMetadata = function(ev) {
    var entries, visible;
    entries = this.el.querySelector('ul.entries');
    this.$('.resultview').toggleClass('edit-multiple-entry-metadata');
    if (this.$('.resultview').hasClass('edit-multiple-entry-metadata')) {
      this.subviews.editMultipleEntryMetadata = new Views.EditSelection({
        model: this.project
      });
      this.$('.editselection-placeholder').html(this.subviews.editMultipleEntryMetadata.el);
      this.listenToOnce(this.subviews.editMultipleEntryMetadata, 'close', (function(_this) {
        return function() {
          return _this.toggleEditMultipleMetadata();
        };
      })(this));
      this.listenToOnce(this.subviews.editMultipleEntryMetadata, 'saved', (function(_this) {
        return function() {
          return _this.subviews.facetedSearch.refresh();
        };
      })(this));
    } else {
      Fn.checkCheckboxes(null, false, entries);
      this.stopListening(this.subviews.editMultipleEntryMetadata);
      this.subviews.editMultipleEntryMetadata.destroy();
    }
    visible = !visible;
    return entries.style.height = document.documentElement.clientHeight - dom(entries).position().top + 'px';
  };

  ProjectMain.prototype.newEntry = function(ev) {
    var modal;
    modal = new Views.Modal({
      title: "Create a new " + (this.project.get('settings').get('entry.term_singular')),
      html: '<form><ul><li><label>Name</label><input type="text" name="name" /></li></ul></form>',
      submitValue: "Create " + (this.project.get('settings').get('entry.term_singular')),
      width: '300px'
    });
    return modal.on('submit', (function(_this) {
      return function() {
        var entry;
        modal.message('success', "Creating a new " + (_this.project.get('settings').get('entry.term_singular')) + "...");
        entry = new Entry({
          name: modal.$('input[name="name"]').val()
        }, {
          projectID: _this.project.id
        });
        return entry.save([], {
          success: function(model) {
            _this.stopListening();
            _this.project.get('entries').add(model);
            modal.close();
            _this.publish('message', "New " + (_this.project.get('settings').get('entry.term_singular')) + " added to project.");
            return Backbone.history.navigate("projects/" + (_this.project.get('name')) + "/entries/" + entry.id, {
              trigger: true
            });
          }
        });
      };
    })(this));
  };

  ProjectMain.prototype.changePage = function(ev) {
    var cl;
    cl = ev.currentTarget.classList;
    if (cl.contains('inactive')) {
      return;
    }
    this.el.querySelector('li.prev').classList.remove('inactive');
    this.el.querySelector('li.next').classList.remove('inactive');
    if (cl.contains('prev')) {
      return this.subviews.facetedSearch.prev();
    } else if (cl.contains('next')) {
      return this.subviews.facetedSearch.next();
    }
  };

  ProjectMain.prototype.uncheckCheckboxes = function() {
    return Fn.checkCheckboxes('.entries input[type="checkbox"]', false, this.el);
  };

  ProjectMain.prototype.destroy = function() {
    this.subviews.facetedSearch.remove();
    return this.remove();
  };

  ProjectMain.prototype.activatePublishDraftButton = function() {
    var busyText, button;
    busyText = 'Publishing draft...';
    button = this.el.querySelector('li[data-key="publish"]');
    if (button.innerHTML === busyText) {
      return false;
    }
    button.innerHTML = busyText;
    return button.classList.add('active');
  };

  ProjectMain.prototype.deactivatePublishDraftButton = function() {
    var button;
    button = this.el.querySelector('li[data-key="publish"]');
    button.innerHTML = 'Publish draft';
    return button.classList.remove('active');
  };

  ProjectMain.prototype.publishDraft = function(ev) {
    this.activatePublishDraftButton();
    return this.project.publishDraft((function(_this) {
      return function() {
        return _this.deactivatePublishDraftButton();
      };
    })(this));
  };

  ProjectMain.prototype.pollDraft = function() {
    var locationUrl;
    locationUrl = localStorage.getItem('publishDraftLocation');
    if (locationUrl != null) {
      this.activatePublishDraftButton();
      return this.project.pollDraft(locationUrl, (function(_this) {
        return function() {
          return _this.deactivatePublishDraftButton();
        };
      })(this));
    }
  };

  return ProjectMain;

})(Views.Base);

module.exports = ProjectMain;


},{"../../../jade/project/main.jade":147,"../../collections/projects":97,"../../config":100,"../../models/currentUser":105,"../../models/entry":106,"../entry/listitem":120,"./editselection":128,"faceted-search":20,"hilib/src/managers/token":56,"hilib/src/managers/view2":57,"hilib/src/utils/DOM":65,"hilib/src/utils/general":67,"hilib/src/views/base":70,"hilib/src/views/modal/main":80,"hilib/src/views/pagination/main":82}],131:[function(require,module,exports){
var EntryMetadata, ProjectSettingsEntries, Views, ajax, config, tpl,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

config = require('../../../config');

ajax = require('hilib/src/managers/ajax');

EntryMetadata = require('../../../entry.metadata');

Views = {
  Base: require('hilib/src/views/base'),
  EditableList: require('hilib/src/views/form/editablelist/main')
};

tpl = require('../../../../jade/project/settings/entries.jade');

ProjectSettingsEntries = (function(_super) {
  __extends(ProjectSettingsEntries, _super);

  function ProjectSettingsEntries() {
    return ProjectSettingsEntries.__super__.constructor.apply(this, arguments);
  }

  ProjectSettingsEntries.prototype.className = 'entries';

  ProjectSettingsEntries.prototype.initialize = function() {
    ProjectSettingsEntries.__super__.initialize.apply(this, arguments);
    this.project = this.options.project;
    return this.render();
  };

  ProjectSettingsEntries.prototype.render = function() {
    var EntryMetadataList;
    this.el.innerHTML = tpl({
      settings: this.project.get('settings').attributes,
      level1: this.project.get('level1'),
      level2: this.project.get('level2'),
      level3: this.project.get('level3'),
      entrymetadatafields: this.project.get('entrymetadatafields')
    });
    EntryMetadataList = new Views.EditableList({
      value: this.project.get('entrymetadatafields'),
      config: {
        settings: {
          placeholder: 'Add field',
          confirmRemove: true
        }
      }
    });
    this.listenTo(EntryMetadataList, 'confirmRemove', (function(_this) {
      return function(id, confirm) {
        return _this.trigger('confirm', confirm, {
          html: 'You are about to delete entry metadata field: ' + id,
          submitValue: 'Remove field ' + id
        });
      };
    })(this));
    this.listenTo(EntryMetadataList, 'change', (function(_this) {
      return function(values) {
        return new EntryMetadata(_this.project.id).save(values, {
          success: function() {
            return _this.publish('message', 'Entry metadata fields updated.');
          }
        });
      };
    })(this));
    this.$('.entrylist').append(EntryMetadataList.el);
    return this;
  };

  ProjectSettingsEntries.prototype.events = function() {
    return {
      'click button.savesortlevels': 'saveSortLevels',
      'click .setnames form input[type="submit"]': 'submitSetCustomNames',
      'keyup .setnames form input[type="text"]': function(ev) {
        return this.$('.setnames form input[type="submit"]').removeClass('inactive');
      },
      'change .sortlevels select': function(ev) {
        return this.$('.sortlevels form button').removeClass('inactive');
      }
    };
  };

  ProjectSettingsEntries.prototype.submitSetCustomNames = function(ev) {
    var input, _i, _len, _ref;
    ev.preventDefault();
    _ref = this.el.querySelectorAll('.setnames form input[type="text"]');
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      input = _ref[_i];
      this.project.get('settings').set(input.name, input.value);
    }
    return this.trigger('savesettings', ev);
  };

  ProjectSettingsEntries.prototype.saveSortLevels = function(ev) {
    var jqXHR, select, sortlevels, _i, _len, _ref;
    ev.preventDefault();
    if (this.$('.sortlevels form button').hasClass('inactive')) {
      return;
    }
    sortlevels = [];
    _ref = this.$('.sortlevels select');
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      select = _ref[_i];
      sortlevels.push(select.value);
    }
    jqXHR = ajax.put({
      url: config.baseUrl + ("projects/" + this.project.id + "/sortlevels"),
      data: JSON.stringify(sortlevels)
    });
    return jqXHR.done((function(_this) {
      return function() {
        _this.project.set('level1', sortlevels[0]);
        _this.project.set('level2', sortlevels[1]);
        _this.project.set('level3', sortlevels[2]);
        _this.$('.sortlevels form button').addClass('inactive');
        _this.publish('message', 'Entry sort levels saved.');
        return _this.publish('sortlevels:saved');
      };
    })(this));
  };

  return ProjectSettingsEntries;

})(Views.Base);

module.exports = ProjectSettingsEntries;


},{"../../../../jade/project/settings/entries.jade":149,"../../../config":100,"../../../entry.metadata":101,"hilib/src/managers/ajax":52,"hilib/src/views/base":70,"hilib/src/views/form/editablelist/main":73}],132:[function(require,module,exports){
var Async, Collections, EntryMetadata, Models, ProjectSettings, ProjectUserIDs, Views, addAnnotationTypetpl, ajax, config, token, tpl,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

config = require('../../../config');

Async = require('hilib/src/managers/async');

ajax = require('hilib/src/managers/ajax');

token = require('hilib/src/managers/token');

EntryMetadata = require('../../../entry.metadata');

Views = {
  Base: require('hilib/src/views/base'),
  EditableList: require('hilib/src/views/form/editablelist/main'),
  ComboList: require('hilib/src/views/form/combolist/main'),
  Form: require('hilib/src/views/form/main'),
  Modal: require('hilib/src/views/modal/main'),
  TextlayersTab: require('./textlayers'),
  EntriesTab: require('./entries'),
  UsersTab: require('./users')
};

Models = {
  Statistics: require('../../../models/project/statistics'),
  Settings: require('../../../models/project/settings'),
  User: require('../../../models/user'),
  Annotationtype: require('../../../models/project/annotationtype')
};

Collections = {
  projects: require('../../../collections/projects')
};

ProjectUserIDs = require('../../../project.user.ids');

tpl = require('../../../../jade/project/settings/main.jade');

addAnnotationTypetpl = require('../../../../jade/project/settings/addannotationtype.jade');

ProjectSettings = (function(_super) {
  __extends(ProjectSettings, _super);

  function ProjectSettings() {
    return ProjectSettings.__super__.constructor.apply(this, arguments);
  }

  ProjectSettings.prototype.className = 'projectsettings';

  ProjectSettings.prototype.initialize = function() {
    ProjectSettings.__super__.initialize.apply(this, arguments);
    return Collections.projects.getCurrent((function(_this) {
      return function(project) {
        _this.project = project;
        _this.model = _this.project.get('settings');
        return _this.render();
      };
    })(this));
  };

  ProjectSettings.prototype.render = function() {
    var rtpl;
    rtpl = tpl({
      settings: this.model.attributes,
      projectMembers: this.project.get('members')
    });
    this.$el.html(rtpl);
    this.renderUserTab();
    this.renderEntriesTab();
    this.renderTextlayersTab();
    this.renderAnnotationsTab();
    if (this.options.tabName) {
      this.showTab(this.options.tabName);
    }
    this;
    return this.listenTo(this.model, 'change', (function(_this) {
      return function() {
        return _this.$('input[name="savesettings"]').removeClass('inactive');
      };
    })(this));
  };

  ProjectSettings.prototype.renderEntriesTab = function() {
    var entriesTab;
    entriesTab = new Views.EntriesTab({
      project: this.project
    });
    this.listenTo(entriesTab, 'confirm', this.renderConfirmModal);
    this.listenTo(entriesTab, 'savesettings', this.saveSettings);
    return this.$('div[data-tab="entries"]').html(entriesTab.el);
  };

  ProjectSettings.prototype.renderTextlayersTab = function() {
    var textlayersTab;
    textlayersTab = new Views.TextlayersTab({
      project: this.project
    });
    this.listenTo(textlayersTab, 'confirm', this.renderConfirmModal);
    return this.$('div[data-tab="textlayers"]').html(textlayersTab.el);
  };

  ProjectSettings.prototype.renderUserTab = function() {
    var usersTab;
    usersTab = new Views.UsersTab({
      project: this.project
    });
    this.listenTo(usersTab, 'confirm', this.renderConfirmModal);
    return this.$('div[data-tab="users"]').html(usersTab.el);
  };

  ProjectSettings.prototype.renderAnnotationsTab = function() {
    var annotationTypes, combolist, form;
    annotationTypes = this.project.get('annotationtypes');
    combolist = new Views.ComboList({
      value: annotationTypes,
      config: {
        data: this.project.allannotationtypes,
        settings: {
          placeholder: 'Add annotation type',
          confirmRemove: true
        }
      }
    });
    this.$('div[data-tab="annotationtypes"] .annotationtypelist').append(combolist.el);
    form = new Views.Form({
      Model: Models.Annotationtype,
      tpl: addAnnotationTypeTpl
    });
    this.$('div[data-tab="annotationtypes"] .addannotationtype').append(form.el);
    this.listenTo(combolist, 'confirmRemove', (function(_this) {
      return function(id, confirm) {
        return _this.renderConfirmModal(confirm, {
          title: 'Caution!',
          html: "You are about to <b>remove</b> annotation type: " + (annotationTypes.get(id).get('title')) + ".<br><br>All annotations of type " + (annotationTypes.get(id).get('title')) + " will be <b>permanently</b> removed!",
          submitValue: 'Remove annotation type'
        });
      };
    })(this));
    this.listenTo(combolist, 'change', (function(_this) {
      return function(changes) {
        var annotationType, name;
        if (changes.added != null) {
          annotationType = changes.collection.get(changes.added);
          return _this.project.addAnnotationType(annotationType, function() {
            return _this.publish('message', "Added " + (annotationType.get('name')) + " to " + (_this.project.get('title')) + ".");
          });
        } else if (changes.removed != null) {
          name = _this.project.allannotationtypes.get(changes.removed).get('name');
          return _this.project.removeAnnotationType(changes.removed, function() {
            return _this.publish('message', "Removed " + name + " from " + (_this.project.get('title')) + ".");
          });
        }
      };
    })(this));
    this.listenTo(form, 'save:success', (function(_this) {
      return function(model) {
        return _this.project.get('annotationtypes').add(model);
      };
    })(this));
    return this.listenTo(form, 'save:error', (function(_this) {
      return function(model, xhr, options) {
        return _this.publish('message', xhr.responseText);
      };
    })(this));
  };

  ProjectSettings.prototype.renderConfirmModal = function(confirm, options) {
    var modal;
    modal = new Views.Modal(_.extend(options, {
      width: 'auto'
    }));
    return modal.on('submit', (function(_this) {
      return function() {
        modal.close();
        return confirm();
      };
    })(this));
  };

  ProjectSettings.prototype.events = {
    'click li[data-tab]': 'showTab',
    'keyup div[data-tab="project"] input': function() {
      return this.$('input[name="savesettings"]').removeClass('inactive');
    },
    'change div[data-tab="project"] input': 'updateModel',
    'change div[data-tab="project"] select': 'updateModel',
    'click input[name="savesettings"]': 'saveSettings'
  };

  ProjectSettings.prototype.saveSettings = function(ev) {
    ev.preventDefault();
    if (!$(ev.currentTarget).hasClass('inactive')) {
      return this.model.save(null, {
        success: (function(_this) {
          return function() {
            $(ev.currentTarget).addClass('inactive');
            return _this.publish('message', 'Settings saved.');
          };
        })(this)
      });
    }
  };

  ProjectSettings.prototype.updateModel = function(ev) {
    if (ev.currentTarget.getAttribute('data-attr') === 'text.font') {
      console.log(this.$('img[name="text.font"]'));
      this.$('img[name="text.font"]').attr('src', "/images/fonts/" + ev.currentTarget.value + ".png");
    }
    return this.model.set(ev.currentTarget.getAttribute('data-attr'), ev.currentTarget.value);
  };

  ProjectSettings.prototype.showTab = function(ev) {
    var $ct, index, tabName;
    if (_.isString(ev)) {
      tabName = ev;
    } else {
      $ct = $(ev.currentTarget);
      tabName = $ct.attr('data-tab');
    }
    index = Backbone.history.fragment.indexOf('/settings');
    Backbone.history.navigate(Backbone.history.fragment.substr(0, index) + '/settings/' + tabName);
    this.$(".active[data-tab]").removeClass('active');
    return this.$("[data-tab='" + tabName + "']").addClass('active');
  };

  return ProjectSettings;

})(Views.Base);

module.exports = ProjectSettings;


},{"../../../../jade/project/settings/addannotationtype.jade":148,"../../../../jade/project/settings/main.jade":150,"../../../collections/projects":97,"../../../config":100,"../../../entry.metadata":101,"../../../models/project/annotationtype":109,"../../../models/project/settings":111,"../../../models/project/statistics":112,"../../../models/user":114,"../../../project.user.ids":116,"./entries":131,"./textlayers":133,"./users":134,"hilib/src/managers/ajax":52,"hilib/src/managers/async":53,"hilib/src/managers/token":56,"hilib/src/views/base":70,"hilib/src/views/form/combolist/main":71,"hilib/src/views/form/editablelist/main":73,"hilib/src/views/form/main":75,"hilib/src/views/modal/main":80}],133:[function(require,module,exports){
var ProjectSettingsTextlayers, Views, ajax, config, tpl,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

config = require('../../../config');

ajax = require('hilib/src/managers/ajax');

Views = {
  Base: require('hilib/src/views/base'),
  EditableList: require('hilib/src/views/form/editablelist/main')
};

tpl = require('../../../../jade/project/settings/textlayers.jade');

ProjectSettingsTextlayers = (function(_super) {
  __extends(ProjectSettingsTextlayers, _super);

  function ProjectSettingsTextlayers() {
    return ProjectSettingsTextlayers.__super__.constructor.apply(this, arguments);
  }

  ProjectSettingsTextlayers.prototype.className = 'textlayers';

  ProjectSettingsTextlayers.prototype.initialize = function() {
    ProjectSettingsTextlayers.__super__.initialize.apply(this, arguments);
    this.project = this.options.project;
    return this.render();
  };

  ProjectSettingsTextlayers.prototype.render = function() {
    var textLayerList;
    this.el.innerHTML = tpl();
    textLayerList = new Views.EditableList({
      value: this.project.get('textLayers'),
      config: {
        settings: {
          placeholder: 'Add layer',
          confirmRemove: true
        }
      }
    });
    this.listenTo(textLayerList, 'confirmRemove', (function(_this) {
      return function(id, confirm) {
        return _this.trigger('confirm', confirm, {
          title: 'Caution!',
          html: 'You are about to <b>remove</b> the ' + id + ' layer<br><br>All texts and annotations will be <b>permanently</b> removed!',
          submitValue: 'Remove ' + id + ' layer'
        });
      };
    })(this));
    this.listenTo(textLayerList, 'change', (function(_this) {
      return function(values) {
        _this.project.set('textLayers', values);
        return _this.project.saveTextlayers(function() {
          return _this.publish('message', 'Text layers updated.');
        });
      };
    })(this));
    this.$el.append(textLayerList.el);
    return this;
  };

  return ProjectSettingsTextlayers;

})(Views.Base);

module.exports = ProjectSettingsTextlayers;


},{"../../../../jade/project/settings/textlayers.jade":151,"../../../config":100,"hilib/src/managers/ajax":52,"hilib/src/views/base":70,"hilib/src/views/form/editablelist/main":73}],134:[function(require,module,exports){
var Models, ProjectSettingsUsers, Views, rolesTpl, tpl,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Models = {
  User: require('../../../models/user')
};

Views = {
  Base: require('hilib/src/views/base'),
  ComboList: require('hilib/src/views/form/combolist/main'),
  Form: require('hilib/src/views/form/main')
};

tpl = require('../../../../jade/project/settings/users.jade');

rolesTpl = require('../../../../jade/project/settings/userroles.jade');

ProjectSettingsUsers = (function(_super) {
  __extends(ProjectSettingsUsers, _super);

  function ProjectSettingsUsers() {
    return ProjectSettingsUsers.__super__.constructor.apply(this, arguments);
  }

  ProjectSettingsUsers.prototype.className = 'users';

  ProjectSettingsUsers.prototype.initialize = function() {
    ProjectSettingsUsers.__super__.initialize.apply(this, arguments);
    this.project = this.options.project;
    this.members = this.project.get('members');
    this.listenTo(this.members, 'add remove', this.renderUserroles);
    return this.render();
  };

  ProjectSettingsUsers.prototype.render = function() {
    this.el.innerHTML = tpl();
    this.renderUserroles();
    this.renderCombolist();
    this.renderAddUserForm();
    return this;
  };

  ProjectSettingsUsers.prototype.renderUserroles = function() {
    return this.$('.userroles ul').html(rolesTpl({
      members: this.members
    }));
  };

  ProjectSettingsUsers.prototype.renderCombolist = function() {
    var combolist;
    combolist = new Views.ComboList({
      value: this.members,
      config: {
        data: this.project.allusers,
        settings: {
          placeholder: 'Add member',
          confirmRemove: true
        }
      }
    });
    this.$('.userlist').append(combolist.el);
    this.listenTo(combolist, 'confirmRemove', (function(_this) {
      return function(id, confirm) {
        return _this.trigger('confirm', confirm, {
          html: 'You are about to remove <u>' + _this.members.get(id).get('title') + '</u> from your project.',
          submitValue: 'Remove user'
        });
      };
    })(this));
    return this.listenTo(combolist, 'change', (function(_this) {
      return function(changes) {
        var shortName, user, userAttrs;
        if (changes.added != null) {
          userAttrs = _.findWhere(changes.selected, {
            id: changes.added
          });
          user = new Models.User(userAttrs);
          return _this.project.addUser(user, function() {
            return _this.publish('message', "Added " + (user.getShortName()) + " to " + (_this.project.get('title')) + ".");
          });
        } else if (changes.removed != null) {
          user = _this.project.allusers.get(changes.removed);
          shortName = user.getShortName();
          return _this.project.removeUser(changes.removed, function() {
            return _this.publish('message', "Removed " + shortName + " from " + (_this.project.get('title')) + ".");
          });
        }
      };
    })(this));
  };

  ProjectSettingsUsers.prototype.renderAddUserForm = function() {
    var form;
    form = new Views.Form({
      Model: Models.User,
      tpl: tpls['project/settings/adduser']
    });
    this.$('.adduser').append(form.el);
    this.listenTo(form, 'save:success', (function(_this) {
      return function(model) {
        return _this.project.get('members').add(model);
      };
    })(this));
    return this.listenTo(form, 'save:error', (function(_this) {
      return function(model, xhr, options) {
        return _this.publish('message', xhr.responseText);
      };
    })(this));
  };

  ProjectSettingsUsers.prototype.events = function() {
    return {
      'change select': 'roleChanged'
    };
  };

  ProjectSettingsUsers.prototype.roleChanged = function(ev) {
    var id, jqXHR, role;
    id = ev.currentTarget.getAttribute('data-id');
    role = ev.currentTarget.options[ev.currentTarget.selectedIndex].value;
    jqXHR = this.members.get(id).set('role', role).save();
    jqXHR.done((function(_this) {
      return function() {
        return _this.publish('message', 'Changed role to ' + role);
      };
    })(this));
    return jqXHR.fail((function(_this) {
      return function() {
        return _this.publish('message', 'Changing role failed!');
      };
    })(this));
  };

  return ProjectSettingsUsers;

})(Views.Base);

module.exports = ProjectSettingsUsers;


},{"../../../../jade/project/settings/userroles.jade":152,"../../../../jade/project/settings/users.jade":153,"../../../models/user":114,"hilib/src/views/base":70,"hilib/src/views/form/combolist/main":71,"hilib/src/views/form/main":75}],135:[function(require,module,exports){
var BaseView, Collections, Models, Statistics, tpl,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

BaseView = require('hilib/src/views/base');

Models = {
  Statistics: require('../../models/project/statistics')
};

Collections = {
  projects: require('../../collections/projects')
};

tpl = require('../../../jade/project/statistics.jade');

Statistics = (function(_super) {
  __extends(Statistics, _super);

  function Statistics() {
    return Statistics.__super__.constructor.apply(this, arguments);
  }

  Statistics.prototype.className = 'statistics';

  Statistics.prototype.initialize = function() {
    return Statistics.__super__.initialize.call(this, Collections.projects.getCurrent((function(_this) {
      return function(project) {
        var stats;
        _this.project = project;
        stats = new Models.Statistics(null, {
          projectID: _this.project.id
        });
        return stats.fetch({
          success: function(data) {
            _this.statString = JSON.stringify(data, null, 4);
            _this.statString = _this.statString.replace(/{/g, '');
            _this.statString = _this.statString.replace(/}/g, '');
            _this.statString = _this.statString.replace(/\"/g, '');
            _this.statString = _this.statString.replace(/,/g, '');
            return _this.render();
          }
        });
      };
    })(this)));
  };

  Statistics.prototype.render = function() {
    var rtpl;
    rtpl = tpl({
      statistics: this.statString
    });
    this.el.innerHTML = rtpl;
    return this;
  };

  return Statistics;

})(BaseView);

module.exports = Statistics;


},{"../../../jade/project/statistics.jade":154,"../../collections/projects":97,"../../models/project/statistics":112,"hilib/src/views/base":70}],136:[function(require,module,exports){
var BaseView, Collections, Fn, Header, Models, StringFn, ajax, config, token, tpl,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

BaseView = require('hilib/src/views/base');

config = require('../../config');

Fn = require('hilib/src/utils/general');

StringFn = require('hilib/src/utils/string');

ajax = require('hilib/src/managers/ajax');

token = require('hilib/src/managers/token');

Models = {
  currentUser: require('../../models/currentUser')
};

Collections = {
  projects: require('../../collections/projects')
};

tpl = require('../../../jade/ui/header.jade');

Header = (function(_super) {
  __extends(Header, _super);

  function Header() {
    return Header.__super__.constructor.apply(this, arguments);
  }

  Header.prototype.className = 'row span3';

  Header.prototype.initialize = function() {
    Header.__super__.initialize.apply(this, arguments);
    this.project = this.options.project;
    this.listenTo(Collections.projects, 'current:change', (function(_this) {
      return function(project) {
        _this.project = project;
        return _this.render();
      };
    })(this));
    this.subscribe('message', this.showMessage, this);
    return this.render();
  };

  Header.prototype.events = {
    'click .user .logout': function() {
      return Models.currentUser.logout();
    },
    'click .user .project': 'setProject',
    'click .project .projecttitle': 'navigateToProject',
    'click .project .settings': 'navigateToProjectSettings',
    'click .project .search': 'navigateToProject',
    'click .project .statistics': 'navigateToProjectStatistics',
    'click .project .history': 'navigateToProjectHistory',
    'click .message': function() {
      return this.$('.message').removeClass('active');
    }
  };

  Header.prototype.navigateToProject = function(ev) {
    return Backbone.history.navigate("projects/" + (this.project.get('name')), {
      trigger: true
    });
  };

  Header.prototype.navigateToProjectSettings = function(ev) {
    return Backbone.history.navigate("projects/" + (this.project.get('name')) + "/settings", {
      trigger: true
    });
  };

  Header.prototype.navigateToProjectStatistics = function(ev) {
    return Backbone.history.navigate("projects/" + (this.project.get('name')) + "/statistics", {
      trigger: true
    });
  };

  Header.prototype.navigateToProjectHistory = function(ev) {
    return Backbone.history.navigate("projects/" + (this.project.get('name')) + "/history", {
      trigger: true
    });
  };

  Header.prototype.render = function() {
    var rtpl;
    rtpl = tpl({
      projects: Collections.projects,
      user: Models.currentUser,
      plural: StringFn.ucfirst(this.project.get('settings').get('entry.term_plural'))
    });
    this.$el.html(rtpl);
    return this;
  };

  Header.prototype.setProject = function(ev) {
    var id;
    id = ev.currentTarget.getAttribute('data-id');
    return Collections.projects.setCurrent(id);
  };

  Header.prototype.showMessage = function(msg) {
    var $message;
    if (msg.trim().length === 0) {
      return false;
    }
    $message = this.$('.message');
    if (!$message.hasClass('active')) {
      $message.addClass('active');
    }
    $message.html(msg);
    return Fn.timeoutWithReset(5000, ((function(_this) {
      return function() {
        return $message.removeClass('active');
      };
    })(this)), (function(_this) {
      return function() {
        $message.addClass('pulse');
        return setTimeout((function() {
          return $message.removeClass('pulse');
        }), 1000);
      };
    })(this));
  };

  return Header;

})(BaseView);

module.exports = Header;


},{"../../../jade/ui/header.jade":155,"../../collections/projects":97,"../../config":100,"../../models/currentUser":105,"hilib/src/managers/ajax":52,"hilib/src/managers/token":56,"hilib/src/utils/general":67,"hilib/src/utils/string":69,"hilib/src/views/base":70}],137:[function(require,module,exports){
var jade = require("jade/runtime");

module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};
var locals_ = (locals || {}),model = locals_.model,collection = locals_.collection,sel = locals_.sel;
buf.push("<form><ul" + (jade.attr("data-model-id", model.cid, true, false)) + " class=\"form\"><li><label>Type</label><select name=\"metadata.type\">");
// iterate collection.models
;(function(){
  var $$obj = collection.models;
  if ('number' == typeof $$obj.length) {

    for (var $index = 0, $$l = $$obj.length; $index < $$l; $index++) {
      var item = $$obj[$index];

sel = item.id === model.get('annotationType').id
buf.push("<option" + (jade.attr("value", item.id, true, false)) + (jade.attr("selected", sel, true, false)) + ">" + (jade.escape((jade.interp = item.get('description')) == null ? '' : jade.interp)) + " (" + (jade.escape((jade.interp = item.get('name')) == null ? '' : jade.interp)) + ")</option>");
    }

  } else {
    var $$l = 0;
    for (var $index in $$obj) {
      $$l++;      var item = $$obj[$index];

sel = item.id === model.get('annotationType').id
buf.push("<option" + (jade.attr("value", item.id, true, false)) + (jade.attr("selected", sel, true, false)) + ">" + (jade.escape((jade.interp = item.get('description')) == null ? '' : jade.interp)) + " (" + (jade.escape((jade.interp = item.get('name')) == null ? '' : jade.interp)) + ")</option>");
    }

  }
}).call(this);

buf.push("</select></li>");
if ( model.get('annotationType').hasOwnProperty('metadataItems'))
{
// iterate model.get('annotationType').metadataItems
;(function(){
  var $$obj = model.get('annotationType').metadataItems;
  if ('number' == typeof $$obj.length) {

    for (var $index = 0, $$l = $$obj.length; $index < $$l; $index++) {
      var metadata = $$obj[$index];

buf.push("<li><label" + (jade.attr("title", metadata.description, true, false)) + ">" + (jade.escape(null == (jade.interp = metadata.name) ? "" : jade.interp)) + "</label><input type=\"text\"" + (jade.attr("name", 'metadata.'+metadata.name, true, false)) + (jade.attr("value", model.get('metadata')[metadata.name], true, false)) + "/></li>");
    }

  } else {
    var $$l = 0;
    for (var $index in $$obj) {
      $$l++;      var metadata = $$obj[$index];

buf.push("<li><label" + (jade.attr("title", metadata.description, true, false)) + ">" + (jade.escape(null == (jade.interp = metadata.name) ? "" : jade.interp)) + "</label><input type=\"text\"" + (jade.attr("name", 'metadata.'+metadata.name, true, false)) + (jade.attr("value", model.get('metadata')[metadata.name], true, false)) + "/></li>");
    }

  }
}).call(this);

}
buf.push("</ul></form>");;return buf.join("");
};
},{"jade/runtime":87}],138:[function(require,module,exports){
var jade = require("jade/runtime");

module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};
var locals_ = (locals || {}),randomID = locals_.randomID,generateID = locals_.generateID,entry = locals_.entry,projectName = locals_.projectName,fulltext = locals_.fulltext,found = locals_.found;
randomID = generateID()
buf.push("<li" + (jade.attr("id", 'entry'+entry.id, true, false)) + " class=\"entry\"><div class=\"editmultiple\"><input type=\"checkbox\"" + (jade.attr("data-id", entry.id, true, false)) + (jade.attr("id", randomID, true, false)) + "/><label" + (jade.attr("for", randomID, true, false)) + ">" + (jade.escape(null == (jade.interp = entry.name) ? "" : jade.interp)) + "</label></div><a" + (jade.attr("href", 'projects/'+projectName+'/entries/'+entry.id, true, false)) + ">" + (jade.escape(null == (jade.interp = entry.name) ? "" : jade.interp)) + "</a>");
if ( fulltext)
{
buf.push("<div class=\"found\">" + (jade.escape(null == (jade.interp = found) ? "" : jade.interp)) + "</div>");
}
buf.push("<div class=\"metadata\"><ul>");
// iterate entry.metadata
;(function(){
  var $$obj = entry.metadata;
  if ('number' == typeof $$obj.length) {

    for (var key = 0, $$l = $$obj.length; key < $$l; key++) {
      var value = $$obj[key];

buf.push("<li><span class=\"key\">" + (jade.escape(null == (jade.interp = key+': ') ? "" : jade.interp)) + "</span><span class=\"value\">" + (jade.escape(null == (jade.interp = value) ? "" : jade.interp)) + "</span></li>");
    }

  } else {
    var $$l = 0;
    for (var key in $$obj) {
      $$l++;      var value = $$obj[key];

buf.push("<li><span class=\"key\">" + (jade.escape(null == (jade.interp = key+': ') ? "" : jade.interp)) + "</span><span class=\"value\">" + (jade.escape(null == (jade.interp = value) ? "" : jade.interp)) + "</span></li>");
    }

  }
}).call(this);

buf.push("</ul></div>");
if ( fulltext)
{
buf.push("<div class=\"keywords\"><ul>");
if ( entry._kwic != null)
{
// iterate entry._kwic
;(function(){
  var $$obj = entry._kwic;
  if ('number' == typeof $$obj.length) {

    for (var container = 0, $$l = $$obj.length; container < $$l; container++) {
      var kwic = $$obj[container];

// iterate kwic
;(function(){
  var $$obj = kwic;
  if ('number' == typeof $$obj.length) {

    for (var $index = 0, $$l = $$obj.length; $index < $$l; $index++) {
      var row = $$obj[$index];

buf.push("<li>" + (null == (jade.interp = '<span class="container">'+container + ':</span> '+ row) ? "" : jade.interp) + "</li>");
    }

  } else {
    var $$l = 0;
    for (var $index in $$obj) {
      $$l++;      var row = $$obj[$index];

buf.push("<li>" + (null == (jade.interp = '<span class="container">'+container + ':</span> '+ row) ? "" : jade.interp) + "</li>");
    }

  }
}).call(this);

    }

  } else {
    var $$l = 0;
    for (var container in $$obj) {
      $$l++;      var kwic = $$obj[container];

// iterate kwic
;(function(){
  var $$obj = kwic;
  if ('number' == typeof $$obj.length) {

    for (var $index = 0, $$l = $$obj.length; $index < $$l; $index++) {
      var row = $$obj[$index];

buf.push("<li>" + (null == (jade.interp = '<span class="container">'+container + ':</span> '+ row) ? "" : jade.interp) + "</li>");
    }

  } else {
    var $$l = 0;
    for (var $index in $$obj) {
      $$l++;      var row = $$obj[$index];

buf.push("<li>" + (null == (jade.interp = '<span class="container">'+container + ':</span> '+ row) ? "" : jade.interp) + "</li>");
    }

  }
}).call(this);

    }

  }
}).call(this);

}
buf.push("</ul></div>");
}
buf.push("</li>");;return buf.join("");
};
},{"jade/runtime":87}],139:[function(require,module,exports){
var jade = require("jade/runtime");

module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};
var locals_ = (locals || {}),user = locals_.user;
buf.push("<div class=\"subsubmenu\"><div class=\"editfacsimiles\"></div></div><div" + (jade.cls(['row','container',(user.get('roleNo') >= 20)?'span7':'span5'], [null,null,true])) + "><div class=\"cell span3 left-pane\"><iframe id=\"viewer_iframe\" name=\"viewer_iframe\" scrolling=\"no\" width=\"100%\" frameborder=\"0\"></iframe><div class=\"preview-placeholder\"></div></div><div" + (jade.attr("style", (user.get('roleNo') < 20)?'display:none':'', true, false)) + " class=\"cell span2 middle-pane\"><div class=\"transcription-placeholder\"><div class=\"transcription-editor\"></div></div><div class=\"annotation-placeholder\"><div class=\"annotation-editor\"></div></div><div class=\"annotationmetadata-placeholder\"><div class=\"annotationmetadata\"></div></div></div><div class=\"cell span2 right-pane\"><div class=\"preview-placeholder\"></div></div></div>");;return buf.join("");
};
},{"jade/runtime":87}],140:[function(require,module,exports){
var jade = require("jade/runtime");

module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};
var locals_ = (locals || {}),textLayer = locals_.textLayer,lineCount = locals_.lineCount,body = locals_.body,lineNumber = locals_.lineNumber;
buf.push("<h2>" + (jade.escape(null == (jade.interp = textLayer + ' layer') ? "" : jade.interp)) + "</h2>");
if ( lineCount == 0)
{
buf.push("<span class=\"emptylayer\">This layer is empty.</span>");
}
buf.push("<div class=\"body-container\"><div class=\"body\">" + (null == (jade.interp = body) ? "" : jade.interp) + "</div><ul class=\"linenumbers\">");
lineNumber = 1
while (lineNumber <= lineCount)
{
buf.push("<li>" + (jade.escape(null == (jade.interp = lineNumber) ? "" : jade.interp)) + "</li>");
lineNumber++
}
buf.push("</ul></div>");;return buf.join("");
};
},{"jade/runtime":87}],141:[function(require,module,exports){
var jade = require("jade/runtime");

module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};
var locals_ = (locals || {}),currentTranscription = locals_.currentTranscription,entry = locals_.entry,user = locals_.user;
currentTranscription = entry.get('transcriptions').current
buf.push("<div class=\"row span7\"><div class=\"cell span3 left-menu\"><ul class=\"horizontal menu\"><li data-key=\"previous\"" + (jade.cls([entry.prevID>0?'active':false], [true])) + ">&nbsp;</li><li data-key=\"current\">" + (jade.escape(null == (jade.interp = entry.get('name')) ? "" : jade.interp)) + "</li><li data-key=\"next\"" + (jade.cls([entry.nextID>0?'active':false], [true])) + ">&nbsp;</li><li data-key=\"facsimiles\">Facsimiles&nbsp;<span>" + (jade.escape(null == (jade.interp = '(' + entry.get('facsimiles').length + ')') ? "" : jade.interp)) + "</span><ul class=\"vertical menu facsimiles\"><li class=\"spacer\">&nbsp;</li>");
if ( user.get('roleNo') >= 20)
{
buf.push("<li data-key=\"editfacsimiles\" class=\"subsub\">Add &amp; remove...</li>");
}
// iterate entry.get('facsimiles').models
;(function(){
  var $$obj = entry.get('facsimiles').models;
  if ('number' == typeof $$obj.length) {

    for (var index = 0, $$l = $$obj.length; index < $$l; index++) {
      var facsimile = $$obj[index];

buf.push("<li data-key=\"facsimile\"" + (jade.attr("data-value", facsimile.id, true, false)) + (jade.cls([index==0?'active':''], [true])) + ">" + (jade.escape(null == (jade.interp = facsimile.get('name')) ? "" : jade.interp)) + "</li>");
    }

  } else {
    var $$l = 0;
    for (var index in $$obj) {
      $$l++;      var facsimile = $$obj[index];

buf.push("<li data-key=\"facsimile\"" + (jade.attr("data-value", facsimile.id, true, false)) + (jade.cls([index==0?'active':''], [true])) + ">" + (jade.escape(null == (jade.interp = facsimile.get('name')) ? "" : jade.interp)) + "</li>");
    }

  }
}).call(this);

buf.push("</ul></li><li data-key=\"textlayers\">Text layers&nbsp;<span>" + (jade.escape(null == (jade.interp = '(' + entry.get('transcriptions').length + ')') ? "" : jade.interp)) + "</span><ul class=\"vertical menu textlayers\">");
// iterate entry.get('transcriptions').models
;(function(){
  var $$obj = entry.get('transcriptions').models;
  if ('number' == typeof $$obj.length) {

    for (var $index = 0, $$l = $$obj.length; $index < $$l; $index++) {
      var transcription = $$obj[$index];

buf.push("<li data-key=\"transcription\"" + (jade.attr("data-value", transcription.id, true, false)) + ">" + (jade.escape((jade.interp = transcription.get('textLayer')) == null ? '' : jade.interp)) + " layer</li>");
    }

  } else {
    var $$l = 0;
    for (var $index in $$obj) {
      $$l++;      var transcription = $$obj[$index];

buf.push("<li data-key=\"transcription\"" + (jade.attr("data-value", transcription.id, true, false)) + ">" + (jade.escape((jade.interp = transcription.get('textLayer')) == null ? '' : jade.interp)) + " layer</li>");
    }

  }
}).call(this);

buf.push("</ul></li></ul></div><div class=\"cell span2 alignright middle-menu\"><ul class=\"horizontal menu\">");
if ( user.get('roleNo') >= 20)
{
buf.push("<li data-key=\"print\">Print</li>");
}
buf.push("<li data-key=\"layer\"" + (jade.attr("data-value", currentTranscription.id, true, false)) + " class=\"arrowdown\">" + (jade.escape(null == (jade.interp = currentTranscription.get('textLayer') + ' layer') ? "" : jade.interp)) + "<ul class=\"vertical menu textlayers\"><li class=\"spacer\">&nbsp;</li>");
// iterate entry.get('transcriptions').models
;(function(){
  var $$obj = entry.get('transcriptions').models;
  if ('number' == typeof $$obj.length) {

    for (var $index = 0, $$l = $$obj.length; $index < $$l; $index++) {
      var transcription = $$obj[$index];

if ( transcription != currentTranscription)
{
buf.push("<li data-key=\"transcription\"" + (jade.attr("data-value", transcription.id, true, false)) + ">" + (jade.escape((jade.interp = transcription.get('textLayer')) == null ? '' : jade.interp)) + " layer</li>");
}
    }

  } else {
    var $$l = 0;
    for (var $index in $$obj) {
      $$l++;      var transcription = $$obj[$index];

if ( transcription != currentTranscription)
{
buf.push("<li data-key=\"transcription\"" + (jade.attr("data-value", transcription.id, true, false)) + ">" + (jade.escape((jade.interp = transcription.get('textLayer')) == null ? '' : jade.interp)) + " layer</li>");
}
    }

  }
}).call(this);

buf.push("</ul></li></ul></div><div class=\"cell span2 alignright right-menu\"><ul class=\"horizontal menu\"><li data-key=\"metadata\">Metadata</li></ul></div></div>");;return buf.join("");
};
},{"jade/runtime":87}],142:[function(require,module,exports){
var jade = require("jade/runtime");

module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};
var locals_ = (locals || {}),facsimiles = locals_.facsimiles;
buf.push("<div class=\"row span3\"><div class=\"cell span1\"><div class=\"pad2\"><h3>Facsimiles</h3><ul class=\"facsimiles\">");
// iterate facsimiles.models
;(function(){
  var $$obj = facsimiles.models;
  if ('number' == typeof $$obj.length) {

    for (var $index = 0, $$l = $$obj.length; $index < $$l; $index++) {
      var facsimile = $$obj[$index];

buf.push("<li" + (jade.attr("data-id", facsimile.id, true, false)) + " class=\"facsimile\"><span class=\"name\"><img src=\"/images/icon.bin.png\" width=\"14px\" height=\"14px\"/><label>" + (jade.escape(null == (jade.interp = facsimile.get('name')) ? "" : jade.interp)) + "</label></span><span class=\"orcancel\">or Cancel</span></li>");
    }

  } else {
    var $$l = 0;
    for (var $index in $$obj) {
      $$l++;      var facsimile = $$obj[$index];

buf.push("<li" + (jade.attr("data-id", facsimile.id, true, false)) + " class=\"facsimile\"><span class=\"name\"><img src=\"/images/icon.bin.png\" width=\"14px\" height=\"14px\"/><label>" + (jade.escape(null == (jade.interp = facsimile.get('name')) ? "" : jade.interp)) + "</label></span><span class=\"orcancel\">or Cancel</span></li>");
    }

  }
}).call(this);

buf.push("</ul></div></div><div class=\"cell span2\"><div class=\"pad2\"><h3>Upload new facsimile</h3><ul class=\"form addfacsimile\"><li><label>Name</label><input type=\"text\" name=\"name\"/></li><li><form enctype=\"multipart/form-data\" class=\"addfile\"><input type=\"file\" name=\"filename\"/></form></li><li><button class=\"addfacsimile\">Add facsimile</button></li></ul></div></div></div>");;return buf.join("");
};
},{"jade/runtime":87}],143:[function(require,module,exports){
var jade = require("jade/runtime");

module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};
var locals_ = (locals || {}),annotationTypes = locals_.annotationTypes;
buf.push("<select>");
// iterate annotationTypes.models
;(function(){
  var $$obj = annotationTypes.models;
  if ('number' == typeof $$obj.length) {

    for (var $index = 0, $$l = $$obj.length; $index < $$l; $index++) {
      var annotationType = $$obj[$index];

buf.push("<option" + (jade.attr("value", annotationType.id, true, false)) + ">" + (jade.escape(null == (jade.interp = annotationType.get('name')) ? "" : jade.interp)) + "</option>");
    }

  } else {
    var $$l = 0;
    for (var $index in $$obj) {
      $$l++;      var annotationType = $$obj[$index];

buf.push("<option" + (jade.attr("value", annotationType.id, true, false)) + ">" + (jade.escape(null == (jade.interp = annotationType.get('name')) ? "" : jade.interp)) + "</option>");
    }

  }
}).call(this);

buf.push("</select><button>Add annotation</button>");;return buf.join("");
};
},{"jade/runtime":87}],144:[function(require,module,exports){
var jade = require("jade/runtime");

module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};

buf.push("<div class=\"cell span2\"><div class=\"padl5 padr5\"><p>\t\neLaborate is an online work environment in which scholars can upload scans, transcribe and annotate text, and publish the results as on online text edition which is freely available to all users. \nAccess to the work environment is currently limited. In 2012 the tool will be adapted for deployment at European CLARIN Centers starting with the Dutch centers. http://www.clarin.nl/</p><p>eLaborate enables textual scholars to work on their edition on their own or in a group. Users only need to know how to use the internet. Project leaders can easily give reading and writing permission \nto members of their project team. They can select and add metadata fields and draw up a list of annotation categories they want to use. They can publish their edition online anytime they want. \nThe edition will then become available online in a sober design which will be elaborated on step by step in the next few years.</p><p><p>The work environment is developed by the Huygens Institute for the History of the Netherlands of the Royal Netherlands Academy of Arts and Sciences. \nThe new version was developed in the Alfalab project, making eLaborate3 the main tool available through the Textlab of <a href=\"http://alfalab.ehumanities.nl\">Alfalab</a>.</p></p><p><p>Access to eLaborate is currently granted to scholars teaching a university course in text editing and to scholars planning an edition that is somehow related to the research programme of Huygens ING.\nFor more information: <a href=\"info-elaborate@huygens.knaw.nl\">info-elaborate@huygens.knaw.nl</a></p></p><h2>eLaborate2</h2><p>Those still using eLaborate2 can find their work environment by following this link. http://www.e-laborate.nl/en/\nIn the course of 2012, projects using eLaborate2 will be migrated to eLaborate3. The eLaborate team will contact the project leaders to discuss the best time frame for the migration and to arrange instruction in eLaborate3.</p><h2>Links</h2><p>More information about the use of eLaborate3 will become available in due time (link naar handleiding-in-wording)</p><p><p>Links to digital editions prepared in eLaborate2 are listed at <a href=\"http://www.e-laborate.nl/en/\">http://www.e-laborate.nl/en/</a></p></p><p><p>Information about tools for digital text analysis can be found in Alfalab&#39;s Textlab. <a href=\"http://alfalab.ehumanities.nl/textlab\">http://alfalab.ehumanities.nl/textlab</a></p></p><p><p>Information and news relating to textual scholarship in general (mostly in Dutch) can be enjoyed at <a href=\"http://www.textualscholarship.nl/\">http://www.textualscholarship.nl/</a></p></p><p><p>More about Huygens ING at <a href=\"http://www.huygens.knaw.nl/\">http://www.huygens.knaw.nl/</a></p></p></div></div><div class=\"cell span1\"><div class=\"padl5 padr5 alignright\"><h2>Regular login</h2><form class=\"login region\"><ul class=\"message\"><li></li></ul><ul><li><label>Username</label><input id=\"username\" type=\"text\" name=\"username\" value=\"root\"/></li><li><label>Password</label><input id=\"password\" type=\"password\" name=\"password\" value=\"toor\"/></li><li class=\"login\"><input id=\"submit\" type=\"submit\" value=\"Login\" style=\"width: 75px\"/></li><li class=\"loggingin\">Logging in...<img src=\"/images/loader.gif\"/></li></ul></form></div><div class=\"federated\"><h2>Federate login</h2><button class=\"simple federated-login\">Login</button></div></div>");;return buf.join("");
};
},{"jade/runtime":87}],145:[function(require,module,exports){
var jade = require("jade/runtime");

module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};
var locals_ = (locals || {}),settings = locals_.settings,entrymetadatafields = locals_.entrymetadatafields;
buf.push("<h3>" + (jade.escape(null == (jade.interp = 'Edit metadata of multiple ' + settings.get('entry.term_plural')) ? "" : jade.interp)) + "</h3><div class=\"row span2\"><div class=\"cell span1\"><form><ul>");
// iterate entrymetadatafields
;(function(){
  var $$obj = entrymetadatafields;
  if ('number' == typeof $$obj.length) {

    for (var key = 0, $$l = $$obj.length; key < $$l; key++) {
      var field = $$obj[key];

if ( key < entrymetadatafields.length/2)
{
buf.push("<li><label>" + (jade.escape(null == (jade.interp = field) ? "" : jade.interp)) + "</label><i" + (jade.attr("data-name", field, true, false)) + " class=\"fa fa-square-o\"></i><input type=\"text\"" + (jade.attr("name", field, true, false)) + (jade.attr("tabindex", key * 2 + 2, true, false)) + "/></li>");
}
    }

  } else {
    var $$l = 0;
    for (var key in $$obj) {
      $$l++;      var field = $$obj[key];

if ( key < entrymetadatafields.length/2)
{
buf.push("<li><label>" + (jade.escape(null == (jade.interp = field) ? "" : jade.interp)) + "</label><i" + (jade.attr("data-name", field, true, false)) + " class=\"fa fa-square-o\"></i><input type=\"text\"" + (jade.attr("name", field, true, false)) + (jade.attr("tabindex", key * 2 + 2, true, false)) + "/></li>");
}
    }

  }
}).call(this);

buf.push("</ul></form></div><div class=\"cell span1\"><form><ul>");
// iterate entrymetadatafields
;(function(){
  var $$obj = entrymetadatafields;
  if ('number' == typeof $$obj.length) {

    for (var key = 0, $$l = $$obj.length; key < $$l; key++) {
      var field = $$obj[key];

if ( key >= entrymetadatafields.length/2)
{
buf.push("<li><label>" + (jade.escape(null == (jade.interp = field) ? "" : jade.interp)) + "</label><i" + (jade.attr("data-name", field, true, false)) + " class=\"fa fa-square-o\"></i><input type=\"text\"" + (jade.attr("name", field, true, false)) + (jade.attr("tabindex", key * 2 + 2, true, false)) + "/></li>");
}
    }

  } else {
    var $$l = 0;
    for (var key in $$obj) {
      $$l++;      var field = $$obj[key];

if ( key >= entrymetadatafields.length/2)
{
buf.push("<li><label>" + (jade.escape(null == (jade.interp = field) ? "" : jade.interp)) + "</label><i" + (jade.attr("data-name", field, true, false)) + " class=\"fa fa-square-o\"></i><input type=\"text\"" + (jade.attr("name", field, true, false)) + (jade.attr("tabindex", key * 2 + 2, true, false)) + "/></li>");
}
    }

  }
}).call(this);

buf.push("<li><label>Publishable</label><i data-name=\"Publishable\" class=\"fa fa-square-o\"></i><input style=\"margin-right: 137px\" type=\"checkbox\" name=\"Publishable\"" + (jade.attr("tabindex", entrymetadatafields.length * 2 + 4, true, false)) + "/></li></ul></form></div></div><footer><button name=\"cancel\"" + (jade.attr("tabindex", entrymetadatafields.length * 2 + 5, true, false)) + ">Cancel</button><span>or</span><button name=\"savemetadata\"" + (jade.attr("tabindex", entrymetadatafields.length * 2 + 6, true, false)) + " class=\"simple inactive\">Save metadata</button></footer>");;return buf.join("");
};
},{"jade/runtime":87}],146:[function(require,module,exports){
var jade = require("jade/runtime");

module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};
var locals_ = (locals || {}),logEntries = locals_.logEntries;
buf.push("<h2>History</h2><div class=\"entries\">");
// iterate logEntries
;(function(){
  var $$obj = logEntries;
  if ('number' == typeof $$obj.length) {

    for (var date = 0, $$l = $$obj.length; date < $$l; date++) {
      var entries = $$obj[date];

buf.push("<h3>" + (jade.escape(null == (jade.interp = date) ? "" : jade.interp)) + "</h3><ul>");
// iterate entries
;(function(){
  var $$obj = entries;
  if ('number' == typeof $$obj.length) {

    for (var $index = 0, $$l = $$obj.length; $index < $$l; $index++) {
      var entry = $$obj[$index];

buf.push("<li><span class=\"username\">" + (jade.escape(null == (jade.interp = entry.userName) ? "" : jade.interp)) + "</span><span>&nbsp;</span><span class=\"comment\">" + (jade.escape(null == (jade.interp = entry.comment) ? "" : jade.interp)) + "</span></li>");
    }

  } else {
    var $$l = 0;
    for (var $index in $$obj) {
      $$l++;      var entry = $$obj[$index];

buf.push("<li><span class=\"username\">" + (jade.escape(null == (jade.interp = entry.userName) ? "" : jade.interp)) + "</span><span>&nbsp;</span><span class=\"comment\">" + (jade.escape(null == (jade.interp = entry.comment) ? "" : jade.interp)) + "</span></li>");
    }

  }
}).call(this);

buf.push("</ul>");
    }

  } else {
    var $$l = 0;
    for (var date in $$obj) {
      $$l++;      var entries = $$obj[date];

buf.push("<h3>" + (jade.escape(null == (jade.interp = date) ? "" : jade.interp)) + "</h3><ul>");
// iterate entries
;(function(){
  var $$obj = entries;
  if ('number' == typeof $$obj.length) {

    for (var $index = 0, $$l = $$obj.length; $index < $$l; $index++) {
      var entry = $$obj[$index];

buf.push("<li><span class=\"username\">" + (jade.escape(null == (jade.interp = entry.userName) ? "" : jade.interp)) + "</span><span>&nbsp;</span><span class=\"comment\">" + (jade.escape(null == (jade.interp = entry.comment) ? "" : jade.interp)) + "</span></li>");
    }

  } else {
    var $$l = 0;
    for (var $index in $$obj) {
      $$l++;      var entry = $$obj[$index];

buf.push("<li><span class=\"username\">" + (jade.escape(null == (jade.interp = entry.userName) ? "" : jade.interp)) + "</span><span>&nbsp;</span><span class=\"comment\">" + (jade.escape(null == (jade.interp = entry.comment) ? "" : jade.interp)) + "</span></li>");
    }

  }
}).call(this);

buf.push("</ul>");
    }

  }
}).call(this);

buf.push("</div><button class=\"simple more\">Show the next 500 entries</button>");;return buf.join("");
};
},{"jade/runtime":87}],147:[function(require,module,exports){
var jade = require("jade/runtime");

module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};
var locals_ = (locals || {}),user = locals_.user,settings = locals_.settings;
buf.push("<div class=\"submenu\"><div class=\"row span3\"><div class=\"cell span1\"><ul class=\"horizontal menu\"><li data-key=\"newsearch\">New search</li></ul></div>");
if ( user.get('role') === 'ADMIN')
{
buf.push("<div class=\"cell span1\"><ul class=\"horizontal menu\"><li data-key=\"newentry\">" + (jade.escape(null == (jade.interp = 'New '+settings.get('entry.term_singular')) ? "" : jade.interp)) + "</li><li data-key=\"editmetadata\">Edit metadata</li></ul></div><div class=\"cell span1 alignright\"><ul class=\"horizontal menu\"><li data-key=\"publish\">Publish draft</li></ul></div>");
}
buf.push("</div></div><div class=\"faceted-search-placeholder\"></div><div class=\"resultview\"><header><div class=\"editselection-placeholder\"></div><div class=\"row span2 numfound-placeholder\"><div class=\"cell span1\"><h3 class=\"numfound\"></h3></div><div class=\"cell span1 alignright\"><nav><ul><li class=\"levels\"></li><li><input id=\"cb_showkeywords\" type=\"checkbox\"/><label for=\"cb_showkeywords\">Display keywords</label></li><li data-key=\"selectall\">Select all</li><li data-key=\"deselectall\">Deselect all</li></ul></nav></div></div><div class=\"pagination\"></div></header><ul class=\"entries\"></ul></div>");;return buf.join("");
};
},{"jade/runtime":87}],148:[function(require,module,exports){
var jade = require("jade/runtime");

module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};

buf.push("<form><ul data-model-id=\"<%= model.cid %>\"><li><label>Name</label><input type=\"text\" name=\"name\"/></li><li><label>Description</label><input type=\"text\" name=\"description\"/></li><li><button name=\"submit\" class=\"simple\">Add annotation type</button></li></ul></form>");;return buf.join("");
};
},{"jade/runtime":87}],149:[function(require,module,exports){
var jade = require("jade/runtime");

module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};
var locals_ = (locals || {}),settings = locals_.settings,entrymetadatafields = locals_.entrymetadatafields,level1 = locals_.level1,level2 = locals_.level2,level3 = locals_.level3;
buf.push("<div class=\"row span3\"><div class=\"cell span1 entrylist\"><h3>Add / remove entry metadata fields</h3></div><div class=\"cell span1 setnames\"><h3>Set entry name</h3><form><ul><li><label>Singular</label><input type=\"text\" name=\"entry.term_singular\"" + (jade.attr("value", settings['entry.term_singular'], true, false)) + " placeholder=\"entry\"/></li><li><label>Plural</label><input type=\"text\" name=\"entry.term_plural\"" + (jade.attr("value", settings['entry.term_plural'], true, false)) + " placeholder=\"entries\"/></li><li><input type=\"submit\" value=\"Save settings\" class=\"inactive\"/></li></ul></form></div><div class=\"cell span1 sortlevels\"><h3>Sort levels</h3><form><ul><li><label>Level 1</label><select name=\"level1\"><option></option>");
// iterate entrymetadatafields
;(function(){
  var $$obj = entrymetadatafields;
  if ('number' == typeof $$obj.length) {

    for (var $index = 0, $$l = $$obj.length; $index < $$l; $index++) {
      var field = $$obj[$index];

buf.push("<option" + (jade.attr("value", field, true, false)) + (jade.attr("selected", field===level1, true, false)) + ">" + (jade.escape(null == (jade.interp = field) ? "" : jade.interp)) + "</option>");
    }

  } else {
    var $$l = 0;
    for (var $index in $$obj) {
      $$l++;      var field = $$obj[$index];

buf.push("<option" + (jade.attr("value", field, true, false)) + (jade.attr("selected", field===level1, true, false)) + ">" + (jade.escape(null == (jade.interp = field) ? "" : jade.interp)) + "</option>");
    }

  }
}).call(this);

buf.push("</select></li><li><label>Level 2</label><select name=\"level2\"><option></option>");
// iterate entrymetadatafields
;(function(){
  var $$obj = entrymetadatafields;
  if ('number' == typeof $$obj.length) {

    for (var $index = 0, $$l = $$obj.length; $index < $$l; $index++) {
      var field = $$obj[$index];

buf.push("<option" + (jade.attr("value", field, true, false)) + (jade.attr("selected", field===level2, true, false)) + ">" + (jade.escape(null == (jade.interp = field) ? "" : jade.interp)) + "</option>");
    }

  } else {
    var $$l = 0;
    for (var $index in $$obj) {
      $$l++;      var field = $$obj[$index];

buf.push("<option" + (jade.attr("value", field, true, false)) + (jade.attr("selected", field===level2, true, false)) + ">" + (jade.escape(null == (jade.interp = field) ? "" : jade.interp)) + "</option>");
    }

  }
}).call(this);

buf.push("</select></li><li><label>Level 3</label><select name=\"level3\"><option></option>");
// iterate entrymetadatafields
;(function(){
  var $$obj = entrymetadatafields;
  if ('number' == typeof $$obj.length) {

    for (var $index = 0, $$l = $$obj.length; $index < $$l; $index++) {
      var field = $$obj[$index];

buf.push("<option" + (jade.attr("value", field, true, false)) + (jade.attr("selected", field===level3, true, false)) + ">" + (jade.escape(null == (jade.interp = field) ? "" : jade.interp)) + "</option>");
    }

  } else {
    var $$l = 0;
    for (var $index in $$obj) {
      $$l++;      var field = $$obj[$index];

buf.push("<option" + (jade.attr("value", field, true, false)) + (jade.attr("selected", field===level3, true, false)) + ">" + (jade.escape(null == (jade.interp = field) ? "" : jade.interp)) + "</option>");
    }

  }
}).call(this);

buf.push("</select></li><li><button class=\"simple savesortlevels inactive\">Save sort levels</button></li></ul></form></div></div>");;return buf.join("");
};
},{"jade/runtime":87}],150:[function(require,module,exports){
var jade = require("jade/runtime");

module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};
var locals_ = (locals || {}),settings = locals_.settings,projectMembers = locals_.projectMembers,sel = locals_.sel,src = locals_.src;
buf.push("<div class=\"padl5 padr5\"><h2>Settings</h2><ul class=\"horizontal tab menu\"><li data-tab=\"project\" class=\"active\">Project</li><li data-tab=\"users\">Users</li><li data-tab=\"entries\">Entries</li><li data-tab=\"textlayers\">Text layers</li><li data-tab=\"annotationtypes\">Annotations</li></ul><div data-tab=\"project\" class=\"active\"><div class=\"general\"><h3>General</h3><form><ul><li><label for=\"type\">Type</label><select name=\"projectType\" data-attr=\"projectType\"><option value=\"collection\"" + (jade.attr("selected", settings['projectType']==='collection', true, false)) + ">Collection</option><option value=\"work\"" + (jade.attr("selected", settings['projectType']==='work', true, false)) + ">Work</option></select></li><li><label for=\"title\">Project title</label><input type=\"text\" name=\"title\"" + (jade.attr("value", settings['Project title'], true, false)) + " data-attr=\"Project title\"/></li><li><label for=\"leader\">Project leader</label><select name=\"leader\" data-attr=\"Project leader\"><option>-- select member --</option>");
// iterate projectMembers.models
;(function(){
  var $$obj = projectMembers.models;
  if ('number' == typeof $$obj.length) {

    for (var $index = 0, $$l = $$obj.length; $index < $$l; $index++) {
      var member = $$obj[$index];

buf.push("<sel>= member.id === parseInt(settings['Project leader'], 10)</sel><option" + (jade.attr("value", member.id, true, false)) + (jade.attr("selected", sel, true, false)) + ">" + (jade.escape(null == (jade.interp = member.get('title')) ? "" : jade.interp)) + "</option>");
    }

  } else {
    var $$l = 0;
    for (var $index in $$obj) {
      $$l++;      var member = $$obj[$index];

buf.push("<sel>= member.id === parseInt(settings['Project leader'], 10)</sel><option" + (jade.attr("value", member.id, true, false)) + (jade.attr("selected", sel, true, false)) + ">" + (jade.escape(null == (jade.interp = member.get('title')) ? "" : jade.interp)) + "</option>");
    }

  }
}).call(this);

buf.push("</select></li><li><label for=\"start\">Start date</label><input type=\"text\" name=\"start\"" + (jade.attr("value", settings['Start date'], true, false)) + " data-attr=\"Start date\"/></li><li><label for=\"release\">Release date</label><input type=\"text\" name=\"release\"" + (jade.attr("value", settings['Release date'], true, false)) + " data-attr=\"Release date\"/></li><li><label for=\"version\">Version</label><input type=\"text\" name=\"version\"" + (jade.attr("value", settings.Version, true, false)) + " data-attr=\"Version\"/></li><li style=\"margin-top: 20px\"><input type=\"submit\" name=\"savesettings\" value=\"Save settings\" class=\"inactive\"/></li></ul></form></div>");
if ( settings.publicationURL.length > 0)
{
buf.push("<div class=\"publication\"><h3>Publication</h3><form><ul><li><label>URL</label><a" + (jade.attr("href", settings.publicationURL, true, false)) + " data-bypass=\"data-bypass\" target=\"_blank\">link</a></li><li><label>Title</label><input type=\"text\"" + (jade.attr("value", settings['publication.title'], true, false)) + " name=\"publication.title\" data-attr=\"publication.title\"/></li><li><label for=\"text.font\">Font</label><select name=\"text.font\" data-attr=\"text.font\"><option></option><option value=\"junicode\"" + (jade.attr("selected", settings['text.font']=='junicode', true, false)) + ">Junicode</option><option value=\"dejavu\"" + (jade.attr("selected", settings['text.font']=='dejavu', true, false)) + ">DejaVu</option><option value=\"gentium\"" + (jade.attr("selected", settings['text.font']=='gentium', true, false)) + ">Gentium</option><option value=\"alexander\"" + (jade.attr("selected", settings['text.font']=='alexander', true, false)) + ">Alexander</option><option value=\"newathena\"" + (jade.attr("selected", settings['text.font']=='newathena', true, false)) + ">New Athena</option></select></li>");
src = settings['text.font'] === '' ? settings['text.font'] : '/images/fonts/'+settings['text.font']+'.png'
buf.push("<li><label></label><img name=\"text.font\"" + (jade.attr("src", src, true, false)) + "/></li></ul></form></div>");
}
buf.push("</div><div data-tab=\"textlayers\"></div><div data-tab=\"entries\"></div><div data-tab=\"annotationtypes\"><div class=\"row span3\"><div class=\"cell span1 annotationtypelist\"><h3>Add / remove annotation types</h3></div><div class=\"cell span1 addannotationtype\"><h3>Add annotation type to project</h3></div><div class=\"cell span1 setnames\"><h3>Set custom names for tags</h3><p style=\"color:gray\"><strong>The custom names are only applicable to the <u>diplomatic</u> layer!</strong></p><form><ul><li><b>Bold</b></li><li><label>Name</label><input type=\"text\" name=\"annotationType.b.name\"" + (jade.attr("value", settings['annotationType.b.name'], true, false)) + "/></li><li class=\"description\"><label>Description</label><input type=\"text\" name=\"annotationType.b.description\"" + (jade.attr("value", settings['annotationType.b.description'], true, false)) + "/></li><li><b>Italic</b></li><li><label>Name</label><input type=\"text\" name=\"annotationType.i.name\"" + (jade.attr("value", settings['annotationType.i.name'], true, false)) + "/></li><li class=\"description\"><label>Description</label><input type=\"text\" name=\"annotationType.i.description\"" + (jade.attr("value", settings['annotationType.i.description'], true, false)) + "/></li><li><b>Underline</b></li><li><label>Name</label><input type=\"text\" name=\"annotationType.u.name\"" + (jade.attr("value", settings['annotationType.u.name'], true, false)) + "/></li><li class=\"description\"><label>Description</label><input type=\"text\" name=\"annotationType.u.description\"" + (jade.attr("value", settings['annotationType.u.description'], true, false)) + "/></li><li><b>Strikethrough</b></li><li><label>Name</label><input type=\"text\" name=\"annotationType.strike.name\"" + (jade.attr("value", settings['annotationType.strike.name'], true, false)) + "/></li><li class=\"description\"><label>Description</label><input type=\"text\" name=\"annotationType.strike.description\"" + (jade.attr("value", settings['annotationType.strike.description'], true, false)) + "/></li><li><input type=\"submit\" value=\"Save settings\" class=\"inactive\"/></li></ul></form></div></div></div><div data-tab=\"users\"></div></div>");;return buf.join("");
};
},{"jade/runtime":87}],151:[function(require,module,exports){
var jade = require("jade/runtime");

module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};

buf.push("<h3>Add / remove text layers</h3>");;return buf.join("");
};
},{"jade/runtime":87}],152:[function(require,module,exports){
var jade = require("jade/runtime");

module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};
var locals_ = (locals || {}),members = locals_.members;
// iterate members.models
;(function(){
  var $$obj = members.models;
  if ('number' == typeof $$obj.length) {

    for (var $index = 0, $$l = $$obj.length; $index < $$l; $index++) {
      var member = $$obj[$index];

var role = member.get('role');
if ( role == 'USER' || role == 'READER')
{
buf.push("<li><select" + (jade.attr("data-id", member.id, true, false)) + "><option" + (jade.attr("selected", role=='READER', true, false)) + ">READER</option><option" + (jade.attr("selected", role=='USER', true, false)) + ">USER</option></select><label>" + (jade.escape(null == (jade.interp = member.get('title')) ? "" : jade.interp)) + "</label></li>");
}
    }

  } else {
    var $$l = 0;
    for (var $index in $$obj) {
      $$l++;      var member = $$obj[$index];

var role = member.get('role');
if ( role == 'USER' || role == 'READER')
{
buf.push("<li><select" + (jade.attr("data-id", member.id, true, false)) + "><option" + (jade.attr("selected", role=='READER', true, false)) + ">READER</option><option" + (jade.attr("selected", role=='USER', true, false)) + ">USER</option></select><label>" + (jade.escape(null == (jade.interp = member.get('title')) ? "" : jade.interp)) + "</label></li>");
}
    }

  }
}).call(this);
;return buf.join("");
};
},{"jade/runtime":87}],153:[function(require,module,exports){
var jade = require("jade/runtime");

module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};

buf.push("<div class=\"userroles\"><h3>Change user roles</h3><ul></ul></div><div class=\"userlist\"><h3>Add / remove project members</h3></div><div class=\"adduser\"><h3>Add user to project</h3></div>");;return buf.join("");
};
},{"jade/runtime":87}],154:[function(require,module,exports){
var jade = require("jade/runtime");

module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};
var locals_ = (locals || {}),statistics = locals_.statistics;
buf.push("<h2>Statistics</h2><div class=\"statistics\"><pre>" + (jade.escape(null == (jade.interp = statistics) ? "" : jade.interp)) + "</pre></div>");;return buf.join("");
};
},{"jade/runtime":87}],155:[function(require,module,exports){
var jade = require("jade/runtime");

module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};
var locals_ = (locals || {}),projects = locals_.projects,plural = locals_.plural,user = locals_.user;
buf.push("<div class=\"cell span1 project aligncenter\"><img src=\"/images/logo.elaborate.png\"/><ul class=\"horizontal menu\"><li class=\"thisproject arrowdown\"><span class=\"projecttitle\">" + (jade.escape(null == (jade.interp = projects.current.get('title')) ? "" : jade.interp)) + "</span><ul class=\"vertical menu\"><li class=\"search\">" + (jade.escape(null == (jade.interp = plural + ' overview') ? "" : jade.interp)) + "</li>");
if ( user.get('roleNo') >= 40)
{
buf.push("<li class=\"settings\">Settings</li>");
}
buf.push("<li class=\"statistics\">Statistics</li><li class=\"history\">History</li></ul></li></ul></div><div class=\"cell span1\"><span class=\"message\"></span></div><div class=\"cell span1 user alignright\"><ul class=\"horizontal menu\"><li>Help</li><li class=\"username arrowdown\">" + (jade.escape(null == (jade.interp = user.get('title')) ? "" : jade.interp)) + "<ul class=\"vertical menu\"><li class=\"projects arrowleft\">" + (jade.escape(null == (jade.interp = 'My projects (' + projects.length + ')') ? "" : jade.interp)) + "<ul class=\"vertical menu\">");
// iterate projects.models
;(function(){
  var $$obj = projects.models;
  if ('number' == typeof $$obj.length) {

    for (var $index = 0, $$l = $$obj.length; $index < $$l; $index++) {
      var project = $$obj[$index];

buf.push("<li" + (jade.attr("data-id", project.id, true, false)) + (jade.cls(['project',projects.current==project?'active':''], [null,true])) + ">" + (jade.escape(null == (jade.interp = project.get('title')) ? "" : jade.interp)) + "</li>");
    }

  } else {
    var $$l = 0;
    for (var $index in $$obj) {
      $$l++;      var project = $$obj[$index];

buf.push("<li" + (jade.attr("data-id", project.id, true, false)) + (jade.cls(['project',projects.current==project?'active':''], [null,true])) + ">" + (jade.escape(null == (jade.interp = project.get('title')) ? "" : jade.interp)) + "</li>");
    }

  }
}).call(this);

buf.push("</ul></li><li class=\"logout\">Logout</li></ul></li></ul><img src=\"/images/logo.huygens.png\"/></div>");;return buf.join("");
};
},{"jade/runtime":87}],156:[function(require,module,exports){
var jade = require("jade/runtime");

module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};
var locals_ = (locals || {}),interactive = locals_.interactive;
buf.push("<ul" + (jade.attr("style", interactive?'visibility:visible':'visibility:hidden', true, false)) + " class=\"horizontal menu left\"><li class=\"edit\"><img src=\"/images/icon.edit.png\" title=\"Edit annotation\"/></li><li class=\"delete\"><img src=\"/images/icon.bin.png\" title=\"Delete annotation\"/></li></ul><div class=\"annotation-type\"></div><ul class=\"horizontal menu right\"><li class=\"close\"><img src=\"/images/icon.close.png\" title=\"Close annotation\"/></li></ul><div class=\"tooltip-body\"></div>");;return buf.join("");
};
},{"jade/runtime":87}]},{},[102])