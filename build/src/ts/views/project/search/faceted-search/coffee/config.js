import Backbone from "backbone";
export default class Config extends Backbone.Model {
    defaults() {
        return {
            resultRows: 10,
            baseUrl: '',
            searchPath: '',
            textSearch: 'advanced',
            textSearchOptions: {
                caseSensitive: false,
                fuzzy: false
            },
            labels: {
                fullTextSearchFields: "Search in",
                numFound: "Found",
                filterOptions: "Filter options",
                sortAlphabetically: "Sort alphabetically",
                sortNumerically: "Sort numerically"
            },
            authorizationHeaderToken: null,
            queryOptions: {},
            facetTitleMap: {},
            facetOrder: [],
            templates: {},
            autoSearch: true,
            requestOptions: {},
            results: false,
            sortLevels: true,
            showMetadata: true,
            termSingular: 'entry',
            termPlural: 'entries',
            entryMetadataFields: [],
            levels: []
        };
    }
}
;
