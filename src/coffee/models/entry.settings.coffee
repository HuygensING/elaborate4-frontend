define (require) ->

	config = require 'config'

	Models = 
		Base: require 'models/base'

	class EntrySettings extends Models.Base

		# defaults: ->
		# 	name: ''
		# 	publishable: false

		# parse: (attrs) ->
		# 	attrs.transcriptions = new Collections.Transcriptions([], entryId: attrs.id)

		# 	attrs

		initialize: (models, options) ->
			@projectId = options.projectId
			@entryId = options.entryId
		
		url: -> config.baseUrl + "projects/#{@projectId}/entries/#{@entryId}/settings"