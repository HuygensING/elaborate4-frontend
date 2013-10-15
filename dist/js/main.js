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

/*! jQuery v2.0.3 | (c) 2005, 2013 jQuery Foundation, Inc. | jquery.org/license
//@ sourceMappingURL=jquery.min.map
*/
(function(e,undefined){var t,n,r=typeof undefined,i=e.location,o=e.document,s=o.documentElement,a=e.jQuery,u=e.$,l={},c=[],p="2.0.3",f=c.concat,h=c.push,d=c.slice,g=c.indexOf,m=l.toString,y=l.hasOwnProperty,v=p.trim,x=function(e,n){return new x.fn.init(e,n,t)},b=/[+-]?(?:\d*\.|)\d+(?:[eE][+-]?\d+|)/.source,w=/\S+/g,T=/^(?:\s*(<[\w\W]+>)[^>]*|#([\w-]*))$/,C=/^<(\w+)\s*\/?>(?:<\/\1>|)$/,k=/^-ms-/,N=/-([\da-z])/gi,E=function(e,t){return t.toUpperCase()},S=function(){o.removeEventListener("DOMContentLoaded",S,!1),e.removeEventListener("load",S,!1),x.ready()};x.fn=x.prototype={jquery:p,constructor:x,init:function(e,t,n){var r,i;if(!e)return this;if("string"==typeof e){if(r="<"===e.charAt(0)&&">"===e.charAt(e.length-1)&&e.length>=3?[null,e,null]:T.exec(e),!r||!r[1]&&t)return!t||t.jquery?(t||n).find(e):this.constructor(t).find(e);if(r[1]){if(t=t instanceof x?t[0]:t,x.merge(this,x.parseHTML(r[1],t&&t.nodeType?t.ownerDocument||t:o,!0)),C.test(r[1])&&x.isPlainObject(t))for(r in t)x.isFunction(this[r])?this[r](t[r]):this.attr(r,t[r]);return this}return i=o.getElementById(r[2]),i&&i.parentNode&&(this.length=1,this[0]=i),this.context=o,this.selector=e,this}return e.nodeType?(this.context=this[0]=e,this.length=1,this):x.isFunction(e)?n.ready(e):(e.selector!==undefined&&(this.selector=e.selector,this.context=e.context),x.makeArray(e,this))},selector:"",length:0,toArray:function(){return d.call(this)},get:function(e){return null==e?this.toArray():0>e?this[this.length+e]:this[e]},pushStack:function(e){var t=x.merge(this.constructor(),e);return t.prevObject=this,t.context=this.context,t},each:function(e,t){return x.each(this,e,t)},ready:function(e){return x.ready.promise().done(e),this},slice:function(){return this.pushStack(d.apply(this,arguments))},first:function(){return this.eq(0)},last:function(){return this.eq(-1)},eq:function(e){var t=this.length,n=+e+(0>e?t:0);return this.pushStack(n>=0&&t>n?[this[n]]:[])},map:function(e){return this.pushStack(x.map(this,function(t,n){return e.call(t,n,t)}))},end:function(){return this.prevObject||this.constructor(null)},push:h,sort:[].sort,splice:[].splice},x.fn.init.prototype=x.fn,x.extend=x.fn.extend=function(){var e,t,n,r,i,o,s=arguments[0]||{},a=1,u=arguments.length,l=!1;for("boolean"==typeof s&&(l=s,s=arguments[1]||{},a=2),"object"==typeof s||x.isFunction(s)||(s={}),u===a&&(s=this,--a);u>a;a++)if(null!=(e=arguments[a]))for(t in e)n=s[t],r=e[t],s!==r&&(l&&r&&(x.isPlainObject(r)||(i=x.isArray(r)))?(i?(i=!1,o=n&&x.isArray(n)?n:[]):o=n&&x.isPlainObject(n)?n:{},s[t]=x.extend(l,o,r)):r!==undefined&&(s[t]=r));return s},x.extend({expando:"jQuery"+(p+Math.random()).replace(/\D/g,""),noConflict:function(t){return e.$===x&&(e.$=u),t&&e.jQuery===x&&(e.jQuery=a),x},isReady:!1,readyWait:1,holdReady:function(e){e?x.readyWait++:x.ready(!0)},ready:function(e){(e===!0?--x.readyWait:x.isReady)||(x.isReady=!0,e!==!0&&--x.readyWait>0||(n.resolveWith(o,[x]),x.fn.trigger&&x(o).trigger("ready").off("ready")))},isFunction:function(e){return"function"===x.type(e)},isArray:Array.isArray,isWindow:function(e){return null!=e&&e===e.window},isNumeric:function(e){return!isNaN(parseFloat(e))&&isFinite(e)},type:function(e){return null==e?e+"":"object"==typeof e||"function"==typeof e?l[m.call(e)]||"object":typeof e},isPlainObject:function(e){if("object"!==x.type(e)||e.nodeType||x.isWindow(e))return!1;try{if(e.constructor&&!y.call(e.constructor.prototype,"isPrototypeOf"))return!1}catch(t){return!1}return!0},isEmptyObject:function(e){var t;for(t in e)return!1;return!0},error:function(e){throw Error(e)},parseHTML:function(e,t,n){if(!e||"string"!=typeof e)return null;"boolean"==typeof t&&(n=t,t=!1),t=t||o;var r=C.exec(e),i=!n&&[];return r?[t.createElement(r[1])]:(r=x.buildFragment([e],t,i),i&&x(i).remove(),x.merge([],r.childNodes))},parseJSON:JSON.parse,parseXML:function(e){var t,n;if(!e||"string"!=typeof e)return null;try{n=new DOMParser,t=n.parseFromString(e,"text/xml")}catch(r){t=undefined}return(!t||t.getElementsByTagName("parsererror").length)&&x.error("Invalid XML: "+e),t},noop:function(){},globalEval:function(e){var t,n=eval;e=x.trim(e),e&&(1===e.indexOf("use strict")?(t=o.createElement("script"),t.text=e,o.head.appendChild(t).parentNode.removeChild(t)):n(e))},camelCase:function(e){return e.replace(k,"ms-").replace(N,E)},nodeName:function(e,t){return e.nodeName&&e.nodeName.toLowerCase()===t.toLowerCase()},each:function(e,t,n){var r,i=0,o=e.length,s=j(e);if(n){if(s){for(;o>i;i++)if(r=t.apply(e[i],n),r===!1)break}else for(i in e)if(r=t.apply(e[i],n),r===!1)break}else if(s){for(;o>i;i++)if(r=t.call(e[i],i,e[i]),r===!1)break}else for(i in e)if(r=t.call(e[i],i,e[i]),r===!1)break;return e},trim:function(e){return null==e?"":v.call(e)},makeArray:function(e,t){var n=t||[];return null!=e&&(j(Object(e))?x.merge(n,"string"==typeof e?[e]:e):h.call(n,e)),n},inArray:function(e,t,n){return null==t?-1:g.call(t,e,n)},merge:function(e,t){var n=t.length,r=e.length,i=0;if("number"==typeof n)for(;n>i;i++)e[r++]=t[i];else while(t[i]!==undefined)e[r++]=t[i++];return e.length=r,e},grep:function(e,t,n){var r,i=[],o=0,s=e.length;for(n=!!n;s>o;o++)r=!!t(e[o],o),n!==r&&i.push(e[o]);return i},map:function(e,t,n){var r,i=0,o=e.length,s=j(e),a=[];if(s)for(;o>i;i++)r=t(e[i],i,n),null!=r&&(a[a.length]=r);else for(i in e)r=t(e[i],i,n),null!=r&&(a[a.length]=r);return f.apply([],a)},guid:1,proxy:function(e,t){var n,r,i;return"string"==typeof t&&(n=e[t],t=e,e=n),x.isFunction(e)?(r=d.call(arguments,2),i=function(){return e.apply(t||this,r.concat(d.call(arguments)))},i.guid=e.guid=e.guid||x.guid++,i):undefined},access:function(e,t,n,r,i,o,s){var a=0,u=e.length,l=null==n;if("object"===x.type(n)){i=!0;for(a in n)x.access(e,t,a,n[a],!0,o,s)}else if(r!==undefined&&(i=!0,x.isFunction(r)||(s=!0),l&&(s?(t.call(e,r),t=null):(l=t,t=function(e,t,n){return l.call(x(e),n)})),t))for(;u>a;a++)t(e[a],n,s?r:r.call(e[a],a,t(e[a],n)));return i?e:l?t.call(e):u?t(e[0],n):o},now:Date.now,swap:function(e,t,n,r){var i,o,s={};for(o in t)s[o]=e.style[o],e.style[o]=t[o];i=n.apply(e,r||[]);for(o in t)e.style[o]=s[o];return i}}),x.ready.promise=function(t){return n||(n=x.Deferred(),"complete"===o.readyState?setTimeout(x.ready):(o.addEventListener("DOMContentLoaded",S,!1),e.addEventListener("load",S,!1))),n.promise(t)},x.each("Boolean Number String Function Array Date RegExp Object Error".split(" "),function(e,t){l["[object "+t+"]"]=t.toLowerCase()});function j(e){var t=e.length,n=x.type(e);return x.isWindow(e)?!1:1===e.nodeType&&t?!0:"array"===n||"function"!==n&&(0===t||"number"==typeof t&&t>0&&t-1 in e)}t=x(o),function(e,undefined){var t,n,r,i,o,s,a,u,l,c,p,f,h,d,g,m,y,v="sizzle"+-new Date,b=e.document,w=0,T=0,C=st(),k=st(),N=st(),E=!1,S=function(e,t){return e===t?(E=!0,0):0},j=typeof undefined,D=1<<31,A={}.hasOwnProperty,L=[],q=L.pop,H=L.push,O=L.push,F=L.slice,P=L.indexOf||function(e){var t=0,n=this.length;for(;n>t;t++)if(this[t]===e)return t;return-1},R="checked|selected|async|autofocus|autoplay|controls|defer|disabled|hidden|ismap|loop|multiple|open|readonly|required|scoped",M="[\\x20\\t\\r\\n\\f]",W="(?:\\\\.|[\\w-]|[^\\x00-\\xa0])+",$=W.replace("w","w#"),B="\\["+M+"*("+W+")"+M+"*(?:([*^$|!~]?=)"+M+"*(?:(['\"])((?:\\\\.|[^\\\\])*?)\\3|("+$+")|)|)"+M+"*\\]",I=":("+W+")(?:\\(((['\"])((?:\\\\.|[^\\\\])*?)\\3|((?:\\\\.|[^\\\\()[\\]]|"+B.replace(3,8)+")*)|.*)\\)|)",z=RegExp("^"+M+"+|((?:^|[^\\\\])(?:\\\\.)*)"+M+"+$","g"),_=RegExp("^"+M+"*,"+M+"*"),X=RegExp("^"+M+"*([>+~]|"+M+")"+M+"*"),U=RegExp(M+"*[+~]"),Y=RegExp("="+M+"*([^\\]'\"]*)"+M+"*\\]","g"),V=RegExp(I),G=RegExp("^"+$+"$"),J={ID:RegExp("^#("+W+")"),CLASS:RegExp("^\\.("+W+")"),TAG:RegExp("^("+W.replace("w","w*")+")"),ATTR:RegExp("^"+B),PSEUDO:RegExp("^"+I),CHILD:RegExp("^:(only|first|last|nth|nth-last)-(child|of-type)(?:\\("+M+"*(even|odd|(([+-]|)(\\d*)n|)"+M+"*(?:([+-]|)"+M+"*(\\d+)|))"+M+"*\\)|)","i"),bool:RegExp("^(?:"+R+")$","i"),needsContext:RegExp("^"+M+"*[>+~]|:(even|odd|eq|gt|lt|nth|first|last)(?:\\("+M+"*((?:-\\d)?\\d*)"+M+"*\\)|)(?=[^-]|$)","i")},Q=/^[^{]+\{\s*\[native \w/,K=/^(?:#([\w-]+)|(\w+)|\.([\w-]+))$/,Z=/^(?:input|select|textarea|button)$/i,et=/^h\d$/i,tt=/'|\\/g,nt=RegExp("\\\\([\\da-f]{1,6}"+M+"?|("+M+")|.)","ig"),rt=function(e,t,n){var r="0x"+t-65536;return r!==r||n?t:0>r?String.fromCharCode(r+65536):String.fromCharCode(55296|r>>10,56320|1023&r)};try{O.apply(L=F.call(b.childNodes),b.childNodes),L[b.childNodes.length].nodeType}catch(it){O={apply:L.length?function(e,t){H.apply(e,F.call(t))}:function(e,t){var n=e.length,r=0;while(e[n++]=t[r++]);e.length=n-1}}}function ot(e,t,r,i){var o,s,a,u,l,f,g,m,x,w;if((t?t.ownerDocument||t:b)!==p&&c(t),t=t||p,r=r||[],!e||"string"!=typeof e)return r;if(1!==(u=t.nodeType)&&9!==u)return[];if(h&&!i){if(o=K.exec(e))if(a=o[1]){if(9===u){if(s=t.getElementById(a),!s||!s.parentNode)return r;if(s.id===a)return r.push(s),r}else if(t.ownerDocument&&(s=t.ownerDocument.getElementById(a))&&y(t,s)&&s.id===a)return r.push(s),r}else{if(o[2])return O.apply(r,t.getElementsByTagName(e)),r;if((a=o[3])&&n.getElementsByClassName&&t.getElementsByClassName)return O.apply(r,t.getElementsByClassName(a)),r}if(n.qsa&&(!d||!d.test(e))){if(m=g=v,x=t,w=9===u&&e,1===u&&"object"!==t.nodeName.toLowerCase()){f=gt(e),(g=t.getAttribute("id"))?m=g.replace(tt,"\\$&"):t.setAttribute("id",m),m="[id='"+m+"'] ",l=f.length;while(l--)f[l]=m+mt(f[l]);x=U.test(e)&&t.parentNode||t,w=f.join(",")}if(w)try{return O.apply(r,x.querySelectorAll(w)),r}catch(T){}finally{g||t.removeAttribute("id")}}}return kt(e.replace(z,"$1"),t,r,i)}function st(){var e=[];function t(n,r){return e.push(n+=" ")>i.cacheLength&&delete t[e.shift()],t[n]=r}return t}function at(e){return e[v]=!0,e}function ut(e){var t=p.createElement("div");try{return!!e(t)}catch(n){return!1}finally{t.parentNode&&t.parentNode.removeChild(t),t=null}}function lt(e,t){var n=e.split("|"),r=e.length;while(r--)i.attrHandle[n[r]]=t}function ct(e,t){var n=t&&e,r=n&&1===e.nodeType&&1===t.nodeType&&(~t.sourceIndex||D)-(~e.sourceIndex||D);if(r)return r;if(n)while(n=n.nextSibling)if(n===t)return-1;return e?1:-1}function pt(e){return function(t){var n=t.nodeName.toLowerCase();return"input"===n&&t.type===e}}function ft(e){return function(t){var n=t.nodeName.toLowerCase();return("input"===n||"button"===n)&&t.type===e}}function ht(e){return at(function(t){return t=+t,at(function(n,r){var i,o=e([],n.length,t),s=o.length;while(s--)n[i=o[s]]&&(n[i]=!(r[i]=n[i]))})})}s=ot.isXML=function(e){var t=e&&(e.ownerDocument||e).documentElement;return t?"HTML"!==t.nodeName:!1},n=ot.support={},c=ot.setDocument=function(e){var t=e?e.ownerDocument||e:b,r=t.defaultView;return t!==p&&9===t.nodeType&&t.documentElement?(p=t,f=t.documentElement,h=!s(t),r&&r.attachEvent&&r!==r.top&&r.attachEvent("onbeforeunload",function(){c()}),n.attributes=ut(function(e){return e.className="i",!e.getAttribute("className")}),n.getElementsByTagName=ut(function(e){return e.appendChild(t.createComment("")),!e.getElementsByTagName("*").length}),n.getElementsByClassName=ut(function(e){return e.innerHTML="<div class='a'></div><div class='a i'></div>",e.firstChild.className="i",2===e.getElementsByClassName("i").length}),n.getById=ut(function(e){return f.appendChild(e).id=v,!t.getElementsByName||!t.getElementsByName(v).length}),n.getById?(i.find.ID=function(e,t){if(typeof t.getElementById!==j&&h){var n=t.getElementById(e);return n&&n.parentNode?[n]:[]}},i.filter.ID=function(e){var t=e.replace(nt,rt);return function(e){return e.getAttribute("id")===t}}):(delete i.find.ID,i.filter.ID=function(e){var t=e.replace(nt,rt);return function(e){var n=typeof e.getAttributeNode!==j&&e.getAttributeNode("id");return n&&n.value===t}}),i.find.TAG=n.getElementsByTagName?function(e,t){return typeof t.getElementsByTagName!==j?t.getElementsByTagName(e):undefined}:function(e,t){var n,r=[],i=0,o=t.getElementsByTagName(e);if("*"===e){while(n=o[i++])1===n.nodeType&&r.push(n);return r}return o},i.find.CLASS=n.getElementsByClassName&&function(e,t){return typeof t.getElementsByClassName!==j&&h?t.getElementsByClassName(e):undefined},g=[],d=[],(n.qsa=Q.test(t.querySelectorAll))&&(ut(function(e){e.innerHTML="<select><option selected=''></option></select>",e.querySelectorAll("[selected]").length||d.push("\\["+M+"*(?:value|"+R+")"),e.querySelectorAll(":checked").length||d.push(":checked")}),ut(function(e){var n=t.createElement("input");n.setAttribute("type","hidden"),e.appendChild(n).setAttribute("t",""),e.querySelectorAll("[t^='']").length&&d.push("[*^$]="+M+"*(?:''|\"\")"),e.querySelectorAll(":enabled").length||d.push(":enabled",":disabled"),e.querySelectorAll("*,:x"),d.push(",.*:")})),(n.matchesSelector=Q.test(m=f.webkitMatchesSelector||f.mozMatchesSelector||f.oMatchesSelector||f.msMatchesSelector))&&ut(function(e){n.disconnectedMatch=m.call(e,"div"),m.call(e,"[s!='']:x"),g.push("!=",I)}),d=d.length&&RegExp(d.join("|")),g=g.length&&RegExp(g.join("|")),y=Q.test(f.contains)||f.compareDocumentPosition?function(e,t){var n=9===e.nodeType?e.documentElement:e,r=t&&t.parentNode;return e===r||!(!r||1!==r.nodeType||!(n.contains?n.contains(r):e.compareDocumentPosition&&16&e.compareDocumentPosition(r)))}:function(e,t){if(t)while(t=t.parentNode)if(t===e)return!0;return!1},S=f.compareDocumentPosition?function(e,r){if(e===r)return E=!0,0;var i=r.compareDocumentPosition&&e.compareDocumentPosition&&e.compareDocumentPosition(r);return i?1&i||!n.sortDetached&&r.compareDocumentPosition(e)===i?e===t||y(b,e)?-1:r===t||y(b,r)?1:l?P.call(l,e)-P.call(l,r):0:4&i?-1:1:e.compareDocumentPosition?-1:1}:function(e,n){var r,i=0,o=e.parentNode,s=n.parentNode,a=[e],u=[n];if(e===n)return E=!0,0;if(!o||!s)return e===t?-1:n===t?1:o?-1:s?1:l?P.call(l,e)-P.call(l,n):0;if(o===s)return ct(e,n);r=e;while(r=r.parentNode)a.unshift(r);r=n;while(r=r.parentNode)u.unshift(r);while(a[i]===u[i])i++;return i?ct(a[i],u[i]):a[i]===b?-1:u[i]===b?1:0},t):p},ot.matches=function(e,t){return ot(e,null,null,t)},ot.matchesSelector=function(e,t){if((e.ownerDocument||e)!==p&&c(e),t=t.replace(Y,"='$1']"),!(!n.matchesSelector||!h||g&&g.test(t)||d&&d.test(t)))try{var r=m.call(e,t);if(r||n.disconnectedMatch||e.document&&11!==e.document.nodeType)return r}catch(i){}return ot(t,p,null,[e]).length>0},ot.contains=function(e,t){return(e.ownerDocument||e)!==p&&c(e),y(e,t)},ot.attr=function(e,t){(e.ownerDocument||e)!==p&&c(e);var r=i.attrHandle[t.toLowerCase()],o=r&&A.call(i.attrHandle,t.toLowerCase())?r(e,t,!h):undefined;return o===undefined?n.attributes||!h?e.getAttribute(t):(o=e.getAttributeNode(t))&&o.specified?o.value:null:o},ot.error=function(e){throw Error("Syntax error, unrecognized expression: "+e)},ot.uniqueSort=function(e){var t,r=[],i=0,o=0;if(E=!n.detectDuplicates,l=!n.sortStable&&e.slice(0),e.sort(S),E){while(t=e[o++])t===e[o]&&(i=r.push(o));while(i--)e.splice(r[i],1)}return e},o=ot.getText=function(e){var t,n="",r=0,i=e.nodeType;if(i){if(1===i||9===i||11===i){if("string"==typeof e.textContent)return e.textContent;for(e=e.firstChild;e;e=e.nextSibling)n+=o(e)}else if(3===i||4===i)return e.nodeValue}else for(;t=e[r];r++)n+=o(t);return n},i=ot.selectors={cacheLength:50,createPseudo:at,match:J,attrHandle:{},find:{},relative:{">":{dir:"parentNode",first:!0}," ":{dir:"parentNode"},"+":{dir:"previousSibling",first:!0},"~":{dir:"previousSibling"}},preFilter:{ATTR:function(e){return e[1]=e[1].replace(nt,rt),e[3]=(e[4]||e[5]||"").replace(nt,rt),"~="===e[2]&&(e[3]=" "+e[3]+" "),e.slice(0,4)},CHILD:function(e){return e[1]=e[1].toLowerCase(),"nth"===e[1].slice(0,3)?(e[3]||ot.error(e[0]),e[4]=+(e[4]?e[5]+(e[6]||1):2*("even"===e[3]||"odd"===e[3])),e[5]=+(e[7]+e[8]||"odd"===e[3])):e[3]&&ot.error(e[0]),e},PSEUDO:function(e){var t,n=!e[5]&&e[2];return J.CHILD.test(e[0])?null:(e[3]&&e[4]!==undefined?e[2]=e[4]:n&&V.test(n)&&(t=gt(n,!0))&&(t=n.indexOf(")",n.length-t)-n.length)&&(e[0]=e[0].slice(0,t),e[2]=n.slice(0,t)),e.slice(0,3))}},filter:{TAG:function(e){var t=e.replace(nt,rt).toLowerCase();return"*"===e?function(){return!0}:function(e){return e.nodeName&&e.nodeName.toLowerCase()===t}},CLASS:function(e){var t=C[e+" "];return t||(t=RegExp("(^|"+M+")"+e+"("+M+"|$)"))&&C(e,function(e){return t.test("string"==typeof e.className&&e.className||typeof e.getAttribute!==j&&e.getAttribute("class")||"")})},ATTR:function(e,t,n){return function(r){var i=ot.attr(r,e);return null==i?"!="===t:t?(i+="","="===t?i===n:"!="===t?i!==n:"^="===t?n&&0===i.indexOf(n):"*="===t?n&&i.indexOf(n)>-1:"$="===t?n&&i.slice(-n.length)===n:"~="===t?(" "+i+" ").indexOf(n)>-1:"|="===t?i===n||i.slice(0,n.length+1)===n+"-":!1):!0}},CHILD:function(e,t,n,r,i){var o="nth"!==e.slice(0,3),s="last"!==e.slice(-4),a="of-type"===t;return 1===r&&0===i?function(e){return!!e.parentNode}:function(t,n,u){var l,c,p,f,h,d,g=o!==s?"nextSibling":"previousSibling",m=t.parentNode,y=a&&t.nodeName.toLowerCase(),x=!u&&!a;if(m){if(o){while(g){p=t;while(p=p[g])if(a?p.nodeName.toLowerCase()===y:1===p.nodeType)return!1;d=g="only"===e&&!d&&"nextSibling"}return!0}if(d=[s?m.firstChild:m.lastChild],s&&x){c=m[v]||(m[v]={}),l=c[e]||[],h=l[0]===w&&l[1],f=l[0]===w&&l[2],p=h&&m.childNodes[h];while(p=++h&&p&&p[g]||(f=h=0)||d.pop())if(1===p.nodeType&&++f&&p===t){c[e]=[w,h,f];break}}else if(x&&(l=(t[v]||(t[v]={}))[e])&&l[0]===w)f=l[1];else while(p=++h&&p&&p[g]||(f=h=0)||d.pop())if((a?p.nodeName.toLowerCase()===y:1===p.nodeType)&&++f&&(x&&((p[v]||(p[v]={}))[e]=[w,f]),p===t))break;return f-=i,f===r||0===f%r&&f/r>=0}}},PSEUDO:function(e,t){var n,r=i.pseudos[e]||i.setFilters[e.toLowerCase()]||ot.error("unsupported pseudo: "+e);return r[v]?r(t):r.length>1?(n=[e,e,"",t],i.setFilters.hasOwnProperty(e.toLowerCase())?at(function(e,n){var i,o=r(e,t),s=o.length;while(s--)i=P.call(e,o[s]),e[i]=!(n[i]=o[s])}):function(e){return r(e,0,n)}):r}},pseudos:{not:at(function(e){var t=[],n=[],r=a(e.replace(z,"$1"));return r[v]?at(function(e,t,n,i){var o,s=r(e,null,i,[]),a=e.length;while(a--)(o=s[a])&&(e[a]=!(t[a]=o))}):function(e,i,o){return t[0]=e,r(t,null,o,n),!n.pop()}}),has:at(function(e){return function(t){return ot(e,t).length>0}}),contains:at(function(e){return function(t){return(t.textContent||t.innerText||o(t)).indexOf(e)>-1}}),lang:at(function(e){return G.test(e||"")||ot.error("unsupported lang: "+e),e=e.replace(nt,rt).toLowerCase(),function(t){var n;do if(n=h?t.lang:t.getAttribute("xml:lang")||t.getAttribute("lang"))return n=n.toLowerCase(),n===e||0===n.indexOf(e+"-");while((t=t.parentNode)&&1===t.nodeType);return!1}}),target:function(t){var n=e.location&&e.location.hash;return n&&n.slice(1)===t.id},root:function(e){return e===f},focus:function(e){return e===p.activeElement&&(!p.hasFocus||p.hasFocus())&&!!(e.type||e.href||~e.tabIndex)},enabled:function(e){return e.disabled===!1},disabled:function(e){return e.disabled===!0},checked:function(e){var t=e.nodeName.toLowerCase();return"input"===t&&!!e.checked||"option"===t&&!!e.selected},selected:function(e){return e.parentNode&&e.parentNode.selectedIndex,e.selected===!0},empty:function(e){for(e=e.firstChild;e;e=e.nextSibling)if(e.nodeName>"@"||3===e.nodeType||4===e.nodeType)return!1;return!0},parent:function(e){return!i.pseudos.empty(e)},header:function(e){return et.test(e.nodeName)},input:function(e){return Z.test(e.nodeName)},button:function(e){var t=e.nodeName.toLowerCase();return"input"===t&&"button"===e.type||"button"===t},text:function(e){var t;return"input"===e.nodeName.toLowerCase()&&"text"===e.type&&(null==(t=e.getAttribute("type"))||t.toLowerCase()===e.type)},first:ht(function(){return[0]}),last:ht(function(e,t){return[t-1]}),eq:ht(function(e,t,n){return[0>n?n+t:n]}),even:ht(function(e,t){var n=0;for(;t>n;n+=2)e.push(n);return e}),odd:ht(function(e,t){var n=1;for(;t>n;n+=2)e.push(n);return e}),lt:ht(function(e,t,n){var r=0>n?n+t:n;for(;--r>=0;)e.push(r);return e}),gt:ht(function(e,t,n){var r=0>n?n+t:n;for(;t>++r;)e.push(r);return e})}},i.pseudos.nth=i.pseudos.eq;for(t in{radio:!0,checkbox:!0,file:!0,password:!0,image:!0})i.pseudos[t]=pt(t);for(t in{submit:!0,reset:!0})i.pseudos[t]=ft(t);function dt(){}dt.prototype=i.filters=i.pseudos,i.setFilters=new dt;function gt(e,t){var n,r,o,s,a,u,l,c=k[e+" "];if(c)return t?0:c.slice(0);a=e,u=[],l=i.preFilter;while(a){(!n||(r=_.exec(a)))&&(r&&(a=a.slice(r[0].length)||a),u.push(o=[])),n=!1,(r=X.exec(a))&&(n=r.shift(),o.push({value:n,type:r[0].replace(z," ")}),a=a.slice(n.length));for(s in i.filter)!(r=J[s].exec(a))||l[s]&&!(r=l[s](r))||(n=r.shift(),o.push({value:n,type:s,matches:r}),a=a.slice(n.length));if(!n)break}return t?a.length:a?ot.error(e):k(e,u).slice(0)}function mt(e){var t=0,n=e.length,r="";for(;n>t;t++)r+=e[t].value;return r}function yt(e,t,n){var i=t.dir,o=n&&"parentNode"===i,s=T++;return t.first?function(t,n,r){while(t=t[i])if(1===t.nodeType||o)return e(t,n,r)}:function(t,n,a){var u,l,c,p=w+" "+s;if(a){while(t=t[i])if((1===t.nodeType||o)&&e(t,n,a))return!0}else while(t=t[i])if(1===t.nodeType||o)if(c=t[v]||(t[v]={}),(l=c[i])&&l[0]===p){if((u=l[1])===!0||u===r)return u===!0}else if(l=c[i]=[p],l[1]=e(t,n,a)||r,l[1]===!0)return!0}}function vt(e){return e.length>1?function(t,n,r){var i=e.length;while(i--)if(!e[i](t,n,r))return!1;return!0}:e[0]}function xt(e,t,n,r,i){var o,s=[],a=0,u=e.length,l=null!=t;for(;u>a;a++)(o=e[a])&&(!n||n(o,r,i))&&(s.push(o),l&&t.push(a));return s}function bt(e,t,n,r,i,o){return r&&!r[v]&&(r=bt(r)),i&&!i[v]&&(i=bt(i,o)),at(function(o,s,a,u){var l,c,p,f=[],h=[],d=s.length,g=o||Ct(t||"*",a.nodeType?[a]:a,[]),m=!e||!o&&t?g:xt(g,f,e,a,u),y=n?i||(o?e:d||r)?[]:s:m;if(n&&n(m,y,a,u),r){l=xt(y,h),r(l,[],a,u),c=l.length;while(c--)(p=l[c])&&(y[h[c]]=!(m[h[c]]=p))}if(o){if(i||e){if(i){l=[],c=y.length;while(c--)(p=y[c])&&l.push(m[c]=p);i(null,y=[],l,u)}c=y.length;while(c--)(p=y[c])&&(l=i?P.call(o,p):f[c])>-1&&(o[l]=!(s[l]=p))}}else y=xt(y===s?y.splice(d,y.length):y),i?i(null,s,y,u):O.apply(s,y)})}function wt(e){var t,n,r,o=e.length,s=i.relative[e[0].type],a=s||i.relative[" "],l=s?1:0,c=yt(function(e){return e===t},a,!0),p=yt(function(e){return P.call(t,e)>-1},a,!0),f=[function(e,n,r){return!s&&(r||n!==u)||((t=n).nodeType?c(e,n,r):p(e,n,r))}];for(;o>l;l++)if(n=i.relative[e[l].type])f=[yt(vt(f),n)];else{if(n=i.filter[e[l].type].apply(null,e[l].matches),n[v]){for(r=++l;o>r;r++)if(i.relative[e[r].type])break;return bt(l>1&&vt(f),l>1&&mt(e.slice(0,l-1).concat({value:" "===e[l-2].type?"*":""})).replace(z,"$1"),n,r>l&&wt(e.slice(l,r)),o>r&&wt(e=e.slice(r)),o>r&&mt(e))}f.push(n)}return vt(f)}function Tt(e,t){var n=0,o=t.length>0,s=e.length>0,a=function(a,l,c,f,h){var d,g,m,y=[],v=0,x="0",b=a&&[],T=null!=h,C=u,k=a||s&&i.find.TAG("*",h&&l.parentNode||l),N=w+=null==C?1:Math.random()||.1;for(T&&(u=l!==p&&l,r=n);null!=(d=k[x]);x++){if(s&&d){g=0;while(m=e[g++])if(m(d,l,c)){f.push(d);break}T&&(w=N,r=++n)}o&&((d=!m&&d)&&v--,a&&b.push(d))}if(v+=x,o&&x!==v){g=0;while(m=t[g++])m(b,y,l,c);if(a){if(v>0)while(x--)b[x]||y[x]||(y[x]=q.call(f));y=xt(y)}O.apply(f,y),T&&!a&&y.length>0&&v+t.length>1&&ot.uniqueSort(f)}return T&&(w=N,u=C),b};return o?at(a):a}a=ot.compile=function(e,t){var n,r=[],i=[],o=N[e+" "];if(!o){t||(t=gt(e)),n=t.length;while(n--)o=wt(t[n]),o[v]?r.push(o):i.push(o);o=N(e,Tt(i,r))}return o};function Ct(e,t,n){var r=0,i=t.length;for(;i>r;r++)ot(e,t[r],n);return n}function kt(e,t,r,o){var s,u,l,c,p,f=gt(e);if(!o&&1===f.length){if(u=f[0]=f[0].slice(0),u.length>2&&"ID"===(l=u[0]).type&&n.getById&&9===t.nodeType&&h&&i.relative[u[1].type]){if(t=(i.find.ID(l.matches[0].replace(nt,rt),t)||[])[0],!t)return r;e=e.slice(u.shift().value.length)}s=J.needsContext.test(e)?0:u.length;while(s--){if(l=u[s],i.relative[c=l.type])break;if((p=i.find[c])&&(o=p(l.matches[0].replace(nt,rt),U.test(u[0].type)&&t.parentNode||t))){if(u.splice(s,1),e=o.length&&mt(u),!e)return O.apply(r,o),r;break}}}return a(e,f)(o,t,!h,r,U.test(e)),r}n.sortStable=v.split("").sort(S).join("")===v,n.detectDuplicates=E,c(),n.sortDetached=ut(function(e){return 1&e.compareDocumentPosition(p.createElement("div"))}),ut(function(e){return e.innerHTML="<a href='#'></a>","#"===e.firstChild.getAttribute("href")})||lt("type|href|height|width",function(e,t,n){return n?undefined:e.getAttribute(t,"type"===t.toLowerCase()?1:2)}),n.attributes&&ut(function(e){return e.innerHTML="<input/>",e.firstChild.setAttribute("value",""),""===e.firstChild.getAttribute("value")})||lt("value",function(e,t,n){return n||"input"!==e.nodeName.toLowerCase()?undefined:e.defaultValue}),ut(function(e){return null==e.getAttribute("disabled")})||lt(R,function(e,t,n){var r;return n?undefined:(r=e.getAttributeNode(t))&&r.specified?r.value:e[t]===!0?t.toLowerCase():null}),x.find=ot,x.expr=ot.selectors,x.expr[":"]=x.expr.pseudos,x.unique=ot.uniqueSort,x.text=ot.getText,x.isXMLDoc=ot.isXML,x.contains=ot.contains}(e);var D={};function A(e){var t=D[e]={};return x.each(e.match(w)||[],function(e,n){t[n]=!0}),t}x.Callbacks=function(e){e="string"==typeof e?D[e]||A(e):x.extend({},e);var t,n,r,i,o,s,a=[],u=!e.once&&[],l=function(p){for(t=e.memory&&p,n=!0,s=i||0,i=0,o=a.length,r=!0;a&&o>s;s++)if(a[s].apply(p[0],p[1])===!1&&e.stopOnFalse){t=!1;break}r=!1,a&&(u?u.length&&l(u.shift()):t?a=[]:c.disable())},c={add:function(){if(a){var n=a.length;(function s(t){x.each(t,function(t,n){var r=x.type(n);"function"===r?e.unique&&c.has(n)||a.push(n):n&&n.length&&"string"!==r&&s(n)})})(arguments),r?o=a.length:t&&(i=n,l(t))}return this},remove:function(){return a&&x.each(arguments,function(e,t){var n;while((n=x.inArray(t,a,n))>-1)a.splice(n,1),r&&(o>=n&&o--,s>=n&&s--)}),this},has:function(e){return e?x.inArray(e,a)>-1:!(!a||!a.length)},empty:function(){return a=[],o=0,this},disable:function(){return a=u=t=undefined,this},disabled:function(){return!a},lock:function(){return u=undefined,t||c.disable(),this},locked:function(){return!u},fireWith:function(e,t){return!a||n&&!u||(t=t||[],t=[e,t.slice?t.slice():t],r?u.push(t):l(t)),this},fire:function(){return c.fireWith(this,arguments),this},fired:function(){return!!n}};return c},x.extend({Deferred:function(e){var t=[["resolve","done",x.Callbacks("once memory"),"resolved"],["reject","fail",x.Callbacks("once memory"),"rejected"],["notify","progress",x.Callbacks("memory")]],n="pending",r={state:function(){return n},always:function(){return i.done(arguments).fail(arguments),this},then:function(){var e=arguments;return x.Deferred(function(n){x.each(t,function(t,o){var s=o[0],a=x.isFunction(e[t])&&e[t];i[o[1]](function(){var e=a&&a.apply(this,arguments);e&&x.isFunction(e.promise)?e.promise().done(n.resolve).fail(n.reject).progress(n.notify):n[s+"With"](this===r?n.promise():this,a?[e]:arguments)})}),e=null}).promise()},promise:function(e){return null!=e?x.extend(e,r):r}},i={};return r.pipe=r.then,x.each(t,function(e,o){var s=o[2],a=o[3];r[o[1]]=s.add,a&&s.add(function(){n=a},t[1^e][2].disable,t[2][2].lock),i[o[0]]=function(){return i[o[0]+"With"](this===i?r:this,arguments),this},i[o[0]+"With"]=s.fireWith}),r.promise(i),e&&e.call(i,i),i},when:function(e){var t=0,n=d.call(arguments),r=n.length,i=1!==r||e&&x.isFunction(e.promise)?r:0,o=1===i?e:x.Deferred(),s=function(e,t,n){return function(r){t[e]=this,n[e]=arguments.length>1?d.call(arguments):r,n===a?o.notifyWith(t,n):--i||o.resolveWith(t,n)}},a,u,l;if(r>1)for(a=Array(r),u=Array(r),l=Array(r);r>t;t++)n[t]&&x.isFunction(n[t].promise)?n[t].promise().done(s(t,l,n)).fail(o.reject).progress(s(t,u,a)):--i;return i||o.resolveWith(l,n),o.promise()}}),x.support=function(t){var n=o.createElement("input"),r=o.createDocumentFragment(),i=o.createElement("div"),s=o.createElement("select"),a=s.appendChild(o.createElement("option"));return n.type?(n.type="checkbox",t.checkOn=""!==n.value,t.optSelected=a.selected,t.reliableMarginRight=!0,t.boxSizingReliable=!0,t.pixelPosition=!1,n.checked=!0,t.noCloneChecked=n.cloneNode(!0).checked,s.disabled=!0,t.optDisabled=!a.disabled,n=o.createElement("input"),n.value="t",n.type="radio",t.radioValue="t"===n.value,n.setAttribute("checked","t"),n.setAttribute("name","t"),r.appendChild(n),t.checkClone=r.cloneNode(!0).cloneNode(!0).lastChild.checked,t.focusinBubbles="onfocusin"in e,i.style.backgroundClip="content-box",i.cloneNode(!0).style.backgroundClip="",t.clearCloneStyle="content-box"===i.style.backgroundClip,x(function(){var n,r,s="padding:0;margin:0;border:0;display:block;-webkit-box-sizing:content-box;-moz-box-sizing:content-box;box-sizing:content-box",a=o.getElementsByTagName("body")[0];a&&(n=o.createElement("div"),n.style.cssText="border:0;width:0;height:0;position:absolute;top:0;left:-9999px;margin-top:1px",a.appendChild(n).appendChild(i),i.innerHTML="",i.style.cssText="-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;padding:1px;border:1px;display:block;width:4px;margin-top:1%;position:absolute;top:1%",x.swap(a,null!=a.style.zoom?{zoom:1}:{},function(){t.boxSizing=4===i.offsetWidth}),e.getComputedStyle&&(t.pixelPosition="1%"!==(e.getComputedStyle(i,null)||{}).top,t.boxSizingReliable="4px"===(e.getComputedStyle(i,null)||{width:"4px"}).width,r=i.appendChild(o.createElement("div")),r.style.cssText=i.style.cssText=s,r.style.marginRight=r.style.width="0",i.style.width="1px",t.reliableMarginRight=!parseFloat((e.getComputedStyle(r,null)||{}).marginRight)),a.removeChild(n))}),t):t}({});var L,q,H=/(?:\{[\s\S]*\}|\[[\s\S]*\])$/,O=/([A-Z])/g;function F(){Object.defineProperty(this.cache={},0,{get:function(){return{}}}),this.expando=x.expando+Math.random()}F.uid=1,F.accepts=function(e){return e.nodeType?1===e.nodeType||9===e.nodeType:!0},F.prototype={key:function(e){if(!F.accepts(e))return 0;var t={},n=e[this.expando];if(!n){n=F.uid++;try{t[this.expando]={value:n},Object.defineProperties(e,t)}catch(r){t[this.expando]=n,x.extend(e,t)}}return this.cache[n]||(this.cache[n]={}),n},set:function(e,t,n){var r,i=this.key(e),o=this.cache[i];if("string"==typeof t)o[t]=n;else if(x.isEmptyObject(o))x.extend(this.cache[i],t);else for(r in t)o[r]=t[r];return o},get:function(e,t){var n=this.cache[this.key(e)];return t===undefined?n:n[t]},access:function(e,t,n){var r;return t===undefined||t&&"string"==typeof t&&n===undefined?(r=this.get(e,t),r!==undefined?r:this.get(e,x.camelCase(t))):(this.set(e,t,n),n!==undefined?n:t)},remove:function(e,t){var n,r,i,o=this.key(e),s=this.cache[o];if(t===undefined)this.cache[o]={};else{x.isArray(t)?r=t.concat(t.map(x.camelCase)):(i=x.camelCase(t),t in s?r=[t,i]:(r=i,r=r in s?[r]:r.match(w)||[])),n=r.length;while(n--)delete s[r[n]]}},hasData:function(e){return!x.isEmptyObject(this.cache[e[this.expando]]||{})},discard:function(e){e[this.expando]&&delete this.cache[e[this.expando]]}},L=new F,q=new F,x.extend({acceptData:F.accepts,hasData:function(e){return L.hasData(e)||q.hasData(e)},data:function(e,t,n){return L.access(e,t,n)},removeData:function(e,t){L.remove(e,t)},_data:function(e,t,n){return q.access(e,t,n)},_removeData:function(e,t){q.remove(e,t)}}),x.fn.extend({data:function(e,t){var n,r,i=this[0],o=0,s=null;if(e===undefined){if(this.length&&(s=L.get(i),1===i.nodeType&&!q.get(i,"hasDataAttrs"))){for(n=i.attributes;n.length>o;o++)r=n[o].name,0===r.indexOf("data-")&&(r=x.camelCase(r.slice(5)),P(i,r,s[r]));q.set(i,"hasDataAttrs",!0)}return s}return"object"==typeof e?this.each(function(){L.set(this,e)}):x.access(this,function(t){var n,r=x.camelCase(e);if(i&&t===undefined){if(n=L.get(i,e),n!==undefined)return n;if(n=L.get(i,r),n!==undefined)return n;if(n=P(i,r,undefined),n!==undefined)return n}else this.each(function(){var n=L.get(this,r);L.set(this,r,t),-1!==e.indexOf("-")&&n!==undefined&&L.set(this,e,t)})},null,t,arguments.length>1,null,!0)},removeData:function(e){return this.each(function(){L.remove(this,e)})}});function P(e,t,n){var r;if(n===undefined&&1===e.nodeType)if(r="data-"+t.replace(O,"-$1").toLowerCase(),n=e.getAttribute(r),"string"==typeof n){try{n="true"===n?!0:"false"===n?!1:"null"===n?null:+n+""===n?+n:H.test(n)?JSON.parse(n):n}catch(i){}L.set(e,t,n)}else n=undefined;return n}x.extend({queue:function(e,t,n){var r;return e?(t=(t||"fx")+"queue",r=q.get(e,t),n&&(!r||x.isArray(n)?r=q.access(e,t,x.makeArray(n)):r.push(n)),r||[]):undefined},dequeue:function(e,t){t=t||"fx";var n=x.queue(e,t),r=n.length,i=n.shift(),o=x._queueHooks(e,t),s=function(){x.dequeue(e,t)
};"inprogress"===i&&(i=n.shift(),r--),i&&("fx"===t&&n.unshift("inprogress"),delete o.stop,i.call(e,s,o)),!r&&o&&o.empty.fire()},_queueHooks:function(e,t){var n=t+"queueHooks";return q.get(e,n)||q.access(e,n,{empty:x.Callbacks("once memory").add(function(){q.remove(e,[t+"queue",n])})})}}),x.fn.extend({queue:function(e,t){var n=2;return"string"!=typeof e&&(t=e,e="fx",n--),n>arguments.length?x.queue(this[0],e):t===undefined?this:this.each(function(){var n=x.queue(this,e,t);x._queueHooks(this,e),"fx"===e&&"inprogress"!==n[0]&&x.dequeue(this,e)})},dequeue:function(e){return this.each(function(){x.dequeue(this,e)})},delay:function(e,t){return e=x.fx?x.fx.speeds[e]||e:e,t=t||"fx",this.queue(t,function(t,n){var r=setTimeout(t,e);n.stop=function(){clearTimeout(r)}})},clearQueue:function(e){return this.queue(e||"fx",[])},promise:function(e,t){var n,r=1,i=x.Deferred(),o=this,s=this.length,a=function(){--r||i.resolveWith(o,[o])};"string"!=typeof e&&(t=e,e=undefined),e=e||"fx";while(s--)n=q.get(o[s],e+"queueHooks"),n&&n.empty&&(r++,n.empty.add(a));return a(),i.promise(t)}});var R,M,W=/[\t\r\n\f]/g,$=/\r/g,B=/^(?:input|select|textarea|button)$/i;x.fn.extend({attr:function(e,t){return x.access(this,x.attr,e,t,arguments.length>1)},removeAttr:function(e){return this.each(function(){x.removeAttr(this,e)})},prop:function(e,t){return x.access(this,x.prop,e,t,arguments.length>1)},removeProp:function(e){return this.each(function(){delete this[x.propFix[e]||e]})},addClass:function(e){var t,n,r,i,o,s=0,a=this.length,u="string"==typeof e&&e;if(x.isFunction(e))return this.each(function(t){x(this).addClass(e.call(this,t,this.className))});if(u)for(t=(e||"").match(w)||[];a>s;s++)if(n=this[s],r=1===n.nodeType&&(n.className?(" "+n.className+" ").replace(W," "):" ")){o=0;while(i=t[o++])0>r.indexOf(" "+i+" ")&&(r+=i+" ");n.className=x.trim(r)}return this},removeClass:function(e){var t,n,r,i,o,s=0,a=this.length,u=0===arguments.length||"string"==typeof e&&e;if(x.isFunction(e))return this.each(function(t){x(this).removeClass(e.call(this,t,this.className))});if(u)for(t=(e||"").match(w)||[];a>s;s++)if(n=this[s],r=1===n.nodeType&&(n.className?(" "+n.className+" ").replace(W," "):"")){o=0;while(i=t[o++])while(r.indexOf(" "+i+" ")>=0)r=r.replace(" "+i+" "," ");n.className=e?x.trim(r):""}return this},toggleClass:function(e,t){var n=typeof e;return"boolean"==typeof t&&"string"===n?t?this.addClass(e):this.removeClass(e):x.isFunction(e)?this.each(function(n){x(this).toggleClass(e.call(this,n,this.className,t),t)}):this.each(function(){if("string"===n){var t,i=0,o=x(this),s=e.match(w)||[];while(t=s[i++])o.hasClass(t)?o.removeClass(t):o.addClass(t)}else(n===r||"boolean"===n)&&(this.className&&q.set(this,"__className__",this.className),this.className=this.className||e===!1?"":q.get(this,"__className__")||"")})},hasClass:function(e){var t=" "+e+" ",n=0,r=this.length;for(;r>n;n++)if(1===this[n].nodeType&&(" "+this[n].className+" ").replace(W," ").indexOf(t)>=0)return!0;return!1},val:function(e){var t,n,r,i=this[0];{if(arguments.length)return r=x.isFunction(e),this.each(function(n){var i;1===this.nodeType&&(i=r?e.call(this,n,x(this).val()):e,null==i?i="":"number"==typeof i?i+="":x.isArray(i)&&(i=x.map(i,function(e){return null==e?"":e+""})),t=x.valHooks[this.type]||x.valHooks[this.nodeName.toLowerCase()],t&&"set"in t&&t.set(this,i,"value")!==undefined||(this.value=i))});if(i)return t=x.valHooks[i.type]||x.valHooks[i.nodeName.toLowerCase()],t&&"get"in t&&(n=t.get(i,"value"))!==undefined?n:(n=i.value,"string"==typeof n?n.replace($,""):null==n?"":n)}}}),x.extend({valHooks:{option:{get:function(e){var t=e.attributes.value;return!t||t.specified?e.value:e.text}},select:{get:function(e){var t,n,r=e.options,i=e.selectedIndex,o="select-one"===e.type||0>i,s=o?null:[],a=o?i+1:r.length,u=0>i?a:o?i:0;for(;a>u;u++)if(n=r[u],!(!n.selected&&u!==i||(x.support.optDisabled?n.disabled:null!==n.getAttribute("disabled"))||n.parentNode.disabled&&x.nodeName(n.parentNode,"optgroup"))){if(t=x(n).val(),o)return t;s.push(t)}return s},set:function(e,t){var n,r,i=e.options,o=x.makeArray(t),s=i.length;while(s--)r=i[s],(r.selected=x.inArray(x(r).val(),o)>=0)&&(n=!0);return n||(e.selectedIndex=-1),o}}},attr:function(e,t,n){var i,o,s=e.nodeType;if(e&&3!==s&&8!==s&&2!==s)return typeof e.getAttribute===r?x.prop(e,t,n):(1===s&&x.isXMLDoc(e)||(t=t.toLowerCase(),i=x.attrHooks[t]||(x.expr.match.bool.test(t)?M:R)),n===undefined?i&&"get"in i&&null!==(o=i.get(e,t))?o:(o=x.find.attr(e,t),null==o?undefined:o):null!==n?i&&"set"in i&&(o=i.set(e,n,t))!==undefined?o:(e.setAttribute(t,n+""),n):(x.removeAttr(e,t),undefined))},removeAttr:function(e,t){var n,r,i=0,o=t&&t.match(w);if(o&&1===e.nodeType)while(n=o[i++])r=x.propFix[n]||n,x.expr.match.bool.test(n)&&(e[r]=!1),e.removeAttribute(n)},attrHooks:{type:{set:function(e,t){if(!x.support.radioValue&&"radio"===t&&x.nodeName(e,"input")){var n=e.value;return e.setAttribute("type",t),n&&(e.value=n),t}}}},propFix:{"for":"htmlFor","class":"className"},prop:function(e,t,n){var r,i,o,s=e.nodeType;if(e&&3!==s&&8!==s&&2!==s)return o=1!==s||!x.isXMLDoc(e),o&&(t=x.propFix[t]||t,i=x.propHooks[t]),n!==undefined?i&&"set"in i&&(r=i.set(e,n,t))!==undefined?r:e[t]=n:i&&"get"in i&&null!==(r=i.get(e,t))?r:e[t]},propHooks:{tabIndex:{get:function(e){return e.hasAttribute("tabindex")||B.test(e.nodeName)||e.href?e.tabIndex:-1}}}}),M={set:function(e,t,n){return t===!1?x.removeAttr(e,n):e.setAttribute(n,n),n}},x.each(x.expr.match.bool.source.match(/\w+/g),function(e,t){var n=x.expr.attrHandle[t]||x.find.attr;x.expr.attrHandle[t]=function(e,t,r){var i=x.expr.attrHandle[t],o=r?undefined:(x.expr.attrHandle[t]=undefined)!=n(e,t,r)?t.toLowerCase():null;return x.expr.attrHandle[t]=i,o}}),x.support.optSelected||(x.propHooks.selected={get:function(e){var t=e.parentNode;return t&&t.parentNode&&t.parentNode.selectedIndex,null}}),x.each(["tabIndex","readOnly","maxLength","cellSpacing","cellPadding","rowSpan","colSpan","useMap","frameBorder","contentEditable"],function(){x.propFix[this.toLowerCase()]=this}),x.each(["radio","checkbox"],function(){x.valHooks[this]={set:function(e,t){return x.isArray(t)?e.checked=x.inArray(x(e).val(),t)>=0:undefined}},x.support.checkOn||(x.valHooks[this].get=function(e){return null===e.getAttribute("value")?"on":e.value})});var I=/^key/,z=/^(?:mouse|contextmenu)|click/,_=/^(?:focusinfocus|focusoutblur)$/,X=/^([^.]*)(?:\.(.+)|)$/;function U(){return!0}function Y(){return!1}function V(){try{return o.activeElement}catch(e){}}x.event={global:{},add:function(e,t,n,i,o){var s,a,u,l,c,p,f,h,d,g,m,y=q.get(e);if(y){n.handler&&(s=n,n=s.handler,o=s.selector),n.guid||(n.guid=x.guid++),(l=y.events)||(l=y.events={}),(a=y.handle)||(a=y.handle=function(e){return typeof x===r||e&&x.event.triggered===e.type?undefined:x.event.dispatch.apply(a.elem,arguments)},a.elem=e),t=(t||"").match(w)||[""],c=t.length;while(c--)u=X.exec(t[c])||[],d=m=u[1],g=(u[2]||"").split(".").sort(),d&&(f=x.event.special[d]||{},d=(o?f.delegateType:f.bindType)||d,f=x.event.special[d]||{},p=x.extend({type:d,origType:m,data:i,handler:n,guid:n.guid,selector:o,needsContext:o&&x.expr.match.needsContext.test(o),namespace:g.join(".")},s),(h=l[d])||(h=l[d]=[],h.delegateCount=0,f.setup&&f.setup.call(e,i,g,a)!==!1||e.addEventListener&&e.addEventListener(d,a,!1)),f.add&&(f.add.call(e,p),p.handler.guid||(p.handler.guid=n.guid)),o?h.splice(h.delegateCount++,0,p):h.push(p),x.event.global[d]=!0);e=null}},remove:function(e,t,n,r,i){var o,s,a,u,l,c,p,f,h,d,g,m=q.hasData(e)&&q.get(e);if(m&&(u=m.events)){t=(t||"").match(w)||[""],l=t.length;while(l--)if(a=X.exec(t[l])||[],h=g=a[1],d=(a[2]||"").split(".").sort(),h){p=x.event.special[h]||{},h=(r?p.delegateType:p.bindType)||h,f=u[h]||[],a=a[2]&&RegExp("(^|\\.)"+d.join("\\.(?:.*\\.|)")+"(\\.|$)"),s=o=f.length;while(o--)c=f[o],!i&&g!==c.origType||n&&n.guid!==c.guid||a&&!a.test(c.namespace)||r&&r!==c.selector&&("**"!==r||!c.selector)||(f.splice(o,1),c.selector&&f.delegateCount--,p.remove&&p.remove.call(e,c));s&&!f.length&&(p.teardown&&p.teardown.call(e,d,m.handle)!==!1||x.removeEvent(e,h,m.handle),delete u[h])}else for(h in u)x.event.remove(e,h+t[l],n,r,!0);x.isEmptyObject(u)&&(delete m.handle,q.remove(e,"events"))}},trigger:function(t,n,r,i){var s,a,u,l,c,p,f,h=[r||o],d=y.call(t,"type")?t.type:t,g=y.call(t,"namespace")?t.namespace.split("."):[];if(a=u=r=r||o,3!==r.nodeType&&8!==r.nodeType&&!_.test(d+x.event.triggered)&&(d.indexOf(".")>=0&&(g=d.split("."),d=g.shift(),g.sort()),c=0>d.indexOf(":")&&"on"+d,t=t[x.expando]?t:new x.Event(d,"object"==typeof t&&t),t.isTrigger=i?2:3,t.namespace=g.join("."),t.namespace_re=t.namespace?RegExp("(^|\\.)"+g.join("\\.(?:.*\\.|)")+"(\\.|$)"):null,t.result=undefined,t.target||(t.target=r),n=null==n?[t]:x.makeArray(n,[t]),f=x.event.special[d]||{},i||!f.trigger||f.trigger.apply(r,n)!==!1)){if(!i&&!f.noBubble&&!x.isWindow(r)){for(l=f.delegateType||d,_.test(l+d)||(a=a.parentNode);a;a=a.parentNode)h.push(a),u=a;u===(r.ownerDocument||o)&&h.push(u.defaultView||u.parentWindow||e)}s=0;while((a=h[s++])&&!t.isPropagationStopped())t.type=s>1?l:f.bindType||d,p=(q.get(a,"events")||{})[t.type]&&q.get(a,"handle"),p&&p.apply(a,n),p=c&&a[c],p&&x.acceptData(a)&&p.apply&&p.apply(a,n)===!1&&t.preventDefault();return t.type=d,i||t.isDefaultPrevented()||f._default&&f._default.apply(h.pop(),n)!==!1||!x.acceptData(r)||c&&x.isFunction(r[d])&&!x.isWindow(r)&&(u=r[c],u&&(r[c]=null),x.event.triggered=d,r[d](),x.event.triggered=undefined,u&&(r[c]=u)),t.result}},dispatch:function(e){e=x.event.fix(e);var t,n,r,i,o,s=[],a=d.call(arguments),u=(q.get(this,"events")||{})[e.type]||[],l=x.event.special[e.type]||{};if(a[0]=e,e.delegateTarget=this,!l.preDispatch||l.preDispatch.call(this,e)!==!1){s=x.event.handlers.call(this,e,u),t=0;while((i=s[t++])&&!e.isPropagationStopped()){e.currentTarget=i.elem,n=0;while((o=i.handlers[n++])&&!e.isImmediatePropagationStopped())(!e.namespace_re||e.namespace_re.test(o.namespace))&&(e.handleObj=o,e.data=o.data,r=((x.event.special[o.origType]||{}).handle||o.handler).apply(i.elem,a),r!==undefined&&(e.result=r)===!1&&(e.preventDefault(),e.stopPropagation()))}return l.postDispatch&&l.postDispatch.call(this,e),e.result}},handlers:function(e,t){var n,r,i,o,s=[],a=t.delegateCount,u=e.target;if(a&&u.nodeType&&(!e.button||"click"!==e.type))for(;u!==this;u=u.parentNode||this)if(u.disabled!==!0||"click"!==e.type){for(r=[],n=0;a>n;n++)o=t[n],i=o.selector+" ",r[i]===undefined&&(r[i]=o.needsContext?x(i,this).index(u)>=0:x.find(i,this,null,[u]).length),r[i]&&r.push(o);r.length&&s.push({elem:u,handlers:r})}return t.length>a&&s.push({elem:this,handlers:t.slice(a)}),s},props:"altKey bubbles cancelable ctrlKey currentTarget eventPhase metaKey relatedTarget shiftKey target timeStamp view which".split(" "),fixHooks:{},keyHooks:{props:"char charCode key keyCode".split(" "),filter:function(e,t){return null==e.which&&(e.which=null!=t.charCode?t.charCode:t.keyCode),e}},mouseHooks:{props:"button buttons clientX clientY offsetX offsetY pageX pageY screenX screenY toElement".split(" "),filter:function(e,t){var n,r,i,s=t.button;return null==e.pageX&&null!=t.clientX&&(n=e.target.ownerDocument||o,r=n.documentElement,i=n.body,e.pageX=t.clientX+(r&&r.scrollLeft||i&&i.scrollLeft||0)-(r&&r.clientLeft||i&&i.clientLeft||0),e.pageY=t.clientY+(r&&r.scrollTop||i&&i.scrollTop||0)-(r&&r.clientTop||i&&i.clientTop||0)),e.which||s===undefined||(e.which=1&s?1:2&s?3:4&s?2:0),e}},fix:function(e){if(e[x.expando])return e;var t,n,r,i=e.type,s=e,a=this.fixHooks[i];a||(this.fixHooks[i]=a=z.test(i)?this.mouseHooks:I.test(i)?this.keyHooks:{}),r=a.props?this.props.concat(a.props):this.props,e=new x.Event(s),t=r.length;while(t--)n=r[t],e[n]=s[n];return e.target||(e.target=o),3===e.target.nodeType&&(e.target=e.target.parentNode),a.filter?a.filter(e,s):e},special:{load:{noBubble:!0},focus:{trigger:function(){return this!==V()&&this.focus?(this.focus(),!1):undefined},delegateType:"focusin"},blur:{trigger:function(){return this===V()&&this.blur?(this.blur(),!1):undefined},delegateType:"focusout"},click:{trigger:function(){return"checkbox"===this.type&&this.click&&x.nodeName(this,"input")?(this.click(),!1):undefined},_default:function(e){return x.nodeName(e.target,"a")}},beforeunload:{postDispatch:function(e){e.result!==undefined&&(e.originalEvent.returnValue=e.result)}}},simulate:function(e,t,n,r){var i=x.extend(new x.Event,n,{type:e,isSimulated:!0,originalEvent:{}});r?x.event.trigger(i,null,t):x.event.dispatch.call(t,i),i.isDefaultPrevented()&&n.preventDefault()}},x.removeEvent=function(e,t,n){e.removeEventListener&&e.removeEventListener(t,n,!1)},x.Event=function(e,t){return this instanceof x.Event?(e&&e.type?(this.originalEvent=e,this.type=e.type,this.isDefaultPrevented=e.defaultPrevented||e.getPreventDefault&&e.getPreventDefault()?U:Y):this.type=e,t&&x.extend(this,t),this.timeStamp=e&&e.timeStamp||x.now(),this[x.expando]=!0,undefined):new x.Event(e,t)},x.Event.prototype={isDefaultPrevented:Y,isPropagationStopped:Y,isImmediatePropagationStopped:Y,preventDefault:function(){var e=this.originalEvent;this.isDefaultPrevented=U,e&&e.preventDefault&&e.preventDefault()},stopPropagation:function(){var e=this.originalEvent;this.isPropagationStopped=U,e&&e.stopPropagation&&e.stopPropagation()},stopImmediatePropagation:function(){this.isImmediatePropagationStopped=U,this.stopPropagation()}},x.each({mouseenter:"mouseover",mouseleave:"mouseout"},function(e,t){x.event.special[e]={delegateType:t,bindType:t,handle:function(e){var n,r=this,i=e.relatedTarget,o=e.handleObj;return(!i||i!==r&&!x.contains(r,i))&&(e.type=o.origType,n=o.handler.apply(this,arguments),e.type=t),n}}}),x.support.focusinBubbles||x.each({focus:"focusin",blur:"focusout"},function(e,t){var n=0,r=function(e){x.event.simulate(t,e.target,x.event.fix(e),!0)};x.event.special[t]={setup:function(){0===n++&&o.addEventListener(e,r,!0)},teardown:function(){0===--n&&o.removeEventListener(e,r,!0)}}}),x.fn.extend({on:function(e,t,n,r,i){var o,s;if("object"==typeof e){"string"!=typeof t&&(n=n||t,t=undefined);for(s in e)this.on(s,t,n,e[s],i);return this}if(null==n&&null==r?(r=t,n=t=undefined):null==r&&("string"==typeof t?(r=n,n=undefined):(r=n,n=t,t=undefined)),r===!1)r=Y;else if(!r)return this;return 1===i&&(o=r,r=function(e){return x().off(e),o.apply(this,arguments)},r.guid=o.guid||(o.guid=x.guid++)),this.each(function(){x.event.add(this,e,r,n,t)})},one:function(e,t,n,r){return this.on(e,t,n,r,1)},off:function(e,t,n){var r,i;if(e&&e.preventDefault&&e.handleObj)return r=e.handleObj,x(e.delegateTarget).off(r.namespace?r.origType+"."+r.namespace:r.origType,r.selector,r.handler),this;if("object"==typeof e){for(i in e)this.off(i,t,e[i]);return this}return(t===!1||"function"==typeof t)&&(n=t,t=undefined),n===!1&&(n=Y),this.each(function(){x.event.remove(this,e,n,t)})},trigger:function(e,t){return this.each(function(){x.event.trigger(e,t,this)})},triggerHandler:function(e,t){var n=this[0];return n?x.event.trigger(e,t,n,!0):undefined}});var G=/^.[^:#\[\.,]*$/,J=/^(?:parents|prev(?:Until|All))/,Q=x.expr.match.needsContext,K={children:!0,contents:!0,next:!0,prev:!0};x.fn.extend({find:function(e){var t,n=[],r=this,i=r.length;if("string"!=typeof e)return this.pushStack(x(e).filter(function(){for(t=0;i>t;t++)if(x.contains(r[t],this))return!0}));for(t=0;i>t;t++)x.find(e,r[t],n);return n=this.pushStack(i>1?x.unique(n):n),n.selector=this.selector?this.selector+" "+e:e,n},has:function(e){var t=x(e,this),n=t.length;return this.filter(function(){var e=0;for(;n>e;e++)if(x.contains(this,t[e]))return!0})},not:function(e){return this.pushStack(et(this,e||[],!0))},filter:function(e){return this.pushStack(et(this,e||[],!1))},is:function(e){return!!et(this,"string"==typeof e&&Q.test(e)?x(e):e||[],!1).length},closest:function(e,t){var n,r=0,i=this.length,o=[],s=Q.test(e)||"string"!=typeof e?x(e,t||this.context):0;for(;i>r;r++)for(n=this[r];n&&n!==t;n=n.parentNode)if(11>n.nodeType&&(s?s.index(n)>-1:1===n.nodeType&&x.find.matchesSelector(n,e))){n=o.push(n);break}return this.pushStack(o.length>1?x.unique(o):o)},index:function(e){return e?"string"==typeof e?g.call(x(e),this[0]):g.call(this,e.jquery?e[0]:e):this[0]&&this[0].parentNode?this.first().prevAll().length:-1},add:function(e,t){var n="string"==typeof e?x(e,t):x.makeArray(e&&e.nodeType?[e]:e),r=x.merge(this.get(),n);return this.pushStack(x.unique(r))},addBack:function(e){return this.add(null==e?this.prevObject:this.prevObject.filter(e))}});function Z(e,t){while((e=e[t])&&1!==e.nodeType);return e}x.each({parent:function(e){var t=e.parentNode;return t&&11!==t.nodeType?t:null},parents:function(e){return x.dir(e,"parentNode")},parentsUntil:function(e,t,n){return x.dir(e,"parentNode",n)},next:function(e){return Z(e,"nextSibling")},prev:function(e){return Z(e,"previousSibling")},nextAll:function(e){return x.dir(e,"nextSibling")},prevAll:function(e){return x.dir(e,"previousSibling")},nextUntil:function(e,t,n){return x.dir(e,"nextSibling",n)},prevUntil:function(e,t,n){return x.dir(e,"previousSibling",n)},siblings:function(e){return x.sibling((e.parentNode||{}).firstChild,e)},children:function(e){return x.sibling(e.firstChild)},contents:function(e){return e.contentDocument||x.merge([],e.childNodes)}},function(e,t){x.fn[e]=function(n,r){var i=x.map(this,t,n);return"Until"!==e.slice(-5)&&(r=n),r&&"string"==typeof r&&(i=x.filter(r,i)),this.length>1&&(K[e]||x.unique(i),J.test(e)&&i.reverse()),this.pushStack(i)}}),x.extend({filter:function(e,t,n){var r=t[0];return n&&(e=":not("+e+")"),1===t.length&&1===r.nodeType?x.find.matchesSelector(r,e)?[r]:[]:x.find.matches(e,x.grep(t,function(e){return 1===e.nodeType}))},dir:function(e,t,n){var r=[],i=n!==undefined;while((e=e[t])&&9!==e.nodeType)if(1===e.nodeType){if(i&&x(e).is(n))break;r.push(e)}return r},sibling:function(e,t){var n=[];for(;e;e=e.nextSibling)1===e.nodeType&&e!==t&&n.push(e);return n}});function et(e,t,n){if(x.isFunction(t))return x.grep(e,function(e,r){return!!t.call(e,r,e)!==n});if(t.nodeType)return x.grep(e,function(e){return e===t!==n});if("string"==typeof t){if(G.test(t))return x.filter(t,e,n);t=x.filter(t,e)}return x.grep(e,function(e){return g.call(t,e)>=0!==n})}var tt=/<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w:]+)[^>]*)\/>/gi,nt=/<([\w:]+)/,rt=/<|&#?\w+;/,it=/<(?:script|style|link)/i,ot=/^(?:checkbox|radio)$/i,st=/checked\s*(?:[^=]|=\s*.checked.)/i,at=/^$|\/(?:java|ecma)script/i,ut=/^true\/(.*)/,lt=/^\s*<!(?:\[CDATA\[|--)|(?:\]\]|--)>\s*$/g,ct={option:[1,"<select multiple='multiple'>","</select>"],thead:[1,"<table>","</table>"],col:[2,"<table><colgroup>","</colgroup></table>"],tr:[2,"<table><tbody>","</tbody></table>"],td:[3,"<table><tbody><tr>","</tr></tbody></table>"],_default:[0,"",""]};ct.optgroup=ct.option,ct.tbody=ct.tfoot=ct.colgroup=ct.caption=ct.thead,ct.th=ct.td,x.fn.extend({text:function(e){return x.access(this,function(e){return e===undefined?x.text(this):this.empty().append((this[0]&&this[0].ownerDocument||o).createTextNode(e))},null,e,arguments.length)},append:function(){return this.domManip(arguments,function(e){if(1===this.nodeType||11===this.nodeType||9===this.nodeType){var t=pt(this,e);t.appendChild(e)}})},prepend:function(){return this.domManip(arguments,function(e){if(1===this.nodeType||11===this.nodeType||9===this.nodeType){var t=pt(this,e);t.insertBefore(e,t.firstChild)}})},before:function(){return this.domManip(arguments,function(e){this.parentNode&&this.parentNode.insertBefore(e,this)})},after:function(){return this.domManip(arguments,function(e){this.parentNode&&this.parentNode.insertBefore(e,this.nextSibling)})},remove:function(e,t){var n,r=e?x.filter(e,this):this,i=0;for(;null!=(n=r[i]);i++)t||1!==n.nodeType||x.cleanData(mt(n)),n.parentNode&&(t&&x.contains(n.ownerDocument,n)&&dt(mt(n,"script")),n.parentNode.removeChild(n));return this},empty:function(){var e,t=0;for(;null!=(e=this[t]);t++)1===e.nodeType&&(x.cleanData(mt(e,!1)),e.textContent="");return this},clone:function(e,t){return e=null==e?!1:e,t=null==t?e:t,this.map(function(){return x.clone(this,e,t)})},html:function(e){return x.access(this,function(e){var t=this[0]||{},n=0,r=this.length;if(e===undefined&&1===t.nodeType)return t.innerHTML;if("string"==typeof e&&!it.test(e)&&!ct[(nt.exec(e)||["",""])[1].toLowerCase()]){e=e.replace(tt,"<$1></$2>");try{for(;r>n;n++)t=this[n]||{},1===t.nodeType&&(x.cleanData(mt(t,!1)),t.innerHTML=e);t=0}catch(i){}}t&&this.empty().append(e)},null,e,arguments.length)},replaceWith:function(){var e=x.map(this,function(e){return[e.nextSibling,e.parentNode]}),t=0;return this.domManip(arguments,function(n){var r=e[t++],i=e[t++];i&&(r&&r.parentNode!==i&&(r=this.nextSibling),x(this).remove(),i.insertBefore(n,r))},!0),t?this:this.remove()},detach:function(e){return this.remove(e,!0)},domManip:function(e,t,n){e=f.apply([],e);var r,i,o,s,a,u,l=0,c=this.length,p=this,h=c-1,d=e[0],g=x.isFunction(d);if(g||!(1>=c||"string"!=typeof d||x.support.checkClone)&&st.test(d))return this.each(function(r){var i=p.eq(r);g&&(e[0]=d.call(this,r,i.html())),i.domManip(e,t,n)});if(c&&(r=x.buildFragment(e,this[0].ownerDocument,!1,!n&&this),i=r.firstChild,1===r.childNodes.length&&(r=i),i)){for(o=x.map(mt(r,"script"),ft),s=o.length;c>l;l++)a=r,l!==h&&(a=x.clone(a,!0,!0),s&&x.merge(o,mt(a,"script"))),t.call(this[l],a,l);if(s)for(u=o[o.length-1].ownerDocument,x.map(o,ht),l=0;s>l;l++)a=o[l],at.test(a.type||"")&&!q.access(a,"globalEval")&&x.contains(u,a)&&(a.src?x._evalUrl(a.src):x.globalEval(a.textContent.replace(lt,"")))}return this}}),x.each({appendTo:"append",prependTo:"prepend",insertBefore:"before",insertAfter:"after",replaceAll:"replaceWith"},function(e,t){x.fn[e]=function(e){var n,r=[],i=x(e),o=i.length-1,s=0;for(;o>=s;s++)n=s===o?this:this.clone(!0),x(i[s])[t](n),h.apply(r,n.get());return this.pushStack(r)}}),x.extend({clone:function(e,t,n){var r,i,o,s,a=e.cloneNode(!0),u=x.contains(e.ownerDocument,e);if(!(x.support.noCloneChecked||1!==e.nodeType&&11!==e.nodeType||x.isXMLDoc(e)))for(s=mt(a),o=mt(e),r=0,i=o.length;i>r;r++)yt(o[r],s[r]);if(t)if(n)for(o=o||mt(e),s=s||mt(a),r=0,i=o.length;i>r;r++)gt(o[r],s[r]);else gt(e,a);return s=mt(a,"script"),s.length>0&&dt(s,!u&&mt(e,"script")),a},buildFragment:function(e,t,n,r){var i,o,s,a,u,l,c=0,p=e.length,f=t.createDocumentFragment(),h=[];for(;p>c;c++)if(i=e[c],i||0===i)if("object"===x.type(i))x.merge(h,i.nodeType?[i]:i);else if(rt.test(i)){o=o||f.appendChild(t.createElement("div")),s=(nt.exec(i)||["",""])[1].toLowerCase(),a=ct[s]||ct._default,o.innerHTML=a[1]+i.replace(tt,"<$1></$2>")+a[2],l=a[0];while(l--)o=o.lastChild;x.merge(h,o.childNodes),o=f.firstChild,o.textContent=""}else h.push(t.createTextNode(i));f.textContent="",c=0;while(i=h[c++])if((!r||-1===x.inArray(i,r))&&(u=x.contains(i.ownerDocument,i),o=mt(f.appendChild(i),"script"),u&&dt(o),n)){l=0;while(i=o[l++])at.test(i.type||"")&&n.push(i)}return f},cleanData:function(e){var t,n,r,i,o,s,a=x.event.special,u=0;for(;(n=e[u])!==undefined;u++){if(F.accepts(n)&&(o=n[q.expando],o&&(t=q.cache[o]))){if(r=Object.keys(t.events||{}),r.length)for(s=0;(i=r[s])!==undefined;s++)a[i]?x.event.remove(n,i):x.removeEvent(n,i,t.handle);q.cache[o]&&delete q.cache[o]}delete L.cache[n[L.expando]]}},_evalUrl:function(e){return x.ajax({url:e,type:"GET",dataType:"script",async:!1,global:!1,"throws":!0})}});function pt(e,t){return x.nodeName(e,"table")&&x.nodeName(1===t.nodeType?t:t.firstChild,"tr")?e.getElementsByTagName("tbody")[0]||e.appendChild(e.ownerDocument.createElement("tbody")):e}function ft(e){return e.type=(null!==e.getAttribute("type"))+"/"+e.type,e}function ht(e){var t=ut.exec(e.type);return t?e.type=t[1]:e.removeAttribute("type"),e}function dt(e,t){var n=e.length,r=0;for(;n>r;r++)q.set(e[r],"globalEval",!t||q.get(t[r],"globalEval"))}function gt(e,t){var n,r,i,o,s,a,u,l;if(1===t.nodeType){if(q.hasData(e)&&(o=q.access(e),s=q.set(t,o),l=o.events)){delete s.handle,s.events={};for(i in l)for(n=0,r=l[i].length;r>n;n++)x.event.add(t,i,l[i][n])}L.hasData(e)&&(a=L.access(e),u=x.extend({},a),L.set(t,u))}}function mt(e,t){var n=e.getElementsByTagName?e.getElementsByTagName(t||"*"):e.querySelectorAll?e.querySelectorAll(t||"*"):[];return t===undefined||t&&x.nodeName(e,t)?x.merge([e],n):n}function yt(e,t){var n=t.nodeName.toLowerCase();"input"===n&&ot.test(e.type)?t.checked=e.checked:("input"===n||"textarea"===n)&&(t.defaultValue=e.defaultValue)}x.fn.extend({wrapAll:function(e){var t;return x.isFunction(e)?this.each(function(t){x(this).wrapAll(e.call(this,t))}):(this[0]&&(t=x(e,this[0].ownerDocument).eq(0).clone(!0),this[0].parentNode&&t.insertBefore(this[0]),t.map(function(){var e=this;while(e.firstElementChild)e=e.firstElementChild;return e}).append(this)),this)},wrapInner:function(e){return x.isFunction(e)?this.each(function(t){x(this).wrapInner(e.call(this,t))}):this.each(function(){var t=x(this),n=t.contents();n.length?n.wrapAll(e):t.append(e)})},wrap:function(e){var t=x.isFunction(e);return this.each(function(n){x(this).wrapAll(t?e.call(this,n):e)})},unwrap:function(){return this.parent().each(function(){x.nodeName(this,"body")||x(this).replaceWith(this.childNodes)}).end()}});var vt,xt,bt=/^(none|table(?!-c[ea]).+)/,wt=/^margin/,Tt=RegExp("^("+b+")(.*)$","i"),Ct=RegExp("^("+b+")(?!px)[a-z%]+$","i"),kt=RegExp("^([+-])=("+b+")","i"),Nt={BODY:"block"},Et={position:"absolute",visibility:"hidden",display:"block"},St={letterSpacing:0,fontWeight:400},jt=["Top","Right","Bottom","Left"],Dt=["Webkit","O","Moz","ms"];function At(e,t){if(t in e)return t;var n=t.charAt(0).toUpperCase()+t.slice(1),r=t,i=Dt.length;while(i--)if(t=Dt[i]+n,t in e)return t;return r}function Lt(e,t){return e=t||e,"none"===x.css(e,"display")||!x.contains(e.ownerDocument,e)}function qt(t){return e.getComputedStyle(t,null)}function Ht(e,t){var n,r,i,o=[],s=0,a=e.length;for(;a>s;s++)r=e[s],r.style&&(o[s]=q.get(r,"olddisplay"),n=r.style.display,t?(o[s]||"none"!==n||(r.style.display=""),""===r.style.display&&Lt(r)&&(o[s]=q.access(r,"olddisplay",Rt(r.nodeName)))):o[s]||(i=Lt(r),(n&&"none"!==n||!i)&&q.set(r,"olddisplay",i?n:x.css(r,"display"))));for(s=0;a>s;s++)r=e[s],r.style&&(t&&"none"!==r.style.display&&""!==r.style.display||(r.style.display=t?o[s]||"":"none"));return e}x.fn.extend({css:function(e,t){return x.access(this,function(e,t,n){var r,i,o={},s=0;if(x.isArray(t)){for(r=qt(e),i=t.length;i>s;s++)o[t[s]]=x.css(e,t[s],!1,r);return o}return n!==undefined?x.style(e,t,n):x.css(e,t)},e,t,arguments.length>1)},show:function(){return Ht(this,!0)},hide:function(){return Ht(this)},toggle:function(e){return"boolean"==typeof e?e?this.show():this.hide():this.each(function(){Lt(this)?x(this).show():x(this).hide()})}}),x.extend({cssHooks:{opacity:{get:function(e,t){if(t){var n=vt(e,"opacity");return""===n?"1":n}}}},cssNumber:{columnCount:!0,fillOpacity:!0,fontWeight:!0,lineHeight:!0,opacity:!0,order:!0,orphans:!0,widows:!0,zIndex:!0,zoom:!0},cssProps:{"float":"cssFloat"},style:function(e,t,n,r){if(e&&3!==e.nodeType&&8!==e.nodeType&&e.style){var i,o,s,a=x.camelCase(t),u=e.style;return t=x.cssProps[a]||(x.cssProps[a]=At(u,a)),s=x.cssHooks[t]||x.cssHooks[a],n===undefined?s&&"get"in s&&(i=s.get(e,!1,r))!==undefined?i:u[t]:(o=typeof n,"string"===o&&(i=kt.exec(n))&&(n=(i[1]+1)*i[2]+parseFloat(x.css(e,t)),o="number"),null==n||"number"===o&&isNaN(n)||("number"!==o||x.cssNumber[a]||(n+="px"),x.support.clearCloneStyle||""!==n||0!==t.indexOf("background")||(u[t]="inherit"),s&&"set"in s&&(n=s.set(e,n,r))===undefined||(u[t]=n)),undefined)}},css:function(e,t,n,r){var i,o,s,a=x.camelCase(t);return t=x.cssProps[a]||(x.cssProps[a]=At(e.style,a)),s=x.cssHooks[t]||x.cssHooks[a],s&&"get"in s&&(i=s.get(e,!0,n)),i===undefined&&(i=vt(e,t,r)),"normal"===i&&t in St&&(i=St[t]),""===n||n?(o=parseFloat(i),n===!0||x.isNumeric(o)?o||0:i):i}}),vt=function(e,t,n){var r,i,o,s=n||qt(e),a=s?s.getPropertyValue(t)||s[t]:undefined,u=e.style;return s&&(""!==a||x.contains(e.ownerDocument,e)||(a=x.style(e,t)),Ct.test(a)&&wt.test(t)&&(r=u.width,i=u.minWidth,o=u.maxWidth,u.minWidth=u.maxWidth=u.width=a,a=s.width,u.width=r,u.minWidth=i,u.maxWidth=o)),a};function Ot(e,t,n){var r=Tt.exec(t);return r?Math.max(0,r[1]-(n||0))+(r[2]||"px"):t}function Ft(e,t,n,r,i){var o=n===(r?"border":"content")?4:"width"===t?1:0,s=0;for(;4>o;o+=2)"margin"===n&&(s+=x.css(e,n+jt[o],!0,i)),r?("content"===n&&(s-=x.css(e,"padding"+jt[o],!0,i)),"margin"!==n&&(s-=x.css(e,"border"+jt[o]+"Width",!0,i))):(s+=x.css(e,"padding"+jt[o],!0,i),"padding"!==n&&(s+=x.css(e,"border"+jt[o]+"Width",!0,i)));return s}function Pt(e,t,n){var r=!0,i="width"===t?e.offsetWidth:e.offsetHeight,o=qt(e),s=x.support.boxSizing&&"border-box"===x.css(e,"boxSizing",!1,o);if(0>=i||null==i){if(i=vt(e,t,o),(0>i||null==i)&&(i=e.style[t]),Ct.test(i))return i;r=s&&(x.support.boxSizingReliable||i===e.style[t]),i=parseFloat(i)||0}return i+Ft(e,t,n||(s?"border":"content"),r,o)+"px"}function Rt(e){var t=o,n=Nt[e];return n||(n=Mt(e,t),"none"!==n&&n||(xt=(xt||x("<iframe frameborder='0' width='0' height='0'/>").css("cssText","display:block !important")).appendTo(t.documentElement),t=(xt[0].contentWindow||xt[0].contentDocument).document,t.write("<!doctype html><html><body>"),t.close(),n=Mt(e,t),xt.detach()),Nt[e]=n),n}function Mt(e,t){var n=x(t.createElement(e)).appendTo(t.body),r=x.css(n[0],"display");return n.remove(),r}x.each(["height","width"],function(e,t){x.cssHooks[t]={get:function(e,n,r){return n?0===e.offsetWidth&&bt.test(x.css(e,"display"))?x.swap(e,Et,function(){return Pt(e,t,r)}):Pt(e,t,r):undefined},set:function(e,n,r){var i=r&&qt(e);return Ot(e,n,r?Ft(e,t,r,x.support.boxSizing&&"border-box"===x.css(e,"boxSizing",!1,i),i):0)}}}),x(function(){x.support.reliableMarginRight||(x.cssHooks.marginRight={get:function(e,t){return t?x.swap(e,{display:"inline-block"},vt,[e,"marginRight"]):undefined}}),!x.support.pixelPosition&&x.fn.position&&x.each(["top","left"],function(e,t){x.cssHooks[t]={get:function(e,n){return n?(n=vt(e,t),Ct.test(n)?x(e).position()[t]+"px":n):undefined}}})}),x.expr&&x.expr.filters&&(x.expr.filters.hidden=function(e){return 0>=e.offsetWidth&&0>=e.offsetHeight},x.expr.filters.visible=function(e){return!x.expr.filters.hidden(e)}),x.each({margin:"",padding:"",border:"Width"},function(e,t){x.cssHooks[e+t]={expand:function(n){var r=0,i={},o="string"==typeof n?n.split(" "):[n];for(;4>r;r++)i[e+jt[r]+t]=o[r]||o[r-2]||o[0];return i}},wt.test(e)||(x.cssHooks[e+t].set=Ot)});var Wt=/%20/g,$t=/\[\]$/,Bt=/\r?\n/g,It=/^(?:submit|button|image|reset|file)$/i,zt=/^(?:input|select|textarea|keygen)/i;x.fn.extend({serialize:function(){return x.param(this.serializeArray())},serializeArray:function(){return this.map(function(){var e=x.prop(this,"elements");return e?x.makeArray(e):this}).filter(function(){var e=this.type;return this.name&&!x(this).is(":disabled")&&zt.test(this.nodeName)&&!It.test(e)&&(this.checked||!ot.test(e))}).map(function(e,t){var n=x(this).val();return null==n?null:x.isArray(n)?x.map(n,function(e){return{name:t.name,value:e.replace(Bt,"\r\n")}}):{name:t.name,value:n.replace(Bt,"\r\n")}}).get()}}),x.param=function(e,t){var n,r=[],i=function(e,t){t=x.isFunction(t)?t():null==t?"":t,r[r.length]=encodeURIComponent(e)+"="+encodeURIComponent(t)};if(t===undefined&&(t=x.ajaxSettings&&x.ajaxSettings.traditional),x.isArray(e)||e.jquery&&!x.isPlainObject(e))x.each(e,function(){i(this.name,this.value)});else for(n in e)_t(n,e[n],t,i);return r.join("&").replace(Wt,"+")};function _t(e,t,n,r){var i;if(x.isArray(t))x.each(t,function(t,i){n||$t.test(e)?r(e,i):_t(e+"["+("object"==typeof i?t:"")+"]",i,n,r)});else if(n||"object"!==x.type(t))r(e,t);else for(i in t)_t(e+"["+i+"]",t[i],n,r)}x.each("blur focus focusin focusout load resize scroll unload click dblclick mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave change select submit keydown keypress keyup error contextmenu".split(" "),function(e,t){x.fn[t]=function(e,n){return arguments.length>0?this.on(t,null,e,n):this.trigger(t)}}),x.fn.extend({hover:function(e,t){return this.mouseenter(e).mouseleave(t||e)},bind:function(e,t,n){return this.on(e,null,t,n)},unbind:function(e,t){return this.off(e,null,t)
},delegate:function(e,t,n,r){return this.on(t,e,n,r)},undelegate:function(e,t,n){return 1===arguments.length?this.off(e,"**"):this.off(t,e||"**",n)}});var Xt,Ut,Yt=x.now(),Vt=/\?/,Gt=/#.*$/,Jt=/([?&])_=[^&]*/,Qt=/^(.*?):[ \t]*([^\r\n]*)$/gm,Kt=/^(?:about|app|app-storage|.+-extension|file|res|widget):$/,Zt=/^(?:GET|HEAD)$/,en=/^\/\//,tn=/^([\w.+-]+:)(?:\/\/([^\/?#:]*)(?::(\d+)|)|)/,nn=x.fn.load,rn={},on={},sn="*/".concat("*");try{Ut=i.href}catch(an){Ut=o.createElement("a"),Ut.href="",Ut=Ut.href}Xt=tn.exec(Ut.toLowerCase())||[];function un(e){return function(t,n){"string"!=typeof t&&(n=t,t="*");var r,i=0,o=t.toLowerCase().match(w)||[];if(x.isFunction(n))while(r=o[i++])"+"===r[0]?(r=r.slice(1)||"*",(e[r]=e[r]||[]).unshift(n)):(e[r]=e[r]||[]).push(n)}}function ln(e,t,n,r){var i={},o=e===on;function s(a){var u;return i[a]=!0,x.each(e[a]||[],function(e,a){var l=a(t,n,r);return"string"!=typeof l||o||i[l]?o?!(u=l):undefined:(t.dataTypes.unshift(l),s(l),!1)}),u}return s(t.dataTypes[0])||!i["*"]&&s("*")}function cn(e,t){var n,r,i=x.ajaxSettings.flatOptions||{};for(n in t)t[n]!==undefined&&((i[n]?e:r||(r={}))[n]=t[n]);return r&&x.extend(!0,e,r),e}x.fn.load=function(e,t,n){if("string"!=typeof e&&nn)return nn.apply(this,arguments);var r,i,o,s=this,a=e.indexOf(" ");return a>=0&&(r=e.slice(a),e=e.slice(0,a)),x.isFunction(t)?(n=t,t=undefined):t&&"object"==typeof t&&(i="POST"),s.length>0&&x.ajax({url:e,type:i,dataType:"html",data:t}).done(function(e){o=arguments,s.html(r?x("<div>").append(x.parseHTML(e)).find(r):e)}).complete(n&&function(e,t){s.each(n,o||[e.responseText,t,e])}),this},x.each(["ajaxStart","ajaxStop","ajaxComplete","ajaxError","ajaxSuccess","ajaxSend"],function(e,t){x.fn[t]=function(e){return this.on(t,e)}}),x.extend({active:0,lastModified:{},etag:{},ajaxSettings:{url:Ut,type:"GET",isLocal:Kt.test(Xt[1]),global:!0,processData:!0,async:!0,contentType:"application/x-www-form-urlencoded; charset=UTF-8",accepts:{"*":sn,text:"text/plain",html:"text/html",xml:"application/xml, text/xml",json:"application/json, text/javascript"},contents:{xml:/xml/,html:/html/,json:/json/},responseFields:{xml:"responseXML",text:"responseText",json:"responseJSON"},converters:{"* text":String,"text html":!0,"text json":x.parseJSON,"text xml":x.parseXML},flatOptions:{url:!0,context:!0}},ajaxSetup:function(e,t){return t?cn(cn(e,x.ajaxSettings),t):cn(x.ajaxSettings,e)},ajaxPrefilter:un(rn),ajaxTransport:un(on),ajax:function(e,t){"object"==typeof e&&(t=e,e=undefined),t=t||{};var n,r,i,o,s,a,u,l,c=x.ajaxSetup({},t),p=c.context||c,f=c.context&&(p.nodeType||p.jquery)?x(p):x.event,h=x.Deferred(),d=x.Callbacks("once memory"),g=c.statusCode||{},m={},y={},v=0,b="canceled",T={readyState:0,getResponseHeader:function(e){var t;if(2===v){if(!o){o={};while(t=Qt.exec(i))o[t[1].toLowerCase()]=t[2]}t=o[e.toLowerCase()]}return null==t?null:t},getAllResponseHeaders:function(){return 2===v?i:null},setRequestHeader:function(e,t){var n=e.toLowerCase();return v||(e=y[n]=y[n]||e,m[e]=t),this},overrideMimeType:function(e){return v||(c.mimeType=e),this},statusCode:function(e){var t;if(e)if(2>v)for(t in e)g[t]=[g[t],e[t]];else T.always(e[T.status]);return this},abort:function(e){var t=e||b;return n&&n.abort(t),k(0,t),this}};if(h.promise(T).complete=d.add,T.success=T.done,T.error=T.fail,c.url=((e||c.url||Ut)+"").replace(Gt,"").replace(en,Xt[1]+"//"),c.type=t.method||t.type||c.method||c.type,c.dataTypes=x.trim(c.dataType||"*").toLowerCase().match(w)||[""],null==c.crossDomain&&(a=tn.exec(c.url.toLowerCase()),c.crossDomain=!(!a||a[1]===Xt[1]&&a[2]===Xt[2]&&(a[3]||("http:"===a[1]?"80":"443"))===(Xt[3]||("http:"===Xt[1]?"80":"443")))),c.data&&c.processData&&"string"!=typeof c.data&&(c.data=x.param(c.data,c.traditional)),ln(rn,c,t,T),2===v)return T;u=c.global,u&&0===x.active++&&x.event.trigger("ajaxStart"),c.type=c.type.toUpperCase(),c.hasContent=!Zt.test(c.type),r=c.url,c.hasContent||(c.data&&(r=c.url+=(Vt.test(r)?"&":"?")+c.data,delete c.data),c.cache===!1&&(c.url=Jt.test(r)?r.replace(Jt,"$1_="+Yt++):r+(Vt.test(r)?"&":"?")+"_="+Yt++)),c.ifModified&&(x.lastModified[r]&&T.setRequestHeader("If-Modified-Since",x.lastModified[r]),x.etag[r]&&T.setRequestHeader("If-None-Match",x.etag[r])),(c.data&&c.hasContent&&c.contentType!==!1||t.contentType)&&T.setRequestHeader("Content-Type",c.contentType),T.setRequestHeader("Accept",c.dataTypes[0]&&c.accepts[c.dataTypes[0]]?c.accepts[c.dataTypes[0]]+("*"!==c.dataTypes[0]?", "+sn+"; q=0.01":""):c.accepts["*"]);for(l in c.headers)T.setRequestHeader(l,c.headers[l]);if(c.beforeSend&&(c.beforeSend.call(p,T,c)===!1||2===v))return T.abort();b="abort";for(l in{success:1,error:1,complete:1})T[l](c[l]);if(n=ln(on,c,t,T)){T.readyState=1,u&&f.trigger("ajaxSend",[T,c]),c.async&&c.timeout>0&&(s=setTimeout(function(){T.abort("timeout")},c.timeout));try{v=1,n.send(m,k)}catch(C){if(!(2>v))throw C;k(-1,C)}}else k(-1,"No Transport");function k(e,t,o,a){var l,m,y,b,w,C=t;2!==v&&(v=2,s&&clearTimeout(s),n=undefined,i=a||"",T.readyState=e>0?4:0,l=e>=200&&300>e||304===e,o&&(b=pn(c,T,o)),b=fn(c,b,T,l),l?(c.ifModified&&(w=T.getResponseHeader("Last-Modified"),w&&(x.lastModified[r]=w),w=T.getResponseHeader("etag"),w&&(x.etag[r]=w)),204===e||"HEAD"===c.type?C="nocontent":304===e?C="notmodified":(C=b.state,m=b.data,y=b.error,l=!y)):(y=C,(e||!C)&&(C="error",0>e&&(e=0))),T.status=e,T.statusText=(t||C)+"",l?h.resolveWith(p,[m,C,T]):h.rejectWith(p,[T,C,y]),T.statusCode(g),g=undefined,u&&f.trigger(l?"ajaxSuccess":"ajaxError",[T,c,l?m:y]),d.fireWith(p,[T,C]),u&&(f.trigger("ajaxComplete",[T,c]),--x.active||x.event.trigger("ajaxStop")))}return T},getJSON:function(e,t,n){return x.get(e,t,n,"json")},getScript:function(e,t){return x.get(e,undefined,t,"script")}}),x.each(["get","post"],function(e,t){x[t]=function(e,n,r,i){return x.isFunction(n)&&(i=i||r,r=n,n=undefined),x.ajax({url:e,type:t,dataType:i,data:n,success:r})}});function pn(e,t,n){var r,i,o,s,a=e.contents,u=e.dataTypes;while("*"===u[0])u.shift(),r===undefined&&(r=e.mimeType||t.getResponseHeader("Content-Type"));if(r)for(i in a)if(a[i]&&a[i].test(r)){u.unshift(i);break}if(u[0]in n)o=u[0];else{for(i in n){if(!u[0]||e.converters[i+" "+u[0]]){o=i;break}s||(s=i)}o=o||s}return o?(o!==u[0]&&u.unshift(o),n[o]):undefined}function fn(e,t,n,r){var i,o,s,a,u,l={},c=e.dataTypes.slice();if(c[1])for(s in e.converters)l[s.toLowerCase()]=e.converters[s];o=c.shift();while(o)if(e.responseFields[o]&&(n[e.responseFields[o]]=t),!u&&r&&e.dataFilter&&(t=e.dataFilter(t,e.dataType)),u=o,o=c.shift())if("*"===o)o=u;else if("*"!==u&&u!==o){if(s=l[u+" "+o]||l["* "+o],!s)for(i in l)if(a=i.split(" "),a[1]===o&&(s=l[u+" "+a[0]]||l["* "+a[0]])){s===!0?s=l[i]:l[i]!==!0&&(o=a[0],c.unshift(a[1]));break}if(s!==!0)if(s&&e["throws"])t=s(t);else try{t=s(t)}catch(p){return{state:"parsererror",error:s?p:"No conversion from "+u+" to "+o}}}return{state:"success",data:t}}x.ajaxSetup({accepts:{script:"text/javascript, application/javascript, application/ecmascript, application/x-ecmascript"},contents:{script:/(?:java|ecma)script/},converters:{"text script":function(e){return x.globalEval(e),e}}}),x.ajaxPrefilter("script",function(e){e.cache===undefined&&(e.cache=!1),e.crossDomain&&(e.type="GET")}),x.ajaxTransport("script",function(e){if(e.crossDomain){var t,n;return{send:function(r,i){t=x("<script>").prop({async:!0,charset:e.scriptCharset,src:e.url}).on("load error",n=function(e){t.remove(),n=null,e&&i("error"===e.type?404:200,e.type)}),o.head.appendChild(t[0])},abort:function(){n&&n()}}}});var hn=[],dn=/(=)\?(?=&|$)|\?\?/;x.ajaxSetup({jsonp:"callback",jsonpCallback:function(){var e=hn.pop()||x.expando+"_"+Yt++;return this[e]=!0,e}}),x.ajaxPrefilter("json jsonp",function(t,n,r){var i,o,s,a=t.jsonp!==!1&&(dn.test(t.url)?"url":"string"==typeof t.data&&!(t.contentType||"").indexOf("application/x-www-form-urlencoded")&&dn.test(t.data)&&"data");return a||"jsonp"===t.dataTypes[0]?(i=t.jsonpCallback=x.isFunction(t.jsonpCallback)?t.jsonpCallback():t.jsonpCallback,a?t[a]=t[a].replace(dn,"$1"+i):t.jsonp!==!1&&(t.url+=(Vt.test(t.url)?"&":"?")+t.jsonp+"="+i),t.converters["script json"]=function(){return s||x.error(i+" was not called"),s[0]},t.dataTypes[0]="json",o=e[i],e[i]=function(){s=arguments},r.always(function(){e[i]=o,t[i]&&(t.jsonpCallback=n.jsonpCallback,hn.push(i)),s&&x.isFunction(o)&&o(s[0]),s=o=undefined}),"script"):undefined}),x.ajaxSettings.xhr=function(){try{return new XMLHttpRequest}catch(e){}};var gn=x.ajaxSettings.xhr(),mn={0:200,1223:204},yn=0,vn={};e.ActiveXObject&&x(e).on("unload",function(){for(var e in vn)vn[e]();vn=undefined}),x.support.cors=!!gn&&"withCredentials"in gn,x.support.ajax=gn=!!gn,x.ajaxTransport(function(e){var t;return x.support.cors||gn&&!e.crossDomain?{send:function(n,r){var i,o,s=e.xhr();if(s.open(e.type,e.url,e.async,e.username,e.password),e.xhrFields)for(i in e.xhrFields)s[i]=e.xhrFields[i];e.mimeType&&s.overrideMimeType&&s.overrideMimeType(e.mimeType),e.crossDomain||n["X-Requested-With"]||(n["X-Requested-With"]="XMLHttpRequest");for(i in n)s.setRequestHeader(i,n[i]);t=function(e){return function(){t&&(delete vn[o],t=s.onload=s.onerror=null,"abort"===e?s.abort():"error"===e?r(s.status||404,s.statusText):r(mn[s.status]||s.status,s.statusText,"string"==typeof s.responseText?{text:s.responseText}:undefined,s.getAllResponseHeaders()))}},s.onload=t(),s.onerror=t("error"),t=vn[o=yn++]=t("abort"),s.send(e.hasContent&&e.data||null)},abort:function(){t&&t()}}:undefined});var xn,bn,wn=/^(?:toggle|show|hide)$/,Tn=RegExp("^(?:([+-])=|)("+b+")([a-z%]*)$","i"),Cn=/queueHooks$/,kn=[An],Nn={"*":[function(e,t){var n=this.createTween(e,t),r=n.cur(),i=Tn.exec(t),o=i&&i[3]||(x.cssNumber[e]?"":"px"),s=(x.cssNumber[e]||"px"!==o&&+r)&&Tn.exec(x.css(n.elem,e)),a=1,u=20;if(s&&s[3]!==o){o=o||s[3],i=i||[],s=+r||1;do a=a||".5",s/=a,x.style(n.elem,e,s+o);while(a!==(a=n.cur()/r)&&1!==a&&--u)}return i&&(s=n.start=+s||+r||0,n.unit=o,n.end=i[1]?s+(i[1]+1)*i[2]:+i[2]),n}]};function En(){return setTimeout(function(){xn=undefined}),xn=x.now()}function Sn(e,t,n){var r,i=(Nn[t]||[]).concat(Nn["*"]),o=0,s=i.length;for(;s>o;o++)if(r=i[o].call(n,t,e))return r}function jn(e,t,n){var r,i,o=0,s=kn.length,a=x.Deferred().always(function(){delete u.elem}),u=function(){if(i)return!1;var t=xn||En(),n=Math.max(0,l.startTime+l.duration-t),r=n/l.duration||0,o=1-r,s=0,u=l.tweens.length;for(;u>s;s++)l.tweens[s].run(o);return a.notifyWith(e,[l,o,n]),1>o&&u?n:(a.resolveWith(e,[l]),!1)},l=a.promise({elem:e,props:x.extend({},t),opts:x.extend(!0,{specialEasing:{}},n),originalProperties:t,originalOptions:n,startTime:xn||En(),duration:n.duration,tweens:[],createTween:function(t,n){var r=x.Tween(e,l.opts,t,n,l.opts.specialEasing[t]||l.opts.easing);return l.tweens.push(r),r},stop:function(t){var n=0,r=t?l.tweens.length:0;if(i)return this;for(i=!0;r>n;n++)l.tweens[n].run(1);return t?a.resolveWith(e,[l,t]):a.rejectWith(e,[l,t]),this}}),c=l.props;for(Dn(c,l.opts.specialEasing);s>o;o++)if(r=kn[o].call(l,e,c,l.opts))return r;return x.map(c,Sn,l),x.isFunction(l.opts.start)&&l.opts.start.call(e,l),x.fx.timer(x.extend(u,{elem:e,anim:l,queue:l.opts.queue})),l.progress(l.opts.progress).done(l.opts.done,l.opts.complete).fail(l.opts.fail).always(l.opts.always)}function Dn(e,t){var n,r,i,o,s;for(n in e)if(r=x.camelCase(n),i=t[r],o=e[n],x.isArray(o)&&(i=o[1],o=e[n]=o[0]),n!==r&&(e[r]=o,delete e[n]),s=x.cssHooks[r],s&&"expand"in s){o=s.expand(o),delete e[r];for(n in o)n in e||(e[n]=o[n],t[n]=i)}else t[r]=i}x.Animation=x.extend(jn,{tweener:function(e,t){x.isFunction(e)?(t=e,e=["*"]):e=e.split(" ");var n,r=0,i=e.length;for(;i>r;r++)n=e[r],Nn[n]=Nn[n]||[],Nn[n].unshift(t)},prefilter:function(e,t){t?kn.unshift(e):kn.push(e)}});function An(e,t,n){var r,i,o,s,a,u,l=this,c={},p=e.style,f=e.nodeType&&Lt(e),h=q.get(e,"fxshow");n.queue||(a=x._queueHooks(e,"fx"),null==a.unqueued&&(a.unqueued=0,u=a.empty.fire,a.empty.fire=function(){a.unqueued||u()}),a.unqueued++,l.always(function(){l.always(function(){a.unqueued--,x.queue(e,"fx").length||a.empty.fire()})})),1===e.nodeType&&("height"in t||"width"in t)&&(n.overflow=[p.overflow,p.overflowX,p.overflowY],"inline"===x.css(e,"display")&&"none"===x.css(e,"float")&&(p.display="inline-block")),n.overflow&&(p.overflow="hidden",l.always(function(){p.overflow=n.overflow[0],p.overflowX=n.overflow[1],p.overflowY=n.overflow[2]}));for(r in t)if(i=t[r],wn.exec(i)){if(delete t[r],o=o||"toggle"===i,i===(f?"hide":"show")){if("show"!==i||!h||h[r]===undefined)continue;f=!0}c[r]=h&&h[r]||x.style(e,r)}if(!x.isEmptyObject(c)){h?"hidden"in h&&(f=h.hidden):h=q.access(e,"fxshow",{}),o&&(h.hidden=!f),f?x(e).show():l.done(function(){x(e).hide()}),l.done(function(){var t;q.remove(e,"fxshow");for(t in c)x.style(e,t,c[t])});for(r in c)s=Sn(f?h[r]:0,r,l),r in h||(h[r]=s.start,f&&(s.end=s.start,s.start="width"===r||"height"===r?1:0))}}function Ln(e,t,n,r,i){return new Ln.prototype.init(e,t,n,r,i)}x.Tween=Ln,Ln.prototype={constructor:Ln,init:function(e,t,n,r,i,o){this.elem=e,this.prop=n,this.easing=i||"swing",this.options=t,this.start=this.now=this.cur(),this.end=r,this.unit=o||(x.cssNumber[n]?"":"px")},cur:function(){var e=Ln.propHooks[this.prop];return e&&e.get?e.get(this):Ln.propHooks._default.get(this)},run:function(e){var t,n=Ln.propHooks[this.prop];return this.pos=t=this.options.duration?x.easing[this.easing](e,this.options.duration*e,0,1,this.options.duration):e,this.now=(this.end-this.start)*t+this.start,this.options.step&&this.options.step.call(this.elem,this.now,this),n&&n.set?n.set(this):Ln.propHooks._default.set(this),this}},Ln.prototype.init.prototype=Ln.prototype,Ln.propHooks={_default:{get:function(e){var t;return null==e.elem[e.prop]||e.elem.style&&null!=e.elem.style[e.prop]?(t=x.css(e.elem,e.prop,""),t&&"auto"!==t?t:0):e.elem[e.prop]},set:function(e){x.fx.step[e.prop]?x.fx.step[e.prop](e):e.elem.style&&(null!=e.elem.style[x.cssProps[e.prop]]||x.cssHooks[e.prop])?x.style(e.elem,e.prop,e.now+e.unit):e.elem[e.prop]=e.now}}},Ln.propHooks.scrollTop=Ln.propHooks.scrollLeft={set:function(e){e.elem.nodeType&&e.elem.parentNode&&(e.elem[e.prop]=e.now)}},x.each(["toggle","show","hide"],function(e,t){var n=x.fn[t];x.fn[t]=function(e,r,i){return null==e||"boolean"==typeof e?n.apply(this,arguments):this.animate(qn(t,!0),e,r,i)}}),x.fn.extend({fadeTo:function(e,t,n,r){return this.filter(Lt).css("opacity",0).show().end().animate({opacity:t},e,n,r)},animate:function(e,t,n,r){var i=x.isEmptyObject(e),o=x.speed(t,n,r),s=function(){var t=jn(this,x.extend({},e),o);(i||q.get(this,"finish"))&&t.stop(!0)};return s.finish=s,i||o.queue===!1?this.each(s):this.queue(o.queue,s)},stop:function(e,t,n){var r=function(e){var t=e.stop;delete e.stop,t(n)};return"string"!=typeof e&&(n=t,t=e,e=undefined),t&&e!==!1&&this.queue(e||"fx",[]),this.each(function(){var t=!0,i=null!=e&&e+"queueHooks",o=x.timers,s=q.get(this);if(i)s[i]&&s[i].stop&&r(s[i]);else for(i in s)s[i]&&s[i].stop&&Cn.test(i)&&r(s[i]);for(i=o.length;i--;)o[i].elem!==this||null!=e&&o[i].queue!==e||(o[i].anim.stop(n),t=!1,o.splice(i,1));(t||!n)&&x.dequeue(this,e)})},finish:function(e){return e!==!1&&(e=e||"fx"),this.each(function(){var t,n=q.get(this),r=n[e+"queue"],i=n[e+"queueHooks"],o=x.timers,s=r?r.length:0;for(n.finish=!0,x.queue(this,e,[]),i&&i.stop&&i.stop.call(this,!0),t=o.length;t--;)o[t].elem===this&&o[t].queue===e&&(o[t].anim.stop(!0),o.splice(t,1));for(t=0;s>t;t++)r[t]&&r[t].finish&&r[t].finish.call(this);delete n.finish})}});function qn(e,t){var n,r={height:e},i=0;for(t=t?1:0;4>i;i+=2-t)n=jt[i],r["margin"+n]=r["padding"+n]=e;return t&&(r.opacity=r.width=e),r}x.each({slideDown:qn("show"),slideUp:qn("hide"),slideToggle:qn("toggle"),fadeIn:{opacity:"show"},fadeOut:{opacity:"hide"},fadeToggle:{opacity:"toggle"}},function(e,t){x.fn[e]=function(e,n,r){return this.animate(t,e,n,r)}}),x.speed=function(e,t,n){var r=e&&"object"==typeof e?x.extend({},e):{complete:n||!n&&t||x.isFunction(e)&&e,duration:e,easing:n&&t||t&&!x.isFunction(t)&&t};return r.duration=x.fx.off?0:"number"==typeof r.duration?r.duration:r.duration in x.fx.speeds?x.fx.speeds[r.duration]:x.fx.speeds._default,(null==r.queue||r.queue===!0)&&(r.queue="fx"),r.old=r.complete,r.complete=function(){x.isFunction(r.old)&&r.old.call(this),r.queue&&x.dequeue(this,r.queue)},r},x.easing={linear:function(e){return e},swing:function(e){return.5-Math.cos(e*Math.PI)/2}},x.timers=[],x.fx=Ln.prototype.init,x.fx.tick=function(){var e,t=x.timers,n=0;for(xn=x.now();t.length>n;n++)e=t[n],e()||t[n]!==e||t.splice(n--,1);t.length||x.fx.stop(),xn=undefined},x.fx.timer=function(e){e()&&x.timers.push(e)&&x.fx.start()},x.fx.interval=13,x.fx.start=function(){bn||(bn=setInterval(x.fx.tick,x.fx.interval))},x.fx.stop=function(){clearInterval(bn),bn=null},x.fx.speeds={slow:600,fast:200,_default:400},x.fx.step={},x.expr&&x.expr.filters&&(x.expr.filters.animated=function(e){return x.grep(x.timers,function(t){return e===t.elem}).length}),x.fn.offset=function(e){if(arguments.length)return e===undefined?this:this.each(function(t){x.offset.setOffset(this,e,t)});var t,n,i=this[0],o={top:0,left:0},s=i&&i.ownerDocument;if(s)return t=s.documentElement,x.contains(t,i)?(typeof i.getBoundingClientRect!==r&&(o=i.getBoundingClientRect()),n=Hn(s),{top:o.top+n.pageYOffset-t.clientTop,left:o.left+n.pageXOffset-t.clientLeft}):o},x.offset={setOffset:function(e,t,n){var r,i,o,s,a,u,l,c=x.css(e,"position"),p=x(e),f={};"static"===c&&(e.style.position="relative"),a=p.offset(),o=x.css(e,"top"),u=x.css(e,"left"),l=("absolute"===c||"fixed"===c)&&(o+u).indexOf("auto")>-1,l?(r=p.position(),s=r.top,i=r.left):(s=parseFloat(o)||0,i=parseFloat(u)||0),x.isFunction(t)&&(t=t.call(e,n,a)),null!=t.top&&(f.top=t.top-a.top+s),null!=t.left&&(f.left=t.left-a.left+i),"using"in t?t.using.call(e,f):p.css(f)}},x.fn.extend({position:function(){if(this[0]){var e,t,n=this[0],r={top:0,left:0};return"fixed"===x.css(n,"position")?t=n.getBoundingClientRect():(e=this.offsetParent(),t=this.offset(),x.nodeName(e[0],"html")||(r=e.offset()),r.top+=x.css(e[0],"borderTopWidth",!0),r.left+=x.css(e[0],"borderLeftWidth",!0)),{top:t.top-r.top-x.css(n,"marginTop",!0),left:t.left-r.left-x.css(n,"marginLeft",!0)}}},offsetParent:function(){return this.map(function(){var e=this.offsetParent||s;while(e&&!x.nodeName(e,"html")&&"static"===x.css(e,"position"))e=e.offsetParent;return e||s})}}),x.each({scrollLeft:"pageXOffset",scrollTop:"pageYOffset"},function(t,n){var r="pageYOffset"===n;x.fn[t]=function(i){return x.access(this,function(t,i,o){var s=Hn(t);return o===undefined?s?s[n]:t[i]:(s?s.scrollTo(r?e.pageXOffset:o,r?o:e.pageYOffset):t[i]=o,undefined)},t,i,arguments.length,null)}});function Hn(e){return x.isWindow(e)?e:9===e.nodeType&&e.defaultView}x.each({Height:"height",Width:"width"},function(e,t){x.each({padding:"inner"+e,content:t,"":"outer"+e},function(n,r){x.fn[r]=function(r,i){var o=arguments.length&&(n||"boolean"!=typeof r),s=n||(r===!0||i===!0?"margin":"border");return x.access(this,function(t,n,r){var i;return x.isWindow(t)?t.document.documentElement["client"+e]:9===t.nodeType?(i=t.documentElement,Math.max(t.body["scroll"+e],i["scroll"+e],t.body["offset"+e],i["offset"+e],i["client"+e])):r===undefined?x.css(t,n,s):x.style(t,n,r,s)},t,o?r:undefined,o,null)}})}),x.fn.size=function(){return this.length},x.fn.andSelf=x.fn.addBack,"object"==typeof module&&module&&"object"==typeof module.exports?module.exports=x:"function"==typeof define&&define.amd&&define("jquery",[],function(){return x}),"object"==typeof e&&"object"==typeof e.document&&(e.jQuery=e.$=x)})(window);

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

  define('collections/base',['require','backbone','hilib/managers/token','hilib/managers/pubsub'],function(require) {
    var Backbone, Base, Pubsub, token, _ref;
    Backbone = require('backbone');
    token = require('hilib/managers/token');
    Pubsub = require('hilib/managers/pubsub');
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
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define('collections/view',['require','collections/base'],function(require) {
    var Base, Views, _ref;
    Base = require('collections/base');
    return Views = (function(_super) {
      __extends(Views, _super);

      function Views() {
        _ref = Views.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      Views.prototype.has = function(view) {
        if (this.get(view.cid)) {
          return true;
        } else {
          return false;
        }
      };

      return Views;

    })(Base);
  });

}).call(this);

(function() {
  define('hilib/managers/view',['require','backbone','collections/view'],function(require) {
    var Backbone, Collections, ViewManager;
    Backbone = require('backbone');
    Collections = {
      'View': require('collections/view')
    };
    ViewManager = (function() {
      var currentViews, selfDestruct;

      currentViews = new Collections.View();

      ViewManager.prototype.debugCurrentViews = currentViews;

      selfDestruct = function(view) {
        if (!currentViews.has(view)) {
          console.error('Unknown view!');
          return false;
        }
        if (view.destroy) {
          return view.destroy();
        } else {
          return view.remove();
        }
      };

      function ViewManager() {
        this.main = $('div#main');
      }

      ViewManager.prototype.clear = function(view) {
        if (view) {
          selfDestruct(view);
          return currentViews.remove(view.cid);
        } else {
          currentViews.each(function(model) {
            return selfDestruct(model.get('view'));
          });
          return currentViews.reset();
        }
      };

      ViewManager.prototype.register = function(view) {
        if (view) {
          return currentViews.add({
            'id': view.cid,
            'view': view
          });
        }
      };

      ViewManager.prototype.show = function(View, query) {
        var html, view;
        this.clear();
        query = query || {};
        view = new View(query);
        html = view == null ? '' : view.$el;
        return this.main.html(html);
      };

      return ViewManager;

    })();
    return new ViewManager();
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
      /*
      	Starts a timer which resets when it is called again.
      	
      	Example: with a scroll event, when a user stops scrolling, the timer ends.
      	Without the reset, the timer would fire dozens of times.
      	Can also be handy to avoid double clicks.
      
      	Example usage:
      	div.addEventListener 'scroll', (ev) ->
      		Fn.timeoutWithReset 200, -> console.log('finished!')
      	
      	return Function
      */

      timeoutWithReset: (function() {
        var timer;
        timer = 0;
        return function(ms, cb) {
          clearTimeout(timer);
          return timer = setTimeout(cb, ms);
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
        return arr.splice(index, 1);
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
          if (_.isObject(v) && !_.isArray(v) && !_.isFunction(v) && !v instanceof Backbone.Model && !v instanceof Backbone.Collection) {
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
        var clientHeight, clientWidth, scrollHeight, scrollWidth;
        clientWidth = el.clientWidth;
        scrollWidth = el.scrollWidth;
        clientHeight = el.clientHeight;
        scrollHeight = el.scrollHeight;
        el.scrollTop = (scrollHeight - clientHeight) * percentages.top / 100;
        return el.scrollLeft = (scrollWidth - clientWidth) * percentages.left / 100;
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
      }
    };
  });

}).call(this);

(function() {
  define('config',['require'],function(require) {
    return {
      'baseUrl': 'http://demo7.huygens.knaw.nl/elab4testBE/'
    };
  });

}).call(this);

(function() {
  define('hilib/managers/ajax',['require','jquery'],function(require) {
    var $;
    $ = require('jquery');
    $.support.cors = true;
    return {
      token: null,
      get: function(args) {
        return this.fire('get', args);
      },
      post: function(args) {
        return this.fire('post', args);
      },
      put: function(args) {
        return this.fire('put', args);
      },
      fire: function(type, args) {
        var ajaxArgs,
          _this = this;
        ajaxArgs = {
          type: type,
          dataType: 'json',
          contentType: 'application/json; charset=utf-8',
          processData: false,
          crossDomain: true
        };
        if (this.token != null) {
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

  define('models/base',['require','backbone','hilib/managers/token','hilib/managers/pubsub'],function(require) {
    var Backbone, Base, Pubsub, token, _ref;
    Backbone = require('backbone');
    token = require('hilib/managers/token');
    Pubsub = require('hilib/managers/pubsub');
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

      EntryMetadata.prototype.save = function(newValues) {
        var jqXHR;
        ajax.token = token.get();
        return jqXHR = ajax.put({
          url: url,
          data: JSON.stringify(newValues)
        });
      };

      return EntryMetadata;

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
        var data, jqXHR, name, obj, _i, _len, _ref,
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
        if (method === 'create') {
          ajax.token = token.get();
          jqXHR = ajax.post({
            url: this.url(),
            dataType: 'text',
            data: data
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
            data: data
          });
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
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define('models/annotation',['require','hilib/managers/ajax','hilib/managers/token','config','models/base'],function(require) {
    var Annotation, Models, ajax, config, token, _ref;
    ajax = require('hilib/managers/ajax');
    token = require('hilib/managers/token');
    ajax.token = token.get();
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

      Annotation.prototype.set = function(attrs, options) {
        var attr;
        if (_.isString(attrs) && attrs.substr(0, 9) === 'metadata.') {
          attr = attrs.substr(9);
          return this.attributes['metadata'][attr] = options;
        } else {
          return Annotation.__super__.set.apply(this, arguments);
        }
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
              return xhr.done(function(data, textStatus, jqXHR) {
                return options.success(data);
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

  define('models/transcription',['require','config','hilib/managers/ajax','hilib/managers/token','models/base','collections/annotations'],function(require) {
    var Collections, Models, Transcription, ajax, config, token, _ref;
    config = require('config');
    ajax = require('hilib/managers/ajax');
    token = require('hilib/managers/token');
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

      Transcription.prototype.set = function(attrs, options) {
        var _this = this;
        if (attrs === 'body') {
          options = options.replace(/<div><br><\/div>/g, '<br>');
          options = options.replace(/<div>(.*?)<\/div>/g, function(match, p1, offset, string) {
            return '<br>' + p1;
          });
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
            return _this.trigger('sync');
          });
          return jqXHR.fail(function(response) {
            return console.log('fail', response);
          });
        } else {
          return Transcription.__super__.sync.apply(this, arguments);
        }
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
            this.current = this.at(0);
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

  define('models/entry',['require','config','hilib/mixins/model.sync','models/base','models/entry.settings','collections/transcriptions','collections/facsimiles'],function(require) {
    var Collections, Entry, Models, config, syncOverride, _ref;
    config = require('config');
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

      Entry.prototype.defaults = function() {
        return {
          name: '',
          publishable: false
        };
      };

      Entry.prototype.initialize = function() {
        Entry.__super__.initialize.apply(this, arguments);
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
          publishable: this.get('publishable')
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
        return attrs;
      };

      Entry.prototype.sync = function(method, model, options) {
        if (method === 'create' || method === 'update') {
          options.attributes = ['name', 'publishable'];
          return this.syncOverride(method, model, options);
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

  define('models/project/annotationtype',['require','models/base'],function(require) {
    var AnnotationType, Models, _ref;
    Models = {
      Base: require('models/base')
    };
    return AnnotationType = (function(_super) {
      __extends(AnnotationType, _super);

      function AnnotationType() {
        _ref = AnnotationType.__super__.constructor.apply(this, arguments);
        return _ref;
      }

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

      AnnotationTypes.prototype.initialize = function(models, options) {
        AnnotationTypes.__super__.initialize.apply(this, arguments);
        return this.projectId = options.projectId;
      };

      AnnotationTypes.prototype.url = function() {
        return config.baseUrl + ("projects/" + this.projectId + "/annotationtypes");
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

  define('collections/project/users',['require','config','collections/base'],function(require) {
    var Collections, ProjectUsers, config, _ref;
    config = require('config');
    Collections = {
      Base: require('collections/base')
    };
    return ProjectUsers = (function(_super) {
      __extends(ProjectUsers, _super);

      function ProjectUsers() {
        _ref = ProjectUsers.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      ProjectUsers.prototype.initialize = function(models, options) {
        ProjectUsers.__super__.initialize.apply(this, arguments);
        return this.projectID = options.projectId;
      };

      ProjectUsers.prototype.url = function() {
        return "" + config.baseUrl + "projects/" + this.projectID + "/users";
      };

      return ProjectUsers;

    })(Collections.Base);
  });

}).call(this);

(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define('models/project/main',['require','hilib/managers/ajax','hilib/managers/token','hilib/managers/async','config','models/base','entry.metadata','collections/entries','collections/project/annotationtypes','collections/project/users'],function(require) {
    var Async, Collections, EntryMetadata, Models, Project, ajax, config, token, _ref;
    ajax = require('hilib/managers/ajax');
    token = require('hilib/managers/token');
    Async = require('hilib/managers/async');
    config = require('config');
    Models = {
      Base: require('models/base')
    };
    EntryMetadata = require('entry.metadata');
    Collections = {
      Entries: require('collections/entries'),
      AnnotationTypes: require('collections/project/annotationtypes'),
      ProjectUsers: require('collections/project/users')
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
          textLayers: [],
          title: '',
          users: null
        };
      };

      Project.prototype.parse = function(attrs) {
        attrs.entries = new Collections.Entries([], {
          projectId: attrs.id
        });
        return attrs;
      };

      Project.prototype.load = function(cb) {
        var annotationtypes, async, users,
          _this = this;
        if (this.get('annotationtypes') === null && this.get('entrymetadatafields') === null && this.get('users') === null) {
          async = new Async(['annotationtypes', 'users', 'entrymetadatafields']);
          async.on('ready', function(data) {
            return cb();
          });
          annotationtypes = new Collections.AnnotationTypes([], {
            projectId: this.id
          });
          annotationtypes.fetch({
            success: function(collection) {
              _this.set('annotationtypes', collection);
              return async.called('annotationtypes', collection);
            }
          });
          users = new Collections.ProjectUsers([], {
            projectId: this.id
          });
          users.fetch({
            success: function(collection) {
              _this.set('users', collection);
              return async.called('users', collection);
            }
          });
          return new EntryMetadata(this.id).fetch(function(data) {
            _this.set('entrymetadatafields', data);
            return async.called('entrymetadatafields', data);
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

  define('views/base',['require','backbone','hilib/managers/pubsub','hilib/managers/view'],function(require) {
    var Backbone, BaseView, Pubsub, viewManager, _ref;
    Backbone = require('backbone');
    Pubsub = require('hilib/managers/pubsub');
    viewManager = require('hilib/managers/view');
    return BaseView = (function(_super) {
      __extends(BaseView, _super);

      function BaseView() {
        _ref = BaseView.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      BaseView.prototype.defaults = function() {
        return {
          managed: true
        };
      };

      BaseView.prototype.initialize = function() {
        this.options = _.extend(this.defaults(), this.options);
        if (this.options.managed) {
          viewManager.register(this);
        }
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
          return jqXHR.fail(function() {
            console.log('herer!');
            return _this.unauthorized();
          });
        }
      };

      return CurrentUser;

    })(Models.Base);
    return new CurrentUser();
  });

}).call(this);

/**
 * @license RequireJS text 2.0.10 Copyright (c) 2010-2012, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/requirejs/text for details
 */
/*jslint regexp: true */
/*global require, XMLHttpRequest, ActiveXObject,
  define, window, process, Packages,
  java, location, Components, FileUtils */

define('text',['module'], function (module) {
    

    var text, fs, Cc, Ci, xpcIsWindows,
        progIds = ['Msxml2.XMLHTTP', 'Microsoft.XMLHTTP', 'Msxml2.XMLHTTP.4.0'],
        xmlRegExp = /^\s*<\?xml(\s)+version=[\'\"](\d)*.(\d)*[\'\"](\s)*\?>/im,
        bodyRegExp = /<body[^>]*>\s*([\s\S]+)\s*<\/body>/im,
        hasLocation = typeof location !== 'undefined' && location.href,
        defaultProtocol = hasLocation && location.protocol && location.protocol.replace(/\:/, ''),
        defaultHostName = hasLocation && location.hostname,
        defaultPort = hasLocation && (location.port || undefined),
        buildMap = {},
        masterConfig = (module.config && module.config()) || {};

    text = {
        version: '2.0.10',

        strip: function (content) {
            //Strips <?xml ...?> declarations so that external SVG and XML
            //documents can be added to a document without worry. Also, if the string
            //is an HTML document, only the part inside the body tag is returned.
            if (content) {
                content = content.replace(xmlRegExp, "");
                var matches = content.match(bodyRegExp);
                if (matches) {
                    content = matches[1];
                }
            } else {
                content = "";
            }
            return content;
        },

        jsEscape: function (content) {
            return content.replace(/(['\\])/g, '\\$1')
                .replace(/[\f]/g, "\\f")
                .replace(/[\b]/g, "\\b")
                .replace(/[\n]/g, "\\n")
                .replace(/[\t]/g, "\\t")
                .replace(/[\r]/g, "\\r")
                .replace(/[\u2028]/g, "\\u2028")
                .replace(/[\u2029]/g, "\\u2029");
        },

        createXhr: masterConfig.createXhr || function () {
            //Would love to dump the ActiveX crap in here. Need IE 6 to die first.
            var xhr, i, progId;
            if (typeof XMLHttpRequest !== "undefined") {
                return new XMLHttpRequest();
            } else if (typeof ActiveXObject !== "undefined") {
                for (i = 0; i < 3; i += 1) {
                    progId = progIds[i];
                    try {
                        xhr = new ActiveXObject(progId);
                    } catch (e) {}

                    if (xhr) {
                        progIds = [progId];  // so faster next time
                        break;
                    }
                }
            }

            return xhr;
        },

        /**
         * Parses a resource name into its component parts. Resource names
         * look like: module/name.ext!strip, where the !strip part is
         * optional.
         * @param {String} name the resource name
         * @returns {Object} with properties "moduleName", "ext" and "strip"
         * where strip is a boolean.
         */
        parseName: function (name) {
            var modName, ext, temp,
                strip = false,
                index = name.indexOf("."),
                isRelative = name.indexOf('./') === 0 ||
                             name.indexOf('../') === 0;

            if (index !== -1 && (!isRelative || index > 1)) {
                modName = name.substring(0, index);
                ext = name.substring(index + 1, name.length);
            } else {
                modName = name;
            }

            temp = ext || modName;
            index = temp.indexOf("!");
            if (index !== -1) {
                //Pull off the strip arg.
                strip = temp.substring(index + 1) === "strip";
                temp = temp.substring(0, index);
                if (ext) {
                    ext = temp;
                } else {
                    modName = temp;
                }
            }

            return {
                moduleName: modName,
                ext: ext,
                strip: strip
            };
        },

        xdRegExp: /^((\w+)\:)?\/\/([^\/\\]+)/,

        /**
         * Is an URL on another domain. Only works for browser use, returns
         * false in non-browser environments. Only used to know if an
         * optimized .js version of a text resource should be loaded
         * instead.
         * @param {String} url
         * @returns Boolean
         */
        useXhr: function (url, protocol, hostname, port) {
            var uProtocol, uHostName, uPort,
                match = text.xdRegExp.exec(url);
            if (!match) {
                return true;
            }
            uProtocol = match[2];
            uHostName = match[3];

            uHostName = uHostName.split(':');
            uPort = uHostName[1];
            uHostName = uHostName[0];

            return (!uProtocol || uProtocol === protocol) &&
                   (!uHostName || uHostName.toLowerCase() === hostname.toLowerCase()) &&
                   ((!uPort && !uHostName) || uPort === port);
        },

        finishLoad: function (name, strip, content, onLoad) {
            content = strip ? text.strip(content) : content;
            if (masterConfig.isBuild) {
                buildMap[name] = content;
            }
            onLoad(content);
        },

        load: function (name, req, onLoad, config) {
            //Name has format: some.module.filext!strip
            //The strip part is optional.
            //if strip is present, then that means only get the string contents
            //inside a body tag in an HTML string. For XML/SVG content it means
            //removing the <?xml ...?> declarations so the content can be inserted
            //into the current doc without problems.

            // Do not bother with the work if a build and text will
            // not be inlined.
            if (config.isBuild && !config.inlineText) {
                onLoad();
                return;
            }

            masterConfig.isBuild = config.isBuild;

            var parsed = text.parseName(name),
                nonStripName = parsed.moduleName +
                    (parsed.ext ? '.' + parsed.ext : ''),
                url = req.toUrl(nonStripName),
                useXhr = (masterConfig.useXhr) ||
                         text.useXhr;

            // Do not load if it is an empty: url
            if (url.indexOf('empty:') === 0) {
                onLoad();
                return;
            }

            //Load the text. Use XHR if possible and in a browser.
            if (!hasLocation || useXhr(url, defaultProtocol, defaultHostName, defaultPort)) {
                text.get(url, function (content) {
                    text.finishLoad(name, parsed.strip, content, onLoad);
                }, function (err) {
                    if (onLoad.error) {
                        onLoad.error(err);
                    }
                });
            } else {
                //Need to fetch the resource across domains. Assume
                //the resource has been optimized into a JS module. Fetch
                //by the module name + extension, but do not include the
                //!strip part to avoid file system issues.
                req([nonStripName], function (content) {
                    text.finishLoad(parsed.moduleName + '.' + parsed.ext,
                                    parsed.strip, content, onLoad);
                });
            }
        },

        write: function (pluginName, moduleName, write, config) {
            if (buildMap.hasOwnProperty(moduleName)) {
                var content = text.jsEscape(buildMap[moduleName]);
                write.asModule(pluginName + "!" + moduleName,
                               "define(function () { return '" +
                                   content +
                               "';});\n");
            }
        },

        writeFile: function (pluginName, moduleName, req, write, config) {
            var parsed = text.parseName(moduleName),
                extPart = parsed.ext ? '.' + parsed.ext : '',
                nonStripName = parsed.moduleName + extPart,
                //Use a '.js' file name so that it indicates it is a
                //script that can be loaded across domains.
                fileName = req.toUrl(parsed.moduleName + extPart) + '.js';

            //Leverage own load() method to load plugin value, but only
            //write out values that do not have the strip argument,
            //to avoid any potential issues with ! in file names.
            text.load(nonStripName, req, function (value) {
                //Use own write() method to construct full module value.
                //But need to create shell that translates writeFile's
                //write() to the right interface.
                var textWrite = function (contents) {
                    return write(fileName, contents);
                };
                textWrite.asModule = function (moduleName, contents) {
                    return write.asModule(moduleName, fileName, contents);
                };

                text.write(pluginName, nonStripName, textWrite, config);
            }, config);
        }
    };

    if (masterConfig.env === 'node' || (!masterConfig.env &&
            typeof process !== "undefined" &&
            process.versions &&
            !!process.versions.node &&
            !process.versions['node-webkit'])) {
        //Using special require.nodeRequire, something added by r.js.
        fs = require.nodeRequire('fs');

        text.get = function (url, callback, errback) {
            try {
                var file = fs.readFileSync(url, 'utf8');
                //Remove BOM (Byte Mark Order) from utf8 files if it is there.
                if (file.indexOf('\uFEFF') === 0) {
                    file = file.substring(1);
                }
                callback(file);
            } catch (e) {
                errback(e);
            }
        };
    } else if (masterConfig.env === 'xhr' || (!masterConfig.env &&
            text.createXhr())) {
        text.get = function (url, callback, errback, headers) {
            var xhr = text.createXhr(), header;
            xhr.open('GET', url, true);

            //Allow plugins direct access to xhr headers
            if (headers) {
                for (header in headers) {
                    if (headers.hasOwnProperty(header)) {
                        xhr.setRequestHeader(header.toLowerCase(), headers[header]);
                    }
                }
            }

            //Allow overrides specified in config
            if (masterConfig.onXhr) {
                masterConfig.onXhr(xhr, url);
            }

            xhr.onreadystatechange = function (evt) {
                var status, err;
                //Do not explicitly handle errors, those should be
                //visible via console output in the browser.
                if (xhr.readyState === 4) {
                    status = xhr.status;
                    if (status > 399 && status < 600) {
                        //An http 4xx or 5xx error. Signal an error.
                        err = new Error(url + ' HTTP status: ' + status);
                        err.xhr = xhr;
                        errback(err);
                    } else {
                        callback(xhr.responseText);
                    }

                    if (masterConfig.onXhrComplete) {
                        masterConfig.onXhrComplete(xhr, url);
                    }
                }
            };
            xhr.send(null);
        };
    } else if (masterConfig.env === 'rhino' || (!masterConfig.env &&
            typeof Packages !== 'undefined' && typeof java !== 'undefined')) {
        //Why Java, why is this so awkward?
        text.get = function (url, callback) {
            var stringBuffer, line,
                encoding = "utf-8",
                file = new java.io.File(url),
                lineSeparator = java.lang.System.getProperty("line.separator"),
                input = new java.io.BufferedReader(new java.io.InputStreamReader(new java.io.FileInputStream(file), encoding)),
                content = '';
            try {
                stringBuffer = new java.lang.StringBuffer();
                line = input.readLine();

                // Byte Order Mark (BOM) - The Unicode Standard, version 3.0, page 324
                // http://www.unicode.org/faq/utf_bom.html

                // Note that when we use utf-8, the BOM should appear as "EF BB BF", but it doesn't due to this bug in the JDK:
                // http://bugs.sun.com/bugdatabase/view_bug.do?bug_id=4508058
                if (line && line.length() && line.charAt(0) === 0xfeff) {
                    // Eat the BOM, since we've already found the encoding on this file,
                    // and we plan to concatenating this buffer with others; the BOM should
                    // only appear at the top of a file.
                    line = line.substring(1);
                }

                if (line !== null) {
                    stringBuffer.append(line);
                }

                while ((line = input.readLine()) !== null) {
                    stringBuffer.append(lineSeparator);
                    stringBuffer.append(line);
                }
                //Make sure we return a JavaScript string and not a Java string.
                content = String(stringBuffer.toString()); //String
            } finally {
                input.close();
            }
            callback(content);
        };
    } else if (masterConfig.env === 'xpconnect' || (!masterConfig.env &&
            typeof Components !== 'undefined' && Components.classes &&
            Components.interfaces)) {
        //Avert your gaze!
        Cc = Components.classes,
        Ci = Components.interfaces;
        Components.utils['import']('resource://gre/modules/FileUtils.jsm');
        xpcIsWindows = ('@mozilla.org/windows-registry-key;1' in Cc);

        text.get = function (url, callback) {
            var inStream, convertStream, fileObj,
                readData = {};

            if (xpcIsWindows) {
                url = url.replace(/\//g, '\\');
            }

            fileObj = new FileUtils.File(url);

            //XPCOM, you so crazy
            try {
                inStream = Cc['@mozilla.org/network/file-input-stream;1']
                           .createInstance(Ci.nsIFileInputStream);
                inStream.init(fileObj, 1, 0, false);

                convertStream = Cc['@mozilla.org/intl/converter-input-stream;1']
                                .createInstance(Ci.nsIConverterInputStream);
                convertStream.init(inStream, "utf-8", inStream.available(),
                Ci.nsIConverterInputStream.DEFAULT_REPLACEMENT_CHARACTER);

                convertStream.readString(inStream.available(), readData);
                convertStream.close();
                inStream.close();
                callback(readData.value);
            } catch (e) {
                throw new Error((fileObj && fileObj.path || '') + ': ' + e);
            }
        };
    }
    return text;
});

define('text!html/login.html',[],function () { return '<div class="cell span2"><div class="padl5 padr5"><p>\t\neLaborate is an online work environment in which scholars can upload scans, transcribe and annotate text, and publish the results as on online text edition which is freely available to all users. \nAccess to the work environment is currently limited. In 2012 the tool will be adapted for deployment at European CLARIN Centers starting with the Dutch centers. http://www.clarin.nl/</p><p>eLaborate enables textual scholars to work on their edition on their own or in a group. Users only need to know how to use the internet. Project leaders can easily give reading and writing permission \nto members of their project team. They can select and add metadata fields and draw up a list of annotation categories they want to use. They can publish their edition online anytime they want. \nThe edition will then become available online in a sober design which will be elaborated on step by step in the next few years.</p><p><p>The work environment is developed by the Huygens Institute for the History of the Netherlands of the Royal Netherlands Academy of Arts and Sciences. \nThe new version was developed in the Alfalab project, making eLaborate3 the main tool available through the Textlab of <a href="http://alfalab.ehumanities.nl">Alfalab</a>.</p></p><p><p>Access to eLaborate is currently granted to scholars teaching a university course in text editing and to scholars planning an edition that is somehow related to the research programme of Huygens ING.\nFor more information: <a href="info-elaborate@huygens.knaw.nl">info-elaborate@huygens.knaw.nl</a></p></p><h2>eLaborate2</h2><p>Those still using eLaborate2 can find their work environment by following this link. http://www.e-laborate.nl/en/\nIn the course of 2012, projects using eLaborate2 will be migrated to eLaborate3. The eLaborate team will contact the project leaders to discuss the best time frame for the migration and to arrange instruction in eLaborate3.</p><h2>Links</h2><p>More information about the use of eLaborate3 will become available in due time (link naar handleiding-in-wording)</p><p> <p>Links to digital editions prepared in eLaborate2 are listed at <a href="http://www.e-laborate.nl/en/">http://www.e-laborate.nl/en/</a></p></p><p> <p>Information about tools for digital text analysis can be found in Alfalab&#39;s Textlab. <a href="http://alfalab.ehumanities.nl/textlab">http://alfalab.ehumanities.nl/textlab</a></p></p><p> <p>Information and news relating to textual scholarship in general (mostly in Dutch) can be enjoyed at <a href="http://www.textualscholarship.nl/">http://www.textualscholarship.nl/</a></p></p><p> <p>More about Huygens ING at <a href="http://www.huygens.knaw.nl/">http://www.huygens.knaw.nl/</a></p></p></div></div><div class="cell span1 alignright"><div class="padl5 padr5"><form class="login region"><ul><li><label>Username</label><input id="username" type="text" name="username" value="root"/></li><li><label>Password</label><input id="password" type="password" name="password" value="toor"/></li><li><input id="submit" type="submit" value="Login" style="width: 75px"/></li></ul></form></div></div>';});

(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define('views/login',['require','views/base','models/currentUser','text!html/login.html'],function(require) {
    var BaseView, Login, Templates, currentUser, _ref;
    BaseView = require('views/base');
    currentUser = require('models/currentUser');
    Templates = {
      'Login': require('text!html/login.html')
    };
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
        rtpl = _.template(Templates.Login);
        this.$el.html(rtpl());
        return this;
      };

      return Login;

    })(BaseView);
  });

}).call(this);

(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define('models/project/search',['require','models/base'],function(require) {
    var Models, Search, _ref;
    Models = {
      Base: require('models/base')
    };
    return Search = (function(_super) {
      __extends(Search, _super);

      function Search() {
        _ref = Search.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      return Search;

    })(Models.Base);
  });

}).call(this);

(function(e,t){typeof define=="function"&&define.amd?define('faceted-search',["jquery","underscore","backbone"],t):e.facetedsearch=t()})(this,function(e,t,n){var r,i,s;return function(e){function d(e,t){return h.call(e,t)}function v(e,t){var n,r,i,s,o,u,a,f,c,h,p=t&&t.split("/"),d=l.map,v=d&&d["*"]||{};if(e&&e.charAt(0)===".")if(t){p=p.slice(0,p.length-1),e=p.concat(e.split("/"));for(f=0;f<e.length;f+=1){h=e[f];if(h===".")e.splice(f,1),f-=1;else if(h===".."){if(f===1&&(e[2]===".."||e[0]===".."))break;f>0&&(e.splice(f-1,2),f-=2)}}e=e.join("/")}else e.indexOf("./")===0&&(e=e.substring(2));if((p||v)&&d){n=e.split("/");for(f=n.length;f>0;f-=1){r=n.slice(0,f).join("/");if(p)for(c=p.length;c>0;c-=1){i=d[p.slice(0,c).join("/")];if(i){i=i[r];if(i){s=i,o=f;break}}}if(s)break;!u&&v&&v[r]&&(u=v[r],a=f)}!s&&u&&(s=u,o=a),s&&(n.splice(0,o,s),e=n.join("/"))}return e}function m(t,r){return function(){return n.apply(e,p.call(arguments,0).concat([t,r]))}}function g(e){return function(t){return v(t,e)}}function y(e){return function(t){a[e]=t}}function b(n){if(d(f,n)){var r=f[n];delete f[n],c[n]=!0,t.apply(e,r)}if(!d(a,n)&&!d(c,n))throw new Error("No "+n);return a[n]}function w(e){var t,n=e?e.indexOf("!"):-1;return n>-1&&(t=e.substring(0,n),e=e.substring(n+1,e.length)),[t,e]}function E(e){return function(){return l&&l.config&&l.config[e]||{}}}var t,n,o,u,a={},f={},l={},c={},h=Object.prototype.hasOwnProperty,p=[].slice;o=function(e,t){var n,r=w(e),i=r[0];return e=r[1],i&&(i=v(i,t),n=b(i)),i?n&&n.normalize?e=n.normalize(e,g(t)):e=v(e,t):(e=v(e,t),r=w(e),i=r[0],e=r[1],i&&(n=b(i))),{f:i?i+"!"+e:e,n:e,pr:i,p:n}},u={require:function(e){return m(e)},exports:function(e){var t=a[e];return typeof t!="undefined"?t:a[e]={}},module:function(e){return{id:e,uri:"",exports:a[e],config:E(e)}}},t=function(t,n,r,i){var s,l,h,p,v,g=[],w;i=i||t;if(typeof r=="function"){n=!n.length&&r.length?["require","exports","module"]:n;for(v=0;v<n.length;v+=1){p=o(n[v],i),l=p.f;if(l==="require")g[v]=u.require(t);else if(l==="exports")g[v]=u.exports(t),w=!0;else if(l==="module")s=g[v]=u.module(t);else if(d(a,l)||d(f,l)||d(c,l))g[v]=b(l);else{if(!p.p)throw new Error(t+" missing "+l);p.p.load(p.n,m(i,!0),y(l),{}),g[v]=a[l]}}h=r.apply(a[t],g);if(t)if(s&&s.exports!==e&&s.exports!==a[t])a[t]=s.exports;else if(h!==e||!w)a[t]=h}else t&&(a[t]=r)},r=i=n=function(r,i,s,a,f){return typeof r=="string"?u[r]?u[r](i):b(o(r,i).f):(r.splice||(l=r,i.splice?(r=i,i=s,s=null):r=e),i=i||function(){},typeof s=="function"&&(s=a,a=f),a?t(e,r,i,s):setTimeout(function(){t(e,r,i,s)},4),n)},n.config=function(e){return l=e,l.deps&&n(l.deps,l.callback),n},r._defined=a,s=function(e,t,n){t.splice||(n=t,t=[]),!d(a,e)&&!d(f,e)&&(f[e]=[e,t,n])},s.amd={jQuery:!0}}(),s("../lib/almond/almond",function(){}),function(){var e={}.hasOwnProperty;s("hilib/functions/general",["require","jquery"],function(n){var r;return r=n("jquery"),{generateID:function(e){var t,n;e=e!=null&&e>0?e-1:7,t="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",n=t.charAt(Math.floor(Math.random()*52));while(e--)n+=t.charAt(Math.floor(Math.random()*t.length));return n},deepCopy:function(e){var t;return t=Array.isArray(e)?[]:{},r.extend(!0,t,e)},timeoutWithReset:function(){var e;return e=0,function(t,n){return clearTimeout(e),e=setTimeout(n,t)}}(),highlighter:function(e){var t,n,i;return e==null&&(e={}),t=e.className,i=e.tagName,t==null&&(t="hilite"),i==null&&(i="span"),n=null,{on:function(e){var r,s,o;return o=e.startNode,r=e.endNode,s=document.createRange(),s.setStartAfter(o),s.setEndBefore(r),n=document.createElement(i),n.className=t,n.appendChild(s.extractContents()),s.insertNode(n)},off:function(){return r(n).replaceWith(function(){return r(this).contents()})}}},position:function(e,t){var n,r;n=0,r=0;while(e!==t)n+=e.offsetLeft,r+=e.offsetTop,e=e.offsetParent;return{left:n,top:r}},boundingBox:function(e){var t;return t=r(e).offset(),t.width=e.clientWidth,t.height=e.clientHeight,t.right=t.left+t.width,t.bottom=t.top+t.height,t},isDescendant:function(e,t){var n;n=t.parentNode;while(n!=null){if(n===e)return!0;n=n.parentNode}return!1},removeFromArray:function(e,t){var n;return n=e.indexOf(t),e.splice(n,1)},escapeRegExp:function(e){return e.replace(/[-\/\\^$*+?.()|[\]{}]/g,"\\$&")},flattenObject:function(n,r,i){var s,o;r==null&&(r={}),i==null&&(i="");for(s in n){if(!e.call(n,s))continue;o=n[s],t.isObject(o)&&!t.isArray(o)&&!t.isFunction(o)?this.flattenObject(o,r,i+s+"."):r[i+s]=o}return r},compareJSON:function(n,r){var i,s,o;s={};for(i in n){if(!e.call(n,i))continue;o=n[i],r.hasOwnProperty(i)||(s[i]="removed")}for(i in r){if(!e.call(r,i))continue;o=r[i],n.hasOwnProperty(i)?t.isArray(o)||this.isObjectLiteral(o)?t.isEqual(n[i],r[i])||(s[i]=r[i]):n[i]!==r[i]&&(s[i]=r[i]):s[i]="added"}return s},isObjectLiteral:function(e){var t;if(e==null||typeof e!="object")return!1;t=e;while(Object.getPrototypeOf(t=Object.getPrototypeOf(t))!==null)0;return Object.getPrototypeOf(e)===t},getScrollPercentage:function(e){var t,n,r,i;return n=e.scrollTop,i=e.scrollHeight-e.clientHeight,t=e.scrollLeft,r=e.scrollWidth-e.clientWidth,{top:Math.floor(n/i*100),left:Math.floor(t/r*100)}},setScrollPercentage:function(e,t){var n,r,i,s;return r=e.clientWidth,s=e.scrollWidth,n=e.clientHeight,i=e.scrollHeight,e.scrollTop=(i-n)*t.top/100,e.scrollLeft=(s-r)*t.left/100},checkCheckboxes:function(e,t,n){var r,i,s,o,u;t==null&&(t=!0),n==null&&(n=document),i=n.querySelectorAll(e),u=[];for(s=0,o=i.length;s<o;s++)r=i[s],u.push(r.checked=t);return u},setCursorToEnd:function(e){var t,n;return t=document.createRange(),t.selectNodeContents(e),t.collapse(),n=window.getSelection(),n.removeAllRanges(),n.addRange(t),e.focus()}}})}.call(this),function(){s("config",["require"],function(e){return{baseUrl:"",searchPath:"",search:!0,token:null,queryOptions:{},facetNameMap:{}}})}.call(this),function(){s("hilib/functions/string",["require","jquery"],function(e){var t;return t=e("jquery"),{ucfirst:function(e){return e.charAt(0).toUpperCase()+e.slice(1)},slugify:function(e){var t,n,r,i;t="àáäâèéëêìíïîòóöôùúüûñç·/_:;",i="aaaaeeeeiiiioooouuuunc-----",e=e.trim().toLowerCase(),r=e.length;while(r--)n=t.indexOf(e[r]),n!==-1&&(e=e.substr(0,r)+i[n]+e.substr(r+1));return e.replace(/[^a-z0-9 -]/g,"").replace(/\s+|\-+/g,"-").replace(/^\-+|\-+$/g,"")},stripTags:function(e){return t("<span />").html(e).text()},onlyNumbers:function(e){return e.replace(/[^\d.]/g,"")}}})}.call(this),function(){s("hilib/managers/pubsub",["require","backbone"],function(e){var t;return t=e("backbone"),{subscribe:function(e,n){return this.listenTo(t,e,n)},publish:function(){return t.trigger.apply(t,arguments)}}})}.call(this),function(){var e={}.hasOwnProperty,n=function(t,n){function i(){this.constructor=t}for(var r in n)e.call(n,r)&&(t[r]=n[r]);return i.prototype=n.prototype,t.prototype=new i,t.__super__=n.prototype,t};s("models/base",["require","backbone","hilib/managers/pubsub"],function(e){var r,i,s,o;return r=e("backbone"),s=e("hilib/managers/pubsub"),i=function(e){function r(){return o=r.__super__.constructor.apply(this,arguments),o}return n(r,e),r.prototype.initialize=function(){return t.extend(this,s)},r}(r.Model)})}.call(this),function(){var e={}.hasOwnProperty,t=function(t,n){function i(){this.constructor=t}for(var r in n)e.call(n,r)&&(t[r]=n[r]);return i.prototype=n.prototype,t.prototype=new i,t.__super__=n.prototype,t};s("models/facet",["require","config","models/base"],function(e){var r,i,s,o;return s=e("config"),i={Base:e("models/base")},r=function(e){function n(){return o=n.__super__.constructor.apply(this,arguments),o}return t(n,e),n.prototype.idAttribute="name",n.prototype.parse=function(e){if(e.title==null||e.title===""&&s.facetNameMap[e.name]!=null)e.title=s.facetNameMap[e.name];return e},n}(n.Model)})}.call(this),function(){var e={}.hasOwnProperty,t=function(t,n){function i(){this.constructor=t}for(var r in n)e.call(n,r)&&(t[r]=n[r]);return i.prototype=n.prototype,t.prototype=new i,t.__super__=n.prototype,t};s("models/boolean",["require","models/facet"],function(e){var n,r,i;return r={Facet:e("models/facet")},n=function(e){function n(){return i=n.__super__.constructor.apply(this,arguments),i}return t(n,e),n.prototype.set=function(e,t){return e==="options"?t=this.parseOptions(t):e.options!=null&&(e.options=this.parseOptions(e.options)),n.__super__.set.call(this,e,t)},n.prototype.parseOptions=function(e){return e.length===1&&e.push({name:(!JSON.parse(e[0].name)).toString(),count:0}),e},n}(r.Facet)})}.call(this),function(){var e={}.hasOwnProperty,n=function(t,n){function i(){this.constructor=t}for(var r in n)e.call(n,r)&&(t[r]=n[r]);return i.prototype=n.prototype,t.prototype=new i,t.__super__=n.prototype,t};s("views/base",["require","backbone","hilib/managers/pubsub"],function(e){var r,i,s,o;return r=e("backbone"),s=e("hilib/managers/pubsub"),i=function(e){function r(){return o=r.__super__.constructor.apply(this,arguments),o}return n(r,e),r.prototype.initialize=function(){return t.extend(this,s)},r}(r.View)})}.call(this),s("text",["module"],function(e){var t,n,r,s,o,u=["Msxml2.XMLHTTP","Microsoft.XMLHTTP","Msxml2.XMLHTTP.4.0"],a=/^\s*<\?xml(\s)+version=[\'\"](\d)*.(\d)*[\'\"](\s)*\?>/im,f=/<body[^>]*>\s*([\s\S]+)\s*<\/body>/im,l=typeof location!="undefined"&&location.href,c=l&&location.protocol&&location.protocol.replace(/\:/,""),h=l&&location.hostname,p=l&&(location.port||undefined),d={},v=e.config&&e.config()||{};t={version:"2.0.10",strip:function(e){if(e){e=e.replace(a,"");var t=e.match(f);t&&(e=t[1])}else e="";return e},jsEscape:function(e){return e.replace(/(['\\])/g,"\\$1").replace(/[\f]/g,"\\f").replace(/[\b]/g,"\\b").replace(/[\n]/g,"\\n").replace(/[\t]/g,"\\t").replace(/[\r]/g,"\\r").replace(/[\u2028]/g,"\\u2028").replace(/[\u2029]/g,"\\u2029")},createXhr:v.createXhr||function(){var e,t,n;if(typeof XMLHttpRequest!="undefined")return new XMLHttpRequest;if(typeof ActiveXObject!="undefined")for(t=0;t<3;t+=1){n=u[t];try{e=new ActiveXObject(n)}catch(r){}if(e){u=[n];break}}return e},parseName:function(e){var t,n,r,i=!1,s=e.indexOf("."),o=e.indexOf("./")===0||e.indexOf("../")===0;return s!==-1&&(!o||s>1)?(t=e.substring(0,s),n=e.substring(s+1,e.length)):t=e,r=n||t,s=r.indexOf("!"),s!==-1&&(i=r.substring(s+1)==="strip",r=r.substring(0,s),n?n=r:t=r),{moduleName:t,ext:n,strip:i}},xdRegExp:/^((\w+)\:)?\/\/([^\/\\]+)/,useXhr:function(e,n,r,i){var s,o,u,a=t.xdRegExp.exec(e);return a?(s=a[2],o=a[3],o=o.split(":"),u=o[1],o=o[0],(!s||s===n)&&(!o||o.toLowerCase()===r.toLowerCase())&&(!u&&!o||u===i)):!0},finishLoad:function(e,n,r,i){r=n?t.strip(r):r,v.isBuild&&(d[e]=r),i(r)},load:function(e,n,r,i){if(i.isBuild&&!i.inlineText){r();return}v.isBuild=i.isBuild;var s=t.parseName(e),o=s.moduleName+(s.ext?"."+s.ext:""),u=n.toUrl(o),a=v.useXhr||t.useXhr;if(u.indexOf("empty:")===0){r();return}!l||a(u,c,h,p)?t.get(u,function(n){t.finishLoad(e,s.strip,n,r)},function(e){r.error&&r.error(e)}):n([o],function(e){t.finishLoad(s.moduleName+"."+s.ext,s.strip,e,r)})},write:function(e,n,r,i){if(d.hasOwnProperty(n)){var s=t.jsEscape(d[n]);r.asModule(e+"!"+n,"define(function () { return '"+s+"';});\n")}},writeFile:function(e,n,r,i,s){var o=t.parseName(n),u=o.ext?"."+o.ext:"",a=o.moduleName+u,f=r.toUrl(o.moduleName+u)+".js";t.load(a,r,function(n){var r=function(e){return i(f,e)};r.asModule=function(e,t){return i.asModule(e,f,t)},t.write(e,a,r,s)},s)}};if(v.env==="node"||!v.env&&typeof process!="undefined"&&process.versions&&!!process.versions.node&&!process.versions["node-webkit"])n=i.nodeRequire("fs"),t.get=function(e,t,r){try{var i=n.readFileSync(e,"utf8");i.indexOf("﻿")===0&&(i=i.substring(1)),t(i)}catch(s){r(s)}};else if(v.env==="xhr"||!v.env&&t.createXhr())t.get=function(e,n,r,i){var s=t.createXhr(),o;s.open("GET",e,!0);if(i)for(o in i)i.hasOwnProperty(o)&&s.setRequestHeader(o.toLowerCase(),i[o]);v.onXhr&&v.onXhr(s,e),s.onreadystatechange=function(t){var i,o;s.readyState===4&&(i=s.status,i>399&&i<600?(o=new Error(e+" HTTP status: "+i),o.xhr=s,r(o)):n(s.responseText),v.onXhrComplete&&v.onXhrComplete(s,e))},s.send(null)};else if(v.env==="rhino"||!v.env&&typeof Packages!="undefined"&&typeof java!="undefined")t.get=function(e,t){var n,r,i="utf-8",s=new java.io.File(e),o=java.lang.System.getProperty("line.separator"),u=new java.io.BufferedReader(new java.io.InputStreamReader(new java.io.FileInputStream(s),i)),a="";try{n=new java.lang.StringBuffer,r=u.readLine(),r&&r.length()&&r.charAt(0)===65279&&(r=r.substring(1)),r!==null&&n.append(r);while((r=u.readLine())!==null)n.append(o),n.append(r);a=String(n.toString())}finally{u.close()}t(a)};else if(v.env==="xpconnect"||!v.env&&typeof Components!="undefined"&&Components.classes&&Components.interfaces)r=Components.classes,s=Components.interfaces,Components.utils["import"]("resource://gre/modules/FileUtils.jsm"),o="@mozilla.org/windows-registry-key;1"in r,t.get=function(e,t){var n,i,u,a={};o&&(e=e.replace(/\//g,"\\")),u=new FileUtils.File(e);try{n=r["@mozilla.org/network/file-input-stream;1"].createInstance(s.nsIFileInputStream),n.init(u,1,0,!1),i=r["@mozilla.org/intl/converter-input-stream;1"].createInstance(s.nsIConverterInputStream),i.init(n,"utf-8",n.available(),s.nsIConverterInputStream.DEFAULT_REPLACEMENT_CHARACTER),i.readString(n.available(),a),i.close(),n.close(),t(a.value)}catch(f){throw new Error((u&&u.path||"")+": "+f)}};return t}),s("text!html/facet.html",[],function(){return'<div class="placeholder pad4"><header><h3 data-name="<%= name %>"><%= title %></h3><small>&#8711;</small><div class="options"></div></header><div class="body"></div></div>'}),function(){var n={}.hasOwnProperty,r=function(e,t){function i(){this.constructor=e}for(var r in t)n.call(t,r)&&(e[r]=t[r]);return i.prototype=t.prototype,e.prototype=new i,e.__super__=t.prototype,e};s("views/facet",["require","views/base","text!html/facet.html"],function(n){var i,s,o,u;return o={Base:n("views/base")},s={Facet:n("text!html/facet.html")},i=function(n){function i(){return u=i.__super__.constructor.apply(this,arguments),u}return r(i,n),i.prototype.initialize=function(){return i.__super__.initialize.apply(this,arguments)},i.prototype.events=function(){return{"click h3":"toggleBody","click header small":"toggleOptions"}},i.prototype.toggleOptions=function(e){return this.$("header small").toggleClass("active"),this.$("header .options").slideToggle(),this.$(".options .listsearch").focus()},i.prototype.toggleBody=function(t){return e(t.currentTarget).parents(".facet").find(".body").slideToggle()},i.prototype.render=function(){var e;return e=t.template(s.Facet,this.model.attributes),this.$el.html(e),this},i.prototype.update=function(e){},i}(o.Base)})}.call(this),s("text!html/facet/boolean.body.html",[],function(){return'<div class="options"><ul><% _.each(options, function(option) { %><li class="option"><div class="row span6"><div class="cell span5"><input id="<%= name %>_<%= option.name %>" name="<%= name %>_<%= option.name %>" type="checkbox" data-value="<%= option.name %>"><label for="<%= name %>_<%= option.name %>"><%= ucfirst(option.name) %></label></div><div class="cell span1 alignright"><div class="count"><%= option.count %></div></div></div></li><% }); %></ul></div>'}),function(){var e={}.hasOwnProperty,n=function(t,n){function i(){this.constructor=t}for(var r in n)e.call(n,r)&&(t[r]=n[r]);return i.prototype=n.prototype,t.prototype=new i,t.__super__=n.prototype,t};s("views/facets/boolean",["require","hilib/functions/string","models/boolean","views/facet","text!html/facet/boolean.body.html"],function(e){var r,i,s,o,u,a;return s=e("hilib/functions/string"),i={Boolean:e("models/boolean")},u={Facet:e("views/facet")},o={Body:e("text!html/facet/boolean.body.html")},r=function(e){function r(){return a=r.__super__.constructor.apply(this,arguments),a}return n(r,e),r.prototype.className="facet boolean",r.prototype.events=function(){return t.extend({},r.__super__.events.apply(this,arguments),{'change input[type="checkbox"]':"checkChanged"})},r.prototype.checkChanged=function(e){return this.trigger("change",{facetValue:{name:this.model.get("name"),values:t.map(this.$("input:checked"),function(e){return e.getAttribute("data-value")})}})},r.prototype.initialize=function(e){return r.__super__.initialize.apply(this,arguments),this.model=new i.Boolean(e.attrs,{parse:!0}),this.listenTo(this.model,"change:options",this.render),this.render()},r.prototype.render=function(){var e;return r.__super__.render.apply(this,arguments),e=t.template(o.Body,t.extend(this.model.attributes,{ucfirst:s.ucfirst})),this.$(".body").html(e),this.$("header small").hide(),this},r.prototype.update=function(e){return this.model.set("options",e)},r.prototype.reset=function(){return this.render()},r}(u.Facet)})}.call(this),function(){var e={}.hasOwnProperty,n=function(t,n){function i(){this.constructor=t}for(var r in n)e.call(n,r)&&(t[r]=n[r]);return i.prototype=n.prototype,t.prototype=new i,t.__super__=n.prototype,t};s("models/date",["require","models/facet"],function(e){var r,i,s;return i={Facet:e("models/facet")},r=function(e){function r(){return s=r.__super__.constructor.apply(this,arguments),s}return n(r,e),r.prototype.parse=function(e){return e.options=t.map(t.pluck(e.options,"name"),function(e){return e.substr(0,4)}),e.options=t.unique(e.options),e.options.sort(),e},r}(i.Facet)})}.call(this),s("text!html/facet/date.html",[],function(){return'<header><h3 data-name="<%= name %>"><%= title %></h3></header><div class="body"><label>From:</label><select><% _.each(options, function(option) { %><option><%= option %></option><% }); %></select><label>To:</label><select><% _.each(options.reverse(), function(option) { %><option><%= option %></option><% }); %></select></div>'}),function(){var e={}.hasOwnProperty,n=function(t,n){function i(){this.constructor=t}for(var r in n)e.call(n,r)&&(t[r]=n[r]);return i.prototype=n.prototype,t.prototype=new i,t.__super__=n.prototype,t};s("views/facets/date",["require","hilib/functions/string","models/date","views/facet","text!html/facet/date.html"],function(e){var r,i,s,o,u,a;return s=e("hilib/functions/string"),i={Date:e("models/date")},u={Facet:e("views/facet")},o={Date:e("text!html/facet/date.html")},r=function(e){function r(){return a=r.__super__.constructor.apply(this,arguments),a}return n(r,e),r.prototype.className="facet date",r.prototype.initialize=function(e){return r.__super__.initialize.apply(this,arguments),this.model=new i.Date(e.attrs,{parse:!0}),this.listenTo(this.model,"change:options",this.render),this.render()},r.prototype.render=function(){var e;return r.__super__.render.apply(this,arguments),e=t.template(o.Date,t.extend(this.model.attributes,{ucfirst:s.ucfirst})),this.$(".placeholder").html(e),this},r.prototype.update=function(e){},r.prototype.reset=function(){},r}(u.Facet)})}.call(this),function(){var e={}.hasOwnProperty,t=function(t,n){function i(){this.constructor=t}for(var r in n)e.call(n,r)&&(t[r]=n[r]);return i.prototype=n.prototype,t.prototype=new i,t.__super__=n.prototype,t};s("models/list",["require","models/facet"],function(e){var n,r,i;return r={Facet:e("models/facet")},n=function(e){function n(){return i=n.__super__.constructor.apply(this,arguments),i}return t(n,e),n}(r.Facet)})}.call(this),function(){var e={}.hasOwnProperty,t=function(t,n){function i(){this.constructor=t}for(var r in n)e.call(n,r)&&(t[r]=n[r]);return i.prototype=n.prototype,t.prototype=new i,t.__super__=n.prototype,t};s("models/list.option",["require","models/base"],function(e){var n,r,i;return r={Base:e("models/base")},n=function(e){function n(){return i=n.__super__.constructor.apply(this,arguments),i}return t(n,e),n.prototype.idAttribute="name",n.prototype.defaults=function(){return{name:"",count:0,total:0,checked:!1}},n.prototype.parse=function(e){return e.total=e.count,e},n}(r.Base)})}.call(this),function(){s("collections/base",["require","backbone"],function(e){var t;return t=e("backbone"),t.Collection})}.call(this),function(){var e={}.hasOwnProperty,n=function(t,n){function i(){this.constructor=t}for(var r in n)e.call(n,r)&&(t[r]=n[r]);return i.prototype=n.prototype,t.prototype=new i,t.__super__=n.prototype,t};s("collections/list.options",["require","models/list.option","collections/base"],function(e){var r,i,s,o;return s={Option:e("models/list.option")},r={Base:e("collections/base")},i=function(e){function r(){return o=r.__super__.constructor.apply(this,arguments),o}return n(r,e),r.prototype.model=s.Option,r.prototype.parse=function(e){return e},r.prototype.comparator=function(e){return-1*parseInt(e.get("count"),10)},r.prototype.revert=function(){var e=this;return this.each(function(e){return e.set("checked",!1,{silent:!0})}),this.trigger("change")},r.prototype.updateOptions=function(e){var n=this;return e==null&&(e=[]),this.each(function(e){return e.set("count",0,{silent:!0})}),t.each(e,function(e){var t;return t=n.get(e.name),t.set("count",e.count,{silent:!0})}),this.sort()},r}(r.Base)})}.call(this),s("text!html/facet/list.options.html",[],function(){return'<ul><% _.each(options, function(option) { %>\n<% var randomId = generateID(); %>\n<% var checked = (option.get(\'checked\')) ? \'checked\' : \'\'; %>\n<% var count = (option.get(\'count\') === 0) ? option.get(\'total\') : option.get(\'count\'); %>\n<% var labelText = (option.id === \':empty\') ? \'<i>(empty)</i>\' : option.id %><li class="option"><div data-count="<%= option.get(\'count\') %>" class="row span6"><div class="cell span5"><input id="<%= randomId %>" name="<%= randomId %>" type="checkbox" data-value="<%= option.id %>" <%= checked %>><label for="<%= randomId %>"><%= labelText %></label></div><div class="cell span1 alignright"><div class="count"><%= count %></div></div></div></li><% }); %></ul>'}),function(){var e={}.hasOwnProperty,n=function(t,n){function i(){this.constructor=t}for(var r in n)e.call(n,r)&&(t[r]=n[r]);return i.prototype=n.prototype,t.prototype=new i,t.__super__=n.prototype,t};s("views/facets/list.options",["require","hilib/functions/general","views/base","models/list","text!html/facet/list.options.html"],function(e){var r,i,s,o,u,a;return r=e("hilib/functions/general"),u={Base:e("views/base")},s={List:e("models/list")},o={Options:e("text!html/facet/list.options.html")},i=function(e){function i(){return a=i.__super__.constructor.apply(this,arguments),a}return n(i,e),i.prototype.filtered_items=[],i.prototype.events=function(){return{'change input[type="checkbox"]':"checkChanged"}},i.prototype.checkChanged=function(e){var n;return n=e.currentTarget.getAttribute("data-value"),this.collection.get(n).set("checked",e.currentTarget.checked),this.trigger("change",{facetValue:{name:this.options.facetName,values:t.map(this.$("input:checked"),function(e){return e.getAttribute("data-value")})}})},i.prototype.initialize=function(){return i.__super__.initialize.apply(this,arguments),this.listenTo(this.collection,"sort",this.render),this.listenTo(this.collection,"change",this.render),this.render()},i.prototype.render=function(){var e,n;return e=this.filtered_items.length>0?this.filtered_items:this.collection.models,n=t.template(o.Options,{options:e,generateID:r.generateID}),this.$el.html(n)},i.prototype.filterOptions=function(e){var t;return t=new RegExp(e,"i"),this.filtered_items=this.collection.filter(function(e){return t.test(e.id)}),this.trigger("filter:finished"),this.render()},i}(u.Base)})}.call(this),s("text!html/facet/list.menu.html",[],function(){return'<div class="row span4 align middle"><div class="cell span2"><input type="text" name="listsearch" class="listsearch"/></div><div class="cell span1"><small class="optioncount"></small></div><div class="cell span1 alignright"><nav><ul><li class="all">All </li><li class="none">None</li></ul></nav></div></div>'}),s("text!html/facet/list.body.html",[],function(){return'<div class="options"><ul></ul></div>'}),function(){var e={}.hasOwnProperty,n=function(t,n){function i(){this.constructor=t}for(var r in n)e.call(n,r)&&(t[r]=n[r]);return i.prototype=n.prototype,t.prototype=new i,t.__super__=n.prototype,t};s("views/facets/list",["require","hilib/functions/general","models/list","collections/list.options","views/facet","views/facets/list.options","text!html/facet/list.menu.html","text!html/facet/list.body.html"],function(e){var r,i,s,o,u,a,f;return i=e("hilib/functions/general"),o={List:e("models/list")},r={Options:e("collections/list.options")},a={Facet:e("views/facet"),Options:e("views/facets/list.options")},u={Menu:e("text!html/facet/list.menu.html"),Body:e("text!html/facet/list.body.html")},s=function(e){function i(){return f=i.__super__.constructor.apply(this,arguments),f}return n(i,e),i.prototype.checked=[],i.prototype.filtered_items=[],i.prototype.className="facet list",i.prototype.events=function(){return t.extend({},i.__super__.events.apply(this,arguments),{"click li.all":"selectAll","click li.none":"deselectAll","keyup input.listsearch":function(e){return this.optionsView.filterOptions(e.currentTarget.value)}})},i.prototype.selectAll=function(){var e,t,n,r,i;t=this.el.querySelectorAll('input[type="checkbox"]'),i=[];for(n=0,r=t.length;n<r;n++)e=t[n],i.push(e.checked=!0);return i},i.prototype.deselectAll=function(){var e,t,n,r,i;t=this.el.querySelectorAll('input[type="checkbox"]'),i=[];for(n=0,r=t.length;n<r;n++)e=t[n],i.push(e.checked=!1);return i},i.prototype.initialize=function(e){return this.options=e,i.__super__.initialize.apply(this,arguments),this.model=new o.List(this.options.attrs,{parse:!0}),this.render()},i.prototype.render=function(){var e,n,s,o=this;return i.__super__.render.apply(this,arguments),n=t.template(u.Menu,this.model.attributes),e=t.template(u.Body,this.model.attributes),this.$(".options").html(n),this.$(".body").html(e),s=new r.Options(this.options.attrs.options,{parse:!0}),this.optionsView=new a.Options({el:this.$(".body .options"),collection:s,facetName:this.model.get("name")}),this.listenTo(this.optionsView,"filter:finished",this.renderFilteredOptionCount),this.listenTo(this.optionsView,"change",function(e){return o.trigger("change",e)}),this},i.prototype.renderFilteredOptionCount=function(){var e,t;return t=this.optionsView.filtered_items.length,e=this.optionsView.collection.length,t===0||t===e?(this.$("header .options .listsearch").addClass("nonefound"),this.$("header small.optioncount").html("")):(this.$("header .options .listsearch").removeClass("nonefound"),this.$("header small.optioncount").html(t+" of "+e)),this},i.prototype.update=function(e){return this.optionsView.collection.updateOptions(e)},i.prototype.reset=function(){return this.optionsView.collection.revert()},i}(a.Facet)})}.call(this),function(){s("facetviewmap",["require","views/facets/boolean","views/facets/date","views/facets/list"],function(e){return{BOOLEAN:e("views/facets/boolean"),DATE:e("views/facets/date"),LIST:e("views/facets/list")}})}.call(this),function(){s("hilib/managers/ajax",["require","jquery"],function(e){var t;return t=e("jquery"),t.support.cors=!0,{token:null,get:function(e){return this.fire("get",e)},post:function(e){return this.fire("post",e)},put:function(e){return this.fire("put",e)},fire:function(e,n){var r,i=this;return r={type:e,dataType:"json",contentType:"application/json; charset=utf-8",processData:!1,crossDomain:!0},this.token!=null&&(r.beforeSend=function(e){return e.setRequestHeader("Authorization","SimpleAuth "+i.token)}),t.ajax(t.extend(r,n))}}})}.call(this),function(){var e={}.hasOwnProperty,n=function(t,n){function i(){this.constructor=t}for(var r in n)e.call(n,r)&&(t[r]=n[r]);return i.prototype=n.prototype,t.prototype=new i,t.__super__=n.prototype,t};s("models/main",["require","config","hilib/managers/ajax","models/base"],function(e){var r,i,s,o,u;return o=e("config"),s=e("hilib/managers/ajax"),i={Base:e("models/base")},r=function(e){function r(){return u=r.__super__.constructor.apply(this,arguments),u}return n(r,e),r.prototype.serverResponse={},r.prototype.defaults=function(){return{facetValues:[]}},r.prototype.initialize=function(e,t){var n=this;this.attrs=e,r.__super__.initialize.apply(this,arguments),this.on("change",function(){return n.fetch()});if(this.has("resultRows"))return this.resultRows=this.get("resultRows"),this.unset("resultRows")},r.prototype.fetch=function(e){var t=this;return e==null&&(e={}),e.error=function(e,t,n){return console.log("fetching results failed",e,t,n)},r.__super__.fetch.apply(this,arguments)},r.prototype.parse=function(){return{}},r.prototype.set=function(e,n){var i;return e.facetValue!=null&&(i=t.reject(this.get("facetValues"),function(t){return t.name===e.facetValue.name}),e.facetValue.values.length&&i.push(e.facetValue),e.facetValues=i,delete e.facetValue),r.__super__.set.call(this,e,n)},r.prototype.handleResponse=function(e){return this.serverResponse=e,this.publish("results:change",e,this.attributes)},r.prototype.setCursor=function(e){var t,n=this;if(this.serverResponse[e])return t=s.get({url:this.serverResponse[e]}),t.done(function(e){return n.handleResponse(e)}),t.fail(function(){return console.error("setCursor failed")})},r.prototype.sync=function(e,t,n){var r,i=this;if(e==="read")return s.token=o.token,r=s.post({url:o.baseUrl+o.searchPath,data:JSON.stringify(this.attributes),dataType:"text"}),r.done(function(e,t,r){var o,u;if(r.status===201)return o=r.getResponseHeader("Location"),i.resultRows!=null&&(o+="?rows="+i.resultRows),u=s.get({url:o}),u.done(function(e,t,r){return i.handleResponse(e),n.success(e)})}),r.fail(function(e,t,n){if(e.status===401)return i.publish("unauthorized")})},r.prototype.reset=function(){return this.clear({silent:!0}),this.set(this.defaults(),{silent:!0}),this.set(this.attrs,{silent:!0}),this.fetch()},r}(i.Base)})}.call(this),function(){var e={}.hasOwnProperty,t=function(t,n){function i(){this.constructor=t}for(var r in n)e.call(n,r)&&(t[r]=n[r]);return i.prototype=n.prototype,t.prototype=new i,t.__super__=n.prototype,t};s("models/search",["require","models/base"],function(e){var n,r,i;return n={Base:e("models/base")},r=function(e){function n(){return i=n.__super__.constructor.apply(this,arguments),i}return t(n,e),n.prototype.defaults=function(){return{searchOptions:{term:"*",caseSensitive:!1}}},n}(n.Base)})}.call(this),s("text!html/facet/search.menu.html",[],function(){return'<div class="row span1 align middle"><div class="cell span1 casesensitive"><input id="cb_casesensitive" type="checkbox" name="cb_casesensitive" data-prop="caseSensitive"/><label for="cb_casesensitive">Match case</label></div></div><% if (\'searchInAnnotations\' in searchOptions || \'searchInTranscriptions\' in searchOptions) { %>\n<% cb_searchin_annotations_checked = (\'searchInAnnotations\' in searchOptions && searchOptions.searchInAnnotations) ? \' checked \' : \'\' %>\n<% cb_searchin_transcriptions_checked = (\'searchInTranscriptions\' in searchOptions && searchOptions.searchInTranscriptions) ? \' checked \' : \'\' %><div class="row span1"><div class="cell span1"><h4>Search in</h4><ul class="searchins"><% if (\'searchInAnnotations\' in searchOptions) { %><li class="searchin"><input id="cb_searchin_annotations" type="checkbox" data-prop="searchInAnnotations"<%= cb_searchin_annotations_checked %>><label for="cb_searchin_annotations">Annotations</label></li><% } %>\n<% if (\'searchInTranscriptions\' in searchOptions) { %><li class="searchin"><input id="cb_searchin_transcriptions" type="checkbox" data-prop="searchInTranscriptions"<%= cb_searchin_transcriptions_checked %>><label for="cb_searchin_transcriptions">Transcriptions</label></li><% } %></ul></div></div><% } %>\n<% if (\'textLayers\' in searchOptions) { %><div class="row span1"><div class="cell span1"><h4>Text layers</h4><ul class="textlayers"><% _.each(searchOptions.textLayers, function(tl) { %><li class="textlayer"><input id="cb_textlayer_<%= tl %>" type="checkbox" data-proparr="textLayers"/><label for="cb_textlayer_<%= tl %>"><%= tl %></label></li><% }); %></ul></div></div><% } %>'}),s("text!html/facet/search.body.html",[],function(){return'<div class="row span4 align middle"><div class="cell span3"><div class="padr4"><input id="search" type="text" name="search"/></div></div><div class="cell span1"><button class="search">Search</button></div></div>'}),function(){var n={}.hasOwnProperty,r=function(e,t){function i(){this.constructor=e}for(var r in t)n.call(t,r)&&(e[r]=t[r]);return i.prototype=t.prototype,e.prototype=new i,e.__super__=t.prototype,e};s("views/search",["require","config","models/search","views/facet","text!html/facet/search.menu.html","text!html/facet/search.body.html"],function(n){var i,s,o,u,a,f;return a=n("config"),i={Search:n("models/search")},u={Facet:n("views/facet")},o={Menu:n("text!html/facet/search.menu.html"),Body:n("text!html/facet/search.body.html")},s=function(n){function s(){return f=s.__super__.constructor.apply(this,arguments),f}return r(s,n),s.prototype.className="facet search",s.prototype.events=function(){return t.extend({},s.__super__.events.apply(this,arguments),{"click button.search":"search"})},s.prototype.search=function(e){var t=this;return e.preventDefault(),this.$("#search").addClass("loading"),this.trigger("change",{term:this.$("#search").val()}),this.subscribe("results:change",function(){return t.$("#search").removeClass("loading")})},s.prototype.initialize=function(e){return s.__super__.initialize.apply(this,arguments),this.model=new i.Search({searchOptions:a.textSearchOptions,title:"Text search",name:"text_search"}),this.render()},s.prototype.render=function(){var n,r,i,u=this;return s.__super__.render.apply(this,arguments),i=t.template(o.Menu,this.model.attributes),n=t.template(o.Body,this.model.attributes),this.$(".options").html(i),this.$(".body").html(n),r=this.$(":checkbox"),r.change(function(n){return t.each(r,function(t){var n,r;r=t.getAttribute("data-prop");if(r!=null)return n=e(t).attr("checked")==="checked"?!0:!1,u.model.set(r,n)})}),this},s}(u.Facet)})}.call(this),s("text!html/faceted-search.html",[],function(){return'\n<div class="faceted-search">\n  <form>\n    <div class="search-placeholder"></div>\n    <div class="facets">\n      <div class="loader">\n        <h4>Loading facets...</h4><br/><img src="../images/faceted-search/loader.gif"/>\n      </div>\n    </div>\n  </form>\n</div>'}),function(){var e={}.hasOwnProperty,n=function(t,n){function i(){this.constructor=t}for(var r in n)e.call(n,r)&&(t[r]=n[r]);return i.prototype=n.prototype,t.prototype=new i,t.__super__=n.prototype,t};s("main",["require","hilib/functions/general","config","facetviewmap","models/main","views/base","views/search","views/facets/list","views/facets/boolean","views/facets/date","text!html/faceted-search.html"],function(r){var i,s,o,u,a,f,l,c;return s=r("hilib/functions/general"),f=r("config"),l=r("facetviewmap"),o={FacetedSearch:r("models/main")},a={Base:r("views/base"),Search:r("views/search"),Facets:{List:r("views/facets/list"),Boolean:r("views/facets/boolean"),Date:r("views/facets/date")}},u={FacetedSearch:r("text!html/faceted-search.html")},i=function(r){function i(){return c=i.__super__.constructor.apply(this,arguments),c}return n(i,r),i.prototype.initialize=function(e){var n,r=this;return i.__super__.initialize.apply(this,arguments),this.facetViews={},this.firstRender=!0,t.extend(l,e.facetViewMap),delete e.facetViewMap,t.extend(f.facetNameMap,e.facetNameMap),delete e.facetNameMap,t.extend(f,e),n=t.extend(f.queryOptions,f.textSearchOptions),this.model=new o.FacetedSearch(n),this.listenTo(this.model,"sync",this.renderFacets),this.subscribe("unauthorized",function(){return r.trigger("unauthorized")}),this.subscribe("results:change",function(e,t){return r.trigger("results:change",e,t)}),this.render()},i.prototype.render=function(){var e,n;return e=t.template(u.FacetedSearch),this.$el.html(e),this.$(".loader").fadeIn("slow"),f.search&&(n=new a.Search,this.$(".search-placeholder").html(n.$el),this.listenTo(n,"change",this.fetchResults)),this.model.fetch(),this},i.prototype.renderFacets=function(t){var n,r,i,s,o,u,a;this.$(".loader").hide();if(this.firstRender){this.firstRender=!1,i=document.createDocumentFragment(),o=this.model.serverResponse.facets;for(s in o){if(!e.call(o,s))continue;r=o[s],r.type in l?(n=l[r.type],this.facetViews[r.name]=new n({attrs:r}),this.listenTo(this.facetViews[r.name],"change",this.fetchResults),i.appendChild(this.facetViews[r.name].el)):console.error("Unknown facetView",r.type)}return this.$(".facets").html(i)}u=this.model.serverResponse.facets,a=[];for(s in u){if(!e.call(u,s))continue;t=u[s],a.push(this.facetViews[t.name].update(t.options))}return a},i.prototype.fetchResults=function(e){return e==null&&(e={}),this.model.set(e)},i.prototype.next=function(){return this.model.setCursor("_next")},i.prototype.prev=function(){return this.model.setCursor("_prev")},i.prototype.hasNext=function(){return t.has(this.model.serverResponse,"_next")},i.prototype.hasPrev=function(){return t.has(this.model.serverResponse,"_prev")},i.prototype.reset=function(){var t,n,r;r=this.model.serverResponse.facets;for(n in r){if(!e.call(r,n))continue;t=r[n],this.facetViews[t.name].reset&&this.facetViews[t.name].reset()}return this.model.reset()},i}(a.Base)})}.call(this),s("jquery",function(){return e}),s("underscore",function(){return t}),s("backbone",function(){return n}),i("main")});
define('text!hilib/views/modal/modal.html',[],function () { return '<div class="overlay"></div><div class="modalbody"><header><h2><%= title %></h2><p class="message"></p></header><div class="body"></div><% if (cancelAndSubmit) { %><footer><button class="cancel"><%= cancelValue %></button><button class="submit"><%= submitValue %></button></footer><% } %></div>';});

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

  define('hilib/views/modal/main',['require','backbone','text!hilib/views/modal/modal.html','hilib/managers/modal'],function(require) {
    var Backbone, Modal, Tpl, modalManager, _ref;
    Backbone = require('backbone');
    Tpl = require('text!hilib/views/modal/modal.html');
    modalManager = require('hilib/managers/modal');
    return Modal = (function(_super) {
      __extends(Modal, _super);

      function Modal() {
        _ref = Modal.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      Modal.prototype.className = "modal";

      Modal.prototype.initialize = function() {
        Modal.__super__.initialize.apply(this, arguments);
        return this.render();
      };

      Modal.prototype.render = function() {
        var data, marginLeft, rtpl, scrollTop, top, viewportHeight;
        data = _.extend({
          title: "My modal",
          cancelAndSubmit: true,
          cancelValue: 'Cancel',
          submitValue: 'Submit'
        }, this.options);
        rtpl = _.template(Tpl, data);
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
          this.$('.modalbody').css('margin-left', marginLeft);
        }
        if (this.options.height != null) {
          this.$('.modalbody').css('height', this.options.height);
        }
        scrollTop = document.querySelector('body').scrollTop;
        viewportHeight = document.documentElement.clientHeight;
        top = (viewportHeight - this.$('.modalbody').height()) / 2;
        if (scrollTop > 0) {
          this.$('.modalbody').css('top', top + scrollTop);
        }
        return this.$('.modalbody').css('margin-top', this.$('.modalbody').height() / -2);
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

define('text!html/project/editselection.html',[],function () { return '<div class="row span2"><div class="cell span1"><form><ul><% _.each(entrymetadatafields, function(field, key, list) { %>\n<% if (key < list.length/2) { %><li> <label><%= field %></label><input type="text" name="<%= field %>" tabindex="<%= (key * 2 + 1) %>"/><input type="checkbox" tabindex="<%= (key * 2 + 2) %>" data-name="<%= field %>"/></li><% }}); %></ul></form></div><div class="cell span1"><form><ul><% _.each(entrymetadatafields, function(field, key, list) { %>\n<% if (key >= list.length/2) { %><li> <label><%= field %></label><input type="text" name="<%= field %>" tabindex="<%= (list.length/2 + key * 2 - 1) %>"/><input type="checkbox" tabindex="<%= (list.length/2 + key * 2) %>"/></li><% }}); %></ul></form></div></div><footer><button name="savemetadata" tabindex="<%= entrymetadatafields.length * 2 + 1 %>" class="simple inactive">Save metadata</button><span>or</span><button name="cancel" tabindex="<%= entrymetadatafields.length * 2 + 2 %>">Cancel</button></footer>';});

(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define('views/project/editselection',['require','hilib/managers/ajax','hilib/managers/token','views/base','text!html/project/editselection.html'],function(require) {
    var EditSelection, Templates, Views, ajax, token, _ref;
    ajax = require('hilib/managers/ajax');
    token = require('hilib/managers/token');
    Views = {
      Base: require('views/base')
    };
    Templates = {
      EditSelection: require('text!html/project/editselection.html')
    };
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
        rtpl = _.template(Templates.EditSelection, this.model.attributes);
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
              url: "projects/" + this.model.id + "/multipleentrysettings",
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

define('text!html/project/main.html',[],function () { return '<div class="submenu"><div class="row span3"><div class="cell span1"><ul class="horizontal menu"><li data-key="newsearch">New search</li></ul></div><div class="cell span1"><ul class="horizontal menu"><li data-key="newentry">New entry</li><li data-key="editselection">Edit selection</li></ul></div><div class="cell span1 alignright"><ul class="horizontal menu"><li data-key="print">Print</li></ul></div></div></div><div style="margin: 20px 0" class="row span3"><div class="cell span1"><div class="padl4"><div class="faceted-search-placeholder"></div></div></div><div style="position:fixed" class="cell span2"><div class="padr4 resultview"><header><div class="editselection-placeholder"></div><div class="row span2 numfound-placeholder"><div class="cell span1"> <h3 class="numfound"></h3></div><div class="cell span1 alignright"><nav><ul><li> <input id="cb_showkeywords" type="checkbox"/><label for="cb_showkeywords">Display keywords</label></li><li data-key="selectall">Select all</li><li data-key="deselectall">Deselect all</li></ul></nav></div></div><div class="row span2 pagination-placeholder"><div class="cell span1"> <ul class="horizontal menu pagination"><li class="prev inactive">&lt;</li><li class="currentpage text"></li><li class="text">of</li><li class="pagecount text"></li><li class="next">&gt;</li></ul></div><div class="cell span1 alignright">\t\t</div></div></header><ul class="entries"></ul></div></div></div>';});

define('text!html/project/results.html',[],function () { return '<% _.each(model.get(\'results\'), function(entry) { %><li id="entry<%=entry.id %>" class="entry"> <input type="checkbox" data-id="<%= entry.id %>"/><label data-id="<%=entry.id%>"><%= entry.name %></label><div class="keywords"><ul><% _.each(entry._kwic, function(kwic) { %>\n<% _.each(kwic, function(row) { %><li><%= row %></li><% }); %>\n<% }); %></ul></div></li><% }); %>';});

(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define('views/project/main',['require','hilib/functions/general','config','hilib/managers/token','models/project/search','collections/projects','views/base','faceted-search','hilib/views/modal/main','views/project/editselection','text!html/project/main.html','text!html/project/results.html'],function(require) {
    var Collections, Fn, Models, ProjectSearch, Templates, Views, config, token, _ref;
    Fn = require('hilib/functions/general');
    config = require('config');
    token = require('hilib/managers/token');
    Models = {
      Search: require('models/project/search')
    };
    Collections = {
      projects: require('collections/projects')
    };
    Views = {
      Base: require('views/base'),
      FacetedSearch: require('faceted-search'),
      Modal: require('hilib/views/modal/main'),
      EditSelection: require('views/project/editselection')
    };
    Templates = {
      Search: require('text!html/project/main.html'),
      Results: require('text!html/project/results.html')
    };
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
        this.model = new Models.Search();
        this.listenTo(this.model, 'change', function(model, options) {
          _this.project.get('entries').set(model.get('results'));
          _this.listenTo(_this.project.get('entries'), 'current:change', function(entry) {
            return Backbone.history.navigate("projects/" + (_this.project.get('name')) + "/entries/" + entry.id, {
              trigger: true
            });
          });
          _this.updateHeader();
          return _this.renderResult();
        });
        return Collections.projects.getCurrent(function(project) {
          _this.project = project;
          return _this.render();
        });
      };

      ProjectSearch.prototype.render = function() {
        var rtpl,
          _this = this;
        rtpl = _.template(Templates.Search, this.project.attributes);
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
            resultRows: 12
          }
        });
        this.listenTo(this.facetedSearch, 'unauthorized', function() {
          return _this.publish('unauthorized');
        });
        this.listenTo(this.facetedSearch, 'results:change', function(response, queryOptions) {
          _this.model.queryOptions = queryOptions;
          return _this.model.set(response);
        });
        return this;
      };

      ProjectSearch.prototype.renderResult = function() {
        var rtpl;
        rtpl = _.template(Templates.Results, {
          model: this.model
        });
        this.$('ul.entries').html(rtpl);
        if ((this.model.queryOptions.term != null) && this.model.queryOptions.term !== '') {
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
        'click .submenu li[data-key="editselection"]': function(ev) {
          return this.$('.editselection-placeholder').toggle();
        },
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
          var entries;
          entries = _this.project.get('entries');
          modal.message('success', 'Creating new entry...');
          _this.listenToOnce(entries, 'add', function(entry) {
            modal.close();
            _this.publish('message', 'New entry added to project.');
            return Backbone.history.navigate("projects/" + (_this.project.get('name')) + "/entries/" + entry.id, {
              trigger: true
            });
          });
          return entries.create({
            name: modal.$('input[name="name"]').val()
          }, {
            wait: true
          });
        });
      };

      ProjectSearch.prototype.changePage = function(ev) {
        var ct;
        ct = $(ev.currentTarget);
        if (ct.hasClass('inactive')) {
          return;
        }
        $('.pagination li').removeClass('inactive');
        if (ct.hasClass('prev')) {
          return this.facetedSearch.prev();
        } else if (ct.hasClass('next')) {
          return this.facetedSearch.next();
        }
      };

      ProjectSearch.prototype.changeCurrentEntry = function(ev) {
        var entryID;
        entryID = ev.currentTarget.getAttribute('data-id');
        return this.project.get('entries').setCurrent(entryID);
      };

      ProjectSearch.prototype.uncheckCheckboxes = function() {
        return Fn.checkCheckboxes('.entries input[type="checkbox"]', false, this.el);
      };

      ProjectSearch.prototype.updateHeader = function() {
        var currentpage, pagecount;
        this.$('h3.numfound').html(this.model.get('numFound') + ' letters found');
        currentpage = (this.model.get('start') / this.model.get('rows')) + 1;
        pagecount = Math.ceil(this.model.get('numFound') / this.model.get('rows'));
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

      return ProjectSearch;

    })(Views.Base);
  });

}).call(this);

define('text!html/ui/settings.submenu.html',[],function () { return '';});

(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define('views/ui/settings.submenu',['require','views/base','text!html/ui/settings.submenu.html'],function(require) {
    var BaseView, SettingsSubMenu, Templates, _ref;
    BaseView = require('views/base');
    Templates = {
      'SubMenu': require('text!html/ui/settings.submenu.html')
    };
    return SettingsSubMenu = (function(_super) {
      __extends(SettingsSubMenu, _super);

      function SettingsSubMenu() {
        _ref = SettingsSubMenu.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      SettingsSubMenu.prototype.events = {
        'click li': 'buttonClicked'
      };

      SettingsSubMenu.prototype.buttonClicked = function(ev) {
        ev.stopPropagation();
        return this.trigger('clicked', {
          key: ev.currentTarget.getAttribute('data-key'),
          value: ev.currentTarget.getAttribute('data-value')
        });
      };

      SettingsSubMenu.prototype.className = 'submenu';

      SettingsSubMenu.prototype.initialize = function() {
        SettingsSubMenu.__super__.initialize.apply(this, arguments);
        return this.render();
      };

      SettingsSubMenu.prototype.render = function() {
        var rtpl;
        rtpl = _.template(Templates.SubMenu, this.options);
        this.$el.html(rtpl);
        return this;
      };

      SettingsSubMenu.prototype.setState = function(itemName, state) {
        var saveButton;
        if (itemName === 'save') {
          saveButton = this.$('[data-key="save"]');
          if (state === 'active') {
            saveButton.removeClass('inactive');
            return saveButton.html('Save');
          } else if (state === 'inactive') {
            saveButton.addClass('inactive');
            return saveButton.html('Saved');
          }
        }
      };

      return SettingsSubMenu;

    })(BaseView);
  });

}).call(this);

define('text!hilib/views/form/editablelist/main.html',[],function () { return '<input data-view-id="<%= viewId %>"/><ul class="selected"><% selected.each(function(model) { %><li data-id="<%= model.id %>"><%= model.id %></li><% }); %></ul>';});

(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define('hilib/views/form/editablelist/main',['require','collections/base','views/base','text!hilib/views/form/editablelist/main.html'],function(require) {
    var Collections, EditableList, Tpl, Views, _ref;
    Collections = {
      Base: require('collections/base')
    };
    Views = {
      Base: require('views/base')
    };
    Tpl = require('text!hilib/views/form/editablelist/main.html');
    return EditableList = (function(_super) {
      __extends(EditableList, _super);

      function EditableList() {
        _ref = EditableList.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      EditableList.prototype.className = 'editablelist';

      EditableList.prototype.initialize = function() {
        var value;
        EditableList.__super__.initialize.apply(this, arguments);
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
        rtpl = _.template(Tpl, {
          viewId: this.cid,
          selected: this.selected
        });
        this.$el.html(rtpl);
        this.triggerChange();
        this.$('input').focus();
        return this;
      };

      EditableList.prototype.events = function() {
        var evs;
        evs = {
          'click li': 'removeLi'
        };
        evs['keyup input[data-view-id="' + this.cid + '"]'] = 'onKeyup';
        return evs;
      };

      EditableList.prototype.removeLi = function(ev) {
        return this.selected.removeById(ev.currentTarget.getAttribute('data-id'));
      };

      EditableList.prototype.onKeyup = function(ev) {
        if (ev.keyCode === 13 && ev.currentTarget.value.length > 0) {
          return this.selected.add({
            id: ev.currentTarget.value
          });
        }
      };

      EditableList.prototype.triggerChange = function() {
        return this.trigger('change', this.selected.pluck('id'));
      };

      return EditableList;

    })(Views.Base);
  });

}).call(this);

define('text!hilib/views/form/combolist/main.html',[],function () { return '<div class="input"><input type="text" data-view-id="<%= viewId %>" placeholder="<%= placeholder %>"/><div class="caret"></div></div><% if (editable) { %><button class="edit">Edit</button><% } %><ul class="list"></ul><ul class="selected"><% selected.each(function(model) { %><li data-id="<%= model.id %>" class="selected"><%= model.get(\'title\') %></li><% }); %></ul>';});

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

define('text!hilib/mixins/dropdown/main.html',[],function () { return '<% collection.each(function(model) { %><li data-id="<%= model.id %>" class="list <% if (selected===model) { %>active<% } %>"><%= model.get(\'title\') %></li><% }); %>';});

(function() {
  define('hilib/mixins/dropdown/main',['require','backbone','hilib/functions/general','hilib/mixins/dropdown/options','text!hilib/mixins/dropdown/main.html'],function(require) {
    var Backbone, Fn, Templates, optionMixin;
    Backbone = require('backbone');
    Fn = require('hilib/functions/general');
    optionMixin = require('hilib/mixins/dropdown/options');
    Templates = {
      Options: require('text!hilib/mixins/dropdown/main.html')
    };
    return {
      dropdownInitialize: function() {
        var models, _base, _base1, _base2, _ref, _ref1,
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
        rtpl = _.template(tpl, {
          viewId: this.cid,
          selected: this.selected,
          mutable: this.settings.mutable,
          editable: this.settings.editable,
          placeholder: this.settings.placeholder
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
        rtpl = _.template(Templates.Options, {
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
        var models, re, reset;
        reset = false;
        if (value.length > 1) {
          value = Fn.escapeRegExp(value);
          re = new RegExp(value, 'i');
          models = this.collection.filter(function(model) {
            return re.test(model.get('title'));
          });
          if (models.length) {
            this.filtered_options.reset(models);
            this.$optionlist.show();
            reset = true;
          }
        }
        if (!reset) {
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

  define('hilib/views/form/combolist/main',['require','collections/base','views/base','text!hilib/views/form/combolist/main.html','hilib/mixins/dropdown/main'],function(require) {
    var Collections, ComboList, Tpl, Views, dropdown, _ref;
    Collections = {
      Base: require('collections/base')
    };
    Views = {
      Base: require('views/base')
    };
    Tpl = require('text!hilib/views/form/combolist/main.html');
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
        this.listenTo(this.selected, 'add', function() {
          _this.dropdownRender(Tpl);
          return _this.triggerChange();
        });
        this.listenTo(this.selected, 'remove', function() {
          _this.dropdownRender(Tpl);
          return _this.triggerChange();
        });
        return this.dropdownRender(Tpl);
      };

      ComboList.prototype.events = function() {
        return _.extend(this.dropdownEvents(), {
          'click li.selected': 'removeSelected'
        });
      };

      ComboList.prototype.addSelected = function(model) {
        console.log(model);
        return this.selected.add(model);
      };

      ComboList.prototype.removeSelected = function(ev) {
        return this.selected.removeById(ev.currentTarget.getAttribute('data-id'));
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

      ComboList.prototype.triggerChange = function() {
        return this.trigger('change', this.selected.pluck('id'));
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

  define('hilib/views/form/main',['require','hilib/functions/general','views/base','hilib/managers/validation'],function(require) {
    var Fn, Form, Views, validation, _ref;
    Fn = require('hilib/functions/general');
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

      Form.prototype.className = function() {
        return 'form';
      };

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
        evs['change [data-model-id="' + this.model.cid + '"] textarea'] = 'inputChanged';
        evs['change [data-model-id="' + this.model.cid + '"] input'] = 'inputChanged';
        evs['change [data-model-id="' + this.model.cid + '"] select'] = 'inputChanged';
        evs['keydown [data-model-id="' + this.model.cid + '"] textarea'] = 'textareaKeyup';
        evs['click [data-model-id="' + this.model.cid + '"] input[type="submit"]'] = 'submit';
        return evs;
      };

      Form.prototype.inputChanged = function(ev) {
        var model, value;
        ev.stopPropagation();
        this.$(ev.currentTarget).removeClass('invalid').attr('title', '');
        model = this.model != null ? this.model : this.getModel(ev);
        value = ev.currentTarget.type === 'checkbox' ? ev.currentTarget.checked : ev.currentTarget.value;
        return model.set(ev.currentTarget.name, value, {
          validate: true
        });
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
        rtpl = _.template(this.tpl, this.data);
        this.$el.html(rtpl);
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
        var htmlSafeAttr, value, view,
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
        this.$("[data-cid='" + model.cid + "'] ." + htmlSafeAttr + "-placeholder").html(view.el);
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
            return console.log('fail', response);
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
            return console.log('fail', response);
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

  define('collections/users',['require','config','collections/base'],function(require) {
    var Collections, Users, config, _ref;
    config = require('config');
    Collections = {
      Base: require('collections/base')
    };
    return Users = (function(_super) {
      __extends(Users, _super);

      function Users() {
        _ref = Users.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      Users.prototype.url = function() {
        return "" + config.baseUrl + "users";
      };

      return Users;

    })(Collections.Base);
  });

}).call(this);

define('text!html/project/settings/main.html',[],function () { return '<div class="padl5 padr5"><h2>Settings</h2><ul class="horizontal tab menu"><li data-tab="project" class="active">Project</li><li data-tab="metadata-entries">Entry metadata</li><li data-tab="metadata-annotations">Annotation types</li><li data-tab="users">Users</li></ul><div data-tab="project" class="active"><h3>Project</h3><div class="row span2"><div class="cell span1"><form><ul><li><label for="type">Type</label><input id="type" type="text" name="type" value="<%= settings.Type %>" data-attr="Type"/></li><li><label for="title">Project title</label><input id="title" type="text" name="title" value="<%= settings[\'Project title\'] %>" data-attr="Project title"/></li><li><label for="leader">Project leader</label><select name="leader" data-attr="Project leader"><option>-- select member --</option><% projectMembers.each(function(member) { %>\n<% var selected = (member.id === parseInt(settings[\'Project leader\'], 10)) ? \' selected\' : \'\'; %>\n<option value="<%= member.id %>"<%= selected %>><%= member.get(\'title\') %></option>\n<% }); %></select></li><li><label for="start">Start date</label><input id="start" type="text" name="start" value="<%= settings[\'Start date\'] %>" data-attr="Start date"/></li><li><label for="release">Release date</label><input id="release" type="text" name="release" value="<%= settings[\'Release date\'] %>" data-attr="Release date"/></li><li><label for="version">Version</label><input id="version" type="text" name="version" value="<%= settings.Version %>" data-attr="Version"/></li><li><input type="submit" name="savesettings" value="Save settings" class="inactive"/></li></ul></form></div><div class="cell span1"><h4>Statistics </h4><img src="/images/loader.gif" class="loader"/><pre class="statistics"></pre></div></div></div><div data-tab="metadata-entries"><h3>Add entry metadata field</h3></div><div data-tab="metadata-annotations"></div><div data-tab="users"><div class="row span3"><div class="cell span1 userlist"><h3>Project members</h3></div><div class="cell span2 adduser"><h3>Add new user to project</h3></div></div></div></div>';});

define('text!html/project/settings/metadata_annotations.html',[],function () { return '<h3>Add annotation type</h3><form><ul><li><label>Name</label><input type="text" name="annotationname"/></li><li><label>Description</label><input type="text" name="annotationdescription"/></li><li><input type="submit" value="Add annotation type" name="addannotationtype"/></li></ul></form><ul class="selected-annotation-types"><% annotationTypes.each(function(annotationType) { %><li data-id="<%= annotationType.id %>"><%= annotationType.get(\'description\') %></li><% }); %></ul>';});

define('text!html/project/settings/adduser.html',[],function () { return '<form><ul data-model-id="<%= model.cid %>"><li><label>Username</label><input type="text" name="username"/></li><li><label>E-mail</label><input type="text" name="email"/></li><li><label>First name</label><input type="text" name="firstName"/></li><li><label>Last name</label><input type="text" name="lastName"/></li><li><label>Password</label><input type="password" name="password"/></li><li><label>Role</label><select name="role"><option value="USER">USER</option><option value="READER">READER</option><option value="PROJECTLEADER">PROJECTLEADER</option><option value="ADMIN">ADMIN</option></select></li><li><input type="submit" name="adduser" value="Add user"/></li></ul></form>';});

(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define('views/project/settings',['require','hilib/managers/async','hilib/managers/ajax','hilib/managers/token','entry.metadata','views/base','views/ui/settings.submenu','hilib/views/form/editablelist/main','hilib/views/form/combolist/main','hilib/views/form/main','models/project/statistics','models/project/settings','models/user','collections/projects','collections/project/annotationtypes','collections/project/users','collections/users','text!html/project/settings/main.html','text!html/project/settings/metadata_annotations.html','text!html/project/settings/adduser.html'],function(require) {
    var Async, Collections, EntryMetadata, Models, ProjectSettings, Templates, Views, ajax, token, _ref;
    Async = require('hilib/managers/async');
    ajax = require('hilib/managers/ajax');
    token = require('hilib/managers/token');
    EntryMetadata = require('entry.metadata');
    Views = {
      Base: require('views/base'),
      SubMenu: require('views/ui/settings.submenu'),
      EditableList: require('hilib/views/form/editablelist/main'),
      ComboList: require('hilib/views/form/combolist/main'),
      Form: require('hilib/views/form/main')
    };
    Models = {
      Statistics: require('models/project/statistics'),
      Settings: require('models/project/settings'),
      User: require('models/user')
    };
    Collections = {
      projects: require('collections/projects'),
      AnnotationTypes: require('collections/project/annotationtypes'),
      ProjectUsers: require('collections/project/users'),
      AllUsers: require('collections/users')
    };
    Templates = {
      Settings: require('text!html/project/settings/main.html'),
      AnnotationTypes: require('text!html/project/settings/metadata_annotations.html'),
      AddUser: require('text!html/project/settings/adduser.html')
    };
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
          _this.model = new Models.Settings(null, {
            projectID: _this.project.id
          });
          return _this.model.fetch({
            success: function() {
              return _this.render();
            }
          });
        });
      };

      ProjectSettings.prototype.render = function() {
        var rtpl;
        rtpl = _.template(Templates.Settings, {
          settings: this.model.attributes,
          projectMembers: this.project.get('users')
        });
        this.$el.html(rtpl);
        this.renderSubMenu();
        this.renderTabs();
        this.loadStatistics();
        if (this.options.tabName) {
          this.showTab(this.options.tabName);
        }
        return this;
      };

      ProjectSettings.prototype.renderSubMenu = function() {
        var subMenu,
          _this = this;
        subMenu = new Views.SubMenu();
        this.$el.prepend(subMenu.$el);
        return this.listenTo(this.model, 'change', function() {
          return $('input[name="savesettings"]').removeClass('inactive');
        });
      };

      ProjectSettings.prototype.renderTabs = function() {
        var list, rtpl,
          _this = this;
        list = new Views.EditableList({
          value: this.project.get('entrymetadatafields')
        });
        this.listenTo(list, 'change', function(values) {
          return new EntryMetadata(_this.project.id).save(values);
        });
        this.$('div[data-tab="metadata-entries"]').append(list.el);
        rtpl = _.template(Templates.AnnotationTypes, {
          annotationTypes: this.project.get('annotationtypes')
        });
        this.$('div[data-tab="metadata-annotations"]').html(rtpl);
        this.allusers = new Collections.AllUsers();
        return this.allusers.fetch({
          success: function(collection) {
            return _this.renderUserTab(collection);
          }
        });
      };

      ProjectSettings.prototype.renderUserTab = function(collection) {
        var combolist, form,
          _this = this;
        combolist = new Views.ComboList({
          value: this.project.get('users'),
          config: {
            data: collection,
            settings: {
              placeholder: 'Add new member'
            }
          }
        });
        this.listenTo(combolist, 'change', function(userIDs) {
          return console.log(userIDs);
        });
        this.$('div[data-tab="users"] .userlist').append(combolist.el);
        form = new Views.Form({
          Model: Models.User,
          tpl: Templates.AddUser
        });
        this.listenTo(form, 'save:success', function(model, response, options) {
          var jqXHR;
          ajax.token = token.get();
          jqXHR = ajax.put({
            url: "projects/" + (_this.project.get('name')) + "/projectusers/" + model.id,
            dataType: 'text'
          });
          return jqXHR.done(function() {
            return combolist.addSelected(model);
          });
        });
        this.listenTo(form, 'save:error', function(a, b, c) {
          return console.log('erro', a, b, c);
        });
        return this.$('div[data-tab="users"] .adduser').append(form.el);
      };

      ProjectSettings.prototype.events = {
        'click input[name="addannotationtype"]': 'addAnnotationType',
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

      ProjectSettings.prototype.addAnnotationType = function(ev) {
        ev.preventDefault();
        return console.log('NOT IMPLEMENTED');
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
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define('models/project/history',['require','models/base'],function(require) {
    var Models, ProjectHistory, _ref;
    Models = {
      Base: require('models/base')
    };
    return ProjectHistory = (function(_super) {
      __extends(ProjectHistory, _super);

      function ProjectHistory() {
        _ref = ProjectHistory.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      ProjectHistory.prototype.defaults = function() {
        return {
          comment: '',
          userName: '',
          createdOn: null,
          dateString: ''
        };
      };

      ProjectHistory.prototype.parse = function(attrs) {
        attrs.dateString = new Date(attrs.createdOn).toDateString();
        return attrs;
      };

      return ProjectHistory;

    })(Models.Base);
  });

}).call(this);

(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define('collections/project/history',['require','config','models/project/history','collections/base'],function(require) {
    var Collections, Models, ProjectHistory, config, _ref;
    config = require('config');
    Models = {
      History: require('models/project/history')
    };
    Collections = {
      Base: require('collections/base')
    };
    return ProjectHistory = (function(_super) {
      __extends(ProjectHistory, _super);

      function ProjectHistory() {
        _ref = ProjectHistory.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      ProjectHistory.prototype.model = Models.History;

      ProjectHistory.prototype.url = function() {
        return "" + config.baseUrl + "projects/" + this.projectID + "/logentries";
      };

      ProjectHistory.prototype.initialize = function(models, options) {
        ProjectHistory.__super__.initialize.apply(this, arguments);
        return this.projectID = options.projectID;
      };

      return ProjectHistory;

    })(Collections.Base);
  });

}).call(this);

define('text!html/project/history.html',[],function () { return '<h2>History\n<% _.each(logEntries, function(entries, date) { %><h3><%= date %></h3><ul><% _.each(entries, function(entry) { %><li><span class="username"><%= entry.get(\'userName\') %>&nbsp;</span><span class="comment"><%= entry.get(\'comment\') %> </span></li><% }); %></ul><% }); %></h2>';});

(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define('views/project/history',['require','views/base','collections/project/history','collections/projects','text!html/project/history.html'],function(require) {
    var BaseView, Collections, ProjectHistory, Templates, _ref;
    BaseView = require('views/base');
    Collections = {
      History: require('collections/project/history'),
      projects: require('collections/projects')
    };
    Templates = {
      History: require('text!html/project/history.html')
    };
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
        return Collections.projects.getCurrent(function(project) {
          _this.collection = new Collections.History([], {
            projectID: project.id
          });
          return _this.collection.fetch({
            success: function() {
              return _this.render();
            }
          });
        });
      };

      ProjectHistory.prototype.render = function() {
        var rtpl;
        rtpl = _.template(Templates.History, {
          logEntries: this.collection.groupBy('dateString')
        });
        this.$el.html(rtpl);
        return this;
      };

      return ProjectHistory;

    })(BaseView);
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
      	
      	Example: "There are 12 monkeys." => "12"
      	
      	return String
      */

      onlyNumbers: function(str) {
        return str.replace(/[^\d.]/g, '');
      }
    };
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
        var $closeButton, corner, html,
          _this = this;
        if (args == null) {
          args = {};
        }
        corner = args.corner, html = args.html;
        if (html == null) {
          html = '<img src="/images/icon.close.png">';
        }
        if (corner == null) {
          corner = 'topright';
        }
        $closeButton = $('<div class="closebutton">').html(html);
        switch (corner) {
          case 'topright':
            $closeButton.css('position', 'absolute');
            $closeButton.css('right', '8px');
            $closeButton.css('top', '8px');
            $closeButton.css('opacity', '0.2');
            $closeButton.css('cursor', 'pointer');
        }
        this.prepend($closeButton);
        $closeButton.hover((function(ev) {
          return $closeButton.css('opacity', 100);
        }), (function(ev) {
          return $closeButton.css('opacity', 0.2);
        }));
        return $closeButton.click(function() {
          return _this.trigger('close');
        });
      };
    })(jQuery);
  });

}).call(this);

define('text!html/entry/tooltip.add.annotation.html',[],function () { return '<button>Add annotation</button>';});

(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define('views/entry/preview/annotation.add.tooltip',['require','hilib/functions/general','views/base','models/annotation','text!html/entry/tooltip.add.annotation.html'],function(require) {
    var AddAnnotationTooltip, Annotation, BaseView, Fn, Templates, _ref;
    Fn = require('hilib/functions/general');
    BaseView = require('views/base');
    Annotation = require('models/annotation');
    Templates = {
      Tooltip: require('text!html/entry/tooltip.add.annotation.html')
    };
    return AddAnnotationTooltip = (function(_super) {
      __extends(AddAnnotationTooltip, _super);

      function AddAnnotationTooltip() {
        _ref = AddAnnotationTooltip.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      AddAnnotationTooltip.prototype.id = 'addannotationtooltip';

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
        AddAnnotationTooltip.__super__.initialize.apply(this, arguments);
        this.container = this.options.container || document.querySelector('body');
        this.boundingBox = Fn.boundingBox(this.container);
        return this.render();
      };

      AddAnnotationTooltip.prototype.render = function() {
        var rtpl;
        rtpl = _.template(Templates.Tooltip, {});
        this.$el.html(rtpl);
        $('#addannotationtooltip').remove();
        $('body').prepend(this.$el);
        return this;
      };

      AddAnnotationTooltip.prototype.show = function(position) {
        this.setPosition(position);
        return this.$el.fadeIn('fast');
      };

      AddAnnotationTooltip.prototype.hide = function() {
        return this.el.style.display = 'none';
      };

      AddAnnotationTooltip.prototype.setPosition = function(position) {
        var left, top;
        this.$el.removeClass('tipright tipleft tipbottom');
        left = position.left - this.$el.width() / 2;
        top = position.top + 30;
        if (this.boundingBox.left > left) {
          left = this.boundingBox.left + 10;
          this.$el.addClass('tipleft');
        }
        if (this.boundingBox.right < (left + this.$el.width())) {
          left = this.boundingBox.right - this.$el.width() - 10;
          this.$el.addClass('tipright');
        }
        if (this.boundingBox.bottom < top + this.$el.height()) {
          top = top - 60 - this.$el.height();
          this.$el.addClass('tipbottom');
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

define('text!html/ui/tooltip.html',[],function () { return '<ul class="horizontal menu left"><li class="edit"><img src="/images/icon.edit.png" title="Edit annotation"/></li><li class="delete"><img src="/images/icon.bin.png" title="Delete annotation"/></li></ul><ul class="horizontal menu right"><li class="close"><img src="/images/icon.close.png" title="Close annotation"/></li></ul><div class="body"></div>';});

(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define('views/entry/preview/annotation.edit.tooltip',['require','hilib/functions/general','views/base','text!html/ui/tooltip.html'],function(require) {
    var BaseView, Fn, Templates, Tooltip, _ref;
    Fn = require('hilib/functions/general');
    BaseView = require('views/base');
    Templates = {
      Tooltip: require('text!html/ui/tooltip.html')
    };
    return Tooltip = (function(_super) {
      __extends(Tooltip, _super);

      function Tooltip() {
        _ref = Tooltip.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      Tooltip.prototype.className = 'tooltip editannotation';

      Tooltip.prototype.id = "editannotationtooltip";

      Tooltip.prototype.initialize = function() {
        Tooltip.__super__.initialize.apply(this, arguments);
        this.container = this.options.container || document.querySelector('body');
        this.boundingBox = Fn.boundingBox(this.container);
        return this.render();
      };

      Tooltip.prototype.render = function() {
        var rtpl;
        rtpl = _.template(Templates.Tooltip);
        this.$el.html(rtpl);
        $('#editannotationtooltip').remove();
        return $('body').prepend(this.$el);
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
        contentId = (this.model != null) && (this.model.get('annotationNo') != null) ? this.model.get('annotationNo') : -1;
        if (contentId === +this.el.getAttribute('data-id')) {
          this.hide();
          return false;
        }
        this.el.setAttribute('data-id', contentId);
        if (this.model != null) {
          this.$el.removeClass('newannotation');
          this.$('.body').html(this.model.get('body'));
        } else {
          this.$el.addClass('newannotation');
        }
        this.setPosition($el.offset());
        return this.$el.fadeIn('fast');
      };

      Tooltip.prototype.hide = function() {
        this.el.removeAttribute('data-id');
        return this.el.style.display = 'none';
      };

      Tooltip.prototype.setPosition = function(position) {
        var left, top;
        this.$el.removeClass('tipright tipleft tipbottom');
        left = position.left - this.$el.width() / 2;
        top = position.top + 30;
        if (this.boundingBox.left > left) {
          left = this.boundingBox.left + 10;
          this.$el.addClass('tipleft');
        }
        if (this.boundingBox.right < (left + this.$el.width())) {
          left = this.boundingBox.right - this.$el.width() - 10;
          this.$el.addClass('tipright');
        }
        if (this.boundingBox.bottom < top + this.$el.height()) {
          top = top - 60 - this.$el.height();
          this.$el.addClass('tipbottom');
        }
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

define('text!html/entry/preview.html',[],function () { return '<div class="preview"> <div class="body"><%= body %></div><ul class="linenumbers"><% var lineNumber = 1 %>\n<% while(lineNumber <= lineCount) { %><li><%= lineNumber %></li><% lineNumber++ %>\n<% } %></ul></div>';});

(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define('views/entry/preview/main',['require','hilib/functions/general','config','views/base','views/entry/preview/annotation.add.tooltip','views/entry/preview/annotation.edit.tooltip','text!html/entry/preview.html'],function(require) {
    var Fn, Tpl, TranscriptionPreview, Views, config, _ref;
    Fn = require('hilib/functions/general');
    config = require('config');
    Views = {
      Base: require('views/base'),
      AddAnnotationTooltip: require('views/entry/preview/annotation.add.tooltip'),
      EditAnnotationTooltip: require('views/entry/preview/annotation.edit.tooltip')
    };
    Tpl = require('text!html/entry/preview.html');
    return TranscriptionPreview = (function(_super) {
      __extends(TranscriptionPreview, _super);

      function TranscriptionPreview() {
        _ref = TranscriptionPreview.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      TranscriptionPreview.prototype.initialize = function() {
        TranscriptionPreview.__super__.initialize.apply(this, arguments);
        this.highlighter = Fn.highlighter();
        this.currentTranscription = this.model.get('transcriptions').current;
        this.addListeners();
        this.render();
        this.renderTooltips();
        return this.setHeight();
      };

      TranscriptionPreview.prototype.render = function() {
        var brs, data, rtpl, _ref1;
        data = this.currentTranscription.toJSON();
        brs = (_ref1 = this.currentTranscription.get('body').match(/<br>/g)) != null ? _ref1 : [];
        data.lineCount = brs.length;
        rtpl = _.template(Tpl, data);
        this.$el.html(rtpl);
        this.onHover();
        return this;
      };

      TranscriptionPreview.prototype.renderTooltips = function() {
        var _this = this;
        this.addAnnotationTooltip = new Views.AddAnnotationTooltip({
          container: this.el
        });
        this.editAnnotationTooltip = new Views.EditAnnotationTooltip({
          container: this.el
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
        return Fn.timeoutWithReset(200, function() {
          return _this.trigger('scrolled', Fn.getScrollPercentage(ev.currentTarget));
        });
      };

      TranscriptionPreview.prototype.supClicked = function(ev) {
        var annotation, id;
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
        if (sel.rangeCount === 0 || ev.target.tagName === 'SUP') {
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

      TranscriptionPreview.prototype.setHeight = function() {
        return this.$el.height(document.documentElement.clientHeight - 89 - 78 - 10);
      };

      TranscriptionPreview.prototype.setModel = function(entry) {
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

define('text!html/entry/metadata.html',[],function () { return '<form><ul data-model-id="<%= model.cid %>"><li><label>Name</label><input type="text" name="name" value="<%= model.get(\'name\') %>"/></li><% _.each(model.get(\'settings\').attributes, function(value, key) { %><li><label><%= key %></label><input type="text" name="<%= key %>" value="<%= value %>"/></li><% }); %><li><label>Publishable</label><input type="checkbox" name="publishable"<% if (model.get(\'publishable\')) {%> checked<% } %>></li></ul></form>';});

(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define('views/entry/metadata',['require','hilib/functions/general','hilib/views/form/main','text!html/entry/metadata.html'],function(require) {
    var EntryMetadata, Fn, Tpl, Views, _ref;
    Fn = require('hilib/functions/general');
    Views = {
      Form: require('hilib/views/form/main')
    };
    Tpl = require('text!html/entry/metadata.html');
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
        rtpl = _.template(Tpl, this.model.toJSON());
        this.$el.html(rtpl);
        return this;
      };

      return EntryMetadata;

    })(Views.Form);
  });

}).call(this);

define('text!html/entry/subsubmenu/textlayers.edit.html',[],function () { return '<div class="row span3"><div class="cell span1"><div class="pad2"><h3>Text layers</h3><ul class="textlayers"><% transcriptions.each(function(trans) { %><li data-id="<%= trans.id %>" class="textlayer"><span class="name"><img src="/images/icon.bin.png" width="14px" height="14px"/><label><%= trans.get(\'textLayer\') %></label></span><span class="orcancel">or Cancel</span></li><% }); %></ul></div></div><div class="cell span2"><div class="pad2"><h3>Add text layer</h3><ul class="form addtextlayer"><li><label>Name</label><input type="text" name="name"/></li><li><label>Text</label><textarea name="text"></textarea></li><li><button class="addtextlayer">Add textlayer</button></li></ul></div></div></div>';});

(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define('views/entry/subsubmenu/textlayers.edit',['require','hilib/functions/general','views/base','text!html/entry/subsubmenu/textlayers.edit.html'],function(require) {
    var EditTextlayers, Fn, Tpl, Views, _ref;
    Fn = require('hilib/functions/general');
    Views = {
      Base: require('views/base')
    };
    Tpl = require('text!html/entry/subsubmenu/textlayers.edit.html');
    return EditTextlayers = (function(_super) {
      __extends(EditTextlayers, _super);

      function EditTextlayers() {
        _ref = EditTextlayers.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      EditTextlayers.prototype.initialize = function() {
        EditTextlayers.__super__.initialize.apply(this, arguments);
        this.listenTo(this.collection, 'add', this.render);
        this.listenTo(this.collection, 'remove', this.render);
        return this.render();
      };

      EditTextlayers.prototype.render = function() {
        var rtpl;
        rtpl = _.template(Tpl, {
          transcriptions: this.collection
        });
        this.$el.html(rtpl);
        return this;
      };

      EditTextlayers.prototype.events = function() {
        var _this = this;
        return {
          'click button.addtextlayer': 'addtextlayer',
          'click ul.textlayers li': function(ev) {
            return $(ev.currentTarget).addClass('destroy');
          },
          'click ul.textlayers li.destroy .orcancel': 'cancelRemove',
          'click ul.textlayers li.destroy .name': 'destroytextlayer'
        };
      };

      EditTextlayers.prototype.cancelRemove = function(ev) {
        var parentLi;
        ev.stopPropagation();
        parentLi = $(ev.currentTarget).parents('li');
        return parentLi.removeClass('destroy');
      };

      EditTextlayers.prototype.destroytextlayer = function(ev) {
        var transcriptionID;
        transcriptionID = $(ev.currentTarget).parents('li').attr('data-id');
        return this.collection.remove(this.collection.get(transcriptionID));
      };

      EditTextlayers.prototype.addtextlayer = function() {
        var data, name, text;
        name = this.el.querySelector('input[name="name"]').value;
        text = this.el.querySelector('textarea[name="text"]').value;
        if (name !== '') {
          data = {
            textLayer: name,
            body: text
          };
          return this.collection.create(data, {
            wait: true
          });
        }
      };

      return EditTextlayers;

    })(Views.Base);
  });

}).call(this);

define('text!html/entry/subsubmenu/facsimiles.edit.html',[],function () { return '<div class="row span3"><div class="cell span1"><div class="pad2"><h3>Facsimiles</h3><ul class="facsimiles"><% facsimiles.each(function(facs) { %><li data-id="<%= facs.id %>" class="facsimile"><span class="name"><img src="/images/icon.bin.png" width="14px" height="14px"/><label><%= facs.get(\'name\') %></label></span><span class="orcancel">or Cancel</span></li><% }); %></ul></div></div><div class="cell span2"><div class="pad2"><h3>Upload new facsimile</h3><ul class="form addfacsimile"><li><label>Name</label><input type="text" name="name"/></li><li><form enctype="multipart/form-data" class="addfile"><input type="file" name="filename"/></form></li><li><button class="addfacsimile">Add facsimile</button></li></ul></div></div></div>';});

(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define('views/entry/subsubmenu/facsimiles.edit',['require','hilib/functions/general','hilib/managers/ajax','hilib/managers/token','views/base','text!html/entry/subsubmenu/facsimiles.edit.html'],function(require) {
    var EditFacsimiles, Fn, Tpl, Views, ajax, token, _ref;
    Fn = require('hilib/functions/general');
    ajax = require('hilib/managers/ajax');
    token = require('hilib/managers/token');
    Views = {
      Base: require('views/base')
    };
    Tpl = require('text!html/entry/subsubmenu/facsimiles.edit.html');
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
        rtpl = _.template(Tpl, {
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
          url: 'http://tiler01.huygensinstituut.knaw.nl:8080/facsimileservice/upload',
          data: formData,
          cache: false,
          contentType: false,
          processData: false
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

define('text!html/entry/transcription.edit.menu.html',[],function () { return '<button disabled="disabled" class="ok small">Save</button>';});

(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define('views/entry/transcription.edit.menu',['require','hilib/functions/general','views/base','text!html/entry/transcription.edit.menu.html'],function(require) {
    var Fn, Tpl, TranscriptionEditMenu, Views, _ref;
    Fn = require('hilib/functions/general');
    Views = {
      Base: require('views/base')
    };
    Tpl = require('text!html/entry/transcription.edit.menu.html');
    return TranscriptionEditMenu = (function(_super) {
      __extends(TranscriptionEditMenu, _super);

      function TranscriptionEditMenu() {
        _ref = TranscriptionEditMenu.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      TranscriptionEditMenu.prototype.className = 'transcriptioneditmenu';

      TranscriptionEditMenu.prototype.initialize = function() {
        TranscriptionEditMenu.__super__.initialize.apply(this, arguments);
        this.addListeners();
        return this.render();
      };

      TranscriptionEditMenu.prototype.render = function() {
        var rtpl;
        rtpl = _.template(Tpl, this.model.toJSON());
        this.$el.html(rtpl);
        return this;
      };

      TranscriptionEditMenu.prototype.events = function() {
        return {
          'click button.ok': 'save'
        };
      };

      TranscriptionEditMenu.prototype.save = function() {
        return this.model.save();
      };

      TranscriptionEditMenu.prototype.setModel = function(transcription) {
        this.model = transcription;
        return this.addListeners();
      };

      TranscriptionEditMenu.prototype.addListeners = function() {
        var _this = this;
        this.listenTo(this.model, 'sync', function() {
          return _this.el.querySelector('button.ok').disabled = true;
        });
        return this.listenTo(this.model, 'change:body', function() {
          return _this.el.querySelector('button.ok').disabled = false;
        });
      };

      return TranscriptionEditMenu;

    })(Views.Base);
  });

}).call(this);

define('text!html/entry/annotation.edit.menu.html',[],function () { return '<button class="metadata small">Metadata</button><button class="cancel small">Cancel</button><button disabled="disabled" class="ok small">Save</button>';});

(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define('views/entry/annotation.edit.menu',['require','hilib/functions/general','config','views/base','text!html/entry/annotation.edit.menu.html'],function(require) {
    var AnnotationEditMenu, Fn, Tpl, Views, config, _ref;
    Fn = require('hilib/functions/general');
    config = require('config');
    Views = {
      Base: require('views/base')
    };
    Tpl = require('text!html/entry/annotation.edit.menu.html');
    return AnnotationEditMenu = (function(_super) {
      __extends(AnnotationEditMenu, _super);

      function AnnotationEditMenu() {
        _ref = AnnotationEditMenu.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      AnnotationEditMenu.prototype.className = 'annotationeditmenu';

      AnnotationEditMenu.prototype.initialize = function() {
        AnnotationEditMenu.__super__.initialize.apply(this, arguments);
        this.addListeners();
        return this.render();
      };

      AnnotationEditMenu.prototype.render = function() {
        var rtpl;
        rtpl = _.template(Tpl, this.model.toJSON());
        this.$el.html(rtpl);
        return this;
      };

      AnnotationEditMenu.prototype.events = function() {
        var _this = this;
        return {
          'click button.ok': 'save',
          'click button.cancel': function() {
            return _this.trigger('cancel', _this.model);
          },
          'click button.metadata': function() {
            return _this.trigger('metadata', _this.model);
          }
        };
      };

      AnnotationEditMenu.prototype.save = function() {
        var _this = this;
        if (this.model.isNew()) {
          this.model.urlRoot = function() {
            return config.baseUrl + ("projects/" + _this.collection.projectId + "/entries/" + _this.collection.entryId + "/transcriptions/" + _this.collection.transcriptionId + "/annotations");
          };
          return this.model.save([], {
            success: function() {
              return _this.collection.add(_this.model);
            },
            error: function(model, xhr, options) {
              return console.error('Saving annotation failed!', model, xhr, options);
            }
          });
        } else {
          return this.model.save();
        }
      };

      AnnotationEditMenu.prototype.setModel = function(annotation) {
        this.model = annotation;
        return this.addListeners();
      };

      AnnotationEditMenu.prototype.addListeners = function() {
        var _this = this;
        this.listenTo(this.model, 'sync', function(model, resp, options) {
          return _this.el.querySelector('button.ok').disabled = true;
        });
        return this.listenTo(this.model, 'change:body', function() {
          return _this.el.querySelector('button.ok').disabled = false;
        });
      };

      return AnnotationEditMenu;

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

define('text!hilib/views/supertinyeditor/supertinyeditor.html',[],function () { return '<div class="supertinyeditor"><div class="ste-header"></div><div class="ste-body"><iframe></iframe></div></div>';});

(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define('hilib/views/supertinyeditor/supertinyeditor',['require','hilib/functions/general','hilib/functions/string','hilib/functions/jquery.mixin','hilib/views/longpress/main','views/base','text!hilib/views/supertinyeditor/supertinyeditor.html'],function(require) {
    var Fn, Longpress, StringFn, SuperTinyEditor, Tpl, Views, _ref;
    Fn = require('hilib/functions/general');
    StringFn = require('hilib/functions/string');
    require('hilib/functions/jquery.mixin');
    Longpress = require('hilib/views/longpress/main');
    Views = {
      Base: require('views/base')
    };
    Tpl = require('text!hilib/views/supertinyeditor/supertinyeditor.html');
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
        var rtpl;
        rtpl = _.template(Tpl);
        this.$el.html(rtpl());
        this.$currentHeader = this.$('.ste-header');
        this.renderControls();
        this.renderIframe();
        this.setFocus();
        return this;
      };

      SuperTinyEditor.prototype.renderControls = function() {
        var controlName, div, _i, _len, _ref1, _results;
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
          var target;
          if (!_this.autoScroll) {
            target = {
              scrollLeft: $(iframe).contents().scrollLeft(),
              scrollWidth: iframe.contentWindow.document.documentElement.scrollWidth,
              clientWidth: iframe.contentWindow.document.documentElement.clientWidth,
              scrollTop: $(iframe).contents().scrollTop(),
              scrollHeight: iframe.contentWindow.document.documentElement.scrollHeight,
              clientHeight: iframe.contentWindow.document.documentElement.clientHeight
            };
            return Fn.timeoutWithReset(200, function() {
              return _this.trigger('scrolled', Fn.getScrollPercentage(target));
            });
          }
        });
        return this.iframeDocument.addEventListener('keyup', function(ev) {
          return Fn.timeoutWithReset(500, function() {
            return _this.saveHTMLToModel();
          });
        });
      };

      SuperTinyEditor.prototype.events = function() {
        return {
          'click .ste-control': 'controlClicked',
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

      SuperTinyEditor.prototype.saveHTMLToModel = function() {
        return this.model.set(this.options.htmlAttribute, this.iframeBody.innerHTML);
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

define('text!html/entry/annotation.metadata.html',[],function () { return '<form><ul data-model-id="<%= model.cid %>" class="form"><li><label>Type</label><select name="metadata.type"><% collection.each(function(item) { %>\n<% var selected = (item.id === model.get(\'annotationType\').id) ? \' selected\' : \'\'; %>\n<option value="<%= item.id %>"<%= selected %>><%= item.get(\'description\') %> (<%= item.get(\'name\') %>)</option>\n<% }); %></select></li><% _.each(model.get(\'annotationMetadataItems\'), function(metadata) { %><li> <label title="<%= metadata.annotationTypeMetadataItem.description %>"><%= metadata.annotationTypeMetadataItem.name %></label><input type="text" name="metadata.<%= metadata.annotationTypeMetadataItem.name %>" value="<%= metadata.data %>"/></li><% }); %></ul></form>';});

(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define('views/entry/editors/annotation',['require','collections/projects','views/base','hilib/views/supertinyeditor/supertinyeditor','hilib/views/modal/main','hilib/views/form/main','text!html/entry/annotation.metadata.html'],function(require) {
    var AnnotationEditor, Collections, Templates, Views, _ref;
    Collections = {
      projects: require('collections/projects')
    };
    Views = {
      Base: require('views/base'),
      SuperTinyEditor: require('hilib/views/supertinyeditor/supertinyeditor'),
      Modal: require('hilib/views/modal/main'),
      Form: require('hilib/views/form/main')
    };
    Templates = {
      Metadata: require('text!html/entry/annotation.metadata.html')
    };
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
          controls: ['b_save', 'b_cancel', 'b_metadata', 'n', 'n', 'bold', 'italic', 'underline', 'strikethrough', '|', 'subscript', 'superscript', 'unformat', '|', 'undo', 'redo'],
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
        if (annotation != null) {
          this.model = annotation;
        }
        this.editor.setModel(this.model);
        this.editor.$('.ste-header:nth-child(2)').addClass('annotationtext').html(this.model.get('annotatedText'));
        this.setURLPath(this.model.id);
        return this.el.style.display = 'block';
      };

      AnnotationEditor.prototype.hide = function() {
        return this.el.style.display = 'none';
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
          tpl: Templates.Metadata,
          model: this.model.clone(),
          collection: this.project.get('annotationtypes')
        });
        modal = new Views.Modal({
          title: "Edit annotation metadata",
          $html: annotationMetadata.$el,
          submitValue: 'Save metadata',
          width: '300px'
        });
        return modal.on('submit', function() {
          var jqXHR, metadata;
          metadata = annotationMetadata.model.get('metadata');
          if (metadata.type != null) {
            _this.model.set('annotationType', _this.project.get('annotationtypes').get(metadata.type));
            delete metadata.type;
          }
          jqXHR = _this.model.save();
          return jqXHR.done(function() {
            return modal.messageAndFade('success', 'Metadata saved!');
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

  define('views/entry/editors/layer',['require','hilib/functions/string','views/base','hilib/views/supertinyeditor/supertinyeditor'],function(require) {
    var LayerEditor, StringFn, Views, _ref;
    StringFn = require('hilib/functions/string');
    Views = {
      Base: require('views/base'),
      SuperTinyEditor: require('hilib/views/supertinyeditor/supertinyeditor')
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
          controls: ['b_save', 'n', 'bold', 'italic', 'underline', 'strikethrough', '|', 'subscript', 'superscript', 'unformat', '|', 'undo', 'redo'],
          cssFile: '/css/main.css',
          el: this.$('.transcription-editor'),
          height: this.options.height,
          html: this.model.get('body'),
          htmlAttribute: 'body',
          model: this.model,
          width: this.options.width
        });
        this.listenTo(this.editor, 'save', function() {
          return _this.model.save();
        });
        this.show();
        return this;
      };

      LayerEditor.prototype.events = function() {};

      LayerEditor.prototype.show = function(layer) {
        if (layer != null) {
          this.model = layer;
        }
        this.editor.setModel(this.model);
        this.setURLPath();
        return this.el.style.display = 'block';
      };

      LayerEditor.prototype.hide = function() {
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

define('text!html/entry/main.html',[],function () { return '<div class="submenu"><div class="row span7"><div class="cell span3 left"><ul class="horizontal menu"><li data-key="previous">&nbsp;</li><li data-key="current"><%= name %></li><li data-key="next">&nbsp;</li><li data-key="facsimiles" class="alignright">Facsimiles<ul class="vertical menu facsimiles"><li class="spacer">&nbsp;</li><li data-key="editfacsimiles" class="subsub">Edit...</li><% facsimiles.each(function(facs) { %><li data-key="facsimile" data-value="<%= facs.id %>"><%= facs.get(\'name\') %></li><% }); %></ul></li></ul></div><div class="cell span2 alignright"><ul class="horizontal menu"><li data-key="layer" class="arrowdown">Layer<ul class="vertical menu textlayers"><li class="spacer">&nbsp;</li><li data-key="edittextlayers" class="subsub">Edit...</li><% transcriptions.each(function(trans) { %><li data-key="transcription" data-value="<%= trans.id %>"><%= trans.get(\'textLayer\') %> layer</li><% }); %></ul></li></ul></div><div class="cell span2 alignright"><ul class="horizontal menu"><li data-key="metadata">Metadata</li><li data-key="print">Print</li><li data-key="preview">Preview</li></ul></div></div></div><div class="subsubmenu"><div class="edittextlayers"></div><div class="editfacsimiles"></div></div><div class="row span7 container"><div class="cell span3"><div class="left"><% if (facsimiles.length) { %><iframe id="viewer_iframe" name="viewer_iframe" scrolling="no" width="100%" frameborder="0"></iframe><% } %></div></div><div class="cell span2"><div class="middle"><div class="transcription-placeholder"><div class="transcription-editor"></div></div><div class="annotation-placeholder"><div class="annotation-editor"></div></div><div class="annotationmetadata-placeholder"><div class="annotationmetadata"></div></div></div></div><div class="cell span2"><div class="right"></div></div></div>';});

(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define('views/entry/main',['require','backbone','config','hilib/functions/general','hilib/functions/string','hilib/functions/jquery.mixin','hilib/managers/async','models/entry','collections/projects','views/base','views/entry/preview/main','views/entry/metadata','views/entry/subsubmenu/textlayers.edit','views/entry/subsubmenu/facsimiles.edit','views/entry/transcription.edit.menu','views/entry/annotation.edit.menu','hilib/views/modal/main','hilib/views/form/main','views/entry/editors/annotation','views/entry/editors/layer','text!html/entry/main.html','text!html/entry/metadata.html'],function(require) {
    var Async, Backbone, Collections, Entry, Fn, Models, StringFn, Templates, Views, config, _ref;
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
      EditTextlayers: require('views/entry/subsubmenu/textlayers.edit'),
      EditFacsimiles: require('views/entry/subsubmenu/facsimiles.edit'),
      TranscriptionEditMenu: require('views/entry/transcription.edit.menu'),
      AnnotationEditMenu: require('views/entry/annotation.edit.menu'),
      Modal: require('hilib/views/modal/main'),
      Form: require('hilib/views/form/main'),
      AnnotationEditor: require('views/entry/editors/annotation'),
      LayerEditor: require('views/entry/editors/layer')
    };
    Templates = {
      Entry: require('text!html/entry/main.html'),
      Metadata: require('text!html/entry/metadata.html')
    };
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
        rtpl = _.template(Templates.Entry, this.model.toJSON());
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
          this.$('.left iframe').attr('src', 'https://tomcat.tiler01.huygens.knaw.nl/adore-huygens-viewer-2.0/viewer.html?rft_id=' + url);
          return this.$('.left iframe').height(document.documentElement.clientHeight - 89);
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
            el: this.$('.container .right')
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
            return _this.currentTranscription.get('annotations').add(annotation);
          });
        } else {
          this.annotationEditor.show(model);
        }
        return this.layerEditor.hide();
      };

      Entry.prototype.renderSubsubmenu = function() {
        this.subviews.textlayersEdit = new Views.EditTextlayers({
          collection: this.model.get('transcriptions'),
          el: this.$('.subsubmenu .edittextlayers')
        });
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
          'click .menu li.subsub': 'toggleSubsubmenu',
          'click .menu li[data-key="metadata"]': 'editEntryMetadata'
        };
      };

      Entry.prototype.toggleSubsubmenu = (function() {
        var currentMenu;
        currentMenu = null;
        return function(ev) {
          var newMenu;
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
            $('.subsubmenu').find('.' + newMenu).show().siblings().hide();
            return currentMenu = newMenu;
          }
        };
      })();

      Entry.prototype.previousEntry = function() {
        var entryID;
        entryID = this.model.collection.previous().id;
        return Backbone.history.navigate("projects/" + (this.project.get('name')) + "/entries/" + entryID, {
          trigger: true
        });
      };

      Entry.prototype.nextEntry = function() {
        var entryID;
        entryID = this.model.collection.next().id;
        return Backbone.history.navigate("projects/" + (this.project.get('name')) + "/entries/" + entryID, {
          trigger: true
        });
      };

      Entry.prototype.changeFacsimile = function(ev) {
        var facsimileID, model;
        facsimileID = ev.currentTarget.getAttribute('data-value');
        model = this.model.get('facsimiles').get(facsimileID);
        if (model != null) {
          return this.model.get('facsimiles').setCurrent(model);
        }
      };

      Entry.prototype.changeTranscription = function(ev) {
        var newTranscription, transcriptionID;
        transcriptionID = ev.currentTarget.getAttribute('data-value');
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
          tpl: Templates.Metadata,
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
            return modal.messageAndFade('success', 'Metadata saved!');
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
          return Fn.setScrollPercentage(_this.preview.el, percentages);
        });
        this.listenTo(this.model.get('facsimiles'), 'current:change', function(current) {
          _this.currentFacsimile = current;
          return _this.renderFacsimile();
        });
        this.listenTo(this.model.get('facsimiles'), 'add', function(facsimile) {
          var li;
          li = $("<li data-key='facsimile' data-value='" + facsimile.id + "'>" + (facsimile.get('name')) + "</li>");
          return _this.$('.submenu .facsimiles').append(li);
        });
        this.listenTo(this.model.get('facsimiles'), 'remove', function(facsimile) {
          return _this.$('.submenu .facsimiles [data-value="' + facsimile.id + '"]').remove();
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
          return _this.$('.submenu .textlayers').append(li);
        });
        this.listenTo(this.model.get('transcriptions'), 'remove', function(transcription) {
          return _this.$('.submenu .textlayers [data-value="' + transcription.id + '"]').remove();
        });
        return window.addEventListener('resize', function(ev) {
          return Fn.timeoutWithReset(600, function() {
            _this.renderFacsimile();
            _this.preview.setHeight();
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

  define('routers/main',['require','backbone','hilib/managers/view','hilib/managers/history','hilib/managers/pubsub','hilib/functions/general','collections/projects','views/login','views/project/main','views/project/settings','views/project/history','views/entry/main'],function(require) {
    var Backbone, Collections, Fn, MainRouter, Pubsub, Views, history, viewManager, _ref;
    Backbone = require('backbone');
    viewManager = require('hilib/managers/view');
    history = require('hilib/managers/history');
    Pubsub = require('hilib/managers/pubsub');
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
            return _this.navigate("projects/" + (project.get('name')), {
              trigger: true
            });
          });
        });
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
        return viewManager.show(Views.Login);
      };

      MainRouter.prototype.project = function(name) {
        return viewManager.show(Views.ProjectMain);
      };

      MainRouter.prototype.projectSettings = function(name, tab) {
        return viewManager.show(Views.ProjectSettings, {
          tabName: tab
        });
      };

      MainRouter.prototype.projectHistory = function(name) {
        return viewManager.show(Views.ProjectHistory);
      };

      MainRouter.prototype.entry = function(projectName, entryID, transcriptionName, annotationID) {
        return viewManager.show(Views.Entry, {
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

  define('models/state',['require','hilib/managers/history','models/base'],function(require) {
    var Models, State, history, _ref;
    history = require('hilib/managers/history');
    Models = {
      Base: require('models/base')
    };
    State = (function(_super) {
      __extends(State, _super);

      function State() {
        _ref = State.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      State.prototype.defaults = function() {
        return {
          headerRendered: false,
          currentProject: null
        };
      };

      State.prototype.initialize = function() {
        var _this = this;
        State.__super__.initialize.apply(this, arguments);
        return this.subscribe('authorized', function() {
          return _this.getProjects();
        });
      };

      State.prototype._getCurrentProject = function(cb, prop) {
        var returnProp,
          _this = this;
        returnProp = function(model) {
          var returnVal;
          returnVal = prop != null ? model.get(prop) : model;
          return cb(returnVal);
        };
        if (this.get('currentProject') != null) {
          return returnProp(this.get('currentProject'));
        } else {
          return this.once('change:currentProject', function(stateModel, projectModel, options) {
            return returnProp(projectModel);
          });
        }
      };

      State.prototype.getCurrentProjectId = function(cb) {
        return this._getCurrentProject(cb, 'id');
      };

      State.prototype.getCurrentProjectName = function(cb) {
        return this._getCurrentProject(cb, 'name');
      };

      State.prototype.getCurrentProject = function(cb) {
        return this._getCurrentProject(cb);
      };

      State.prototype.setCurrentProject = function(id) {
        var fragmentPart, project;
        fragmentPart = history.last() != null ? history.last().split('/') : [];
        if (id != null) {
          project = this.get('projects').get(id);
        } else if (fragmentPart[1] === 'projects') {
          project = this.get('projects').find(function(p) {
            return p.get('name') === fragmentPart[2];
          });
        } else {
          project = this.get('projects').first();
        }
        return this.set('currentProject', project);
      };

      State.prototype.onHeaderRendered = function(cb) {
        if (this.get('headerRendered')) {
          return cb();
        } else {
          return this.subscribe('header:render:complete', function() {
            cb();
            return this.set('headerRendered', true);
          });
        }
      };

      State.prototype.getProjects = function() {};

      return State;

    })(Models.Base);
    return new State();
  });

}).call(this);

define('text!html/ui/header.html',[],function () { return '<div class="main"><div class="row span3"><div class="cell span1 project aligncenter"><img src="/images/logo.elaborate.png"/><ul class="horizontal menu"><li class="thisproject arrowdown"> <span class="projecttitle"><%= projects.current.get(\'title\') %></span><ul class="vertical menu"><li class="search">Search &amp; overview</li><li class="settings">Project settings</li><li class="history">History</li><li class="publish">Publish</li></ul></li></ul></div><div class="cell span1"><span class="message"></span></div><div class="cell span1 user alignright"><ul class="horizontal menu"><li>Help</li><li class="username arrowdown"><%= user.title %><ul class="vertical menu"><li class="projects arrowleft">My projects<ul class="vertical menu"><% projects.each(function(project) { %><li data-id="<%= project.id %>" class="project"><%= project.get(\'title\') %></li><% }); %></ul></li><li class="logout">Logout</li></ul></li></ul><img src="/images/logo.huygens.png"/></div></div></div>';});

(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define('views/ui/header',['require','views/base','models/currentUser','models/state','collections/projects','text!html/ui/header.html'],function(require) {
    var BaseView, Collections, Header, Models, Templates, _ref;
    BaseView = require('views/base');
    Models = {
      currentUser: require('models/currentUser'),
      state: require('models/state')
    };
    Collections = {
      projects: require('collections/projects')
    };
    Templates = {
      Header: require('text!html/ui/header.html')
    };
    return Header = (function(_super) {
      __extends(Header, _super);

      function Header() {
        _ref = Header.__super__.constructor.apply(this, arguments);
        return _ref;
      }

      Header.prototype.tagName = 'header';

      Header.prototype.className = 'main';

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

      Header.prototype.initialize = function() {
        var _this = this;
        Header.__super__.initialize.apply(this, arguments);
        this.listenTo(Collections.projects, 'current:change', function(project) {
          return _this.render();
        });
        Collections.projects.getCurrent(function(project) {
          _this.project = project;
        });
        return this.subscribe('message', this.showMessage, this);
      };

      Header.prototype.render = function() {
        var rtpl;
        rtpl = _.template(Templates.Header, {
          projects: Collections.projects,
          user: Models.currentUser.attributes
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
        var $message, timer,
          _this = this;
        $message = this.$('.message');
        $message.addClass('active');
        $message.html(msg);
        return timer = setTimeout((function() {
          $message.removeClass('active');
          return clearTimeout(timer);
        }), 7000);
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
                managed: false
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

(function() {
  require.config({
    paths: {
      'jquery': '../lib/jquery/jquery',
      'long-press': '../lib/long-press/jquery.longpress',
      'underscore': '../lib/underscore-amd/underscore',
      'backbone': '../lib/backbone-amd/backbone',
      'domready': '../lib/requirejs-domready/domReady',
      'text': '../lib/requirejs-text/text',
      'faceted-search': '../lib/faceted-search/stage/js/main',
      'hilib': '../lib/hilib/compiled',
      'html': '../html'
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
        deps: ['backbone', 'text']
      },
      'long-press': {
        deps: ['jquery']
      }
    }
  });

  require(['domready', 'app', 'underscore'], function(domready, app, _) {
    return domready(function() {
      return app.init();
    });
  });

}).call(this);

define("main", function(){});
}());