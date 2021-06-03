import Backbone from "backbone";
import _ from "underscore";
import Pubsub from "../mixins/pubsub";
export default class Base extends Backbone.Collection {
    initialize() {
        return _.extend(this, Pubsub);
    }
    removeById(id) {
        var model;
        model = this.get(id);
        return this.remove(model);
    }
    has(model) {
        if (this.get(model.cid) != null) {
            return true;
        }
        else {
            return false;
        }
    }
}
;
