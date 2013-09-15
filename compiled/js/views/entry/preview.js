(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define(function(require) {
    var EntryPreview, Fn, Views, _ref;
    Fn = require('helpers/general');
    Views = {
      Base: require('views/base'),
      AddAnnotationTooltip: require('views/entry/tooltip.add.annotation'),
      EditAnnotationTooltip: require('views/entry/tooltip.edit.annotation')
    };
    return EntryPreview = (function(_super) {
      __extends(EntryPreview, _super);

      function EntryPreview() {
        _ref = EntryPreview.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      EntryPreview.prototype.initialize = function() {
        var _this = this;
        EntryPreview.__super__.initialize.apply(this, arguments);
        this.highlighter = Fn.highlighter();
        this.currentTranscription = this.model.get('transcriptions').current;
        this.listenTo(this.currentTranscription, 'current:change', this.render);
        this.listenTo(this.currentTranscription, 'change:body', function() {
          return _this.render();
        });
        return this.render();
      };

      EntryPreview.prototype.render = function() {
        var _this = this;
        this.$el.html(this.currentTranscription.get('body'));
        this.addAnnotationTooltip = new Views.AddAnnotationTooltip({
          container: this.el
        });
        this.editAnnotationTooltip = new Views.EditAnnotationTooltip({
          container: this.el
        });
        this.listenTo(this.editAnnotationTooltip, 'edit', function(model) {
          return _this.trigger('editAnnotation', model);
        });
        this.listenTo(this.editAnnotationTooltip, 'delete', function(model) {
          if (model != null) {
            return _this.currentTranscription.get('annotations').remove(model);
          } else {
            _this.$('[data-id="newannotation"]').remove();
            return _this.trigger('newAnnotationRemoved');
          }
        });
        this.onHover();
        return this;
      };

      EntryPreview.prototype.events = function() {
        return {
          'click sup[data-marker]': 'supClicked',
          'mousedown': 'onMousedown',
          'mouseup': 'onMouseup',
          'scroll': 'onScroll'
        };
      };

      EntryPreview.prototype.onScroll = function(ev) {
        var _this = this;
        return Fn.timeoutWithReset(200, function() {
          return _this.trigger('scrolled', Fn.getScrollPercentage(ev.currentTarget, 'horizontal'));
        });
      };

      EntryPreview.prototype.supClicked = function(ev) {
        var annotation, id;
        id = ev.currentTarget.getAttribute('data-id') >> 0;
        annotation = this.model.get('transcriptions').current.get('annotations').findWhere({
          annotationNo: id
        });
        return this.editAnnotationTooltip.show({
          $el: $(ev.currentTarget),
          model: annotation
        });
      };

      EntryPreview.prototype.onMousedown = function(ev) {
        if (ev.target === this.el) {
          this.stopListening(this.addAnnotationTooltip);
          return this.addAnnotationTooltip.hide();
        }
      };

      EntryPreview.prototype.onMouseup = function(ev) {
        var isInsideMarker, range, sel,
          _this = this;
        sel = document.getSelection();
        if (sel.rangeCount === 0 || ev.target !== this.el) {
          this.addAnnotationTooltip.hide();
          return false;
        }
        range = sel.getRangeAt(0);
        isInsideMarker = range.startContainer.parentNode.hasAttribute('data-marker') || range.endContainer.parentNode.hasAttribute('data-marker');
        if (!(range.collapsed || isInsideMarker || this.$('[data-id="newannotation"]').length > 0)) {
          this.listenToOnce(this.addAnnotationTooltip, 'clicked', function(model) {
            _this.addNewAnnotationTags(range);
            return _this.trigger('addAnnotation', model);
          });
          return this.addAnnotationTooltip.show({
            left: ev.pageX,
            top: ev.pageY
          });
        }
      };

      EntryPreview.prototype.addNewAnnotationTags = function(range) {
        var span, sup;
        span = document.createElement('span');
        span.setAttribute('data-marker', 'begin');
        span.setAttribute('data-id', 'newannotation');
        range.insertNode(span);
        sup = document.createElement('sup');
        sup.setAttribute('data-marker', 'end');
        sup.setAttribute('data-id', 'newannotation');
        sup.innerHTML = 'new';
        range.collapse(false);
        range.insertNode(sup);
        return this.currentTranscription.set('body', this.$el.html(), {
          silent: true
        });
      };

      EntryPreview.prototype.onHover = function() {
        var supEnter, supLeave,
          _this = this;
        supEnter = function(ev) {
          var id;
          id = ev.currentTarget.getAttribute('data-id');
          return _this.highlighter.on({
            startNode: _this.el.querySelector("span[data-id='" + id + "']"),
            endNode: ev.currentTarget
          });
        };
        supLeave = function(ev) {
          return _this.highlighter.off();
        };
        return this.$('sup[data-marker]').hover(supEnter, supLeave);
      };

      return EntryPreview;

    })(Views.Base);
  });

}).call(this);
