import config from "../models/config";
import Base from "./base";
import Entry from "../models/entry";
export default class Entries extends Base {
    projectId;
    current;
    changed;
    initialize(models, options) {
        super.initialize();
        this.projectId = options.projectId;
        this.current = null;
        this.changed = [];
    }
    url() {
        return `${config.get('restUrl')}projects/${this.projectId}/entries`;
    }
    setCurrent(modelID) {
        var model;
        model = this.get(modelID);
        this.trigger('current:change', model);
        return this.current = model;
    }
    previous() {
        var model, previousIndex;
        previousIndex = this.indexOf(this.current) - 1;
        model = this.at(previousIndex);
        return this.setCurrent(model);
    }
    next() {
        var model, nextIndex;
        nextIndex = this.indexOf(this.current) + 1;
        model = this.at(nextIndex);
        return this.setCurrent(model);
    }
}
;
Entries.prototype.model = Entry;
