define (require) ->
	Backbone = require 'backbone'

	ajax = require 'hilib/managers/ajax'
	token = require 'hilib/managers/token'
	ajax.token = token.get()

	changedSinceLastSave = require 'hilib/mixins/model.changedsincelastsave'

	config = require 'config'

	Models = 
		Base: require 'models/base'

	class Annotation extends Models.Base

		urlRoot: -> config.baseUrl + "projects/#{@collection.projectId}/entries/#{@collection.entryId}/transcriptions/#{@collection.transcriptionId}/annotations"

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

		# ### Initialize
		initialize: ->
			super

			_.extend @, changedSinceLastSave(['body'])
			@initChangedSinceLastSave()

		# ### Overrides

		# The annotation metadata is send from the server in nested objects. We create a new object (metadata)
		# and popuplate it with metadata like so: {key: value, key2: value2, ...}
		parse: (attrs) ->
			if attrs?
				attrs.metadata = {}
				# Loop all the annotation metadata (this object does not contain the values)
				# console.log attrs.annotationType
				for metadataItem in attrs.annotationType.metadataItems
					key = metadataItem.name

					# Find the value corresponding to the key in the annotationMetadataItems object
					item = _.find attrs.annotationMetadataItems, (item) -> item.annotationTypeMetadataItem.name is key
					value = if item? then item.data else ''

					attrs.metadata[key] = value

				attrs

		set: (attrs, options) ->
			if _.isString(attrs) and attrs.substr(0, 9) is 'metadata.'
				attr = attrs.substr(9)
				if attr is 'type'
					@trigger('change:metadata:type', parseInt(options, 10)) if attr is 'type'
				else
					@attributes['metadata'][attr] = options
			else
				super

		# sync: (method, model, options) ->
		# 	if method is 'create' or method is 'update'
		# 		options.attributes = ['body', 'typeId', 'metadata']
		# 		@syncOverride method, model, options
		# 	else
		# 		super
	
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
							console.log 'done!'
							options.success data
						xhr.fail => console.log arguments

				jqXHR.fail (response) =>
					Backbone.history.navigate 'login', trigger: true if response.status is 401

			else if method is 'update'
				ajax.token = token.get()
				jqXHR = ajax.put
					url: @url()
					data: JSON.stringify
						body: @get 'body'
						typeId: @get('annotationType').id
						metadata: @get 'metadata'
				jqXHR.done (response) => options.success response
				jqXHR.fail (response) => Backbone.history.navigate 'login', trigger: true if response.status is 401

			else
				super

		# ### Methods
		updateFromClone: (clone) ->
			@set 'annotationType', clone.get 'annotationType'
			@set 'metadata', clone.get 'metadata'
