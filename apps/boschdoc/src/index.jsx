import React from "react"
import ReactDOM from 'react-dom'
import appRouter from "./router"
import api from "./api"
import App from "./app"
import './stylus/main.styl'

// let rootPath = BASE_URL.slice(-1) === "/" ? BASE_URL.slice(0, -1) : BASE_URL;
// rootPath = rootPath.replace(/https?:\/\//, '')
// rootPath = rootPath.split("/");
// let ROOT = ''

// if (rootPath.length > 1) {
// 	rootPath = rootPath[rootPath.length - 1];
// 	ROOT = '/' + rootPath;
// 	api.docroot = ROOT;
// }

appRouter.history.start()
// {
	// root: ROOT
// });


api.getConfig((config) => {
	let [lang, controller, id, activeTab, annotationId] = appRouter.history.fragment.split("/");
	if(controller === "entry") { controller = "document"; }
	let presetThemes = appRouter.history.fragment.match(/\?themes=/) ?
		appRouter.history.fragment.replace(/.*\?themes=/, "").split("|") :
		null;

	ReactDOM.render(
		<App
			activeTab={activeTab || "transcription"}
			annotationId={annotationId} config={config}
			controller={controller}
			id={id} language={lang}
			presetThemes={presetThemes}
		/>,
		document.getElementById('container')
	);
});
