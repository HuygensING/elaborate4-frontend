(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define(function(require) {
    var Debug, Models, Templates, Views, _ref;
    Models = {
      state: require('models/state'),
      currentUser: require('models/currentUser')
    };
    Views = {
      Base: require('views/base')
    };
    Templates = {
      Debug: require('text!html/debug.html')
    };
    return Debug = (function(_super) {
      __extends(Debug, _super);

      function Debug() {
        _ref = Debug.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      Debug.prototype.id = 'debug';

      Debug.prototype.events = {
        'click .current-project': function() {
          return Models.state.getCurrentProject(function(project) {
            return console.log(project);
          });
        },
        'click .current-user': function() {
          return console.log(Models.currentUser);
        },
        'click .state': function() {
          return console.log(Models.state);
        }
      };

      Debug.prototype.initialize = function() {
        Debug.__super__.initialize.apply(this, arguments);
        return this.render();
      };

      Debug.prototype.render = function() {
        var rtpl;
        rtpl = _.template(Templates.Debug);
        this.$el.html(rtpl);
        return this;
      };

      return Debug;

    })(Views.Base);
  });

}).call(this);
