import Backbone from "backbone"
import $ from "jquery"
import _ from "underscore"
import us from "underscore.string"
// import { events } from "../events"
import { config } from "../models/config"

import { FacetedSearchResults } from '../elaborate-modules/views/faceted-search-results'
import { Entry } from '../views/entry'
import { AnnotationsView } from '../views/annotations'

const routes = {
  '': 'entry',
  'search': 'showSearch',
  'annotations': 'annotationsIndex',
  'entry/:id/:layer/:annotation': 'entry',
  'entry/:id/:layer': 'entry',
  'entry/:id': 'entry'
}

class MainRouter extends Backbone.Router {
  currentView
  searchView
  annotationsView

  constructor() {
    super({ routes })

    this.currentView = null

    this.on('route', (route, params) => {
      $('header a.active').removeClass('active')
      const a = $(`header a[name=\"${route}\"]`)
      if (a.length > 0) a.addClass('active')
    })
  }

  entry(entryId, layerSlug?, annotation?) {
    let options = entryId

    // If options is not a string, the options object is passed as the first argument
    if (typeof entryId === 'string') {
      options = {
        entryId,
        layerSlug,
        annotation,
      }
    }

    const entry = new Entry(options)
    $('#main > .entries').append(entry.$el)

    switchView(entry)
  }

  // ### Methods

    // Because we want to sent the terms straight to the entry view (and not via the url),
  // we have to manually change the url, trigger the route and call @entry.
  navigateEntry(id, terms, textLayer) {
    let url = `entry/${id}`;
    const options: any = {
      entryId: id,
      terms: terms
    }

    if (textLayer) {
      const splitLayer = textLayer.split(' ')
      if (splitLayer[splitLayer.length - 1] === 'annotations') {
        splitLayer.pop()
        textLayer = splitLayer.join(' ')
        options.highlightAnnotations = true;
      }
      options.layerSlug = us.slugify(textLayer)
      url = `${url}/${options.layerSlug}`;
    }

    this.navigate(url)

    // We have to manually trigger route, because we navigate without {trigger: true} and call @entry manually.
    // The route listener is used to update the header.main menu.
    // this.trigger('route', 'entry')
    this.entry(options)
  }

  showSearch() {
    if (this.searchView == null) {
      this.searchView = new FacetedSearchResults({
        searchUrl: config.get('baseUrl') + config.get('searchPath'),
        textLayers: config.get('textLayers'),
        entryTermSingular: config.get('entryTermSingular'),
        entryTermPlural: config.get('entryTermPlural'),
        entryMetadataFields: config.get('entryMetadataFields'),
        levels: config.get('levels')
      })
      $('.search-view').html(this.searchView.$el)
      this.listenTo(this.searchView, 'change:results', function(responseModel) {
        config.set({
          facetedSearchResponse: responseModel
        })
      })
      this.listenTo(this.searchView, 'navigate:entry', this.navigateEntry)
    }
    return switchView(this.searchView)
  }

  annotationsIndex() {
    if (this.annotationsView == null) {
      this.annotationsView = new AnnotationsView()
      $('.annotations-view').html(this.annotationsView.$el)
    }
    return switchView(this.annotationsView)
  }
}


export const mainRouter = new MainRouter()

let currentView
function switchView(newView) {
  function showNewView() {
    return newView.$el.fadeIn(150, function() {
      if (newView.activate != null) {
        newView.activate()
      }
      if ((newView.cache != null) && newView.cache) {
        newView.$el.show()
      }
      currentView = newView;
      return currentView.cache != null ? currentView.cache : currentView.cache = true;
    })
  }

  if (currentView != null) {
    if (currentView.deactivate != null) currentView.deactivate()

    currentView.$el.fadeOut(75, function() {
      if (currentView.cache) {
        currentView.$el.hide()
      } else {
        currentView.destroy()
      }

      return showNewView()
    })
  } else {
    return showNewView()
  }
}
