import Backbone from "backbone"

export default class ListOption extends Backbone.Model {
  idAttribute = 'name'

  defaults() {
    return {
      name: '',
      count: 0,
      total: 0,
      checked: false,
      visible: false
    };
  }

  parse(attrs) {
    attrs.total = attrs.count;
    return attrs;
  }
}
