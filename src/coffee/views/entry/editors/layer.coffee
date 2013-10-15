# Description...
define (require) ->

	StringFn = require 'hilib/functions/string'

	Views = 
		Base: require 'views/base'
		SuperTinyEditor: require 'hilib/views/supertinyeditor/supertinyeditor'

	# ## LayerEditor
	class LayerEditor extends Views.Base

		className: ''

		# ### Initialize
		initialize: ->
			super

			@render()

		# ### Render
		render: ->
			$el = @$('.transcription-placeholder')
			@editor = new Views.SuperTinyEditor
				controls:		['b_save', 'n', 'bold', 'italic', 'underline', 'strikethrough', '|', 'subscript', 'superscript', 'unformat', '|', 'undo', 'redo']
				cssFile:		'/css/main.css'
				el:				@$('.transcription-editor')
				height:			@options.height
				html:			@model.get 'body'
				htmlAttribute:	'body'
				model:			@model
				width: 			@options.width
			@listenTo @editor, 'save', => @model.save()

			@show()

			@

		# ### Events
		events: ->

		# ### Methods
		show: (layer) ->
			@model = layer if layer?

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