config = require '../../models/config'

ajax = require 'hilib/src/managers/ajax'
# token = require 'hilib/src/managers/token'

# Models = 
# 	History: require 'models/project/history'

# Collections =
# 	Base: require 'collections/base'
	# projects: require 'collections/projects'

class ProjectHistory

	fetch: (done) ->
		jqXHR = ajax.get url: @url
		jqXHR.done (response) => done(response)
		jqXHR.fail (response) => Backbone.history.navigate 'login', trigger: true if response.status is 401

	constructor: (projectID) ->
		@url = "#{config.get('restUrl')}projects/#{projectID}/logentries"

module.exports = ProjectHistory