(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define(function(require) {
    var BaseView, ProjectNav, Templates, _ref;
    BaseView = require('views/base');
    Templates = {
      'ProjectNav': require('text!html/ui/nav.project.html')
    };
    return ProjectNav = (function(_super) {
      __extends(ProjectNav, _super);

      function ProjectNav() {
        _ref = ProjectNav.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      ProjectNav.prototype.events = {
        'click .settings': function() {
          return this.publish('navigate:project:settings');
        },
        'click .search': function() {
          return this.publish('navigate:project');
        },
        'click .history': function() {
          return this.publish('navigate:project:history');
        }
      };

      ProjectNav.prototype.initialize = function() {
        ProjectNav.__super__.initialize.apply(this, arguments);
        return this.render();
      };

      ProjectNav.prototype.render = function() {
        var rtpl;
        rtpl = _.template(Templates.ProjectNav, {
          state: this.options.state
        });
        this.$el.html(rtpl);
        return this;
      };

      return ProjectNav;

    })(BaseView);
  });

}).call(this);
