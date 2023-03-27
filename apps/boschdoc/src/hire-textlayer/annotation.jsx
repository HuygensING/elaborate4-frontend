import React from "react";

const HIGHLIGHT_CLASSNAME = "hi-annotation-highlight"

function Annotation(props) {
	return (
		<li
			className={props.highlighted ? HIGHLIGHT_CLASSNAME : ""}
			id={props.n}
			onClick={props.onClick.bind(this, props.n)}
			onMouseOut={props.onHover.bind(this, "")}
			onMouseOver={props.onHover.bind(this, props.n)}
		>
			{/* <em>{props.type.name}</em>,  */}
			<span dangerouslySetInnerHTML={{__html: props.text}} />
		</li>
	)
}

/** (\w+)\.propTypes = \{
	highlighted: PropTypes.bool,
	n: PropTypes.number,
	onClick: PropTypes.func,
	onHover: PropTypes.func,
	text: PropTypes.string,
	type: PropTypes.object
};**/

export default Annotation
