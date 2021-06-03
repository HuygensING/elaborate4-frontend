import _ from "underscore"
import Base from "hilib/views/base"
import ComboList from "hilib/views/form/combolist/main"
import Form from "hilib/views/form/main"

import currentUser from "../../../models/currentUser"
import User from "../../../models/user"

import tpl from "../../../../jade/project/settings/users.jade"
import rolesTpl from "../../../../jade/project/settings/users.roles.jade"
import addUserTpl from "../../../../jade/project/settings/users.add.jade"

export default class ProjectSettingsUsers extends Base {
  project

  // ### Initialize
  constructor(private options?) {
    super({ ...options, className: 'users' })
    this.project = this.options.project;
    this.listenTo(this.project.get('members'), 'add remove', this.renderUserroles);
    this.render();
  }

  // ### Render
  render() {
    this.el.innerHTML = tpl();
    this.renderUserroles();
    this.renderCombolist();
    this.renderAddUserForm();
    return this;
  }

  renderUserroles() {
    return this.$('.userroles ul').html(rolesTpl({
      members: this.project.get('members')
    }));
  }

  renderAddUserForm() {
    var form;
    form = new Form({
      // Model: Models.User
      model: new User(),
      tpl: addUserTpl,
      tplData: {
        roleNo: currentUser.get('roleNo')
      }
    });
    this.$('.adduser').append(form.el);
    this.listenTo(form, 'save:success', (model) => {
      form.reset();
      this.project.get('members').add(model);
      this.project.addUser(model, () => {
        // @ts-ignore
        return this.publish('message', `Added ${model.getShortName()} to ${this.project.get('title')}.`);
      });
      return this.renderCombolist();
    });
    return this.listenTo(form, 'save:error', (model, xhr, options) => {
      // @ts-ignore
      return this.publish('message', xhr.responseText);
    });
  }

  // ### Events
  events() {
    return {
      'change select': 'roleChanged'
    };
  }

  roleChanged(ev) {
    var id, jqXHR, role;
    id = ev.currentTarget.getAttribute('data-id');
    role = ev.currentTarget.options[ev.currentTarget.selectedIndex].value;
    jqXHR = this.project.get('members').get(id).set('role', role).save();
    jqXHR.done(() => {
      // @ts-ignore
      return this.publish('message', 'Changed role to ' + role);
    });
    return jqXHR.fail(() => {
      // @ts-ignore
      return this.publish('message', 'Changing role failed!');
    });
  }

  renderCombolist = () => {
    var combolist;
    combolist = null;
    return function() {
      if (combolist != null) {
        this.stopListening(combolist);
        combolist.destroy();
      }
      combolist = new ComboList({
        value: this.project.get('members'),
        config: {
          data: this.project.allusers,
          settings: {
            placeholder: 'Add member',
            confirmRemove: true
          }
        }
      } as any);
      this.$('.userlist').append(combolist.el);
      this.listenTo(combolist, 'confirmRemove', (id, confirm) => {
        return this.trigger('confirm', confirm, {
          html: 'You are about to remove <u>' + this.project.get('members').get(id).get('title') + '</u> from your project.',
          submitValue: 'Remove user'
        });
      });
      return this.listenTo(combolist, 'change', (changes) => {
        var shortName, user, userAttrs;
        if (changes.added != null) {
          userAttrs = _.findWhere(changes.selected, {
            id: changes.added
          });
          user = new User(userAttrs);
          return this.project.addUser(user, () => {
            return this.publish('message', `Added ${user.getShortName()} to ${this.project.get('title')}.`);
          });
        } else if (changes.removed != null) {
          user = this.project.allusers.get(changes.removed);
          shortName = user.getShortName();
          return this.project.removeUser(changes.removed, () => {
            return this.publish('message', `Removed ${shortName} from ${this.project.get('title')}.`);
          });
        }
      })
    }
  }
}

