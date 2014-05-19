Backbone = require 'backbone'
Annotation = require '../models/annotation'

class Annotations extends Backbone.Collection

	model: Annotation

module.exports = Annotations