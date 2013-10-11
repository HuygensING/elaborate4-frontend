(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define(function(require) {
    var AnnotationEditor, Views, _ref;
    Views = {
      Base: require('views/base'),
      SuperTinyEditor: require('hilib/views/supertinyeditor/supertinyeditor')
    };
    return AnnotationEditor = (function(_super) {
      __extends(AnnotationEditor, _super);

      function AnnotationEditor() {
        _ref = AnnotationEditor.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      AnnotationEditor.prototype.className = '';

      AnnotationEditor.prototype.initialize = function() {
        AnnotationEditor.__super__.initialize.apply(this, arguments);
        return this.render();
      };

      AnnotationEditor.prototype.render = function() {
        var _this = this;
        this.editor = new Views.SuperTinyEditor({
          cssFile: '/css/main.css',
          controls: ['b_save', 'b_cancel', 'b_metadata', 'n', 'n', 'bold', 'italic', 'underline', 'strikethrough', '|', 'subscript', 'superscript', 'unformat', '|', 'undo', 'redo'],
          el: this.$('.annotation-editor'),
          height: this.options.height,
          html: this.model.get('body'),
          htmlAttribute: 'body',
          model: this.model,
          width: this.options.width,
          wrap: true
        });
        this.listenTo(this.editor, 'save', this.save);
        this.listenTo(this.editor, 'cancel', function() {
          return _this.trigger('cancel');
        });
        this.listenTo(this.editor, 'metadata', this.editMetadata);
        this.show();
        return this;
      };

      AnnotationEditor.prototype.events = function() {};

      AnnotationEditor.prototype.show = function(annotation) {
        if (annotation != null) {
          this.model = annotation;
        }
        this.editor.setModel(this.model);
        this.editor.$('.ste-header:nth-child(2)').addClass('annotationtext').html(this.model.get('annotatedText'));
        this.setURLPath(this.model.id);
        return this.el.style.display = 'block';
      };

      AnnotationEditor.prototype.hide = function() {
        return this.el.style.display = 'none';
      };

      AnnotationEditor.prototype.setURLPath = function(id) {
        var fragment, index;
        index = Backbone.history.fragment.indexOf('/annotations/');
        fragment = index !== -1 ? Backbone.history.fragment.substr(0, index) : Backbone.history.fragment;
        if (id != null) {
          fragment = fragment + '/annotations/' + id;
        }
        return Backbone.history.navigate(fragment, {
          replace: true
        });
      };

      AnnotationEditor.prototype.save = function() {
        var _this = this;
        if (this.model.isNew()) {
          return this.model.save([], {
            success: function(model) {
              return _this.trigger('newannotation:saved', model);
            },
            error: function(model, xhr, options) {
              return console.error('Saving annotation failed!', model, xhr, options);
            }
          });
        } else {
          return this.model.save();
        }
      };

      AnnotationEditor.prototype.editMetadata = function() {
        return this.annotationMetadata = new Views.AnnotationMetadata({
          model: model,
          collection: this.project.get('annotationtypes'),
          el: this.el.querySelector('.container .middle .annotationmetadata')
        });
      };

      return AnnotationEditor;

    })(Views.Base);
  });

}).call(this);
