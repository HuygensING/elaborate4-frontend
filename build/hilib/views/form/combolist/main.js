var Backbone, Collections, ComboList, Views, _, dom, dropdown, tpl;
Collections = {
    import: Base, from, "../../../collections/base": 
};
Views = {
    import: Base, from, "../../base": 
};
ComboList = (function () {
    class ComboList extends Views.Base {
        initialize(options1) {
            var base, base1, models, ref;
            this.options = options1;
            super.initialize();
            if ((base = this.options).config == null) {
                base.config = {};
            }
            this.settings = (ref = this.options.config.settings) != null ? ref : {};
            if ((base1 = this.settings).confirmRemove == null) {
                base1.confirmRemove = false;
            }
            _.extend(this, dropdown);
            this.dropdownInitialize();
            if (this.options.value instanceof Backbone.Collection) {
                this.selected = this.options.value;
            }
            else if (_.isArray(this.options.value)) {
                models = this.strArray2optionArray(this.options.value);
                this.selected = new Collections.Base(models);
            }
            else {
                console.error('No valid value passed to combolist');
            }
            this.listenTo(this.selected, 'add', (model) => {
                this.dropdownRender(tpl);
                return this.triggerChange({
                    added: model.id
                });
            });
            this.listenTo(this.selected, 'remove', (model) => {
                this.dropdownRender(tpl);
                return this.triggerChange({
                    removed: model.id
                });
            });
            return this.dropdownRender(tpl);
        }
        postDropdownRender() {
            return this.filtered_options.reset(this.collection.reject((model) => {
                return this.selected.get(model.id) != null;
            }));
        }
        events() {
            return _.extend(dropdown.dropdownEvents(this.cid), {
                'click li.selected span': 'removeSelected',
                'click button.add': 'createModel',
                'keyup input': 'toggleAddButton'
            });
        }
        toggleAddButton(ev) {
            var button;
            if (!this.settings.mutable) {
                return;
            }
            button = dom(this.el).q('button');
            if (ev.currentTarget.value.length > 1 && ev.keyCode !== 13) {
                return button.show('inline-block');
            }
            else {
                return button.hide();
            }
        }
        createModel(ev) {
            var value;
            value = this.el.querySelector('input').value;
            if (this.settings.mutable && value.length > 1) {
                return this.selected.add({
                    id: value,
                    title: value
                });
            }
        }
        removeSelected(ev) {
            var listitemID, remove;
            listitemID = ev.currentTarget.parentNode.getAttribute('data-id');
            remove = () => {
                return this.selected.removeById(listitemID);
            };
            if (this.settings.confirmRemove) {
                return this.trigger('confirmRemove', listitemID, remove);
            }
            else {
                return remove();
            }
        }
        addSelected(ev) {
            var model;
            if ((ev.keyCode != null) && ev.keyCode === 13) {
                if (this.filtered_options.currentOption != null) {
                    model = this.filtered_options.currentOption;
                }
                if (model == null) {
                    this.createModel();
                    return;
                }
            }
            else {
                model = this.collection.get(ev.currentTarget.getAttribute('data-id'));
            }
            return this.selected.add(model);
        }
        triggerChange(options) {
            if (options.added == null) {
                options.added = null;
            }
            if (options.removed == null) {
                options.removed = null;
            }
            return this.trigger('change', {
                selected: this.selected.toJSON(),
                added: options.added,
                removed: options.removed
            });
        }
        strArray2optionArray(strArray) {
            return _.map(strArray, function (item) {
                return {
                    id: item,
                    title: item
                };
            });
        }
    }
    ;
    ComboList.prototype.className = 'combolist';
    return ComboList;
}).call(this);
export default ComboList;
