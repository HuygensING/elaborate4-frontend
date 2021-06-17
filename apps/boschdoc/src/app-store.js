import {createStore, applyMiddleware} from "redux";
import reducers from "./reducers";
import thunkMiddleware from "redux-thunk";

let createStoreWithMiddleware = applyMiddleware(thunkMiddleware)(createStore);
export default createStoreWithMiddleware(reducers);