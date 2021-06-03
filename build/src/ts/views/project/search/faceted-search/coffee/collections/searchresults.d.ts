import Backbone from "backbone";
export default class SearchResults extends Backbone.Collection {
    config: any;
    cachedModels: any;
    _current: any;
    initialize(models: any, options: any): {};
    clearCache(): {};
    getCurrent(): any;
    _setCurrent(_current: any, changeMessage: any): this;
    _addModel(url: any, attrs: any, cacheId: any, changeMessage: any): this;
    runQuery(queryOptions: any, options?: any): any;
    moveCursor(direction: any): any;
    page(pagenumber: any, database: any): any;
    postQuery(queryOptions: any, done: any): any;
    getResults(url: any, done: any): any;
}
//# sourceMappingURL=searchresults.d.ts.map