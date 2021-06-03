/// <reference types="jquery" />
import Range from "./model";
import Facet from "../main";
export default class RangeFacet extends Facet {
    bodyTpl: any;
    options: any;
    draggingMin: any;
    draggingMax: any;
    button: HTMLButtonElement;
    handleMin: any;
    handleMax: any;
    dragStopper: any;
    resizer: any;
    inputMax: any;
    inputMin: any;
    bar: any;
    draggingBar: any;
    model: Range;
    initialize(options1?: any): this;
    render(): this;
    postRender(): Range;
    events(): any;
    setYear(ev: any): any;
    doSearch(ev: any): this;
    startDragging(ev: any): any;
    drag(ev: any): Range;
    stopDragging(): this;
    enableInputEditable(input: any): any;
    disableInputEditable(input: any): any;
    destroy(): this;
    triggerChange(options?: {}): this;
    onResize(): any;
    checkInputOverlap(): any;
    enableInputOverlap(diff: any): any;
    disableInputOverlap(): any;
    updateDash(): JQuery<HTMLElement>;
    update(newOptions: any): string;
}
//# sourceMappingURL=index.d.ts.map