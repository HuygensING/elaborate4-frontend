/// <reference types="jquery" />
import Base from "hilib/views/base";
export default class ProjectSettings extends Base {
    options: any;
    project: any;
    initialize(options1?: any): any;
    render(): this;
    renderGeneralTab(): JQuery<HTMLElement>;
    renderEntriesTab(): JQuery<HTMLElement>;
    renderTextlayersTab(): JQuery<HTMLElement>;
    renderUserTab(): JQuery<HTMLElement>;
    renderAnnotationsTab(): JQuery<HTMLElement>;
    renderConfirmModal(confirm: any, options: any): any;
    showTab(ev: any): JQuery<HTMLElement>;
}
//# sourceMappingURL=main.d.ts.map