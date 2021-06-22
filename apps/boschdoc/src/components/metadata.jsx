import React from "react";
import { languageKeys } from "../stores/i18n-keys";

const ignoreFacetByLanguage = {
	nl: new Set(["Persons mentioned", "Personas Mencionadas", "Themes", "Temas", "Document type ENG"]),
	en: new Set(["Genoemde personen", "Personas Mencionadas", "Temas", "Thema's", "Document type"]),
	es: new Set(["Genoemde personen", "Persons mentioned", "Thema's", "Themes", "Document type"]),
};

export const Metadata = ({ metadata, language }) =>
	<ul className="metadata">
		{
			metadata
				.filter((entry) =>
					entry.field !== "ISIL" &&
					entry.value !== "" &&
					!ignoreFacetByLanguage[language].has(entry.field)
				)
				.map(entry =>
					<li key={entry.field}>
						<label>
							{languageKeys[language].facetTitles[entry.field]}
						</label>
						<span>{entry.value}</span>
					</li>
				)
		}
	</ul>

