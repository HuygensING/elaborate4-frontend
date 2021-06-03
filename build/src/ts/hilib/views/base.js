import Backbone from "backbone";
import $ from "jquery";
Backbone.$ = $;
import _ from "underscore";
import Pubsub from "../mixins/pubsub";
export default class BaseView extends Backbone.View {
    subviews;
    initialize() {
        _.extend(this, Pubsub);
        this.subviews = {};
    }
    destroy() {
        var name, ref, subview;
        ref = this.subviews;
        for (name in ref) {
            subview = ref[name];
            subview.destroy();
        }
        this.remove();
    }
}
