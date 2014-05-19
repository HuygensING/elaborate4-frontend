Backbone = require 'backbone'

textlayers = require 'elaborate-modules/modules/collections/textlayers'

class SelectedPanel extends Backbone.Model
	
	defaults: ->
		type: ''
		annotationsVisible: true
		view: null

	initialize: ->
		# The panel model has a view (facsimile or text layer)
		@on 'change:view', (panel, value, options) =>
			# When the view sends the toggle:annotations event...
			@listenTo value, 'toggle:annotations', (visible) => 
				# Set the annotationsVisible attribute, so the model remembers if the annotations
				# have to be visible when the user goes to another entry.
				@set 'annotationsVisible', visible

class SelectedPanels extends Backbone.Collection
	
	model: SelectedPanel

	comparator: 'type'
	# initialize: (models, options) ->

module.exports = SelectedPanels