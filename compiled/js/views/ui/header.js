(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define(function(require) {
    var BaseView, Header, Models, Templates, _ref;
    BaseView = require('views/base');
    Models = {
      currentUser: require('models/currentUser'),
      state: require('models/state')
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
        'click .project .projecttitle': function() {
          return this.publish('navigate:project');
        },
        'click .project .settings': function() {
          return this.publish('navigate:project:settings');
        },
        'click .project .search': function() {
          return this.publish('navigate:project');
        },
        'click .project .history': function() {
          return this.publish('navigate:project:history');
        }
      };

      Header.prototype.initialize = function() {
        Header.__super__.initialize.apply(this, arguments);
        return this.listenTo(Models.state, 'change:currentProject', this.render);
      };

      Header.prototype.render = function() {
        var rtpl;
        rtpl = _.template(Templates.Header, {
          state: Models.state.attributes,
          user: Models.currentUser.attributes
        });
        this.$el.html(rtpl);
        this.publish('header:render:complete');
        return this;
      };

      Header.prototype.setProject = function(ev) {
        var id;
        id = ev.currentTarget.getAttribute('data-id');
        Models.state.setCurrentProject(id);
        return this.publish('navigate:project');
      };

      return Header;

    })(BaseView);
  });

}).call(this);
