(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define(function(require) {
    var EntryMetadata, Fn, Tpl, Views, _ref;
    Fn = require('hilib/functions/general');
    Views = {
      Form: require('hilib/views/form/main')
    };
    Tpl = require('text!html/entry/metadata.html');
    return EntryMetadata = (function(_super) {
      __extends(EntryMetadata, _super);

      function EntryMetadata() {
        _ref = EntryMetadata.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      EntryMetadata.prototype.initialize = function() {
        EntryMetadata.__super__.initialize.apply(this, arguments);
        return this.render();
      };

      EntryMetadata.prototype.render = function() {
        var rtpl;
        rtpl = _.template(Tpl, this.model.toJSON());
        this.$el.html(rtpl);
        return this;
      };

      return EntryMetadata;

    })(Views.Form);
  });

}).call(this);
