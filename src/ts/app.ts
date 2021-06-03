import Backbone from "backbone"
import $ from "jquery"
Backbone.$ = $;
import mainRouter from "./routers/main"

/* DEBUG */
// @ts-ignore
Backbone.on('authorized', function() {
  return console.log('[debug] authorized');
});

// @ts-ignore
Backbone.on('unauthorized', function() {
  return console.log('[debug] unauthorized');
});

/* /DEBUG */
export default function() {
  Backbone.history.start({
    pushState: true
  });
  mainRouter.init();
  return $(document).on('click', 'a:not([data-bypass])', function(e) {
    var href;
    href = $(this).attr('href');
    if (href != null) {
      e.preventDefault();
      return Backbone.history.navigate(href, {
        'trigger': true
      });
    }
  });
};
