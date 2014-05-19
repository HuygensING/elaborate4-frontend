# ComboList is both an autosuggest and an editablelist. With an autosuggest, the selected value is set to the input. 
# With a ComboList, there can be multiple selected values, rendered in a ul beneath the input.
# The ComboList uses the dropdown mixin.
Backbone = require 'backbone'
_ = require 'underscore'

dom = require '../../../utils/dom'

Collections =
	Base: require '../../../collections/base'

Views = 
	Base: require '../../base'

tpl = require './main.jade'

# add to mixins
dropdown = require '../../../mixins/dropdown/main'

# ## ComboList

class ComboList extends Views.Base

	className: 'combolist'

	# ### Initialize

	initialize: ->
		super

		@options.config ?= {}
		@settings = @options.config.settings ? {}
		@settings.confirmRemove ?= false

		_.extend @, dropdown

		@dropdownInitialize()

		# Create a collection holding the selected or created options
		if @options.value instanceof Backbone.Collection # If data is a Backbone.Collection
			# * **CHANGE** instead of creating a new collection, we could add a 'options mixin' to current collection
			@selected = @options.value
		else if _.isArray @options.value # Else if data is an array of strings
			models = @strArray2optionArray @options.value
			@selected = new Collections.Base models
		else
			console.error 'No valid value passed to combolist'

		# selectedData = if _.isString @options.value[0] then @strArray2optionArray @options.value else []
		# @selected = new Collections.Base selectedData

		@listenTo @selected, 'add', (model) =>
			@dropdownRender tpl
			@triggerChange added: model.id

		@listenTo @selected, 'remove', (model) =>
			@dropdownRender tpl
			@triggerChange removed: model.id

		@dropdownRender tpl

	# ### Render
	postDropdownRender: ->
		# console.log 'before'
		@filtered_options.reset @collection.reject (model) => @selected.get(model.id)?
		# console.log 'after'
		# 'myval'
	# ### Events

	events: -> _.extend @dropdownEvents(), 
		'click li.selected span': 'removeSelected'
		'click button.add': 'createModel'
		'keyup input': 'toggleAddButton'

	toggleAddButton: (ev) ->
		return unless @settings.mutable

		button = dom(@el).q('button')

		if ev.currentTarget.value.length > 1 and ev.keyCode isnt 13
			button.show('inline-block')
		else
			button.hide()

	createModel: (ev) ->
		value = @el.querySelector('input').value

		@selected.add id: value, title: value if @settings.mutable and value.length > 1
	
	removeSelected: (ev) -> 
		listitemID = ev.currentTarget.parentNode.getAttribute('data-id')

		remove = => @selected.removeById listitemID

		if @settings.confirmRemove
			@trigger 'confirmRemove', listitemID, remove
		else
			remove()

	# ### Methods
	addSelected: (ev) ->
		# Check if ev is coming from keyup and double check if keyCode is 13
		# The model is a filtered option if it is current/active otherwise it is the value of input
		if ev.keyCode? and ev.keyCode is 13
			
			model = @filtered_options.currentOption if @filtered_options.currentOption?

			unless model?
				@createModel()
				return
				
		# Else it was a click event on li.list. Model is retrieved from @collection with <li data-id="13">
		else
			model = @collection.get ev.currentTarget.getAttribute 'data-id'
		
		@selected.add model

	triggerChange: (options) -> 
		options.added ?= null
		options.removed ?= null

		@trigger 'change', 
			selected: @selected.toJSON()
			added: options.added
			removed: options.removed

	# Turns an array of string ['la', 'li'] into an array of options [{id: 'la', title: 'la'}, {id: 'li', title: 'li'}] (model data for Backbone.Collectionn)
	strArray2optionArray: (strArray) -> _.map strArray, (item) -> id: item, title: item

module.exports = ComboList