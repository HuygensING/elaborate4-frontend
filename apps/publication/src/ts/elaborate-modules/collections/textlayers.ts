import Backbone from "backbone"

class Textlayers extends Backbone.Collection {
  current: any = {}

  // ### Methods
  setCurrent(modelId) {
    if (this.current.id !== modelId) {
      this.current = this.get(modelId)
      return this.trigger('change:current', this.current)
    }
  }

}

export const textlayers = new Textlayers()
