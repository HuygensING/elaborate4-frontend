# MultiForm is a view for multiple forms, held together in a collection.
# The view Form is a set of inputs, selects and/or textareas, MultiForm is a collection
# of sets of inputs, selects and/or textareas. A view can be turned into a MultiForm by extending it.

Fn = require '../../utils/general'
validation = require '../..//managers/validation'
Form = require './main'

# ## MultiForm
class MultiForm extends Form

	# ### Events

	# Extend the events from Form
	events: -> _.extend super, 
		'click button.addform': 'addForm'
		'click button.remove': 'removeForm'

	addForm: (ev) -> @collection.add new @Model()

	removeForm: (ev) -> @collection.remove @getModel(ev)

	# ### Public Methods
	
	# Create collection of forms (or more accurate a collection of sets of inputs, selects and textareas).
	# MultiForm overrides Form.createObject (which creates a model instead of a collection). Is called from Form.
	createModels: ->
		@options.value ?= []

		@collection = new Backbone.Collection @options.value,
			model: @Model

		@trigger 'createModels:finished'

	# AddListeners is called from From
	addListeners: ->
		# One of the models attributes has changed:
		@listenTo @collection, 'change', => @triggerChange()

		# The user has clicked button.addform:
		@listenTo @collection, 'add', => @render()

		# The user has clicked button.remove
		@listenTo @collection, 'remove', =>
			@triggerChange()
			@render()


	# Helper function to get specific model from collection, depending on the event
	getModel: (ev) ->
		cid = $(ev.currentTarget).parents('[data-cid]').attr 'data-cid'
		@collection.get cid

	# Add and render subform for each form in the collection.
	addSubform: (attr, View) => @collection.each (model) => @renderSubform attr, View, model

module.exports = MultiForm