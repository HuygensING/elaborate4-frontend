var Backbone;
export default {
    subscribe: function (ev, done) {
        return this.listenTo(Backbone, ev, done);
    },
    publish: function () {
        return Backbone.trigger.apply(Backbone, arguments);
    }
};
