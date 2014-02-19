_ = require 'underscore'

config = require '../config'

history = require 'hilib/src/managers/history'

Base = require './base'

Models =
	Project: require '../models/project/main'

class Projects extends Base

	model: Models.Project
	
	url: config.baseUrl+'projects'

	initialize: ->
		super

		@on 'sync', @setCurrent, @
		# @fetch()
	# fetch: (options={}) ->
	# 	options.success = => @setCurrent()

	# 	super

	fetch: (options={}) ->
		unless options.error
			options.error = (collection, response, options) =>
				if response.status is 401
					sessionStorage.clear()
					Backbone.history.navigate 'login', trigger: true 
		super options

	getCurrent: (cb) ->
		if @current? then cb @current else @once 'current:change', => cb @current

	setCurrent: (id) ->
		fragmentPart = if history.last()? then history.last().split('/') else []

		if id? and _.isString(id)
			@current = @.get id
		else if fragmentPart[1] is 'projects'
			@current = @find (p) -> p.get('name') is fragmentPart[2]
		else
			@current = @first()

		@current.load => @trigger 'current:change', @current

		@current


module.exports = new Projects()
# projects.fetch success: => 
# 	console.log 'success'
# 	projects.setCurrent()

# projects