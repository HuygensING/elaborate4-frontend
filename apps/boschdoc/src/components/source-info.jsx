import React from "react";

class SourceInfo extends React.Component {

	constructor(props) {
		super(props);

		this.manuscriptTypes = ["Manuscript", "Oude druk"];
		this.state= {
			renderFunc: this.findRenderFunc(this.props.metadata)
		};
	}

	componentWillReceiveProps(newProps) {
		this.setState({renderFunc: this.findRenderFunc(newProps.metadata)});
	}

	findRenderFunc(metadata) {
		for(let i in metadata) {
			let md = metadata[i];
			if(md.field === "Document type" && this.manuscriptTypes.indexOf(md.value) > -1) {
				return this.renderManuscript.bind(this);
			}
		}
		return this.renderArchival.bind(this);
	}

	renderBody(filters) {
		return this.props.metadata
			.filter(md => filters.indexOf(md.field) > -1)
			.sort(function(a, b) { return filters.indexOf(a.field) > filters.indexOf(b.field); })
			.map(md => md.value)
			.filter(val => val !== "")
			.join(" ; ");
	}

	renderManuscript() {
		return this.renderBody(["Auteur", "Titel", "Plaats van publicatie", "Jaar van publicatie", "Folio nummer(s)", "Pagina nummer(s)"]);

	}

	renderArchival() {
		return this.props.metadata
			.filter((md) => md.field === "ISIL")
			.map((md) => md.value)[0] || this.renderBody(["Locatie", "Historische instelling", "Inventaris nummer", "Folio nummer(s)"]);
	}

	render() {
		return (
			<div className="source-info" title={this.state.renderFunc()}>
				{this.state.renderFunc()}
			</div>
		);
	}
}

export default SourceInfo

