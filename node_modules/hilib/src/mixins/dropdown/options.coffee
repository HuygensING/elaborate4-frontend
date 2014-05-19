# Mixin for Backbone.Collections that are used in a dropdown view.
#
# ## DropdownOptions mixin
module.exports =
	dropdownOptionsInitialize: -> @resetCurrentOption()

	resetCurrentOption: -> @currentOption = null

	setCurrentOption: (model) ->
		@currentOption = model
		@trigger 'currentOption:change', @currentOption

	prev: ->
		previousIndex = @indexOf(@currentOption) - 1
		previousIndex = @length - 1 if previousIndex < 0
		@setCurrentOption @at previousIndex

	next: ->
		nextIndex = @indexOf(@currentOption) + 1
		nextIndex = 0 if nextIndex > (@length - 1)
		@setCurrentOption @at nextIndex