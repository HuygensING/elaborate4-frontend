# Description...
define (require) ->

	ajax = require 'hilib/managers/ajax'
	token = require 'hilib/managers/token'

	Views = 
		Base: require 'views/base'

	Templates =
		EditSelection: require 'text!html/project/editselection.html'

	# ## EditSelection
	class EditSelection extends Views.Base

		# ### Initialize
		initialize: ->
			super

			@render()

		# ### Render
		render: ->
			rtpl = _.template Templates.EditSelection, @model.attributes
			@$el.html rtpl

			@

		# ### Events
		events: ->
			'click button[name="editselection"]': 'saveEditSelection'
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
			if @el.querySelectorAll('input[type=checkbox]:checked').length is 0
				@$('button[name="editselection"]').addClass 'inactive' 
			else
				@$('button[name="editselection"]').removeClass 'inactive'

		saveEditSelection: (ev) ->
			ev.preventDefault()

			unless $(ev.currentTarget).hasClass 'inactive'
				entryIDs = _.map document.querySelectorAll('.entries input[type="checkbox"]:checked'), (cb) => parseInt cb.getAttribute('data-id'), 10
				
				settings = {}
				_.each @el.querySelectorAll('input[type="checkbox"]:checked'), (cb) =>
					name = cb.getAttribute 'data-name'
					settings[name] = @el.querySelector("input[name='#{name}']").value

				# TODO add settings.size to if
				console.log entryIDs.length
				if entryIDs.length > 0
					ajax.token = token.get()
					ajax.put
						url: "projects/#{@model.id}/multipleentrysettings"
						data: JSON.stringify
							projectEntityIds: entryIDs
							settings: settings


# PUT /projects/{project_id}/multipleentrysettings

# {
# "projectEntityIds" : [1,2,3],
# "settings" : {
# "Publishable" : false,
# "field1" : "value1",
# "field2" : "value2",
# ....
# }
# }

		# ### Methods
		