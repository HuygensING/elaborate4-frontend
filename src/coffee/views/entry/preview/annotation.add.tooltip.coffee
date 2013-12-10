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
			'change select': 'selectChanged'
			'click button': 'buttonClicked'

		selectChanged: (ev) ->
			index = ev.currentTarget.selectedIndex
			option = ev.currentTarget.options[index]
			@newannotation.set 'annotationType', @options.annotationTypes.get(option.value).attributes

		buttonClicked: (ev) ->
			@hide()
			@trigger 'clicked', @newannotation

		initialize: ->
			super

			@container = @options.container ? document.querySelector 'body'

			@render()

		render: ->
			@el.innerHTML = tpls['entry/tooltip.add.annotation'] annotationTypes: @options.annotationTypes

			# There can be only one!
			tooltip = tooltip = document.querySelector('.tooltip.addannotation')
			tooltip.remove() if tooltip?

			dom(@container).prepend @el

			@

		# Set the position and show the tooltip
		show: (position) ->
			# The default annotationType is set to the first in the list. Should this be configurable?
			@newannotation = new Annotation annotationType: @options.annotationTypes.at 0

			@setPosition position

			@el.classList.add 'active'

		# Hide the tooltip
		hide: -> @el.classList.remove 'active'

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