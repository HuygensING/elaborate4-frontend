/// <reference types="jquery" />
import Backbone from "backbone";
import Base from "../base";
export default class Form extends Base {
    subformConfig: any;
    options: any;
    Model: any;
    tplData: any;
    tpl: any;
    subforms: any;
    constructor(x: any);
    initialize(options1?: {}): this;
    preRender(): void;
    render(): this;
    postRender(): void;
    events(): any;
    inputChanged(ev: any): any;
    textareaKeyup(ev: any): string;
    saveModel(validate?: boolean): JQueryXHR;
    submit(ev: any): Backbone.Model<any, Backbone.ModelSetOptions, {}> | JQueryXHR | this;
    cancel(ev: any): this;
    customAdd(): void;
    reset(): void;
    createModels(): JQueryXHR | this;
    addListeners(): this;
    triggerChange(): this;
    addSubform(attr: any, View: any): this;
    renderSubform(attr: any, View: any, model: any): this;
    destroy(): this;
}
//# sourceMappingURL=main.d.ts.map