Backbone = require 'backbone'
$ = require 'jquery'
_ = require 'underscore'
us = require 'underscore.string'
textlayers = require 'elaborate-modules/modules/collections/textlayers'
config = require 'elaborate-modules/modules/models/config'

SelectedPanels = require '../collections/selected-panels'

tpl = require '../templates/panels-menu.jade'

class PanelsMenu extends Backbone.View

	className: 'panels-menu'

	# ### Initialize
	initialize: ->
		@setSelectedPanels()

		@render()

	# ### Render
	render: ->
		@$el.html tpl
			facsimiles: @options.facsimiles
			textlayers: textlayers
			selectedPanels: config.get('selectedPanels')

		@placeholder = @$('li.placeholder')

		@panelSequence = @getPanelSequence()

		leaveTimer = null
		@$('ul').mouseleave => leaveTimer = setTimeout (=>
			@stopDrag()
			@$('ul').slideUp('fast')
		), 1000
		@$('ul').mouseenter => clearTimeout leaveTimer

		@

	getPanelSequence: -> _.map @$('li:not(.placeholder)'), (li) -> li.getAttribute('data-id')

	# ### Events
	events: ->
		'click button.green': 'toggleMenu'
		'click li': 'toggleOption'
		'mousedown li': (ev) -> @dragEl = $(ev.currentTarget) unless ev.target.tagName is 'I'
		'mouseup li': 'stopDrag'
		'mousemove': 'drag'

	drag: (ev) ->
		if @dragEl?				
			dragElTop = ev.clientY - @$('ul').offset().top - @dragEl.height()/2

			if 0 < dragElTop < @$('ul').outerHeight()
				@placeholder.insertBefore @dragEl
				@placeholder.show()
				@dragEl.css 'position', 'absolute'
				@dragEl.css 'top', dragElTop


			lis = @$('ul li')
			for li in lis
				liTop = $(li).position().top
				liIndex = lis.index(li)

				dragElHigherThanLi = dragElTop < liTop
				dragElLowerThanLastLi = liIndex is lis.length - 1 && dragElTop > liTop

				if dragElHigherThanLi
					@placeholder.insertBefore(li)
					break
				if dragElLowerThanLastLi
					@placeholder.insertAfter(li)
					break

	# TODO remove stopIt and fix click/mouseup different
	stopDrag: (ev) ->
		stopIt = =>
			# Only do drag logic if the @drag has been called, we can check this by the elements
			# position, because @drag sets it to 'absolute'.
			if @dragEl? and @dragEl.css('position') is 'absolute'
				selectedPanels = config.get('selectedPanels')

				@dragEl.insertAfter @placeholder
				@placeholder.hide()
				@dragEl.css 'position', 'static'
				@dragEl.css 'top', 'auto'
				panelId = @dragEl.attr 'data-id'
				newIndex = @$('ul li:not(.placeholder)').index @dragEl
				oldIndex = selectedPanels.indexOf selectedPanels.get(panelId)

				if oldIndex isnt newIndex
					selectedPanels.models.splice(newIndex, 0, selectedPanels.models.splice(oldIndex, 1)[0])
					selectedPanels.trigger 'sort'

			# Always set @dragEl to null, because @dragEl is also set on a click (mousedown is triggered)
			@dragEl = null

		setTimeout stopIt, 50

	toggleMenu: (ev) ->
		@$('ul').slideToggle('fast')

	toggleOption: (ev) ->
		return if @dragEl?

		target = @$(ev.currentTarget)
		icon = target.find('i.checkbox')
		icon.toggleClass 'fa-square-o'
		icon.toggleClass 'fa-check-square-o'

		# TODO Use .parent('li').attr so we can remove data-id from i.fa
		panelId = icon.attr('data-id')

		config.get('selectedPanels').get(panelId).set 'show', icon.hasClass 'fa-check-square-o'

	setSelectedPanels: ->
		models = []
		
		if config.has 'selectedPanels'
			selectedPanels = config.get('selectedPanels')
			selectedPanels.remove selectedPanels.where(type: 'facsimile')
		else
			selectedPanels = new SelectedPanels()

			for textLayer in textlayers.models
				models.push
					id: textLayer.id
					type: 'textlayer'
					show: textLayer.id is textlayers.current.id
					
		for facsimile, i in @options.facsimiles
			models.push
				id: facsimile.zoom 
				type: 'facsimile'
				show: i is 0

		selectedPanels.add models

		if @options.layerSlug?
			panel = selectedPanels.get(us.capitalize @options.layerSlug)
			panel.set 'show', true if panel?

		config.set 'selectedPanels', selectedPanels

	destroy: -> @remove()


module.exports = PanelsMenu