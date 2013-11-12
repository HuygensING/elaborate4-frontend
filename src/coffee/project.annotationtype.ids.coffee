# Entrymetadata fetches and saves the entry metadata. The fetch returns an array of strings
# and the save puts the entire array to save it.
define (require) ->
	config = require 'config'
	token = require 'hilib/managers/token'
	ajax = require 'hilib/managers/ajax'

	# ## ProjectUserIDs
	class AnnotationTypeIDs

		# ### Private vars
		url = null

		# ### Contstructor
		# Set the url based on the projectID
		constructor: (projectID) -> 
			url = "#{config.baseUrl}projects/#{projectID}/annotationtypes"

		# ### Public methods
		fetch: (cb) ->
			ajax.token = token.get()
			jqXHR = ajax.get url: url

			jqXHR.done (data) -> cb data

		save: (newValues, options={}) ->
			ajax.token = token.get()
			jqXHR = ajax.put
				url: url
				data: JSON.stringify newValues
			jqXHR.done => options.success() if options.success?