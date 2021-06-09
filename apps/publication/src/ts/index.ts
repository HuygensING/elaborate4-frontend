import $ from "jquery"
import { app } from "./app"
import '../stylus/main.styl'

document.addEventListener("DOMContentLoaded", function() {
  document.body.className = BASE_URL.replace(/^https?:\/\//, "").replace(/\..*$/, "")
})

$(() => app())
