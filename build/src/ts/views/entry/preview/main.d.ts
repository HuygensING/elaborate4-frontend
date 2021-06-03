/// <reference types="jquery" />
import EntryModel from "../../../models/entry";
import Base from "hilib/views/base";
import AddAnnotationTooltip from "./annotation.add.tooltip";
export default class EntryPreview extends Base {
    model: EntryModel;
    options: any;
    autoscroll: any;
    highlighter: any;
    interactive: any;
    transcription: any;
    newAnnotation: any;
    initialize(options?: any): void;
    render(): this;
    renderTooltips(): AddAnnotationTooltip;
    events(): {
        'click sup[data-marker="end"]': string;
        'mousedown .body-container': string;
        'mouseup .body-container': string;
        scroll: string;
        'click .fa.fa-print': string;
    };
    onPrint(ev: any): void;
    onScroll(ev: any): number;
    supClicked(ev: any): any;
    onMousedown(ev: any): this;
    onMouseup(ev: any): number;
    toggleWrap(wrap?: any): JQuery<HTMLElement>;
    setScroll(percentages: any): number;
    highlightAnnotation(annotationNo: any): any;
    unhighlightAnnotation(): any;
    unhighlightQuery(): any;
    setAnnotatedText(annotation: any): any;
    addNewAnnotation(newAnnotation: any, range: any): this;
    addNewAnnotationTags(range: any): any;
    removeNewAnnotation(): any;
    removeNewAnnotationTags(): any;
    setTranscriptionBody(): any;
    onHover(): any;
    resize(): string;
    setModel(entry: any): this;
    addListeners(): this;
}
//# sourceMappingURL=main.d.ts.map