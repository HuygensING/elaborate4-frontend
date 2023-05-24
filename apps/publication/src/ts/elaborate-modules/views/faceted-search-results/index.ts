import Backbone from "backbone"
import $ from "jquery"
import _ from "underscore"

import { BaseView, token, Fn } from '@elaborate4-frontend/hilib'
import { FacetedSearch } from '@elaborate4-frontend/faceted-search'
import { EditMultipleMetadata } from './views/edit-multiple-metadata'
import { SearchResult } from '../search-result'

import tpl from "./templates/main.jade"
import { className } from "@elaborate4-frontend/hilib"
import { config } from "../../../models/config"

import './styles/main.styl'
import './styles/edit-multiple-metadata.styl'

let editMultipleMetadataActive = false;

@className('faceted-search-results')
export class FacetedSearchResults extends BaseView {
  resultRows

  // ### Initialize
  constructor(private options) {
    super(options)
    this.resultRows = this.options.resultRows != null ? this.options.resultRows : 50;
    this.listenTo(Backbone, 'entrymetadatafields:update', (fields) => {
      this.options.entryMetadataFields = fields;
    })
    this.render()
  }

  // ### Render
  render() {
    const rtpl = tpl({ entryTermSingular: config.get('entryTermSingular') })
    this.$el.html(rtpl)
    this.renderFacetedSearch()
    return this
  }

  // ### Events
  events() {
    return {
      'change li.select-all input': 'selectAll',
      'change li.display-keywords input': function(ev) {
        if (ev.currentTarget.checked) {
          this.$('.keywords').show()
        } else {
          this.$('.keywords').hide()
        }
      },
      // TODO: Move change event to entry-list-item.coffee
      'change .entry input[type="checkbox"]': function() {
        this.subviews.editMultipleEntryMetadata.activateSaveButton()
      }
    }
  }

  renderFacetedSearch() {
    const sortParameters = [];
    const ref = this.options.levels;
    for (let i = 0, len = ref.length; i < len; i++) {
      const level = ref[i];
      sortParameters.push({
        fieldname: level,
        direction: 'asc'
      })
    }
    this.subviews.facetedSearch = new FacetedSearch({
      textSearch: this.options.textSearch,
      baseUrl: this.options.searchUrl,
      searchPath: '',
      authorizationHeaderToken: `${token.getType()} ${token.get()}`,
      textSearchOptions: {
        textLayers: this.options.textLayers,
        searchInAnnotations: true,
        searchInTranscriptions: true,
        term: '*:*'
      },
      queryOptions: {
        sortParameters: sortParameters,
        resultFields: this.options.levels
      },
      resultRows: this.resultRows,
      templates: this.options.templates
    })
    this.$('.faceted-search-placeholder').html(this.subviews.facetedSearch.el)
    this.listenTo(this.subviews.facetedSearch, 'unauthorized', () => {})
    this.listenTo(this.subviews.facetedSearch, 'change:page', (responseModel) => {
      this.subviews.searchResult.renderListItemsPage(responseModel)
      // Send the result to the parent view.
      this.trigger('change:results', responseModel)
    })
    this.listenTo(this.subviews.facetedSearch, 'change:results', (responseModel) => {
      this.renderResult(responseModel)
      // We check the flag to see if the editMultipleMetadata form was active when the results changed.
      // if editMultipleMetadataActive
      // TODO Restore editMultipleMetadata form. Not easy because it is rerendered by result:change,
      // but we need it's state (filled in inputs, selected checkboxes, etc)

      // Send the result to the parent view.
      this.trigger('change:results', responseModel)
    })
    this.subviews.facetedSearch.search()
  }

  renderResult(responseModel) {
    if (this.subviews.searchResult != null) {
      this.subviews.searchResult.renderListItems(responseModel)
    } else {
      this.subviews.searchResult = new SearchResult({
        responseModel: responseModel,
        levels: this.options.levels,
        entryMetadataFields: this.options.entryMetadataFields,
        resultRows: this.resultRows
      })
      this.$('.resultview').html(this.subviews.searchResult.$el)
      this.listenTo(this.subviews.searchResult, 'change:sort-levels', (sortParameters) => {
        this.subviews.facetedSearch.sortResultsBy(sortParameters)
      })
      this.listenTo(this.subviews.searchResult, 'change:pagination', (pagenumber) => {
        this.subviews.facetedSearch.page(pagenumber)
      })
      this.listenTo(this.subviews.searchResult, 'navigate:entry', (id, terms, textLayer) => {
        this.trigger('navigate:entry', id, terms, textLayer)
      })
      this.listenTo(this.subviews.searchResult, 'check:entryListItem', (id) => {
        this.subviews.editMultipleEntryMetadata.activateSaveButton()
      })
    }
  }

  selectAll(ev) {
    Fn.checkCheckboxes('.entries input[type="checkbox"]', ev.currentTarget.checked, this.el)
    this.subviews.editMultipleEntryMetadata.activateSaveButton()
  }

  changePage(ev) {
    const cl = ev.currentTarget.classList

    if (cl.contains('inactive')) return

    this.el.querySelector('li.prev').classList.remove('inactive')
    this.el.querySelector('li.next').classList.remove('inactive')

    if (cl.contains('prev')) {
      this.subviews.facetedSearch.prev()
    } else if (cl.contains('next')) {
      this.subviews.facetedSearch.next()
    }
  }

  // navToEntry: (ev) ->
  // 	# If edit multiple metadata is active, we don't navigate to the entry when it is clicked,
  // 	# instead a click toggles a checkbox which is used by edit multiple metadata.
  // 	placeholder = @el.querySelector('.editselection-placeholder')
  // 	return if placeholder? and placeholder.style.display is 'block'

    // 	entryID = ev.currentTarget.getAttribute 'data-id'
  // 	Backbone.history.navigate "projects/#{@project.get('name')}/entries/#{entryID}", trigger: true

    // ### Methods
  uncheckCheckboxes() {
    Fn.checkCheckboxes('.entries input[type="checkbox"]', false, this.el)
  }

  reset() {
    this.subviews.facetedSearch.reset()
  }

  refresh(queryOptions) {
    this.subviews.facetedSearch.refresh(queryOptions)
  }

  toggleEditMultipleMetadata() {
    var entries;
    // ul.entries is used twice so we define it on top.
    entries = $('div.entries')
    this.$('.resultview').toggleClass('edit-multiple-entry-metadata')
    editMultipleMetadataActive = this.$('.resultview').hasClass('edit-multiple-entry-metadata')
    // Class has been added, so we add the form
    if (editMultipleMetadataActive) {
      // Create the form.
      this.subviews.editMultipleEntryMetadata = new EditMultipleMetadata({
        entryMetadataFields: this.options.entryMetadataFields,
        editMultipleMetadataUrl: this.options.editMultipleMetadataUrl
      })
      this.$('.editselection-placeholder').html(this.subviews.editMultipleEntryMetadata.el)
      // Add listeners.
      this.listenToOnce(this.subviews.editMultipleEntryMetadata, 'close', () => {
        return this.toggleEditMultipleMetadata()
      })
      this.listenToOnce(this.subviews.editMultipleEntryMetadata, 'saved', (entryIds) => {
        this.subviews.facetedSearch.reset()
        return this.trigger('editmultipleentrymetadata:saved', entryIds)
      })
    } else {
      // Uncheck select all option.
      // Class has been removed, so we remove the form
      const li: HTMLLIElement = this.el.querySelector('li.select-all input')
      // TODO check if this works
      // @ts-ignore
      li.checked = false

      // Uncheck all checkboxes in the result list.
      Fn.checkCheckboxes(null, false, entries[0])
      // Remove the form.
      this.stopListening(this.subviews.editMultipleEntryMetadata)
      this.subviews.editMultipleEntryMetadata.destroy()
    }
    // Resize result list, because result list height is dynamically calculated on render and the appearance
    // and removal of the edit multiple metadata form alters the top position of the result list.
    return entries.height($(window).height() - entries.offset().top)
  }

}
