(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define(function(require) {
    var Collections, Users, config, _ref;
    config = require('config');
    Collections = {
      Base: require('collections/base')
    };
    return Users = (function(_super) {
      __extends(Users, _super);

      function Users() {
        _ref = Users.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      Users.prototype.url = function() {
        return "" + config.baseUrl + "users";
      };

      return Users;

    })(Collections.Base);
  });

}).call(this);
