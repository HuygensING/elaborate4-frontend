Base = require './base'

class Views extends Base
	
	has: (view) -> 
		if this.get(view.cid) then true else fals

module.exports = Views