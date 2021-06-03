import Backbone from "backbone";
import Modal from "hilib/views/modal";
export default class NoProject extends Backbone.View {
    initialize() {
        return this.render();
    }
    render() {
        new Modal({
            title: 'You are not assigned to a project',
            clickOverlay: false,
            html: "Please contact an administrator.",
            cancelAndSubmit: false
        });
        return this;
    }
}
;
NoProject.prototype.className = 'no-project';
