define (require) ->
	config = require 'config'

	history = require 'hilib/managers/history'

	Base = require 'collections/base'

	Models =
		Project: require 'models/project/main'

	class Projects extends Base

		model: Models.Project
		
		url: config.baseUrl+'projects'

		getCurrent: (cb) ->
			console.log @current
			if @current?
				cb @current
			else
				console.log 'else'
				@once 'current:change', =>
					console.log 'cb'
					cb @current

		setCurrent: (id) ->
			fragmentPart = if history.last()? then history.last().split('/') else []
			
			if id?
				@current = @.get id
			else if fragmentPart[1] is 'projects'
				@current = @find (p) -> p.get('name') is fragmentPart[2]
			else
				@current = @first()

			@current.load => @trigger 'current:change', @current

			@current


	projects = new Projects()
	projects.fetch success: => projects.setCurrent()

	projects