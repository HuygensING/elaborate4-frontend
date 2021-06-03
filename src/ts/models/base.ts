import Backbone from "backbone"
import _ from "underscore"
import token from "hilib/managers/token"

export default abstract class BaseModel extends Backbone.Model {
  subscribe(ev, done) {
    return this.listenTo(Backbone, ev, done)
  }

  publish(...x: any) {
    // @ts-ignore
    return Backbone.trigger.apply(Backbone, ...x)
  }

  sync(method, model, options) {
    options.beforeSend = (xhr) => {
      return xhr.setRequestHeader('Authorization', `${token.getType()} ${token.get()}`);
    };
    return super.sync(method, model, options);
  }

}
