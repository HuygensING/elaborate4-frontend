var $, ModalManager;
ModalManager = class ModalManager {
    constructor() {
        this.modals = [];
    }
    add(modal) {
        var arrLength, i, len, m, ref;
        ref = this.modals;
        for (i = 0, len = ref.length; i < len; i++) {
            m = ref[i];
            m.$('.overlay').css('opacity', '0.2');
        }
        arrLength = this.modals.push(modal);
        modal.$('.overlay').css('z-index', 10000 + (arrLength * 2) - 1);
        modal.$('.modalbody').css('z-index', 10000 + (arrLength * 2));
        return $('body').prepend(modal.$el);
    }
    remove(modal) {
        var index;
        index = this.modals.indexOf(modal);
        this.modals.splice(index, 1);
        if (this.modals.length > 0) {
            this.modals[this.modals.length - 1].$('.overlay').css('opacity', '0.7');
        }
        modal.trigger('removed');
        modal.off();
        return modal.remove();
    }
};
export default new ModalManager();
