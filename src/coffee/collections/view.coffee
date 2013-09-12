define (require) ->
	Base = require 'collections/base'

	class Views extends Base
		
		has: (view) -> 
			if this.get(view.cid) then true else false