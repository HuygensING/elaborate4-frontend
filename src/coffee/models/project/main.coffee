Backbone = require 'backbone'
_ = require 'underscore'
Fn = require 'hilib/src/utils/general'
ajax = require 'hilib/src/managers/ajax'
# token = require 'hilib/src/managers/token'

Async = require 'hilib/src/managers/async'

config = require '../config'

Models = 
	Base: require '../base'
	Settings: require './settings'

# EntryMetadata is not a collection, it just reads and writes an array from and to the server.
EntryMetadata = require '../../entry.metadata'
ProjectUserIDs = require '../../project.user.ids'
ProjectAnnotationTypeIDs = require '../../project.annotationtype.ids'

Collections =
	Entries: require '../../collections/entries'
	AnnotationTypes: require '../../collections/project/annotationtypes'
	Users: require '../../collections/users'


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
				done()

	removeUser: (id, done) ->
		@projectUserIDs.save Fn.removeFromArray(@get('userIDs'), id),
			success: =>
				@get('members').removeById id
				done()

	load: (cb) ->
		if @get('annotationtypes') is null and @get('entrymetadatafields') is null and @get('userIDs').length is 0
			async = new Async ['annotationtypes', 'users', 'entrymetadatafields', 'settings']
			async.on 'ready', (data) =>
				# # If a project is loaded, update the sessionStorage item.
				# sessionStorage.setItem 'hing-elaborate-projects', JSON.stringify @collection
				# sessionStorage.setItem 'hing-elaborate-users', JSON.stringify @allusers
				# sessionStorage.setItem 'hing-elaborate-annotation-types', JSON.stringify @allannotationtypes

				cb()

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
				error: (model, response) => Backbone.history.navigate 'login', trigger: true if response.status is 401

			new EntryMetadata(@id).fetch (data) =>
				@set 'entrymetadatafields', data
				async.called 'entrymetadatafields'

			settings = new Models.Settings null, projectID: @id
			settings.fetch 
				success: (model) =>
					@set 'settings', model
					async.called 'settings'
				error: (model, response) => Backbone.history.navigate 'login', trigger: true if response.status is 401

		# # If the project is loaded from sessionStorage, settings is an object literal. Convert to Backbone.Model.
		# else if not (@get('settings') instanceof Backbone.Model)
		# 	@allusers = new Collections.Users JSON.parse sessionStorage.getItem 'hing-elaborate-users'
		# 	@allannotationtypes = new Collections.AnnotationTypes JSON.parse sessionStorage.getItem 'hing-elaborate-annotation-types'

		# 	@projectUserIDs = new ProjectUserIDs(@id)
		# 	@projectAnnotationTypeIDs = new ProjectAnnotationTypeIDs(@id)

		# 	@set 'members', new Collections.Users @allusers.filter (model) => @get('annotationtypeIDs').indexOf(model.id) > -1
		# 	@set 'annotationtypes', new Collections.AnnotationTypes @allannotationtypes.filter (model) => @get('userIDs').indexOf(model.id) > -1
		# 	@set 'settings', new Models.Settings @get('settings'), projectID: @id

		# 	cb()

		# If everything is already loaded, just call the callback.
		else
			cb()

	fetchEntrymetadatafields: (cb) ->
		# ajax.token = token.get()
		jqXHR = ajax.get
			url: config.get('restUrl') + "projects/#{@id}/entrymetadatafields"
			dataType: 'text'
		jqXHR.done (response) =>
			@set 'entrymetadatafields', response
			cb()
		jqXHR.fail (response) => Backbone.history.navigate 'login', trigger: true if response.status is 401
			
	publishDraft: (cb) ->
		# ajax.token = token.get()
		jqXHR = ajax.post
			url: config.get('restUrl')+"projects/#{@id}/draft"
			dataType: 'text'
		jqXHR.done =>
			locationUrl = jqXHR.getResponseHeader('Location')
			localStorage.setItem 'publishDraftLocation', locationUrl
			@pollDraft locationUrl, cb
		jqXHR.fail (response) => Backbone.history.navigate 'login', trigger: true if response.status is 401

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
		# ajax.token = token.get()
		jqXHR = ajax.put
			url: config.get('restUrl')+"projects/#{@id}/textlayers"
			data: JSON.stringify @get 'textLayers'
		jqXHR.done => done()
		jqXHR.fail (response) => Backbone.history.navigate 'login', trigger: true if response.status is 401

	sync: (method, model, options) ->
		if method is 'create'
			jqXHR = ajax.post
				url: @url()
				data: JSON.stringify
					title: @get 'title'
				dataType: 'text'

			jqXHR.done (data, textStatus, jqXHR) =>
				if jqXHR.status is 201
					xhr = ajax.get url: jqXHR.getResponseHeader('Location')
					xhr.done (data, textStatus, jqXHR) =>
						options.success data
					xhr.fail => console.log arguments

			jqXHR.fail (response) =>
				Backbone.history.navigate 'login', trigger: true if response.status is 401
		else
			super

module.exports = Project