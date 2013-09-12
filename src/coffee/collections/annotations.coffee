define (require) ->
	config = require 'config'
	Base = require 'collections/base'

	Models =
		Annotation: require 'models/annotation'

	class Annotations extends Base

		model: Models.Annotation

		initialize: (models, options) ->
			{@projectId, @entryId, @transcriptionId} = options

			@fetch()
		
		url: -> config.baseUrl + "projects/#{@projectId}/entries/#{@entryId}/transcriptions/#{@transcriptionId}/annotations"