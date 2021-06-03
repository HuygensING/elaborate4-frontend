import config from "../models/config"
import User from "../models/user"
import  Base from "./base"

export default class Users extends Base {
  model = User

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
