/// <reference types="jquery" />
import Base from "./base";
import Project from "../models/project/main";
declare class Projects extends Base {
    current: any;
    model: typeof Project;
    url: string;
    initialize(): this;
    fetch(options?: any): JQueryXHR;
    getCurrent(cb: any): any;
    setCurrent(id: any): any;
}
declare const _default: Projects;
export default _default;
//# sourceMappingURL=projects.d.ts.map