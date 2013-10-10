define (require) ->

	config = require 'config'

	# ajax = require 'hilib/managers/ajax'
	# token = require 'hilib/managers/token'

	syncOverride = require 'hilib/mixins/model.sync'

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

		initialize: ->
			super

			_.extend @, syncOverride

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
			if method is 'create' or method is 'update'
				options.attributes = ['name', 'publishable']
				@syncOverride method, model, options
			else
				super