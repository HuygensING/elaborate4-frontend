// ComboList is both an autosuggest and an editablelist. With an autosuggest, the selected value is set to the input.
// With a ComboList, there can be multiple selected values, rendered in a ul beneath the input.
// The ComboList uses the dropdown mixin.

import Backbone  from "backbone";
import _  from "underscore";
import { dom }  from "../../../utils/dom";
import { BaseView } from "../../base"
import tpl  from "./main.jade";

// add to mixins
import dropdown  from "../../../mixins/dropdown/main";
import { className } from "../../../utils/decorators";
import { BaseCollection } from "../../../collections/base";

// ## ComboList
@className('combolist')
export class ComboList extends BaseView {
  settings
  selected
  filtered_options

  // ### Initialize
  constructor(private options?) {
    super(options)

    var base, base1, models, ref;

    if ((base = this.options).config == null) {
      base.config = {};
    }
    this.settings = (ref = this.options.config.settings) != null ? ref : {};
    if ((base1 = this.settings).confirmRemove == null) {
      base1.confirmRemove = false;
    }
    _.extend(this, dropdown);
    // @ts-ignore
    this.dropdownInitialize();
    // Create a collection holding the selected or created options
    if (this.options.value instanceof Backbone.Collection) { // If data is a Backbone.Collection
      // * **CHANGE** instead of creating a new collection, we could add a 'options mixin' to current collection
      this.selected = this.options.value;
    } else if (_.isArray(this.options.value)) { // Else if data is an array of strings
      models = this.strArray2optionArray(this.options.value);
      this.selected = new BaseCollection(models);
    } else {
      console.error('No valid value passed to combolist');
    }
    // selectedData = if _.isString @options.value[0] then @strArray2optionArray @options.value else []
    // @selected = new Collections.Base selectedData
    this.listenTo(this.selected, 'add', (model) => {
      // @ts-ignore
      this.dropdownRender(tpl);
      return this.triggerChange({
        added: model.id
      });
    });
    this.listenTo(this.selected, 'remove', (model) => {
      // @ts-ignore
      this.dropdownRender(tpl);
      return this.triggerChange({
        removed: model.id
      });
    });

    // @ts-ignore
    this.dropdownRender(tpl);
  }

  // ### Render
  postDropdownRender() {
    // console.log 'before'
    return this.filtered_options.reset(this.collection.reject((model) => {
      return this.selected.get(model.id) != null;
    }));
  }

  // console.log 'after'
  // 'myval'

    // ### Events
  events() {
    return _.extend(dropdown.dropdownEvents(this.cid), {
      'click li.selected span': 'removeSelected',
      'click button.add': 'createModel',
      'keyup input': 'toggleAddButton'
    });
  }

  toggleAddButton(ev) {
    var button;
    if (!this.settings.mutable) {
      return;
    }
    button = dom(this.el).q('button');
    if (ev.currentTarget.value.length > 1 && ev.keyCode !== 13) {
      return button.show('inline-block');
    } else {
      return button.hide();
    }
  }

  createModel() {
    var value;
    value = this.el.querySelector('input').value;
    if (this.settings.mutable && value.length > 1) {
      return this.selected.add({
        id: value,
        title: value
      });
    }
  }

  removeSelected(ev) {
    var listitemID, remove;
    listitemID = ev.currentTarget.parentNode.getAttribute('data-id');
    remove = () => {
      return this.selected.removeById(listitemID);
    };
    if (this.settings.confirmRemove) {
      return this.trigger('confirmRemove', listitemID, remove);
    } else {
      return remove();
    }
  }

  // ### Methods
  addSelected(ev) {
    var model;
    // Check if ev is coming from keyup and double check if keyCode is 13
    // The model is a filtered option if it is current/active otherwise it is the value of input
    if ((ev.keyCode != null) && ev.keyCode === 13) {
      if (this.filtered_options.currentOption != null) {
        model = this.filtered_options.currentOption;
      }
      if (model == null) {
        this.createModel();
        return;
      }
    } else {
      // Else it was a click event on li.list. Model is retrieved from @collection with <li data-id="13">
      model = this.collection.get(ev.currentTarget.getAttribute('data-id'));
    }
    return this.selected.add(model);
  }

  triggerChange(options) {
    if (options.added == null) {
      options.added = null;
    }
    if (options.removed == null) {
      options.removed = null;
    }
    return this.trigger('change', {
      selected: this.selected.toJSON(),
      added: options.added,
      removed: options.removed
    });
  }

  // Turns an array of string ['la', 'li'] into an array of options [{id: 'la', title: 'la'}, {id: 'li', title: 'li'}] (model data for Backbone.Collectionn)
  strArray2optionArray(strArray) {
    return _.map(strArray, function(item) {
      return {
        id: item,
        title: item
      };
    });
  }

};
