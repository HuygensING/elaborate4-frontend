import { className } from "@elaborate4-frontend/hilib"
import Backbone from "backbone"
import tpl from "./facsimile-panel.jade"

@className('facsimile')
export class FacsimilePanel extends Backbone.View {
  // ### Initialize
  constructor(private options?) {
    super(options)
    this.render()
  }

  // ### Render
  render() {
    this.$el.html(tpl({
      entry: this.options.entry,
      zoomUrl: this.options.zoomUrl
    }))
    return this;
  }

  // ### Methods
  destroy() {
    return this.remove()
  }

  updatePosition(top) {
    return this.$el.css('margin-top', top)
  }

}
