import Backbone from "backbone"
import _ from "underscore"
import Form from "hilib/views/form/main"
import tpl from "../../../../jade/project/settings/general2.jade"

export default class ProjectSettingsGeneral extends Backbone.View {
  // ### Initialize
  constructor(private options?) {
    super({ ...options, className: 'generalprojectsettings' })
    this.render()
  }

  // ### Render
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
    // @listenTo form, 'change', => form.$('button[name="submit"]').removeClass 'disabled'
    this.listenTo(form, 'save:success', (model, response, options, changedAttributes) => {
      this.options.project.get('settings').trigger('settings:saved', model, changedAttributes);
      // @ts-ignore
      return Backbone.trigger('message', 'Settings saved.');
    });
    this.$el.html(form.el);
    return this;
  }

  // ### Events
  events() {
    return {
      "change select": (ev) => {
        return this.$('img[name="text.font"]').attr('src', `/images/fonts/${ev.currentTarget.value}.png`);
      }
    };
  }

};
