define (require) ->
	config = require 'config'
	
	Collections =
		Base: require 'collections/base'

	class Users extends Collections.Base

		url: ->	"#{config.baseUrl}users"