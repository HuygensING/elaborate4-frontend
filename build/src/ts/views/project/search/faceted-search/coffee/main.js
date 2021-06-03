import Backbone from "backbone";
import $ from "jquery";
Backbone.$ = $;
import assert from "assert";
import _ from "underscore";
import funckyEl from 'funcky.el';
const funcky = funckyEl.el;
import Config from "./config";
import QueryOptions from "./models/query-options";
import SearchResults from "./collections/searchresults";
import TextSearch from "./views/text-search";
import Facets from "./views/facets";
import Results from "./views/results";
import ListFacet from "./views/facets/list";
import tpl from "../jade/main.jade";
export default class MainView extends Backbone.View {
    facetViewMap;
    config;
    searchResults;
    textSearch;
    queryOptions;
    results;
    facets;
    initialize(options = {}) {
        if (options.facetViewMap != null) {
            this.facetViewMap = _.clone(options.facetViewMap);
            delete options.facetViewMap;
        }
        this.extendConfig(options);
        if (this.config.get('textSearch') === 'simple' || this.config.get('textSearch') === 'advanced') {
            this.initTextSearch();
        }
        this.initQueryOptions();
        this.initSearchResults();
        this.render();
        if (this.config.get('development')) {
            this.searchResults.add(JSON.parse(localStorage.getItem('faceted-search-dev-model')));
            this.searchResults.cachedModels['{"facetValues":[],"sortParameters":[]}'] = this.searchResults.first();
            return setTimeout((() => {
                return this.$('.overlay').hide();
            }), 100);
        }
    }
    render() {
        if (this.config.get('templates').hasOwnProperty('main')) {
            tpl = this.config.get('templates').main;
        }
        this.el.innerHTML = tpl();
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
        });
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
        });
        this.listenTo(this.results, 'result:click', function (data) {
            return this.trigger('result:click', data);
        });
        this.listenTo(this.results, 'result:layer-click', function (layer, data) {
            return this.trigger('result:layer-click', layer, data);
        });
        return this.listenTo(this.results, 'change:sort-levels', function (sortParameters) {
            return this.sortResultsBy(sortParameters);
        });
    }
    events() {
        return {
            'click ul.facets-menu li.collapse-expand': function (ev) {
                return this.facets.toggle(ev);
            },
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
        }
        else if (this.searchResults.length > 1) {
            return this.update();
        }
    }
    onReset(ev) {
        ev.preventDefault();
        return this.reset();
    }
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
        var key, toBeExtended, value;
        toBeExtended = {
            facetTitleMap: null,
            textSearchOptions: null,
            labels: null
        };
        for (key in toBeExtended) {
            value = toBeExtended[key];
            toBeExtended[key] = options[key];
            delete options[key];
        }
        this.config = new Config(options);
        for (key in toBeExtended) {
            value = toBeExtended[key];
            this.config.set(key, _.extend(this.config.get(key), value));
        }
        if (['none', 'simple', 'advanced'].indexOf(this.config.get('textSearch')) === -1) {
            this.config.set({
                textSearch: 'advanced'
            });
        }
        return this.listenTo(this.config, 'change:resultRows', () => {
            return this.refresh();
        });
    }
    initQueryOptions() {
        var attrs;
        attrs = _.extend(this.config.get('queryOptions'), this.textSearch.model.attributes);
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
            if (responseModel.has('fullTextSearchFields')) {
                textSearchOptions = _.clone(this.config.get('textSearchOptions'));
                textSearchOptions.fullTextSearchParameters = responseModel.get('fullTextSearchFields');
                return this.config.set({
                    textSearchOptions: textSearchOptions
                });
            }
        });
        this.listenTo(this.searchResults, 'change:results', (responseModel) => {
            if (this.config.get('textSearch') !== 'simple') {
                this.update();
            }
            return this.trigger('change:results', responseModel);
        });
        this.listenTo(this.searchResults, 'change:cursor', (responseModel) => {
            return this.trigger('change:results', responseModel);
        });
        this.listenTo(this.searchResults, 'change:page', (responseModel, database) => {
            return this.trigger('change:page', responseModel, database);
        });
        this.listenTo(this.searchResults, 'request', () => {
            return this.showLoader();
        });
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
        calc = () => {
            var facetedSearch, fsBox, left, loader, top;
            facetedSearch = this.el.querySelector('.faceted-search');
            fsBox = funcky(facetedSearch).boundingBox();
            left = (fsBox.left + fsBox.width / 2 - 12) + 'px';
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
        return setTimeout(calc, 0);
    }
    hideLoader() {
        const overlay = this.el.querySelector('.overlay');
        overlay.style.display = 'none';
    }
    update() {
        var facets;
        facets = this.searchResults.getCurrent().get('facets');
        if (this.searchResults.length === 1) {
            return this.facets.renderFacets(facets);
        }
        else if (this.searchResults.length > 1) {
            return this.facets.update(facets);
        }
    }
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
    sortResultsBy(sortParameters) {
        return this.queryOptions.set({
            sortParameters: sortParameters,
            resultFields: _.pluck(sortParameters, 'fieldname')
        });
    }
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
    search(options = {}) {
        return this.searchResults.runQuery(this.queryOptions.attributes, options);
    }
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
        assert.ok(this.$(`.facet[data-name=\"${facetName}\"] li[data-value=\"${value}\"]`).length > 0, `.facet[data-name=\"${facetName}\"] li[data-value=\"${value}\"] not found!`);
        return this.$(`.facet[data-name=\"${facetName}\"] li[data-value=\"${value}\"]`).click();
    }
}
;
