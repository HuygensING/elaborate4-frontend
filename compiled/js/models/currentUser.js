(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define(function(require) {
    var Collections, CurrentUser, Models, config, token, _ref;
    config = require('config');
    token = require('hilib/managers/token');
    Models = {
      Base: require('models/base')
    };
    Collections = {
      Base: require('collections/base')
    };
    CurrentUser = (function(_super) {
      __extends(CurrentUser, _super);

      function CurrentUser() {
        _ref = CurrentUser.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      CurrentUser.prototype.defaults = function() {
        return {
          rev: null,
          username: null,
          title: null,
          email: null,
          firstName: null,
          lastName: null,
          root: null,
          roleString: null,
          loggedIn: null
        };
      };

      CurrentUser.prototype.initialize = function() {
        CurrentUser.__super__.initialize.apply(this, arguments);
        return this.subscribe('unauthorized', function() {
          return sessionStorage.clear();
        });
      };

      CurrentUser.prototype.authorize = function() {
        var _this = this;
        if (token.get()) {
          return this.fetchUserAttrs(function() {
            return _this.publish('authorized');
          });
        }
      };

      CurrentUser.prototype.login = function(username, password) {
        var _this = this;
        this.set('username', username);
        this.password = password;
        return this.fetchUserAttrs(function() {
          sessionStorage.setItem('huygens_user', JSON.stringify(_this.attributes));
          return _this.publish('authorized');
        });
      };

      CurrentUser.prototype.logout = function(args) {
        var jqXHR;
        jqXHR = $.ajax({
          type: 'post',
          url: config.baseUrl + ("sessions/" + (token.get()) + "/logout")
        });
        jqXHR.done(function() {
          return location.reload();
        });
        return jqXHR.fail(function() {
          return console.error('Logout failed');
        });
      };

      CurrentUser.prototype.fetchUserAttrs = function(cb) {
        var jqXHR, userAttrs,
          _this = this;
        if (userAttrs = sessionStorage.getItem('huygens_user')) {
          this.set(JSON.parse(userAttrs));
          return cb();
        } else {
          jqXHR = $.ajax({
            type: 'post',
            url: config.baseUrl + 'sessions/login',
            data: {
              username: this.get('username'),
              password: this.password
            }
          });
          jqXHR.done(function(data) {
            _this.password = null;
            token.set(data.token);
            _this.set(data.user);
            return cb();
          });
          return jqXHR.fail(function() {
            return _this.publish('unauthorized');
          });
        }
      };

      return CurrentUser;

    })(Models.Base);
    return new CurrentUser();
  });

}).call(this);
