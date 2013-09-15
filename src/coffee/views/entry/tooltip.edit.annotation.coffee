define (require) ->
	Fn = require 'helpers/general'
	BaseView = require 'views/base'
	Templates =
		Tooltip: require 'text!html/ui/tooltip.html'

	class Tooltip extends BaseView

		id: "tooltip"

		# ### Initialize
		initialize: ->
			super

			@container = @options.container || document.querySelector 'body'
			@boundingBox = Fn.boundingBox @container

			@render()

		# ### Render
		render: ->
			rtpl = _.template Templates.Tooltip
			@$el.html rtpl

			$('#tooltip').remove() # There can be only one!
			$('body').prepend @$el

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
				@$('.body').html @model.get 'body'
			else
				@$el.addClass 'newannotation'
			
			# Calculate and set the absolute position
			@setPosition $el.offset()

			# Show the tooltip
			@$el.fadeIn 'fast'

		hide: -> 
			@el.removeAttribute 'data-id'
			@el.style.display = 'none'

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