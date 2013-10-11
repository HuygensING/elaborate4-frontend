(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define(function(require) {
    var LayerEditor, StringFn, Views, _ref;
    StringFn = require('hilib/functions/string');
    Views = {
      Base: require('views/base'),
      SuperTinyEditor: require('hilib/views/supertinyeditor/supertinyeditor')
    };
    return LayerEditor = (function(_super) {
      __extends(LayerEditor, _super);

      function LayerEditor() {
        _ref = LayerEditor.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      LayerEditor.prototype.className = '';

      LayerEditor.prototype.initialize = function() {
        LayerEditor.__super__.initialize.apply(this, arguments);
        return this.render();
      };

      LayerEditor.prototype.render = function() {
        var $el,
          _this = this;
        $el = this.$('.transcription-placeholder');
        this.editor = new Views.SuperTinyEditor({
          controls: ['b_save', 'n', 'bold', 'italic', 'underline', 'strikethrough', '|', 'subscript', 'superscript', 'unformat', '|', 'undo', 'redo'],
          cssFile: '/css/main.css',
          el: this.$('.transcription-editor'),
          height: this.options.height,
          html: this.model.get('body'),
          htmlAttribute: 'body',
          model: this.model,
          width: $el.width() - 20
        });
        this.listenTo(this.editor, 'save', function() {
          return _this.model.save();
        });
        this.show();
        return this;
      };

      LayerEditor.prototype.events = function() {};

      LayerEditor.prototype.show = function(layer) {
        if (layer != null) {
          this.model = layer;
        }
        this.editor.setModel(this.model);
        this.setURLPath();
        return this.el.style.display = 'block';
      };

      LayerEditor.prototype.hide = function() {
        return this.el.style.display = 'none';
      };

      LayerEditor.prototype.setURLPath = function() {
        var index, newFragment, newTextLayer, oldFragment, oldTextLayer;
        oldFragment = Backbone.history.fragment;
        index = oldFragment.indexOf('/transcriptions/');
        newFragment = index !== -1 ? oldFragment.substr(0, index) : oldFragment;
        oldTextLayer = oldFragment.substr(index);
        oldTextLayer = oldTextLayer.replace('/transcriptions/', '');
        index = oldTextLayer.indexOf('/');
        if (index !== -1) {
          oldTextLayer = oldTextLayer.substr(0, index);
        }
        newTextLayer = StringFn.slugify(this.model.get('textLayer'));
        if (oldTextLayer !== newTextLayer) {
          newFragment = newFragment + '/transcriptions/' + newTextLayer;
          return Backbone.history.navigate(newFragment, {
            replace: true
          });
        }
      };

      return LayerEditor;

    })(Views.Base);
  });

}).call(this);
