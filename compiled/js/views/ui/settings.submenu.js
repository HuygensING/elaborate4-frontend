(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define(function(require) {
    var BaseView, SettingsSubMenu, Templates, _ref;
    BaseView = require('views/base');
    Templates = {
      'SubMenu': require('text!html/ui/settings.submenu.html')
    };
    return SettingsSubMenu = (function(_super) {
      __extends(SettingsSubMenu, _super);

      function SettingsSubMenu() {
        _ref = SettingsSubMenu.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      SettingsSubMenu.prototype.events = {
        'click li': 'buttonClicked'
      };

      SettingsSubMenu.prototype.buttonClicked = function(ev) {
        ev.stopPropagation();
        return this.trigger('clicked', {
          key: ev.currentTarget.getAttribute('data-key'),
          value: ev.currentTarget.getAttribute('data-value')
        });
      };

      SettingsSubMenu.prototype.className = 'submenu';

      SettingsSubMenu.prototype.initialize = function() {
        SettingsSubMenu.__super__.initialize.apply(this, arguments);
        return this.render();
      };

      SettingsSubMenu.prototype.render = function() {
        var rtpl;
        rtpl = _.template(Templates.SubMenu, this.options);
        this.$el.html(rtpl);
        return this;
      };

      SettingsSubMenu.prototype.setState = function(itemName, state) {
        var saveButton;
        if (itemName === 'save') {
          saveButton = this.$('[data-key="save"]');
          if (state === 'active') {
            saveButton.removeClass('inactive');
            return saveButton.html('Save');
          } else if (state === 'inactive') {
            saveButton.addClass('inactive');
            return saveButton.html('Saved');
          }
        }
      };

      return SettingsSubMenu;

    })(BaseView);
  });

}).call(this);
