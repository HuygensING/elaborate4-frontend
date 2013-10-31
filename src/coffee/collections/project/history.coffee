# define (require) ->
# 	config = require 'config'

# 	Models = 
# 		History: require 'models/project/history'

# 	Collections =
# 		Base: require 'collections/base'
# 		# projects: require 'collections/projects'

# 	class ProjectHistory extends Collections.Base

# 		model: Models.History

# 		url: -> "#{config.baseUrl}projects/#{@projectID}/logentries"

# 		initialize: (models, options) ->
# 			super

# 			@projectID = options.projectID
define (require) ->
	config = require 'config'

	ajax = require 'hilib/managers/ajax'
	token = require 'hilib/managers/token'

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
			@url = "#{config.baseUrl}projects/#{projectID}/logentries"

		# initialize: (models, options) ->
		# 	super

		# 	@projectID = options.projectID