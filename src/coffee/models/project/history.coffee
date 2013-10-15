define (require) ->
	# config = require 'config'
	Models = 
		Base: require 'models/base'
		# state: require 'models/state'

	class ProjectHistory extends Models.Base

		defaults: ->
			comment: ''
			userName: ''
			createdOn: null
			dateString: ''

		parse: (attrs) ->
			attrs.dateString = new Date(attrs.createdOn).toDateString()

			attrs