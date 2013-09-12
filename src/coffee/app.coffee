define (require) ->
	Backbone = require 'backbone'


	MainRouter = require 'routers/main'

	Models =
		currentUser: require 'models/currentUser'
		state: require 'models/state'

	Views =
		Header: require 'views/ui/header'
		Debug: require 'views/debug'
		# 'ProjectNav': require 'views/ui/nav.project'
		# 'UserNav': require 'views/ui/nav.user'

	### DEBUG ###
	Backbone.on 'authorized', -> console.log '[debug] authorized'
	Backbone.on 'unauthorized', -> console.log '[debug] unauthorized'
	Models.state.on 'change:currentProject', -> console.log '[debug] current project changed'
	### /DEBUG ###

	init: ->
		mainRouter = new MainRouter()
		Backbone.history.start pushState: true

		header = new Views.Header managed: false
		$('#container').prepend header.$el

		$('body').append new Views.Debug(managed: false).$el

		Models.currentUser.authorize()

		$(document).on 'click', 'a:not([data-bypass])', (e) ->
			href = $(@).attr 'href'
			
			if href?
				e.preventDefault()

				Backbone.history.navigate href, 'trigger': true