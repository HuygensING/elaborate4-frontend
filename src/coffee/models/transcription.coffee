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

			# Can't save on every body:change, because the body is changed when the text is altered.
			# We have cannot do it silent, because the preview has to be updated.
			# @on 'change:body', @save, @

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

			# Replace newannotation with the new annotationNo
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
			# Find all sups in $body and update the innerHTML with the new index
			$body.find('sup[data-marker="end"]').each (index, sup) =>
				sup.innerHTML = index+1

			# .html() does not include the <div> tags so we can set it immediately.
			@set 'body', $body.html()

			# Save the transcription to the server.
			@save()

		set: (attrs, options) ->
			if attrs is 'body'
				# Chrome adds <div>s to the text when we hit enter/return we have to remove them to keep the text
				# as simple (and versatile) as possible and to keep the annotation tooltips working. FF only adds <br>s.
				# Example input: <div>texta</div><div><br></div><div>textb</div><div>textc</div>
				# First we replace a Chrome <div><br></div> with a <br>.
				# Then we unwrap the texts in <div> and precede it with a <br>.
				# Example output: <br>texta<br><br>textb<br>textc
				# * TODO: Test in IE
				options = options.replace /<div><br><\/div>/g, '<br>'
				options = options.replace /<div>(.*?)<\/div>/g, (match, p1, offset, string) => '<br>'+p1
				# options = options.replace /<span (.*?)>(.*?)<\/span>/g, (match, p1, p2, offset, string) => p2

			super

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
							@trigger 'sync'
							options.success data

				jqXHR.fail (response) => console.log 'fail', response

			else if method is 'update'
				ajax.token = token.get()
				jqXHR = ajax.put
					url: @url()
					data: JSON.stringify body: model.get 'body'
				jqXHR.done (response) => @trigger 'sync'
				jqXHR.fail (response) => console.log 'fail', response

			else
				super
