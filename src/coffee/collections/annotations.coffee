config = require '../models/config'
Base = require './base'

Models =
	Annotation: require '../models/annotation'

class Annotations extends Base

	model: Models.Annotation

	initialize: (models, options) ->
		{@projectId, @entryId, @transcriptionId} = options
	
	url: -> "#{config.get('restUrl')}projects/#{@projectId}/entries/#{@entryId}/transcriptions/#{@transcriptionId}/annotations"

module.exports = Annotations