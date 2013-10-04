# Description...
define (require) ->
	Fn = require 'hilib/functions/general'

	Views = 
		Base: require 'views/base'
		AddAnnotationTooltip: require 'views/entry/preview/annotation.add.tooltip'
		EditAnnotationTooltip: require 'views/entry/preview/annotation.edit.tooltip'

	Tpl = require 'text!html/entry/preview.html'

	# ## TranscriptionPreview
	class TranscriptionPreview extends Views.Base

		# ### Initialize
		initialize: ->
			super

			@highlighter = Fn.highlighter()

			# @model is the entry
			@currentTranscription = @model.get('transcriptions').current
			
			@addListeners()

			@render()

			@renderTooltips()

			@setHeight()

			@onHover()

		# ### Render
		render: ->
			data = @currentTranscription.toJSON()
			brs = @currentTranscription.get('body').match(/<br>/g) ? []
			data.lineCount = brs.length

			rtpl = _.template Tpl, data
			@$el.html rtpl

			@

		renderTooltips: ->
			@addAnnotationTooltip = new Views.AddAnnotationTooltip container: @el

			@editAnnotationTooltip = new Views.EditAnnotationTooltip container: @el
			@listenTo @editAnnotationTooltip, 'edit', (model) => @trigger 'editAnnotation', model
			@listenTo @editAnnotationTooltip, 'delete', (model) =>
				if model?
					# Remove the annotation from the collection, the transcription model wil take care of the rest
					@currentTranscription.get('annotations').remove model
				else
					@removeNewAnnotationTags()

		# ### Events
		events: ->
			'click sup[data-marker="end"]': 'supClicked'
			'mousedown .preview': 'onMousedown'
			'mouseup .preview': 'onMouseup'
			'scroll': 'onScroll'

		onScroll: (ev) ->
			Fn.timeoutWithReset 200, => @trigger 'scrolled', Fn.getScrollPercentage ev.currentTarget

		supClicked: (ev) ->
			id = ev.currentTarget.getAttribute('data-id') >> 0
			annotation = @currentTranscription.get('annotations').findWhere annotationNo: id
			@editAnnotationTooltip.show
				$el: $(ev.currentTarget)
				model: annotation

		onMousedown: (ev) ->
			if ev.target is @el.querySelector('.preview .body')
				@stopListening @addAnnotationTooltip
				@addAnnotationTooltip.hide()

		onMouseup: (ev) ->
			sel = document.getSelection()

			# If there is no range to get (for example when using the scrollbar)
			# or
			# When the user clicked a sup
			if sel.rangeCount is 0 or ev.target.tagName is 'SUP'
				# Only hide the tooltip, don't stopListening, because the click to add an annotation also ends up here
				@addAnnotationTooltip.hide()
				return false

			range = sel.getRangeAt 0

			# Boolean to check if the selection start or ends on a <span data-marker="start"> or <sup data-marker="end">.
			# A selection cannot start inside a marker.
			isInsideMarker = range.startContainer.parentNode.hasAttribute('data-marker') or range.endContainer.parentNode.hasAttribute('data-marker')

			### console.log range.collapsed, isInsideMarker, @$('[data-id="newannotation"]').length > 0 ###
			# if not range.collapsed and not startIsSup and not endIsSup
			unless range.collapsed or isInsideMarker or @$('[data-id="newannotation"]').length > 0
				@listenToOnce @addAnnotationTooltip, 'clicked', (model) =>
					@addNewAnnotationTags range
					@trigger 'addAnnotation', model
				@addAnnotationTooltip.show
					left: ev.pageX
					top: ev.pageY

		# ### Methods

		addNewAnnotationTags: (range) ->
			# Create marker at the beginning of the selection
			span = document.createElement 'span'
			span.setAttribute 'data-marker', 'begin'
			span.setAttribute 'data-id', 'newannotation'
			range.insertNode span

			# Create marker at the end of the selection
			# range.collapse(false) collapses the range to the end (true collapses to the beginning)
			sup = document.createElement 'sup'
			sup.setAttribute 'data-marker', 'end'
			sup.setAttribute 'data-id', 'newannotation'
			sup.innerHTML = 'new'
			range.collapse false
			range.insertNode sup

			@currentTranscription.set 'body', @$('.preview .body').html(), silent: true

		removeNewAnnotationTags: ->
			@$('[data-id="newannotation"]').remove()
			@currentTranscription.set 'body', @$('.preview .body').html(), silent: true
			@trigger 'newAnnotationRemoved'

		# replaceNewAnnotationID: (model) ->
		# 	@$('[data-id="newannotation"]').attr 'data-id', model.get 'annotationNo'

			# @currentTranscription.set 'body', @$el.html()

		onHover: ->
			supEnter = (ev) =>
				id = ev.currentTarget.getAttribute('data-id')
				
				unless startNode = @el.querySelector "span[data-id='#{id}']"
					console.error 'No span found'
					return false

				@highlighter.on
					startNode: startNode
					endNode: ev.currentTarget
					
			supLeave = (ev) => @highlighter.off()


			@$('sup[data-marker]').hover supEnter, supLeave

		setHeight: -> @$el.height document.documentElement.clientHeight - 89 - 78 - 10

		setModel: (entry) ->
			@model = entry
			@currentTranscription = @model.get('transcriptions').current
			@addListeners()
			@render()

		addListeners: ->
			@listenTo @currentTranscription, 'current:change', @render
			@listenTo @currentTranscription, 'change:body', @render


		# scrollByPercentage: (percentage, orientation='vertical') ->
		# 	clientWidth = @el.clientWidth
		# 	scrollWidth = @el.scrollWidth
		# 	clientHeight = @el.clientHeight
		# 	scrollHeight = @el.scrollHeight
		# 	top = 0
		# 	left = 0

		# 	if orientation is 'vertical'
		# 		@el.scrollTop = (scrollHeight - clientHeight) * percentage/100
		# 	else
		# 		@el.scrollLeft = (scrollWidth - clientWidth) * percentage/100