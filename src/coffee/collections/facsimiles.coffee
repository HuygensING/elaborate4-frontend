config = require '../models/config'
Base = require './base'

Models =
	Facsimile: require '../models/facsimile'

class Facsimiles extends Base

	model: Models.Facsimile

	initialize: (models, options) ->
		@projectId = options.projectId
		@entryId = options.entryId

		@on 'remove', (model) => model.destroy()
	
	url: -> "#{config.get('restUrl')}projects/#{@projectId}/entries/#{@entryId}/facsimiles"

	setCurrent: (model) ->
		if not model? or model isnt @current
			if model?
				@current = model
			else
				@current = @at 0

			@trigger 'current:change', @current


		@current

module.exports = Facsimiles