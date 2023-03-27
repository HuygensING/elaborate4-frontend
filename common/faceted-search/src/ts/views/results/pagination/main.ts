/*
Create a pagination view.
@class
@extends Backbone.View
*/
import Backbone from "backbone"
import $ from "jquery"
import { util } from "@elaborate4-frontend/funcky"
import { className, tagName } from "@elaborate4-frontend/hilib"

import tpl from "./main.jade"
import './main.styl'

@className('hibb-pagination')
@tagName('ul')
export default class Pagination extends Backbone.View {
  options
  _currentPageNumber
  _pageCount
  triggerPageNumber

  /*
  @constructs
  @param {object} this.options
  @prop {number} options.resultsTotal - Total number of results.
  @prop {number} options.resultsPerPage - Number of results per page.
  @prop {number} [options.resultsStart=0] - The result item to start at. Not the start page!
  @prop {boolean} [options.step10=true] - Render (<< and >>) for steps of 10.
  @prop {boolean} [options.triggerPageNumber=true] - Trigger the new pageNumber (true) or prev/next (false).
  */
  constructor(options) {
    super(options)

    this.options = options;

    if (this.options.step10 == null) this.options.step10 = true;
    if (this.options.triggerPageNumber == null) this.options.triggerPageNumber = true

    this._currentPageNumber = (
      this.options.resultsStart != null &&
      this.options.resultsStart > 0
    ) ?
      (this.options.resultsStart / this.options.resultsPerPage) + 1 :
      1

    this.setPageNumber(this._currentPageNumber, true);
  }

  // DEBUG
  // console.log "currentPage", currentPage
  // console.log "@options.resultsStart", @options.resultsStart
  // console.log "@options.resultsPerPage", @options.resultsPerPage
  // console.log "@options.resultsStart/@options.resultsPerPage", @options.resultsStart/@options.resultsPerPage
  render() {
    var attrs;
    this._pageCount = Math.ceil(this.options.resultsTotal / this.options.resultsPerPage);
    attrs = $.extend(this.options, {
      currentPageNumber: this._currentPageNumber,
      pageCount: this._pageCount
    });
    this.el.innerHTML = tpl(attrs);
    if (this._pageCount <= 1) {
      this.$el.hide();
    }
    return this;
  }

  events() {
    return {
      'click li.prev10.active': '_handlePrev10',
      'click li.prev.active': '_handlePrev',
      'click li.next.active': '_handleNext',
      'click li.next10.active': '_handleNext10',
      'click li.current:not(.active)': '_handleCurrentClick',
      'blur li.current.active input': '_handleBlur',
      'keyup li.current.active input': '_handleKeyup'
    };
  }

  _handlePrev10() {
    return this.setPageNumber(this._currentPageNumber - 10)
  }

  _handlePrev() {
    return this.setPageNumber(this._currentPageNumber - 1)
  }

  _handleNext() {
    return this.setPageNumber(this._currentPageNumber + 1)
  }

  _handleNext10() {
    return this.setPageNumber(this._currentPageNumber + 10)
  }

  _handleCurrentClick(ev) {
    const target = this.$(ev.currentTarget)
    const span = target.find('span')
    const input = target.find('input')
    // Sequence is important here!
    // First: set the input width to the span's width.
    input.width(span.width())
    // Second: add the active class to the li.
    target.addClass('active')
    // Third: animate the input to a given width.
    input.animate({ width: 40 }, 'fast')
    // First set the focus, than (re)set the current page number,
    // so the cursor is put at the end. This is also possible (more robust)
    // with a selection object, but this is way simpler.
    input.focus()

    input.val(this._currentPageNumber)
  }

  _handleKeyup(ev) {
    const input = this.$(ev.currentTarget)
    const newPageNumber = +input.val();
    if (ev.keyCode === 13) {
      if ((1 <= newPageNumber && newPageNumber <= this._pageCount)) {
        this.setPageNumber(newPageNumber);
      }
      return this._deactivateCurrentLi(input);
    }
  }

  _handleBlur(ev) {
    return this._deactivateCurrentLi(this.$(ev.currentTarget));
  }

  _deactivateCurrentLi(input) {
    return input.animate({
      width: 0
    }, 'fast', function() {
      var li;
      li = input.parent();
      return li.removeClass('active');
    });
  }

  /*
  @method getCurrentPageNumber
  @returns {number}
  */
  getCurrentPageNumber() {
    return this._currentPageNumber;
  }

  /*
  @method setPageNumber
  @param {number} pageNumber
  @param {boolean} [silent=false]
  */
  setPageNumber(pageNumber, silent = false) {
    var direction;
    if (!this.triggerPageNumber) {
      direction = pageNumber < this._currentPageNumber ? 'prev' : 'next';
      this.trigger(direction);
    }
    this._currentPageNumber = pageNumber;
    this.render();
    if (!silent) {
      util.setResetTimeout(500, () => {
        this.trigger('change:pagenumber', pageNumber)
      })
    }
  }

  destroy() {
    return this.remove()
  }

}
