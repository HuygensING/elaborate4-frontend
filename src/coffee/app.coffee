define (require) ->
	Backbone = require 'backbone'

	history = require 'hilib/managers/history'

	MainRouter = require 'routers/main'

	Models =
		currentUser: require 'models/currentUser'

	projects = require 'collections/projects'

	Views =
		Header: require 'views/ui/header'

	### DEBUG ###
	Backbone.on 'authorized', -> console.log '[debug] authorized'
	Backbone.on 'unauthorized', -> console.log '[debug] unauthorized'
	### /DEBUG ###

	init: ->
		mainRouter = new MainRouter()
		Backbone.history.start pushState: true

		Models.currentUser.authorize
			authorized: =>
				projects.fetch()
				projects.getCurrent (current) ->
					# Route to correct url
					url = history.last() ? 'projects/'+projects.current.get('name')
					mainRouter.navigate url, trigger: true

			unauthorized: =>
				mainRouter.navigate 'login', trigger: true

		$(document).on 'click', 'a:not([data-bypass])', (e) ->
			href = $(@).attr 'href'
			
			if href?
				e.preventDefault()

				Backbone.history.navigate href, 'trigger': true