var $, Backbone, BaseView, Pubsub, _;
Backbone.$ = $;
BaseView = class BaseView extends Backbone.View {
    initialize() {
        _.extend(this, Pubsub);
        return this.subviews = {};
    }
    destroy() {
        var name, ref, subview;
        ref = this.subviews;
        for (name in ref) {
            subview = ref[name];
            subview.destroy();
        }
        return this.remove();
    }
};
export default BaseView;
