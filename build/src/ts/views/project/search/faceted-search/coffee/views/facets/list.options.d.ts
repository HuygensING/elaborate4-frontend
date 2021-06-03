/// <reference types="jquery" />
import Backbone from "backbone";
import ListOptions from "../../collections/list.options";
export default class ListFacetOptions extends Backbone.View {
    config: any;
    facetName: any;
    optionTpl: any;
    bodyTpl: any;
    showingCursor: any;
    showingIncrement: any;
    collection: ListOptions;
    constructor(...x: any);
    initialize(options: any): this;
    render(): this;
    rerender(): any;
    appendOptions(all?: boolean): JQuery<HTMLElement>;
    renderAll(): ListOptions;
    events(): {
        'click li': string;
        scroll: string;
    };
    onScroll(ev: any): JQuery<HTMLElement>;
    checkChanged(ev: any): any;
    triggerChange(values?: any[]): this;
    filterOptions(value: any): this;
    setCheckboxes(ev: any): this;
}
//# sourceMappingURL=list.options.d.ts.map