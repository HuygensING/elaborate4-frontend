/// <reference types="jquery" />
import Backbone from "backbone";
export default abstract class Base extends Backbone.Model {
    initialize(): any;
    sync(method: any, model: any, options: any): JQueryXHR;
}
//# sourceMappingURL=base.d.ts.map