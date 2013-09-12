(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define(function(require) {
    var Facsimile, Models, config, _ref;
    config = require('config');
    Models = {
      Base: require('models/base')
    };
    return Facsimile = (function(_super) {
      __extends(Facsimile, _super);

      function Facsimile() {
        _ref = Facsimile.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      return Facsimile;

    })(Models.Base);
  });

}).call(this);
