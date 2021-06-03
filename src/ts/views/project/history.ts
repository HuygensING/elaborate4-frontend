import _ from "underscore"

import BaseView from "hilib/views/base"

import History from "../../collections/project/history"
import projects from "../../collections/projects"

import tpl from "../../../jade/project/history.jade"

export default class ProjectHistory extends BaseView {
  project
  historyChunks
  index
  all

  constructor(options?) {
    super({ ...options, className: 'projecthistory' })
    this.index = 0

    projects.getCurrent((project) => {
      this.project = project;
      this.all = new History(this.project.id);
      this.all.fetch((response) => {
        this.historyChunks = [];
        while (response.length > 0) {
          this.historyChunks.push(response.splice(0, 500));
        }
        this.render();
      });
    });
  }

  // ### Render
  render() {
    // Get the next chunk
    const chunk = this.historyChunks[this.index];
    // Add a dateString to every entry
    _.each(chunk, function(entry) {
      return entry.dateString = new Date(entry.createdOn).toDateString();
    });
    // Group the entries by dateString
    const chunks = _.groupBy(chunk, 'dateString');
    // Render the html with the logEntries
    const rtpl = tpl({
      logEntries: chunks
    });
    this.el.innerHTML = rtpl;
    if (this.index + 1 === this.historyChunks.length) {
      // Hide the 'more' button when we are rendering the last chunk
      const button: HTMLButtonElement = this.el.querySelector('button.more')
      button.style.display = 'none';
    }
    return this;
  }

  // ### Events
  events() {
    return {
      'click button.more': 'more'
    };
  }

  more() {
    this.index++;

    // TODO
    console.error("RENDER ENTRIES?")
    // return this.renderEntries();
  }

};
