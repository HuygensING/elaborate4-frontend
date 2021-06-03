import Backbone from "backbone";
import $ from "jquery";
import Result from "./result";
import SortLevels from "./sort";
import Pagination from "./pagination/main";
import tpl from "./index.jade";
const listItems = [];
export default class Results extends Backbone.View {
    options;
    resultItems;
    isMetadataVisible;
    subviews;
    initialize(options = {}) {
        this.options = options;
        this.resultItems = [];
        this.isMetadataVisible = true;
        this.listenTo(this.options.searchResults, 'change:page', this.renderResultsPage);
        this.listenTo(this.options.searchResults, 'change:results', (responseModel) => {
            this.$('header h3.numfound').html(`${this.options.config.get('labels').numFound} ${responseModel.get('numFound')} ${this.options.config.get('termPlural')}`);
            this.renderPagination(responseModel);
            return this.renderResultsPage(responseModel);
        });
        this.subviews = {};
        return this.render();
    }
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
        });
        this.$('header nav ul').prepend(this.subviews.sortLevels.$el);
        return this.listenTo(this.subviews.sortLevels, 'change', (sortParameters) => {
            return this.trigger('change:sort-levels', sortParameters);
        });
    }
    renderResultsPage(responseModel) {
        var frag, fulltext, i, len, pageNumber, ref, result, ul;
        this.destroyResultItems();
        this.$("div.pages").html('');
        fulltext = false;
        if (responseModel.get('results').length > 0 && (responseModel.get('results')[0].terms != null)) {
            if (Object.keys(responseModel.get('results')[0].terms).length > 0) {
                fulltext = true;
            }
        }
        frag = document.createDocumentFragment();
        ref = responseModel.get('results');
        for (i = 0, len = ref.length; i < len; i++) {
            result = ref[i];
            result = new Result({
                data: result,
                fulltext: fulltext,
                config: this.options.config
            });
            this.resultItems.push(result);
            this.listenTo(result, 'click', function (resultData) {
                return this.trigger('result:click', resultData);
            });
            this.listenTo(result, 'layer:click', function (layer, resultData) {
                return this.trigger('result:layer-click', layer, resultData);
            });
            frag.appendChild(result.el);
        }
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
        });
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
        }
        else {
            return this.options.searchResults.page(pageNumber);
        }
    }
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
