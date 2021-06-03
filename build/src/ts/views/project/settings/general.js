import Backbone from "backbone";
import Form from "hilib/views/form/main";
import tpl from "../../../../jade/project/settings/general2.jade";
export default class ProjectSettingsGeneral extends Backbone.View {
    options;
    initialize(options1) {
        this.options = options1;
        this.render();
    }
    render() {
        var errors, form, model, prop;
        model = this.options.project.get('settings');
        prop = model.get('name') + ':publicationErrors:value';
        errors = localStorage.getItem(prop);
        form = new Form({
            model: model,
            tpl: tpl,
            tplData: {
                projectMembers: this.options.project.get('members'),
                hasErrors: errors !== null && errors.length,
                errorsUrl: `/projects/${model.get('name')}/publication-errors`
            }
        });
        this.listenTo(form, 'save:success', (model, response, options, changedAttributes) => {
            this.options.project.get('settings').trigger('settings:saved', model, changedAttributes);
            return Backbone.trigger('message', 'Settings saved.');
        });
        this.$el.html(form.el);
        return this;
    }
    events() {
        return {
            "change select": (ev) => {
                return this.$('img[name="text.font"]').attr('src', `/images/fonts/${ev.currentTarget.value}.png`);
            }
        };
    }
}
;
ProjectSettingsGeneral.prototype.className = 'generalprojectsettings';
