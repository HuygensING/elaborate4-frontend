/// <reference types="jquery" />
import Base from "hilib/views/base";
export default class SearchSubmenu extends Base {
    project: any;
    options: any;
    initialize(options?: any): any;
    render(): this;
    enableEditMetadataButton(): JQuery<HTMLElement>;
    events(): {
        'click li[data-key="newsearch"]': () => any;
        'click li[data-key="newentry"]': string;
        'click li[data-key="save-edit-metadata"]:not(.inactive)': (ev: any) => any;
        'click li[data-key="cancel-edit-metadata"]': () => any;
        'click li[data-key="editmetadata"].enabled': () => any;
        'click li[data-key="delete"]': string;
        'click li[data-key="publish"]': string;
    };
    publishDraft(ev: any): any;
    newEntry(ev: any): any;
    activatePublishDraftButton(): any;
    deactivatePublishDraftButton(): any;
    activateEditMetadataSaveButton(): JQuery<HTMLElement>;
    deactivateEditMetadataSaveButton(): JQuery<HTMLElement>;
    pollDraft(): any;
    deleteProject: () => (ev: any) => any;
}
//# sourceMappingURL=submenu.d.ts.map