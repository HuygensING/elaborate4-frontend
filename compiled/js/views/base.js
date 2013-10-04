(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define(function(require) {
    var Backbone, BaseView, Pubsub, viewManager, _ref;
    Backbone = require('backbone');
    Pubsub = require('hilib/managers/pubsub');
    viewManager = require('hilib/managers/view');
    return BaseView = (function(_super) {
      __extends(BaseView, _super);

      function BaseView() {
        _ref = BaseView.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      BaseView.prototype.defaults = function() {
        return {
          managed: true
        };
      };

      BaseView.prototype.initialize = function() {
        this.options = _.extend(this.defaults(), this.options);
        if (this.options.managed) {
          viewManager.register(this);
        }
        return _.extend(this, Pubsub);
      };

      BaseView.prototype.destroy = function() {
        return this.remove();
      };

      return BaseView;

    })(Backbone.View);
  });

}).call(this);
