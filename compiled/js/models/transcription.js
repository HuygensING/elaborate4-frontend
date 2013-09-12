(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define(function(require) {
    var Collections, Models, Transcription, config, _ref;
    config = require('config');
    Models = {
      Base: require('models/base')
    };
    Collections = {
      Annotations: require('collections/annotations')
    };
    return Transcription = (function(_super) {
      __extends(Transcription, _super);

      function Transcription() {
        _ref = Transcription.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      Transcription.prototype.defaults = function() {
        return {
          annotations: null,
          textLayer: '',
          title: '',
          body: ''
        };
      };

      Transcription.prototype.parse = function(attrs) {
        var i,
          _this = this;
        attrs.body = attrs.body.trim();
        if (attrs.body.substr(0, 6) === '<body>') {
          attrs.body = attrs.body.substr(6);
        }
        if (attrs.body.substr(-7) === '</body>') {
          attrs.body = attrs.body.slice(0, -7);
        }
        i = 1;
        attrs.body = attrs.body.replace(/<ab id="(.*?)"\/>/g, function(match, p1, offset, string) {
          return '<span data-marker="begin" data-id="' + p1 + '"></span>';
        });
        attrs.body = attrs.body.replace(/<ae id="(.*?)"\/>/g, function(match, p1, offset, string) {
          return '<sup data-marker="end" data-id="' + p1 + '">' + (i++) + '</sup> ';
        });
        attrs.body = attrs.body.replace(/\n/g, '<br>');
        attrs.annotations = new Collections.Annotations([], {
          transcriptionId: attrs.id,
          entryId: this.collection.entryId,
          projectId: this.collection.projectId
        });
        return attrs;
      };

      return Transcription;

    })(Models.Base);
  });

}).call(this);
