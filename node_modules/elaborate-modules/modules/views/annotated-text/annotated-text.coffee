Backbone = require 'backbone'
_ = require 'underscore'
$ = require 'jquery'

Views =
	Text: require './views/text'
	Annotations: require './views/annotations'

# REQUIRED
# @options.paralleltexts (Object)
# 	An object with textlayer titles as property names. The values consist of an object with a text and
# 	annotationData property. The text property is a String and the annotationData an array of objects.
# @options.annotationTypes (Object)
# 	An object with textlayer titles as property names. The values are objects with key-value pairs of
# 	annotation type titles and the count of occurence.
# @options.textlayers (Backbone.Collection)
# @options.autoListening (Boolean)
# 	When switching views you sometimes want to control the views listening, with the methods startListening
# 	and stopListening you can. When setting autoListening to false, you'll manually have to call those methods.
# 	When set to true (default) startListening will be called on render and stopListening will never be called. You can do that
# 	manually if needed.
#
# OPTIONAL
# @options.annotation (String)
# 	When given, the annotation will be highlighted.
# @options.term (String)
# 	When given, the term(s) will be highlighted in the text.
class AnnotatedText extends Backbone.View

	className: 'elaborate-annotated-text'

	initialize: -> 
		@options.autoListening ?= true
		@options.annotationsVisible ?= true
		@options.scrollEl ?= $('html body')

		# console.log @options
		
		@render()

	render: ->
		eventBus = _.extend {}, Backbone.Events

		@textView.remove() if @textView?
		@textView = new Views.Text
			paralleltexts: @options.paralleltexts
			textLayer: @options.textLayer
			eventBus: eventBus
			scrollEl: @options.scrollEl
			highlightAnnotations: @options.highlightAnnotations
		@$el.html @textView.$el
		
		$sups = @$('.text sup')

		@annotationsView.remove() if @annotationsView?
		@annotationsView = new Views.Annotations
			paralleltexts: @options.paralleltexts
			annotationTypes: @options.annotationTypes
			textLayer: @options.textLayer
			$sups: $sups
			eventBus: eventBus
			scrollEl: @options.scrollEl
		@$el.append @annotationsView.$el

		annotationsVisible = $sups.length > 0 and @options.annotationsVisible
		@toggleAnnotations annotationsVisible

		@textView.$('i.toggle-annotations').hide() if $sups.length is 0

		@startListening() if @options.autoListening

	# ### Methods

	destroy: ->
		@textView.destroy()
		@annotationsView.destroy()

		@remove()

	toggleAnnotations: (showing) ->
		@trigger 'toggle:annotations', showing
		
		@$el.toggleClass 'with-annotations', showing
		@$el.toggleClass 'without-annotations', !showing

	startListening: ->
		# @listenTo @options.textlayers, 'change:current', (textlayer) => 
		# 	@stopListening()
		# 	@render()
		# 	@startListening()

		@listenTo @textView, 'toggle-annotations', @toggleAnnotations
			

		@listenTo @textView, 'change:textlayer', (textLayer) ->
			@options.textLayer = textLayer
			@stopListening()
			@render()
			@startListening()

		@textView.startListening()
		@annotationsView.startListening() if @annotationsView?

	stopListening: ->
		@textView.stopListening()
		@annotationsView.stopListening() if @annotationsView?

		super

	highlightOff: -> @textView.highlightOff()

	highlightAnnotation: (annotationId) -> @textView.highlightAnnotation annotationId
	highlightTerms: (terms) -> @textView.highlightTerms terms
	highlightTermsInAnnotations: (terms) -> @annotationsView.highlightTerms terms

module.exports = AnnotatedText