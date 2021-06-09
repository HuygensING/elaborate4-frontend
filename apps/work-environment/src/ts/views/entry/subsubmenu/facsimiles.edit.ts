import $ from "jquery"
import { className, ajax, BaseView } from "@elaborate4-frontend/hilib"

// Tpl = require 'text!html/entry/subsubmenu/facsimiles.edit.html'
import tpl from "../../../../jade/entry/subsubmenu/facsimiles.edit.jade"

// ## EditFacsimiles
@className('editfacsimiles')
export default class EditFacsimiles extends BaseView {
  // ### Initialize
  constructor(options?) {
    super(options)
    this.listenTo(this.collection, 'add', this.render)
    this.listenTo(this.collection, 'remove', this.render)
    this.render()
  }

  // ### Render
  render() {
    var rtpl;
    rtpl = tpl({
      facsimiles: this.collection
    });
    this.$el.html(rtpl);
    return this;
  }

  // ### Events
  events() {
    return {
      'click .close-button': function(ev) {
        return this.$el.slideUp();
      },
      'click ul.facsimiles li': (ev) => {
        return $(ev.currentTarget).addClass('destroy');
      },
      'click ul.facsimiles li.destroy .orcancel': 'cancelRemove',
      'click ul.facsimiles li.destroy .name': 'destroyfacsimile',
      'keyup input[name="name"]': 'keyupName',
      'change input[type="file"]': function() {
        return this.el.querySelector('button.addfacsimile').style.display = 'block';
      },
      'click button.addfacsimile': 'addfacsimile'
    };
  }

  close(ev) {
    return this.trigger('close');
  }

  keyupName(ev) {
    const el: HTMLFormElement = this.el.querySelector('form.addfile')
    el.style.display = ev.currentTarget.value.length > 0 ? 'block' : 'none';
  }

  // For ajax settings, see: http://stackoverflow.com/questions/166221/how-can-i-upload-files-asynchronously-with-jquery
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
      const input: HTMLInputElement = this.el.querySelector('input[name="name"]')
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

  
    // oReq = new XMLHttpRequest()
  // oReq.open "POST", "http://tiler01.huygensinstituut.knaw.nl:8080/facsimileservice/upload", true
  // oReq.send formData

    // $.ajax
  // 	url: "http://tiler01.huygensinstituut.knaw.nl:8080/facsimileservice/upload"
  // 	type: "POST"
  // 	data: formData
  // 	processData: false
  // 	contentType: false

    // form = @el.querySelector 'form.addfile'
  // formData = new FormData form
  // formData.append('somefiled', 'igjs')
  // console.log form, formData
  // # return false
  // $.ajax
  // 	url: 'http://tiler01.huygensinstituut.knaw.nl:8080/facsimileservice/upload'
  // 	type: 'POST'
  // 	data: formData
  // 	cache: false
  // 	contentType: false
  // 	processData: false
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

};
