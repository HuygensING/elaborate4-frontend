import Backbone from "backbone"
import _ from "underscore"
import $ from "jquery"
import { config } from "../models/config"
import { className } from "@elaborate4-frontend/hilib"
import { entries } from "../elaborate-modules/collections/entries"
import { Panels } from '../elaborate-modules/views/panels'
import { NavBar } from './navbar'

@className('entry')
export class Entry extends Backbone.View {
  panels
  subviews

  // ### Initialize
  constructor(private options: any) {
    super(options)

    this.subviews = [];
    const modelLoaded = () => {
      entries.setCurrent(this.model.id)
      this.el.setAttribute('id', 'entry-' + this.model.id)
      this.render()
    }
    if ((config.get('facetedSearchResponse') != null) && config.get('facetedSearchResponse').get('ids').length < entries.length) {
      const part = config.get('facetedSearchResponse').get('ids').length + ' of ' + entries.length;
      $('a[name="entry"]').html(`Edition <small>(${part})</small>`)
    } else {
      $('a[name="entry"]').html("Edition")
    }

    // The IDs of the entries are passed to the collection on startup, so we can not check
    // isNew() if we need to fetch the full model or it already has been fetched.
    this.model = entries.get(this.options?.entryId)

    if (this.model != null) {
      modelLoaded()
    } else {
      this.model = this.options?.entryId != null ?
        entries.findWhere({ datafile: this.options.entryId + '.json' }) :
        entries.current

      if (this.model == null) {
        // If a model isn't found (user has typed or pasted something wrong), go Home.
        Backbone.history.navigate('/', {
          trigger: true
        })
      }
      this.model.fetch().done(() => {
        modelLoaded()
      })
    }
  }

  // ### Render
  render() {
    const navBar = new NavBar()
    this.el.appendChild(navBar.el)
    if (config.get('textFont') != null && config.get('textFont').length) {
      this.el.classList.add(config.get('textFont'))
    }
    this.listenTo(navBar, 'change:entry', this.renderPanels)
    this.renderPanels(this.options)
    return this;
  }

  // ### Methods
  destroy() {
    const ref = this.subviews;
    for (let i = 0, len = ref.length; i < len; i++) {
      const view = ref[i];
      view.destroy()
    }
    this.remove()
  }

  renderPanels(options) {
    if ((config.get('metadata') != null) && config.get('metadata').image_copyright_statement) {
      options.image_copyright_statement = config.get('metadata').image_copyright_statement;
    }

    const fadeInNewPanel = () => {
      this.panels = new Panels(options)
      this.panels.$el.hide()
      this.$el.append(this.panels.$el)
      this.panels.$el.fadeIn('fast')
    }

    if (this.panels != null) {
      this.panels.$el.fadeOut('fast', () => {
        this.panels.destroy()
        fadeInNewPanel()
      })
    } else {
      fadeInNewPanel()
    }
  }

}
