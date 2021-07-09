import Router from "ampersand-router"
import { setDocumentController, setLanguage, setSearchController } from "./actions/view"
import appStore from "./app-store"

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
		const path = `/${appStore.getState().language.current}/entry/${obj.id}/transcription`
		this.navigate(path)
	},

	search: function(lang: string) {
		if(lang !== appStore.getState().language.current) {
			appStore.dispatch(setLanguage(lang || localStorage.getItem("lang") || "nl"));
		}
		appStore.dispatch(setSearchController());
	},

	entry: function(lang: string, id: string, activeTab: string, annotationId: string) {
		if (lang !== appStore.getState().language.current) {
			appStore.dispatch(setLanguage(lang || localStorage.getItem("lang") || "nl"));
		}
		appStore.dispatch(setDocumentController(id, activeTab, annotationId));
	}
});

export default new AppRouter();
