import _ from "underscore"

import currentUser from "../../../models/currentUser"
import User from "../../../models/user"

import tpl from "../../../../jade/project/settings/users.jade"
import rolesTpl from "../../../../jade/project/settings/users.roles.jade"
import addUserTpl from "../../../../jade/project/settings/users.add.jade"
import { className, Form, ComboList, BaseView } from "@elaborate4-frontend/hilib"

@className('users')
export default class ProjectSettingsUsers extends BaseView {
  combolist: ComboList
  project

  // ### Initialize
  constructor(private options?) {
    super(options)
    this.project = this.options.project
    this.listenTo(this.project.get('members'), 'add remove', this.renderUserroles)
    this.render()
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
    this.$('.userroles ul').html(rolesTpl({
      members: this.project.get('members')
    }));
  }

  renderAddUserForm() {
    const form = new Form({
      model: new User(),
      tpl: addUserTpl,
      tplData: {
        roleNo: currentUser.get('roleNo')
      }
    })

    this.$('.adduser').append(form.el);

    this.listenTo(form, 'save:success', (model) => {
      form.reset()
      this.project.get('members').add(model)
      this.project.addUser(model, () => {
        this.publish(
          'message',
          `Added ${model.getShortName()} to ${this.project.get('title')}.`
        )
      })
      this.renderCombolist()
    })

    this.listenTo(form, 'save:error', (model, xhr, options) => {
      this.publish('message', xhr.responseText);
    })
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

  renderCombolist() {
    if (this.combolist != null) {
      this.stopListening(this.combolist)
      this.combolist.destroy()
    }

    this.combolist = new ComboList({
      value: this.project.get('members'),
      config: {
        data: this.project.allusers,
        settings: {
          placeholder: 'Add member',
          confirmRemove: true
        }
      }
    })

    this.$('.userlist').append(this.combolist.el);

    this.listenTo(this.combolist, 'confirmRemove', (id, confirm) => {
      this.trigger('confirm', confirm, {
        html: 'You are about to remove <u>' + this.project.get('members').get(id).get('title') + '</u> from your project.',
        submitValue: 'Remove user'
      })
    })

    this.listenTo(this.combolist, 'change', (changes) => {
      if (changes.added != null) {
        const userAttrs = _.findWhere(changes.selected, {
          id: changes.added
        });
        const user = new User(userAttrs);
        return this.project.addUser(user, () => {
          return this.publish('message', `Added ${user.getShortName()} to ${this.project.get('title')}.`);
        });
      } else if (changes.removed != null) {
        const user = this.project.allusers.get(changes.removed);
        const shortName = user.getShortName();
        return this.project.removeUser(changes.removed, () => {
          return this.publish('message', `Removed ${shortName} from ${this.project.get('title')}.`);
        })
      }
    })
  }
}



