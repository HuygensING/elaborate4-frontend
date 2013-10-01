# Entrymetadata fetches and saves the entry metadata. The fetch returns an array of strings
# and the save puts the entire array to save it.
define (require) ->
	config = require 'config'
	token = require 'managers/token'
	ajax = require 'managers/ajax'

	Models = 
		state: require 'models/state'

	# ## EntryMetadata
	class EntryMetadata

		# ### Private vars
		url = null

		# ### Contstructor
		# Set the url based on the projectID
		constructor: (projectID) -> 
			url = "#{config.baseUrl}projects/#{projectID}/entrymetadatafields"

		# ### Public methods
		fetch: (cb) ->
			ajax.token = token.get()
			jqXHR = ajax.get url: url

			jqXHR.done (data) ->
				cb data

		save: (newValues) ->
			ajax.token = token.get()
			jqXHR = ajax.put
				url: url
				data: newValues