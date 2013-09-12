(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define(function(require) {
    var BaseView, Header, Models, Templates, Views, _ref;
    BaseView = require('views/base');
    Models = {
      currentUser: require('models/currentUser'),
      state: require('models/state')
    };
    Views = {
      ProjectNav: require('views/ui/nav.project'),
      UserNav: require('views/ui/nav.user')
    };
    Templates = {
      Header: require('text!html/ui/header.html')
    };
    return Header = (function(_super) {
      __extends(Header, _super);

      function Header() {
        _ref = Header.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      Header.prototype.tagName = 'header';

      Header.prototype.className = 'main';

      Header.prototype.events = {
        'click .projecttitle': function() {
          return this.publish('navigate:project');
        }
      };

      Header.prototype.initialize = function() {
        Header.__super__.initialize.apply(this, arguments);
        this.listenTo(Models.state, 'change:currentProject', this.render);
        return this.subscribe('header:renderSubmenu', this.renderSubmenu);
      };

      Header.prototype.renderSubmenu = function(menus) {
        this.$('.sub .left').html(menus.left);
        this.$('.sub .center').html(menus.center);
        return this.$('.sub .right').html(menus.right);
      };

      Header.prototype.render = function() {
        var projectNav, rtpl, userNav;
        rtpl = _.template(Templates.Header, {
          state: Models.state.attributes
        });
        this.$el.html(rtpl);
        projectNav = new Views.ProjectNav({
          managed: false
        });
        userNav = new Views.UserNav({
          managed: false
        });
        this.$('nav.project').html(projectNav.$el);
        this.$('nav.user').html(userNav.$el);
        this.publish('header:render:complete');
        return this;
      };

      return Header;

    })(BaseView);
  });

}).call(this);
