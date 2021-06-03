import Backbone from "backbone"
import Modal from "hilib/views/modal"

export default class NoProject extends Backbone.View {
  // ### Initialize
  constructor() {
    super({ className: 'no-project' })
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
