define (require) ->
	Fn = require 'helpers2/general'
	BaseView = require 'views/base'
	Templates =
		Tooltip: require 'text!html/ui/tooltip.html'

	class Tooltip extends BaseView

		id: "tooltip"

		events: ->
			'click .close': 'closeClicked'
			'click .edit': 'editClicked'

		editClicked: (ev) -> @trigger 'edit', @model

		closeClicked: (ev) ->
			@contentId = null
			@$el.hide()
			@trigger 'close'

		initialize: ->
			super

			@container = @options.container || document.querySelector 'body'
			@boundingBox = Fn.boundingBox @container

			@render()

		render: ->
			rtpl = _.template Templates.Tooltip
			@$el.html rtpl

			$('#tooltip').remove() # There can be only one!
			$('body').prepend @$el

		show: (args) ->
			{$el, @model} = args

			content = @model.get 'body'
			contentId = @model.get 'annotationNo'

			# If the tooltip is already visible, we close the tooltip
			if contentId is @contentId
				@close()
				return
			
			# Save the contentId to the object, to be able to check if the wanted tooltip is already visible (and should be closed)
			@contentId = contentId

			# Add content to the tooltip
			@$('.body').html content
			
			# Calculate and set the absolute position
			@setPosition $el.offset()

			# Show the tooltip
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