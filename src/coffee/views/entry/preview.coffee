# Description...
define (require) ->
	Fn = require 'helpers2/general'

	Views = 
		Base: require 'views/base'
		AddAnnotationTooltip: require 'views/entry/tooltip.add.annotation'
		EditAnnotationTooltip: require 'views/entry/tooltip.edit.annotation'

	# ## EntryPreview
	class EntryPreview extends Views.Base

		# ### Initialize
		initialize: ->
			super

			

			@highlighter = Fn.highlighter()

			@currentTranscription = @model.get('transcriptions').current
			@listenTo @currentTranscription, 'change', @render

			@render()

		# ### Render
		render: ->
			@$el.html @currentTranscription.get('body')

			@addAnnotationTooltip = new Views.AddAnnotationTooltip container: @el
			@listenTo @addAnnotationTooltip, 'clicked', (model) => @trigger 'addAnnotation', model

			@editAnnotationTooltip = new Views.EditAnnotationTooltip container: @el
			@listenTo @editAnnotationTooltip, 'edit', (model) => @trigger 'editAnnotation', model

			@onHover()

			@

		# ### Events
		events: ->
			'click sup[data-marker]': 'supClicked'
			'mouseup': 'onMouseup'
			'scroll': 'onScroll'

		onScroll: (ev) ->		
			Fn.timeoutWithReset 200, => @trigger 'scrolled', Fn.getScrollPercentage ev.currentTarget, 'horizontal'

			

		supClicked: (ev) ->
			id = ev.currentTarget.getAttribute('data-id') >> 0
			annotation = @model.get('transcriptions').current.get('annotations').findWhere annotationNo: id

			@editAnnotationTooltip.show
				$el: $(ev.currentTarget)
				model: annotation

		onMouseup: (ev) ->
			sel = document.getSelection()

			# If there is no range to get
			# or
			# If the mouseup was not directly on this view (for example, when clicking the tooltip), don't execute function
			if sel.rangeCount is 0 or ev.target isnt @el
				@addAnnotationTooltip.hide()
				return false

			range = sel.getRangeAt 0

			# Boolean to check if the selection start or ends on a <span data-marker="start"> or <sup data-marker="end">.
			# A selection cannot start inside a marker.
			isInsideMarker = range.startContainer.parentNode.hasAttribute('data-marker') or range.endContainer.parentNode.hasAttribute('data-marker')
			
			# if not range.collapsed and not startIsSup and not endIsSup
			unless range.collapsed or isInsideMarker
				@addAnnotationTooltip.show
					left: ev.pageX
					top: ev.pageY
			else
				@addAnnotationTooltip.hide()

		# ### Methods
		onHover: ->
			supEnter = (ev) =>
				id = ev.currentTarget.getAttribute('data-id')

				@highlighter.on
					startNode: @el.querySelector "span[data-id='#{id}']"
					endNode: ev.currentTarget
					
			supLeave = (ev) => @highlighter.off()


			@$('sup[data-marker]').hover supEnter, supLeave

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