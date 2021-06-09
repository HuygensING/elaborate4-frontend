import { ajax } from "../managers/ajax"
import { token } from "../managers/token"

export function syncOverride(method, model, options) {
  let data = model.toJSON()
  if (options.attributes != null) {
    const obj = {}
    const ref = options.attributes
    for (let i = 0, len = ref.length; i < len; i++) {
      const name = ref[i];
      obj[name] = this.get(name)
    }
    data = JSON.stringify(obj)
  } 

  const defaults = {
    url: this.url(),
    dataType: 'text',
    data: data
  };
  options = $.extend(defaults, options);

  let jqXHR
  if (method === 'create') {
    ajax.token = token.get();
    jqXHR = ajax.post(options);

    jqXHR.done((data, textStatus, jqXHR) => {
      if (jqXHR.status === 201) {
        const xhr = ajax.get({
          url: jqXHR.getResponseHeader('Location')
        });
        xhr.done((data, textStatus, jqXHR) => {
          this.trigger('sync');
          options.success(data);
        });
      }
    });
    jqXHR.fail((response) => {
      console.log('fail', response);
    })
  } else if (method === 'update') {
    ajax.token = token.get();
    jqXHR = ajax.put(options);
    // Options.success is not called, because the server does not respond with the updated model.
    jqXHR.done((response) => {
      this.trigger('sync');
    })
    jqXHR.fail((response) => {
      console.log('fail', response);
    })
  }
}
