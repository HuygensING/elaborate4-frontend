define (require) ->
	config = require 'config'
	Base = require 'collections/base'

	Models =
		Entry: require 'models/entry'

	class Entries extends Base

		model: Models.Entry

		initialize: (models, options) ->
			super

			@projectId = options.projectId

			@current = null
		
		url: -> config.baseUrl + "projects/#{@projectId}/entries"

		setCurrent: (modelID) ->
			model = @get modelID
			
			# @publish 'entries:current:change', model

			# Set and return @current
			@current = model

		previous: ->
			previousIndex = @indexOf(@current) - 1
			@setCurrent @at previousIndex

		next: ->
			nextIndex = @indexOf(@current) + 1
			@setCurrent @at nextIndex