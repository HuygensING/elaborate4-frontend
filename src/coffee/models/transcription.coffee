define (require) ->

	config = require 'config'

	ajax = require 'managers2/ajax'
	token = require 'managers2/token'

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

		initialize: ->
			super

			@listenToAnnotations()

			@on 'change:body', => @save()

			# TODO: PUT transcription does not yet work!
			# Save transcription to the server, everytime the body attr changes
			# @on 'change:body', @save

		parse: (attrs) ->
			# attrs.body = attrs.body.trim()

			# Remove potential opening and closing <body> tags
			# attrs.body = attrs.body.substr(6) if attrs.body.substr(0, 6) is '<body>'
			# attrs.body = attrs.body.slice(0, -7) if attrs.body.substr(-7) is '</body>'

			# Replace <ab />s (annotation begin) and <ae />s (annotation end) with <span />s and <sup />s
			# i = 1
			# attrs.body = attrs.body.replace /<ab id="(.*?)"\/>/g, (match, p1, offset, string) => '<span data-marker="begin" data-id="'+p1+'"></span>'
			# attrs.body = attrs.body.replace /<ae id="(.*?)"\/>/g, (match, p1, offset, string) => '<sup data-marker="end" data-id="'+p1+'">'+(i++)+'</sup> '

			# Replace newlines with <br>s
			# attrs.body = attrs.body.replace /\n/g, '<br>'

			attrs.annotations = new Collections.Annotations [], 
				transcriptionId: attrs.id
				entryId: @collection.entryId
				projectId: @collection.projectId

			attrs

		listenToAnnotations: ->
			if @get('annotations')?
				# Start listening to annotations after the annotations are fetched from the server
				@listenToOnce @get('annotations'), 'sync', =>
					@listenTo @get('annotations'), 'add', @addAnnotation
					@listenTo @get('annotations'), 'remove', @removeAnnotation

		addAnnotation: (model) ->
			$body = $ "<div>#{@get('body')}</div>"

			$body.find('[data-id="newannotation"]').attr 'data-id', model.get 'annotationNo'

			@resetAnnotationOrder $body

		removeAnnotation: (model) ->
			jqXHR = model.destroy()
			jqXHR.done =>
				# Add div tags to body string so jQuery can read it
				$body = $ "<div>#{@get('body')}</div>"
				
				# Find and remove the <span> and <sup>
				$body.find("[data-id='#{model.get('annotationNo')}']").remove()

				@resetAnnotationOrder $body

		resetAnnotationOrder: ($body) ->
			$body.find('sup[data-marker="end"]').each (index, sup) =>
				sup.innerHTML = index+1

			# .html() does not include the <div> tags so we can set it immediately
			@set 'body', $body.html()

		sync: (method, model, options) ->
			
			if method is 'create'
				ajax.token = token.get()
				jqXHR = ajax.post
					url: @url()
					dataType: 'text'
					data: JSON.stringify 
						textLayer: model.get 'textLayer'
						body: model.get 'body'

				jqXHR.done (data, textStatus, jqXHR) =>
					if jqXHR.status is 201
						url = jqXHR.getResponseHeader('Location')

						xhr = ajax.get url: url
						xhr.done (data, textStatus, jqXHR) =>
							options.success data

				jqXHR.fail (response) => console.log 'fail', response

			else if method is 'update'
				ajax.token = token.get()
				jqXHR = ajax.put
					url: @url()
					data: JSON.stringify body: model.get 'body'
				jqXHR.done (response) => console.log 'done', response
				jqXHR.fail (response) => console.log 'fail', response

			else
				super
