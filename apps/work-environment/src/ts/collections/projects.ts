import Backbone from "backbone"
import _ from "underscore"
import config from "../models/config"
import { history, BaseCollection } from "@elaborate4-frontend/hilib"
import { Project } from '../models/project/main'
import { model } from "@elaborate4-frontend/hilib"

@model(Project)
class Projects extends BaseCollection {
  declare current: Project
  url = config.get('restUrl') + 'projects'

  constructor(models?, options?) {
    super(models, options)
    this.on('sync', this.setCurrent, this);
  }

  fetch(options: any = {}) {
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
    } else {
      return this.once('current:change', () => {
        return cb(this.current);
      });
    }
  }

  // setCurrent is called everytime the collections syncs, in these cases the parameter id can be
  // a Backbone.Model (create/POST) or a Backbone.Collection (fetch/GET). If setCurrent is called
  // with an id, it should be a Number.
  setCurrent(id) {
    var fragmentPart;
    if (id instanceof Backbone.Model) {
      id = id.id;
    }
    fragmentPart = history.last() != null ? history.last().split('/') : [];
    // console.log id, fragmentPart, arguments
    if (_.isNumber(id)) {
      this.current = this.get(id) as Project
    } else if (fragmentPart[1] === 'projects') {
      this.current = this.find(p => p.get('name') === fragmentPart[2]) as Project
    } else {
      this.current = this.first() as Project
    }
    if (this.current == null) {
      // If @current does not exist, the user is not assigned to any projects.
      // Skip the loading of the current project and trigger the change with
      // the current undefined project. The listener will pick up the undefined
      // and tell the view to take action.
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

export default new Projects()
