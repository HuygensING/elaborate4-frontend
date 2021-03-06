# Entrymetadata fetches and saves the entry metadata. The fetch returns an array of strings
# and the save puts the entire array to save it.

config = require './models/config'
token = require 'hilib/src/managers/token'
ajax = require 'hilib/src/managers/ajax'

# ## ProjectUserIDs
class ProjectUserIDs

	# ### Private vars
	url = null

	# ### Contstructor
	# Set the url based on the projectID
	constructor: (projectID) -> 
		url = "#{config.get('restUrl')}projects/#{projectID}/projectusers"

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

module.exports = ProjectUserIDs