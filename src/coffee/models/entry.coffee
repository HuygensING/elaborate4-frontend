define (require) ->

	config = require 'config'

	ajax = require 'hilib/managers/ajax'
	token = require 'hilib/managers/token'

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

		set: (attrs, options) ->
			settings = @get('settings')
			if settings? and settings.get(attrs)?
				settings.set attrs, options
				@trigger 'change'
			else
				super

		clone: ->
			newObj = new @constructor
				name: @get 'name'
				publishable: @get 'publishable'

			newObj.set 'settings', new Models.Settings @get('settings').toJSON(),
				projectId: @collection.projectId
				entryId: @id

			newObj

		updateFromClone: (clone) ->
			@set 'name', clone.get 'name'
			@set 'publishable', clone.get 'publishable'
			@get('settings').set clone.get('settings').toJSON()

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

		sync: (method, model, options) ->
			if method is 'update'
				ajax.token = token.get()

				data = 
					name: @get 'name'
					publishable: @get 'publishable'

				jqXHR = ajax.put
					url: @url()
					data: JSON.stringify data

				# Options.success is not called, because the server does not respond with the updated model.
				jqXHR.done (response) => @trigger 'sync'
				jqXHR.fail (response) => console.log 'fail', response
			else
				super