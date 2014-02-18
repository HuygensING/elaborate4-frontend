config = require '../config'
Base = require './base'

Models =
	Annotation: require '../models/annotation'

class Annotations extends Base

	model: Models.Annotation

	initialize: (models, options) ->
		{@projectId, @entryId, @transcriptionId} = options
	
	url: -> config.baseUrl + "projects/#{@projectId}/entries/#{@entryId}/transcriptions/#{@transcriptionId}/annotations"

module.exports = Annotations