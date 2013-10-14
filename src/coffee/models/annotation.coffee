define (require) ->

	ajax = require 'hilib/managers/ajax'
	token = require 'hilib/managers/token'
	ajax.token = token.get()

	config = require 'config'

	Models = 
		Base: require 'models/base'

	class Annotation extends Models.Base

		urlRoot: -> config.baseUrl + "projects/#{@collection.projectId}/entries/#{@collection.entryId}/transcriptions/#{@collection.transcriptionId}/annotations"

		set: (attrs, options) ->
			if _.isString(attrs) and attrs.substr(0, 9) is 'metadata.'
				attr = attrs.substr(9)
				@attributes['metadata'][attr] = options
			else
				super


		defaults: ->
			annotationMetadataItems: []
			annotationNo: 'newannotation'
			annotationType:
				id: 1
			body: ''
			createdOn: ''
			creator: null
			modifiedOn: ''
			modifier: null
			metadata: {}

		# get: (attr) ->
		# 	if attr is 'metadata'
		# 		original = @get 'annotationMetadataItems'
		# 		edited = @attributes['metadata']

		# 		return @attributes['metadata']
		# 	else	
		# 		super

		# getMetadata: ->
		# 	console.log @get 'metadata'
		# 	console.log @get 'annotationMetadataItems'

		# 	@get 'metadata'

		sync: (method, model, options) ->
			if method is 'create'
				jqXHR = ajax.post
					url: @url()
					data: JSON.stringify
						body: @get 'body'
						typeId: @get('annotationType').id
						metadata: @get 'metadata'
					dataType: 'text'

				jqXHR.done (data, textStatus, jqXHR) =>
					if jqXHR.status is 201
						xhr = ajax.get url: jqXHR.getResponseHeader('Location')
						xhr.done (data, textStatus, jqXHR) =>
							options.success data

				jqXHR.fail (a, b, c) => console.log 'fail', a, b, c

			else if method is 'update'
				ajax.token = token.get()
				jqXHR = ajax.put
					url: @url()
					data: JSON.stringify
						body: @get 'body'
						typeId: @get('annotationType').id
						metadata: @get 'metadata'
				jqXHR.done (response) => options.success response
				jqXHR.fail (response) => console.log 'fail', response

			else
				super
