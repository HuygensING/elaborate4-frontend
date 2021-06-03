/// <reference types="jquery" />
import Base from "hilib/views/base";
export default class ProjectSettingsUsers extends Base {
    options: any;
    project: any;
    initialize(options1?: any): this;
    render(): this;
    renderUserroles(): JQuery<HTMLElement>;
    renderAddUserForm(): this;
    events(): {
        'change select': string;
    };
    roleChanged(ev: any): any;
    renderCombolist: () => () => any;
}
//# sourceMappingURL=users.d.ts.map