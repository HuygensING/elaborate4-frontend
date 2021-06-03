import Backbone from "backbone";
import $ from "jquery";
Backbone.$ = $;
import mainRouter from "./routers/main";
Backbone.on('authorized', function () {
    return console.log('[debug] authorized');
});
Backbone.on('unauthorized', function () {
    return console.log('[debug] unauthorized');
});
export default function () {
    Backbone.history.start({
        pushState: true
    });
    mainRouter.init();
    return $(document).on('click', 'a:not([data-bypass])', function (e) {
        var href;
        href = $(this).attr('href');
        if (href != null) {
            e.preventDefault();
            return Backbone.history.navigate(href, {
                'trigger': true
            });
        }
    });
}
;
