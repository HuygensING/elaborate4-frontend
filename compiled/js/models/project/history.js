(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define(function(require) {
    var Models, ProjectHistory, _ref;
    Models = {
      Base: require('models/base')
    };
    return ProjectHistory = (function(_super) {
      __extends(ProjectHistory, _super);

      function ProjectHistory() {
        _ref = ProjectHistory.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      return ProjectHistory;

    })(Models.Base);
  });

}).call(this);
