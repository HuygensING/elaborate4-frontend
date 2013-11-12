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
	ProjectUserIDs = require 'project.user.ids'
	ProjectAnnotationTypeIDs = require 'project.annotationtype.ids'

	Collections =
		Entries: require 'collections/entries'
		AnnotationTypes: require 'collections/project/annotationtypes'
		# Users: require 'collections/users'

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

		addAnnotationType: (annotationType) ->
			annotationTypes = @get('annotationtypes')
			ids = annotationTypes.pluck 'id'
			ids.push annotationType.id

			@projectAnnotationTypeIDs.save ids,
				success: => annotationTypes.add annotationType

		load: (cb) ->
			if @get('annotationtypes') is null and @get('entrymetadatafields') is null and @get('userIDs').length is 0
				async = new Async ['annotationtypes', 'userIDs', 'entrymetadatafields', 'settings']
				async.on 'ready', (data) => cb()

				new Collections.AnnotationTypes().fetch
					success: (collection, response, options) =>
						@projectAnnotationTypeIDs = new ProjectAnnotationTypeIDs(@id)
						@projectAnnotationTypeIDs.fetch (data) =>
							models = collection.filter (model) -> data.indexOf(model.id) > -1
							@set 'annotationtypes', new Collections.AnnotationTypes models
							async.called 'annotationtypes'

				# Users

				new ProjectUserIDs(@id).fetch (data) =>
					@set 'userIDs', data
					async.called 'userIDs'

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
				
		createDraft: (cb) ->
			ajax.token = token.get()
			jqXHR = ajax.post
				url: config.baseUrl+"projects/#{@id}/draft"
				dataType: 'text'
			jqXHR.done => ajax.poll
				url: jqXHR.getResponseHeader('Location')
				testFn: (data) => data.done
				done: (data, textStatus, jqXHR) =>
					settings = @get('settings')
					settings.set 'publicationURL', data.url
					settings.save null,
						success: =>
							@publish 'message', "Publication <a href='#{data.url}' target='_blank' data-bypass>ready</a>."
							cb()
			jqXHR.fail => console.log arguments

		saveTextlayers: (done) ->
			ajax.token = token.get()
			jqXHR = ajax.put
				url: config.baseUrl+"projects/#{@id}/textlayers"
				data: JSON.stringify @get 'textLayers'
			jqXHR.done => done()

