// * TODO: remove underscore and trigger deps, create callback

import Backbone  from "backbone";

import _  from "underscore";

export class Async {
  callbacksCalled

  constructor(names = []) {
    var i, len, name;
    _.extend(this, Backbone.Events);
    this.callbacksCalled = {};
    for (i = 0, len = names.length; i < len; i++) {
      name = names[i];
      this.callbacksCalled[name] = false;
    }
  }

  called(name, data = true) {
    this.callbacksCalled[name] = data;
    if (_.every(this.callbacksCalled, function(called) {
      return called !== false;
    })) {
      // @ts-ignore
      return this.trigger('ready', this.callbacksCalled);
    }
  }

};
