/// <reference types="jquery" />
import 'hilib/utils/jquery.mixin';
import Base from "hilib/views/base";
export default class Entry extends Base {
    options: any;
    project: any;
    entry: any;
    currentTranscription: any;
    initialize(options1?: any): any;
    render(): any;
    renderEditFacsimilesMenu(): JQuery<HTMLElement>;
    renderFacsimile(): any;
    renderPreview(): any;
    renderTranscriptionEditor(): any;
    renderAnnotationEditor(model: any): any;
    events(): {
        'click li[data-key="layer"]': string;
        'click .left-menu ul.textlayers li[data-key="transcription"]': string;
        'click .middle-menu ul.textlayers li[data-key="transcription"]': string;
        'click .menu li.subsub': (ev: any) => any;
    };
    showLeftTranscription(ev: any): any;
    showUnsavedChangesModal(args: any): any;
    changeTranscription(ev: any): any;
    addListeners(): void;
    addFacsimile(facsimile: any, collection: any): any;
    removeFacsimile(facsimile: any, collection: any): any;
    removeTranscription(transcription: any): any;
    addTranscription(transcription: any): any;
}
//# sourceMappingURL=main.d.ts.map