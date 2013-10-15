(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define(function(require) {
    var BaseView, Collections, Fn, Header, Models, Templates, ajax, config, token, _ref;
    BaseView = require('views/base');
    config = require('config');
    Fn = require('hilib/functions/general');
    ajax = require('hilib/managers/ajax');
    token = require('hilib/managers/token');
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

      Header.prototype.initialize = function() {
        var _this = this;
        Header.__super__.initialize.apply(this, arguments);
        this.listenTo(Collections.projects, 'current:change', function(project) {
          return _this.render();
        });
        Collections.projects.getCurrent(function(project) {
          _this.project = project;
        });
        return this.subscribe('message', this.showMessage, this);
      };

      Header.prototype.events = {
        'click .user .logout': function() {
          return Models.currentUser.logout();
        },
        'click .user .project': 'setProject',
        'click .project .projecttitle': 'navigateToProject',
        'click .project .settings': 'navigateToProjectSettings',
        'click .project .search': 'navigateToProject',
        'click .project .history': 'navigateToProjectHistory',
        'click .project .publish': 'publishProject',
        'click .message': function() {
          return this.$('.message').removeClass('active');
        }
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

      Header.prototype.publishProject = function(ev) {
        var jqXHR,
          _this = this;
        ajax.token = token.get();
        jqXHR = ajax.post({
          url: config.baseUrl + ("projects/" + this.project.id + "/publication"),
          dataType: 'text'
        });
        jqXHR.done(function() {
          return ajax.poll(jqXHR.getResponseHeader('Location'), function(data) {
            return data.done;
          });
        });
        return jqXHR.fail(function() {
          return console.log(arguments);
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

      Header.prototype.showMessage = function(msg) {
        var $message,
          _this = this;
        if (msg.trim().length === 0) {
          return false;
        }
        $message = this.$('.message');
        if (!$message.hasClass('active')) {
          $message.addClass('active');
        }
        $message.html(msg);
        return Fn.timeoutWithReset(5000, (function() {
          return $message.removeClass('active');
        }), function() {
          $message.addClass('pulse');
          return setTimeout((function() {
            return $message.removeClass('pulse');
          }), 1000);
        });
      };

      return Header;

    })(BaseView);
  });

}).call(this);
