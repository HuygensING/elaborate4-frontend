import Backbone from "backbone";
import LIST from "./facets/list";
export default class Facets extends Backbone.View {
    options: any;
    views: any;
    searchResults: any;
    constructor();
    initialize(options1: any): this;
    render(): this;
    renderFacets(data: any): this;
    renderFacet(facetData: any): any;
    _postRenderFacets(): any;
    update(facetData: any): any;
    reset(): any;
    destroyFacets(): any;
    destroy(): this;
    toggle(ev: any): any;
    viewMap: {
        BOOLEAN: any;
        DATE: any;
        RANGE: any;
        LIST: typeof LIST;
    };
}
//# sourceMappingURL=facets.d.ts.map