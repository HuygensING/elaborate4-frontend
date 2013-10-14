(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define(function(require) {
    var BaseView, Collections, Header, Models, Templates, _ref;
    BaseView = require('views/base');
    Models = {
      currentUser: require('models/currentUser'),
      state: require('models/state')
    };
    Collections = {
      projects: require('collections/projects')
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
        'click .user .logout': function() {
          return Models.currentUser.logout();
        },
        'click .user .project': 'setProject',
        'click .project .projecttitle': 'navigateToProject',
        'click .project .settings': 'navigateToProjectSettings',
        'click .project .search': 'navigateToProject',
        'click .project .history': 'navigateToProjectHistory'
      };

      Header.prototype.navigateToProject = function(ev) {
        return Backbone.history.navigate("projects/" + (this.project.get('name')), {
          trigger: true
        });
      };

      Header.prototype.navigateToProjectSettings = function(ev) {
        return Backbone.history.navigate("projects/" + (this.project.get('name')) + "/settings", {
          trigger: true
        });
      };

      Header.prototype.navigateToProjectHistory = function(ev) {
        return Backbone.history.navigate("projects/" + (this.project.get('name')) + "/history", {
          trigger: true
        });
      };

      Header.prototype.initialize = function() {
        var _this = this;
        Header.__super__.initialize.apply(this, arguments);
        this.listenTo(Collections.projects, 'current:change', function(project) {
          return _this.render();
        });
        return Collections.projects.getCurrent(function(project) {
          _this.project = project;
        });
      };

      Header.prototype.render = function() {
        var rtpl;
        rtpl = _.template(Templates.Header, {
          projects: Collections.projects,
          user: Models.currentUser.attributes
        });
        this.$el.html(rtpl);
        return this;
      };

      Header.prototype.setProject = function(ev) {
        var id;
        id = ev.currentTarget.getAttribute('data-id');
        return Collections.projects.setCurrent(id);
      };

      return Header;

    })(BaseView);
  });

}).call(this);
