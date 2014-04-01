Backbone = require 'backbone'
$ = require 'jquery'
Backbone.$ = $

history = require 'hilib/src/managers/history'

mainRouter = require './routers/main'

projects = require './collections/projects'

Views =
	Header: require './views/ui/header'

### DEBUG ###
Backbone.on 'authorized', -> console.log '[debug] authorized'
Backbone.on 'unauthorized', -> console.log '[debug] unauthorized'
### /DEBUG ###

module.exports = ->
	Backbone.history.start pushState: true

	mainRouter.init()

	$(document).on 'click', 'a:not([data-bypass])', (e) ->
		href = $(@).attr 'href'
		
		if href?
			e.preventDefault()

			Backbone.history.navigate href, 'trigger': true