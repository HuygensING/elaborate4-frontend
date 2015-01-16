_ = require 'underscore'
config = require '../config'

ajax = require 'hilib/src/managers/ajax'
# token = require 'hilib/src/managers/token'

syncOverride = require 'hilib/src/mixins/model.sync'

Models = 
	Base: require '../base'

class AnnotationType extends Models.Base

	urlRoot: -> config.get('restUrl') + "annotationtypes"

	defaults: ->
		creator: null
		modifier: null
		name: ''
		description: ''
		annotationTypeMetadataItems: []
		createdOn: ''
		modifiedOn: ''

	initialize: ->
		super

		_.extend @, syncOverride

	parse: (attrs) ->
		attrs.title = attrs.name

		attrs

	sync: (method, model, options) ->
		if method is 'create'
			# ajax.token = token.get()
			jqXHR = ajax.post
				url: @url()
				dataType: 'text'
				data: JSON.stringify
					name: model.get 'name'
					description: model.get 'description'
			jqXHR.done (data, textStatus, jqXHR) =>
				if jqXHR.status is 201
					xhr = ajax.get url: jqXHR.getResponseHeader('Location')
					xhr.done (data, textStatus, jqXHR) =>
						options.success data
			jqXHR.fail (response) => Backbone.history.navigate 'login', trigger: true if response.status is 401
		else if method is 'update'
			# ajax.token = token.get()
			jqXHR = ajax.put
				url: @url()
				data: JSON.stringify
					name: model.get 'name'
					description: model.get 'description'
			# Options.success is not called, because the server does not respond with the updated model.
			jqXHR.done (response) => @trigger 'sync'
			jqXHR.fail (response) => Backbone.history.navigate 'login', trigger: true if response.status is 401

		else
			super
			
module.exports = AnnotationType