Backbone = require 'backbone'

config = require './config'
us = require 'underscore.string'

class Entry extends Backbone.Model

	annotationsIndex: {}
	
	url: -> "#{config.get('basePath')}/data/#{@get('datafile')}"

	# _id is added in the config's parse, so we can access the id. The id is added when we fetch the {id}.json. In order to
	# keep using methods like isNew() to check if the model is already fetched, we don't want to set 'id' in the config's parse.
	defaults: ->
		_id: null
		datafile: ''
		name: ''
		thumbnails: []

	parse: (data) ->
		if data.paralleltexts?
			for version of data.paralleltexts
				i = 1
				text = data.paralleltexts[version].text
				text = '<div class="line">' + text.replace(/\n|<br>/g, '</div><div class="line">') + '</div>'
				text = text.replace /(<div class="line">)(\s*<span[^>]+><\/span>\s*)(<\/div>)/mg, "$1$2&nbsp;$3"
				data.paralleltexts[version].text = text

				@annotationsIndex[ann.n] = ann for ann in data.paralleltexts[version].annotationData

		# New tiler version, with white background
		for page in data.facsimiles
			page.zoom = page.zoom.replace 'adore-huygens-viewer-2.0', 'adore-huygens-viewer-2.1'

		# Create a hash of annotationTypes with the name as key and count as value.
		data.annotationTypes = {}
		for text, textdata of data.paralleltexts
			data.annotationTypes[text] = {}

			for annotation in textdata.annotationData
				# TODO Server side
				annotation.type.name = annotation.type.name.replace '"', ''
				annotation.type.name = us.trim annotation.type.name
				# /TODO
				if data.annotationTypes[text].hasOwnProperty annotation.type.name
					data.annotationTypes[text][annotation.type.name]++
				else
					data.annotationTypes[text][annotation.type.name] = 1

		data

	text: (key) ->
		texts = @get 'paralleltexts'
		if texts and key of texts then texts[key].text else undefined

	# textVersions: ->
	# 	key for key of @get 'paralleltexts'

	annotations: (key) ->
		texts = @get 'paralleltexts'
		if texts and key of texts then texts[key].annotationData else undefined

	annotation: (id) -> @annotationsIndex[id]

	facsimileZoomURL: (page) ->
		@get('facsimiles')?[page]?.zoom

	facsimileURL: (options) ->
		sizes =
			small: 2
			medium: 3
			large: 4

		size = options?.size || 'medium'
		level = sizes[size]

		facsimiles = @get 'facsimiles'
		url = facsimiles?[0]?.thumbnail

		url?.replace /svc.level=\d+/, "svc.level=#{level}"

	createUrl: (textLayer, annotation) ->
		base = "/entry/#{@get('_id')}"

		base += "/#{us.slugify textLayer}" if textLayer?
		base += "/#{annotation}" if annotation? and textLayer?

		base

	createMarkUrl: (layer, term) -> "entry/#{@get('_id')}/#{us.slugify layer}/mark/#{term}"

module.exports = Entry