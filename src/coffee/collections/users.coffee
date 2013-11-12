define (require) ->
	config = require 'config'
	
	User = require 'models/user'

	Collections =
		Base: require 'collections/base'

	class Users extends Collections.Base

		model: User

		url: ->	"#{config.baseUrl}users"

		comparator: 'title'