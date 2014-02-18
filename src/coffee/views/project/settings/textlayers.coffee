config = require '../../../config'

ajax = require 'hilib/src/managers/ajax'

Views =
	Base: require 'hilib/src/views/base'
	EditableList: require 'hilib/src/views/form/editablelist/main'

tpl = require '../../../../jade/project/settings/textlayers.jade'

class ProjectSettingsTextlayers extends Views.Base

	className: 'textlayers'

	initialize: ->
		super

		@project = @options.project

		@render()

	render: ->
		@el.innerHTML = tpl()

		# Text layers
		textLayerList = new Views.EditableList
			value: @project.get('textLayers')
			config:
				settings:
					placeholder: 'Add layer'
					confirmRemove: true
		@listenTo textLayerList, 'confirmRemove', (id, confirm) => @trigger 'confirm', confirm,
			title: 'Caution!'
			html: 'You are about to <b>remove</b> the '+id+' layer<br><br>All texts and annotations will be <b>permanently</b> removed!'
			submitValue: 'Remove '+id+' layer'

		@listenTo textLayerList, 'change', (values) =>
			@project.set 'textLayers', values
			@project.saveTextlayers => @publish 'message', 'Text layers updated.'
		
		@$el.append textLayerList.el

		@

module.exports = ProjectSettingsTextlayers