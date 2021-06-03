import Base from "hilib/views/base";
export default class ProjectSettingsEntries extends Base {
    initialize(options: any): this;
    render(): this;
    renderSetNames(): any;
    renderSortLevels(): any;
    events(): {
        'click button.savesortlevels': string;
        'click .set-names form input[type="submit"]': string;
        'keyup .set-names form input[type="text"]': (ev: any) => any;
        'change .sort-levels select': (ev: any) => any;
    };
    submitSetCustomNames(ev: any): any;
    saveSortLevels(ev: any): any;
}
//# sourceMappingURL=entries.d.ts.map