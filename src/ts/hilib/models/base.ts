var Backbone, BaseModel, Pubsub, _;

import Backbone  from "backbone";

import _  from "underscore";

import Pubsub  from "../mixins/pubsub";

BaseModel = class BaseModel extends Backbone.Model {
  initialize() {
    return _.extend(this, Pubsub);
  }

};

export default BaseModel;
