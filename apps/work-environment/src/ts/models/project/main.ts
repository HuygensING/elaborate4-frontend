import Backbone from "backbone"
import _ from "underscore"
import config from "../config"
import { BaseModel, Fn, ajax, Async } from "@elaborate4-frontend/hilib"
import Settings from "./settings"
// EntryMetadata is not a collection, it just reads and writes an array from and to the server.
import { EntryMetadataTransporter } from "../../entry.metadata"
import ProjectUserIDs from "../../project.user.ids"
import ProjectAnnotationTypeIDs from "../../project.annotationtype.ids"
import Entries from "../../collections/entries"
import AnnotationTypes from "../../collections/project/annotationtypes"
import Users from "../../collections/users"

export class Project extends BaseModel {
  projectAnnotationTypeIDs
  allannotationtypes
  projectUserIDs
  allusers

  defaults() {
    return {
      annotationtypes: null,
      createdOn: '',
      creator: null,
      entries: null,
      entrymetadatafields: null,
      level1: '',
      level2: '',
      level3: '',
      modifiedOn: '',
      modifier: null,
      name: '',
      projectLeaderId: null,
      settings: null,
      textLayers: [],
      title: '',
      userIDs: []
    };
  }

  // initialize: ->
  // 	super

    // 	console.log 'init project'
  parse(attrs) {
    attrs.entries = new Entries([], {
      projectId: attrs.id
    });
    // 	attrs.annotationtypes = new Collections.AnnotationTypes([], projectId: attrs.id)
    // 	attrs.users = new Collections.ProjectUsers([], projectId: attrs.id)
    return attrs;
  }

  addAnnotationType(annotationType, done) {
    var ids;
    ids = this.get('annotationtypeIDs');
    ids.push(annotationType.id);
    return this.projectAnnotationTypeIDs.save(ids, {
      success: () => {
        this.allannotationtypes.add(annotationType);
        return done();
      }
    });
  }

  removeAnnotationType(id, done) {
    return this.projectAnnotationTypeIDs.save(Fn.removeFromArray(this.get('annotationtypeIDs'), id), {
      success: () => {
        this.allannotationtypes.remove(id);
        return done();
      }
    });
  }

  addUser(user, done) {
    var userIDs;
    userIDs = this.get('userIDs');
    userIDs.push(user.id);
    return this.projectUserIDs.save(userIDs, {
      success: () => {
        this.allusers.add(user);
        return done();
      }
    });
  }

  removeUser(id, done) {
    return this.projectUserIDs.save(Fn.removeFromArray(this.get('userIDs'), id), {
      success: () => {
        this.get('members').removeById(id);
        return done();
      }
    });
  }

  load(cb) {
    var async, settings;
    if (this.get('annotationtypes') === null && this.get('entrymetadatafields') === null && this.get('userIDs').length === 0) {
      async = new Async(['annotationtypes', 'users', 'entrymetadatafields', 'settings']);
      async.on('ready', (data) => {
        // # If a project is loaded, update the sessionStorage item.
        // sessionStorage.setItem 'hing-elaborate-projects', JSON.stringify @collection
        // sessionStorage.setItem 'hing-elaborate-users', JSON.stringify @allusers
        // sessionStorage.setItem 'hing-elaborate-annotation-types', JSON.stringify @allannotationtypes
        return cb();
      });
      new AnnotationTypes().fetch({
        success: (collection, response, options) => {
          // Set all annotationtypes to root for use in views/project/settings
          this.allannotationtypes = collection;
          // Fetch annotation type IDs
          this.projectAnnotationTypeIDs = new ProjectAnnotationTypeIDs(this.id);
          return this.projectAnnotationTypeIDs.fetch((data) => {
            this.set('annotationtypeIDs', data);
            this.set('annotationtypes', new AnnotationTypes(collection.filter(function(model) {
              return data.indexOf(model.id) > -1;
            })));
            return async.called('annotationtypes');
          });
        }
      });
      // Users
      new Users().fetch({
        success: (collection) => {
          // Set all users to root for use in views/project/settings
          this.allusers = collection;
          // Fetch user IDs
          this.projectUserIDs = new ProjectUserIDs(this.id);
          return this.projectUserIDs.fetch((data) => {
            this.set('userIDs', data);
            this.set('members', new Users(collection.filter((model) => {
              return data.indexOf(model.id) > -1;
            })));
            return async.called('users');
          });
        },
        error: (model, response) => {
          if (response.status === 401) {
            return Backbone.history.navigate('login', {
              trigger: true
            });
          }
        }
      });
      new EntryMetadataTransporter(this.id).fetch((data) => {
        this.set('entrymetadatafields', data);
        return async.called('entrymetadatafields');
      });
      settings = new Settings(null, {
        projectID: this.id
      } as any);
      return settings.fetch({
        success: (model) => {
          this.set('settings', model);
          return async.called('settings');
        },
        error: (model, response) => {
          if (response.status === 401) {
            return Backbone.history.navigate('login', {
              trigger: true
            });
          }
        }
      });
    } else {
      // # If the project is loaded from sessionStorage, settings is an object literal. Convert to Backbone.Model.
      // else if not (@get('settings') instanceof Backbone.Model)
      // 	@allusers = new Collections.Users JSON.parse sessionStorage.getItem 'hing-elaborate-users'
      // 	@allannotationtypes = new Collections.AnnotationTypes JSON.parse sessionStorage.getItem 'hing-elaborate-annotation-types'

      // 	@projectUserIDs = new ProjectUserIDs(@id)
      // 	@projectAnnotationTypeIDs = new ProjectAnnotationTypeIDs(@id)

      // 	@set 'members', new Collections.Users @allusers.filter (model) => @get('annotationtypeIDs').indexOf(model.id) > -1
      // 	@set 'annotationtypes', new Collections.AnnotationTypes @allannotationtypes.filter (model) => @get('userIDs').indexOf(model.id) > -1
      // 	@set 'settings', new Models.Settings @get('settings'), projectID: @id

      // 	cb()

      // If everything is already loaded, just call the callback.
      return cb();
    }
  }

  fetchEntrymetadatafields(cb) {
    var jqXHR;
    // ajax.token = token.get()
    jqXHR = ajax.get({
      url: config.get('restUrl') + `projects/${this.id}/entrymetadatafields`,
      dataType: 'text'
    });
    jqXHR.done((response) => {
      this.set('entrymetadatafields', response);
      return cb();
    });
    return jqXHR.fail((response) => {
      if (response.status === 401) {
        return Backbone.history.navigate('login', {
          trigger: true
        });
      }
    });
  }

  publishDraft(cb) {
    var jqXHR;
    // ajax.token = token.get()
    jqXHR = ajax.post({
      url: config.get('restUrl') + `projects/${this.id}/draft`,
      dataType: 'text'
    });
    jqXHR.done(() => {
      var locationUrl;
      locationUrl = jqXHR.getResponseHeader('Location');
      localStorage.setItem('publishDraftLocation', locationUrl);
      return this.pollDraft(locationUrl, cb);
    });
    return jqXHR.fail((response) => {
      if (response.status === 401) {
        return Backbone.history.navigate('login', {
          trigger: true
        });
      }
    });
  }

  pollDraft(url, done) {
    return ajax.poll({
      url: url,
      testFn: (data) => {
        if (data != null) {
          return data.done;
        }
      },
      done: (data, textStatus, jqXHR) => {
        localStorage.removeItem('publishDraftLocation');
        if (data.fail) {
          localStorage.setItem(`${this.get('name')}:publicationErrors:value`, JSON.stringify(data.errors));
          localStorage.setItem(`${this.get('name')}:publicationErrors:timestamp`, Date.now().toString());
          // @ts-ignore
          this.publish("message", `Error(s) publishing, see <a href=\"/projects/${this.get('name')}/publication-errors\">error page</a>`);
        } else {
          // @ts-ignore
          this.publish('message', `Publication <a href='${data.url}' target='_blank' data-bypass>ready</a>.`);
        }
        return done();
      }
    });
  }

  saveTextlayers(done) {
    var jqXHR;
    // ajax.token = token.get()
    jqXHR = ajax.put({
      url: config.get('restUrl') + `projects/${this.id}/textlayers`,
      data: JSON.stringify(this.get('textLayers'))
    });
    jqXHR.done(() => {
      return done();
    });
    return jqXHR.fail((response) => {
      if (response.status === 401) {
        return Backbone.history.navigate('login', {
          trigger: true
        });
      }
    });
  }

  sync(method, model, options) {
    var jqXHR;
    if (method === 'create') {
      jqXHR = ajax.post({
        url: this.url(),
        data: JSON.stringify({
          title: this.get('title'),
          type: this.get('type')
        }),
        dataType: 'text'
      });
      jqXHR.done((data, textStatus, jqXHR) => {
        var xhr;
        if (jqXHR.status === 201) {
          xhr = ajax.get({
            url: jqXHR.getResponseHeader('Location')
          });
          xhr.done((data, textStatus, jqXHR) => {
            return options.success(data);
          });
          return xhr.fail(() => {
            return console.log(arguments);
          });
        }
      });
      return jqXHR.fail((response) => {
        if (response.status === 401) {
          return Backbone.history.navigate('login', {
            trigger: true
          });
        }
      });
    } else {
      return super.sync(method, model, options);
    }
  }

};
