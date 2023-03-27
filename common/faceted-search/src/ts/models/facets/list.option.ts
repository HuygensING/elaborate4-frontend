import Backbone from "backbone"
import { idAttribute } from "@elaborate4-frontend/hilib"

@idAttribute('name')
export class ListOption extends Backbone.Model {
  defaults() {
    return {
      name: '',
      count: 0,
      total: 0,
      checked: false,
      visible: false
    }
  }

  parse(attrs) {
    attrs.total = attrs.count
    return attrs
  }
}
