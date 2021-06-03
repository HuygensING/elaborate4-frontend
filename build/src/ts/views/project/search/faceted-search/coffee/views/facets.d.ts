import Backbone from "backbone";
import BOOLEAN from "./facets/boolean";
import DATE from "./facets/date";
import RANGE from "./facets/range";
import LIST from "./facets/list";
export default class Facets extends Backbone.View {
    options: any;
    views: any;
    searchResults: any;
    constructor(...x: any);
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
        BOOLEAN: typeof BOOLEAN;
        DATE: typeof DATE;
        RANGE: typeof RANGE;
        LIST: typeof LIST;
    };
}
//# sourceMappingURL=facets.d.ts.map