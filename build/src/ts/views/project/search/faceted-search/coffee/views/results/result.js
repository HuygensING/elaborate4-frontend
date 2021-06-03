const hasProp = {}.hasOwnProperty;
import Backbone from "backbone";
import tpl from "./result.jade";
export default class Result extends Backbone.View {
    options;
    tpl = tpl;
    initialize(options = {}) {
        var base;
        this.options = options;
        if ((base = this.options).fulltext == null) {
            base.fulltext = false;
        }
        if (this.options.fulltext) {
            this.$el.addClass('fulltext');
        }
        else {
            this.$el.addClass('no-fulltext');
        }
        return this.render();
    }
    render() {
        var count, found, ref, rtpl, term;
        found = [];
        ref = this.options.data.terms;
        for (term in ref) {
            if (!hasProp.call(ref, term))
                continue;
            count = ref[term];
            found.push(`${count}x ${term}`);
        }
        if (this.options.config.get('templates').hasOwnProperty('result')) {
            this.tpl = this.options.config.get('templates').result;
        }
        rtpl = this.tpl({
            data: this.options.data,
            fulltext: this.options.fulltext,
            found: found.join(', ')
        });
        this.$el.html(rtpl);
        return this;
    }
    events() {
        return {
            'click': '_handleClick',
            'click li[data-layer]': '_handleLayerClick'
        };
    }
    _handleClick(ev) {
        return this.trigger('click', this.options.data);
    }
    _handleLayerClick(ev) {
        var layer;
        ev.stopPropagation();
        layer = ev.currentTarget.getAttribute('data-layer');
        return this.trigger('layer:click', layer, this.options.data);
    }
    destroy() {
        return this.remove();
    }
}
;
Result.prototype.className = 'result';
Result.prototype.tagName = 'li';
