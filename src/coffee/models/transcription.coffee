Backbone = require 'backbone'
$ = require 'jquery'
_ = require 'underscore'

ajax = require 'hilib/src/managers/ajax'
token = require 'hilib/src/managers/token'

changedSinceLastSave = require 'hilib/src/mixins/model.changedsincelastsave'

Models = 
	Base: require './base'

Collections =
	Annotations: require '../collections/annotations'

class Transcription extends Models.Base

	defaults: ->
		annotations: null
		textLayer: ''
		title: ''
		body: ''

	# ### Initialize
	initialize: ->
		super

		_.extend @, changedSinceLastSave(['body'])
		@initChangedSinceLastSave()

		# @changedSinceLastSave = null
		# @on 'change:body', (model, options) => 
		# 	@changedSinceLastSave = model.previousAttributes().body unless @changedSinceLastSave?

		# @listenToAnnotations()

		# Can't save on every body:change, because the body is changed when the text is altered and thus will trigger too many saves.
		# We cannot do it silent, because the preview has to be updated.
		# @on 'change:body', @save, @

	# ### Overrides

	# save: ->
	# 	@changedSinceLastSave = null

	# 	super

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
			options.trim()
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

			jqXHR.fail (response) => Backbone.history.navigate 'login', trigger: true if response.status is 401

		else if method is 'update'
			ajax.token = token.get()
			jqXHR = ajax.put
				url: @url()
				data: JSON.stringify body: model.get 'body'
			jqXHR.done (response) => 
				@trigger 'sync'
				options.success response
			jqXHR.fail (response) => Backbone.history.navigate 'login', trigger: true if response.status is 401

		else
			super

	# ### Methods

	getAnnotations: (cb=->) ->
		if @get('annotations')?
			cb @get 'annotations'
		else
			annotations = new Collections.Annotations [], 
				transcriptionId: @id
				entryId: @collection.entryId
				projectId: @collection.projectId

			jqXHR = annotations.fetch
				success: (collection) =>
					@set 'annotations', collection

					@listenTo collection, 'add', @addAnnotation
					@listenTo collection, 'remove', @removeAnnotation

					cb collection
			jqXHR.fail (response) => Backbone.history.navigate 'login', trigger: true if response.status is 401

	addAnnotation: (model) ->
		unless model.get('annotationNo')? 
			console.error 'No annotationNo given!', model.get('annotationNo')
			return false

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

			@resetAnnotationOrder $body, false
		jqXHR.fail (response) =>
			# Restore the removed model.
			@get('annotations').add model
			
			Backbone.history.navigate 'login', trigger: true if response.status is 401

	resetAnnotationOrder: ($body, add=true) ->
		# Find all sups in $body and update the innerHTML with the new index
		$body.find('sup[data-marker="end"]').each (index, sup) =>
			sup.innerHTML = index+1

		# .html() does not include the <div> tags so we can set it immediately.
		@set 'body', $body.html()

		# Save the transcription to the server.
		jqXHR = @save null, 
			success: => 
				message = if add then "New annotation added." else "Annotation removed."
				@publish 'message', message
		jqXHR.fail (response) => Backbone.history.navigate 'login', trigger: true if response.status is 401

	# cancelChanges: ->
	# 	@set 'body', @changedSinceLastSave
	# 	@changedSinceLastSave = null
module.exports = Transcription