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

		setCurrent: (model) ->
			if not model? or model isnt @current
				if model?
					@current = model
				else
					@current = @at 0

				@trigger 'current:change', @current


			@current