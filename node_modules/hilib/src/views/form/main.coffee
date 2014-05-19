# Example usage:
#
# form = new Views.Form
# 	tpl: Templates.FormTpl
#	tplData:
#		key: value
# 	model: @model (or Models.User)
# form.on 'change', => doThis()
# form.on 'save:success', => doThat()
# form.on 'save:error', => doSus()

Backbone = require 'backbone'
_ = require 'underscore'
$ = require 'jquery'

Fn = require '../../utils/general'
Views = 
	Base: require '../base'

validation = require '../../mixins/validation'

# OPTIONS
# subformConfig
# Model
# model
# tpl
# tplData
# value
# saveOnSubmit When form is submitted, save the model. Defaults to true.
# validationAttributes Array of attributes to validate, other attributes are ignored. Defaults to null.

# ## Form
class Form extends Views.Base

	# Overwritten by subclass
	tagName: 'form'

	className: 'hilib'

	# ### Initialize

	# @Model is used by Form to instanciate @model and by MultiForm as the model for @collection. If no @Model is given, use Backbone.Model.
	initialize: (@options={}) ->
		super

		_.extend @, validation

		@options.saveOnSubmit ?= true

		@subformConfig ?= @options.subformConfig
		@subformConfig ?= {}

		@Model ?= @options.Model
		@Model ?= Backbone.Model

		@tplData = @options.tplData ? {}
		@tpl ?= @options.tpl
		throw 'Unknow template!' unless @tpl?

		# Listener to trigger the render once the models (Form: @model, MultiForm: @collection) are loaded. If @model isnt isNew(),
		# data is fetched from the server. We could call @render from @createModels, but for readability sake, we call @render from
		# a centralized place.
		@on 'createModels:finished', @render, @
		@createModels()

		@validatorInit()
		
		@addListeners()


	# ### Render

	# PreRender is a NOOP that can be called by a child view 
	preRender: ->

	render: ->
		@preRender()

		@tplData.viewId = @cid
		@tplData.model = @model if @model?
		@tplData.collection = @collection if @collection?

		throw 'Unknow template!' unless @tpl?

		rtpl = if _.isString(@tpl) then _.template @tpl, @tplData else @tpl @tplData
		@$el.html rtpl

		# @el.setAttribute 'data-view-cid', @cid

		@subforms ?= {}
		@addSubform attr, View for own attr, View of @subforms

		# If form is hidden by display: none when rendered, this does not work! Hiding the form using opacity 0 does work.
		@$('textarea').each (index, textarea) => 
			textarea.style.height = if textarea.scrollHeight+6 > 32 then textarea.scrollHeight+6+'px' else '32px'

		@postRender()

		@

	# PostRender is a NOOP that can be called by a child view 
	postRender: ->


	# ### Events

	# MultiForm extends the events.
	events: ->
		evs = {}

		evs["keyup [data-model-id='#{@model.cid}'] textarea"] = "inputChanged"
		evs["keyup [data-model-id='#{@model.cid}'] input"] = "inputChanged"
		evs["change [data-model-id='#{@model.cid}'] input[type=\"checkbox\"]"] = "inputChanged"
		evs["change [data-model-id='#{@model.cid}'] select"] = "inputChanged"
		evs["keydown [data-model-id='#{@model.cid}'] textarea"] = "textareaKeyup"
		# evs["keyup [data-model-id='#{@model.cid}'] textarea"] = "keyUp"
		# evs["keyup [data-model-id='#{@model.cid}'] input"] = "keyUp"
		evs["click input[type=\"submit\"]"] = "submit"
		evs["click button[name=\"submit\"]"] = "submit"
		evs["click button[name=\"cancel\"]"] = "cancel"

		evs

	# When the input changes, the new value is set to the model. 
	# A listener on the models change event (collection change in case of MultiForm) calls @triggerChange.
	inputChanged: (ev) ->
		# Removed stopPropagation because the events would not get to parent view
		# ev.stopPropagation()

		model = if @model? then @model else @getModel(ev)

		value = if ev.currentTarget.type is 'checkbox' then ev.currentTarget.checked else ev.currentTarget.value
		model.set ev.currentTarget.name, value if ev.currentTarget.name isnt ''

	textareaKeyup: (ev) ->
		ev.currentTarget.style.height = '32px'
		ev.currentTarget.style.height = ev.currentTarget.scrollHeight + 6 + 'px'

	saveModel: (validate=true) ->
		@model.save [],
			validate: validate
			success: (model, response, options) =>
				# After save we trigger the save:success so the instantiated Form view can capture it and take action.
				@trigger 'save:success', model, response, options
				target = if ev? then @$(ev.currentTarget) else @$ 'button[name="submit"]'
				# console.log target
				target.removeClass 'loader'
				target.addClass 'disabled'
			error: (model, xhr, options) => @trigger 'save:error', model, xhr, options

	submit: (ev) ->
		ev.preventDefault()

		target = @$(ev.currentTarget)

		# If submit button has a loader or is disabled we don't do anything
		unless target.hasClass('loader') or target.hasClass('disabled')
			target.addClass 'loader'
			
			if @options.saveOnSubmit
				@saveModel()
			else
				# Manually check for invalids
				invalids = @model.validate @model.attributes
				if invalids?
					@model.trigger 'invalid', @model, invalids
				else
					@trigger 'submit', @model


	cancel: (ev) ->
		ev.preventDefault()
		@trigger 'cancel'


	# ### METHODS

	# noop
	customAdd: -> console.error 'Form.customAdd is not implemented!'

	# Reset the form to original state
	# * TODO: this only works on new models, not on editting a model
	reset: ->
		target = @$ 'button[name="submit"]'
		target.removeClass 'loader'
		target.addClass 'disabled'
		
		@stopListening @model

		# Clone the model to remove any references
		@model = @model.clone()
		# Clear the model and restore the attributes to default values
		@model.clear silent: true
		@model.set @model.defaults()

		@validatorInit()
		@addListeners()

		@delegateEvents()

		@el.querySelector('[data-model-id]').setAttribute 'data-model-id', @model.cid

		# Empty the form elements
		@el.reset()

	# Create the form model. If model isnt new (has an id), fetch data from server.
	# MultiForm overrides this method and creates a collection.
	createModels: ->
		unless @model?
			@options.value ?= {}
			@model = new @Model @options.value

			if @model.isNew()
				@trigger 'createModels:finished'
			else
				@model.fetch
					success: => @trigger 'createModels:finished'
		else
			@trigger 'createModels:finished'
		
			
		### @on 'validator:validated', => $('button.save').prop('disabled', false).removeAttr('title') ###
		### @on 'validator:invalidated', => $('button.save').prop('disabled', true).attr 'title', 'The form cannot be saved due to invalid values.' ###

	# Listen to changes on the model. MultiForm overrides this method.
	addListeners: ->
		@listenTo @model, 'change', => @triggerChange()
		@listenTo @model, 'invalid', (model, errors, options) =>
			if @options.validationAttributes?
				found = false
				for error in errors
					found = true if @options.validationAttributes.indexOf(error.name) > -1
				unless found
					@$('button[name="submit"]').addClass 'loader'
					@saveModel false
			
	
	# Fires change event. Data passed depends on an available @model (Form)	or @collection (MultiForm)
	triggerChange: ->
		object = if @model? then @model else @collection
		@trigger 'change', object.toJSON(), object

	# Add subform delegates to renderSubform. In MultiForm @renderSubform is called for every model inside the collection.
	addSubform: (attr, View) => @renderSubform attr, View, @model

	# Renders, attaches and listens to a subform (also an instance of Form or MultiForm)
	renderSubform: (attr, View, model) =>
		# If the attr is a flattened attr (ie: origin.region.place), flatten the model and retrieve the value.
		# If not, just get the value from the model the regular way.
		value = if attr.indexOf('.') > -1 then Fn.flattenObject(model.attributes)[attr] else model.get attr
		console.error 'Subform value is undefined!', @model unless value?

		# TODO Remove as subviews
		view = new View
			value: value
			config: @subformConfig[attr]

		@subviews.push view

		# A className cannot contain dots, so replace dots with underscores
		htmlSafeAttr = attr.split('.').join('_')
		
		placeholders = @el.querySelectorAll "[data-cid='#{model.cid}'] .#{htmlSafeAttr}-placeholder"
	
		# If the querySelectorAll finds placeholders with the same className, then we have to find the one that is
		# nested directly under the el (<ul>) with the current model.cid. We need to do this because forms can be nested
		# and the selector '[data-cid] .placeholder' will also yield nested placeholders.
		if placeholders.length > 1
			_.each placeholders, (placeholder) =>
				# Find closest element with the attribute data-cid.
				el = Fn.closest placeholder, '[data-cid]'
				# If the data-cid matches the model.cid and the placeholder is still empty, append the view.
				if el.getAttribute('data-cid') is model.cid and placeholder.innerHTML is ''
					placeholder.appendChild view.el
		else
			# If just one placeholder is found, append the view to it.
			placeholders[0].appendChild view.el

		@listenTo view, 'change', (data) => model.set attr, data
		@listenTo view, 'customAdd', @customAdd

		# Multiform has multiple instances of the same form elements. Those form elements can have a config.data (Backbone.Collection)
		# attribute which populates (for example) an autosuggest. The config.data is cloned, otherwise the elements would update eachother.
		# Therefor we need a central reference to the collection: @subformConfig[attr].data. If one of the elements changes the data,
		# @subformConfig[attr].data will be updated, so all the elements get the same data on rerender.
		@listenTo view, 'change:data', (models) => @subformConfig[attr].data = @subformConfig[attr].data.reset models

	destroy: ->
		view.destroy() for view in @subviews
		@remove()

module.exports = Form