import $ from "jquery";
import _ from "underscore";
import Boolean from "../../models/facets/boolean";
import Facet from "./main";
import bodyTpl from "../../../jade/facets/boolean.body.jade";
class BooleanFacet extends Facet {
    initialize(options) {
        super.initialize();
        this.model = new Boolean(options.attrs, {
            parse: true
        });
        this.listenTo(this.model, 'change:options', this.render);
        return this.render();
    }
    render() {
        var rtpl;
        super.render();
        rtpl = bodyTpl(_.extend(this.model.attributes, {
            ucfirst: function (str) {
                return str.charAt(0).toUpperCase() + str.slice(1);
            }
        }));
        this.$('.body').html(rtpl);
        this.$('header i.fa').remove();
        return this;
    }
    events() {
        return _.extend({}, super.events, {
            'click i': 'checkChanged',
            'click label': 'checkChanged'
        });
    }
    checkChanged(ev) {
        var $target, i, len, option, ref, value;
        $target = ev.currentTarget.tagName === 'LABEL' ? this.$('i[data-value="' + ev.currentTarget.getAttribute('data-value') + '"]') : $(ev.currentTarget);
        $target.toggleClass('fa-square-o');
        $target.toggleClass('fa-check-square-o');
        value = $target.attr('data-value');
        ref = this.model.get('options');
        for (i = 0, len = ref.length; i < len; i++) {
            option = ref[i];
            if (option.name === value) {
                option.checked = $target.hasClass('fa-check-square-o');
            }
        }
        return this.trigger('change', {
            facetValue: {
                name: this.model.get('name'),
                values: _.map(this.$('i.fa-check-square-o'), function (cb) {
                    return cb.getAttribute('data-value');
                })
            }
        });
    }
    update(newOptions) {
        return this.model.set('options', newOptions);
    }
    reset() {
        return this.render();
    }
}
;
BooleanFacet.prototype.className = 'facet boolean';
