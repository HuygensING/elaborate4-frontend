import Backbone from "backbone"
import $ from "jquery"
import _ from "underscore"
import { config } from "../models/config"
import us from "underscore.string"
import { className } from '@elaborate4-frontend/hilib'

// Turn long strings into "foo ... bar"
const shorten = function(txt, max = 50) {
  var firstWords, lastWords, words;
  if (!(txt.length > max)) {
    return txt;
  }
  words = txt.split(/\s+/)
  firstWords = words.slice(0, 3).join(' ')
  return lastWords = words.reverse().slice(0, 3).reverse().join(' ')
}

import tpl from "../../jade/annotation-overview/index.jade"

import typeTpl from "../../jade/annotation-overview/section.jade"

@className('annotations-index')
export class AnnotationsView extends Backbone.View {
  annotations
  types

  // ### Initialize
  constructor(private options = {}) {
    super(options)
    const jqxhr = $.getJSON(config.get('annotationsIndexPath')).done((annotations) => {
      this.annotations = annotations;
      this.types = _.sortBy(_.keys(this.annotations), function(t) {
        return t.toLowerCase()
      })
      this.render()
    })
    jqxhr.fail(() => {
      console.log(config.get('annotationsIndexPath'), arguments)
    })

    $(window).resize(this.setHeights)
  }

  // ### Render
  render() {
    this.$el.html(tpl({
      types: _.map(this.types, (t) => {
        return {
          name: t,
          count: this.annotations[t].length
        }
      }),
      shorten: shorten,
      slugify: us.slugify,
      config: config
    }))
    this.renderType(_.first(this.types))
    setTimeout(this.setHeights, 100)
    return this
  }

  // ### Events
  events() {
    return {
      'click .print': 'printEntry',
      'click ul.annotation-types li.all a': 'selectAllTypes',
      'click ul.annotation-types li a': 'selectType'
    }
  }

  renderType(type) {
    this.renderContents(this.typeHTML(type))
  }

  renderContents(html) {
    return this.$('.contents').fadeOut(75, () => {
      return this.$('.contents').html(html).fadeIn(75)
    })
  }

  printEntry(e) {
    e.preventDefault()
    return window.print()
  }

  selectType(e) {
    var type;
    type = $(e.currentTarget).attr('data-type')
    this.renderType(type)
    return e.preventDefault()
  }

  selectAllTypes() {
    var html, i, len, ref, type;
    html = "";
    ref = this.types;
    for (i = 0, len = ref.length; i < len; i++) {
      type = ref[i];
      html += this.typeHTML(type)
    }
    this.renderContents(html)
  }

  setHeights = () => {
    const contents = this.$('.contents')
    if (contents.is(':visible')) {
      const contentsHeight = $(window).height() - contents.offset().top;
      contents.height(contentsHeight)
      this.$('ul.annotation-types').height(contentsHeight * 0.8)
    }
  }

  typeHTML(type) {
    if (type == null) return

    return typeTpl({
      type: type,
      annotations: this.annotations[type],
      shorten: shorten,
      slugify: us.slugify,
      config: config
    })
  }

}
