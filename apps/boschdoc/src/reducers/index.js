import {combineReducers} from "redux"

import controller from "./controller"
import language from "./language"
import results from "./results"

export default combineReducers({ controller, language, results })
