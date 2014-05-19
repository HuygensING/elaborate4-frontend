Backbone = require 'backbone'
$ = require 'jquery'
Backbone.$ = $
_ = require 'underscore'
us = require 'underscore.string'

dom = require 'hilib/src/utils/dom'

config = require '../../models/config'

textlayers = require '../../collections/textlayers'
entries = require '../../collections/entries'

Views =
	AnnotatedText: require '../annotated-text/annotated-text'
	PanelsMenu: require './views/panels-menu'
	FacsimilePanel: require './views/facsimile-panel'

tpl = require './templates/main.jade'

KEYCODE_ESCAPE = 27

class Panels extends Backbone.View

	tagName: 'article'

	# ### Initialize
	initialize: (@options={}) ->
		super

		@subviews = []

		modelLoaded = =>		
			entries.setCurrent @model.id
			@el.setAttribute 'id', 'entry-'+@model.id
			@render()

		# The IDs of the entries are passed to the collection on startup, so we can not check
		# isNew() if we need to fetch the full model or it already has been fetched.
		if @model = entries.get @options.entryId
			modelLoaded()
		else
			@model = if @options.entryId? then entries.findWhere datafile: @options.entryId+'.json' else entries.current

			@model.fetch().done => modelLoaded()

		$(window).resize @setHeights

	# ### Render
	render: ->
		rtpl = tpl
			metadata: @model.get('metadata') || []
			entryName: @model.get('name')
		@$el.html rtpl

		# @renderMetadata()
		@renderPanelsMenu()
		@renderPanels()

		@startListening()

		setTimeout @postRender.bind(@), 500

		@

	postRender: ->
		@setHeights()

		# Send the scroll top of the panels div to the facsimile panels, so we can stick it to the top.
		facsimilePanels = config.get('selectedPanels').where type: 'facsimile'
		@$('.panels').scroll => facsimilePanel.get('view').updatePosition @$('.panels').scrollTop() for facsimilePanel in facsimilePanels

		# activePanel = config.get('selectedPanels').get us.capitalize config.get('activeTextLayerId')
		activeLayerSlug = @options.layerSlug or config.get('activeTextLayerId')
		activePanel = config.get('selectedPanels').get us.capitalize activeLayerSlug

		# console.log activePanel
		if activePanel?		
			activePanelLeft = activePanel.get('view').$el.position().left
			activePanelWidth = activePanel.get('view').$el.width()
			windowWidth = $(window).width()

			hasScrollbar = @$('.panels')[0].scrollWidth > windowWidth
			panelOutOfView = @$('.panels')[0].scrollLeft + windowWidth < activePanelLeft + activePanelWidth

			if hasScrollbar and panelOutOfView
				@$('.panels').animate scrollLeft: activePanelLeft, 400, =>
					if @options.annotation?
						activePanel.get('view').highlightAnnotation @options.annotation
			else if @options.annotation?
				activePanel.get('view').highlightAnnotation @options.annotation

			if not @options.annotation? and config.get('facetedSearchResponse')?
				# Get the result from the faceted search response for this entry.
				result = _.findWhere config.get('facetedSearchResponse').get('results'), id: @model.id

				# Get the terms from the result and convert keys to array.
				# {piet: 4, poet: 2} => ['piet', 'poet']
				terms = Object.keys(result.terms)

				if terms.length > 0
					# If the active layer is an annotations layer, we highlight the terms in the annotations.
					if config.get('activeTextLayerIsAnnotationLayer')
						activePanel.get('view').highlightTermsInAnnotations terms
					# Otherwise we highlight the terms in the textlayer.
					else
						activePanel.get('view').highlightTerms terms

	renderPanelsMenu: ->
		@options.facsimiles = @model.get('facsimiles')
		panelsMenu = new Views.PanelsMenu @options
		@$el.prepend panelsMenu.$el

		@subviews.push panelsMenu

	renderPanels: ->
		@$('.panels').html ''
		@renderPanel panel for panel in config.get('selectedPanels').models

	renderPanel: (panel) ->
		if panel.get('type') is 'facsimile'
			view = @renderFacscimile panel.id
		else
			view = @renderTextLayer panel.id, panel.get('annotationsVisible')

		panel.set 'view', view

		@$('.panels').append panel.get('view').el
		
		className = if panel.get('show') then 'visible' else 'hidden'
		panel.get('view').$el.addClass className


	renderFacscimile: (zoomUrl) ->
		facsimilePanel = new Views.FacsimilePanel
			entry: @model.attributes
			zoomUrl: zoomUrl

		@subviews.push facsimilePanel

		facsimilePanel

	renderTextLayer: (textLayer, annotationsVisible) ->
		options =
			paralleltexts: @model.get('paralleltexts')
			annotationTypes: @model.get('annotationTypes')
			textLayer: textLayer
			scrollEl: @$('.panels')
			annotationsVisible: annotationsVisible

		options.annotation = @options.annotation if @options.annotation?
		options.term = @options.mark if @options.mark?

		@annotatedText = new Views.AnnotatedText options

		@subviews.push @annotatedText

		@annotatedText

	# ### Events
	events:
		# 'click button.toggle-metadata': -> @$('.metadata').toggleClass 'show-all'
		'click button.toggle-metadata': -> @$('.metadata ul').slideToggle('fast')
		'click i.print': -> window.print()

	# ### Methods
	destroy: ->
		@$('.panels').unbind 'scroll'

		view.destroy() for view in @subviews
		@remove()

	setHeights: ->
		panels = @$('.panels')

		if panels.length > 0
			panelHeight = $(window).height() - panels.offset().top
			panels.height panelHeight

			metadataList = @$('.metadata ul')
			metadataList.css 'max-height', $(window).height() - metadataList.offset().top

			facsimileHeight = panelHeight - panels.find('.facsimile header').height()

			panels.find('.facsimile iframe').height facsimileHeight - 20

	startListening: ->
		@listenTo config.get('selectedPanels'), 'change:show', (panel, value, options) =>
			$el = panel.get('view').$el

			addClassName = if value then 'visible' else 'hidden'
			removeClassName = if value then 'hidden' else 'visible'

			$el.removeClass removeClassName
			$el.addClass addClassName

			if value
				@$('.panels').animate scrollLeft: $el.position().left

		@listenTo config.get('selectedPanels'), 'sort', =>
			for panel in config.get('selectedPanels').models
				@$('.panels').append panel.get('view').el 
	
module.exports = Panels