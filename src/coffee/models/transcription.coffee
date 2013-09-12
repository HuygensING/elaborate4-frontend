define (require) ->

	config = require 'config'

	Models = 
		Base: require 'models/base'

	Collections =
		Annotations: require 'collections/annotations'

	class Transcription extends Models.Base

		defaults: ->
			annotations: null
			textLayer: ''
			title: ''
			body: ''

		parse: (attrs) ->
			attrs.body = attrs.body.trim()

			# Remove potential opening and closing <body> tags
			attrs.body = attrs.body.substr(6) if attrs.body.substr(0, 6) is '<body>'
			attrs.body = attrs.body.slice(0, -7) if attrs.body.substr(-7) is '</body>'

			# Replace <ab />s (annotation begin) and <ae />s (annotation end) with <span />s and <sup />s
			i = 1
			attrs.body = attrs.body.replace /<ab id="(.*?)"\/>/g, (match, p1, offset, string) => '<span data-marker="begin" data-id="'+p1+'"></span>'
			attrs.body = attrs.body.replace /<ae id="(.*?)"\/>/g, (match, p1, offset, string) => '<sup data-marker="end" data-id="'+p1+'">'+(i++)+'</sup> '

			# Replace newlines with <br>s
			attrs.body = attrs.body.replace /\n/g, '<br>'

			attrs.annotations = new Collections.Annotations [], 
				transcriptionId: attrs.id
				entryId: @collection.entryId
				projectId: @collection.projectId

			attrs