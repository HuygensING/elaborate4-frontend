_ = require 'underscore'

config = require '../models/config'
Base = require './base'
StringFn = require 'hilib/src/utils/string'

Models =
	Transcription: require '../models/transcription'

class Transcriptions extends Base

	model: Models.Transcription

	initialize: (models, options) ->
		@projectId = options.projectId
		@entryId = options.entryId

		@on 'remove', (model) => model.destroy()
	
	url: -> config.get('restUrl') + "projects/#{@projectId}/entries/#{@entryId}/transcriptions"

	getCurrent: (cb) ->
		if @current? then cb @current else @once 'current:change', => cb @current

	setCurrent: (model) ->
		if not model? or model isnt @current
			if _.isString model
				transcriptionName = model
				@current = @find (model) => StringFn.slugify(model.get('textLayer')) is StringFn.slugify(transcriptionName)
			else
				if model?
					@current = model
				else
					# Default to the Diplomatic text layer
					@current = @first()

			@trigger 'current:change', @current

		@current

module.exports = Transcriptions