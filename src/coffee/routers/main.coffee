Backbone = require 'backbone'
_ = require 'underscore'
$ = require 'jquery'

viewManager = require 'hilib/src/managers/view2'
history = require 'hilib/src/managers/history'
Pubsub = require 'hilib/src/mixins/pubsub'
Fn = require 'hilib/src/utils/general'

currentUser = require '../models/currentUser'

Collections =
  projects: require '../collections/projects'

Views =
  Login: require '../views/login'
  SetNewPassword: require '../views/set-new-password'
  NoProject: require '../views/no-project'
  ProjectMain: require '../views/project/search'
  ProjectSettings: require '../views/project/settings/main'
  ProjectHistory: require '../views/project/history'
  Statistics: require '../views/project/statistics'
  Entry: require '../views/entry/main'
  Header: require '../views/ui/header'

class MainRouter extends Backbone.Router

  initialize: ->
    _.extend @, Pubsub

    @on 'route', => history.update()
    @on 'route:projectMain', => Backbone.trigger 'router:search'

  # The init method is manually triggered from app.js, after Backbone.history.start().
  # Ideally we would have this code in the initialize method, but we need to use @navigate
  # which isn't operational yet.
  init: ->
    return if Backbone.history.fragment is 'resetpassword'

    currentUser.authorize
      authorized: =>
        Collections.projects.fetch()
        Collections.projects.getCurrent (@project) =>
          unless @project?

            return @navigate 'noproject', trigger: true
          document.title = "eLaborate - #{@project.get('title')}"
          # Route to correct url
          url = history.last() ? 'projects/'+@project.get('name')
          @navigate url, trigger: true

          header = new Views.Header project: @project
          $('#container').prepend header.el
            # persist: true

          @listenTo Collections.projects, 'current:change', (@project) =>
            viewManager.clear()
            document.title = "eLaborate - #{@project.get('title')}"
            @navigate "projects/#{@project.get('name')}", trigger: true
      unauthorized: => @publish 'login:failed'
      navigateToLogin: => @navigate 'login', trigger: true

  # manageView: (View, options) -> viewManager.show $('div#main'), View, options
  manageView: do ->
    currentView = null

    (View, options) ->
      currentView.destroy() if currentView?

      currentView = new View options
      $('div#main').html currentView.el


  routes:
    '': 'projectMain'
    'login': 'login'
    'noproject': 'noproject'
    'resetpassword': 'setNewPassword'
    'projects/:name': 'projectMain'
    'projects/:name/settings/:tab': 'projectSettings'
    'projects/:name/settings': 'projectSettings'
    'projects/:name/history': 'projectHistory'
    'projects/:name/statistics': 'statistics'
    'projects/:name/entries/:id': 'entry'
    'projects/:name/entries/:id/transcriptions/:name': 'entry'
    'projects/:name/entries/:id/transcriptions/:name/annotations/:id': 'entry'

  login: ->
    return currentUser.logout() if currentUser.loggedIn
    @manageView Views.Login

  noproject: ->
    # The if-statement is used to redirect the user to login if s/he decides to refresh
    # the page after landing on /noproject.
    if currentUser.loggedIn
      view = new Views.NoProject()
      $('div#main').append view.el

      currentUser.loggedIn = false
      sessionStorage.clear()
    else
      @login()


  setNewPassword: ->
    @login()

    view = new Views.SetNewPassword()
    $('div#main').append view.el


  projectMain: (projectName) ->
    # In theory we don't have to pass the projectName, because it is known
    # through Collections.project.current, but we need to send it for the viewManager
    # so it doesn't cache the same view for different projects.
    @manageView Views.ProjectMain, projectName: projectName

  projectSettings: (projectName, tab) ->
    # See projectMain comment
    @manageView Views.ProjectSettings,
      projectName: projectName
      tabName: tab

  projectHistory: (projectName) ->
    # See projectMain comment
    @manageView Views.ProjectHistory,
      projectName: projectName
      cache: false

  statistics: (projectName) ->
    # See projectMain comment
    @manageView Views.Statistics,
      projectName: projectName
      cache: false

  # An entry might be editted outside the entry view (where it would update the DOM),
  # for instance when editting multiple metadata, so we check the IDs of changed entries
  # and set options.cache according.
  entry: (projectName, entryID, transcriptionName, annotationID) ->
    attrs =
      projectName: projectName
      entryId: entryID
      transcriptionName: transcriptionName
      annotationID: annotationID

    changedIndex = @project.get('entries').changed.indexOf +entryID if @project?
    if changedIndex > -1
      # Remove entryID from changed array.
      @project.get('entries').changed.splice changedIndex, 1

      # Set cache value to false, to tell viewManager to rerender view.
      attrs.cache = false

    @manageView Views.Entry, attrs

module.exports = new MainRouter()