var $, Backbone, Pagination, tpl, util;
Pagination = (function () {
    class Pagination extends Backbone.View {
        initialize(options) {
            var base, base1;
            this.options = options;
            if ((base = this.options).step10 == null) {
                base.step10 = true;
            }
            if ((base1 = this.options).triggerPageNumber == null) {
                base1.triggerPageNumber = true;
            }
            this._currentPageNumber = (this.options.resultsStart != null) && this.options.resultsStart > 0 ? (this.options.resultsStart / this.options.resultsPerPage) + 1 : 1;
            return this.setPageNumber(this._currentPageNumber, true);
        }
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
            return this.setPageNumber(this._currentPageNumber - 10);
        }
        _handlePrev() {
            return this.setPageNumber(this._currentPageNumber - 1);
        }
        _handleNext() {
            return this.setPageNumber(this._currentPageNumber + 1);
        }
        _handleNext10() {
            return this.setPageNumber(this._currentPageNumber + 10);
        }
        _handleCurrentClick(ev) {
            var input, span, target;
            target = this.$(ev.currentTarget);
            span = target.find('span');
            input = target.find('input');
            input.width(span.width());
            target.addClass('active');
            input.animate({
                width: 40
            }, 'fast');
            input.focus();
            return input.val(this._currentPageNumber);
        }
        _handleKeyup(ev) {
            var input, newPageNumber;
            input = this.$(ev.currentTarget);
            newPageNumber = +input.val();
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
            }, 'fast', function () {
                var li;
                li = input.parent();
                return li.removeClass('active');
            });
        }
        getCurrentPageNumber() {
            return this._currentPageNumber;
        }
        setPageNumber(pageNumber, silent = false) {
            var direction;
            if (!this.triggerPageNumber) {
                direction = pageNumber < this._currentPageNumber ? 'prev' : 'next';
                this.trigger(direction);
            }
            this._currentPageNumber = pageNumber;
            this.render();
            if (!silent) {
                return util.setResetTimeout(500, () => {
                    return this.trigger('change:pagenumber', pageNumber);
                });
            }
        }
        destroy() {
            return this.remove();
        }
    }
    ;
    Pagination.prototype.tagName = 'ul';
    Pagination.prototype.className = 'hibb-pagination';
    return Pagination;
}).call(this);
export default Pagination;
