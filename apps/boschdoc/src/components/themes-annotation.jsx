import React from "react";
import ExternalLinkIcon from "./icons/external-link";

function Body(props) {

}


function ThemesAnnotation(props) {
	const texts = props.text.split("|");
	const { metadata } = props.type;

	let links = Object.keys(metadata).indexOf("Boschdocproject Artworks Code") > -1 ?
		metadata["Boschdocproject Artworks Code"].split("|").map((l) => l.trim()) : null;

	return (
		<li
			id={props.n}
			onMouseOut={props.onHover.bind(this, "")}
			onMouseOver={props.onHover.bind(this, props.n)}
		>
			{texts.map((t, i) => links && links[i] && links[i].length ?
				<span key={i}>
					<a href={`http://boschproject.org/#/artworks/${links[i]}`} target="_blank">
						{t}
					</a>
					<a href={`http://boschproject.org/#/artworks/${links[i]}`} target="_blank">
						<ExternalLinkIcon />
					</a>
					{i < texts.length - 1 ? "|" : ""}
				</span> :
				<span key={i}>
					{t}{i < texts.length - 1 ? "|" : ""}
				</span>
			)}
		</li>
	)
}

export default ThemesAnnotation;
