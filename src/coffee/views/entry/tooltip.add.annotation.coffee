define (require) ->
	Fn = require 'helpers2/general'
	BaseView = require 'views/base'

	Annotation = require 'models/annotation'

	Templates =
		Tooltip: require 'text!html/entry/tooltip.add.annotation.html'

	class AddAnnotationTooltip extends BaseView

		className: "tooltip addannotation"

		events: ->
			'click button': 'buttonClicked'

		buttonClicked: (ev) -> @trigger 'clicked', new Annotation()

		initialize: ->
			super

			@container = @options.container || document.querySelector 'body'
			@boundingBox = Fn.boundingBox @container

			@render()

		render: ->
			rtpl = _.template Templates.Tooltip, {}
			@$el.html rtpl

			# Native prepend
			@container.insertBefore @el, @container.firstChild

			@

		# Set the position and show the tooltip
		show: (position) ->
			@setPosition position

			@$el.fadeIn 'fast'

		# Hide the tooltip
		hide: -> @el.style.display = 'none'

		setPosition: (position) ->
			@$el.removeClass 'tipright tipleft tipbottom'

			left = position.left - @$el.width() / 2
			top = position.top + 30

			if @boundingBox.left > left
				left = @boundingBox.left + 10
				@$el.addClass 'tipleft'

			if @boundingBox.right < (left + @$el.width())
				left = @boundingBox.right - @$el.width() - 10
				@$el.addClass 'tipright'

			if @boundingBox.bottom < top + @$el.height()
				top = top - 60 - @$el.height()
				@$el.addClass 'tipbottom'

			@$el.css 'left', left
			@$el.css 'top', top

		# Is the tooltip active/visible? Returns Boolean.
		isActive: -> @$el.is(':visible')