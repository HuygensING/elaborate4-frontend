define (require) ->
	ajax = require 'hilib/managers/ajax'
	token = require 'hilib/managers/token'

	Async = require 'hilib/managers/async'

	config = require 'config'

	Models = 
		Base: require 'models/base'
		Settings: require 'models/project/settings'

	# EntryMetadata is not a collection, it just reads and writes an array from and to the server.
	EntryMetadata = require 'entry.metadata'

	Collections =
		Entries: require 'collections/entries'
		AnnotationTypes: require 'collections/project/annotationtypes'
		ProjectUsers: require 'collections/project/users'

	class Project extends Models.Base

		defaults: ->
			annotationtypes: null
			createdOn: ''
			creator: null
			entries: null
			entrymetadatafields: null
			level1: ''
			level2: ''
			level3: ''
			modifiedOn: ''
			modifier: null
			name: ''
			projectLeaderId: null
			settings: null
			textLayers: []
			title: ''
			users: null

		# initialize: ->
		# 	super

		# 	console.log 'init project'

		parse: (attrs) ->
			attrs.entries = new Collections.Entries([], projectId: attrs.id)
		# 	attrs.annotationtypes = new Collections.AnnotationTypes([], projectId: attrs.id)
		# 	attrs.users = new Collections.ProjectUsers([], projectId: attrs.id)

			attrs

		load: (cb) ->
			if @get('annotationtypes') is null and @get('entrymetadatafields') is null and @get('users') is null
				async = new Async ['annotationtypes', 'users', 'entrymetadatafields', 'settings']
				async.on 'ready', (data) => cb()

				annotationtypes = new Collections.AnnotationTypes [], projectId: @id
				annotationtypes.fetch success: (collection) => 
					@set 'annotationtypes', collection
					async.called 'annotationtypes'

				users = new Collections.ProjectUsers [], projectId: @id
				users.fetch success: (collection) => 
					@set 'users', collection
					async.called 'users'

				new EntryMetadata(@id).fetch (data) =>
					@set 'entrymetadatafields', data
					async.called 'entrymetadatafields'

				settings = new Models.Settings null, projectID: @id
				settings.fetch success: (model) =>
					@set 'settings', model
					async.called 'settings'
			else
				cb()

		fetchEntrymetadatafields: (cb) ->
			ajax.token = token.get()
			jqXHR = ajax.get
				url: config.baseUrl + "projects/#{@id}/entrymetadatafields"
				dataType: 'text'
			jqXHR.done (response) =>
				@set 'entrymetadatafields', response
				cb()
			jqXHR.fail (a, b, c) => 
				console.log a, b, c
				console.error 'fetchEntrymetadatafields failed!'