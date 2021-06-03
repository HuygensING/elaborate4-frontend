/// <reference types="jquery" />
import OptionsCollection from "../../collections/list.options";
import Facet from "./main";
export default class ListFacet extends Facet {
    resetActive: any;
    optionsView: any;
    collection: OptionsCollection;
    initialize(options: any): this;
    render(): this;
    postRender(): JQuery<HTMLElement>;
    renderFilteredOptionCount(): this;
    events(): any;
    toggleFilterMenu(): any;
    changeOrder(ev: any): OptionsCollection;
    update(newOptions: any): false | OptionsCollection;
    reset(): any;
    revert(): OptionsCollection;
}
//# sourceMappingURL=list.d.ts.map