# Example usage:
# 
# 	modal = new Modal
# 		title: "My title!"
# 		html: $('<div />').html('lalala')
# 		submitValue: 'OK'
# 	modal.on 'cancel', => cancelAction()
# 	modal.on 'submit', => modal.messageAndFade 'success', 'Modal submitted!'

Backbone = require 'backbone'
_ = require 'underscore'
$ = require 'jquery'
# Tpl = require 'text!hilib/views/modal/main.html'

tpl = require './main.jade'

modalManager = require '../../managers/modal'

# OPTIONS
# customClassName
# html
# width
# height
# title
# titleClass
# cancelAndSubmit
# cancelValue
# submitValue
# focusOnFirstInput

# ## Modal
class Modal extends Backbone.View

	className: "modal"

	defaultOptions: ->
		title: ''

		# Deprecated by customClassName?
		titleClass: ''

		# Show cancel and submit button.
		cancelAndSubmit: true

		cancelValue: 'Cancel'
		submitValue: 'Submit'

		# Add a className to top level to support styling and DOM manipulation. 
		customClassName: ''

		# Set the focus to the first <input> when the modal is shown.
		focusOnFirstInput: true

		# If the overlay is clicked, cancel is triggered. Defaults to true.
		clickOverlay: true

	# ### Initialize
	initialize: (@options={}) ->
		super

		@options = _.extend @defaultOptions(), @options

		# We have to call this option customClassName because @options.className
		# will replace 'modal' as className.
		@$el.addClass @options.customClassName if @options.customClassName.length > 0


		@render()

	# ### Render
	render: ->
		rtpl = tpl @options
		@$el.html rtpl

		body = @$('.body')
		if @options.html? then body.html @options.html else body.hide()

		@$('.body').scroll (ev) => ev.stopPropagation()

		modalManager.add @

		if @options.width?
			@$('.modalbody').css 'width', @options.width
			marginLeft = (-1 * parseInt(@options.width, 10)/2)
			marginLeft += '%' if @options.width.slice(-1) is '%'
			marginLeft += 'vw' if @options.width.slice(-2) is 'vw'
			marginLeft = @$('.modalbody').width()/-2 if @options.width is 'auto'
			@$('.modalbody').css 'margin-left', marginLeft

		if @options.height?
			@$('.modalbody').css 'height', @options.height

			# unless @options.height is 'auto'
			# 	offsetTop = (-1 * parseInt(@options.height, 10)/2)
			# 	offsetTop += '%' if @options.height.slice(-1) is '%'
			# 	offsetTop += 'vh' if @options.height.slice(-2) is 'vh'
			# 	console.log offsetTop
			# 	@$('.modalbody').css 'margin-top', offsetTop

		# Add scrollTop of <body> to the position of the modal if body is scrolled (otherwise modal might be outside viewport)
		# scrollTop = document.querySelector('body').scrollTop
		# top = (viewportHeight - @$('.modalbody').height())/2
		# @$('.modalbody').css 'top', top + scrollTop if scrollTop > 0

		# offsetTop is calculated based on the .modalbody height, but the height is maxed to the viewportHeight
		# offsetTop = Math.min (@$('.modalbody').height() + 40)/2, (viewportHeight - 400)*0.5

		viewportHeight = document.documentElement.clientHeight

		offsetTop = @$('.modalbody').outerHeight()/2

		# The offsetTop cannot exceed the bodyTop, because it would be
		# outside (on the top) the viewport.
		bodyTop = @$('.modalbody').offset().top
		offsetTop = bodyTop - 20 if offsetTop > bodyTop

		@$('.modalbody').css 'margin-top', -1 * offsetTop
		@$('.modalbody .body').css 'max-height', viewportHeight - 175

		if @options.focusOnFirstInput
			firstInput = @$('input[type="text"]').first()
			firstInput.focus() if firstInput.length > 0

		@

	# ### Events
	events:
		"click button.submit": 'submit'
		"click button.cancel": "cancel"
		"click .overlay": -> @cancel() if @options.clickOverlay
		"keydown input": (ev) ->
			if ev.keyCode is 13
				ev.preventDefault()
				@submit ev

	submit: (ev) ->
		target = $(ev.currentTarget)
		unless target.hasClass 'loader'
			target.addClass 'loader'
			@$('button.cancel').hide()
			@trigger 'submit'

	cancel: (ev) ->
		ev.preventDefault() if ev?

		@trigger 'cancel'
		@close()

	# ### Methods


	close: ->
		# Trigger close before removing the modal, otherwise there won't be a trigger!
		@trigger 'close'
		modalManager.remove @

	# Alias for close.
	destroy: -> @close()

	fadeOut: (delay = 1000) ->
		# Speed is used for $.fadeOut and to calculate the time at which to @remove the modal.
		# Set speed to 0 if delay is 0.
		speed = if delay is 0 then 0 else 500

		# Fade out the modal body (not the overlay!) at given speed.
		@$(".modalbody").delay(delay).fadeOut speed
		
		# Use setTimeout to @remove before $.fadeOut is completely finished, otherwise is interferes with the overlay
		setTimeout (=> @close()), delay + speed - 100

	message: (type, message) ->
		return console.error("Unknown message type!")  if ["success", "warning", "error"].indexOf(type) is -1
		@$("p.message").show()
		@$("p.message").html(message).addClass type

	messageAndFade: (type, message, delay) ->
		@$(".modalbody .body").hide()
		@$("footer").hide()
		@message type, message
		@fadeOut delay

module.exports = Modal