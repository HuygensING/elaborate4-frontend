# Description...
define (require) ->
	Fn = require 'hilib/functions/general'
	dom = require 'hilib/functions/DOM'

	config = require 'config'

	Views = 
		Base: require 'views/base'
		AddAnnotationTooltip: require 'views/entry/preview/annotation.add.tooltip'
		EditAnnotationTooltip: require 'views/entry/preview/annotation.edit.tooltip'

	# Tpl = require 'text!html/entry/preview.html'
	tpls = require 'tpls'

	# ## TranscriptionPreview
	class EntryPreview extends Views.Base

		className: 'right-pane'

		# ### Initialize
		initialize: ->
			super

			@autoscroll = false

			@highlighter = Fn.highlighter()

			# @model is the entry
			@currentTranscription = @model.get('transcriptions').current

			@addListeners()

			@render()

			@resize()


		# ### Render
		render: ->
			data = @currentTranscription.toJSON()

			body = @currentTranscription.get('body')
			# Count all the <br>s in the body string. Match returns null if no breaks are found.
			lineCount = (body.match(/<br>/g) ? []).length
			# If the body string does not end with a <br> that means there is
			# some text after the last <br> and we have to add a linenumber.
			lineCount++ if body.substr(-4) isnt '<br>'
			data.lineCount = lineCount

			data.lineCount = 0 if data.body.trim() is ''

			@el.innerHTML = tpls['entry/preview'] data

			@renderTooltips()

			@onHover()

			@

		renderTooltips: ->
			@addAnnotationTooltip.remove() if @addAnnotationTooltip?
			@addAnnotationTooltip = new Views.AddAnnotationTooltip
				container: @el.querySelector('.preview')
				annotationTypes: @model.project.get('annotationtypes')

			@editAnnotationTooltip.remove() if @editAnnotationTooltip?
			@editAnnotationTooltip = new Views.EditAnnotationTooltip container: @el.querySelector('.preview')
			@listenTo @editAnnotationTooltip, 'edit', (model) => @trigger 'editAnnotation', model
			@listenTo @editAnnotationTooltip, 'delete', (model) =>
				if model.get('annotationNo') is 'newannotation'
					@removeNewAnnotation()
				else
					# Remove the annotation from the collection, the transcription model wil take care of the rest
					@currentTranscription.get('annotations').remove model

				# Let the entry view know an annotation has been removed so it can remove the annotationEditor view and
				# show the current transcription.
				@trigger 'annotation:removed'

		# ### Events
		events: ->
			'click sup[data-marker="end"]': 'supClicked'
			'mousedown .preview': 'onMousedown'
			'mouseup .preview': 'onMouseup'
			'scroll': 'onScroll'

		onScroll: (ev) ->
			if @autoscroll = !@autoscroll
				Fn.timeoutWithReset 200, => @trigger 'scrolled', Fn.getScrollPercentage ev.currentTarget

		supClicked: (ev) ->
			return console.error 'No annotations found!' unless @currentTranscription.get('annotations')?

			id = ev.currentTarget.getAttribute('data-id')

			annotation = if id is 'newannotation' then @newAnnotation else @currentTranscription.get('annotations').findWhere annotationNo: id >> 0
			return console.error 'Annotation not found! ID:', id, ' Collection:', @currentTranscription.get('annotations') unless annotation?

			@setAnnotatedText annotation

			@editAnnotationTooltip.show
				$el: $(ev.currentTarget)
				model: annotation

		onMousedown: (ev) ->
			if ev.target is @el.querySelector('.preview .body')
				@stopListening @addAnnotationTooltip
				@addAnnotationTooltip.hide()

		onMouseup: (ev) ->
			return if ev.target is @addAnnotationTooltip.el or dom(@addAnnotationTooltip.el).hasDescendant(ev.target)
			
			sel = document.getSelection()

			# If there is no range to get (for example when using the scrollbar)
			# or
			# When the user clicked a sup
			if sel.rangeCount is 0 or ev.target.tagName is 'SUP' or ev.target.tagName is 'BUTTON'
				# Only hide the tooltip, don't stopListening, because the click to add an annotation also ends up here
				@addAnnotationTooltip.hide()
				return false

			range = sel.getRangeAt 0

			# Boolean to check if the selection start or ends on a <span data-marker="start"> or <sup data-marker="end">.
			# A selection cannot start inside a marker.
			isInsideMarker = range.startContainer.parentNode.hasAttribute('data-marker') or range.endContainer.parentNode.hasAttribute('data-marker')

			# if not range.collapsed and not startIsSup and not endIsSup
			unless range.collapsed or isInsideMarker or @$('[data-id="newannotation"]').length > 0
				# Listen once to the click on the (to be shown) add annotation tooltip.
				@listenToOnce @addAnnotationTooltip, 'clicked', (model) =>
					@addNewAnnotation model, range
				# Show the add annotation tooltip.
				@addAnnotationTooltip.show
					left: ev.pageX
					top: ev.pageY


		# ### Methods

		destroy: ->
			@addAnnotationTooltip.remove()
			@editAnnotationTooltip.remove()

			@remove()

		setScroll: (percentages) ->
			@autoscroll = true
			# Use setTimeout to wait for other events to finish first
			setTimeout => Fn.setScrollPercentage @el, percentages

		highlightAnnotation: (annotationNo) ->
			range = document.createRange()

			range.setStartAfter @el.querySelector('span[data-id="'+annotationNo+'"]')
			range.setEndBefore @el.querySelector('sup[data-id="'+annotationNo+'"]')

			el = document.createElement 'span'
			el.className = 'hilite'
			el.setAttribute 'data-highlight', ''
			el.appendChild range.extractContents()

			range.insertNode el

		unhighlightAnnotation: ->
			el = @el.querySelector('span[data-highlight]')

			if el?
				# Move all children from el to a documentFragment
				docFrag = document.createDocumentFragment()
				docFrag.appendChild el.firstChild while el.childNodes.length

				# Replace el with the documentFragment
				el.parentNode.replaceChild docFrag, el

		# Set the text that is annotated to the annotation model. This is the text between the start (<span>) and end (<sup>) tag.
		# Text (numbers) from annotations (<sup>s) between de start and end tag are filtered out.
		setAnnotatedText: (annotation) ->
			annotationNo = annotation.get 'annotationNo'

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

			annotation.set 'annotatedText', text

		addNewAnnotation: (newAnnotation, range) ->
			@unhighlightAnnotation()
			
			@newAnnotation = newAnnotation

			@addNewAnnotationTags range
			
			# Set the urlRoot manually, because a new annotation has not been added to the collection yet.
			annotations = @currentTranscription.get 'annotations'
			newAnnotation.urlRoot = => config.baseUrl + "projects/#{annotations.projectId}/entries/#{annotations.entryId}/transcriptions/#{annotations.transcriptionId}/annotations"
			
			@setAnnotatedText newAnnotation

			@trigger 'editAnnotation', newAnnotation

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

		removeNewAnnotation: ->
			@newAnnotation = null
			@removeNewAnnotationTags()

		removeNewAnnotationTags: ->
			@$('[data-id="newannotation"]').remove()
			@currentTranscription.set 'body', @$('.preview .body').html(), silent: true
			# @trigger 'newAnnotationRemoved'

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

		resize: -> 
			@$el.height document.documentElement.clientHeight - 89 - 78

			@el.style.marginRight = 0 if Fn.hasYScrollBar @el

		setModel: (entry) ->
			@unhighlightAnnotation()
			@model = entry
			@currentTranscription = @model.get('transcriptions').current
			@addListeners()
			@render()

		addListeners: ->
			# * TODO: Triggers double render??
			@listenTo @currentTranscription, 'current:change', @render
			@listenTo @currentTranscription, 'change:body', @render