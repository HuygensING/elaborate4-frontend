// @options:
//	rowCount: Number 			Number of rows per page
// 	resultCount: Number 		The total number of results (resultCount/rowCount=pageCount)
//	start: Number 				The result item to start at. If start is 20 and there are 5 items (rows) per page, the start page will be 4 (20/5).
//	step10: Boolean				Render (<< and >>) for steps of 10. Defaults to true.
//	triggerPageNumber: Boolean	Trigger the new pageNumber (true) or prev/next (false). Defaults to true.

import Fn  from "../../utils/general";
import  Base from "../base"
import tpl  from "./main.jade";

// ## Pagination
class Pagination extends Base {
  options

  // ### Initialize
  constructor(options) {
    super(options)

    this.options = options;

    if ((base = this.options).step10 == null) {
      base.step10 = true;
    }
    if ((base1 = this.options).triggerPagenumber == null) {
      base1.triggerPagenumber = true;
    }
    currentPage = (this.options.start != null) && this.options.start > 0 ? (this.options.start / this.options.rowCount) + 1 : 1;
    // console.log currentPage, @options.start, @options.start/@options.rowCount, @options.rowCount
    return this.setCurrentPage(currentPage, true);
  }

  // ### Render
  render() {
    this.options.pageCount = Math.ceil(this.options.resultCount / this.options.rowCount);
    this.el.innerHTML = tpl(this.options);
    if (this.options.pageCount <= 1) {
      this.$el.hide();
    }
    return this;
  }

  // ### Events
  events() {
    return {
      'click li.prev10.active': 'prev10',
      'click li.prev.active': 'prev',
      'click li.next.active': 'next',
      'click li.next10.active': 'next10'
    };
  }

  prev10() {
    return this.setCurrentPage(this.options.currentPage - 10);
  }

  prev() {
    return this.setCurrentPage(this.options.currentPage - 1);
  }

  next() {
    return this.setCurrentPage(this.options.currentPage + 1);
  }

  next10() {
    return this.setCurrentPage(this.options.currentPage + 10);
  }

  // ### Methods

    // TODO Change to setPage
  setCurrentPage(pageNumber, silent = false) {
    var direction;
    if (!this.triggerPagenumber) {
      direction = pageNumber < this.options.currentPage ? 'prev' : 'next';
      this.trigger(direction);
    }
    this.options.currentPage = pageNumber;
    this.render();
    if (!silent) {
      return Fn.timeoutWithReset(500, () => {
        return this.trigger('change:pagenumber', pageNumber);
      });
    }
  }

};
