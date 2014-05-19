$ = require 'jquery'

class ModalManager

	constructor: ->
		@modals = []

	# Add a modal (Backbone.View) to modalManager.
	add: (modal) ->
		# Lighten overlays of underlying modals
		m.$('.overlay').css 'opacity', '0.2' for m in @modals
		
		# Add modal to @modals
		arrLength = @modals.push modal
		
		# Add z-indexes to .overlay and .modalbody
		modal.$('.overlay').css 'z-index', 10000 + (arrLength * 2) - 1
		modal.$('.modalbody').css 'z-index', 10000 + (arrLength * 2)

		# Prepend modal to body
		$('body').prepend modal.$el

	# Remove a modal (Backbone.View) to modalManager.
	# 
	# For now, the modal to be removed is always the last modal. In theory we could call Array.pop(),
	# but in the future we might implement a modal drag so underlying modals can be removed first.
	remove: (modal) ->
		index = @modals.indexOf modal
		@modals.splice index, 1

		# Restore the opacity of the highest modal
		@modals[@modals.length - 1].$('.overlay').css 'opacity', '0.7' if @modals.length > 0

		# Trigger 'removed' before removing bound event callbacks and removing the modal alltogether.
		modal.trigger 'removed'

		modal.off()

		# Call Backbone.View's remove function.
		modal.remove()


module.exports = new ModalManager()


# Z-indexes for modals:
# 
# Modal 1 get z-index 1 for .overlay and z-index 2 for .modalbody
# Modal 2 get z-index 3 for .overlay and z-index 4 for .modalbody
# etc...
#
# 1 = 1
# 1 = 2
# 2 = 3
# 2 = 4
# 3 = 5
# 3 = 6
# 4 = 7
# 4 = 8