const hasProp = {}.hasOwnProperty;
import Backbone from "backbone";
import _ from "underscore";
import $ from "jquery";
import assert from "assert";
import BOOLEAN from "./facets/boolean";
import DATE from "./facets/date";
import RANGE from "./facets/range";
import LIST from "./facets/list";
export default class Facets extends Backbone.View {
    options;
    views;
    searchResults;
    constructor() {
        super(...arguments);
        this.renderFacet = this.renderFacet.bind(this);
    }
    initialize(options1) {
        this.options = options1;
        _.extend(this.viewMap, this.options.viewMap);
        this.views = {};
        return this.render();
    }
    render() {
        var tpl;
        if (this.options.config.get('templates').hasOwnProperty('facets')) {
            tpl = this.options.config.get('templates').facets;
            this.el.innerHTML = tpl();
        }
        return this;
    }
    renderFacets(data) {
        var facet, facetData, facetName, facets, fragment, i, index, j, len, len1, placeholder, ref;
        this.destroyFacets();
        if (this.options.config.get('templates').hasOwnProperty('facets')) {
            for (index = i = 0, len = data.length; i < len; index = ++i) {
                facetData = data[index];
                if (this.viewMap.hasOwnProperty(facetData.type)) {
                    placeholder = this.el.querySelector(`.${facetData.name}-placeholder`);
                    if (placeholder != null) {
                        placeholder.parentNode.replaceChild(this.renderFacet(facetData).el, placeholder);
                    }
                }
            }
        }
        else {
            facets = new Backbone.Collection(data, {
                model: Backbone.Model.extend({
                    idAttribute: 'name'
                })
            });
            if (this.options.config.get('facetOrder').length === 0) {
                this.options.config.set({
                    facetOrder: facets.pluck('name')
                });
            }
            fragment = document.createDocumentFragment();
            ref = this.options.config.get('facetOrder');
            for (j = 0, len1 = ref.length; j < len1; j++) {
                facetName = ref[j];
                assert.ok(facets.get(facetName) != null, `FacetedSearch :: config.facetOrder : Unknown facet name: \"${facetName}\"!`);
                facet = facets.get(facetName);
                if (this.viewMap.hasOwnProperty(facet.get('type'))) {
                    fragment.appendChild(this.renderFacet(facet.attributes).el);
                }
                else {
                    console.error('Unknown facetView', facet.get('type'));
                }
            }
            this.el.innerHTML = '';
            this.el.appendChild(fragment);
            this._postRenderFacets();
        }
        return this;
    }
    renderFacet(facetData) {
        var View;
        if (_.isString(facetData)) {
            facetData = _.findWhere(this.searchResults.first().get('facets'), {
                name: facetData
            });
        }
        View = this.viewMap[facetData.type];
        this.views[facetData.name] = new View({
            attrs: facetData,
            config: this.options.config
        });
        this.listenTo(this.views[facetData.name], 'change', (queryOptions, options = {}) => {
            return this.trigger('change', queryOptions, options);
        });
        return this.views[facetData.name];
    }
    _postRenderFacets() {
        var facetName, ref, results, view;
        ref = this.views;
        results = [];
        for (facetName in ref) {
            view = ref[facetName];
            results.push(view.postRender());
        }
        return results;
    }
    update(facetData) {
        var data, options, ref, results, view, viewName;
        ref = this.views;
        results = [];
        for (viewName in ref) {
            if (!hasProp.call(ref, viewName))
                continue;
            view = ref[viewName];
            data = _.findWhere(facetData, {
                name: viewName
            });
            options = data != null ? data.options : [];
            results.push(view.update(options));
        }
        return results;
    }
    reset() {
        var facetView, key, ref, results;
        ref = this.views;
        results = [];
        for (key in ref) {
            if (!hasProp.call(ref, key))
                continue;
            facetView = ref[key];
            if (typeof facetView.reset === 'function') {
                results.push(facetView.reset());
            }
            else {
                results.push(void 0);
            }
        }
        return results;
    }
    destroyFacets() {
        var ref, results, view, viewName;
        this.stopListening();
        ref = this.views;
        results = [];
        for (viewName in ref) {
            if (!hasProp.call(ref, viewName))
                continue;
            view = ref[viewName];
            view.destroy();
            results.push(delete this.views[viewName]);
        }
        return results;
    }
    destroy() {
        this.destroyFacets();
        return this.remove();
    }
    toggle(ev) {
        var facetNames, icon, index, open, slideFacet, span, text;
        ev.preventDefault();
        icon = $(ev.currentTarget).find('i.fa');
        span = $(ev.currentTarget).find('span');
        open = icon.hasClass('fa-expand');
        icon.toggleClass('fa-compress');
        icon.toggleClass('fa-expand');
        text = open ? 'Collapse' : 'Expand';
        span.text(`${text} filters`);
        facetNames = _.keys(this.views);
        index = 0;
        slideFacet = () => {
            var facet, facetName;
            facetName = facetNames[index++];
            facet = this.views[facetName];
            if (facet != null) {
                if (open) {
                    return facet.showBody(function () {
                        return slideFacet();
                    });
                }
                else {
                    return facet.hideBody(function () {
                        return slideFacet();
                    });
                }
            }
        };
        return slideFacet();
    }
    viewMap = {
        BOOLEAN,
        DATE,
        RANGE,
        LIST
    };
}
;
Facets.prototype.className = 'facets';
