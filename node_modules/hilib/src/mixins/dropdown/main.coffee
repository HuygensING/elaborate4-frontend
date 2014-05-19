# Dropdown mixin

# ### Options (@options)
# * value
# * config
#
# ### Settings (@options.config.settings)
# * mutable: Boolean default is false, if true, a new model will be added to @collection when the value is not found in the collection
# * editable: Boolean default is false, if true, a button with edit class will be rendered, but no logic attached
# * inputClass: 'someClassName'
# * getModel: (value, collection) -> the passed in value can be a string (the id or the value) or an object (containing the id and/or value), because there is no way to know, the user can pass a function to retrieve the model
#
# ### Hooks
# * preDropdownRender
# * postDropdownRender
# * postDropdownFilter

# * TODO: CHANGE!!
# options
#	value
#	config
#		data
#		settings
#			mutable
#			editable
#			inputClass
#			getModel
#			placeholder

Backbone = require 'backbone'
_ = require 'underscore'
$ = require 'jquery'

Fn = require '../../utils/general'

# Collections =
	# Options: require 'hilib/mixins/dropdown/options'
optionMixin = require './options'

mainTpl = require './main.jade'

module.exports =
	# ### Initialize

	dropdownInitialize: ->
		@options.config ?= {}

		@data = @options.config.data ? {}
		
		@settings = @options.config.settings ? {}
		@settings.mutable ?= false
		@settings.editable ?= false
		@settings.defaultAdd ?= true

		@selected = null

		# First get the models, than create a collection holding all the options
		if @data instanceof Backbone.Collection # If data is a Backbone.Collection
			# The collection used to be cloned here (@data.clone()), but the collection would not update
			# if it was altered outside the dropdown, so clone was removed. It could however introduce
			# a bug for other projects. As far as I remember clone was added for Marginal Scholarship.
			# Clone was removed for eLaborate frontend (werkomgeving).
			@collection = @data
		else if _.isArray(@data) and _.isString(@data[0]) # Else if data is an array of strings
			models = @strArray2optionArray @data
			@collection = new Backbone.Collection models
		else
			console.error 'No valid data passed to dropdown'

		# Create a collection holding the filtered options (changes a when a user types in the input)
		@filtered_options = @collection.clone()

		# Extend the filtered options with "option functionality" (ie: next, previous, current)
		# We use an extend in stead of a separate Backbone.Collection because if @data is a Backbone.Collection it already exists.
		_.extend @filtered_options, optionMixin

		# Add listeners
		if @settings.mutable
			@listenTo @collection, 'add', (model, collection, options) =>
				@selected = model
				@triggerChange()

		@listenTo @collection, 'add', (model, collection, options) =>
			@trigger 'change:data', @collection.models
			@filtered_options.add model

		@listenTo @filtered_options, 'add', @renderOptions
		@listenTo @filtered_options, 'reset', @renderOptions
		@listenTo @filtered_options, 'currentOption:change', (model) => @$('li[data-id="'+model.id+'"]').addClass 'active'

		@on 'change', => @resetOptions()

	# ### Render

	dropdownRender: (tpl) ->
		@preDropdownRender() if @preDropdownRender?

		rtpl = tpl
			viewId: @cid
			selected: @selected
			settings: @settings
		@$el.html rtpl

		@$optionlist = @$ 'ul.list'

		@renderOptions()

		@$('input').focus()

		# Hide list when user clicks outside
		$('body').click (ev) => @hideOptionlist() unless @el is ev.target or Fn.isDescendant @el, ev.target

		@$('input').addClass @settings.inputClass if @settings.inputClass?

		@postDropdownRender() if @postDropdownRender?

		@

	# (Re)Renders the dropdown list with filtered options.
	renderOptions: ->
		rtpl = mainTpl
			collection: @filtered_options
			selected: @selected
		@$optionlist.html rtpl
	
	# ### Events

	dropdownEvents: ->
		evs =
			'click .caret': 'toggleList'
			'click li.list': 'addSelected'

		evs['keyup input[data-view-id="'+@cid+'"]']	= 'onKeyup'
		evs['keydown input[data-view-id="'+@cid+'"]']	= 'onKeydown'

		evs

	toggleList: (ev) ->
		@$optionlist.toggle()
		@$('input').focus()

	onKeydown: (ev) ->
		# Prevent browser from moving the cursor to beginning of the input value when pressing arrow up key
		ev.preventDefault() if ev.keyCode is 38 and @$optionlist.is(':visible')

	onKeyup: (ev) ->
		@$('.active').removeClass 'active'
		
		if ev.keyCode is 38 # Arrow up
			@$optionlist.show()
			@filtered_options.prev()
		else if ev.keyCode is 40 # Arrow down
			@$optionlist.show()
			@filtered_options.next()
		else if ev.keyCode is 13 # Enter
			@addSelected(ev)
		else if ev.keyCode is 27 # Escape
			@$optionlist.hide()
		else
			@filter ev.currentTarget.value

	# Before removing the view, remove the body click event listener
	destroy: ->
		$('body').off 'click'
		@remove()

	# Reset the filtered options collection
	# TODO This is only triggered by combolist, use it to reject the selected model in autosuggest too!
	resetOptions: ->
		@filtered_options.reset @collection.reject (model) => @selected.get(model.id)?
		@filtered_options.resetCurrentOption()
		@hideOptionlist()

	hideOptionlist: -> @$optionlist.hide()

	filter: (value) ->
		@$('button.edit').removeClass 'visible' if @settings.editable
		
		@resetOptions()

		if value.length > 1
			value = Fn.escapeRegExp value
			re = new RegExp value, 'i'
			models = @collection.filter (model) -> re.test model.get 'title'

			if models.length > 0
				@filtered_options.reset models
				@$optionlist.show()

		# Call post filter hook for views that have implemented it
		@postDropdownFilter models if @postDropdownFilter?

	# Turns an array of string ['la', 'li'] into an array of options [{id: 'la', title: 'la'}, {id: 'li', title: 'li'}] (model data for Backbone.Collectionn)
	strArray2optionArray: (strArray) -> _.map strArray, (item) -> id: item, title: item