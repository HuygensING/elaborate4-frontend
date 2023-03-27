import Backbone from "backbone"
import { Modal, Form, SuperTinyEditor, BaseView } from '@elaborate4-frontend/hilib'
import projects from '../../../collections/projects'

import tpl from "../../../../jade/entry/annotation.metadata.jade"
import { Annotation } from "../../../models/annotation"

  // ## AnnotationEditor
export default class AnnotationEditor extends BaseView {
  project
  publish
  declare model: Annotation

  // ### Initialize
  constructor(private options?) {
    super(options)

    projects.getCurrent((project) => {
      this.project = project
      this.render()
    })
  }

  // ### Render
  render() {
    this.subviews.editor = new SuperTinyEditor({
      cssFile: '/css/main.css',
      controls: ['b_save', 'b_cancel', 'b_metadata', 'n', 'n', 'bold', 'italic', 'underline', 'strikethrough', '|', 'subscript', 'superscript', 'removeFormat', '|', 'diacritics', '|', 'undo', 'redo'],
      height: this.options.height,
      html: this.model.get('body'),
      htmlAttribute: 'body',
      model: this.model,
      width: this.options.width,
      wrap: true
    } as any);
    this.$el.html(this.subviews.editor.el);
    this.listenTo(this.subviews.editor, 'button:save', this.save);
    this.listenTo(this.subviews.editor, 'button:cancel', () => {
      return this.trigger('cancel');
    });
    this.listenTo(this.subviews.editor, 'button:metadata', this.editMetadata);
    this.show();
    return this;
  }

  // ### Events
  events() { return {} }

  // ### Methods
  show(annotation?) {
    if (this.visible()) {
      this.hide();
    }
    if (annotation != null) {
      this.model = annotation;
      this.subviews.editor.setModel(this.model);
    }
    this.subviews.editor.$('.ste-header:nth-child(2)').addClass('annotationtext').html(this.model.get('annotatedText'));
    this.setURLPath(this.model.id);
    return this.el.style.display = 'block';
  }

  hide() {
    this.el.style.display = 'none';
    return this.trigger('hide', this.model.get('annotationNo'));
  }

  visible() {
    return this.el.style.display === 'block';
  }

  setURLPath(id) {
    var fragment, index;
    // Cut off '/annotations/*' if it exists.
    // @ts-ignore
    index = Backbone.history.fragment.indexOf('/annotations/');
    // @ts-ignore
    fragment = index !== -1 ? Backbone.history.fragment.substr(0, index) : Backbone.history.fragment;
    if (id != null) {
      
      // If id exists add it to the fragment if not, we are dealing with a new annotation.
      fragment = fragment + '/annotations/' + id;
    }
    // Navigate to the new fragement.
    return Backbone.history.navigate(fragment, {
      replace: true
    });
  }

  save(done = function() {}) {
    if (this.model.isNew()) {
      return this.model.save([], {
        success: (model) => {
          this.setURLPath(model.id);
          this.publish('message', `Annotation ${this.model.get('annotationNo')} saved.`);
          this.trigger('newannotation:saved', model);
          return done();
        },
        error: (model, xhr, options) => {
          return console.error('Saving annotation failed!', model, xhr, options);
        }
      });
    } else {
      return this.model.save([], {
        success: (model) => {
          this.setURLPath(model.id);
          this.publish('message', `Annotation ${this.model.get('annotationNo')} saved.`);
          return done();
        }
      });
    }
  }

  editMetadata() {
    if (this.subviews.annotationMetadata != null) {
      this.subviews.annotationMetadata.destroy();
    }
    this.subviews.annotationMetadata = new Form({
      tpl: tpl,
      model: this.model.clone(),
      collection: this.project.get('annotationtypes')
    });
    this.subviews.annotationMetadata.model.on('change:metadata:type', (annotationTypeID) => {
      this.subviews.annotationMetadata.model.set('metadata', {});
      this.subviews.annotationMetadata.model.set('annotationType', this.project.get('annotationtypes').get(annotationTypeID).attributes);
      return this.subviews.annotationMetadata.render();
    });
    if (this.subviews.modal != null) {
      this.subviews.modal.destroy();
    }
    this.subviews.modal = new Modal({
      title: "Edit annotation metadata",
      html: this.subviews.annotationMetadata.el,
      submitValue: 'Save metadata',
      width: '300px'
    } as any);
    return this.subviews.modal.on('submit', () => {
      this.model.updateFromClone(this.subviews.annotationMetadata.model);
      return this.save(() => {
        this.publish('message', `Saved metadata for annotation: ${this.model.get('annotationNo')}.`);
        return this.subviews.modal.close();
      });
    });
  }

};
