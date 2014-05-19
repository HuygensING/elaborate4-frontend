_ = require 'underscore'
$ = require 'jquery'
Fn = require '../utils/general'

# A validate function for validating the whole model. The function is added to every model instance we're listening to.
validate = (attrs, options) ->
	invalids = []

	# Flatten attributes, because nested attributes must also be targeted by a string (<input name="namespace.level.level2"> for namespace: {level: {level2: 'some value'}})
	flatAttrs = Fn.flattenObject(attrs)

	# Loop the validation settings and validate each attribute
	for own attr, settings of @validation
		invalidsPart = @validateAttr attr, flatAttrs[attr], attrs

		# If invalidsPart is filled (ie it is not undefined), union it with invalids.
		# The union function is a little overhead to keep it DRY.
		invalids = _.union invalids, invalidsPart if invalidsPart?

	# Return invalids array if populated, otherwise return nothing (and Backbone can continue with setting the model)
	invalids if invalids.length > 0

# A validate function for validating one attribute. The function is added to every model instance we're listening to.
validateAttr = (attr, value, attrs) ->
	return unless @validation?

	invalids = []

	# Loop the attributes validation settings: min-length, required, pattern, etc
	for own setting, settingValue of @validation[attr]
		msg = validators[setting] settingValue, value, attr, attrs

		# If a message is returned, add the required object to the invalids array
		if msg?
			invalids.push
				attr: attr
				msg: msg

	# Return invalids array if populated, otherwise return nothing (and Backbone can continue with setting the model)
	invalids if invalids.length > 0

validators =
	pattern: (settingValue, attrValue) ->
		switch settingValue
			when 'number'
				if attrValue.length > 0 and not /^\d+$/.test attrValue
					'Please enter a valid number.'

			when 'slug'
				if attrValue.length > 0 and not /^[a-z][a-z0-9-]+$/.test attrValue
					"A slug has to start with a letter and can only contain lower case letters, digits and dashes."

			when 'email'
				if attrValue.length > 0 and not /^(.+)@(.+)(\.((.){2,6}))+$/.test attrValue
					'Please enter a valid email address.'

	equal: (settingValue, attrValue, attr, attrs) ->
		if attrs? and attrValue isnt attrs[settingValue]
			"#{settingValue} and #{attr} should be equal."

	required: (settingValue, attrValue) ->
		if settingValue and attrValue.length is 0
			"Required field, please enter a value."

	'min-length': (settingValue, attrValue) ->
		if 0 < attrValue.length < settingValue
			"Length should be #{settingValue} at least."

	'max-length': (settingValue, attrValue) ->
		if attrValue.length > settingValue
			"Length should be #{settingValue} at most."

module.exports = 
	validatorInit: ->

		# Are we listening to a model or a collection?
		# Add the validate function to (all) the model(s)
		if @model?
			listenToObject = @model
			@model.validate = validate
			@model.validateAttr = validateAttr
		else if @collection?
			listenToObject = @collection
			@collection.each (model) => 
				model.validate = validate
				model.validateAttr = validateAttr

			# Add validate function to models which are added dynamically
			@listenTo @collection, 'add', (model, collection, options) => model.validate = validate
		else
			console.error "Validator mixin: no model or collection attached to view!"
			return

		@validatorAddListeners listenToObject

	validatorAddListeners: (listenToObject) ->
		# TODO if the listenToObject is a collection, does this work correct?
		@listenTo listenToObject, 'invalid', (model, errors, options) =>
			@validatorAddError model, error for error in errors

		@listenTo listenToObject, 'change', @validatorCheckErrors

		@listenTo listenToObject, 'invalid', (model, errors, options) ->
			@$('button[name="submit"]').removeClass('loader').addClass 'disabled'
			@$('div.error').remove()
			for error in errors
				div = $('<div class="error" />').html error.msg
				@$("[name=\"#{error.attr}\"]").after div

	validatorCheckErrors: (model, options) ->
		model = if @model? then @model else @getModel(ev)

		@$('button[name="submit"]').removeClass('disabled')
		
		for attr, value of model.changedAttributes()
			if errors = model.validateAttr(attr, value)
				@validatorAddError model.cid, error for error in errors
			else
				@validatorRemoveError model.cid, attr
	
	validatorAddError: (cid, error) ->
		form = @$ "[data-model-id=\"#{cid}\"]"
		form.find("[name=\"#{error.attr}\"]").addClass('invalid').attr 'title', error.msg
		form.find("label[for=\"#{error.attr}\"]").addClass('invalid').attr 'title', error.msg

	validatorRemoveError: (cid, attr) ->
		form = @$ "[data-model-id=\"#{cid}\"]"

		# Label
		form.find("label[for=\"#{attr}\"]").removeClass('invalid').attr 'title', ''
		
		# Input
		input = form.find("[name=\"#{attr}\"]")
		input.removeClass('invalid').attr 'title', ''

		# Div.error
		input.siblings('.error').remove()