config = require '../config'

User = require '../models/user'

Collections =
	Base: require './base'

class Users extends Collections.Base

	model: User

	url: ->	"#{config.baseUrl}users"

	comparator: (user) ->
		# Apparently title can be null
		title = user.get('title')
		return if title? then title.toLowerCase() else ''

module.exports = Users