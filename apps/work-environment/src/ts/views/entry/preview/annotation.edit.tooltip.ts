import { BaseView, Fn, dom } from "@elaborate4-frontend/hilib"
import currentUser from "../../../models/currentUser"

// console.log dom
// Templates =
// 	Tooltip: require 'text!html/ui/tooltip.html'
import tpl from "../../../../jade/ui/tooltip.jade"
import { className } from "@elaborate4-frontend/hilib"

@className('tooltip editannotation')
export default class EditAnnotationTooltip extends BaseView {
  container
  pointedEl
  // id: "annotationtooltip"

    // ### Initialize
  constructor(private options?) {
    super(options)
    var ref;
    this.container = (ref = this.options.container) != null ? ref : document.querySelector('body');
    this.render()
  }

  // ### Render
  render() {
    var tooltip;
    this.$el.html(tpl({
      interactive: this.options.interactive,
      user: currentUser
    }));
    // There can be only one!
    // $('#annotationtooltip').remove() 
    tooltip = this.container.querySelector('.tooltip.editannotation');
    if (tooltip != null) {
      tooltip.remove();
    }
    return dom(this.container).prepend(this.el);
  }

  // ### Events
  events() {
    return {
      'click .edit': 'editClicked',
      'click .delete': 'deleteClicked',
      'click': 'clicked'
    };
  }

  editClicked(ev) {
    return this.trigger('edit', this.model);
  }

  deleteClicked(ev) {
    return this.trigger('delete', this.model);
  }

  clicked(ev) {
    return this.hide();
  }

  // ### Methods
  show(args) {
    var $el, body, contentId, div, id, ref, txt;
    ({$el, model: this.model} = args);
    this.pointedEl = $el[0];
    this.el.style.left = '0';
    this.el.style.top = '0';
    this.el.querySelector('.tooltip-body').innerHTML = '';
    this.el.querySelector('.annotation-type').innerHTML = '';
    // console.log 'show', @el.offsetWidth

    // If there is no annotationNo (in case of a new annotation) we give the tooltip the contentId of -1
    contentId = (this.model != null) && (this.model.get('annotationNo') != null) ? this.model.get('annotationNo') : -1;
    // If the tooltip is already visible, we close the tooltip
    if (contentId === +this.el.getAttribute('data-id')) {
      this.hide();
      return false;
    }
    // Set the new contentId to the el
    this.el.setAttribute('data-id', contentId);
    if (this.model != null) {
      this.$el.removeClass('newannotation');
      body = this.el.querySelector('.tooltip-body');
      body.innerHTML = this.model.get('body');
      if (this.model.get('annotationType').name != null) {
        this.el.querySelector('.annotation-type').innerHTML = this.model.get('annotationType').name;
      }
      if ((((ref = this.model.get('metadata')) != null ? ref['person id'] : void 0) != null) && this.model.get('metadata')['person id'] !== '') {
        div = document.createElement('div');
        div.className = 'bio-port-id';
        txt = document.createTextNode('BioPort ID: ');
        id = document.createTextNode(this.model.get('metadata')['person id']);
        div.appendChild(txt);
        div.appendChild(id);
        body.appendChild(div);
      }
    } else {
      this.$el.addClass('newannotation');
    }
    if (this.options.container != null) {
      this.setRelativePosition(dom(this.pointedEl).position(this.options.container));
    } else {
      this.setAbsolutePosition($el.offset());
    }
    return this.el.classList.add('active');
  }

  hide() {
    this.el.removeAttribute('data-id');
    return this.el.classList.remove('active');
  }

  setRelativePosition(position) {
    var boundingBox, left, newTop, scrollBottomPos, tooltipBottomPos, top;
    boundingBox = Fn.boundingBox(this.container);
    this.$el.removeClass('tipright tipleft tipbottom');
    // console.log 'setPos', @el.offsetWidth

    // left = half of the element pointed to PLUS the left position of the element pointed to MINUS half the width of the tooltip
    left = (this.pointedEl.offsetWidth / 2) + position.left - (this.$el.width() / 2);
    // top = top position of the element pointed to PLUS an arbitrary offset/margin
    top = position.top + 30;
    if (left < 10) {
      left = 10;
      this.$el.addClass('tipleft');
    }
    if (boundingBox.width < (left + this.$el.width())) {
      left = boundingBox.width - this.$el.width() - 10;
      this.$el.addClass('tipright');
    }
    tooltipBottomPos = top + this.$el.height();
    scrollBottomPos = this.container.scrollTop + this.container.clientHeight;
    if (tooltipBottomPos > scrollBottomPos) {
      newTop = top - 48 - this.$el.height();
      if (newTop > 0) {
        top = newTop;
        this.$el.addClass('tipbottom');
      }
    }
    this.$el.css('left', left);
    return this.$el.css('top', top);
  }

  // * FIX
  setAbsolutePosition(position) {
    var boundingBox, left, top;
    console.error('Don"t use! This has to be fixed!');
    boundingBox = Fn.boundingBox(this.container);
    this.$el.removeClass('tipright tipleft tipbottom');
    left = position.left - this.$el.width() / 2;
    top = position.top + 30;
    if (boundingBox.left > left) {
      left = boundingBox.left + 10;
      this.$el.addClass('tipleft');
    }
    if (boundingBox.right < (left + this.$el.width())) {
      left = boundingBox.right - this.$el.width() - 10;
      this.$el.addClass('tipright');
    }
    if (boundingBox.bottom < top + this.$el.height()) {
      top = top - 60 - this.$el.height();
      this.$el.addClass('tipbottom');
    }
    this.$el.css('left', left);
    return this.$el.css('top', top);
  }

  // Is the tooltip active/visible? Returns Boolean.
  isActive() {
    return parseInt(this.$el.css('z-index'), 10) > 0;
  }

};
