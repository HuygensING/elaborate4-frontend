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
		
		url: -> config.baseUrl + "projects/#{@projectId}/entries/#{@entryId}/transcriptions"

		setCurrent: (model) ->
			if model?
				@current = model
			else
				@current = @at 0

			@trigger 'current:change', @current