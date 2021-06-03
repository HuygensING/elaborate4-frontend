import $  from "jquery";

class ModalManager {
  modals

  constructor() {
    this.modals = [];
  }

  // Add a modal (Backbone.View) to modalManager.
  add(modal) {
    var arrLength, i, len, m, ref;
    ref = this.modals;
    for (i = 0, len = ref.length; i < len; i++) {
      m = ref[i];
      // Lighten overlays of underlying modals
      m.$('.overlay').css('opacity', '0.2');
    }
    
    // Add modal to @modals
    arrLength = this.modals.push(modal);
    
    // Add z-indexes to .overlay and .modalbody
    modal.$('.overlay').css('z-index', 10000 + (arrLength * 2) - 1);
    modal.$('.modalbody').css('z-index', 10000 + (arrLength * 2));
    // Prepend modal to body
    return $('body').prepend(modal.$el);
  }

  // Remove a modal (Backbone.View) to modalManager.

  // For now, the modal to be removed is always the last modal. In theory we could call Array.pop(),
  // but in the future we might implement a modal drag so underlying modals can be removed first.
  remove(modal) {
    var index;
    index = this.modals.indexOf(modal);
    this.modals.splice(index, 1);
    if (this.modals.length > 0) {
      // Restore the opacity of the highest modal
      this.modals[this.modals.length - 1].$('.overlay').css('opacity', '0.7');
    }
    // Trigger 'removed' before removing bound event callbacks and removing the modal alltogether.
    modal.trigger('removed');
    modal.off();
    // Call Backbone.View's remove function.
    return modal.remove();
  }

};

export default new ModalManager();

// Z-indexes for modals:

// Modal 1 get z-index 1 for .overlay and z-index 2 for .modalbody
// Modal 2 get z-index 3 for .overlay and z-index 4 for .modalbody
// etc...

// 1 = 1
// 1 = 2
// 2 = 3
// 2 = 4
// 3 = 5
// 3 = 6
// 4 = 7
// 4 = 8
