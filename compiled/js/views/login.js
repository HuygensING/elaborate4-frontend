(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define(function(require) {
    var BaseView, Login, Templates, currentUser, _ref;
    BaseView = require('views/base');
    currentUser = require('models/currentUser');
    Templates = {
      'Login': require('text!html/login.html')
    };
    return Login = (function(_super) {
      __extends(Login, _super);

      function Login() {
        _ref = Login.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      Login.prototype.className = 'row span3';

      Login.prototype.events = {
        'click input#submit': 'submit'
      };

      Login.prototype.submit = function(ev) {
        ev.preventDefault();
        return currentUser.login();
      };

      Login.prototype.initialize = function() {
        Login.__super__.initialize.apply(this, arguments);
        return this.render();
      };

      Login.prototype.render = function() {
        var rtpl;
        rtpl = _.template(Templates.Login);
        this.$el.html(rtpl);
        return this;
      };

      return Login;

    })(BaseView);
  });

}).call(this);
