import Backbone from "backbone"
import $ from "jquery"
import _ from "underscore"
import Result from "./result"
import SortLevels from "./sort"
import Pagination from "./pagination/main"

import tpl from "./index.jade"

const listItems = [];

export default class Results extends Backbone.View {
  options
  resultItems
  isMetadataVisible
  subviews

  /* options
  	@constructs
  	@param {object} this.options={}
  	@prop {Backbone.Model} options.config
  	@prop {Backbone.Collection} options.searchResults
  	*/
  constructor(options = {}) {
    super(options)
    this.options = options;
    this.resultItems = [];
    this.isMetadataVisible = true;
    this.listenTo(this.options.searchResults, 'change:page', this.renderResultsPage);
    this.listenTo(this.options.searchResults, 'change:results', (responseModel) => {
      this.$('header h3.numfound').html(`${this.options.config.get('labels').numFound} ${responseModel.get('numFound')} ${this.options.config.get('termPlural')}`);
      this.renderPagination(responseModel);
      this.renderResultsPage(responseModel);
    });
    this.subviews = {}
    this.render()
  }

  // ### Render
  render() {
    this.$el.html(tpl({
      showMetadata: this.options.config.get('showMetadata'),
      resultsPerPage: this.options.config.get('resultRows'),
      config: this.options.config
    }));
    this.renderLevels();
    $(window).resize(() => {
      var pages;
      pages = this.$('div.pages');
      return pages.height($(window).height() - pages.offset().top);
    });
    return this;
  }

  renderLevels() {
    if (!this.options.config.get('sortLevels')) {
      return;
    }
    if (this.subviews.sortLevels != null) {
      this.subviews.sortLevels.destroy();
    }
    this.subviews.sortLevels = new SortLevels({
      config: this.options.config
    } as any);
    // levels: @options.config.get 'levels'
    // entryMetadataFields: @options.config.get 'sortableFields'
    this.$('header nav ul').prepend(this.subviews.sortLevels.$el);
    return this.listenTo(this.subviews.sortLevels, 'change', (sortParameters) => {
      return this.trigger('change:sort-levels', sortParameters);
    });
  }

  /*
  @method renderResultsPage
  @param {object} responseModel - The model returned by the server.
  */
  renderResultsPage(responseModel) {
    var frag, fulltext, i, len, pageNumber, ref, result, ul;
    // Search results are cached by @options.searchresults, so on render
    // all results are properly destroyed and re-rendered.
    this.destroyResultItems();
    this.$("div.pages").html('');
    // Check if the results are a generated for a full text search.
    // This is only necessary for eLaborate.
    fulltext = false;
    if (responseModel.get('results').length > 0 && (responseModel.get('results')[0].terms != null)) {
      if (Object.keys(responseModel.get('results')[0].terms).length > 0) {
        fulltext = true;
      }
    }
    
    // Create a document fragment and append entry listitem views.
    frag = document.createDocumentFragment();
    ref = responseModel.get('results');
    for (i = 0, len = ref.length; i < len; i++) {
      result = ref[i];
      // Instantiate a new list item.
      result = new Result({
        data: result,
        fulltext: fulltext,
        config: this.options.config
      } as any);
      // Store the result so we can destroy them when needed.
      this.resultItems.push(result);
      // Listen to the click event, which bubbles up all the way to the faceted search, so it can pass
      // it to the parent view and trigger the router to navigate to the entry.
      this.listenTo(result, 'click', function(resultData) {
        return this.trigger('result:click', resultData);
      });
      this.listenTo(result, 'layer:click', function(layer, resultData) {
        return this.trigger('result:layer-click', layer, resultData);
      });
      // Add the list item to the frag.
      frag.appendChild(result.el);
    }
    // Add the frag to the dom.
    pageNumber = this.subviews.pagination.getCurrentPageNumber();
    ul = $(`<ul class=\"page\" data-page-number=\"${pageNumber}\" />`);
    ul.html(frag);
    return this.$("div.pages").append(ul);
  }

  renderPagination(responseModel) {
    if (this.subviews.pagination != null) {
      this.stopListening(this.subviews.pagination);
      this.subviews.pagination.destroy();
    }
    this.subviews.pagination = new Pagination({
      resultsStart: responseModel.get('start'),
      resultsPerPage: this.options.config.get('resultRows'),
      resultsTotal: responseModel.get('numFound')
    } as any);
    this.listenTo(this.subviews.pagination, 'change:pagenumber', this.changePage);
    return this.$('header .pagination').html(this.subviews.pagination.el);
  }

  changePage(pageNumber) {
    var page, pages;
    pages = this.$('div.pages');
    pages.find('ul.page').hide();
    page = pages.find(`ul.page[data-page-number=\"${pageNumber}\"]`);
    if (page.length > 0) {
      return page.show();
    } else {
      return this.options.searchResults.page(pageNumber);
    }
  }

  // ### Events
  events() {
    return {
      'change li.show-metadata input': 'showMetadata',
      'change li.results-per-page select': 'onChangeResultsPerPage'
    };
  }

  onChangeResultsPerPage(ev) {
    var t;
    t = ev.currentTarget;
    return this.options.config.set('resultRows', t.options[t.selectedIndex].value);
  }

  showMetadata(ev) {
    this.isMetadataVisible = ev.currentTarget.checked;
    return this.$('.metadata').toggle(this.isMetadataVisible);
  }

  reset() {
    return this.renderLevels();
  }

  destroy() {
    this.destroyResultItems();
    return this.subviews.sortLevels.destroy();
  }

  destroyResultItems() {
    var i, item, len, ref, results;
    ref = this.resultItems;
    results = [];
    for (i = 0, len = ref.length; i < len; i++) {
      item = ref[i];
      results.push(item.destroy());
    }
    return results;
  }

}
