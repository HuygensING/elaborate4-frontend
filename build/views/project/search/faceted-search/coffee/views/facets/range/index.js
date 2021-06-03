var $, Facet, Range, RangeFacet, _, bodyTpl;
RangeFacet = (function () {
    class RangeFacet extends Facet {
        initialize(options1) {
            this.options = options1;
            super.initialize();
            this.draggingMin = false;
            this.draggingMax = false;
            this.model = new Range(this.options.attrs, {
                parse: true
            });
            this.listenTo(this.model, 'change:options', this.render);
            this.listenTo(this.model, 'change', (model) => {
                if (model.changed.hasOwnProperty('currentMin') || model.changed.hasOwnProperty('currentMax')) {
                    if ((this.button != null) && this.options.config.get('autoSearch')) {
                        return this.button.style.display = 'block';
                    }
                }
            });
            this.listenTo(this.model, 'change:handleMinLeft', (model, value) => {
                this.handleMin.css('left', value);
                return this.bar.css('left', value + (this.model.get('handleWidth') / 2));
            });
            this.listenTo(this.model, 'change:handleMaxLeft', (model, value) => {
                this.handleMax.css('left', value);
                return this.bar.css('right', model.get('sliderWidth') - value - (this.model.get('handleWidth') / 2));
            });
            this.listenTo(this.model, 'change:currentMin', (model, value) => {
                return this.inputMin.val(Math.ceil(value));
            });
            this.listenTo(this.model, 'change:currentMax', (model, value) => {
                return this.inputMax.val(Math.ceil(value));
            });
            return this.render();
        }
        render() {
            var rtpl;
            super.render();
            if (this.options.config.get('templates').hasOwnProperty('range.body')) {
                bodyTpl = this.options.config.get('templates')['range.body'];
            }
            rtpl = bodyTpl(this.model.attributes);
            this.$('.body').html(rtpl);
            this.$('header .menu').hide();
            this.dragStopper = this.stopDragging.bind(this);
            this.$el.on('mouseleave', this.dragStopper);
            this.resizer = this.onResize.bind(this);
            window.addEventListener('resize', this.resizer);
            return this;
        }
        postRender() {
            var slider;
            this.handleMin = this.$('.handle-min');
            this.handleMax = this.$('.handle-max');
            this.inputMin = this.$('input.min');
            this.inputMax = this.$('input.max');
            this.bar = this.$('.bar');
            this.button = this.el.querySelector('button');
            slider = this.$('.slider');
            return this.model.set({
                sliderWidth: slider.width(),
                sliderLeft: slider.offset().left,
                handleMinLeft: this.handleMin.position().left,
                handleMaxLeft: this.handleMax.position().left,
                handleWidth: this.handleMin.width()
            });
        }
        events() {
            return _.extend({}, super.events, {
                'mousedown .handle': 'startDragging',
                'mousedown .bar': 'startDragging',
                'mouseup': 'stopDragging',
                'mousemove': 'drag',
                'blur input': 'setYear',
                'keyup input': 'setYear',
                'click button': 'doSearch',
                'dblclick input.min': function (ev) {
                    return this.enableInputEditable(this.inputMin);
                },
                'dblclick input.max': function (ev) {
                    return this.enableInputEditable(this.inputMax);
                }
            });
        }
        setYear(ev) {
            if (ev.type === 'focusout' || ev.type === 'blur' || (ev.type === 'keyup' && ev.keyCode === 13)) {
                if (ev.currentTarget.className.indexOf('min') > -1) {
                    this.model.set({
                        currentMin: +ev.currentTarget.value
                    });
                    return this.disableInputEditable(this.inputMin);
                }
                else if (ev.currentTarget.className.indexOf('max') > -1) {
                    this.model.set({
                        currentMax: +ev.currentTarget.value
                    });
                    return this.disableInputEditable(this.inputMax);
                }
            }
        }
        doSearch(ev) {
            ev.preventDefault();
            return this.triggerChange();
        }
        startDragging(ev) {
            var input, target;
            target = $(ev.currentTarget);
            input = target.find('input');
            if (input.length > 0) {
                if (input.hasClass('edit')) {
                    return;
                }
            }
            if (target.hasClass('handle-min')) {
                this.draggingMin = true;
                this.handleMax.css('z-index', 10);
                return target.css('z-index', 11);
            }
            else if (target.hasClass('handle-max')) {
                this.draggingMax = true;
                this.handleMin.css('z-index', 10);
                return target.css('z-index', 11);
            }
            else if (target.hasClass('bar')) {
                return this.draggingBar = {
                    offsetLeft: (ev.clientX - this.model.get('sliderLeft')) - this.model.get('handleMinLeft'),
                    barWidth: this.bar.width()
                };
            }
        }
        drag(ev) {
            var left, mousePosLeft, right;
            mousePosLeft = ev.clientX - this.model.get('sliderLeft');
            if (this.draggingMin || this.draggingMax) {
                this.disableInputOverlap();
                this.checkInputOverlap();
            }
            if (this.draggingBar != null) {
                this.updateDash();
                left = mousePosLeft - this.draggingBar.offsetLeft;
                right = left + this.draggingBar.barWidth;
                if (-1 < left && right <= this.model.get('sliderWidth')) {
                    this.model.dragMin(left);
                    this.model.dragMax(right);
                }
            }
            if (this.draggingMin) {
                this.model.dragMin(mousePosLeft - (this.model.get('handleWidth') / 2));
            }
            if (this.draggingMax) {
                return this.model.dragMax(mousePosLeft - (this.model.get('handleWidth') / 2));
            }
        }
        stopDragging() {
            if (this.draggingMin || this.draggingMax || (this.draggingBar != null)) {
                if (this.draggingMin) {
                    if (this.model.get('currentMin') !== +this.inputMin.val()) {
                        this.model.set({
                            currentMin: +this.inputMin.val()
                        });
                    }
                }
                if (this.draggingMax) {
                    if (this.model.get('currentMax') !== +this.inputMax.val()) {
                        this.model.set({
                            currentMax: +this.inputMax.val()
                        });
                    }
                }
                this.draggingMin = false;
                this.draggingMax = false;
                this.draggingBar = null;
                if (!this.options.config.get('autoSearch')) {
                    return this.triggerChange({
                        silent: true
                    });
                }
            }
        }
        enableInputEditable(input) {
            input.addClass('edit');
            return input.focus();
        }
        disableInputEditable(input) {
            return input.removeClass('edit');
        }
        destroy() {
            this.$el.off('mouseleave', this.dragStopper);
            window.removeEventListener('resize', this.resizer);
            return this.remove();
        }
        triggerChange(options = {}) {
            var queryOptions;
            queryOptions = {
                facetValue: {
                    name: this.model.get('name'),
                    lowerLimit: this.model.getLowerLimit(),
                    upperLimit: this.model.getUpperLimit()
                }
            };
            return this.trigger('change', queryOptions, options);
        }
        onResize() {
            this.postRender();
            this.update([
                {
                    lowerLimit: this.model.get('currentMin'),
                    upperLimit: this.model.get('currentMax')
                }
            ]);
            return this.checkInputOverlap();
        }
        checkInputOverlap() {
            var diff, maxRect, minRect;
            minRect = this.inputMin[0].getBoundingClientRect();
            maxRect = this.inputMax[0].getBoundingClientRect();
            if (!(minRect.right < maxRect.left || minRect.left > maxRect.right || minRect.bottom < maxRect.top || minRect.top > maxRect.bottom)) {
                diff = minRect.right - maxRect.left;
                return this.enableInputOverlap(diff);
            }
            else {
                return this.disableInputOverlap();
            }
        }
        enableInputOverlap(diff) {
            this.inputMin.css('left', -20 - diff / 2);
            this.inputMax.css('right', -20 - diff / 2);
            this.updateDash();
            this.$('.dash').show();
            this.inputMin.addClass('overlap');
            return this.inputMax.addClass('overlap');
        }
        disableInputOverlap() {
            this.inputMin.css('left', -20);
            this.inputMax.css('right', -20);
            this.$('.dash').hide();
            this.inputMin.removeClass('overlap');
            return this.inputMax.removeClass('overlap');
        }
        updateDash() {
            return this.$('.dash').css('left', this.model.get('handleMinLeft') + ((this.model.get('handleMaxLeft') - this.model.get('handleMinLeft')) / 2) + 3);
        }
        update(newOptions) {
            var ll, ul;
            if (_.isArray(newOptions)) {
                if (newOptions[0] != null) {
                    newOptions = newOptions[0];
                    if (newOptions.lowerLimit < 2500) {
                        ll = newOptions.lowerLimit;
                        ul = newOptions.upperLimit;
                    }
                    else {
                        ll = this.model.convertLimit2Year(newOptions.lowerLimit);
                        ul = this.model.convertLimit2Year(newOptions.upperLimit);
                    }
                    this.model.set({
                        currentMin: ll,
                        currentMax: ul
                    });
                }
            }
            else {
                this.model.reset();
            }
            if (this.button != null) {
                return this.button.style.display = 'none';
            }
        }
    }
    ;
    RangeFacet.prototype.className = 'facet range';
    return RangeFacet;
}).call(this);
export default RangeFacet;
