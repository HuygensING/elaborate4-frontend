import React from "react";
import Annotation from "./annotation";

class Annotations extends React.Component {
	onHover = (annotationId) => {
		if(this.props.onHover) this.props.onHover("" + annotationId)
	}

	onClick = (annotationId) => {
		if(this.props.onClick) this.props.onClick(annotationId + "-text")
	}

	renderAnnotation = (annotation, i) => {
		let AnnotationComponent = this.props.customComponentMap && this.props.customComponentMap[annotation.type.name] ?
			this.props.customComponentMap[annotation.type.name] : Annotation;

		return (
			<AnnotationComponent
				{...annotation}
				highlighted={this.props.highlighted == annotation.n}
				key={i}
				onClick={this.onClick}
				onHover={this.onHover}
			/>
		)
	}

	render() {
		return (
			<ol className="hi-annotations">
				{this.props.data.map(this.renderAnnotation)}
			</ol>
		)
	}
}

/** (\w+)\.propTypes = \{
	customComponentMap: PropTypes.object,
	data: PropTypes.array,
	highlighted: PropTypes.string,
	onClick: PropTypes.func,
	onHover: PropTypes.func,
	relatedLabel: PropTypes.string
};**/

export default Annotations;
