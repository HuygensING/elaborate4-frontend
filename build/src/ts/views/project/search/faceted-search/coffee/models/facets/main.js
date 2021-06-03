import Backbone from "backbone";
export default class Facet extends Backbone.Model {
    defaults() {
        return {
            name: null,
            title: null,
            type: null,
            options: null
        };
    }
}
;
Facet.prototype.idAttribute = 'name';
