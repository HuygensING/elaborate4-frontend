Backbone = require 'backbone'
Entry = require '../models/entry'

class Entries extends Backbone.Collection
	model: Entry

	initialize: ->
		@current = null

	# ### Methods

	setCurrent: (modelId) ->
		@current = @get modelId
		@trigger 'change:current', @current


	prevUrl: -> 
		currentIndex = @indexOf @current
		entry = @at(--currentIndex)
		
		if entry? then entry.createUrl() else null


	nextUrl: ->
		currentIndex = @indexOf @current
		entry = @at(++currentIndex)
		
		if entry? then entry.createUrl() else null

	prevEntry: (id) ->
		idx = _.indexOf @entries(), String id
		if idx > 0
			@entries()[idx - 1]

	nextEntry: (id) ->
		idx = _.indexOf @entries(), String id
		if idx + 1 < @entries().length
			@entries()[idx + 1]

	# # URL for the entry after passed ID
	# nextEntryURL: (id) ->
	# 	@entryURL @nextEntry id
	
	# # URL for the entry before passed ID
	# prevEntryURL: (id) ->
	# 	@entryURL @prevEntry id

module.exports = new Entries()