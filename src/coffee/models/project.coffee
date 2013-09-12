define (require) ->

	Models = 
		Base: require 'models/base'

	Collections =
		Entries: require 'collections/entries'
		AnnotationTypes: require 'collections/project/annotation.types'

	class Project extends Models.Base

		defaults: ->
			annotationtypes: null
			createdOn: ''
			creator: null
			entries: null
			level1: ''
			level2: ''
			level3: ''
			modifiedOn: ''
			modifier: null
			name: ''
			projectLeaderId: null
			textLayers: []
			title: ''

		# initialize: ->
		# 	super

		# 	console.log 'init project'

		parse: (attrs) ->
			attrs.entries = new Collections.Entries([], projectId: attrs.id)
			attrs.annotationtypes = new Collections.AnnotationTypes([], projectId: attrs.id)

			attrs