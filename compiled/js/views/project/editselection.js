(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define(function(require) {
    var EditSelection, Templates, Views, ajax, token, _ref;
    ajax = require('hilib/managers/ajax');
    token = require('hilib/managers/token');
    Views = {
      Base: require('views/base')
    };
    Templates = {
      EditSelection: require('text!html/project/editselection.html')
    };
    return EditSelection = (function(_super) {
      __extends(EditSelection, _super);

      function EditSelection() {
        _ref = EditSelection.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      EditSelection.prototype.initialize = function() {
        EditSelection.__super__.initialize.apply(this, arguments);
        return this.render();
      };

      EditSelection.prototype.render = function() {
        var rtpl;
        rtpl = _.template(Templates.EditSelection, this.model.attributes);
        this.$el.html(rtpl);
        return this;
      };

      EditSelection.prototype.events = function() {
        return {
          'click button[name="editselection"]': 'saveEditSelection',
          'keyup input[type="text"]': 'checkInput',
          'change input[type="checkbox"]': 'toggleInactive'
        };
      };

      EditSelection.prototype.checkInput = function(ev) {
        var cb;
        cb = ev.currentTarget.nextSibling;
        cb.checked = ev.currentTarget.value.trim().length > 0;
        return this.toggleInactive();
      };

      EditSelection.prototype.toggleInactive = function() {
        if (this.el.querySelectorAll('input[type=checkbox]:checked').length === 0) {
          return this.$('button[name="editselection"]').addClass('inactive');
        } else {
          return this.$('button[name="editselection"]').removeClass('inactive');
        }
      };

      EditSelection.prototype.saveEditSelection = function(ev) {
        var entryIDs, settings,
          _this = this;
        ev.preventDefault();
        if (!$(ev.currentTarget).hasClass('inactive')) {
          entryIDs = _.map(document.querySelectorAll('.entries input[type="checkbox"]:checked'), function(cb) {
            return parseInt(cb.getAttribute('data-id'), 10);
          });
          settings = {};
          _.each(this.el.querySelectorAll('input[type="checkbox"]:checked'), function(cb) {
            var name;
            name = cb.getAttribute('data-name');
            return settings[name] = _this.el.querySelector("input[name='" + name + "']").value;
          });
          console.log(entryIDs.length);
          if (entryIDs.length > 0) {
            ajax.token = token.get();
            return ajax.put({
              url: "projects/" + this.model.id + "/multipleentrysettings",
              data: JSON.stringify({
                projectEntityIds: entryIDs,
                settings: settings
              })
            });
          }
        }
      };

      return EditSelection;

    })(Views.Base);
  });

}).call(this);
