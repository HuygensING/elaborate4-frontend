config = require 'elaborate-modules/modules/models/config'

ajax = require 'hilib/src/managers/ajax'
token = require 'hilib/src/managers/token'

# Models = 
# 	History: require 'models/project/history'

# Collections =
# 	Base: require 'collections/base'
	# projects: require 'collections/projects'

class ProjectHistory

	fetch: (done) ->
		ajax.token = token.get()
		jqXHR = ajax.get url: @url
		jqXHR.done (response) => done(response)

	constructor: (projectID) ->
		@url = "#{config.get('restUrl')}projects/#{projectID}/logentries"

	# initialize: (models, options) ->
	# 	super

	# 	@projectID = options.projectID

module.exports = ProjectHistory