/// <reference types="jquery" />
import Backbone from "backbone";
export default class MainView extends Backbone.View {
    facetViewMap: any;
    config: any;
    searchResults: any;
    textSearch: any;
    queryOptions: any;
    results: any;
    facets: any;
    initialize(options?: any): number;
    render(): this;
    initTextSearch(): this;
    renderTextSearch(): any;
    renderResults(): this;
    events(): {
        'click ul.facets-menu li.collapse-expand': (ev: any) => any;
        'click ul.facets-menu li.reset': string;
        'click ul.facets-menu li.switch button': string;
    };
    onSwitchType(ev: any): any;
    onReset(ev: any): any;
    destroy(): this;
    extendConfig(options: any): this;
    initQueryOptions(): this;
    initSearchResults(): this;
    initFacets(viewMap?: {}): this;
    showLoader(): number | false;
    hideLoader(): void;
    update(): any;
    page(pagenumber: any, database: any): any;
    next(): any;
    prev(): any;
    hasNext(): any;
    hasPrev(): any;
    sortResultsBy(sortParameters: any): any;
    reset(cache?: boolean): any;
    refresh(newQueryOptions?: {}): any;
    search(options?: any): any;
    searchValue(facetName: any, value: any, options: any): JQuery<HTMLElement>;
}
//# sourceMappingURL=main.d.ts.map