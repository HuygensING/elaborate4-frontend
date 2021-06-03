  // MultiForm is a view for multiple forms, held together in a collection.
  // The view Form is a set of inputs, selects and/or textareas, MultiForm is a collection
  // of sets of inputs, selects and/or textareas. A view can be turned into a MultiForm by extending it.

import Form  from "./main";
import Backbone from "backbone";

// ## MultiForm
export default class MultiForm extends Form {
  constructor(options?) {
    super(options);
    // Add and render subform for each form in the collection.
    // this.addSubform = this.addSubform.bind(this);
  }

  // ### Events

    // Extend the events from Form
  events() {
    return _.extend(super.events, {
      'click button.addform': 'addForm',
      'click button.remove': 'removeForm'
    });
  }

  addForm(ev) {
    return this.collection.add(new this.Model());
  }

  removeForm(ev) {
    return this.collection.remove(this.getModel(ev));
  }

  // ### Public Methods

    // Create collection of forms (or more accurate a collection of sets of inputs, selects and textareas).
  // MultiForm overrides Form.createObject (which creates a model instead of a collection). Is called from Form.
  createModels() {
    var base;
    if ((base = this.options).value == null) {
      base.value = [];
    }
    this.collection = new Backbone.Collection(this.options.value, {
      model: this.Model
    });
    return this.trigger('createModels:finished');
  }

  // AddListeners is called from From
  addListeners() {
    // One of the models attributes has changed:
    this.listenTo(this.collection, 'change', () => this.triggerChange())
    // The user has clicked button.addform:
    this.listenTo(this.collection, 'add', () => this.render())
    // The user has clicked button.remove
    return this.listenTo(this.collection, 'remove', () => {
      this.triggerChange()
      this.render()
    })
  }

  // Helper function to get specific model from collection, depending on the event
  getModel(ev) {
    const cid = $(ev.currentTarget).parents('[data-cid]').attr('data-cid')
    return this.collection.get(cid)
  }

  addSubform = (attr, View) => {
    this.collection.each((model) => {
      this.renderSubform(attr, View, model)
    })
  }
}
