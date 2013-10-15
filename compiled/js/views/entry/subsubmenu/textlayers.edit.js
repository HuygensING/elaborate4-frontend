(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define(function(require) {
    var EditTextlayers, Fn, Tpl, Views, _ref;
    Fn = require('hilib/functions/general');
    Views = {
      Base: require('views/base')
    };
    Tpl = require('text!html/entry/subsubmenu/textlayers.edit.html');
    return EditTextlayers = (function(_super) {
      __extends(EditTextlayers, _super);

      function EditTextlayers() {
        _ref = EditTextlayers.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      EditTextlayers.prototype.initialize = function() {
        EditTextlayers.__super__.initialize.apply(this, arguments);
        this.listenTo(this.collection, 'add', this.render);
        this.listenTo(this.collection, 'remove', this.render);
        return this.render();
      };

      EditTextlayers.prototype.render = function() {
        var rtpl;
        rtpl = _.template(Tpl, {
          transcriptions: this.collection
        });
        this.$el.html(rtpl);
        return this;
      };

      EditTextlayers.prototype.events = function() {
        var _this = this;
        return {
          'click button.addtextlayer': 'addtextlayer',
          'click ul.textlayers li': function(ev) {
            return $(ev.currentTarget).addClass('destroy');
          },
          'click ul.textlayers li.destroy .orcancel': 'cancelRemove',
          'click ul.textlayers li.destroy .name': 'destroytextlayer'
        };
      };

      EditTextlayers.prototype.cancelRemove = function(ev) {
        var parentLi;
        ev.stopPropagation();
        parentLi = $(ev.currentTarget).parents('li');
        return parentLi.removeClass('destroy');
      };

      EditTextlayers.prototype.destroytextlayer = function(ev) {
        var textlayer, transcriptionID;
        transcriptionID = $(ev.currentTarget).parents('li').attr('data-id');
        textlayer = this.collection.get(transcriptionID);
        return this.collection.remove(textlayer);
      };

      EditTextlayers.prototype.addtextlayer = function() {
        var data, name, text;
        name = this.el.querySelector('input[name="name"]').value;
        text = this.el.querySelector('textarea[name="text"]').value;
        if (name !== '') {
          data = {
            textLayer: name,
            body: text
          };
          return this.collection.create(data, {
            wait: true
          });
        }
      };

      return EditTextlayers;

    })(Views.Base);
  });

}).call(this);
