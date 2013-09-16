(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define(function(require) {
    var AddAnnotationTooltip, Annotation, BaseView, Fn, Templates, _ref;
    Fn = require('helpers/general');
    BaseView = require('views/base');
    Annotation = require('models/annotation');
    Templates = {
      Tooltip: require('text!html/entry/tooltip.add.annotation.html')
    };
    return AddAnnotationTooltip = (function(_super) {
      __extends(AddAnnotationTooltip, _super);

      function AddAnnotationTooltip() {
        _ref = AddAnnotationTooltip.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      AddAnnotationTooltip.prototype.id = 'addannotationtooltip';

      AddAnnotationTooltip.prototype.className = "tooltip addannotation";

      AddAnnotationTooltip.prototype.events = function() {
        return {
          'click button': 'buttonClicked'
        };
      };

      AddAnnotationTooltip.prototype.buttonClicked = function(ev) {
        this.hide();
        return this.trigger('clicked', new Annotation());
      };

      AddAnnotationTooltip.prototype.initialize = function() {
        AddAnnotationTooltip.__super__.initialize.apply(this, arguments);
        this.container = this.options.container || document.querySelector('body');
        this.boundingBox = Fn.boundingBox(this.container);
        return this.render();
      };

      AddAnnotationTooltip.prototype.render = function() {
        var rtpl;
        rtpl = _.template(Templates.Tooltip, {});
        this.$el.html(rtpl);
        $('#addannotationtooltip').remove();
        $('body').prepend(this.$el);
        return this;
      };

      AddAnnotationTooltip.prototype.show = function(position) {
        this.setPosition(position);
        return this.$el.fadeIn('fast');
      };

      AddAnnotationTooltip.prototype.hide = function() {
        return this.el.style.display = 'none';
      };

      AddAnnotationTooltip.prototype.setPosition = function(position) {
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

      AddAnnotationTooltip.prototype.isActive = function() {
        return this.$el.is(':visible');
      };

      return AddAnnotationTooltip;

    })(BaseView);
  });

}).call(this);
