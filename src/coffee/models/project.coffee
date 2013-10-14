define (require) ->
	ajax = require 'hilib/managers/ajax'
	token = require 'hilib/managers/token'

	Async = require 'hilib/managers/async'

	config = require 'config'

	Models = 
		Base: require 'models/base'

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
			entrymetadatafields: []
			level1: ''
			level2: ''
			level3: ''
			modifiedOn: ''
			modifier: null
			name: ''
			projectLeaderId: null
			textLayers: []
			title: ''

		# initialize: ->
		# 	super

		# 	console.log 'init project'

		parse: (attrs) ->
			attrs.entries = new Collections.Entries([], projectId: attrs.id)
			attrs.annotationtypes = new Collections.AnnotationTypes([], projectId: attrs.id)
			attrs.entrymetadatafields = new EntryMetadata attrs.id
			attrs.users = new Collections.ProjectUsers([], projectId: attrs.id)

			attrs

		load: (cb) ->
			async = new Async ['annotationtypes', 'entrymetadatafields', 'users']
			async.on 'ready', (data) => cb data
			@get('annotationtypes').fetch success: (collection) -> async.called 'annotationtypes', collection
			@get('entrymetadatafields').fetch (data) => async.called 'entrymetadatafields', data
			@get('users').fetch success: (collection) -> async.called 'users', collection

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