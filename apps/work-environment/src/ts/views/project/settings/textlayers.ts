import { className, BaseView, EditableList } from "@elaborate4-frontend/hilib"
import tpl from "../../../../jade/project/settings/textlayers.jade"

@className('textlayers')
export default class ProjectSettingsTextlayers extends BaseView {
  options
  project

  constructor(options?) {
    super(options)
    this.options = options;
    this.project = this.options.project;
    this.render();
  }

  render() {
    var textLayerList;
    this.el.innerHTML = tpl();
    // Text layers
    textLayerList = new EditableList({
      value: this.project.get('textLayers'),
      config: {
        settings: {
          placeholder: 'Add layer',
          confirmRemove: true
        }
      }
    } as any);
    this.listenTo(textLayerList, 'confirmRemove', (id, confirm) => {
      return this.trigger('confirm', confirm, {
        title: 'Caution!',
        html: 'You are about to <b>remove</b> the ' + id + ' layer<br><br>All texts and annotations will be <b>permanently</b> removed!',
        submitValue: 'Remove ' + id + ' layer'
      });
    });
    this.listenTo(textLayerList, 'change', (values) => {
      this.project.set('textLayers', values);
      return this.project.saveTextlayers(() => {
        // Clear the viewManager, because almost all pages need a rerender.
        // viewManager.clear()
        // @ts-ignore
        return this.publish('message', 'Text layers updated.');
      });
    });
    this.$el.append(textLayerList.el);
    return this;
  }
}
