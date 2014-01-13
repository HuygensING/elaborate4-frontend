# # Description...
# define (require) ->
# 	Fn = require 'hilib/functions/general'

# 	currentUser = require 'models/currentUser'

# 	Views = 
# 		Form: require 'hilib/views/form/main'

# 	# Tpl = require 'text!html/entry/metadata.html'
# 	tpls = require 'tpls'

# 	# ## EntryMetadata
# 	class EntryMetadata extends Views.Form

# 		# ### Initialize
# 		initialize: ->
# 			super

# 			@render()

# 		# ### Render
# 		render: ->
# 			console.log @model.toJSON()
# 			rtpl = tpls['entry/metadata']
# 				model: @model.toJSON()
# 				user: currentUser
# 			@$el.html rtpl

# 			@

# 		# # ### Events
# 		# events: ->
# 		# 	'change select': 'selectChanged'

# 		# selectChanged: (ev) ->
# 		# 	annotationTypeID = ev.currentTarget.options[ev.currentTarget.selectedIndex].getAttribute 'data-id'
# 		# 	@model.set 'annotationType', @collection.get annotationTypeID
# 		# 	console.log @model

# 		# # ### Methods