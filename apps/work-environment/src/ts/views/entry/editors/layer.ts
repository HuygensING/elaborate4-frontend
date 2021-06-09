import Backbone from "backbone"
import { BaseView, SuperTinyEditor, stringFn } from '@elaborate4-frontend/hilib'
import pkg from "../../../../../package.json"

// ## LayerEditor
export default class LayerEditor extends BaseView {
  // ### Initialize
  constructor(private options?) {
    super(options)
    this.render()
  }

  // ### Render
  render() {
    this.subviews.editor = new SuperTinyEditor({
      controls: ['b_save', 'n', 'bold', 'italic', 'underline', 'strikethrough', '|', 'subscript', 'superscript', 'removeFormat', '|', 'diacritics', '|', 'undo', 'redo', '|', 'wordwrap'],
      cssFile: `/css/main-${pkg.version}.css`,
      height: this.options.height,
      html: this.model.get('body'),
      htmlAttribute: 'body',
      model: this.model,
      width: this.options.width,
      wrap: this.options.wordwrap
    })
    this.$el.html(this.subviews.editor.el)

    this.listenTo(this.subviews.editor, 'control:wordwrap', (wrap) => {
      return this.trigger('wrap', wrap);
    })

    this.listenTo(this.subviews.editor, 'button:save', () => {
      return this.model.save(null, {
        success: () => {
          // @ts-ignore
          return this.publish('message', `${this.model.get('textLayer')} layer saved.`)
        }
      });
    });

    this.show()

    return this
  }

  // ### Events
  events() {
    return {}
  }

  // ### Methods
  show(textLayer?) {
    if (this.visible()) {
      this.hide()
    }
    if (textLayer != null) {
      this.model = textLayer
      this.subviews.editor.setModel(this.model)
    }
    this.setURLPath();
    return this.el.style.display = 'block'
  }

  hide() {
    return this.el.style.display = 'none'
  }

  visible() {
    return this.el.style.display === 'block'
  }

  setURLPath() {
    var index, newFragment, newTextLayer, oldFragment, oldTextLayer;
    // @ts-ignore
    oldFragment = Backbone.history.fragment;
    // Cut off '/annotations/*' if it exists.
    index = oldFragment.indexOf('/transcriptions/');
    newFragment = index !== -1 ? oldFragment.substr(0, index) : oldFragment;
    oldTextLayer = oldFragment.substr(index);
    oldTextLayer = oldTextLayer.replace('/transcriptions/', '');
    index = oldTextLayer.indexOf('/');
    if (index !== -1) {
      oldTextLayer = oldTextLayer.substr(0, index);
    }
    newTextLayer = stringFn.slugify(this.model.get('textLayer'));
    // Add the new textLayer to the fragment
    newFragment = newFragment + '/transcriptions/' + newTextLayer;
    // Navigate to the new newFragment.
    return Backbone.history.navigate(newFragment, {
      replace: true
    })
  }

  remove() {
    this.subviews.editor.remove()
    return super.remove()
  }

}
