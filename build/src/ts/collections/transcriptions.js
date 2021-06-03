import _ from "underscore";
import config from "../models/config";
import Base from "./base";
import StringFn from "hilib/utils/string";
import Transcription from "../models/transcription";
export default class Transcriptions extends Base {
    projectId;
    entryId;
    current;
    initialize(models, options) {
        this.projectId = options.projectId;
        this.entryId = options.entryId;
        return this.on('remove', (model) => {
            return model.destroy();
        });
    }
    url = () => {
        return config.get('restUrl') + `projects/${this.projectId}/entries/${this.entryId}/transcriptions`;
    };
    getCurrent(cb) {
        if (this.current != null) {
            return cb(this.current);
        }
        else {
            return this.once('current:change', () => {
                return cb(this.current);
            });
        }
    }
    setCurrent(model) {
        var transcriptionName;
        if ((model == null) || model !== this.current) {
            if (_.isString(model)) {
                transcriptionName = model;
                this.current = this.find((model) => {
                    return StringFn.slugify(model.get('textLayer')) === StringFn.slugify(transcriptionName);
                });
            }
            else {
                if (model != null) {
                    this.current = model;
                }
                else {
                    this.current = this.first();
                }
            }
            this.trigger('current:change', this.current);
        }
        return this.current;
    }
}
;
Transcriptions.prototype.model = Transcription;
