(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define(function(require) {
    var Async, Collections, EntryMetadata, Models, Project, ajax, config, token, _ref;
    ajax = require('hilib/managers/ajax');
    token = require('hilib/managers/token');
    Async = require('hilib/managers/async');
    config = require('config');
    Models = {
      Base: require('models/base')
    };
    EntryMetadata = require('entry.metadata');
    Collections = {
      Entries: require('collections/entries'),
      AnnotationTypes: require('collections/project/annotation.types'),
      ProjectUsers: require('collections/project/users')
    };
    return Project = (function(_super) {
      __extends(Project, _super);

      function Project() {
        _ref = Project.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      Project.prototype.defaults = function() {
        return {
          annotationtypes: null,
          createdOn: '',
          creator: null,
          entries: null,
          entrymetadatafields: [],
          level1: '',
          level2: '',
          level3: '',
          modifiedOn: '',
          modifier: null,
          name: '',
          projectLeaderId: null,
          textLayers: [],
          title: ''
        };
      };

      Project.prototype.parse = function(attrs) {
        attrs.entries = new Collections.Entries([], {
          projectId: attrs.id
        });
        attrs.annotationtypes = new Collections.AnnotationTypes([], {
          projectId: attrs.id
        });
        attrs.entrymetadatafields = new EntryMetadata(attrs.id);
        attrs.users = new Collections.ProjectUsers([], {
          projectId: attrs.id
        });
        return attrs;
      };

      Project.prototype.load = function() {
        var async,
          _this = this;
        async = new Async(['annotationtypes', 'entrymetadatafields', 'users']);
        async.on('ready', function(data) {
          return console.log(data);
        });
        this.get('annotationtypes').fetch({
          success: function(collection) {
            return async.called('annotationtypes', collection);
          }
        });
        this.get('entrymetadatafields').fetch(function(data) {
          return async.called('entrymetadatafields', data);
        });
        return this.get('users').fetch({
          success: function(collection) {
            return async.called('users', collection);
          }
        });
      };

      Project.prototype.fetchEntrymetadatafields = function(cb) {
        var jqXHR,
          _this = this;
        ajax.token = token.get();
        jqXHR = ajax.get({
          url: config.baseUrl + ("projects/" + this.id + "/entrymetadatafields"),
          dataType: 'text'
        });
        jqXHR.done(function(response) {
          _this.set('entrymetadatafields', response);
          return cb();
        });
        return jqXHR.fail(function(a, b, c) {
          console.log(a, b, c);
          return console.error('fetchEntrymetadatafields failed!');
        });
      };

      return Project;

    })(Models.Base);
  });

}).call(this);
