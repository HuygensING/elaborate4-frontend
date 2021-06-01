Backbone = require 'backbone'
config = require '../config'
# token = require 'hilib/src/managers/token'
ajax = require 'hilib/src/managers/ajax'

Models =
	Base: require '../base'

class ProjectSettings extends Models.Base

	validation:
		name:
			'min-length': 3
			'max-length': 40
			pattern: 'slug'

	parse: (attrs) ->
		if attrs?
			if attrs.hasOwnProperty 'wordwrap'
				attrs.wordwrap = attrs.wordwrap is "true"

			if attrs.hasOwnProperty 'results-per-page'
				attrs['results-per-page'] = +attrs['results-per-page']

		attrs

	set: (attrs, options) ->
		if attrs is 'results-per-page'
			options = +options
		else if attrs.hasOwnProperty 'results-per-page'
			attrs['results-per-page'] = +attrs['results-per-page']

		super()

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
		'wordwrap': false
		'results-per-page': 10

	url: -> "#{config.get('restUrl')}projects/#{@options.projectId}/settings"

	initialize: (attrs, @options) ->
		super()

		# TMP
		@options.projectId = @options.projectID
		@projectID = @options.projectID

	sync: (method, model, options) ->
		# TODO When is create used??
		if method is 'create'
			# ajax.token = token.get()
			jqXHR = ajax.put
				url: @url()
				data: JSON.stringify(@)
			jqXHR.done (response) => options.success response
			jqXHR.fail (response) => Backbone.history.navigate 'login', trigger: true if response.status is 401
		else
			super method, model, options

module.exports = ProjectSettings
