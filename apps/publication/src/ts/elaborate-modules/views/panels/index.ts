import Backbone from "backbone"
import $ from 'jquery'
import _ from "underscore"
import { stringFn, tagName } from "@elaborate4-frontend/hilib"
import { entries } from "../../collections/entries"
import { AnnotatedText } from '../annotated-text/annotated-text'
import { PanelsMenu } from './views/panels-menu'
import { FacsimilePanel } from './views/facsimile-panel'
import tpl from "./main.jade"
import { config } from "../../../models/config"

import './styles/panels.styl'
import './styles/main.styl'
import './styles/menus.styl'
import './styles/print.styl'

interface PanelsOptions {
  image_copyright_statement?: string
  entryId?: string
  layerSlug?: string
  annotation?: string
  facsimiles?: string[]
  mark?: string
}

@tagName('article')
export class Panels extends Backbone.View {
  subviews
  annotatedText

  // ### Initialize
  constructor(private options: PanelsOptions) {
    super(options as any)
    if (options == null) this.options = {}

    this.subviews = [];
    const modelLoaded = () => {
      entries.setCurrent(this.model.id)
      this.el.setAttribute('id', 'entry-' + this.model.id)
      this.render()
    }
    // The IDs of the entries are passed to the collection on startup, so we can not check
    // isNew() if we need to fetch the full model or it already has been fetched.
    if (this.model = entries.get(this.options?.entryId)) {
      modelLoaded()
    } else {
      this.model = this.options?.entryId != null ?
        entries.findWhere({ datafile: this.options.entryId + '.json' }) :
        entries.current

      this.model.fetch().done(() => modelLoaded())
    }

    $(window).resize(() => this.setHeights())
  }

  // ### Render
  render() {
    const rtpl = tpl({
      metadata: this.model.get('metadata') || [],
      entryName: this.model.get('name'),
      image_copyright_statement: this.options?.image_copyright_statement || ""
    })
    this.$el.html(rtpl)
    // @renderMetadata()
    this.renderPanelsMenu()

    this.renderPanels()

    this.startListening()
    setTimeout(() => this.postRender(), 500)
    return this
  }

  events() {
    return {
      // 'click button.toggle-metadata': -> @$('.metadata').toggleClass 'show-all'
      'click button.toggle-metadata': function() {
        return this.$('.metadata .table-container').slideToggle('fast')
      },
      'click i.print': function() {
        return window.print()
      }
    }
  }

  postRender() {
    this.setHeights()
    // Send the scroll top of the panels div to the facsimile panels, so we can stick it to the top.
    const facsimilePanels = config.get('selectedPanels').where({ type: 'facsimile' })
    this.$('.panels').scroll(() => {
      const results = []
      for (let i = 0, len = facsimilePanels.length; i < len; i++) {
        const facsimilePanel = facsimilePanels[i];
        results.push(facsimilePanel.get('view').updatePosition(this.$('.panels').scrollTop()))
      }
      return results
    })

    const activeLayerSlug = this.options.layerSlug || config.get('activeTextLayerId')
    const activePanel = config.get('selectedPanels').get(stringFn.ucfirst(activeLayerSlug))

    if (activePanel != null) {
      const activePanelLeft = activePanel.get('view').$el.position().left;
      const activePanelWidth = activePanel.get('view').$el.width()
      const windowWidth = $(window).width()
      const hasScrollbar = this.$('.panels')[0].scrollWidth > windowWidth;
      const panelOutOfView = this.$('.panels')[0].scrollLeft + windowWidth < activePanelLeft + activePanelWidth;
      if (hasScrollbar && panelOutOfView) {
        this.$('.panels').animate({
          scrollLeft: activePanelLeft
        }, 400, () => {
          if (this.options.annotation != null) {
            return activePanel.get('view').highlightAnnotation(this.options.annotation)
          }
        })
      } else if (this.options.annotation != null) {
        activePanel.get('view').highlightAnnotation(this.options.annotation)
      }
      if ((this.options.annotation == null) && (config.get('facetedSearchResponse') != null)) {
        // Get the result from the faceted search response for this entry.
        const result = _.findWhere(config.get('facetedSearchResponse').get('results'), {
          id: this.model.id
        })
        // Get the terms from the result and convert keys to array.
        // {piet: 4, poet: 2} => ['piet', 'poet']
        const terms = Object.keys(result.terms)
        if (terms.length > 0) {
          // If the active layer is an annotations layer, we highlight the terms in the annotations.
          if (config.get('activeTextLayerIsAnnotationLayer')) {
            activePanel.get('view').highlightTermsInAnnotations(terms)
          } else {
            // Otherwise we highlight the terms in the textlayer.
            activePanel.get('view').highlightTerms(terms)
          }
        }
      }
    }
  }

  renderPanelsMenu() {
    this.options.facsimiles = this.model.get('facsimiles')
    const panelsMenu = new PanelsMenu(this.options)
    this.$el.prepend(panelsMenu.$el)
    this.subviews.push(panelsMenu)
  }

  renderPanels() {
    this.$('.panels').html('')

    config.get('selectedPanels').models
      .forEach(model => this.renderPanel(model))
  }

  renderPanel(panel) {
    let view
    if (panel.get('type') === 'facsimile') {
      view = this.renderFacscimile(panel.id)
    } else {
      view = this.renderTextLayer(panel.id, panel.get('annotationsVisible'))
    }
    panel.set('view', view)
    this.$('.panels').append(panel.get('view').el)
    const className = panel.get('show') ? 'visible' : 'hidden';
    panel.get('view').$el.addClass(className)
  }

  renderFacscimile(zoomUrl) {
    var facsimilePanel;
    facsimilePanel = new FacsimilePanel({
      entry: this.model.attributes,
      zoomUrl: zoomUrl
    })
    this.subviews.push(facsimilePanel)
    return facsimilePanel;
  }

  renderTextLayer(textLayer, annotationsVisible) {
    const options = {
      annotation: null,
      term: null,
      paralleltexts: this.model.get('paralleltexts'),
      annotationTypes: this.model.get('annotationTypes'),
      textLayer: textLayer,
      scrollEl: this.$('.panels'),
      annotationsVisible: annotationsVisible
    }
    if (this.options.annotation != null) {
      options.annotation = this.options.annotation
    }
    if (this.options.mark != null) {
      options.term = this.options.mark;
    }
    this.annotatedText = new AnnotatedText(options)
    this.subviews.push(this.annotatedText)
    return this.annotatedText;
  }

  // ### Methods
  destroy() {
    this.$('.panels').unbind('scroll')
    const ref = this.subviews;
    for (let i = 0, len = ref.length; i < len; i++) {
      const view = ref[i]
      view.destroy()
    }
    this.remove()
  }

  setHeights() {
    var facsimileHeight, metadata, metadataList, panelHeight, panels;
    panels = this.$('.panels')
    if (panels.length > 0) {
      panelHeight = $(window).height() - panels.offset().top;
      panels.height(panelHeight)
      metadata = this.$('.metadata')
      metadataList = metadata.find('.table-container')
      metadataList.css('max-height', $(window).height() - metadata.offset().top - 50)
      facsimileHeight = panelHeight - panels.find('.facsimile header').height()
      panels.find('.facsimile iframe').height(facsimileHeight - 20)
    }
  }

  startListening() {
    this.listenTo(config.get('selectedPanels'), 'change:show', (panel, value, options) => {
      var $el, addClassName, removeClassName;
      $el = panel.get('view').$el;
      addClassName = value ? 'visible' : 'hidden';
      removeClassName = value ? 'hidden' : 'visible';
      $el.removeClass(removeClassName)
      $el.addClass(addClassName)
      if (value) this.$('.panels').animate({ scrollLeft: $el.position().left })
    })

    this.listenTo(config.get('selectedPanels'), 'sort', () => {
      config.get('selectedPanels').models.forEach(model => {
        const view = model.get('view')
        if (view != null) this.$('.panels').append(view.el)
      })
    })
  }

}
