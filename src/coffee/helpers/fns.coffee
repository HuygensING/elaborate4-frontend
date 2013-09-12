define (require) ->
	$ = require 'jquery'

	slugify: (str) ->
		from = "àáäâèéëêìíïîòóöôùúüûñç·/_:;"
		to   = "aaaaeeeeiiiioooouuuunc-----"
		
		str = str.trim().toLowerCase()
		strlen = str.length

		while strlen--

			index = from.indexOf str[strlen]
			
			str = str.substr(0, strlen) + to[index] + str.substr(strlen + 1) if index isnt -1

		str.replace(/[^a-z0-9 -]/g, '')
			.replace(/\s+|\-+/g, '-')
			.replace(/^\-+|\-+$/g, '')

	###
	Generates an ID that starts with a letter
	
	Example: "aBc12D34"

	param Number length of the id
	return String
	###
	generateID: (length) ->
		length = if length? and length > 0 then (length-1) else 7

		chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
		text = chars.charAt(Math.floor(Math.random() * 52)) # Start with a letter

		while length-- # Countdown is more lightweight than for-loop
			text += chars.charAt(Math.floor(Math.random() * chars.length))

		text

	###
	Deepcopies arrays and object literals
	
	return Array or object
	###
	deepCopy: (object) ->
		newEmpty = if Array.isArray(object) then [] else {}
		$.extend true, newEmpty, object

	###
	Starts a timer which resets when it is called again.
	
	Example: with a scroll event, when a user stops scrolling, the timer ends.
		Without the reset, the timer would fire dozens of times.
	
	return Function
	###
	timeoutWithReset: do ->
		timer = 0
		(ms, cb) ->
			clearTimeout timer
			timer = setTimeout cb, ms

	###
	Strips the tags from a string
	
	Example: "This is a <b>string</b>." => "This is a string."
	
	return String
	###
	stripTags: (str) ->
		$('<span />').html(str).text()

	###
	Removes non numbers from a string
	
	Example: "There are 12 monkeys." => "12"
	
	return String
	###
	onlyNumbers: (str) ->
		str.replace /[^\d.]/g, ''