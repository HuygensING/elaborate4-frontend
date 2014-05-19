Backbone = require 'backbone'

class Textlayers extends Backbone.Collection

	initialize: ->
		@current = {}

	# ### Methods

	setCurrent: (modelId) ->
		if @current.id isnt modelId
			@current = @get modelId
			@trigger 'change:current', @current

module.exports = new Textlayers()