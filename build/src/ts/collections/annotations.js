import config from "../models/config";
import Base from "./base";
class Annotations extends Base {
    options;
    initialize(_models, options) {
        this.options = options;
    }
    url = () => {
        return `${config.get('restUrl')}projects/${this.options.projectId}/entries/${this.options.entryId}/transcriptions/${this.options.transcriptionId}/annotations`;
    };
}
;
export default Annotations;
