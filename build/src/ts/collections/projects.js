import Backbone from "backbone";
import _ from "underscore";
import config from "../models/config";
import history from "hilib/managers/history";
import Base from "./base";
import Project from "../models/project/main";
class Projects extends Base {
    current;
    model = Project;
    url = config.get('restUrl') + 'projects';
    initialize() {
        super.initialize();
        return this.on('sync', this.setCurrent, this);
    }
    fetch(options = {}) {
        if (!options.error) {
            options.error = (collection, response, options) => {
                if (response.status === 401) {
                    sessionStorage.clear();
                    return Backbone.history.navigate('login', {
                        trigger: true
                    });
                }
            };
        }
        return super.fetch(options);
    }
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
    setCurrent(id) {
        var fragmentPart;
        if (id instanceof Backbone.Model) {
            id = id.id;
        }
        fragmentPart = history.last() != null ? history.last().split('/') : [];
        if (_.isNumber(id)) {
            this.current = this.get(id);
        }
        else if (fragmentPart[1] === 'projects') {
            this.current = this.find(function (p) {
                return p.get('name') === fragmentPart[2];
            });
        }
        else {
            this.current = this.first();
        }
        if (this.current == null) {
            return this.trigger('current:change', this.current);
        }
        this.current.load(() => {
            config.set('entryTermSingular', this.current.get('settings').get('entry.term_singular'));
            config.set('entryTermPlural', this.current.get('settings').get('entry.term_plural'));
            return this.trigger('current:change', this.current);
        });
        return this.current;
    }
}
export default new Projects();
