/// <reference types="jquery" />
import Backbone from "backbone";
export default class Facet extends Backbone.View {
    config: any;
    tpl: any;
    initialize(options?: any): any;
    render(): this;
    events(): {
        'click h3': string;
    };
    toggleBody(ev: any): any;
    hideMenu(): JQuery<HTMLElement>;
    hideBody(done: any): JQuery<HTMLElement>;
    showBody(done: any): JQuery<HTMLElement>;
    destroy(): this;
    update(newOptions: any): void;
    reset(): void;
    postRender(): void;
}
//# sourceMappingURL=main.d.ts.map