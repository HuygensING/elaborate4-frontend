import _ from "underscore";
import BaseView from "hilib/views/base";
import History from "../../collections/project/history";
import projects from "../../collections/projects";
import tpl from "../../../jade/project/history.jade";
class ProjectHistory extends BaseView {
    initialize(options) {
        this.options = options;
        super.initialize();
        this.index = 0;
        return projects.getCurrent((project) => {
            this.project = project;
            this.all = new History(this.project.id);
            return this.all.fetch((response) => {
                this.historyChunks = [];
                while (response.length > 0) {
                    this.historyChunks.push(response.splice(0, 500));
                }
                return this.render();
            });
        });
    }
    render() {
        var chunk, chunks, rtpl;
        chunk = this.historyChunks[this.index];
        _.each(chunk, function (entry) {
            return entry.dateString = new Date(entry.createdOn).toDateString();
        });
        chunks = _.groupBy(chunk, 'dateString');
        rtpl = tpl({
            logEntries: chunks
        });
        this.el.innerHTML = rtpl;
        if (this.index + 1 === this.historyChunks.length) {
            this.el.querySelector('button.more').style.display = 'none';
        }
        return this;
    }
    events() {
        return {
            'click button.more': 'more'
        };
    }
    more(ev) {
        this.index++;
        return this.renderEntries();
    }
}
;
ProjectHistory.prototype.className = 'projecthistory';
