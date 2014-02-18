config = require '../../config'
Base = require '../base'

Models =
	AnnotationType: require '../../models/project/annotationtype'

class AnnotationTypes extends Base

	model: Models.AnnotationType

	# initialize: (models, options) ->
	# 	super

	# 	@projectId = options.projectId
	
	url: -> config.baseUrl + "annotationtypes"

	comparator: (annotationType) -> annotationType.get('title').toLowerCase()

module.exports = AnnotationTypes