config = require '../config'
Base = require './base'

Models =
	Entry: require '../models/entry'

class Entries extends Base

	model: Models.Entry

	initialize: (models, options) ->
		super

		@projectId = options.projectId

		@current = null

		# Keep track of changed entries. In this case, we track if the metadata has changed
		# through edit multiple metadata, but the same logic could be applied elsewhere. 
		# When the metadata changes, we can't use the view's cache.
		@changed = []
	
	url: -> config.baseUrl + "projects/#{@projectId}/entries"

	setCurrent: (modelID) ->
		model = @get modelID
		
		# FIXME Unused!
		@trigger 'current:change', model

		# Set and return @current
		@current = model

	previous: ->
		previousIndex = @indexOf(@current) - 1
		model = @at previousIndex
		@setCurrent model

	next: ->
		nextIndex = @indexOf(@current) + 1
		model = @at nextIndex
		@setCurrent model

module.exports = Entries