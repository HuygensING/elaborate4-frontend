define (require) ->
	config = require 'config'

	ajax = require 'hilib/managers/ajax'

	Views =
		Base: require 'hilib/views/base'
		EditableList: require 'hilib/views/form/editablelist/main'

	tpls = require 'tpls'
	
	class ProjectSettingsTextlayers extends Views.Base

		className: 'textlayers'

		initialize: ->
			super

			@project = @options.project

			@render()

		render: ->
			@el.innerHTML = tpls['project/settings/textlayers']()

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