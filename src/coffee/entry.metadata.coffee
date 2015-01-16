# Entrymetadata fetches and saves the entry metadata. The fetch returns an array of strings
# and the save puts the entire array to save it.

config = require './models/config'
token = require 'hilib/src/managers/token'
ajax = require 'hilib/src/managers/ajax'

# ## EntryMetadata
class EntryMetadata

	# ### Private vars
	url = null

	# ### Contstructor
	# Set the url based on the projectID
	constructor: (projectID) -> 
		url = "#{config.get('restUrl')}projects/#{projectID}/entrymetadatafields"

	# ### Public methods
	fetch: (cb) ->
		ajax.token = token.get()
		jqXHR = ajax.get url: url

		jqXHR.done (data) -> cb data

	save: (newValues, options) ->
		ajax.token = token.get()
		jqXHR = ajax.put
			url: url
			dataType: 'text'
			data: JSON.stringify newValues
		jqXHR.done => options.success arguments if options.success?
		jqXHR.fail => options.error arguments if options.error?

module.exports = EntryMetadata