(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define(function(require) {
    var BaseView, SubMenu, Templates, _ref;
    BaseView = require('views/base');
    Templates = {
      'SubMenu': require('text!html/ui/entry.submenu.html')
    };
    return SubMenu = (function(_super) {
      __extends(SubMenu, _super);

      function SubMenu() {
        _ref = SubMenu.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      SubMenu.prototype.events = {
        'click li': 'buttonClicked'
      };

      SubMenu.prototype.buttonClicked = function(ev) {
        ev.stopPropagation();
        return this.trigger('clicked', {
          key: ev.currentTarget.getAttribute('data-key'),
          value: ev.currentTarget.getAttribute('data-value')
        });
      };

      SubMenu.prototype.className = 'submenu';

      SubMenu.prototype.initialize = function() {
        SubMenu.__super__.initialize.apply(this, arguments);
        return this.render();
      };

      SubMenu.prototype.render = function() {
        var rtpl;
        rtpl = _.template(Templates.SubMenu, this.options);
        this.$el.html(rtpl);
        return this;
      };

      return SubMenu;

    })(BaseView);
  });

}).call(this);
