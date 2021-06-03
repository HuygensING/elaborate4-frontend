/// <reference types="jquery" />
import Backbone from "backbone";
export default class Results extends Backbone.View {
    options: any;
    resultItems: any;
    isMetadataVisible: any;
    subviews: any;
    initialize(options?: {}): this;
    render(): this;
    renderLevels(): this;
    renderResultsPage(responseModel: any): JQuery<HTMLElement>;
    renderPagination(responseModel: any): JQuery<HTMLElement>;
    changePage(pageNumber: any): any;
    events(): {
        'change li.show-metadata input': string;
        'change li.results-per-page select': string;
    };
    onChangeResultsPerPage(ev: any): any;
    showMetadata(ev: any): JQuery<HTMLElement>;
    reset(): this;
    destroy(): any;
    destroyResultItems(): any;
}
//# sourceMappingURL=index.d.ts.map