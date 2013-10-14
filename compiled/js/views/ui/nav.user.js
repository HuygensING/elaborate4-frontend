(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define(function(require) {
    var BaseView, Collections, Models, NavUser, Templates, _ref;
    BaseView = require('views/base');
    Models = {
      currentUser: require('models/currentUser')
    };
    Collections = {
      projects: require('collections/projects')
    };
    Templates = {
      'UserNav': require('text!html/ui/nav.user.html')
    };
    return NavUser = (function(_super) {
      __extends(NavUser, _super);

      function NavUser() {
        _ref = NavUser.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      NavUser.prototype.events = {
        'click .logout': 'logout',
        'click .project': 'selectProject'
      };

      NavUser.prototype.selectProject = function(ev) {
        var $ct, id;
        $ct = $(ev.currentTarget);
        $ct.addClass('active');
        id = $ct.attr('data-id');
        return Collections.projects.setCurrent(id);
      };

      NavUser.prototype.logout = function(ev) {
        return Models.currentUser.logout();
      };

      NavUser.prototype.initialize = function() {
        NavUser.__super__.initialize.apply(this, arguments);
        return this.render();
      };

      NavUser.prototype.render = function() {
        var rtpl;
        rtpl = _.template(Templates.UserNav, {
          user: Models.currentUser.attributes,
          projects: Collections.projects
        });
        this.$el.html(rtpl);
        return this;
      };

      return NavUser;

    })(BaseView);
  });

}).call(this);
