define (require) ->
	Fn = require 'hilib/functions/general'
	ajax = require 'hilib/managers/ajax'
	token = require 'hilib/managers/token'

	Async = require 'hilib/managers/async'

	config = require 'config'
		
	Models = 
		Base: require 'models/base'
		Settings: require 'models/project/settings'

	# EntryMetadata is not a collection, it just reads and writes an array from and to the server.
	EntryMetadata = require 'entry.metadata'
	ProjectUserIDs = require 'project.user.ids'
	ProjectAnnotationTypeIDs = require 'project.annotationtype.ids'

	Collections =
		Entries: require 'collections/entries'
		AnnotationTypes: require 'collections/project/annotationtypes'
		Users: require 'collections/users'


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
			userIDs: []

		# initialize: ->
		# 	super

		# 	console.log 'init project'

		parse: (attrs) ->
			attrs.entries = new Collections.Entries([], projectId: attrs.id)
		# 	attrs.annotationtypes = new Collections.AnnotationTypes([], projectId: attrs.id)
		# 	attrs.users = new Collections.ProjectUsers([], projectId: attrs.id)

			attrs

		addAnnotationType: (annotationType, done) ->
			ids = @get('annotationtypeIDs')
			ids.push annotationType.id

			@projectAnnotationTypeIDs.save ids,
				success: => 
					@allannotationtypes.add annotationType
					done()

		removeAnnotationType: (id, done) ->
			@projectAnnotationTypeIDs.save Fn.removeFromArray(@get('annotationtypeIDs'), id),
				success: => 
					@allannotationtypes.remove id
					done()

		addUser: (user, done) ->
			userIDs = @get 'userIDs'
			userIDs.push user.id

			@projectUserIDs.save userIDs,
				success: => 
					@allusers.add user
					@get('members').add user
					done()

		removeUser: (id, done) ->
			@projectUserIDs.save Fn.removeFromArray(@get('userIDs'), id),
				success: => 
					@allusers.remove id
					@get('members').removeById id
					done()

		load: (cb) ->
			if @get('annotationtypes') is null and @get('entrymetadatafields') is null and @get('userIDs').length is 0
				async = new Async ['annotationtypes', 'users', 'entrymetadatafields', 'settings']
				async.on 'ready', (data) => cb()

				new Collections.AnnotationTypes().fetch
					success: (collection, response, options) =>
						# Set all annotationtypes to root for use in views/project/settings
						@allannotationtypes = collection

						# Fetch annotation type IDs
						@projectAnnotationTypeIDs = new ProjectAnnotationTypeIDs(@id)
						@projectAnnotationTypeIDs.fetch (data) =>
							@set 'annotationtypeIDs', data
							@set 'annotationtypes', new Collections.AnnotationTypes collection.filter (model) -> data.indexOf(model.id) > -1
							async.called 'annotationtypes'

				# Users
				new Collections.Users().fetch 
					success: (collection) =>
						# Set all users to root for use in views/project/settings
						@allusers = collection

						# Fetch user IDs
						@projectUserIDs = new ProjectUserIDs(@id)
						@projectUserIDs.fetch (data) =>
							@set 'userIDs', data
							@set 'members', new Collections.Users collection.filter (model) => data.indexOf(model.id) > -1
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
				
		publishDraft: (cb) ->
			ajax.token = token.get()
			jqXHR = ajax.post
				url: config.baseUrl+"projects/#{@id}/draft"
				dataType: 'text'
			jqXHR.done =>
				locationUrl = jqXHR.getResponseHeader('Location')
				localStorage.setItem 'publishDraftLocation', locationUrl
				@pollDraft locationUrl, cb
			jqXHR.fail => console.log arguments

		pollDraft: (url, done) ->
			ajax.poll
				url: url
				testFn: (data) => data.done
				done: (data, textStatus, jqXHR) =>
					localStorage.removeItem 'publishDraftLocation'
					@publish 'message', "Publication <a href='#{data.url}' target='_blank' data-bypass>ready</a>."
					done()
					# # TODO: Move setting of publicationURL to server. If user leaves the page while publishing,
					# # the publicationURL isnt stored.
					# settings = @get('settings')
					# settings.set 'publicationURL', data.url
					# settings.save null,
					# 	success: =>

		saveTextlayers: (done) ->
			ajax.token = token.get()
			jqXHR = ajax.put
				url: config.baseUrl+"projects/#{@id}/textlayers"
				data: JSON.stringify @get 'textLayers'
			jqXHR.done => done()

