/// <reference types="jquery" />
import BaseView from "hilib/views/base";
export default class EditAnnotationTooltip extends BaseView {
    options: any;
    container: any;
    pointedEl: any;
    initialize(options?: any): any;
    render(): any;
    events(): {
        'click .edit': string;
        'click .delete': string;
        click: string;
    };
    editClicked(ev: any): this;
    deleteClicked(ev: any): this;
    clicked(ev: any): void;
    show(args: any): false | void;
    hide(): void;
    setRelativePosition(position: any): JQuery<HTMLElement>;
    setAbsolutePosition(position: any): JQuery<HTMLElement>;
    isActive(): boolean;
}
//# sourceMappingURL=annotation.edit.tooltip.d.ts.map