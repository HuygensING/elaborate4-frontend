class Token

	token: null

	set: (@token, type='SimpleAuth') -> 
		sessionStorage.setItem 'huygens_token_type', type
		sessionStorage.setItem 'huygens_token', @token

	getType: -> sessionStorage.getItem 'huygens_token_type'

	get: ->	
		@token = sessionStorage.getItem 'huygens_token' if not @token?

		@token

	clear: ->
		sessionStorage.removeItem 'huygens_token'
		sessionStorage.removeItem 'huygens_token_type'

module.exports = new Token()