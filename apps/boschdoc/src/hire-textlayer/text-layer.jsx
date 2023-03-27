import React from "react";
import parseHtml from "./html-parser";
import Annotations from "./annotations";

const HIGHLIGHT_CLASSNAME = "hi-text-highlight";

class TextLayer extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			rootNode: parseHtml(this.props.data.text),
			highlightedAnnotation: null,
			annotationData: this.props.data.annotationData
		};
	}

	componentWillReceiveProps(newProps) {
		this.setState({
			rootNode: parseHtml(newProps.data.text),
			highlightedAnnotation: null,
			annotationData: newProps.data.annotationData
		});
	}

	unHighlightAnnotation() {
		this.setState({highlightedAnnotation: null});
	}

	highlightAnnotation(annotation) {
		this.setState({highlightedAnnotation: annotation});
	}

	lookupAnnotationLink(activeAnnotations) {
		let annotations = this.state.annotationData;
		for(let i in annotations) {
			if(annotations[i].type.name === "elab4:entrylink" && activeAnnotations.indexOf("" + annotations[i].n) > -1) {
				return annotations[i].text;
			}
		}
		return null;
	}

	navigateToResult(id) {
		if(this.props.onNavigation) { this.props.onNavigation(id); }
	}

	onAnnotationClick(annotationId) {
		let annotatedText = document.getElementById(annotationId);
		if(!annotatedText) { return; }
		if(this.props.onAnnotationClick) {
			this.props.onAnnotationClick(annotatedText);
		} else {
			window.scrollTo(0, window.scrollY + annotatedText.getBoundingClientRect().top);
		}
	}

	renderNode(node, i) {
		let className = node.activeAnnotations.indexOf(this.state.highlightedAnnotation) > -1 ?
			HIGHLIGHT_CLASSNAME :
			null;

		if(node.textContent) {
			let linkTarget = this.lookupAnnotationLink(node.activeAnnotations);

			return linkTarget === null ?
				<span className={className || ""} key={i}>{node.textContent}</span> :
				<a className={className || ""} key={i} onClick={this.navigateToResult.bind(this, linkTarget)}>{node.textContent}</a>;

		} else {
			switch(node.tagName) {
				case "sup":
					if(node.attributes["data-id"]) {
						return (
							<sup id={node.attributes["data-id"] + "-text"} key={i} >
								<a onClick={this.onAnnotationClick.bind(this, node.attributes["data-id"])}
									onMouseOut={this.unHighlightAnnotation.bind(this)}
									onMouseOver={this.highlightAnnotation.bind(this, node.attributes["data-id"])}>
									{node.children.map(this.renderNode.bind(this))}
								</a>
							</sup>
						);
					}
					return <sup key={i}>{node.children.map(this.renderNode.bind(this))}</sup>;
				case "i":
					return <i key={i}>{node.children.map(this.renderNode.bind(this))}</i>;
				case "b":
					return <b key={i}>{node.children.map(this.renderNode.bind(this))}</b>;
				case "u":
					return <u key={i}>{node.children.map(this.renderNode.bind(this))}</u>;
				case "br":
					return <br key={i} />;
				default:
					return <span key={i}>{node.children.map(this.renderNode.bind(this))}</span>;
			}
		}
	}

	render() {
		let annotations = this.props.data.annotationData && this.props.data.annotationData.length > 0 ?
			(<Annotations
				customComponentMap={this.props.customComponentMap}
				data={this.props.data.annotationData}
				highlighted={this.state.highlightedAnnotation}
				onClick={this.onAnnotationClick.bind(this)}
				onHover={this.highlightAnnotation.bind(this)}
				onNavigation={this.props.onNavigation}
				relatedLabel={this.props.relatedAnnotationLabel} />) :
			"";

		return (
			<div className="hi-textlayer">
				<h2>{this.props.label}</h2>
				<div>
					{this.state.rootNode.children.map(this.renderNode.bind(this)) }
				</div>
				{annotations}
			</div>
		);
	}
}

/** (\w+)\.propTypes = \{
	customComponentMap: PropTypes.object,
	data: PropTypes.object,
	label: PropTypes.string,
	onAnnotationClick: PropTypes.func,
	onNavigation: PropTypes.func,
	relatedAnnotationLabel: PropTypes.string
};**/

TextLayer.defaultProps = {
	onNavigation: null,
	relatedAnnotationLabel: "Gerelateerd aan"
};

export default TextLayer;
