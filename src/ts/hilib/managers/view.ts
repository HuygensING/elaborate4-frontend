var StringFn, ViewManager,
  hasProp = {}.hasOwnProperty;

import StringFn  from "../utils/string";

ViewManager = (function() {
  var cachedViews, currentViews;

  class ViewManager {
    clear(view) {
      var cid, results, selfDestruct;
      // console.log 'clearing', view, view.options
      selfDestruct = function(view) {
        if (view.options.persist !== true) {
          if (view.destroy != null) {
            view.destroy();
          } else {
            view.remove();
          }
          return delete currentViews[view.cid];
        }
      };
      // Remove one view 
      if (view != null) {
        return selfDestruct(view);
      } else {
        results = [];
        for (cid in currentViews) {
          if (!hasProp.call(currentViews, cid)) continue;
          view = currentViews[cid];
          
          // Remove all views
          results.push(selfDestruct(view));
        }
        return results;
      }
    }

    clearCache() {
      this.clear();
      return cachedViews = {};
    }

    register(view) {
      if (view != null) {
        return currentViews[view.cid] = view;
      }
    }

    show(el, View, options = {}) {
      var cid, view, viewHashCode;
      for (cid in currentViews) {
        if (!hasProp.call(currentViews, cid)) continue;
        view = currentViews[cid];
        if (!view.options.cache && !view.options.persist) {
          this.clear(view);
        }
      }
      if (_.isString(el)) {
        el = document.querySelector(el);
      }
      if (options.append == null) {
        options.append = false;
      }
      if (options.prepend == null) {
        options.prepend = false;
      }
      if (options.persist == null) {
        options.persist = false;
      }
      if (options.persist === true) {
        options.cache = false;
      }
      if (options.cache == null) {
        options.cache = true;
      }
      if (options.cache) {
        viewHashCode = StringFn.hashCode(View.toString() + JSON.stringify(options));
        if (!cachedViews.hasOwnProperty(viewHashCode)) {
          cachedViews[viewHashCode] = new View(options);
        }
        view = cachedViews[viewHashCode];
      } else {
        view = new View(options);
      }
      if (_.isElement(el) && (view != null)) {
        if (!(options.append || options.prepend)) {
          el.innerHTML = '';
        }
        if (options.prepend && (el.firstChild != null)) {
          el.insertBefore(view.el, el.firstChild);
        } else {
          el.appendChild(view.el);
        }
      }
      return view;
    }

  };

  currentViews = {};

  cachedViews = {};

  return ViewManager;

}).call(this);

export default new ViewManager();
