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

			@currentEntry = null
		
		url: -> config.baseUrl + "projects/#{@projectId}/entries"

		setCurrentEntry: (model) ->
			@currentEntry = model
			@publish 'currentEntry:change', @currentEntry

		previous: ->
			previousIndex = @indexOf(@currentEntry) - 1
			@setCurrentEntry @at previousIndex

		next: ->
			nextIndex = @indexOf(@currentEntry) + 1
			@setCurrentEntry @at nextIndex