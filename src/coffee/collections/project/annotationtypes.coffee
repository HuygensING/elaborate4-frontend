config = require 'elaborate-modules/modules/models/config'
Base = require '../base'

Models =
	AnnotationType: require '../../models/project/annotationtype'

class AnnotationTypes extends Base

	model: Models.AnnotationType

	# initialize: (models, options) ->
	# 	super

	# 	@projectId = options.projectId
	
	url: -> config.get('restUrl') + "annotationtypes"

	comparator: (annotationType) -> annotationType.get('title').toLowerCase()

module.exports = AnnotationTypes