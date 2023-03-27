// Extend a model with the capability to remember if the model has been changed since the last save. 
// Backbone's model properties and methods (changed, changedAttributes) only work from the last .set().

// Example usage:

// _.extend @, changedSinceLastSave(['title', 'body', 'date'])
// @initChangedSinceLastSave()
export function changedSinceLastSave(attrs) {
  return {
    changedSinceLastSave: null,
    initChangedSinceLastSave: function() {
      var attr, i, len, results;
      // Reset the changedSinceLastSave when the model is saved (synced).
      this.on('sync', () => {
        return this.changedSinceLastSave = null;
      });
      results = [];
      for (i = 0, len = attrs.length; i < len; i++) {
        attr = attrs[i];
        results.push(this.on(`change:${attr}`, (model, options) => {
          if (this.changedSinceLastSave == null) {
            // Set the previous value of the attribute to remember the initial value. 
            // On subsequent change events we do nothing.
            return this.changedSinceLastSave = model.previousAttributes()[attr];
          }
        }));
      }
      return results;
    },
    cancelChanges: function() {
      var attr, i, len;
      for (i = 0, len = attrs.length; i < len; i++) {
        attr = attrs[i];
        // Restore the remembered values.
        this.set(attr, this.changedSinceLastSave);
      }
      return this.changedSinceLastSave = null;
    }
  };
};
