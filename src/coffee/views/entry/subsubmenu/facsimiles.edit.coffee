# Description...
define (require) ->
	Fn = require 'hilib/functions/general'

	ajax = require 'hilib/managers/ajax'
	token = require 'hilib/managers/token'

	Views = 
		Base: require 'views/base'

	Tpl = require 'text!html/entry/subsubmenu/facsimiles.edit.html'

	# ## EditFacsimiles
	class EditFacsimiles extends Views.Base

		# ### Initialize
		initialize: ->
			super

			@listenTo @collection, 'add', @render
			@listenTo @collection, 'remove', @render

			@render()

		# ### Render
		render: ->
			rtpl = _.template Tpl, facsimiles: @collection
			@$el.html rtpl

			@

		# ### Events
		events: ->
			# 'click button.addtextlayer': 'addtextlayer'
			'click ul.facsimiles li': (ev) => $(ev.currentTarget).addClass 'destroy'
			'click ul.facsimiles li.destroy .orcancel': 'cancelRemove'
			'click ul.facsimiles li.destroy .name': 'destroyfacsimile'
			'keyup input[name="name"]': 'keyupName'
			'click button.addfacsimile': 'addfacsimile'

		keyupName: (ev) -> @el.querySelector('form.addfile').style.display = if ev.currentTarget.value.length > 0 then 'block' else 'none'

		# For ajax settings, see: http://stackoverflow.com/questions/166221/how-can-i-upload-files-asynchronously-with-jquery
		addfacsimile: (ev) ->
			ev.stopPropagation()
			ev.preventDefault()

			form = @el.querySelector 'form.addfile'
			formData = new FormData form

			jqXHR = ajax.post
				url: 'http://tiler01.huygensinstituut.knaw.nl:8080/facsimileservice/upload'
				data: formData
				cache: false
				contentType: false
				processData: false
			jqXHR.done (response) =>
				data =
					name: @el.querySelector('input[name="name"]').value
					filename: response[1].originalName
					zoomableUrl: response[1].jp2url

				@collection.create data, wait: true
				
			# oReq = new XMLHttpRequest()
			# oReq.open "POST", "http://tiler01.huygensinstituut.knaw.nl:8080/facsimileservice/upload", true
			# oReq.send formData

			# $.ajax
			# 	url: "http://tiler01.huygensinstituut.knaw.nl:8080/facsimileservice/upload"
			# 	type: "POST"
			# 	data: formData
			# 	processData: false
			# 	contentType: false

			# form = @el.querySelector 'form.addfile'
			# formData = new FormData form
			# formData.append('somefiled', 'igjs')
			# console.log form, formData
			# # return false
			# $.ajax
			# 	url: 'http://tiler01.huygensinstituut.knaw.nl:8080/facsimileservice/upload'
			# 	type: 'POST'
			# 	data: formData
			# 	cache: false
			# 	contentType: false
			# 	processData: false

		cancelRemove: (ev) ->
			ev.stopPropagation()
			parentLi = $(ev.currentTarget).parents('li')
			parentLi.removeClass 'destroy'

		destroyfacsimile: (ev) ->
			transcriptionID = $(ev.currentTarget).parents('li').attr 'data-id'
			@collection.remove @collection.get transcriptionID

		# addtextlayer: ->
		# 	name = @el.querySelector('input[name="name"]').value
		# 	text = @el.querySelector('textarea[name="text"]').value

		# 	unless name is ''
		# 		data = 
		# 			textLayer: name
		# 			body: text
		# 		@collection.create data, wait:true

		# # selectChanged: (ev) ->
		# # 	annotationTypeID = ev.currentTarget.options[ev.currentTarget.selectedIndex].getAttribute 'data-id'
		# # 	@model.set 'annotationType', @collection.get annotationTypeID
		# # 	console.log @model

		# # ### Methods