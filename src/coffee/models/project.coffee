define (require) ->
	ajax = require 'hilib/managers/ajax'
	token = require 'hilib/managers/token'

	config = require 'config'

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
			entrymetadatafields: []
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

		fetchEntrymetadatafields: (cb) ->
			ajax.token = token.get()
			jqXHR = ajax.get
				url: config.baseUrl + "projects/#{@id}/entrymetadatafields"
				dataType: 'text'
			jqXHR.done (response) =>
				@set 'entrymetadatafields', response
				cb()
			jqXHR.fail (a, b, c) => 
				console.log a, b, c
				console.error 'fetchEntrymetadatafields failed!'