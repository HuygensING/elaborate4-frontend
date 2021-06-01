_ = require 'underscore'

config = require './config'

ajax = require 'hilib/src/managers/ajax'
token = require 'hilib/src/managers/token'

syncOverride = require 'hilib/src/mixins/model.sync'

Models = 
  Base: require './base'
  Settings: require './entry.settings'

Collections =
  Transcriptions: require '../collections/transcriptions'
  Facsimiles: require '../collections/facsimiles'

class Entry extends Models.Base

  urlRoot: -> "#{config.get('restUrl')}projects/#{@project.id}/entries"

  defaults: ->
    name: ''
    publishable: false
    shortName: ''
    terms: null

  initialize: ->
    super()
    _.extend @, syncOverride

  set: (attrs, options) ->
    # All attributes (include settings) are passed to this model, so we have to
    # differentiate between @attributes and settings.attributes. This must change!
    settings = @get('settings')
    if settings? and settings.get(attrs)?
      settings.set attrs, options
      @trigger 'change'
    else
      super()

  clone: ->
    newObj = new @constructor
      name: @get 'name'
      publishable: @get 'publishable'
      shortName: @get 'shortName'
      modifier: @get 'modifier'
      modifiedOn: @get 'modifiedOn'

    newObj.set 'settings', new Models.Settings @get('settings').toJSON(),
      projectId: @project.id
      entryId: @id

    newObj

  updateFromClone: (clone) ->
    @set 'name', clone.get 'name'
    @set 'publishable', clone.get 'publishable'
    @set 'shortName', clone.get 'shortName'
    @get('settings').set clone.get('settings').toJSON()

  # parse: (attrs) ->
  # 	if attrs? and @collection?
  # 		attrs.transcriptions = new Collections.Transcriptions [],
  # 			projectId: @collection.projectId
  # 			entryId: attrs.id

  # 		attrs.settings = new Models.Settings [],
  # 			projectId: @collection.projectId
  # 			entryId: attrs.id

  # 		attrs.facsimiles = new Collections.Facsimiles [],
  # 			projectId: @collection.projectId
  # 			entryId: attrs.id

  # 	attrs

  # sync: (method, model, options) ->
  # 	if method is 'create' or method is 'update'
  # 		options.attributes = ['name', 'publishable']
  # 		@syncOverride method, model, options
  # 	else
  # 		super

  fetchTranscriptions: (currentTranscriptionName, done) ->
    transcriptions = new Collections.Transcriptions [],
      projectId: @project.id
      entryId: @id

    jqXHR = transcriptions.fetch()
    jqXHR.done =>
      @set 'transcriptions', transcriptions
      done transcriptions.setCurrent currentTranscriptionName

  fetchFacsimiles: (done) ->
    facsimiles = new Collections.Facsimiles [],
      projectId: @project.id
      entryId: @id

    jqXHR = facsimiles.fetch()
    jqXHR.done =>
      @set 'facsimiles', facsimiles
      done facsimiles.setCurrent()

  fetchSettings: (done) ->
    settings = new Models.Settings [],
      projectId: @project.id
      entryId: @id

    jqXHR = settings.fetch()
    jqXHR.done =>
      @set 'settings', settings
      done()

  setPrevNext: (done) ->
    return done() unless @project.resultSet?

    ids = @project.resultSet.get('ids')
    index = ids.indexOf(''+@id)

    @prevID = ids[index-1]
    @nextID = ids[index+1]

    done()

  fetchPrevNext: (done) ->
    jqXHR = ajax.get url: @url() + '/prevnext'
    jqXHR.done (response) =>
      @nextID = response.next
      @prevID = response.prev
      done()

  sync: (method, model, options) ->
    data = JSON.stringify
      name: @get 'name'
      publishable: @get 'publishable'
      shortName: @get 'shortName'

    if method is 'create'
      jqXHR = ajax.post
        url: @url()
        data: data
        dataType: 'text'

      jqXHR.done (data, textStatus, jqXHR) =>
        if jqXHR.status is 201
          xhr = ajax.get url: jqXHR.getResponseHeader('Location')
          xhr.done (data, textStatus, jqXHR) =>
            options.success data
          xhr.fail (response) =>
            Backbone.history.navigate 'login', trigger: true if response.status is 401

      jqXHR.fail (response) => Backbone.history.navigate 'login', trigger: true if response.status is 401

    else if method is 'update'
      jqXHR = ajax.put
        url: @url()
        data: data
      jqXHR.done (response) => options.success response
      jqXHR.fail (response) => Backbone.history.navigate 'login', trigger: true if response.status is 401

    else
      super()

module.exports = Entry
