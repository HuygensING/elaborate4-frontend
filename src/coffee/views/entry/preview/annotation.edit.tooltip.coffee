Fn = require 'hilib/src/utils/general'
dom = require 'hilib/src/utils/DOM'
BaseView = require 'hilib/src/views/base'

# console.log dom
# Templates =
# 	Tooltip: require 'text!html/ui/tooltip.html'

tpl = require '../../../../jade/ui/tooltip.jade'

class EditAnnotationTooltip extends BaseView

	className: 'tooltip editannotation'

	# id: "annotationtooltip"

	# ### Initialize
	initialize: ->
		super

		@container = @options.container ? document.querySelector 'body'

		@render()

	# ### Render
	render: ->
		@$el.html tpl interactive: @options.interactive

		# There can be only one!
		# $('#annotationtooltip').remove() 
		tooltip = @container.querySelector('.tooltip.editannotation')
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

		@pointedEl = $el[0]

		@el.style.left = 0
		@el.style.top = 0
		@el.querySelector('.tooltip-body').innerHTML = ''
		@el.querySelector('.annotation-type').innerHTML = ''

		# console.log 'show', @el.offsetWidth

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

			@el.querySelector('.tooltip-body').innerHTML = @model.get 'body'
			@el.querySelector('.annotation-type').innerHTML = @model.get('annotationType').name if @model.get('annotationType').name?
		else
			@$el.addClass 'newannotation'
		
		if @options.container? then	@setRelativePosition(dom(@pointedEl).position(@options.container)) else @setAbsolutePosition($el.offset())

		@el.classList.add 'active'

	hide: ->
		@el.removeAttribute 'data-id'
		@el.classList.remove 'active'

	setRelativePosition: (position) ->
		boundingBox = Fn.boundingBox @container

		@$el.removeClass 'tipright tipleft tipbottom'

		# console.log 'setPos', @el.offsetWidth

		# left = half of the element pointed to PLUS the left position of the element pointed to MINUS half the width of the tooltip
		left = (@pointedEl.offsetWidth/2) + position.left - (@$el.width()/2)
		# top = top position of the element pointed to PLUS an arbitrary offset/margin
		top = position.top + 30


		if left < 10
			left = 10
			@$el.addClass 'tipleft'

		if boundingBox.width < (left + @$el.width())
			left = boundingBox.width - @$el.width() - 10
			@$el.addClass 'tipright'

		tooltipBottomPos = top + @$el.height()
		scrollBottomPos = @container.scrollTop + @container.clientHeight

		if tooltipBottomPos > scrollBottomPos
			top = top - 48 - @$el.height()
			@$el.addClass 'tipbottom'

		@$el.css 'left', left
		@$el.css 'top', top

	# * FIX
	setAbsolutePosition: (position) ->
		console.error 'Don"t use! This has to be fixed!'

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

		@$el.css 'left', left
		@$el.css 'top', top

	# Is the tooltip active/visible? Returns Boolean.
	isActive: -> @$el.css('z-index') > 0
	
module.exports = EditAnnotationTooltip