import React from "react"
import ReactDOM from 'react-dom'
import appRouter from "./router"
import { getConfig } from "./api"
import App from "./app"
import './stylus/main.styl'

appRouter.history.start()

getConfig((config) => {
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
