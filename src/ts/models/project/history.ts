var Models, ProjectHistory;

Models = {
import  Base from "../base"
};

// state: require 'models/state'
ProjectHistory = class ProjectHistory extends Models.Base {
  defaults() {
    return {
      comment: '',
      userName: '',
      createdOn: null,
      dateString: ''
    };
  }

  parse(attrs) {
    attrs.dateString = new Date(attrs.createdOn).toDateString();
    return attrs;
  }

};

export default ProjectHistory;
