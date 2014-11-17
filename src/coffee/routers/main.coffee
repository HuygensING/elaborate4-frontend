Backbone = require 'backbone'
_ = require 'underscore'
$ = require 'jquery'

viewManager = require 'hilib/src/managers/view2'
history = require 'hilib/src/managers/history'
Pubsub = require 'hilib/src/mixins/pubsub'
Fn = require 'hilib/src/utils/general'

currentUser = require '../models/currentUser'

Collections =
	projects: require '../collections/projects'

Views =
	Login: require '../views/login'
	SetNewPassword: require '../views/set-new-password'
	NoProject: require '../views/no-project'
	Search: require '../views/project/search'
	EditMetadata: require '../views/project/search/edit-metadata'
	ProjectSettings: require '../views/project/settings/main'
	ProjectHistory: require '../views/project/history'
	Statistics: require '../views/project/statistics'
	Entry: require '../views/entry/main'
	Header: require '../views/ui/header'

class MainRouter extends Backbone.Router

	initialize: ->
		_.extend @, Pubsub

		@on 'route', => history.update()
		@on 'route:search', => Backbone.trigger 'router:search'

	# The init method is manually triggered from app.js, after Backbone.history.start().
	# Ideally we would have this code in the initialize method, but we need to use @navigate
	# which isn't operational yet.
	init: ->
		return if Backbone.history.fragment is 'resetpassword'

		currentUser.authorize
			authorized: =>
				Collections.projects.fetch()
				Collections.projects.getCurrent (@project) =>
					unless @project?

						return @navigate 'noproject', trigger: true
					document.title = "eLaborate - #{@project.get('title')}"
					# Route to correct url
					url = history.last() ? 'projects/'+@project.get('name')
					@navigate url, trigger: true

					header = new Views.Header project: @project
					$('#container').prepend header.el
						# persist: true

					@listenTo Collections.projects, 'current:change', (@project) =>
						viewManager.clear()
						document.title = "eLaborate - #{@project.get('title')}"
						@navigate "projects/#{@project.get('name')}", trigger: true
			unauthorized: => @publish 'login:failed'
			navigateToLogin: => @navigate 'login', trigger: true

	# manageView: (View, options) -> viewManager.show $('div#main'), View, options
	manageView: do ->
		currentView = null
		cache = {}

		(View, viewOptions, options={}) ->
			# Destroy the current view.
			if currentView?
				currentView.destroy() 
				currentView = null

			# Hide all cached views.
			cachedView.$el.hide() for key, cachedView of cache

			# Handle a request for a cached view.
			if options.cache?
				# Create a cached view if it doesn't exist.
				unless cache[options.cache]?
					cache[options.cache] = new View viewOptions
					# Cached views are appended outside the #main div.
					$('div#container').append cache[options.cache].el

				# Show the cached view.
				cache[options.cache].$el.show()
			# Handle a request for a 'normal' view.
			else
				currentView = new View viewOptions
				view = currentView.el
				
				$('div#main').html view


	routes:
		'': 'search'
		'login': 'login'
		'noproject': 'noproject'
		'resetpassword': 'setNewPassword'
		'projects/:name': 'search'
		'projects/:name/edit-metadata': 'editMetadata'
		'projects/:name/settings/:tab': 'projectSettings'
		'projects/:name/settings': 'projectSettings'
		'projects/:name/history': 'projectHistory'
		'projects/:name/statistics': 'statistics'
		'projects/:name/entries/:id': 'entry'
		'projects/:name/entries/:id/transcriptions/:name': 'entry'
		'projects/:name/entries/:id/transcriptions/:name/annotations/:id': 'entry'

	login: ->
		return currentUser.logout() if currentUser.loggedIn
		@manageView Views.Login

	noproject: ->
		# The if-statement is used to redirect the user to login if s/he decides to refresh
		# the page after landing on /noproject.
		if currentUser.loggedIn
			view = new Views.NoProject()
			$('div#main').append view.el

			currentUser.loggedIn = false
			sessionStorage.clear()
		else
			@login()


	setNewPassword: ->
		@login()

		view = new Views.SetNewPassword()
		$('div#main').append view.el


	search: (projectName) ->
		@manageView Views.Search, {projectName: projectName}, {cache: "search-#{projectName}"}

	editMetadata: (projectName) ->
		@manageView Views.EditMetadata, projectName: projectName

	projectSettings: (projectName, tab) ->
		# See search comment
		@manageView Views.ProjectSettings,
			projectName: projectName
			tabName: tab

	projectHistory: (projectName) ->
		# See search comment
		@manageView Views.ProjectHistory,
			projectName: projectName
			cache: false

	statistics: (projectName) ->
		# See search comment
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