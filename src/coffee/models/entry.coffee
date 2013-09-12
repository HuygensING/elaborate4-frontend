define (require) ->

	config = require 'config'

	Models = 
		Base: require 'models/base'
		Settings: require 'models/entry.settings'

	Collections =
		Transcriptions: require 'collections/transcriptions'
		Facsimiles: require 'collections/facsimiles'

	class Entry extends Models.Base

		defaults: ->
			name: ''
			publishable: false

		parse: (attrs) ->
			attrs.transcriptions = new Collections.Transcriptions [], 
				projectId: @collection.projectId
				entryId: attrs.id
				
			attrs.settings = new Models.Settings [], 
				projectId: @collection.projectId
				entryId: attrs.id

			attrs.facsimiles = new Collections.Facsimiles [], 
				projectId: @collection.projectId
				entryId: attrs.id

			attrs