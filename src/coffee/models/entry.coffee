define (require) ->

	config = require 'config'

	ajax = require 'hilib/managers/ajax'
	token = require 'hilib/managers/token'

	syncOverride = require 'hilib/mixins/model.sync'

	Models = 
		Base: require 'models/base'
		Settings: require 'models/entry.settings'

	Collections =
		Transcriptions: require 'collections/transcriptions'
		Facsimiles: require 'collections/facsimiles'

	class Entry extends Models.Base

		urlRoot: -> config.baseUrl + "projects/#{@projectID}/entries"

		defaults: ->
			name: ''
			publishable: false

		initialize: (attrs, options={}) ->
			super
			@projectID = options.projectID if options.projectID?
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
				modifier: @get 'modifier'
				modifiedOn: @get 'modifiedOn'

			newObj.set 'settings', new Models.Settings @get('settings').toJSON(),
				projectId: @collection.projectId
				entryId: @id

			newObj

		updateFromClone: (clone) ->
			@set 'name', clone.get 'name'
			@set 'publishable', clone.get 'publishable'
			@get('settings').set clone.get('settings').toJSON()

		parse: (attrs) ->
			if attrs? and @collection?
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

		# sync: (method, model, options) ->
		# 	if method is 'create' or method is 'update'
		# 		options.attributes = ['name', 'publishable']
		# 		@syncOverride method, model, options
		# 	else
		# 		super

		sync: (method, model, options) ->
			data = JSON.stringify
				name: @get 'name'
				publishable: @get 'publishable'

			if method is 'create'
				jqXHR = ajax.post
					url: @url()
					data: data
					dataType: 'text'

				jqXHR.done (data, textStatus, jqXHR) =>
					if jqXHR.status is 201
						xhr = ajax.get url: jqXHR.getResponseHeader('Location')
						xhr.done (data, textStatus, jqXHR) =>
							options.success data
						xhr.fail (response) =>
							Backbone.history.navigate 'login', trigger: true if response.status is 401

				jqXHR.fail (response) => Backbone.history.navigate 'login', trigger: true if response.status is 401

			else if method is 'update'
				ajax.token = token.get()
				jqXHR = ajax.put
					url: @url()
					data: data
				jqXHR.done (response) => options.success response
				jqXHR.fail (response) => Backbone.history.navigate 'login', trigger: true if response.status is 401

			else
				super