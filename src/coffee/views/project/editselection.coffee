# Description...
define (require) ->

	config = require 'config'

	ajax = require 'hilib/managers/ajax'
	token = require 'hilib/managers/token'

	Views = 
		Base: require 'views/base'

	# Templates =
	# 	EditSelection: require 'text!html/project/editselection.html'

	tpls = require 'tpls'

	# ## EditSelection
	class EditSelection extends Views.Base

		# ### Initialize
		initialize: ->
			super

			@render()

		# ### Render
		render: ->
			rtpl = tpls['project/editselection'] @model.attributes
			@$el.html rtpl

			@

		# ### Events
		events: ->
			'click button[name="savemetadata"]': 'saveMetadata'
			'click button[name="cancel"]': -> @hide()
			'keyup input[type="text"]': 'checkInput'
			'change input[type="checkbox"]': 'toggleInactive'

		# If the input has a value, the checkbox next to input should be checked
		checkInput: (ev) ->
			cb = ev.currentTarget.nextSibling
			cb.checked = ev.currentTarget.value.trim().length > 0
			@toggleInactive()
		
		# Check if there are checkboxes checked, if so, activate the submit button,
		# if not, deactivate the submit button.
		toggleInactive: ->
			entryCBs = document.querySelectorAll('.entries input[type="checkbox"]:checked')
			metadataCBs = @el.querySelectorAll('input[type=checkbox]:checked')

			if entryCBs.length is 0 or metadataCBs.length is 0
				@$('button[name="savemetadata"]').addClass 'inactive' 
			else
				@$('button[name="savemetadata"]').removeClass 'inactive'

		saveMetadata: (ev) ->
			ev.preventDefault()

			unless $(ev.currentTarget).hasClass 'inactive'
				# Get all entry IDs from the result list that are checked
				entryIDs = _.map document.querySelectorAll('.entries input[type="checkbox"]:checked'), (cb) => +cb.getAttribute 'data-id'
				
				# Create a hash of metadata to change
				settings = {}
				_.each @el.querySelectorAll('input[type="checkbox"]:checked'), (cb) =>
					key = cb.getAttribute 'data-name'
					value = @el.querySelector("input[name='#{key}']").value
					# Only add the key/value to the settings if the value string is longer than 0 characters.
					settings[key] = value if value.trim().length > 0

				if entryIDs.length > 0 and _.size(settings) > 0
					# Show loader
					saveButton = @$('button[name="savemetadata"]')
					saveButton.addClass 'loader'

					ajax.token = token.get()
					jqXHR = ajax.put
						url: config.baseUrl+"projects/#{@model.id}/multipleentrysettings"
						data: JSON.stringify
							projectEntryIds: entryIDs
							settings: settings
						dataType: 'text'
					jqXHR.done =>
						saveButton.removeClass 'loader'
						@publish 'message', 'Metadata of multiple entries saved.'
						@hide()
					jqXHR.fail (response) => Backbone.history.navigate 'login', trigger: true if response.status is 401

		# ### Methods

		hide: ->
			@trigger 'close'
			@el.querySelector('form').reset()
		