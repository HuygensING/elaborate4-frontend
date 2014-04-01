Backbone = require 'backbone'
config = require 'elaborate-modules/modules/models/config'

Models = 
	Base: require './base'

class EntrySettings extends Models.Base

	initialize: (models, options) ->
		@projectId = options.projectId
		@entryId = options.entryId

		@once 'sync', =>
			@on 'change', => Backbone.trigger 'change:entry-metadata'
	
	url: -> config.get('restUrl') + "projects/#{@projectId}/entries/#{@entryId}/settings"

	sync: (method, model, options) ->
		method = 'update' if method is 'create'

		super

module.exports = EntrySettings