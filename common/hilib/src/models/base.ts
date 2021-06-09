import Backbone from "backbone"
import _ from "underscore"
import { token } from "@elaborate4-frontend/hilib"

export abstract class BaseModel extends Backbone.Model {
  subscribe(ev, done) {
    return this.listenTo(Backbone, ev, done)
  }

  publish(...args: any[]) {
    // @ts-ignore
    return Backbone.trigger.apply(Backbone, args)
  }

  sync(method, model, options) {
    options.beforeSend = (xhr) => {
      return xhr.setRequestHeader('Authorization', `${token.getType()} ${token.get()}`);
    };
    return super.sync(method, model, options);
  }

}
