import Backbone from "backbone";
export default {
    subscribe: function (ev, done) {
        return this.listenTo(Backbone, ev, done);
    },
    publish: function (...x) {
        return Backbone.trigger.apply(Backbone, ...x);
    }
};
