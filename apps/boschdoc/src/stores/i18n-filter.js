const FILTERS = {
	nl: ["Persons mentioned", "Personas Mencionadas", "Themes", "Temas"],
	en: ["Genoemde personen", "Personas Mencionadas", "Temas", "Thema's"],
	es: ["Genoemde personen", "Persons mentioned", "Thema's", "Themes"],
};

function applyFilter(value) {
	return this.filters.indexOf(value) < 0;
}

function Filter(lang, list) {
	this.filters = FILTERS[lang];
	return list.filter(applyFilter.bind(this));
}

export default Filter;
