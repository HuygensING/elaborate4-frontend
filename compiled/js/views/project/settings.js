(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define(function(require) {
    var Async, Collections, Models, ProjectSettings, Templates, Views, _ref;
    Async = require('managers2/async');
    Views = {
      Base: require('views/base'),
      SubMenu: require('views/ui/settings.submenu')
    };
    Models = {
      Statistics: require('models/project/statistics'),
      Settings: require('models/project/settings'),
      state: require('models/state')
    };
    Collections = {
      Entries: require('collections/project/metadata_entries'),
      Annotations: require('collections/project/metadata_annotations'),
      ProjectUsers: require('collections/project/users'),
      AllUsers: require('collections/users')
    };
    Templates = {
      Settings: require('text!html/project/settings.html'),
      Entries: require('text!html/project/metadata_entries.html'),
      Annotations: require('text!html/project/metadata_annotations.html'),
      Users: require('text!html/project/users.html')
    };
    return ProjectSettings = (function(_super) {
      __extends(ProjectSettings, _super);

      function ProjectSettings() {
        _ref = ProjectSettings.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      ProjectSettings.prototype.className = 'projectsettings';

      ProjectSettings.prototype.events = {
        'click li[data-tab]': 'showTab',
        'change div[data-tab] input': function(ev) {
          return this.model.set(ev.currentTarget.getAttribute('data-attr'), ev.currentTarget.value);
        }
      };

      ProjectSettings.prototype.showTab = function(ev) {
        var $ct, tabName;
        $ct = $(ev.currentTarget);
        tabName = $ct.attr('data-tab');
        this.$(".active[data-tab]").removeClass('active');
        return this.$("[data-tab='" + tabName + "']").addClass('active');
      };

      ProjectSettings.prototype.initialize = function() {
        var _this = this;
        ProjectSettings.__super__.initialize.apply(this, arguments);
        this.model = new Models.Settings();
        return Models.state.getCurrentProject(function(project) {
          _this.project = project;
          return _this.model.fetch({
            success: function(model) {
              return _this.render();
            },
            error: function() {
              return console.log('Error fetching settings');
            }
          });
        });
      };

      ProjectSettings.prototype.render = function() {
        var rtpl;
        rtpl = _.template(Templates.Settings, {
          settings: this.model.attributes
        });
        this.$el.html(rtpl);
        this.renderSubMenu();
        this.loadTabData();
        this.loadStatistics();
        return this;
      };

      ProjectSettings.prototype.renderSubMenu = function() {
        var subMenu,
          _this = this;
        subMenu = new Views.SubMenu();
        this.$el.prepend(subMenu.$el);
        this.listenTo(this.model, 'change', function() {
          return subMenu.setState('save', 'active');
        });
        return this.listenTo(subMenu, 'clicked', function(menuItem) {
          if (menuItem.key === 'save') {
            _this.model.save();
            return subMenu.setState('save', 'inactive');
          }
        });
      };

      ProjectSettings.prototype.loadTabData = function() {
        var async,
          _this = this;
        this.entries = new Collections.Entries();
        this.entries.fetch(function(data) {
          var rtpl;
          console.log(data);
          rtpl = _.template(Templates.Entries, {
            entries: data
          });
          return _this.$('div[data-tab="metadata-entries"]').html(rtpl);
        });
        this.annotations = new Collections.Annotations();
        this.annotations.fetch({
          success: function(collection, value, options) {
            var rtpl;
            rtpl = _.template(Templates.Annotations, {
              annotations: collection
            });
            return _this.$('div[data-tab="metadata-annotations"]').html(rtpl);
          },
          error: function() {}
        });
        async = new Async(['projectusers', 'allusers']);
        this.projectusers = new Collections.ProjectUsers();
        this.projectusers.fetch({
          success: function(collection, value, options) {
            return async.called('projectusers', collection);
          },
          error: function() {}
        });
        this.allusers = new Collections.AllUsers();
        this.allusers.fetch({
          success: function(collection, value, options) {
            return async.called('allusers', collection);
          },
          error: function() {}
        });
        return async.on('ready', function(data) {
          var rtpl;
          rtpl = _.template(Templates.Users, data);
          return _this.$('div[data-tab="users"]').html(rtpl);
        });
      };

      ProjectSettings.prototype.loadStatistics = function() {
        var start, stats,
          _this = this;
        start = new Date().getTime();
        stats = new Models.Statistics();
        return stats.fetch(function(data) {
          var delta, end, remaining, str;
          str = JSON.stringify(data, null, 4);
          str = str.replace(/{/g, '');
          str = str.replace(/}/g, '');
          str = str.replace(/\"/g, '');
          str = str.replace(/,/g, '');
          end = new Date().getTime();
          delta = end - start;
          if (delta < 1000) {
            remaining = 1000 - delta;
            return setTimeout((function() {
              _this.$('img.loader').css('visibility', 'hidden');
              return _this.$('.statistics').html(str);
            }), remaining);
          }
        });
      };

      return ProjectSettings;

    })(Views.Base);
  });

}).call(this);
