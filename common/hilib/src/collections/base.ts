import Backbone from "backbone"
import _ from "underscore"
import { token } from '../managers/token'

export class BaseCollection extends Backbone.Collection {
  constructor(models?, protected options?) {
    super(models, options)
  }

  subscribe(ev, done) {
    return this.listenTo(Backbone, ev, done)
  }

  publish(...args: any[]) {
    // FIXME [UNSUPPORTED]: arguments can't be array like object in IE < 10
    // @ts-ignore
    return Backbone.trigger.apply(Backbone, args)
  }

  sync(method, model, options) {
    options.beforeSend = (xhr) => {
      xhr.setRequestHeader('Authorization', `${token.getType()} ${token.get()}`);
    };
    return super.sync(method, model, options);
  }

  removeById(id) {
    var model;
    model = this.get(id);
    this.remove(model);
  }
}
