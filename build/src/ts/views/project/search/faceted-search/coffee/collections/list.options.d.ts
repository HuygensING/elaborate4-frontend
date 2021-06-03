import Backbone from "backbone";
export default class ListOptions extends Backbone.Collection {
    strategies: any;
    initialize(): any;
    revert(): Backbone.Model<any, Backbone.ModelSetOptions, {}>[];
    updateOptions(newOptions?: any[]): this;
    orderBy(strategy: any, silent?: boolean): this;
    setAllVisible(): this;
}
//# sourceMappingURL=list.options.d.ts.map