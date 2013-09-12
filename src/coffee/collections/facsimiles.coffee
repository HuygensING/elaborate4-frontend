define (require) ->
	config = require 'config'
	Base = require 'collections/base'

	Models =
		Facsimile: require 'models/facsimile'

	class Facsimiles extends Base

		model: Models.Facsimile

		initialize: (models, options) ->
			@projectId = options.projectId
			@entryId = options.entryId
		
		url: -> config.baseUrl + "projects/#{@projectId}/entries/#{@entryId}/facsimiles"

		setCurrentFacsimile: (model) ->
			if model?
				@currentFacsimile = model
			else
				@currentFacsimile = @at 0

			@trigger 'currentFacsimile:change', @currentFacsimile
