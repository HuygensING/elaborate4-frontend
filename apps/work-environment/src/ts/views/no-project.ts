import Backbone from "backbone"
import { className, Modal } from "@elaborate4-frontend/hilib"

@className('no-project')
export default class NoProject extends Backbone.View {
  // ### Initialize
  constructor(options = {}) {
    super(options)
    this.render()
  }

  // ### Render
  render() {
    new Modal({
      title: 'You are not assigned to a project',
      clickOverlay: false,
      html: "Please contact an administrator.",
      cancelAndSubmit: false
    })

    return this
  }
}
