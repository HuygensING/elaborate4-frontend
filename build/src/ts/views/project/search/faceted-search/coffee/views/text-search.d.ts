import Backbone from "backbone";
export default class TextSearch extends Backbone.View {
    options: any;
    initialize(options: any): this;
    _addFullTextSearchParameters(): Backbone.Model<any, Backbone.ModelSetOptions, {}>;
    setModel(): this;
    render(): this;
    events(): {
        'click i.fa-search': string;
        'keyup input[name="search"]': string;
        'focus input[name="search"]': () => any;
        'click .menu .fa-times': () => any;
        'change input[type="checkbox"]': string;
    };
    onKeyUp(ev: any): this;
    checkboxChanged(ev: any): this;
    search(ev: any): this;
    updateQueryModel(): this;
    reset(): this;
    destroy(): this;
}
//# sourceMappingURL=text-search.d.ts.map