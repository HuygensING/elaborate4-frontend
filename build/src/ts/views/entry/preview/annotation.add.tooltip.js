import Fn from "hilib/utils/general";
import dom from "hilib/utils/dom";
import BaseView from "hilib/views/base";
import Annotation from "../../../models/annotation";
import tpl from "../../../../jade/entry/tooltip.add.annotation.jade";
export default class AddAnnotationTooltip extends BaseView {
    options;
    container;
    newannotation;
    initialize(options) {
        var ref;
        this.options = options;
        super.initialize();
        this.container = (ref = this.options.container) != null ? ref : document.querySelector('body');
        return this.render();
    }
    render() {
        var tooltip;
        this.el.innerHTML = tpl({
            annotationTypes: this.options.annotationTypes
        });
        tooltip = tooltip = document.querySelector('.tooltip.addannotation');
        if (tooltip != null) {
            tooltip.remove();
        }
        dom(this.container).prepend(this.el);
        return this;
    }
    events() {
        return {
            'change select': 'selectChanged',
            'click button': 'buttonClicked'
        };
    }
    selectChanged(ev) {
        var index, option;
        index = ev.currentTarget.selectedIndex;
        option = ev.currentTarget.options[index];
        return this.newannotation.set('annotationType', this.options.annotationTypes.get(option.value).attributes);
    }
    buttonClicked(ev) {
        this.hide();
        return this.trigger('clicked', this.newannotation);
    }
    show(position) {
        this.newannotation = new Annotation({
            annotationType: this.options.annotationTypes.at(0)
        });
        this.setPosition(position);
        return this.el.classList.add('active');
    }
    hide() {
        return this.el.classList.remove('active');
    }
    setPosition(position) {
        var boundingBox, left, top;
        boundingBox = Fn.boundingBox(this.container);
        position.left = position.left - boundingBox.left;
        position.top = position.top - boundingBox.top;
        this.$el.removeClass('tipright tipleft tipbottom');
        left = position.left - this.$el.width() / 2;
        top = position.top + 30;
        if (left < 10) {
            left = 10;
            this.$el.addClass('tipleft');
        }
        if (boundingBox.width < (left + this.$el.width())) {
            left = boundingBox.width - this.$el.width() - 10;
            this.$el.addClass('tipright');
        }
        this.$el.css('left', left);
        return this.$el.css('top', top);
    }
    isActive() {
        return parseInt(this.$el.css('z-index'), 10) > 0;
    }
}
;
AddAnnotationTooltip.prototype.className = "tooltip addannotation";
