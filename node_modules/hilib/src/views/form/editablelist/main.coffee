# TODO change @options.value to @options.values
# TODO remove collection; it's overkill
_ = require 'underscore'

Collections =
	Base: require '../../../collections/base'

Views = 
	Base: require '../../base'

tpl = require './main.jade'

class EditableList extends Views.Base

	className: 'editablelist'

	# ### Initialize
	initialize: ->
		super

		@options.config ?= {}
		@settings = @options.config.settings ? {}

		@settings.placeholder ?= ''
		@settings.confirmRemove ?= false

		# Turn array of strings into array of objects
		value = _.map @options.value, (val) -> id: val

		# Create a collection holding the selected or created options
		@selected = new Collections.Base value

		# When @selected changes, rerender the view
		@listenTo @selected, 'add', @render
		@listenTo @selected, 'remove', @render

		@render()

	# ### Render
	render: ->
		rtpl = tpl
			viewId: @cid
			selected: @selected
			settings: @settings

		@$el.html rtpl

		@triggerChange()

		@$('input').addClass @settings.inputClass if @settings.inputClass?
		@$('input').focus()

		@

	# ### Events
	events: ->
		evs =
			'click li span': 'removeLi'
			'click button': 'addSelected'

		evs['keyup input']	= 'onKeyup'

		evs

	removeLi: (ev) ->
		listitemID = ev.currentTarget.parentNode.getAttribute('data-id')

		if @settings.confirmRemove
			@trigger 'confirmRemove', listitemID, => @selected.removeById listitemID
		else
			@selected.removeById listitemID

	onKeyup: (ev) ->
		valueLength = ev.currentTarget.value.length

		if ev.keyCode is 13 and valueLength > 0
			@addSelected()
		else if valueLength > 1
			@showButton()
		else
			@hideButton()

	# ### Methods

	addSelected: ->
		@selected.add id: @el.querySelector('input').value
		@el.querySelector('button').style.display = 'none'

	showButton: (ev) ->	@el.querySelector('button').style.display = 'inline-block'
	
	hideButton: (ev) ->	@el.querySelector('button').style.display = 'none'
	
	triggerChange: -> @trigger 'change', @selected.pluck 'id'

module.exports = EditableList