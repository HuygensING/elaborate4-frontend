class History

	history: []

	update: ->
		@history.push window.location.pathname if window.location.pathname isnt '/login'
		sessionStorage.setItem 'history', JSON.stringify(@history)

	clear: ->
		sessionStorage.removeItem 'history'

	last: ->
		@history[@history.length-1]

module.exports = new History()