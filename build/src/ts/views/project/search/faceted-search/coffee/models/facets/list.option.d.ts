import Backbone from "backbone";
export default class ListOption extends Backbone.Model {
    defaults(): {
        name: string;
        count: number;
        total: number;
        checked: boolean;
        visible: boolean;
    };
    parse(attrs: any): any;
}
//# sourceMappingURL=list.option.d.ts.map