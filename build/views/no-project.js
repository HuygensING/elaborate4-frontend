import Backbone from "backbone";
import Modal from "hilib/views/modal";
class NoProject extends Backbone.View {
    initialize() {
        return this.render();
    }
    render() {
        var modal;
        return modal = new Modal({
            title: 'You are not assigned to a project',
            clickOverlay: false,
            html: "Please contact an administrator.",
            cancelAndSubmit: false
        });
    }
}
;
NoProject.prototype.className = 'no-project';
