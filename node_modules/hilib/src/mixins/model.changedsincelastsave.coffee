# Extend a model with the capability to remember if the model has been changed since the last save. 
# Backbone's model properties and methods (changed, changedAttributes) only work from the last .set().
# 
# Example usage:
#
# _.extend @, changedSinceLastSave(['title', 'body', 'date'])
# @initChangedSinceLastSave()

module.exports =
	(attrs) ->

		changedSinceLastSave: null

		initChangedSinceLastSave: ->
			# Reset the changedSinceLastSave when the model is saved (synced).
			@on 'sync', => @changedSinceLastSave = null

			for attr in attrs
				@on "change:#{attr}", (model, options) =>
					# Set the previous value of the attribute to remember the initial value. 
					# On subsequent change events we do nothing.
					@changedSinceLastSave = model.previousAttributes()[attr] unless @changedSinceLastSave?

		cancelChanges: ->
			# Restore the remembered values.
			@set attr, @changedSinceLastSave for attr in attrs
			@changedSinceLastSave = null