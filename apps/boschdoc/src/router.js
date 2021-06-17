import Router from "ampersand-router";
import {setController, setLanguage} from "./actions/view";
import appStore from "./app-store";

let AppRouter = Router.extend({

	routes: {
		"": "search",
		":lang": "search",
		":lang/search": "search",
		":lang/entry/:id": "entry",
		":lang/entry/:id/:activeTab": "entry",
		":lang/entry/:id/:activeTab/:annotationId": "entry"
	},

	navigateToResult: function(obj) {
		this.navigate(appStore.getState().language.current + "/entry/" + obj.id + "/transcription");
	},

	search: function(lang) {
		if(lang !== appStore.getState().language.current) {
			appStore.dispatch(setLanguage(lang || localStorage.getItem("lang") || "nl"));
		}
		appStore.dispatch(setController("search"));
	},

	entry: function(lang, id, activeTab, annotationId) {
		if(lang !== appStore.getState().language.current) {
			appStore.dispatch(setLanguage(lang || localStorage.getItem("lang") || "nl"));
		}
		appStore.dispatch(setController("document", id, activeTab, annotationId));
	}
});

export default new AppRouter();
