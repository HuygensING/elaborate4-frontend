import Backbone from "backbone"
import $ from "jquery"
import _ from "underscore"
import { className, dom } from "@elaborate4-frontend/hilib"
import tpl from "../templates/text.jade"
import { textlayers } from "../../../collections/textlayers"
import { config } from "../../../../models/config"

let hl = null;

@className('text')
export class EntryTextView extends Backbone.View {
  // ### Initialize
  constructor(private options?) {
    super(options)
    this.render()
  }

  // ### Render
  render() {
    var enter, leave, ref, text;
    text = (ref = this.options.paralleltexts[this.options.textLayer]) != null ? ref.text : void 0;
    // Doing this to ensure empty lines get correct height, so as not to mess with line numbering
    if (text != null) {
      text = String(text).replace(/<div class="line">\s*<\/div>/mg, '<div class="line">&nbsp;</div>')
    }
    this.$el.html(tpl({
      textLayer: this.options.textLayer,
      textlayers: textlayers
    }))
    this.$el.append(text)
    enter = (ev) => {
      var markerId;
      markerId = ev.currentTarget.getAttribute('data-id')
      this.options.eventBus.trigger('activate:annotation', markerId)
      return this.highlightOn(markerId)
    }
    leave = (ev) => {
      var markerId;
      markerId = ev.currentTarget.getAttribute('data-id')
      this.options.eventBus.trigger('unactivate:annotation', markerId)
      return this.highlightOff(markerId)
    }
    this.$('sup[data-marker]').hover(enter, leave)
    this.$el.addClass(config.get('textFont'))
    return this;
  }

  // ### Events
  events() {
    return {
      'change header select': 'changeTextlayer',
      // 'click i.btn-print': (e) -> window.print()
      'click i.toggle-annotations': 'toggleAnnotations',
      'click sup[data-marker]': 'toggleAnnotation'
    }
  }

  toggleAnnotations(ev) {
    var showing, target, title;
    target = $(ev.currentTarget)
    
    // If class is fa-comments, we are going to show the annotations (showing=true)
    showing = target.hasClass('fa-comments')
    target.toggleClass('fa-comments')
    target.toggleClass('fa-comments-o')
    // Change the title attribute of the icon
    title = showing ? 'Hide annotations' : 'Show annotations';
    target.attr('title', title)
    // The event is picked up by the parent view to set a className, so we can hide the
    // annotations using CSS.
    return this.trigger('toggle-annotations', showing)
  }

  toggleAnnotation(ev) {
    var markerId, supTop;
    markerId = ev.currentTarget.getAttribute('data-id')
    supTop = dom(ev.currentTarget).position(this.el).top;
    return this.options.eventBus.trigger('toggle:annotation', markerId, supTop)
  }

  changeTextlayer(ev) {
    if (ev.hasOwnProperty('currentTarget')) {
      ev = ev.currentTarget.options[ev.currentTarget.selectedIndex].value;
    }
    return this.trigger('change:textlayer', ev)
  }

  // ### Methods
  destroy() {
    return this.remove()
  }

  highlightAnnotation(markerId, $scrollEl) {
    var $sup;
    this.highlightOn(markerId)
    $sup = this.$(`sup[data-id='${markerId}']`)
    this.options.eventBus.trigger('toggle:annotation', markerId, dom($sup[0]).position(this.el).top)
    return this.scrollIntoView($sup)
  }

  highlightTerms(terms) {
    var $div, $divs, div, html, i, j, len, len1, regex, term;
    for (i = 0, len = terms.length; i < len; i++) {
      term = terms[i];
      $divs = this.$(`div.line:contains(${term})`)
      // We want to ignore html tags lying between the letters of the searched term.
      term = term.split('').join('(</?\\w+>)*')
      for (j = 0, len1 = $divs.length; j < len1; j++) {
        div = $divs[j];
        $div = $(div)
        regex = new RegExp(term, "gi")
        html = $div.html().replace(regex, "<span class=\"highlight-term\">$&</span>")
        $div.html(html)
      }
    }
    return this.scrollIntoView(this.$('span.highlight-term').first())
  }

  scrollIntoView($el) {
    var supAbsoluteTop;
    if ($el.length > 0 && !dom($el[0]).inViewport()) {
      supAbsoluteTop = $el.offset().top;
      
      // Subtrackt the area above scrollEl (.panels)
      // TODO Fix me, this does not scale, 372 is hard coded. No time to fix now.
      return this.options.scrollEl.animate({
        scrollTop: supAbsoluteTop - 372
      })
    }
  }

  annotationStartNode(markerID) {
    return this.el.querySelector(`span[data-marker=\"begin\"][data-id=\"${markerID}\"]`)
  }

  annotationEndNode(markerID) {
    return this.el.querySelector(`sup[data-marker=\"end\"][data-id=\"${markerID}\"]`)
  }

  highlightOn(markerId) {
    var endNode, startNode;
    startNode = this.annotationStartNode(markerId)
    endNode = this.annotationEndNode(markerId)
    hl = dom(startNode).highlightUntil(endNode).on()
  }

  highlightOff(markerId) {
    if (hl != null) {
      hl.off()
    }
  }

  startListening() {
    this.listenTo(this.options.eventBus, 'highlight-annotation', (markerId) => {
      return this.highlightOn(markerId)
    })
    this.listenTo(this.options.eventBus, 'unhighlight-annotation', (markerId) => {
      return this.highlightOff(markerId)
    })
    this.listenTo(this.options.eventBus, 'send:toggle:annotation', (markerId) => {
      this.options.eventBus.trigger('toggle:annotation', markerId, dom(this.$('sup[data-id="' + markerId + '"]')[0]).position(this.el).top)
    })
  }

}
