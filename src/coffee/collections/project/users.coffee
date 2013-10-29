# # GET "#{config.baseUrl}projects/#{@projectID}/users" => get's full users
# # GET "#{config.baseUrl}projects/#{@projectID}/projectusers" => get's user IDs

# define (require) ->
# 	config = require 'config'

# 	ajax = require 'hilib/managers/ajax'
# 	token = require 'hilib/managers/token'

# 	Collections =
# 		Base: require 'collections/base'

# 	class ProjectUsers extends Collections.Base

# 		initialize: (models, options) ->
# 			super

# 			@projectID = options.projectId

# 		url: -> "#{config.baseUrl}projects/#{@projectID}/projectusers"

# 		save: (IDs) ->
# 			ajax.token = token.get()
# 			jqXHR = ajax.put
# 				url: "#{config.baseUrl}projects/#{@projectID}/projectusers"
# 				data: JSON.stringify IDs

# 		