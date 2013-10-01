define (require) ->
	Backbone = require 'backbone'
	viewManager = require 'managers/view'
	history = require 'managers/history'

	Pubsub = require 'managers/pubsub'
	currentUser = require 'models/currentUser'
	Fn = require 'helpers/general'

	Models =
		state: require 'models/state'

	Views =
		Login: require 'views/login'
		ProjectMain: require 'views/project/main'
		ProjectSettings: require 'views/project/settings'
		ProjectHistory: require 'views/project/history'
		Entry: require 'views/entry/main'

	class MainRouter extends Backbone.Router

		initialize: ->
			_.extend @, Pubsub

			@on 'route', -> history.update()

			@subscribe 'authorized', =>
				if history.last() is '/login'
					@publish 'navigate:project'
				else
					@navigate history.last(), trigger: true

			@subscribe 'unauthorized', =>
				sessionStorage.clear()
				@navigate 'login', trigger: true if Backbone.history.fragment isnt 'login' # Check for current route cuz unauthorized can be fired multiple times (from multiple sources)

			@subscribe 'navigate:project:settings', =>
				Models.state.getCurrentProjectName (name) =>
					@navigate "projects/#{name}/settings", trigger: true

			@subscribe 'navigate:project:history', =>
				Models.state.getCurrentProjectName (name) =>
					@navigate "projects/#{name}/history", trigger: true

			@subscribe 'navigate:project', =>
				Models.state.getCurrentProjectName (name) =>
					@navigate "projects/#{name}", trigger: true

			@subscribe 'navigate:entry', (entryID) =>
				Models.state.getCurrentProjectName (name) =>
					@navigate "projects/#{name}/entries/#{entryID}", trigger: true

			# @subscribe 'navigate:entry', (id) =>
			# 	Models.state.getCurrentProjectName (name) =>
			# 		@navigate "projects/#{name}/entries/#{id}", trigger: true

			# @subscribe 'entries:current:change', (model) =>
			# 	Models.state.getCurrentProjectName (name) =>
			# 		@navigate "projects/#{name}/entries/#{model.id}", trigger: true

		'routes':
			'': 'projectSearch'
			'login': 'login'
			'projects/:name': 'projectSearch'
			'projects/:name/settings/:tab': 'projectSettings'
			'projects/:name/settings': 'projectSettings'
			'projects/:name/history': 'projectHistory'
			'projects/:name/entries/:id': 'entry'
			'projects/:name/entries/:id/transcriptions/:name': 'entry'
			'projects/:name/entries/:id/transcriptions/:name/annotations/:id': 'entry'

		home: ->
			viewManager.show Views.Home

		login: ->
			viewManager.show Views.Login

		projectSearch: (name) ->
			viewManager.show Views.ProjectMain

		projectSettings: (name, tab) ->
			viewManager.show Views.ProjectSettings,
				tabName: tab

		projectHistory: (name) ->
			viewManager.show Views.ProjectHistory

		entry: (projectName, entryID, transcriptionName, annotationID) ->
			viewManager.show Views.Entry, 
				entryId: entryID
				transcriptionName: transcriptionName
				annotationID: annotationID