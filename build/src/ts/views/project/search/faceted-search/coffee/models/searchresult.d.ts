import Backbone from "backbone";
export default class SearchResult extends Backbone.Model {
    defaults(): {
        _next: any;
        _prev: any;
        ids: any[];
        numFound: any;
        results: any[];
        rows: any;
        solrquery: string;
        sortableFields: any[];
        start: any;
        facets: any[];
    };
}
//# sourceMappingURL=searchresult.d.ts.map