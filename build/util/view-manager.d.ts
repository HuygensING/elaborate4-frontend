interface Options {
    cache?: any;
}
export default class ViewManager {
    _currentView: any;
    _cache: any;
    constructor();
    show(View: any, viewOptions?: any, options?: Options): any;
    removeFromCache(key: any): boolean;
}
export {};
//# sourceMappingURL=view-manager.d.ts.map