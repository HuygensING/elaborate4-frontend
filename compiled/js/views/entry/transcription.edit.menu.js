(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define(function(require) {
    var Fn, Tpl, TranscriptionEditMenu, Views, _ref;
    Fn = require('helpers/general');
    Views = {
      Base: require('views/base')
    };
    Tpl = require('text!html/entry/transcription.edit.menu.html');
    return TranscriptionEditMenu = (function(_super) {
      __extends(TranscriptionEditMenu, _super);

      function TranscriptionEditMenu() {
        _ref = TranscriptionEditMenu.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      TranscriptionEditMenu.prototype.className = 'transcriptioneditmenu';

      TranscriptionEditMenu.prototype.initialize = function() {
        TranscriptionEditMenu.__super__.initialize.apply(this, arguments);
        this.addListeners();
        return this.render();
      };

      TranscriptionEditMenu.prototype.render = function() {
        var rtpl;
        rtpl = _.template(Tpl, this.model.toJSON());
        this.$el.html(rtpl);
        return this;
      };

      TranscriptionEditMenu.prototype.events = function() {
        return {
          'click button.ok': 'save'
        };
      };

      TranscriptionEditMenu.prototype.save = function() {
        return this.model.save();
      };

      TranscriptionEditMenu.prototype.setModel = function(transcription) {
        this.model = transcription;
        return this.addListeners();
      };

      TranscriptionEditMenu.prototype.addListeners = function() {
        var _this = this;
        this.listenTo(this.model, 'sync', function() {
          return _this.el.querySelector('button.ok').disabled = true;
        });
        return this.listenTo(this.model, 'change:body', function() {
          return _this.el.querySelector('button.ok').disabled = false;
        });
      };

      return TranscriptionEditMenu;

    })(Views.Base);
  });

}).call(this);
