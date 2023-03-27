export function model(value: any) {
  return function decorator(target) {
    target.prototype.model = value
  }
}

export function tagName(value: any) {
  return function decorator(target) {
    target.prototype.tagName = value
  }
}

export function className(value: any) {
  return function decorator(target) {
    target.prototype.className = value
  }
}

export function idAttribute(value: any) {
  return function decorator(target) {
    target.prototype.idAttribute = value
  }
}
