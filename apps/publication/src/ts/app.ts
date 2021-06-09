import Backbone from "backbone"
import $ from "jquery"
Backbone.$ = $;
import { config } from "./models/config"
import './routers/main'
import { entries } from "./elaborate-modules/collections/entries"
import { textlayers } from "./elaborate-modules/collections/textlayers"

import bootstrapTemplate from "../jade/body.jade"


const rootURL = BASE_URL.replace(/https?:\/\/[^\/]+/, '')

export function app() {
  const jqXHR = config.fetch()
  jqXHR.done(() => {
    entries.add(config.get('entries'))
    entries.setCurrent(entries.at(0))
    textlayers.add(config.get('textlayers'))
    textlayers.setCurrent(textlayers.at(0))
    // Load first before any views,
    // so views can attach to elements
    $('body').html(bootstrapTemplate())
    $('header h1 a').text(config.get('title'))
    // Load the menu from WordPress
    const jqXHR = $.get('../external/')
    jqXHR.done((menuDiv) => {
      // @ts-ignore
      Backbone.trigger('CONFIG_DONE')
      menuDiv = $(menuDiv)
      if (menuDiv.hasClass('menu-mainmenu-container')) {
        const ref = menuDiv.find('a')
        for (let i = 0, len = ref.length; i < len; i++) {
          const a = ref[i];
          a.setAttribute('data-bypass', true)
        }
        $('header > ul').after(menuDiv)
      }
    })
    // DEV ONLY
    // else
    // 	menuDiv = $ '<div class="menu-mainmenu-container"><ul id="menu-mainmenu" class="menu"><li id="menu-item-13" class="menu-item menu-item-type-custom menu-item-object-custom menu-item-13"><a href="/">Home</a></li>
    // 		<li id="menu-item-14" class="menu-item menu-item-type-custom menu-item-object-custom menu-item-14"><a href="/edition">Online edition</a></li>
    // 		<li id="menu-item-12" class="menu-item menu-item-type-post_type menu-item-object-page menu-item-12"><a href="http://deystroom.huygens.knaw.nl/introduction/">Introduction</a></li>
    // 		<li id="menu-item-11" class="menu-item menu-item-type-post_type menu-item-object-page menu-item-11"><a href="http://deystroom.huygens.knaw.nl/about-this-edition/">About this edition</a></li>
    // 		</ul></div>'
    // 	a.setAttribute 'data-bypass', true for a in menuDiv.find 'a'
    // 	$('header > ul').after menuDiv
    Backbone.history.start({
      root: rootURL,
      pushState: true
    })

    $(document).on('click', 'a:not([data-bypass])', function(e) {
      const href = $(this).attr('href')
      if (href != null) {
        e.preventDefault()
        Backbone.history.navigate(href, {
          trigger: true
        })
      }
    })
  })

  jqXHR.fail((m, o) => {
    $('body').html('An unknown error occurred while attempting to load the application.')
    console.error("Could not fetch config data", typeof JSON !== "undefined" && JSON !== null ? JSON.stringify(o) : void 0)
  })
}
