(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define(function(require) {
    var Models, User, _ref;
    Models = {
      Base: require('models/base')
    };
    return User = (function(_super) {
      __extends(User, _super);

      function User() {
        _ref = User.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      User.prototype.defaults = function() {
        return {
          username: '',
          email: '',
          firstName: '',
          lastName: '',
          role: 'User',
          password: ''
        };
      };

      return User;

    })(Models.Base);
  });

}).call(this);
