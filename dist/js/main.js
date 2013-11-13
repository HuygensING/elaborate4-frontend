(function () {
/**
 * almond 0.2.6 Copyright (c) 2011-2012, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/almond for details
 */
//Going sloppy to avoid 'use strict' string cost, but strict practices should
//be followed.
/*jslint sloppy: true */
/*global setTimeout: false */

var requirejs, require, define;
(function (undef) {
    var main, req, makeMap, handlers,
        defined = {},
        waiting = {},
        config = {},
        defining = {},
        hasOwn = Object.prototype.hasOwnProperty,
        aps = [].slice;

    function hasProp(obj, prop) {
        return hasOwn.call(obj, prop);
    }

    /**
     * Given a relative module name, like ./something, normalize it to
     * a real name that can be mapped to a path.
     * @param {String} name the relative name
     * @param {String} baseName a real name that the name arg is relative
     * to.
     * @returns {String} normalized name
     */
    function normalize(name, baseName) {
        var nameParts, nameSegment, mapValue, foundMap,
            foundI, foundStarMap, starI, i, j, part,
            baseParts = baseName && baseName.split("/"),
            map = config.map,
            starMap = (map && map['*']) || {};

        //Adjust any relative paths.
        if (name && name.charAt(0) === ".") {
            //If have a base name, try to normalize against it,
            //otherwise, assume it is a top-level require that will
            //be relative to baseUrl in the end.
            if (baseName) {
                //Convert baseName to array, and lop off the last part,
                //so that . matches that "directory" and not name of the baseName's
                //module. For instance, baseName of "one/two/three", maps to
                //"one/two/three.js", but we want the directory, "one/two" for
                //this normalization.
                baseParts = baseParts.slice(0, baseParts.length - 1);

                name = baseParts.concat(name.split("/"));

                //start trimDots
                for (i = 0; i < name.length; i += 1) {
                    part = name[i];
                    if (part === ".") {
                        name.splice(i, 1);
                        i -= 1;
                    } else if (part === "..") {
                        if (i === 1 && (name[2] === '..' || name[0] === '..')) {
                            //End of the line. Keep at least one non-dot
                            //path segment at the front so it can be mapped
                            //correctly to disk. Otherwise, there is likely
                            //no path mapping for a path starting with '..'.
                            //This can still fail, but catches the most reasonable
                            //uses of ..
                            break;
                        } else if (i > 0) {
                            name.splice(i - 1, 2);
                            i -= 2;
                        }
                    }
                }
                //end trimDots

                name = name.join("/");
            } else if (name.indexOf('./') === 0) {
                // No baseName, so this is ID is resolved relative
                // to baseUrl, pull off the leading dot.
                name = name.substring(2);
            }
        }

        //Apply map config if available.
        if ((baseParts || starMap) && map) {
            nameParts = name.split('/');

            for (i = nameParts.length; i > 0; i -= 1) {
                nameSegment = nameParts.slice(0, i).join("/");

                if (baseParts) {
                    //Find the longest baseName segment match in the config.
                    //So, do joins on the biggest to smallest lengths of baseParts.
                    for (j = baseParts.length; j > 0; j -= 1) {
                        mapValue = map[baseParts.slice(0, j).join('/')];

                        //baseName segment has  config, find if it has one for
                        //this name.
                        if (mapValue) {
                            mapValue = mapValue[nameSegment];
                            if (mapValue) {
                                //Match, update name to the new value.
                                foundMap = mapValue;
                                foundI = i;
                                break;
                            }
                        }
                    }
                }

                if (foundMap) {
                    break;
                }

                //Check for a star map match, but just hold on to it,
                //if there is a shorter segment match later in a matching
                //config, then favor over this star map.
                if (!foundStarMap && starMap && starMap[nameSegment]) {
                    foundStarMap = starMap[nameSegment];
                    starI = i;
                }
            }

            if (!foundMap && foundStarMap) {
                foundMap = foundStarMap;
                foundI = starI;
            }

            if (foundMap) {
                nameParts.splice(0, foundI, foundMap);
                name = nameParts.join('/');
            }
        }

        return name;
    }

    function makeRequire(relName, forceSync) {
        return function () {
            //A version of a require function that passes a moduleName
            //value for items that may need to
            //look up paths relative to the moduleName
            return req.apply(undef, aps.call(arguments, 0).concat([relName, forceSync]));
        };
    }

    function makeNormalize(relName) {
        return function (name) {
            return normalize(name, relName);
        };
    }

    function makeLoad(depName) {
        return function (value) {
            defined[depName] = value;
        };
    }

    function callDep(name) {
        if (hasProp(waiting, name)) {
            var args = waiting[name];
            delete waiting[name];
            defining[name] = true;
            main.apply(undef, args);
        }

        if (!hasProp(defined, name) && !hasProp(defining, name)) {
            throw new Error('No ' + name);
        }
        return defined[name];
    }

    //Turns a plugin!resource to [plugin, resource]
    //with the plugin being undefined if the name
    //did not have a plugin prefix.
    function splitPrefix(name) {
        var prefix,
            index = name ? name.indexOf('!') : -1;
        if (index > -1) {
            prefix = name.substring(0, index);
            name = name.substring(index + 1, name.length);
        }
        return [prefix, name];
    }

    /**
     * Makes a name map, normalizing the name, and using a plugin
     * for normalization if necessary. Grabs a ref to plugin
     * too, as an optimization.
     */
    makeMap = function (name, relName) {
        var plugin,
            parts = splitPrefix(name),
            prefix = parts[0];

        name = parts[1];

        if (prefix) {
            prefix = normalize(prefix, relName);
            plugin = callDep(prefix);
        }

        //Normalize according
        if (prefix) {
            if (plugin && plugin.normalize) {
                name = plugin.normalize(name, makeNormalize(relName));
            } else {
                name = normalize(name, relName);
            }
        } else {
            name = normalize(name, relName);
            parts = splitPrefix(name);
            prefix = parts[0];
            name = parts[1];
            if (prefix) {
                plugin = callDep(prefix);
            }
        }

        //Using ridiculous property names for space reasons
        return {
            f: prefix ? prefix + '!' + name : name, //fullName
            n: name,
            pr: prefix,
            p: plugin
        };
    };

    function makeConfig(name) {
        return function () {
            return (config && config.config && config.config[name]) || {};
        };
    }

    handlers = {
        require: function (name) {
            return makeRequire(name);
        },
        exports: function (name) {
            var e = defined[name];
            if (typeof e !== 'undefined') {
                return e;
            } else {
                return (defined[name] = {});
            }
        },
        module: function (name) {
            return {
                id: name,
                uri: '',
                exports: defined[name],
                config: makeConfig(name)
            };
        }
    };

    main = function (name, deps, callback, relName) {
        var cjsModule, depName, ret, map, i,
            args = [],
            usingExports;

        //Use name if no relName
        relName = relName || name;

        //Call the callback to define the module, if necessary.
        if (typeof callback === 'function') {

            //Pull out the defined dependencies and pass the ordered
            //values to the callback.
            //Default to [require, exports, module] if no deps
            deps = !deps.length && callback.length ? ['require', 'exports', 'module'] : deps;
            for (i = 0; i < deps.length; i += 1) {
                map = makeMap(deps[i], relName);
                depName = map.f;

                //Fast path CommonJS standard dependencies.
                if (depName === "require") {
                    args[i] = handlers.require(name);
                } else if (depName === "exports") {
                    //CommonJS module spec 1.1
                    args[i] = handlers.exports(name);
                    usingExports = true;
                } else if (depName === "module") {
                    //CommonJS module spec 1.1
                    cjsModule = args[i] = handlers.module(name);
                } else if (hasProp(defined, depName) ||
                           hasProp(waiting, depName) ||
                           hasProp(defining, depName)) {
                    args[i] = callDep(depName);
                } else if (map.p) {
                    map.p.load(map.n, makeRequire(relName, true), makeLoad(depName), {});
                    args[i] = defined[depName];
                } else {
                    throw new Error(name + ' missing ' + depName);
                }
            }

            ret = callback.apply(defined[name], args);

            if (name) {
                //If setting exports via "module" is in play,
                //favor that over return value and exports. After that,
                //favor a non-undefined return value over exports use.
                if (cjsModule && cjsModule.exports !== undef &&
                        cjsModule.exports !== defined[name]) {
                    defined[name] = cjsModule.exports;
                } else if (ret !== undef || !usingExports) {
                    //Use the return value from the function.
                    defined[name] = ret;
                }
            }
        } else if (name) {
            //May just be an object definition for the module. Only
            //worry about defining if have a module name.
            defined[name] = callback;
        }
    };

    requirejs = require = req = function (deps, callback, relName, forceSync, alt) {
        if (typeof deps === "string") {
            if (handlers[deps]) {
                //callback in this case is really relName
                return handlers[deps](callback);
            }
            //Just return the module wanted. In this scenario, the
            //deps arg is the module name, and second arg (if passed)
            //is just the relName.
            //Normalize module name, if it contains . or ..
            return callDep(makeMap(deps, callback).f);
        } else if (!deps.splice) {
            //deps is a config object, not an array.
            config = deps;
            if (callback.splice) {
                //callback is an array, which means it is a dependency list.
                //Adjust args if there are dependencies
                deps = callback;
                callback = relName;
                relName = null;
            } else {
                deps = undef;
            }
        }

        //Support require(['a'])
        callback = callback || function () {};

        //If relName is a function, it is an errback handler,
        //so remove it.
        if (typeof relName === 'function') {
            relName = forceSync;
            forceSync = alt;
        }

        //Simulate async callback;
        if (forceSync) {
            main(undef, deps, callback, relName);
        } else {
            //Using a non-zero value because of concern for what old browsers
            //do, and latest browsers "upgrade" to 4 if lower value is used:
            //http://www.whatwg.org/specs/web-apps/current-work/multipage/timers.html#dom-windowtimers-settimeout:
            //If want a value immediately, use require('id') instead -- something
            //that works in almond on the global level, but not guaranteed and
            //unlikely to work in other AMD implementations.
            setTimeout(function () {
                main(undef, deps, callback, relName);
            }, 4);
        }

        return req;
    };

    /**
     * Just drops the config on the floor, but returns req in case
     * the config return value is used.
     */
    req.config = function (cfg) {
        config = cfg;
        if (config.deps) {
            req(config.deps, config.callback);
        }
        return req;
    };

    /**
     * Expose module registry for debugging and tooling
     */
    requirejs._defined = defined;

    define = function (name, deps, callback) {

        //This module may not have dependencies
        if (!deps.splice) {
            //deps is not an array, so probably means
            //an object literal or factory function for
            //the value. Adjust args.
            callback = deps;
            deps = [];
        }

        if (!hasProp(defined, name) && !hasProp(waiting, name)) {
            waiting[name] = [name, deps, callback];
        }
    };

    define.amd = {
        jQuery: true
    };
}());

define("../lib/almond/almond", function(){});

/**
 * @license RequireJS domReady 2.0.1 Copyright (c) 2010-2012, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/requirejs/domReady for details
 */
/*jslint */
/*global require: false, define: false, requirejs: false,
  window: false, clearInterval: false, document: false,
  self: false, setInterval: false */


define('domready',[],function () {
    

    var isTop, testDiv, scrollIntervalId,
        isBrowser = typeof window !== "undefined" && window.document,
        isPageLoaded = !isBrowser,
        doc = isBrowser ? document : null,
        readyCalls = [];

    function runCallbacks(callbacks) {
        var i;
        for (i = 0; i < callbacks.length; i += 1) {
            callbacks[i](doc);
        }
    }

    function callReady() {
        var callbacks = readyCalls;

        if (isPageLoaded) {
            //Call the DOM ready callbacks
            if (callbacks.length) {
                readyCalls = [];
                runCallbacks(callbacks);
            }
        }
    }

    /**
     * Sets the page as loaded.
     */
    function pageLoaded() {
        if (!isPageLoaded) {
            isPageLoaded = true;
            if (scrollIntervalId) {
                clearInterval(scrollIntervalId);
            }

            callReady();
        }
    }

    if (isBrowser) {
        if (document.addEventListener) {
            //Standards. Hooray! Assumption here that if standards based,
            //it knows about DOMContentLoaded.
            document.addEventListener("DOMContentLoaded", pageLoaded, false);
            window.addEventListener("load", pageLoaded, false);
        } else if (window.attachEvent) {
            window.attachEvent("onload", pageLoaded);

            testDiv = document.createElement('div');
            try {
                isTop = window.frameElement === null;
            } catch (e) {}

            //DOMContentLoaded approximation that uses a doScroll, as found by
            //Diego Perini: http://javascript.nwbox.com/IEContentLoaded/,
            //but modified by other contributors, including jdalton
            if (testDiv.doScroll && isTop && window.external) {
                scrollIntervalId = setInterval(function () {
                    try {
                        testDiv.doScroll();
                        pageLoaded();
                    } catch (e) {}
                }, 30);
            }
        }

        //Check if document already complete, and if so, just trigger page load
        //listeners. Latest webkit browsers also use "interactive", and
        //will fire the onDOMContentLoaded before "interactive" but not after
        //entering "interactive" or "complete". More details:
        //http://dev.w3.org/html5/spec/the-end.html#the-end
        //http://stackoverflow.com/questions/3665561/document-readystate-of-interactive-vs-ondomcontentloaded
        //Hmm, this is more complicated on further use, see "firing too early"
        //bug: https://github.com/requirejs/domReady/issues/1
        //so removing the || document.readyState === "interactive" test.
        //There is still a window.onload binding that should get fired if
        //DOMContentLoaded is missed.
        if (document.readyState === "complete") {
            pageLoaded();
        }
    }

    /** START OF PUBLIC API **/

    /**
     * Registers a callback for DOM ready. If DOM is already ready, the
     * callback is called immediately.
     * @param {Function} callback
     */
    function domReady(callback) {
        if (isPageLoaded) {
            callback(doc);
        } else {
            readyCalls.push(callback);
        }
        return domReady;
    }

    domReady.version = '2.0.1';

    /**
     * Loader Plugin API method
     */
    domReady.load = function (name, req, onLoad, config) {
        if (config.isBuild) {
            onLoad(null);
        } else {
            domReady(onLoad);
        }
    };

    /** END OF PUBLIC API **/

    return domReady;
});

//     Underscore.js 1.5.2
//     http://underscorejs.org
//     (c) 2009-2013 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
//     Underscore may be freely distributed under the MIT license.

(function() {

  // Baseline setup
  // --------------

  // Establish the root object, `window` in the browser, or `exports` on the server.
  var root = this;

  // Save the previous value of the `_` variable.
  var previousUnderscore = root._;

  // Establish the object that gets returned to break out of a loop iteration.
  var breaker = {};

  // Save bytes in the minified (but not gzipped) version:
  var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;

  // Create quick reference variables for speed access to core prototypes.
  var
    push             = ArrayProto.push,
    slice            = ArrayProto.slice,
    concat           = ArrayProto.concat,
    toString         = ObjProto.toString,
    hasOwnProperty   = ObjProto.hasOwnProperty;

  // All **ECMAScript 5** native function implementations that we hope to use
  // are declared here.
  var
    nativeForEach      = ArrayProto.forEach,
    nativeMap          = ArrayProto.map,
    nativeReduce       = ArrayProto.reduce,
    nativeReduceRight  = ArrayProto.reduceRight,
    nativeFilter       = ArrayProto.filter,
    nativeEvery        = ArrayProto.every,
    nativeSome         = ArrayProto.some,
    nativeIndexOf      = ArrayProto.indexOf,
    nativeLastIndexOf  = ArrayProto.lastIndexOf,
    nativeIsArray      = Array.isArray,
    nativeKeys         = Object.keys,
    nativeBind         = FuncProto.bind;

  // Create a safe reference to the Underscore object for use below.
  var _ = function(obj) {
    if (obj instanceof _) return obj;
    if (!(this instanceof _)) return new _(obj);
    this._wrapped = obj;
  };

  // Export the Underscore object for **Node.js**, with
  // backwards-compatibility for the old `require()` API. If we're in
  // the browser, add `_` as a global object via a string identifier,
  // for Closure Compiler "advanced" mode.
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = _;
    }
    exports._ = _;
  } else {
    root._ = _;
  }

  // Current version.
  _.VERSION = '1.5.2';

  // Collection Functions
  // --------------------

  // The cornerstone, an `each` implementation, aka `forEach`.
  // Handles objects with the built-in `forEach`, arrays, and raw objects.
  // Delegates to **ECMAScript 5**'s native `forEach` if available.
  var each = _.each = _.forEach = function(obj, iterator, context) {
    if (obj == null) return;
    if (nativeForEach && obj.forEach === nativeForEach) {
      obj.forEach(iterator, context);
    } else if (obj.length === +obj.length) {
      for (var i = 0, length = obj.length; i < length; i++) {
        if (iterator.call(context, obj[i], i, obj) === breaker) return;
      }
    } else {
      var keys = _.keys(obj);
      for (var i = 0, length = keys.length; i < length; i++) {
        if (iterator.call(context, obj[keys[i]], keys[i], obj) === breaker) return;
      }
    }
  };

  // Return the results of applying the iterator to each element.
  // Delegates to **ECMAScript 5**'s native `map` if available.
  _.map = _.collect = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeMap && obj.map === nativeMap) return obj.map(iterator, context);
    each(obj, function(value, index, list) {
      results.push(iterator.call(context, value, index, list));
    });
    return results;
  };

  var reduceError = 'Reduce of empty array with no initial value';

  // **Reduce** builds up a single result from a list of values, aka `inject`,
  // or `foldl`. Delegates to **ECMAScript 5**'s native `reduce` if available.
  _.reduce = _.foldl = _.inject = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduce && obj.reduce === nativeReduce) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduce(iterator, memo) : obj.reduce(iterator);
    }
    each(obj, function(value, index, list) {
      if (!initial) {
        memo = value;
        initial = true;
      } else {
        memo = iterator.call(context, memo, value, index, list);
      }
    });
    if (!initial) throw new TypeError(reduceError);
    return memo;
  };

  // The right-associative version of reduce, also known as `foldr`.
  // Delegates to **ECMAScript 5**'s native `reduceRight` if available.
  _.reduceRight = _.foldr = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduceRight && obj.reduceRight === nativeReduceRight) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduceRight(iterator, memo) : obj.reduceRight(iterator);
    }
    var length = obj.length;
    if (length !== +length) {
      var keys = _.keys(obj);
      length = keys.length;
    }
    each(obj, function(value, index, list) {
      index = keys ? keys[--length] : --length;
      if (!initial) {
        memo = obj[index];
        initial = true;
      } else {
        memo = iterator.call(context, memo, obj[index], index, list);
      }
    });
    if (!initial) throw new TypeError(reduceError);
    return memo;
  };

  // Return the first value which passes a truth test. Aliased as `detect`.
  _.find = _.detect = function(obj, iterator, context) {
    var result;
    any(obj, function(value, index, list) {
      if (iterator.call(context, value, index, list)) {
        result = value;
        return true;
      }
    });
    return result;
  };

  // Return all the elements that pass a truth test.
  // Delegates to **ECMAScript 5**'s native `filter` if available.
  // Aliased as `select`.
  _.filter = _.select = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeFilter && obj.filter === nativeFilter) return obj.filter(iterator, context);
    each(obj, function(value, index, list) {
      if (iterator.call(context, value, index, list)) results.push(value);
    });
    return results;
  };

  // Return all the elements for which a truth test fails.
  _.reject = function(obj, iterator, context) {
    return _.filter(obj, function(value, index, list) {
      return !iterator.call(context, value, index, list);
    }, context);
  };

  // Determine whether all of the elements match a truth test.
  // Delegates to **ECMAScript 5**'s native `every` if available.
  // Aliased as `all`.
  _.every = _.all = function(obj, iterator, context) {
    iterator || (iterator = _.identity);
    var result = true;
    if (obj == null) return result;
    if (nativeEvery && obj.every === nativeEvery) return obj.every(iterator, context);
    each(obj, function(value, index, list) {
      if (!(result = result && iterator.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if at least one element in the object matches a truth test.
  // Delegates to **ECMAScript 5**'s native `some` if available.
  // Aliased as `any`.
  var any = _.some = _.any = function(obj, iterator, context) {
    iterator || (iterator = _.identity);
    var result = false;
    if (obj == null) return result;
    if (nativeSome && obj.some === nativeSome) return obj.some(iterator, context);
    each(obj, function(value, index, list) {
      if (result || (result = iterator.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if the array or object contains a given value (using `===`).
  // Aliased as `include`.
  _.contains = _.include = function(obj, target) {
    if (obj == null) return false;
    if (nativeIndexOf && obj.indexOf === nativeIndexOf) return obj.indexOf(target) != -1;
    return any(obj, function(value) {
      return value === target;
    });
  };

  // Invoke a method (with arguments) on every item in a collection.
  _.invoke = function(obj, method) {
    var args = slice.call(arguments, 2);
    var isFunc = _.isFunction(method);
    return _.map(obj, function(value) {
      return (isFunc ? method : value[method]).apply(value, args);
    });
  };

  // Convenience version of a common use case of `map`: fetching a property.
  _.pluck = function(obj, key) {
    return _.map(obj, function(value){ return value[key]; });
  };

  // Convenience version of a common use case of `filter`: selecting only objects
  // containing specific `key:value` pairs.
  _.where = function(obj, attrs, first) {
    if (_.isEmpty(attrs)) return first ? void 0 : [];
    return _[first ? 'find' : 'filter'](obj, function(value) {
      for (var key in attrs) {
        if (attrs[key] !== value[key]) return false;
      }
      return true;
    });
  };

  // Convenience version of a common use case of `find`: getting the first object
  // containing specific `key:value` pairs.
  _.findWhere = function(obj, attrs) {
    return _.where(obj, attrs, true);
  };

  // Return the maximum element or (element-based computation).
  // Can't optimize arrays of integers longer than 65,535 elements.
  // See [WebKit Bug 80797](https://bugs.webkit.org/show_bug.cgi?id=80797)
  _.max = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.max.apply(Math, obj);
    }
    if (!iterator && _.isEmpty(obj)) return -Infinity;
    var result = {computed : -Infinity, value: -Infinity};
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      computed > result.computed && (result = {value : value, computed : computed});
    });
    return result.value;
  };

  // Return the minimum element (or element-based computation).
  _.min = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.min.apply(Math, obj);
    }
    if (!iterator && _.isEmpty(obj)) return Infinity;
    var result = {computed : Infinity, value: Infinity};
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      computed < result.computed && (result = {value : value, computed : computed});
    });
    return result.value;
  };

  // Shuffle an array, using the modern version of the 
  // [Fisher-Yates shuffle](http://en.wikipedia.org/wiki/Fisher–Yates_shuffle).
  _.shuffle = function(obj) {
    var rand;
    var index = 0;
    var shuffled = [];
    each(obj, function(value) {
      rand = _.random(index++);
      shuffled[index - 1] = shuffled[rand];
      shuffled[rand] = value;
    });
    return shuffled;
  };

  // Sample **n** random values from an array.
  // If **n** is not specified, returns a single random element from the array.
  // The internal `guard` argument allows it to work with `map`.
  _.sample = function(obj, n, guard) {
    if (arguments.length < 2 || guard) {
      return obj[_.random(obj.length - 1)];
    }
    return _.shuffle(obj).slice(0, Math.max(0, n));
  };

  // An internal function to generate lookup iterators.
  var lookupIterator = function(value) {
    return _.isFunction(value) ? value : function(obj){ return obj[value]; };
  };

  // Sort the object's values by a criterion produced by an iterator.
  _.sortBy = function(obj, value, context) {
    var iterator = lookupIterator(value);
    return _.pluck(_.map(obj, function(value, index, list) {
      return {
        value: value,
        index: index,
        criteria: iterator.call(context, value, index, list)
      };
    }).sort(function(left, right) {
      var a = left.criteria;
      var b = right.criteria;
      if (a !== b) {
        if (a > b || a === void 0) return 1;
        if (a < b || b === void 0) return -1;
      }
      return left.index - right.index;
    }), 'value');
  };

  // An internal function used for aggregate "group by" operations.
  var group = function(behavior) {
    return function(obj, value, context) {
      var result = {};
      var iterator = value == null ? _.identity : lookupIterator(value);
      each(obj, function(value, index) {
        var key = iterator.call(context, value, index, obj);
        behavior(result, key, value);
      });
      return result;
    };
  };

  // Groups the object's values by a criterion. Pass either a string attribute
  // to group by, or a function that returns the criterion.
  _.groupBy = group(function(result, key, value) {
    (_.has(result, key) ? result[key] : (result[key] = [])).push(value);
  });

  // Indexes the object's values by a criterion, similar to `groupBy`, but for
  // when you know that your index values will be unique.
  _.indexBy = group(function(result, key, value) {
    result[key] = value;
  });

  // Counts instances of an object that group by a certain criterion. Pass
  // either a string attribute to count by, or a function that returns the
  // criterion.
  _.countBy = group(function(result, key) {
    _.has(result, key) ? result[key]++ : result[key] = 1;
  });

  // Use a comparator function to figure out the smallest index at which
  // an object should be inserted so as to maintain order. Uses binary search.
  _.sortedIndex = function(array, obj, iterator, context) {
    iterator = iterator == null ? _.identity : lookupIterator(iterator);
    var value = iterator.call(context, obj);
    var low = 0, high = array.length;
    while (low < high) {
      var mid = (low + high) >>> 1;
      iterator.call(context, array[mid]) < value ? low = mid + 1 : high = mid;
    }
    return low;
  };

  // Safely create a real, live array from anything iterable.
  _.toArray = function(obj) {
    if (!obj) return [];
    if (_.isArray(obj)) return slice.call(obj);
    if (obj.length === +obj.length) return _.map(obj, _.identity);
    return _.values(obj);
  };

  // Return the number of elements in an object.
  _.size = function(obj) {
    if (obj == null) return 0;
    return (obj.length === +obj.length) ? obj.length : _.keys(obj).length;
  };

  // Array Functions
  // ---------------

  // Get the first element of an array. Passing **n** will return the first N
  // values in the array. Aliased as `head` and `take`. The **guard** check
  // allows it to work with `_.map`.
  _.first = _.head = _.take = function(array, n, guard) {
    if (array == null) return void 0;
    return (n == null) || guard ? array[0] : slice.call(array, 0, n);
  };

  // Returns everything but the last entry of the array. Especially useful on
  // the arguments object. Passing **n** will return all the values in
  // the array, excluding the last N. The **guard** check allows it to work with
  // `_.map`.
  _.initial = function(array, n, guard) {
    return slice.call(array, 0, array.length - ((n == null) || guard ? 1 : n));
  };

  // Get the last element of an array. Passing **n** will return the last N
  // values in the array. The **guard** check allows it to work with `_.map`.
  _.last = function(array, n, guard) {
    if (array == null) return void 0;
    if ((n == null) || guard) {
      return array[array.length - 1];
    } else {
      return slice.call(array, Math.max(array.length - n, 0));
    }
  };

  // Returns everything but the first entry of the array. Aliased as `tail` and `drop`.
  // Especially useful on the arguments object. Passing an **n** will return
  // the rest N values in the array. The **guard**
  // check allows it to work with `_.map`.
  _.rest = _.tail = _.drop = function(array, n, guard) {
    return slice.call(array, (n == null) || guard ? 1 : n);
  };

  // Trim out all falsy values from an array.
  _.compact = function(array) {
    return _.filter(array, _.identity);
  };

  // Internal implementation of a recursive `flatten` function.
  var flatten = function(input, shallow, output) {
    if (shallow && _.every(input, _.isArray)) {
      return concat.apply(output, input);
    }
    each(input, function(value) {
      if (_.isArray(value) || _.isArguments(value)) {
        shallow ? push.apply(output, value) : flatten(value, shallow, output);
      } else {
        output.push(value);
      }
    });
    return output;
  };

  // Flatten out an array, either recursively (by default), or just one level.
  _.flatten = function(array, shallow) {
    return flatten(array, shallow, []);
  };

  // Return a version of the array that does not contain the specified value(s).
  _.without = function(array) {
    return _.difference(array, slice.call(arguments, 1));
  };

  // Produce a duplicate-free version of the array. If the array has already
  // been sorted, you have the option of using a faster algorithm.
  // Aliased as `unique`.
  _.uniq = _.unique = function(array, isSorted, iterator, context) {
    if (_.isFunction(isSorted)) {
      context = iterator;
      iterator = isSorted;
      isSorted = false;
    }
    var initial = iterator ? _.map(array, iterator, context) : array;
    var results = [];
    var seen = [];
    each(initial, function(value, index) {
      if (isSorted ? (!index || seen[seen.length - 1] !== value) : !_.contains(seen, value)) {
        seen.push(value);
        results.push(array[index]);
      }
    });
    return results;
  };

  // Produce an array that contains the union: each distinct element from all of
  // the passed-in arrays.
  _.union = function() {
    return _.uniq(_.flatten(arguments, true));
  };

  // Produce an array that contains every item shared between all the
  // passed-in arrays.
  _.intersection = function(array) {
    var rest = slice.call(arguments, 1);
    return _.filter(_.uniq(array), function(item) {
      return _.every(rest, function(other) {
        return _.indexOf(other, item) >= 0;
      });
    });
  };

  // Take the difference between one array and a number of other arrays.
  // Only the elements present in just the first array will remain.
  _.difference = function(array) {
    var rest = concat.apply(ArrayProto, slice.call(arguments, 1));
    return _.filter(array, function(value){ return !_.contains(rest, value); });
  };

  // Zip together multiple lists into a single array -- elements that share
  // an index go together.
  _.zip = function() {
    var length = _.max(_.pluck(arguments, "length").concat(0));
    var results = new Array(length);
    for (var i = 0; i < length; i++) {
      results[i] = _.pluck(arguments, '' + i);
    }
    return results;
  };

  // Converts lists into objects. Pass either a single array of `[key, value]`
  // pairs, or two parallel arrays of the same length -- one of keys, and one of
  // the corresponding values.
  _.object = function(list, values) {
    if (list == null) return {};
    var result = {};
    for (var i = 0, length = list.length; i < length; i++) {
      if (values) {
        result[list[i]] = values[i];
      } else {
        result[list[i][0]] = list[i][1];
      }
    }
    return result;
  };

  // If the browser doesn't supply us with indexOf (I'm looking at you, **MSIE**),
  // we need this function. Return the position of the first occurrence of an
  // item in an array, or -1 if the item is not included in the array.
  // Delegates to **ECMAScript 5**'s native `indexOf` if available.
  // If the array is large and already in sort order, pass `true`
  // for **isSorted** to use binary search.
  _.indexOf = function(array, item, isSorted) {
    if (array == null) return -1;
    var i = 0, length = array.length;
    if (isSorted) {
      if (typeof isSorted == 'number') {
        i = (isSorted < 0 ? Math.max(0, length + isSorted) : isSorted);
      } else {
        i = _.sortedIndex(array, item);
        return array[i] === item ? i : -1;
      }
    }
    if (nativeIndexOf && array.indexOf === nativeIndexOf) return array.indexOf(item, isSorted);
    for (; i < length; i++) if (array[i] === item) return i;
    return -1;
  };

  // Delegates to **ECMAScript 5**'s native `lastIndexOf` if available.
  _.lastIndexOf = function(array, item, from) {
    if (array == null) return -1;
    var hasIndex = from != null;
    if (nativeLastIndexOf && array.lastIndexOf === nativeLastIndexOf) {
      return hasIndex ? array.lastIndexOf(item, from) : array.lastIndexOf(item);
    }
    var i = (hasIndex ? from : array.length);
    while (i--) if (array[i] === item) return i;
    return -1;
  };

  // Generate an integer Array containing an arithmetic progression. A port of
  // the native Python `range()` function. See
  // [the Python documentation](http://docs.python.org/library/functions.html#range).
  _.range = function(start, stop, step) {
    if (arguments.length <= 1) {
      stop = start || 0;
      start = 0;
    }
    step = arguments[2] || 1;

    var length = Math.max(Math.ceil((stop - start) / step), 0);
    var idx = 0;
    var range = new Array(length);

    while(idx < length) {
      range[idx++] = start;
      start += step;
    }

    return range;
  };

  // Function (ahem) Functions
  // ------------------

  // Reusable constructor function for prototype setting.
  var ctor = function(){};

  // Create a function bound to a given object (assigning `this`, and arguments,
  // optionally). Delegates to **ECMAScript 5**'s native `Function.bind` if
  // available.
  _.bind = function(func, context) {
    var args, bound;
    if (nativeBind && func.bind === nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
    if (!_.isFunction(func)) throw new TypeError;
    args = slice.call(arguments, 2);
    return bound = function() {
      if (!(this instanceof bound)) return func.apply(context, args.concat(slice.call(arguments)));
      ctor.prototype = func.prototype;
      var self = new ctor;
      ctor.prototype = null;
      var result = func.apply(self, args.concat(slice.call(arguments)));
      if (Object(result) === result) return result;
      return self;
    };
  };

  // Partially apply a function by creating a version that has had some of its
  // arguments pre-filled, without changing its dynamic `this` context.
  _.partial = function(func) {
    var args = slice.call(arguments, 1);
    return function() {
      return func.apply(this, args.concat(slice.call(arguments)));
    };
  };

  // Bind all of an object's methods to that object. Useful for ensuring that
  // all callbacks defined on an object belong to it.
  _.bindAll = function(obj) {
    var funcs = slice.call(arguments, 1);
    if (funcs.length === 0) throw new Error("bindAll must be passed function names");
    each(funcs, function(f) { obj[f] = _.bind(obj[f], obj); });
    return obj;
  };

  // Memoize an expensive function by storing its results.
  _.memoize = function(func, hasher) {
    var memo = {};
    hasher || (hasher = _.identity);
    return function() {
      var key = hasher.apply(this, arguments);
      return _.has(memo, key) ? memo[key] : (memo[key] = func.apply(this, arguments));
    };
  };

  // Delays a function for the given number of milliseconds, and then calls
  // it with the arguments supplied.
  _.delay = function(func, wait) {
    var args = slice.call(arguments, 2);
    return setTimeout(function(){ return func.apply(null, args); }, wait);
  };

  // Defers a function, scheduling it to run after the current call stack has
  // cleared.
  _.defer = function(func) {
    return _.delay.apply(_, [func, 1].concat(slice.call(arguments, 1)));
  };

  // Returns a function, that, when invoked, will only be triggered at most once
  // during a given window of time. Normally, the throttled function will run
  // as much as it can, without ever going more than once per `wait` duration;
  // but if you'd like to disable the execution on the leading edge, pass
  // `{leading: false}`. To disable execution on the trailing edge, ditto.
  _.throttle = function(func, wait, options) {
    var context, args, result;
    var timeout = null;
    var previous = 0;
    options || (options = {});
    var later = function() {
      previous = options.leading === false ? 0 : new Date;
      timeout = null;
      result = func.apply(context, args);
    };
    return function() {
      var now = new Date;
      if (!previous && options.leading === false) previous = now;
      var remaining = wait - (now - previous);
      context = this;
      args = arguments;
      if (remaining <= 0) {
        clearTimeout(timeout);
        timeout = null;
        previous = now;
        result = func.apply(context, args);
      } else if (!timeout && options.trailing !== false) {
        timeout = setTimeout(later, remaining);
      }
      return result;
    };
  };

  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.
  _.debounce = function(func, wait, immediate) {
    var timeout, args, context, timestamp, result;
    return function() {
      context = this;
      args = arguments;
      timestamp = new Date();
      var later = function() {
        var last = (new Date()) - timestamp;
        if (last < wait) {
          timeout = setTimeout(later, wait - last);
        } else {
          timeout = null;
          if (!immediate) result = func.apply(context, args);
        }
      };
      var callNow = immediate && !timeout;
      if (!timeout) {
        timeout = setTimeout(later, wait);
      }
      if (callNow) result = func.apply(context, args);
      return result;
    };
  };

  // Returns a function that will be executed at most one time, no matter how
  // often you call it. Useful for lazy initialization.
  _.once = function(func) {
    var ran = false, memo;
    return function() {
      if (ran) return memo;
      ran = true;
      memo = func.apply(this, arguments);
      func = null;
      return memo;
    };
  };

  // Returns the first function passed as an argument to the second,
  // allowing you to adjust arguments, run code before and after, and
  // conditionally execute the original function.
  _.wrap = function(func, wrapper) {
    return function() {
      var args = [func];
      push.apply(args, arguments);
      return wrapper.apply(this, args);
    };
  };

  // Returns a function that is the composition of a list of functions, each
  // consuming the return value of the function that follows.
  _.compose = function() {
    var funcs = arguments;
    return function() {
      var args = arguments;
      for (var i = funcs.length - 1; i >= 0; i--) {
        args = [funcs[i].apply(this, args)];
      }
      return args[0];
    };
  };

  // Returns a function that will only be executed after being called N times.
  _.after = function(times, func) {
    return function() {
      if (--times < 1) {
        return func.apply(this, arguments);
      }
    };
  };

  // Object Functions
  // ----------------

  // Retrieve the names of an object's properties.
  // Delegates to **ECMAScript 5**'s native `Object.keys`
  _.keys = nativeKeys || function(obj) {
    if (obj !== Object(obj)) throw new TypeError('Invalid object');
    var keys = [];
    for (var key in obj) if (_.has(obj, key)) keys.push(key);
    return keys;
  };

  // Retrieve the values of an object's properties.
  _.values = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var values = new Array(length);
    for (var i = 0; i < length; i++) {
      values[i] = obj[keys[i]];
    }
    return values;
  };

  // Convert an object into a list of `[key, value]` pairs.
  _.pairs = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var pairs = new Array(length);
    for (var i = 0; i < length; i++) {
      pairs[i] = [keys[i], obj[keys[i]]];
    }
    return pairs;
  };

  // Invert the keys and values of an object. The values must be serializable.
  _.invert = function(obj) {
    var result = {};
    var keys = _.keys(obj);
    for (var i = 0, length = keys.length; i < length; i++) {
      result[obj[keys[i]]] = keys[i];
    }
    return result;
  };

  // Return a sorted list of the function names available on the object.
  // Aliased as `methods`
  _.functions = _.methods = function(obj) {
    var names = [];
    for (var key in obj) {
      if (_.isFunction(obj[key])) names.push(key);
    }
    return names.sort();
  };

  // Extend a given object with all the properties in passed-in object(s).
  _.extend = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      if (source) {
        for (var prop in source) {
          obj[prop] = source[prop];
        }
      }
    });
    return obj;
  };

  // Return a copy of the object only containing the whitelisted properties.
  _.pick = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    each(keys, function(key) {
      if (key in obj) copy[key] = obj[key];
    });
    return copy;
  };

   // Return a copy of the object without the blacklisted properties.
  _.omit = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    for (var key in obj) {
      if (!_.contains(keys, key)) copy[key] = obj[key];
    }
    return copy;
  };

  // Fill in a given object with default properties.
  _.defaults = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      if (source) {
        for (var prop in source) {
          if (obj[prop] === void 0) obj[prop] = source[prop];
        }
      }
    });
    return obj;
  };

  // Create a (shallow-cloned) duplicate of an object.
  _.clone = function(obj) {
    if (!_.isObject(obj)) return obj;
    return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
  };

  // Invokes interceptor with the obj, and then returns obj.
  // The primary purpose of this method is to "tap into" a method chain, in
  // order to perform operations on intermediate results within the chain.
  _.tap = function(obj, interceptor) {
    interceptor(obj);
    return obj;
  };

  // Internal recursive comparison function for `isEqual`.
  var eq = function(a, b, aStack, bStack) {
    // Identical objects are equal. `0 === -0`, but they aren't identical.
    // See the [Harmony `egal` proposal](http://wiki.ecmascript.org/doku.php?id=harmony:egal).
    if (a === b) return a !== 0 || 1 / a == 1 / b;
    // A strict comparison is necessary because `null == undefined`.
    if (a == null || b == null) return a === b;
    // Unwrap any wrapped objects.
    if (a instanceof _) a = a._wrapped;
    if (b instanceof _) b = b._wrapped;
    // Compare `[[Class]]` names.
    var className = toString.call(a);
    if (className != toString.call(b)) return false;
    switch (className) {
      // Strings, numbers, dates, and booleans are compared by value.
      case '[object String]':
        // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
        // equivalent to `new String("5")`.
        return a == String(b);
      case '[object Number]':
        // `NaN`s are equivalent, but non-reflexive. An `egal` comparison is performed for
        // other numeric values.
        return a != +a ? b != +b : (a == 0 ? 1 / a == 1 / b : a == +b);
      case '[object Date]':
      case '[object Boolean]':
        // Coerce dates and booleans to numeric primitive values. Dates are compared by their
        // millisecond representations. Note that invalid dates with millisecond representations
        // of `NaN` are not equivalent.
        return +a == +b;
      // RegExps are compared by their source patterns and flags.
      case '[object RegExp]':
        return a.source == b.source &&
               a.global == b.global &&
               a.multiline == b.multiline &&
               a.ignoreCase == b.ignoreCase;
    }
    if (typeof a != 'object' || typeof b != 'object') return false;
    // Assume equality for cyclic structures. The algorithm for detecting cyclic
    // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.
    var length = aStack.length;
    while (length--) {
      // Linear search. Performance is inversely proportional to the number of
      // unique nested structures.
      if (aStack[length] == a) return bStack[length] == b;
    }
    // Objects with different constructors are not equivalent, but `Object`s
    // from different frames are.
    var aCtor = a.constructor, bCtor = b.constructor;
    if (aCtor !== bCtor && !(_.isFunction(aCtor) && (aCtor instanceof aCtor) &&
                             _.isFunction(bCtor) && (bCtor instanceof bCtor))) {
      return false;
    }
    // Add the first object to the stack of traversed objects.
    aStack.push(a);
    bStack.push(b);
    var size = 0, result = true;
    // Recursively compare objects and arrays.
    if (className == '[object Array]') {
      // Compare array lengths to determine if a deep comparison is necessary.
      size = a.length;
      result = size == b.length;
      if (result) {
        // Deep compare the contents, ignoring non-numeric properties.
        while (size--) {
          if (!(result = eq(a[size], b[size], aStack, bStack))) break;
        }
      }
    } else {
      // Deep compare objects.
      for (var key in a) {
        if (_.has(a, key)) {
          // Count the expected number of properties.
          size++;
          // Deep compare each member.
          if (!(result = _.has(b, key) && eq(a[key], b[key], aStack, bStack))) break;
        }
      }
      // Ensure that both objects contain the same number of properties.
      if (result) {
        for (key in b) {
          if (_.has(b, key) && !(size--)) break;
        }
        result = !size;
      }
    }
    // Remove the first object from the stack of traversed objects.
    aStack.pop();
    bStack.pop();
    return result;
  };

  // Perform a deep comparison to check if two objects are equal.
  _.isEqual = function(a, b) {
    return eq(a, b, [], []);
  };

  // Is a given array, string, or object empty?
  // An "empty" object has no enumerable own-properties.
  _.isEmpty = function(obj) {
    if (obj == null) return true;
    if (_.isArray(obj) || _.isString(obj)) return obj.length === 0;
    for (var key in obj) if (_.has(obj, key)) return false;
    return true;
  };

  // Is a given value a DOM element?
  _.isElement = function(obj) {
    return !!(obj && obj.nodeType === 1);
  };

  // Is a given value an array?
  // Delegates to ECMA5's native Array.isArray
  _.isArray = nativeIsArray || function(obj) {
    return toString.call(obj) == '[object Array]';
  };

  // Is a given variable an object?
  _.isObject = function(obj) {
    return obj === Object(obj);
  };

  // Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp.
  each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp'], function(name) {
    _['is' + name] = function(obj) {
      return toString.call(obj) == '[object ' + name + ']';
    };
  });

  // Define a fallback version of the method in browsers (ahem, IE), where
  // there isn't any inspectable "Arguments" type.
  if (!_.isArguments(arguments)) {
    _.isArguments = function(obj) {
      return !!(obj && _.has(obj, 'callee'));
    };
  }

  // Optimize `isFunction` if appropriate.
  if (typeof (/./) !== 'function') {
    _.isFunction = function(obj) {
      return typeof obj === 'function';
    };
  }

  // Is a given object a finite number?
  _.isFinite = function(obj) {
    return isFinite(obj) && !isNaN(parseFloat(obj));
  };

  // Is the given value `NaN`? (NaN is the only number which does not equal itself).
  _.isNaN = function(obj) {
    return _.isNumber(obj) && obj != +obj;
  };

  // Is a given value a boolean?
  _.isBoolean = function(obj) {
    return obj === true || obj === false || toString.call(obj) == '[object Boolean]';
  };

  // Is a given value equal to null?
  _.isNull = function(obj) {
    return obj === null;
  };

  // Is a given variable undefined?
  _.isUndefined = function(obj) {
    return obj === void 0;
  };

  // Shortcut function for checking if an object has a given property directly
  // on itself (in other words, not on a prototype).
  _.has = function(obj, key) {
    return hasOwnProperty.call(obj, key);
  };

  // Utility Functions
  // -----------------

  // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
  // previous owner. Returns a reference to the Underscore object.
  _.noConflict = function() {
    root._ = previousUnderscore;
    return this;
  };

  // Keep the identity function around for default iterators.
  _.identity = function(value) {
    return value;
  };

  // Run a function **n** times.
  _.times = function(n, iterator, context) {
    var accum = Array(Math.max(0, n));
    for (var i = 0; i < n; i++) accum[i] = iterator.call(context, i);
    return accum;
  };

  // Return a random integer between min and max (inclusive).
  _.random = function(min, max) {
    if (max == null) {
      max = min;
      min = 0;
    }
    return min + Math.floor(Math.random() * (max - min + 1));
  };

  // List of HTML entities for escaping.
  var entityMap = {
    escape: {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;'
    }
  };
  entityMap.unescape = _.invert(entityMap.escape);

  // Regexes containing the keys and values listed immediately above.
  var entityRegexes = {
    escape:   new RegExp('[' + _.keys(entityMap.escape).join('') + ']', 'g'),
    unescape: new RegExp('(' + _.keys(entityMap.unescape).join('|') + ')', 'g')
  };

  // Functions for escaping and unescaping strings to/from HTML interpolation.
  _.each(['escape', 'unescape'], function(method) {
    _[method] = function(string) {
      if (string == null) return '';
      return ('' + string).replace(entityRegexes[method], function(match) {
        return entityMap[method][match];
      });
    };
  });

  // If the value of the named `property` is a function then invoke it with the
  // `object` as context; otherwise, return it.
  _.result = function(object, property) {
    if (object == null) return void 0;
    var value = object[property];
    return _.isFunction(value) ? value.call(object) : value;
  };

  // Add your own custom functions to the Underscore object.
  _.mixin = function(obj) {
    each(_.functions(obj), function(name) {
      var func = _[name] = obj[name];
      _.prototype[name] = function() {
        var args = [this._wrapped];
        push.apply(args, arguments);
        return result.call(this, func.apply(_, args));
      };
    });
  };

  // Generate a unique integer id (unique within the entire client session).
  // Useful for temporary DOM ids.
  var idCounter = 0;
  _.uniqueId = function(prefix) {
    var id = ++idCounter + '';
    return prefix ? prefix + id : id;
  };

  // By default, Underscore uses ERB-style template delimiters, change the
  // following template settings to use alternative delimiters.
  _.templateSettings = {
    evaluate    : /<%([\s\S]+?)%>/g,
    interpolate : /<%=([\s\S]+?)%>/g,
    escape      : /<%-([\s\S]+?)%>/g
  };

  // When customizing `templateSettings`, if you don't want to define an
  // interpolation, evaluation or escaping regex, we need one that is
  // guaranteed not to match.
  var noMatch = /(.)^/;

  // Certain characters need to be escaped so that they can be put into a
  // string literal.
  var escapes = {
    "'":      "'",
    '\\':     '\\',
    '\r':     'r',
    '\n':     'n',
    '\t':     't',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  var escaper = /\\|'|\r|\n|\t|\u2028|\u2029/g;

  // JavaScript micro-templating, similar to John Resig's implementation.
  // Underscore templating handles arbitrary delimiters, preserves whitespace,
  // and correctly escapes quotes within interpolated code.
  _.template = function(text, data, settings) {
    var render;
    settings = _.defaults({}, settings, _.templateSettings);

    // Combine delimiters into one regular expression via alternation.
    var matcher = new RegExp([
      (settings.escape || noMatch).source,
      (settings.interpolate || noMatch).source,
      (settings.evaluate || noMatch).source
    ].join('|') + '|$', 'g');

    // Compile the template source, escaping string literals appropriately.
    var index = 0;
    var source = "__p+='";
    text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
      source += text.slice(index, offset)
        .replace(escaper, function(match) { return '\\' + escapes[match]; });

      if (escape) {
        source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
      }
      if (interpolate) {
        source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
      }
      if (evaluate) {
        source += "';\n" + evaluate + "\n__p+='";
      }
      index = offset + match.length;
      return match;
    });
    source += "';\n";

    // If a variable is not specified, place data values in local scope.
    if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

    source = "var __t,__p='',__j=Array.prototype.join," +
      "print=function(){__p+=__j.call(arguments,'');};\n" +
      source + "return __p;\n";

    try {
      render = new Function(settings.variable || 'obj', '_', source);
    } catch (e) {
      e.source = source;
      throw e;
    }

    if (data) return render(data, _);
    var template = function(data) {
      return render.call(this, data, _);
    };

    // Provide the compiled function source as a convenience for precompilation.
    template.source = 'function(' + (settings.variable || 'obj') + '){\n' + source + '}';

    return template;
  };

  // Add a "chain" function, which will delegate to the wrapper.
  _.chain = function(obj) {
    return _(obj).chain();
  };

  // OOP
  // ---------------
  // If Underscore is called as a function, it returns a wrapped object that
  // can be used OO-style. This wrapper holds altered versions of all the
  // underscore functions. Wrapped objects may be chained.

  // Helper function to continue chaining intermediate results.
  var result = function(obj) {
    return this._chain ? _(obj).chain() : obj;
  };

  // Add all of the Underscore functions to the wrapper object.
  _.mixin(_);

  // Add all mutator Array functions to the wrapper.
  each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      var obj = this._wrapped;
      method.apply(obj, arguments);
      if ((name == 'shift' || name == 'splice') && obj.length === 0) delete obj[0];
      return result.call(this, obj);
    };
  });

  // Add all accessor Array functions to the wrapper.
  each(['concat', 'join', 'slice'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      return result.call(this, method.apply(this._wrapped, arguments));
    };
  });

  _.extend(_.prototype, {

    // Start chaining a wrapped Underscore object.
    chain: function() {
      this._chain = true;
      return this;
    },

    // Extracts the result from a wrapped and chained object.
    value: function() {
      return this._wrapped;
    }

  });

  // AMD define happens at the end for compatibility with AMD loaders
  // that don't enforce next-turn semantics on modules.
  if (typeof define === 'function' && define.amd) {
    define('underscore', [],function() {
      return _;
    });
  }

}).call(this);

/*! jQuery v1.10.2 | (c) 2005, 2013 jQuery Foundation, Inc. | jquery.org/license
//@ sourceMappingURL=jquery.min.map
*/
(function(e,t){var n,r,i=typeof t,o=e.location,a=e.document,s=a.documentElement,l=e.jQuery,u=e.$,c={},p=[],f="1.10.2",d=p.concat,h=p.push,g=p.slice,m=p.indexOf,y=c.toString,v=c.hasOwnProperty,b=f.trim,x=function(e,t){return new x.fn.init(e,t,r)},w=/[+-]?(?:\d*\.|)\d+(?:[eE][+-]?\d+|)/.source,T=/\S+/g,C=/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g,N=/^(?:\s*(<[\w\W]+>)[^>]*|#([\w-]*))$/,k=/^<(\w+)\s*\/?>(?:<\/\1>|)$/,E=/^[\],:{}\s]*$/,S=/(?:^|:|,)(?:\s*\[)+/g,A=/\\(?:["\\\/bfnrt]|u[\da-fA-F]{4})/g,j=/"[^"\\\r\n]*"|true|false|null|-?(?:\d+\.|)\d+(?:[eE][+-]?\d+|)/g,D=/^-ms-/,L=/-([\da-z])/gi,H=function(e,t){return t.toUpperCase()},q=function(e){(a.addEventListener||"load"===e.type||"complete"===a.readyState)&&(_(),x.ready())},_=function(){a.addEventListener?(a.removeEventListener("DOMContentLoaded",q,!1),e.removeEventListener("load",q,!1)):(a.detachEvent("onreadystatechange",q),e.detachEvent("onload",q))};x.fn=x.prototype={jquery:f,constructor:x,init:function(e,n,r){var i,o;if(!e)return this;if("string"==typeof e){if(i="<"===e.charAt(0)&&">"===e.charAt(e.length-1)&&e.length>=3?[null,e,null]:N.exec(e),!i||!i[1]&&n)return!n||n.jquery?(n||r).find(e):this.constructor(n).find(e);if(i[1]){if(n=n instanceof x?n[0]:n,x.merge(this,x.parseHTML(i[1],n&&n.nodeType?n.ownerDocument||n:a,!0)),k.test(i[1])&&x.isPlainObject(n))for(i in n)x.isFunction(this[i])?this[i](n[i]):this.attr(i,n[i]);return this}if(o=a.getElementById(i[2]),o&&o.parentNode){if(o.id!==i[2])return r.find(e);this.length=1,this[0]=o}return this.context=a,this.selector=e,this}return e.nodeType?(this.context=this[0]=e,this.length=1,this):x.isFunction(e)?r.ready(e):(e.selector!==t&&(this.selector=e.selector,this.context=e.context),x.makeArray(e,this))},selector:"",length:0,toArray:function(){return g.call(this)},get:function(e){return null==e?this.toArray():0>e?this[this.length+e]:this[e]},pushStack:function(e){var t=x.merge(this.constructor(),e);return t.prevObject=this,t.context=this.context,t},each:function(e,t){return x.each(this,e,t)},ready:function(e){return x.ready.promise().done(e),this},slice:function(){return this.pushStack(g.apply(this,arguments))},first:function(){return this.eq(0)},last:function(){return this.eq(-1)},eq:function(e){var t=this.length,n=+e+(0>e?t:0);return this.pushStack(n>=0&&t>n?[this[n]]:[])},map:function(e){return this.pushStack(x.map(this,function(t,n){return e.call(t,n,t)}))},end:function(){return this.prevObject||this.constructor(null)},push:h,sort:[].sort,splice:[].splice},x.fn.init.prototype=x.fn,x.extend=x.fn.extend=function(){var e,n,r,i,o,a,s=arguments[0]||{},l=1,u=arguments.length,c=!1;for("boolean"==typeof s&&(c=s,s=arguments[1]||{},l=2),"object"==typeof s||x.isFunction(s)||(s={}),u===l&&(s=this,--l);u>l;l++)if(null!=(o=arguments[l]))for(i in o)e=s[i],r=o[i],s!==r&&(c&&r&&(x.isPlainObject(r)||(n=x.isArray(r)))?(n?(n=!1,a=e&&x.isArray(e)?e:[]):a=e&&x.isPlainObject(e)?e:{},s[i]=x.extend(c,a,r)):r!==t&&(s[i]=r));return s},x.extend({expando:"jQuery"+(f+Math.random()).replace(/\D/g,""),noConflict:function(t){return e.$===x&&(e.$=u),t&&e.jQuery===x&&(e.jQuery=l),x},isReady:!1,readyWait:1,holdReady:function(e){e?x.readyWait++:x.ready(!0)},ready:function(e){if(e===!0?!--x.readyWait:!x.isReady){if(!a.body)return setTimeout(x.ready);x.isReady=!0,e!==!0&&--x.readyWait>0||(n.resolveWith(a,[x]),x.fn.trigger&&x(a).trigger("ready").off("ready"))}},isFunction:function(e){return"function"===x.type(e)},isArray:Array.isArray||function(e){return"array"===x.type(e)},isWindow:function(e){return null!=e&&e==e.window},isNumeric:function(e){return!isNaN(parseFloat(e))&&isFinite(e)},type:function(e){return null==e?e+"":"object"==typeof e||"function"==typeof e?c[y.call(e)]||"object":typeof e},isPlainObject:function(e){var n;if(!e||"object"!==x.type(e)||e.nodeType||x.isWindow(e))return!1;try{if(e.constructor&&!v.call(e,"constructor")&&!v.call(e.constructor.prototype,"isPrototypeOf"))return!1}catch(r){return!1}if(x.support.ownLast)for(n in e)return v.call(e,n);for(n in e);return n===t||v.call(e,n)},isEmptyObject:function(e){var t;for(t in e)return!1;return!0},error:function(e){throw Error(e)},parseHTML:function(e,t,n){if(!e||"string"!=typeof e)return null;"boolean"==typeof t&&(n=t,t=!1),t=t||a;var r=k.exec(e),i=!n&&[];return r?[t.createElement(r[1])]:(r=x.buildFragment([e],t,i),i&&x(i).remove(),x.merge([],r.childNodes))},parseJSON:function(n){return e.JSON&&e.JSON.parse?e.JSON.parse(n):null===n?n:"string"==typeof n&&(n=x.trim(n),n&&E.test(n.replace(A,"@").replace(j,"]").replace(S,"")))?Function("return "+n)():(x.error("Invalid JSON: "+n),t)},parseXML:function(n){var r,i;if(!n||"string"!=typeof n)return null;try{e.DOMParser?(i=new DOMParser,r=i.parseFromString(n,"text/xml")):(r=new ActiveXObject("Microsoft.XMLDOM"),r.async="false",r.loadXML(n))}catch(o){r=t}return r&&r.documentElement&&!r.getElementsByTagName("parsererror").length||x.error("Invalid XML: "+n),r},noop:function(){},globalEval:function(t){t&&x.trim(t)&&(e.execScript||function(t){e.eval.call(e,t)})(t)},camelCase:function(e){return e.replace(D,"ms-").replace(L,H)},nodeName:function(e,t){return e.nodeName&&e.nodeName.toLowerCase()===t.toLowerCase()},each:function(e,t,n){var r,i=0,o=e.length,a=M(e);if(n){if(a){for(;o>i;i++)if(r=t.apply(e[i],n),r===!1)break}else for(i in e)if(r=t.apply(e[i],n),r===!1)break}else if(a){for(;o>i;i++)if(r=t.call(e[i],i,e[i]),r===!1)break}else for(i in e)if(r=t.call(e[i],i,e[i]),r===!1)break;return e},trim:b&&!b.call("\ufeff\u00a0")?function(e){return null==e?"":b.call(e)}:function(e){return null==e?"":(e+"").replace(C,"")},makeArray:function(e,t){var n=t||[];return null!=e&&(M(Object(e))?x.merge(n,"string"==typeof e?[e]:e):h.call(n,e)),n},inArray:function(e,t,n){var r;if(t){if(m)return m.call(t,e,n);for(r=t.length,n=n?0>n?Math.max(0,r+n):n:0;r>n;n++)if(n in t&&t[n]===e)return n}return-1},merge:function(e,n){var r=n.length,i=e.length,o=0;if("number"==typeof r)for(;r>o;o++)e[i++]=n[o];else while(n[o]!==t)e[i++]=n[o++];return e.length=i,e},grep:function(e,t,n){var r,i=[],o=0,a=e.length;for(n=!!n;a>o;o++)r=!!t(e[o],o),n!==r&&i.push(e[o]);return i},map:function(e,t,n){var r,i=0,o=e.length,a=M(e),s=[];if(a)for(;o>i;i++)r=t(e[i],i,n),null!=r&&(s[s.length]=r);else for(i in e)r=t(e[i],i,n),null!=r&&(s[s.length]=r);return d.apply([],s)},guid:1,proxy:function(e,n){var r,i,o;return"string"==typeof n&&(o=e[n],n=e,e=o),x.isFunction(e)?(r=g.call(arguments,2),i=function(){return e.apply(n||this,r.concat(g.call(arguments)))},i.guid=e.guid=e.guid||x.guid++,i):t},access:function(e,n,r,i,o,a,s){var l=0,u=e.length,c=null==r;if("object"===x.type(r)){o=!0;for(l in r)x.access(e,n,l,r[l],!0,a,s)}else if(i!==t&&(o=!0,x.isFunction(i)||(s=!0),c&&(s?(n.call(e,i),n=null):(c=n,n=function(e,t,n){return c.call(x(e),n)})),n))for(;u>l;l++)n(e[l],r,s?i:i.call(e[l],l,n(e[l],r)));return o?e:c?n.call(e):u?n(e[0],r):a},now:function(){return(new Date).getTime()},swap:function(e,t,n,r){var i,o,a={};for(o in t)a[o]=e.style[o],e.style[o]=t[o];i=n.apply(e,r||[]);for(o in t)e.style[o]=a[o];return i}}),x.ready.promise=function(t){if(!n)if(n=x.Deferred(),"complete"===a.readyState)setTimeout(x.ready);else if(a.addEventListener)a.addEventListener("DOMContentLoaded",q,!1),e.addEventListener("load",q,!1);else{a.attachEvent("onreadystatechange",q),e.attachEvent("onload",q);var r=!1;try{r=null==e.frameElement&&a.documentElement}catch(i){}r&&r.doScroll&&function o(){if(!x.isReady){try{r.doScroll("left")}catch(e){return setTimeout(o,50)}_(),x.ready()}}()}return n.promise(t)},x.each("Boolean Number String Function Array Date RegExp Object Error".split(" "),function(e,t){c["[object "+t+"]"]=t.toLowerCase()});function M(e){var t=e.length,n=x.type(e);return x.isWindow(e)?!1:1===e.nodeType&&t?!0:"array"===n||"function"!==n&&(0===t||"number"==typeof t&&t>0&&t-1 in e)}r=x(a),function(e,t){var n,r,i,o,a,s,l,u,c,p,f,d,h,g,m,y,v,b="sizzle"+-new Date,w=e.document,T=0,C=0,N=st(),k=st(),E=st(),S=!1,A=function(e,t){return e===t?(S=!0,0):0},j=typeof t,D=1<<31,L={}.hasOwnProperty,H=[],q=H.pop,_=H.push,M=H.push,O=H.slice,F=H.indexOf||function(e){var t=0,n=this.length;for(;n>t;t++)if(this[t]===e)return t;return-1},B="checked|selected|async|autofocus|autoplay|controls|defer|disabled|hidden|ismap|loop|multiple|open|readonly|required|scoped",P="[\\x20\\t\\r\\n\\f]",R="(?:\\\\.|[\\w-]|[^\\x00-\\xa0])+",W=R.replace("w","w#"),$="\\["+P+"*("+R+")"+P+"*(?:([*^$|!~]?=)"+P+"*(?:(['\"])((?:\\\\.|[^\\\\])*?)\\3|("+W+")|)|)"+P+"*\\]",I=":("+R+")(?:\\(((['\"])((?:\\\\.|[^\\\\])*?)\\3|((?:\\\\.|[^\\\\()[\\]]|"+$.replace(3,8)+")*)|.*)\\)|)",z=RegExp("^"+P+"+|((?:^|[^\\\\])(?:\\\\.)*)"+P+"+$","g"),X=RegExp("^"+P+"*,"+P+"*"),U=RegExp("^"+P+"*([>+~]|"+P+")"+P+"*"),V=RegExp(P+"*[+~]"),Y=RegExp("="+P+"*([^\\]'\"]*)"+P+"*\\]","g"),J=RegExp(I),G=RegExp("^"+W+"$"),Q={ID:RegExp("^#("+R+")"),CLASS:RegExp("^\\.("+R+")"),TAG:RegExp("^("+R.replace("w","w*")+")"),ATTR:RegExp("^"+$),PSEUDO:RegExp("^"+I),CHILD:RegExp("^:(only|first|last|nth|nth-last)-(child|of-type)(?:\\("+P+"*(even|odd|(([+-]|)(\\d*)n|)"+P+"*(?:([+-]|)"+P+"*(\\d+)|))"+P+"*\\)|)","i"),bool:RegExp("^(?:"+B+")$","i"),needsContext:RegExp("^"+P+"*[>+~]|:(even|odd|eq|gt|lt|nth|first|last)(?:\\("+P+"*((?:-\\d)?\\d*)"+P+"*\\)|)(?=[^-]|$)","i")},K=/^[^{]+\{\s*\[native \w/,Z=/^(?:#([\w-]+)|(\w+)|\.([\w-]+))$/,et=/^(?:input|select|textarea|button)$/i,tt=/^h\d$/i,nt=/'|\\/g,rt=RegExp("\\\\([\\da-f]{1,6}"+P+"?|("+P+")|.)","ig"),it=function(e,t,n){var r="0x"+t-65536;return r!==r||n?t:0>r?String.fromCharCode(r+65536):String.fromCharCode(55296|r>>10,56320|1023&r)};try{M.apply(H=O.call(w.childNodes),w.childNodes),H[w.childNodes.length].nodeType}catch(ot){M={apply:H.length?function(e,t){_.apply(e,O.call(t))}:function(e,t){var n=e.length,r=0;while(e[n++]=t[r++]);e.length=n-1}}}function at(e,t,n,i){var o,a,s,l,u,c,d,m,y,x;if((t?t.ownerDocument||t:w)!==f&&p(t),t=t||f,n=n||[],!e||"string"!=typeof e)return n;if(1!==(l=t.nodeType)&&9!==l)return[];if(h&&!i){if(o=Z.exec(e))if(s=o[1]){if(9===l){if(a=t.getElementById(s),!a||!a.parentNode)return n;if(a.id===s)return n.push(a),n}else if(t.ownerDocument&&(a=t.ownerDocument.getElementById(s))&&v(t,a)&&a.id===s)return n.push(a),n}else{if(o[2])return M.apply(n,t.getElementsByTagName(e)),n;if((s=o[3])&&r.getElementsByClassName&&t.getElementsByClassName)return M.apply(n,t.getElementsByClassName(s)),n}if(r.qsa&&(!g||!g.test(e))){if(m=d=b,y=t,x=9===l&&e,1===l&&"object"!==t.nodeName.toLowerCase()){c=mt(e),(d=t.getAttribute("id"))?m=d.replace(nt,"\\$&"):t.setAttribute("id",m),m="[id='"+m+"'] ",u=c.length;while(u--)c[u]=m+yt(c[u]);y=V.test(e)&&t.parentNode||t,x=c.join(",")}if(x)try{return M.apply(n,y.querySelectorAll(x)),n}catch(T){}finally{d||t.removeAttribute("id")}}}return kt(e.replace(z,"$1"),t,n,i)}function st(){var e=[];function t(n,r){return e.push(n+=" ")>o.cacheLength&&delete t[e.shift()],t[n]=r}return t}function lt(e){return e[b]=!0,e}function ut(e){var t=f.createElement("div");try{return!!e(t)}catch(n){return!1}finally{t.parentNode&&t.parentNode.removeChild(t),t=null}}function ct(e,t){var n=e.split("|"),r=e.length;while(r--)o.attrHandle[n[r]]=t}function pt(e,t){var n=t&&e,r=n&&1===e.nodeType&&1===t.nodeType&&(~t.sourceIndex||D)-(~e.sourceIndex||D);if(r)return r;if(n)while(n=n.nextSibling)if(n===t)return-1;return e?1:-1}function ft(e){return function(t){var n=t.nodeName.toLowerCase();return"input"===n&&t.type===e}}function dt(e){return function(t){var n=t.nodeName.toLowerCase();return("input"===n||"button"===n)&&t.type===e}}function ht(e){return lt(function(t){return t=+t,lt(function(n,r){var i,o=e([],n.length,t),a=o.length;while(a--)n[i=o[a]]&&(n[i]=!(r[i]=n[i]))})})}s=at.isXML=function(e){var t=e&&(e.ownerDocument||e).documentElement;return t?"HTML"!==t.nodeName:!1},r=at.support={},p=at.setDocument=function(e){var n=e?e.ownerDocument||e:w,i=n.defaultView;return n!==f&&9===n.nodeType&&n.documentElement?(f=n,d=n.documentElement,h=!s(n),i&&i.attachEvent&&i!==i.top&&i.attachEvent("onbeforeunload",function(){p()}),r.attributes=ut(function(e){return e.className="i",!e.getAttribute("className")}),r.getElementsByTagName=ut(function(e){return e.appendChild(n.createComment("")),!e.getElementsByTagName("*").length}),r.getElementsByClassName=ut(function(e){return e.innerHTML="<div class='a'></div><div class='a i'></div>",e.firstChild.className="i",2===e.getElementsByClassName("i").length}),r.getById=ut(function(e){return d.appendChild(e).id=b,!n.getElementsByName||!n.getElementsByName(b).length}),r.getById?(o.find.ID=function(e,t){if(typeof t.getElementById!==j&&h){var n=t.getElementById(e);return n&&n.parentNode?[n]:[]}},o.filter.ID=function(e){var t=e.replace(rt,it);return function(e){return e.getAttribute("id")===t}}):(delete o.find.ID,o.filter.ID=function(e){var t=e.replace(rt,it);return function(e){var n=typeof e.getAttributeNode!==j&&e.getAttributeNode("id");return n&&n.value===t}}),o.find.TAG=r.getElementsByTagName?function(e,n){return typeof n.getElementsByTagName!==j?n.getElementsByTagName(e):t}:function(e,t){var n,r=[],i=0,o=t.getElementsByTagName(e);if("*"===e){while(n=o[i++])1===n.nodeType&&r.push(n);return r}return o},o.find.CLASS=r.getElementsByClassName&&function(e,n){return typeof n.getElementsByClassName!==j&&h?n.getElementsByClassName(e):t},m=[],g=[],(r.qsa=K.test(n.querySelectorAll))&&(ut(function(e){e.innerHTML="<select><option selected=''></option></select>",e.querySelectorAll("[selected]").length||g.push("\\["+P+"*(?:value|"+B+")"),e.querySelectorAll(":checked").length||g.push(":checked")}),ut(function(e){var t=n.createElement("input");t.setAttribute("type","hidden"),e.appendChild(t).setAttribute("t",""),e.querySelectorAll("[t^='']").length&&g.push("[*^$]="+P+"*(?:''|\"\")"),e.querySelectorAll(":enabled").length||g.push(":enabled",":disabled"),e.querySelectorAll("*,:x"),g.push(",.*:")})),(r.matchesSelector=K.test(y=d.webkitMatchesSelector||d.mozMatchesSelector||d.oMatchesSelector||d.msMatchesSelector))&&ut(function(e){r.disconnectedMatch=y.call(e,"div"),y.call(e,"[s!='']:x"),m.push("!=",I)}),g=g.length&&RegExp(g.join("|")),m=m.length&&RegExp(m.join("|")),v=K.test(d.contains)||d.compareDocumentPosition?function(e,t){var n=9===e.nodeType?e.documentElement:e,r=t&&t.parentNode;return e===r||!(!r||1!==r.nodeType||!(n.contains?n.contains(r):e.compareDocumentPosition&&16&e.compareDocumentPosition(r)))}:function(e,t){if(t)while(t=t.parentNode)if(t===e)return!0;return!1},A=d.compareDocumentPosition?function(e,t){if(e===t)return S=!0,0;var i=t.compareDocumentPosition&&e.compareDocumentPosition&&e.compareDocumentPosition(t);return i?1&i||!r.sortDetached&&t.compareDocumentPosition(e)===i?e===n||v(w,e)?-1:t===n||v(w,t)?1:c?F.call(c,e)-F.call(c,t):0:4&i?-1:1:e.compareDocumentPosition?-1:1}:function(e,t){var r,i=0,o=e.parentNode,a=t.parentNode,s=[e],l=[t];if(e===t)return S=!0,0;if(!o||!a)return e===n?-1:t===n?1:o?-1:a?1:c?F.call(c,e)-F.call(c,t):0;if(o===a)return pt(e,t);r=e;while(r=r.parentNode)s.unshift(r);r=t;while(r=r.parentNode)l.unshift(r);while(s[i]===l[i])i++;return i?pt(s[i],l[i]):s[i]===w?-1:l[i]===w?1:0},n):f},at.matches=function(e,t){return at(e,null,null,t)},at.matchesSelector=function(e,t){if((e.ownerDocument||e)!==f&&p(e),t=t.replace(Y,"='$1']"),!(!r.matchesSelector||!h||m&&m.test(t)||g&&g.test(t)))try{var n=y.call(e,t);if(n||r.disconnectedMatch||e.document&&11!==e.document.nodeType)return n}catch(i){}return at(t,f,null,[e]).length>0},at.contains=function(e,t){return(e.ownerDocument||e)!==f&&p(e),v(e,t)},at.attr=function(e,n){(e.ownerDocument||e)!==f&&p(e);var i=o.attrHandle[n.toLowerCase()],a=i&&L.call(o.attrHandle,n.toLowerCase())?i(e,n,!h):t;return a===t?r.attributes||!h?e.getAttribute(n):(a=e.getAttributeNode(n))&&a.specified?a.value:null:a},at.error=function(e){throw Error("Syntax error, unrecognized expression: "+e)},at.uniqueSort=function(e){var t,n=[],i=0,o=0;if(S=!r.detectDuplicates,c=!r.sortStable&&e.slice(0),e.sort(A),S){while(t=e[o++])t===e[o]&&(i=n.push(o));while(i--)e.splice(n[i],1)}return e},a=at.getText=function(e){var t,n="",r=0,i=e.nodeType;if(i){if(1===i||9===i||11===i){if("string"==typeof e.textContent)return e.textContent;for(e=e.firstChild;e;e=e.nextSibling)n+=a(e)}else if(3===i||4===i)return e.nodeValue}else for(;t=e[r];r++)n+=a(t);return n},o=at.selectors={cacheLength:50,createPseudo:lt,match:Q,attrHandle:{},find:{},relative:{">":{dir:"parentNode",first:!0}," ":{dir:"parentNode"},"+":{dir:"previousSibling",first:!0},"~":{dir:"previousSibling"}},preFilter:{ATTR:function(e){return e[1]=e[1].replace(rt,it),e[3]=(e[4]||e[5]||"").replace(rt,it),"~="===e[2]&&(e[3]=" "+e[3]+" "),e.slice(0,4)},CHILD:function(e){return e[1]=e[1].toLowerCase(),"nth"===e[1].slice(0,3)?(e[3]||at.error(e[0]),e[4]=+(e[4]?e[5]+(e[6]||1):2*("even"===e[3]||"odd"===e[3])),e[5]=+(e[7]+e[8]||"odd"===e[3])):e[3]&&at.error(e[0]),e},PSEUDO:function(e){var n,r=!e[5]&&e[2];return Q.CHILD.test(e[0])?null:(e[3]&&e[4]!==t?e[2]=e[4]:r&&J.test(r)&&(n=mt(r,!0))&&(n=r.indexOf(")",r.length-n)-r.length)&&(e[0]=e[0].slice(0,n),e[2]=r.slice(0,n)),e.slice(0,3))}},filter:{TAG:function(e){var t=e.replace(rt,it).toLowerCase();return"*"===e?function(){return!0}:function(e){return e.nodeName&&e.nodeName.toLowerCase()===t}},CLASS:function(e){var t=N[e+" "];return t||(t=RegExp("(^|"+P+")"+e+"("+P+"|$)"))&&N(e,function(e){return t.test("string"==typeof e.className&&e.className||typeof e.getAttribute!==j&&e.getAttribute("class")||"")})},ATTR:function(e,t,n){return function(r){var i=at.attr(r,e);return null==i?"!="===t:t?(i+="","="===t?i===n:"!="===t?i!==n:"^="===t?n&&0===i.indexOf(n):"*="===t?n&&i.indexOf(n)>-1:"$="===t?n&&i.slice(-n.length)===n:"~="===t?(" "+i+" ").indexOf(n)>-1:"|="===t?i===n||i.slice(0,n.length+1)===n+"-":!1):!0}},CHILD:function(e,t,n,r,i){var o="nth"!==e.slice(0,3),a="last"!==e.slice(-4),s="of-type"===t;return 1===r&&0===i?function(e){return!!e.parentNode}:function(t,n,l){var u,c,p,f,d,h,g=o!==a?"nextSibling":"previousSibling",m=t.parentNode,y=s&&t.nodeName.toLowerCase(),v=!l&&!s;if(m){if(o){while(g){p=t;while(p=p[g])if(s?p.nodeName.toLowerCase()===y:1===p.nodeType)return!1;h=g="only"===e&&!h&&"nextSibling"}return!0}if(h=[a?m.firstChild:m.lastChild],a&&v){c=m[b]||(m[b]={}),u=c[e]||[],d=u[0]===T&&u[1],f=u[0]===T&&u[2],p=d&&m.childNodes[d];while(p=++d&&p&&p[g]||(f=d=0)||h.pop())if(1===p.nodeType&&++f&&p===t){c[e]=[T,d,f];break}}else if(v&&(u=(t[b]||(t[b]={}))[e])&&u[0]===T)f=u[1];else while(p=++d&&p&&p[g]||(f=d=0)||h.pop())if((s?p.nodeName.toLowerCase()===y:1===p.nodeType)&&++f&&(v&&((p[b]||(p[b]={}))[e]=[T,f]),p===t))break;return f-=i,f===r||0===f%r&&f/r>=0}}},PSEUDO:function(e,t){var n,r=o.pseudos[e]||o.setFilters[e.toLowerCase()]||at.error("unsupported pseudo: "+e);return r[b]?r(t):r.length>1?(n=[e,e,"",t],o.setFilters.hasOwnProperty(e.toLowerCase())?lt(function(e,n){var i,o=r(e,t),a=o.length;while(a--)i=F.call(e,o[a]),e[i]=!(n[i]=o[a])}):function(e){return r(e,0,n)}):r}},pseudos:{not:lt(function(e){var t=[],n=[],r=l(e.replace(z,"$1"));return r[b]?lt(function(e,t,n,i){var o,a=r(e,null,i,[]),s=e.length;while(s--)(o=a[s])&&(e[s]=!(t[s]=o))}):function(e,i,o){return t[0]=e,r(t,null,o,n),!n.pop()}}),has:lt(function(e){return function(t){return at(e,t).length>0}}),contains:lt(function(e){return function(t){return(t.textContent||t.innerText||a(t)).indexOf(e)>-1}}),lang:lt(function(e){return G.test(e||"")||at.error("unsupported lang: "+e),e=e.replace(rt,it).toLowerCase(),function(t){var n;do if(n=h?t.lang:t.getAttribute("xml:lang")||t.getAttribute("lang"))return n=n.toLowerCase(),n===e||0===n.indexOf(e+"-");while((t=t.parentNode)&&1===t.nodeType);return!1}}),target:function(t){var n=e.location&&e.location.hash;return n&&n.slice(1)===t.id},root:function(e){return e===d},focus:function(e){return e===f.activeElement&&(!f.hasFocus||f.hasFocus())&&!!(e.type||e.href||~e.tabIndex)},enabled:function(e){return e.disabled===!1},disabled:function(e){return e.disabled===!0},checked:function(e){var t=e.nodeName.toLowerCase();return"input"===t&&!!e.checked||"option"===t&&!!e.selected},selected:function(e){return e.parentNode&&e.parentNode.selectedIndex,e.selected===!0},empty:function(e){for(e=e.firstChild;e;e=e.nextSibling)if(e.nodeName>"@"||3===e.nodeType||4===e.nodeType)return!1;return!0},parent:function(e){return!o.pseudos.empty(e)},header:function(e){return tt.test(e.nodeName)},input:function(e){return et.test(e.nodeName)},button:function(e){var t=e.nodeName.toLowerCase();return"input"===t&&"button"===e.type||"button"===t},text:function(e){var t;return"input"===e.nodeName.toLowerCase()&&"text"===e.type&&(null==(t=e.getAttribute("type"))||t.toLowerCase()===e.type)},first:ht(function(){return[0]}),last:ht(function(e,t){return[t-1]}),eq:ht(function(e,t,n){return[0>n?n+t:n]}),even:ht(function(e,t){var n=0;for(;t>n;n+=2)e.push(n);return e}),odd:ht(function(e,t){var n=1;for(;t>n;n+=2)e.push(n);return e}),lt:ht(function(e,t,n){var r=0>n?n+t:n;for(;--r>=0;)e.push(r);return e}),gt:ht(function(e,t,n){var r=0>n?n+t:n;for(;t>++r;)e.push(r);return e})}},o.pseudos.nth=o.pseudos.eq;for(n in{radio:!0,checkbox:!0,file:!0,password:!0,image:!0})o.pseudos[n]=ft(n);for(n in{submit:!0,reset:!0})o.pseudos[n]=dt(n);function gt(){}gt.prototype=o.filters=o.pseudos,o.setFilters=new gt;function mt(e,t){var n,r,i,a,s,l,u,c=k[e+" "];if(c)return t?0:c.slice(0);s=e,l=[],u=o.preFilter;while(s){(!n||(r=X.exec(s)))&&(r&&(s=s.slice(r[0].length)||s),l.push(i=[])),n=!1,(r=U.exec(s))&&(n=r.shift(),i.push({value:n,type:r[0].replace(z," ")}),s=s.slice(n.length));for(a in o.filter)!(r=Q[a].exec(s))||u[a]&&!(r=u[a](r))||(n=r.shift(),i.push({value:n,type:a,matches:r}),s=s.slice(n.length));if(!n)break}return t?s.length:s?at.error(e):k(e,l).slice(0)}function yt(e){var t=0,n=e.length,r="";for(;n>t;t++)r+=e[t].value;return r}function vt(e,t,n){var r=t.dir,o=n&&"parentNode"===r,a=C++;return t.first?function(t,n,i){while(t=t[r])if(1===t.nodeType||o)return e(t,n,i)}:function(t,n,s){var l,u,c,p=T+" "+a;if(s){while(t=t[r])if((1===t.nodeType||o)&&e(t,n,s))return!0}else while(t=t[r])if(1===t.nodeType||o)if(c=t[b]||(t[b]={}),(u=c[r])&&u[0]===p){if((l=u[1])===!0||l===i)return l===!0}else if(u=c[r]=[p],u[1]=e(t,n,s)||i,u[1]===!0)return!0}}function bt(e){return e.length>1?function(t,n,r){var i=e.length;while(i--)if(!e[i](t,n,r))return!1;return!0}:e[0]}function xt(e,t,n,r,i){var o,a=[],s=0,l=e.length,u=null!=t;for(;l>s;s++)(o=e[s])&&(!n||n(o,r,i))&&(a.push(o),u&&t.push(s));return a}function wt(e,t,n,r,i,o){return r&&!r[b]&&(r=wt(r)),i&&!i[b]&&(i=wt(i,o)),lt(function(o,a,s,l){var u,c,p,f=[],d=[],h=a.length,g=o||Nt(t||"*",s.nodeType?[s]:s,[]),m=!e||!o&&t?g:xt(g,f,e,s,l),y=n?i||(o?e:h||r)?[]:a:m;if(n&&n(m,y,s,l),r){u=xt(y,d),r(u,[],s,l),c=u.length;while(c--)(p=u[c])&&(y[d[c]]=!(m[d[c]]=p))}if(o){if(i||e){if(i){u=[],c=y.length;while(c--)(p=y[c])&&u.push(m[c]=p);i(null,y=[],u,l)}c=y.length;while(c--)(p=y[c])&&(u=i?F.call(o,p):f[c])>-1&&(o[u]=!(a[u]=p))}}else y=xt(y===a?y.splice(h,y.length):y),i?i(null,a,y,l):M.apply(a,y)})}function Tt(e){var t,n,r,i=e.length,a=o.relative[e[0].type],s=a||o.relative[" "],l=a?1:0,c=vt(function(e){return e===t},s,!0),p=vt(function(e){return F.call(t,e)>-1},s,!0),f=[function(e,n,r){return!a&&(r||n!==u)||((t=n).nodeType?c(e,n,r):p(e,n,r))}];for(;i>l;l++)if(n=o.relative[e[l].type])f=[vt(bt(f),n)];else{if(n=o.filter[e[l].type].apply(null,e[l].matches),n[b]){for(r=++l;i>r;r++)if(o.relative[e[r].type])break;return wt(l>1&&bt(f),l>1&&yt(e.slice(0,l-1).concat({value:" "===e[l-2].type?"*":""})).replace(z,"$1"),n,r>l&&Tt(e.slice(l,r)),i>r&&Tt(e=e.slice(r)),i>r&&yt(e))}f.push(n)}return bt(f)}function Ct(e,t){var n=0,r=t.length>0,a=e.length>0,s=function(s,l,c,p,d){var h,g,m,y=[],v=0,b="0",x=s&&[],w=null!=d,C=u,N=s||a&&o.find.TAG("*",d&&l.parentNode||l),k=T+=null==C?1:Math.random()||.1;for(w&&(u=l!==f&&l,i=n);null!=(h=N[b]);b++){if(a&&h){g=0;while(m=e[g++])if(m(h,l,c)){p.push(h);break}w&&(T=k,i=++n)}r&&((h=!m&&h)&&v--,s&&x.push(h))}if(v+=b,r&&b!==v){g=0;while(m=t[g++])m(x,y,l,c);if(s){if(v>0)while(b--)x[b]||y[b]||(y[b]=q.call(p));y=xt(y)}M.apply(p,y),w&&!s&&y.length>0&&v+t.length>1&&at.uniqueSort(p)}return w&&(T=k,u=C),x};return r?lt(s):s}l=at.compile=function(e,t){var n,r=[],i=[],o=E[e+" "];if(!o){t||(t=mt(e)),n=t.length;while(n--)o=Tt(t[n]),o[b]?r.push(o):i.push(o);o=E(e,Ct(i,r))}return o};function Nt(e,t,n){var r=0,i=t.length;for(;i>r;r++)at(e,t[r],n);return n}function kt(e,t,n,i){var a,s,u,c,p,f=mt(e);if(!i&&1===f.length){if(s=f[0]=f[0].slice(0),s.length>2&&"ID"===(u=s[0]).type&&r.getById&&9===t.nodeType&&h&&o.relative[s[1].type]){if(t=(o.find.ID(u.matches[0].replace(rt,it),t)||[])[0],!t)return n;e=e.slice(s.shift().value.length)}a=Q.needsContext.test(e)?0:s.length;while(a--){if(u=s[a],o.relative[c=u.type])break;if((p=o.find[c])&&(i=p(u.matches[0].replace(rt,it),V.test(s[0].type)&&t.parentNode||t))){if(s.splice(a,1),e=i.length&&yt(s),!e)return M.apply(n,i),n;break}}}return l(e,f)(i,t,!h,n,V.test(e)),n}r.sortStable=b.split("").sort(A).join("")===b,r.detectDuplicates=S,p(),r.sortDetached=ut(function(e){return 1&e.compareDocumentPosition(f.createElement("div"))}),ut(function(e){return e.innerHTML="<a href='#'></a>","#"===e.firstChild.getAttribute("href")})||ct("type|href|height|width",function(e,n,r){return r?t:e.getAttribute(n,"type"===n.toLowerCase()?1:2)}),r.attributes&&ut(function(e){return e.innerHTML="<input/>",e.firstChild.setAttribute("value",""),""===e.firstChild.getAttribute("value")})||ct("value",function(e,n,r){return r||"input"!==e.nodeName.toLowerCase()?t:e.defaultValue}),ut(function(e){return null==e.getAttribute("disabled")})||ct(B,function(e,n,r){var i;return r?t:(i=e.getAttributeNode(n))&&i.specified?i.value:e[n]===!0?n.toLowerCase():null}),x.find=at,x.expr=at.selectors,x.expr[":"]=x.expr.pseudos,x.unique=at.uniqueSort,x.text=at.getText,x.isXMLDoc=at.isXML,x.contains=at.contains}(e);var O={};function F(e){var t=O[e]={};return x.each(e.match(T)||[],function(e,n){t[n]=!0}),t}x.Callbacks=function(e){e="string"==typeof e?O[e]||F(e):x.extend({},e);var n,r,i,o,a,s,l=[],u=!e.once&&[],c=function(t){for(r=e.memory&&t,i=!0,a=s||0,s=0,o=l.length,n=!0;l&&o>a;a++)if(l[a].apply(t[0],t[1])===!1&&e.stopOnFalse){r=!1;break}n=!1,l&&(u?u.length&&c(u.shift()):r?l=[]:p.disable())},p={add:function(){if(l){var t=l.length;(function i(t){x.each(t,function(t,n){var r=x.type(n);"function"===r?e.unique&&p.has(n)||l.push(n):n&&n.length&&"string"!==r&&i(n)})})(arguments),n?o=l.length:r&&(s=t,c(r))}return this},remove:function(){return l&&x.each(arguments,function(e,t){var r;while((r=x.inArray(t,l,r))>-1)l.splice(r,1),n&&(o>=r&&o--,a>=r&&a--)}),this},has:function(e){return e?x.inArray(e,l)>-1:!(!l||!l.length)},empty:function(){return l=[],o=0,this},disable:function(){return l=u=r=t,this},disabled:function(){return!l},lock:function(){return u=t,r||p.disable(),this},locked:function(){return!u},fireWith:function(e,t){return!l||i&&!u||(t=t||[],t=[e,t.slice?t.slice():t],n?u.push(t):c(t)),this},fire:function(){return p.fireWith(this,arguments),this},fired:function(){return!!i}};return p},x.extend({Deferred:function(e){var t=[["resolve","done",x.Callbacks("once memory"),"resolved"],["reject","fail",x.Callbacks("once memory"),"rejected"],["notify","progress",x.Callbacks("memory")]],n="pending",r={state:function(){return n},always:function(){return i.done(arguments).fail(arguments),this},then:function(){var e=arguments;return x.Deferred(function(n){x.each(t,function(t,o){var a=o[0],s=x.isFunction(e[t])&&e[t];i[o[1]](function(){var e=s&&s.apply(this,arguments);e&&x.isFunction(e.promise)?e.promise().done(n.resolve).fail(n.reject).progress(n.notify):n[a+"With"](this===r?n.promise():this,s?[e]:arguments)})}),e=null}).promise()},promise:function(e){return null!=e?x.extend(e,r):r}},i={};return r.pipe=r.then,x.each(t,function(e,o){var a=o[2],s=o[3];r[o[1]]=a.add,s&&a.add(function(){n=s},t[1^e][2].disable,t[2][2].lock),i[o[0]]=function(){return i[o[0]+"With"](this===i?r:this,arguments),this},i[o[0]+"With"]=a.fireWith}),r.promise(i),e&&e.call(i,i),i},when:function(e){var t=0,n=g.call(arguments),r=n.length,i=1!==r||e&&x.isFunction(e.promise)?r:0,o=1===i?e:x.Deferred(),a=function(e,t,n){return function(r){t[e]=this,n[e]=arguments.length>1?g.call(arguments):r,n===s?o.notifyWith(t,n):--i||o.resolveWith(t,n)}},s,l,u;if(r>1)for(s=Array(r),l=Array(r),u=Array(r);r>t;t++)n[t]&&x.isFunction(n[t].promise)?n[t].promise().done(a(t,u,n)).fail(o.reject).progress(a(t,l,s)):--i;return i||o.resolveWith(u,n),o.promise()}}),x.support=function(t){var n,r,o,s,l,u,c,p,f,d=a.createElement("div");if(d.setAttribute("className","t"),d.innerHTML="  <link/><table></table><a href='/a'>a</a><input type='checkbox'/>",n=d.getElementsByTagName("*")||[],r=d.getElementsByTagName("a")[0],!r||!r.style||!n.length)return t;s=a.createElement("select"),u=s.appendChild(a.createElement("option")),o=d.getElementsByTagName("input")[0],r.style.cssText="top:1px;float:left;opacity:.5",t.getSetAttribute="t"!==d.className,t.leadingWhitespace=3===d.firstChild.nodeType,t.tbody=!d.getElementsByTagName("tbody").length,t.htmlSerialize=!!d.getElementsByTagName("link").length,t.style=/top/.test(r.getAttribute("style")),t.hrefNormalized="/a"===r.getAttribute("href"),t.opacity=/^0.5/.test(r.style.opacity),t.cssFloat=!!r.style.cssFloat,t.checkOn=!!o.value,t.optSelected=u.selected,t.enctype=!!a.createElement("form").enctype,t.html5Clone="<:nav></:nav>"!==a.createElement("nav").cloneNode(!0).outerHTML,t.inlineBlockNeedsLayout=!1,t.shrinkWrapBlocks=!1,t.pixelPosition=!1,t.deleteExpando=!0,t.noCloneEvent=!0,t.reliableMarginRight=!0,t.boxSizingReliable=!0,o.checked=!0,t.noCloneChecked=o.cloneNode(!0).checked,s.disabled=!0,t.optDisabled=!u.disabled;try{delete d.test}catch(h){t.deleteExpando=!1}o=a.createElement("input"),o.setAttribute("value",""),t.input=""===o.getAttribute("value"),o.value="t",o.setAttribute("type","radio"),t.radioValue="t"===o.value,o.setAttribute("checked","t"),o.setAttribute("name","t"),l=a.createDocumentFragment(),l.appendChild(o),t.appendChecked=o.checked,t.checkClone=l.cloneNode(!0).cloneNode(!0).lastChild.checked,d.attachEvent&&(d.attachEvent("onclick",function(){t.noCloneEvent=!1}),d.cloneNode(!0).click());for(f in{submit:!0,change:!0,focusin:!0})d.setAttribute(c="on"+f,"t"),t[f+"Bubbles"]=c in e||d.attributes[c].expando===!1;d.style.backgroundClip="content-box",d.cloneNode(!0).style.backgroundClip="",t.clearCloneStyle="content-box"===d.style.backgroundClip;for(f in x(t))break;return t.ownLast="0"!==f,x(function(){var n,r,o,s="padding:0;margin:0;border:0;display:block;box-sizing:content-box;-moz-box-sizing:content-box;-webkit-box-sizing:content-box;",l=a.getElementsByTagName("body")[0];l&&(n=a.createElement("div"),n.style.cssText="border:0;width:0;height:0;position:absolute;top:0;left:-9999px;margin-top:1px",l.appendChild(n).appendChild(d),d.innerHTML="<table><tr><td></td><td>t</td></tr></table>",o=d.getElementsByTagName("td"),o[0].style.cssText="padding:0;margin:0;border:0;display:none",p=0===o[0].offsetHeight,o[0].style.display="",o[1].style.display="none",t.reliableHiddenOffsets=p&&0===o[0].offsetHeight,d.innerHTML="",d.style.cssText="box-sizing:border-box;-moz-box-sizing:border-box;-webkit-box-sizing:border-box;padding:1px;border:1px;display:block;width:4px;margin-top:1%;position:absolute;top:1%;",x.swap(l,null!=l.style.zoom?{zoom:1}:{},function(){t.boxSizing=4===d.offsetWidth}),e.getComputedStyle&&(t.pixelPosition="1%"!==(e.getComputedStyle(d,null)||{}).top,t.boxSizingReliable="4px"===(e.getComputedStyle(d,null)||{width:"4px"}).width,r=d.appendChild(a.createElement("div")),r.style.cssText=d.style.cssText=s,r.style.marginRight=r.style.width="0",d.style.width="1px",t.reliableMarginRight=!parseFloat((e.getComputedStyle(r,null)||{}).marginRight)),typeof d.style.zoom!==i&&(d.innerHTML="",d.style.cssText=s+"width:1px;padding:1px;display:inline;zoom:1",t.inlineBlockNeedsLayout=3===d.offsetWidth,d.style.display="block",d.innerHTML="<div></div>",d.firstChild.style.width="5px",t.shrinkWrapBlocks=3!==d.offsetWidth,t.inlineBlockNeedsLayout&&(l.style.zoom=1)),l.removeChild(n),n=d=o=r=null)}),n=s=l=u=r=o=null,t
}({});var B=/(?:\{[\s\S]*\}|\[[\s\S]*\])$/,P=/([A-Z])/g;function R(e,n,r,i){if(x.acceptData(e)){var o,a,s=x.expando,l=e.nodeType,u=l?x.cache:e,c=l?e[s]:e[s]&&s;if(c&&u[c]&&(i||u[c].data)||r!==t||"string"!=typeof n)return c||(c=l?e[s]=p.pop()||x.guid++:s),u[c]||(u[c]=l?{}:{toJSON:x.noop}),("object"==typeof n||"function"==typeof n)&&(i?u[c]=x.extend(u[c],n):u[c].data=x.extend(u[c].data,n)),a=u[c],i||(a.data||(a.data={}),a=a.data),r!==t&&(a[x.camelCase(n)]=r),"string"==typeof n?(o=a[n],null==o&&(o=a[x.camelCase(n)])):o=a,o}}function W(e,t,n){if(x.acceptData(e)){var r,i,o=e.nodeType,a=o?x.cache:e,s=o?e[x.expando]:x.expando;if(a[s]){if(t&&(r=n?a[s]:a[s].data)){x.isArray(t)?t=t.concat(x.map(t,x.camelCase)):t in r?t=[t]:(t=x.camelCase(t),t=t in r?[t]:t.split(" ")),i=t.length;while(i--)delete r[t[i]];if(n?!I(r):!x.isEmptyObject(r))return}(n||(delete a[s].data,I(a[s])))&&(o?x.cleanData([e],!0):x.support.deleteExpando||a!=a.window?delete a[s]:a[s]=null)}}}x.extend({cache:{},noData:{applet:!0,embed:!0,object:"clsid:D27CDB6E-AE6D-11cf-96B8-444553540000"},hasData:function(e){return e=e.nodeType?x.cache[e[x.expando]]:e[x.expando],!!e&&!I(e)},data:function(e,t,n){return R(e,t,n)},removeData:function(e,t){return W(e,t)},_data:function(e,t,n){return R(e,t,n,!0)},_removeData:function(e,t){return W(e,t,!0)},acceptData:function(e){if(e.nodeType&&1!==e.nodeType&&9!==e.nodeType)return!1;var t=e.nodeName&&x.noData[e.nodeName.toLowerCase()];return!t||t!==!0&&e.getAttribute("classid")===t}}),x.fn.extend({data:function(e,n){var r,i,o=null,a=0,s=this[0];if(e===t){if(this.length&&(o=x.data(s),1===s.nodeType&&!x._data(s,"parsedAttrs"))){for(r=s.attributes;r.length>a;a++)i=r[a].name,0===i.indexOf("data-")&&(i=x.camelCase(i.slice(5)),$(s,i,o[i]));x._data(s,"parsedAttrs",!0)}return o}return"object"==typeof e?this.each(function(){x.data(this,e)}):arguments.length>1?this.each(function(){x.data(this,e,n)}):s?$(s,e,x.data(s,e)):null},removeData:function(e){return this.each(function(){x.removeData(this,e)})}});function $(e,n,r){if(r===t&&1===e.nodeType){var i="data-"+n.replace(P,"-$1").toLowerCase();if(r=e.getAttribute(i),"string"==typeof r){try{r="true"===r?!0:"false"===r?!1:"null"===r?null:+r+""===r?+r:B.test(r)?x.parseJSON(r):r}catch(o){}x.data(e,n,r)}else r=t}return r}function I(e){var t;for(t in e)if(("data"!==t||!x.isEmptyObject(e[t]))&&"toJSON"!==t)return!1;return!0}x.extend({queue:function(e,n,r){var i;return e?(n=(n||"fx")+"queue",i=x._data(e,n),r&&(!i||x.isArray(r)?i=x._data(e,n,x.makeArray(r)):i.push(r)),i||[]):t},dequeue:function(e,t){t=t||"fx";var n=x.queue(e,t),r=n.length,i=n.shift(),o=x._queueHooks(e,t),a=function(){x.dequeue(e,t)};"inprogress"===i&&(i=n.shift(),r--),i&&("fx"===t&&n.unshift("inprogress"),delete o.stop,i.call(e,a,o)),!r&&o&&o.empty.fire()},_queueHooks:function(e,t){var n=t+"queueHooks";return x._data(e,n)||x._data(e,n,{empty:x.Callbacks("once memory").add(function(){x._removeData(e,t+"queue"),x._removeData(e,n)})})}}),x.fn.extend({queue:function(e,n){var r=2;return"string"!=typeof e&&(n=e,e="fx",r--),r>arguments.length?x.queue(this[0],e):n===t?this:this.each(function(){var t=x.queue(this,e,n);x._queueHooks(this,e),"fx"===e&&"inprogress"!==t[0]&&x.dequeue(this,e)})},dequeue:function(e){return this.each(function(){x.dequeue(this,e)})},delay:function(e,t){return e=x.fx?x.fx.speeds[e]||e:e,t=t||"fx",this.queue(t,function(t,n){var r=setTimeout(t,e);n.stop=function(){clearTimeout(r)}})},clearQueue:function(e){return this.queue(e||"fx",[])},promise:function(e,n){var r,i=1,o=x.Deferred(),a=this,s=this.length,l=function(){--i||o.resolveWith(a,[a])};"string"!=typeof e&&(n=e,e=t),e=e||"fx";while(s--)r=x._data(a[s],e+"queueHooks"),r&&r.empty&&(i++,r.empty.add(l));return l(),o.promise(n)}});var z,X,U=/[\t\r\n\f]/g,V=/\r/g,Y=/^(?:input|select|textarea|button|object)$/i,J=/^(?:a|area)$/i,G=/^(?:checked|selected)$/i,Q=x.support.getSetAttribute,K=x.support.input;x.fn.extend({attr:function(e,t){return x.access(this,x.attr,e,t,arguments.length>1)},removeAttr:function(e){return this.each(function(){x.removeAttr(this,e)})},prop:function(e,t){return x.access(this,x.prop,e,t,arguments.length>1)},removeProp:function(e){return e=x.propFix[e]||e,this.each(function(){try{this[e]=t,delete this[e]}catch(n){}})},addClass:function(e){var t,n,r,i,o,a=0,s=this.length,l="string"==typeof e&&e;if(x.isFunction(e))return this.each(function(t){x(this).addClass(e.call(this,t,this.className))});if(l)for(t=(e||"").match(T)||[];s>a;a++)if(n=this[a],r=1===n.nodeType&&(n.className?(" "+n.className+" ").replace(U," "):" ")){o=0;while(i=t[o++])0>r.indexOf(" "+i+" ")&&(r+=i+" ");n.className=x.trim(r)}return this},removeClass:function(e){var t,n,r,i,o,a=0,s=this.length,l=0===arguments.length||"string"==typeof e&&e;if(x.isFunction(e))return this.each(function(t){x(this).removeClass(e.call(this,t,this.className))});if(l)for(t=(e||"").match(T)||[];s>a;a++)if(n=this[a],r=1===n.nodeType&&(n.className?(" "+n.className+" ").replace(U," "):"")){o=0;while(i=t[o++])while(r.indexOf(" "+i+" ")>=0)r=r.replace(" "+i+" "," ");n.className=e?x.trim(r):""}return this},toggleClass:function(e,t){var n=typeof e;return"boolean"==typeof t&&"string"===n?t?this.addClass(e):this.removeClass(e):x.isFunction(e)?this.each(function(n){x(this).toggleClass(e.call(this,n,this.className,t),t)}):this.each(function(){if("string"===n){var t,r=0,o=x(this),a=e.match(T)||[];while(t=a[r++])o.hasClass(t)?o.removeClass(t):o.addClass(t)}else(n===i||"boolean"===n)&&(this.className&&x._data(this,"__className__",this.className),this.className=this.className||e===!1?"":x._data(this,"__className__")||"")})},hasClass:function(e){var t=" "+e+" ",n=0,r=this.length;for(;r>n;n++)if(1===this[n].nodeType&&(" "+this[n].className+" ").replace(U," ").indexOf(t)>=0)return!0;return!1},val:function(e){var n,r,i,o=this[0];{if(arguments.length)return i=x.isFunction(e),this.each(function(n){var o;1===this.nodeType&&(o=i?e.call(this,n,x(this).val()):e,null==o?o="":"number"==typeof o?o+="":x.isArray(o)&&(o=x.map(o,function(e){return null==e?"":e+""})),r=x.valHooks[this.type]||x.valHooks[this.nodeName.toLowerCase()],r&&"set"in r&&r.set(this,o,"value")!==t||(this.value=o))});if(o)return r=x.valHooks[o.type]||x.valHooks[o.nodeName.toLowerCase()],r&&"get"in r&&(n=r.get(o,"value"))!==t?n:(n=o.value,"string"==typeof n?n.replace(V,""):null==n?"":n)}}}),x.extend({valHooks:{option:{get:function(e){var t=x.find.attr(e,"value");return null!=t?t:e.text}},select:{get:function(e){var t,n,r=e.options,i=e.selectedIndex,o="select-one"===e.type||0>i,a=o?null:[],s=o?i+1:r.length,l=0>i?s:o?i:0;for(;s>l;l++)if(n=r[l],!(!n.selected&&l!==i||(x.support.optDisabled?n.disabled:null!==n.getAttribute("disabled"))||n.parentNode.disabled&&x.nodeName(n.parentNode,"optgroup"))){if(t=x(n).val(),o)return t;a.push(t)}return a},set:function(e,t){var n,r,i=e.options,o=x.makeArray(t),a=i.length;while(a--)r=i[a],(r.selected=x.inArray(x(r).val(),o)>=0)&&(n=!0);return n||(e.selectedIndex=-1),o}}},attr:function(e,n,r){var o,a,s=e.nodeType;if(e&&3!==s&&8!==s&&2!==s)return typeof e.getAttribute===i?x.prop(e,n,r):(1===s&&x.isXMLDoc(e)||(n=n.toLowerCase(),o=x.attrHooks[n]||(x.expr.match.bool.test(n)?X:z)),r===t?o&&"get"in o&&null!==(a=o.get(e,n))?a:(a=x.find.attr(e,n),null==a?t:a):null!==r?o&&"set"in o&&(a=o.set(e,r,n))!==t?a:(e.setAttribute(n,r+""),r):(x.removeAttr(e,n),t))},removeAttr:function(e,t){var n,r,i=0,o=t&&t.match(T);if(o&&1===e.nodeType)while(n=o[i++])r=x.propFix[n]||n,x.expr.match.bool.test(n)?K&&Q||!G.test(n)?e[r]=!1:e[x.camelCase("default-"+n)]=e[r]=!1:x.attr(e,n,""),e.removeAttribute(Q?n:r)},attrHooks:{type:{set:function(e,t){if(!x.support.radioValue&&"radio"===t&&x.nodeName(e,"input")){var n=e.value;return e.setAttribute("type",t),n&&(e.value=n),t}}}},propFix:{"for":"htmlFor","class":"className"},prop:function(e,n,r){var i,o,a,s=e.nodeType;if(e&&3!==s&&8!==s&&2!==s)return a=1!==s||!x.isXMLDoc(e),a&&(n=x.propFix[n]||n,o=x.propHooks[n]),r!==t?o&&"set"in o&&(i=o.set(e,r,n))!==t?i:e[n]=r:o&&"get"in o&&null!==(i=o.get(e,n))?i:e[n]},propHooks:{tabIndex:{get:function(e){var t=x.find.attr(e,"tabindex");return t?parseInt(t,10):Y.test(e.nodeName)||J.test(e.nodeName)&&e.href?0:-1}}}}),X={set:function(e,t,n){return t===!1?x.removeAttr(e,n):K&&Q||!G.test(n)?e.setAttribute(!Q&&x.propFix[n]||n,n):e[x.camelCase("default-"+n)]=e[n]=!0,n}},x.each(x.expr.match.bool.source.match(/\w+/g),function(e,n){var r=x.expr.attrHandle[n]||x.find.attr;x.expr.attrHandle[n]=K&&Q||!G.test(n)?function(e,n,i){var o=x.expr.attrHandle[n],a=i?t:(x.expr.attrHandle[n]=t)!=r(e,n,i)?n.toLowerCase():null;return x.expr.attrHandle[n]=o,a}:function(e,n,r){return r?t:e[x.camelCase("default-"+n)]?n.toLowerCase():null}}),K&&Q||(x.attrHooks.value={set:function(e,n,r){return x.nodeName(e,"input")?(e.defaultValue=n,t):z&&z.set(e,n,r)}}),Q||(z={set:function(e,n,r){var i=e.getAttributeNode(r);return i||e.setAttributeNode(i=e.ownerDocument.createAttribute(r)),i.value=n+="","value"===r||n===e.getAttribute(r)?n:t}},x.expr.attrHandle.id=x.expr.attrHandle.name=x.expr.attrHandle.coords=function(e,n,r){var i;return r?t:(i=e.getAttributeNode(n))&&""!==i.value?i.value:null},x.valHooks.button={get:function(e,n){var r=e.getAttributeNode(n);return r&&r.specified?r.value:t},set:z.set},x.attrHooks.contenteditable={set:function(e,t,n){z.set(e,""===t?!1:t,n)}},x.each(["width","height"],function(e,n){x.attrHooks[n]={set:function(e,r){return""===r?(e.setAttribute(n,"auto"),r):t}}})),x.support.hrefNormalized||x.each(["href","src"],function(e,t){x.propHooks[t]={get:function(e){return e.getAttribute(t,4)}}}),x.support.style||(x.attrHooks.style={get:function(e){return e.style.cssText||t},set:function(e,t){return e.style.cssText=t+""}}),x.support.optSelected||(x.propHooks.selected={get:function(e){var t=e.parentNode;return t&&(t.selectedIndex,t.parentNode&&t.parentNode.selectedIndex),null}}),x.each(["tabIndex","readOnly","maxLength","cellSpacing","cellPadding","rowSpan","colSpan","useMap","frameBorder","contentEditable"],function(){x.propFix[this.toLowerCase()]=this}),x.support.enctype||(x.propFix.enctype="encoding"),x.each(["radio","checkbox"],function(){x.valHooks[this]={set:function(e,n){return x.isArray(n)?e.checked=x.inArray(x(e).val(),n)>=0:t}},x.support.checkOn||(x.valHooks[this].get=function(e){return null===e.getAttribute("value")?"on":e.value})});var Z=/^(?:input|select|textarea)$/i,et=/^key/,tt=/^(?:mouse|contextmenu)|click/,nt=/^(?:focusinfocus|focusoutblur)$/,rt=/^([^.]*)(?:\.(.+)|)$/;function it(){return!0}function ot(){return!1}function at(){try{return a.activeElement}catch(e){}}x.event={global:{},add:function(e,n,r,o,a){var s,l,u,c,p,f,d,h,g,m,y,v=x._data(e);if(v){r.handler&&(c=r,r=c.handler,a=c.selector),r.guid||(r.guid=x.guid++),(l=v.events)||(l=v.events={}),(f=v.handle)||(f=v.handle=function(e){return typeof x===i||e&&x.event.triggered===e.type?t:x.event.dispatch.apply(f.elem,arguments)},f.elem=e),n=(n||"").match(T)||[""],u=n.length;while(u--)s=rt.exec(n[u])||[],g=y=s[1],m=(s[2]||"").split(".").sort(),g&&(p=x.event.special[g]||{},g=(a?p.delegateType:p.bindType)||g,p=x.event.special[g]||{},d=x.extend({type:g,origType:y,data:o,handler:r,guid:r.guid,selector:a,needsContext:a&&x.expr.match.needsContext.test(a),namespace:m.join(".")},c),(h=l[g])||(h=l[g]=[],h.delegateCount=0,p.setup&&p.setup.call(e,o,m,f)!==!1||(e.addEventListener?e.addEventListener(g,f,!1):e.attachEvent&&e.attachEvent("on"+g,f))),p.add&&(p.add.call(e,d),d.handler.guid||(d.handler.guid=r.guid)),a?h.splice(h.delegateCount++,0,d):h.push(d),x.event.global[g]=!0);e=null}},remove:function(e,t,n,r,i){var o,a,s,l,u,c,p,f,d,h,g,m=x.hasData(e)&&x._data(e);if(m&&(c=m.events)){t=(t||"").match(T)||[""],u=t.length;while(u--)if(s=rt.exec(t[u])||[],d=g=s[1],h=(s[2]||"").split(".").sort(),d){p=x.event.special[d]||{},d=(r?p.delegateType:p.bindType)||d,f=c[d]||[],s=s[2]&&RegExp("(^|\\.)"+h.join("\\.(?:.*\\.|)")+"(\\.|$)"),l=o=f.length;while(o--)a=f[o],!i&&g!==a.origType||n&&n.guid!==a.guid||s&&!s.test(a.namespace)||r&&r!==a.selector&&("**"!==r||!a.selector)||(f.splice(o,1),a.selector&&f.delegateCount--,p.remove&&p.remove.call(e,a));l&&!f.length&&(p.teardown&&p.teardown.call(e,h,m.handle)!==!1||x.removeEvent(e,d,m.handle),delete c[d])}else for(d in c)x.event.remove(e,d+t[u],n,r,!0);x.isEmptyObject(c)&&(delete m.handle,x._removeData(e,"events"))}},trigger:function(n,r,i,o){var s,l,u,c,p,f,d,h=[i||a],g=v.call(n,"type")?n.type:n,m=v.call(n,"namespace")?n.namespace.split("."):[];if(u=f=i=i||a,3!==i.nodeType&&8!==i.nodeType&&!nt.test(g+x.event.triggered)&&(g.indexOf(".")>=0&&(m=g.split("."),g=m.shift(),m.sort()),l=0>g.indexOf(":")&&"on"+g,n=n[x.expando]?n:new x.Event(g,"object"==typeof n&&n),n.isTrigger=o?2:3,n.namespace=m.join("."),n.namespace_re=n.namespace?RegExp("(^|\\.)"+m.join("\\.(?:.*\\.|)")+"(\\.|$)"):null,n.result=t,n.target||(n.target=i),r=null==r?[n]:x.makeArray(r,[n]),p=x.event.special[g]||{},o||!p.trigger||p.trigger.apply(i,r)!==!1)){if(!o&&!p.noBubble&&!x.isWindow(i)){for(c=p.delegateType||g,nt.test(c+g)||(u=u.parentNode);u;u=u.parentNode)h.push(u),f=u;f===(i.ownerDocument||a)&&h.push(f.defaultView||f.parentWindow||e)}d=0;while((u=h[d++])&&!n.isPropagationStopped())n.type=d>1?c:p.bindType||g,s=(x._data(u,"events")||{})[n.type]&&x._data(u,"handle"),s&&s.apply(u,r),s=l&&u[l],s&&x.acceptData(u)&&s.apply&&s.apply(u,r)===!1&&n.preventDefault();if(n.type=g,!o&&!n.isDefaultPrevented()&&(!p._default||p._default.apply(h.pop(),r)===!1)&&x.acceptData(i)&&l&&i[g]&&!x.isWindow(i)){f=i[l],f&&(i[l]=null),x.event.triggered=g;try{i[g]()}catch(y){}x.event.triggered=t,f&&(i[l]=f)}return n.result}},dispatch:function(e){e=x.event.fix(e);var n,r,i,o,a,s=[],l=g.call(arguments),u=(x._data(this,"events")||{})[e.type]||[],c=x.event.special[e.type]||{};if(l[0]=e,e.delegateTarget=this,!c.preDispatch||c.preDispatch.call(this,e)!==!1){s=x.event.handlers.call(this,e,u),n=0;while((o=s[n++])&&!e.isPropagationStopped()){e.currentTarget=o.elem,a=0;while((i=o.handlers[a++])&&!e.isImmediatePropagationStopped())(!e.namespace_re||e.namespace_re.test(i.namespace))&&(e.handleObj=i,e.data=i.data,r=((x.event.special[i.origType]||{}).handle||i.handler).apply(o.elem,l),r!==t&&(e.result=r)===!1&&(e.preventDefault(),e.stopPropagation()))}return c.postDispatch&&c.postDispatch.call(this,e),e.result}},handlers:function(e,n){var r,i,o,a,s=[],l=n.delegateCount,u=e.target;if(l&&u.nodeType&&(!e.button||"click"!==e.type))for(;u!=this;u=u.parentNode||this)if(1===u.nodeType&&(u.disabled!==!0||"click"!==e.type)){for(o=[],a=0;l>a;a++)i=n[a],r=i.selector+" ",o[r]===t&&(o[r]=i.needsContext?x(r,this).index(u)>=0:x.find(r,this,null,[u]).length),o[r]&&o.push(i);o.length&&s.push({elem:u,handlers:o})}return n.length>l&&s.push({elem:this,handlers:n.slice(l)}),s},fix:function(e){if(e[x.expando])return e;var t,n,r,i=e.type,o=e,s=this.fixHooks[i];s||(this.fixHooks[i]=s=tt.test(i)?this.mouseHooks:et.test(i)?this.keyHooks:{}),r=s.props?this.props.concat(s.props):this.props,e=new x.Event(o),t=r.length;while(t--)n=r[t],e[n]=o[n];return e.target||(e.target=o.srcElement||a),3===e.target.nodeType&&(e.target=e.target.parentNode),e.metaKey=!!e.metaKey,s.filter?s.filter(e,o):e},props:"altKey bubbles cancelable ctrlKey currentTarget eventPhase metaKey relatedTarget shiftKey target timeStamp view which".split(" "),fixHooks:{},keyHooks:{props:"char charCode key keyCode".split(" "),filter:function(e,t){return null==e.which&&(e.which=null!=t.charCode?t.charCode:t.keyCode),e}},mouseHooks:{props:"button buttons clientX clientY fromElement offsetX offsetY pageX pageY screenX screenY toElement".split(" "),filter:function(e,n){var r,i,o,s=n.button,l=n.fromElement;return null==e.pageX&&null!=n.clientX&&(i=e.target.ownerDocument||a,o=i.documentElement,r=i.body,e.pageX=n.clientX+(o&&o.scrollLeft||r&&r.scrollLeft||0)-(o&&o.clientLeft||r&&r.clientLeft||0),e.pageY=n.clientY+(o&&o.scrollTop||r&&r.scrollTop||0)-(o&&o.clientTop||r&&r.clientTop||0)),!e.relatedTarget&&l&&(e.relatedTarget=l===e.target?n.toElement:l),e.which||s===t||(e.which=1&s?1:2&s?3:4&s?2:0),e}},special:{load:{noBubble:!0},focus:{trigger:function(){if(this!==at()&&this.focus)try{return this.focus(),!1}catch(e){}},delegateType:"focusin"},blur:{trigger:function(){return this===at()&&this.blur?(this.blur(),!1):t},delegateType:"focusout"},click:{trigger:function(){return x.nodeName(this,"input")&&"checkbox"===this.type&&this.click?(this.click(),!1):t},_default:function(e){return x.nodeName(e.target,"a")}},beforeunload:{postDispatch:function(e){e.result!==t&&(e.originalEvent.returnValue=e.result)}}},simulate:function(e,t,n,r){var i=x.extend(new x.Event,n,{type:e,isSimulated:!0,originalEvent:{}});r?x.event.trigger(i,null,t):x.event.dispatch.call(t,i),i.isDefaultPrevented()&&n.preventDefault()}},x.removeEvent=a.removeEventListener?function(e,t,n){e.removeEventListener&&e.removeEventListener(t,n,!1)}:function(e,t,n){var r="on"+t;e.detachEvent&&(typeof e[r]===i&&(e[r]=null),e.detachEvent(r,n))},x.Event=function(e,n){return this instanceof x.Event?(e&&e.type?(this.originalEvent=e,this.type=e.type,this.isDefaultPrevented=e.defaultPrevented||e.returnValue===!1||e.getPreventDefault&&e.getPreventDefault()?it:ot):this.type=e,n&&x.extend(this,n),this.timeStamp=e&&e.timeStamp||x.now(),this[x.expando]=!0,t):new x.Event(e,n)},x.Event.prototype={isDefaultPrevented:ot,isPropagationStopped:ot,isImmediatePropagationStopped:ot,preventDefault:function(){var e=this.originalEvent;this.isDefaultPrevented=it,e&&(e.preventDefault?e.preventDefault():e.returnValue=!1)},stopPropagation:function(){var e=this.originalEvent;this.isPropagationStopped=it,e&&(e.stopPropagation&&e.stopPropagation(),e.cancelBubble=!0)},stopImmediatePropagation:function(){this.isImmediatePropagationStopped=it,this.stopPropagation()}},x.each({mouseenter:"mouseover",mouseleave:"mouseout"},function(e,t){x.event.special[e]={delegateType:t,bindType:t,handle:function(e){var n,r=this,i=e.relatedTarget,o=e.handleObj;return(!i||i!==r&&!x.contains(r,i))&&(e.type=o.origType,n=o.handler.apply(this,arguments),e.type=t),n}}}),x.support.submitBubbles||(x.event.special.submit={setup:function(){return x.nodeName(this,"form")?!1:(x.event.add(this,"click._submit keypress._submit",function(e){var n=e.target,r=x.nodeName(n,"input")||x.nodeName(n,"button")?n.form:t;r&&!x._data(r,"submitBubbles")&&(x.event.add(r,"submit._submit",function(e){e._submit_bubble=!0}),x._data(r,"submitBubbles",!0))}),t)},postDispatch:function(e){e._submit_bubble&&(delete e._submit_bubble,this.parentNode&&!e.isTrigger&&x.event.simulate("submit",this.parentNode,e,!0))},teardown:function(){return x.nodeName(this,"form")?!1:(x.event.remove(this,"._submit"),t)}}),x.support.changeBubbles||(x.event.special.change={setup:function(){return Z.test(this.nodeName)?(("checkbox"===this.type||"radio"===this.type)&&(x.event.add(this,"propertychange._change",function(e){"checked"===e.originalEvent.propertyName&&(this._just_changed=!0)}),x.event.add(this,"click._change",function(e){this._just_changed&&!e.isTrigger&&(this._just_changed=!1),x.event.simulate("change",this,e,!0)})),!1):(x.event.add(this,"beforeactivate._change",function(e){var t=e.target;Z.test(t.nodeName)&&!x._data(t,"changeBubbles")&&(x.event.add(t,"change._change",function(e){!this.parentNode||e.isSimulated||e.isTrigger||x.event.simulate("change",this.parentNode,e,!0)}),x._data(t,"changeBubbles",!0))}),t)},handle:function(e){var n=e.target;return this!==n||e.isSimulated||e.isTrigger||"radio"!==n.type&&"checkbox"!==n.type?e.handleObj.handler.apply(this,arguments):t},teardown:function(){return x.event.remove(this,"._change"),!Z.test(this.nodeName)}}),x.support.focusinBubbles||x.each({focus:"focusin",blur:"focusout"},function(e,t){var n=0,r=function(e){x.event.simulate(t,e.target,x.event.fix(e),!0)};x.event.special[t]={setup:function(){0===n++&&a.addEventListener(e,r,!0)},teardown:function(){0===--n&&a.removeEventListener(e,r,!0)}}}),x.fn.extend({on:function(e,n,r,i,o){var a,s;if("object"==typeof e){"string"!=typeof n&&(r=r||n,n=t);for(a in e)this.on(a,n,r,e[a],o);return this}if(null==r&&null==i?(i=n,r=n=t):null==i&&("string"==typeof n?(i=r,r=t):(i=r,r=n,n=t)),i===!1)i=ot;else if(!i)return this;return 1===o&&(s=i,i=function(e){return x().off(e),s.apply(this,arguments)},i.guid=s.guid||(s.guid=x.guid++)),this.each(function(){x.event.add(this,e,i,r,n)})},one:function(e,t,n,r){return this.on(e,t,n,r,1)},off:function(e,n,r){var i,o;if(e&&e.preventDefault&&e.handleObj)return i=e.handleObj,x(e.delegateTarget).off(i.namespace?i.origType+"."+i.namespace:i.origType,i.selector,i.handler),this;if("object"==typeof e){for(o in e)this.off(o,n,e[o]);return this}return(n===!1||"function"==typeof n)&&(r=n,n=t),r===!1&&(r=ot),this.each(function(){x.event.remove(this,e,r,n)})},trigger:function(e,t){return this.each(function(){x.event.trigger(e,t,this)})},triggerHandler:function(e,n){var r=this[0];return r?x.event.trigger(e,n,r,!0):t}});var st=/^.[^:#\[\.,]*$/,lt=/^(?:parents|prev(?:Until|All))/,ut=x.expr.match.needsContext,ct={children:!0,contents:!0,next:!0,prev:!0};x.fn.extend({find:function(e){var t,n=[],r=this,i=r.length;if("string"!=typeof e)return this.pushStack(x(e).filter(function(){for(t=0;i>t;t++)if(x.contains(r[t],this))return!0}));for(t=0;i>t;t++)x.find(e,r[t],n);return n=this.pushStack(i>1?x.unique(n):n),n.selector=this.selector?this.selector+" "+e:e,n},has:function(e){var t,n=x(e,this),r=n.length;return this.filter(function(){for(t=0;r>t;t++)if(x.contains(this,n[t]))return!0})},not:function(e){return this.pushStack(ft(this,e||[],!0))},filter:function(e){return this.pushStack(ft(this,e||[],!1))},is:function(e){return!!ft(this,"string"==typeof e&&ut.test(e)?x(e):e||[],!1).length},closest:function(e,t){var n,r=0,i=this.length,o=[],a=ut.test(e)||"string"!=typeof e?x(e,t||this.context):0;for(;i>r;r++)for(n=this[r];n&&n!==t;n=n.parentNode)if(11>n.nodeType&&(a?a.index(n)>-1:1===n.nodeType&&x.find.matchesSelector(n,e))){n=o.push(n);break}return this.pushStack(o.length>1?x.unique(o):o)},index:function(e){return e?"string"==typeof e?x.inArray(this[0],x(e)):x.inArray(e.jquery?e[0]:e,this):this[0]&&this[0].parentNode?this.first().prevAll().length:-1},add:function(e,t){var n="string"==typeof e?x(e,t):x.makeArray(e&&e.nodeType?[e]:e),r=x.merge(this.get(),n);return this.pushStack(x.unique(r))},addBack:function(e){return this.add(null==e?this.prevObject:this.prevObject.filter(e))}});function pt(e,t){do e=e[t];while(e&&1!==e.nodeType);return e}x.each({parent:function(e){var t=e.parentNode;return t&&11!==t.nodeType?t:null},parents:function(e){return x.dir(e,"parentNode")},parentsUntil:function(e,t,n){return x.dir(e,"parentNode",n)},next:function(e){return pt(e,"nextSibling")},prev:function(e){return pt(e,"previousSibling")},nextAll:function(e){return x.dir(e,"nextSibling")},prevAll:function(e){return x.dir(e,"previousSibling")},nextUntil:function(e,t,n){return x.dir(e,"nextSibling",n)},prevUntil:function(e,t,n){return x.dir(e,"previousSibling",n)},siblings:function(e){return x.sibling((e.parentNode||{}).firstChild,e)},children:function(e){return x.sibling(e.firstChild)},contents:function(e){return x.nodeName(e,"iframe")?e.contentDocument||e.contentWindow.document:x.merge([],e.childNodes)}},function(e,t){x.fn[e]=function(n,r){var i=x.map(this,t,n);return"Until"!==e.slice(-5)&&(r=n),r&&"string"==typeof r&&(i=x.filter(r,i)),this.length>1&&(ct[e]||(i=x.unique(i)),lt.test(e)&&(i=i.reverse())),this.pushStack(i)}}),x.extend({filter:function(e,t,n){var r=t[0];return n&&(e=":not("+e+")"),1===t.length&&1===r.nodeType?x.find.matchesSelector(r,e)?[r]:[]:x.find.matches(e,x.grep(t,function(e){return 1===e.nodeType}))},dir:function(e,n,r){var i=[],o=e[n];while(o&&9!==o.nodeType&&(r===t||1!==o.nodeType||!x(o).is(r)))1===o.nodeType&&i.push(o),o=o[n];return i},sibling:function(e,t){var n=[];for(;e;e=e.nextSibling)1===e.nodeType&&e!==t&&n.push(e);return n}});function ft(e,t,n){if(x.isFunction(t))return x.grep(e,function(e,r){return!!t.call(e,r,e)!==n});if(t.nodeType)return x.grep(e,function(e){return e===t!==n});if("string"==typeof t){if(st.test(t))return x.filter(t,e,n);t=x.filter(t,e)}return x.grep(e,function(e){return x.inArray(e,t)>=0!==n})}function dt(e){var t=ht.split("|"),n=e.createDocumentFragment();if(n.createElement)while(t.length)n.createElement(t.pop());return n}var ht="abbr|article|aside|audio|bdi|canvas|data|datalist|details|figcaption|figure|footer|header|hgroup|mark|meter|nav|output|progress|section|summary|time|video",gt=/ jQuery\d+="(?:null|\d+)"/g,mt=RegExp("<(?:"+ht+")[\\s/>]","i"),yt=/^\s+/,vt=/<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w:]+)[^>]*)\/>/gi,bt=/<([\w:]+)/,xt=/<tbody/i,wt=/<|&#?\w+;/,Tt=/<(?:script|style|link)/i,Ct=/^(?:checkbox|radio)$/i,Nt=/checked\s*(?:[^=]|=\s*.checked.)/i,kt=/^$|\/(?:java|ecma)script/i,Et=/^true\/(.*)/,St=/^\s*<!(?:\[CDATA\[|--)|(?:\]\]|--)>\s*$/g,At={option:[1,"<select multiple='multiple'>","</select>"],legend:[1,"<fieldset>","</fieldset>"],area:[1,"<map>","</map>"],param:[1,"<object>","</object>"],thead:[1,"<table>","</table>"],tr:[2,"<table><tbody>","</tbody></table>"],col:[2,"<table><tbody></tbody><colgroup>","</colgroup></table>"],td:[3,"<table><tbody><tr>","</tr></tbody></table>"],_default:x.support.htmlSerialize?[0,"",""]:[1,"X<div>","</div>"]},jt=dt(a),Dt=jt.appendChild(a.createElement("div"));At.optgroup=At.option,At.tbody=At.tfoot=At.colgroup=At.caption=At.thead,At.th=At.td,x.fn.extend({text:function(e){return x.access(this,function(e){return e===t?x.text(this):this.empty().append((this[0]&&this[0].ownerDocument||a).createTextNode(e))},null,e,arguments.length)},append:function(){return this.domManip(arguments,function(e){if(1===this.nodeType||11===this.nodeType||9===this.nodeType){var t=Lt(this,e);t.appendChild(e)}})},prepend:function(){return this.domManip(arguments,function(e){if(1===this.nodeType||11===this.nodeType||9===this.nodeType){var t=Lt(this,e);t.insertBefore(e,t.firstChild)}})},before:function(){return this.domManip(arguments,function(e){this.parentNode&&this.parentNode.insertBefore(e,this)})},after:function(){return this.domManip(arguments,function(e){this.parentNode&&this.parentNode.insertBefore(e,this.nextSibling)})},remove:function(e,t){var n,r=e?x.filter(e,this):this,i=0;for(;null!=(n=r[i]);i++)t||1!==n.nodeType||x.cleanData(Ft(n)),n.parentNode&&(t&&x.contains(n.ownerDocument,n)&&_t(Ft(n,"script")),n.parentNode.removeChild(n));return this},empty:function(){var e,t=0;for(;null!=(e=this[t]);t++){1===e.nodeType&&x.cleanData(Ft(e,!1));while(e.firstChild)e.removeChild(e.firstChild);e.options&&x.nodeName(e,"select")&&(e.options.length=0)}return this},clone:function(e,t){return e=null==e?!1:e,t=null==t?e:t,this.map(function(){return x.clone(this,e,t)})},html:function(e){return x.access(this,function(e){var n=this[0]||{},r=0,i=this.length;if(e===t)return 1===n.nodeType?n.innerHTML.replace(gt,""):t;if(!("string"!=typeof e||Tt.test(e)||!x.support.htmlSerialize&&mt.test(e)||!x.support.leadingWhitespace&&yt.test(e)||At[(bt.exec(e)||["",""])[1].toLowerCase()])){e=e.replace(vt,"<$1></$2>");try{for(;i>r;r++)n=this[r]||{},1===n.nodeType&&(x.cleanData(Ft(n,!1)),n.innerHTML=e);n=0}catch(o){}}n&&this.empty().append(e)},null,e,arguments.length)},replaceWith:function(){var e=x.map(this,function(e){return[e.nextSibling,e.parentNode]}),t=0;return this.domManip(arguments,function(n){var r=e[t++],i=e[t++];i&&(r&&r.parentNode!==i&&(r=this.nextSibling),x(this).remove(),i.insertBefore(n,r))},!0),t?this:this.remove()},detach:function(e){return this.remove(e,!0)},domManip:function(e,t,n){e=d.apply([],e);var r,i,o,a,s,l,u=0,c=this.length,p=this,f=c-1,h=e[0],g=x.isFunction(h);if(g||!(1>=c||"string"!=typeof h||x.support.checkClone)&&Nt.test(h))return this.each(function(r){var i=p.eq(r);g&&(e[0]=h.call(this,r,i.html())),i.domManip(e,t,n)});if(c&&(l=x.buildFragment(e,this[0].ownerDocument,!1,!n&&this),r=l.firstChild,1===l.childNodes.length&&(l=r),r)){for(a=x.map(Ft(l,"script"),Ht),o=a.length;c>u;u++)i=l,u!==f&&(i=x.clone(i,!0,!0),o&&x.merge(a,Ft(i,"script"))),t.call(this[u],i,u);if(o)for(s=a[a.length-1].ownerDocument,x.map(a,qt),u=0;o>u;u++)i=a[u],kt.test(i.type||"")&&!x._data(i,"globalEval")&&x.contains(s,i)&&(i.src?x._evalUrl(i.src):x.globalEval((i.text||i.textContent||i.innerHTML||"").replace(St,"")));l=r=null}return this}});function Lt(e,t){return x.nodeName(e,"table")&&x.nodeName(1===t.nodeType?t:t.firstChild,"tr")?e.getElementsByTagName("tbody")[0]||e.appendChild(e.ownerDocument.createElement("tbody")):e}function Ht(e){return e.type=(null!==x.find.attr(e,"type"))+"/"+e.type,e}function qt(e){var t=Et.exec(e.type);return t?e.type=t[1]:e.removeAttribute("type"),e}function _t(e,t){var n,r=0;for(;null!=(n=e[r]);r++)x._data(n,"globalEval",!t||x._data(t[r],"globalEval"))}function Mt(e,t){if(1===t.nodeType&&x.hasData(e)){var n,r,i,o=x._data(e),a=x._data(t,o),s=o.events;if(s){delete a.handle,a.events={};for(n in s)for(r=0,i=s[n].length;i>r;r++)x.event.add(t,n,s[n][r])}a.data&&(a.data=x.extend({},a.data))}}function Ot(e,t){var n,r,i;if(1===t.nodeType){if(n=t.nodeName.toLowerCase(),!x.support.noCloneEvent&&t[x.expando]){i=x._data(t);for(r in i.events)x.removeEvent(t,r,i.handle);t.removeAttribute(x.expando)}"script"===n&&t.text!==e.text?(Ht(t).text=e.text,qt(t)):"object"===n?(t.parentNode&&(t.outerHTML=e.outerHTML),x.support.html5Clone&&e.innerHTML&&!x.trim(t.innerHTML)&&(t.innerHTML=e.innerHTML)):"input"===n&&Ct.test(e.type)?(t.defaultChecked=t.checked=e.checked,t.value!==e.value&&(t.value=e.value)):"option"===n?t.defaultSelected=t.selected=e.defaultSelected:("input"===n||"textarea"===n)&&(t.defaultValue=e.defaultValue)}}x.each({appendTo:"append",prependTo:"prepend",insertBefore:"before",insertAfter:"after",replaceAll:"replaceWith"},function(e,t){x.fn[e]=function(e){var n,r=0,i=[],o=x(e),a=o.length-1;for(;a>=r;r++)n=r===a?this:this.clone(!0),x(o[r])[t](n),h.apply(i,n.get());return this.pushStack(i)}});function Ft(e,n){var r,o,a=0,s=typeof e.getElementsByTagName!==i?e.getElementsByTagName(n||"*"):typeof e.querySelectorAll!==i?e.querySelectorAll(n||"*"):t;if(!s)for(s=[],r=e.childNodes||e;null!=(o=r[a]);a++)!n||x.nodeName(o,n)?s.push(o):x.merge(s,Ft(o,n));return n===t||n&&x.nodeName(e,n)?x.merge([e],s):s}function Bt(e){Ct.test(e.type)&&(e.defaultChecked=e.checked)}x.extend({clone:function(e,t,n){var r,i,o,a,s,l=x.contains(e.ownerDocument,e);if(x.support.html5Clone||x.isXMLDoc(e)||!mt.test("<"+e.nodeName+">")?o=e.cloneNode(!0):(Dt.innerHTML=e.outerHTML,Dt.removeChild(o=Dt.firstChild)),!(x.support.noCloneEvent&&x.support.noCloneChecked||1!==e.nodeType&&11!==e.nodeType||x.isXMLDoc(e)))for(r=Ft(o),s=Ft(e),a=0;null!=(i=s[a]);++a)r[a]&&Ot(i,r[a]);if(t)if(n)for(s=s||Ft(e),r=r||Ft(o),a=0;null!=(i=s[a]);a++)Mt(i,r[a]);else Mt(e,o);return r=Ft(o,"script"),r.length>0&&_t(r,!l&&Ft(e,"script")),r=s=i=null,o},buildFragment:function(e,t,n,r){var i,o,a,s,l,u,c,p=e.length,f=dt(t),d=[],h=0;for(;p>h;h++)if(o=e[h],o||0===o)if("object"===x.type(o))x.merge(d,o.nodeType?[o]:o);else if(wt.test(o)){s=s||f.appendChild(t.createElement("div")),l=(bt.exec(o)||["",""])[1].toLowerCase(),c=At[l]||At._default,s.innerHTML=c[1]+o.replace(vt,"<$1></$2>")+c[2],i=c[0];while(i--)s=s.lastChild;if(!x.support.leadingWhitespace&&yt.test(o)&&d.push(t.createTextNode(yt.exec(o)[0])),!x.support.tbody){o="table"!==l||xt.test(o)?"<table>"!==c[1]||xt.test(o)?0:s:s.firstChild,i=o&&o.childNodes.length;while(i--)x.nodeName(u=o.childNodes[i],"tbody")&&!u.childNodes.length&&o.removeChild(u)}x.merge(d,s.childNodes),s.textContent="";while(s.firstChild)s.removeChild(s.firstChild);s=f.lastChild}else d.push(t.createTextNode(o));s&&f.removeChild(s),x.support.appendChecked||x.grep(Ft(d,"input"),Bt),h=0;while(o=d[h++])if((!r||-1===x.inArray(o,r))&&(a=x.contains(o.ownerDocument,o),s=Ft(f.appendChild(o),"script"),a&&_t(s),n)){i=0;while(o=s[i++])kt.test(o.type||"")&&n.push(o)}return s=null,f},cleanData:function(e,t){var n,r,o,a,s=0,l=x.expando,u=x.cache,c=x.support.deleteExpando,f=x.event.special;for(;null!=(n=e[s]);s++)if((t||x.acceptData(n))&&(o=n[l],a=o&&u[o])){if(a.events)for(r in a.events)f[r]?x.event.remove(n,r):x.removeEvent(n,r,a.handle);
u[o]&&(delete u[o],c?delete n[l]:typeof n.removeAttribute!==i?n.removeAttribute(l):n[l]=null,p.push(o))}},_evalUrl:function(e){return x.ajax({url:e,type:"GET",dataType:"script",async:!1,global:!1,"throws":!0})}}),x.fn.extend({wrapAll:function(e){if(x.isFunction(e))return this.each(function(t){x(this).wrapAll(e.call(this,t))});if(this[0]){var t=x(e,this[0].ownerDocument).eq(0).clone(!0);this[0].parentNode&&t.insertBefore(this[0]),t.map(function(){var e=this;while(e.firstChild&&1===e.firstChild.nodeType)e=e.firstChild;return e}).append(this)}return this},wrapInner:function(e){return x.isFunction(e)?this.each(function(t){x(this).wrapInner(e.call(this,t))}):this.each(function(){var t=x(this),n=t.contents();n.length?n.wrapAll(e):t.append(e)})},wrap:function(e){var t=x.isFunction(e);return this.each(function(n){x(this).wrapAll(t?e.call(this,n):e)})},unwrap:function(){return this.parent().each(function(){x.nodeName(this,"body")||x(this).replaceWith(this.childNodes)}).end()}});var Pt,Rt,Wt,$t=/alpha\([^)]*\)/i,It=/opacity\s*=\s*([^)]*)/,zt=/^(top|right|bottom|left)$/,Xt=/^(none|table(?!-c[ea]).+)/,Ut=/^margin/,Vt=RegExp("^("+w+")(.*)$","i"),Yt=RegExp("^("+w+")(?!px)[a-z%]+$","i"),Jt=RegExp("^([+-])=("+w+")","i"),Gt={BODY:"block"},Qt={position:"absolute",visibility:"hidden",display:"block"},Kt={letterSpacing:0,fontWeight:400},Zt=["Top","Right","Bottom","Left"],en=["Webkit","O","Moz","ms"];function tn(e,t){if(t in e)return t;var n=t.charAt(0).toUpperCase()+t.slice(1),r=t,i=en.length;while(i--)if(t=en[i]+n,t in e)return t;return r}function nn(e,t){return e=t||e,"none"===x.css(e,"display")||!x.contains(e.ownerDocument,e)}function rn(e,t){var n,r,i,o=[],a=0,s=e.length;for(;s>a;a++)r=e[a],r.style&&(o[a]=x._data(r,"olddisplay"),n=r.style.display,t?(o[a]||"none"!==n||(r.style.display=""),""===r.style.display&&nn(r)&&(o[a]=x._data(r,"olddisplay",ln(r.nodeName)))):o[a]||(i=nn(r),(n&&"none"!==n||!i)&&x._data(r,"olddisplay",i?n:x.css(r,"display"))));for(a=0;s>a;a++)r=e[a],r.style&&(t&&"none"!==r.style.display&&""!==r.style.display||(r.style.display=t?o[a]||"":"none"));return e}x.fn.extend({css:function(e,n){return x.access(this,function(e,n,r){var i,o,a={},s=0;if(x.isArray(n)){for(o=Rt(e),i=n.length;i>s;s++)a[n[s]]=x.css(e,n[s],!1,o);return a}return r!==t?x.style(e,n,r):x.css(e,n)},e,n,arguments.length>1)},show:function(){return rn(this,!0)},hide:function(){return rn(this)},toggle:function(e){return"boolean"==typeof e?e?this.show():this.hide():this.each(function(){nn(this)?x(this).show():x(this).hide()})}}),x.extend({cssHooks:{opacity:{get:function(e,t){if(t){var n=Wt(e,"opacity");return""===n?"1":n}}}},cssNumber:{columnCount:!0,fillOpacity:!0,fontWeight:!0,lineHeight:!0,opacity:!0,order:!0,orphans:!0,widows:!0,zIndex:!0,zoom:!0},cssProps:{"float":x.support.cssFloat?"cssFloat":"styleFloat"},style:function(e,n,r,i){if(e&&3!==e.nodeType&&8!==e.nodeType&&e.style){var o,a,s,l=x.camelCase(n),u=e.style;if(n=x.cssProps[l]||(x.cssProps[l]=tn(u,l)),s=x.cssHooks[n]||x.cssHooks[l],r===t)return s&&"get"in s&&(o=s.get(e,!1,i))!==t?o:u[n];if(a=typeof r,"string"===a&&(o=Jt.exec(r))&&(r=(o[1]+1)*o[2]+parseFloat(x.css(e,n)),a="number"),!(null==r||"number"===a&&isNaN(r)||("number"!==a||x.cssNumber[l]||(r+="px"),x.support.clearCloneStyle||""!==r||0!==n.indexOf("background")||(u[n]="inherit"),s&&"set"in s&&(r=s.set(e,r,i))===t)))try{u[n]=r}catch(c){}}},css:function(e,n,r,i){var o,a,s,l=x.camelCase(n);return n=x.cssProps[l]||(x.cssProps[l]=tn(e.style,l)),s=x.cssHooks[n]||x.cssHooks[l],s&&"get"in s&&(a=s.get(e,!0,r)),a===t&&(a=Wt(e,n,i)),"normal"===a&&n in Kt&&(a=Kt[n]),""===r||r?(o=parseFloat(a),r===!0||x.isNumeric(o)?o||0:a):a}}),e.getComputedStyle?(Rt=function(t){return e.getComputedStyle(t,null)},Wt=function(e,n,r){var i,o,a,s=r||Rt(e),l=s?s.getPropertyValue(n)||s[n]:t,u=e.style;return s&&(""!==l||x.contains(e.ownerDocument,e)||(l=x.style(e,n)),Yt.test(l)&&Ut.test(n)&&(i=u.width,o=u.minWidth,a=u.maxWidth,u.minWidth=u.maxWidth=u.width=l,l=s.width,u.width=i,u.minWidth=o,u.maxWidth=a)),l}):a.documentElement.currentStyle&&(Rt=function(e){return e.currentStyle},Wt=function(e,n,r){var i,o,a,s=r||Rt(e),l=s?s[n]:t,u=e.style;return null==l&&u&&u[n]&&(l=u[n]),Yt.test(l)&&!zt.test(n)&&(i=u.left,o=e.runtimeStyle,a=o&&o.left,a&&(o.left=e.currentStyle.left),u.left="fontSize"===n?"1em":l,l=u.pixelLeft+"px",u.left=i,a&&(o.left=a)),""===l?"auto":l});function on(e,t,n){var r=Vt.exec(t);return r?Math.max(0,r[1]-(n||0))+(r[2]||"px"):t}function an(e,t,n,r,i){var o=n===(r?"border":"content")?4:"width"===t?1:0,a=0;for(;4>o;o+=2)"margin"===n&&(a+=x.css(e,n+Zt[o],!0,i)),r?("content"===n&&(a-=x.css(e,"padding"+Zt[o],!0,i)),"margin"!==n&&(a-=x.css(e,"border"+Zt[o]+"Width",!0,i))):(a+=x.css(e,"padding"+Zt[o],!0,i),"padding"!==n&&(a+=x.css(e,"border"+Zt[o]+"Width",!0,i)));return a}function sn(e,t,n){var r=!0,i="width"===t?e.offsetWidth:e.offsetHeight,o=Rt(e),a=x.support.boxSizing&&"border-box"===x.css(e,"boxSizing",!1,o);if(0>=i||null==i){if(i=Wt(e,t,o),(0>i||null==i)&&(i=e.style[t]),Yt.test(i))return i;r=a&&(x.support.boxSizingReliable||i===e.style[t]),i=parseFloat(i)||0}return i+an(e,t,n||(a?"border":"content"),r,o)+"px"}function ln(e){var t=a,n=Gt[e];return n||(n=un(e,t),"none"!==n&&n||(Pt=(Pt||x("<iframe frameborder='0' width='0' height='0'/>").css("cssText","display:block !important")).appendTo(t.documentElement),t=(Pt[0].contentWindow||Pt[0].contentDocument).document,t.write("<!doctype html><html><body>"),t.close(),n=un(e,t),Pt.detach()),Gt[e]=n),n}function un(e,t){var n=x(t.createElement(e)).appendTo(t.body),r=x.css(n[0],"display");return n.remove(),r}x.each(["height","width"],function(e,n){x.cssHooks[n]={get:function(e,r,i){return r?0===e.offsetWidth&&Xt.test(x.css(e,"display"))?x.swap(e,Qt,function(){return sn(e,n,i)}):sn(e,n,i):t},set:function(e,t,r){var i=r&&Rt(e);return on(e,t,r?an(e,n,r,x.support.boxSizing&&"border-box"===x.css(e,"boxSizing",!1,i),i):0)}}}),x.support.opacity||(x.cssHooks.opacity={get:function(e,t){return It.test((t&&e.currentStyle?e.currentStyle.filter:e.style.filter)||"")?.01*parseFloat(RegExp.$1)+"":t?"1":""},set:function(e,t){var n=e.style,r=e.currentStyle,i=x.isNumeric(t)?"alpha(opacity="+100*t+")":"",o=r&&r.filter||n.filter||"";n.zoom=1,(t>=1||""===t)&&""===x.trim(o.replace($t,""))&&n.removeAttribute&&(n.removeAttribute("filter"),""===t||r&&!r.filter)||(n.filter=$t.test(o)?o.replace($t,i):o+" "+i)}}),x(function(){x.support.reliableMarginRight||(x.cssHooks.marginRight={get:function(e,n){return n?x.swap(e,{display:"inline-block"},Wt,[e,"marginRight"]):t}}),!x.support.pixelPosition&&x.fn.position&&x.each(["top","left"],function(e,n){x.cssHooks[n]={get:function(e,r){return r?(r=Wt(e,n),Yt.test(r)?x(e).position()[n]+"px":r):t}}})}),x.expr&&x.expr.filters&&(x.expr.filters.hidden=function(e){return 0>=e.offsetWidth&&0>=e.offsetHeight||!x.support.reliableHiddenOffsets&&"none"===(e.style&&e.style.display||x.css(e,"display"))},x.expr.filters.visible=function(e){return!x.expr.filters.hidden(e)}),x.each({margin:"",padding:"",border:"Width"},function(e,t){x.cssHooks[e+t]={expand:function(n){var r=0,i={},o="string"==typeof n?n.split(" "):[n];for(;4>r;r++)i[e+Zt[r]+t]=o[r]||o[r-2]||o[0];return i}},Ut.test(e)||(x.cssHooks[e+t].set=on)});var cn=/%20/g,pn=/\[\]$/,fn=/\r?\n/g,dn=/^(?:submit|button|image|reset|file)$/i,hn=/^(?:input|select|textarea|keygen)/i;x.fn.extend({serialize:function(){return x.param(this.serializeArray())},serializeArray:function(){return this.map(function(){var e=x.prop(this,"elements");return e?x.makeArray(e):this}).filter(function(){var e=this.type;return this.name&&!x(this).is(":disabled")&&hn.test(this.nodeName)&&!dn.test(e)&&(this.checked||!Ct.test(e))}).map(function(e,t){var n=x(this).val();return null==n?null:x.isArray(n)?x.map(n,function(e){return{name:t.name,value:e.replace(fn,"\r\n")}}):{name:t.name,value:n.replace(fn,"\r\n")}}).get()}}),x.param=function(e,n){var r,i=[],o=function(e,t){t=x.isFunction(t)?t():null==t?"":t,i[i.length]=encodeURIComponent(e)+"="+encodeURIComponent(t)};if(n===t&&(n=x.ajaxSettings&&x.ajaxSettings.traditional),x.isArray(e)||e.jquery&&!x.isPlainObject(e))x.each(e,function(){o(this.name,this.value)});else for(r in e)gn(r,e[r],n,o);return i.join("&").replace(cn,"+")};function gn(e,t,n,r){var i;if(x.isArray(t))x.each(t,function(t,i){n||pn.test(e)?r(e,i):gn(e+"["+("object"==typeof i?t:"")+"]",i,n,r)});else if(n||"object"!==x.type(t))r(e,t);else for(i in t)gn(e+"["+i+"]",t[i],n,r)}x.each("blur focus focusin focusout load resize scroll unload click dblclick mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave change select submit keydown keypress keyup error contextmenu".split(" "),function(e,t){x.fn[t]=function(e,n){return arguments.length>0?this.on(t,null,e,n):this.trigger(t)}}),x.fn.extend({hover:function(e,t){return this.mouseenter(e).mouseleave(t||e)},bind:function(e,t,n){return this.on(e,null,t,n)},unbind:function(e,t){return this.off(e,null,t)},delegate:function(e,t,n,r){return this.on(t,e,n,r)},undelegate:function(e,t,n){return 1===arguments.length?this.off(e,"**"):this.off(t,e||"**",n)}});var mn,yn,vn=x.now(),bn=/\?/,xn=/#.*$/,wn=/([?&])_=[^&]*/,Tn=/^(.*?):[ \t]*([^\r\n]*)\r?$/gm,Cn=/^(?:about|app|app-storage|.+-extension|file|res|widget):$/,Nn=/^(?:GET|HEAD)$/,kn=/^\/\//,En=/^([\w.+-]+:)(?:\/\/([^\/?#:]*)(?::(\d+)|)|)/,Sn=x.fn.load,An={},jn={},Dn="*/".concat("*");try{yn=o.href}catch(Ln){yn=a.createElement("a"),yn.href="",yn=yn.href}mn=En.exec(yn.toLowerCase())||[];function Hn(e){return function(t,n){"string"!=typeof t&&(n=t,t="*");var r,i=0,o=t.toLowerCase().match(T)||[];if(x.isFunction(n))while(r=o[i++])"+"===r[0]?(r=r.slice(1)||"*",(e[r]=e[r]||[]).unshift(n)):(e[r]=e[r]||[]).push(n)}}function qn(e,n,r,i){var o={},a=e===jn;function s(l){var u;return o[l]=!0,x.each(e[l]||[],function(e,l){var c=l(n,r,i);return"string"!=typeof c||a||o[c]?a?!(u=c):t:(n.dataTypes.unshift(c),s(c),!1)}),u}return s(n.dataTypes[0])||!o["*"]&&s("*")}function _n(e,n){var r,i,o=x.ajaxSettings.flatOptions||{};for(i in n)n[i]!==t&&((o[i]?e:r||(r={}))[i]=n[i]);return r&&x.extend(!0,e,r),e}x.fn.load=function(e,n,r){if("string"!=typeof e&&Sn)return Sn.apply(this,arguments);var i,o,a,s=this,l=e.indexOf(" ");return l>=0&&(i=e.slice(l,e.length),e=e.slice(0,l)),x.isFunction(n)?(r=n,n=t):n&&"object"==typeof n&&(a="POST"),s.length>0&&x.ajax({url:e,type:a,dataType:"html",data:n}).done(function(e){o=arguments,s.html(i?x("<div>").append(x.parseHTML(e)).find(i):e)}).complete(r&&function(e,t){s.each(r,o||[e.responseText,t,e])}),this},x.each(["ajaxStart","ajaxStop","ajaxComplete","ajaxError","ajaxSuccess","ajaxSend"],function(e,t){x.fn[t]=function(e){return this.on(t,e)}}),x.extend({active:0,lastModified:{},etag:{},ajaxSettings:{url:yn,type:"GET",isLocal:Cn.test(mn[1]),global:!0,processData:!0,async:!0,contentType:"application/x-www-form-urlencoded; charset=UTF-8",accepts:{"*":Dn,text:"text/plain",html:"text/html",xml:"application/xml, text/xml",json:"application/json, text/javascript"},contents:{xml:/xml/,html:/html/,json:/json/},responseFields:{xml:"responseXML",text:"responseText",json:"responseJSON"},converters:{"* text":String,"text html":!0,"text json":x.parseJSON,"text xml":x.parseXML},flatOptions:{url:!0,context:!0}},ajaxSetup:function(e,t){return t?_n(_n(e,x.ajaxSettings),t):_n(x.ajaxSettings,e)},ajaxPrefilter:Hn(An),ajaxTransport:Hn(jn),ajax:function(e,n){"object"==typeof e&&(n=e,e=t),n=n||{};var r,i,o,a,s,l,u,c,p=x.ajaxSetup({},n),f=p.context||p,d=p.context&&(f.nodeType||f.jquery)?x(f):x.event,h=x.Deferred(),g=x.Callbacks("once memory"),m=p.statusCode||{},y={},v={},b=0,w="canceled",C={readyState:0,getResponseHeader:function(e){var t;if(2===b){if(!c){c={};while(t=Tn.exec(a))c[t[1].toLowerCase()]=t[2]}t=c[e.toLowerCase()]}return null==t?null:t},getAllResponseHeaders:function(){return 2===b?a:null},setRequestHeader:function(e,t){var n=e.toLowerCase();return b||(e=v[n]=v[n]||e,y[e]=t),this},overrideMimeType:function(e){return b||(p.mimeType=e),this},statusCode:function(e){var t;if(e)if(2>b)for(t in e)m[t]=[m[t],e[t]];else C.always(e[C.status]);return this},abort:function(e){var t=e||w;return u&&u.abort(t),k(0,t),this}};if(h.promise(C).complete=g.add,C.success=C.done,C.error=C.fail,p.url=((e||p.url||yn)+"").replace(xn,"").replace(kn,mn[1]+"//"),p.type=n.method||n.type||p.method||p.type,p.dataTypes=x.trim(p.dataType||"*").toLowerCase().match(T)||[""],null==p.crossDomain&&(r=En.exec(p.url.toLowerCase()),p.crossDomain=!(!r||r[1]===mn[1]&&r[2]===mn[2]&&(r[3]||("http:"===r[1]?"80":"443"))===(mn[3]||("http:"===mn[1]?"80":"443")))),p.data&&p.processData&&"string"!=typeof p.data&&(p.data=x.param(p.data,p.traditional)),qn(An,p,n,C),2===b)return C;l=p.global,l&&0===x.active++&&x.event.trigger("ajaxStart"),p.type=p.type.toUpperCase(),p.hasContent=!Nn.test(p.type),o=p.url,p.hasContent||(p.data&&(o=p.url+=(bn.test(o)?"&":"?")+p.data,delete p.data),p.cache===!1&&(p.url=wn.test(o)?o.replace(wn,"$1_="+vn++):o+(bn.test(o)?"&":"?")+"_="+vn++)),p.ifModified&&(x.lastModified[o]&&C.setRequestHeader("If-Modified-Since",x.lastModified[o]),x.etag[o]&&C.setRequestHeader("If-None-Match",x.etag[o])),(p.data&&p.hasContent&&p.contentType!==!1||n.contentType)&&C.setRequestHeader("Content-Type",p.contentType),C.setRequestHeader("Accept",p.dataTypes[0]&&p.accepts[p.dataTypes[0]]?p.accepts[p.dataTypes[0]]+("*"!==p.dataTypes[0]?", "+Dn+"; q=0.01":""):p.accepts["*"]);for(i in p.headers)C.setRequestHeader(i,p.headers[i]);if(p.beforeSend&&(p.beforeSend.call(f,C,p)===!1||2===b))return C.abort();w="abort";for(i in{success:1,error:1,complete:1})C[i](p[i]);if(u=qn(jn,p,n,C)){C.readyState=1,l&&d.trigger("ajaxSend",[C,p]),p.async&&p.timeout>0&&(s=setTimeout(function(){C.abort("timeout")},p.timeout));try{b=1,u.send(y,k)}catch(N){if(!(2>b))throw N;k(-1,N)}}else k(-1,"No Transport");function k(e,n,r,i){var c,y,v,w,T,N=n;2!==b&&(b=2,s&&clearTimeout(s),u=t,a=i||"",C.readyState=e>0?4:0,c=e>=200&&300>e||304===e,r&&(w=Mn(p,C,r)),w=On(p,w,C,c),c?(p.ifModified&&(T=C.getResponseHeader("Last-Modified"),T&&(x.lastModified[o]=T),T=C.getResponseHeader("etag"),T&&(x.etag[o]=T)),204===e||"HEAD"===p.type?N="nocontent":304===e?N="notmodified":(N=w.state,y=w.data,v=w.error,c=!v)):(v=N,(e||!N)&&(N="error",0>e&&(e=0))),C.status=e,C.statusText=(n||N)+"",c?h.resolveWith(f,[y,N,C]):h.rejectWith(f,[C,N,v]),C.statusCode(m),m=t,l&&d.trigger(c?"ajaxSuccess":"ajaxError",[C,p,c?y:v]),g.fireWith(f,[C,N]),l&&(d.trigger("ajaxComplete",[C,p]),--x.active||x.event.trigger("ajaxStop")))}return C},getJSON:function(e,t,n){return x.get(e,t,n,"json")},getScript:function(e,n){return x.get(e,t,n,"script")}}),x.each(["get","post"],function(e,n){x[n]=function(e,r,i,o){return x.isFunction(r)&&(o=o||i,i=r,r=t),x.ajax({url:e,type:n,dataType:o,data:r,success:i})}});function Mn(e,n,r){var i,o,a,s,l=e.contents,u=e.dataTypes;while("*"===u[0])u.shift(),o===t&&(o=e.mimeType||n.getResponseHeader("Content-Type"));if(o)for(s in l)if(l[s]&&l[s].test(o)){u.unshift(s);break}if(u[0]in r)a=u[0];else{for(s in r){if(!u[0]||e.converters[s+" "+u[0]]){a=s;break}i||(i=s)}a=a||i}return a?(a!==u[0]&&u.unshift(a),r[a]):t}function On(e,t,n,r){var i,o,a,s,l,u={},c=e.dataTypes.slice();if(c[1])for(a in e.converters)u[a.toLowerCase()]=e.converters[a];o=c.shift();while(o)if(e.responseFields[o]&&(n[e.responseFields[o]]=t),!l&&r&&e.dataFilter&&(t=e.dataFilter(t,e.dataType)),l=o,o=c.shift())if("*"===o)o=l;else if("*"!==l&&l!==o){if(a=u[l+" "+o]||u["* "+o],!a)for(i in u)if(s=i.split(" "),s[1]===o&&(a=u[l+" "+s[0]]||u["* "+s[0]])){a===!0?a=u[i]:u[i]!==!0&&(o=s[0],c.unshift(s[1]));break}if(a!==!0)if(a&&e["throws"])t=a(t);else try{t=a(t)}catch(p){return{state:"parsererror",error:a?p:"No conversion from "+l+" to "+o}}}return{state:"success",data:t}}x.ajaxSetup({accepts:{script:"text/javascript, application/javascript, application/ecmascript, application/x-ecmascript"},contents:{script:/(?:java|ecma)script/},converters:{"text script":function(e){return x.globalEval(e),e}}}),x.ajaxPrefilter("script",function(e){e.cache===t&&(e.cache=!1),e.crossDomain&&(e.type="GET",e.global=!1)}),x.ajaxTransport("script",function(e){if(e.crossDomain){var n,r=a.head||x("head")[0]||a.documentElement;return{send:function(t,i){n=a.createElement("script"),n.async=!0,e.scriptCharset&&(n.charset=e.scriptCharset),n.src=e.url,n.onload=n.onreadystatechange=function(e,t){(t||!n.readyState||/loaded|complete/.test(n.readyState))&&(n.onload=n.onreadystatechange=null,n.parentNode&&n.parentNode.removeChild(n),n=null,t||i(200,"success"))},r.insertBefore(n,r.firstChild)},abort:function(){n&&n.onload(t,!0)}}}});var Fn=[],Bn=/(=)\?(?=&|$)|\?\?/;x.ajaxSetup({jsonp:"callback",jsonpCallback:function(){var e=Fn.pop()||x.expando+"_"+vn++;return this[e]=!0,e}}),x.ajaxPrefilter("json jsonp",function(n,r,i){var o,a,s,l=n.jsonp!==!1&&(Bn.test(n.url)?"url":"string"==typeof n.data&&!(n.contentType||"").indexOf("application/x-www-form-urlencoded")&&Bn.test(n.data)&&"data");return l||"jsonp"===n.dataTypes[0]?(o=n.jsonpCallback=x.isFunction(n.jsonpCallback)?n.jsonpCallback():n.jsonpCallback,l?n[l]=n[l].replace(Bn,"$1"+o):n.jsonp!==!1&&(n.url+=(bn.test(n.url)?"&":"?")+n.jsonp+"="+o),n.converters["script json"]=function(){return s||x.error(o+" was not called"),s[0]},n.dataTypes[0]="json",a=e[o],e[o]=function(){s=arguments},i.always(function(){e[o]=a,n[o]&&(n.jsonpCallback=r.jsonpCallback,Fn.push(o)),s&&x.isFunction(a)&&a(s[0]),s=a=t}),"script"):t});var Pn,Rn,Wn=0,$n=e.ActiveXObject&&function(){var e;for(e in Pn)Pn[e](t,!0)};function In(){try{return new e.XMLHttpRequest}catch(t){}}function zn(){try{return new e.ActiveXObject("Microsoft.XMLHTTP")}catch(t){}}x.ajaxSettings.xhr=e.ActiveXObject?function(){return!this.isLocal&&In()||zn()}:In,Rn=x.ajaxSettings.xhr(),x.support.cors=!!Rn&&"withCredentials"in Rn,Rn=x.support.ajax=!!Rn,Rn&&x.ajaxTransport(function(n){if(!n.crossDomain||x.support.cors){var r;return{send:function(i,o){var a,s,l=n.xhr();if(n.username?l.open(n.type,n.url,n.async,n.username,n.password):l.open(n.type,n.url,n.async),n.xhrFields)for(s in n.xhrFields)l[s]=n.xhrFields[s];n.mimeType&&l.overrideMimeType&&l.overrideMimeType(n.mimeType),n.crossDomain||i["X-Requested-With"]||(i["X-Requested-With"]="XMLHttpRequest");try{for(s in i)l.setRequestHeader(s,i[s])}catch(u){}l.send(n.hasContent&&n.data||null),r=function(e,i){var s,u,c,p;try{if(r&&(i||4===l.readyState))if(r=t,a&&(l.onreadystatechange=x.noop,$n&&delete Pn[a]),i)4!==l.readyState&&l.abort();else{p={},s=l.status,u=l.getAllResponseHeaders(),"string"==typeof l.responseText&&(p.text=l.responseText);try{c=l.statusText}catch(f){c=""}s||!n.isLocal||n.crossDomain?1223===s&&(s=204):s=p.text?200:404}}catch(d){i||o(-1,d)}p&&o(s,c,p,u)},n.async?4===l.readyState?setTimeout(r):(a=++Wn,$n&&(Pn||(Pn={},x(e).unload($n)),Pn[a]=r),l.onreadystatechange=r):r()},abort:function(){r&&r(t,!0)}}}});var Xn,Un,Vn=/^(?:toggle|show|hide)$/,Yn=RegExp("^(?:([+-])=|)("+w+")([a-z%]*)$","i"),Jn=/queueHooks$/,Gn=[nr],Qn={"*":[function(e,t){var n=this.createTween(e,t),r=n.cur(),i=Yn.exec(t),o=i&&i[3]||(x.cssNumber[e]?"":"px"),a=(x.cssNumber[e]||"px"!==o&&+r)&&Yn.exec(x.css(n.elem,e)),s=1,l=20;if(a&&a[3]!==o){o=o||a[3],i=i||[],a=+r||1;do s=s||".5",a/=s,x.style(n.elem,e,a+o);while(s!==(s=n.cur()/r)&&1!==s&&--l)}return i&&(a=n.start=+a||+r||0,n.unit=o,n.end=i[1]?a+(i[1]+1)*i[2]:+i[2]),n}]};function Kn(){return setTimeout(function(){Xn=t}),Xn=x.now()}function Zn(e,t,n){var r,i=(Qn[t]||[]).concat(Qn["*"]),o=0,a=i.length;for(;a>o;o++)if(r=i[o].call(n,t,e))return r}function er(e,t,n){var r,i,o=0,a=Gn.length,s=x.Deferred().always(function(){delete l.elem}),l=function(){if(i)return!1;var t=Xn||Kn(),n=Math.max(0,u.startTime+u.duration-t),r=n/u.duration||0,o=1-r,a=0,l=u.tweens.length;for(;l>a;a++)u.tweens[a].run(o);return s.notifyWith(e,[u,o,n]),1>o&&l?n:(s.resolveWith(e,[u]),!1)},u=s.promise({elem:e,props:x.extend({},t),opts:x.extend(!0,{specialEasing:{}},n),originalProperties:t,originalOptions:n,startTime:Xn||Kn(),duration:n.duration,tweens:[],createTween:function(t,n){var r=x.Tween(e,u.opts,t,n,u.opts.specialEasing[t]||u.opts.easing);return u.tweens.push(r),r},stop:function(t){var n=0,r=t?u.tweens.length:0;if(i)return this;for(i=!0;r>n;n++)u.tweens[n].run(1);return t?s.resolveWith(e,[u,t]):s.rejectWith(e,[u,t]),this}}),c=u.props;for(tr(c,u.opts.specialEasing);a>o;o++)if(r=Gn[o].call(u,e,c,u.opts))return r;return x.map(c,Zn,u),x.isFunction(u.opts.start)&&u.opts.start.call(e,u),x.fx.timer(x.extend(l,{elem:e,anim:u,queue:u.opts.queue})),u.progress(u.opts.progress).done(u.opts.done,u.opts.complete).fail(u.opts.fail).always(u.opts.always)}function tr(e,t){var n,r,i,o,a;for(n in e)if(r=x.camelCase(n),i=t[r],o=e[n],x.isArray(o)&&(i=o[1],o=e[n]=o[0]),n!==r&&(e[r]=o,delete e[n]),a=x.cssHooks[r],a&&"expand"in a){o=a.expand(o),delete e[r];for(n in o)n in e||(e[n]=o[n],t[n]=i)}else t[r]=i}x.Animation=x.extend(er,{tweener:function(e,t){x.isFunction(e)?(t=e,e=["*"]):e=e.split(" ");var n,r=0,i=e.length;for(;i>r;r++)n=e[r],Qn[n]=Qn[n]||[],Qn[n].unshift(t)},prefilter:function(e,t){t?Gn.unshift(e):Gn.push(e)}});function nr(e,t,n){var r,i,o,a,s,l,u=this,c={},p=e.style,f=e.nodeType&&nn(e),d=x._data(e,"fxshow");n.queue||(s=x._queueHooks(e,"fx"),null==s.unqueued&&(s.unqueued=0,l=s.empty.fire,s.empty.fire=function(){s.unqueued||l()}),s.unqueued++,u.always(function(){u.always(function(){s.unqueued--,x.queue(e,"fx").length||s.empty.fire()})})),1===e.nodeType&&("height"in t||"width"in t)&&(n.overflow=[p.overflow,p.overflowX,p.overflowY],"inline"===x.css(e,"display")&&"none"===x.css(e,"float")&&(x.support.inlineBlockNeedsLayout&&"inline"!==ln(e.nodeName)?p.zoom=1:p.display="inline-block")),n.overflow&&(p.overflow="hidden",x.support.shrinkWrapBlocks||u.always(function(){p.overflow=n.overflow[0],p.overflowX=n.overflow[1],p.overflowY=n.overflow[2]}));for(r in t)if(i=t[r],Vn.exec(i)){if(delete t[r],o=o||"toggle"===i,i===(f?"hide":"show"))continue;c[r]=d&&d[r]||x.style(e,r)}if(!x.isEmptyObject(c)){d?"hidden"in d&&(f=d.hidden):d=x._data(e,"fxshow",{}),o&&(d.hidden=!f),f?x(e).show():u.done(function(){x(e).hide()}),u.done(function(){var t;x._removeData(e,"fxshow");for(t in c)x.style(e,t,c[t])});for(r in c)a=Zn(f?d[r]:0,r,u),r in d||(d[r]=a.start,f&&(a.end=a.start,a.start="width"===r||"height"===r?1:0))}}function rr(e,t,n,r,i){return new rr.prototype.init(e,t,n,r,i)}x.Tween=rr,rr.prototype={constructor:rr,init:function(e,t,n,r,i,o){this.elem=e,this.prop=n,this.easing=i||"swing",this.options=t,this.start=this.now=this.cur(),this.end=r,this.unit=o||(x.cssNumber[n]?"":"px")},cur:function(){var e=rr.propHooks[this.prop];return e&&e.get?e.get(this):rr.propHooks._default.get(this)},run:function(e){var t,n=rr.propHooks[this.prop];return this.pos=t=this.options.duration?x.easing[this.easing](e,this.options.duration*e,0,1,this.options.duration):e,this.now=(this.end-this.start)*t+this.start,this.options.step&&this.options.step.call(this.elem,this.now,this),n&&n.set?n.set(this):rr.propHooks._default.set(this),this}},rr.prototype.init.prototype=rr.prototype,rr.propHooks={_default:{get:function(e){var t;return null==e.elem[e.prop]||e.elem.style&&null!=e.elem.style[e.prop]?(t=x.css(e.elem,e.prop,""),t&&"auto"!==t?t:0):e.elem[e.prop]},set:function(e){x.fx.step[e.prop]?x.fx.step[e.prop](e):e.elem.style&&(null!=e.elem.style[x.cssProps[e.prop]]||x.cssHooks[e.prop])?x.style(e.elem,e.prop,e.now+e.unit):e.elem[e.prop]=e.now}}},rr.propHooks.scrollTop=rr.propHooks.scrollLeft={set:function(e){e.elem.nodeType&&e.elem.parentNode&&(e.elem[e.prop]=e.now)}},x.each(["toggle","show","hide"],function(e,t){var n=x.fn[t];x.fn[t]=function(e,r,i){return null==e||"boolean"==typeof e?n.apply(this,arguments):this.animate(ir(t,!0),e,r,i)}}),x.fn.extend({fadeTo:function(e,t,n,r){return this.filter(nn).css("opacity",0).show().end().animate({opacity:t},e,n,r)},animate:function(e,t,n,r){var i=x.isEmptyObject(e),o=x.speed(t,n,r),a=function(){var t=er(this,x.extend({},e),o);(i||x._data(this,"finish"))&&t.stop(!0)};return a.finish=a,i||o.queue===!1?this.each(a):this.queue(o.queue,a)},stop:function(e,n,r){var i=function(e){var t=e.stop;delete e.stop,t(r)};return"string"!=typeof e&&(r=n,n=e,e=t),n&&e!==!1&&this.queue(e||"fx",[]),this.each(function(){var t=!0,n=null!=e&&e+"queueHooks",o=x.timers,a=x._data(this);if(n)a[n]&&a[n].stop&&i(a[n]);else for(n in a)a[n]&&a[n].stop&&Jn.test(n)&&i(a[n]);for(n=o.length;n--;)o[n].elem!==this||null!=e&&o[n].queue!==e||(o[n].anim.stop(r),t=!1,o.splice(n,1));(t||!r)&&x.dequeue(this,e)})},finish:function(e){return e!==!1&&(e=e||"fx"),this.each(function(){var t,n=x._data(this),r=n[e+"queue"],i=n[e+"queueHooks"],o=x.timers,a=r?r.length:0;for(n.finish=!0,x.queue(this,e,[]),i&&i.stop&&i.stop.call(this,!0),t=o.length;t--;)o[t].elem===this&&o[t].queue===e&&(o[t].anim.stop(!0),o.splice(t,1));for(t=0;a>t;t++)r[t]&&r[t].finish&&r[t].finish.call(this);delete n.finish})}});function ir(e,t){var n,r={height:e},i=0;for(t=t?1:0;4>i;i+=2-t)n=Zt[i],r["margin"+n]=r["padding"+n]=e;return t&&(r.opacity=r.width=e),r}x.each({slideDown:ir("show"),slideUp:ir("hide"),slideToggle:ir("toggle"),fadeIn:{opacity:"show"},fadeOut:{opacity:"hide"},fadeToggle:{opacity:"toggle"}},function(e,t){x.fn[e]=function(e,n,r){return this.animate(t,e,n,r)}}),x.speed=function(e,t,n){var r=e&&"object"==typeof e?x.extend({},e):{complete:n||!n&&t||x.isFunction(e)&&e,duration:e,easing:n&&t||t&&!x.isFunction(t)&&t};return r.duration=x.fx.off?0:"number"==typeof r.duration?r.duration:r.duration in x.fx.speeds?x.fx.speeds[r.duration]:x.fx.speeds._default,(null==r.queue||r.queue===!0)&&(r.queue="fx"),r.old=r.complete,r.complete=function(){x.isFunction(r.old)&&r.old.call(this),r.queue&&x.dequeue(this,r.queue)},r},x.easing={linear:function(e){return e},swing:function(e){return.5-Math.cos(e*Math.PI)/2}},x.timers=[],x.fx=rr.prototype.init,x.fx.tick=function(){var e,n=x.timers,r=0;for(Xn=x.now();n.length>r;r++)e=n[r],e()||n[r]!==e||n.splice(r--,1);n.length||x.fx.stop(),Xn=t},x.fx.timer=function(e){e()&&x.timers.push(e)&&x.fx.start()},x.fx.interval=13,x.fx.start=function(){Un||(Un=setInterval(x.fx.tick,x.fx.interval))},x.fx.stop=function(){clearInterval(Un),Un=null},x.fx.speeds={slow:600,fast:200,_default:400},x.fx.step={},x.expr&&x.expr.filters&&(x.expr.filters.animated=function(e){return x.grep(x.timers,function(t){return e===t.elem}).length}),x.fn.offset=function(e){if(arguments.length)return e===t?this:this.each(function(t){x.offset.setOffset(this,e,t)});var n,r,o={top:0,left:0},a=this[0],s=a&&a.ownerDocument;if(s)return n=s.documentElement,x.contains(n,a)?(typeof a.getBoundingClientRect!==i&&(o=a.getBoundingClientRect()),r=or(s),{top:o.top+(r.pageYOffset||n.scrollTop)-(n.clientTop||0),left:o.left+(r.pageXOffset||n.scrollLeft)-(n.clientLeft||0)}):o},x.offset={setOffset:function(e,t,n){var r=x.css(e,"position");"static"===r&&(e.style.position="relative");var i=x(e),o=i.offset(),a=x.css(e,"top"),s=x.css(e,"left"),l=("absolute"===r||"fixed"===r)&&x.inArray("auto",[a,s])>-1,u={},c={},p,f;l?(c=i.position(),p=c.top,f=c.left):(p=parseFloat(a)||0,f=parseFloat(s)||0),x.isFunction(t)&&(t=t.call(e,n,o)),null!=t.top&&(u.top=t.top-o.top+p),null!=t.left&&(u.left=t.left-o.left+f),"using"in t?t.using.call(e,u):i.css(u)}},x.fn.extend({position:function(){if(this[0]){var e,t,n={top:0,left:0},r=this[0];return"fixed"===x.css(r,"position")?t=r.getBoundingClientRect():(e=this.offsetParent(),t=this.offset(),x.nodeName(e[0],"html")||(n=e.offset()),n.top+=x.css(e[0],"borderTopWidth",!0),n.left+=x.css(e[0],"borderLeftWidth",!0)),{top:t.top-n.top-x.css(r,"marginTop",!0),left:t.left-n.left-x.css(r,"marginLeft",!0)}}},offsetParent:function(){return this.map(function(){var e=this.offsetParent||s;while(e&&!x.nodeName(e,"html")&&"static"===x.css(e,"position"))e=e.offsetParent;return e||s})}}),x.each({scrollLeft:"pageXOffset",scrollTop:"pageYOffset"},function(e,n){var r=/Y/.test(n);x.fn[e]=function(i){return x.access(this,function(e,i,o){var a=or(e);return o===t?a?n in a?a[n]:a.document.documentElement[i]:e[i]:(a?a.scrollTo(r?x(a).scrollLeft():o,r?o:x(a).scrollTop()):e[i]=o,t)},e,i,arguments.length,null)}});function or(e){return x.isWindow(e)?e:9===e.nodeType?e.defaultView||e.parentWindow:!1}x.each({Height:"height",Width:"width"},function(e,n){x.each({padding:"inner"+e,content:n,"":"outer"+e},function(r,i){x.fn[i]=function(i,o){var a=arguments.length&&(r||"boolean"!=typeof i),s=r||(i===!0||o===!0?"margin":"border");return x.access(this,function(n,r,i){var o;return x.isWindow(n)?n.document.documentElement["client"+e]:9===n.nodeType?(o=n.documentElement,Math.max(n.body["scroll"+e],o["scroll"+e],n.body["offset"+e],o["offset"+e],o["client"+e])):i===t?x.css(n,r,s):x.style(n,r,i,s)},n,a?i:t,a,null)}})}),x.fn.size=function(){return this.length},x.fn.andSelf=x.fn.addBack,"object"==typeof module&&module&&"object"==typeof module.exports?module.exports=x:(e.jQuery=e.$=x,"function"==typeof define&&define.amd&&define("jquery",[],function(){return x}))})(window);

//     Backbone.js 1.0.0

//     (c) 2010-2013 Jeremy Ashkenas, DocumentCloud Inc.
//     Backbone may be freely distributed under the MIT license.
//     For all details and documentation:
//     http://backbonejs.org

(function(root, factory) {
  // Set up Backbone appropriately for the environment.
  if (typeof exports !== 'undefined') {
    // Node/CommonJS, no need for jQuery in that case.
    factory(root, exports, require('underscore'));
  } else if (typeof define === 'function' && define.amd) {
    // AMD
    define('backbone',['underscore', 'jquery', 'exports'], function(_, $, exports) {
      // Export global even in AMD case in case this script is loaded with
      // others that may still expect a global Backbone.
      root.Backbone = factory(root, exports, _, $);
    });
  } else {
    // Browser globals
    root.Backbone = factory(root, {}, root._, (root.jQuery || root.Zepto || root.ender || root.$));
  }
}(this, function(root, Backbone, _, $) {

  // Initial Setup
  // -------------

  // Save the previous value of the `Backbone` variable, so that it can be
  // restored later on, if `noConflict` is used.
  var previousBackbone = root.Backbone;

  // Create local references to array methods we'll want to use later.
  var array = [];
  var push = array.push;
  var slice = array.slice;
  var splice = array.splice;

  // Current version of the library. Keep in sync with `package.json`.
  Backbone.VERSION = '1.0.0';

  // For Backbone's purposes, jQuery, Zepto, or Ender owns the `$` variable.
  Backbone.$ = $;

  // Runs Backbone.js in *noConflict* mode, returning the `Backbone` variable
  // to its previous owner. Returns a reference to this Backbone object.
  Backbone.noConflict = function() {
    root.Backbone = previousBackbone;
    return this;
  };

  // Turn on `emulateHTTP` to support legacy HTTP servers. Setting this option
  // will fake `"PUT"` and `"DELETE"` requests via the `_method` parameter and
  // set a `X-Http-Method-Override` header.
  Backbone.emulateHTTP = false;

  // Turn on `emulateJSON` to support legacy servers that can't deal with direct
  // `application/json` requests ... will encode the body as
  // `application/x-www-form-urlencoded` instead and will send the model in a
  // form param named `model`.
  Backbone.emulateJSON = false;

  // Backbone.Events
  // ---------------

  // A module that can be mixed in to *any object* in order to provide it with
  // custom events. You may bind with `on` or remove with `off` callback
  // functions to an event; `trigger`-ing an event fires all callbacks in
  // succession.
  //
  //     var object = {};
  //     _.extend(object, Backbone.Events);
  //     object.on('expand', function(){ alert('expanded'); });
  //     object.trigger('expand');
  //
  var Events = Backbone.Events = {

    // Bind an event to a `callback` function. Passing `"all"` will bind
    // the callback to all events fired.
    on: function(name, callback, context) {
      if (!eventsApi(this, 'on', name, [callback, context]) || !callback) return this;
      this._events || (this._events = {});
      var events = this._events[name] || (this._events[name] = []);
      events.push({callback: callback, context: context, ctx: context || this});
      return this;
    },

    // Bind an event to only be triggered a single time. After the first time
    // the callback is invoked, it will be removed.
    once: function(name, callback, context) {
      if (!eventsApi(this, 'once', name, [callback, context]) || !callback) return this;
      var self = this;
      var once = _.once(function() {
        self.off(name, once);
        callback.apply(this, arguments);
      });
      once._callback = callback;
      return this.on(name, once, context);
    },

    // Remove one or many callbacks. If `context` is null, removes all
    // callbacks with that function. If `callback` is null, removes all
    // callbacks for the event. If `name` is null, removes all bound
    // callbacks for all events.
    off: function(name, callback, context) {
      var retain, ev, events, names, i, l, j, k;
      if (!this._events || !eventsApi(this, 'off', name, [callback, context])) return this;
      if (!name && !callback && !context) {
        this._events = {};
        return this;
      }

      names = name ? [name] : _.keys(this._events);
      for (i = 0, l = names.length; i < l; i++) {
        name = names[i];
        if (events = this._events[name]) {
          this._events[name] = retain = [];
          if (callback || context) {
            for (j = 0, k = events.length; j < k; j++) {
              ev = events[j];
              if ((callback && callback !== ev.callback && callback !== ev.callback._callback) ||
                  (context && context !== ev.context)) {
                retain.push(ev);
              }
            }
          }
          if (!retain.length) delete this._events[name];
        }
      }

      return this;
    },

    // Trigger one or many events, firing all bound callbacks. Callbacks are
    // passed the same arguments as `trigger` is, apart from the event name
    // (unless you're listening on `"all"`, which will cause your callback to
    // receive the true name of the event as the first argument).
    trigger: function(name) {
      if (!this._events) return this;
      var args = slice.call(arguments, 1);
      if (!eventsApi(this, 'trigger', name, args)) return this;
      var events = this._events[name];
      var allEvents = this._events.all;
      if (events) triggerEvents(events, args);
      if (allEvents) triggerEvents(allEvents, arguments);
      return this;
    },

    // Tell this object to stop listening to either specific events ... or
    // to every object it's currently listening to.
    stopListening: function(obj, name, callback) {
      var listeners = this._listeners;
      if (!listeners) return this;
      var deleteListener = !name && !callback;
      if (typeof name === 'object') callback = this;
      if (obj) (listeners = {})[obj._listenerId] = obj;
      for (var id in listeners) {
        listeners[id].off(name, callback, this);
        if (deleteListener) delete this._listeners[id];
      }
      return this;
    }

  };

  // Regular expression used to split event strings.
  var eventSplitter = /\s+/;

  // Implement fancy features of the Events API such as multiple event
  // names `"change blur"` and jQuery-style event maps `{change: action}`
  // in terms of the existing API.
  var eventsApi = function(obj, action, name, rest) {
    if (!name) return true;

    // Handle event maps.
    if (typeof name === 'object') {
      for (var key in name) {
        obj[action].apply(obj, [key, name[key]].concat(rest));
      }
      return false;
    }

    // Handle space separated event names.
    if (eventSplitter.test(name)) {
      var names = name.split(eventSplitter);
      for (var i = 0, l = names.length; i < l; i++) {
        obj[action].apply(obj, [names[i]].concat(rest));
      }
      return false;
    }

    return true;
  };

  // A difficult-to-believe, but optimized internal dispatch function for
  // triggering events. Tries to keep the usual cases speedy (most internal
  // Backbone events have 3 arguments).
  var triggerEvents = function(events, args) {
    var ev, i = -1, l = events.length, a1 = args[0], a2 = args[1], a3 = args[2];
    switch (args.length) {
      case 0: while (++i < l) (ev = events[i]).callback.call(ev.ctx); return;
      case 1: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1); return;
      case 2: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1, a2); return;
      case 3: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1, a2, a3); return;
      default: while (++i < l) (ev = events[i]).callback.apply(ev.ctx, args);
    }
  };

  var listenMethods = {listenTo: 'on', listenToOnce: 'once'};

  // Inversion-of-control versions of `on` and `once`. Tell *this* object to
  // listen to an event in another object ... keeping track of what it's
  // listening to.
  _.each(listenMethods, function(implementation, method) {
    Events[method] = function(obj, name, callback) {
      var listeners = this._listeners || (this._listeners = {});
      var id = obj._listenerId || (obj._listenerId = _.uniqueId('l'));
      listeners[id] = obj;
      if (typeof name === 'object') callback = this;
      obj[implementation](name, callback, this);
      return this;
    };
  });

  // Aliases for backwards compatibility.
  Events.bind   = Events.on;
  Events.unbind = Events.off;

  // Allow the `Backbone` object to serve as a global event bus, for folks who
  // want global "pubsub" in a convenient place.
  _.extend(Backbone, Events);

  // Backbone.Model
  // --------------

  // Backbone **Models** are the basic data object in the framework --
  // frequently representing a row in a table in a database on your server.
  // A discrete chunk of data and a bunch of useful, related methods for
  // performing computations and transformations on that data.

  // Create a new model with the specified attributes. A client id (`cid`)
  // is automatically generated and assigned for you.
  var Model = Backbone.Model = function(attributes, options) {
    var defaults;
    var attrs = attributes || {};
    options || (options = {});
    this.cid = _.uniqueId('c');
    this.attributes = {};
    _.extend(this, _.pick(options, modelOptions));
    if (options.parse) attrs = this.parse(attrs, options) || {};
    if (defaults = _.result(this, 'defaults')) {
      attrs = _.defaults({}, attrs, defaults);
    }
    this.set(attrs, options);
    this.changed = {};
    this.initialize.apply(this, arguments);
  };

  // A list of options to be attached directly to the model, if provided.
  var modelOptions = ['url', 'urlRoot', 'collection'];

  // Attach all inheritable methods to the Model prototype.
  _.extend(Model.prototype, Events, {

    // A hash of attributes whose current and previous value differ.
    changed: null,

    // The value returned during the last failed validation.
    validationError: null,

    // The default name for the JSON `id` attribute is `"id"`. MongoDB and
    // CouchDB users may want to set this to `"_id"`.
    idAttribute: 'id',

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // Return a copy of the model's `attributes` object.
    toJSON: function(options) {
      return _.clone(this.attributes);
    },

    // Proxy `Backbone.sync` by default -- but override this if you need
    // custom syncing semantics for *this* particular model.
    sync: function() {
      return Backbone.sync.apply(this, arguments);
    },

    // Get the value of an attribute.
    get: function(attr) {
      return this.attributes[attr];
    },

    // Get the HTML-escaped value of an attribute.
    escape: function(attr) {
      return _.escape(this.get(attr));
    },

    // Returns `true` if the attribute contains a value that is not null
    // or undefined.
    has: function(attr) {
      return this.get(attr) != null;
    },

    // Set a hash of model attributes on the object, firing `"change"`. This is
    // the core primitive operation of a model, updating the data and notifying
    // anyone who needs to know about the change in state. The heart of the beast.
    set: function(key, val, options) {
      var attr, attrs, unset, changes, silent, changing, prev, current;
      if (key == null) return this;

      // Handle both `"key", value` and `{key: value}` -style arguments.
      if (typeof key === 'object') {
        attrs = key;
        options = val;
      } else {
        (attrs = {})[key] = val;
      }

      options || (options = {});

      // Run validation.
      if (!this._validate(attrs, options)) return false;

      // Extract attributes and options.
      unset           = options.unset;
      silent          = options.silent;
      changes         = [];
      changing        = this._changing;
      this._changing  = true;

      if (!changing) {
        this._previousAttributes = _.clone(this.attributes);
        this.changed = {};
      }
      current = this.attributes, prev = this._previousAttributes;

      // Check for changes of `id`.
      if (this.idAttribute in attrs) this.id = attrs[this.idAttribute];

      // For each `set` attribute, update or delete the current value.
      for (attr in attrs) {
        val = attrs[attr];
        if (!_.isEqual(current[attr], val)) changes.push(attr);
        if (!_.isEqual(prev[attr], val)) {
          this.changed[attr] = val;
        } else {
          delete this.changed[attr];
        }
        unset ? delete current[attr] : current[attr] = val;
      }

      // Trigger all relevant attribute changes.
      if (!silent) {
        if (changes.length) this._pending = true;
        for (var i = 0, l = changes.length; i < l; i++) {
          this.trigger('change:' + changes[i], this, current[changes[i]], options);
        }
      }

      // You might be wondering why there's a `while` loop here. Changes can
      // be recursively nested within `"change"` events.
      if (changing) return this;
      if (!silent) {
        while (this._pending) {
          this._pending = false;
          this.trigger('change', this, options);
        }
      }
      this._pending = false;
      this._changing = false;
      return this;
    },

    // Remove an attribute from the model, firing `"change"`. `unset` is a noop
    // if the attribute doesn't exist.
    unset: function(attr, options) {
      return this.set(attr, void 0, _.extend({}, options, {unset: true}));
    },

    // Clear all attributes on the model, firing `"change"`.
    clear: function(options) {
      var attrs = {};
      for (var key in this.attributes) attrs[key] = void 0;
      return this.set(attrs, _.extend({}, options, {unset: true}));
    },

    // Determine if the model has changed since the last `"change"` event.
    // If you specify an attribute name, determine if that attribute has changed.
    hasChanged: function(attr) {
      if (attr == null) return !_.isEmpty(this.changed);
      return _.has(this.changed, attr);
    },

    // Return an object containing all the attributes that have changed, or
    // false if there are no changed attributes. Useful for determining what
    // parts of a view need to be updated and/or what attributes need to be
    // persisted to the server. Unset attributes will be set to undefined.
    // You can also pass an attributes object to diff against the model,
    // determining if there *would be* a change.
    changedAttributes: function(diff) {
      if (!diff) return this.hasChanged() ? _.clone(this.changed) : false;
      var val, changed = false;
      var old = this._changing ? this._previousAttributes : this.attributes;
      for (var attr in diff) {
        if (_.isEqual(old[attr], (val = diff[attr]))) continue;
        (changed || (changed = {}))[attr] = val;
      }
      return changed;
    },

    // Get the previous value of an attribute, recorded at the time the last
    // `"change"` event was fired.
    previous: function(attr) {
      if (attr == null || !this._previousAttributes) return null;
      return this._previousAttributes[attr];
    },

    // Get all of the attributes of the model at the time of the previous
    // `"change"` event.
    previousAttributes: function() {
      return _.clone(this._previousAttributes);
    },

    // Fetch the model from the server. If the server's representation of the
    // model differs from its current attributes, they will be overridden,
    // triggering a `"change"` event.
    fetch: function(options) {
      options = options ? _.clone(options) : {};
      if (options.parse === void 0) options.parse = true;
      var model = this;
      var success = options.success;
      options.success = function(resp) {
        if (!model.set(model.parse(resp, options), options)) return false;
        if (success) success(model, resp, options);
        model.trigger('sync', model, resp, options);
      };
      wrapError(this, options);
      return this.sync('read', this, options);
    },

    // Set a hash of model attributes, and sync the model to the server.
    // If the server returns an attributes hash that differs, the model's
    // state will be `set` again.
    save: function(key, val, options) {
      var attrs, method, xhr, attributes = this.attributes;

      // Handle both `"key", value` and `{key: value}` -style arguments.
      if (key == null || typeof key === 'object') {
        attrs = key;
        options = val;
      } else {
        (attrs = {})[key] = val;
      }

      // If we're not waiting and attributes exist, save acts as `set(attr).save(null, opts)`.
      if (attrs && (!options || !options.wait) && !this.set(attrs, options)) return false;

      options = _.extend({validate: true}, options);

      // Do not persist invalid models.
      if (!this._validate(attrs, options)) return false;

      // Set temporary attributes if `{wait: true}`.
      if (attrs && options.wait) {
        this.attributes = _.extend({}, attributes, attrs);
      }

      // After a successful server-side save, the client is (optionally)
      // updated with the server-side state.
      if (options.parse === void 0) options.parse = true;
      var model = this;
      var success = options.success;
      options.success = function(resp) {
        // Ensure attributes are restored during synchronous saves.
        model.attributes = attributes;
        var serverAttrs = model.parse(resp, options);
        if (options.wait) serverAttrs = _.extend(attrs || {}, serverAttrs);
        if (_.isObject(serverAttrs) && !model.set(serverAttrs, options)) {
          return false;
        }
        if (success) success(model, resp, options);
        model.trigger('sync', model, resp, options);
      };
      wrapError(this, options);

      method = this.isNew() ? 'create' : (options.patch ? 'patch' : 'update');
      if (method === 'patch') options.attrs = attrs;
      xhr = this.sync(method, this, options);

      // Restore attributes.
      if (attrs && options.wait) this.attributes = attributes;

      return xhr;
    },

    // Destroy this model on the server if it was already persisted.
    // Optimistically removes the model from its collection, if it has one.
    // If `wait: true` is passed, waits for the server to respond before removal.
    destroy: function(options) {
      options = options ? _.clone(options) : {};
      var model = this;
      var success = options.success;

      var destroy = function() {
        model.trigger('destroy', model, model.collection, options);
      };

      options.success = function(resp) {
        if (options.wait || model.isNew()) destroy();
        if (success) success(model, resp, options);
        if (!model.isNew()) model.trigger('sync', model, resp, options);
      };

      if (this.isNew()) {
        options.success();
        return false;
      }
      wrapError(this, options);

      var xhr = this.sync('delete', this, options);
      if (!options.wait) destroy();
      return xhr;
    },

    // Default URL for the model's representation on the server -- if you're
    // using Backbone's restful methods, override this to change the endpoint
    // that will be called.
    url: function() {
      var base = _.result(this, 'urlRoot') || _.result(this.collection, 'url') || urlError();
      if (this.isNew()) return base;
      return base + (base.charAt(base.length - 1) === '/' ? '' : '/') + encodeURIComponent(this.id);
    },

    // **parse** converts a response into the hash of attributes to be `set` on
    // the model. The default implementation is just to pass the response along.
    parse: function(resp, options) {
      return resp;
    },

    // Create a new model with identical attributes to this one.
    clone: function() {
      return new this.constructor(this.attributes);
    },

    // A model is new if it has never been saved to the server, and lacks an id.
    isNew: function() {
      return this.id == null;
    },

    // Check if the model is currently in a valid state.
    isValid: function(options) {
      return this._validate({}, _.extend(options || {}, { validate: true }));
    },

    // Run validation against the next complete set of model attributes,
    // returning `true` if all is well. Otherwise, fire an `"invalid"` event.
    _validate: function(attrs, options) {
      if (!options.validate || !this.validate) return true;
      attrs = _.extend({}, this.attributes, attrs);
      var error = this.validationError = this.validate(attrs, options) || null;
      if (!error) return true;
      this.trigger('invalid', this, error, _.extend(options || {}, {validationError: error}));
      return false;
    }

  });

  // Underscore methods that we want to implement on the Model.
  var modelMethods = ['keys', 'values', 'pairs', 'invert', 'pick', 'omit'];

  // Mix in each Underscore method as a proxy to `Model#attributes`.
  _.each(modelMethods, function(method) {
    Model.prototype[method] = function() {
      var args = slice.call(arguments);
      args.unshift(this.attributes);
      return _[method].apply(_, args);
    };
  });

  // Backbone.Collection
  // -------------------

  // If models tend to represent a single row of data, a Backbone Collection is
  // more analagous to a table full of data ... or a small slice or page of that
  // table, or a collection of rows that belong together for a particular reason
  // -- all of the messages in this particular folder, all of the documents
  // belonging to this particular author, and so on. Collections maintain
  // indexes of their models, both in order, and for lookup by `id`.

  // Create a new **Collection**, perhaps to contain a specific type of `model`.
  // If a `comparator` is specified, the Collection will maintain
  // its models in sort order, as they're added and removed.
  var Collection = Backbone.Collection = function(models, options) {
    options || (options = {});
    if (options.url) this.url = options.url;
    if (options.model) this.model = options.model;
    if (options.comparator !== void 0) this.comparator = options.comparator;
    this._reset();
    this.initialize.apply(this, arguments);
    if (models) this.reset(models, _.extend({silent: true}, options));
  };

  // Default options for `Collection#set`.
  var setOptions = {add: true, remove: true, merge: true};
  var addOptions = {add: true, merge: false, remove: false};

  // Define the Collection's inheritable methods.
  _.extend(Collection.prototype, Events, {

    // The default model for a collection is just a **Backbone.Model**.
    // This should be overridden in most cases.
    model: Model,

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // The JSON representation of a Collection is an array of the
    // models' attributes.
    toJSON: function(options) {
      return this.map(function(model){ return model.toJSON(options); });
    },

    // Proxy `Backbone.sync` by default.
    sync: function() {
      return Backbone.sync.apply(this, arguments);
    },

    // Add a model, or list of models to the set.
    add: function(models, options) {
      return this.set(models, _.defaults(options || {}, addOptions));
    },

    // Remove a model, or a list of models from the set.
    remove: function(models, options) {
      models = _.isArray(models) ? models.slice() : [models];
      options || (options = {});
      var i, l, index, model;
      for (i = 0, l = models.length; i < l; i++) {
        model = this.get(models[i]);
        if (!model) continue;
        delete this._byId[model.id];
        delete this._byId[model.cid];
        index = this.indexOf(model);
        this.models.splice(index, 1);
        this.length--;
        if (!options.silent) {
          options.index = index;
          model.trigger('remove', model, this, options);
        }
        this._removeReference(model);
      }
      return this;
    },

    // Update a collection by `set`-ing a new list of models, adding new ones,
    // removing models that are no longer present, and merging models that
    // already exist in the collection, as necessary. Similar to **Model#set**,
    // the core operation for updating the data contained by the collection.
    set: function(models, options) {
      options = _.defaults(options || {}, setOptions);
      if (options.parse) models = this.parse(models, options);
      if (!_.isArray(models)) models = models ? [models] : [];
      var i, l, model, attrs, existing, sort;
      var at = options.at;
      var sortable = this.comparator && (at == null) && options.sort !== false;
      var sortAttr = _.isString(this.comparator) ? this.comparator : null;
      var toAdd = [], toRemove = [], modelMap = {};

      // Turn bare objects into model references, and prevent invalid models
      // from being added.
      for (i = 0, l = models.length; i < l; i++) {
        if (!(model = this._prepareModel(models[i], options))) continue;

        // If a duplicate is found, prevent it from being added and
        // optionally merge it into the existing model.
        if (existing = this.get(model)) {
          if (options.remove) modelMap[existing.cid] = true;
          if (options.merge) {
            existing.set(model.attributes, options);
            if (sortable && !sort && existing.hasChanged(sortAttr)) sort = true;
          }

        // This is a new model, push it to the `toAdd` list.
        } else if (options.add) {
          toAdd.push(model);

          // Listen to added models' events, and index models for lookup by
          // `id` and by `cid`.
          model.on('all', this._onModelEvent, this);
          this._byId[model.cid] = model;
          if (model.id != null) this._byId[model.id] = model;
        }
      }

      // Remove nonexistent models if appropriate.
      if (options.remove) {
        for (i = 0, l = this.length; i < l; ++i) {
          if (!modelMap[(model = this.models[i]).cid]) toRemove.push(model);
        }
        if (toRemove.length) this.remove(toRemove, options);
      }

      // See if sorting is needed, update `length` and splice in new models.
      if (toAdd.length) {
        if (sortable) sort = true;
        this.length += toAdd.length;
        if (at != null) {
          splice.apply(this.models, [at, 0].concat(toAdd));
        } else {
          push.apply(this.models, toAdd);
        }
      }

      // Silently sort the collection if appropriate.
      if (sort) this.sort({silent: true});

      if (options.silent) return this;

      // Trigger `add` events.
      for (i = 0, l = toAdd.length; i < l; i++) {
        (model = toAdd[i]).trigger('add', model, this, options);
      }

      // Trigger `sort` if the collection was sorted.
      if (sort) this.trigger('sort', this, options);
      return this;
    },

    // When you have more items than you want to add or remove individually,
    // you can reset the entire set with a new list of models, without firing
    // any granular `add` or `remove` events. Fires `reset` when finished.
    // Useful for bulk operations and optimizations.
    reset: function(models, options) {
      options || (options = {});
      for (var i = 0, l = this.models.length; i < l; i++) {
        this._removeReference(this.models[i]);
      }
      options.previousModels = this.models;
      this._reset();
      this.add(models, _.extend({silent: true}, options));
      if (!options.silent) this.trigger('reset', this, options);
      return this;
    },

    // Add a model to the end of the collection.
    push: function(model, options) {
      model = this._prepareModel(model, options);
      this.add(model, _.extend({at: this.length}, options));
      return model;
    },

    // Remove a model from the end of the collection.
    pop: function(options) {
      var model = this.at(this.length - 1);
      this.remove(model, options);
      return model;
    },

    // Add a model to the beginning of the collection.
    unshift: function(model, options) {
      model = this._prepareModel(model, options);
      this.add(model, _.extend({at: 0}, options));
      return model;
    },

    // Remove a model from the beginning of the collection.
    shift: function(options) {
      var model = this.at(0);
      this.remove(model, options);
      return model;
    },

    // Slice out a sub-array of models from the collection.
    slice: function(begin, end) {
      return this.models.slice(begin, end);
    },

    // Get a model from the set by id.
    get: function(obj) {
      if (obj == null) return void 0;
      return this._byId[obj.id != null ? obj.id : obj.cid || obj];
    },

    // Get the model at the given index.
    at: function(index) {
      return this.models[index];
    },

    // Return models with matching attributes. Useful for simple cases of
    // `filter`.
    where: function(attrs, first) {
      if (_.isEmpty(attrs)) return first ? void 0 : [];
      return this[first ? 'find' : 'filter'](function(model) {
        for (var key in attrs) {
          if (attrs[key] !== model.get(key)) return false;
        }
        return true;
      });
    },

    // Return the first model with matching attributes. Useful for simple cases
    // of `find`.
    findWhere: function(attrs) {
      return this.where(attrs, true);
    },

    // Force the collection to re-sort itself. You don't need to call this under
    // normal circumstances, as the set will maintain sort order as each item
    // is added.
    sort: function(options) {
      if (!this.comparator) throw new Error('Cannot sort a set without a comparator');
      options || (options = {});

      // Run sort based on type of `comparator`.
      if (_.isString(this.comparator) || this.comparator.length === 1) {
        this.models = this.sortBy(this.comparator, this);
      } else {
        this.models.sort(_.bind(this.comparator, this));
      }

      if (!options.silent) this.trigger('sort', this, options);
      return this;
    },

    // Figure out the smallest index at which a model should be inserted so as
    // to maintain order.
    sortedIndex: function(model, value, context) {
      value || (value = this.comparator);
      var iterator = _.isFunction(value) ? value : function(model) {
        return model.get(value);
      };
      return _.sortedIndex(this.models, model, iterator, context);
    },

    // Pluck an attribute from each model in the collection.
    pluck: function(attr) {
      return _.invoke(this.models, 'get', attr);
    },

    // Fetch the default set of models for this collection, resetting the
    // collection when they arrive. If `reset: true` is passed, the response
    // data will be passed through the `reset` method instead of `set`.
    fetch: function(options) {
      options = options ? _.clone(options) : {};
      if (options.parse === void 0) options.parse = true;
      var success = options.success;
      var collection = this;
      options.success = function(resp) {
        var method = options.reset ? 'reset' : 'set';
        collection[method](resp, options);
        if (success) success(collection, resp, options);
        collection.trigger('sync', collection, resp, options);
      };
      wrapError(this, options);
      return this.sync('read', this, options);
    },

    // Create a new instance of a model in this collection. Add the model to the
    // collection immediately, unless `wait: true` is passed, in which case we
    // wait for the server to agree.
    create: function(model, options) {
      options = options ? _.clone(options) : {};
      if (!(model = this._prepareModel(model, options))) return false;
      if (!options.wait) this.add(model, options);
      var collection = this;
      var success = options.success;
      options.success = function(resp) {
        if (options.wait) collection.add(model, options);
        if (success) success(model, resp, options);
      };
      model.save(null, options);
      return model;
    },

    // **parse** converts a response into a list of models to be added to the
    // collection. The default implementation is just to pass it through.
    parse: function(resp, options) {
      return resp;
    },

    // Create a new collection with an identical list of models as this one.
    clone: function() {
      return new this.constructor(this.models);
    },

    // Private method to reset all internal state. Called when the collection
    // is first initialized or reset.
    _reset: function() {
      this.length = 0;
      this.models = [];
      this._byId  = {};
    },

    // Prepare a hash of attributes (or other model) to be added to this
    // collection.
    _prepareModel: function(attrs, options) {
      if (attrs instanceof Model) {
        if (!attrs.collection) attrs.collection = this;
        return attrs;
      }
      options || (options = {});
      options.collection = this;
      var model = new this.model(attrs, options);
      if (!model._validate(attrs, options)) {
        this.trigger('invalid', this, attrs, options);
        return false;
      }
      return model;
    },

    // Internal method to sever a model's ties to a collection.
    _removeReference: function(model) {
      if (this === model.collection) delete model.collection;
      model.off('all', this._onModelEvent, this);
    },

    // Internal method called every time a model in the set fires an event.
    // Sets need to update their indexes when models change ids. All other
    // events simply proxy through. "add" and "remove" events that originate
    // in other collections are ignored.
    _onModelEvent: function(event, model, collection, options) {
      if ((event === 'add' || event === 'remove') && collection !== this) return;
      if (event === 'destroy') this.remove(model, options);
      if (model && event === 'change:' + model.idAttribute) {
        delete this._byId[model.previous(model.idAttribute)];
        if (model.id != null) this._byId[model.id] = model;
      }
      this.trigger.apply(this, arguments);
    }

  });

  // Underscore methods that we want to implement on the Collection.
  // 90% of the core usefulness of Backbone Collections is actually implemented
  // right here:
  var methods = ['forEach', 'each', 'map', 'collect', 'reduce', 'foldl',
    'inject', 'reduceRight', 'foldr', 'find', 'detect', 'filter', 'select',
    'reject', 'every', 'all', 'some', 'any', 'include', 'contains', 'invoke',
    'max', 'min', 'toArray', 'size', 'first', 'head', 'take', 'initial', 'rest',
    'tail', 'drop', 'last', 'without', 'indexOf', 'shuffle', 'lastIndexOf',
    'isEmpty', 'chain'];

  // Mix in each Underscore method as a proxy to `Collection#models`.
  _.each(methods, function(method) {
    Collection.prototype[method] = function() {
      var args = slice.call(arguments);
      args.unshift(this.models);
      return _[method].apply(_, args);
    };
  });

  // Underscore methods that take a property name as an argument.
  var attributeMethods = ['groupBy', 'countBy', 'sortBy'];

  // Use attributes instead of properties.
  _.each(attributeMethods, function(method) {
    Collection.prototype[method] = function(value, context) {
      var iterator = _.isFunction(value) ? value : function(model) {
        return model.get(value);
      };
      return _[method](this.models, iterator, context);
    };
  });

  // Backbone.View
  // -------------

  // Backbone Views are almost more convention than they are actual code. A View
  // is simply a JavaScript object that represents a logical chunk of UI in the
  // DOM. This might be a single item, an entire list, a sidebar or panel, or
  // even the surrounding frame which wraps your whole app. Defining a chunk of
  // UI as a **View** allows you to define your DOM events declaratively, without
  // having to worry about render order ... and makes it easy for the view to
  // react to specific changes in the state of your models.

  // Creating a Backbone.View creates its initial element outside of the DOM,
  // if an existing element is not provided...
  var View = Backbone.View = function(options) {
    this.cid = _.uniqueId('view');
    this._configure(options || {});
    this._ensureElement();
    this.initialize.apply(this, arguments);
    this.delegateEvents();
  };

  // Cached regex to split keys for `delegate`.
  var delegateEventSplitter = /^(\S+)\s*(.*)$/;

  // List of view options to be merged as properties.
  var viewOptions = ['model', 'collection', 'el', 'id', 'attributes', 'className', 'tagName', 'events'];

  // Set up all inheritable **Backbone.View** properties and methods.
  _.extend(View.prototype, Events, {

    // The default `tagName` of a View's element is `"div"`.
    tagName: 'div',

    // jQuery delegate for element lookup, scoped to DOM elements within the
    // current view. This should be prefered to global lookups where possible.
    $: function(selector) {
      return this.$el.find(selector);
    },

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // **render** is the core function that your view should override, in order
    // to populate its element (`this.el`), with the appropriate HTML. The
    // convention is for **render** to always return `this`.
    render: function() {
      return this;
    },

    // Remove this view by taking the element out of the DOM, and removing any
    // applicable Backbone.Events listeners.
    remove: function() {
      this.$el.remove();
      this.stopListening();
      return this;
    },

    // Change the view's element (`this.el` property), including event
    // re-delegation.
    setElement: function(element, delegate) {
      if (this.$el) this.undelegateEvents();
      this.$el = element instanceof Backbone.$ ? element : Backbone.$(element);
      this.el = this.$el[0];
      if (delegate !== false) this.delegateEvents();
      return this;
    },

    // Set callbacks, where `this.events` is a hash of
    //
    // *{"event selector": "callback"}*
    //
    //     {
    //       'mousedown .title':  'edit',
    //       'click .button':     'save'
    //       'click .open':       function(e) { ... }
    //     }
    //
    // pairs. Callbacks will be bound to the view, with `this` set properly.
    // Uses event delegation for efficiency.
    // Omitting the selector binds the event to `this.el`.
    // This only works for delegate-able events: not `focus`, `blur`, and
    // not `change`, `submit`, and `reset` in Internet Explorer.
    delegateEvents: function(events) {
      if (!(events || (events = _.result(this, 'events')))) return this;
      this.undelegateEvents();
      for (var key in events) {
        var method = events[key];
        if (!_.isFunction(method)) method = this[events[key]];
        if (!method) continue;

        var match = key.match(delegateEventSplitter);
        var eventName = match[1], selector = match[2];
        method = _.bind(method, this);
        eventName += '.delegateEvents' + this.cid;
        if (selector === '') {
          this.$el.on(eventName, method);
        } else {
          this.$el.on(eventName, selector, method);
        }
      }
      return this;
    },

    // Clears all callbacks previously bound to the view with `delegateEvents`.
    // You usually don't need to use this, but may wish to if you have multiple
    // Backbone views attached to the same DOM element.
    undelegateEvents: function() {
      this.$el.off('.delegateEvents' + this.cid);
      return this;
    },

    // Performs the initial configuration of a View with a set of options.
    // Keys with special meaning *(e.g. model, collection, id, className)* are
    // attached directly to the view.  See `viewOptions` for an exhaustive
    // list.
    _configure: function(options) {
      if (this.options) options = _.extend({}, _.result(this, 'options'), options);
      _.extend(this, _.pick(options, viewOptions));
      this.options = options;
    },

    // Ensure that the View has a DOM element to render into.
    // If `this.el` is a string, pass it through `$()`, take the first
    // matching element, and re-assign it to `el`. Otherwise, create
    // an element from the `id`, `className` and `tagName` properties.
    _ensureElement: function() {
      if (!this.el) {
        var attrs = _.extend({}, _.result(this, 'attributes'));
        if (this.id) attrs.id = _.result(this, 'id');
        if (this.className) attrs['class'] = _.result(this, 'className');
        var $el = Backbone.$('<' + _.result(this, 'tagName') + '>').attr(attrs);
        this.setElement($el, false);
      } else {
        this.setElement(_.result(this, 'el'), false);
      }
    }

  });

  // Backbone.sync
  // -------------

  // Override this function to change the manner in which Backbone persists
  // models to the server. You will be passed the type of request, and the
  // model in question. By default, makes a RESTful Ajax request
  // to the model's `url()`. Some possible customizations could be:
  //
  // * Use `setTimeout` to batch rapid-fire updates into a single request.
  // * Send up the models as XML instead of JSON.
  // * Persist models via WebSockets instead of Ajax.
  //
  // Turn on `Backbone.emulateHTTP` in order to send `PUT` and `DELETE` requests
  // as `POST`, with a `_method` parameter containing the true HTTP method,
  // as well as all requests with the body as `application/x-www-form-urlencoded`
  // instead of `application/json` with the model in a param named `model`.
  // Useful when interfacing with server-side languages like **PHP** that make
  // it difficult to read the body of `PUT` requests.
  Backbone.sync = function(method, model, options) {
    var type = methodMap[method];

    // Default options, unless specified.
    _.defaults(options || (options = {}), {
      emulateHTTP: Backbone.emulateHTTP,
      emulateJSON: Backbone.emulateJSON
    });

    // Default JSON-request options.
    var params = {type: type, dataType: 'json'};

    // Ensure that we have a URL.
    if (!options.url) {
      params.url = _.result(model, 'url') || urlError();
    }

    // Ensure that we have the appropriate request data.
    if (options.data == null && model && (method === 'create' || method === 'update' || method === 'patch')) {
      params.contentType = 'application/json';
      params.data = JSON.stringify(options.attrs || model.toJSON(options));
    }

    // For older servers, emulate JSON by encoding the request into an HTML-form.
    if (options.emulateJSON) {
      params.contentType = 'application/x-www-form-urlencoded';
      params.data = params.data ? {model: params.data} : {};
    }

    // For older servers, emulate HTTP by mimicking the HTTP method with `_method`
    // And an `X-HTTP-Method-Override` header.
    if (options.emulateHTTP && (type === 'PUT' || type === 'DELETE' || type === 'PATCH')) {
      params.type = 'POST';
      if (options.emulateJSON) params.data._method = type;
      var beforeSend = options.beforeSend;
      options.beforeSend = function(xhr) {
        xhr.setRequestHeader('X-HTTP-Method-Override', type);
        if (beforeSend) return beforeSend.apply(this, arguments);
      };
    }

    // Don't process data on a non-GET request.
    if (params.type !== 'GET' && !options.emulateJSON) {
      params.processData = false;
    }

    // If we're sending a `PATCH` request, and we're in an old Internet Explorer
    // that still has ActiveX enabled by default, override jQuery to use that
    // for XHR instead. Remove this line when jQuery supports `PATCH` on IE8.
    if (params.type === 'PATCH' && window.ActiveXObject &&
          !(window.external && window.external.msActiveXFilteringEnabled)) {
      params.xhr = function() {
        return new ActiveXObject("Microsoft.XMLHTTP");
      };
    }

    // Make the request, allowing the user to override any Ajax options.
    var xhr = options.xhr = Backbone.ajax(_.extend(params, options));
    model.trigger('request', model, xhr, options);
    return xhr;
  };

  // Map from CRUD to HTTP for our default `Backbone.sync` implementation.
  var methodMap = {
    'create': 'POST',
    'update': 'PUT',
    'patch':  'PATCH',
    'delete': 'DELETE',
    'read':   'GET'
  };

  // Set the default implementation of `Backbone.ajax` to proxy through to `$`.
  // Override this if you'd like to use a different library.
  Backbone.ajax = function() {
    return Backbone.$.ajax.apply(Backbone.$, arguments);
  };

  // Backbone.Router
  // ---------------

  // Routers map faux-URLs to actions, and fire events when routes are
  // matched. Creating a new one sets its `routes` hash, if not set statically.
  var Router = Backbone.Router = function(options) {
    options || (options = {});
    if (options.routes) this.routes = options.routes;
    this._bindRoutes();
    this.initialize.apply(this, arguments);
  };

  // Cached regular expressions for matching named param parts and splatted
  // parts of route strings.
  var optionalParam = /\((.*?)\)/g;
  var namedParam    = /(\(\?)?:\w+/g;
  var splatParam    = /\*\w+/g;
  var escapeRegExp  = /[\-{}\[\]+?.,\\\^$|#\s]/g;

  // Set up all inheritable **Backbone.Router** properties and methods.
  _.extend(Router.prototype, Events, {

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // Manually bind a single named route to a callback. For example:
    //
    //     this.route('search/:query/p:num', 'search', function(query, num) {
    //       ...
    //     });
    //
    route: function(route, name, callback) {
      if (!_.isRegExp(route)) route = this._routeToRegExp(route);
      if (_.isFunction(name)) {
        callback = name;
        name = '';
      }
      if (!callback) callback = this[name];
      var router = this;
      Backbone.history.route(route, function(fragment) {
        var args = router._extractParameters(route, fragment);
        callback && callback.apply(router, args);
        router.trigger.apply(router, ['route:' + name].concat(args));
        router.trigger('route', name, args);
        Backbone.history.trigger('route', router, name, args);
      });
      return this;
    },

    // Simple proxy to `Backbone.history` to save a fragment into the history.
    navigate: function(fragment, options) {
      Backbone.history.navigate(fragment, options);
      return this;
    },

    // Bind all defined routes to `Backbone.history`. We have to reverse the
    // order of the routes here to support behavior where the most general
    // routes can be defined at the bottom of the route map.
    _bindRoutes: function() {
      if (!this.routes) return;
      this.routes = _.result(this, 'routes');
      var route, routes = _.keys(this.routes);
      while ((route = routes.pop()) != null) {
        this.route(route, this.routes[route]);
      }
    },

    // Convert a route string into a regular expression, suitable for matching
    // against the current location hash.
    _routeToRegExp: function(route) {
      route = route.replace(escapeRegExp, '\\$&')
                   .replace(optionalParam, '(?:$1)?')
                   .replace(namedParam, function(match, optional){
                     return optional ? match : '([^\/]+)';
                   })
                   .replace(splatParam, '(.*?)');
      return new RegExp('^' + route + '$');
    },

    // Given a route, and a URL fragment that it matches, return the array of
    // extracted decoded parameters. Empty or unmatched parameters will be
    // treated as `null` to normalize cross-browser behavior.
    _extractParameters: function(route, fragment) {
      var params = route.exec(fragment).slice(1);
      return _.map(params, function(param) {
        return param ? decodeURIComponent(param) : null;
      });
    }

  });

  // Backbone.History
  // ----------------

  // Handles cross-browser history management, based on either
  // [pushState](http://diveintohtml5.info/history.html) and real URLs, or
  // [onhashchange](https://developer.mozilla.org/en-US/docs/DOM/window.onhashchange)
  // and URL fragments. If the browser supports neither (old IE, natch),
  // falls back to polling.
  var History = Backbone.History = function() {
    this.handlers = [];
    _.bindAll(this, 'checkUrl');

    // Ensure that `History` can be used outside of the browser.
    if (typeof window !== 'undefined') {
      this.location = window.location;
      this.history = window.history;
    }
  };

  // Cached regex for stripping a leading hash/slash and trailing space.
  var routeStripper = /^[#\/]|\s+$/g;

  // Cached regex for stripping leading and trailing slashes.
  var rootStripper = /^\/+|\/+$/g;

  // Cached regex for detecting MSIE.
  var isExplorer = /msie [\w.]+/;

  // Cached regex for removing a trailing slash.
  var trailingSlash = /\/$/;

  // Has the history handling already been started?
  History.started = false;

  // Set up all inheritable **Backbone.History** properties and methods.
  _.extend(History.prototype, Events, {

    // The default interval to poll for hash changes, if necessary, is
    // twenty times a second.
    interval: 50,

    // Gets the true hash value. Cannot use location.hash directly due to bug
    // in Firefox where location.hash will always be decoded.
    getHash: function(window) {
      var match = (window || this).location.href.match(/#(.*)$/);
      return match ? match[1] : '';
    },

    // Get the cross-browser normalized URL fragment, either from the URL,
    // the hash, or the override.
    getFragment: function(fragment, forcePushState) {
      if (fragment == null) {
        if (this._hasPushState || !this._wantsHashChange || forcePushState) {
          fragment = this.location.pathname;
          var root = this.root.replace(trailingSlash, '');
          if (!fragment.indexOf(root)) fragment = fragment.substr(root.length);
        } else {
          fragment = this.getHash();
        }
      }
      return fragment.replace(routeStripper, '');
    },

    // Start the hash change handling, returning `true` if the current URL matches
    // an existing route, and `false` otherwise.
    start: function(options) {
      if (History.started) throw new Error("Backbone.history has already been started");
      History.started = true;

      // Figure out the initial configuration. Do we need an iframe?
      // Is pushState desired ... is it available?
      this.options          = _.extend({}, {root: '/'}, this.options, options);
      this.root             = this.options.root;
      this._wantsHashChange = this.options.hashChange !== false;
      this._wantsPushState  = !!this.options.pushState;
      this._hasPushState    = !!(this.options.pushState && this.history && this.history.pushState);
      var fragment          = this.getFragment();
      var docMode           = document.documentMode;
      var oldIE             = (isExplorer.exec(navigator.userAgent.toLowerCase()) && (!docMode || docMode <= 7));

      // Normalize root to always include a leading and trailing slash.
      this.root = ('/' + this.root + '/').replace(rootStripper, '/');

      if (oldIE && this._wantsHashChange) {
        this.iframe = Backbone.$('<iframe src="javascript:0" tabindex="-1" />').hide().appendTo('body')[0].contentWindow;
        this.navigate(fragment);
      }

      // Depending on whether we're using pushState or hashes, and whether
      // 'onhashchange' is supported, determine how we check the URL state.
      if (this._hasPushState) {
        Backbone.$(window).on('popstate', this.checkUrl);
      } else if (this._wantsHashChange && ('onhashchange' in window) && !oldIE) {
        Backbone.$(window).on('hashchange', this.checkUrl);
      } else if (this._wantsHashChange) {
        this._checkUrlInterval = setInterval(this.checkUrl, this.interval);
      }

      // Determine if we need to change the base url, for a pushState link
      // opened by a non-pushState browser.
      this.fragment = fragment;
      var loc = this.location;
      var atRoot = loc.pathname.replace(/[^\/]$/, '$&/') === this.root;

      // If we've started off with a route from a `pushState`-enabled browser,
      // but we're currently in a browser that doesn't support it...
      if (this._wantsHashChange && this._wantsPushState && !this._hasPushState && !atRoot) {
        this.fragment = this.getFragment(null, true);
        this.location.replace(this.root + this.location.search + '#' + this.fragment);
        // Return immediately as browser will do redirect to new url
        return true;

      // Or if we've started out with a hash-based route, but we're currently
      // in a browser where it could be `pushState`-based instead...
      } else if (this._wantsPushState && this._hasPushState && atRoot && loc.hash) {
        this.fragment = this.getHash().replace(routeStripper, '');
        this.history.replaceState({}, document.title, this.root + this.fragment + loc.search);
      }

      if (!this.options.silent) return this.loadUrl();
    },

    // Disable Backbone.history, perhaps temporarily. Not useful in a real app,
    // but possibly useful for unit testing Routers.
    stop: function() {
      Backbone.$(window).off('popstate', this.checkUrl).off('hashchange', this.checkUrl);
      clearInterval(this._checkUrlInterval);
      History.started = false;
    },

    // Add a route to be tested when the fragment changes. Routes added later
    // may override previous routes.
    route: function(route, callback) {
      this.handlers.unshift({route: route, callback: callback});
    },

    // Checks the current URL to see if it has changed, and if it has,
    // calls `loadUrl`, normalizing across the hidden iframe.
    checkUrl: function(e) {
      var current = this.getFragment();
      if (current === this.fragment && this.iframe) {
        current = this.getFragment(this.getHash(this.iframe));
      }
      if (current === this.fragment) return false;
      if (this.iframe) this.navigate(current);
      this.loadUrl() || this.loadUrl(this.getHash());
    },

    // Attempt to load the current URL fragment. If a route succeeds with a
    // match, returns `true`. If no defined routes matches the fragment,
    // returns `false`.
    loadUrl: function(fragmentOverride) {
      var fragment = this.fragment = this.getFragment(fragmentOverride);
      var matched = _.any(this.handlers, function(handler) {
        if (handler.route.test(fragment)) {
          handler.callback(fragment);
          return true;
        }
      });
      return matched;
    },

    // Save a fragment into the hash history, or replace the URL state if the
    // 'replace' option is passed. You are responsible for properly URL-encoding
    // the fragment in advance.
    //
    // The options object can contain `trigger: true` if you wish to have the
    // route callback be fired (not usually desirable), or `replace: true`, if
    // you wish to modify the current URL without adding an entry to the history.
    navigate: function(fragment, options) {
      if (!History.started) return false;
      if (!options || options === true) options = {trigger: options};
      fragment = this.getFragment(fragment || '');
      if (this.fragment === fragment) return;
      this.fragment = fragment;
      var url = this.root + fragment;

      // If pushState is available, we use it to set the fragment as a real URL.
      if (this._hasPushState) {
        this.history[options.replace ? 'replaceState' : 'pushState']({}, document.title, url);

      // If hash changes haven't been explicitly disabled, update the hash
      // fragment to store history.
      } else if (this._wantsHashChange) {
        this._updateHash(this.location, fragment, options.replace);
        if (this.iframe && (fragment !== this.getFragment(this.getHash(this.iframe)))) {
          // Opening and closing the iframe tricks IE7 and earlier to push a
          // history entry on hash-tag change.  When replace is true, we don't
          // want this.
          if(!options.replace) this.iframe.document.open().close();
          this._updateHash(this.iframe.location, fragment, options.replace);
        }

      // If you've told us that you explicitly don't want fallback hashchange-
      // based history, then `navigate` becomes a page refresh.
      } else {
        return this.location.assign(url);
      }
      if (options.trigger) this.loadUrl(fragment);
    },

    // Update the hash location, either replacing the current entry, or adding
    // a new one to the browser history.
    _updateHash: function(location, fragment, replace) {
      if (replace) {
        var href = location.href.replace(/(javascript:|#).*$/, '');
        location.replace(href + '#' + fragment);
      } else {
        // Some browsers require that `hash` contains a leading #.
        location.hash = '#' + fragment;
      }
    }

  });

  // Create the default Backbone.history.
  Backbone.history = new History;

  // Helpers
  // -------

  // Helper function to correctly set up the prototype chain, for subclasses.
  // Similar to `goog.inherits`, but uses a hash of prototype properties and
  // class properties to be extended.
  var extend = function(protoProps, staticProps) {
    var parent = this;
    var child;

    // The constructor function for the new subclass is either defined by you
    // (the "constructor" property in your `extend` definition), or defaulted
    // by us to simply call the parent's constructor.
    if (protoProps && _.has(protoProps, 'constructor')) {
      child = protoProps.constructor;
    } else {
      child = function(){ return parent.apply(this, arguments); };
    }

    // Add static properties to the constructor function, if supplied.
    _.extend(child, parent, staticProps);

    // Set the prototype chain to inherit from `parent`, without calling
    // `parent`'s constructor function.
    var Surrogate = function(){ this.constructor = child; };
    Surrogate.prototype = parent.prototype;
    child.prototype = new Surrogate;

    // Add prototype properties (instance properties) to the subclass,
    // if supplied.
    if (protoProps) _.extend(child.prototype, protoProps);

    // Set a convenience property in case the parent's prototype is needed
    // later.
    child.__super__ = parent.prototype;

    return child;
  };

  // Set up inheritance for the model, collection, router, view and history.
  Model.extend = Collection.extend = Router.extend = View.extend = History.extend = extend;

  // Throw an error when a URL is needed, and none is supplied.
  var urlError = function() {
    throw new Error('A "url" property or function must be specified');
  };

  // Wrap an optional error callback with a fallback error event.
  var wrapError = function (model, options) {
    var error = options.error;
    options.error = function(resp) {
      if (error) error(model, resp, options);
      model.trigger('error', model, resp, options);
    };
  };

  return Backbone;
}));

(function() {
  define('hilib/managers/history',['require'],function(require) {
    var History;
    History = (function() {
      function History() {}

      History.prototype.history = [];

      History.prototype.update = function() {
        if (window.location.pathname !== '/login') {
          this.history.push(window.location.pathname);
        }
        return sessionStorage.setItem('history', JSON.stringify(this.history));
      };

      History.prototype.clear = function() {
        return sessionStorage.removeItem('history');
      };

      History.prototype.last = function() {
        return this.history[this.history.length - 1];
      };

      return History;

    })();
    return new History();
  });

}).call(this);

(function() {
  define('hilib/functions/string',['require','jquery'],function(require) {
    var $;
    $ = require('jquery');
    return {
      ucfirst: function(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
      },
      /*
      	Slugify a string
      */

      slugify: function(str) {
        var from, index, strlen, to;
        from = "àáäâèéëêìíïîòóöôùúüûñç·/_:;";
        to = "aaaaeeeeiiiioooouuuunc-----";
        str = str.trim().toLowerCase();
        strlen = str.length;
        while (strlen--) {
          index = from.indexOf(str[strlen]);
          if (index !== -1) {
            str = str.substr(0, strlen) + to[index] + str.substr(strlen + 1);
          }
        }
        return str.replace(/[^a-z0-9 -]/g, '').replace(/\s+|\-+/g, '-').replace(/^\-+|\-+$/g, '');
      },
      /*
      	Strips the tags from a string
      	
      	Example: "This is a <b>string</b>." => "This is a string."
      	
      	return String
      */

      stripTags: function(str) {
        return $('<span />').html(str).text();
      },
      /*
      	Removes non numbers from a string
      	
      	Example: "Count the 12 monkeys." => "12"
      	
      	return String
      */

      onlyNumbers: function(str) {
        return str.replace(/[^\d.]/g, '');
      },
      hashCode: function(str) {
        var c, chr, hash, i, _i, _len;
        if (str.length === 0) {
          return false;
        }
        hash = 0;
        for (i = _i = 0, _len = str.length; _i < _len; i = ++_i) {
          chr = str[i];
          c = str.charCodeAt(i);
          hash = ((hash << 5) - hash) + c;
          hash = hash & hash;
        }
        return hash;
      },
      insertAt: function(str, needle, index) {
        return str.slice(0, index) + needle + str.slice(index);
      }
    };
  });

}).call(this);

(function() {
  define('hilib/managers/view',['require','backbone','hilib/functions/string'],function(require) {
    var Backbone, StringFn, ViewManager;
    Backbone = require('backbone');
    StringFn = require('hilib/functions/string');
    ViewManager = (function() {
      var cachedViews, currentViews, selfDestruct;

      function ViewManager() {}

      currentViews = {};

      cachedViews = {};

      selfDestruct = function(view) {
        if (view.destroy != null) {
          return view.destroy();
        } else {
          return view.remove();
        }
      };

      ViewManager.prototype.clear = function(view) {
        if (view != null) {
          selfDestruct(view);
          return delete currentViews[view.cid];
        } else {
          return _.each(currentViews, function(view) {
            if (!view.options.cache) {
              selfDestruct(view);
              return delete currentViews[view.cid];
            }
          });
        }
      };

      ViewManager.prototype.clearCache = function() {
        return cachedViews = {};
      };

      ViewManager.prototype.register = function(view) {
        if (view != null) {
          return currentViews[view.cid] = view;
        }
      };

      ViewManager.prototype.show = function(el, View, options) {
        var view, viewHashCode;
        if (options == null) {
          options = {};
        }
        if (_.isString(el)) {
          el = document.querySelector(el);
        }
        if (options.cache == null) {
          options.cache = true;
        }
        if (options.append == null) {
          options.append = false;
        }
        if (options.prepend == null) {
          options.prepend = false;
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
            return el.insertBefore(view.el, el.firstChild);
          } else {
            return el.appendChild(view.el);
          }
        }
      };

      return ViewManager;

    })();
    return new ViewManager();
  });

}).call(this);

(function() {
  define('hilib/mixins/pubsub',['require','backbone'],function(require) {
    var Backbone;
    Backbone = require('backbone');
    return {
      subscribe: function(ev, cb) {
        return this.listenTo(Backbone, ev, cb);
      },
      publish: function() {
        return Backbone.trigger.apply(Backbone, arguments);
      }
    };
  });

}).call(this);

(function() {
  var __hasProp = {}.hasOwnProperty;

  define('hilib/functions/general',['require','jquery'],function(require) {
    var $;
    $ = require('jquery');
    return {
      /*
      	Generates an ID that starts with a letter
      	
      	Example: "aBc12D34"
      
      	param Number length of the id
      	return String
      */

      generateID: function(length) {
        var chars, text;
        length = (length != null) && length > 0 ? length - 1 : 7;
        chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        text = chars.charAt(Math.floor(Math.random() * 52));
        while (length--) {
          text += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return text;
      },
      /*
      	Deepcopies arrays and object literals
      	
      	return Array or object
      */

      deepCopy: function(object) {
        var newEmpty;
        newEmpty = Array.isArray(object) ? [] : {};
        return $.extend(true, newEmpty, object);
      },
      timeoutWithReset: (function() {
        var timer;
        timer = null;
        return function(ms, cb, onResetFn) {
          if (timer != null) {
            if (onResetFn != null) {
              onResetFn();
            }
            clearTimeout(timer);
          }
          return timer = setTimeout((function() {
            timer = null;
            return cb();
          }), ms);
        };
      })(),
      /*
      	Highlight text between two nodes. 
      
      	Creates a span.hilite between two given nodes, surrounding the contents of the nodes
      
      	Example usage:
      	hl = Fn.highlighter
      		className: 'highlight' # optional
      		tagName: 'div' # optional
      
      	supEnter = (ev) -> hl.on
      		startNode: el.querySelector(#someid) # required
      		endNode: ev.currentTarget # required
      	supLeave = -> hl.off()
      	$(sup).hover supEnter, supLeave
      */

      highlighter: function(args) {
        var className, el, tagName;
        if (args == null) {
          args = {};
        }
        className = args.className, tagName = args.tagName;
        if (className == null) {
          className = 'hilite';
        }
        if (tagName == null) {
          tagName = 'span';
        }
        el = null;
        return {
          on: function(args) {
            var endNode, range, startNode;
            startNode = args.startNode, endNode = args.endNode;
            range = document.createRange();
            range.setStartAfter(startNode);
            range.setEndBefore(endNode);
            el = document.createElement(tagName);
            el.className = className;
            el.appendChild(range.extractContents());
            return range.insertNode(el);
          },
          off: function() {
            return $(el).replaceWith(function() {
              return $(this).contents();
            });
          }
        };
      },
      /*
      	Native alternative to jQuery's $.offset()
      
      	http://www.quirksmode.org/js/findpos.html
      */

      position: function(el, parent) {
        var left, top;
        left = 0;
        top = 0;
        while (el !== parent) {
          left += el.offsetLeft;
          top += el.offsetTop;
          el = el.offsetParent;
        }
        return {
          left: left,
          top: top
        };
      },
      boundingBox: function(el) {
        var box;
        box = $(el).offset();
        box.width = el.clientWidth;
        box.height = el.clientHeight;
        box.right = box.left + box.width;
        box.bottom = box.top + box.height;
        return box;
      },
      /*
      	Is child el a descendant of parent el?
      
      	http://stackoverflow.com/questions/2234979/how-to-check-in-javascript-if-one-element-is-a-child-of-another
      */

      isDescendant: function(parent, child) {
        var node;
        node = child.parentNode;
        while (node != null) {
          if (node === parent) {
            return true;
          }
          node = node.parentNode;
        }
        return false;
      },
      /*
      	Removes an item from an array
      */

      removeFromArray: function(arr, item) {
        var index;
        index = arr.indexOf(item);
        arr.splice(index, 1);
        return arr;
      },
      /* Escape a regular expression*/

      escapeRegExp: function(str) {
        return str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      },
      /*
      	Flattens an object
      
      	songs:
      		mary:
      			had:
      				little: 'lamb'
      
      	becomes
      
      	songs:
      		mary.had.little: 'lamb'
      
      	Taken from: http://thedersen.com/projects/backbone-validation
      */

      flattenObject: function(obj, into, prefix) {
        var k, v;
        if (into == null) {
          into = {};
        }
        if (prefix == null) {
          prefix = '';
        }
        for (k in obj) {
          if (!__hasProp.call(obj, k)) continue;
          v = obj[k];
          if (_.isObject(v) && !_.isArray(v) && !_.isFunction(v) && !(v instanceof Backbone.Model) && !(v instanceof Backbone.Collection)) {
            this.flattenObject(v, into, prefix + k + '.');
          } else {
            into[prefix + k] = v;
          }
        }
        return into;
      },
      compareJSON: function(current, changed) {
        var attr, changes, value;
        changes = {};
        for (attr in current) {
          if (!__hasProp.call(current, attr)) continue;
          value = current[attr];
          if (!changed.hasOwnProperty(attr)) {
            changes[attr] = 'removed';
          }
        }
        for (attr in changed) {
          if (!__hasProp.call(changed, attr)) continue;
          value = changed[attr];
          if (current.hasOwnProperty(attr)) {
            if (_.isArray(value) || this.isObjectLiteral(value)) {
              if (!_.isEqual(current[attr], changed[attr])) {
                changes[attr] = changed[attr];
              }
            } else {
              if (current[attr] !== changed[attr]) {
                changes[attr] = changed[attr];
              }
            }
          } else {
            changes[attr] = 'added';
          }
        }
        return changes;
      },
      isObjectLiteral: function(obj) {
        var ObjProto;
        if ((obj == null) || typeof obj !== "object") {
          return false;
        }
        ObjProto = obj;
        while (Object.getPrototypeOf(ObjProto = Object.getPrototypeOf(ObjProto)) !== null) {
          0;
        }
        return Object.getPrototypeOf(obj) === ObjProto;
      },
      getScrollPercentage: function(el) {
        var scrolledLeft, scrolledTop, totalLeft, totalTop;
        scrolledTop = el.scrollTop;
        totalTop = el.scrollHeight - el.clientHeight;
        scrolledLeft = el.scrollLeft;
        totalLeft = el.scrollWidth - el.clientWidth;
        return {
          top: Math.floor((scrolledTop / totalTop) * 100),
          left: Math.floor((scrolledLeft / totalLeft) * 100)
        };
      },
      setScrollPercentage: function(el, percentages) {
        if (percentages.top < 5) {
          percentages.top = 0;
        }
        if (percentages.top > 95) {
          percentages.top = 100;
        }
        el.scrollTop = (el.scrollHeight - el.clientHeight) * percentages.top / 100;
        return el.scrollLeft = (el.scrollWidth - el.clientWidth) * percentages.left / 100;
      },
      checkCheckboxes: function(selector, checked, baseEl) {
        var cb, checkboxes, _i, _len, _results;
        if (selector == null) {
          selector = 'input[type="checkbox"]';
        }
        if (checked == null) {
          checked = true;
        }
        if (baseEl == null) {
          baseEl = document;
        }
        checkboxes = baseEl.querySelectorAll(selector);
        _results = [];
        for (_i = 0, _len = checkboxes.length; _i < _len; _i++) {
          cb = checkboxes[_i];
          _results.push(cb.checked = checked);
        }
        return _results;
      },
      setCursorToEnd: function(textEl, windowEl) {
        var range, sel, win;
        win = windowEl != null ? windowEl : window;
        if (windowEl == null) {
          windowEl = textEl;
        }
        windowEl.focus();
        range = document.createRange();
        range.selectNodeContents(textEl);
        range.collapse(false);
        sel = win.getSelection();
        if (sel != null) {
          sel.removeAllRanges();
          return sel.addRange(range);
        }
      },
      arraySum: function(arr) {
        if (arr.length === 0) {
          return 0;
        }
        return arr.reduce(function(prev, current) {
          return current + prev;
        });
      },
      getAspectRatio: function(originalWidth, originalHeight, boxWidth, boxHeight) {
        var heightRatio, widthRatio;
        widthRatio = boxWidth / originalWidth;
        heightRatio = boxHeight / originalHeight;
        return Math.min(widthRatio, heightRatio);
      },
      hasScrollBar: function(el) {
        return el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth;
      },
      hasXScrollBar: function(el) {
        return el.scrollWidth > el.clientWidth;
      },
      hasYScrollBar: function(el) {
        return el.scrollHeight > el.clientHeight;
      }
    };
  });

}).call(this);

(function() {
  define('config',['require'],function(require) {
    return {
      'baseUrl': 'http://rest.elaborate.huygens.knaw.nl/',
      'baseURL': 'http://rest.elaborate.huygens.knaw.nl/'
    };
  });

}).call(this);

/* UP FOR REMOVAL*/


(function() {
  define('hilib/managers/pubsub',['require','backbone'],function(require) {
    var Backbone;
    Backbone = require('backbone');
    return {
      subscribe: function(ev, cb) {
        return this.listenTo(Backbone, ev, cb);
      },
      publish: function() {
        return Backbone.trigger.apply(Backbone, arguments);
      }
    };
  });

}).call(this);

(function() {
  define('hilib/managers/token',['require','backbone','underscore','hilib/managers/pubsub'],function(require) {
    var Backbone, Pubsub, Token, _;
    Backbone = require('backbone');
    _ = require('underscore');
    Pubsub = require('hilib/managers/pubsub');
    Token = (function() {
      Token.prototype.token = null;

      function Token() {
        _.extend(this, Backbone.Events);
        _.extend(this, Pubsub);
      }

      Token.prototype.set = function(token) {
        this.token = token;
        return sessionStorage.setItem('huygens_token', token);
      };

      Token.prototype.get = function() {
        if (this.token == null) {
          this.token = sessionStorage.getItem('huygens_token');
        }
        if (this.token == null) {
          return false;
        }
        return this.token;
      };

      Token.prototype.clear = function() {
        return sessionStorage.removeItem('huygens_token');
      };

      return Token;

    })();
    return new Token();
  });

}).call(this);

(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define('collections/base',['require','backbone','hilib/managers/token','hilib/mixins/pubsub'],function(require) {
    var Backbone, Base, Pubsub, token, _ref;
    Backbone = require('backbone');
    token = require('hilib/managers/token');
    Pubsub = require('hilib/mixins/pubsub');
    return Base = (function(_super) {
      __extends(Base, _super);

      function Base() {
        _ref = Base.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      Base.prototype.token = null;

      Base.prototype.initialize = function() {
        return _.extend(this, Pubsub);
      };

      Base.prototype.sync = function(method, model, options) {
        var _this = this;
        options.beforeSend = function(xhr) {
          return xhr.setRequestHeader('Authorization', "SimpleAuth " + (token.get()));
        };
        return Base.__super__.sync.call(this, method, model, options);
      };

      Base.prototype.removeById = function(id) {
        var model;
        model = this.get(id);
        return this.remove(model);
      };

      return Base;

    })(Backbone.Collection);
  });

}).call(this);

(function() {
  define('hilib/managers/ajax',['require','jquery'],function(require) {
    var $, defaultOptions;
    $ = require('jquery');
    $.support.cors = true;
    defaultOptions = {
      token: true
    };
    return {
      token: null,
      get: function(args, options) {
        if (options == null) {
          options = {};
        }
        return this.fire('get', args, options);
      },
      post: function(args, options) {
        if (options == null) {
          options = {};
        }
        return this.fire('post', args, options);
      },
      put: function(args, options) {
        if (options == null) {
          options = {};
        }
        return this.fire('put', args, options);
      },
      poll: function(args) {
        var done, dopoll, testFn, url,
          _this = this;
        url = args.url, testFn = args.testFn, done = args.done;
        dopoll = function() {
          var xhr;
          xhr = _this.get({
            url: url
          });
          return xhr.done(function(data, textStatus, jqXHR) {
            if (testFn(data)) {
              return done(data, textStatus, jqXHR);
            } else {
              return setTimeout(dopoll, 5000);
            }
          });
        };
        return dopoll();
      },
      fire: function(type, args, options) {
        var ajaxArgs,
          _this = this;
        options = $.extend({}, defaultOptions, options);
        ajaxArgs = {
          type: type,
          dataType: 'json',
          contentType: 'application/json; charset=utf-8',
          processData: false,
          crossDomain: true
        };
        if ((this.token != null) && options.token) {
          ajaxArgs.beforeSend = function(xhr) {
            return xhr.setRequestHeader('Authorization', "SimpleAuth " + _this.token);
          };
        }
        return $.ajax($.extend(ajaxArgs, args));
      }
    };
  });

}).call(this);

(function() {
  define('hilib/managers/async',['require','underscore'],function(require) {
    var Async, _;
    _ = require('underscore');
    return Async = (function() {
      function Async(names) {
        if (names == null) {
          names = [];
        }
        _.extend(this, Backbone.Events);
        this.callbacksCalled = {};
        this.register(names);
      }

      Async.prototype.register = function(names) {
        var name, _i, _len, _results;
        _results = [];
        for (_i = 0, _len = names.length; _i < _len; _i++) {
          name = names[_i];
          _results.push(this.callbacksCalled[name] = false);
        }
        return _results;
      };

      Async.prototype.called = function(name, data) {
        if (data == null) {
          data = true;
        }
        this.callbacksCalled[name] = data;
        if (_.every(this.callbacksCalled, function(called) {
          return called !== false;
        })) {
          return this.ready();
        }
      };

      Async.prototype.ready = function() {
        return this.trigger('ready', this.callbacksCalled);
      };

      return Async;

    })();
  });

}).call(this);

(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define('models/base',['require','backbone','hilib/managers/token','hilib/mixins/pubsub'],function(require) {
    var Backbone, Base, Pubsub, token, _ref;
    Backbone = require('backbone');
    token = require('hilib/managers/token');
    Pubsub = require('hilib/mixins/pubsub');
    return Base = (function(_super) {
      __extends(Base, _super);

      function Base() {
        _ref = Base.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      Base.prototype.initialize = function() {
        return _.extend(this, Pubsub);
      };

      Base.prototype.sync = function(method, model, options) {
        var _this = this;
        options.beforeSend = function(xhr) {
          return xhr.setRequestHeader('Authorization', "SimpleAuth " + (token.get()));
        };
        return Base.__super__.sync.call(this, method, model, options);
      };

      return Base;

    })(Backbone.Model);
  });

}).call(this);

(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define('models/project/settings',['require','config','hilib/managers/token','hilib/managers/ajax','models/base'],function(require) {
    var Models, ProjectSettings, ajax, config, token, _ref;
    config = require('config');
    token = require('hilib/managers/token');
    ajax = require('hilib/managers/ajax');
    Models = {
      Base: require('models/base')
    };
    return ProjectSettings = (function(_super) {
      __extends(ProjectSettings, _super);

      function ProjectSettings() {
        _ref = ProjectSettings.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      ProjectSettings.prototype.defaults = function() {
        return {
          'Project leader': '',
          'Project title': '',
          'projectType': '',
          'publicationURL': '',
          'Release date': '',
          'Start date': '',
          'Version': ''
        };
      };

      ProjectSettings.prototype.url = function() {
        return "" + config.baseUrl + "projects/" + this.projectID + "/settings";
      };

      ProjectSettings.prototype.initialize = function(attrs, options) {
        ProjectSettings.__super__.initialize.apply(this, arguments);
        return this.projectID = options.projectID;
      };

      ProjectSettings.prototype.sync = function(method, model, options) {
        var jqXHR,
          _this = this;
        if (method === 'create') {
          ajax.token = token.get();
          jqXHR = ajax.put({
            url: this.url(),
            data: JSON.stringify(this)
          });
          jqXHR.done(function(response) {
            return options.success(response);
          });
          return jqXHR.fail(function() {
            return console.error('Saving ProjectSettings failed!');
          });
        } else {
          return ProjectSettings.__super__.sync.call(this, method, model, options);
        }
      };

      return ProjectSettings;

    })(Models.Base);
  });

}).call(this);

(function() {
  define('entry.metadata',['require','config','hilib/managers/token','hilib/managers/ajax'],function(require) {
    var EntryMetadata, ajax, config, token;
    config = require('config');
    token = require('hilib/managers/token');
    ajax = require('hilib/managers/ajax');
    return EntryMetadata = (function() {
      var url;

      url = null;

      function EntryMetadata(projectID) {
        url = "" + config.baseUrl + "projects/" + projectID + "/entrymetadatafields";
      }

      EntryMetadata.prototype.fetch = function(cb) {
        var jqXHR;
        ajax.token = token.get();
        jqXHR = ajax.get({
          url: url
        });
        return jqXHR.done(function(data) {
          return cb(data);
        });
      };

      EntryMetadata.prototype.save = function(newValues, options) {
        var jqXHR,
          _this = this;
        ajax.token = token.get();
        jqXHR = ajax.put({
          url: url,
          data: JSON.stringify(newValues)
        });
        return jqXHR.done(function() {
          if (options.success != null) {
            return options.success();
          }
        });
      };

      return EntryMetadata;

    })();
  });

}).call(this);

(function() {
  define('project.user.ids',['require','config','hilib/managers/token','hilib/managers/ajax'],function(require) {
    var ProjectUserIDs, ajax, config, token;
    config = require('config');
    token = require('hilib/managers/token');
    ajax = require('hilib/managers/ajax');
    return ProjectUserIDs = (function() {
      var url;

      url = null;

      function ProjectUserIDs(projectID) {
        url = "" + config.baseUrl + "projects/" + projectID + "/projectusers";
      }

      ProjectUserIDs.prototype.fetch = function(cb) {
        var jqXHR;
        ajax.token = token.get();
        jqXHR = ajax.get({
          url: url
        });
        return jqXHR.done(function(data) {
          return cb(data);
        });
      };

      ProjectUserIDs.prototype.save = function(newValues, options) {
        var jqXHR,
          _this = this;
        if (options == null) {
          options = {};
        }
        ajax.token = token.get();
        jqXHR = ajax.put({
          url: url,
          data: JSON.stringify(newValues)
        });
        return jqXHR.done(function() {
          if (options.success != null) {
            return options.success();
          }
        });
      };

      return ProjectUserIDs;

    })();
  });

}).call(this);

(function() {
  define('project.annotationtype.ids',['require','config','hilib/managers/token','hilib/managers/ajax'],function(require) {
    var AnnotationTypeIDs, ajax, config, token;
    config = require('config');
    token = require('hilib/managers/token');
    ajax = require('hilib/managers/ajax');
    return AnnotationTypeIDs = (function() {
      var url;

      url = null;

      function AnnotationTypeIDs(projectID) {
        url = "" + config.baseUrl + "projects/" + projectID + "/annotationtypes";
      }

      AnnotationTypeIDs.prototype.fetch = function(cb) {
        var jqXHR;
        ajax.token = token.get();
        jqXHR = ajax.get({
          url: url
        });
        return jqXHR.done(function(data) {
          return cb(data);
        });
      };

      AnnotationTypeIDs.prototype.save = function(newValues, options) {
        var jqXHR,
          _this = this;
        if (options == null) {
          options = {};
        }
        ajax.token = token.get();
        jqXHR = ajax.put({
          url: url,
          data: JSON.stringify(newValues)
        });
        return jqXHR.done(function() {
          if (options.success != null) {
            return options.success();
          }
        });
      };

      return AnnotationTypeIDs;

    })();
  });

}).call(this);

(function() {
  define('hilib/mixins/model.sync',['require','hilib/managers/ajax','hilib/managers/token'],function(require) {
    var ajax, token;
    ajax = require('hilib/managers/ajax');
    token = require('hilib/managers/token');
    return {
      syncOverride: function(method, model, options) {
        var data, defaults, jqXHR, name, obj, _i, _len, _ref,
          _this = this;
        if (options.attributes != null) {
          obj = {};
          _ref = options.attributes;
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            name = _ref[_i];
            obj[name] = this.get(name);
          }
          data = JSON.stringify(obj);
        } else {
          data = JSON.stringify(model.toJSON());
        }
        defaults = {
          url: this.url(),
          dataType: 'text',
          data: data
        };
        options = $.extend(defaults, options);
        if (method === 'create') {
          ajax.token = token.get();
          jqXHR = ajax.post(options);
          jqXHR.done(function(data, textStatus, jqXHR) {
            var xhr;
            if (jqXHR.status === 201) {
              xhr = ajax.get({
                url: jqXHR.getResponseHeader('Location')
              });
              return xhr.done(function(data, textStatus, jqXHR) {
                _this.trigger('sync');
                return options.success(data);
              });
            }
          });
          return jqXHR.fail(function(response) {
            return console.log('fail', response);
          });
        } else if (method === 'update') {
          ajax.token = token.get();
          jqXHR = ajax.put(options);
          jqXHR.done(function(response) {
            return _this.trigger('sync');
          });
          return jqXHR.fail(function(response) {
            return console.log('fail', response);
          });
        }
      }
    };
  });

}).call(this);

(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define('models/entry.settings',['require','config','models/base'],function(require) {
    var EntrySettings, Models, config, _ref;
    config = require('config');
    Models = {
      Base: require('models/base')
    };
    return EntrySettings = (function(_super) {
      __extends(EntrySettings, _super);

      function EntrySettings() {
        _ref = EntrySettings.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      EntrySettings.prototype.initialize = function(models, options) {
        this.projectId = options.projectId;
        return this.entryId = options.entryId;
      };

      EntrySettings.prototype.url = function() {
        return config.baseUrl + ("projects/" + this.projectId + "/entries/" + this.entryId + "/settings");
      };

      EntrySettings.prototype.sync = function(method, model, options) {
        if (method === 'create') {
          method = 'update';
        }
        return EntrySettings.__super__.sync.apply(this, arguments);
      };

      return EntrySettings;

    })(Models.Base);
  });

}).call(this);

(function() {
  define('hilib/mixins/model.changedsincelastsave',['require'],function(require) {
    return function(attrs) {
      return {
        changedSinceLastSave: null,
        initChangedSinceLastSave: function() {
          var attr, _i, _len, _results,
            _this = this;
          this.on('sync', function() {
            return _this.changedSinceLastSave = null;
          });
          _results = [];
          for (_i = 0, _len = attrs.length; _i < _len; _i++) {
            attr = attrs[_i];
            _results.push(this.on("change:" + attr, function(model, options) {
              if (_this.changedSinceLastSave == null) {
                return _this.changedSinceLastSave = model.previousAttributes()[attr];
              }
            }));
          }
          return _results;
        },
        cancelChanges: function() {
          var attr, _i, _len;
          for (_i = 0, _len = attrs.length; _i < _len; _i++) {
            attr = attrs[_i];
            this.set(attr, this.changedSinceLastSave);
          }
          return this.changedSinceLastSave = null;
        }
      };
    };
  });

}).call(this);

(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define('models/annotation',['require','hilib/managers/ajax','hilib/managers/token','hilib/mixins/model.changedsincelastsave','config','models/base'],function(require) {
    var Annotation, Models, ajax, changedSinceLastSave, config, token, _ref;
    ajax = require('hilib/managers/ajax');
    token = require('hilib/managers/token');
    ajax.token = token.get();
    changedSinceLastSave = require('hilib/mixins/model.changedsincelastsave');
    config = require('config');
    Models = {
      Base: require('models/base')
    };
    return Annotation = (function(_super) {
      __extends(Annotation, _super);

      function Annotation() {
        _ref = Annotation.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      Annotation.prototype.urlRoot = function() {
        return config.baseUrl + ("projects/" + this.collection.projectId + "/entries/" + this.collection.entryId + "/transcriptions/" + this.collection.transcriptionId + "/annotations");
      };

      Annotation.prototype.defaults = function() {
        return {
          annotationMetadataItems: [],
          annotationNo: 'newannotation',
          annotationType: {
            id: 1
          },
          body: '',
          createdOn: '',
          creator: null,
          modifiedOn: '',
          modifier: null,
          metadata: {}
        };
      };

      Annotation.prototype.initialize = function() {
        Annotation.__super__.initialize.apply(this, arguments);
        _.extend(this, changedSinceLastSave(['body']));
        return this.initChangedSinceLastSave();
      };

      Annotation.prototype.parse = function(attrs) {
        var item, key, metadataItem, value, _i, _len, _ref1;
        if (attrs != null) {
          attrs.metadata = {};
          _ref1 = attrs.annotationType.metadataItems;
          for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
            metadataItem = _ref1[_i];
            key = metadataItem.name;
            item = _.find(attrs.annotationMetadataItems, function(item) {
              return item.annotationTypeMetadataItem.name === key;
            });
            value = item != null ? item.data : '';
            attrs.metadata[key] = value;
          }
          return attrs;
        }
      };

      Annotation.prototype.set = function(attrs, options) {
        var attr;
        if (_.isString(attrs) && attrs.substr(0, 9) === 'metadata.') {
          attr = attrs.substr(9);
          if (attr === 'type') {
            if (attr === 'type') {
              return this.trigger('change:metadata:type', parseInt(options, 10));
            }
          } else {
            return this.attributes['metadata'][attr] = options;
          }
        } else {
          return Annotation.__super__.set.apply(this, arguments);
        }
      };

      Annotation.prototype.sync = function(method, model, options) {
        var jqXHR,
          _this = this;
        if (method === 'create') {
          jqXHR = ajax.post({
            url: this.url(),
            data: JSON.stringify({
              body: this.get('body'),
              typeId: this.get('annotationType').id,
              metadata: this.get('metadata')
            }),
            dataType: 'text'
          });
          jqXHR.done(function(data, textStatus, jqXHR) {
            var xhr;
            if (jqXHR.status === 201) {
              xhr = ajax.get({
                url: jqXHR.getResponseHeader('Location')
              });
              xhr.done(function(data, textStatus, jqXHR) {
                console.log('done!');
                return options.success(data);
              });
              return xhr.fail(function() {
                return console.log(arguments);
              });
            }
          });
          return jqXHR.fail(function(a, b, c) {
            return console.log('fail', a, b, c);
          });
        } else if (method === 'update') {
          ajax.token = token.get();
          jqXHR = ajax.put({
            url: this.url(),
            data: JSON.stringify({
              body: this.get('body'),
              typeId: this.get('annotationType').id,
              metadata: this.get('metadata')
            })
          });
          jqXHR.done(function(response) {
            return options.success(response);
          });
          return jqXHR.fail(function(response) {
            return console.log('fail', response);
          });
        } else {
          return Annotation.__super__.sync.apply(this, arguments);
        }
      };

      Annotation.prototype.updateFromClone = function(clone) {
        this.set('annotationType', clone.get('annotationType'));
        return this.set('metadata', clone.get('metadata'));
      };

      return Annotation;

    })(Models.Base);
  });

}).call(this);

(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define('collections/annotations',['require','config','collections/base','models/annotation'],function(require) {
    var Annotations, Base, Models, config, _ref;
    config = require('config');
    Base = require('collections/base');
    Models = {
      Annotation: require('models/annotation')
    };
    return Annotations = (function(_super) {
      __extends(Annotations, _super);

      function Annotations() {
        _ref = Annotations.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      Annotations.prototype.model = Models.Annotation;

      Annotations.prototype.initialize = function(models, options) {
        return this.projectId = options.projectId, this.entryId = options.entryId, this.transcriptionId = options.transcriptionId, options;
      };

      Annotations.prototype.url = function() {
        return config.baseUrl + ("projects/" + this.projectId + "/entries/" + this.entryId + "/transcriptions/" + this.transcriptionId + "/annotations");
      };

      return Annotations;

    })(Base);
  });

}).call(this);

(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define('models/transcription',['require','config','hilib/managers/ajax','hilib/managers/token','hilib/mixins/model.changedsincelastsave','models/base','collections/annotations'],function(require) {
    var Collections, Models, Transcription, ajax, changedSinceLastSave, config, token, _ref;
    config = require('config');
    ajax = require('hilib/managers/ajax');
    token = require('hilib/managers/token');
    changedSinceLastSave = require('hilib/mixins/model.changedsincelastsave');
    Models = {
      Base: require('models/base')
    };
    Collections = {
      Annotations: require('collections/annotations')
    };
    return Transcription = (function(_super) {
      __extends(Transcription, _super);

      function Transcription() {
        _ref = Transcription.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      Transcription.prototype.defaults = function() {
        return {
          annotations: null,
          textLayer: '',
          title: '',
          body: ''
        };
      };

      Transcription.prototype.initialize = function() {
        Transcription.__super__.initialize.apply(this, arguments);
        _.extend(this, changedSinceLastSave(['body']));
        return this.initChangedSinceLastSave();
      };

      Transcription.prototype.set = function(attrs, options) {
        var _this = this;
        if (attrs === 'body') {
          options = options.replace(/<div><br><\/div>/g, '<br>');
          options = options.replace(/<div>(.*?)<\/div>/g, function(match, p1, offset, string) {
            return '<br>' + p1;
          });
          options.trim();
        }
        return Transcription.__super__.set.apply(this, arguments);
      };

      Transcription.prototype.sync = function(method, model, options) {
        var jqXHR,
          _this = this;
        if (method === 'create') {
          ajax.token = token.get();
          jqXHR = ajax.post({
            url: this.url(),
            dataType: 'text',
            data: JSON.stringify({
              textLayer: model.get('textLayer'),
              body: model.get('body')
            })
          });
          jqXHR.done(function(data, textStatus, jqXHR) {
            var url, xhr;
            if (jqXHR.status === 201) {
              url = jqXHR.getResponseHeader('Location');
              xhr = ajax.get({
                url: url
              });
              return xhr.done(function(data, textStatus, jqXHR) {
                _this.trigger('sync');
                return options.success(data);
              });
            }
          });
          return jqXHR.fail(function(response) {
            return console.log('fail', response);
          });
        } else if (method === 'update') {
          ajax.token = token.get();
          jqXHR = ajax.put({
            url: this.url(),
            data: JSON.stringify({
              body: model.get('body')
            })
          });
          jqXHR.done(function(response) {
            _this.trigger('sync');
            return options.success(response);
          });
          return jqXHR.fail(function(response) {
            return console.log('fail', response);
          });
        } else {
          return Transcription.__super__.sync.apply(this, arguments);
        }
      };

      Transcription.prototype.getAnnotations = function(cb) {
        var annotations,
          _this = this;
        if (cb == null) {
          cb = function() {};
        }
        if (this.get('annotations') != null) {
          return cb(this.get('annotations'));
        } else {
          annotations = new Collections.Annotations([], {
            transcriptionId: this.id,
            entryId: this.collection.entryId,
            projectId: this.collection.projectId
          });
          return annotations.fetch({
            success: function(collection) {
              _this.set('annotations', collection);
              _this.listenTo(collection, 'add', _this.addAnnotation);
              _this.listenTo(collection, 'remove', _this.removeAnnotation);
              return cb(collection);
            }
          });
        }
      };

      Transcription.prototype.addAnnotation = function(model) {
        var $body;
        if (model.get('annotationNo') == null) {
          console.error('No annotationNo given!', model.get('annotationNo'));
          return false;
        }
        $body = $("<div>" + (this.get('body')) + "</div>");
        $body.find('[data-id="newannotation"]').attr('data-id', model.get('annotationNo'));
        return this.resetAnnotationOrder($body);
      };

      Transcription.prototype.removeAnnotation = function(model) {
        var jqXHR,
          _this = this;
        jqXHR = model.destroy();
        return jqXHR.done(function() {
          var $body;
          $body = $("<div>" + (_this.get('body')) + "</div>");
          $body.find("[data-id='" + (model.get('annotationNo')) + "']").remove();
          return _this.resetAnnotationOrder($body);
        });
      };

      Transcription.prototype.resetAnnotationOrder = function($body) {
        var _this = this;
        $body.find('sup[data-marker="end"]').each(function(index, sup) {
          return sup.innerHTML = index + 1;
        });
        this.set('body', $body.html());
        return this.save();
      };

      return Transcription;

    })(Models.Base);
  });

}).call(this);

(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define('collections/transcriptions',['require','config','collections/base','models/transcription'],function(require) {
    var Base, Models, Transcriptions, config, _ref;
    config = require('config');
    Base = require('collections/base');
    Models = {
      Transcription: require('models/transcription')
    };
    return Transcriptions = (function(_super) {
      __extends(Transcriptions, _super);

      function Transcriptions() {
        _ref = Transcriptions.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      Transcriptions.prototype.model = Models.Transcription;

      Transcriptions.prototype.initialize = function(models, options) {
        var _this = this;
        this.projectId = options.projectId;
        this.entryId = options.entryId;
        return this.on('remove', function(model) {
          return model.destroy();
        });
      };

      Transcriptions.prototype.url = function() {
        return config.baseUrl + ("projects/" + this.projectId + "/entries/" + this.entryId + "/transcriptions");
      };

      Transcriptions.prototype.setCurrent = function(model) {
        if ((model == null) || model !== this.current) {
          if (model != null) {
            this.current = model;
          } else {
            this.current = this.findWhere({
              textLayer: 'Diplomatic'
            });
            if (this.current == null) {
              this.first();
            }
          }
          this.trigger('current:change', this.current);
        }
        return this.current;
      };

      return Transcriptions;

    })(Base);
  });

}).call(this);

(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define('models/facsimile',['require','hilib/managers/ajax','hilib/managers/token','config','models/base'],function(require) {
    var Facsimile, Models, ajax, config, token, _ref;
    ajax = require('hilib/managers/ajax');
    token = require('hilib/managers/token');
    config = require('config');
    Models = {
      Base: require('models/base')
    };
    return Facsimile = (function(_super) {
      __extends(Facsimile, _super);

      function Facsimile() {
        _ref = Facsimile.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      Facsimile.prototype.defaults = function() {
        return {
          name: '',
          filename: '',
          zoomableUrl: ''
        };
      };

      Facsimile.prototype.sync = function(method, model, options) {
        var jqXHR,
          _this = this;
        if (method === 'create') {
          ajax.token = token.get();
          jqXHR = ajax.post({
            url: this.url(),
            dataType: 'text',
            data: JSON.stringify({
              name: model.get('name'),
              filename: model.get('filename'),
              zoomableUrl: model.get('zoomableUrl')
            })
          });
          jqXHR.done(function(data, textStatus, jqXHR) {
            var url, xhr;
            if (jqXHR.status === 201) {
              url = jqXHR.getResponseHeader('Location');
              xhr = ajax.get({
                url: url
              });
              return xhr.done(function(data, textStatus, jqXHR) {
                _this.trigger('sync');
                return options.success(data);
              });
            }
          });
          return jqXHR.fail(function(response) {
            return console.log('fail', response);
          });
        } else {
          return Facsimile.__super__.sync.apply(this, arguments);
        }
      };

      return Facsimile;

    })(Models.Base);
  });

}).call(this);

(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define('collections/facsimiles',['require','config','collections/base','models/facsimile'],function(require) {
    var Base, Facsimiles, Models, config, _ref;
    config = require('config');
    Base = require('collections/base');
    Models = {
      Facsimile: require('models/facsimile')
    };
    return Facsimiles = (function(_super) {
      __extends(Facsimiles, _super);

      function Facsimiles() {
        _ref = Facsimiles.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      Facsimiles.prototype.model = Models.Facsimile;

      Facsimiles.prototype.initialize = function(models, options) {
        var _this = this;
        this.projectId = options.projectId;
        this.entryId = options.entryId;
        return this.on('remove', function(model) {
          return model.destroy();
        });
      };

      Facsimiles.prototype.url = function() {
        return config.baseUrl + ("projects/" + this.projectId + "/entries/" + this.entryId + "/facsimiles");
      };

      Facsimiles.prototype.setCurrent = function(model) {
        if ((model == null) || model !== this.current) {
          if (model != null) {
            this.current = model;
          } else {
            this.current = this.at(0);
          }
          this.trigger('current:change', this.current);
        }
        return this.current;
      };

      return Facsimiles;

    })(Base);
  });

}).call(this);

(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define('models/entry',['require','config','hilib/managers/ajax','hilib/managers/token','hilib/mixins/model.sync','models/base','models/entry.settings','collections/transcriptions','collections/facsimiles'],function(require) {
    var Collections, Entry, Models, ajax, config, syncOverride, token, _ref;
    config = require('config');
    ajax = require('hilib/managers/ajax');
    token = require('hilib/managers/token');
    syncOverride = require('hilib/mixins/model.sync');
    Models = {
      Base: require('models/base'),
      Settings: require('models/entry.settings')
    };
    Collections = {
      Transcriptions: require('collections/transcriptions'),
      Facsimiles: require('collections/facsimiles')
    };
    return Entry = (function(_super) {
      __extends(Entry, _super);

      function Entry() {
        _ref = Entry.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      Entry.prototype.urlRoot = function() {
        return config.baseUrl + ("projects/" + this.projectID + "/entries");
      };

      Entry.prototype.defaults = function() {
        return {
          name: '',
          publishable: false
        };
      };

      Entry.prototype.initialize = function(attrs, options) {
        if (options == null) {
          options = {};
        }
        Entry.__super__.initialize.apply(this, arguments);
        if (options.projectID != null) {
          this.projectID = options.projectID;
        }
        return _.extend(this, syncOverride);
      };

      Entry.prototype.set = function(attrs, options) {
        var settings;
        settings = this.get('settings');
        if ((settings != null) && (settings.get(attrs) != null)) {
          settings.set(attrs, options);
          return this.trigger('change');
        } else {
          return Entry.__super__.set.apply(this, arguments);
        }
      };

      Entry.prototype.clone = function() {
        var newObj;
        newObj = new this.constructor({
          name: this.get('name'),
          publishable: this.get('publishable'),
          modifier: this.get('modifier'),
          modifiedOn: this.get('modifiedOn')
        });
        newObj.set('settings', new Models.Settings(this.get('settings').toJSON(), {
          projectId: this.collection.projectId,
          entryId: this.id
        }));
        return newObj;
      };

      Entry.prototype.updateFromClone = function(clone) {
        this.set('name', clone.get('name'));
        this.set('publishable', clone.get('publishable'));
        return this.get('settings').set(clone.get('settings').toJSON());
      };

      Entry.prototype.parse = function(attrs) {
        if (this.collection != null) {
          attrs.transcriptions = new Collections.Transcriptions([], {
            projectId: this.collection.projectId,
            entryId: attrs.id
          });
          attrs.settings = new Models.Settings([], {
            projectId: this.collection.projectId,
            entryId: attrs.id
          });
          attrs.facsimiles = new Collections.Facsimiles([], {
            projectId: this.collection.projectId,
            entryId: attrs.id
          });
        }
        return attrs;
      };

      Entry.prototype.sync = function(method, model, options) {
        var data, jqXHR,
          _this = this;
        data = JSON.stringify({
          name: this.get('name'),
          publishable: this.get('publishable')
        });
        if (method === 'create') {
          jqXHR = ajax.post({
            url: this.url(),
            data: data,
            dataType: 'text'
          });
          jqXHR.done(function(data, textStatus, jqXHR) {
            var xhr;
            if (jqXHR.status === 201) {
              xhr = ajax.get({
                url: jqXHR.getResponseHeader('Location')
              });
              xhr.done(function(data, textStatus, jqXHR) {
                return options.success(data);
              });
              return xhr.fail(function() {
                return console.log(arguments);
              });
            }
          });
          return jqXHR.fail(function(a, b, c) {
            return console.log('fail', a, b, c);
          });
        } else if (method === 'update') {
          ajax.token = token.get();
          jqXHR = ajax.put({
            url: this.url(),
            data: data
          });
          jqXHR.done(function(response) {
            return options.success(response);
          });
          return jqXHR.fail(function(response) {
            return console.log('fail', response);
          });
        } else {
          return Entry.__super__.sync.apply(this, arguments);
        }
      };

      return Entry;

    })(Models.Base);
  });

}).call(this);

(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define('collections/entries',['require','config','collections/base','models/entry'],function(require) {
    var Base, Entries, Models, config, _ref;
    config = require('config');
    Base = require('collections/base');
    Models = {
      Entry: require('models/entry')
    };
    return Entries = (function(_super) {
      __extends(Entries, _super);

      function Entries() {
        _ref = Entries.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      Entries.prototype.model = Models.Entry;

      Entries.prototype.initialize = function(models, options) {
        Entries.__super__.initialize.apply(this, arguments);
        this.projectId = options.projectId;
        return this.current = null;
      };

      Entries.prototype.url = function() {
        return config.baseUrl + ("projects/" + this.projectId + "/entries");
      };

      Entries.prototype.setCurrent = function(modelID) {
        var model;
        model = this.get(modelID);
        this.trigger('current:change', model);
        return this.current = model;
      };

      Entries.prototype.previous = function() {
        var model, previousIndex;
        previousIndex = this.indexOf(this.current) - 1;
        model = this.at(previousIndex);
        return this.setCurrent(model);
      };

      Entries.prototype.next = function() {
        var model, nextIndex;
        nextIndex = this.indexOf(this.current) + 1;
        model = this.at(nextIndex);
        return this.setCurrent(model);
      };

      return Entries;

    })(Base);
  });

}).call(this);

(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define('models/project/annotationtype',['require','config','hilib/managers/ajax','hilib/managers/token','hilib/mixins/model.sync','models/base'],function(require) {
    var AnnotationType, Models, ajax, config, syncOverride, token, _ref;
    config = require('config');
    ajax = require('hilib/managers/ajax');
    token = require('hilib/managers/token');
    syncOverride = require('hilib/mixins/model.sync');
    Models = {
      Base: require('models/base')
    };
    return AnnotationType = (function(_super) {
      __extends(AnnotationType, _super);

      function AnnotationType() {
        _ref = AnnotationType.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      AnnotationType.prototype.urlRoot = function() {
        return config.baseUrl + "annotationtypes";
      };

      AnnotationType.prototype.defaults = function() {
        return {
          creator: null,
          modifier: null,
          name: '',
          description: '',
          annotationTypeMetadataItems: [],
          createdOn: '',
          modifiedOn: ''
        };
      };

      AnnotationType.prototype.initialize = function() {
        AnnotationType.__super__.initialize.apply(this, arguments);
        return _.extend(this, syncOverride);
      };

      AnnotationType.prototype.parse = function(attrs) {
        attrs.title = attrs.name;
        return attrs;
      };

      AnnotationType.prototype.sync = function(method, model, options) {
        var jqXHR,
          _this = this;
        if (method === 'create') {
          ajax.token = token.get();
          jqXHR = ajax.post({
            url: this.url(),
            dataType: 'text',
            data: JSON.stringify({
              name: model.get('name'),
              description: model.get('description')
            })
          });
          jqXHR.done(function(data, textStatus, jqXHR) {
            var xhr;
            if (jqXHR.status === 201) {
              xhr = ajax.get({
                url: jqXHR.getResponseHeader('Location')
              });
              return xhr.done(function(data, textStatus, jqXHR) {
                return options.success(data);
              });
            }
          });
          return jqXHR.fail(function(response) {
            return console.log('fail', response);
          });
        } else if (method === 'update') {
          ajax.token = token.get();
          jqXHR = ajax.put({
            url: this.url(),
            data: JSON.stringify({
              name: model.get('name'),
              description: model.get('description')
            })
          });
          jqXHR.done(function(response) {
            return _this.trigger('sync');
          });
          return jqXHR.fail(function(response) {
            return console.log('fail', response);
          });
        } else {
          return AnnotationType.__super__.sync.apply(this, arguments);
        }
      };

      return AnnotationType;

    })(Models.Base);
  });

}).call(this);

(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define('collections/project/annotationtypes',['require','config','collections/base','models/project/annotationtype'],function(require) {
    var AnnotationTypes, Base, Models, config, _ref;
    config = require('config');
    Base = require('collections/base');
    Models = {
      AnnotationType: require('models/project/annotationtype')
    };
    return AnnotationTypes = (function(_super) {
      __extends(AnnotationTypes, _super);

      function AnnotationTypes() {
        _ref = AnnotationTypes.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      AnnotationTypes.prototype.model = Models.AnnotationType;

      AnnotationTypes.prototype.url = function() {
        return config.baseUrl + "annotationtypes";
      };

      AnnotationTypes.prototype.comparator = function(annotationType) {
        return annotationType.get('description');
      };

      return AnnotationTypes;

    })(Base);
  });

}).call(this);

(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define('models/user',['require','config','hilib/managers/ajax','hilib/managers/token','models/base'],function(require) {
    var Models, User, ajax, config, token, _ref;
    config = require('config');
    ajax = require('hilib/managers/ajax');
    token = require('hilib/managers/token');
    Models = {
      Base: require('models/base')
    };
    return User = (function(_super) {
      __extends(User, _super);

      function User() {
        _ref = User.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      User.prototype.urlRoot = function() {
        return config.baseUrl + "users";
      };

      User.prototype.defaults = function() {
        return {
          username: '',
          email: '',
          firstName: '',
          lastName: '',
          role: 'USER',
          password: ''
        };
      };

      User.prototype.getShortName = function() {
        var name;
        name = this.get('lastName');
        if (name == null) {
          name = this.get('firstName');
        }
        if (name == null) {
          name = 'user';
        }
        return name;
      };

      User.prototype.sync = function(method, model, options) {
        var jqXHR,
          _this = this;
        if (method === 'create') {
          ajax.token = token.get();
          jqXHR = ajax.post({
            url: this.url(),
            dataType: 'text',
            data: JSON.stringify(model.toJSON())
          });
          jqXHR.done(function(data, textStatus, jqXHR) {
            var url, xhr;
            if (jqXHR.status === 201) {
              url = jqXHR.getResponseHeader('Location');
              xhr = ajax.get({
                url: url
              });
              return xhr.done(function(data, textStatus, jqXHR) {
                _this.trigger('sync');
                return options.success(data);
              });
            }
          });
          return jqXHR.fail(function(response) {
            return options.error(response);
          });
        } else if (method === 'update') {
          ajax.token = token.get();
          jqXHR = ajax.put({
            url: this.url(),
            data: JSON.stringify(model.toJSON())
          });
          jqXHR.done(function(response) {
            return _this.trigger('sync');
          });
          return jqXHR.fail(function(response) {
            return options.error(response);
          });
        } else {
          return User.__super__.sync.apply(this, arguments);
        }
      };

      return User;

    })(Models.Base);
  });

}).call(this);

(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define('collections/users',['require','config','models/user','collections/base'],function(require) {
    var Collections, User, Users, config, _ref;
    config = require('config');
    User = require('models/user');
    Collections = {
      Base: require('collections/base')
    };
    return Users = (function(_super) {
      __extends(Users, _super);

      function Users() {
        _ref = Users.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      Users.prototype.model = User;

      Users.prototype.url = function() {
        return "" + config.baseUrl + "users";
      };

      Users.prototype.comparator = 'title';

      return Users;

    })(Collections.Base);
  });

}).call(this);

(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define('models/project/main',['require','hilib/functions/general','hilib/managers/ajax','hilib/managers/token','hilib/managers/async','config','models/base','models/project/settings','entry.metadata','project.user.ids','project.annotationtype.ids','collections/entries','collections/project/annotationtypes','collections/users'],function(require) {
    var Async, Collections, EntryMetadata, Fn, Models, Project, ProjectAnnotationTypeIDs, ProjectUserIDs, ajax, config, token, _ref;
    Fn = require('hilib/functions/general');
    ajax = require('hilib/managers/ajax');
    token = require('hilib/managers/token');
    Async = require('hilib/managers/async');
    config = require('config');
    Models = {
      Base: require('models/base'),
      Settings: require('models/project/settings')
    };
    EntryMetadata = require('entry.metadata');
    ProjectUserIDs = require('project.user.ids');
    ProjectAnnotationTypeIDs = require('project.annotationtype.ids');
    Collections = {
      Entries: require('collections/entries'),
      AnnotationTypes: require('collections/project/annotationtypes'),
      Users: require('collections/users')
    };
    return Project = (function(_super) {
      __extends(Project, _super);

      function Project() {
        _ref = Project.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      Project.prototype.defaults = function() {
        return {
          annotationtypes: null,
          createdOn: '',
          creator: null,
          entries: null,
          entrymetadatafields: null,
          level1: '',
          level2: '',
          level3: '',
          modifiedOn: '',
          modifier: null,
          name: '',
          projectLeaderId: null,
          settings: null,
          textLayers: [],
          title: '',
          userIDs: []
        };
      };

      Project.prototype.parse = function(attrs) {
        attrs.entries = new Collections.Entries([], {
          projectId: attrs.id
        });
        return attrs;
      };

      Project.prototype.addAnnotationType = function(annotationType, done) {
        var ids,
          _this = this;
        ids = this.get('annotationtypeIDs');
        ids.push(annotationType.id);
        return this.projectAnnotationTypeIDs.save(ids, {
          success: function() {
            _this.allannotationtypes.add(annotationType);
            return done();
          }
        });
      };

      Project.prototype.removeAnnotationType = function(id, done) {
        var _this = this;
        return this.projectAnnotationTypeIDs.save(Fn.removeFromArray(this.get('annotationtypeIDs'), id), {
          success: function() {
            _this.allannotationtypes.remove(id);
            return done();
          }
        });
      };

      Project.prototype.addUser = function(user, done) {
        var userIDs,
          _this = this;
        userIDs = this.get('userIDs');
        userIDs.push(user.id);
        return this.projectUserIDs.save(userIDs, {
          success: function() {
            _this.allusers.add(user);
            return done();
          }
        });
      };

      Project.prototype.removeUser = function(id, done) {
        var _this = this;
        return this.projectUserIDs.save(Fn.removeFromArray(this.get('userIDs'), id), {
          success: function() {
            _this.allusers.remove(id);
            return done();
          }
        });
      };

      Project.prototype.load = function(cb) {
        var async, settings,
          _this = this;
        if (this.get('annotationtypes') === null && this.get('entrymetadatafields') === null && this.get('userIDs').length === 0) {
          async = new Async(['annotationtypes', 'users', 'entrymetadatafields', 'settings']);
          async.on('ready', function(data) {
            return cb();
          });
          new Collections.AnnotationTypes().fetch({
            success: function(collection, response, options) {
              _this.allannotationtypes = collection;
              _this.projectAnnotationTypeIDs = new ProjectAnnotationTypeIDs(_this.id);
              return _this.projectAnnotationTypeIDs.fetch(function(data) {
                _this.set('annotationtypeIDs', data);
                _this.set('annotationtypes', new Collections.AnnotationTypes(collection.filter(function(model) {
                  return data.indexOf(model.id) > -1;
                })));
                return async.called('annotationtypes');
              });
            }
          });
          new Collections.Users().fetch({
            success: function(collection) {
              _this.allusers = collection;
              _this.projectUserIDs = new ProjectUserIDs(_this.id);
              return _this.projectUserIDs.fetch(function(data) {
                _this.set('userIDs', data);
                _this.set('members', new Collections.Users(collection.filter(function(model) {
                  return data.indexOf(model.id) > -1;
                })));
                return async.called('users');
              });
            }
          });
          new EntryMetadata(this.id).fetch(function(data) {
            _this.set('entrymetadatafields', data);
            return async.called('entrymetadatafields');
          });
          settings = new Models.Settings(null, {
            projectID: this.id
          });
          return settings.fetch({
            success: function(model) {
              _this.set('settings', model);
              return async.called('settings');
            }
          });
        } else {
          return cb();
        }
      };

      Project.prototype.fetchEntrymetadatafields = function(cb) {
        var jqXHR,
          _this = this;
        ajax.token = token.get();
        jqXHR = ajax.get({
          url: config.baseUrl + ("projects/" + this.id + "/entrymetadatafields"),
          dataType: 'text'
        });
        jqXHR.done(function(response) {
          _this.set('entrymetadatafields', response);
          return cb();
        });
        return jqXHR.fail(function(a, b, c) {
          console.log(a, b, c);
          return console.error('fetchEntrymetadatafields failed!');
        });
      };

      Project.prototype.createDraft = function(cb) {
        var jqXHR,
          _this = this;
        ajax.token = token.get();
        jqXHR = ajax.post({
          url: config.baseUrl + ("projects/" + this.id + "/draft"),
          dataType: 'text'
        });
        jqXHR.done(function() {
          return ajax.poll({
            url: jqXHR.getResponseHeader('Location'),
            testFn: function(data) {
              return data.done;
            },
            done: function(data, textStatus, jqXHR) {
              var settings;
              settings = _this.get('settings');
              settings.set('publicationURL', data.url);
              return settings.save(null, {
                success: function() {
                  _this.publish('message', "Publication <a href='" + data.url + "' target='_blank' data-bypass>ready</a>.");
                  return cb();
                }
              });
            }
          });
        });
        return jqXHR.fail(function() {
          return console.log(arguments);
        });
      };

      Project.prototype.saveTextlayers = function(done) {
        var jqXHR,
          _this = this;
        ajax.token = token.get();
        jqXHR = ajax.put({
          url: config.baseUrl + ("projects/" + this.id + "/textlayers"),
          data: JSON.stringify(this.get('textLayers'))
        });
        return jqXHR.done(function() {
          return done();
        });
      };

      return Project;

    })(Models.Base);
  });

}).call(this);

(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define('collections/projects',['require','config','hilib/managers/history','collections/base','models/project/main'],function(require) {
    var Base, Models, Projects, config, history, _ref;
    config = require('config');
    history = require('hilib/managers/history');
    Base = require('collections/base');
    Models = {
      Project: require('models/project/main')
    };
    Projects = (function(_super) {
      __extends(Projects, _super);

      function Projects() {
        _ref = Projects.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      Projects.prototype.model = Models.Project;

      Projects.prototype.url = config.baseUrl + 'projects';

      Projects.prototype.initialize = function() {
        Projects.__super__.initialize.apply(this, arguments);
        return this.on('sync', this.setCurrent, this);
      };

      Projects.prototype.fetch = function(options) {
        var _this = this;
        if (options == null) {
          options = {};
        }
        if (!options.error) {
          options.error = function(collection, response, options) {
            if (response.status === 401) {
              sessionStorage.clear();
              return Backbone.history.navigate('login', {
                trigger: true
              });
            }
          };
        }
        return Projects.__super__.fetch.call(this, options);
      };

      Projects.prototype.getCurrent = function(cb) {
        var _this = this;
        if (this.current != null) {
          return cb(this.current);
        } else {
          return this.once('current:change', function() {
            return cb(_this.current);
          });
        }
      };

      Projects.prototype.setCurrent = function(id) {
        var fragmentPart,
          _this = this;
        fragmentPart = history.last() != null ? history.last().split('/') : [];
        if ((id != null) && _.isString(id)) {
          this.current = this.get(id);
        } else if (fragmentPart[1] === 'projects') {
          this.current = this.find(function(p) {
            return p.get('name') === fragmentPart[2];
          });
        } else {
          this.current = this.first();
        }
        this.current.load(function() {
          return _this.trigger('current:change', _this.current);
        });
        return this.current;
      };

      return Projects;

    })(Base);
    return new Projects();
  });

}).call(this);

(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define('views/base',['require','backbone','hilib/mixins/pubsub','hilib/managers/view'],function(require) {
    var Backbone, BaseView, Pubsub, viewManager, _ref;
    Backbone = require('backbone');
    Pubsub = require('hilib/mixins/pubsub');
    viewManager = require('hilib/managers/view');
    return BaseView = (function(_super) {
      __extends(BaseView, _super);

      function BaseView() {
        _ref = BaseView.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      BaseView.prototype.initialize = function() {
        viewManager.register(this);
        return _.extend(this, Pubsub);
      };

      BaseView.prototype.destroy = function() {
        return this.remove();
      };

      return BaseView;

    })(Backbone.View);
  });

}).call(this);

(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define('models/currentUser',['require','config','hilib/managers/token','models/base','collections/base'],function(require) {
    var Collections, CurrentUser, Models, config, token, _ref;
    config = require('config');
    token = require('hilib/managers/token');
    Models = {
      Base: require('models/base')
    };
    Collections = {
      Base: require('collections/base')
    };
    CurrentUser = (function(_super) {
      __extends(CurrentUser, _super);

      function CurrentUser() {
        _ref = CurrentUser.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      CurrentUser.prototype.defaults = function() {
        return {
          rev: null,
          username: null,
          title: null,
          email: null,
          firstName: null,
          lastName: null,
          root: null,
          roleString: null,
          loggedIn: null
        };
      };

      CurrentUser.prototype.initialize = function() {
        CurrentUser.__super__.initialize.apply(this, arguments);
        this.loggedIn = false;
        return this.subscribe('unauthorized', function() {
          return sessionStorage.clear();
        });
      };

      CurrentUser.prototype.authorize = function(args) {
        var _this = this;
        this.authorized = args.authorized, this.unauthorized = args.unauthorized;
        if (token.get()) {
          return this.fetchUserAttrs(function() {
            _this.authorized();
            return _this.loggedIn = true;
          });
        } else {
          return this.unauthorized();
        }
      };

      CurrentUser.prototype.login = function(username, password) {
        var _this = this;
        this.set('username', username);
        this.password = password;
        return this.fetchUserAttrs(function() {
          sessionStorage.setItem('huygens_user', JSON.stringify(_this.attributes));
          _this.authorized();
          return _this.loggedIn = true;
        });
      };

      CurrentUser.prototype.logout = function(args) {
        var jqXHR;
        jqXHR = $.ajax({
          type: 'post',
          url: config.baseUrl + ("sessions/" + (token.get()) + "/logout")
        });
        jqXHR.done(function() {
          sessionStorage.clear();
          return location.reload();
        });
        return jqXHR.fail(function() {
          return console.error('Logout failed');
        });
      };

      CurrentUser.prototype.fetchUserAttrs = function(cb) {
        var jqXHR, userAttrs,
          _this = this;
        if (userAttrs = sessionStorage.getItem('huygens_user')) {
          this.set(JSON.parse(userAttrs));
          return cb();
        } else {
          jqXHR = $.ajax({
            type: 'post',
            url: config.baseUrl + 'sessions/login',
            data: {
              username: this.get('username'),
              password: this.password
            }
          });
          jqXHR.done(function(data) {
            _this.password = null;
            token.set(data.token);
            _this.set(data.user);
            return cb();
          });
          return jqXHR.fail(function(a, b, c) {
            console.log(a, b, c);
            return _this.unauthorized();
          });
        }
      };

      return CurrentUser;

    })(Models.Base);
    return new CurrentUser();
  });

}).call(this);

(function(e){if("function"==typeof bootstrap)bootstrap("jade",e);else if("object"==typeof exports)module.exports=e();else if("function"==typeof define&&define.amd)define('jade',e);else if("undefined"!=typeof ses){if(!ses.ok())return;ses.makeJade=e}else"undefined"!=typeof window?window.jade=e():global.jade=e()})(function(){var define,ses,bootstrap,module,exports;
return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

/*!
 * Jade - runtime
 * Copyright(c) 2010 TJ Holowaychuk <tj@vision-media.ca>
 * MIT Licensed
 */

/**
 * Lame Array.isArray() polyfill for now.
 */

if (!Array.isArray) {
  Array.isArray = function(arr){
    return '[object Array]' == Object.prototype.toString.call(arr);
  };
}

/**
 * Lame Object.keys() polyfill for now.
 */

if (!Object.keys) {
  Object.keys = function(obj){
    var arr = [];
    for (var key in obj) {
      if (obj.hasOwnProperty(key)) {
        arr.push(key);
      }
    }
    return arr;
  }
}

/**
 * Merge two attribute objects giving precedence
 * to values in object `b`. Classes are special-cased
 * allowing for arrays and merging/joining appropriately
 * resulting in a string.
 *
 * @param {Object} a
 * @param {Object} b
 * @return {Object} a
 * @api private
 */

exports.merge = function merge(a, b) {
  var ac = a['class'];
  var bc = b['class'];

  if (ac || bc) {
    ac = ac || [];
    bc = bc || [];
    if (!Array.isArray(ac)) ac = [ac];
    if (!Array.isArray(bc)) bc = [bc];
    a['class'] = ac.concat(bc).filter(nulls);
  }

  for (var key in b) {
    if (key != 'class') {
      a[key] = b[key];
    }
  }

  return a;
};

/**
 * Filter null `val`s.
 *
 * @param {*} val
 * @return {Boolean}
 * @api private
 */

function nulls(val) {
  return val != null && val !== '';
}

/**
 * join array as classes.
 *
 * @param {*} val
 * @return {String}
 * @api private
 */

function joinClasses(val) {
  return Array.isArray(val) ? val.map(joinClasses).filter(nulls).join(' ') : val;
}

/**
 * Render the given attributes object.
 *
 * @param {Object} obj
 * @param {Object} escaped
 * @return {String}
 * @api private
 */

exports.attrs = function attrs(obj, escaped){
  var buf = []
    , terse = obj.terse;

  delete obj.terse;
  var keys = Object.keys(obj)
    , len = keys.length;

  if (len) {
    buf.push('');
    for (var i = 0; i < len; ++i) {
      var key = keys[i]
        , val = obj[key];

      if ('boolean' == typeof val || null == val) {
        if (val) {
          terse
            ? buf.push(key)
            : buf.push(key + '="' + key + '"');
        }
      } else if (0 == key.indexOf('data') && 'string' != typeof val) {
        buf.push(key + "='" + JSON.stringify(val) + "'");
      } else if ('class' == key) {
        if (escaped && escaped[key]){
          if (val = exports.escape(joinClasses(val))) {
            buf.push(key + '="' + val + '"');
          }
        } else {
          if (val = joinClasses(val)) {
            buf.push(key + '="' + val + '"');
          }
        }
      } else if (escaped && escaped[key]) {
        buf.push(key + '="' + exports.escape(val) + '"');
      } else {
        buf.push(key + '="' + val + '"');
      }
    }
  }

  return buf.join(' ');
};

/**
 * Escape the given string of `html`.
 *
 * @param {String} html
 * @return {String}
 * @api private
 */

exports.escape = function escape(html){
  return String(html)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};

/**
 * Re-throw the given `err` in context to the
 * the jade in `filename` at the given `lineno`.
 *
 * @param {Error} err
 * @param {String} filename
 * @param {String} lineno
 * @api private
 */

exports.rethrow = function rethrow(err, filename, lineno, str){
  if (!(err instanceof Error)) throw err;
  if ((typeof window != 'undefined' || !filename) && !str) {
    err.message += ' on line ' + lineno;
    throw err;
  }
  try {
    str =  str || require('fs').readFileSync(filename, 'utf8')
  } catch (ex) {
    rethrow(err, null, lineno)
  }
  var context = 3
    , lines = str.split('\n')
    , start = Math.max(lineno - context, 0)
    , end = Math.min(lines.length, lineno + context);

  // Error context
  var context = lines.slice(start, end).map(function(line, i){
    var curr = i + start + 1;
    return (curr == lineno ? '  > ' : '    ')
      + curr
      + '| '
      + line;
  }).join('\n');

  // Alter exception message
  err.path = filename;
  err.message = (filename || 'Jade') + ':' + lineno
    + '\n' + context + '\n\n' + err.message;
  throw err;
};

},{"fs":2}],2:[function(require,module,exports){
// nothing to see here... no file methods for the browser

},{}]},{},[1])(1)
});
;
define('tpls',['jade'], function(jade) { if(jade && jade['runtime'] !== undefined) { jade = jade.runtime; }

this["JST"] = this["JST"] || {};

this["JST"]["debug"] = function anonymous(locals) {
var buf = [];
with (locals || {}) {
buf.push("<ul><li class=\"current-user\">Current User</li><li class=\"current-project\">Current Project</li><li class=\"state\">State</li></ul>");
}
return buf.join("");
};

this["JST"]["entry/annotation.edit.menu"] = function anonymous(locals) {
var buf = [];
with (locals || {}) {
buf.push("<button class=\"metadata small\">Metadata</button><button class=\"cancel small\">Cancel</button><button disabled=\"disabled\" class=\"ok small\">Save</button>");
}
return buf.join("");
};

this["JST"]["entry/annotation.metadata"] = function anonymous(locals) {
var buf = [];
with (locals || {}) {
buf.push("<form><ul" + (jade.attrs({ 'data-model-id':(model.cid), "class": ('form') }, {"data-model-id":true})) + "><li><label>Type</label><select name=\"metadata.type\">");
// iterate collection.models
;(function(){
  var $$obj = collection.models;
  if ('number' == typeof $$obj.length) {

    for (var $index = 0, $$l = $$obj.length; $index < $$l; $index++) {
      var item = $$obj[$index];

sel = item.id === model.get('annotationType').id
buf.push("<option" + (jade.attrs({ 'value':(item.id), 'selected':(sel) }, {"value":true,"selected":true})) + ">" + (jade.escape((jade.interp = item.get('description')) == null ? '' : jade.interp)) + " (" + (jade.escape((jade.interp = item.get('name')) == null ? '' : jade.interp)) + ")</option>");
    }

  } else {
    var $$l = 0;
    for (var $index in $$obj) {
      $$l++;      if ($$obj.hasOwnProperty($index)){      var item = $$obj[$index];

sel = item.id === model.get('annotationType').id
buf.push("<option" + (jade.attrs({ 'value':(item.id), 'selected':(sel) }, {"value":true,"selected":true})) + ">" + (jade.escape((jade.interp = item.get('description')) == null ? '' : jade.interp)) + " (" + (jade.escape((jade.interp = item.get('name')) == null ? '' : jade.interp)) + ")</option>");
      }

    }

  }
}).call(this);

buf.push("</select></li>");
// iterate model.get('annotationType').annotationTypeMetadataItems
;(function(){
  var $$obj = model.get('annotationType').annotationTypeMetadataItems;
  if ('number' == typeof $$obj.length) {

    for (var $index = 0, $$l = $$obj.length; $index < $$l; $index++) {
      var metadata = $$obj[$index];

buf.push("<li> <label" + (jade.attrs({ 'title':(metadata.description) }, {"title":true})) + ">" + (jade.escape(null == (jade.interp = metadata.name) ? "" : jade.interp)) + "</label><input" + (jade.attrs({ 'type':("text"), 'name':('metadata.'+metadata.name), 'value':(model.get('metadata')[metadata.name]) }, {"type":true,"name":true,"value":true})) + "/></li>");
    }

  } else {
    var $$l = 0;
    for (var $index in $$obj) {
      $$l++;      if ($$obj.hasOwnProperty($index)){      var metadata = $$obj[$index];

buf.push("<li> <label" + (jade.attrs({ 'title':(metadata.description) }, {"title":true})) + ">" + (jade.escape(null == (jade.interp = metadata.name) ? "" : jade.interp)) + "</label><input" + (jade.attrs({ 'type':("text"), 'name':('metadata.'+metadata.name), 'value':(model.get('metadata')[metadata.name]) }, {"type":true,"name":true,"value":true})) + "/></li>");
      }

    }

  }
}).call(this);

buf.push("</ul></form>");
}
return buf.join("");
};

this["JST"]["entry/main"] = function anonymous(locals) {
var buf = [];
with (locals || {}) {
buf.push("<div class=\"submenu\"><div class=\"row span7\"><div class=\"cell span3 left\"><ul class=\"horizontal menu\"><li data-key=\"previous\">&nbsp;</li><li data-key=\"current\">" + (jade.escape(null == (jade.interp = name) ? "" : jade.interp)) + "</li><li data-key=\"next\">&nbsp;</li><li data-key=\"facsimiles\" class=\"alignright\">Facsimiles<ul class=\"vertical menu facsimiles\"><li class=\"spacer\">&nbsp;</li><li data-key=\"editfacsimiles\" class=\"subsub\">Edit...</li>");
// iterate facsimiles.models
;(function(){
  var $$obj = facsimiles.models;
  if ('number' == typeof $$obj.length) {

    for (var $index = 0, $$l = $$obj.length; $index < $$l; $index++) {
      var facsimile = $$obj[$index];

buf.push("<li" + (jade.attrs({ 'data-key':("facsimile"), 'data-value':(facsimile.id) }, {"data-key":true,"data-value":true})) + ">" + (jade.escape(null == (jade.interp = facsimile.get('name')) ? "" : jade.interp)) + "</li>");
    }

  } else {
    var $$l = 0;
    for (var $index in $$obj) {
      $$l++;      if ($$obj.hasOwnProperty($index)){      var facsimile = $$obj[$index];

buf.push("<li" + (jade.attrs({ 'data-key':("facsimile"), 'data-value':(facsimile.id) }, {"data-key":true,"data-value":true})) + ">" + (jade.escape(null == (jade.interp = facsimile.get('name')) ? "" : jade.interp)) + "</li>");
      }

    }

  }
}).call(this);

buf.push("</ul></li></ul></div><div class=\"cell span2 alignright\"><ul class=\"horizontal menu\"><li data-key=\"print\">Print</li><li data-key=\"layer\" class=\"arrowdown\">Layer<ul class=\"vertical menu textlayers\"><li class=\"spacer\">&nbsp;</li>");
// iterate transcriptions.models
;(function(){
  var $$obj = transcriptions.models;
  if ('number' == typeof $$obj.length) {

    for (var $index = 0, $$l = $$obj.length; $index < $$l; $index++) {
      var transcription = $$obj[$index];

buf.push("<li" + (jade.attrs({ 'data-key':("transcription"), 'data-value':(transcription.id) }, {"data-key":true,"data-value":true})) + ">" + (jade.escape((jade.interp = transcription.get('textLayer')) == null ? '' : jade.interp)) + " layer</li>");
    }

  } else {
    var $$l = 0;
    for (var $index in $$obj) {
      $$l++;      if ($$obj.hasOwnProperty($index)){      var transcription = $$obj[$index];

buf.push("<li" + (jade.attrs({ 'data-key':("transcription"), 'data-value':(transcription.id) }, {"data-key":true,"data-value":true})) + ">" + (jade.escape((jade.interp = transcription.get('textLayer')) == null ? '' : jade.interp)) + " layer</li>");
      }

    }

  }
}).call(this);

buf.push("</ul></li></ul></div><div class=\"cell span2 alignright\"><ul class=\"horizontal menu\"><li data-key=\"metadata\">Metadata</li></ul></div></div></div><div class=\"subsubmenu\"><div class=\"edittextlayers\"></div><div class=\"editfacsimiles\"></div></div><div class=\"row span7 container\"><div class=\"cell span3\"><div class=\"left-pane\">");
if ( facsimiles.length)
{
buf.push("<iframe id=\"viewer_iframe\" name=\"viewer_iframe\" scrolling=\"no\" width=\"100%\" frameborder=\"0\"></iframe>");
}
buf.push("</div></div><div class=\"cell span2\"><div class=\"middle-pane\"><div class=\"transcription-placeholder\"><div class=\"transcription-editor\"></div></div><div class=\"annotation-placeholder\"><div class=\"annotation-editor\"></div></div><div class=\"annotationmetadata-placeholder\"><div class=\"annotationmetadata\"></div></div></div></div><div class=\"cell span2 preview-placeholder\"><h2>Preview</h2><div class=\"right-pane\"></div></div></div>");
}
return buf.join("");
};

this["JST"]["entry/metadata"] = function anonymous(locals) {
var buf = [];
with (locals || {}) {
buf.push("<form><ul" + (jade.attrs({ 'data-model-id':(model.cid) }, {"data-model-id":true})) + "><li><label>Name</label><input" + (jade.attrs({ 'type':("text"), 'name':("name"), 'value':(model.get('name')) }, {"type":true,"name":true,"value":true})) + "/></li>");
// iterate model.get('settings').attributes
;(function(){
  var $$obj = model.get('settings').attributes;
  if ('number' == typeof $$obj.length) {

    for (var key = 0, $$l = $$obj.length; key < $$l; key++) {
      var value = $$obj[key];

buf.push("<li><label>" + (jade.escape(null == (jade.interp = key) ? "" : jade.interp)) + "</label><input" + (jade.attrs({ 'type':("text"), 'name':(key), 'value':(value) }, {"type":true,"name":true,"value":true})) + "/></li>");
    }

  } else {
    var $$l = 0;
    for (var key in $$obj) {
      $$l++;      if ($$obj.hasOwnProperty(key)){      var value = $$obj[key];

buf.push("<li><label>" + (jade.escape(null == (jade.interp = key) ? "" : jade.interp)) + "</label><input" + (jade.attrs({ 'type':("text"), 'name':(key), 'value':(value) }, {"type":true,"name":true,"value":true})) + "/></li>");
      }

    }

  }
}).call(this);

buf.push("<li><label>Publishable</label><input" + (jade.attrs({ 'type':("checkbox"), 'name':("publishable"), 'checked':(model.get('publishable')) }, {"type":true,"name":true,"checked":true})) + "/></li></ul></form><br/><small>The last modification of " + (jade.escape((jade.interp = model.get('name')) == null ? '' : jade.interp)) + " was " + (jade.escape((jade.interp = new Date(model.get('modifiedOn')).toDateString()) == null ? '' : jade.interp)) + " by " + (jade.escape((jade.interp = model.get('modifier').title) == null ? '' : jade.interp)) + ".</small>");
}
return buf.join("");
};

this["JST"]["entry/preview"] = function anonymous(locals) {
var buf = [];
with (locals || {}) {
buf.push("<div class=\"preview\"> <div class=\"body\">" + (null == (jade.interp = body) ? "" : jade.interp) + "</div><ul class=\"linenumbers\">");
lineNumber = 1
while (lineNumber <= lineCount)
{
buf.push("<li>" + (jade.escape(null == (jade.interp = lineNumber) ? "" : jade.interp)) + "</li>");
lineNumber++
}
buf.push("</ul></div>");
}
return buf.join("");
};

this["JST"]["entry/subsubmenu/facsimiles.edit"] = function anonymous(locals) {
var buf = [];
with (locals || {}) {
buf.push("<div class=\"row span3\"><div class=\"cell span1\"><div class=\"pad2\"><h3>Facsimiles</h3><ul class=\"facsimiles\">");
// iterate facsimiles.models
;(function(){
  var $$obj = facsimiles.models;
  if ('number' == typeof $$obj.length) {

    for (var $index = 0, $$l = $$obj.length; $index < $$l; $index++) {
      var facsimile = $$obj[$index];

buf.push("<li" + (jade.attrs({ 'data-id':(facsimile.id), "class": ('facsimile') }, {"data-id":true})) + "><span class=\"name\"><img src=\"/images/icon.bin.png\" width=\"14px\" height=\"14px\"/><label>" + (jade.escape(null == (jade.interp = facsimile.get('name')) ? "" : jade.interp)) + "</label></span><span class=\"orcancel\">or Cancel</span></li>");
    }

  } else {
    var $$l = 0;
    for (var $index in $$obj) {
      $$l++;      if ($$obj.hasOwnProperty($index)){      var facsimile = $$obj[$index];

buf.push("<li" + (jade.attrs({ 'data-id':(facsimile.id), "class": ('facsimile') }, {"data-id":true})) + "><span class=\"name\"><img src=\"/images/icon.bin.png\" width=\"14px\" height=\"14px\"/><label>" + (jade.escape(null == (jade.interp = facsimile.get('name')) ? "" : jade.interp)) + "</label></span><span class=\"orcancel\">or Cancel</span></li>");
      }

    }

  }
}).call(this);

buf.push("</ul></div></div><div class=\"cell span2\"><div class=\"pad2\"><h3>Upload new facsimile</h3><ul class=\"form addfacsimile\"><li><label>Name</label><input type=\"text\" name=\"name\"/></li><li><form enctype=\"multipart/form-data\" class=\"addfile\"><input type=\"file\" name=\"filename\"/></form></li><li><button class=\"addfacsimile\">Add facsimile</button></li></ul></div></div></div>");
}
return buf.join("");
};

this["JST"]["entry/subsubmenu/textlayers.edit"] = function anonymous(locals) {
var buf = [];
with (locals || {}) {

}
return buf.join("");
};

this["JST"]["entry/tooltip.add.annotation"] = function anonymous(locals) {
var buf = [];
with (locals || {}) {
buf.push("<button>Add annotation</button>");
}
return buf.join("");
};

this["JST"]["entry/transcription.edit.menu"] = function anonymous(locals) {
var buf = [];
with (locals || {}) {
buf.push("<button disabled=\"disabled\" class=\"ok small\">Save</button>");
}
return buf.join("");
};

this["JST"]["entry/transcription"] = function anonymous(locals) {
var buf = [];
with (locals || {}) {
buf.push("<div id=\"supertinyeditor\"><div class=\"tinyeditor\"><div class=\"tinyeditor-header\"><div title=\"Bold\" data-action=\"bold\" style=\"background-position: 0px -120px;\" class=\"tinyeditor-control\"></div><div title=\"Italic\" data-action=\"italic\" style=\"background-position: 0px -150px;\" class=\"tinyeditor-control\"></div><div title=\"Underline\" data-action=\"underline\" style=\"background-position: 0px -180px;\" class=\"tinyeditor-control\"></div><div title=\"Strikethrough\" data-action=\"strikethrough\" style=\"background-position: 0px -210px;\" class=\"tinyeditor-control\"></div><div class=\"tinyeditor-divider\"></div><div title=\"Subscript\" data-action=\"subscript\" style=\"background-position: 0px -240px;\" class=\"tinyeditor-control\"></div><div title=\"Superscript\" data-action=\"superscript\" style=\"background-position: 0px -270px;\" class=\"tinyeditor-control\"></div></div><div class=\"tinyeditor-header\"><div title=\"Outdent\" data-action=\"outdent\" style=\"background-position: 0px -360px;\" class=\"tinyeditor-control\"></div><div title=\"Indent\" data-action=\"indent\" style=\"background-position: 0px -390px;\" class=\"tinyeditor-control\"></div><div class=\"tinyeditor-divider\"></div><div title=\"Remove Formatting\" data-action=\"removeformat\" style=\"background-position: 0px -720px;\" class=\"tinyeditor-control\"></div><div class=\"tinyeditor-divider\"></div><div title=\"Undo\" data-action=\"undo\" style=\"background-position: 0px -540px;\" class=\"tinyeditor-control\"></div><div title=\"Redo\" data-action=\"redo\" style=\"background-position: 0px -570px;\" class=\"tinyeditor-control\"></div></div><div style=\"height: 100%;\" class=\"tinyeditor-body\"></div></div></div>");
}
return buf.join("");
};

this["JST"]["login"] = function anonymous(locals) {
var buf = [];
with (locals || {}) {
buf.push("<div class=\"cell span2\"><div class=\"padl5 padr5\"><p>\t\neLaborate is an online work environment in which scholars can upload scans, transcribe and annotate text, and publish the results as on online text edition which is freely available to all users. \nAccess to the work environment is currently limited. In 2012 the tool will be adapted for deployment at European CLARIN Centers starting with the Dutch centers. http://www.clarin.nl/</p><p>eLaborate enables textual scholars to work on their edition on their own or in a group. Users only need to know how to use the internet. Project leaders can easily give reading and writing permission \nto members of their project team. They can select and add metadata fields and draw up a list of annotation categories they want to use. They can publish their edition online anytime they want. \nThe edition will then become available online in a sober design which will be elaborated on step by step in the next few years.</p><p><p>The work environment is developed by the Huygens Institute for the History of the Netherlands of the Royal Netherlands Academy of Arts and Sciences. \nThe new version was developed in the Alfalab project, making eLaborate3 the main tool available through the Textlab of <a href=\"http://alfalab.ehumanities.nl\">Alfalab</a>.</p></p><p><p>Access to eLaborate is currently granted to scholars teaching a university course in text editing and to scholars planning an edition that is somehow related to the research programme of Huygens ING.\nFor more information: <a href=\"info-elaborate@huygens.knaw.nl\">info-elaborate@huygens.knaw.nl</a></p></p><h2>eLaborate2</h2><p>Those still using eLaborate2 can find their work environment by following this link. http://www.e-laborate.nl/en/\nIn the course of 2012, projects using eLaborate2 will be migrated to eLaborate3. The eLaborate team will contact the project leaders to discuss the best time frame for the migration and to arrange instruction in eLaborate3.</p><h2>Links</h2><p>More information about the use of eLaborate3 will become available in due time (link naar handleiding-in-wording)</p><p> <p>Links to digital editions prepared in eLaborate2 are listed at <a href=\"http://www.e-laborate.nl/en/\">http://www.e-laborate.nl/en/</a></p></p><p> <p>Information about tools for digital text analysis can be found in Alfalab&#39;s Textlab. <a href=\"http://alfalab.ehumanities.nl/textlab\">http://alfalab.ehumanities.nl/textlab</a></p></p><p> <p>Information and news relating to textual scholarship in general (mostly in Dutch) can be enjoyed at <a href=\"http://www.textualscholarship.nl/\">http://www.textualscholarship.nl/</a></p></p><p> <p>More about Huygens ING at <a href=\"http://www.huygens.knaw.nl/\">http://www.huygens.knaw.nl/</a></p></p></div></div><div class=\"cell span1 alignright\"><div class=\"padl5 padr5\"><form class=\"login region\"><ul><li><label>Username</label><input id=\"username\" type=\"text\" name=\"username\" value=\"root\"/></li><li><label>Password</label><input id=\"password\" type=\"password\" name=\"password\" value=\"toor\"/></li><li><input id=\"submit\" type=\"submit\" value=\"Login\" style=\"width: 75px\"/></li></ul></form></div></div>");
}
return buf.join("");
};

this["JST"]["project/editselection"] = function anonymous(locals) {
var buf = [];
with (locals || {}) {
buf.push("<h3>Edit metadata of multiple entries </h3><div class=\"row span2\"><div class=\"cell span1\"><form><ul>");
// iterate entrymetadatafields
;(function(){
  var $$obj = entrymetadatafields;
  if ('number' == typeof $$obj.length) {

    for (var key = 0, $$l = $$obj.length; key < $$l; key++) {
      var field = $$obj[key];

if ( key < entrymetadatafields.length/2)
{
buf.push("<li> <label>" + (jade.escape(null == (jade.interp = field) ? "" : jade.interp)) + "</label><input" + (jade.attrs({ 'type':("text"), 'name':(field), 'tabindex':(key * 2 + 1) }, {"type":true,"name":true,"tabindex":true})) + "/><input" + (jade.attrs({ 'type':("checkbox"), 'tabindex':(key * 2 + 2), 'data-name':(field) }, {"type":true,"tabindex":true,"data-name":true})) + "/></li>");
}
    }

  } else {
    var $$l = 0;
    for (var key in $$obj) {
      $$l++;      if ($$obj.hasOwnProperty(key)){      var field = $$obj[key];

if ( key < entrymetadatafields.length/2)
{
buf.push("<li> <label>" + (jade.escape(null == (jade.interp = field) ? "" : jade.interp)) + "</label><input" + (jade.attrs({ 'type':("text"), 'name':(field), 'tabindex':(key * 2 + 1) }, {"type":true,"name":true,"tabindex":true})) + "/><input" + (jade.attrs({ 'type':("checkbox"), 'tabindex':(key * 2 + 2), 'data-name':(field) }, {"type":true,"tabindex":true,"data-name":true})) + "/></li>");
}
      }

    }

  }
}).call(this);

buf.push("</ul></form></div><div class=\"cell span1\"><form><ul>");
// iterate entrymetadatafields
;(function(){
  var $$obj = entrymetadatafields;
  if ('number' == typeof $$obj.length) {

    for (var key = 0, $$l = $$obj.length; key < $$l; key++) {
      var field = $$obj[key];

if ( key >= entrymetadatafields.length/2)
{
buf.push("<li> <label>" + (jade.escape(null == (jade.interp = field) ? "" : jade.interp)) + "</label><input" + (jade.attrs({ 'type':("text"), 'name':(field), 'tabindex':(entrymetadatafields.length/2 + key * 2 - 1) }, {"type":true,"name":true,"tabindex":true})) + "/><input" + (jade.attrs({ 'type':("checkbox"), 'tabindex':(entrymetadatafields.length/2 + key * 2), 'data-name':(field) }, {"type":true,"tabindex":true,"data-name":true})) + "/></li>");
}
    }

  } else {
    var $$l = 0;
    for (var key in $$obj) {
      $$l++;      if ($$obj.hasOwnProperty(key)){      var field = $$obj[key];

if ( key >= entrymetadatafields.length/2)
{
buf.push("<li> <label>" + (jade.escape(null == (jade.interp = field) ? "" : jade.interp)) + "</label><input" + (jade.attrs({ 'type':("text"), 'name':(field), 'tabindex':(entrymetadatafields.length/2 + key * 2 - 1) }, {"type":true,"name":true,"tabindex":true})) + "/><input" + (jade.attrs({ 'type':("checkbox"), 'tabindex':(entrymetadatafields.length/2 + key * 2), 'data-name':(field) }, {"type":true,"tabindex":true,"data-name":true})) + "/></li>");
}
      }

    }

  }
}).call(this);

buf.push("</ul></form></div></div><footer><button" + (jade.attrs({ 'name':("savemetadata"), 'tabindex':(entrymetadatafields.length * 2 + 1), "class": ('simple') + ' ' + ('inactive') }, {"name":true,"tabindex":true})) + ">Save metadata</button><span>or</span><button" + (jade.attrs({ 'name':("cancel"), 'tabindex':(entrymetadatafields.length * 2 + 2) }, {"name":true,"tabindex":true})) + ">Cancel</button></footer>");
}
return buf.join("");
};

this["JST"]["project/history"] = function anonymous(locals) {
var buf = [];
with (locals || {}) {
// iterate logEntries
;(function(){
  var $$obj = logEntries;
  if ('number' == typeof $$obj.length) {

    for (var date = 0, $$l = $$obj.length; date < $$l; date++) {
      var entries = $$obj[date];

buf.push("<h3>" + (jade.escape(null == (jade.interp = date) ? "" : jade.interp)) + "</h3><ul>");
// iterate entries
;(function(){
  var $$obj = entries;
  if ('number' == typeof $$obj.length) {

    for (var $index = 0, $$l = $$obj.length; $index < $$l; $index++) {
      var entry = $$obj[$index];

buf.push("<li><span class=\"username\">" + (jade.escape(null == (jade.interp = entry.userName) ? "" : jade.interp)) + "</span><span>&nbsp;</span><span class=\"comment\">" + (jade.escape(null == (jade.interp = entry.comment) ? "" : jade.interp)) + "</span></li>");
    }

  } else {
    var $$l = 0;
    for (var $index in $$obj) {
      $$l++;      if ($$obj.hasOwnProperty($index)){      var entry = $$obj[$index];

buf.push("<li><span class=\"username\">" + (jade.escape(null == (jade.interp = entry.userName) ? "" : jade.interp)) + "</span><span>&nbsp;</span><span class=\"comment\">" + (jade.escape(null == (jade.interp = entry.comment) ? "" : jade.interp)) + "</span></li>");
      }

    }

  }
}).call(this);

buf.push("</ul>");
    }

  } else {
    var $$l = 0;
    for (var date in $$obj) {
      $$l++;      if ($$obj.hasOwnProperty(date)){      var entries = $$obj[date];

buf.push("<h3>" + (jade.escape(null == (jade.interp = date) ? "" : jade.interp)) + "</h3><ul>");
// iterate entries
;(function(){
  var $$obj = entries;
  if ('number' == typeof $$obj.length) {

    for (var $index = 0, $$l = $$obj.length; $index < $$l; $index++) {
      var entry = $$obj[$index];

buf.push("<li><span class=\"username\">" + (jade.escape(null == (jade.interp = entry.userName) ? "" : jade.interp)) + "</span><span>&nbsp;</span><span class=\"comment\">" + (jade.escape(null == (jade.interp = entry.comment) ? "" : jade.interp)) + "</span></li>");
    }

  } else {
    var $$l = 0;
    for (var $index in $$obj) {
      $$l++;      if ($$obj.hasOwnProperty($index)){      var entry = $$obj[$index];

buf.push("<li><span class=\"username\">" + (jade.escape(null == (jade.interp = entry.userName) ? "" : jade.interp)) + "</span><span>&nbsp;</span><span class=\"comment\">" + (jade.escape(null == (jade.interp = entry.comment) ? "" : jade.interp)) + "</span></li>");
      }

    }

  }
}).call(this);

buf.push("</ul>");
      }

    }

  }
}).call(this);

}
return buf.join("");
};

this["JST"]["project/main"] = function anonymous(locals) {
var buf = [];
with (locals || {}) {
buf.push("<div class=\"submenu\"><div class=\"row span3\"><div class=\"cell span1\"><ul class=\"horizontal menu\"><li data-key=\"newsearch\">New search</li></ul></div>");
if ( user.get('role') === 'ADMIN')
{
buf.push("<div class=\"cell span1\"><ul class=\"horizontal menu\"><li data-key=\"newentry\">New entry</li><li data-key=\"editselection\">Edit metadata</li></ul></div><div class=\"cell span1 alignright\"><ul class=\"horizontal menu\"><li data-key=\"publish\">Publish</li></ul></div>");
}
buf.push("</div></div><div style=\"margin: 20px 0\" class=\"row span3\"><div class=\"cell span1\"><div class=\"padl4\"><div class=\"faceted-search-placeholder\"></div></div></div><div class=\"cell span2\"><div class=\"padr4 resultview\"><header><div class=\"editselection-placeholder\"></div><div class=\"row span2 numfound-placeholder\"><div class=\"cell span1\"> <h3 class=\"numfound\"></h3></div><div class=\"cell span1 alignright\"><nav><ul><li> <input id=\"cb_showkeywords\" type=\"checkbox\"/><label for=\"cb_showkeywords\">Display keywords</label></li><li data-key=\"selectall\">Select all</li><li data-key=\"deselectall\">Deselect all</li></ul></nav></div></div><div class=\"row span2 pagination-placeholder\"><div class=\"cell span1\"> <ul class=\"horizontal menu pagination\"><li class=\"prev inactive\">&lt;</li><li class=\"currentpage text\"></li><li class=\"text\">of</li><li class=\"pagecount text\"></li><li class=\"next\">&gt;</li></ul></div><div class=\"cell span1 alignright\">\t\t</div></div></header><ul class=\"entries\"></ul></div></div></div>");
}
return buf.join("");
};

this["JST"]["project/results"] = function anonymous(locals) {
var buf = [];
with (locals || {}) {
// iterate model.get('results')
;(function(){
  var $$obj = model.get('results');
  if ('number' == typeof $$obj.length) {

    for (var $index = 0, $$l = $$obj.length; $index < $$l; $index++) {
      var entry = $$obj[$index];

buf.push("<li" + (jade.attrs({ 'id':('entry'+entry.id), "class": ('entry') }, {"id":true})) + ">");
id = generateID()
buf.push("<input" + (jade.attrs({ 'type':("checkbox"), 'data-id':(entry.id), 'id':(id) }, {"type":true,"data-id":true,"id":true})) + "/><label" + (jade.attrs({ 'data-id':(entry.id), 'for':(id) }, {"data-id":true,"for":true})) + ">" + (jade.escape(null == (jade.interp = entry.name) ? "" : jade.interp)) + "</label><div class=\"keywords\"><ul>");
// iterate entry._kwic
;(function(){
  var $$obj = entry._kwic;
  if ('number' == typeof $$obj.length) {

    for (var $index = 0, $$l = $$obj.length; $index < $$l; $index++) {
      var kwic = $$obj[$index];

// iterate kwic
;(function(){
  var $$obj = kwic;
  if ('number' == typeof $$obj.length) {

    for (var $index = 0, $$l = $$obj.length; $index < $$l; $index++) {
      var row = $$obj[$index];

buf.push("<li>" + (null == (jade.interp = row) ? "" : jade.interp) + "</li>");
    }

  } else {
    var $$l = 0;
    for (var $index in $$obj) {
      $$l++;      if ($$obj.hasOwnProperty($index)){      var row = $$obj[$index];

buf.push("<li>" + (null == (jade.interp = row) ? "" : jade.interp) + "</li>");
      }

    }

  }
}).call(this);

    }

  } else {
    var $$l = 0;
    for (var $index in $$obj) {
      $$l++;      if ($$obj.hasOwnProperty($index)){      var kwic = $$obj[$index];

// iterate kwic
;(function(){
  var $$obj = kwic;
  if ('number' == typeof $$obj.length) {

    for (var $index = 0, $$l = $$obj.length; $index < $$l; $index++) {
      var row = $$obj[$index];

buf.push("<li>" + (null == (jade.interp = row) ? "" : jade.interp) + "</li>");
    }

  } else {
    var $$l = 0;
    for (var $index in $$obj) {
      $$l++;      if ($$obj.hasOwnProperty($index)){      var row = $$obj[$index];

buf.push("<li>" + (null == (jade.interp = row) ? "" : jade.interp) + "</li>");
      }

    }

  }
}).call(this);

      }

    }

  }
}).call(this);

buf.push("</ul></div></li>");
    }

  } else {
    var $$l = 0;
    for (var $index in $$obj) {
      $$l++;      if ($$obj.hasOwnProperty($index)){      var entry = $$obj[$index];

buf.push("<li" + (jade.attrs({ 'id':('entry'+entry.id), "class": ('entry') }, {"id":true})) + ">");
id = generateID()
buf.push("<input" + (jade.attrs({ 'type':("checkbox"), 'data-id':(entry.id), 'id':(id) }, {"type":true,"data-id":true,"id":true})) + "/><label" + (jade.attrs({ 'data-id':(entry.id), 'for':(id) }, {"data-id":true,"for":true})) + ">" + (jade.escape(null == (jade.interp = entry.name) ? "" : jade.interp)) + "</label><div class=\"keywords\"><ul>");
// iterate entry._kwic
;(function(){
  var $$obj = entry._kwic;
  if ('number' == typeof $$obj.length) {

    for (var $index = 0, $$l = $$obj.length; $index < $$l; $index++) {
      var kwic = $$obj[$index];

// iterate kwic
;(function(){
  var $$obj = kwic;
  if ('number' == typeof $$obj.length) {

    for (var $index = 0, $$l = $$obj.length; $index < $$l; $index++) {
      var row = $$obj[$index];

buf.push("<li>" + (null == (jade.interp = row) ? "" : jade.interp) + "</li>");
    }

  } else {
    var $$l = 0;
    for (var $index in $$obj) {
      $$l++;      if ($$obj.hasOwnProperty($index)){      var row = $$obj[$index];

buf.push("<li>" + (null == (jade.interp = row) ? "" : jade.interp) + "</li>");
      }

    }

  }
}).call(this);

    }

  } else {
    var $$l = 0;
    for (var $index in $$obj) {
      $$l++;      if ($$obj.hasOwnProperty($index)){      var kwic = $$obj[$index];

// iterate kwic
;(function(){
  var $$obj = kwic;
  if ('number' == typeof $$obj.length) {

    for (var $index = 0, $$l = $$obj.length; $index < $$l; $index++) {
      var row = $$obj[$index];

buf.push("<li>" + (null == (jade.interp = row) ? "" : jade.interp) + "</li>");
    }

  } else {
    var $$l = 0;
    for (var $index in $$obj) {
      $$l++;      if ($$obj.hasOwnProperty($index)){      var row = $$obj[$index];

buf.push("<li>" + (null == (jade.interp = row) ? "" : jade.interp) + "</li>");
      }

    }

  }
}).call(this);

      }

    }

  }
}).call(this);

buf.push("</ul></div></li>");
      }

    }

  }
}).call(this);

}
return buf.join("");
};

this["JST"]["project/settings/addannotationtype"] = function anonymous(locals) {
var buf = [];
with (locals || {}) {
buf.push("<form><ul data-model-id=\"<%= model.cid %>\"><li><label>Name</label><input type=\"text\" name=\"name\"/></li><li><label>Description</label><input type=\"text\" name=\"description\"/></li><li><input type=\"submit\" value=\"Add annotation type\"/></li></ul></form>");
}
return buf.join("");
};

this["JST"]["project/settings/adduser"] = function anonymous(locals) {
var buf = [];
with (locals || {}) {
buf.push("<form><ul data-model-id=\"<%= model.cid %>\"><li><label>Username</label><input type=\"text\" name=\"username\"/></li><li><label>E-mail</label><input type=\"text\" name=\"email\"/></li><li><label>First name</label><input type=\"text\" name=\"firstName\"/></li><li><label>Last name</label><input type=\"text\" name=\"lastName\"/></li><li><label>Password</label><input type=\"password\" name=\"password\"/></li><li><label>Role</label><select name=\"role\"><option value=\"USER\">USER</option><option value=\"READER\">READER</option><option value=\"PROJECTLEADER\">PROJECTLEADER</option><option value=\"ADMIN\">ADMIN</option></select></li><li><input type=\"submit\" name=\"adduser\" value=\"Add user\"/></li></ul></form>");
}
return buf.join("");
};

this["JST"]["project/settings/main"] = function anonymous(locals) {
var buf = [];
with (locals || {}) {
buf.push("<div class=\"padl5 padr5\"><h2>Settings</h2><ul class=\"horizontal tab menu\"><li data-tab=\"project\" class=\"active\">Project</li><li data-tab=\"textlayers\">Text layers</li><li data-tab=\"metadata-entries\">Entry metadata</li><li data-tab=\"annotationtypes\">Annotation types</li><li data-tab=\"users\">Users </li></ul><div data-tab=\"project\" class=\"active\"><h3>Project</h3><div class=\"row span2\"><div class=\"cell span1\"><form><ul><li><label for=\"type\">Type</label><select name=\"projectType\" data-attr=\"projectType\"><option" + (jade.attrs({ 'value':("collection"), 'selected':(settings['projectType']==='collection') }, {"value":true,"selected":true})) + ">Collection</option><option" + (jade.attrs({ 'value':("work"), 'selected':(settings['projectType']==='work') }, {"value":true,"selected":true})) + ">Work</option></select></li><li><label for=\"title\">Project title</label><input" + (jade.attrs({ 'type':("text"), 'name':("title"), 'value':(settings['Project title']), 'data-attr':("Project title") }, {"type":true,"name":true,"value":true,"data-attr":true})) + "/></li><li><label for=\"leader\">Project leader</label><select name=\"leader\" data-attr=\"Project leader\"><option>-- select member --</option>");
// iterate projectMembers.models
;(function(){
  var $$obj = projectMembers.models;
  if ('number' == typeof $$obj.length) {

    for (var $index = 0, $$l = $$obj.length; $index < $$l; $index++) {
      var member = $$obj[$index];

var sel = (member.id === parseInt(settings['Project leader'], 10));
buf.push("<option" + (jade.attrs({ 'value':(member.id), 'selected':(sel) }, {"value":true,"selected":true})) + ">" + (jade.escape(null == (jade.interp = member.get('title')) ? "" : jade.interp)) + "</option>");
    }

  } else {
    var $$l = 0;
    for (var $index in $$obj) {
      $$l++;      if ($$obj.hasOwnProperty($index)){      var member = $$obj[$index];

var sel = (member.id === parseInt(settings['Project leader'], 10));
buf.push("<option" + (jade.attrs({ 'value':(member.id), 'selected':(sel) }, {"value":true,"selected":true})) + ">" + (jade.escape(null == (jade.interp = member.get('title')) ? "" : jade.interp)) + "</option>");
      }

    }

  }
}).call(this);

buf.push("</select></li><li><label for=\"start\">Start date</label><input" + (jade.attrs({ 'type':("text"), 'name':("start"), 'value':(settings['Start date']), 'data-attr':("Start date") }, {"type":true,"name":true,"value":true,"data-attr":true})) + "/></li><li><label for=\"release\">Release date</label><input" + (jade.attrs({ 'type':("text"), 'name':("release"), 'value':(settings['Release date']), 'data-attr':("Release date") }, {"type":true,"name":true,"value":true,"data-attr":true})) + "/></li><li><label for=\"version\">Version</label><input" + (jade.attrs({ 'type':("text"), 'name':("version"), 'value':(settings.Version), 'data-attr':("Version") }, {"type":true,"name":true,"value":true,"data-attr":true})) + "/></li>");
if ( settings.publicationURL.length > 0)
{
buf.push("<li><label>Publication</label><a" + (jade.attrs({ 'href':(settings.publicationURL), 'data-bypass':(true) }, {"href":true,"data-bypass":true})) + ">link</a></li>");
}
buf.push("<li style=\"margin-top: 20px\"><input type=\"submit\" name=\"savesettings\" value=\"Save settings\" class=\"inactive\"/></li></ul></form></div><div class=\"cell span1\"><h4>Statistics </h4><img src=\"/images/loader.gif\" class=\"loader\"/><pre class=\"statistics\"></pre></div></div></div><div data-tab=\"textlayers\"><h3>Edit text layers</h3></div><div data-tab=\"metadata-entries\"><h3>Edit entry metadata fields</h3></div><div data-tab=\"annotationtypes\"><div class=\"row span3\"><div class=\"cell span1 annotationtypelist\"><h3>Annotation types</h3></div><div class=\"cell span2 addannotationtype\"><h3>Add annotation type to project</h3></div></div></div><div data-tab=\"users\"><div class=\"row span3\"><div class=\"cell span1 userlist\"><h3>Project members</h3></div><div class=\"cell span2 adduser\"><h3>Add user to project</h3></div></div></div></div>");
}
return buf.join("");
};

this["JST"]["ui/header"] = function anonymous(locals) {
var buf = [];
with (locals || {}) {
buf.push("<div class=\"main\"><div class=\"row span3\"><div class=\"cell span1 project aligncenter\"><img src=\"/images/logo.elaborate.png\"/><ul class=\"horizontal menu\"><li class=\"thisproject arrowdown\"> <span class=\"projecttitle\">" + (jade.escape(null == (jade.interp = projects.current.get('title')) ? "" : jade.interp)) + "</span><ul class=\"vertical menu\"><li class=\"search\">Entry overview</li>");
if ( user.get('role') === 'ADMIN')
{
buf.push("<li class=\"settings\">Project settings</li>");
}
buf.push("<li class=\"history\">History</li></ul></li></ul></div><div class=\"cell span1\"><span class=\"message\"></span></div><div class=\"cell span1 user alignright\"><ul class=\"horizontal menu\"><li>Help</li><li class=\"username arrowdown\">" + (jade.escape(null == (jade.interp = user.get('title')) ? "" : jade.interp)) + "<ul class=\"vertical menu\"><li class=\"projects arrowleft\">My projects<ul class=\"vertical menu\">");
// iterate projects.models
;(function(){
  var $$obj = projects.models;
  if ('number' == typeof $$obj.length) {

    for (var $index = 0, $$l = $$obj.length; $index < $$l; $index++) {
      var project = $$obj[$index];

buf.push("<li" + (jade.attrs({ 'data-id':(project.id), "class": ('project') }, {"data-id":true})) + ">" + (jade.escape(null == (jade.interp = project.get('title')) ? "" : jade.interp)) + "</li>");
    }

  } else {
    var $$l = 0;
    for (var $index in $$obj) {
      $$l++;      if ($$obj.hasOwnProperty($index)){      var project = $$obj[$index];

buf.push("<li" + (jade.attrs({ 'data-id':(project.id), "class": ('project') }, {"data-id":true})) + ">" + (jade.escape(null == (jade.interp = project.get('title')) ? "" : jade.interp)) + "</li>");
      }

    }

  }
}).call(this);

buf.push("</ul></li><li class=\"logout\">Logout</li></ul></li></ul><img src=\"/images/logo.huygens.png\"/></div></div></div>");
}
return buf.join("");
};

this["JST"]["ui/tooltip"] = function anonymous(locals) {
var buf = [];
with (locals || {}) {
buf.push("<ul class=\"horizontal menu left\"><li class=\"edit\"><img src=\"/images/icon.edit.png\" title=\"Edit annotation\"/></li><li class=\"delete\"><img src=\"/images/icon.bin.png\" title=\"Delete annotation\"/></li></ul><ul class=\"horizontal menu right\"><li class=\"close\"><img src=\"/images/icon.close.png\" title=\"Close annotation\"/></li></ul><div class=\"tooltip-body\"></div>");
}
return buf.join("");
};

return this["JST"];

});
(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define('views/login',['require','views/base','models/currentUser','tpls'],function(require) {
    var BaseView, Login, currentUser, tpls, _ref;
    BaseView = require('views/base');
    currentUser = require('models/currentUser');
    tpls = require('tpls');
    return Login = (function(_super) {
      __extends(Login, _super);

      function Login() {
        _ref = Login.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      Login.prototype.className = 'row span3';

      Login.prototype.events = {
        'click input#submit': 'submit'
      };

      Login.prototype.submit = function(ev) {
        ev.preventDefault();
        return currentUser.login(this.$('#username').val(), this.$('#password').val());
      };

      Login.prototype.initialize = function() {
        Login.__super__.initialize.apply(this, arguments);
        return this.render();
      };

      Login.prototype.render = function() {
        var rtpl;
        rtpl = tpls['login'];
        this.$el.html(rtpl());
        return this;
      };

      return Login;

    })(BaseView);
  });

}).call(this);

(function(e,t){typeof define=="function"&&define.amd?define('faceted-search',["jquery","underscore","backbone"],t):e.facetedsearch=t()})(this,function(e,t,n){var r,i,s;return function(e){function d(e,t){return h.call(e,t)}function v(e,t){var n,r,i,s,o,u,a,f,c,h,p=t&&t.split("/"),d=l.map,v=d&&d["*"]||{};if(e&&e.charAt(0)===".")if(t){p=p.slice(0,p.length-1),e=p.concat(e.split("/"));for(f=0;f<e.length;f+=1){h=e[f];if(h===".")e.splice(f,1),f-=1;else if(h===".."){if(f===1&&(e[2]===".."||e[0]===".."))break;f>0&&(e.splice(f-1,2),f-=2)}}e=e.join("/")}else e.indexOf("./")===0&&(e=e.substring(2));if((p||v)&&d){n=e.split("/");for(f=n.length;f>0;f-=1){r=n.slice(0,f).join("/");if(p)for(c=p.length;c>0;c-=1){i=d[p.slice(0,c).join("/")];if(i){i=i[r];if(i){s=i,o=f;break}}}if(s)break;!u&&v&&v[r]&&(u=v[r],a=f)}!s&&u&&(s=u,o=a),s&&(n.splice(0,o,s),e=n.join("/"))}return e}function m(t,r){return function(){return n.apply(e,p.call(arguments,0).concat([t,r]))}}function g(e){return function(t){return v(t,e)}}function y(e){return function(t){a[e]=t}}function b(n){if(d(f,n)){var r=f[n];delete f[n],c[n]=!0,t.apply(e,r)}if(!d(a,n)&&!d(c,n))throw new Error("No "+n);return a[n]}function w(e){var t,n=e?e.indexOf("!"):-1;return n>-1&&(t=e.substring(0,n),e=e.substring(n+1,e.length)),[t,e]}function E(e){return function(){return l&&l.config&&l.config[e]||{}}}var t,n,o,u,a={},f={},l={},c={},h=Object.prototype.hasOwnProperty,p=[].slice;o=function(e,t){var n,r=w(e),i=r[0];return e=r[1],i&&(i=v(i,t),n=b(i)),i?n&&n.normalize?e=n.normalize(e,g(t)):e=v(e,t):(e=v(e,t),r=w(e),i=r[0],e=r[1],i&&(n=b(i))),{f:i?i+"!"+e:e,n:e,pr:i,p:n}},u={require:function(e){return m(e)},exports:function(e){var t=a[e];return typeof t!="undefined"?t:a[e]={}},module:function(e){return{id:e,uri:"",exports:a[e],config:E(e)}}},t=function(t,n,r,i){var s,l,h,p,v,g=[],w;i=i||t;if(typeof r=="function"){n=!n.length&&r.length?["require","exports","module"]:n;for(v=0;v<n.length;v+=1){p=o(n[v],i),l=p.f;if(l==="require")g[v]=u.require(t);else if(l==="exports")g[v]=u.exports(t),w=!0;else if(l==="module")s=g[v]=u.module(t);else if(d(a,l)||d(f,l)||d(c,l))g[v]=b(l);else{if(!p.p)throw new Error(t+" missing "+l);p.p.load(p.n,m(i,!0),y(l),{}),g[v]=a[l]}}h=r.apply(a[t],g);if(t)if(s&&s.exports!==e&&s.exports!==a[t])a[t]=s.exports;else if(h!==e||!w)a[t]=h}else t&&(a[t]=r)},r=i=n=function(r,i,s,a,f){return typeof r=="string"?u[r]?u[r](i):b(o(r,i).f):(r.splice||(l=r,i.splice?(r=i,i=s,s=null):r=e),i=i||function(){},typeof s=="function"&&(s=a,a=f),a?t(e,r,i,s):setTimeout(function(){t(e,r,i,s)},4),n)},n.config=function(e){return l=e,l.deps&&n(l.deps,l.callback),n},r._defined=a,s=function(e,t,n){t.splice||(n=t,t=[]),!d(a,e)&&!d(f,e)&&(f[e]=[e,t,n])},s.amd={jQuery:!0}}(),s("../lib/almond/almond",function(){}),function(){var e={}.hasOwnProperty;s("hilib/functions/general",["require","jquery"],function(r){var i;return i=r("jquery"),{generateID:function(e){var t,n;e=e!=null&&e>0?e-1:7,t="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",n=t.charAt(Math.floor(Math.random()*52));while(e--)n+=t.charAt(Math.floor(Math.random()*t.length));return n},deepCopy:function(e){var t;return t=Array.isArray(e)?[]:{},i.extend(!0,t,e)},timeoutWithReset:function(){var e;return e=null,function(t,n,r){return e!=null&&(r!=null&&r(),clearTimeout(e)),e=setTimeout(function(){return e=null,n()},t)}}(),highlighter:function(e){var t,n,r;return e==null&&(e={}),t=e.className,r=e.tagName,t==null&&(t="hilite"),r==null&&(r="span"),n=null,{on:function(e){var i,s,o;return o=e.startNode,i=e.endNode,s=document.createRange(),s.setStartAfter(o),s.setEndBefore(i),n=document.createElement(r),n.className=t,n.appendChild(s.extractContents()),s.insertNode(n)},off:function(){return i(n).replaceWith(function(){return i(this).contents()})}}},position:function(e,t){var n,r;n=0,r=0;while(e!==t)n+=e.offsetLeft,r+=e.offsetTop,e=e.offsetParent;return{left:n,top:r}},boundingBox:function(e){var t;return t=i(e).offset(),t.width=e.clientWidth,t.height=e.clientHeight,t.right=t.left+t.width,t.bottom=t.top+t.height,t},isDescendant:function(e,t){var n;n=t.parentNode;while(n!=null){if(n===e)return!0;n=n.parentNode}return!1},removeFromArray:function(e,t){var n;return n=e.indexOf(t),e.splice(n,1)},escapeRegExp:function(e){return e.replace(/[-\/\\^$*+?.()|[\]{}]/g,"\\$&")},flattenObject:function(r,i,s){var o,u;i==null&&(i={}),s==null&&(s="");for(o in r){if(!e.call(r,o))continue;u=r[o],!(t.isObject(u)&&!t.isArray(u)&&!t.isFunction(u))||u instanceof n.Model||u instanceof n.Collection?i[s+o]=u:this.flattenObject(u,i,s+o+".")}return i},compareJSON:function(n,r){var i,s,o;s={};for(i in n){if(!e.call(n,i))continue;o=n[i],r.hasOwnProperty(i)||(s[i]="removed")}for(i in r){if(!e.call(r,i))continue;o=r[i],n.hasOwnProperty(i)?t.isArray(o)||this.isObjectLiteral(o)?t.isEqual(n[i],r[i])||(s[i]=r[i]):n[i]!==r[i]&&(s[i]=r[i]):s[i]="added"}return s},isObjectLiteral:function(e){var t;if(e==null||typeof e!="object")return!1;t=e;while(Object.getPrototypeOf(t=Object.getPrototypeOf(t))!==null)0;return Object.getPrototypeOf(e)===t},getScrollPercentage:function(e){var t,n,r,i;return n=e.scrollTop,i=e.scrollHeight-e.clientHeight,t=e.scrollLeft,r=e.scrollWidth-e.clientWidth,{top:Math.floor(n/i*100),left:Math.floor(t/r*100)}},setScrollPercentage:function(e,t){var n,r,i,s;return r=e.clientWidth,s=e.scrollWidth,n=e.clientHeight,i=e.scrollHeight,e.scrollTop=(i-n)*t.top/100,e.scrollLeft=(s-r)*t.left/100},checkCheckboxes:function(e,t,n){var r,i,s,o,u;e==null&&(e='input[type="checkbox"]'),t==null&&(t=!0),n==null&&(n=document),i=n.querySelectorAll(e),u=[];for(s=0,o=i.length;s<o;s++)r=i[s],u.push(r.checked=t);return u},setCursorToEnd:function(e,t){var n,r,i;i=t!=null?t:window,t==null&&(t=e),t.focus(),n=document.createRange(),n.selectNodeContents(e),n.collapse(!1),r=i.getSelection();if(r!=null)return r.removeAllRanges(),r.addRange(n)},arraySum:function(e){return e.length===0?0:e.reduce(function(e,t){return t+e})},getAspectRatio:function(e,t,n,r){var i,s;return s=n/e,i=r/t,Math.min(s,i)}}})}.call(this),function(){s("hilib/mixins/pubsub",["require","backbone"],function(e){var t;return t=e("backbone"),{subscribe:function(e,n){return this.listenTo(t,e,n)},publish:function(){return t.trigger.apply(t,arguments)}}})}.call(this),function(){s("config",["require"],function(e){return{baseUrl:"",searchPath:"",search:!0,token:null,queryOptions:{},facetNameMap:{}}})}.call(this),function(){s("hilib/functions/string",["require","jquery"],function(e){var t;return t=e("jquery"),{ucfirst:function(e){return e.charAt(0).toUpperCase()+e.slice(1)},slugify:function(e){var t,n,r,i;t="àáäâèéëêìíïîòóöôùúüûñç·/_:;",i="aaaaeeeeiiiioooouuuunc-----",e=e.trim().toLowerCase(),r=e.length;while(r--)n=t.indexOf(e[r]),n!==-1&&(e=e.substr(0,r)+i[n]+e.substr(r+1));return e.replace(/[^a-z0-9 -]/g,"").replace(/\s+|\-+/g,"-").replace(/^\-+|\-+$/g,"")},stripTags:function(e){return t("<span />").html(e).text()},onlyNumbers:function(e){return e.replace(/[^\d.]/g,"")}}})}.call(this),function(){s("hilib/managers/pubsub",["require","backbone"],function(e){var t;return t=e("backbone"),{subscribe:function(e,n){return this.listenTo(t,e,n)},publish:function(){return t.trigger.apply(t,arguments)}}})}.call(this),function(){var e={}.hasOwnProperty,n=function(t,n){function i(){this.constructor=t}for(var r in n)e.call(n,r)&&(t[r]=n[r]);return i.prototype=n.prototype,t.prototype=new i,t.__super__=n.prototype,t};s("models/base",["require","backbone","hilib/managers/pubsub"],function(e){var r,i,s,o;return r=e("backbone"),s=e("hilib/managers/pubsub"),i=function(e){function r(){return o=r.__super__.constructor.apply(this,arguments),o}return n(r,e),r.prototype.initialize=function(){return t.extend(this,s)},r}(r.Model)})}.call(this),function(){var e={}.hasOwnProperty,t=function(t,n){function i(){this.constructor=t}for(var r in n)e.call(n,r)&&(t[r]=n[r]);return i.prototype=n.prototype,t.prototype=new i,t.__super__=n.prototype,t};s("models/facet",["require","config","models/base"],function(e){var r,i,s,o;return s=e("config"),i={Base:e("models/base")},r=function(e){function n(){return o=n.__super__.constructor.apply(this,arguments),o}return t(n,e),n.prototype.idAttribute="name",n.prototype.parse=function(e){if(e.title==null||e.title===""&&s.facetNameMap[e.name]!=null)e.title=s.facetNameMap[e.name];return e},n}(n.Model)})}.call(this),function(){var e={}.hasOwnProperty,t=function(t,n){function i(){this.constructor=t}for(var r in n)e.call(n,r)&&(t[r]=n[r]);return i.prototype=n.prototype,t.prototype=new i,t.__super__=n.prototype,t};s("models/boolean",["require","models/facet"],function(e){var n,r,i;return r={Facet:e("models/facet")},n=function(e){function n(){return i=n.__super__.constructor.apply(this,arguments),i}return t(n,e),n.prototype.set=function(e,t){return e==="options"?t=this.parseOptions(t):e.options!=null&&(e.options=this.parseOptions(e.options)),n.__super__.set.call(this,e,t)},n.prototype.parseOptions=function(e){return e.length===1&&e.push({name:(!JSON.parse(e[0].name)).toString(),count:0}),e},n}(r.Facet)})}.call(this),function(){var e={}.hasOwnProperty,n=function(t,n){function i(){this.constructor=t}for(var r in n)e.call(n,r)&&(t[r]=n[r]);return i.prototype=n.prototype,t.prototype=new i,t.__super__=n.prototype,t};s("views/base",["require","backbone","hilib/managers/pubsub"],function(e){var r,i,s,o;return r=e("backbone"),s=e("hilib/managers/pubsub"),i=function(e){function r(){return o=r.__super__.constructor.apply(this,arguments),o}return n(r,e),r.prototype.initialize=function(){return t.extend(this,s)},r}(r.View)})}.call(this),function(e){if("function"==typeof bootstrap)bootstrap("jade",e);else if("object"==typeof exports)module.exports=e();else if("function"==typeof s&&s.amd)s("jade",e);else if("undefined"!=typeof ses){if(!ses.ok())return;ses.makeJade=e}else"undefined"!=typeof window?window.jade=e():global.jade=e()}(function(){var e,t,n,r,s;return function o(e,t,n){function r(u,a){if(!t[u]){if(!e[u]){var f=typeof i=="function"&&i;if(!a&&f)return f(u,!0);if(s)return s(u,!0);throw new Error("Cannot find module '"+u+"'")}var l=t[u]={exports:{}};e[u][0].call(l.exports,function(t){var n=e[u][1][t];return r(n?n:t)},l,l.exports,o,e,t,n)}return t[u].exports}var s=typeof i=="function"&&i;for(var u=0;u<n.length;u++)r(n[u]);return r}({1:[function(e,t,n){function r(e){return e!=null&&e!==""}function i(e){return Array.isArray(e)?e.map(i).filter(r).join(" "):e}Array.isArray||(Array.isArray=function(e){return"[object Array]"==Object.prototype.toString.call(e)}),Object.keys||(Object.keys=function(e){var t=[];for(var n in e)e.hasOwnProperty(n)&&t.push(n);return t}),n.merge=function(t,n){var i=t["class"],s=n["class"];if(i||s)i=i||[],s=s||[],Array.isArray(i)||(i=[i]),Array.isArray(s)||(s=[s]),t["class"]=i.concat(s).filter(r);for(var o in n)o!="class"&&(t[o]=n[o]);return t},n.attrs=function(t,r){var s=[],o=t.terse;delete t.terse;var u=Object.keys(t),a=u.length;if(a){s.push("");for(var f=0;f<a;++f){var l=u[f],c=t[l];"boolean"==typeof c||null==c?c&&(o?s.push(l):s.push(l+'="'+l+'"')):0==l.indexOf("data")&&"string"!=typeof c?s.push(l+"='"+JSON.stringify(c)+"'"):"class"==l?r&&r[l]?(c=n.escape(i(c)))&&s.push(l+'="'+c+'"'):(c=i(c))&&s.push(l+'="'+c+'"'):r&&r[l]?s.push(l+'="'+n.escape(c)+'"'):s.push(l+'="'+c+'"')}}return s.join(" ")},n.escape=function(t){return String(t).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")},n.rethrow=function s(t,n,r,i){if(t instanceof Error){if((typeof window!="undefined"||!n)&&!i)throw t.message+=" on line "+r,t;try{i=i||e("fs").readFileSync(n,"utf8")}catch(o){s(t,null,r)}var u=3,a=i.split("\n"),f=Math.max(r-u,0),l=Math.min(a.length,r+u),u=a.slice(f,l).map(function(e,t){var n=t+f+1;return(n==r?"  > ":"    ")+n+"| "+e}).join("\n");throw t.path=n,t.message=(n||"Jade")+":"+r+"\n"+u+"\n\n"+t.message,t}throw t}},{fs:2}],2:[function(e,t,n){},{}]},{},[1])(1)}),s("tpls",["jade"],function(e){return e&&e.runtime!==undefined&&(e=e.runtime),this.JST=this.JST||{},this.JST["faceted-search/facets/boolean.body"]=function(n){var r=[],i=n||{},s=i.options,o=i.name,u=i.ucfirst;return r.push("<ul>"),function(){var t=s;if("number"==typeof t.length)for(var n=0,i=t.length;n<i;n++){var a=t[n];r.push('<li><div class="row span6"><div class="cell span5"><input'+e.attrs({id:o+"_"+a.name,name:o+"_"+a.name,type:"checkbox","data-value":a.name},{id:!0,name:!0,type:!0,"data-value":!0})+"/><label"+e.attrs({"for":o+"_"+a.name},{"for":!0})+">"+e.escape(null==(e.interp=u(a.name))?"":e.interp)+'</label></div><div class="cell span1 alignright"><div class="count">'+e.escape(null==(e.interp=a.count)?"":e.interp)+"</div></div></div></li>")}else{var i=0;for(var n in t){i++;var a=t[n];r.push('<li><div class="row span6"><div class="cell span5"><input'+e.attrs({id:o+"_"+a.name,name:o+"_"+a.name,type:"checkbox","data-value":a.name},{id:!0,name:!0,type:!0,"data-value":!0})+"/><label"+e.attrs({"for":o+"_"+a.name},{"for":!0})+">"+e.escape(null==(e.interp=u(a.name))?"":e.interp)+'</label></div><div class="cell span1 alignright"><div class="count">'+e.escape(null==(e.interp=a.count)?"":e.interp)+"</div></div></div></li>")}}}.call(this),r.push("</ul>"),r.join("")},this.JST["faceted-search/facets/date"]=function(n){var r=[],i=n||{},s=i.name,o=i.title,u=i.options;return r.push("<header><h3"+e.attrs({"data-name":s},{"data-name":!0})+">"+e.escape(null==(e.interp=o)?"":e.interp)+'</h3></header><div class="body"><label>From:</label><select>'),function(){var t=u;if("number"==typeof t.length)for(var n=0,i=t.length;n<i;n++){var s=t[n];r.push("<option>"+e.escape(null==(e.interp=s)?"":e.interp)+"</option>")}else{var i=0;for(var n in t){i++;var s=t[n];r.push("<option>"+e.escape(null==(e.interp=s)?"":e.interp)+"</option>")}}}.call(this),r.push("</select><label>To:</label><select>"),function(){var t=u.reverse();if("number"==typeof t.length)for(var n=0,i=t.length;n<i;n++){var s=t[n];r.push("<option>"+e.escape(null==(e.interp=s)?"":e.interp)+"</option>")}else{var i=0;for(var n in t){i++;var s=t[n];r.push("<option>"+e.escape(null==(e.interp=s)?"":e.interp)+"</option>")}}}.call(this),r.push("</select></div>"),r.join("")},this.JST["faceted-search/facets/list.body"]=function(t){var n=[];return n.push("<ul></ul>"),n.join("")},this.JST["faceted-search/facets/list.menu"]=function(t){var n=[];return n.push('<div class="row span4 align middle"><div class="cell span2"><input type="text" name="filter"/></div><div class="cell span1"><small class="optioncount"></small></div><div class="cell span1 alignright"><nav><ul><li class="all">All </li><li class="none">None</li></ul></nav></div></div>'),n.join("")},this.JST["faceted-search/facets/list.options"]=function(n){var r=[],i=n||{},s=i.options,o=i.generateID;return function(){var t=s;if("number"==typeof t.length)for(var n=0,i=t.length;n<i;n++){var u=t[n];randomId=o(),r.push("<li><div"+e.attrs({"data-count":u.get("count"),"class":["row","span6"]},{"data-count":!0})+'><div class="cell span5"><input'+e.attrs({id:randomId,name:randomId,type:"checkbox","data-value":u.id,checked:u.get("checked")?!0:!1},{id:!0,name:!0,type:!0,"data-value":!0,checked:!0})+"/><label"+e.attrs({"for":randomId},{"for":!0})+">"+(null==(e.interp=u.id===":empty"?"<i>(empty)</i>":u.id)?"":e.interp)+'</label></div><div class="cell span1 alignright"><div class="count">'+e.escape(null==(e.interp=u.get("count")===0?u.get("total"):u.get("count"))?"":e.interp)+"</div></div></div></li>")}else{var i=0;for(var n in t){i++;var u=t[n];randomId=o(),r.push("<li><div"+e.attrs({"data-count":u.get("count"),"class":["row","span6"]},{"data-count":!0})+'><div class="cell span5"><input'+e.attrs({id:randomId,name:randomId,type:"checkbox","data-value":u.id,checked:u.get("checked")?!0:!1},{id:!0,name:!0,type:!0,"data-value":!0,checked:!0})+"/><label"+e.attrs({"for":randomId},{"for":!0})+">"+(null==(e.interp=u.id===":empty"?"<i>(empty)</i>":u.id)?"":e.interp)+'</label></div><div class="cell span1 alignright"><div class="count">'+e.escape(null==(e.interp=u.get("count")===0?u.get("total"):u.get("count"))?"":e.interp)+"</div></div></div></li>")}}}.call(this),r.join("")},this.JST["faceted-search/facets/main"]=function(n){var r=[],i=n||{},s=i.name,o=i.title;return r.push('<div class="placeholder pad4"><header><h3'+e.attrs({"data-name":s},{"data-name":!0})+">"+e.escape(null==(e.interp=o)?"":e.interp)+'</h3><small>&#8711;</small><div class="options"></div></header><div class="body"></div></div>'),r.join("")},this.JST["faceted-search/facets/search.body"]=function(t){var n=[];return n.push('<div class="row span4 align middle"><div class="cell span3"><div class="padr4"><input type="text" name="search"/></div></div><div class="cell span1"><button class="search">Search</button></div></div>'),n.join("")},this.JST["faceted-search/facets/search.menu"]=function(n){var r=[],i=n||{},s=i.model;r.push('<div class="row span1 align middle"><div class="cell span1 casesensitive"><input id="cb_casesensitive" type="checkbox" name="cb_casesensitive" data-attr="caseSensitive"/><label for="cb_casesensitive">Match case</label></div></div>');if(s.has("searchInAnnotations")||s.has("searchInTranscriptions"))r.push('<div class="row span1"><div class="cell span1"><h4>Search</h4><ul class="searchins">'),s.has("searchInAnnotations")&&r.push('<li class="searchin"><input'+e.attrs({id:"cb_searchin_annotations",type:"checkbox","data-attr":"searchInAnnotations",checked:s.get("searchInAnnotations")},{id:!0,type:!0,"data-attr":!0,checked:!0})+'/><label for="cb_searchin_annotations">Annotations</label></li>'),s.has("searchInTranscriptions")&&r.push('<li class="searchin"><input'+e.attrs({id:"cb_searchin_transcriptions",type:"checkbox","data-attr":"searchInTranscriptions",checked:s.get("searchInTranscriptions")},{id:!0,type:!0,"data-attr":!0,checked:!0})+'/><label for="cb_searchin_transcriptions">Transcriptions</label></li>'),r.push("</ul></div></div>");return s.has("textLayers")&&(r.push('<div class="row span1"><div class="cell span1"><h4>Text layers</h4><ul class="textlayers">'),function(){var t=s.get("textLayers");if("number"==typeof t.length)for(var n=0,i=t.length;n<i;n++){var o=t[n];r.push('<li class="textlayer"><input'+e.attrs({id:"cb_textlayer"+o,type:"checkbox","data-attr-array":"textLayers","data-value":o},{id:!0,type:!0,"data-attr-array":!0,"data-value":!0})+"/><label"+e.attrs({"for":"cb_textlayer"+o},{"for":!0})+">"+e.escape(null==(e.interp=o)?"":e.interp)+"</label></li>")}else{var i=0;for(var n in t){i++;var o=t[n];r.push('<li class="textlayer"><input'+e.attrs({id:"cb_textlayer"+o,type:"checkbox","data-attr-array":"textLayers","data-value":o},{id:!0,type:!0,"data-attr-array":!0,"data-value":!0})+"/><label"+e.attrs({"for":"cb_textlayer"+o},{"for":!0})+">"+e.escape(null==(e.interp=o)?"":e.interp)+"</label></li>")}}}.call(this),r.push("</ul></div></div>")),r.join("")},this.JST["faceted-search/main"]=function(t){var n=[];return n.push('<div class="overlay"></div><div class="faceted-search"><form><div class="search-placeholder"></div><div class="facets"><div class="loader"><h4>Loading facets...</h4><br/><img src="../images/faceted-search/loader.gif"/></div></div></form></div>'),n.join("")},this.JST}),function(){var t={}.hasOwnProperty,n=function(e,n){function i(){this.constructor=e}for(var r in n)t.call(n,r)&&(e[r]=n[r]);return i.prototype=n.prototype,e.prototype=new i,e.__super__=n.prototype,e};s("views/facets/main",["require","views/base","tpls"],function(t){var r,i,s,o;return i={Base:t("views/base")},s=t("tpls"),r=function(t){function r(){return o=r.__super__.constructor.apply(this,arguments),o}return n(r,t),r.prototype.initialize=function(){return r.__super__.initialize.apply(this,arguments)},r.prototype.events=function(){return{"click h3":"toggleBody","click header small":"toggleOptions"}},r.prototype.toggleOptions=function(e){return this.$("header small").toggleClass("active"),this.$("header .options").slideToggle(),this.$('header .options input[name="filter"]').focus()},r.prototype.toggleBody=function(t){return e(t.currentTarget).parents(".facet").find(".body").slideToggle()},r.prototype.render=function(){var e;return e=s["faceted-search/facets/main"](this.model.attributes),this.$el.html(e),this},r.prototype.update=function(e){},r}(i.Base)})}.call(this),function(){var e={}.hasOwnProperty,n=function(t,n){function i(){this.constructor=t}for(var r in n)e.call(n,r)&&(t[r]=n[r]);return i.prototype=n.prototype,t.prototype=new i,t.__super__=n.prototype,t};s("views/facets/boolean",["require","hilib/functions/string","models/boolean","views/facets/main","tpls"],function(e){var r,i,s,o,u,a;return s=e("hilib/functions/string"),i={Boolean:e("models/boolean")},o={Facet:e("views/facets/main")},u=e("tpls"),r=function(e){function r(){return a=r.__super__.constructor.apply(this,arguments),a}return n(r,e),r.prototype.className="facet boolean",r.prototype.events=function(){return t.extend({},r.__super__.events.apply(this,arguments),{'change input[type="checkbox"]':"checkChanged"})},r.prototype.checkChanged=function(e){return this.trigger("change",{facetValue:{name:this.model.get("name"),values:t.map(this.$("input:checked"),function(e){return e.getAttribute("data-value")})}})},r.prototype.initialize=function(e){return r.__super__.initialize.apply(this,arguments),this.model=new i.Boolean(e.attrs,{parse:!0}),this.listenTo(this.model,"change:options",this.render),this.render()},r.prototype.render=function(){var e;return r.__super__.render.apply(this,arguments),e=u["faceted-search/facets/boolean.body"](t.extend(this.model.attributes,{ucfirst:s.ucfirst})),this.$(".body").html(e),this.$("header small").hide(),this},r.prototype.update=function(e){return this.model.set("options",e)},r.prototype.reset=function(){return this.render()},r}(o.Facet)})}.call(this),function(){var e={}.hasOwnProperty,n=function(t,n){function i(){this.constructor=t}for(var r in n)e.call(n,r)&&(t[r]=n[r]);return i.prototype=n.prototype,t.prototype=new i,t.__super__=n.prototype,t};s("models/date",["require","models/facet"],function(e){var r,i,s;return i={Facet:e("models/facet")},r=function(e){function r(){return s=r.__super__.constructor.apply(this,arguments),s}return n(r,e),r.prototype.parse=function(e){return e.options=t.map(t.pluck(e.options,"name"),function(e){return e.substr(0,4)}),e.options=t.unique(e.options),e.options.sort(),e},r}(i.Facet)})}.call(this),function(){var e={}.hasOwnProperty,n=function(t,n){function i(){this.constructor=t}for(var r in n)e.call(n,r)&&(t[r]=n[r]);return i.prototype=n.prototype,t.prototype=new i,t.__super__=n.prototype,t};s("views/facets/date",["require","hilib/functions/string","models/date","views/facets/main","tpls"],function(e){var r,i,s,o,u,a;return s=e("hilib/functions/string"),i={Date:e("models/date")},o={Facet:e("views/facets/main")},u=e("tpls"),r=function(e){function r(){return a=r.__super__.constructor.apply(this,arguments),a}return n(r,e),r.prototype.className="facet date",r.prototype.initialize=function(e){return r.__super__.initialize.apply(this,arguments),this.model=new i.Date(e.attrs,{parse:!0}),this.listenTo(this.model,"change:options",this.render),this.render()},r.prototype.render=function(){var e;return r.__super__.render.apply(this,arguments),e=u["faceted-search/facets/date"](t.extend(this.model.attributes,{ucfirst:s.ucfirst})),this.$(".placeholder").html(e),this},r.prototype.update=function(e){},r.prototype.reset=function(){},r}(o.Facet)})}.call(this),function(){var e={}.hasOwnProperty,t=function(t,n){function i(){this.constructor=t}for(var r in n)e.call(n,r)&&(t[r]=n[r]);return i.prototype=n.prototype,t.prototype=new i,t.__super__=n.prototype,t};s("models/list",["require","models/facet"],function(e){var n,r,i;return r={Facet:e("models/facet")},n=function(e){function n(){return i=n.__super__.constructor.apply(this,arguments),i}return t(n,e),n}(r.Facet)})}.call(this),function(){var e={}.hasOwnProperty,t=function(t,n){function i(){this.constructor=t}for(var r in n)e.call(n,r)&&(t[r]=n[r]);return i.prototype=n.prototype,t.prototype=new i,t.__super__=n.prototype,t};s("models/list.option",["require","models/base"],function(e){var n,r,i;return r={Base:e("models/base")},n=function(e){function n(){return i=n.__super__.constructor.apply(this,arguments),i}return t(n,e),n.prototype.idAttribute="name",n.prototype.defaults=function(){return{name:"",count:0,total:0,checked:!1}},n.prototype.parse=function(e){return e.total=e.count,e},n}(r.Base)})}.call(this),function(){s("collections/base",["require","backbone"],function(e){var t;return t=e("backbone"),t.Collection})}.call(this),function(){var e={}.hasOwnProperty,n=function(t,n){function i(){this.constructor=t}for(var r in n)e.call(n,r)&&(t[r]=n[r]);return i.prototype=n.prototype,t.prototype=new i,t.__super__=n.prototype,t};s("collections/list.options",["require","models/list.option","collections/base"],function(e){var r,i,s,o;return s={Option:e("models/list.option")},r={Base:e("collections/base")},i=function(e){function r(){return o=r.__super__.constructor.apply(this,arguments),o}return n(r,e),r.prototype.model=s.Option,r.prototype.comparator=function(e){return-1*+e.get("count")},r.prototype.revert=function(){var e=this;return this.each(function(e){return e.set("checked",!1,{silent:!0})}),this.trigger("change")},r.prototype.updateOptions=function(e){var n=this;return e==null&&(e=[]),this.each(function(e){return e.set("count",0,{silent:!0})}),t.each(e,function(e){var t;return t=n.get(e.name),t.set("count",e.count,{silent:!0})}),this.sort()},r}(r.Base)})}.call(this),function(){var e={}.hasOwnProperty,n=function(t,n){function i(){this.constructor=t}for(var r in n)e.call(n,r)&&(t[r]=n[r]);return i.prototype=n.prototype,t.prototype=new i,t.__super__=n.prototype,t};s("views/facets/list.options",["require","hilib/functions/general","views/base","models/list","tpls"],function(e){var r,i,s,o,u,a;return r=e("hilib/functions/general"),o={Base:e("views/base")},s={List:e("models/list")},u=e("tpls"),i=function(e){function i(){return a=i.__super__.constructor.apply(this,arguments),a}return n(i,e),i.prototype.filtered_items=[],i.prototype.events=function(){return{'change input[type="checkbox"]':"checkChanged"}},i.prototype.checkChanged=function(e){var n;return n=e.currentTarget.getAttribute("data-value"),this.collection.get(n).set("checked",e.currentTarget.checked),this.trigger("change",{facetValue:{name:this.options.facetName,values:t.map(this.$("input:checked"),function(e){return e.getAttribute("data-value")})}})},i.prototype.initialize=function(){return i.__super__.initialize.apply(this,arguments),this.listenTo(this.collection,"sort",this.render),this.listenTo(this.collection,"change",this.render),this.render()},i.prototype.render=function(){var e,t;return e=this.filtered_items.length>0?this.filtered_items:this.collection.models,t=u["faceted-search/facets/list.options"]({options:e,generateID:r.generateID}),this.$el.html(t)},i.prototype.filterOptions=function(e){var t;return t=new RegExp(e,"i"),this.filtered_items=this.collection.filter(function(e){return t.test(e.id)}),this.trigger("filter:finished"),this.render()},i}(o.Base)})}.call(this),function(){var e={}.hasOwnProperty,n=function(t,n){function i(){this.constructor=t}for(var r in n)e.call(n,r)&&(t[r]=n[r]);return i.prototype=n.prototype,t.prototype=new i,t.__super__=n.prototype,t};s("views/facets/list",["require","hilib/functions/general","models/list","collections/list.options","views/facets/main","views/facets/list.options","tpls"],function(e){var r,i,s,o,u,a,f;return i=e("hilib/functions/general"),o={List:e("models/list")},r={Options:e("collections/list.options")},u={Facet:e("views/facets/main"),Options:e("views/facets/list.options")},a=e("tpls"),s=function(e){function i(){return f=i.__super__.constructor.apply(this,arguments),f}return n(i,e),i.prototype.checked=[],i.prototype.filtered_items=[],i.prototype.className="facet list",i.prototype.events=function(){return t.extend({},i.__super__.events.apply(this,arguments),{"click li.all":"selectAll","click li.none":"deselectAll",'keyup input[name="filter"]':function(e){return this.optionsView.filterOptions(e.currentTarget.value)}})},i.prototype.selectAll=function(){var e,t,n,r,i;t=this.el.querySelectorAll('input[type="checkbox"]'),i=[];for(n=0,r=t.length;n<r;n++)e=t[n],i.push(e.checked=!0);return i},i.prototype.deselectAll=function(){var e,t,n,r,i;t=this.el.querySelectorAll('input[type="checkbox"]'),i=[];for(n=0,r=t.length;n<r;n++)e=t[n],i.push(e.checked=!1);return i},i.prototype.initialize=function(e){return this.options=e,i.__super__.initialize.apply(this,arguments),this.model=new o.List(this.options.attrs,{parse:!0}),this.render()},i.prototype.render=function(){var e,t,n,s=this;return i.__super__.render.apply(this,arguments),t=a["faceted-search/facets/list.menu"](this.model.attributes),e=a["faceted-search/facets/list.body"](this.model.attributes),this.el.querySelector("header .options").innerHTML=t,this.el.querySelector(".body").innerHTML=e,n=new r.Options(this.options.attrs.options,{parse:!0}),this.optionsView=new u.Options({el:this.el.querySelector(".body ul"),collection:n,facetName:this.model.get("name")}),this.listenTo(this.optionsView,"filter:finished",this.renderFilteredOptionCount),this.listenTo(this.optionsView,"change",function(e){return s.trigger("change",e)}),this},i.prototype.renderFilteredOptionCount=function(){var e,t;return t=this.optionsView.filtered_items.length,e=this.optionsView.collection.length,t===0||t===e?(this.$('header .options input[name="filter"]').addClass("nonefound"),this.$("header small.optioncount").html("")):(this.$('header .options input[name="filter"]').removeClass("nonefound"),this.$("header small.optioncount").html(t+" of "+e)),this},i.prototype.update=function(e){return this.optionsView.collection.updateOptions(e)},i.prototype.reset=function(){return this.optionsView.collection.revert()},i}(u.Facet)})}.call(this),function(){s("facetviewmap",["require","views/facets/boolean","views/facets/date","views/facets/list"],function(e){return{BOOLEAN:e("views/facets/boolean"),DATE:e("views/facets/date"),LIST:e("views/facets/list")}})}.call(this),function(){s("hilib/managers/ajax",["require","jquery"],function(e){var t,n;return t=e("jquery"),t.support.cors=!0,n={token:!0},{token:null,get:function(e,t){return t==null&&(t={}),this.fire("get",e,t)},post:function(e,t){return t==null&&(t={}),this.fire("post",e,t)},put:function(e,t){return t==null&&(t={}),this.fire("put",e,t)},poll:function(e){var t,n,r,i,s=this;return i=e.url,r=e.testFn,t=e.done,n=function(){var e;return e=s.get({url:i}),e.done(function(e,i,s){return r(e)?t(e,i,s):setTimeout(n,5e3)})},n()},fire:function(e,r,i){var s,o=this;return i=t.extend({},n,i),s={type:e,dataType:"json",contentType:"application/json; charset=utf-8",processData:!1,crossDomain:!0},this.token!=null&&i.token&&(s.beforeSend=function(e){return e.setRequestHeader("Authorization","SimpleAuth "+o.token)}),t.ajax(t.extend(s,r))}}})}.call(this),function(){s("hilib/managers/token",["require","backbone","underscore","hilib/managers/pubsub"],function(e){var t,n,r,i;return t=e("backbone"),i=e("underscore"),n=e("hilib/managers/pubsub"),r=function(){function e(){i.extend(this,t.Events),i.extend(this,n)}return e.prototype.token=null,e.prototype.set=function(e){return this.token=e,sessionStorage.setItem("huygens_token",e)},e.prototype.get=function(){return this.token==null&&(this.token=sessionStorage.getItem("huygens_token")),this.token==null?!1:this.token},e.prototype.clear=function(){return sessionStorage.removeItem("huygens_token")},e}(),new r})}.call(this),function(){var e={}.hasOwnProperty,t=function(t,n){function i(){this.constructor=t}for(var r in n)e.call(n,r)&&(t[r]=n[r]);return i.prototype=n.prototype,t.prototype=new i,t.__super__=n.prototype,t};s("models/searchresult",["require","hilib/managers/ajax","hilib/managers/token","config","models/base"],function(e){var n,r,i,s,o,u;return i=e("hilib/managers/ajax"),o=e("hilib/managers/token"),s=e("config"),n={Base:e("models/base")},r=function(e){function n(){return u=n.__super__.constructor.apply(this,arguments),u}return t(n,e),n.prototype.defaults=function(){return{_next:null,_prev:null,ids:[],numFound:null,results:[],rows:null,solrquery:"",sortableFields:[],start:null,term:""}},n.prototype.sync=function(e,t,n){var r,o=this;if(e==="read")return n.url!=null?this.getResults(n.url,n.success):(i.token=s.token,r=i.post({url:s.baseUrl+s.searchPath,data:n.data,dataType:"text"}),r.done(function(e,t,r){var i;if(r.status===201)return i=r.getResponseHeader("Location"),o.resultRows!=null&&(i+="?rows="+o.resultRows),o.getResults(i,n.success)}),r.fail(function(e,t,n){if(e.status===401)return o.publish("unauthorized")}))},n.prototype.getResults=function(e,t){var n,r=this;return i.token=s.token,n=i.get({url:e}),n.done(function(e,n,r){return t(e)}),n.fail(function(){return console.error("Failed getting FacetedSearch results from the server!")})},n}(n.Base)})}.call(this),function(){var e={}.hasOwnProperty,r=function(t,n){function i(){this.constructor=t}for(var r in n)e.call(n,r)&&(t[r]=n[r]);return i.prototype=n.prototype,t.prototype=new i,t.__super__=n.prototype,t};s("collections/searchresults",["require","hilib/mixins/pubsub","models/searchresult"],function(e){var i,s,o,u;return o=e("hilib/mixins/pubsub"),i=e("models/searchresult"),s=function(e){function n(){return u=n.__super__.constructor.apply(this,arguments),u}return r(n,e),n.prototype.model=i,n.prototype.initialize=function(){return t.extend(this,o),this.currentQueryOptions=null,this.cachedModels={},this.on("add",this.setCurrent,this)},n.prototype.setCurrent=function(e){return this.current=e,this.publish("change:results",e,this.currentQueryOptions)},n.prototype.runQuery=function(e){var t,n,r,s=this;return this.currentQueryOptions=e,this.currentQueryOptions.hasOwnProperty("resultRows")&&(n=this.currentQueryOptions.resultRows,delete this.currentQueryOptions.resultRows),t=JSON.stringify(this.currentQueryOptions),this.cachedModels.hasOwnProperty(t)?this.setCurrent(this.cachedModels[t]):(this.trigger("request"),r=new i,n!=null&&(r.resultRows=n),r.fetch({data:t,success:function(e,n,r){return s.cachedModels[t]=e,s.add(e)}}))},n.prototype.moveCursor=function(e){var t,n,r=this;if(n=this.current.get(e))return this.cachedModels.hasOwnProperty(n)?this.setCurrent(this.cachedModels[n]):(this.trigger("request"),t=new i,t.fetch({url:n,success:function(e,t,i){return r.cachedModels[n]=e,r.add(e)}}))},n}(n.Collection)})}.call(this),function(){var e={}.hasOwnProperty,r=function(t,n){function i(){this.constructor=t}for(var r in n)e.call(n,r)&&(t[r]=n[r]);return i.prototype=n.prototype,t.prototype=new i,t.__super__=n.prototype,t};s("models/main",["require","collections/searchresults"],function(e){var i,s,o;return s=e("collections/searchresults"),i=function(e){function n(){return o=n.__super__.constructor.apply(this,arguments),o}return r(n,e),n.prototype.defaults=function(){return{facetValues:[]}},n.prototype.initialize=function(e,t){var n=this;return this.queryOptions=e,this.searchResults=new s,this.on("change",function(e,t){return n.searchResults.runQuery(n.attributes)}),this.trigger("change")},n.prototype.set=function(e,r){var i;return e.facetValue!=null&&(i=t.reject(this.get("facetValues"),function(t){return t.name===e.facetValue.name}),e.facetValue.values.length&&i.push(e.facetValue),e.facetValues=i,delete e.facetValue),n.__super__.set.call(this,e,r)},n.prototype.reset=function(){return this.clear({silent:!0}),this.set(this.defaults(),{silent:!0}),this.set(this.queryOptions,{silent:!0}),this.trigger("change")},n}(n.Model)})}.call(this),function(){var e={}.hasOwnProperty,t=function(t,n){function i(){this.constructor=t}for(var r in n)e.call(n,r)&&(t[r]=n[r]);return i.prototype=n.prototype,t.prototype=new i,t.__super__=n.prototype,t};s("models/search",["require","models/base"],function(e){var n,r,i;return n={Base:e("models/base")},r=function(e){function n(){return i=n.__super__.constructor.apply(this,arguments),i}return t(n,e),n.prototype.defaults=function(){return{term:"*",caseSensitive:!1,title:"Text search",name:"text_search"}},n.prototype.queryData=function(){var e;return e=this.attributes,delete e.name,delete e.title,e},n}(n.Base)})}.call(this),function(){var e={}.hasOwnProperty,n=function(t,n){function i(){this.constructor=t}for(var r in n)e.call(n,r)&&(t[r]=n[r]);return i.prototype=n.prototype,t.prototype=new i,t.__super__=n.prototype,t};s("views/search",["require","config","models/search","views/facets/main","tpls"],function(e){var r,i,s,o,u,a;return o=e("config"),r={Search:e("models/search")},s={Facet:e("views/facets/main")},u=e("tpls"),i=function(e){function i(){return a=i.__super__.constructor.apply(this,arguments),a}return n(i,e),i.prototype.className="facet search",i.prototype.initialize=function(e){var t=this;return i.__super__.initialize.apply(this,arguments),this.model=new r.Search(o.textSearchOptions),this.listenTo(this.model,"change",function(){return t.trigger("change",t.model.queryData())}),this.render()},i.prototype.render=function(){var e,t;return i.__super__.render.apply(this,arguments),t=u["faceted-search/facets/search.menu"]({model:this.model}),e=u["faceted-search/facets/search.body"]({model:this.model}),this.$(".options").html(t),this.$(".body").html(e),this},i.prototype.events=function(){return t.extend({},i.__super__.events.apply(this,arguments),{"click button":function(e){return e.preventDefault()},"click button.active":"search","keyup input":"activateSearchButton",'change input[type="checkbox"]':"checkboxChanged"})},i.prototype.checkboxChanged=function(e){var t,n,r,i,s,o;if(t=e.currentTarget.getAttribute("data-attr"))this.model.set(t,e.currentTarget.checked);else if(t=e.currentTarget.getAttribute("data-attr-array")){r=[],o=this.el.querySelectorAll('[data-attr-array="'+t+'"]');for(i=0,s=o.length;i<s;i++)n=o[i],n.checked&&r.push(n.getAttribute("data-value"));this.model.set(t,r)}return this.activateSearchButton(!0)},i.prototype.activateSearchButton=function(e){var t;return e==null&&(e=!1),e.hasOwnProperty("target")&&(e=!1),t=this.el.querySelector('input[name="search"]').value,t.length>1&&(this.model.get("term")!==t||e)?this.$("button").addClass("active"):this.$("button").removeClass("active")},i.prototype.search=function(e){var t,n;return e.preventDefault(),this.$("button").removeClass("active"),t=this.$('input[name="search"]'),t.addClass("loading"),n=this.el.querySelector('input[name="search"]').value,this.model.set("term",n)},i.prototype.update=function(){return this.$('input[name="search"]').removeClass("loading")},i}(s.Facet)})}.call(this),function(){var e={}.hasOwnProperty,r=function(t,n){function i(){this.constructor=t}for(var r in n)e.call(n,r)&&(t[r]=n[r]);return i.prototype=n.prototype,t.prototype=new i,t.__super__=n.prototype,t};i.config({baseUrl:"compiled/js",paths:{tpls:"../templates",jade:"../lib/jade/runtime"}}),s("main",["require","hilib/functions/general","hilib/mixins/pubsub","config","facetviewmap","models/main","views/base","views/search","views/facets/list","views/facets/boolean","views/facets/date","tpls"],function(i){var s,o,u,a,f,l,c,h,p;return o=i("hilib/functions/general"),c=i("hilib/mixins/pubsub"),f=i("config"),l=i("facetviewmap"),u={FacetedSearch:i("models/main")},a={Base:i("views/base"),TextSearch:i("views/search"),Facets:{List:i("views/facets/list"),Boolean:i("views/facets/boolean"),Date:i("views/facets/date")}},h=i("tpls"),s=function(n){function i(){return p=i.__super__.constructor.apply(this,arguments),p}return r(i,n),i.prototype.initialize=function(e){var n,r=this;return this.facetViews={},t.extend(this,c),t.extend(l,e.facetViewMap),delete e.facetViewMap,t.extend(f.facetNameMap,e.facetNameMap),delete e.facetNameMap,t.extend(f,e),n=t.extend(f.queryOptions,f.textSearchOptions),this.render(),this.subscribe("unauthorized",function(){return r.trigger("unauthorized")}),this.subscribe("change:results",function(e,t){return r.renderFacets(),r.trigger("results:change",e,t)}),this.model=new u.FacetedSearch(n),this.listenTo(this.model.searchResults,"request",function(){var e,t;return t=r.el.querySelector(".faceted-search"),e=r.el.querySelector(".overlay"),e.style.width=t.clientWidth+"px",e.style.height=t.clientHeight+"px",e.style.display="block"}),this.listenTo(this.model.searchResults,"sync",function(){var e;return e=r.el.querySelector(".overlay"),e.style.display="none"})},i.prototype.render=function(){var e,t,n=this;return e=h["faceted-search/main"](),this.$el.html(e),this.$(".loader").fadeIn("slow"),f.search&&(t=new a.TextSearch,this.$(".search-placeholder").html(t.$el),this.listenTo(t,"change",function(e){return n.model.set(e)}),this.facetViews.textSearch=t),this},i.prototype.renderFacets=function(t){var n,r,i,s,o,u,a,f=this;this.$(".loader").hide();if(this.model.searchResults.length===1){i=document.createDocumentFragment(),o=this.model.searchResults.current.get("facets");for(s in o){if(!e.call(o,s))continue;r=o[s],r.type in l?(n=l[r.type],this.facetViews[r.name]=new n({attrs:r}),this.listenTo(this.facetViews[r.name],"change",function(e){return f.model.set(e)}),i.appendChild(this.facetViews[r.name].el)):console.error("Unknown facetView",r.type)}return this.$(".facets").html(i)}this.facetViews.hasOwnProperty("textSearch")&&this.facetViews.textSearch.update(),u=this.model.searchResults.current.get("facets"),a=[];for(s in u){if(!e.call(u,s))continue;t=u[s],a.push(this.facetViews[t.name].update(t.options))}return a},i.prototype.next=function(){return this.model.searchResults.moveCursor("_next")},i.prototype.prev=function(){return this.model.searchResults.moveCursor("_prev")},i.prototype.hasNext=function(){return this.model.searchResults.current.has("_next")},i.prototype.hasPrev=function(){return this.model.searchResults.current.has("_prev")},i.prototype.reset=function(){var t,n,r;r=this.model.searchResults.last().get("facets");for(n in r){if(!e.call(r,n))continue;t=r[n],this.facetViews[t.name].reset&&this.facetViews[t.name].reset()}return this.model.reset()},i}(n.View)})}.call(this),s("jquery",function(){return e}),s("underscore",function(){return t}),s("backbone",function(){return n}),i("main")});
define('hilib/templates',['jade'], function(jade) { if(jade && jade['runtime'] !== undefined) { jade = jade.runtime; }

this["JST"] = this["JST"] || {};

this["JST"]["hilib/mixins/dropdown/main"] = function anonymous(locals) {
var buf = [];
var locals_ = (locals || {}),collection = locals_.collection,selected = locals_.selected,active = locals_.active;// iterate collection.models
;(function(){
  var $$obj = collection.models;
  if ('number' == typeof $$obj.length) {

    for (var $index = 0, $$l = $$obj.length; $index < $$l; $index++) {
      var model = $$obj[$index];

buf.push("<li" + (jade.attrs({ 'data-id':(model.id), "class": [('list'),(selected===model?active:'')] }, {"class":true,"data-id":true})) + ">" + (jade.escape(null == (jade.interp = model.get('title')) ? "" : jade.interp)) + "</li>");
    }

  } else {
    var $$l = 0;
    for (var $index in $$obj) {
      $$l++;      var model = $$obj[$index];

buf.push("<li" + (jade.attrs({ 'data-id':(model.id), "class": [('list'),(selected===model?active:'')] }, {"class":true,"data-id":true})) + ">" + (jade.escape(null == (jade.interp = model.get('title')) ? "" : jade.interp)) + "</li>");
    }

  }
}).call(this);
;return buf.join("");
};

this["JST"]["hilib/views/form/autosuggest/main"] = function anonymous(locals) {
var buf = [];
var locals_ = (locals || {}),viewId = locals_.viewId,selected = locals_.selected,settings = locals_.settings;buf.push("<div class=\"input\"><input" + (jade.attrs({ 'data-view-id':(viewId), 'value':(selected.get('title')) }, {"data-view-id":true,"value":true})) + "/><div class=\"caret\"></div></div>");
if ( settings.editable)
{
buf.push("<button class=\"edit\">Edit</button>");
}
if ( settings.mutable)
{
buf.push("<button class=\"add\">Add</button>");
}
buf.push("<ul class=\"list\"></ul>");;return buf.join("");
};

this["JST"]["hilib/views/form/combolist/main"] = function anonymous(locals) {
var buf = [];
var locals_ = (locals || {}),viewId = locals_.viewId,settings = locals_.settings,selected = locals_.selected;buf.push("<div class=\"input\"><input" + (jade.attrs({ 'type':("text"), 'data-view-id':(viewId), 'placeholder':(settings.placeholder) }, {"type":true,"data-view-id":true,"placeholder":true})) + "/><div class=\"caret\"></div></div>");
if ( settings.editable)
{
buf.push("<button class=\"edit\">Edit</button>");
}
buf.push("<ul class=\"list\"></ul><ul class=\"selected\">");
// iterate selected.models
;(function(){
  var $$obj = selected.models;
  if ('number' == typeof $$obj.length) {

    for (var $index = 0, $$l = $$obj.length; $index < $$l; $index++) {
      var model = $$obj[$index];

buf.push("<li" + (jade.attrs({ 'data-id':(model.id), "class": [('selected')] }, {"data-id":true})) + "><span>" + (jade.escape(null == (jade.interp = model.get('title')) ? "" : jade.interp)) + "</span></li>");
    }

  } else {
    var $$l = 0;
    for (var $index in $$obj) {
      $$l++;      var model = $$obj[$index];

buf.push("<li" + (jade.attrs({ 'data-id':(model.id), "class": [('selected')] }, {"data-id":true})) + "><span>" + (jade.escape(null == (jade.interp = model.get('title')) ? "" : jade.interp)) + "</span></li>");
    }

  }
}).call(this);

buf.push("</ul>");;return buf.join("");
};

this["JST"]["hilib/views/form/editablelist/main"] = function anonymous(locals) {
var buf = [];
var locals_ = (locals || {}),viewId = locals_.viewId,settings = locals_.settings,selected = locals_.selected;buf.push("<input" + (jade.attrs({ 'data-view-id':(viewId), 'placeholder':(settings.placeholder) }, {"data-view-id":true,"placeholder":true})) + "/><button>Add to list</button><ul class=\"selected\">");
// iterate selected.models
;(function(){
  var $$obj = selected.models;
  if ('number' == typeof $$obj.length) {

    for (var $index = 0, $$l = $$obj.length; $index < $$l; $index++) {
      var model = $$obj[$index];

buf.push("<li" + (jade.attrs({ 'data-id':(model.id) }, {"data-id":true})) + "><span>" + (jade.escape(null == (jade.interp = model.id) ? "" : jade.interp)) + "</span></li>");
    }

  } else {
    var $$l = 0;
    for (var $index in $$obj) {
      $$l++;      var model = $$obj[$index];

buf.push("<li" + (jade.attrs({ 'data-id':(model.id) }, {"data-id":true})) + "><span>" + (jade.escape(null == (jade.interp = model.id) ? "" : jade.interp)) + "</span></li>");
    }

  }
}).call(this);

buf.push("</ul>");;return buf.join("");
};

this["JST"]["hilib/views/modal/main"] = function anonymous(locals) {
var buf = [];
var locals_ = (locals || {}),title = locals_.title,cancelAndSubmit = locals_.cancelAndSubmit,cancelValue = locals_.cancelValue,submitValue = locals_.submitValue;buf.push("<div class=\"overlay\"></div><div class=\"modalbody\"><header>");
if ( (title !== ''))
{
buf.push("<h2>" + (jade.escape(null == (jade.interp = title) ? "" : jade.interp)) + "</h2>");
}
buf.push("<p class=\"message\"></p></header><div class=\"body\"></div>");
if ( (cancelAndSubmit))
{
buf.push("<footer><button class=\"cancel\">" + (jade.escape(null == (jade.interp = cancelValue) ? "" : jade.interp)) + "</button><button class=\"submit\">" + (jade.escape(null == (jade.interp = submitValue) ? "" : jade.interp)) + "</button></footer>");
}
buf.push("</div>");;return buf.join("");
};

this["JST"]["hilib/views/supertinyeditor/diacritics"] = function anonymous(locals) {
var buf = [];
var locals_ = (locals || {}),diacritics = locals_.diacritics;buf.push("<ul class=\"diacritics\">");
// iterate diacritics
;(function(){
  var $$obj = diacritics;
  if ('number' == typeof $$obj.length) {

    for (var $index = 0, $$l = $$obj.length; $index < $$l; $index++) {
      var diacritic = $$obj[$index];

buf.push("<li>" + (jade.escape(null == (jade.interp = diacritic) ? "" : jade.interp)) + "</li>");
    }

  } else {
    var $$l = 0;
    for (var $index in $$obj) {
      $$l++;      var diacritic = $$obj[$index];

buf.push("<li>" + (jade.escape(null == (jade.interp = diacritic) ? "" : jade.interp)) + "</li>");
    }

  }
}).call(this);

buf.push("</ul>");;return buf.join("");
};

this["JST"]["hilib/views/supertinyeditor/main"] = function anonymous(locals) {
var buf = [];
buf.push("<div class=\"supertinyeditor\"><div class=\"ste-header\"></div><div class=\"ste-body\"><iframe></iframe></div></div>");;return buf.join("");
};

return this["JST"];

});
(function() {
  define('hilib/managers/modal',['require'],function(require) {
    var ModalManager;
    ModalManager = (function() {
      function ModalManager() {
        this.modals = [];
      }

      ModalManager.prototype.add = function(modal) {
        var arrLength, m, _i, _len, _ref;
        _ref = this.modals;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          m = _ref[_i];
          m.$('.overlay').css('opacity', '0.2');
        }
        arrLength = this.modals.push(modal);
        modal.$('.overlay').css('z-index', 10000 + (arrLength * 2) - 1);
        modal.$('.modalbody').css('z-index', 10000 + (arrLength * 2));
        return $('body').prepend(modal.$el);
      };

      ModalManager.prototype.remove = function(modal) {
        var index;
        index = this.modals.indexOf(modal);
        this.modals.splice(index, 1);
        if (this.modals.length > 0) {
          this.modals[this.modals.length - 1].$('.overlay').css('opacity', '0.7');
        }
        modal.trigger('removed');
        modal.off();
        return modal.remove();
      };

      return ModalManager;

    })();
    return new ModalManager();
  });

}).call(this);

(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define('hilib/views/modal/main',['require','backbone','hilib/templates','hilib/managers/modal'],function(require) {
    var Backbone, Modal, modalManager, tpls, _ref;
    Backbone = require('backbone');
    tpls = require('hilib/templates');
    modalManager = require('hilib/managers/modal');
    return Modal = (function(_super) {
      __extends(Modal, _super);

      function Modal() {
        _ref = Modal.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      Modal.prototype.className = "modal";

      Modal.prototype.initialize = function(options) {
        this.options = options;
        Modal.__super__.initialize.apply(this, arguments);
        return this.render();
      };

      Modal.prototype.render = function() {
        var data, marginLeft, marginTop, rtpl, scrollTop, top, viewportHeight;
        data = _.extend({
          title: '',
          cancelAndSubmit: true,
          cancelValue: 'Cancel',
          submitValue: 'Submit'
        }, this.options);
        rtpl = tpls['hilib/views/modal/main'](data);
        this.$el.html(rtpl);
        if (this.options.$html) {
          this.$(".body").html(this.options.$html);
        }
        modalManager.add(this);
        if (this.options.width != null) {
          this.$('.modalbody').css('width', this.options.width);
          marginLeft = -1 * parseInt(this.options.width, 10) / 2;
          if (this.options.width.slice(-1) === '%') {
            marginLeft += '%';
          }
          if (this.options.width.slice(-2) === 'vw') {
            marginLeft += 'vw';
          }
          if (this.options.width === 'auto') {
            marginLeft = this.$('.modalbody').width() / -2;
          }
          this.$('.modalbody').css('margin-left', marginLeft);
        }
        if (this.options.height != null) {
          this.$('.modalbody').css('height', this.options.height);
        }
        scrollTop = document.querySelector('body').scrollTop;
        viewportHeight = document.documentElement.clientHeight;
        top = (viewportHeight - this.$('.modalbody').height()) / 2;
        marginTop = Math.max(this.$('.modalbody').height() / -2, (viewportHeight - 400) * -0.5);
        this.$('.modalbody').css('margin-top', marginTop);
        return this.$('.modalbody .body').css('max-height', viewportHeight - 400);
      };

      Modal.prototype.events = {
        "click button.submit": function() {
          return this.trigger('submit');
        },
        "click button.cancel": function() {
          return this.cancel();
        },
        "click .overlay": function() {
          return this.cancel();
        },
        "keydown input": function(ev) {
          if (ev.keyCode === 13) {
            ev.preventDefault();
            return this.trigger('submit');
          }
        }
      };

      Modal.prototype.cancel = function() {
        this.trigger("cancel");
        return this.close();
      };

      Modal.prototype.close = function() {
        return modalManager.remove(this);
      };

      Modal.prototype.fadeOut = function(delay) {
        var speed,
          _this = this;
        if (delay == null) {
          delay = 1000;
        }
        speed = delay === 0 ? 0 : 500;
        this.$(".modalbody").delay(delay).fadeOut(speed);
        return setTimeout((function() {
          return _this.close();
        }), delay + speed - 100);
      };

      Modal.prototype.message = function(type, message) {
        if (["success", "warning", "error"].indexOf(type) === -1) {
          return console.error("Unknown message type!");
        }
        return this.$("p.message").html(message).addClass(type);
      };

      Modal.prototype.messageAndFade = function(type, message, delay) {
        this.$(".modalbody .body").hide();
        this.$("footer").hide();
        this.message(type, message);
        return this.fadeOut(delay);
      };

      return Modal;

    })(Backbone.View);
  });

}).call(this);

(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define('views/project/editselection',['require','config','hilib/managers/ajax','hilib/managers/token','views/base','tpls'],function(require) {
    var EditSelection, Views, ajax, config, token, tpls, _ref;
    config = require('config');
    ajax = require('hilib/managers/ajax');
    token = require('hilib/managers/token');
    Views = {
      Base: require('views/base')
    };
    tpls = require('tpls');
    return EditSelection = (function(_super) {
      __extends(EditSelection, _super);

      function EditSelection() {
        _ref = EditSelection.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      EditSelection.prototype.initialize = function() {
        EditSelection.__super__.initialize.apply(this, arguments);
        return this.render();
      };

      EditSelection.prototype.render = function() {
        var rtpl;
        rtpl = tpls['project/editselection'](this.model.attributes);
        this.$el.html(rtpl);
        return this;
      };

      EditSelection.prototype.events = function() {
        return {
          'click button[name="savemetadata"]': 'saveEditSelection',
          'click button[name="cancel"]': function() {
            return this.hide();
          },
          'keyup input[type="text"]': 'checkInput',
          'change input[type="checkbox"]': 'toggleInactive'
        };
      };

      EditSelection.prototype.checkInput = function(ev) {
        var cb;
        cb = ev.currentTarget.nextSibling;
        cb.checked = ev.currentTarget.value.trim().length > 0;
        return this.toggleInactive();
      };

      EditSelection.prototype.toggleInactive = function() {
        var entryCBs, metadataCBs;
        entryCBs = document.querySelectorAll('.entries input[type="checkbox"]:checked');
        metadataCBs = this.el.querySelectorAll('input[type=checkbox]:checked');
        if (entryCBs.length === 0 || metadataCBs.length === 0) {
          return this.$('button[name="savemetadata"]').addClass('inactive');
        } else {
          return this.$('button[name="savemetadata"]').removeClass('inactive');
        }
      };

      EditSelection.prototype.saveEditSelection = function(ev) {
        var entryIDs, jqXHR, settings,
          _this = this;
        ev.preventDefault();
        if (!$(ev.currentTarget).hasClass('inactive')) {
          entryIDs = _.map(document.querySelectorAll('.entries input[type="checkbox"]:checked'), function(cb) {
            return parseInt(cb.getAttribute('data-id'), 10);
          });
          settings = {};
          _.each(this.el.querySelectorAll('input[type="checkbox"]:checked'), function(cb) {
            var key, value;
            key = cb.getAttribute('data-name');
            value = _this.el.querySelector("input[name='" + key + "']").value;
            if (value.trim().length > 0) {
              return settings[key] = value;
            }
          });
          if (entryIDs.length > 0 && _.size(settings) > 0) {
            ajax.token = token.get();
            jqXHR = ajax.put({
              url: config.baseUrl + ("projects/" + this.model.id + "/multipleentrysettings"),
              data: JSON.stringify({
                projectEntryIds: entryIDs,
                settings: settings
              }),
              dataType: 'text'
            });
            jqXHR.done(function() {
              _this.hide();
              return _this.publish('message', 'Metadata of multiple entries saved.');
            });
            return jqXHR.fail(function(jqXHR, textStatus, errorThrown) {
              return console.log(jqXHR, textStatus, errorThrown);
            });
          }
        }
      };

      EditSelection.prototype.hide = function() {
        this.trigger('close');
        this.el.querySelector('form').reset();
        return this.el.style.display = 'none';
      };

      return EditSelection;

    })(Views.Base);
  });

}).call(this);

(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define('views/project/main',['require','hilib/functions/general','config','hilib/managers/token','models/currentUser','models/entry','collections/projects','views/base','faceted-search','hilib/views/modal/main','views/project/editselection','tpls'],function(require) {
    var Collections, Entry, Fn, ProjectSearch, Views, config, currentUser, token, tpls, _ref;
    Fn = require('hilib/functions/general');
    config = require('config');
    token = require('hilib/managers/token');
    currentUser = require('models/currentUser');
    Entry = require('models/entry');
    Collections = {
      projects: require('collections/projects')
    };
    Views = {
      Base: require('views/base'),
      FacetedSearch: require('faceted-search'),
      Modal: require('hilib/views/modal/main'),
      EditSelection: require('views/project/editselection')
    };
    tpls = require('tpls');
    return ProjectSearch = (function(_super) {
      __extends(ProjectSearch, _super);

      function ProjectSearch() {
        _ref = ProjectSearch.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      ProjectSearch.prototype.className = 'projectsearch';

      ProjectSearch.prototype.initialize = function() {
        var _this = this;
        ProjectSearch.__super__.initialize.apply(this, arguments);
        this.resultRows = 50;
        return Collections.projects.getCurrent(function(project) {
          _this.project = project;
          return _this.render();
        });
      };

      ProjectSearch.prototype.render = function() {
        var rtpl,
          _this = this;
        rtpl = tpls['project/main']({
          user: currentUser
        });
        this.$el.html(rtpl);
        this.editSelection = new Views.EditSelection({
          el: this.el.querySelector('.editselection-placeholder'),
          model: this.project
        });
        this.listenTo(this.editSelection, 'close', this.uncheckCheckboxes);
        this.facetedSearch = new Views.FacetedSearch({
          el: this.$('.faceted-search-placeholder'),
          baseUrl: config.baseUrl,
          searchPath: 'projects/' + this.project.id + '/search',
          token: token.get(),
          textSearchOptions: {
            textLayers: this.project.get('textLayers'),
            searchInAnnotations: true,
            searchInTranscriptions: true
          },
          queryOptions: {
            resultRows: this.resultRows
          }
        });
        this.listenTo(this.facetedSearch, 'unauthorized', function() {
          return _this.publish('unauthorized');
        });
        this.listenTo(this.facetedSearch, 'results:change', function(responseModel, queryOptions) {
          _this.project.get('entries').set(responseModel.get('results'));
          _this.listenTo(_this.project.get('entries'), 'current:change', function(entry) {
            return Backbone.history.navigate("projects/" + (_this.project.get('name')) + "/entries/" + entry.id, {
              trigger: true
            });
          });
          _this.renderHeader(responseModel);
          return _this.renderResults(responseModel, queryOptions);
        });
        return this;
      };

      ProjectSearch.prototype.renderHeader = function(responseModel) {
        var currentpage, pagecount;
        this.el.querySelector('h3.numfound').innerHTML = responseModel.get('numFound') + ' entries found';
        currentpage = (responseModel.get('start') / this.resultRows) + 1;
        pagecount = Math.ceil(responseModel.get('numFound') / this.resultRows);
        if (pagecount > 1) {
          if (!this.facetedSearch.hasPrev()) {
            this.$('.pagination li.prev').addClass('inactive');
          }
          if (!this.facetedSearch.hasNext()) {
            this.$('.pagination li.next').addClass('inactive');
          }
          this.$('.pagination li.currentpage').html(currentpage);
          this.$('.pagination li.pagecount').html(pagecount);
          return this.$('.pagination').show();
        } else {
          return this.$('.pagination').hide();
        }
      };

      ProjectSearch.prototype.renderResults = function(responseModel, queryOptions) {
        var rtpl;
        rtpl = tpls['project/results']({
          model: responseModel,
          generateID: Fn.generateID
        });
        this.$('ul.entries').html(rtpl);
        if ((queryOptions.term != null) && queryOptions.term !== '') {
          document.getElementById('cb_showkeywords').checked = true;
          this.$('.keywords').show();
        } else {
          document.getElementById('cb_showkeywords').checked = false;
          this.$('.keywords').hide();
        }
        return this;
      };

      ProjectSearch.prototype.events = {
        'click .submenu li[data-key="newsearch"]': function() {
          return this.facetedSearch.reset();
        },
        'click .submenu li[data-key="newentry"]': 'newEntry',
        'click .submenu li[data-key="editselection"]': 'showEditMetadata',
        'click .submenu li[data-key="publish"]': 'publishProject',
        'click li.entry label': 'changeCurrentEntry',
        'click .pagination li.prev': 'changePage',
        'click .pagination li.next': 'changePage',
        'click li[data-key="selectall"]': function() {
          return Fn.checkCheckboxes('.entries input[type="checkbox"]', true, this.el);
        },
        'click li[data-key="deselectall"]': 'uncheckCheckboxes',
        'change #cb_showkeywords': function(ev) {
          if (ev.currentTarget.checked) {
            return this.$('.keywords').show();
          } else {
            return this.$('.keywords').hide();
          }
        },
        'change .entry input[type="checkbox"]': function() {
          return this.editSelection.toggleInactive();
        }
      };

      ProjectSearch.prototype.publishProject = function(ev) {
        var busyText,
          _this = this;
        busyText = 'Publishing...';
        if (ev.currentTarget.innerHTML === busyText) {
          return false;
        }
        ev.currentTarget.innerHTML = busyText;
        ev.currentTarget.classList.add('active');
        return this.project.createDraft(function() {
          ev.currentTarget.innerHTML = 'Publish';
          return ev.currentTarget.classList.remove('active');
        });
      };

      ProjectSearch.prototype.showEditMetadata = function(ev) {
        var cb, checkboxes, display, editmetadataPlaceholder, opacity, visible, _i, _len;
        editmetadataPlaceholder = this.el.querySelector('.editselection-placeholder');
        visible = editmetadataPlaceholder.style.display === 'block';
        display = visible ? 'none' : 'block';
        opacity = visible ? 0 : 1;
        editmetadataPlaceholder.style.display = display;
        checkboxes = this.el.querySelectorAll('ul.entries input[type="checkbox"]');
        for (_i = 0, _len = checkboxes.length; _i < _len; _i++) {
          cb = checkboxes[_i];
          cb.style.opacity = opacity;
        }
        if (visible) {
          return Fn.checkCheckboxes(null, false);
        }
      };

      ProjectSearch.prototype.newEntry = function(ev) {
        var $html, modal,
          _this = this;
        $html = $('<form><ul><li><label>Name</label><input type="text" name="name" /></li></ul></form>');
        modal = new Views.Modal({
          title: "Create a new entry",
          $html: $html,
          submitValue: 'Create entry',
          width: '300px'
        });
        return modal.on('submit', function() {
          var entry;
          modal.message('success', 'Creating new entry...');
          entry = new Entry({
            name: modal.$('input[name="name"]').val()
          }, {
            projectID: _this.project.id
          });
          return entry.save([], {
            success: function(model) {
              _this.stopListening();
              _this.project.get('entries').add(model);
              modal.close();
              _this.publish('message', 'New entry added to project.');
              return Backbone.history.navigate("projects/" + (_this.project.get('name')) + "/entries/" + entry.id, {
                trigger: true
              });
            }
          });
        });
      };

      ProjectSearch.prototype.changePage = function(ev) {
        var cl;
        cl = ev.currentTarget.classList;
        if (cl.contains('inactive')) {
          return;
        }
        this.el.querySelector('li.prev').classList.remove('inactive');
        this.el.querySelector('li.next').classList.remove('inactive');
        if (cl.contains('prev')) {
          return this.facetedSearch.prev();
        } else if (cl.contains('next')) {
          return this.facetedSearch.next();
        }
      };

      ProjectSearch.prototype.changeCurrentEntry = function(ev) {
        var entryID;
        if (this.el.querySelector('.editselection-placeholder').style.display !== 'block') {
          entryID = ev.currentTarget.getAttribute('data-id');
          return this.project.get('entries').setCurrent(entryID);
        }
      };

      ProjectSearch.prototype.uncheckCheckboxes = function() {
        return Fn.checkCheckboxes('.entries input[type="checkbox"]', false, this.el);
      };

      return ProjectSearch;

    })(Views.Base);
  });

}).call(this);

(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define('hilib/views/form/editablelist/main',['require','collections/base','views/base','hilib/templates'],function(require) {
    var Collections, EditableList, Views, tpls, _ref;
    Collections = {
      Base: require('collections/base')
    };
    Views = {
      Base: require('views/base')
    };
    tpls = require('hilib/templates');
    return EditableList = (function(_super) {
      __extends(EditableList, _super);

      function EditableList() {
        _ref = EditableList.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      EditableList.prototype.className = 'editablelist';

      EditableList.prototype.initialize = function() {
        var value, _base, _base1, _base2, _ref1;
        EditableList.__super__.initialize.apply(this, arguments);
        if ((_base = this.options).config == null) {
          _base.config = {};
        }
        this.settings = (_ref1 = this.options.config.settings) != null ? _ref1 : {};
        if ((_base1 = this.settings).placeholder == null) {
          _base1.placeholder = '';
        }
        if ((_base2 = this.settings).confirmRemove == null) {
          _base2.confirmRemove = false;
        }
        value = _.map(this.options.value, function(val) {
          return {
            id: val
          };
        });
        this.selected = new Collections.Base(value);
        this.listenTo(this.selected, 'add', this.render);
        this.listenTo(this.selected, 'remove', this.render);
        return this.render();
      };

      EditableList.prototype.render = function() {
        var rtpl;
        rtpl = tpls['hilib/views/form/editablelist/main']({
          viewId: this.cid,
          selected: this.selected,
          settings: this.settings
        });
        this.$el.html(rtpl);
        this.triggerChange();
        if (this.settings.inputClass != null) {
          this.$('input').addClass(this.settings.inputClass);
        }
        this.$('input').focus();
        return this;
      };

      EditableList.prototype.events = function() {
        var evs;
        evs = {
          'click li': 'removeLi',
          'click button': 'addSelected'
        };
        evs['keyup input'] = 'onKeyup';
        return evs;
      };

      EditableList.prototype.removeLi = function(ev) {
        var layerName,
          _this = this;
        layerName = ev.currentTarget.getAttribute('data-id');
        if (this.settings.confirmRemove) {
          return this.trigger('confirmRemove', layerName, function() {
            return _this.selected.removeById(layerName);
          });
        } else {
          return this.selected.removeById(layerName);
        }
      };

      EditableList.prototype.onKeyup = function(ev) {
        var valueLength;
        valueLength = ev.currentTarget.value.length;
        if (ev.keyCode === 13 && valueLength > 0) {
          return this.addSelected();
        } else if (valueLength > 1) {
          return this.showButton();
        } else {
          return this.hideButton();
        }
      };

      EditableList.prototype.addSelected = function() {
        this.selected.add({
          id: this.el.querySelector('input').value
        });
        return this.el.querySelector('button').style.display = 'none';
      };

      EditableList.prototype.showButton = function(ev) {
        return this.el.querySelector('button').style.display = 'inline-block';
      };

      EditableList.prototype.hideButton = function(ev) {
        return this.el.querySelector('button').style.display = 'none';
      };

      EditableList.prototype.triggerChange = function() {
        return this.trigger('change', this.selected.pluck('id'));
      };

      return EditableList;

    })(Views.Base);
  });

}).call(this);

(function() {
  define('hilib/mixins/dropdown/options',['require'],function(require) {
    return {
      dropdownOptionsInitialize: function() {
        return this.resetCurrentOption();
      },
      resetCurrentOption: function() {
        return this.currentOption = null;
      },
      setCurrentOption: function(model) {
        this.currentOption = model;
        return this.trigger('currentOption:change', this.currentOption);
      },
      prev: function() {
        var previousIndex;
        previousIndex = this.indexOf(this.currentOption) - 1;
        if (previousIndex < 0) {
          previousIndex = this.length - 1;
        }
        return this.setCurrentOption(this.at(previousIndex));
      },
      next: function() {
        var nextIndex;
        nextIndex = this.indexOf(this.currentOption) + 1;
        if (nextIndex > (this.length - 1)) {
          nextIndex = 0;
        }
        return this.setCurrentOption(this.at(nextIndex));
      }
    };
  });

}).call(this);

(function() {
  define('hilib/mixins/dropdown/main',['require','backbone','hilib/functions/general','hilib/mixins/dropdown/options','hilib/templates'],function(require) {
    var Backbone, Fn, optionMixin, tpls;
    Backbone = require('backbone');
    Fn = require('hilib/functions/general');
    optionMixin = require('hilib/mixins/dropdown/options');
    tpls = require('hilib/templates');
    return {
      dropdownInitialize: function() {
        var models, _base, _base1, _base2, _base3, _ref, _ref1,
          _this = this;
        if ((_base = this.options).config == null) {
          _base.config = {};
        }
        this.data = (_ref = this.options.config.data) != null ? _ref : {};
        this.settings = (_ref1 = this.options.config.settings) != null ? _ref1 : {};
        if ((_base1 = this.settings).mutable == null) {
          _base1.mutable = false;
        }
        if ((_base2 = this.settings).editable == null) {
          _base2.editable = false;
        }
        if ((_base3 = this.settings).defaultAdd == null) {
          _base3.defaultAdd = true;
        }
        this.selected = null;
        if (this.data instanceof Backbone.Collection) {
          this.collection = this.data;
        } else if (_.isArray(this.data) && _.isString(this.data[0])) {
          models = this.strArray2optionArray(this.data);
          this.collection = new Backbone.Collection(models);
        } else {
          console.error('No valid data passed to dropdown');
        }
        this.filtered_options = this.collection.clone();
        _.extend(this.filtered_options, optionMixin);
        if (this.settings.mutable) {
          this.listenTo(this.collection, 'add', function(model, collection, options) {
            _this.selected = model;
            _this.triggerChange();
            return _this.filtered_options.add(model);
          });
          this.listenTo(this.filtered_options, 'add', this.renderOptions);
        }
        this.listenTo(this.filtered_options, 'reset', this.renderOptions);
        this.listenTo(this.filtered_options, 'currentOption:change', function(model) {
          return _this.$('li[data-id="' + model.id + '"]').addClass('active');
        });
        return this.on('change', function() {
          return _this.resetOptions();
        });
      },
      dropdownRender: function(tpl) {
        var rtpl,
          _this = this;
        if (this.preDropdownRender != null) {
          this.preDropdownRender();
        }
        rtpl = tpl({
          viewId: this.cid,
          selected: this.selected,
          settings: this.settings
        });
        this.$el.html(rtpl);
        this.$optionlist = this.$('ul.list');
        this.renderOptions();
        this.$('input').focus();
        $('body').click(function(ev) {
          if (!(_this.el === ev.target || Fn.isDescendant(_this.el, ev.target))) {
            return _this.hideOptionlist();
          }
        });
        if (this.settings.inputClass != null) {
          this.$('input').addClass(this.settings.inputClass);
        }
        if (this.postDropdownRender != null) {
          this.postDropdownRender();
        }
        return this;
      },
      renderOptions: function() {
        var rtpl;
        rtpl = tpls['hilib/mixins/dropdown/main']({
          collection: this.filtered_options,
          selected: this.selected
        });
        return this.$optionlist.html(rtpl);
      },
      dropdownEvents: function() {
        var evs;
        evs = {
          'click .caret': 'toggleList',
          'click li.list': 'selectItem'
        };
        evs['keyup input[data-view-id="' + this.cid + '"]'] = 'onKeyup';
        evs['keydown input[data-view-id="' + this.cid + '"]'] = 'onKeydown';
        return evs;
      },
      toggleList: function(ev) {
        this.$optionlist.toggle();
        return this.$('input').focus();
      },
      onKeydown: function(ev) {
        if (ev.keyCode === 38 && this.$optionlist.is(':visible')) {
          return ev.preventDefault();
        }
      },
      onKeyup: function(ev) {
        this.$('.active').removeClass('active');
        if (ev.keyCode === 38) {
          this.$optionlist.show();
          return this.filtered_options.prev();
        } else if (ev.keyCode === 40) {
          this.$optionlist.show();
          return this.filtered_options.next();
        } else if (ev.keyCode === 13) {
          return this.selectItem(ev);
        } else if (ev.keyCode === 27) {
          return this.$optionlist.hide();
        } else {
          return this.filter(ev.currentTarget.value);
        }
      },
      destroy: function() {
        $('body').off('click');
        return this.remove();
      },
      resetOptions: function() {
        this.filtered_options.reset(this.collection.models);
        this.filtered_options.resetCurrentOption();
        return this.hideOptionlist();
      },
      hideOptionlist: function() {
        return this.$optionlist.hide();
      },
      filter: function(value) {
        var models, re;
        if (value.length > 1) {
          value = Fn.escapeRegExp(value);
          re = new RegExp(value, 'i');
          models = this.collection.filter(function(model) {
            return re.test(model.get('title'));
          });
          if (models.length > 0) {
            this.filtered_options.reset(models);
            this.$optionlist.show();
          } else {
            this.resetOptions();
          }
        } else {
          this.resetOptions();
        }
        if (this.postDropdownFilter != null) {
          return this.postDropdownFilter(models);
        }
      },
      strArray2optionArray: function(strArray) {
        return _.map(strArray, function(item) {
          return {
            id: item,
            title: item
          };
        });
      }
    };
  });

}).call(this);

(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define('hilib/views/form/combolist/main',['require','collections/base','views/base','hilib/templates','hilib/mixins/dropdown/main'],function(require) {
    var Collections, ComboList, Views, dropdown, tpls, _ref;
    Collections = {
      Base: require('collections/base')
    };
    Views = {
      Base: require('views/base')
    };
    tpls = require('hilib/templates');
    dropdown = require('hilib/mixins/dropdown/main');
    return ComboList = (function(_super) {
      __extends(ComboList, _super);

      function ComboList() {
        _ref = ComboList.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      ComboList.prototype.className = 'combolist';

      ComboList.prototype.initialize = function() {
        var models,
          _this = this;
        ComboList.__super__.initialize.apply(this, arguments);
        _.extend(this, dropdown);
        this.dropdownInitialize();
        if (this.options.value instanceof Backbone.Collection) {
          this.selected = this.options.value;
        } else if (_.isArray(this.options.value)) {
          models = this.strArray2optionArray(this.options.value);
          this.selected = new Collections.Base(models);
        } else {
          console.error('No valid value passed to combolist');
        }
        this.listenTo(this.selected, 'add', function(model) {
          _this.dropdownRender(tpls['hilib/views/form/combolist/main']);
          return _this.triggerChange({
            added: model.id
          });
        });
        this.listenTo(this.selected, 'remove', function(model) {
          _this.dropdownRender(tpls['hilib/views/form/combolist/main']);
          return _this.triggerChange({
            removed: model.id
          });
        });
        return this.dropdownRender(tpls['hilib/views/form/combolist/main']);
      };

      ComboList.prototype.events = function() {
        return _.extend(this.dropdownEvents(), {
          'click li.selected': 'removeSelected'
        });
      };

      ComboList.prototype.addSelected = function(model) {
        return this.selected.add(model);
      };

      ComboList.prototype.removeSelected = function(ev) {
        var id, model;
        id = ev.currentTarget.getAttribute('data-id');
        model = this.selected.get(id);
        return this.selected.remove(model);
      };

      ComboList.prototype.selectItem = function(ev) {
        var model;
        if ((ev.keyCode != null) && ev.keyCode === 13) {
          if (this.filtered_options.currentOption != null) {
            model = this.filtered_options.currentOption;
          }
        } else {
          model = this.collection.get(ev.currentTarget.getAttribute('data-id'));
        }
        if (model != null) {
          return this.selected.add(model);
        }
      };

      ComboList.prototype.triggerChange = function(options) {
        if (options.added == null) {
          options.added = null;
        }
        if (options.removed == null) {
          options.removed = null;
        }
        return this.trigger('change', {
          collection: this.selected,
          added: options.added,
          removed: options.removed
        });
      };

      ComboList.prototype.strArray2optionArray = function(strArray) {
        return _.map(strArray, function(item) {
          return {
            id: item,
            title: item
          };
        });
      };

      return ComboList;

    })(Views.Base);
  });

}).call(this);

(function() {
  define('hilib/functions/dom',['require'],function(require) {
    return function(el) {
      return {
        closest: function(selector) {
          var matchesSelector;
          matchesSelector = el.matches || el.webkitMatchesSelector || el.mozMatchesSelector || el.msMatchesSelector;
          while (el) {
            if (matchesSelector.bind(el)(selector)) {
              return el;
            } else {
              el = el.parentNode;
            }
          }
        },
        prepend: function(childEl) {
          return el.insertBefore(childEl, el.firstChild);
        },
        /*
        		Native alternative to jQuery's $.offset()
        
        		http://www.quirksmode.org/js/findpos.html
        */

        position: function(parent) {
          var left, loopEl, top;
          if (parent == null) {
            parent = document.body;
          }
          left = 0;
          top = 0;
          loopEl = el;
          while (loopEl !== parent) {
            if (this.hasDescendant(parent)) {
              break;
            }
            left += loopEl.offsetLeft;
            top += loopEl.offsetTop;
            loopEl = loopEl.offsetParent;
          }
          return {
            left: left,
            top: top
          };
        },
        /*
        		Is child el a descendant of parent el?
        
        		http://stackoverflow.com/questions/2234979/how-to-check-in-javascript-if-one-element-is-a-child-of-another
        */

        hasDescendant: function(child) {
          var node;
          node = child.parentNode;
          while (node != null) {
            if (node === el) {
              return true;
            }
            node = node.parentNode;
          }
          return false;
        }
      };
    };
  });

}).call(this);

(function() {
  var __hasProp = {}.hasOwnProperty;

  define('hilib/managers/validation',['require','hilib/functions/general'],function(require) {
    var Fn;
    Fn = require('hilib/functions/general');
    return {
      validator: function(args) {
        var invalid, listenToObject, valid, validate,
          _this = this;
        valid = args.valid, invalid = args.invalid;
        validate = function(attrs, options) {
          var attr, flatAttrs, invalids, settings, _ref;
          invalids = [];
          flatAttrs = Fn.flattenObject(attrs);
          _ref = this.validation;
          for (attr in _ref) {
            if (!__hasProp.call(_ref, attr)) continue;
            settings = _ref[attr];
            if (!settings.required && flatAttrs[attr].length !== 0) {
              if ((settings.pattern != null) && settings.pattern === 'number') {
                if (!/^\d+$/.test(flatAttrs[attr])) {
                  invalids.push({
                    attr: attr,
                    msg: 'Please enter a valid number.'
                  });
                }
              }
            }
          }
          if (invalids.length) {
            return invalids;
          } else {

          }
        };
        if (this.model != null) {
          listenToObject = this.model;
          this.model.validate = validate;
        } else if (this.collection != null) {
          listenToObject = this.collection;
          this.collection.each(function(model) {
            return model.validate = validate;
          });
          this.listenTo(this.collection, 'add', function(model, collection, options) {
            return model.validate = validate;
          });
        } else {
          console.error("Validator mixin: no model or collection attached to view!");
          return;
        }
        this.invalidAttrs = {};
        this.listenTo(listenToObject, 'invalid', function(model, errors, options) {
          return _.each(errors, function(error) {
            if (!_.size(_this.invalidAttrs)) {
              _this.trigger('validator:invalidated');
            }
            _this.invalidAttrs[error.attr] = error;
            return invalid(model, error.attr, error.msg);
          });
        });
        if (valid != null) {
          return this.listenTo(listenToObject, 'change', function(model, options) {
            var attr, flatChangedAttrs, _results;
            flatChangedAttrs = Fn.flattenObject(model.changedAttributes());
            _results = [];
            for (attr in flatChangedAttrs) {
              if (!__hasProp.call(flatChangedAttrs, attr)) continue;
              if (_this.invalidAttrs.hasOwnProperty(attr)) {
                valid(model, attr);
                delete _this.invalidAttrs[attr];
                if (!_.size(_this.invalidAttrs)) {
                  _results.push(_this.trigger('validator:validated'));
                } else {
                  _results.push(void 0);
                }
              } else {
                _results.push(void 0);
              }
            }
            return _results;
          });
        }
      }
    };
  });

}).call(this);

(function() {
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define('hilib/views/form/main',['require','hilib/functions/general','hilib/functions/dom','views/base','hilib/managers/validation'],function(require) {
    var Fn, Form, Views, dom, validation, _ref;
    Fn = require('hilib/functions/general');
    dom = require('hilib/functions/dom');
    Views = {
      Base: require('views/base')
    };
    validation = require('hilib/managers/validation');
    return Form = (function(_super) {
      __extends(Form, _super);

      function Form() {
        this.renderSubform = __bind(this.renderSubform, this);
        this.addSubform = __bind(this.addSubform, this);
        _ref = Form.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      Form.prototype.className = 'form';

      Form.prototype.initialize = function() {
        Form.__super__.initialize.apply(this, arguments);
        if (this.subformConfig == null) {
          this.subformConfig = this.options.subformConfig;
        }
        if (this.subformConfig == null) {
          this.subformConfig = {};
        }
        if (this.Model == null) {
          this.Model = this.options.Model;
        }
        if (this.Model == null) {
          this.Model = Backbone.Model;
        }
        if (this.tpl == null) {
          this.tpl = this.options.tpl;
        }
        if (this.tpl == null) {
          throw 'Unknow template!';
        }
        this.on('createModels:finished', this.render, this);
        this.createModels();
        this.addValidation();
        return this.addListeners();
      };

      Form.prototype.events = function() {
        var evs;
        evs = {};
        evs['change textarea'] = 'inputChanged';
        evs['change input'] = 'inputChanged';
        evs['change select'] = 'inputChanged';
        evs['keydown textarea'] = 'textareaKeyup';
        evs['click input[type="submit"]'] = 'submit';
        return evs;
      };

      Form.prototype.inputChanged = function(ev) {
        var model, value;
        ev.stopPropagation();
        this.$(ev.currentTarget).removeClass('invalid').attr('title', '');
        model = this.model != null ? this.model : this.getModel(ev);
        value = ev.currentTarget.type === 'checkbox' ? ev.currentTarget.checked : ev.currentTarget.value;
        if (ev.currentTarget.name !== '') {
          return model.set(ev.currentTarget.name, value, {
            validate: true
          });
        }
      };

      Form.prototype.textareaKeyup = function(ev) {
        ev.currentTarget.style.height = '32px';
        return ev.currentTarget.style.height = ev.currentTarget.scrollHeight + 6 + 'px';
      };

      Form.prototype.submit = function(ev) {
        var _this = this;
        ev.preventDefault();
        return this.model.save([], {
          success: function(model, response, options) {
            _this.trigger('save:success', model, response, options);
            return _this.reset();
          },
          error: function(model, xhr, options) {
            return _this.trigger('save:error', model, xhr, options);
          }
        });
      };

      Form.prototype.preRender = function() {};

      Form.prototype.render = function() {
        var View, attr, rtpl, _ref1,
          _this = this;
        this.preRender();
        if (this.data == null) {
          this.data = {};
        }
        this.data.viewId = this.cid;
        if (this.model != null) {
          this.data.model = this.model;
        }
        if (this.collection != null) {
          this.data.collection = this.collection;
        }
        if (this.tpl == null) {
          throw 'Unknow template!';
        }
        rtpl = _.isString(this.tpl) ? _.template(this.tpl, this.data) : this.tpl(this.data);
        this.$el.html(rtpl);
        this.el.setAttribute('data-view-cid', this.cid);
        if (this.subforms == null) {
          this.subforms = {};
        }
        _ref1 = this.subforms;
        for (attr in _ref1) {
          if (!__hasProp.call(_ref1, attr)) continue;
          View = _ref1[attr];
          this.addSubform(attr, View);
        }
        this.$('textarea').each(function(index, textarea) {
          return textarea.style.height = textarea.scrollHeight + 6 > 32 ? textarea.scrollHeight + 6 + 'px' : '32px';
        });
        this.postRender();
        return this;
      };

      Form.prototype.postRender = function() {};

      Form.prototype.reset = function() {
        this.model = this.model.clone();
        this.model.clear({
          silent: true
        });
        return this.el.querySelector('form').reset();
      };

      Form.prototype.createModels = function() {
        var _base,
          _this = this;
        if (this.model == null) {
          if ((_base = this.options).value == null) {
            _base.value = {};
          }
          this.model = new this.Model(this.options.value);
          if (this.model.isNew()) {
            return this.trigger('createModels:finished');
          } else {
            return this.model.fetch({
              success: function() {
                return _this.trigger('createModels:finished');
              }
            });
          }
        } else {
          return this.trigger('createModels:finished');
        }
      };

      Form.prototype.addValidation = function() {
        var _this = this;
        _.extend(this, validation);
        return this.validator({
          invalid: function(model, attr, msg) {
            return _this.$("[data-cid='" + model.cid + "'] [name='" + attr + "']").addClass('invalid').attr('title', msg);
          }
        });
        /* @on 'validator:validated', => $('button.save').prop('disabled', false).removeAttr('title')*/

        /* @on 'validator:invalidated', => $('button.save').prop('disabled', true).attr 'title', 'The form cannot be saved due to invalid values.'*/

      };

      Form.prototype.addListeners = function() {
        var _this = this;
        return this.listenTo(this.model, 'change', function() {
          return _this.triggerChange();
        });
      };

      Form.prototype.triggerChange = function() {
        var object;
        object = this.model != null ? this.model : this.collection;
        return this.trigger('change', object.toJSON(), object);
      };

      Form.prototype.addSubform = function(attr, View) {
        return this.renderSubform(attr, View, this.model);
      };

      Form.prototype.renderSubform = function(attr, View, model) {
        var htmlSafeAttr, placeholders, value, view,
          _this = this;
        value = attr.indexOf('.') > -1 ? Fn.flattenObject(model.attributes)[attr] : model.get(attr);
        if (value == null) {
          console.error('Subform value is undefined!', this.model);
        }
        view = new View({
          value: value,
          config: this.subformConfig[attr]
        });
        htmlSafeAttr = attr.split('.').join('_');
        placeholders = this.el.querySelectorAll("[data-cid='" + model.cid + "'] ." + htmlSafeAttr + "-placeholder");
        if (placeholders.length > 1) {
          _.each(placeholders, function(placeholder) {
            var el;
            el = dom(placeholder).closest('[data-cid]');
            if (el.getAttribute('data-cid') === model.cid && placeholder.innerHTML === '') {
              return placeholder.appendChild(view.el);
            }
          });
        } else {
          placeholders[0].appendChild(view.el);
        }
        return this.listenTo(view, 'change', function(data) {
          return model.set(attr, data);
        });
      };

      return Form;

    })(Views.Base);
  });

}).call(this);

(function() {
  define('models/project/statistics',['require','config','hilib/managers/token'],function(require) {
    var ProjectStatistics, config, token;
    config = require('config');
    token = require('hilib/managers/token');
    return ProjectStatistics = (function() {
      function ProjectStatistics(projectID) {
        this.projectID = projectID;
      }

      ProjectStatistics.prototype.fetch = function(cb) {
        var jqXHR,
          _this = this;
        jqXHR = $.ajax({
          url: "" + config.baseUrl + "projects/" + this.projectID + "/statistics",
          type: 'get',
          dataType: 'json',
          beforeSend: function(xhr) {
            return xhr.setRequestHeader('Authorization', "SimpleAuth " + (token.get()));
          }
        });
        return jqXHR.done(function(data) {
          return cb(data);
        });
      };

      return ProjectStatistics;

    })();
  });

}).call(this);

(function() {


}).call(this);

define("collections/project/users", function(){});

(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define('views/project/settings',['require','config','hilib/managers/async','hilib/managers/ajax','hilib/managers/token','entry.metadata','views/base','hilib/views/form/editablelist/main','hilib/views/form/combolist/main','hilib/views/form/main','hilib/views/modal/main','models/project/statistics','models/project/settings','models/user','models/project/annotationtype','collections/projects','collections/project/annotationtypes','collections/project/users','collections/users','project.user.ids','tpls'],function(require) {
    var Async, Collections, EntryMetadata, Models, ProjectSettings, ProjectUserIDs, Views, ajax, config, token, tpls, _ref;
    config = require('config');
    Async = require('hilib/managers/async');
    ajax = require('hilib/managers/ajax');
    token = require('hilib/managers/token');
    EntryMetadata = require('entry.metadata');
    Views = {
      Base: require('views/base'),
      EditableList: require('hilib/views/form/editablelist/main'),
      ComboList: require('hilib/views/form/combolist/main'),
      Form: require('hilib/views/form/main'),
      Modal: require('hilib/views/modal/main')
    };
    Models = {
      Statistics: require('models/project/statistics'),
      Settings: require('models/project/settings'),
      User: require('models/user'),
      Annotationtype: require('models/project/annotationtype')
    };
    Collections = {
      projects: require('collections/projects'),
      AnnotationTypes: require('collections/project/annotationtypes'),
      ProjectUsers: require('collections/project/users'),
      Users: require('collections/users')
    };
    ProjectUserIDs = require('project.user.ids');
    tpls = require('tpls');
    return ProjectSettings = (function(_super) {
      __extends(ProjectSettings, _super);

      function ProjectSettings() {
        _ref = ProjectSettings.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      ProjectSettings.prototype.className = 'projectsettings';

      ProjectSettings.prototype.initialize = function() {
        var _this = this;
        ProjectSettings.__super__.initialize.apply(this, arguments);
        return Collections.projects.getCurrent(function(project) {
          _this.project = project;
          _this.model = _this.project.get('settings');
          return _this.render();
        });
      };

      ProjectSettings.prototype.render = function() {
        var rtpl;
        rtpl = tpls['project/settings/main']({
          settings: this.model.attributes,
          projectMembers: this.project.get('members')
        });
        this.$el.html(rtpl);
        this.renderTabs();
        this.renderAnnotationtypeTab();
        this.renderUserTab();
        this.loadStatistics();
        if (this.options.tabName) {
          this.showTab(this.options.tabName);
        }
        return this;
      };

      ProjectSettings.prototype.renderTabs = function() {
        var EntryMetadataList, textLayerList,
          _this = this;
        textLayerList = new Views.EditableList({
          value: this.project.get('textLayers'),
          config: {
            settings: {
              placeholder: 'Add layer',
              confirmRemove: true
            }
          }
        });
        this.listenTo(textLayerList, 'confirmRemove', function(id, confirm) {
          var modal;
          modal = new Views.Modal({
            $html: 'You are about to delete the ' + id + ' layer',
            submitValue: 'Remove ' + id + ' layer',
            width: 'auto'
          });
          return modal.on('submit', function() {
            modal.close();
            return confirm();
          });
        });
        this.listenTo(textLayerList, 'change', function(values) {
          _this.project.set('textLayers', values);
          return _this.project.saveTextlayers(function() {
            return _this.publish('message', 'Text layers updated.');
          });
        });
        this.$('div[data-tab="textlayers"]').append(textLayerList.el);
        EntryMetadataList = new Views.EditableList({
          value: this.project.get('entrymetadatafields'),
          config: {
            settings: {
              placeholder: 'Add field',
              confirmRemove: true
            }
          }
        });
        this.listenTo(EntryMetadataList, 'confirmRemove', function(fieldName, confirm) {
          var modal;
          modal = new Views.Modal({
            $html: 'You are about to delete entry metadata field: ' + fieldName,
            submitValue: 'Remove field ' + fieldName,
            width: 'auto'
          });
          return modal.on('submit', function() {
            modal.close();
            return confirm();
          });
        });
        this.listenTo(EntryMetadataList, 'change', function(values) {
          return new EntryMetadata(_this.project.id).save(values, {
            success: function() {
              return _this.publish('message', 'Entry metadata fields updated.');
            }
          });
        });
        return this.$('div[data-tab="metadata-entries"]').append(EntryMetadataList.el);
      };

      ProjectSettings.prototype.renderAnnotationtypeTab = function() {
        var annotationTypes, combolist, form,
          _this = this;
        annotationTypes = this.project.get('annotationtypes');
        combolist = new Views.ComboList({
          value: annotationTypes,
          config: {
            data: this.project.allannotationtypes,
            settings: {
              placeholder: 'Add annotation type'
            }
          }
        });
        this.$('div[data-tab="annotationtypes"] .annotationtypelist').append(combolist.el);
        form = new Views.Form({
          Model: Models.Annotationtype,
          tpl: tpls['project/settings/addannotationtype']
        });
        this.$('div[data-tab="annotationtypes"] .addannotationtype').append(form.el);
        this.listenTo(combolist, 'change', function(changes) {
          var annotationType, name;
          if (changes.added != null) {
            annotationType = changes.collection.get(changes.added);
            return _this.project.addAnnotationType(annotationType, function() {
              return _this.publish('message', "Added " + (annotationType.get('name')) + " to " + (_this.project.get('title')) + ".");
            });
          } else if (changes.removed != null) {
            name = _this.project.allannotationtypes.get(changes.removed).get('name');
            return _this.project.removeAnnotationType(changes.removed, function() {
              return _this.publish('message', "Removed " + name + " from " + (_this.project.get('title')) + ".");
            });
          }
        });
        this.listenTo(form, 'save:success', function(model) {
          return _this.project.get('annotationtypes').add(model);
        });
        return this.listenTo(form, 'save:error', function(model, xhr, options) {
          return _this.publish('message', xhr.responseText);
        });
      };

      ProjectSettings.prototype.renderUserTab = function() {
        var combolist, form, members,
          _this = this;
        members = this.project.get('members');
        combolist = new Views.ComboList({
          value: members,
          config: {
            data: this.project.allusers,
            settings: {
              placeholder: 'Add member'
            }
          }
        });
        this.$('div[data-tab="users"] .userlist').append(combolist.el);
        form = new Views.Form({
          Model: Models.User,
          tpl: tpls['project/settings/adduser']
        });
        this.$('div[data-tab="users"] .adduser').append(form.el);
        this.listenTo(combolist, 'change', function(changes) {
          var shortName, user;
          if (changes.added != null) {
            user = changes.collection.get(changes.added);
            return _this.project.addUser(user, function() {
              return _this.publish('message', "Added " + (user.getShortName()) + " to " + (_this.project.get('title')) + ".");
            });
          } else if (changes.removed != null) {
            user = _this.project.allusers.get(changes.removed);
            shortName = user.getShortName();
            return _this.project.removeUser(changes.removed, function() {
              return _this.publish('message', "Removed " + shortName + " from " + (_this.project.get('title')) + ".");
            });
          }
        });
        this.listenTo(form, 'save:success', function(model) {
          return _this.project.get('members').add(model);
        });
        return this.listenTo(form, 'save:error', function(model, xhr, options) {
          return _this.publish('message', xhr.responseText);
        });
      };

      ProjectSettings.prototype.events = {
        'click li[data-tab]': 'showTab',
        'change div[data-tab="project"] input': 'updateModel',
        'change div[data-tab="project"] select': 'updateModel',
        'click input[name="savesettings"]': 'saveSettings'
      };

      ProjectSettings.prototype.saveSettings = function(ev) {
        var _this = this;
        ev.preventDefault();
        if (!$(ev.currentTarget).hasClass('inactive')) {
          return this.model.save(null, {
            success: function() {
              return $(ev.currentTarget).addClass('inactive');
            }
          });
        }
      };

      ProjectSettings.prototype.updateModel = function(ev) {
        return this.model.set(ev.currentTarget.getAttribute('data-attr'), ev.currentTarget.value);
      };

      ProjectSettings.prototype.showTab = function(ev) {
        var $ct, index, tabName;
        if (_.isString(ev)) {
          tabName = ev;
        } else {
          $ct = $(ev.currentTarget);
          tabName = $ct.attr('data-tab');
        }
        index = Backbone.history.fragment.indexOf('/settings');
        Backbone.history.navigate(Backbone.history.fragment.substr(0, index) + '/settings/' + tabName);
        this.$(".active[data-tab]").removeClass('active');
        return this.$("[data-tab='" + tabName + "']").addClass('active');
      };

      ProjectSettings.prototype.loadStatistics = function() {
        var start, stats,
          _this = this;
        start = new Date().getTime();
        stats = new Models.Statistics(this.project.id);
        return stats.fetch(function(data) {
          var delta, end, remaining, str;
          str = JSON.stringify(data, null, 4);
          str = str.replace(/{/g, '');
          str = str.replace(/}/g, '');
          str = str.replace(/\"/g, '');
          str = str.replace(/,/g, '');
          end = new Date().getTime();
          delta = end - start;
          if (delta < 1000) {
            remaining = 1000 - delta;
            return setTimeout((function() {
              _this.$('img.loader').css('visibility', 'hidden');
              return _this.$('.statistics').html(str);
            }), remaining);
          }
        });
      };

      return ProjectSettings;

    })(Views.Base);
  });

}).call(this);

(function() {
  define('collections/project/history',['require','config','hilib/managers/ajax','hilib/managers/token'],function(require) {
    var ProjectHistory, ajax, config, token;
    config = require('config');
    ajax = require('hilib/managers/ajax');
    token = require('hilib/managers/token');
    return ProjectHistory = (function() {
      ProjectHistory.prototype.fetch = function(done) {
        var jqXHR,
          _this = this;
        ajax.token = token.get();
        jqXHR = ajax.get({
          url: this.url
        });
        return jqXHR.done(function(response) {
          return done(response);
        });
      };

      function ProjectHistory(projectID) {
        this.url = "" + config.baseUrl + "projects/" + projectID + "/logentries";
      }

      return ProjectHistory;

    })();
  });

}).call(this);

(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define('views/project/history',['require','views/base','collections/project/history','collections/projects','tpls'],function(require) {
    var BaseView, Collections, ProjectHistory, tpls, _ref;
    BaseView = require('views/base');
    Collections = {
      History: require('collections/project/history'),
      projects: require('collections/projects')
    };
    tpls = require('tpls');
    return ProjectHistory = (function(_super) {
      __extends(ProjectHistory, _super);

      function ProjectHistory() {
        _ref = ProjectHistory.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      ProjectHistory.prototype.className = 'projecthistory';

      ProjectHistory.prototype.initialize = function() {
        var _this = this;
        ProjectHistory.__super__.initialize.apply(this, arguments);
        this.index = 0;
        return Collections.projects.getCurrent(function(project) {
          _this.project = project;
          _this.all = new Collections.History(_this.project.id);
          return _this.all.fetch(function(response) {
            _this.historyChunks = [];
            while (response.length > 0) {
              _this.historyChunks.push(response.splice(0, 500));
            }
            return _this.render();
          });
        });
      };

      ProjectHistory.prototype.render = function() {
        var button, div, h2;
        h2 = document.createElement('h2');
        h2.innerHTML = 'History';
        this.el.appendChild(h2);
        div = document.createElement('div');
        div.className = 'entries';
        this.el.appendChild(div);
        this.renderEntries();
        button = document.createElement('button');
        button.className = 'more simple';
        button.innerHTML = 'Show the next 500 entries';
        this.el.appendChild(button);
        return this;
      };

      ProjectHistory.prototype.renderEntries = function() {
        var chunk, chunks, rtpl;
        if (this.index + 1 === this.historyChunks.length) {
          this.el.querySelector('button.more').style.display = 'none';
        }
        chunk = this.historyChunks[this.index];
        _.each(chunk, function(entry) {
          return entry.dateString = new Date(entry.createdOn).toDateString();
        });
        chunks = _.groupBy(chunk, 'dateString');
        rtpl = tpls['project/history']({
          logEntries: chunks
        });
        return this.el.querySelector('.entries').innerHTML += rtpl;
      };

      ProjectHistory.prototype.events = function() {
        return {
          'click button.more': 'more'
        };
      };

      ProjectHistory.prototype.more = function(ev) {
        this.index++;
        return this.renderEntries();
      };

      return ProjectHistory;

    })(BaseView);
  });

}).call(this);

(function() {
  define('hilib/functions/jquery.mixin',['require','jquery'],function(require) {
    var $;
    $ = require('jquery');
    return (function(jQuery) {
      jQuery.expr[":"].contains = $.expr.createPseudo(function(arg) {
        return function(elem) {
          return $(elem).text().toUpperCase().indexOf(arg.toUpperCase()) >= 0;
        };
      });
      jQuery.fn.scrollTo = function(newPos, args) {
        var defaults, extraOffset, options, scrollTop, top;
        defaults = {
          start: function() {},
          complete: function() {},
          duration: 500
        };
        options = $.extend(defaults, args);
        if (options.start) {
          options.start();
        }
        scrollTop = this.scrollTop();
        top = this.offset().top;
        extraOffset = 60;
        newPos = newPos + scrollTop - top - extraOffset;
        if (newPos !== scrollTop) {
          return this.animate({
            scrollTop: newPos
          }, options.duration, options.complete);
        } else {
          return options.complete();
        }
      };
      jQuery.fn.highlight = function(delay) {
        var _this = this;
        delay = delay || 3000;
        this.addClass('highlight');
        return setTimeout((function() {
          return _this.removeClass('highlight');
        }), delay);
      };
      /*
      		Render remove button in element
      */

      return jQuery.fn.appendCloseButton = function(args) {
        var $closeButton, close, corner, html,
          _this = this;
        if (args == null) {
          args = {};
        }
        corner = args.corner, html = args.html, close = args.close;
        if (html == null) {
          html = '<img src="/images/icon.close.png">';
        }
        if (corner == null) {
          corner = 'topright';
        }
        $closeButton = $('<div class="closebutton">').html(html);
        $closeButton.css('position', 'absolute');
        $closeButton.css('opacity', '0.2');
        $closeButton.css('cursor', 'pointer');
        switch (corner) {
          case 'topright':
            $closeButton.css('right', '8px');
            $closeButton.css('top', '8px');
            break;
          case 'bottomright':
            $closeButton.css('right', '8px');
            $closeButton.css('bottom', '8px');
        }
        this.prepend($closeButton);
        $closeButton.hover((function(ev) {
          return $closeButton.css('opacity', 100);
        }), (function(ev) {
          return $closeButton.css('opacity', 0.2);
        }));
        return $closeButton.click(function() {
          return close();
        });
      };
    })(jQuery);
  });

}).call(this);

(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define('views/entry/preview/annotation.add.tooltip',['require','hilib/functions/general','hilib/functions/dom','views/base','models/annotation','tpls'],function(require) {
    var AddAnnotationTooltip, Annotation, BaseView, Fn, dom, tpls, _ref;
    Fn = require('hilib/functions/general');
    dom = require('hilib/functions/dom');
    BaseView = require('views/base');
    Annotation = require('models/annotation');
    tpls = require('tpls');
    return AddAnnotationTooltip = (function(_super) {
      __extends(AddAnnotationTooltip, _super);

      function AddAnnotationTooltip() {
        _ref = AddAnnotationTooltip.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      AddAnnotationTooltip.prototype.className = "tooltip addannotation";

      AddAnnotationTooltip.prototype.events = function() {
        return {
          'click button': 'buttonClicked'
        };
      };

      AddAnnotationTooltip.prototype.buttonClicked = function(ev) {
        this.hide();
        return this.trigger('clicked', new Annotation());
      };

      AddAnnotationTooltip.prototype.initialize = function() {
        var _ref1;
        AddAnnotationTooltip.__super__.initialize.apply(this, arguments);
        this.container = (_ref1 = this.options.container) != null ? _ref1 : document.querySelector('body');
        return this.render();
      };

      AddAnnotationTooltip.prototype.render = function() {
        var tooltip;
        this.$el.html(tpls['entry/tooltip.add.annotation']());
        tooltip = tooltip = document.querySelector('.tooltip.addannotation');
        if (tooltip != null) {
          tooltip.remove();
        }
        dom(this.container).prepend(this.el);
        return this;
      };

      AddAnnotationTooltip.prototype.show = function(position) {
        this.setPosition(position);
        return this.el.classList.add('active');
      };

      AddAnnotationTooltip.prototype.hide = function() {
        return this.el.classList.remove('active');
      };

      AddAnnotationTooltip.prototype.setPosition = function(position) {
        var boundingBox, left, top;
        boundingBox = Fn.boundingBox(this.container);
        position.left = position.left - boundingBox.left;
        position.top = position.top - boundingBox.top;
        this.$el.removeClass('tipright tipleft tipbottom');
        left = position.left - this.$el.width() / 2;
        top = position.top + 30;
        if (left < 10) {
          left = 10;
          this.$el.addClass('tipleft');
        }
        if (boundingBox.width < (left + this.$el.width())) {
          left = boundingBox.width - this.$el.width() - 10;
          this.$el.addClass('tipright');
        }
        this.$el.css('left', left);
        return this.$el.css('top', top);
      };

      AddAnnotationTooltip.prototype.isActive = function() {
        return this.$el.is(':visible');
      };

      return AddAnnotationTooltip;

    })(BaseView);
  });

}).call(this);

(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define('views/entry/preview/annotation.edit.tooltip',['require','hilib/functions/general','hilib/functions/dom','views/base','tpls'],function(require) {
    var BaseView, Fn, Tooltip, dom, tpls, _ref;
    Fn = require('hilib/functions/general');
    dom = require('hilib/functions/dom');
    BaseView = require('views/base');
    tpls = require('tpls');
    return Tooltip = (function(_super) {
      __extends(Tooltip, _super);

      function Tooltip() {
        _ref = Tooltip.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      Tooltip.prototype.className = 'tooltip editannotation';

      Tooltip.prototype.initialize = function() {
        var _ref1;
        Tooltip.__super__.initialize.apply(this, arguments);
        this.container = (_ref1 = this.options.container) != null ? _ref1 : document.querySelector('body');
        return this.render();
      };

      Tooltip.prototype.render = function() {
        var tooltip;
        this.$el.html(tpls['ui/tooltip']());
        tooltip = document.querySelector('.tooltip.editannotation');
        if (tooltip != null) {
          tooltip.remove();
        }
        return dom(this.container).prepend(this.el);
      };

      Tooltip.prototype.events = function() {
        return {
          'click .edit': 'editClicked',
          'click .delete': 'deleteClicked',
          'click': 'clicked'
        };
      };

      Tooltip.prototype.editClicked = function(ev) {
        return this.trigger('edit', this.model);
      };

      Tooltip.prototype.deleteClicked = function(ev) {
        return this.trigger('delete', this.model);
      };

      Tooltip.prototype.clicked = function(ev) {
        return this.hide();
      };

      Tooltip.prototype.show = function(args) {
        var $el, contentId;
        $el = args.$el, this.model = args.model;
        this.pointedEl = $el[0];
        this.el.style.left = 0;
        this.el.style.top = 0;
        this.$('.tooltip-body').html('');
        contentId = (this.model != null) && (this.model.get('annotationNo') != null) ? this.model.get('annotationNo') : -1;
        if (contentId === +this.el.getAttribute('data-id')) {
          this.hide();
          return false;
        }
        this.el.setAttribute('data-id', contentId);
        if (this.model != null) {
          this.$el.removeClass('newannotation');
          this.$('.tooltip-body').html(this.model.get('body'));
        } else {
          this.$el.addClass('newannotation');
        }
        if (this.options.container != null) {
          this.setRelativePosition(dom(this.pointedEl).position(this.container));
        } else {
          this.setAbsolutePosition($el.offset());
        }
        return this.el.classList.add('active');
      };

      Tooltip.prototype.hide = function() {
        this.el.removeAttribute('data-id');
        return this.el.classList.remove('active');
      };

      Tooltip.prototype.setRelativePosition = function(position) {
        var boundingBox, left, pane, scrollBottomPos, tooltipBottomPos, top;
        boundingBox = Fn.boundingBox(this.container);
        this.$el.removeClass('tipright tipleft tipbottom');
        left = (this.pointedEl.offsetWidth / 2) + position.left - (this.$el.width() / 2);
        top = position.top + 30;
        if (left < 10) {
          left = 10;
          this.$el.addClass('tipleft');
        }
        if (boundingBox.width < (left + this.$el.width())) {
          left = boundingBox.width - this.$el.width() - 10;
          this.$el.addClass('tipright');
        }
        tooltipBottomPos = top + this.$el.height();
        pane = document.querySelector('.container .right-pane');
        scrollBottomPos = pane.scrollTop + pane.clientHeight;
        if (tooltipBottomPos > scrollBottomPos) {
          top = top - 48 - this.$el.height();
          this.$el.addClass('tipbottom');
        }
        this.$el.css('left', left);
        return this.$el.css('top', top);
      };

      Tooltip.prototype.setAbsolutePosition = function(position) {
        var boundingBox, left, top;
        boundingBox = Fn.boundingBox(this.container);
        this.$el.removeClass('tipright tipleft tipbottom');
        left = position.left - this.$el.width() / 2;
        top = position.top + 30;
        if (boundingBox.left > left) {
          left = boundingBox.left + 10;
          this.$el.addClass('tipleft');
        }
        if (boundingBox.right < (left + this.$el.width())) {
          left = boundingBox.right - this.$el.width() - 10;
          this.$el.addClass('tipright');
        }
        if (boundingBox.bottom < top + this.$el.height()) {
          top = top - 60 - this.$el.height();
          this.$el.addClass('tipbottom');
        }
        console.log(top, left);
        this.$el.css('left', left);
        return this.$el.css('top', top);
      };

      Tooltip.prototype.isActive = function() {
        return this.$el.is(':visible');
      };

      return Tooltip;

    })(BaseView);
  });

}).call(this);

(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define('views/entry/preview/main',['require','hilib/functions/general','config','views/base','views/entry/preview/annotation.add.tooltip','views/entry/preview/annotation.edit.tooltip','tpls'],function(require) {
    var Fn, TranscriptionPreview, Views, config, tpls, _ref;
    Fn = require('hilib/functions/general');
    config = require('config');
    Views = {
      Base: require('views/base'),
      AddAnnotationTooltip: require('views/entry/preview/annotation.add.tooltip'),
      EditAnnotationTooltip: require('views/entry/preview/annotation.edit.tooltip')
    };
    tpls = require('tpls');
    return TranscriptionPreview = (function(_super) {
      __extends(TranscriptionPreview, _super);

      function TranscriptionPreview() {
        _ref = TranscriptionPreview.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      TranscriptionPreview.prototype.initialize = function() {
        TranscriptionPreview.__super__.initialize.apply(this, arguments);
        this.autoscroll = false;
        this.highlighter = Fn.highlighter();
        this.currentTranscription = this.model.get('transcriptions').current;
        this.subscribe('annotationEditor:show', this.highlightAnnotation);
        this.subscribe('annotationEditor:hide', this.unhighlightAnnotation);
        this.addListeners();
        this.render();
        return this.resize();
      };

      TranscriptionPreview.prototype.render = function() {
        var body, data, lineCount, rtpl, _ref1;
        data = this.currentTranscription.toJSON();
        body = this.currentTranscription.get('body');
        lineCount = ((_ref1 = body.match(/<br>/g)) != null ? _ref1 : []).length;
        if (body.substr(-4) !== '<br>') {
          lineCount++;
        }
        data.lineCount = lineCount;
        rtpl = tpls['entry/preview'](data);
        this.$el.html(rtpl);
        this.renderTooltips();
        this.onHover();
        return this;
      };

      TranscriptionPreview.prototype.renderTooltips = function() {
        var _this = this;
        if (this.addAnnotationTooltip != null) {
          this.addAnnotationTooltip.remove();
        }
        this.addAnnotationTooltip = new Views.AddAnnotationTooltip({
          container: this.el.querySelector('.preview')
        });
        if (this.editAnnotationTooltip != null) {
          this.editAnnotationTooltip.remove();
        }
        this.editAnnotationTooltip = new Views.EditAnnotationTooltip({
          container: this.el.querySelector('.preview')
        });
        this.listenTo(this.editAnnotationTooltip, 'edit', function(model) {
          return _this.trigger('editAnnotation', model);
        });
        return this.listenTo(this.editAnnotationTooltip, 'delete', function(model) {
          if (model.get('annotationNo') === 'newannotation') {
            _this.removeNewAnnotation();
          } else {
            _this.currentTranscription.get('annotations').remove(model);
          }
          return _this.trigger('annotation:removed');
        });
      };

      TranscriptionPreview.prototype.events = function() {
        return {
          'click sup[data-marker="end"]': 'supClicked',
          'mousedown .preview': 'onMousedown',
          'mouseup .preview': 'onMouseup',
          'scroll': 'onScroll'
        };
      };

      TranscriptionPreview.prototype.onScroll = function(ev) {
        var _this = this;
        if (this.autoscroll = !this.autoscroll) {
          return Fn.timeoutWithReset(200, function() {
            return _this.trigger('scrolled', Fn.getScrollPercentage(ev.currentTarget));
          });
        }
      };

      TranscriptionPreview.prototype.supClicked = function(ev) {
        var annotation, id;
        if (this.currentTranscription.get('annotations') == null) {
          return console.error('No annotations found!');
        }
        id = ev.currentTarget.getAttribute('data-id');
        annotation = id === 'newannotation' ? this.newAnnotation : this.currentTranscription.get('annotations').findWhere({
          annotationNo: id >> 0
        });
        this.setAnnotatedText(annotation);
        return this.editAnnotationTooltip.show({
          $el: $(ev.currentTarget),
          model: annotation
        });
      };

      TranscriptionPreview.prototype.onMousedown = function(ev) {
        if (ev.target === this.el.querySelector('.preview .body')) {
          this.stopListening(this.addAnnotationTooltip);
          return this.addAnnotationTooltip.hide();
        }
      };

      TranscriptionPreview.prototype.onMouseup = function(ev) {
        var isInsideMarker, range, sel,
          _this = this;
        sel = document.getSelection();
        if (sel.rangeCount === 0 || ev.target.tagName === 'SUP' || ev.target.tagName === 'BUTTON') {
          this.addAnnotationTooltip.hide();
          return false;
        }
        range = sel.getRangeAt(0);
        isInsideMarker = range.startContainer.parentNode.hasAttribute('data-marker') || range.endContainer.parentNode.hasAttribute('data-marker');
        if (!(range.collapsed || isInsideMarker || this.$('[data-id="newannotation"]').length > 0)) {
          this.listenToOnce(this.addAnnotationTooltip, 'clicked', function(model) {
            return _this.addNewAnnotation(model, range);
          });
          return this.addAnnotationTooltip.show({
            left: ev.pageX,
            top: ev.pageY
          });
        }
      };

      TranscriptionPreview.prototype.setScroll = function(percentages) {
        var _this = this;
        this.autoscroll = true;
        return setTimeout(function() {
          return Fn.setScrollPercentage(_this.el, percentages);
        });
      };

      TranscriptionPreview.prototype.highlightAnnotation = function(annotationNo) {
        var el, range;
        range = document.createRange();
        range.setStartAfter(this.el.querySelector('span[data-id="' + annotationNo + '"]'));
        range.setEndBefore(this.el.querySelector('sup[data-id="' + annotationNo + '"]'));
        el = document.createElement('span');
        el.className = 'hilite';
        el.setAttribute('data-highlight', '');
        el.appendChild(range.extractContents());
        return range.insertNode(el);
      };

      TranscriptionPreview.prototype.unhighlightAnnotation = function() {
        var docFrag, el;
        el = this.el.querySelector('span[data-highlight]');
        if (el != null) {
          docFrag = document.createDocumentFragment();
          while (el.childNodes.length) {
            docFrag.appendChild(el.firstChild);
          }
          return el.parentNode.replaceChild(docFrag, el);
        }
      };

      TranscriptionPreview.prototype.setAnnotatedText = function(annotation) {
        var annotationNo, endNode, range, startNode, text, treewalker,
          _this = this;
        annotationNo = annotation.get('annotationNo');
        startNode = this.el.querySelector('span[data-id="' + annotationNo + '"]');
        endNode = this.el.querySelector('sup[data-id="' + annotationNo + '"]');
        range = document.createRange();
        range.setStartAfter(startNode);
        range.setEndBefore(endNode);
        treewalker = document.createTreeWalker(range.cloneContents(), NodeFilter.SHOW_TEXT, {
          acceptNode: function(node) {
            if (node.parentNode.nodeType === 1 && node.parentNode.tagName === 'SUP' && node.parentNode.hasAttribute('data-id')) {
              return NodeFilter.FILTER_SKIP;
            } else {
              return NodeFilter.FILTER_ACCEPT;
            }
          }
        });
        text = '';
        while (treewalker.nextNode()) {
          text += treewalker.currentNode.textContent;
        }
        return annotation.set('annotatedText', text);
      };

      TranscriptionPreview.prototype.addNewAnnotation = function(newAnnotation, range) {
        var annotations,
          _this = this;
        this.newAnnotation = newAnnotation;
        this.addNewAnnotationTags(range);
        annotations = this.currentTranscription.get('annotations');
        newAnnotation.urlRoot = function() {
          return config.baseUrl + ("projects/" + annotations.projectId + "/entries/" + annotations.entryId + "/transcriptions/" + annotations.transcriptionId + "/annotations");
        };
        this.setAnnotatedText(newAnnotation);
        return this.trigger('editAnnotation', newAnnotation);
      };

      TranscriptionPreview.prototype.addNewAnnotationTags = function(range) {
        var span, sup;
        span = document.createElement('span');
        span.setAttribute('data-marker', 'begin');
        span.setAttribute('data-id', 'newannotation');
        range.insertNode(span);
        sup = document.createElement('sup');
        sup.setAttribute('data-marker', 'end');
        sup.setAttribute('data-id', 'newannotation');
        sup.innerHTML = 'new';
        range.collapse(false);
        range.insertNode(sup);
        return this.currentTranscription.set('body', this.$('.preview .body').html(), {
          silent: true
        });
      };

      TranscriptionPreview.prototype.removeNewAnnotation = function() {
        this.newAnnotation = null;
        return this.removeNewAnnotationTags();
      };

      TranscriptionPreview.prototype.removeNewAnnotationTags = function() {
        this.$('[data-id="newannotation"]').remove();
        return this.currentTranscription.set('body', this.$('.preview .body').html(), {
          silent: true
        });
      };

      TranscriptionPreview.prototype.onHover = function() {
        var markers, supEnter, supLeave,
          _this = this;
        supEnter = function(ev) {
          var id, startNode;
          id = ev.currentTarget.getAttribute('data-id');
          if (!(startNode = _this.el.querySelector("span[data-id='" + id + "']"))) {
            console.error('No span found');
            return false;
          }
          return _this.highlighter.on({
            startNode: startNode,
            endNode: ev.currentTarget
          });
        };
        supLeave = function(ev) {
          return _this.highlighter.off();
        };
        markers = this.$('sup[data-marker]');
        markers.off('mouseenter mouseleave');
        return markers.hover(supEnter, supLeave);
      };

      TranscriptionPreview.prototype.resize = function() {
        this.$el.height(document.documentElement.clientHeight - 89 - 78);
        if (Fn.hasYScrollBar(this.el)) {
          return this.el.style.marginRight = 0;
        }
      };

      TranscriptionPreview.prototype.setModel = function(entry) {
        this.unhighlightAnnotation();
        this.model = entry;
        this.currentTranscription = this.model.get('transcriptions').current;
        this.addListeners();
        return this.render();
      };

      TranscriptionPreview.prototype.addListeners = function() {
        this.listenTo(this.currentTranscription, 'current:change', this.render);
        return this.listenTo(this.currentTranscription, 'change:body', this.render);
      };

      return TranscriptionPreview;

    })(Views.Base);
  });

}).call(this);

(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define('views/entry/metadata',['require','hilib/functions/general','hilib/views/form/main','tpls'],function(require) {
    var EntryMetadata, Fn, Views, tpls, _ref;
    Fn = require('hilib/functions/general');
    Views = {
      Form: require('hilib/views/form/main')
    };
    tpls = require('tpls');
    return EntryMetadata = (function(_super) {
      __extends(EntryMetadata, _super);

      function EntryMetadata() {
        _ref = EntryMetadata.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      EntryMetadata.prototype.initialize = function() {
        EntryMetadata.__super__.initialize.apply(this, arguments);
        return this.render();
      };

      EntryMetadata.prototype.render = function() {
        var rtpl;
        rtpl = tpls['entry/metadata'](this.model.toJSON());
        this.$el.html(rtpl);
        return this;
      };

      return EntryMetadata;

    })(Views.Form);
  });

}).call(this);

(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define('views/entry/subsubmenu/facsimiles.edit',['require','hilib/functions/general','hilib/managers/ajax','hilib/managers/token','views/base','tpls'],function(require) {
    var EditFacsimiles, Fn, Views, ajax, token, tpls, _ref;
    Fn = require('hilib/functions/general');
    ajax = require('hilib/managers/ajax');
    token = require('hilib/managers/token');
    Views = {
      Base: require('views/base')
    };
    tpls = require('tpls');
    return EditFacsimiles = (function(_super) {
      __extends(EditFacsimiles, _super);

      function EditFacsimiles() {
        _ref = EditFacsimiles.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      EditFacsimiles.prototype.initialize = function() {
        EditFacsimiles.__super__.initialize.apply(this, arguments);
        this.listenTo(this.collection, 'add', this.render);
        this.listenTo(this.collection, 'remove', this.render);
        return this.render();
      };

      EditFacsimiles.prototype.render = function() {
        var rtpl;
        rtpl = tpls['entry/subsubmenu/facsimiles.edit']({
          facsimiles: this.collection
        });
        this.$el.html(rtpl);
        return this;
      };

      EditFacsimiles.prototype.events = function() {
        var _this = this;
        return {
          'click ul.facsimiles li': function(ev) {
            return $(ev.currentTarget).addClass('destroy');
          },
          'click ul.facsimiles li.destroy .orcancel': 'cancelRemove',
          'click ul.facsimiles li.destroy .name': 'destroyfacsimile',
          'keyup input[name="name"]': 'keyupName',
          'click button.addfacsimile': 'addfacsimile'
        };
      };

      EditFacsimiles.prototype.keyupName = function(ev) {
        return this.el.querySelector('form.addfile').style.display = ev.currentTarget.value.length > 0 ? 'block' : 'none';
      };

      EditFacsimiles.prototype.addfacsimile = function(ev) {
        var form, formData, jqXHR,
          _this = this;
        ev.stopPropagation();
        ev.preventDefault();
        form = this.el.querySelector('form.addfile');
        formData = new FormData(form);
        jqXHR = ajax.post({
          url: 'http://tomcat.tiler01.huygens.knaw.nl/facsimileservice/upload',
          data: formData,
          cache: false,
          contentType: false,
          processData: false
        }, {
          token: false
        });
        return jqXHR.done(function(response) {
          var data;
          data = {
            name: _this.el.querySelector('input[name="name"]').value,
            filename: response[1].originalName,
            zoomableUrl: response[1].jp2url
          };
          return _this.collection.create(data, {
            wait: true
          });
        });
      };

      EditFacsimiles.prototype.cancelRemove = function(ev) {
        var parentLi;
        ev.stopPropagation();
        parentLi = $(ev.currentTarget).parents('li');
        return parentLi.removeClass('destroy');
      };

      EditFacsimiles.prototype.destroyfacsimile = function(ev) {
        var transcriptionID;
        transcriptionID = $(ev.currentTarget).parents('li').attr('data-id');
        return this.collection.remove(this.collection.get(transcriptionID));
      };

      return EditFacsimiles;

    })(Views.Base);
  });

}).call(this);

(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define('hilib/views/longpress/main',['require','hilib/functions/general','views/base'],function(require) {
    var Fn, Longpress, Views, codes, diacritics, shiftcodes, _ref;
    Fn = require('hilib/functions/general');
    Views = {
      Base: require('views/base')
    };
    codes = {
      65: 'a',
      66: 'b',
      67: 'c',
      68: 'd',
      69: 'e',
      70: 'f',
      71: 'g',
      72: 'h',
      73: 'i',
      74: 'j',
      75: 'k',
      76: 'l',
      78: 'n',
      79: 'o',
      80: 'p',
      82: 'r',
      83: 's',
      84: 't',
      85: 'u',
      86: 'v',
      87: 'w',
      89: 'y',
      90: 'z',
      187: '=',
      189: '-',
      190: '.',
      222: "'"
    };
    shiftcodes = {
      65: 'A',
      66: 'B',
      67: 'C',
      68: 'D',
      69: 'E',
      70: 'F',
      71: 'G',
      72: 'H',
      73: 'I',
      74: 'J',
      75: 'K',
      76: 'L',
      78: 'N',
      79: 'O',
      80: 'P',
      82: 'R',
      83: 'S',
      84: 'T',
      85: 'U',
      86: 'V',
      87: 'W',
      89: 'Y',
      90: 'Z',
      49: '!',
      52: '$',
      53: '%',
      187: '+',
      188: '<',
      190: '>',
      191: '?',
      222: '"'
    };
    diacritics = {
      'A': 'ĀĂÀÁÂÃÄÅĄⱭ∀Æ',
      'B': 'Ɓ',
      'C': 'ÇĆĈĊČƆ',
      'D': 'ÐĎĐḎƊ',
      'E': 'ÈÉÊËĒĖĘẸĚƏÆƎƐ€',
      'F': 'ƑƩ',
      'G': 'ĜĞĠĢƢ',
      'H': 'ĤĦ',
      'I': 'ÌÍÎÏĪĮỊİIƗĲ',
      'J': 'ĴĲ',
      'K': 'ĶƘ',
      'L': 'ĹĻĽŁΛ',
      'N': 'ÑŃŅŇŊƝ₦',
      'O': 'ÒÓÔÕÖŌØŐŒƠƟ',
      'P': 'Ƥ¶',
      'R': 'ŔŘɌⱤ',
      'S': 'ßſŚŜŞṢŠÞ§',
      'T': 'ŢŤṮƬƮ',
      'U': 'ÙÚÛÜŪŬŮŰŲɄƯƱ',
      'V': 'Ʋ',
      'W': 'ŴẄΩ',
      'Y': 'ÝŶŸƔƳ',
      'Z': 'ŹŻŽƵƷẔ',
      'a': 'āăàáâãäåąɑæαª',
      'b': 'ßβɓ',
      'c': 'çςćĉċč¢ɔ',
      'd': 'ðďđɖḏɖɗ',
      'e': 'èéêëēėęẹěəæεɛ€',
      'f': 'ƒʃƭ',
      'g': 'ĝğġģɠƣ',
      'h': 'ĥħɦẖ',
      'i': 'ìíîïīįịiiɨĳι',
      'j': 'ĵɟĳ',
      'k': 'ķƙ',
      'l': 'ĺļľłλ',
      'n': 'ñńņňŋɲ',
      'o': 'òóôõöōøőœơɵ°',
      'p': 'ƥ¶',
      'r': 'ŕřɍɽ',
      's': 'ßſśŝşṣšþ§',
      't': 'ţťṯƭʈ',
      'u': 'ùúûüūŭůűųưμυʉʊ',
      'v': 'ʋ',
      'w': 'ŵẅω',
      'y': 'ýŷÿɣyƴ',
      'z': 'źżžƶẕʒƹ',
      '$': '£¥€₩₨₳Ƀ¤',
      '!': '¡‼‽',
      '?': '¿‽',
      '%': '‰',
      '.': '…••',
      '-': '±‐–—',
      '+': '±†‡',
      '\'': '′″‴‘’‚‛',
      '"': '“”„‟',
      '<': '≤‹',
      '>': '≥›',
      '=': '≈≠≡'
    };
    return Longpress = (function(_super) {
      __extends(Longpress, _super);

      function Longpress() {
        _ref = Longpress.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      Longpress.prototype.initialize = function() {
        Longpress.__super__.initialize.apply(this, arguments);
        this.timer = null;
        this.lastKeyCode = null;
        this.keyDown = false;
        this.iframe = this.options.parent.querySelector('iframe');
        this.iframeBody = this.iframe.contentDocument.querySelector('body');
        this.iframeBody.addEventListener('keydown', this.onKeydown.bind(this));
        this.iframeBody.addEventListener('keyup', this.onKeyup.bind(this));
        this.editorBody = this.options.parent;
        return this.editorBody.addEventListener('click', this.onClick.bind(this));
      };

      Longpress.prototype.render = function(pressedChar) {
        var frag, ul,
          _this = this;
        ul = document.createElement('ul');
        ul.className = 'longpress';
        frag = document.createDocumentFragment();
        _.each(diacritics[pressedChar], function(chr) {
          var li;
          li = document.createElement('li');
          li.textContent = chr;
          $(li).mouseenter(function(e) {
            return _this.replaceChar(e.target.textContent);
          });
          return frag.appendChild(li);
        });
        ul.appendChild(frag);
        return ul;
      };

      Longpress.prototype.onKeydown = function(e) {
        var pressedChar,
          _this = this;
        if (this.longKeyDown) {
          e.preventDefault();
          return false;
        }
        pressedChar = e.shiftKey ? shiftcodes[e.keyCode] : codes[e.keyCode];
        if (e.keyCode === this.lastKeyCode) {
          e.preventDefault();
          if (pressedChar != null) {
            this.longKeyDown = true;
            if (this.timer == null) {
              this.timer = setTimeout((function() {
                var list;
                _this.rangeManager.set(_this.iframe.contentWindow.getSelection().getRangeAt(0));
                list = _this.render(pressedChar);
                return _this.show(list);
              }), 300);
            }
          }
        }
        return this.lastKeyCode = e.keyCode;
      };

      Longpress.prototype.onKeyup = function(e) {
        this.longKeyDown = false;
        return this.hide();
      };

      Longpress.prototype.onClick = function(e) {
        if (this.editorBody.querySelector('ul.longpress') != null) {
          e.preventDefault();
          e.stopPropagation();
          return this.resetFocus();
        }
      };

      Longpress.prototype.rangeManager = (function() {
        var currentRange,
          _this = this;
        currentRange = null;
        return {
          get: function() {
            return currentRange;
          },
          set: function(r) {
            return currentRange = r.cloneRange();
          },
          clear: function() {
            return currentRange = null;
          }
        };
      })();

      Longpress.prototype.show = function(list) {
        return this.editorBody.appendChild(list);
      };

      Longpress.prototype.hide = function() {
        var list;
        this.lastKeyCode = null;
        list = this.editorBody.querySelector('.longpress');
        if (list != null) {
          clearTimeout(this.timer);
          this.timer = null;
          this.rangeManager.clear();
          return this.editorBody.removeChild(list);
        }
      };

      Longpress.prototype.replaceChar = function(chr) {
        var range;
        range = this.rangeManager.get();
        range.setStart(range.startContainer, range.startOffset - 1);
        range.deleteContents();
        range.insertNode(document.createTextNode(chr));
        range.collapse(false);
        return this.resetFocus();
      };

      Longpress.prototype.resetFocus = function() {
        var sel;
        this.iframe.contentWindow.focus();
        sel = this.iframe.contentWindow.getSelection();
        sel.removeAllRanges();
        return sel.addRange(this.rangeManager.get());
      };

      return Longpress;

    })(Views.Base);
  });

}).call(this);

(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define('hilib/views/supertinyeditor/supertinyeditor',['require','hilib/functions/general','hilib/functions/string','hilib/functions/jquery.mixin','hilib/views/longpress/main','views/base','hilib/templates'],function(require) {
    var Fn, Longpress, StringFn, SuperTinyEditor, Views, tpls, _ref;
    Fn = require('hilib/functions/general');
    StringFn = require('hilib/functions/string');
    require('hilib/functions/jquery.mixin');
    Longpress = require('hilib/views/longpress/main');
    Views = {
      Base: require('views/base')
    };
    tpls = require('hilib/templates');
    return SuperTinyEditor = (function(_super) {
      __extends(SuperTinyEditor, _super);

      function SuperTinyEditor() {
        _ref = SuperTinyEditor.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      SuperTinyEditor.prototype.initialize = function() {
        var _base, _base1, _base2, _base3, _base4;
        SuperTinyEditor.__super__.initialize.apply(this, arguments);
        if ((_base = this.options).cssFile == null) {
          _base.cssFile = '';
        }
        if ((_base1 = this.options).html == null) {
          _base1.html = '';
        }
        if ((_base2 = this.options).width == null) {
          _base2.width = '300';
        }
        if ((_base3 = this.options).height == null) {
          _base3.height = '200';
        }
        if ((_base4 = this.options).wrap == null) {
          _base4.wrap = false;
        }
        return this.render();
      };

      SuperTinyEditor.prototype.render = function() {
        this.$el.html(tpls['hilib/views/supertinyeditor/main']());
        this.$currentHeader = this.$('.ste-header');
        this.renderControls();
        this.renderIframe();
        this.setFocus();
        return this;
      };

      SuperTinyEditor.prototype.renderControls = function() {
        var controlName, diacritics, diacriticsUL, div, _i, _len, _ref1, _results;
        _ref1 = this.options.controls;
        _results = [];
        for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
          controlName = _ref1[_i];
          div = document.createElement('div');
          if (controlName === 'n') {
            div.className = 'ste-header';
            this.$('.ste-body').before(div);
            _results.push(this.$currentHeader = $(div));
          } else if (controlName === '|') {
            div.className = 'ste-divider';
            _results.push(this.$currentHeader.append(div));
          } else if (controlName === 'diacritics') {
            div.className = 'ste-control-diacritics ' + controlName;
            div.setAttribute('title', StringFn.ucfirst(controlName));
            div.setAttribute('data-action', controlName);
            diacriticsUL = document.createElement('div');
            diacriticsUL.className = 'diacritics-placeholder';
            diacritics = 'ĀĂÀÁÂÃÄÅĄⱭ∀ÆāăàáâãäåąɑæαªƁßβɓÇĆĈĊČƆçςćĉċč¢ɔÐĎĐḎƊðďđɖḏɖɗÈÉÊËĒĖĘẸĚƏÆƎƐ€èéêëēėęẹěəæεɛ€ƑƩƒʃƭĜĞĠĢƢĝğġģɠƣĤĦĥħɦẖÌÍÎÏĪĮỊİIƗĲìíîïīįịiiɨĳιĴĲĵɟĳĶƘķƙĹĻĽŁΛĺļľłλÑŃŅŇŊƝ₦ñńņňŋɲÒÓÔÕÖŌØŐŒƠƟòóôõöōøőœơɵ°Ƥ¶ƥ¶ŔŘɌⱤŕřɍɽßſŚŜŞṢŠÞ§ßſśŝşṣšþ§ŢŤṮƬƮţťṯƭʈÙÚÛÜŪŬŮŰŲɄƯƱùúûüūŭůűųưμυʉʊƲʋŴẄΩŵẅωÝŶŸƔƳýŷÿɣyƴŹŻŽƵƷẔźżžƶẕʒƹ£¥€₩₨₳Ƀ¤¡‼‽¿‽‰…••±‐–—±†‡′″‴‘’‚‛“”„‟≤‹≥›≈≠≡';
            diacriticsUL.innerHTML = tpls['hilib/views/supertinyeditor/diacritics']({
              diacritics: diacritics
            });
            div.appendChild(diacriticsUL);
            _results.push(this.$currentHeader.append(div));
          } else if (controlName.substr(0, 2) === 'b_') {
            controlName = controlName.substr(2);
            div.className = 'ste-button';
            div.setAttribute('data-action', controlName);
            div.setAttribute('title', StringFn.ucfirst(controlName));
            div.innerHTML = StringFn.ucfirst(controlName);
            _results.push(this.$currentHeader.append(div));
          } else {
            div.className = 'ste-control ' + controlName;
            div.setAttribute('title', StringFn.ucfirst(controlName));
            div.setAttribute('data-action', controlName);
            _results.push(this.$currentHeader.append(div));
          }
        }
        return _results;
      };

      SuperTinyEditor.prototype.renderIframe = function() {
        var html, iframe, lp,
          _this = this;
        iframe = this.el.querySelector('iframe');
        iframe.style.width = this.options.width + 'px';
        iframe.style.height = this.options.height + 'px';
        html = "<!DOCTYPE html>					<html>					<head><meta charset='UTF-8'><link rel='stylesheet' href='" + this.options.cssFile + "'></head>					<body class='ste-iframe-body' spellcheck='false' contenteditable='true'>" + (this.model.get(this.options.htmlAttribute)) + "</body>					</html>";
        this.iframeDocument = iframe.contentDocument;
        this.iframeDocument.designMode = 'On';
        this.iframeDocument.open();
        this.iframeDocument.write(html);
        this.iframeDocument.close();
        this.iframeBody = this.iframeDocument.querySelector('body');
        if (this.options.wrap) {
          this.iframeBody.style.whiteSpace = 'normal';
        }
        lp = new Longpress({
          parent: this.el.querySelector('.ste-body')
        });
        this.iframeDocument.addEventListener('scroll', function() {
          if (!_this.autoScroll) {
            return _this.triggerScroll();
          }
        });
        return this.iframeDocument.addEventListener('keyup', function(ev) {
          return Fn.timeoutWithReset(500, function() {
            _this.triggerScroll();
            return _this.saveHTMLToModel();
          });
        });
      };

      SuperTinyEditor.prototype.events = function() {
        return {
          'click .ste-control': 'controlClicked',
          'click .ste-control-diacritics ul.diacritics li': 'diacriticClicked',
          'click .ste-button': 'buttonClicked'
        };
      };

      SuperTinyEditor.prototype.controlClicked = function(ev) {
        var action;
        action = ev.currentTarget.getAttribute('data-action');
        this.iframeDocument.execCommand(action, false, null);
        return this.saveHTMLToModel();
      };

      SuperTinyEditor.prototype.buttonClicked = function(ev) {
        var action;
        action = ev.currentTarget.getAttribute('data-action');
        return this.trigger(action);
      };

      SuperTinyEditor.prototype.diacriticClicked = function(ev) {
        var range, sel, textNode;
        sel = this.el.querySelector('iframe').contentWindow.getSelection();
        range = sel.getRangeAt(0);
        range.deleteContents();
        textNode = ev.currentTarget.childNodes[0].cloneNode();
        range.insertNode(textNode);
        range.setStartAfter(textNode);
        range.setEndAfter(textNode);
        sel.removeAllRanges();
        sel.addRange(range);
        return this.saveHTMLToModel();
      };

      SuperTinyEditor.prototype.saveHTMLToModel = function() {
        return this.model.set(this.options.htmlAttribute, this.iframeBody.innerHTML);
      };

      SuperTinyEditor.prototype.triggerScroll = function() {
        var iframe, target;
        iframe = this.el.querySelector('iframe');
        target = {
          scrollLeft: $(iframe).contents().scrollLeft(),
          scrollWidth: iframe.contentWindow.document.documentElement.scrollWidth,
          clientWidth: iframe.contentWindow.document.documentElement.clientWidth,
          scrollTop: $(iframe).contents().scrollTop(),
          scrollHeight: iframe.contentWindow.document.documentElement.scrollHeight,
          clientHeight: iframe.contentWindow.document.documentElement.clientHeight
        };
        return this.trigger('scrolled', Fn.getScrollPercentage(target));
      };

      SuperTinyEditor.prototype.setModel = function(model) {
        this.setInnerHTML(model.get(this.options.htmlAttribute));
        this.model = model;
        return this.setFocus();
      };

      SuperTinyEditor.prototype.setInnerHTML = function(html) {
        return this.iframeBody.innerHTML = html;
      };

      SuperTinyEditor.prototype.setIframeHeight = function(height) {
        var iframe;
        iframe = this.el.querySelector('iframe');
        return iframe.style.height = height + 'px';
      };

      SuperTinyEditor.prototype.setIframeWidth = function(width) {
        var iframe;
        iframe = this.el.querySelector('iframe');
        return iframe.style.width = width + 'px';
      };

      SuperTinyEditor.prototype.setFocus = function() {
        return Fn.setCursorToEnd(this.iframeBody, this.el.querySelector('iframe').contentWindow);
      };

      SuperTinyEditor.prototype.setScrollPercentage = function(percentages) {
        var clientHeight, clientWidth, contentWindow, documentElement, left, scrollHeight, scrollWidth, top,
          _this = this;
        contentWindow = this.el.querySelector('iframe').contentWindow;
        documentElement = contentWindow.document.documentElement;
        clientWidth = documentElement.clientWidth;
        scrollWidth = documentElement.scrollWidth;
        clientHeight = documentElement.clientHeight;
        scrollHeight = documentElement.scrollHeight;
        top = (scrollHeight - clientHeight) * percentages.top / 100;
        left = (scrollWidth - clientWidth) * percentages.left / 100;
        this.autoScroll = true;
        contentWindow.scrollTo(left, top);
        return setTimeout((function() {
          return _this.autoScroll = false;
        }), 200);
      };

      return SuperTinyEditor;

    })(Views.Base);
  });

}).call(this);

(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define('views/entry/editors/annotation',['require','collections/projects','views/base','hilib/views/supertinyeditor/supertinyeditor','hilib/views/modal/main','hilib/views/form/main','tpls'],function(require) {
    var AnnotationEditor, Collections, Views, tpls, _ref;
    Collections = {
      projects: require('collections/projects')
    };
    Views = {
      Base: require('views/base'),
      SuperTinyEditor: require('hilib/views/supertinyeditor/supertinyeditor'),
      Modal: require('hilib/views/modal/main'),
      Form: require('hilib/views/form/main')
    };
    tpls = require('tpls');
    return AnnotationEditor = (function(_super) {
      __extends(AnnotationEditor, _super);

      function AnnotationEditor() {
        _ref = AnnotationEditor.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      AnnotationEditor.prototype.className = '';

      AnnotationEditor.prototype.initialize = function() {
        var _this = this;
        AnnotationEditor.__super__.initialize.apply(this, arguments);
        return Collections.projects.getCurrent(function(project) {
          _this.project = project;
          return _this.render();
        });
      };

      AnnotationEditor.prototype.render = function() {
        var _this = this;
        this.editor = new Views.SuperTinyEditor({
          cssFile: '/css/main.css',
          controls: ['b_save', 'b_cancel', 'b_metadata', 'n', 'n', 'bold', 'italic', 'underline', 'strikethrough', '|', 'subscript', 'superscript', 'unformat', '|', 'diacritics', '|', 'undo', 'redo'],
          el: this.$('.annotation-editor'),
          height: this.options.height,
          html: this.model.get('body'),
          htmlAttribute: 'body',
          model: this.model,
          width: this.options.width,
          wrap: true
        });
        this.listenTo(this.editor, 'save', this.save);
        this.listenTo(this.editor, 'cancel', function() {
          return _this.trigger('cancel');
        });
        this.listenTo(this.editor, 'metadata', this.editMetadata);
        this.show();
        return this;
      };

      AnnotationEditor.prototype.events = function() {};

      AnnotationEditor.prototype.show = function(annotation) {
        if (this.visible()) {
          this.hide();
        }
        if (annotation != null) {
          this.model = annotation;
          this.editor.setModel(this.model);
        }
        this.editor.$('.ste-header:nth-child(2)').addClass('annotationtext').html(this.model.get('annotatedText'));
        this.setURLPath(this.model.id);
        this.el.style.display = 'block';
        return this.publish('annotationEditor:show', this.model.get('annotationNo'));
      };

      AnnotationEditor.prototype.hide = function() {
        var modal, modelID,
          _this = this;
        if (this.model.changedSinceLastSave != null) {
          modelID = this.model.id;
          modal = new Views.Modal({
            title: "Unsaved changes",
            $html: $('<p />').html("There are unsaved changes in annotation: " + (this.model.get('annotationNo')) + ".<br><br>Save changes or press cancel to discard."),
            submitValue: 'Save changes',
            width: '320px'
          });
          modal.on('cancel', function() {
            return _this.model.collection.get(modelID).cancelChanges();
          });
          modal.on('submit', function() {
            var model;
            model = _this.model.collection.get(modelID);
            model.save(null, {
              success: function() {
                return _this.publish('message', "Saved changes to annotation: " + (model.get('annotationNo')) + ".");
              }
            });
            return modal.close();
          });
        }
        this.el.style.display = 'none';
        return this.publish('annotationEditor:hide', this.model.get('annotationNo'));
      };

      AnnotationEditor.prototype.visible = function() {
        return this.el.style.display === 'block';
      };

      AnnotationEditor.prototype.setURLPath = function(id) {
        var fragment, index;
        index = Backbone.history.fragment.indexOf('/annotations/');
        fragment = index !== -1 ? Backbone.history.fragment.substr(0, index) : Backbone.history.fragment;
        if (id != null) {
          fragment = fragment + '/annotations/' + id;
        }
        return Backbone.history.navigate(fragment, {
          replace: true
        });
      };

      AnnotationEditor.prototype.save = function() {
        var _this = this;
        if (this.model.isNew()) {
          return this.model.save([], {
            success: function(model) {
              return _this.trigger('newannotation:saved', model);
            },
            error: function(model, xhr, options) {
              return console.error('Saving annotation failed!', model, xhr, options);
            }
          });
        } else {
          return this.model.save();
        }
      };

      AnnotationEditor.prototype.editMetadata = function() {
        var annotationMetadata, modal,
          _this = this;
        annotationMetadata = new Views.Form({
          tpl: tpls['entry/annotation.metadata'],
          model: this.model.clone(),
          collection: this.project.get('annotationtypes')
        });
        annotationMetadata.model.on('change:metadata:type', function(annotationTypeID) {
          annotationMetadata.model.set('metadata', {});
          annotationMetadata.model.set('annotationType', _this.project.get('annotationtypes').get(annotationTypeID).attributes);
          return annotationMetadata.render();
        });
        modal = new Views.Modal({
          title: "Edit annotation metadata",
          $html: annotationMetadata.$el,
          submitValue: 'Save metadata',
          width: '300px'
        });
        return modal.on('submit', function() {
          var jqXHR;
          _this.model.updateFromClone(annotationMetadata.model);
          jqXHR = _this.model.save();
          return jqXHR.done(function() {
            _this.publish('message', "Saved metadata for annotation: " + (_this.model.get('annotationNo')) + ".");
            return modal.close();
          });
        });
      };

      return AnnotationEditor;

    })(Views.Base);
  });

}).call(this);

(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define('views/entry/editors/layer',['require','hilib/functions/string','views/base','hilib/views/supertinyeditor/supertinyeditor','hilib/views/modal/main'],function(require) {
    var LayerEditor, StringFn, Views, _ref;
    StringFn = require('hilib/functions/string');
    Views = {
      Base: require('views/base'),
      SuperTinyEditor: require('hilib/views/supertinyeditor/supertinyeditor'),
      Modal: require('hilib/views/modal/main')
    };
    return LayerEditor = (function(_super) {
      __extends(LayerEditor, _super);

      function LayerEditor() {
        _ref = LayerEditor.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      LayerEditor.prototype.className = '';

      LayerEditor.prototype.initialize = function() {
        LayerEditor.__super__.initialize.apply(this, arguments);
        return this.render();
      };

      LayerEditor.prototype.render = function() {
        var $el,
          _this = this;
        $el = this.$('.transcription-placeholder');
        this.editor = new Views.SuperTinyEditor({
          controls: ['b_save', 'n', 'bold', 'italic', 'underline', 'strikethrough', '|', 'subscript', 'superscript', 'unformat', '|', 'diacritics', '|', 'undo', 'redo'],
          cssFile: '/css/main.css',
          el: this.$('.transcription-editor'),
          height: this.options.height,
          html: this.model.get('body'),
          htmlAttribute: 'body',
          model: this.model,
          width: this.options.width
        });
        this.listenTo(this.editor, 'save', function() {
          return _this.model.save(null, {
            success: function() {
              return _this.publish('message', "" + (_this.model.get('textLayer')) + " layer saved.");
            }
          });
        });
        this.show();
        return this;
      };

      LayerEditor.prototype.events = function() {};

      LayerEditor.prototype.show = function(textLayer) {
        if (this.visible()) {
          this.hide();
        }
        if (textLayer != null) {
          this.model = textLayer;
          this.editor.setModel(this.model);
        }
        this.setURLPath();
        return this.el.style.display = 'block';
      };

      LayerEditor.prototype.hide = function() {
        var modal, modelID,
          _this = this;
        if (this.model.changedSinceLastSave != null) {
          modelID = this.model.id;
          modal = new Views.Modal({
            title: "Unsaved changes",
            $html: $('<p />').html("There are unsaved changes in the " + (this.model.get('textLayer')) + " layer.<br><br>Save changes or press cancel to discard."),
            submitValue: 'Save changes',
            width: '320px'
          });
          modal.on('cancel', function() {
            return _this.model.collection.get(modelID).cancelChanges();
          });
          modal.on('submit', function() {
            var model;
            model = _this.model.collection.get(modelID);
            model.save(null, {
              success: function() {
                return _this.publish('message', "Saved changes to " + (model.get('textLayer')) + " layer");
              }
            });
            return modal.close();
          });
        }
        return this.el.style.display = 'none';
      };

      LayerEditor.prototype.visible = function() {
        return this.el.style.display === 'block';
      };

      LayerEditor.prototype.setURLPath = function() {
        var index, newFragment, newTextLayer, oldFragment, oldTextLayer;
        oldFragment = Backbone.history.fragment;
        index = oldFragment.indexOf('/transcriptions/');
        newFragment = index !== -1 ? oldFragment.substr(0, index) : oldFragment;
        oldTextLayer = oldFragment.substr(index);
        oldTextLayer = oldTextLayer.replace('/transcriptions/', '');
        index = oldTextLayer.indexOf('/');
        if (index !== -1) {
          oldTextLayer = oldTextLayer.substr(0, index);
        }
        newTextLayer = StringFn.slugify(this.model.get('textLayer'));
        newFragment = newFragment + '/transcriptions/' + newTextLayer;
        return Backbone.history.navigate(newFragment, {
          replace: true
        });
      };

      return LayerEditor;

    })(Views.Base);
  });

}).call(this);

(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define('views/entry/main',['require','backbone','config','hilib/functions/general','hilib/functions/string','hilib/functions/jquery.mixin','hilib/managers/async','models/entry','collections/projects','views/base','views/entry/preview/main','views/entry/metadata','views/entry/subsubmenu/facsimiles.edit','hilib/views/modal/main','hilib/views/form/main','views/entry/editors/annotation','views/entry/editors/layer','tpls'],function(require) {
    var Async, Backbone, Collections, Entry, Fn, Models, StringFn, Views, config, tpls, _ref;
    Backbone = require('backbone');
    config = require('config');
    Fn = require('hilib/functions/general');
    StringFn = require('hilib/functions/string');
    require('hilib/functions/jquery.mixin');
    Async = require('hilib/managers/async');
    Models = {
      Entry: require('models/entry')
    };
    Collections = {
      projects: require('collections/projects')
    };
    Views = {
      Base: require('views/base'),
      Preview: require('views/entry/preview/main'),
      EntryMetadata: require('views/entry/metadata'),
      EditFacsimiles: require('views/entry/subsubmenu/facsimiles.edit'),
      Modal: require('hilib/views/modal/main'),
      Form: require('hilib/views/form/main'),
      AnnotationEditor: require('views/entry/editors/annotation'),
      LayerEditor: require('views/entry/editors/layer')
    };
    tpls = require('tpls');
    return Entry = (function(_super) {
      __extends(Entry, _super);

      function Entry() {
        _ref = Entry.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      Entry.prototype.className = 'entry';

      Entry.prototype.initialize = function() {
        var async,
          _this = this;
        Entry.__super__.initialize.apply(this, arguments);
        this.subviews = {};
        async = new Async(['transcriptions', 'facsimiles', 'settings', 'annotationtypes']);
        this.listenToOnce(async, 'ready', function() {
          return _this.render();
        });
        return Collections.projects.getCurrent(function(project) {
          _this.project = project;
          _this.project.get('entries').fetch({
            success: function(collection, response, options) {
              _this.model = collection.setCurrent(_this.options.entryId);
              _this.model.get('transcriptions').fetch({
                success: function(collection, response, options) {
                  var model;
                  model = collection.find(function(model) {
                    if (_this.options.transcriptionName != null) {
                      return model.get('textLayer').toLowerCase() === _this.options.transcriptionName.toLowerCase();
                    }
                  });
                  _this.currentTranscription = collection.setCurrent(model);
                  return async.called('transcriptions');
                }
              });
              _this.model.get('facsimiles').fetch({
                success: function(collection, response, options) {
                  _this.currentFacsimile = collection.setCurrent();
                  return async.called('facsimiles');
                }
              });
              return _this.model.get('settings').fetch({
                success: function() {
                  return async.called('settings');
                }
              });
            }
          });
          return _this.project.get('annotationtypes').fetch({
            success: function() {
              return async.called('annotationtypes');
            }
          });
        });
      };

      Entry.prototype.render = function() {
        var rtpl,
          _this = this;
        rtpl = tpls['entry/main'](this.model.toJSON());
        this.$el.html(rtpl);
        this.renderFacsimile();
        this.renderTranscription();
        this.renderSubsubmenu();
        this.addListeners();
        return this.currentTranscription.getAnnotations(function(annotations) {
          var annotation;
          if (_this.options.annotationID != null) {
            annotation = annotations.get(_this.options.annotationID);
            _this.preview.setAnnotatedText(annotation);
            return _this.renderAnnotation(annotation);
          }
        });
      };

      Entry.prototype.renderFacsimile = function() {
        var url;
        if (this.model.get('facsimiles').current != null) {
          url = this.model.get('facsimiles').current.get('zoomableUrl');
          this.$('.left-pane iframe').attr('src', 'https://tomcat.tiler01.huygens.knaw.nl/adore-huygens-viewer-2.1/viewer.html?rft_id=' + url);
          return this.$('.left-pane iframe').height(document.documentElement.clientHeight - 89);
        }
      };

      Entry.prototype.renderTranscription = function() {
        this.renderPreview();
        this.setTranscriptionNameToMenu();
        if (!this.layerEditor) {
          this.layerEditor = new Views.LayerEditor({
            el: this.el.querySelector('.transcription-placeholder'),
            model: this.currentTranscription,
            height: this.preview.$el.innerHeight(),
            width: this.preview.$el.width() - 4
          });
        } else {
          this.layerEditor.show(this.currentTranscription);
        }
        if (this.annotationEditor != null) {
          return this.annotationEditor.hide();
        }
      };

      Entry.prototype.renderPreview = function() {
        if (this.preview != null) {
          return this.preview.setModel(this.model);
        } else {
          return this.preview = new Views.Preview({
            model: this.model,
            el: this.$('.container .right-pane')
          });
        }
      };

      Entry.prototype.renderAnnotation = function(model) {
        var _this = this;
        if (!this.annotationEditor) {
          this.annotationEditor = new Views.AnnotationEditor({
            el: this.el.querySelector('.annotation-placeholder'),
            model: model,
            height: this.preview.$el.innerHeight() - 31,
            width: this.preview.$el.width() - 4
          });
          this.listenTo(this.annotationEditor, 'cancel', function() {
            _this.preview.removeNewAnnotationTags();
            return _this.renderTranscription();
          });
          this.listenTo(this.annotationEditor, 'newannotation:saved', function(annotation) {
            _this.currentTranscription.get('annotations').add(annotation);
            return _this.publish('message', "New annotation added.");
          });
        } else {
          this.annotationEditor.show(model);
        }
        return this.layerEditor.hide();
      };

      Entry.prototype.renderSubsubmenu = function() {
        return this.subviews.facsimileEdit = new Views.EditFacsimiles({
          collection: this.model.get('facsimiles'),
          el: this.$('.subsubmenu .editfacsimiles')
        });
      };

      Entry.prototype.events = function() {
        return {
          'click .menu li[data-key="previous"]': 'previousEntry',
          'click .menu li[data-key="next"]': 'nextEntry',
          'click .menu li[data-key="facsimile"]': 'changeFacsimile',
          'click .menu li[data-key="transcription"]': 'changeTranscription',
          'click .menu li.subsub': function(ev) {
            return this.subsubmenu.toggle(ev);
          },
          'click .menu li[data-key="print"]': 'printEntry',
          'click .menu li[data-key="metadata"]': 'editEntryMetadata'
        };
      };

      Entry.prototype.printEntry = function(ev) {
        var annotations, h2, mainDiv, ol, pp, sups,
          _this = this;
        pp = document.querySelector('#printpreview');
        if (pp != null) {
          pp.parentNode.removeChild(pp);
        }
        annotations = this.currentTranscription.get('annotations');
        mainDiv = document.createElement('div');
        mainDiv.id = 'printpreview';
        h2 = document.createElement('h2');
        h2.innerHTML = 'Preview';
        mainDiv.appendChild(h2);
        mainDiv.appendChild(this.el.querySelector('.preview').cloneNode(true));
        ol = document.createElement('ol');
        ol.className = 'annotations';
        sups = this.el.querySelectorAll('sup[data-marker="end"]');
        _.each(sups, function(sup) {
          var annotation, li;
          annotation = annotations.findWhere({
            annotationNo: +sup.getAttribute('data-id')
          });
          li = document.createElement('li');
          li.innerHTML = annotation.get('body');
          return ol.appendChild(li);
        });
        h2 = document.createElement('h2');
        h2.innerHTML = 'Annotations';
        mainDiv.appendChild(h2);
        mainDiv.appendChild(ol);
        document.body.appendChild(mainDiv);
        return window.print();
      };

      Entry.prototype.subsubmenu = (function() {
        var currentMenu;
        currentMenu = null;
        return {
          close: function() {
            $('.subsubmenu').removeClass('active');
            return currentMenu = null;
          },
          toggle: function(ev) {
            var newMenu,
              _this = this;
            newMenu = ev.currentTarget.getAttribute('data-key');
            if (currentMenu === newMenu) {
              $(ev.currentTarget).removeClass('rotateup');
              $('.subsubmenu').removeClass('active');
              return currentMenu = null;
            } else {
              if (currentMenu != null) {
                $('.submenu li[data-key="' + currentMenu + '"]').removeClass('rotateup');
              } else {
                $('.subsubmenu').addClass('active');
              }
              $('.submenu li[data-key="' + newMenu + '"]').addClass('rotateup');
              $('.subsubmenu').find('.' + newMenu).appendCloseButton({
                corner: 'bottomright',
                close: function() {
                  return _this.close();
                }
              });
              $('.subsubmenu').find('.' + newMenu).show().siblings().hide();
              return currentMenu = newMenu;
            }
          }
        };
      })();

      Entry.prototype.previousEntry = function() {
        var entryID, textLayer;
        entryID = this.model.collection.previous().id;
        textLayer = StringFn.slugify(this.currentTranscription.get('textLayer'));
        return Backbone.history.navigate("projects/" + (this.project.get('name')) + "/entries/" + entryID + "/transcriptions/" + textLayer, {
          trigger: true
        });
      };

      Entry.prototype.nextEntry = function() {
        var entryID, textLayer;
        entryID = this.model.collection.next().id;
        textLayer = StringFn.slugify(this.currentTranscription.get('textLayer'));
        return Backbone.history.navigate("projects/" + (this.project.get('name')) + "/entries/" + entryID + "/transcriptions/" + textLayer, {
          trigger: true
        });
      };

      Entry.prototype.changeFacsimile = function(ev) {
        var facsimileID, newFacsimile;
        facsimileID = ev.hasOwnProperty('target') ? ev.currentTarget.getAttribute('data-value') : ev;
        newFacsimile = this.model.get('facsimiles').get(facsimileID);
        if (newFacsimile != null) {
          return this.model.get('facsimiles').setCurrent(newFacsimile);
        }
      };

      Entry.prototype.changeTranscription = function(ev) {
        var newTranscription, transcriptionID;
        transcriptionID = ev.hasOwnProperty('target') ? ev.currentTarget.getAttribute('data-value') : ev;
        newTranscription = this.model.get('transcriptions').get(transcriptionID);
        if (newTranscription !== this.currentTranscription) {
          return this.model.get('transcriptions').setCurrent(newTranscription);
        } else if (!this.layerEditor.visible()) {
          return this.model.get('transcriptions').trigger('current:change', this.currentTranscription);
        }
      };

      Entry.prototype.editEntryMetadata = function(ev) {
        var entryMetadata, modal,
          _this = this;
        entryMetadata = new Views.Form({
          tpl: tpls['entry/metadata'],
          model: this.model.clone()
        });
        modal = new Views.Modal({
          title: "Edit entry metadata",
          $html: entryMetadata.$el,
          submitValue: 'Save metadata',
          width: '300px'
        });
        return modal.on('submit', function() {
          var jqXHR;
          _this.model.updateFromClone(entryMetadata.model);
          _this.model.get('settings').save();
          jqXHR = _this.model.save();
          return jqXHR.done(function() {
            _this.publish('message', "Saved metadata for entry: " + (_this.model.get('name')) + ".");
            return modal.close();
          });
        });
      };

      Entry.prototype.setTranscriptionNameToMenu = function() {
        var li, textLayer, textLayerNode;
        textLayer = this.currentTranscription.get('textLayer');
        textLayerNode = document.createTextNode(textLayer + ' layer');
        li = this.el.querySelector('.submenu li[data-key="layer"]');
        return li.replaceChild(textLayerNode, li.firstChild);
      };

      Entry.prototype.addListeners = function() {
        var _this = this;
        this.listenTo(this.preview, 'editAnnotation', this.renderAnnotation);
        this.listenTo(this.preview, 'annotation:removed', this.renderTranscription);
        this.listenTo(this.preview, 'scrolled', function(percentages) {
          return _this.layerEditor.editor.setScrollPercentage(percentages);
        });
        this.listenTo(this.layerEditor.editor, 'scrolled', function(percentages) {
          return _this.preview.setScroll(percentages);
        });
        this.listenTo(this.model.get('facsimiles'), 'current:change', function(current) {
          _this.currentFacsimile = current;
          return _this.renderFacsimile();
        });
        this.listenTo(this.model.get('facsimiles'), 'add', function(facsimile) {
          var li;
          li = $("<li data-key='facsimile' data-value='" + facsimile.id + "'>" + (facsimile.get('name')) + "</li>");
          _this.$('.submenu .facsimiles').append(li);
          _this.changeFacsimile(facsimile.id);
          _this.subsubmenu.close();
          return _this.publish('message', "Added facsimile: \"" + (facsimile.get('name')) + "\".");
        });
        this.listenTo(this.model.get('facsimiles'), 'remove', function(facsimile) {
          _this.$('.submenu .facsimiles [data-value="' + facsimile.id + '"]').remove();
          return _this.publish('message', "Removed facsimile: \"" + (facsimile.get('name')) + "\".");
        });
        this.listenTo(this.model.get('transcriptions'), 'current:change', function(current) {
          _this.currentTranscription = current;
          return _this.currentTranscription.getAnnotations(function(annotations) {
            return _this.renderTranscription();
          });
        });
        this.listenTo(this.model.get('transcriptions'), 'add', function(transcription) {
          var li;
          li = $("<li data-key='transcription' data-value='" + transcription.id + "'>" + (transcription.get('textLayer')) + " layer</li>");
          _this.$('.submenu .textlayers').append(li);
          _this.changeTranscription(transcription.id);
          _this.subsubmenu.close();
          return _this.publish('message', "Added text layer: \"" + (transcription.get('textLayer')) + "\".");
        });
        this.listenTo(this.model.get('transcriptions'), 'remove', function(transcription) {
          _this.$('.submenu .textlayers [data-value="' + transcription.id + '"]').remove();
          return _this.publish('message', "Removed text layer: \"" + (transcription.get('textLayer')) + "\".");
        });
        return window.addEventListener('resize', function(ev) {
          return Fn.timeoutWithReset(600, function() {
            _this.renderFacsimile();
            _this.preview.resize();
            _this.layerEditor.editor.setIframeHeight(_this.preview.$el.innerHeight());
            _this.layerEditor.editor.setIframeWidth(_this.preview.$el.width() - 4);
            if (_this.annotationEditor != null) {
              _this.annotationEditor.editor.setIframeHeight(_this.preview.$el.innerHeight());
              return _this.annotationEditor.editor.setIframeWidth(_this.preview.$el.width() - 4);
            }
          });
        });
      };

      return Entry;

    })(Views.Base);
  });

}).call(this);

(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define('routers/main',['require','backbone','hilib/managers/view','hilib/managers/history','hilib/mixins/pubsub','hilib/functions/general','collections/projects','views/login','views/project/main','views/project/settings','views/project/history','views/entry/main'],function(require) {
    var Backbone, Collections, Fn, MainRouter, Pubsub, Views, history, viewManager, _ref;
    Backbone = require('backbone');
    viewManager = require('hilib/managers/view');
    history = require('hilib/managers/history');
    Pubsub = require('hilib/mixins/pubsub');
    Fn = require('hilib/functions/general');
    Collections = {
      projects: require('collections/projects')
    };
    Views = {
      Login: require('views/login'),
      ProjectMain: require('views/project/main'),
      ProjectSettings: require('views/project/settings'),
      ProjectHistory: require('views/project/history'),
      Entry: require('views/entry/main')
    };
    return MainRouter = (function(_super) {
      __extends(MainRouter, _super);

      function MainRouter() {
        _ref = MainRouter.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      MainRouter.prototype.initialize = function() {
        var _this = this;
        _.extend(this, Pubsub);
        this.on('route', function() {
          return history.update();
        });
        return Collections.projects.getCurrent(function() {
          return _this.listenTo(Collections.projects, 'current:change', function(project) {
            viewManager.clearCache();
            return _this.navigate("projects/" + (project.get('name')), {
              trigger: true
            });
          });
        });
      };

      MainRouter.prototype.manageView = function(View, options) {
        return viewManager.show('div#main', View, options);
      };

      MainRouter.prototype['routes'] = {
        '': 'project',
        'login': 'login',
        'projects/:name': 'project',
        'projects/:name/settings/:tab': 'projectSettings',
        'projects/:name/settings': 'projectSettings',
        'projects/:name/history': 'projectHistory',
        'projects/:name/entries/:id': 'entry',
        'projects/:name/entries/:id/transcriptions/:name': 'entry',
        'projects/:name/entries/:id/transcriptions/:name/annotations/:id': 'entry'
      };

      MainRouter.prototype.login = function() {
        return this.manageView(Views.Login);
      };

      MainRouter.prototype.project = function(name) {
        return this.manageView(Views.ProjectMain);
      };

      MainRouter.prototype.projectSettings = function(name, tab) {
        return this.manageView(Views.ProjectSettings, {
          tabName: tab
        });
      };

      MainRouter.prototype.projectHistory = function(name) {
        return this.manageView(Views.ProjectHistory);
      };

      MainRouter.prototype.entry = function(projectName, entryID, transcriptionName, annotationID) {
        return this.manageView(Views.Entry, {
          entryId: entryID,
          transcriptionName: transcriptionName,
          annotationID: annotationID
        });
      };

      return MainRouter;

    })(Backbone.Router);
  });

}).call(this);

(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define('views/ui/header',['require','views/base','config','hilib/functions/general','hilib/managers/ajax','hilib/managers/token','models/currentUser','collections/projects','tpls'],function(require) {
    var BaseView, Collections, Fn, Header, Models, ajax, config, token, tpls, _ref;
    BaseView = require('views/base');
    config = require('config');
    Fn = require('hilib/functions/general');
    ajax = require('hilib/managers/ajax');
    token = require('hilib/managers/token');
    Models = {
      currentUser: require('models/currentUser')
    };
    Collections = {
      projects: require('collections/projects')
    };
    tpls = require('tpls');
    return Header = (function(_super) {
      __extends(Header, _super);

      function Header() {
        _ref = Header.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      Header.prototype.tagName = 'header';

      Header.prototype.className = 'main';

      Header.prototype.initialize = function() {
        var _this = this;
        Header.__super__.initialize.apply(this, arguments);
        this.project = this.options.project;
        this.listenTo(Collections.projects, 'current:change', function(project) {
          _this.project = project;
          return _this.render();
        });
        return this.subscribe('message', this.showMessage, this);
      };

      Header.prototype.events = {
        'click .user .logout': function() {
          return Models.currentUser.logout();
        },
        'click .user .project': 'setProject',
        'click .project .projecttitle': 'navigateToProject',
        'click .project .settings': 'navigateToProjectSettings',
        'click .project .search': 'navigateToProject',
        'click .project .history': 'navigateToProjectHistory',
        'click .message': function() {
          return this.$('.message').removeClass('active');
        }
      };

      Header.prototype.navigateToProject = function(ev) {
        return Backbone.history.navigate("projects/" + (this.project.get('name')), {
          trigger: true
        });
      };

      Header.prototype.navigateToProjectSettings = function(ev) {
        return Backbone.history.navigate("projects/" + (this.project.get('name')) + "/settings", {
          trigger: true
        });
      };

      Header.prototype.navigateToProjectHistory = function(ev) {
        return Backbone.history.navigate("projects/" + (this.project.get('name')) + "/history", {
          trigger: true
        });
      };

      Header.prototype.render = function() {
        var rtpl;
        rtpl = tpls['ui/header']({
          projects: Collections.projects,
          user: Models.currentUser
        });
        this.$el.html(rtpl);
        return this;
      };

      Header.prototype.setProject = function(ev) {
        var id;
        id = ev.currentTarget.getAttribute('data-id');
        return Collections.projects.setCurrent(id);
      };

      Header.prototype.showMessage = function(msg) {
        var $message,
          _this = this;
        if (msg.trim().length === 0) {
          return false;
        }
        $message = this.$('.message');
        if (!$message.hasClass('active')) {
          $message.addClass('active');
        }
        $message.html(msg);
        return Fn.timeoutWithReset(5000, (function() {
          return $message.removeClass('active');
        }), function() {
          $message.addClass('pulse');
          return setTimeout((function() {
            return $message.removeClass('pulse');
          }), 1000);
        });
      };

      return Header;

    })(BaseView);
  });

}).call(this);

(function() {
  define('app',['require','backbone','hilib/managers/history','routers/main','models/currentUser','collections/projects','views/ui/header'],function(require) {
    var Backbone, MainRouter, Models, Views, history, projects;
    Backbone = require('backbone');
    history = require('hilib/managers/history');
    MainRouter = require('routers/main');
    Models = {
      currentUser: require('models/currentUser')
    };
    projects = require('collections/projects');
    Views = {
      Header: require('views/ui/header')
    };
    /* DEBUG*/

    Backbone.on('authorized', function() {
      return console.log('[debug] authorized');
    });
    Backbone.on('unauthorized', function() {
      return console.log('[debug] unauthorized');
    });
    return {
      /* /DEBUG*/

      init: function() {
        var mainRouter,
          _this = this;
        mainRouter = new MainRouter();
        Backbone.history.start({
          pushState: true
        });
        Models.currentUser.authorize({
          authorized: function() {
            projects.fetch();
            return projects.getCurrent(function(current) {
              var header, url, _ref;
              header = new Views.Header({
                project: current
              });
              $('#container').prepend(header.render().$el);
              url = (_ref = history.last()) != null ? _ref : 'projects/' + projects.current.get('name');
              return mainRouter.navigate(url, {
                trigger: true
              });
            });
          },
          unauthorized: function() {
            return mainRouter.navigate('login', {
              trigger: true
            });
          }
        });
        return $(document).on('click', 'a:not([data-bypass])', function(e) {
          var href;
          href = $(this).attr('href');
          if (href != null) {
            e.preventDefault();
            return Backbone.history.navigate(href, {
              'trigger': true
            });
          }
        });
      }
    };
  });

}).call(this);

/*
 * classList.js: Cross-browser full element.classList implementation.
 * 2012-11-15
 *
 * By Eli Grey, http://eligrey.com
 * Public Domain.
 * NO WARRANTY EXPRESSED OR IMPLIED. USE AT YOUR OWN RISK.
 */

/*global self, document, DOMException */

/*! @source http://purl.eligrey.com/github/classList.js/blob/master/classList.js*/

if (typeof document !== "undefined" && !("classList" in document.createElement("a"))) {

(function (view) {



if (!('HTMLElement' in view) && !('Element' in view)) return;

var
	  classListProp = "classList"
	, protoProp = "prototype"
	, elemCtrProto = (view.HTMLElement || view.Element)[protoProp]
	, objCtr = Object
	, strTrim = String[protoProp].trim || function () {
		return this.replace(/^\s+|\s+$/g, "");
	}
	, arrIndexOf = Array[protoProp].indexOf || function (item) {
		var
			  i = 0
			, len = this.length
		;
		for (; i < len; i++) {
			if (i in this && this[i] === item) {
				return i;
			}
		}
		return -1;
	}
	// Vendors: please allow content code to instantiate DOMExceptions
	, DOMEx = function (type, message) {
		this.name = type;
		this.code = DOMException[type];
		this.message = message;
	}
	, checkTokenAndGetIndex = function (classList, token) {
		if (token === "") {
			throw new DOMEx(
				  "SYNTAX_ERR"
				, "An invalid or illegal string was specified"
			);
		}
		if (/\s/.test(token)) {
			throw new DOMEx(
				  "INVALID_CHARACTER_ERR"
				, "String contains an invalid character"
			);
		}
		return arrIndexOf.call(classList, token);
	}
	, ClassList = function (elem) {
		var
			  trimmedClasses = strTrim.call(elem.className)
			, classes = trimmedClasses ? trimmedClasses.split(/\s+/) : []
			, i = 0
			, len = classes.length
		;
		for (; i < len; i++) {
			this.push(classes[i]);
		}
		this._updateClassName = function () {
			elem.className = this.toString();
		};
	}
	, classListProto = ClassList[protoProp] = []
	, classListGetter = function () {
		return new ClassList(this);
	}
;
// Most DOMException implementations don't allow calling DOMException's toString()
// on non-DOMExceptions. Error's toString() is sufficient here.
DOMEx[protoProp] = Error[protoProp];
classListProto.item = function (i) {
	return this[i] || null;
};
classListProto.contains = function (token) {
	token += "";
	return checkTokenAndGetIndex(this, token) !== -1;
};
classListProto.add = function () {
	var
		  tokens = arguments
		, i = 0
		, l = tokens.length
		, token
		, updated = false
	;
	do {
		token = tokens[i] + "";
		if (checkTokenAndGetIndex(this, token) === -1) {
			this.push(token);
			updated = true;
		}
	}
	while (++i < l);

	if (updated) {
		this._updateClassName();
	}
};
classListProto.remove = function () {
	var
		  tokens = arguments
		, i = 0
		, l = tokens.length
		, token
		, updated = false
	;
	do {
		token = tokens[i] + "";
		var index = checkTokenAndGetIndex(this, token);
		if (index !== -1) {
			this.splice(index, 1);
			updated = true;
		}
	}
	while (++i < l);

	if (updated) {
		this._updateClassName();
	}
};
classListProto.toggle = function (token, forse) {
	token += "";

	var
		  result = this.contains(token)
		, method = result ?
			forse !== true && "remove"
		:
			forse !== false && "add"
	;

	if (method) {
		this[method](token);
	}

	return !result;
};
classListProto.toString = function () {
	return this.join(" ");
};

if (objCtr.defineProperty) {
	var classListPropDesc = {
		  get: classListGetter
		, enumerable: true
		, configurable: true
	};
	try {
		objCtr.defineProperty(elemCtrProto, classListProp, classListPropDesc);
	} catch (ex) { // IE 8 doesn't support enumerable:true
		if (ex.number === -0x7FF5EC54) {
			classListPropDesc.enumerable = false;
			objCtr.defineProperty(elemCtrProto, classListProp, classListPropDesc);
		}
	}
} else if (objCtr[protoProp].__defineGetter__) {
	elemCtrProto.__defineGetter__(classListProp, classListGetter);
}

}(self));

}
;
define("classList", function(){});

(function() {
  require.config({
    paths: {
      'jquery': '../lib/jquery/jquery',
      'underscore': '../lib/underscore-amd/underscore',
      'backbone': '../lib/backbone-amd/backbone',
      'domready': '../lib/requirejs-domready/domReady',
      'classList': '../lib/classList.js/classList',
      'faceted-search': '../lib/faceted-search/stage/js/main',
      'hilib': '../lib/hilib/compiled',
      'html': '../html',
      'tpls': '../templates',
      'jade': '../lib/jade/runtime'
    },
    shim: {
      'underscore': {
        exports: '_'
      },
      'backbone': {
        deps: ['underscore', 'jquery'],
        exports: 'Backbone'
      },
      'faceted-search': {
        deps: ['backbone']
      }
    }
  });

  require(['domready', 'app', 'underscore', 'classList'], function(domready, app, _) {
    return domready(function() {
      return app.init();
    });
  });

}).call(this);

define("main", function(){});
}());