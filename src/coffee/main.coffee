$ = require 'jquery'
app = require './app'

stylus = require 'stylus'

$ -> 
	app()
	stylus.render 'b\n\tcolor #000', (err, css) -> console.log err, css