define (require) ->

	config = require 'config'

	Models = 
		Base: require 'models/base'

	class Facsimile extends Models.Base

		# defaults: ->
		# 	name: ''
		# 	publishable: false

		# parse: (attrs) ->
		# 	attrs.transcriptions = new Collections.Transcriptions([], entryId: attrs.id)

		# 	attrs