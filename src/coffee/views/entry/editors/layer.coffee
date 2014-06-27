Backbone = require 'backbone'

viewManager = require 'hilib/src/managers/view2'

StringFn = require 'hilib/src/utils/string'

Views = 
	Base: require 'hilib/src/views/base'
	SuperTinyEditor: require 'hilib/src/views/supertinyeditor/supertinyeditor'
	Modal: require 'hilib/src/views/modal'

pkg = require '../../../../../package.json'

# ## LayerEditor
class LayerEditor extends Views.Base

	className: ''

	# ### Initialize
	initialize: ->
		super

		@render()

	# ### Render
	render: ->
		@subviews.editor = new Views.SuperTinyEditor
			controls:		['b_save', 'n', 'bold', 'italic', 'underline', 'strikethrough', '|', 'subscript', 'superscript', 'removeFormat', '|', 'diacritics', '|', 'undo', 'redo', '|', 'wordwrap']
			cssFile:		"/css/main-#{pkg.version}.css"
			height:			@options.height
			html:			@model.get 'body'
			htmlAttribute:	'body'
			model:			@model
			width: 			@options.width
		@$el.html @subviews.editor.el

		@listenTo @subviews.editor, 'control:wordwrap', (wrap) => @trigger 'wrap', wrap
		@listenTo @subviews.editor, 'button:save', => 
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
			@subviews.editor.setModel @model

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
		@subviews.editor.remove()
		super

module.exports = LayerEditor