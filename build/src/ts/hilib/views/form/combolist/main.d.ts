import Base from "../../base";
export default class ComboList extends Base {
    options: any;
    settings: any;
    selected: any;
    filtered_options: any;
    initialize(options1?: any): void;
    postDropdownRender(): any;
    events(): any;
    toggleAddButton(ev: any): any;
    createModel(): any;
    removeSelected(ev: any): any;
    addSelected(ev: any): any;
    triggerChange(options: any): this;
    strArray2optionArray(strArray: any): {
        id: any;
        title: any;
    }[];
}
//# sourceMappingURL=main.d.ts.map