import $ from "jquery"
import _ from "underscore"
import Range from "./model"
import Facet from "../main"
import bodyTpl from "./body.jade"

export default class RangeFacet extends Facet {
  bodyTpl = bodyTpl
  draggingMin
  draggingMax
  button: HTMLButtonElement
  handleMin
  handleMax
  dragStopper
  resizer
  inputMax
  inputMin
  bar
  draggingBar
  declare model: Range

  // ### INITIALIZE
  /*
  @constructs
  @param {object} 		this.options
  @param {Backbone.Model} this.options.config
  @param {object} 		this.options.attrs
  */
  constructor(private options?) {
    super({ ...options, className: 'facet range' })
    this.draggingMin = false
    this.draggingMax = false
    this.model = new Range(this.options.attrs, { parse: true })
    this.listenTo(this.model, 'change:options', this.render);
    this.listenTo(this.model, 'change', (model) => {
      if (
        model.changed.hasOwnProperty('currentMin') ||
        model.changed.hasOwnProperty('currentMax')
      ) {
        if (this.button != null && this.options.config.get('autoSearch')) {
          this.button.style.display = 'block';
        }
      }
    });
    this.listenTo(this.model, 'change:handleMinLeft', (model, value) => {
      this.handleMin.css('left', value);
      this.bar.css('left', value + (this.model.get('handleWidth') / 2));
    });
    this.listenTo(this.model, 'change:handleMaxLeft', (model, value) => {
      this.handleMax.css('left', value);
      this.bar.css('right', model.get('sliderWidth') - value - (this.model.get('handleWidth') / 2));
    });
    this.listenTo(this.model, 'change:currentMin', (model, value) => {
      this.inputMin.val(Math.ceil(value));
    });
    this.listenTo(this.model, 'change:currentMax', (model, value) => {
      this.inputMax.val(Math.ceil(value));
    });
    this.render();
  }

  // ### RENDER
  render() {
    var rtpl;
    super.render();
    if (this.options.config.get('templates').hasOwnProperty('range.body')) {
      this.bodyTpl = this.options.config.get('templates')['range.body'];
    }
    rtpl = this.bodyTpl(this.model.attributes);
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
    // The handles that indicate the position of min and max on the range.
    // Can be dragged
    this.handleMin = this.$('.handle-min');
    this.handleMax = this.$('.handle-max');
    // The labels holding the min and max value.
    this.inputMin = this.$('input.min');
    this.inputMax = this.$('input.max');
    // The space (selected range) between the min and max handle.
    this.bar = this.$('.bar');
    this.button = this.el.querySelector('button');
    // The root element of the range facet.
    slider = this.$('.slider');
    return this.model.set({
      sliderWidth: slider.width(),
      sliderLeft: slider.offset().left,
      // The relative left position of the min and max handle.
      handleMinLeft: this.handleMin.position().left,
      handleMaxLeft: this.handleMax.position().left,
      // The assumption is made that the minHandle and maxHandle have an equal width
      handleWidth: this.handleMin.width()
    });
  }

  // ### EVENTS
  events() {
    return _.extend({}, super.events, {
      'mousedown .handle': 'startDragging',
      'mousedown .bar': 'startDragging',
      'mouseup': 'stopDragging',
      'mousemove': 'drag',
      'blur input': 'setYear',
      'keyup input': 'setYear',
      'click button': 'doSearch',
      'dblclick input.min': function(ev) {
        return this.enableInputEditable(this.inputMin);
      },
      'dblclick input.max': function(ev) {
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
      } else if (ev.currentTarget.className.indexOf('max') > -1) {
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
    // If the bar is dragged, an input is not found.
    if (input.length > 0) {
      // Return if the input is being editted
      if (input.hasClass('edit')) {
        return;
      }
    }
    if (target.hasClass('handle-min')) {
      this.draggingMin = true;
      this.handleMax.css('z-index', 10);
      return target.css('z-index', 11);
    } else if (target.hasClass('handle-max')) {
      this.draggingMax = true;
      this.handleMin.css('z-index', 10);
      return target.css('z-index', 11);
    } else if (target.hasClass('bar')) {
      // Set @draggingBar hash with offsetLeft and barWidth, which are
      // needed while dragging.
      return this.draggingBar = {
        offsetLeft: (ev.clientX - this.model.get('sliderLeft')) - this.model.get('handleMinLeft'),
        barWidth: this.bar.width()
      };
    }
  }

  // Called on every scroll event! Keep optimized!
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
      // else
      // 	@enableInputEditable @inputMin
      if (this.draggingMax) {
        if (this.model.get('currentMax') !== +this.inputMax.val()) {
          this.model.set({
            currentMax: +this.inputMax.val()
          });
        }
      }
      // else
      // 	@enableInputEditable @inputMax
      this.draggingMin = false;
      this.draggingMax = false;
      this.draggingBar = null;
      // If autoSearch is off, a change event is triggerd to update the queryModel.
      // If autoSearch is on, the range facet doesn't autoSearch, but displays a
      // search button. When the button is clicked, the queryModel is updated and
      // a new search is triggered. If we silently update the model beforehand,
      // the new search would not be triggered.
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

  // ### METHODS
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
    // Calculate and redefine properties.
    this.postRender();
    // Calculate the new handle positions.
    this.update([
      {
        lowerLimit: this.model.get('currentMin'),
        upperLimit: this.model.get('currentMax')
      }
    ]);
    // The labels could be overlapping after resize.
    return this.checkInputOverlap();
  }

  checkInputOverlap() {
    var diff, maxRect, minRect;
    minRect = this.inputMin[0].getBoundingClientRect();
    maxRect = this.inputMax[0].getBoundingClientRect();
    if (!(minRect.right < maxRect.left || minRect.left > maxRect.right || minRect.bottom < maxRect.top || minRect.top > maxRect.bottom)) {
      diff = minRect.right - maxRect.left;
      return this.enableInputOverlap(diff);
    } else {
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

  // Update the labels value.
  // Called on every scroll event! Keep optimized!
  //	updateHandleLabel: (handle, leftPos) ->
  //		@button.style.display = 'block' if @button? and @options.config.get('autoSearch')

  //		input = if handle is 'min' then @inputMin else @inputMax
  //		input.val @model.getYearFromLeftPos(leftPos)
  update(newOptions) {
    var ll, ul;
    if (_.isArray(newOptions)) {
      if (newOptions[0] != null) {
        newOptions = newOptions[0];
        // This software will break in the year 2500. :)
        if (newOptions.lowerLimit < 2500) {
          ll = newOptions.lowerLimit;
          ul = newOptions.upperLimit;
        } else {
          ll = this.model.convertLimit2Year(newOptions.lowerLimit);
          ul = this.model.convertLimit2Year(newOptions.upperLimit);
        }
        this.model.set({
          currentMin: ll,
          currentMax: ul
        });
      }
    } else {
      this.model.reset();
    }
    if (this.button != null) {
      // newOptions =
      // 	lowerLimit: @model.get('options').lowerLimit
      // 	upperLimit: @model.get('options').upperLimit

      // console.log newOptions

      // # Set the current attributes in the range model.
      // # Only use the years from the newOptions lower and upper limits.
      // @model.set
      // 	currentMin: +(newOptions.lowerLimit+'').substr(0, 4)
      // 	currentMax: +(newOptions.upperLimit+'').substr(0, 4)
      return this.button.style.display = 'none';
    }
  }

};
