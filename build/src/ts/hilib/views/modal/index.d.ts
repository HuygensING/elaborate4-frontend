/// <reference types="jquery" />
import Backbone from "backbone";
export default class Modal extends Backbone.View {
    options: any;
    defaultOptions(): {
        title: string;
        titleClass: string;
        cancelAndSubmit: boolean;
        cancelValue: string;
        submitValue: string;
        customClassName: string;
        focusOnFirstInput: boolean;
        clickOverlay: boolean;
    };
    initialize(options?: {}): this;
    render(): this;
    submit(ev: any): this;
    cancel(ev: any): any;
    close(): any;
    destroy(): any;
    fadeOut(delay?: number): number;
    message(type: any, message: any): void | JQuery<HTMLElement>;
    messageAndFade(type: any, message: any, delay: any): number;
}
//# sourceMappingURL=index.d.ts.map