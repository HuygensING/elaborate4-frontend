import Base from "../../base";
export default class EditableList extends Base {
    options: any;
    settings: any;
    selected: any;
    initialize(options?: any): this;
    render(): this;
    events(): any;
    removeLi(ev: any): any;
    onKeyup(ev: any): string;
    addSelected(): string;
    showButton(): string;
    hideButton(): string;
    triggerChange(): this;
}
//# sourceMappingURL=main.d.ts.map