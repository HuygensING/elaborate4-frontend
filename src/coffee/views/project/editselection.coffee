# Description...
define (require) ->

	config = require 'config'

	ajax = require 'hilib/managers/ajax'
	token = require 'hilib/managers/token'

	Views = 
		Base: require 'hilib/views/base'

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
			@el.innerHTML = rtpl

			@

		# ### Events
		events: ->
			'click button[name="savemetadata"]': 'saveMetadata'
			'click button[name="cancel"]': -> @trigger 'close'
			'keyup input[type="text"]': 'toggleCheckboxes'
			'change input[type="checkbox"]': 'toggleCheckboxes'
			'click i.fa': 'toggleIncludeCheckboxes'

		emptyInput: (name) -> 
			input = @el.querySelector('input[name="'+name+'"]') 
			if input.type is 'checkbox'
				input.checked = false
			else
				input.value = ''


		toggleIncludeCheckboxes: (ev) ->
			$target = $(ev.currentTarget)
			$target.toggleClass 'fa-square-o'
			$target.toggleClass 'fa-check-square-o'

			if $target.hasClass 'fa-square-o'
				@emptyInput $target.attr('data-name')
				$target.removeClass 'include'
			else
				$target.addClass 'include'

			@updateSettings()
		# 	'change input.empty[type="checkbox"]': 'disableInput'

		# disableInput: (ev) ->
		# 	name = ev.currentTarget.getAttribute 'data-name'
		# 	input = @el.querySelector "input[name='#{name}']"

		# 	if input.hasAttribute 'disabled'
		# 		input.removeAttribute 'disabled'
		# 		input.removeAttribute 'placeholder'
		# 	else
		# 		input.value = ''
		# 		input.setAttribute 'disabled', 'disabled'
		# 		input.setAttribute 'placeholder', 'Text will be cleared.'

		# 	@toggleInactive()

			# 'change input[type="checkbox"]': 'toggleInactive'

		# If the input has a value, the checkbox next to input should be checked
		# checkInput: (ev) ->
		# 	cb = ev.currentTarget.nextSibling
		# 	cb.checked = ev.currentTarget.value.trim().length > 0
		# 	@toggleInactive()
		
		# Check if there are checkboxes checked, if so, activate the submit button,
		# if not, deactivate the submit button.


		### TODO ###
		# - in the input loop, check .active checkboxes
		# - on change .active, toggleInactive
		### TODO ###

		toggleCheckboxes: ->		
			for input in @el.querySelectorAll 'input'
				check = false

				if input.type is 'checkbox'
					if input.checked
						check = true
				else		
					if input.value.length > 0
						check = true

				$cb = @$('i[data-name="'+input.name+'"]')
				if check
					$cb.removeClass 'fa-square-o'
					$cb.addClass 'fa-check-square-o'
				else unless $cb.hasClass 'include'
					$cb.addClass 'fa-square-o'
					$cb.removeClass 'fa-check-square-o'

			@updateSettings()

		updateSettings: ->
			@settings = {}

			for input in @el.querySelectorAll 'input'
				if input.type is 'checkbox'
					if input.checked
						@settings[input.name] = true
				else		
					if input.value.length > 0
						@settings[input.name] = input.value

			for i in @el.querySelectorAll 'i.fa.include'
				name = i.getAttribute('data-name')
				input = @el.querySelector 'input[name="'+name+'"]'
				@settings[name] = if input.type is 'checkbox' then false else ''

			@activateSaveButton()

		activateSaveButton: ->
			# if entryCBs.length is 0 or metadataCBs.length is 0
			if _.isEmpty(@settings) or document.querySelectorAll('.entries input[type="checkbox"]:checked').length is 0
				@$('button[name="savemetadata"]').addClass 'inactive' 
			else
				@$('button[name="savemetadata"]').removeClass 'inactive'

		saveMetadata: (ev) ->
			ev.preventDefault()

			# console.log @model.get('entries')
			# console.log @settings

			# entryIDs = _.map document.querySelectorAll('.entries input[type="checkbox"]:checked'), (cb) => +cb.getAttribute 'data-id'

			# for id in entryIDs
			# 	entry = @model.get('entries').get(id)
			# 	if entry?
			# 		console.log entry
			# 		for own key, value of @settings
			# 			console.log 'k', key, 'v', value
			# 			entry.get('settings').set key, value

			# return

			unless $(ev.currentTarget).hasClass 'inactive'
				# Get all entry IDs from the result list that are checked
				entryIDs = _.map document.querySelectorAll('.entries input[type="checkbox"]:checked'), (cb) => +cb.getAttribute 'data-id'

				if entryIDs.length > 0 and not _.isEmpty(@settings)
					# Show loader
					saveButton = @$('button[name="savemetadata"]')
					saveButton.addClass 'loader'

					ajax.token = token.get()
					jqXHR = ajax.put
						url: config.baseUrl+"projects/#{@model.id}/multipleentrysettings"
						data: JSON.stringify
							projectEntryIds: entryIDs
							settings: @settings
						dataType: 'text'
					jqXHR.done =>
						saveButton.removeClass 'loader'
						@publish 'message', 'Metadata of multiple entries saved.'
						@trigger 'saved'
						@trigger 'close'
					jqXHR.fail (response) => Backbone.history.navigate 'login', trigger: true if response.status is 401

		# ### Methods