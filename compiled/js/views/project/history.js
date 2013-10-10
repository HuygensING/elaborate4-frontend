(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define(function(require) {
    var BaseView, Collections, Models, ProjectHistory, Templates, ajax, _ref;
    BaseView = require('views/base');
    ajax = require('hilib/managers/ajax');
    Models = {
      state: require('models/state')
    };
    Collections = {
      History: require('collections/project/history')
    };
    Templates = {
      History: require('text!html/project/settings/history.html')
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
        this.collection = new Collections.History();
        return Models.state.getCurrentProject(function(project) {
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
          collection: this.collection
        });
        this.$el.html(rtpl);
        return this;
      };

      return ProjectHistory;

    })(BaseView);
  });

}).call(this);
