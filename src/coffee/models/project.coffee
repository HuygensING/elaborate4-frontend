define (require) ->

	Models = 
		Base: require 'models/base'

	Collections =
		Entries: require 'collections/entries'

	class Project extends Models.Base

		initialize: ->
			super

		parse: (attrs) ->
			attrs.entries = new Collections.Entries([], projectId: attrs.id)

			attrs