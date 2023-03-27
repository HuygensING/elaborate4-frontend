import Backbone from "backbone"

export default class Facet extends Backbone.Model {
  idAttribute = 'name'

  defaults() {
    return {
      name: null,
      title: null,
      type: null,
      options: null
    }
  }
}
