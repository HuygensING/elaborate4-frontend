/// <reference types="jquery" />
import Base from "hilib/views/base";
export default class Search extends Base {
    project: any;
    options: any;
    initialize(options?: any): any;
    render(): this;
    renderSubmenu(): JQuery<HTMLElement>;
    renderFacetedSearch(): any;
    _addListeners(): this;
    _showEditMetadata(): this;
    _hideEditMetadata(): boolean;
}
//# sourceMappingURL=index.d.ts.map