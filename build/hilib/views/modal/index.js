var $, Backbone, Modal, _, modalManager, tpl;
Modal = (function () {
    class Modal extends Backbone.View {
        defaultOptions() {
            return {
                title: '',
                titleClass: '',
                cancelAndSubmit: true,
                cancelValue: 'Cancel',
                submitValue: 'Submit',
                customClassName: '',
                focusOnFirstInput: true,
                clickOverlay: true
            };
        }
        initialize(options = {}) {
            this.options = options;
            super.initialize();
            this.options = _.extend(this.defaultOptions(), this.options);
            if (this.options.customClassName.length > 0) {
                this.$el.addClass(this.options.customClassName);
            }
            return this.render();
        }
        render() {
            var body, bodyTop, firstInput, marginLeft, offsetTop, rtpl, viewportHeight;
            rtpl = tpl(this.options);
            this.$el.html(rtpl);
            body = this.$('.body');
            if (this.options.html != null) {
                body.html(this.options.html);
            }
            else {
                body.hide();
            }
            this.$('.body').scroll((ev) => {
                return ev.stopPropagation();
            });
            modalManager.add(this);
            if (this.options.width != null) {
                this.$('.modalbody').css('width', this.options.width);
                marginLeft = -1 * parseInt(this.options.width, 10) / 2;
                if (this.options.width.slice(-1) === '%') {
                    marginLeft += '%';
                }
                if (this.options.width.slice(-2) === 'vw') {
                    marginLeft += 'vw';
                }
                if (this.options.width === 'auto') {
                    marginLeft = this.$('.modalbody').width() / -2;
                }
                this.$('.modalbody').css('margin-left', marginLeft);
            }
            if (this.options.height != null) {
                this.$('.modalbody').css('height', this.options.height);
            }
            viewportHeight = document.documentElement.clientHeight;
            offsetTop = this.$('.modalbody').outerHeight() / 2;
            bodyTop = this.$('.modalbody').offset().top;
            if (offsetTop > bodyTop) {
                offsetTop = bodyTop - 20;
            }
            this.$('.modalbody').css('margin-top', -1 * offsetTop);
            this.$('.modalbody .body').css('max-height', viewportHeight - 175);
            if (this.options.focusOnFirstInput) {
                firstInput = this.$('input[type="text"]').first();
                if (firstInput.length > 0) {
                    firstInput.focus();
                }
            }
            return this;
        }
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
        close() {
            this.trigger('close');
            return modalManager.remove(this);
        }
        destroy() {
            return this.close();
        }
        fadeOut(delay = 1000) {
            var speed;
            speed = delay === 0 ? 0 : 500;
            this.$(".modalbody").delay(delay).fadeOut(speed);
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
    }
    ;
    Modal.prototype.className = "modal";
    Modal.prototype.events = {
        "click button.submit": 'submit',
        "click button.cancel": "cancel",
        "click .overlay": function () {
            if (this.options.clickOverlay) {
                return this.cancel();
            }
        },
        "keydown input": function (ev) {
            if (ev.keyCode === 13) {
                ev.preventDefault();
                return this.submit(ev);
            }
        }
    };
    return Modal;
}).call(this);
export default Modal;
