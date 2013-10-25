define (require) ->
	config = require 'config'
	Base = require 'collections/base'

	Models =
		Transcription: require 'models/transcription'

	class Transcriptions extends Base

		model: Models.Transcription

		initialize: (models, options) ->
			@projectId = options.projectId
			@entryId = options.entryId

			@on 'remove', (model) => model.destroy()
		
		url: -> config.baseUrl + "projects/#{@projectId}/entries/#{@entryId}/transcriptions"

		setCurrent: (model) ->
			if not model? or model isnt @current
				if model?
					@current = model
				else
					# Default to the Diplomatic text layer
					@current = @findWhere textLayer: 'Diplomatic'

					# If no Diplomatic text layer was found, get the first in the collection
					@first() unless @current?


				@trigger 'current:change', @current

			@current