import config from "../models/config";
import Base from "./base";
import Facsimile from "../models/facsimile";
class Facsimiles extends Base {
    projectId;
    entryId;
    current;
    initialize(models, options) {
        this.projectId = options.projectId;
        this.entryId = options.entryId;
        this.on('remove', (model) => {
            model.destroy();
        });
    }
    url = () => {
        return `${config.get('restUrl')}projects/${this.projectId}/entries/${this.entryId}/facsimiles`;
    };
    setCurrent(model) {
        if ((model == null) || model !== this.current) {
            if (model != null) {
                this.current = model;
            }
            else {
                this.current = this.at(0);
            }
            this.trigger('current:change', this.current);
        }
        return this.current;
    }
}
;
Facsimiles.prototype.model = Facsimile;
