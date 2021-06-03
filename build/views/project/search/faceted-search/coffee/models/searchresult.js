var Backbone, SearchResult, _, config;
SearchResult = class SearchResult extends Backbone.Model {
    defaults() {
        return {
            _next: null,
            _prev: null,
            ids: [],
            numFound: null,
            results: [],
            rows: null,
            solrquery: '',
            sortableFields: [],
            start: null,
            facets: []
        };
    }
};
export default SearchResult;
