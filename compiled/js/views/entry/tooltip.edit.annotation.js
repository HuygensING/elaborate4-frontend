(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define(function(require) {
    var BaseView, Fn, Templates, Tooltip, _ref;
    Fn = require('helpers/general');
    BaseView = require('views/base');
    Templates = {
      Tooltip: require('text!html/ui/tooltip.html')
    };
    return Tooltip = (function(_super) {
      __extends(Tooltip, _super);

      function Tooltip() {
        _ref = Tooltip.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      Tooltip.prototype.id = "tooltip";

      Tooltip.prototype.initialize = function() {
        Tooltip.__super__.initialize.apply(this, arguments);
        this.container = this.options.container || document.querySelector('body');
        this.boundingBox = Fn.boundingBox(this.container);
        return this.render();
      };

      Tooltip.prototype.render = function() {
        var rtpl;
        rtpl = _.template(Templates.Tooltip);
        this.$el.html(rtpl);
        $('#tooltip').remove();
        return $('body').prepend(this.$el);
      };

      Tooltip.prototype.events = function() {
        return {
          'click .edit': 'editClicked',
          'click .delete': 'deleteClicked',
          'click': 'clicked'
        };
      };

      Tooltip.prototype.editClicked = function(ev) {
        return this.trigger('edit', this.model);
      };

      Tooltip.prototype.deleteClicked = function(ev) {
        return this.trigger('delete', this.model);
      };

      Tooltip.prototype.clicked = function(ev) {
        return this.hide();
      };

      Tooltip.prototype.show = function(args) {
        var $el, contentId;
        $el = args.$el, this.model = args.model;
        contentId = (this.model != null) && (this.model.get('annotationNo') != null) ? this.model.get('annotationNo') : -1;
        if (contentId === +this.el.getAttribute('data-id')) {
          this.hide();
          return false;
        }
        this.el.setAttribute('data-id', contentId);
        if (this.model != null) {
          this.$el.removeClass('newannotation');
          this.$('.body').html(this.model.get('body'));
        } else {
          this.$el.addClass('newannotation');
        }
        this.setPosition($el.offset());
        return this.$el.fadeIn('fast');
      };

      Tooltip.prototype.hide = function() {
        this.el.removeAttribute('data-id');
        return this.el.style.display = 'none';
      };

      Tooltip.prototype.setPosition = function(position) {
        var left, top;
        this.$el.removeClass('tipright tipleft tipbottom');
        left = position.left - this.$el.width() / 2;
        top = position.top + 30;
        if (this.boundingBox.left > left) {
          left = this.boundingBox.left + 10;
          this.$el.addClass('tipleft');
        }
        if (this.boundingBox.right < (left + this.$el.width())) {
          left = this.boundingBox.right - this.$el.width() - 10;
          this.$el.addClass('tipright');
        }
        if (this.boundingBox.bottom < top + this.$el.height()) {
          top = top - 60 - this.$el.height();
          this.$el.addClass('tipbottom');
        }
        this.$el.css('left', left);
        return this.$el.css('top', top);
      };

      Tooltip.prototype.isActive = function() {
        return this.$el.is(':visible');
      };

      return Tooltip;

    })(BaseView);
  });

}).call(this);
