// AutoSuggest generates an input with a ul
// The ul is populated with li depending on the input string
// When the user selects (clicks or enter) a li the input receives the li value and a change event is triggered
// The AutoSuggest uses the dropdown mixin.

// ### Settings
// * inputClass: 'someClassName'
// * getModel: (value, collection) -> the passed in value can be a string (the id or the value) or an object (containing the id and/or value), because there is no way to know, the user can pass a function to retrieve the model
// * defaultAdd: Boolean default is true, when set to false the user can implement his/her own add logic

import Backbone  from "backbone";
import $  from "jquery";
Backbone.$ = $;
import _  from "underscore";
import tpl  from "./main.jade";
import dropdown  from "../../../mixins/dropdown/main"

// ## AutoSuggest
export default class AutoSuggest extends Backbone.View {
  filtered_options
  settings
  selected

  // ### Initialize
  constructor(private options) {
    super({ ...options, className: 'autosuggest' })
    var getModel, ref, ref1;
    _.extend(this, dropdown);

    //@ts-ignore
    this.dropdownInitialize();
    // By default @options.value is equal to the model's ID, so the getModel function
    // looks in the collection and selects the correct model by ID (coll.get(val)).
    getModel = (ref = this.settings.getModel) != null ? ref : function(val, coll) {
      return coll.get(val);
    };
    // Extract the @selected model from @collection, using the passed in getModel function and value or use a Backbone model.
    this.selected = (ref1 = getModel(this.options.value, this.collection)) != null ? ref1 : new Backbone.Model({
      id: '',
      title: ''
    });

    // @ts-ignore
    return this.dropdownRender(tpl);
  }

  // ### Render
  postDropdownRender() {
    if (!this.settings.defaultAdd) {
      this.$('button.add').addClass('visible');
    }
    if (this.selected.id !== '') {
      return this.$('button.edit').addClass('visible');
    }
  }

  // ### Events
  events() {
    return _.extend(dropdown.dropdownEvents(this.cid), {
      'click button.add': 'addOption',
      'click button.edit': function() {
        return this.trigger('edit', this.selected.toJSON());
      }
    });
  }

  addOption(ev) {
    var value;
    if (this.settings.defaultAdd) {
      this.$('button.add').removeClass('visible');
    }
    value = this.el.querySelector('input').value;
    if (this.settings.defaultAdd) {
      this.$('button.edit').addClass('visible');
      // Add new model to the collection. In the collections add event listener,
      // @selected is set to the passed model and triggerChange is called.
      return this.collection.add({
        id: value,
        title: value
      });
    } else {
      return this.trigger('customAdd', value, this.collection);
    }
  }

  // ### Methods

    // User has selected an item/option and @selected is set to the selected model. This function only sets the input value and calls the change event.
  addSelected(ev) {
    // Was the event a keyup? And was it 'enter'?
    if ((ev.keyCode != null) && ev.keyCode === 13) {
      // Did the user go through the option list and select one?
      if (this.filtered_options.currentOption != null) {
        this.selected = this.filtered_options.currentOption;
      } else {
        this.selected = this.filtered_options.find((option) => {
          return option.get('title').toLowerCase() === ev.currentTarget.value.toLowerCase();
        });
        if ((this.selected == null) && this.settings.mutable) {
          this.$('button.add').addClass('visible');
        }
      }
    } else {
      // No, it must have been a click event
      this.selected = this.collection.get(ev.currentTarget.getAttribute('data-id'));
    }
    if (this.selected != null) {
      this.$('input').val(this.selected.get('title'));
      this.$('button.edit').addClass('visible');
      if (this.settings.defaultAdd) {
        this.$('button.add').removeClass('visible');
      }
      return this.triggerChange();
    }
  }

  // ### Public Methods

    // Fires change event, passing {id: 12, title: 'sometitle'} as data
  triggerChange() {
    return this.trigger('change', this.selected.toJSON());
  }

  postDropdownFilter(models) {
    if (this.settings.mutable) {
      if ((models != null) && !models.length) {
        return this.$('button.add').addClass('visible');
      } else {
        if (this.settings.defaultAdd) {
          return this.$('button.add').removeClass('visible');
        }
      }
    }
  }

};

