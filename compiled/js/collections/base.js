(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define(function(require) {
    var Backbone, Base, Pubsub, token, _ref;
    Backbone = require('backbone');
    token = require('managers/token');
    Pubsub = require('managers/pubsub');
    return Base = (function(_super) {
      __extends(Base, _super);

      function Base() {
        _ref = Base.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      Base.prototype.token = null;

      Base.prototype.initialize = function() {
        return _.extend(this, Pubsub);
      };

      Base.prototype.sync = function(method, model, options) {
        var _this = this;
        options.beforeSend = function(xhr) {
          return xhr.setRequestHeader('Authorization', "SimpleAuth " + (token.get()));
        };
        return Base.__super__.sync.call(this, method, model, options);
      };

      return Base;

    })(Backbone.Collection);
  });

}).call(this);
