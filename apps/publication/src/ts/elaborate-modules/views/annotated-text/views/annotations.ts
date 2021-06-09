import { className } from "@elaborate4-frontend/hilib"
import Backbone from "backbone"
import $ from "jquery"
import _ from "underscore"
import { dom } from "@elaborate4-frontend/hilib"
import { Annotations } from "../collections/annotations"
import tpl from "../templates/annotations.jade"

@className('annotations')
export class AnnotationsView extends Backbone.View {
  expandAnnotations: boolean
  // ### Initialize
  constructor(private options?) {
    super(options)
    this.expandAnnotations = false;
    this.render()
  }

  // @startListening()

    // ### Render
  // Render is called from the textView, because the annotationsView needs a list of the
  // sups that are rendered in the textView.
  render() {
    const textLayer = this.options.paralleltexts[this.options.textLayer]
    const annotationData = Array.isArray(textLayer?.annotationData) ? textLayer.annotationData : []
    const annotations = annotationData.reduce((prev, curr) => {
      prev[curr.n] = curr
      return prev
    }, {})

    const orderedAnnotations = new Annotations()
    Array.from(this.options.$sups)
      .map((sup: HTMLSpanElement) => sup.getAttribute('data-id'))
      .forEach(id => orderedAnnotations.add(annotations[id]))

    this.$el.html(tpl({
      annotations: orderedAnnotations,
      annotationTypes: this.options.annotationTypes[this.options.textLayer] || []
    }))

    if (this.expandAnnotations) this.toggleAnnotations(true)

    this.$('ol li').hover(this.enter, this.leave)
    return this;
  }

  private enter = (ev) => {
    this.options.eventBus.trigger('highlight-annotation', ev.currentTarget.getAttribute('data-id'))
  }

  private leave = (ev) => {
    this.options.eventBus.trigger('unhighlight-annotation', ev.currentTarget.getAttribute('data-id'))
  }

  // ### Events
  events() {
    return {
      'click i.btn-collapse': 'toggleAnnotations',
      'change header select': 'filterAnnotations',
      'click li': 'sendToggleAnnotation'
    }
  }

  // The 'send-toggle-annotation' event tells the textView it should send the toggle:annotation event.
  // We do this, because we need the supTop (the top position of the <sup> with data-id=markerId in the textView)
  // when aligning the sup[data-id] with li[data-id].
  sendToggleAnnotation(ev) {
    return this.options.eventBus.trigger('send:toggle:annotation', ev.currentTarget.getAttribute('data-id'))
  }

  filterAnnotations(ev) {
    var type;
    type = ev.currentTarget[ev.currentTarget.selectedIndex].value;
    if (type === 'show-all-annotations') {
      this.$('ol li').removeClass('hide')
    } else {
      this.$('ol li:not([data-type="' + type + '"])').addClass('hide')
      this.$('ol li[data-type="' + type + '"]').removeClass('hide')
    }
    return this.resetAnnotations()
  }

  toggleAnnotations(flag) {
    var $target;
    $target = this.$('i.btn-collapse')
    this.expandAnnotations = _.isBoolean(flag) ? flag : $target.hasClass('fa-expand')
    
    // If we expand the annotations, the button should change to 'compress' and vice versa.
    if (this.expandAnnotations) {
      $target.addClass('fa-compress')
      $target.removeClass('fa-expand')
    } else {
      $target.removeClass('fa-compress')
      $target.addClass('fa-expand')
    }
    this.$('ol').toggleClass('active', this.expandAnnotations)
    return this.resetAnnotations()
  }

  // ### Methods
  destroy() {
    return this.remove()
  }

  highlightTerms(terms) {
    var $span, $spans, html, i, len, regex, results, span, term;
    results = [];
    for (i = 0, len = terms.length; i < len; i++) {
      term = terms[i];
      $spans = this.$(`ol li > span:contains(${term})`)
      // We want to ignore html tags lying between the letters of the searched term.
      term = term.split('').join('(</?\\w+>)*')
      results.push((function() {
        var j, len1, results1;
        results1 = [];
        for (j = 0, len1 = $spans.length; j < len1; j++) {
          span = $spans[j];
          $span = $(span)
          $span.parent('li').addClass('show')
          regex = new RegExp(term, "gi")
          html = $span.html().replace(regex, "<span class=\"highlight-term\">$&</span>")
          results1.push($span.html(html))
        }
        return results1;
      })())
    }
    return results;
  }

  // @scrollIntoView @$('span.highlight-term').first()
  resetAnnotations() {
    this.$('ol li.show').removeClass('show')
    // Reset the top position of the <ol>, because it could be moved by the user.
    return this.$('ol').animate({
      top: 0
    })
  }

  toggleAnnotation(ev) {
    var $target;
    $target = ev.hasOwnProperty('currentTarget') ? this.$(ev.currentTarget) : this.$('li[data-id="' + ev + '"]')
    return $target.toggleClass('show').siblings().removeClass('show')
  }

  slideAnnotations(markerId, supTop) {
    var $li, liTop;
    $li = this.$('li[data-id="' + markerId + '"]')
    // To align an annotation in the list with the corresponding marker,
    // we set the top position of the list (<ol>) to the position of the marker
    // minus the position of the annotation (<li>) within the list and
    // subtract the height of the header (40px) and add some text offset (4px).
    liTop = supTop - $li.position().top - 36;
    // Scroll the list to it's new top position.
    return this.$('ol').animate({
      top: liTop
    }, 400, () => {
      var newScrollPos;
      newScrollPos = dom($li[0]).position(this.options.scrollEll).top - (this.options.scrollEl.offset().top + 30)
      if (newScrollPos < 300) {
        // Snap to top if we are close (< 300px)
        newScrollPos = 0;
      }
      if (!((this.options.scrollEl.scrollTop() < newScrollPos && newScrollPos < this.options.scrollEl.height() + this.options.scrollEl.scrollTop()))) {
        return this.options.scrollEl.animate({
          scrollTop: newScrollPos
        })
      }
    })
  }

  startListening() {
    this.listenTo(this.options.eventBus, 'toggle:annotation', (markerId, supTop) => {
      this.toggleAnnotation(markerId)
      return this.slideAnnotations(markerId, supTop)
    })
    this.listenTo(this.options.eventBus, 'activate:annotation', (markerId) => {
      return this.$('li[data-id="' + markerId + '"]').addClass('active')
    })
    return this.listenTo(this.options.eventBus, 'unactivate:annotation', (markerId) => {
      return this.$('li[data-id="' + markerId + '"]').removeClass('active')
    })
  }

}

