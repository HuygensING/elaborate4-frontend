import config from "../models/config"
import User from "../models/user"
import { BaseCollection } from "@elaborate4-frontend/hilib"

export default class Users extends BaseCollection {
  url = () => {
    return `${config.get('restUrl')}users`;
  }

  comparator = (user) => {
    var title;
    // Apparently title can be null
    title = user.get('title');
    if (title != null) {
      return title.toLowerCase();
    } else {
      return '';
    }
  }

}

Users.prototype.model = User

