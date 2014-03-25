config = require '../../config'
token = require 'hilib/src/managers/token'
ajax = require 'hilib/src/managers/ajax'

Models = 
	Base: require '../base'

class ProjectSettings extends Models.Base

	validation:
		name:
			'min-length': 3
			'max-length': 20
			pattern: 'slug'

	# Change defaults with spaces like Project title and Project leader. These are not
	# proper attribute keys and break the label/input connection in hilib forms.
	defaults: ->
		'Project leader': ''
		'Project title': ''
		'projectType': ''
		'publicationURL': ''
		'Release date': ''
		'Start date': ''
		'Version': ''
		'entry.term_singular': 'entry'
		'entry.term_plural': 'entries'
		'text.font': ''
		'name': ''

	url: -> "#{config.baseUrl}projects/#{@options.projectId}/settings"

	initialize: (attrs, @options) ->
		super

		# TMP
		@options.projectId = @options.projectID
		@projectID = @options.projectID

	sync: (method, model, options) ->
		# TODO When is create used??
		if method is 'create'
			ajax.token = token.get()
			jqXHR = ajax.put
				url: @url()
				data: JSON.stringify(@)
			jqXHR.done (response) => options.success response
			jqXHR.fail (response) => Backbone.history.navigate 'login', trigger: true if response.status is 401
		else
			super method, model, options

module.exports = ProjectSettings