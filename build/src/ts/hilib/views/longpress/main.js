import Base from "../base";
import codes from "./codes";
import shiftcodes from "./shiftcodes";
import diacritics from "./diacritics";
import _ from "underscore";
export default class Longpress extends Base {
    options;
    timer;
    lastKeyCode;
    keyDown;
    iframe;
    iframeBody;
    editorBody;
    longKeyDown;
    rangeManager;
    initialize(options) {
        this.options = options;
        super.initialize();
        this.timer = null;
        this.lastKeyCode = null;
        this.keyDown = false;
        this.iframe = this.options.parent.querySelector('iframe');
        this.iframeBody = this.iframe.contentDocument.querySelector('body');
        this.iframeBody.addEventListener('keydown', this.onKeydown.bind(this));
        this.iframeBody.addEventListener('keyup', this.onKeyup.bind(this));
        this.editorBody = this.options.parent;
        return this.editorBody.addEventListener('click', this.onClick.bind(this));
    }
    render(pressedChar) {
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
    onKeydown(e) {
        var pressedChar;
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
    onClick(e) {
        if (this.editorBody.querySelector('ul.longpress') != null) {
            e.preventDefault();
            e.stopPropagation();
            return this.resetFocus();
        }
    }
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
        range = this.rangeManager.get();
        range.setStart(range.startContainer, range.startOffset - 1);
        range.deleteContents();
        range.insertNode(document.createTextNode(chr));
        range.collapse(false);
        return this.resetFocus();
    }
    resetFocus() {
        var sel;
        this.iframe.contentWindow.focus();
        sel = this.iframe.contentWindow.getSelection();
        sel.removeAllRanges();
        return sel.addRange(this.rangeManager.get());
    }
}
;
Longpress.prototype.rangeManager = (function () {
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
