import Base from "hilib/views/base";
import EditableList from "hilib/views/form/editablelist/main";
import tpl from "../../../../jade/project/settings/textlayers.jade";
class ProjectSettingsTextlayers extends Base {
    initialize(options) {
        this.options = options;
        super.initialize();
        this.project = this.options.project;
        return this.render();
    }
    render() {
        var textLayerList;
        this.el.innerHTML = tpl();
        textLayerList = new EditableList({
            value: this.project.get('textLayers'),
            config: {
                settings: {
                    placeholder: 'Add layer',
                    confirmRemove: true
                }
            }
        });
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
                return this.publish('message', 'Text layers updated.');
            });
        });
        this.$el.append(textLayerList.el);
        return this;
    }
}
;
ProjectSettingsTextlayers.prototype.className = 'textlayers';
