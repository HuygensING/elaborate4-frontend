import $ from "jquery"

interface Options {
  cache?: any
}

class ViewManager {
  _currentView
  _cache = {}

  show(View, viewOptions?, options: Options = {}) {
    // Destroy the current view.
    if (this._currentView != null) {
      this._currentView.destroy();
      this._currentView = null;
    }
    const ref = this._cache;
    for (const key in ref) {
      const cachedView = ref[key];
      // Hide all cached views.
      cachedView.$el.hide();
    }
    // Handle a request for a cached view.
    if (options.cache != null) {
      // Create a cached view if it doesn't exist.
      if (this._cache[options.cache] == null) {
        this._cache[options.cache] = new View(viewOptions);
        // Cached views are appended outside the #main div.
        $('div#container').append(this._cache[options.cache].el);
      }
      // Show the cached view.
      this._cache[options.cache].$el.show();
    } else {
      // Handle a request for a 'normal' view.
      this._currentView = new View(viewOptions);
      $('div#main').html(this._currentView.el);
    }
  }

  removeFromCache(key) {
    delete this._cache[key]
  }

}

export const viewManager = new ViewManager()
