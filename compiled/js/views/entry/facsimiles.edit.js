(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define(function(require) {
    var EditFacsimiles, Fn, Tpl, Views, _ref;
    Fn = require('helpers2/general');
    Views = {
      Base: require('views/base')
    };
    Tpl = require('text!html/entry/facsimiles.edit.html');
    return EditFacsimiles = (function(_super) {
      __extends(EditFacsimiles, _super);

      function EditFacsimiles() {
        _ref = EditFacsimiles.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      EditFacsimiles.prototype.initialize = function() {
        EditFacsimiles.__super__.initialize.apply(this, arguments);
        this.listenTo(this.collection, 'add', this.render);
        this.listenTo(this.collection, 'remove', this.render);
        return this.render();
      };

      EditFacsimiles.prototype.render = function() {
        var rtpl;
        rtpl = _.template(Tpl, {
          facsimiles: this.collection
        });
        this.$el.html(rtpl);
        return this;
      };

      return EditFacsimiles;

    })(Views.Base);
  });

}).call(this);
