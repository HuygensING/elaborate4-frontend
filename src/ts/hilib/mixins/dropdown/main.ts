// Dropdown mixin

// ### Options (@options)
// * value
// * config

// ### Settings (@options.config.settings)
// * mutable: Boolean default is false, if true, a new model will be added to @collection when the value is not found in the collection
// * editable: Boolean default is false, if true, a button with edit class will be rendered, but no logic attached
// * inputClass: 'someClassName'
// * getModel: (value, collection) -> the passed in value can be a string (the id or the value) or an object (containing the id and/or value), because there is no way to know, the user can pass a function to retrieve the model

// ### Hooks
// * preDropdownRender
// * postDropdownRender
// * postDropdownFilter

// * TODO: CHANGE!!
// options
//	value
//	config
//		data
//		settings
//			mutable
//			editable
//			inputClass
//			getModel
//			placeholder

import Backbone  from "backbone";

import _  from "underscore";

import $  from "jquery";

import Fn  from "../../utils/general";

// Collections =
// Options: require 'hilib/mixins/dropdown/options'
import optionMixin  from "./options";

import mainTpl  from "./main.jade";

export default {
  // ### Initialize
  dropdownInitialize: function() {
    var base, base1, base2, base3, models, ref, ref1;
    if ((base = this.options).config == null) {
      base.config = {};
    }
    this.data = (ref = this.options.config.data) != null ? ref : {};
    this.settings = (ref1 = this.options.config.settings) != null ? ref1 : {};
    if ((base1 = this.settings).mutable == null) {
      base1.mutable = false;
    }
    if ((base2 = this.settings).editable == null) {
      base2.editable = false;
    }
    if ((base3 = this.settings).defaultAdd == null) {
      base3.defaultAdd = true;
    }
    this.selected = null;
    // First get the models, than create a collection holding all the options
    if (this.data instanceof Backbone.Collection) { // If data is a Backbone.Collection
      // The collection used to be cloned here (@data.clone()), but the collection would not update
      // if it was altered outside the dropdown, so clone was removed. It could however introduce
      // a bug for other projects. As far as I remember clone was added for Marginal Scholarship.
      // Clone was removed for eLaborate frontend (werkomgeving).
      this.collection = this.data;
    } else if (_.isArray(this.data) && _.isString(this.data[0])) {
      models = this.strArray2optionArray(this.data);
      this.collection = new Backbone.Collection(models);
    } else {
      console.error('No valid data passed to dropdown');
    }
    // Create a collection holding the filtered options (changes a when a user types in the input)
    this.filtered_options = this.collection.clone();
    // Extend the filtered options with "option functionality" (ie: next, previous, current)
    // We use an extend in stead of a separate Backbone.Collection because if @data is a Backbone.Collection it already exists.
    _.extend(this.filtered_options, optionMixin);
    // Add listeners
    if (this.settings.mutable) {
      this.listenTo(this.collection, 'add', (model, collection, options) => {
        this.selected = model;
        return this.triggerChange();
      });
    }
    this.listenTo(this.collection, 'add', (model, collection, options) => {
      this.trigger('change:data', this.collection.models);
      return this.filtered_options.add(model);
    });
    this.listenTo(this.filtered_options, 'add', this.renderOptions);
    this.listenTo(this.filtered_options, 'reset', this.renderOptions);
    this.listenTo(this.filtered_options, 'currentOption:change', (model) => {
      return this.$('li[data-id="' + model.id + '"]').addClass('active');
    });
    this.on('change', () => {
      return this.resetOptions();
    });
    return this.delegateEvents();
  },
  // ### Render
  dropdownRender: function(tpl) {
    var rtpl;
    if (this.preDropdownRender != null) {
      this.preDropdownRender();
    }
    rtpl = tpl({
      viewId: this.cid,
      selected: this.selected,
      settings: this.settings
    });
    this.$el.html(rtpl);
    this.$optionlist = this.$('ul.list');
    this.renderOptions();
    this.$('input').focus();
    // Hide list when user clicks outside
    $('body').click((ev) => {
      if (!(this.el === ev.target || Fn.isDescendant(this.el, ev.target))) {
        return this.hideOptionlist();
      }
    });
    if (this.settings.inputClass != null) {
      this.$('input').addClass(this.settings.inputClass);
    }
    if (this.postDropdownRender != null) {
      this.postDropdownRender();
    }
    return this;
  },
  // (Re)Renders the dropdown list with filtered options.
  renderOptions: function() {
    var rtpl;
    rtpl = mainTpl({
      collection: this.filtered_options,
      selected: this.selected
    });
    return this.$optionlist.html(rtpl);
  },
  // ### Events
  dropdownEvents: function(cid) {
    var evs;
    evs = {
      'click .caret': 'toggleList',
      'click li.list': 'addSelected'
    };
    evs['keyup input[data-view-id="' + cid + '"]'] = 'onKeyup';
    evs['keydown input[data-view-id="' + cid + '"]'] = 'onKeydown';
    return evs;
  },
  toggleList: function(ev) {
    this.$optionlist.toggle();
    return this.$('input').focus();
  },
  onKeydown: function(ev) {
    if (ev.keyCode === 38 && this.$optionlist.is(':visible')) {
      // Prevent browser from moving the cursor to beginning of the input value when pressing arrow up key
      return ev.preventDefault();
    }
  },
  onKeyup: function(ev) {
    this.$('.active').removeClass('active');
    if (ev.keyCode === 38) { // Arrow up
      this.$optionlist.show();
      return this.filtered_options.prev();
    } else if (ev.keyCode === 40) { // Arrow down
      this.$optionlist.show();
      return this.filtered_options.next();
    } else if (ev.keyCode === 13) { // Enter
      return this.addSelected(ev);
    } else if (ev.keyCode === 27) { // Escape
      return this.$optionlist.hide();
    } else {
      return this.filter(ev.currentTarget.value);
    }
  },
  // Before removing the view, remove the body click event listener
  destroy: function() {
    $('body').off('click');
    return this.remove();
  },
  // Reset the filtered options collection
  // TODO This is only triggered by combolist, use it to reject the selected model in autosuggest too!
  resetOptions: function() {
    this.filtered_options.reset(this.collection.reject((model) => {
      return this.selected.get(model.id) != null;
    }));
    this.filtered_options.resetCurrentOption();
    return this.hideOptionlist();
  },
  hideOptionlist: function() {
    return this.$optionlist.hide();
  },
  filter: function(value) {
    var models, re;
    if (this.settings.editable) {
      this.$('button.edit').removeClass('visible');
    }
    this.resetOptions();
    if (value.length > 1) {
      value = Fn.escapeRegExp(value);
      re = new RegExp(value, 'i');
      models = this.collection.filter(function(model) {
        return re.test(model.get('title'));
      });
      if (models.length > 0) {
        this.filtered_options.reset(models);
        this.$optionlist.show();
      }
    }
    if (this.postDropdownFilter != null) {
      // Call post filter hook for views that have implemented it
      return this.postDropdownFilter(models);
    }
  },
  // Turns an array of string ['la', 'li'] into an array of options [{id: 'la', title: 'la'}, {id: 'li', title: 'li'}] (model data for Backbone.Collectionn)
  strArray2optionArray: function(strArray) {
    return _.map(strArray, function(item) {
      return {
        id: item,
        title: item
      };
    });
  }
};
