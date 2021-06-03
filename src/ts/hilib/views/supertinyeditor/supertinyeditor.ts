// A Super Tiny Editor

// ### Options
// * cssFile CSS file to include for custom style
// * model Backbone.Model
// * htmlAttribute The attribute on the model which holds the HTML to edit
// * width Number Width of the iframe
// * height Number Height of the iframe, total height includes the menu(s)
// * wrap Boolean Sets white-space to normal on the iframe body if set to true

import $  from "jquery";
import Fn  from "../../utils/general";
import StringFn  from "../../utils/string";
import '../../utils/jquery.mixin'
import Longpress  from "../longpress/main";
import  Base from "../base"
import tpl  from "./main.jade";
import diacriticsTpl  from "./diacritics.jade";
import './supertinyeditor.styl'
import './diacritics.styl'

// console.log tpls
// Templates =
// 	Main: require 'hilib/views/supertinyeditor/supertinyeditor.jade'
// 	Diacritics: require 'hilib/views/supertinyeditor/diacritics.jade'

  // ## SuperTinyEditor
export default class SuperTinyEditor extends Base {
  options
  autoScroll
  $currentHeader
  iframeDocument
  iframeBody
  longpress

  // ### Initialize
  constructor(options?) {
    super({ ...options, className: 'supertinyeditor' })

    var base, base1, base2, base3, base4;
    this.options = options;
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
    this.on('button:save', () => {}); // TODO Deactive save button
    this.render()
  }

  // ### Render
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
      // N stands for 'New header', and is created by a new div.ste-header
      if (controlName === 'n') {
        div.className = 'ste-header';
        // Insert after last .ste-header by inserting before .ste-body
        this.$('.ste-body').before(div);
        // Set newly created header to be the @$currentHeader
        results.push(this.$currentHeader = $(div));
      // Create a divider
      } else if (controlName === '|') {
        div.className = 'ste-divider';
        results.push(this.$currentHeader.append(div));
      // Create a diacritics menu
      } else if (controlName === 'diacritics') {
        div.className = 'ste-control-diacritics ' + controlName;
        div.setAttribute('title', StringFn.ucfirst(controlName));
        div.setAttribute('data-action', controlName);
        diacriticsUL = document.createElement('div');
        diacriticsUL.className = 'diacritics-placeholder';
        diacriticsUL.innerHTML = diacriticsTpl();
        div.appendChild(diacriticsUL);
        results.push(this.$currentHeader.append(div));
      } else if (controlName === 'wordwrap') {
        div.className = 'ste-control-wordwrap';
        div.setAttribute('title', 'Word wrap');
        div.setAttribute('data-action', controlName);
        results.push(this.$currentHeader.append(div));
      // Create a button
      } else if (controlName.substr(0, 2) === 'b_') {
        controlName = controlName.substr(2);
        div.className = 'ste-button';
        div.setAttribute('data-action', controlName);
        div.setAttribute('title', StringFn.ucfirst(controlName));
        div.innerHTML = StringFn.ucfirst(controlName);
        results.push(this.$currentHeader.append(div));
      } else {
        // Create a 'normal' control
        div.className = 'ste-control ' + controlName;
        div.setAttribute('title', StringFn.ucfirst(controlName));
        div.setAttribute('data-action', controlName);
        results.push(this.$currentHeader.append(div));
      }
    }
    return results;
  }

  // The iframe is already present (in the template), but has to be filled with a document.
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
      } as any);
      // Hack, hack, hack.
      // The scroll event on the iframe is fired (through the contentDocument or contentWindow), but no scrollLeft,
      // scrollWidth or clientWidth are given. ScrollWidth and clientWidth are found by document.documentElement, but
      // for scrollLeft we need jQuery. Normally Fn.scrollPercentage receives ev.currentTarget or ev.target, but we have
      // to construct the object ourselves in this case.

      // Scroll is also triggered when using the contentWindow.scrollTo function in @setScrollPercentage,
      // but should not update the other scroll(s).@autoScroll is used to prevent both scrollers of updating eachother
      // and thus forming a loop.
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

  // ### Events
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
    // Get the selection from the contentWindow
    sel = this.el.querySelector('iframe').contentWindow.getSelection();
    // Delete the range and insert the clicked char
    range = sel.getRangeAt(0);
    range.deleteContents();
    textNode = ev.currentTarget.childNodes[0].cloneNode();
    range.insertNode(textNode);
    // Move cursor after textNode
    range.setStartAfter(textNode);
    range.setEndAfter(textNode);
    sel.removeAllRanges();
    sel.addRange(range);
    this.saveHTMLToModel();
    return this.trigger('control:diacritic', textNode);
  }

  // ### Methods
  destroy() {
    this.longpress.destroy();
    return this.remove();
  }

  saveHTMLToModel() {
    // TODO Active save button
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

  // TODO rename to setHeight, setWidth
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

  // Set focus to the end of the body text
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
    // Give the receiving end (Views.EntryPreview) some time to respond and then turn off the autoScroll
    return setTimeout((() => {
      return this.autoScroll = false;
    }), 200);
  }

};
