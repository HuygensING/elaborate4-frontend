import BaseView from "hilib/views/base";
import StatisticsModel from "../../models/project/statistics";
import projects from "../../collections/projects";
import tpl from "../../../jade/project/statistics.jade";
export default class Statistics extends BaseView {
    statString;
    options;
    project;
    initialize(options) {
        this.options = options;
        super.initialize();
        return projects.getCurrent((project) => {
            var stats;
            this.project = project;
            stats = new StatisticsModel(null, {
                projectID: this.project.id
            });
            return stats.fetch({
                success: (data) => {
                    this.statString = JSON.stringify(data, null, 4);
                    this.statString = this.statString.replace(/{/g, '');
                    this.statString = this.statString.replace(/}/g, '');
                    this.statString = this.statString.replace(/\"/g, '');
                    this.statString = this.statString.replace(/,/g, '');
                    return this.render();
                }
            });
        });
    }
    render() {
        var rtpl;
        rtpl = tpl({
            statistics: this.statString
        });
        this.el.innerHTML = rtpl;
        return this;
    }
}
;
Statistics.prototype.className = 'statistics';
