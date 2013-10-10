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

		# ### Render
		render: ->
			data = @currentTranscription.toJSON()
			brs = @currentTranscription.get('body').match(/<br>/g) ? []
			data.lineCount = brs.length

			rtpl = _.template Tpl, data
			@$el.html rtpl

			@onHover()

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
					@trigger 'editAnnotation', model
				@addAnnotationTooltip.show
					left: ev.pageX
					top: ev.pageY

		# ### Methods

		# Get the text that is annotated. This is the text between the start (<span>) and end (<sup>) tag.
		# Text (numbers) from annotations (<sup>s) between de start and end tag are filtered out.
		getAnnotatedText: (annotationNo) ->
			startNode = @el.querySelector 'span[data-id="'+annotationNo+'"]'
			endNode = @el.querySelector 'sup[data-id="'+annotationNo+'"]'

			# Create a range between start and end nodes.
			range = document.createRange()
			range.setStartAfter startNode
			range.setEndBefore endNode

			# Create a TreeWalker based on the cloned contents (documentFragment).
			treewalker = document.createTreeWalker range.cloneContents(), NodeFilter.SHOW_TEXT,
				acceptNode: (node) =>
					# Skip <sup>s. A sup must only contain a textNode, but in the unlikely case it will not, 
					# for example: <sup data-id="46664"><i>12</i></sup>, "12" will be part of the returned text variable.
					if node.parentNode.nodeType is 1 and node.parentNode.tagName is 'SUP' and node.parentNode.hasAttribute('data-id')
						return NodeFilter.FILTER_SKIP
					else
						return NodeFilter.FILTER_ACCEPT

			# Walk the tree and extract the textContent from the nodes.
			text = ''
			text += treewalker.currentNode.textContent while treewalker.nextNode()

			text

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
			# @trigger 'newAnnotationRemoved'

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

			# Cache markers
			markers = @$('sup[data-marker]')
			# Unbind previous events
			markers.off 'mouseenter mouseleave'
			# Bind hover (mouseenter, mouseleave)
			markers.hover supEnter, supLeave

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