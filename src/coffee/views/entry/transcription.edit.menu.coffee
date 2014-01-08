# # Description...
# define (require) ->
# 	Fn = require 'hilib/functions/general'

# 	Views = 
# 		Base: require 'hilib/views/base'

# 	Tpl = require 'text!html/entry/transcription.edit.menu.html'

# 	# ## TranscriptionEditMenu
# 	class TranscriptionEditMenu extends Views.Base

# 		className: 'transcriptioneditmenu'

# 		# ### Initialize
# 		initialize: ->
# 			super

# 			@addListeners()

# 			@render()

# 		# ### Render
# 		render: ->
# 			rtpl = _.template Tpl, @model.toJSON()
# 			@$el.html rtpl

# 			@

# 		# ### Events
# 		events: ->
# 			'click button.ok': 'save'

# 		save: ->
# 			@model.save()

# 		# ### Methods
# 		setModel: (transcription) ->
# 			@model = transcription
# 			@addListeners()

# 		addListeners: ->
# 			@listenTo @model, 'sync', => @el.querySelector('button.ok').disabled = true
# 			@listenTo @model, 'change:body', => @el.querySelector('button.ok').disabled = false