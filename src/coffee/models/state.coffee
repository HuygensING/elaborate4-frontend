define (require) ->

	# Backbone = require 'backbone'

	history = require 'hilib/managers/history'

	Models = 
		Base: require 'models/base'

	Collections =
		Projects: require 'collections/projects'

	class State extends Models.Base


		defaults: ->
			headerRendered: false
			currentProject: null
			projects: new Collections.Projects()

		initialize: ->
			super

			@subscribe 'authorized', => @getProjects()

		_getCurrentProject: (cb, prop) ->
			# console.log cb
			returnProp = (model) =>
				returnVal = if prop? then model.get(prop) else model
				cb returnVal

			if @get('currentProject')?
				returnProp @get('currentProject')
			else
				@once 'change:currentProject', (stateModel, projectModel, options) =>
					returnProp projectModel

		getCurrentProjectId: (cb) -> @_getCurrentProject cb, 'id'
		getCurrentProjectName: (cb) -> @_getCurrentProject cb, 'name'
		getCurrentProject: (cb) -> @_getCurrentProject cb

		setCurrentProject: (id) ->
			fragmentPart = if history.last()? then history.last().split('/') else []
			
			if id?
				project = @get('projects').get id
			else if fragmentPart[1] is 'projects'
				project = @get('projects').find (p) -> p.get('name') is fragmentPart[2]
			else
				project = @get('projects').first()

			@set 'currentProject', project
			# @currentProjectId = project.id
			# @currentProjectName = project.get('name')

		onHeaderRendered: (cb) ->
			if @get 'headerRendered'
				cb()
			else
				@subscribe 'header:render:complete', -> 
					cb()
					@set 'headerRendered', true


		getProjects: () ->
			@get('projects').fetch
				success: (collection) =>
					@setCurrentProject()
					# @set 'currentProject', collection.first()
				error: (collection, response, options) =>
					if response.status is 401
						@publish 'unauthorized'



	new State()