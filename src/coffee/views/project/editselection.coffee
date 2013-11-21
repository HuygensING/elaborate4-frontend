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
			'click button[name="savemetadata"]': 'saveEditSelection'
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

		saveEditSelection: (ev) ->
			ev.preventDefault()

			unless $(ev.currentTarget).hasClass 'inactive'
				entryIDs = _.map document.querySelectorAll('.entries input[type="checkbox"]:checked'), (cb) => parseInt cb.getAttribute('data-id'), 10
				
				settings = {}
				_.each @el.querySelectorAll('input[type="checkbox"]:checked'), (cb) =>
					key = cb.getAttribute 'data-name'
					value = @el.querySelector("input[name='#{key}']").value
					# Only add the key/value to the settings if the value string is longer than 0 characters.
					settings[key] = value if value.trim().length > 0

				if entryIDs.length > 0 and _.size(settings) > 0
					ajax.token = token.get()
					jqXHR = ajax.put
						url: config.baseUrl+"projects/#{@model.id}/multipleentrysettings"
						data: JSON.stringify
							projectEntryIds: entryIDs
							settings: settings
						dataType: 'text'
					jqXHR.done =>
						@publish 'message', 'Metadata of multiple entries saved.'
						@hide()
					jqXHR.fail (jqXHR, textStatus, errorThrown) => console.log jqXHR, textStatus, errorThrown

		# ### Methods

		hide: ->
			@trigger 'close'
			@el.querySelector('form').reset()
			@el.style.display = 'none'
		