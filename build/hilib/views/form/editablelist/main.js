var Collections, EditableList, Views, _, tpl;
Collections = {
    import: Base, from, "../../../collections/base": 
};
Views = {
    import: Base, from, "../../base": 
};
EditableList = (function () {
    class EditableList extends Views.Base {
        initialize(options) {
            var base, base1, base2, ref, value;
            this.options = options;
            super.initialize();
            if ((base = this.options).config == null) {
                base.config = {};
            }
            this.settings = (ref = this.options.config.settings) != null ? ref : {};
            if ((base1 = this.settings).placeholder == null) {
                base1.placeholder = '';
            }
            if ((base2 = this.settings).confirmRemove == null) {
                base2.confirmRemove = false;
            }
            value = _.map(this.options.value, function (val) {
                return {
                    id: val
                };
            });
            this.selected = new Collections.Base(value);
            this.listenTo(this.selected, 'add', this.render);
            this.listenTo(this.selected, 'remove', this.render);
            return this.render();
        }
        render() {
            var rtpl;
            rtpl = tpl({
                viewId: this.cid,
                selected: this.selected,
                settings: this.settings
            });
            this.$el.html(rtpl);
            this.triggerChange();
            if (this.settings.inputClass != null) {
                this.$('input').addClass(this.settings.inputClass);
            }
            this.$('input').focus();
            return this;
        }
        events() {
            var evs;
            evs = {
                'click li span': 'removeLi',
                'click button': 'addSelected'
            };
            evs['keyup input'] = 'onKeyup';
            return evs;
        }
        removeLi(ev) {
            var listitemID;
            listitemID = ev.currentTarget.parentNode.getAttribute('data-id');
            if (this.settings.confirmRemove) {
                return this.trigger('confirmRemove', listitemID, () => {
                    return this.selected.removeById(listitemID);
                });
            }
            else {
                return this.selected.removeById(listitemID);
            }
        }
        onKeyup(ev) {
            var valueLength;
            valueLength = ev.currentTarget.value.length;
            if (ev.keyCode === 13 && valueLength > 0) {
                return this.addSelected();
            }
            else if (valueLength > 1) {
                return this.showButton();
            }
            else {
                return this.hideButton();
            }
        }
        addSelected() {
            this.selected.add({
                id: this.el.querySelector('input').value
            });
            return this.el.querySelector('button').style.display = 'none';
        }
        showButton(ev) {
            return this.el.querySelector('button').style.display = 'inline-block';
        }
        hideButton(ev) {
            return this.el.querySelector('button').style.display = 'none';
        }
        triggerChange() {
            return this.trigger('change', this.selected.pluck('id'));
        }
    }
    ;
    EditableList.prototype.className = 'editablelist';
    return EditableList;
}).call(this);
export default EditableList;
