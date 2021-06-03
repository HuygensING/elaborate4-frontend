/// <reference types="jquery" />
import Base from "./base";
import Project from "../models/project/main";
export default class Projects extends Base {
    current: any;
    model: typeof Project;
    url: string;
    initialize(): this;
    fetch(options?: any): JQueryXHR;
    getCurrent(cb: any): any;
    setCurrent(id: any): any;
}
//# sourceMappingURL=projects.d.ts.map