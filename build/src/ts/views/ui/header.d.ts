import BaseView from "hilib/views/base";
export default class Header extends BaseView {
    options: any;
    project: any;
    initialize(options?: any): this;
    navigateToProject(ev: any): boolean;
    navigateToProjectSettings(ev: any): boolean;
    navigateToProjectStatistics(ev: any): boolean;
    navigateToProjectHistory(ev: any): boolean;
    render(): this;
    setProject(ev: any): any;
    showMessage(msg: any): number | false;
    addProject: () => (ev: any) => any;
}
//# sourceMappingURL=header.d.ts.map