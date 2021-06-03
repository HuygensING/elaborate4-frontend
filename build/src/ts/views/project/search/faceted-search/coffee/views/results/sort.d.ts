/// <reference types="jquery" />
import Backbone from "backbone";
export default class SortLevels extends Backbone.View {
    options: any;
    onMouseleave: any;
    initialize(options?: {}): this;
    render(): any;
    events(): {
        'click button.toggle': string;
        'click li.search button': string;
        'change div.levels select': string;
        'click div.levels i.fa': string;
    };
    toggleLevels(ev: any): JQuery<HTMLElement>;
    hideLevels(): JQuery<HTMLElement>;
    changeLevels(ev: any): any;
    changeAlphaSort(ev: any): any;
    saveLevels(): this;
    destroy(): this;
}
//# sourceMappingURL=sort.d.ts.map