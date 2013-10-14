define (require) ->

	Models = 
		Base: require 'models/base'

	class AnnotationType extends Models.Base

		defaults: ->
			creator: null
			modifier: null
			name: ''
			description: ''
			annotationTypeMetadataItems: []
			createdOn: ''
			modifiedOn: ''