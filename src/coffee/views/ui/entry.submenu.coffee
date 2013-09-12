define (require) ->
	BaseView = require 'views/base'

	Templates =
		'SubMenu': require 'text!html/ui/entry.submenu.html'
	
	class SubMenu extends BaseView

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