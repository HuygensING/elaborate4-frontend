(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define(function(require) {
    var Fn, Tpl, TranscriptionPreview, Views, _ref;
    Fn = require('hilib/functions/general');
    Views = {
      Base: require('views/base'),
      AddAnnotationTooltip: require('views/entry/preview/annotation.add.tooltip'),
      EditAnnotationTooltip: require('views/entry/preview/annotation.edit.tooltip')
    };
    Tpl = require('text!html/entry/preview.html');
    return TranscriptionPreview = (function(_super) {
      __extends(TranscriptionPreview, _super);

      function TranscriptionPreview() {
        _ref = TranscriptionPreview.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      TranscriptionPreview.prototype.initialize = function() {
        TranscriptionPreview.__super__.initialize.apply(this, arguments);
        this.highlighter = Fn.highlighter();
        this.currentTranscription = this.model.get('transcriptions').current;
        this.addListeners();
        this.render();
        this.renderTooltips();
        this.setHeight();
        return this.onHover();
      };

      TranscriptionPreview.prototype.render = function() {
        var brs, data, rtpl, _ref1;
        data = this.currentTranscription.toJSON();
        brs = (_ref1 = this.currentTranscription.get('body').match(/<br>/g)) != null ? _ref1 : [];
        data.lineCount = brs.length;
        rtpl = _.template(Tpl, data);
        this.$el.html(rtpl);
        return this;
      };

      TranscriptionPreview.prototype.renderTooltips = function() {
        var _this = this;
        this.addAnnotationTooltip = new Views.AddAnnotationTooltip({
          container: this.el
        });
        this.editAnnotationTooltip = new Views.EditAnnotationTooltip({
          container: this.el
        });
        this.listenTo(this.editAnnotationTooltip, 'edit', function(model) {
          return _this.trigger('editAnnotation', model);
        });
        return this.listenTo(this.editAnnotationTooltip, 'delete', function(model) {
          if (model != null) {
            return _this.currentTranscription.get('annotations').remove(model);
          } else {
            return _this.removeNewAnnotationTags();
          }
        });
      };

      TranscriptionPreview.prototype.events = function() {
        return {
          'click sup[data-marker="end"]': 'supClicked',
          'mousedown .preview': 'onMousedown',
          'mouseup .preview': 'onMouseup',
          'scroll': 'onScroll'
        };
      };

      TranscriptionPreview.prototype.onScroll = function(ev) {
        var _this = this;
        return Fn.timeoutWithReset(200, function() {
          return _this.trigger('scrolled', Fn.getScrollPercentage(ev.currentTarget));
        });
      };

      TranscriptionPreview.prototype.supClicked = function(ev) {
        var annotation, id;
        id = ev.currentTarget.getAttribute('data-id') >> 0;
        annotation = this.currentTranscription.get('annotations').findWhere({
          annotationNo: id
        });
        return this.editAnnotationTooltip.show({
          $el: $(ev.currentTarget),
          model: annotation
        });
      };

      TranscriptionPreview.prototype.onMousedown = function(ev) {
        if (ev.target === this.el.querySelector('.preview .body')) {
          this.stopListening(this.addAnnotationTooltip);
          return this.addAnnotationTooltip.hide();
        }
      };

      TranscriptionPreview.prototype.onMouseup = function(ev) {
        var isInsideMarker, range, sel,
          _this = this;
        sel = document.getSelection();
        if (sel.rangeCount === 0 || ev.target.tagName === 'SUP') {
          this.addAnnotationTooltip.hide();
          return false;
        }
        range = sel.getRangeAt(0);
        isInsideMarker = range.startContainer.parentNode.hasAttribute('data-marker') || range.endContainer.parentNode.hasAttribute('data-marker');
        /* console.log range.collapsed, isInsideMarker, @$('[data-id="newannotation"]').length > 0*/

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

      TranscriptionPreview.prototype.addNewAnnotationTags = function(range) {
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
        return this.currentTranscription.set('body', this.$('.preview .body').html(), {
          silent: true
        });
      };

      TranscriptionPreview.prototype.removeNewAnnotationTags = function() {
        this.$('[data-id="newannotation"]').remove();
        this.currentTranscription.set('body', this.$('.preview .body').html(), {
          silent: true
        });
        return this.trigger('newAnnotationRemoved');
      };

      TranscriptionPreview.prototype.onHover = function() {
        var supEnter, supLeave,
          _this = this;
        supEnter = function(ev) {
          var id, startNode;
          id = ev.currentTarget.getAttribute('data-id');
          if (!(startNode = _this.el.querySelector("span[data-id='" + id + "']"))) {
            console.error('No span found');
            return false;
          }
          return _this.highlighter.on({
            startNode: startNode,
            endNode: ev.currentTarget
          });
        };
        supLeave = function(ev) {
          return _this.highlighter.off();
        };
        return this.$('sup[data-marker]').hover(supEnter, supLeave);
      };

      TranscriptionPreview.prototype.setHeight = function() {
        return this.$el.height(document.documentElement.clientHeight - 89 - 78 - 10);
      };

      TranscriptionPreview.prototype.setModel = function(entry) {
        this.model = entry;
        this.currentTranscription = this.model.get('transcriptions').current;
        this.addListeners();
        return this.render();
      };

      TranscriptionPreview.prototype.addListeners = function() {
        this.listenTo(this.currentTranscription, 'current:change', this.render);
        return this.listenTo(this.currentTranscription, 'change:body', this.render);
      };

      return TranscriptionPreview;

    })(Views.Base);
  });

}).call(this);
