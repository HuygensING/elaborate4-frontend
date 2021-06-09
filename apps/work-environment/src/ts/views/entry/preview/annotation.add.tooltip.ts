import { BaseView, Fn, dom } from "@elaborate4-frontend/hilib"
import { Annotation } from "../../../models/annotation"

// Templates =
// 	Tooltip: require 'text!html/entry/tooltip.add.annotation.html'
import tpl from "../../../../jade/entry/tooltip.add.annotation.jade"
import { className } from "@elaborate4-frontend/hilib"

@className('tooltip addannotation')
export default class AddAnnotationTooltip extends BaseView {
  // id: 'annotationtooltip'
  container
  newannotation

  constructor(private options?) {
    super(options)
    this.container = this.options.container != null ? this.options.container : document.querySelector('body')
    this.render()
  }

  render() {
    var tooltip;
    this.el.innerHTML = tpl({
      annotationTypes: this.options.annotationTypes
    });
    // There can be only one!
    tooltip = tooltip = document.querySelector('.tooltip.addannotation');
    if (tooltip != null) {
      tooltip.remove();
    }
    dom(this.container).prepend(this.el);
    return this;
  }

  events() {
    return {
      'change select': 'selectChanged',
      'click button': 'buttonClicked'
    };
  }

  selectChanged(ev) {
    var index, option;
    index = ev.currentTarget.selectedIndex;
    option = ev.currentTarget.options[index];
    return this.newannotation.set('annotationType', this.options.annotationTypes.get(option.value).attributes);
  }

  buttonClicked(ev) {
    this.hide();
    return this.trigger('clicked', this.newannotation);
  }

  // Set the position and show the tooltip
  show(position) {
    // The default annotationType is set to the first in the list. Should this be configurable?
    this.newannotation = new Annotation({
      annotationType: this.options.annotationTypes.at(0)
    });
    this.setPosition(position);
    return this.el.classList.add('active');
  }

  // Hide the tooltip
  hide() {
    return this.el.classList.remove('active');
  }

  setPosition(position) {
    var boundingBox, left, top;
    boundingBox = Fn.boundingBox(this.container);
    position.left = position.left - boundingBox.left;
    position.top = position.top - boundingBox.top;
    this.$el.removeClass('tipright tipleft tipbottom');
    left = position.left - this.$el.width() / 2;
    top = position.top + 30;
    if (left < 10) {
      left = 10;
      this.$el.addClass('tipleft');
    }
    if (boundingBox.width < (left + this.$el.width())) {
      left = boundingBox.width - this.$el.width() - 10;
      this.$el.addClass('tipright');
    }
    // if boundingBox.bottom < top + @$el.height()
    // 	top = top - 60 - @$el.height()
    // 	@$el.addClass 'tipbottom'
    this.$el.css('left', left);
    return this.$el.css('top', top);
  }

  // Is the tooltip active/visible? Returns Boolean.
  isActive() {
    return parseInt(this.$el.css('z-index'), 10) > 0;
  }

};
