define (require) ->

	Models = 
		Base: require 'models/base'

	class Search extends Models.Base