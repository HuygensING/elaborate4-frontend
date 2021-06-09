  // Example usage:

  // form = new Views.Form
  // 	tpl: Templates.FormTpl
  //	tplData:
  //		key: value
  // 	model: @model (or Models.User)
  // form.on 'change', => doThis()
  // form.on 'save:success', => doThat()
  // form.on 'save:error', => doSus()
 const hasProp = {}.hasOwnProperty

import Backbone  from "backbone"
import _  from "underscore"
import { Fn }  from "../../utils/general"
import { BaseView } from "../base"
import validation  from "../../mixins/validation"
import './main.styl'
import { className, tagName } from "../../utils/decorators"

export * from './editablelist'
export * from './combolist'
  // OPTIONS
  // subformConfig
  // Model
  // model
  // tpl
  // tplData
  // value
  // saveOnSubmit When form is submitted, save the model. Defaults to true.
  // validationAttributes Array of attributes to validate, other attributes are ignored. Defaults to null.

    // ## Form
@className('hilib')
@tagName('form')
export class Form extends BaseView {
  subformConfig
  Model
  tplData
  tpl
  subforms

  // ### Initialize

    // @Model is used by Form to instanciate @model and by MultiForm as the model for @collection. If no @Model is given, use Backbone.Model.
  constructor(private options?) {
    super(options)
    _.extend(this, validation);

    if (this.options.saveOnSubmit == null) this.options.saveOnSubmit = true

    if (this.subformConfig == null) {
      this.subformConfig = this.options.subformConfig;
    }
    if (this.subformConfig == null) {
      this.subformConfig = {};
    }
    if (this.Model == null) {
      this.Model = this.options.Model;
    }
    if (this.Model == null) {
      this.Model = Backbone.Model
    }

    this.tplData = this.options.tplData != null ? this.options.tplData : {}

    if (this.tpl == null && this.options.tpl != null) {
      this.tpl = this.options.tpl
    }
    else {
      throw 'Unknow template!'
    }

    // Listener to trigger the render once the models (Form: @model, MultiForm: @collection) are loaded. If @model isnt isNew(),
    // data is fetched from the server. We could call @render from @createModels, but for readability sake, we call @render from
    // a centralized place.
    this.on('createModels:finished', this.render, this);
    this.createModels();
    // @ts-ignore
    this.validatorInit();
    this.addListeners();
  }

  // ### Render

    // PreRender is a NOOP that can be called by a child view
  preRender() {}

  render() {
    var View, attr, ref, rtpl;
    this.preRender();
    this.tplData.viewId = this.cid;
    if (this.model != null) {
      this.tplData.model = this.model;
    }
    if (this.collection != null) {
      this.tplData.collection = this.collection;
    }
    if (this.tpl == null) {
      throw 'Unknow template!';
    }
    rtpl = _.isString(this.tpl) ? _.template(this.tpl, this.tplData) : this.tpl(this.tplData);
    this.$el.html(rtpl);
    // @el.setAttribute 'data-view-cid', @cid
    if (this.subforms == null) {
      this.subforms = {};
    }
    ref = this.subforms;
    for (attr in ref) {
      if (!hasProp.call(ref, attr)) continue;
      View = ref[attr];
      this.addSubform(attr, View);
    }
    // If form is hidden by display: none when rendered, this does not work! Hiding the form using opacity 0 does work.
    this.$('textarea').each((_index, textarea) => {
      textarea.style.height = textarea.scrollHeight + 6 > 32 ? textarea.scrollHeight + 6 + 'px' : '32px';
    });
    this.postRender();
    return this;
  }

  // PostRender is a NOOP that can be called by a child view
  postRender() {}

  // ### Events

    // MultiForm extends the events.
  events() {
    var evs;
    evs = {};
    evs[`keyup [data-model-id='${this.model.cid}'] textarea`] = "inputChanged";
    evs[`keyup [data-model-id='${this.model.cid}'] input`] = "inputChanged";
    evs[`change [data-model-id='${this.model.cid}'] input[type=\"checkbox\"]`] = "inputChanged";
    evs[`change [data-model-id='${this.model.cid}'] select`] = "inputChanged";
    evs[`keydown [data-model-id='${this.model.cid}'] textarea`] = "textareaKeyup";
    // evs["keyup [data-model-id='#{@model.cid}'] textarea"] = "keyUp"
    // evs["keyup [data-model-id='#{@model.cid}'] input"] = "keyUp"
    evs["click input[type=\"submit\"]"] = "submit";
    evs["click button[name=\"submit\"]"] = "submit";
    evs["click button[name=\"cancel\"]"] = "cancel";
    return evs;
  }

  // When the input changes, the new value is set to the model.
  // A listener on the models change event (collection change in case of MultiForm) calls @triggerChange.
  inputChanged(ev) {
    var model, value;
    // Removed stopPropagation because the events would not get to parent view
    // ev.stopPropagation()

    // @ts-ignore
    model = this.model != null ? this.model : this.getModel(ev);
    value = ev.currentTarget.type === 'checkbox' ? ev.currentTarget.checked : ev.currentTarget.value;
    if (ev.currentTarget.name !== '') {
      return model.set(ev.currentTarget.name, value);
    }
  }

  textareaKeyup(ev) {
    ev.currentTarget.style.height = '32px';
    return ev.currentTarget.style.height = ev.currentTarget.scrollHeight + 6 + 'px';
  }

  saveModel(validate = true) {
    return this.model.save([], {
      validate: validate,
      success: (model, response, options) => {
        var target;
        // After save we trigger the save:success so the instantiated Form view can capture it and take action.
        this.trigger('save:success', model, response, options);

        // TODO fix
        const ev = null
        target = typeof ev !== "undefined" && ev !== null ? this.$(ev.currentTarget) : this.$('button[name="submit"]');

        // console.log target
        target.removeClass('loader');
        return target.addClass('disabled');
      },
      error: (model, xhr, options) => {
        return this.trigger('save:error', model, xhr, options);
      }
    });
  }

  submit(ev) {
    var invalids, target;
    ev.preventDefault();
    target = this.$(ev.currentTarget);
    // If submit button has a loader or is disabled we don't do anything
    if (!(target.hasClass('loader') || target.hasClass('disabled'))) {
      target.addClass('loader');
      if (this.options.saveOnSubmit) {
        return this.saveModel();
      } else {
        // Manually check for invalids
        invalids = this.model.validate(this.model.attributes);
        if (invalids != null) {
          return this.model.trigger('invalid', this.model, invalids);
        } else {
          return this.trigger('submit', this.model);
        }
      }
    }
  }

  cancel(ev) {
    ev.preventDefault();
    return this.trigger('cancel');
  }

  // ### METHODS

    // noop
  customAdd() {
    return console.error('Form.customAdd is not implemented!');
  }

  // Reset the form to original state
  // * TODO: this only works on new models, not on editting a model
  reset() {
    var target;
    target = this.$('button[name="submit"]');
    target.removeClass('loader');
    target.addClass('disabled');
    this.stopListening(this.model);
    // Clone the model to remove any references
    this.model = this.model.clone();
    // Clear the model and restore the attributes to default values
    this.model.clear({
      silent: true
    });
    this.model.set(this.model.defaults());

    // @ts-ignore
    this.validatorInit();

    this.addListeners();
    this.delegateEvents();
    this.el.querySelector('[data-model-id]').setAttribute('data-model-id', this.model.cid);
    // Empty the form elements

    // return this.el.reset();
  }

  // Create the form model. If model isnt new (has an id), fetch data from server.
  // MultiForm overrides this method and creates a collection.
  createModels() {
    var base;
    if (this.model == null) {
      if ((base = this.options).value == null) {
        base.value = {};
      }
      this.model = new this.Model(this.options.value);
      if (this.model.isNew()) {
        return this.trigger('createModels:finished');
      } else {
        return this.model.fetch({
          success: () => {
            return this.trigger('createModels:finished');
          }
        });
      }
    } else {
      return this.trigger('createModels:finished');
    }
  }

  /* @on 'validator:validated', => $('button.save').prop('disabled', false).removeAttr('title') */
  /* @on 'validator:invalidated', => $('button.save').prop('disabled', true).attr 'title', 'The form cannot be saved due to invalid values.' */
  // Listen to changes on the model. MultiForm overrides this method.
  addListeners() {
    this.listenTo(this.model, 'change', () => {
      return this.triggerChange();
    });
    return this.listenTo(this.model, 'invalid', (model, errors, options) => {
      var error, found, i, len;
      if (this.options.validationAttributes != null) {
        found = false;
        for (i = 0, len = errors.length; i < len; i++) {
          error = errors[i];
          if (this.options.validationAttributes.indexOf(error.name) > -1) {
            found = true;
          }
        }
        if (!found) {
          this.$('button[name="submit"]').addClass('loader');
          return this.saveModel(false);
        }
      }
    });
  }

  // Fires change event. Data passed depends on an available @model (Form)	or @collection (MultiForm)
  triggerChange() {
    var object;
    object = this.model != null ? this.model : this.collection;
    this.trigger('change', object.toJSON(), object);
  }

  addSubform = (attr, View) => {
    this.renderSubform(attr, View, this.model);
  }

  renderSubform = (attr, View, model) => {
    var htmlSafeAttr, placeholders, value, view;
    // If the attr is a flattened attr (ie: origin.region.place), flatten the model and retrieve the value.
    // If not, just get the value from the model the regular way.
    value = attr.indexOf('.') > -1 ? Fn.flattenObject(model.attributes)[attr] : model.get(attr);
    if (value == null) {
      console.error('Subform value is undefined!', this.model);
    }
    // TODO Remove as subviews
    view = new View({
      value: value,
      config: this.subformConfig[attr]
    });
    this.subviews.push(view);
    // A className cannot contain dots, so replace dots with underscores
    htmlSafeAttr = attr.split('.').join('_');
    placeholders = this.el.querySelectorAll(`[data-cid='${model.cid}'] .${htmlSafeAttr}-placeholder`);
    // If the querySelectorAll finds placeholders with the same className, then we have to find the one that is
    // nested directly under the el (<ul>) with the current model.cid. We need to do this because forms can be nested
    // and the selector '[data-cid] .placeholder' will also yield nested placeholders.
    if (placeholders.length > 1) {
      _.each(placeholders, (placeholder) => {
        var el;
        // Find closest element with the attribute data-cid.
        el = Fn.closest(placeholder, '[data-cid]');
        // If the data-cid matches the model.cid and the placeholder is still empty, append the view.
        if (el.getAttribute('data-cid') === model.cid && placeholder.innerHTML === '') {
          return placeholder.appendChild(view.el);
        }
      });
    } else {
      // If just one placeholder is found, append the view to it.
      placeholders[0].appendChild(view.el);
    }
    this.listenTo(view, 'change', (data) => {
      return model.set(attr, data);
    });
    this.listenTo(view, 'customAdd', this.customAdd);
    // Multiform has multiple instances of the same form elements. Those form elements can have a config.data (Backbone.Collection)
    // attribute which populates (for example) an autosuggest. The config.data is cloned, otherwise the elements would update eachother.
    // Therefor we need a central reference to the collection: @subformConfig[attr].data. If one of the elements changes the data,
    // @subformConfig[attr].data will be updated, so all the elements get the same data on rerender.
    return this.listenTo(view, 'change:data', (models) => {
      return this.subformConfig[attr].data = this.subformConfig[attr].data.reset(models);
    });
  }

  destroy() {
    var i, len, ref, view;
    ref = this.subviews;
    for (i = 0, len = ref.length; i < len; i++) {
      view = ref[i];
      view.destroy();
    }
    return this.remove();
  }
}
