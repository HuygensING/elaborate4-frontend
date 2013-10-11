define (require) ->
	Backbone = require 'backbone'
	viewManager = require 'hilib/managers/view'
	history = require 'hilib/managers/history'

	Pubsub = require 'hilib/managers/pubsub'
	currentUser = require 'models/currentUser'
	Fn = require 'hilib/functions/general'

	# Collections =
	# 	projects: require 'collections/projects'

	# Models =
	# 	state: require 'models/state'

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

			# @subscribe 'authorized', =>
			# 	console.log 'authorized'
			# 	if history.last()?
			# 		@navigate history.last(), trigger: true
			# 	else
			# 		console.log Collections.projects.current
			# 		@navigate "projects/#{Collections.projects.current.get('name')}", trigger: true

			# @subscribe 'unauthorized', =>
			# 	console.log 'unauthorized'
			# 	sessionStorage.clear()
			# 	@navigate 'login', trigger: true if Backbone.history.fragment isnt 'login' # Check for current route cuz unauthorized can be fired multiple times (from multiple sources)

			# @subscribe 'navigate:project:settings', =>
				# console.log 'navigate:project:settings'
				# Models.state.getCurrentProjectName (name) =>
				# 	@navigate "projects/#{name}/settings", trigger: true

			# @subscribe 'navigate:project:history', =>
				# console.log 'navigate:project:history'
				# Models.state.getCurrentProjectName (name) =>
				# 	@navigate "projects/#{name}/history", trigger: true

			# @subscribe 'navigate:project', =>
				# console.log 'navigate:project'
				# Models.state.getCurrentProjectName (name) =>
				# 	@navigate "projects/#{name}", trigger: true

			# @subscribe 'navigate:entry', (entryID) =>
				# console.log 'navigate:entry'
				# Models.state.getCurrentProjectName (name) =>
				# 	@navigate "projects/#{name}/entries/#{entryID}", trigger: true

		'routes':
			# '': 'project'
			'login': 'login'
			'projects/:name': 'project'
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

		project: (name) ->
			viewManager.show Views.ProjectMain if currentUser.loggedIn

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