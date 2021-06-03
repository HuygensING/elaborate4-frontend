import Backbone from "backbone";
export default class Result extends Backbone.View {
    options: any;
    tpl: any;
    initialize(options?: {}): this;
    render(): this;
    events(): {
        click: string;
        'click li[data-layer]': string;
    };
    _handleClick(ev: any): this;
    _handleLayerClick(ev: any): this;
    destroy(): this;
}
//# sourceMappingURL=result.d.ts.map