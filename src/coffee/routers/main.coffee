Backbone = require 'backbone'
_ = require 'underscore'
$ = require 'jquery'

viewManager = require 'hilib/src/managers/view2'
history = require 'hilib/src/managers/history'
Pubsub = require 'hilib/src/mixins/pubsub'
Fn = require 'hilib/src/utils/general'

Models =
	currentUser: require '../models/currentUser'

Collections =
	projects: require '../collections/projects'

Views =
	Login: require '../views/login'
	SetNewPassword: require '../views/set-new-password'
	ProjectMain: require '../views/project/search'
	ProjectSettings: require '../views/project/settings/main'
	ProjectHistory: require '../views/project/history'
	Statistics: require '../views/project/statistics'
	Entry: require '../views/entry/main'
	Header: require '../views/ui/header'

class MainRouter extends Backbone.Router

	initialize: ->
		_.extend @, Pubsub

		@on 'route', => history.update()
		@on 'route:projectMain', => Backbone.trigger 'router:search'

	# The init method is manually triggered from app.js, after Backbone.history.start().
	# Ideally we would have this code in the initialize method, but we need to use @navigate
	# which isn't operational yet.
	init: ->
		return if Backbone.history.fragment is 'resetpassword'

		Models.currentUser.authorize
			authorized: =>
				Collections.projects.fetch()
				Collections.projects.getCurrent (@project) =>
					# Route to correct url
					url = history.last() ? 'projects/'+@project.get('name')
					@navigate url, trigger: true

					header = new Views.Header project: @project
					$('header.main').html header.el
						# persist: true
					
					@listenTo Collections.projects, 'current:change', (@project) => @navigate "projects/#{@project.get('name')}", trigger: true
			unauthorized: => @publish 'login:failed'
			navigateToLogin: => @navigate 'login', trigger: true

	manageView: (View, options) -> viewManager.show $('div#main'), View, options

	routes:
		'': 'projectMain'
		'login': 'login'
		'resetpassword': 'setNewPassword'
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
		# Hide the main header, because when we logout after sessionStorage has been set,
		# the header is already loaded and displayed.
		$('header.main').hide()
		@manageView Views.Login

	setNewPassword: ->
		@login()

		view = new Views.SetNewPassword()
		$('div#main').append view.el
		

	projectMain: (projectName) ->
		# In theory we don't have to pass the projectName, because it is known
		# through Collections.project.current, but we need to send it for the viewManager
		# so it doesn't cache the same view for different projects.
		@manageView Views.ProjectMain, projectName: projectName

	projectSettings: (projectName, tab) ->
		# See projectMain comment
		@manageView Views.ProjectSettings,
			projectName: projectName
			tabName: tab

	projectHistory: (projectName) ->
		# See projectMain comment
		@manageView Views.ProjectHistory, projectName: projectName

	statistics: (projectName) ->
		# See projectMain comment
		@manageView Views.Statistics, 
			projectName: projectName
			cache: false

	# An entry might be editted outside the entry view (where it would update the DOM),
	# for instance when editting multiple metadata, so we check the IDs of changed entries
	# and set options.cache according.
	entry: (projectName, entryID, transcriptionName, annotationID) ->
		attrs =
			projectName: projectName
			entryId: entryID
			transcriptionName: transcriptionName
			annotationID: annotationID

		changedIndex = @project.get('entries').changed.indexOf +entryID if @project?
		if changedIndex > -1
			# Remove entryID from changed array.
			@project.get('entries').changed.splice changedIndex, 1

			# Set cache value to false, to tell viewManager to rerender view.
			attrs.cache = false 

		@manageView Views.Entry, attrs

module.exports = new MainRouter()