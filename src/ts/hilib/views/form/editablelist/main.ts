// TODO change @options.value to @options.values
// TODO remove collection; it's overkill

import _  from "underscore";

import  BaseCollection from "../../../collections/base"

import  Base from "../../base"

import tpl  from "./main.jade";

export default class EditableList extends Base {
  settings
  selected

  // ### Initialize
  constructor(private options?) {
    super({ ...options, className: 'editablelist' })

    var base, base1, base2, ref, value;

    if ((base = this.options).config == null) {
      base.config = {};
    }
    this.settings = (ref = this.options.config.settings) != null ? ref : {};
    if ((base1 = this.settings).placeholder == null) {
      base1.placeholder = '';
    }
    if ((base2 = this.settings).confirmRemove == null) {
      base2.confirmRemove = false;
    }
    // Turn array of strings into array of objects
    value = _.map(this.options.value, function(val) {
      return {
        id: val
      };
    });
    // Create a collection holding the selected or created options
    this.selected = new BaseCollection(value);
    // When @selected changes, rerender the view
    this.listenTo(this.selected, 'add', this.render);
    this.listenTo(this.selected, 'remove', this.render);
    this.render();
  }

  // ### Render
  render() {
    var rtpl;
    rtpl = tpl({
      viewId: this.cid,
      selected: this.selected,
      settings: this.settings
    });
    this.$el.html(rtpl);
    this.triggerChange();
    if (this.settings.inputClass != null) {
      this.$('input').addClass(this.settings.inputClass);
    }
    this.$('input').focus();
    return this;
  }

  // ### Events
  events() {
    var evs;
    evs = {
      'click li span': 'removeLi',
      'click button': 'addSelected'
    };
    evs['keyup input'] = 'onKeyup';
    return evs;
  }

  removeLi(ev) {
    var listitemID;
    listitemID = ev.currentTarget.parentNode.getAttribute('data-id');
    if (this.settings.confirmRemove) {
      return this.trigger('confirmRemove', listitemID, () => {
        return this.selected.removeById(listitemID);
      });
    } else {
      return this.selected.removeById(listitemID);
    }
  }

  onKeyup(ev) {
    var valueLength;
    valueLength = ev.currentTarget.value.length;
    if (ev.keyCode === 13 && valueLength > 0) {
      return this.addSelected();
    } else if (valueLength > 1) {
      return this.showButton();
    } else {
      return this.hideButton();
    }
  }

  // ### Methods
  addSelected() {
    this.selected.add({
      id: this.el.querySelector('input').value
    });
    return this.el.querySelector('button').style.display = 'none';
  }

  showButton() {
    return this.el.querySelector('button').style.display = 'inline-block';
  }

  hideButton() {
    return this.el.querySelector('button').style.display = 'none';
  }

  triggerChange() {
    return this.trigger('change', this.selected.pluck('id'));
  }

};
