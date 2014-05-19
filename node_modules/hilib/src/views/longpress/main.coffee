Fn = require '../../utils/general'

Views = 
	Base: require '../base'

codes = require './codes'
shiftcodes = require './shiftcodes' 
diacritics = require './diacritics'

class Longpress extends Views.Base



	# ### Initialize
	initialize: ->
		super

		@timer = null
		@lastKeyCode = null
		@keyDown = false

		@iframe = @options.parent.querySelector 'iframe'
		@iframeBody = @iframe.contentDocument.querySelector 'body'
		@iframeBody.addEventListener 'keydown', @onKeydown.bind @
		@iframeBody.addEventListener 'keyup', @onKeyup.bind @

		@editorBody = @options.parent
		@editorBody.addEventListener 'click', @onClick.bind @

	# ### Render
	render: (pressedChar) ->
		ul = document.createElement 'ul'
		ul.className = 'longpress'

		frag = document.createDocumentFragment()

		_.each diacritics[pressedChar], (chr) =>
			li = document.createElement 'li'
			li.textContent = chr
			$(li).mouseenter (e) => @replaceChar e.target.textContent
			frag.appendChild li

		ul.appendChild frag
		
		ul

	# ### Events
	onKeydown: (e) ->
		# Without @longkeydown check, the onkeydown handler will do some logic (place a char in the editor)
		# when the user clicks the editor or ul.longpress.
		if @longKeyDown
			e.preventDefault()
			return false

		# Get the pressedChar from the keyCode
		pressedChar = if e.shiftKey then shiftcodes[e.keyCode] else codes[e.keyCode]
		
		# If the pressedChar is found in one of the code maps (shiftcodes or codes) and if
		# the keyCode is equal to the lastKeyCode (so, an "e" was entered, if you hold the "e"-key, than
		# onkeydown keeps being fired, on the second pass we init the timer), than we show the list if it not already
		# is shown. 
		if e.keyCode is @lastKeyCode
			e.preventDefault()

			if pressedChar?
				# onKeyDown is going for it's second run (same char is held for two events in a row)
				@longKeyDown = true
				
				if not @timer?
					@timer = setTimeout (=>
						@rangeManager.set @iframe.contentWindow.getSelection().getRangeAt(0)
						list = @render pressedChar
						@show list
					), 300
		@lastKeyCode = e.keyCode

	onKeyup: (e) ->
		@longKeyDown = false
		@hide()

	# The click event is superfluous, because a character was already selected by the
	# mouseenter event, but will be frequently used by users.
	onClick: (e) ->
		# If the <ul> is visible.
		if @editorBody.querySelector('ul.longpress')?
			e.preventDefault()
			e.stopPropagation()

			# The click blurs (loses focus of) the iframe. So we have to reset it back to the
			# iframe and to it's original position so the user can keep typing.
			@resetFocus()

	# ### Methods

	destroy: ->
		@iframeBody.removeEventListener 'keydown', @onKeydown
		@iframeBody.removeEventListener 'keyup', @onKeyup
		@editorBody.removeEventListener 'click', @onClick

		@remove()

	rangeManager: do ->
		currentRange = null

		get: => currentRange
		set: (r) => currentRange = r.cloneRange()
		clear: => currentRange = null


	show: (list) ->
		@editorBody.appendChild list

	hide: ->
		@lastKeyCode = null
		list = @editorBody.querySelector '.longpress'
		if list?
			clearTimeout @timer
			@timer = null
			@rangeManager.clear()

			@editorBody.removeChild list


	replaceChar: (chr) ->
		# Get the range from the rangeManager.
		range = @rangeManager.get()
		# Set new start of the range one character backwards.
		range.setStart range.startContainer, range.startOffset - 1
		# Delete the selected character.
		range.deleteContents()
		# Insert the new character in place of the just removed character.
		range.insertNode document.createTextNode chr
		# Collapse to the end.
		range.collapse false

		@resetFocus()

	# Sets the focus on the iframe and the caret to the original position.
	resetFocus: ->
		# Set focus to the contentWindow before getting the selection.
		@iframe.contentWindow.focus()
		
		# Get the selection from the contentWindow.
		sel = @iframe.contentWindow.getSelection()
		# Remove all ranges.
		sel.removeAllRanges()
		# Add new collapsed range (which will be at the end of the just inserted character)
		sel.addRange @rangeManager.get()

module.exports = Longpress