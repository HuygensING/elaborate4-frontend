define (require) ->
	config = require 'config'
	Base = require 'collections/base'

	Models =
		AnnotationType: require 'models/project/annotationtype'

	class AnnotationTypes extends Base

		model: Models.AnnotationType

		initialize: (models, options) ->
			super

			@projectId = options.projectId
		
		url: -> config.baseUrl + "projects/#{@projectId}/annotationtypes"

		comparator: (annotationType) -> annotationType.get 'description'