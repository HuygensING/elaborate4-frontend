export function el(el) {
  return {
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
    boundingBox: function() {
      var box;
      box = this.position();
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
    insertAfter: function(referenceElement) {
      return referenceElement.parentNode.insertBefore(el, referenceElement.nextSibling);
    },
    hasScrollBar: function(el) {
      return this.hasScrollBarX(el) || this.hasScrollBarY(el);
    },
    hasScrollBarX: function(el) {
      return el.scrollWidth > el.clientWidth;
    },
    hasScrollBarY: function(el) {
      return el.scrollHeight > el.clientHeight;
    },
    // http://stackoverflow.com/questions/123999/how-to-tell-if-a-dom-element-is-visible-in-the-current-viewport/7557433#7557433
    inViewport: function(parent?) {
      const win = parent != null ? parent : window;
      const doc = parent != null ? parent : document.documentElement;
      const rect = el.getBoundingClientRect();
      return rect.top >= 0 && rect.left >= 0 && rect.bottom <= (win.innerHeight || doc.clientHeight) && rect.right <= (win.innerWidth || doc.clientWidth);
    }
  };
}
