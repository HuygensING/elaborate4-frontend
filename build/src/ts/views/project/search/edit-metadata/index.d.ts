/// <reference types="jquery" />
import BaseView from "hilib/views/base";
export default class EditMetadata extends BaseView {
    options: any;
    project: any;
    data: any;
    initialize(options?: any): any;
    render(): this;
    onSelectAll(ev: any): this;
    onShowMetadata(ev: any): JQuery<HTMLElement>;
    updateData(): this;
    saveButtonIsActive(): this;
    save(): any;
}
//# sourceMappingURL=index.d.ts.map