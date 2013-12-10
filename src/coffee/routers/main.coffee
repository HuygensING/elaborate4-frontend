define (require) ->
	Backbone = require 'backbone'

	viewManager = require 'hilib/managers/view'
	history = require 'hilib/managers/history'
	Pubsub = require 'hilib/mixins/pubsub'
	Fn = require 'hilib/functions/general'

	Models =
		currentUser: require 'models/currentUser'

	Collections =
		projects: require 'collections/projects'

	Views =
		Login: require 'views/login'
		ProjectMain: require 'views/project/main'
		ProjectSettings: require 'views/project/settings'
		ProjectHistory: require 'views/project/history'
		Statistics: require 'views/project/statistics'
		Entry: require 'views/entry/main'
		Header: require 'views/ui/header'

	class MainRouter extends Backbone.Router

		initialize: ->
			_.extend @, Pubsub

			@on 'route', => history.update()

		# The init method is manually triggered from app.js, after Backbone.history.start().
		# Ideally we would have this code in the initialize method, but we need to use @navigate
		# which isn't operational yet.
		init: ->
			Models.currentUser.authorize
				authorized: =>
					Collections.projects.fetch()
					Collections.projects.getCurrent (@project) =>
						# Route to correct url
						url = history.last() ? 'projects/'+@project.get('name')
						@navigate url, trigger: true

						viewManager.show 'header.main', Views.Header,
							project: @project
							prepend: true
							# persist: true
						
						@listenTo Collections.projects, 'current:change', (@project) =>
							# Clear cache when we switch project
							viewManager.clearCache()
							@navigate "projects/#{@project.get('name')}", trigger: true

				unauthorized: =>
					@navigate 'login', trigger: true


			# Start listening to current project change after the first one is set (otherwise it will trigger on page load)
			# Collections.projects.getCurrent (@project) =>

		manageView: (View, options) -> viewManager.show 'div#main', View, options

		routes:
			'': 'projectMain'
			'login': 'login'
			'projects/:name': 'projectMain'
			'projects/:name/settings/:tab': 'projectSettings'
			'projects/:name/settings': 'projectSettings'
			'projects/:name/history': 'projectHistory'
			'projects/:name/statistics': 'statistics'
			'projects/:name/entries/:id': 'entry'
			'projects/:name/entries/:id/transcriptions/:name': 'entry'
			'projects/:name/entries/:id/transcriptions/:name/annotations/:id': 'entry'

		# home: ->
		# 	view = new Views.Home

		login: ->
			@manageView Views.Login

		projectMain: (name) ->
			@manageView Views.ProjectMain

		projectSettings: (name, tab) ->
			@manageView Views.ProjectSettings, tabName: tab

		projectHistory: (name) ->
			@manageView Views.ProjectHistory

		statistics: ->
			@manageView Views.Statistics

		entry: (projectName, entryID, transcriptionName, annotationID) ->
			@manageView Views.Entry,
				entryId: entryID
				transcriptionName: transcriptionName
				annotationID: annotationID