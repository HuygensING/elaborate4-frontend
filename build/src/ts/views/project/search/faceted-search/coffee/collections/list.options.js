import Backbone from "backbone";
import _ from "underscore";
import Option from "../models/facets/list.option";
export default class ListOptions extends Backbone.Collection {
    strategies;
    initialize() {
        return this.comparator = this.strategies.amount_desc;
    }
    revert() {
        this.comparator = this.strategies.amount_desc;
        return this.each((option) => {
            return option.set('checked', false, {
                silent: true
            });
        });
    }
    updateOptions(newOptions = []) {
        this.each((option) => {
            return option.set('count', 0, {
                silent: true
            });
        });
        _.each(newOptions, (newOption) => {
            var opt;
            opt = this.get(newOption.name);
            if (opt != null) {
                return opt.set('count', newOption.count, {
                    silent: true
                });
            }
            else {
                opt = new Option(newOption);
                return this.add(opt);
            }
        });
        return this.sort();
    }
    orderBy(strategy, silent = false) {
        this.comparator = this.strategies[strategy];
        return this.sort({
            silent: silent
        });
    }
    setAllVisible() {
        this.each(function (model) {
            return model.set('visible', true);
        });
        return this.sort();
    }
}
;
ListOptions.prototype.model = Option;
ListOptions.prototype.strategies = {
    alpha_asc: function (model) {
        return +(!model.get('visible')) + (+(!model.get('count')) + model.get('name'));
    },
    alpha_desc: function (model) {
        var str;
        str = String.fromCharCode.apply(String, _.map(model.get('name').split(''), function (c) {
            return 0xffff - c.charCodeAt();
        }));
        return +(!model.get('visible')) + (+(!model.get('count')) + str);
    },
    amount_asc: function (model) {
        var cnt, tmp;
        tmp = model.get('visible') ? 0 : 10;
        tmp += +(!model.get('count'));
        cnt = model.get('count') === 0 ? model.get('total') : model.get('count');
        return tmp -= 1 / cnt;
    },
    amount_desc: function (model) {
        var cnt, tmp;
        tmp = model.get('visible') ? 0 : 10;
        tmp += +(!model.get('count'));
        cnt = model.get('count') === 0 ? model.get('total') : model.get('count');
        return tmp += 1 / cnt;
    }
};
