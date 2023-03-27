import { BaseView, className, Pagination } from "@elaborate4-frontend/hilib"
import $ from "jquery"
import _ from "underscore"
import { SortLevels } from '../sort-levels'
import { EntryListItem } from './views/entry-list-item'
import { config } from "../../../models/config"
  // Base: require('../../hilib/views/base'),
  // EntryListItem: require('./views/entry-list-item'),
  // SortLevels: require('../sort-levels'),
  // Pagination: require('../../hilib/views/pagination/main')
import tpl from "./templates/main.jade"
import './styles/main.styl'
import './styles/entry-list-item.styl'

const listItems = [];

@className('results-placeholder')
export class SearchResult extends BaseView {
  constructor(private options: any = {}) {
    super(options)
    this.render()
  }

  // ### Render
  render() {
    this.$el.html(tpl())
    this.renderLevels()
    this.renderListItems()
    $(window).resize(() => {
      var entries;
      entries = this.$('div.entries')
      return entries.height($(window).height() - entries.offset().top)
    })
    return this;
  }

  renderLevels() {
    this.subviews.sortLevels = new SortLevels({
      levels: this.options.levels,
      entryMetadataFields: this.options.entryMetadataFields
    })
    this.$('header nav ul').prepend(this.subviews.sortLevels.$el)
    return this.listenTo(this.subviews.sortLevels, 'change', (sortParameters) => {
      return this.trigger('change:sort-levels', sortParameters)
    })
  }

  renderListItems(responseModel?) {
    var i, len, listItem;
    if (responseModel != null) {
      // On the first render, the response model is present in the @options.
      // On re-render, the response model is given as an argument.
      this.options.responseModel = responseModel;
    }
    // Set the number of found entries to the header.
    this.$('header h3.numfound').html(`Found ${this.options.responseModel.get('numFound')} ${config.get('entryTermPlural')}`)
    this.renderPagination()
    for (i = 0, len = listItems.length; i < len; i++) {
      listItem = listItems[i];
      // Remove previously rendered list items.
      listItem.remove()
    }
    this.$("div.entries ul.page").remove()
    this.renderListItemsPage(this.options.responseModel)
  }

  renderListItemsPage(responseModel) {
    var entryListItem, frag, fulltext, i, len, pageNumber, ref, result, ul;
    pageNumber = this.subviews.pagination.options.currentPage;
    fulltext = responseModel.has('term') && responseModel.get('term').indexOf('*:*') === -1;
    // Create a document fragment and append entry listitem views.
    frag = document.createDocumentFragment()
    ref = responseModel.get('results')
    for (i = 0, len = ref.length; i < len; i++) {
      result = ref[i];
      // Instantiate a new list item.
      entryListItem = new EntryListItem({
        entryData: result,
        fulltext: fulltext
      })
      // Listen to the click event, which bubbles up all the way to the faceted search, so it can pass
      // it to the parent view and trigger the router to navigate to the entry.
      this.listenTo(entryListItem, 'click', function(id, terms, textLayer) {
        return this.trigger('navigate:entry', id, terms, textLayer)
      })
      this.listenTo(entryListItem, 'check', function(id) {
        return this.trigger('check:entryListItem', id)
      })
      // Push every list item into the listItems array, so we can remove them on re-render.
      listItems.push(entryListItem)
      // Add the list item to the frag.
      frag.appendChild(entryListItem.el)
    }
    // Add the frag to the dom.
    ul = $(`<ul class=\"page\" data-page-number=\"${pageNumber}\" />`)
    ul.html(frag)
    return this.$("div.entries").append(ul)
  }

  renderPagination() {
    if (this.subviews.pagination != null) {
      this.stopListening(this.subviews.pagination)
      this.subviews.pagination.destroy()
    }
    this.subviews.pagination = new Pagination({
      start: this.options.responseModel.get('start'),
      rowCount: this.options.resultRows,
      resultCount: this.options.responseModel.get('numFound')
    })
    this.listenTo(this.subviews.pagination, 'change:pagenumber', this.changePage)
    return this.$('header .pagination').html(this.subviews.pagination.el)
  }

  changePage(pageNumber) {
    var entries;
    entries = this.$('div.entries')
    entries.find('ul.page').hide()
    if (entries.find(`ul.page[data-page-number=\"${pageNumber}\"]`).length > 0) {
      return entries.find(`ul.page[data-page-number=\"${pageNumber}\"]`).show()
    } else {
      return this.trigger('change:pagination', pageNumber)
    }
  }

  // ### Events
  events() {
    return {
      'change li.show-metadata input': 'showMetadata'
    }
  }

  showMetadata(ev) {
    return this.$('.metadata').toggle(ev.currentTarget.checked)
  }
}

