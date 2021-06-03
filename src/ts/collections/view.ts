var Base, Views;

import Base from "./base"

Views = class Views extends Base {
  has(view) {
    if (this.get(view.cid)) {
      return true;
    } else {
      return fals;
    }
  }

};

export default Views;
