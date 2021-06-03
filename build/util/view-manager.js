import $ from "jquery";
export default class ViewManager {
    _currentView;
    _cache;
    constructor() {
        this._currentView = null;
        this._cache = {};
    }
    show(View, viewOptions, options = {}) {
        var cachedView, key, ref, view;
        if (this._currentView != null) {
            this._currentView.destroy();
            this._currentView = null;
        }
        ref = this._cache;
        for (key in ref) {
            cachedView = ref[key];
            cachedView.$el.hide();
        }
        if (options.cache != null) {
            if (this._cache[options.cache] == null) {
                this._cache[options.cache] = new View(viewOptions);
                $('div#container').append(this._cache[options.cache].el);
            }
            return this._cache[options.cache].$el.show();
        }
        else {
            this._currentView = new View(viewOptions);
            view = this._currentView.el;
            return $('div#main').html(view);
        }
    }
    removeFromCache(key) {
        return delete this._cache[key];
    }
}
;
