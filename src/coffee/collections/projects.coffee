Backbone = require 'backbone'
_ = require 'underscore'

config = require '../models/config'

history = require 'hilib/src/managers/history'

Base = require './base'

Models =
	Project: require '../models/project/main'

class Projects extends Base

	model: Models.Project
	
	url: config.get('restUrl')+'projects'

	initialize: ->
		super()

		@on 'sync', @setCurrent, @

	fetch: (options={}) ->
		unless options.error
			options.error = (collection, response, options) =>
				if response.status is 401
					sessionStorage.clear()
					Backbone.history.navigate 'login', trigger: true 
		super options

	getCurrent: (cb) ->
		if @current? then cb @current else @once 'current:change', => cb @current

	# setCurrent is called everytime the collections syncs, in these cases the parameter id can be
	# a Backbone.Model (create/POST) or a Backbone.Collection (fetch/GET). If setCurrent is called
	# with an id, it should be a Number.
	setCurrent: (id) ->
		id = id.id if id instanceof Backbone.Model

		fragmentPart = if history.last()? then history.last().split('/') else []

		# console.log id, fragmentPart, arguments
		if _.isNumber(id)
			@current = @.get id
		else if fragmentPart[1] is 'projects'
			@current = @find (p) -> p.get('name') is fragmentPart[2]
		else
			@current = @first()

		# If @current does not exist, the user is not assigned to any projects.
		# Skip the loading of the current project and trigger the change with
		# the current undefined project. The listener will pick up the undefined
		# and tell the view to take action.
		return @trigger 'current:change', @current unless @current?

		@current.load => 
			config.set 'entryTermSingular', @current.get('settings').get('entry.term_singular')
			config.set 'entryTermPlural', @current.get('settings').get('entry.term_plural')
			
			@trigger 'current:change', @current

		@current

module.exports = new Projects()
