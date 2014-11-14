Backbone = require 'backbone'
_ = require 'underscore'
$ = require 'jquery'

BaseView = require 'hilib/src/views/base'
ajax = require 'hilib/src/managers/ajax'
token = require 'hilib/src/managers/token'

config = require 'elaborate-modules/modules/models/config'
projects = require '../../../../collections/projects'

tpl = require './index.jade'

class EditMetadata extends BaseView

	className: 'edit-metadata'

	# ### Initialize
	initialize: (@options) ->
		super

		projects.getCurrent (@project) =>
			@render()

	# ### Render
	render: ->
		@el.innerHTML = tpl
			entrymetadatafields: @options.entryMetadataFields
			resultModel: @options.resultModel

		@

	events:
		"change .results input[type=\"checkbox\"]": "updateData"
		"change .form li .publishable-checkbox-container input[type=\"checkbox\"]": "updateData"
		"change .form li input.empty[type=\"checkbox\"]": "updateData"
		"keyup .form li > label + input[type=\"text\"]": "updateData"

	handleEmpty: (ev) ->


	updateData: ->
		@data =
			# Get all entry IDs from the result list that are checked
			projectEntryIds: (checkbox.id.substr("entry-".length) for checkbox in @el.querySelectorAll('.results li input[type="checkbox"]:checked'))
			settings: {}

		for input in @el.querySelectorAll 'input.value'
			if input.type is 'checkbox'
				if input.checked
					@data.settings[input.name] = true
			else
				if input.value.length > 0
					@data.settings[input.name] = input.value

		for checkbox in @el.querySelectorAll 'input.empty'
			name = checkbox.getAttribute('data-name')


			input = @el.querySelector "input[name=\"#{name}\"]"
			
			if checkbox.checked	
				if input.type is 'checkbox'
					input.checked = false
					input.setAttribute 'disabled', "disabled"
					@data.settings[name] = false
				else
					input.value = ""
					input.setAttribute 'placeholder', "To be emptied."
					input.setAttribute 'disabled', "disabled"
					@data.settings[name] = ""
			else
				if input.value is ""
					input.removeAttribute 'placeholder'
				input.removeAttribute 'disabled'

		@saveButtonIsActive()
		# if @saveButtonIsActive()
		# 	@$('li[data-key="save-edit-metadata"]').addClass 'active'
		# else
		# 	@$('li[data-key="save-edit-metadata"]').removeClass 'active'
		# # Loop over all checked icons, if the icon data-name is not
		# # present in @settings, an empty string is the value: this means
		# # the user wants to empty this field for selected entries.
		# for i in @el.querySelectorAll 'i.fa-check-square-o'
		# 	name = i.getAttribute('data-name')
		# 	unless @settings.hasOwnProperty name
		# 		@settings[name] = ''

		# @activateSaveButton()
	saveButtonIsActive: ->
		isActive = @data.projectEntryIds.length > 0 and not _.isEmpty(@data.settings)

		eventStr = if isActive then 'activate-save-button' else 'deactivate-save-button'

		@trigger eventStr

	save: ->
		# Get all entry IDs from the result list that are checked
		# entryIDs = (checkbox.id.substr("entry-".length) for checkbox in @el.querySelectorAll('.results li input[type="checkbox"]:checked'))

		# console.log entryIDs

		# return

		if @saveButtonIsActive()
			# Show loader
			saveButton = $('li[data-key="save-edit-metadata"]')
			saveButton.addClass 'loader'

			ajax.token = token.get()
			jqXHR = ajax.put
				url: "#{config.get('restUrl')}projects/#{@project.id}/multipleentrysettings"
				data: JSON.stringify @data
				dataType: 'text'

			jqXHR.done =>
				@publish 'message', 'Metadata of multiple entries saved.'
				saveButton.removeClass 'loader'
				@trigger 'saved'
				# @trigger 'close'

			jqXHR.fail (response) => 
				Backbone.history.navigate 'login', trigger: true if response.status is 401


module.exports = EditMetadata