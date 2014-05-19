$ = require 'jquery'

do (jQuery=$) ->

	jQuery.expr[":"].contains = $.expr.createPseudo (arg) ->
		(elem) -> $(elem).text().toUpperCase().indexOf(arg.toUpperCase()) >= 0

	jQuery.fn.scrollTo = (newPos, args) ->
		defaults = 
			start: ->
			complete: ->
			duration: 500

		options = $.extend defaults, args

		options.start() if options.start

		scrollTop = @scrollTop()
		top = @offset().top
		extraOffset = 60

		newPos = newPos + scrollTop - top - extraOffset

		if newPos isnt scrollTop
			@animate {scrollTop: newPos}, options.duration, options.complete
		else
			options.complete()

	jQuery.fn.highlight = (delay) ->
		delay = delay || 3000

		@addClass 'highlight'

		setTimeout (=>
			@removeClass 'highlight'
		), delay

	###
	Render remove button in element
	###
	jQuery.fn.appendCloseButton = (args={}) ->
		{corner, html, close} = args

		html ?= '<img src="/images/hilib/icon.close.png">'
		corner ?= 'topright'

		$closeButton = $('<div class="closebutton">').html html

		$closeButton.css 'position', 'absolute'
		$closeButton.css 'opacity', '0.2'
		$closeButton.css 'cursor', 'pointer'
		
		switch corner
			when 'topright'
				$closeButton.css 'right', '8px'
				$closeButton.css 'top', '8px'
			when 'bottomright'
				$closeButton.css 'right', '8px'
				$closeButton.css 'bottom', '8px'

		@prepend $closeButton

		$closeButton.hover ((ev) -> $closeButton.css 'opacity', 100), ((ev) -> $closeButton.css 'opacity', 0.2)
		$closeButton.click => close()





		
		# visible = false

		# closeButton.onmouseover = 

		# mousemoveEl.onmousemove = (ev) =>
		# 	console.log 'move'
		# 	if ev.target is el or @isDescendant el, ev.target
		# 		if corner is 'topright' and bb.right - 30 < ev.pageX < bb.right and bb.top < ev.pageY < bb.top + 30
		# 			if not visible
		# 				closeButton.style.display = 'block'
		# 				visible = true
		# 		else
		# 			closeButton.style.display = 'none'
		# 			visible = false
		# 	else
		# 		closeButton.style.display = 'none'
		# 		visible = false