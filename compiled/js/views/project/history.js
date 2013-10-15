(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define(function(require) {
    var BaseView, Collections, ProjectHistory, Templates, _ref;
    BaseView = require('views/base');
    Collections = {
      History: require('collections/project/history'),
      projects: require('collections/projects')
    };
    Templates = {
      History: require('text!html/project/history.html')
    };
    return ProjectHistory = (function(_super) {
      __extends(ProjectHistory, _super);

      function ProjectHistory() {
        _ref = ProjectHistory.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      ProjectHistory.prototype.className = 'projecthistory';

      ProjectHistory.prototype.initialize = function() {
        var _this = this;
        ProjectHistory.__super__.initialize.apply(this, arguments);
        return Collections.projects.getCurrent(function(project) {
          _this.collection = new Collections.History([], {
            projectID: project.id
          });
          return _this.collection.fetch({
            success: function() {
              return _this.render();
            }
          });
        });
      };

      ProjectHistory.prototype.render = function() {
        var rtpl;
        rtpl = _.template(Templates.History, {
          logEntries: this.collection.groupBy('dateString')
        });
        this.$el.html(rtpl);
        return this;
      };

      return ProjectHistory;

    })(BaseView);
  });

}).call(this);
