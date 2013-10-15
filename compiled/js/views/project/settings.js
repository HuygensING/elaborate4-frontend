(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define(function(require) {
    var Async, Collections, EntryMetadata, Models, ProjectSettings, Templates, Views, ajax, token, _ref;
    Async = require('hilib/managers/async');
    ajax = require('hilib/managers/ajax');
    token = require('hilib/managers/token');
    EntryMetadata = require('entry.metadata');
    Views = {
      Base: require('views/base'),
      SubMenu: require('views/ui/settings.submenu'),
      EditableList: require('hilib/views/form/editablelist/main'),
      ComboList: require('hilib/views/form/combolist/main'),
      Form: require('hilib/views/form/main')
    };
    Models = {
      Statistics: require('models/project/statistics'),
      Settings: require('models/project/settings'),
      User: require('models/user')
    };
    Collections = {
      projects: require('collections/projects'),
      AnnotationTypes: require('collections/project/annotationtypes'),
      ProjectUsers: require('collections/project/users'),
      AllUsers: require('collections/users')
    };
    Templates = {
      Settings: require('text!html/project/settings/main.html'),
      AnnotationTypes: require('text!html/project/settings/metadata_annotations.html'),
      AddUser: require('text!html/project/settings/adduser.html')
    };
    return ProjectSettings = (function(_super) {
      __extends(ProjectSettings, _super);

      function ProjectSettings() {
        _ref = ProjectSettings.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      ProjectSettings.prototype.className = 'projectsettings';

      ProjectSettings.prototype.initialize = function() {
        var _this = this;
        ProjectSettings.__super__.initialize.apply(this, arguments);
        return Collections.projects.getCurrent(function(project) {
          _this.project = project;
          _this.model = new Models.Settings(null, {
            projectID: _this.project.id
          });
          return _this.model.fetch({
            success: function() {
              return _this.render();
            }
          });
        });
      };

      ProjectSettings.prototype.render = function() {
        var rtpl;
        rtpl = _.template(Templates.Settings, {
          settings: this.model.attributes,
          projectMembers: this.project.get('users')
        });
        this.$el.html(rtpl);
        this.renderSubMenu();
        this.renderTabs();
        this.loadStatistics();
        if (this.options.tabName) {
          this.showTab(this.options.tabName);
        }
        return this;
      };

      ProjectSettings.prototype.renderSubMenu = function() {
        var subMenu,
          _this = this;
        subMenu = new Views.SubMenu();
        this.$el.prepend(subMenu.$el);
        return this.listenTo(this.model, 'change', function() {
          return $('input[name="savesettings"]').removeClass('inactive');
        });
      };

      ProjectSettings.prototype.renderTabs = function() {
        var list, rtpl,
          _this = this;
        list = new Views.EditableList({
          value: this.project.get('entrymetadatafields')
        });
        this.listenTo(list, 'change', function(values) {
          return new EntryMetadata(_this.project.id).save(values);
        });
        this.$('div[data-tab="metadata-entries"]').append(list.el);
        rtpl = _.template(Templates.AnnotationTypes, {
          annotationTypes: this.project.get('annotationtypes')
        });
        this.$('div[data-tab="metadata-annotations"]').html(rtpl);
        this.allusers = new Collections.AllUsers();
        return this.allusers.fetch({
          success: function(collection) {
            return _this.renderUserTab(collection);
          }
        });
      };

      ProjectSettings.prototype.renderUserTab = function(collection) {
        var combolist, form,
          _this = this;
        combolist = new Views.ComboList({
          value: this.project.get('users'),
          config: {
            data: collection,
            settings: {
              placeholder: 'Add new member'
            }
          }
        });
        this.listenTo(combolist, 'change', function(userIDs) {
          return console.log(userIDs);
        });
        this.$('div[data-tab="users"] .userlist').append(combolist.el);
        form = new Views.Form({
          Model: Models.User,
          tpl: Templates.AddUser
        });
        this.listenTo(form, 'save:success', function(model, response, options) {
          var jqXHR;
          ajax.token = token.get();
          jqXHR = ajax.put({
            url: "projects/" + (_this.project.get('name')) + "/projectusers/" + model.id,
            dataType: 'text'
          });
          return jqXHR.done(function() {
            return combolist.addSelected(model);
          });
        });
        this.listenTo(form, 'save:error', function(a, b, c) {
          return console.log('erro', a, b, c);
        });
        return this.$('div[data-tab="users"] .adduser').append(form.el);
      };

      ProjectSettings.prototype.events = {
        'click input[name="addannotationtype"]': 'addAnnotationType',
        'click li[data-tab]': 'showTab',
        'change div[data-tab="project"] input': 'updateModel',
        'change div[data-tab="project"] select': 'updateModel',
        'click input[name="savesettings"]': 'saveSettings'
      };

      ProjectSettings.prototype.saveSettings = function(ev) {
        var _this = this;
        ev.preventDefault();
        if (!$(ev.currentTarget).hasClass('inactive')) {
          return this.model.save(null, {
            success: function() {
              return $(ev.currentTarget).addClass('inactive');
            }
          });
        }
      };

      ProjectSettings.prototype.updateModel = function(ev) {
        return this.model.set(ev.currentTarget.getAttribute('data-attr'), ev.currentTarget.value);
      };

      ProjectSettings.prototype.showTab = function(ev) {
        var $ct, index, tabName;
        if (_.isString(ev)) {
          tabName = ev;
        } else {
          $ct = $(ev.currentTarget);
          tabName = $ct.attr('data-tab');
        }
        index = Backbone.history.fragment.indexOf('/settings');
        Backbone.history.navigate(Backbone.history.fragment.substr(0, index) + '/settings/' + tabName);
        this.$(".active[data-tab]").removeClass('active');
        return this.$("[data-tab='" + tabName + "']").addClass('active');
      };

      ProjectSettings.prototype.addAnnotationType = function(ev) {
        ev.preventDefault();
        return console.log('NOT IMPLEMENTED');
      };

      ProjectSettings.prototype.loadStatistics = function() {
        var start, stats,
          _this = this;
        start = new Date().getTime();
        stats = new Models.Statistics(this.project.id);
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
