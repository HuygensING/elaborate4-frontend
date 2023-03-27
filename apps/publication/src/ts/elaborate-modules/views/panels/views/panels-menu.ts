import Backbone from "backbone"
import $ from "jquery"
import _ from "underscore"
import { textlayers } from "../../../../elaborate-modules/collections/textlayers"
import { SelectedPanels } from "../collections/selected-panels"
import tpl from "./panels-menu.jade"
import { className, stringFn } from "@elaborate4-frontend/hilib"
import { config } from "../../../../models/config"


@className('panels-menu')
export class PanelsMenu extends Backbone.View {
  dragEl
  placeholder
  panelSequence

  // ### Initialize
  constructor(private options) {
    super(options)
    this.setSelectedPanels()
    this.render()
  }

  // ### Render
  render() {
    this.$el.html(tpl({
      facsimiles: this.options.facsimiles,
      textlayers: textlayers,
      selectedPanels: config.get('selectedPanels')
    }))

    this.placeholder = this.$('li.placeholder')
    this.panelSequence = this.getPanelSequence()
    let leaveTimer = null;
    this.$('ul').mouseleave(() => {
      leaveTimer = setTimeout((() => {
        this.stopDrag()
        this.$('ul').slideUp('fast')
      }), 1000)
    })
    this.$('ul').mouseenter(() => {
      return clearTimeout(leaveTimer)
    })

    return this
  }

  getPanelSequence() {
    return _.map(this.$('li:not(.placeholder)'), function(li) {
      return li.getAttribute('data-id')
    })
  }

  // ### Events
  events() {
    return {
      'click button.green': 'toggleMenu',
      'click li': 'toggleOption',
      'mousedown li': function(ev) {
        if (ev.target.tagName !== 'I') {
          return this.dragEl = $(ev.currentTarget)
        }
      },
      'mouseup li': 'stopDrag',
      'mousemove': 'drag'
    }
  }

  drag(ev) {
    var dragElHigherThanLi, dragElLowerThanLastLi, dragElTop, j, len, li, liIndex, liTop, lis, results;
    if (this.dragEl != null) {
      dragElTop = ev.clientY - this.$('ul').offset().top - this.dragEl.height() / 2;
      if ((0 < dragElTop && dragElTop < this.$('ul').outerHeight())) {
        this.placeholder.insertBefore(this.dragEl)
        this.placeholder.show()
        this.dragEl.css('position', 'absolute')
        this.dragEl.css('top', dragElTop)
      }
      lis = this.$('ul li')
      results = [];
      for (j = 0, len = lis.length; j < len; j++) {
        li = lis[j];
        liTop = $(li).position().top;
        liIndex = lis.index(li)
        dragElHigherThanLi = dragElTop < liTop;
        dragElLowerThanLastLi = liIndex === lis.length - 1 && dragElTop > liTop;
        if (dragElHigherThanLi) {
          this.placeholder.insertBefore(li)
          break;
        }
        if (dragElLowerThanLastLi) {
          this.placeholder.insertAfter(li)
          break;
        } else {
          results.push(void 0)
        }
      }
      return results;
    }
  }

  // TODO remove stopIt and fix click/mouseup different
  stopDrag() {
    const stopIt = () => {
      var newIndex, oldIndex, panelId, selectedPanels;
      // Only do drag logic if the @drag has been called, we can check this by the elements
      // position, because @drag sets it to 'absolute'.
      if ((this.dragEl != null) && this.dragEl.css('position') === 'absolute') {
        selectedPanels = config.get('selectedPanels')
        this.dragEl.insertAfter(this.placeholder)
        this.placeholder.hide()
        this.dragEl.css('position', 'static')
        this.dragEl.css('top', 'auto')
        panelId = this.dragEl.attr('data-id')
        newIndex = this.$('ul li:not(.placeholder)').index(this.dragEl)
        oldIndex = selectedPanels.indexOf(selectedPanels.get(panelId))
        if (oldIndex !== newIndex) {
          selectedPanels.models.splice(newIndex, 0, selectedPanels.models.splice(oldIndex, 1)[0])
          selectedPanels.trigger('sort')
        }
      }
      // Always set @dragEl to null, because @dragEl is also set on a click (mousedown is triggered)
      this.dragEl = null;
    }

    setTimeout(stopIt, 50)
  }

  toggleMenu(ev) {
    this.$('ul').slideToggle('fast')
  }

  toggleOption(ev) {
    if (this.dragEl != null) return
    const target = this.$(ev.currentTarget)
    const icon = target.find('i.checkbox')
    icon.toggleClass('fa-square-o')
    icon.toggleClass('fa-check-square-o')
    // TODO Use .parent('li').attr so we can remove data-id from i.fa

    const panelId = icon.attr('data-id')

    config.get('selectedPanels')
      .get(panelId)
      .set('show', icon.hasClass('fa-check-square-o'))
  }

  setSelectedPanels() {
    const models = []

    let selectedPanels
    if (config.has('selectedPanels')) {
      selectedPanels = config.get('selectedPanels')
      selectedPanels.remove(selectedPanels.where({ type: 'facsimile' }))
    } else {
      selectedPanels = new SelectedPanels()
      textlayers.models.forEach(model => {
          selectedPanels.add({
            id: model.id,
            type: 'textlayer',
            show: model.id === textlayers.current.id
          })

      })
    }

    this.options.facsimiles.forEach((facsimile, i) => {
      const newPanel = {
        id: facsimile.zoom,
        type: 'facsimile',
        show: i === 0
      }
      selectedPanels.add(newPanel)
    })

    if (this.options.layerSlug != null) {
      const panel = selectedPanels.get(stringFn.ucfirst(this.options.layerSlug))
      if (panel != null) panel.set('show', true)
    }

    config.set('selectedPanels', selectedPanels)
  }

  destroy() {
    return this.remove()
  }

}

