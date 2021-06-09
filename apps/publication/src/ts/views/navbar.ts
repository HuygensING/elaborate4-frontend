import Backbone from "backbone"
import _ from "underscore"
import $ from "jquery"
import { config } from "../models/config"
import { entries } from "../elaborate-modules/collections/entries"
import { el as fEl, util } from '@elaborate4-frontend/funcky'
import thumbnailTpl from "../../jade/entry/thumbnail.jade"
import { tagName } from "@elaborate4-frontend/hilib"

function toElement(innerHTML: string) {
  const div = document.createElement('div')
  div.innerHTML = innerHTML
  return div.firstChild
}

@tagName('nav')
export class NavBar extends Backbone.View {
  // firstCall = true
  loading: boolean
  loadedThumbnails
  unloadedThumbnails
  thumbnailsUL

  // ### Initialize
  constructor(private options = {}) {
    super(options)
    this.loading = false;
    this.loadedThumbnails = [];
    this.unloadedThumbnails = [];
    this.render()
  }

  // ### Render
  render() {
    this.thumbnailsUL = document.createElement('ul')
    this.thumbnailsUL.className = 'thumbnails';
    const renderThumbnail = (entry) => {
      var id, ref, thumb, tplStr;
      if (!(entry instanceof entries.model)) {
        entry = entries.findWhere({ '_id': entry.id })
      }
      id = entry.get('_id')
      // Create an HTML element from the thumbnail template.
      // First the template string is generated and second
      // the element created fromt the string.
      tplStr = thumbnailTpl({
        src: entry.get('thumbnails')[0],
        id: "entry-" + entry.get("_id"),
        name: (ref = entry.get('shortName')) != null ? ref : id
      })
      thumb = toElement(tplStr)
      thumb.loaded = false;
      this.unloadedThumbnails.push(thumb)
      // Append the thumb element to the fragment.
      return this.thumbnailsUL.appendChild(thumb)
    }
    const collection = config.get('facetedSearchResponse') ? config.get('facetedSearchResponse').get('results') : entries.models;
    collection.map(renderThumbnail)
    this.el.appendChild(this.thumbnailsUL)
    this.activateThumb()

    this.listenToScroll()
    return this
  }

  private throttledOnScroll = (ev) => {
    util.setResetTimeout(100, this.onNavScroll)
  }

  private listenToScroll() {
    this.thumbnailsUL = this.el.querySelector('ul')
    this.thumbnailsUL.addEventListener('scroll', this.throttledOnScroll)
  }

  onNavScroll = async () => {
    if (this.loading) return

    this.loading = true
    const li = _.find(this.unloadedThumbnails, l => fEl(l).inViewport())

    const index = this.unloadedThumbnails.indexOf(li)
    await this.loadThumbnailsAtIndex(index)
    this.loading = false
  }

    // ### Events
  events() {
    return {
      'click li': 'navigateEntry'
    }
  }

  // ### Methods
  destroy() {
    console.log('DESTROY')
    this.thumbnailsUL.removeEventListener(this.throttledOnScroll)
    this.remove()
  }

  async activateThumb(entryId?, scroll = false) {
    // If no entryId is given, use the current entry id.
    if (entryId == null) {
      entryId = entries.current.get("_id")
    }

    const index = entries.indexOf(entries.get(entryId))
    this.loading = true
    await this.loadThumbnailsAtIndex(index)
    var $active, $entries, leftPos, offset;
    // Unactivate current active entry.
    $entries = this.$('ul.thumbnails')
    $entries.find('li.active').removeClass('active')
    // Add active to activated entry.
    $active = $entries.find(`li#entry-${entryId}`)
    $active.addClass('active')
    // Using jQuery with .position().left does not give the correct left, because I guess it does not use
    // $entries as the parent to calculate relative left.
    leftPos = fEl($active[0]).position($entries[0]).left;
    offset = ($(window).width() / 2) - ($active.width() / 2)
    leftPos = $active[0].offsetLeft;
    if (scroll) {
      this.$('.thumbnails').animate({
        scrollLeft: leftPos - offset
      }, 300)
    } else {
      this.$('.thumbnails')[0].scrollLeft = leftPos - offset;
    }
    this.loading = false
  }

  navigateEntry(ev) {
    const entryId = (ev.hasOwnProperty('currentTarget')) ?
      ev.currentTarget.id.replace("entry-", "") :
      ev

    // Animate the NavBar.
    this.activateThumb(entryId, true)
    // Change the current entry.
    this.trigger('change:entry', { entryId })

    return Backbone.history.navigate(`/entry/${entryId}`)
  }

  private async loadThumbnailsAtIndex(index) {
    for (let i = index - 30; i <= index + 30; i++) {
      try {
        await this.loadThumbnailAtIndex(i)
      } catch (error) {}
    }

    // let ref
    // async.each((function() {
    //   var results = [];
    //   for (var i = ref = index - 30, ref1 = index + 30; ref <= ref1 ? i <= ref1 : i >= ref1; ref <= ref1 ? i++ : i--){ results.push(i) }
    //   return results
    // }).apply(this), this.loadThumbnailAtIndex, () => {
    //   if (done != null) done()

    //   setTimeout((() => {
    //     if (this.firstCall) {
    //       this.firstCall = false
    //       this.listenToScroll()
    //     }
    //   }), 1000)
    // })
  }

  private async loadThumbnailAtIndex(index) {
    const unloadedThumb = this.unloadedThumbnails[index]
    if (unloadedThumb == null) return

    if (!unloadedThumb.loaded) {
      await loadThumbnail(unloadedThumb)
      unloadedThumb.loaded = true;
    }
  }
}

function loadThumbnail(li): Promise<void> {
  return new Promise((resolve, reject) => {
    // The img tag is already present in the <li>, because
    // otherwise the CSS fade in (opacity transition) wouldn't work.
    const img = li.querySelector('img')
    
    // Handle succesful loading.
    const onLoad = function() {
      img.style.opacity = 1
      removeEventListeners()
      resolve()
    }
    // Handle loading errors.
    const onError = function() {
      img.src = notFoundUrl
      removeEventListeners()
      reject()
    }


    function removeEventListeners() {
      img.removeEventListener('load', onLoad)
      img.removeEventListener('error', onError)
    }

    // Remove event listeners and call the callback.
    // Listen to load and error events.
    img.addEventListener('load', onLoad)
    img.addEventListener('error', onError)
    // Add the src to the image.
    const cdn = "//cdn.huygens.knaw.nl/elaborate/publication/collection/v1"
    const notFoundUrl = `${cdn}/images/not-found.svg`
    let ref
    img.src = (ref = li.getAttribute('data-src')) != null ? ref : notFoundUrl;

  })
}
