import Backbone from "backbone";
export default class Config extends Backbone.Model {
    defaults(): {
        resultRows: number;
        baseUrl: string;
        searchPath: string;
        textSearch: string;
        textSearchOptions: {
            caseSensitive: boolean;
            fuzzy: boolean;
        };
        labels: {
            fullTextSearchFields: string;
            numFound: string;
            filterOptions: string;
            sortAlphabetically: string;
            sortNumerically: string;
        };
        authorizationHeaderToken: any;
        queryOptions: {};
        facetTitleMap: {};
        facetOrder: any[];
        templates: {};
        autoSearch: boolean;
        requestOptions: {};
        results: boolean;
        sortLevels: boolean;
        showMetadata: boolean;
        termSingular: string;
        termPlural: string;
        entryMetadataFields: any[];
        levels: any[];
    };
}
//# sourceMappingURL=config.d.ts.map