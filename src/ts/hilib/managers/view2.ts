var StringFn, ViewManager, cachedViews, currentView,
  hasProp = {}.hasOwnProperty;

import StringFn  from "../utils/string";

currentView = null;

cachedViews = {};

ViewManager = class ViewManager {
  clear() {
    var hashCode, view;
    for (hashCode in cachedViews) {
      if (!hasProp.call(cachedViews, hashCode)) continue;
      view = cachedViews[hashCode];
      view.destroy();
    }
    return cachedViews = {};
  }

  show($el, View, options = {}) {
    var el, viewHashCode;
    if (options.append == null) {
      options.append = false;
    }
    if (options.prepend == null) {
      options.prepend = false;
    }
    // Option to bypass cache when set to false.
    if (options.cache == null) {
      options.cache = true;
    }
    viewHashCode = StringFn.hashCode(View.toString() + JSON.stringify(options));
    // Create a new cached view if the view is not found in the cachedViews hash or
    // options.cache is set to false. Textual we use "or", but in logics we need an inverted "and": if (!(a&&b)).
    if (!(cachedViews.hasOwnProperty(viewHashCode) && options.cache)) {
      cachedViews[viewHashCode] = new View(options);
    }
    // Set the currentView
    currentView = cachedViews[viewHashCode];
    el = $el[0];
    if (!(options.append || options.prepend)) {
      el.innerHTML = '';
    }
    if (options.prepend && (el.firstChild != null)) {
      el.insertBefore(currentView.el, el.firstChild);
    } else {
      el.appendChild(currentView.el);
    }
    return currentView;
  }

};

export default new ViewManager();
