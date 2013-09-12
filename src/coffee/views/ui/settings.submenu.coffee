define (require) ->
	BaseView = require 'views/base'

	Templates =
		'SubMenu': require 'text!html/ui/settings.submenu.html'
	
	class SettingsSubMenu extends BaseView

		events:
			'click li': 'buttonClicked'

		buttonClicked: (ev) ->
			ev.stopPropagation()

			@trigger 'clicked', 
				key: ev.currentTarget.getAttribute 'data-key'
				value: ev.currentTarget.getAttribute 'data-value'

		className: 'submenu'

		initialize: ->
			super
			
			@render()

		render: ->
			rtpl = _.template Templates.SubMenu, @options
			@$el.html rtpl

			@

		setState: (itemName, state) ->
			if itemName is 'save'
				saveButton = @$('[data-key="save"]')

				if state is 'active'
					saveButton.removeClass 'inactive'
					saveButton.html 'Save'
				else if state is 'inactive'
					saveButton.addClass 'inactive'
					saveButton.html 'Saved'
