// Example usage:

// 	modal = new Modal
// 		title: "My title!"
// 		html: $('<div />').html('lalala')
// 		submitValue: 'OK'
// 	modal.on 'cancel', => cancelAction()
// 	modal.on 'submit', => modal.messageAndFade 'success', 'Modal submitted!'

import Backbone  from "backbone"
import _  from "underscore"
import $  from "jquery"
import tpl  from "./main.jade"
import './main.styl'
import modalManager  from "../../managers/modal";

  // OPTIONS
  // customClassName
  // html
  // width
  // height
  // title
  // titleClass
  // cancelAndSubmit
  // cancelValue
  // submitValue
  // focusOnFirstInput

    // ## Modal
export default class Modal extends Backbone.View {
  options

  defaultOptions() {
    return {
      title: '',
      // Deprecated by customClassName?
      titleClass: '',
      // Show cancel and submit button.
      cancelAndSubmit: true,
      cancelValue: 'Cancel',
      submitValue: 'Submit',
      // Add a className to top level to support styling and DOM manipulation. 
      customClassName: '',
      // Set the focus to the first <input> when the modal is shown.
      focusOnFirstInput: true,
      // If the overlay is clicked, cancel is triggered. Defaults to true.
      clickOverlay: true
    };
  }

  // ### Initialize
  constructor(options?) {
    super({ ...options, className: 'modal' })
    this.options = _.extend(this.defaultOptions(), this.options);
    if (this.options.customClassName.length > 0) {
      // We have to call this option customClassName because @options.className
      // will replace 'modal' as className.
      this.$el.addClass(this.options.customClassName);
    }
    this.render()
  }

  // ### Render
  render() {
    const rtpl = tpl(this.options);
    this.$el.html(rtpl);
    const body = this.$('.body');
    if (this.options.html != null) {
      body.html(this.options.html);
    } else {
      body.hide();
    }
    this.$('.body').scroll((ev) => {
      return ev.stopPropagation();
    });
    modalManager.add(this);
    if (this.options.width != null) {
      this.$('.modalbody').css('width', this.options.width);
      let marginLeft = (-1 * parseInt(this.options.width, 10) / 2).toString()
      if (this.options.width.slice(-1) === '%') {
        marginLeft += '%';
      }
      if (this.options.width.slice(-2) === 'vw') {
        marginLeft += 'vw';
      }
      if (this.options.width === 'auto') {
        marginLeft = (this.$('.modalbody').width() / -2).toString();
      }
      this.$('.modalbody').css('margin-left', marginLeft);
    }
    if (this.options.height != null) {
      this.$('.modalbody').css('height', this.options.height);
    }
    // unless @options.height is 'auto'
    // 	offsetTop = (-1 * parseInt(@options.height, 10)/2)
    // 	offsetTop += '%' if @options.height.slice(-1) is '%'
    // 	offsetTop += 'vh' if @options.height.slice(-2) is 'vh'
    // 	console.log offsetTop
    // 	@$('.modalbody').css 'margin-top', offsetTop

    // Add scrollTop of <body> to the position of the modal if body is scrolled (otherwise modal might be outside viewport)
    // scrollTop = document.querySelector('body').scrollTop
    // top = (viewportHeight - @$('.modalbody').height())/2
    // @$('.modalbody').css 'top', top + scrollTop if scrollTop > 0

    // offsetTop is calculated based on the .modalbody height, but the height is maxed to the viewportHeight
    // offsetTop = Math.min (@$('.modalbody').height() + 40)/2, (viewportHeight - 400)*0.5
    const viewportHeight = document.documentElement.clientHeight;
    let offsetTop = this.$('.modalbody').outerHeight() / 2;
    // The offsetTop cannot exceed the bodyTop, because it would be
    // outside (on the top) the viewport.
    const bodyTop = this.$('.modalbody').offset().top;
    if (offsetTop > bodyTop) {
      offsetTop = bodyTop - 20;
    }
    this.$('.modalbody').css('margin-top', -1 * offsetTop);
    this.$('.modalbody .body').css('max-height', viewportHeight - 175);
    if (this.options.focusOnFirstInput) {
      const firstInput = this.$('input[type="text"]').first();
      if (firstInput.length > 0) {
        firstInput.focus();
      }
    }
    return this;
  }

  // ### Events
  events = () => ({
    "click button.submit": 'submit',
    "click button.cancel": "cancel",
    "click .overlay": function() {
      if (this.options.clickOverlay) {
        return this.cancel();
      }
    },
    "keydown input": function(ev) {
      if (ev.keyCode === 13) {
        ev.preventDefault();
        return this.submit(ev);
      }
    }
  })

  submit(ev) {
    var target;
    target = $(ev.currentTarget);
    if (!target.hasClass('loader')) {
      target.addClass('loader');
      this.$('button.cancel').hide();
      return this.trigger('submit');
    }
  }

  cancel(ev) {
    if (ev != null) {
      ev.preventDefault();
    }
    this.trigger('cancel');
    return this.close();
  }

  // ### Methods
  close() {
    // Trigger close before removing the modal, otherwise there won't be a trigger!
    this.trigger('close');
    return modalManager.remove(this);
  }

  // Alias for close.
  destroy() {
    return this.close();
  }

  fadeOut(delay = 1000) {
    var speed;
    // Speed is used for $.fadeOut and to calculate the time at which to @remove the modal.
    // Set speed to 0 if delay is 0.
    speed = delay === 0 ? 0 : 500;
    // Fade out the modal body (not the overlay!) at given speed.
    this.$(".modalbody").delay(delay).fadeOut(speed);
    
    // Use setTimeout to @remove before $.fadeOut is completely finished, otherwise is interferes with the overlay
    return setTimeout((() => {
      return this.close();
    }), delay + speed - 100);
  }

  message(type, message) {
    if (["success", "warning", "error"].indexOf(type) === -1) {
      return console.error("Unknown message type!");
    }
    this.$("p.message").show();
    return this.$("p.message").html(message).addClass(type);
  }

  messageAndFade(type, message, delay) {
    this.$(".modalbody .body").hide();
    this.$("footer").hide();
    this.message(type, message);
    return this.fadeOut(delay);
  }

};
