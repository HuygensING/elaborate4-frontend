import Backbone from "backbone"
import _ from "underscore"
import { el as funckyEl } from '@elaborate4-frontend/funcky'
import Config from "./config"
import QueryOptions from "./models/query-options"
import SearchResults from "./collections/searchresults"
import TextSearch from "./views/text-search"
import Facets from "./views/facets"
import Results from "./views/results"
import { ListFacet } from "./views/facets/list"

import tpl from "../jade/main.jade"
import '../stylus/main.styl'

export class FacetedSearch extends Backbone.View {
  facetViewMap
  config
  searchResults
  textSearch
  queryOptions
  results
  facets

  // ### Initialize
  constructor(options: any = {}) {
    super(options)
    // The facetViewMap cannot be part of the config, because of circular reference.
    // The facetViewMap is removed from the options, so it is not added to config.
    // Do this before @extendConfig.
    if (options.facetViewMap != null) {
      this.facetViewMap = _.clone(options.facetViewMap);
      delete options.facetViewMap;
    }
    this.extendConfig(options);
    // The text search is split with an init method and a render method, because
    // the options are transformed in the init and needed for initQueryOptions.
    if (this.config.get('textSearch') === 'simple' || this.config.get('textSearch') === 'advanced') {
      this.initTextSearch();
    }
    this.initQueryOptions();
    this.initSearchResults();
    this.render();

    if (this.config.get('development')) {
      this.searchResults.add(JSON.parse(localStorage.getItem('faceted-search-dev-model')));
      this.searchResults.cachedModels['{"facetValues":[],"sortParameters":[]}'] = this.searchResults.first();
      setTimeout((() => {
        this.$('.overlay').hide()
      }), 100)
    }
  }

  // ### Render
  render() {
    this.el.innerHTML = this.config.get('templates').hasOwnProperty('main') ?
      this.config.get('templates').main() :
      tpl()

    // Instantiate the Facets view after instantiating the QueryOptions model and
    // before rendering the textSearch. The textSearchPlaceholder can be located
    // in the main and in the facets template. So we render the facets view to
    // get (potentially) the div.text-search-placeholder and call renderFacets
    // in @update, to actually render the separate facet views.
    this.initFacets(this.facetViewMap);
    this.$('.faceted-search').addClass(`search-type-${this.config.get('textSearch')}`);
    this.renderTextSearch();
    if (this.config.get('results')) {
      this.renderResults();
    }
    return this;
  }

  initTextSearch() {
    this.textSearch = new TextSearch({
      config: this.config
    } as any);
    this.listenTo(this.textSearch, 'change', (queryOptions) => {
      return this.queryOptions.set(queryOptions, {
        silent: true
      });
    });
    return this.listenTo(this.textSearch, 'search', () => {
      return this.search();
    });
  }

  renderTextSearch() {
    var textSearchPlaceholder;
    if (this.textSearch == null) {
      return;
    }
    this.textSearch.render();
    textSearchPlaceholder = this.el.querySelector('.text-search-placeholder');
    return textSearchPlaceholder.parentNode.replaceChild(this.textSearch.el, textSearchPlaceholder);
  }

  renderResults() {
    this.$el.addClass('with-results');
    this.results = new Results({
      el: this.$('.results'),
      config: this.config,
      searchResults: this.searchResults
    } as any);
    this.listenTo(this.results, 'result:click', function(data) {
      return this.trigger('result:click', data);
    });
    this.listenTo(this.results, 'result:layer-click', function(layer, data) {
      return this.trigger('result:layer-click', layer, data);
    });
    return this.listenTo(this.results, 'change:sort-levels', function(sortParameters) {
      return this.sortResultsBy(sortParameters);
    });
  }

  // ### Events
  events() {
    return {
      'click ul.facets-menu li.collapse-expand': function(ev) {
        return this.facets.toggle(ev);
      },
      // Don't use @refresh as String, because the ev object will be passed.
      'click ul.facets-menu li.reset': 'onReset',
      'click ul.facets-menu li.switch button': 'onSwitchType'
    };
  }

  onSwitchType(ev) {
    var textSearch;
    ev.preventDefault();
    textSearch = this.config.get('textSearch') === 'advanced' ? 'simple' : 'advanced';
    this.config.set({
      textSearch: textSearch
    });
    this.$('.faceted-search').toggleClass('search-type-simple');
    this.$('.faceted-search').toggleClass('search-type-advanced');
    if (this.searchResults.length === 1) {
      return this.search();
    } else if (this.searchResults.length > 1) {
      return this.update();
    }
  }

  onReset(ev) {
    ev.preventDefault();
    return this.reset();
  }

  // ### Methods
  destroy() {
    if (this.facets != null) {
      this.facets.destroy();
    }
    if (this.textSearch != null) {
      this.textSearch.destroy();
    }
    if (this.results != null) {
      this.results.destroy();
    }
    return this.remove();
  }

  extendConfig(options) {
    // Create a map of properties which need to be extended (not overriden)
    const toBeExtended = {
      facetTitleMap: null,
      textSearchOptions: null,
      labels: null
    };
// Copy the keys to a different map and remove from the options, otherwise
// the defaults will be overriden.
    for (const key in toBeExtended) {
      const value = toBeExtended[key];
      toBeExtended[key] = options[key];
      delete options[key];
    }
    this.config = new Config(options);
// Extend en (re)set the extended property values.
    for (const key in toBeExtended) {
      const value = toBeExtended[key];
      this.config.set(key, _.extend(this.config.get(key), value));
    }
    if (['none', 'simple', 'advanced'].indexOf(this.config.get('textSearch')) === -1) {
      // Set the default of config type in case the user sends an unknown string.
      this.config.set({
        textSearch: 'advanced'
      });
    }

    this.listenTo(this.config, 'change:resultRows', () => {
      this.refresh()
    })
  }

  initQueryOptions() {
    var attrs;
    attrs = _.extend(this.config.get('queryOptions'), this.textSearch.model.attributes);
    // attrs = @config.get('queryOptions')
    delete attrs.term;
    this.queryOptions = new QueryOptions(attrs);
    if (this.config.get('autoSearch')) {
      return this.listenTo(this.queryOptions, 'change', () => {
        return this.search();
      });
    }
  }

  initSearchResults() {
    this.searchResults = new SearchResults(null, {
      config: this.config
    });
    this.listenToOnce(this.searchResults, 'change:results', (responseModel) => {
      var textSearchOptions;
      // console.log responseModel
      // @config.set sortableFields: responseModel.get('sortableFields')
      if (responseModel.has('fullTextSearchFields')) {
        // Clone textSearchOptions to force Backbone's change event to fire.
        textSearchOptions = _.clone(this.config.get('textSearchOptions'));
        textSearchOptions.fullTextSearchParameters = responseModel.get('fullTextSearchFields');
        return this.config.set({
          textSearchOptions: textSearchOptions
        });
      }
    });
    // Listen to the change:results event and (re)render the facets everytime the result changes.
    this.listenTo(this.searchResults, 'change:results', (responseModel) => {
      if (this.config.get('textSearch') !== 'simple') {
        // Nothing needs updating if the facets aren't visible.
        this.update();
      }
      return this.trigger('change:results', responseModel);
    });
    // The cursor is changed when @next or @prev are called. They are rarely used, since pagination uses @page and thus change:page.
    this.listenTo(this.searchResults, 'change:cursor', (responseModel) => {
      return this.trigger('change:results', responseModel);
    });
    this.listenTo(this.searchResults, 'change:page', (responseModel, database) => {
      return this.trigger('change:page', responseModel, database);
    });
    // Backbone triggers a request event when sending a request to the server.
    // In searchResults the request event is triggered manually, because searchResults.sync
    // isnt used.
    this.listenTo(this.searchResults, 'request', () => {
      return this.showLoader();
    });
    // Same goes for sync, but this event is triggered when the response is received.
    this.listenTo(this.searchResults, 'sync', () => {
      return this.hideLoader();
    });
    this.listenTo(this.searchResults, 'unauthorized', () => {
      return this.trigger('unauthorized');
    });
    return this.listenTo(this.searchResults, 'request:failed', (res) => {
      return this.trigger('request:failed', res);
    });
  }

  initFacets(viewMap = {}) {
    var facetsPlaceholder;
    this.facets = new Facets({
      viewMap: viewMap,
      config: this.config
    });
    // Replace the facets placeholder with the 'real' DOM element (@facets.el).
    facetsPlaceholder = this.el.querySelector('.facets-placeholder');
    facetsPlaceholder.parentNode.replaceChild(this.facets.el, facetsPlaceholder);
    return this.listenTo(this.facets, 'change', (queryOptions, options) => {
      return this.queryOptions.set(queryOptions, options);
    });
  }

  showLoader() {
    var calc, overlay;
    overlay = this.el.querySelector('.overlay');
    if (overlay.style.display === 'block') {
      return false;
    }
    // Calculate the width and height of the overlay and
    // the position of the loader.
    calc = () => {
      var facetedSearch, fsBox, left, loader, top;
      // Calculate the bounding box of the faceted search.
      facetedSearch = this.el.querySelector('.faceted-search');
      fsBox = funckyEl(facetedSearch).boundingBox();
      // Calculate the left position of the loader, which should
      // be half way the width of the faceted search.
      left = (fsBox.left + fsBox.width / 2 - 12) + 'px';
      // Calculate the top position of the loader, which should
      // be half way the height of the faceted search.
      // If the height is heigher than the window, place it at the
      // half (50vh).
      top = (fsBox.top + fsBox.height / 2 - 12) + 'px';
      if (fsBox.height > window.innerHeight) {
        top = '50vh';
      }
      loader = overlay.children[0];
      loader.style.left = left;
      loader.style.top = top;
      overlay.style.width = fsBox.width + 'px';
      overlay.style.height = fsBox.height + 'px';
      return overlay.style.display = 'block';
    };
    // Place calcing the overlay and loader position to the end of the
    // event stack.
    return setTimeout(calc, 0);
  }

  hideLoader() {
    const overlay: HTMLDivElement = this.el.querySelector('.overlay')
    overlay.style.display = 'none';
  }

  update() {
    var facets;
    facets = this.searchResults.getCurrent().get('facets');
    // console.log @searchResults.queryAmount, @searchResults.length
    // If the size of the searchResults is 1 then it's the first time we render the facets
    if (this.searchResults.length === 1) {
      return this.facets.renderFacets(facets);
    // If the size is greater than 1, the facets are already rendered and we call their update methods.
    } else if (this.searchResults.length > 1) {
      return this.facets.update(facets);
    }
  }

  // ### Interface
  page(pagenumber, database) {
    return this.searchResults.page(pagenumber, database);
  }

  next() {
    return this.searchResults.moveCursor('_next');
  }

  prev() {
    return this.searchResults.moveCursor('_prev');
  }

  hasNext() {
    return this.searchResults.getCurrent().has('_next');
  }

  hasPrev() {
    return this.searchResults.getCurrent().has('_prev');
  }

  // Sort the results by the parameters given. The parameters are an array of
  // objects, containing 'fieldName' and 'direction': [{fieldName: "name", direction: "desc"}]
  // When the queryOptions are set, a change event is triggered and send to the server.
  sortResultsBy(sortParameters) {
    return this.queryOptions.set({
      sortParameters: sortParameters,
      // The resultFields are changed when the sortParameters are changed,
      // because the server only returns the given fields. If we do this in
      // the model on change, the change event would be triggered twice.
      // An alternative is creating a method for it.
      resultFields: _.pluck(sortParameters, 'fieldname')
    });
  }

  // Silently change @attributes and trigger a change event manually afterwards.
  // arguments.cache Boolean Tells searchResults if we want to fetch result from cache.
  // 	In an app where data is dynamic, we usually don't want cache (get new result from server),
  //	in an app where data is static, we can use cache to speed up the app.
  reset(cache = false) {
    if (this.textSearch != null) {
      this.textSearch.reset();
    }
    if (this.results != null) {
      this.results.reset();
    }
    this.facets.reset();
    this.queryOptions.reset();
    if (!cache) {
      this.searchResults.clearCache();
    }
    return this.search({
      cache: cache
    });
  }

  /*
  A refresh of the Faceted Search means (re)sending the current @attributes (queryOptions) again.
  We set the cache flag to false, otherwise the searchResults collection will return the cached
  model, instead of fetching a new one from the server.
  The newQueryOptions are optional. The can be used to add or update one or more queryOptions
  before sending the same (or now altered) queryOptions to the server again.
  */
  refresh(newQueryOptions = {}) {
    if (Object.keys(newQueryOptions).length > 0) {
      this.queryOptions.set(newQueryOptions, {
        silent: true
      });
    }
    return this.search({
      cache: false
    });
  }

  search(options: any = {}) {
    return this.searchResults.runQuery(this.queryOptions.attributes, options);
  }

  /*
  Search for a single value. Programmatic version of a user
  checking (clicking the checkbox) one value right after init.

  TODO: this is a dirty implementation. Better would be to reset the
  views, reset and update the queryOptions and run @search.

  @param {string} facetName - Name of the facet.
  @param {string} value - Value of option to be selected.
  @param {object} options - Options to pass to @search
  */
  searchValue(facetName, value, options) {
    var name, ref, view;
    this.queryOptions.reset();
    ref = this.facets.views;
    for (name in ref) {
      view = ref[name];
      if (view instanceof ListFacet) {
        view.revert();
      }
    }
    return this.$(`.facet[data-name=\"${facetName}\"] li[data-value=\"${value}\"]`).click();
  }

};
