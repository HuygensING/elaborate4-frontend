import Backbone from "backbone";
export default class QueryOptions extends Backbone.Model {
    initialAttributes: any;
    defaults(): {
        facetValues: any[];
        sortParameters: any[];
    };
    initialize(initialAttributes: any): void;
    set(attrs: any, options: any): this;
    reset(): this;
}
//# sourceMappingURL=query-options.d.ts.map