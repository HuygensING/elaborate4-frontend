import FacetModel from "../../../models/facets/main";
export default class RangeFacet extends FacetModel {
    constructor(...args: any);
    defaults(): any;
    initialize(): this;
    set(attrs: any, options?: any): this;
    parse(attrs: any): any;
    convertLimit2Year(limit: any): number;
    _convertYear2Limit(year: any, from?: boolean): number;
    getLowerLimit(): number;
    getUpperLimit(): number;
    reset(): this;
    getLeftFromYear(year: any): number;
    getYearFromLeft(left: any): number;
    dragMin: (pos: any) => this;
    dragMax: (pos: any) => this;
}
//# sourceMappingURL=model.d.ts.map