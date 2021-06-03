import config from "../models/config";
import User from "../models/user";
import Base from "./base";
class Users extends Base {
    url = () => {
        return `${config.get('restUrl')}users`;
    };
    comparator = (user) => {
        var title;
        title = user.get('title');
        if (title != null) {
            return title.toLowerCase();
        }
        else {
            return '';
        }
    };
}
Users.prototype.model = User;
