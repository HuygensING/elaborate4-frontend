(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define(function(require) {
    var Base, Views, _ref;
    Base = require('collections/base');
    return Views = (function(_super) {
      __extends(Views, _super);

      function Views() {
        _ref = Views.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      Views.prototype.has = function(view) {
        if (this.get(view.cid)) {
          return true;
        } else {
          return false;
        }
      };

      return Views;

    })(Base);
  });

}).call(this);
