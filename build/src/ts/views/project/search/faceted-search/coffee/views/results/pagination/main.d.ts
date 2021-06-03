import Backbone from "backbone";
export default class Pagination extends Backbone.View {
    options: any;
    _currentPageNumber: any;
    _pageCount: any;
    triggerPageNumber: any;
    initialize(options: any): any;
    render(): this;
    events(): {
        'click li.prev10.active': string;
        'click li.prev.active': string;
        'click li.next.active': string;
        'click li.next10.active': string;
        'click li.current:not(.active)': string;
        'blur li.current.active input': string;
        'keyup li.current.active input': string;
    };
    _handlePrev10(): any;
    _handlePrev(): any;
    _handleNext(): any;
    _handleNext10(): any;
    _handleCurrentClick(ev: any): any;
    _handleKeyup(ev: any): any;
    _handleBlur(ev: any): any;
    _deactivateCurrentLi(input: any): any;
    getCurrentPageNumber(): any;
    setPageNumber(pageNumber: any, silent?: boolean): any;
    destroy(): this;
}
//# sourceMappingURL=main.d.ts.map