const hasProp = {}.hasOwnProperty

import Backbone from "backbone";
import $  from "jquery";

import _  from "underscore";

export default {
  // Native alternative to $.closest
  // See http://stackoverflow.com/questions/15329167/closest-ancestor-matching-selector-using-native-dom
  closest: function(el, selector) {
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
    text = chars.charAt(Math.floor(Math.random() * 52)); // Start with a letter
    while (length--) { // Countdown is more lightweight than for-loop
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
  // Starts a timer which resets when it is called again. The third arg is a function
  // which is called everytime the timer is reset. You can use it, for example, to animate
  // a visual object on reset (shake, pulse, or whatever).

  // Example: with a scroll event, when a user stops scrolling, the timer ends.
  // Without the reset, the timer would fire dozens of times.
  // Can also be handy to avoid double clicks.

  // Example usages:
  // div.addEventListener 'scroll', (ev) ->
  // 	Fn.timeoutWithReset 200, -> console.log('finished!')

  // div.addEventListener 'click', (ev) ->
  // 	Fn.timeoutWithReset 5000, (=> $message.removeClass 'active'), => 
  // 		$message.addClass 'shake'
  // 		setTimeout (=> $message.removeClass 'shake'), 200

  // return Function
  timeoutWithReset: (function() {
    var timer;
    timer = null;
    return function(ms, cb, onResetFn?) {
      if (timer != null) {
        if (onResetFn != null) {
          onResetFn();
        }
        clearTimeout(timer);
      }
      return timer = setTimeout((function() {
        // clearTimeout frees the memory, but does not clear the var. So we manually clear it,
        // otherwise onResetFn will be called on the next call to timeoutWithReset.
        timer = null;
        // Trigger the callback.
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
  highlighter: function(args: any = {}) {
    var className, el, tagName;
    ({className, tagName} = args);
    if (className == null) {
      className = 'hilite';
    }
    if (tagName == null) {
      tagName = 'span';
    }
    el = null; // Create reference to the element doing the highlighting
    return {
      on: function(args) {
        var endNode, range, startNode;
        ({startNode, endNode} = args);
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
  /* Escape a regular expression */
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
  flattenObject: function(obj, into?, prefix?) {
    var k, v;
    if (into == null) {
      into = {};
    }
    if (prefix == null) {
      prefix = '';
    }
    for (k in obj) {
      if (!hasProp.call(obj, k)) continue;
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
      if (!hasProp.call(current, attr)) continue;
      value = current[attr];
      if (!changed.hasOwnProperty(attr)) {
        changes[attr] = 'removed';
      }
    }
    for (attr in changed) {
      if (!hasProp.call(changed, attr)) continue;
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
    var left, scrolledLeft, scrolledTop, top, totalLeft, totalTop;
    scrolledTop = el.scrollTop;
    totalTop = el.scrollHeight - el.clientHeight;
    scrolledLeft = el.scrollLeft;
    totalLeft = el.scrollWidth - el.clientWidth;
    top = totalTop === 0 ? 0 : Math.floor((scrolledTop / totalTop) * 100);
    left = totalLeft === 0 ? 0 : Math.floor((scrolledLeft / totalLeft) * 100);
    return {
      top: top,
      left: left
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
  // * TODO checked=true as first argument
  checkCheckboxes: function(selector = 'input[type="checkbox"]', checked = true, baseEl = document) {
    var cb, checkboxes, i, len, results;
    checkboxes = baseEl.querySelectorAll(selector);
    results = [];
    for (i = 0, len = checkboxes.length; i < len; i++) {
      cb = checkboxes[i];
      results.push(cb.checked = checked);
    }
    return results;
  },
  setCursorToEnd: function(textEl, windowEl) {
    var range, sel, win;
    // Set win to windowEl or window. In FF the window object is different
    // from the window object in Chrome. Define before setting focus!
    win = windowEl != null ? windowEl : window;
    // If windowEl is empty, use textEl to set focus.
    if (windowEl == null) {
      windowEl = textEl;
    }
    windowEl.focus();
    // Create range and collapse to end.
    range = document.createRange();
    range.selectNodeContents(textEl);
    range.collapse(false);
    // Get selection and set the new collapsed range.
    sel = win.getSelection();
    if (sel != null) {
      sel.removeAllRanges();
      return sel.addRange(range);
    }
  },
  // IE9+
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
