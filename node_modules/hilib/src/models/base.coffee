Backbone = require 'backbone'
_ = require 'underscore'

Pubsub = require '../mixins/pubsub'

class BaseModel extends Backbone.Model

	initialize: ->
		_.extend @, Pubsub

module.exports = BaseModel