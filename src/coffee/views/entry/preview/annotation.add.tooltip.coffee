define (require) ->
	Fn = require 'hilib/functions/general'
	dom = require 'hilib/functions/DOM'
	BaseView = require 'views/base'

	Annotation = require 'models/annotation'

	# Templates =
	# 	Tooltip: require 'text!html/entry/tooltip.add.annotation.html'

	tpls = require 'tpls'

	class AddAnnotationTooltip extends BaseView

		# id: 'annotationtooltip'

		className: "tooltip addannotation"

		events: ->
			'click button': 'buttonClicked'

		buttonClicked: (ev) ->
			@hide()
			@trigger 'clicked', new Annotation()

		initialize: ->
			super

			@container = @options.container ? document.querySelector 'body'
			# @boundingBox = Fn.boundingBox @container

			@render()

		render: ->
			@$el.html tpls['entry/tooltip.add.annotation']()

			# There can be only one!
			tooltip = tooltip = document.querySelector('.tooltip.addannotation')
			tooltip.remove() if tooltip?

			# console.log @container
			dom(@container).prepend @el

			# Native prepend
			# @container.insertBefore @el, @container.firstChild

			# $('body').prepend @$el

			@

		# Set the position and show the tooltip
		show: (position) ->
			@setPosition position

			@el.classList.add 'active'

		# Hide the tooltip
		hide: -> @el.classList.remove 'active'

		# setPosition: (position) ->
		# 	boundingBox = Fn.boundingBox @container

		# 	@$el.removeClass 'tipright tipleft tipbottom'

		# 	# console.log 'setPos', @el.offsetWidth

		# 	# left = half of the element pointed to PLUS the left position of the element pointed to MINUS half the width of the tooltip
		# 	left = (@pointedEl.offsetWidth/2) + position.left - (@$el.width()/2)
		# 	# top = top position of the element pointed to PLUS an arbitrary offset/margin
		# 	top = position.top + 30


		# 	if left < 10
		# 		left = 10
		# 		@$el.addClass 'tipleft'

		# 	if boundingBox.width < (left + @$el.width())
		# 		left = boundingBox.width - @$el.width() - 10
		# 		@$el.addClass 'tipright'

		# 	tooltipBottomPos = top + @$el.height()
		# 	pane = document.querySelector('.container .right-pane')
		# 	scrollBottomPos = pane.scrollTop + pane.clientHeight

		# 	if tooltipBottomPos > scrollBottomPos
		# 		top = top - 48 - @$el.height()
		# 		@$el.addClass 'tipbottom'

		# 	@$el.css 'left', left
		# 	@$el.css 'top', top

		setPosition: (position) ->
			boundingBox = Fn.boundingBox @container

			position.left = position.left - boundingBox.left
			position.top = position.top - boundingBox.top

			@$el.removeClass 'tipright tipleft tipbottom'

			left = position.left - @$el.width() / 2
			top = position.top + 30

			if left < 10
				left = 10
				@$el.addClass 'tipleft'

			if boundingBox.width < (left + @$el.width())
				left = boundingBox.width - @$el.width() - 10
				@$el.addClass 'tipright'

			# if boundingBox.bottom < top + @$el.height()
			# 	top = top - 60 - @$el.height()
			# 	@$el.addClass 'tipbottom'

			@$el.css 'left', left
			@$el.css 'top', top

		# Is the tooltip active/visible? Returns Boolean.
		isActive: -> @$el.is(':visible')