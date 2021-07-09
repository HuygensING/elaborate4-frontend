import React from "react"
import {Tabs, Tab} from "../hire-tabs"
import TextLayer from "../hire-textlayer"
import { Metadata } from "./metadata"
import SourceInfo from "./source-info"
import Paginator from "./paginator"
import ThemesAnnotation from "./themes-annotation"
import {getNextResultPage} from "../actions/view"
import { languageKeys } from "../stores/i18n-keys"
import appRouter from "../router"
import appStore from "../app-store"

class DocumentController extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			fixContent: false,
			prevPage: null,
			nextPage: null
		};
		this.initialAnnotationId = this.props.annotationId;
	}

	componentDidMount() {
		this.onPageStoreChange();
		this.unsubscribe = appStore.subscribe(() =>
			this.onPageStoreChange()
		);
	}

	componentWillReceiveProps(nextProps) {
		this.onPageStoreChange(nextProps);
	}


	componentDidUpdate() {
		if(this.initialAnnotationId) {
			goToAnnotation(document.getElementById(this.props.annotationId), this.props)
			this.initialAnnotationId = null;
		}
	}

	componentWillUnmount() {
		this.unsubscribe();
	}

	onPageStoreChange(nextProps) {
		const props = nextProps || this.props;
		const pageState = appStore.getState().results;
		const ids = pageState.ids || [];
		const pageIndex = ids.indexOf(parseInt(props.id));

		if (pageIndex === ids.length - 1 && pageState._next) {
			appStore.dispatch(getNextResultPage(pageState._next));
		}

		this.setState({
			nextPage: pageIndex > -1 ? ids[pageIndex + 1] || null : null,
			prevPage: pageIndex > -1 ? ids[pageIndex - 1] || null : null
		});
	}

	onSearchClick() {
		appRouter.navigate("/" + this.props.language + "/search");
	}

	onNextClick() {
		appRouter.navigateToResult({id: this.state.nextPage});
	}

	onPrevClick() {
		appRouter.navigateToResult({id: this.state.prevPage});
	}

	render() {
		let facs = this.props.data.facsimiles.length > 0 ?
			(<iframe key={this.props.data.facsimiles[0].title} src={this.props.data.facsimiles[0].zoom}></iframe>) :
			"no facsimile";

		return (
			<article className={"entry" + (this.state.fixContent ? " fixed-content" : "")}>
				<Paginator
					labels={languageKeys[this.props.language].pagination}
					onNextClick={this.state.nextPage ? this.onNextClick.bind(this) : null}
					onPrevClick={this.state.prevPage ? this.onPrevClick.bind(this) : null}
					onSearchClick={this.onSearchClick.bind(this)}
					/>
				<h2 title={this.props.data.name}>{this.props.data.name}</h2>
				<SourceInfo metadata={this.props.data.metadata} />

				<div className="facsimile">
					{facs}
				</div>
				<div className="text">
					<RenderTabs
						{...this.props}
					/>
				</div>
			</article>
		);
	}
}

DocumentController.defaultProps = {
	activeTab: "transcription",
	language: "nl"
};

export default DocumentController;



function RenderTabs(props) {
	let i18n = languageKeys[props.language];

	const handleTabChange = React.useCallback((label, index) => {
		switch(index) {
			case 1:
				appRouter.navigate(props.language + "/entry/" + props.id + "/translation")
				break
			case 2:
				appRouter.navigate(props.language + "/entry/" + props.id + "/remarks")
				break
			case 3:
				appRouter.navigate(props.language + "/entry/" + props.id + "/metadata")
				break
			case 0:
			default:
				appRouter.navigate(props.language + "/entry/" + props.id + "/transcription")
		}
	}, [props.language, props.id])

	return (
		<Tabs onChange={handleTabChange}>
			{
				['transcription', 'translation', 'remarks'].map(name =>
					<Tab
						active={props.activeTab === name}
						key={name}
						label={i18n[name]}
					>
						<RenderTextLayer
							{...props}
							name={name}
						/>
					</Tab>
				)
			}
			<Tab active={props.activeTab === "metadata"} label={i18n.metadata}>
				<Metadata language={props.language} metadata={props.data.metadata} />
			</Tab>
		</Tabs>
	);
}

function goToAnnotation(annotatedText, props) {
	const url = props.language + "/entry/" + props.id + "/" + props.activeTab + "/" + annotatedText.getAttribute("id")
	appRouter.navigate(url, {replace: true});
}


function RenderTextLayer(props) {
	let keys = languageKeys[props.language];

	const onAnnotationClick = React.useCallback((annotatedText) => {
		goToAnnotation(annotatedText, props)
	}, [props])

	const navigateToEntry = React.useCallback((id) => {
		appRouter.navigateToResult({ id })
	}, [])


	return props.data.paralleltexts[keys[props.name]] ? (
		<TextLayer
			customComponentMap={{
				Themes: ThemesAnnotation
			}}
			data={props.data.paralleltexts[keys[props.name]]}
			label=""
			onAnnotationClick={onAnnotationClick}
			onNavigation={navigateToEntry}
			relatedAnnotationLabel={props.relatedAnnotationLabel} />
	) : null;
}
