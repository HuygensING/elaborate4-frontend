/// <reference types="jquery" />
import Base from "hilib/views/base";
export default class ProjectSettingsEntries extends Base {
    project: any;
    options: any;
    initialize(options?: any): this;
    render(): this;
    renderSetNames(): JQuery<HTMLElement>;
    renderSortLevels(): JQuery<HTMLElement>;
    events(): {
        'click button.savesortlevels': string;
        'click .set-names form input[type="submit"]': string;
        'keyup .set-names form input[type="text"]': (ev: any) => any;
        'change .sort-levels select': (ev: any) => any;
    };
    submitSetCustomNames(ev: any): this;
    saveSortLevels(ev: any): any;
}
//# sourceMappingURL=entries.d.ts.map