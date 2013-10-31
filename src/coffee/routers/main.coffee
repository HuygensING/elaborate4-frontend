define (require) ->
	Backbone = require 'backbone'

	viewManager = require 'hilib/managers/view'
	history = require 'hilib/managers/history'
	Pubsub = require 'hilib/mixins/pubsub'
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
				@listenTo Collections.projects, 'current:change', (project) =>
					# Clear cache when we switch project
					viewManager.clearCache()
					@navigate "projects/#{project.get('name')}", trigger: true

		manageView: (View, options) -> viewManager.show 'div#main', View, options

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
		# 	view = new Views.Home

		login: ->
			@manageView Views.Login

		project: (name) ->
			@manageView Views.ProjectMain

		projectSettings: (name, tab) ->
			@manageView Views.ProjectSettings, tabName: tab

		projectHistory: (name) ->
			@manageView Views.ProjectHistory

		entry: (projectName, entryID, transcriptionName, annotationID) ->
			@manageView Views.Entry,
				entryId: entryID
				transcriptionName: transcriptionName
				annotationID: annotationID