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
import modalManager  from "../../managers/modal"
import { className } from "../../utils/decorators"

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
interface ModalOptions {
  // Show cancel and submit button.
  cancelAndSubmit?: boolean
  cancelValue?: string

  // If the overlay is clicked, cancel is triggered. Defaults to true.
  clickOverlay?: boolean

  // Add a className to top level to support styling and DOM manipulation. 
  customClassName?: string

  // Set the focus to the first <input> when the modal is shown.
  focusOnFirstInput?: boolean
  height?: string
  html: string | HTMLElement
  submitValue?: string
  title: string
  width?: string
}

@className('modal')
export class Modal extends Backbone.View {
  defaultOptions(): Partial<ModalOptions> {
    return {
      cancelAndSubmit: true,
      cancelValue: 'Cancel',
      submitValue: 'Submit',
      focusOnFirstInput: true,
      clickOverlay: true
    };
  }

  // ### Initialize
  constructor(private options?: ModalOptions) {
    super(options as any)
    this.options = _.extend(this.defaultOptions(), this.options);
    if (this.options.customClassName?.length > 0) {
      // We have to call this option customClassName because @options.className
      // will replace 'modal' as className.
      this.$el.addClass(this.options.customClassName);
    }
    this.render()
  }

  // ### Render
  render() {
    const rtpl = tpl(this.options)
    this.$el.html(rtpl)

    const body = this.$('.body')
    if (this.options.html != null) {
      body.html(this.options.html)
    } else {
      body.hide()
    }

    this.$('.body').scroll((ev) => {
      ev.stopPropagation()
    })

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
  events() {
    return {
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
    }
  }

  submit(ev) {
    const target = $(ev.currentTarget);
    if (!target.hasClass('loader')) {
      target.addClass('loader');
      this.$('button.cancel').hide();
      this.trigger('submit');
    }
  }

  cancel(ev) {
    if (ev != null) {
      ev.preventDefault();
    }
    this.trigger('cancel');
    this.close();
  }

  // ### Methods
  close() {
    // Trigger close before removing the modal, otherwise there won't be a trigger!
    this.trigger('close');
    modalManager.remove(this);
  }

  // Alias for close.
  destroy() {
    this.close()
  }

  fadeOut(delay = 1000) {
    var speed;
    // Speed is used for $.fadeOut and to calculate the time at which to @remove the modal.
    // Set speed to 0 if delay is 0.
    speed = delay === 0 ? 0 : 500;
    // Fade out the modal body (not the overlay!) at given speed.
    this.$(".modalbody").delay(delay).fadeOut(speed);
    
    // Use setTimeout to @remove before $.fadeOut is completely finished, otherwise is interferes with the overlay
    setTimeout((() => {
      this.close()
    }), delay + speed - 100)
  }

  message(type, message) {
    if (["success", "warning", "error"].indexOf(type) === -1) {
      return console.error("Unknown message type!");
    }
    this.$("p.message").show();
    this.$("p.message").html(message).addClass(type);
  }

  messageAndFade(type, message, delay) {
    this.$(".modalbody .body").hide();
    this.$("footer").hide();
    this.message(type, message);
    this.fadeOut(delay);
  }

};
