/// <reference types="jquery" />
import BaseView from "hilib/views/base";
export default class AddAnnotationTooltip extends BaseView {
    options: any;
    container: any;
    newannotation: any;
    initialize(options?: any): this;
    render(): this;
    events(): {
        'change select': string;
        'click button': string;
    };
    selectChanged(ev: any): any;
    buttonClicked(ev: any): this;
    show(position: any): void;
    hide(): void;
    setPosition(position: any): JQuery<HTMLElement>;
    isActive(): boolean;
}
//# sourceMappingURL=annotation.add.tooltip.d.ts.map