import Backbone from "backbone";
import _ from "underscore";
export default class QueryOptions extends Backbone.Model {
    initialAttributes;
    defaults() {
        return {
            facetValues: [],
            sortParameters: []
        };
    }
    initialize(initialAttributes) {
        this.initialAttributes = initialAttributes;
    }
    set(attrs, options) {
        var facetValues;
        if (attrs.facetValue != null) {
            facetValues = _.reject(this.get('facetValues'), function (data) {
                return data.name === attrs.facetValue.name;
            });
            if (attrs.facetValue.values != null) {
                if (attrs.facetValue.values.length > 0) {
                    facetValues.push(attrs.facetValue);
                }
            }
            else {
                facetValues.push(attrs.facetValue);
            }
            attrs.facetValues = facetValues;
            delete attrs.facetValue;
        }
        return super.set(attrs, options);
    }
    reset() {
        this.clear({
            silent: true
        });
        this.set(this.defaults(), {
            silent: true
        });
        return this.set(this.initialAttributes, {
            silent: true
        });
    }
}
;
