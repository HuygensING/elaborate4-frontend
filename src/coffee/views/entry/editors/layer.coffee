# Description...
define (require) ->

	viewManager = require 'hilib/managers/view'

	StringFn = require 'hilib/functions/string'

	Views = 
		Base: require 'views/base'
		SuperTinyEditor: require 'hilib/views/supertinyeditor/supertinyeditor'
		Modal: require 'hilib/views/modal/main'

	# ## LayerEditor
	class LayerEditor extends Views.Base

		className: ''

		# ### Initialize
		initialize: ->
			super

			@render()

		# ### Render
		render: ->
			@editor = viewManager.show @el, Views.SuperTinyEditor,
				controls:		['b_save', 'n', 'bold', 'italic', 'underline', 'strikethrough', '|', 'subscript', 'superscript', 'unformat', '|', 'diacritics', '|', 'undo', 'redo', '|', 'wordwrap']
				cssFile:		'/css/main.css'
				height:			@options.height
				html:			@model.get 'body'
				htmlAttribute:	'body'
				model:			@model
				width: 			@options.width

			@listenTo @editor, 'control:wordwrap', (wrap) => @trigger 'wrap', wrap
			@listenTo @editor, 'button:save', => 
				@model.save null, success: => @publish 'message', "#{@model.get('textLayer')} layer saved."

			@show()

			@

		# ### Events
		events: ->

		# ### Methods
		show: (textLayer) ->
			@hide() if @visible()

			if textLayer?
				@model = textLayer
				@editor.setModel @model

			@setURLPath()

			@el.style.display = 'block'

		hide: -> @el.style.display = 'none'

		visible: -> @el.style.display is 'block'

		setURLPath: ->
			oldFragment = Backbone.history.fragment
			# Cut off '/annotations/*' if it exists.
			index = oldFragment.indexOf '/transcriptions/'
			newFragment = if index isnt -1 then oldFragment.substr 0, index else oldFragment 
			
			oldTextLayer = oldFragment.substr index
			oldTextLayer = oldTextLayer.replace '/transcriptions/', ''
			index = oldTextLayer.indexOf '/'
			oldTextLayer = oldTextLayer.substr 0, index if index isnt -1

			newTextLayer = StringFn.slugify @model.get 'textLayer' 

			# Add the new textLayer to the fragment
			newFragment = newFragment + '/transcriptions/' + newTextLayer

			# Navigate to the new newFragment.
			Backbone.history.navigate newFragment, replace: true

		remove: ->
			@editor.remove()
			super