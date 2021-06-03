import $ from "jquery";
import ajax from "hilib/managers/ajax";
import Base from "hilib/views/base";
import tpl from "../../../../jade/entry/subsubmenu/facsimiles.edit.jade";
export default class EditFacsimiles extends Base {
    options;
    initialize(options) {
        this.options = options;
        super.initialize();
        this.listenTo(this.collection, 'add', this.render);
        this.listenTo(this.collection, 'remove', this.render);
        this.render();
    }
    render() {
        var rtpl;
        rtpl = tpl({
            facsimiles: this.collection
        });
        this.$el.html(rtpl);
        return this;
    }
    events() {
        return {
            'click .close-button': function (ev) {
                return this.$el.slideUp();
            },
            'click ul.facsimiles li': (ev) => {
                return $(ev.currentTarget).addClass('destroy');
            },
            'click ul.facsimiles li.destroy .orcancel': 'cancelRemove',
            'click ul.facsimiles li.destroy .name': 'destroyfacsimile',
            'keyup input[name="name"]': 'keyupName',
            'change input[type="file"]': function () {
                return this.el.querySelector('button.addfacsimile').style.display = 'block';
            },
            'click button.addfacsimile': 'addfacsimile'
        };
    }
    close(ev) {
        return this.trigger('close');
    }
    keyupName(ev) {
        const el = this.el.querySelector('form.addfile');
        el.style.display = ev.currentTarget.value.length > 0 ? 'block' : 'none';
    }
    addfacsimile(ev) {
        var form, formData, jqXHR;
        ev.stopPropagation();
        ev.preventDefault();
        $(ev.currentTarget).addClass('loader');
        form = this.el.querySelector('form.addfile');
        formData = new FormData(form);
        jqXHR = ajax.post({
            url: 'https://tomcat.tiler01.huygens.knaw.nl/facsimileservice/upload',
            data: formData,
            cache: false,
            contentType: false,
            processData: false
        }, {
            token: false
        });
        return jqXHR.done((response) => {
            var data;
            $(ev.currentTarget).removeClass('loader');
            const input = this.el.querySelector('input[name="name"]');
            data = {
                name: input.value,
                filename: response[1].originalName,
                zoomableUrl: response[1].jp2url
            };
            return this.collection.create(data, {
                wait: true
            });
        });
    }
    cancelRemove(ev) {
        var parentLi;
        ev.stopPropagation();
        parentLi = $(ev.currentTarget).parents('li');
        return parentLi.removeClass('destroy');
    }
    destroyfacsimile(ev) {
        var transcriptionID;
        transcriptionID = $(ev.currentTarget).parents('li').attr('data-id');
        return this.collection.remove(this.collection.get(transcriptionID));
    }
}
;
EditFacsimiles.prototype.className = 'editfacsimiles';
