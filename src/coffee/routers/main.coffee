define (require) ->
	Backbone = require 'backbone'

	viewManager = require 'hilib/managers/view'
	history = require 'hilib/managers/history'
	Pubsub = require 'hilib/managers/pubsub'
	Fn = require 'hilib/functions/general'

	Collections =
		projects: require 'collections/projects'

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

			# Start listening to current project change after the first one is set (otherwise it will trigger on page load)
			Collections.projects.getCurrent =>
				@listenTo Collections.projects, 'current:change', (project) => @navigate "projects/#{project.get('name')}", trigger: true

		'routes':
			'': 'project'
			'login': 'login'
			'projects/:name': 'project'
			'projects/:name/settings/:tab': 'projectSettings'
			'projects/:name/settings': 'projectSettings'
			'projects/:name/history': 'projectHistory'
			'projects/:name/entries/:id': 'entry'
			'projects/:name/entries/:id/transcriptions/:name': 'entry'
			'projects/:name/entries/:id/transcriptions/:name/annotations/:id': 'entry'

		# home: ->
		# 	viewManager.show Views.Home

		login: ->
			viewManager.show Views.Login

		project: (name) ->
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