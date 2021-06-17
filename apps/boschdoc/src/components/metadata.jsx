import React from "react";
import languageKeys from "../stores/i18n-keys";
import LanguageFilter from "../stores/i18n-filter";

class Metadata extends React.Component {

	constructor(props) {
		super(props);
		this.metadataKeys = new LanguageFilter(this.props.language, this.props.metadata.map((entry) => entry.field));
	}

	renderMetadataField(entry, i) {
		return (
			<li key={i}>
				<label>{languageKeys[this.props.language].facetTitles[entry.field]}</label>
				<span>{entry.value}</span>
			</li>
		);
	}

	render() {
		return (
			<ul className="metadata">
				{this.props.metadata.filter((entry) => entry.field !== "ISIL" && entry.value !== "" && this.metadataKeys.indexOf(entry.field) > -1).map(this.renderMetadataField.bind(this))}
			</ul>
		);
	}
}

export default Metadata;

