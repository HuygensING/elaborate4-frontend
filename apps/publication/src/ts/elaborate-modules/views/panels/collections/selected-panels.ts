import { model } from "@elaborate4-frontend/hilib"
import Backbone from "backbone"

class SelectedPanel extends Backbone.Model {
  defaults() {
    return {
      type: '',
      annotationsVisible: true,
      view: null
    }
  }

  constructor(attrs?, options?) {
    super(attrs, options)
    // The panel model has a view (facsimile or text layer)
    this.on('change:view', (panel, value, options) => {
      // When the view sends the toggle:annotations event...
      this.listenTo(value, 'toggle:annotations', visible => {
        
        // Set the annotationsVisible attribute, so the model remembers if the annotations
        // have to be visible when the user goes to another entry.
        this.set('annotationsVisible', visible)
      })
    })
  }

  // set(attrs?, options?) {
  //   console.log('[SelectedPanel] Set', 'attrs', attrs, 'options', options)
  //   return super.set(attrs, options)
  // }
}


@model(SelectedPanel)
export class SelectedPanels extends Backbone.Collection {}
SelectedPanels.prototype.comparator = 'type'
