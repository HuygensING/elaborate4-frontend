/// <reference types="jquery" />
import Backbone from "backbone";
export default class Base extends Backbone.Collection {
    initialize(): any;
    sync(method: any, model: any, options: any): JQueryXHR;
    removeById(id: any): Backbone.Model<any, Backbone.ModelSetOptions, {}>;
}
//# sourceMappingURL=base.d.ts.map