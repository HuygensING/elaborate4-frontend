import Backbone from "backbone";
import _ from "underscore";
import token from "hilib/managers/token";
import Pubsub from "hilib/mixins/pubsub";
export default class Base extends Backbone.Collection {
    initialize() {
        return _.extend(this, Pubsub);
    }
    sync(method, model, options) {
        options.beforeSend = (xhr) => {
            return xhr.setRequestHeader('Authorization', `${token.getType()} ${token.get()}`);
        };
        return super.sync(method, model, options);
    }
    removeById(id) {
        var model;
        model = this.get(id);
        return this.remove(model);
    }
}
