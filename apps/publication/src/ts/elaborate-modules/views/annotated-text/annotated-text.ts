import Backbone from "backbone"

import _ from "underscore"

import $ from "jquery"
import { className } from "@elaborate4-frontend/hilib"

import { EntryTextView } from './views/text'
import { AnnotationsView } from './views/annotations'

import './styles/main.styl'
import './styles/annotations.styl'
import './styles/text.styl'

// REQUIRED
// @options.paralleltexts (Object)
// 	An object with textlayer titles as property names. The values consist of an object with a text and
// 	annotationData property. The text property is a String and the annotationData an array of objects.
// @options.annotationTypes (Object)
// 	An object with textlayer titles as property names. The values are objects with key-value pairs of
// 	annotation type titles and the count of occurence.
// @options.textlayers (Backbone.Collection)
// @options.autoListening (Boolean)
// 	When switching views you sometimes want to control the views listening, with the methods startListening
// 	and stopListening you can. When setting autoListening to false, you'll manually have to call those methods.
// 	When set to true (default) startListening will be called on render and stopListening will never be called. You can do that
// 	manually if needed.

// OPTIONAL
// @options.annotation (String)
// 	When given, the annotation will be highlighted.
// @options.term (String)
// 	When given, the term(s) will be highlighted in the text.
@className('elaborate-annotated-text')
export class AnnotatedText extends Backbone.View {
  textView
  annotationsView

  constructor(private options?) {
    super(options)
    if (this.options.autoListening == null) this.options.autoListening = true
    if (this.options.annotationsVisible == null) this.options.annotationsVisible = true
    if (this.options.scrollEl == null) this.options.scrollEl = $('html body')

    this.render()
  }

  render() {
    const eventBus = _.extend({}, Backbone.Events)
    if (this.textView != null) {
      this.textView.remove()
    }
    this.textView = new EntryTextView({
      paralleltexts: this.options.paralleltexts,
      textLayer: this.options.textLayer,
      eventBus: eventBus,
      scrollEl: this.options.scrollEl,
      highlightAnnotations: this.options.highlightAnnotations
    })
    this.$el.html(this.textView.$el)
    const $sups = this.$('.text sup[data-id]')

    if (this.annotationsView != null) this.annotationsView.remove()
    this.annotationsView = new AnnotationsView({
      paralleltexts: this.options.paralleltexts,
      annotationTypes: this.options.annotationTypes,
      textLayer: this.options.textLayer,
      $sups: $sups,
      eventBus: eventBus,
      scrollEl: this.options.scrollEl
    })
    this.$el.append(this.annotationsView.$el)
    const annotationsVisible = $sups.length > 0 && this.options.annotationsVisible;
    this.toggleAnnotations(annotationsVisible)
    if ($sups.length === 0) {
      this.textView.$('i.toggle-annotations').hide()
    }
    if (this.options.autoListening) {
      this.startListening()
    }
    return this
  }

  // ### Methods
  destroy() {
    this.textView.destroy()
    this.annotationsView.destroy()
    return this.remove()
  }

  toggleAnnotations(showing) {
    this.trigger('toggle:annotations', showing)
    this.$el.toggleClass('with-annotations', showing)
    return this.$el.toggleClass('without-annotations', !showing)
  }

  startListening() {
    // @listenTo @options.textlayers, 'change:current', (textlayer) => 
    // 	@stopListening()
    // 	@render()
    // 	@startListening()
    this.listenTo(this.textView, 'toggle-annotations', this.toggleAnnotations)
    this.listenTo(this.textView, 'change:textlayer', function(textLayer) {
      this.options.textLayer = textLayer;
      this.stopListening()
      this.render()
      return this.startListening()
    })
    this.textView.startListening()
    if (this.annotationsView != null) {
      return this.annotationsView.startListening()
    }
  }

  stopListening() {
    this.textView.stopListening()
    if (this.annotationsView != null) {
      this.annotationsView.stopListening()
    }
    return super.stopListening()
  }

  highlightOff() {
    return this.textView.highlightOff()
  }

  highlightAnnotation(annotationId) {
    return this.textView.highlightAnnotation(annotationId)
  }

  highlightTerms(terms) {
    return this.textView.highlightTerms(terms)
  }

  highlightTermsInAnnotations(terms) {
    return this.annotationsView.highlightTerms(terms)
  }

}
