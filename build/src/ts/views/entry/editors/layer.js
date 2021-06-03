import Backbone from "backbone";
import StringFn from "hilib/utils/string";
import Base from 'hilib/views/base';
import SuperTinyEditor from 'hilib/views/supertinyeditor/supertinyeditor';
import pkg from "../../../../../package.json";
export default class LayerEditor extends Base {
    options;
    initialize(options = {}) {
        this.options = options;
        super.initialize();
        this.render();
    }
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
        });
        this.$el.html(this.subviews.editor.el);
        this.listenTo(this.subviews.editor, 'control:wordwrap', (wrap) => {
            return this.trigger('wrap', wrap);
        });
        this.listenTo(this.subviews.editor, 'button:save', () => {
            return this.model.save(null, {
                success: () => {
                    return this.publish('message', `${this.model.get('textLayer')} layer saved.`);
                }
            });
        });
        this.show();
        return this;
    }
    events() {
        return {};
    }
    show(textLayer) {
        if (this.visible()) {
            this.hide();
        }
        if (textLayer != null) {
            this.model = textLayer;
            this.subviews.editor.setModel(this.model);
        }
        this.setURLPath();
        return this.el.style.display = 'block';
    }
    hide() {
        return this.el.style.display = 'none';
    }
    visible() {
        return this.el.style.display === 'block';
    }
    setURLPath() {
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
        newFragment = newFragment + '/transcriptions/' + newTextLayer;
        return Backbone.history.navigate(newFragment, {
            replace: true
        });
    }
    remove() {
        this.subviews.editor.remove();
        return super.remove();
    }
}
;
