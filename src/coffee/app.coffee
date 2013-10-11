define (require) ->
	Backbone = require 'backbone'


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

		
		# Models.currentUser.once 'authorized', -> 
		# Models.currentUser.once 'unauthorized', ->

		Models.currentUser.authorize
			authorized: =>
				# projects = require 'collections/projects'
				projects.getCurrent (current) ->
					header = new Views.Header managed: false
					$('#container').prepend header.render().$el

					Backbone.history.start pushState: true
					console.log 'projects/'+projects.current.get('name')
					mainRouter.navigate 'projects/'+projects.current.get('name'), trigger: true
			unauthorized: =>
				Backbone.history.start pushState: true
				mainRouter.navigate 'login', trigger: true
		# $('body').append new Views.Debug(managed: false).$el


		$(document).on 'click', 'a:not([data-bypass])', (e) ->
			href = $(@).attr 'href'
			
			if href?
				e.preventDefault()

				Backbone.history.navigate href, 'trigger': true