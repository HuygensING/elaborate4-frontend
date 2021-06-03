import BaseView from "hilib/views/base"
import StatisticsModel from "../../models/project/statistics"
import projects from "../../collections/projects"
import tpl from "../../../jade/project/statistics.jade"

export default class Statistics extends BaseView {
  statString
  project

  constructor(options?) {
    super({ ...options, className: 'statistics' })

    projects.getCurrent((project) => {
      this.project = project;
      const stats = new StatisticsModel(null, {
        projectID: this.project.id
      } as any);

      stats.fetch({
        success: (data) => {
          this.statString = JSON.stringify(data, null, 4);
          this.statString = this.statString.replace(/{/g, '');
          this.statString = this.statString.replace(/}/g, '');
          this.statString = this.statString.replace(/\"/g, '');
          this.statString = this.statString.replace(/,/g, '');
          this.render();
        }
      })
    })
  }

  // ### Render
  render() {
    const rtpl = tpl({
      statistics: this.statString
    });
    this.el.innerHTML = rtpl;
    return this;
  }

};
