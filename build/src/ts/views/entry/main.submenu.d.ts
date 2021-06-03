/// <reference types="jquery" />
import Base from "hilib/views/base";
export default class EntrySubmenu extends Base {
    options: any;
    entry: any;
    user: any;
    project: any;
    initialize(options?: any): any;
    render(): this;
    events(): {
        'click .menu li.active[data-key="previous"]': string;
        'click .menu li.active[data-key="next"]': string;
        'click .menu li[data-key="delete"]': string;
        'click .menu li[data-key="metadata"]': string;
        'click .menu li[data-key="facsimiles"] li[data-key="facsimile"]': string;
    };
    changeFacsimile(ev: any): any;
    activatePrevNext(): JQuery<HTMLElement>;
    _goToPreviousEntry(): boolean;
    _goToNextEntry(): boolean;
    adjustTextareaHeight(ev: any): string;
    deleteEntry: () => (ev: any) => any;
    editEntryMetadata: () => (ev: any) => JQuery<HTMLElement>;
}
//# sourceMappingURL=main.submenu.d.ts.map