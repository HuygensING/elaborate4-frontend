import Backbone from "backbone";

export default {
  subscribe: function(ev, done) {
    return this.listenTo(Backbone, ev, done);
  },

  publish: function(...x: any) {
    // FIXME [UNSUPPORTED]: arguments can't be array like object in IE < 10
    // @ts-ignore
    return Backbone.trigger.apply(Backbone, ...x);
  }
};
