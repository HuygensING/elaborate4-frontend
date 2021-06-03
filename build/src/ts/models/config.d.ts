import Backbone from "backbone";
declare class Config extends Backbone.Model {
    url: () => string;
    defaults(): any;
    parse(data: any): any;
    set(attrs: any, options: any): this;
    slugToLayer(slug: any): any;
}
declare const _default: Config;
export default _default;
//# sourceMappingURL=config.d.ts.map