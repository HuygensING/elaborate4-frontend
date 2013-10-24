define (require) ->
	Backbone = require 'backbone'

	history = require 'hilib/managers/history'

	MainRouter = require 'routers/main'

	Models =
		currentUser: require 'models/currentUser'
		# state: require 'models/state'

	projects = require 'collections/projects'

	Views =
		Header: require 'views/ui/header'
	# 	Debug: require 'views/debug'
		# 'ProjectNav': require 'views/ui/nav.project'
		# 'UserNav': require 'views/ui/nav.user'

	### DEBUG ###
	Backbone.on 'authorized', -> console.log '[debug] authorized'
	Backbone.on 'unauthorized', -> console.log '[debug] unauthorized'
	# Models.state.on 'change:currentProject', -> console.log '[debug] current project changed'
	### /DEBUG ###

	init: ->
		# projects.once 'current:change', (current) ->
		mainRouter = new MainRouter()
		Backbone.history.start pushState: true
		
		# Models.currentUser.once 'authorized', -> 
		# Models.currentUser.once 'unauthorized', ->

		Models.currentUser.authorize
			authorized: =>
				projects.fetch()
				projects.getCurrent (current) ->
					# Place header
					header = new Views.Header
						project: current
						managed: false
					$('#container').prepend header.render().$el

					# Route to correct url
					url = history.last() ? 'projects/'+projects.current.get('name')
					mainRouter.navigate url, trigger: true

			unauthorized: =>
				mainRouter.navigate 'login', trigger: true

		# $('body').append new Views.Debug(managed: false).$el


		$(document).on 'click', 'a:not([data-bypass])', (e) ->
			href = $(@).attr 'href'
			
			if href?
				e.preventDefault()

				Backbone.history.navigate href, 'trigger': true