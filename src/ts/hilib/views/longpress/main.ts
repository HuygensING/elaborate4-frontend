import Base from "../base"
import codes  from "./codes"
import shiftcodes  from "./shiftcodes"
import diacritics  from "./diacritics"
import _ from "underscore"

export default class Longpress extends Base {
  timer
  lastKeyCode
  keyDown
  iframe
  iframeBody
  editorBody
  longKeyDown
  rangeManager

  // ### Initialize
  constructor(private options?) {
    super(options)
    this.timer = null;
    this.lastKeyCode = null;
    this.keyDown = false;
    this.iframe = this.options.parent.querySelector('iframe');
    this.iframeBody = this.iframe.contentDocument.querySelector('body');
    this.iframeBody.addEventListener('keydown', this.onKeydown.bind(this));
    this.iframeBody.addEventListener('keyup', this.onKeyup.bind(this));
    this.editorBody = this.options.parent;
    this.editorBody.addEventListener('click', this.onClick.bind(this));
  }

  // ### Render
  render(pressedChar?) {
    var frag, ul;
    ul = document.createElement('ul');
    ul.className = 'longpress';
    frag = document.createDocumentFragment();
    _.each(diacritics[pressedChar], (chr) => {
      var li;
      li = document.createElement('li');
      li.textContent = chr;
      $(li).mouseenter((e) => {
        return this.replaceChar(e.target.textContent);
      });
      return frag.appendChild(li);
    });
    ul.appendChild(frag);
    return ul;
  }

  // ### Events
  onKeydown(e) {
    var pressedChar;
    // Without @longkeydown check, the onkeydown handler will do some logic (place a char in the editor)
    // when the user clicks the editor or ul.longpress.
    if (this.longKeyDown) {
      e.preventDefault();
      return false;
    }
    // Get the pressedChar from the keyCode
    pressedChar = e.shiftKey ? shiftcodes[e.keyCode] : codes[e.keyCode];
    
    // If the pressedChar is found in one of the code maps (shiftcodes or codes) and if
    // the keyCode is equal to the lastKeyCode (so, an "e" was entered, if you hold the "e"-key, than
    // onkeydown keeps being fired, on the second pass we init the timer), than we show the list if it not already
    // is shown. 
    if (e.keyCode === this.lastKeyCode) {
      e.preventDefault();
      if (pressedChar != null) {
        // onKeyDown is going for it's second run (same char is held for two events in a row)
        this.longKeyDown = true;
        if (this.timer == null) {
          this.timer = setTimeout((() => {
            var list;
            this.rangeManager.set(this.iframe.contentWindow.getSelection().getRangeAt(0));
            list = this.render(pressedChar);
            return this.show(list);
          }), 300);
        }
      }
    }
    return this.lastKeyCode = e.keyCode;
  }

  onKeyup(e) {
    this.longKeyDown = false;
    return this.hide();
  }

  // The click event is superfluous, because a character was already selected by the
  // mouseenter event, but will be frequently used by users.
  onClick(e) {
    // If the <ul> is visible.
    if (this.editorBody.querySelector('ul.longpress') != null) {
      e.preventDefault();
      e.stopPropagation();
      // The click blurs (loses focus of) the iframe. So we have to reset it back to the
      // iframe and to it's original position so the user can keep typing.
      return this.resetFocus();
    }
  }

  // ### Methods
  destroy() {
    this.iframeBody.removeEventListener('keydown', this.onKeydown);
    this.iframeBody.removeEventListener('keyup', this.onKeyup);
    this.editorBody.removeEventListener('click', this.onClick);
    return this.remove();
  }

  show(list) {
    return this.editorBody.appendChild(list);
  }

  hide() {
    var list;
    this.lastKeyCode = null;
    list = this.editorBody.querySelector('.longpress');
    if (list != null) {
      clearTimeout(this.timer);
      this.timer = null;
      this.rangeManager.clear();
      return this.editorBody.removeChild(list);
    }
  }

  replaceChar(chr) {
    var range;
    // Get the range from the rangeManager.
    range = this.rangeManager.get();
    // Set new start of the range one character backwards.
    range.setStart(range.startContainer, range.startOffset - 1);
    // Delete the selected character.
    range.deleteContents();
    // Insert the new character in place of the just removed character.
    range.insertNode(document.createTextNode(chr));
    // Collapse to the end.
    range.collapse(false);
    return this.resetFocus();
  }

  // Sets the focus on the iframe and the caret to the original position.
  resetFocus() {
    var sel;
    // Set focus to the contentWindow before getting the selection.
    this.iframe.contentWindow.focus();
    
    // Get the selection from the contentWindow.
    sel = this.iframe.contentWindow.getSelection();
    // Remove all ranges.
    sel.removeAllRanges();
    // Add new collapsed range (which will be at the end of the just inserted character)
    return sel.addRange(this.rangeManager.get());
  }

};

Longpress.prototype.rangeManager = (function() {
  var currentRange;
  currentRange = null;
  return {
    get: () => {
      return currentRange;
    },
    set: (r) => {
      return currentRange = r.cloneRange();
    },
    clear: () => {
      return currentRange = null;
    }
  };
})();

