import _  from "underscore";

export const dom = function(el) {
  if (_.isString(el)) {
    el = document.querySelector(el);
  }
  return {
    el: el,
    q: function(query) {
      return dom(query);
    },
    find: function(query) {
      return dom(query);
    },
    findAll: function(query) {
      return dom(el.querySelectorAll(query));
    },
    html: function(html) {
      if (html == null) {
        return el.innerHTML;
      }
      // Check if html is an HTMLelement
      if (html.nodeType === 1 || html.nodeType === 11) {
        el.innerHTML = '';
        return el.appendChild(html);
      } else {
        // Assume html is a String
        return el.innerHTML = html;
      }
    },
    hide: function() {
      el.style.display = 'none';
      return this;
    },
    show: function(displayType = 'block') {
      el.style.display = displayType;
      return this;
    },
    toggle: function(displayType = 'block', show) {
      var dt;
      dt = el.style.display === displayType ? 'none' : displayType;
      if (show != null) {
        dt = show ? displayType : 'none';
      }
      el.style.display = dt;
      return this;
    },
    // Native alternative to $.closest
    // See http://stackoverflow.com/questions/15329167/closest-ancestor-matching-selector-using-native-dom
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
    append: function(childEl) {
      return el.appendChild(childEl);
    },
    prepend: function(childEl) {
      return el.insertBefore(childEl, el.firstChild);
    },
    /*
    Native alternative to jQuery's $.offset()

    http://www.quirksmode.org/js/findpos.html
    */
    position: function(parent = document.body) {
      var left, loopEl, top;
      left = 0;
      top = 0;
      loopEl = el;
      while ((loopEl != null) && loopEl !== parent) {
        if (this.hasDescendant(parent)) {
          // Not every parent is an offsetParent. So in the case the user has passed a non offsetParent as the parent, 
          // we check if the loop has passed the parent (by checking if the offsetParent has a descendant which is the parent).
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
    },
    boundingBox: function() {
      var box;
      box = this.position();
      box.width = el.clientWidth;
      box.height = el.clientHeight;
      box.right = box.left + box.width;
      box.bottom = box.top + box.height;
      return box;
    },
    insertAfter: function(referenceElement) {
      return referenceElement.parentNode.insertBefore(el, referenceElement.nextSibling);
    },
    // Highlight every text node from el, to endNode (argument).
    // Every text node will be surrounded by a span.highlight.

    // Example usage:
    // highlighter = null # Create a reference highlighter
    // @$("div.hover")
    // 	.mouseenter (ev) =>
    // 		startNode = @el.querySelector "span.start_node']"
    // 		endNode = @el.querySelector "span.end_node']"
    // 		highlighter = dom(startNode).highlightUntil(endNode).on()
    // 	.mouseleave (ev) =>
    // 		highlighter.off()
    highlightUntil: function(endNode, options: any = {}) {
      if (options.highlightClass == null) {
        options.highlightClass = 'highlight';
      }
      if (options.tagName == null) {
        options.tagName = 'span';
      }
      return {
        on: function() {
          var filter, newNode, range, range2, treewalker;
          range = document.createRange();
          range.setStartAfter(el);
          range.setEndBefore(endNode);
          filter = (node) => {
            var end, r, start;
            r = document.createRange();
            r.selectNode(node);
            start = r.compareBoundaryPoints(Range.START_TO_START, range);
            end = r.compareBoundaryPoints(Range.END_TO_START, range);
            if (start === -1 || end === 1) {
              return NodeFilter.FILTER_SKIP;
            } else {
              return NodeFilter.FILTER_ACCEPT;
            }
          };
          filter.acceptNode = filter;
          treewalker = document.createTreeWalker(range.commonAncestorContainer, NodeFilter.SHOW_TEXT, filter, false);
          while (treewalker.nextNode()) {
            range2 = new Range();
            range2.selectNode(treewalker.currentNode);
            newNode = document.createElement(options.tagName);
            newNode.className = options.highlightClass;
            range2.surroundContents(newNode);
          }
          return this;
        },
        off: function() {
          var i, len, ref, results;
          ref = document.querySelectorAll('.' + options.highlightClass);
          results = [];
          for (i = 0, len = ref.length; i < len; i++) {
            el = ref[i];
            // Move the text out of the span.highlight
            el.parentElement.insertBefore(el.firstChild, el);
            // Remove the span.highlight
            results.push(el.parentElement.removeChild(el));
          }
          return results;
        }
      };
    },
    hasClass: function(name) {
      return (' ' + el.className + ' ').indexOf(' ' + name + ' ') > -1;
    },
    addClass: function(name) {
      if (!this.hasClass(name)) {
        return el.className += ' ' + name;
      }
    },
    removeClass: function(name) {
      var names;
      names = ' ' + el.className + ' ';
      names = names.replace(' ' + name + ' ', '');
      return el.className = names.replace(/^\s+|\s+$/g, '');
    },
    toggleClass: function(name) {
      if (this.hasClass(name)) {
        return this.addClass(name);
      } else {
        return this.removeClass(name);
      }
    },
    // http://stackoverflow.com/questions/123999/how-to-tell-if-a-dom-element-is-visible-in-the-current-viewport/7557433#7557433
    inViewport: function(parent?) {
      var doc, rect, win;
      win = parent != null ? parent : window;
      doc = parent != null ? parent : document.documentElement;
      rect = el.getBoundingClientRect();
      return rect.top >= 0 && rect.left >= 0 && rect.bottom <= (win.innerHeight || doc.clientHeight) && rect.right <= (win.innerWidth || doc.clientWidth);
    },
    // Create a TreeWalker object between two given nodes. By default
    // the TreeWalker traverses elements, but this can be overridden
    // by passing a nodeFilterConstant see: https://developer.mozilla.org/en-US/docs/Web/API/TreeWalker
    createTreeWalker: function(endNode, nodeFilterConstant) {
      var filter, range;
      if (nodeFilterConstant == null) {
        nodeFilterConstant = NodeFilter.SHOW_ELEMENT;
      }
      range = document.createRange();
      range.setStartAfter(el);
      range.setEndBefore(endNode);
      filter = (node) => {
        var end, r, start;
        r = document.createRange();
        r.selectNode(node);
        start = r.compareBoundaryPoints(Range.START_TO_START, range);
        end = r.compareBoundaryPoints(Range.END_TO_START, range);
        if (start === -1 || end === 1) {
          return NodeFilter.FILTER_SKIP;
        } else {
          return NodeFilter.FILTER_ACCEPT;
        }
      };
      filter.acceptNode = filter;
      return document.createTreeWalker(range.commonAncestorContainer, nodeFilterConstant, filter, false);
    }
  };
};
