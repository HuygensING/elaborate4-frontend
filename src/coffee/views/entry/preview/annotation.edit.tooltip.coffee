define (require) ->
	Fn = require 'hilib/functions/general'
	dom = require 'hilib/functions/dom'
	BaseView = require 'views/base'
	# Templates =
	# 	Tooltip: require 'text!html/ui/tooltip.html'

	tpls = require 'tpls'

	class Tooltip extends BaseView

		className: 'tooltip editannotation'

		id: "annotationtooltip"

		# ### Initialize
		initialize: ->
			super

			@container = @options.container ? document.querySelector 'body'

			@render()

		# ### Render
		render: ->
			@$el.html tpls['ui/tooltip']()

			# There can be only one!
			# $('#annotationtooltip').remove() 
			tooltip = document.getElementById('annotationtooltip')
			tooltip.remove() if tooltip?

			dom(@container).prepend @el

		# ### Events
		events: ->
			'click .edit': 'editClicked'
			'click .delete': 'deleteClicked'
			'click': 'clicked'

		editClicked: (ev) -> @trigger 'edit', @model

		deleteClicked: (ev) -> @trigger 'delete', @model

		clicked: (ev) -> @hide()

		# ### Methods
		show: (args) ->
			{$el, @model} = args

			# If there is no annotationNo (in case of a new annotation) we give the tooltip the contentId of -1
			contentId = if @model? and @model.get('annotationNo')? then @model.get('annotationNo') else -1

			# If the tooltip is already visible, we close the tooltip
			if contentId is +@el.getAttribute 'data-id'
				@hide()
				return false

			# Set the new contentId to the el
			@el.setAttribute 'data-id', contentId

			if @model?
				@$el.removeClass 'newannotation'

				# Add body of the model to the tooltip
				@$('.tooltip-body').html @model.get 'body'
			else
				@$el.addClass 'newannotation'
			
			# console.log $el.offset()
			# console.log $el.position()

			# Calculate and set the absolute position

			if @options.container? then	@setRelativePosition(dom($el[0]).position(@container)) else @setAbsolutePosition($el.offset())

			# Show the tooltip
			@$el.fadeIn 'fast'

		hide: -> 
			@el.removeAttribute 'data-id'
			@el.style.display = 'none'

		setRelativePosition: (position) ->
			boundingBox = Fn.boundingBox @container

			@$el.removeClass 'tipright tipleft tipbottom'

			left = position.left - @$el.width() / 2
			top = position.top + 30

			if left < 10
				left = 10
				@$el.addClass 'tipleft'

			# console.log boundingBox.width < left + @$el.width()
			# console.log boundingBox.width, left, @$el.width()

			if boundingBox.width < (left + @$el.width())
				left = boundingBox.width - @$el.width() - 10
				@$el.addClass 'tipright'

			console.log boundingBox.height, @container.scrollHeight, @container.scrollTop
			# console.log boundingBox.height - (@container.scrollHeight - @container.clientHeight)  < top + @$el.height()
			# console.log boundingBox.height - (@container.scrollHeight - @container.clientHeight), top + @$el.height()

			# if boundingBox.height - (@container.scrollHeight - @container.clientHeight)  < top + @$el.height()
			# 	top = top - 60 - @$el.height()
			# 	@$el.addClass 'tipbottom'

			# console.log top, left

			@$el.css 'left', left
			@$el.css 'top', top

		setAbsolutePosition: (position) ->
			boundingBox = Fn.boundingBox @container

			@$el.removeClass 'tipright tipleft tipbottom'

			left = position.left - @$el.width() / 2
			top = position.top + 30

			if boundingBox.left > left
				left = boundingBox.left + 10
				@$el.addClass 'tipleft'

			if boundingBox.right < (left + @$el.width())
				left = boundingBox.right - @$el.width() - 10
				@$el.addClass 'tipright'

			if boundingBox.bottom < top + @$el.height()
				top = top - 60 - @$el.height()
				@$el.addClass 'tipbottom'

			console.log top, left

			@$el.css 'left', left
			@$el.css 'top', top

		# Is the tooltip active/visible? Returns Boolean.
		isActive: -> @$el.is(':visible')