# define (require) ->

# 	Models =
# 		state: require 'models/state'
# 		currentUser: require 'models/currentUser'

# 	Views = 
# 		Base: require 'hilib/views/base'

# 	Templates =
# 		Debug: require 'text!html/debug.html'

# 	class Debug extends Views.Base

# 		id: 'debug'

# 		events:
# 			'click .current-project': -> Models.state.getCurrentProject (project) -> console.log project
# 			'click .current-user': -> console.log Models.currentUser
# 			'click .state': -> console.log Models.state

# 		initialize: ->
# 			super

# 			@render()

# 		render: ->
# 			rtpl = _.template Templates.Debug
# 			@$el.html rtpl

# 			@