import Backbone  from "backbone"
import _  from "underscore"

class PubSubView extends Backbone.View {
  subscribe(ev, done) {
    return this.listenTo(Backbone, ev, done)
  }

  publish(...args: any[]) {
    // FIXME [UNSUPPORTED]: arguments can't be array like object in IE < 10
    // @ts-ignore
    return Backbone.trigger.apply(Backbone, args);
  }
}

export class BaseView extends PubSubView {
  subviews: Record<string, any>

  constructor(options?) {
    super(options)
    this.subviews = {}
  }

  destroy() {
    // remove the subviews
    Object.keys(this.subviews).forEach(subViewId => {
      this.subviews[subViewId].destroy()
    })

    // remove this view
    this.remove()
  }
}
