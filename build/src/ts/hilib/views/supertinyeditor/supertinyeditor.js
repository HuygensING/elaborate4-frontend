import $ from "jquery";
import Fn from "../../utils/general";
import StringFn from "../../utils/string";
import '../../utils/jquery.mixin';
import Longpress from "../longpress/main";
import Base from "../base";
import tpl from "./main.jade";
import diacriticsTpl from "./diacritics.jade";
export default class SuperTinyEditor extends Base {
    options;
    autoScroll;
    $currentHeader;
    iframeDocument;
    iframeBody;
    longpress;
    initialize(options) {
        var base, base1, base2, base3, base4;
        this.options = options;
        super.initialize();
        if ((base = this.options).cssFile == null) {
            base.cssFile = '';
        }
        if ((base1 = this.options).html == null) {
            base1.html = '';
        }
        if ((base2 = this.options).width == null) {
            base2.width = '320';
        }
        if ((base3 = this.options).height == null) {
            base3.height = '200';
        }
        if ((base4 = this.options).wrap == null) {
            base4.wrap = false;
        }
        this.on('button:save', () => { });
        return this.render();
    }
    render() {
        this.el.innerHTML = tpl();
        this.$currentHeader = this.$('.ste-header');
        this.renderControls();
        this.renderIframe();
        return this;
    }
    renderControls() {
        var controlName, diacriticsUL, div, i, len, ref, results;
        ref = this.options.controls;
        results = [];
        for (i = 0, len = ref.length; i < len; i++) {
            controlName = ref[i];
            div = document.createElement('div');
            if (controlName === 'n') {
                div.className = 'ste-header';
                this.$('.ste-body').before(div);
                results.push(this.$currentHeader = $(div));
            }
            else if (controlName === '|') {
                div.className = 'ste-divider';
                results.push(this.$currentHeader.append(div));
            }
            else if (controlName === 'diacritics') {
                div.className = 'ste-control-diacritics ' + controlName;
                div.setAttribute('title', StringFn.ucfirst(controlName));
                div.setAttribute('data-action', controlName);
                diacriticsUL = document.createElement('div');
                diacriticsUL.className = 'diacritics-placeholder';
                diacriticsUL.innerHTML = diacriticsTpl();
                div.appendChild(diacriticsUL);
                results.push(this.$currentHeader.append(div));
            }
            else if (controlName === 'wordwrap') {
                div.className = 'ste-control-wordwrap';
                div.setAttribute('title', 'Word wrap');
                div.setAttribute('data-action', controlName);
                results.push(this.$currentHeader.append(div));
            }
            else if (controlName.substr(0, 2) === 'b_') {
                controlName = controlName.substr(2);
                div.className = 'ste-button';
                div.setAttribute('data-action', controlName);
                div.setAttribute('title', StringFn.ucfirst(controlName));
                div.innerHTML = StringFn.ucfirst(controlName);
                results.push(this.$currentHeader.append(div));
            }
            else {
                div.className = 'ste-control ' + controlName;
                div.setAttribute('title', StringFn.ucfirst(controlName));
                div.setAttribute('data-action', controlName);
                results.push(this.$currentHeader.append(div));
            }
        }
        return results;
    }
    renderIframe() {
        var iframe, steBody;
        iframe = document.createElement('iframe');
        iframe.style.width = this.options.width + 'px';
        iframe.style.height = this.options.height + 'px';
        iframe.src = "about:blank";
        iframe.onload = () => {
            this.iframeDocument = iframe.contentDocument;
            this.iframeDocument.designMode = 'On';
            this.iframeDocument.open();
            this.iframeDocument.write(`<!DOCTYPE html> <html> <head><meta charset='UTF-8'><link rel='stylesheet' href='${this.options.cssFile}'></head> <body class='ste-iframe-body' spellcheck='false' contenteditable='true'>${this.model.get(this.options.htmlAttribute)}</body> </html>`);
            this.iframeDocument.close();
            this.iframeBody = this.iframeDocument.querySelector('body');
            if (this.options.wrap) {
                this.iframeBody.style.whiteSpace = 'normal';
            }
            this.setFocus();
            this.longpress = new Longpress({
                parent: this.el.querySelector('.ste-body')
            });
            this.iframeDocument.addEventListener('scroll', () => {
                if (!this.autoScroll) {
                    return this.triggerScroll();
                }
            });
            return this.iframeDocument.addEventListener('keyup', (ev) => {
                return Fn.timeoutWithReset(500, () => {
                    this.triggerScroll();
                    return this.saveHTMLToModel();
                });
            });
        };
        steBody = this.el.querySelector('.ste-body');
        return steBody.appendChild(iframe);
    }
    events() {
        return {
            'click .ste-control': 'controlClicked',
            'click .ste-control-diacritics ul.diacritics li': 'diacriticClicked',
            'click .ste-control-wordwrap': 'wordwrapClicked',
            'click .ste-button': 'buttonClicked'
        };
    }
    buttonClicked(ev) {
        var action;
        action = ev.currentTarget.getAttribute('data-action');
        if (action !== 'save' || (action === 'save' && $(ev.currentTarget).hasClass('active'))) {
            return this.trigger('button:' + action);
        }
    }
    controlClicked(ev) {
        var action;
        action = ev.currentTarget.getAttribute('data-action');
        this.iframeDocument.execCommand(action, false, null);
        this.saveHTMLToModel();
        return this.trigger('control:' + action);
    }
    wordwrapClicked(ev) {
        var iframeBody;
        iframeBody = $(this.iframeBody);
        iframeBody.toggleClass('wrap');
        return this.trigger('control:wordwrap', iframeBody.hasClass('wrap'));
    }
    diacriticClicked(ev) {
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
        this.saveHTMLToModel();
        return this.trigger('control:diacritic', textNode);
    }
    destroy() {
        this.longpress.destroy();
        return this.remove();
    }
    saveHTMLToModel() {
        this.$('[data-action="save"]').addClass('active');
        return this.model.set(this.options.htmlAttribute, this.iframeBody.innerHTML);
    }
    triggerScroll() {
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
    }
    setModel(model) {
        this.setInnerHTML(model.get(this.options.htmlAttribute));
        this.model = model;
        return this.setFocus();
    }
    setInnerHTML(html) {
        return this.iframeBody.innerHTML = html;
    }
    setIframeHeight(height) {
        var iframe;
        iframe = this.el.querySelector('iframe');
        return iframe.style.height = height + 'px';
    }
    setIframeWidth(width) {
        var iframe;
        iframe = this.el.querySelector('iframe');
        return iframe.style.width = width + 'px';
    }
    setFocus() {
        var win;
        if ((this.iframeBody != null) && (win = this.el.querySelector('iframe').contentWindow)) {
            return Fn.setCursorToEnd(this.iframeBody, win);
        }
    }
    setScrollPercentage(percentages) {
        var clientHeight, clientWidth, contentWindow, documentElement, left, scrollHeight, scrollWidth, top;
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
        return setTimeout((() => {
            return this.autoScroll = false;
        }), 200);
    }
}
;
SuperTinyEditor.prototype.className = 'supertinyeditor';
