// Graphique 3 : Évolution des catégories de criminalité (2002-2010)

function createChart3() {
    // Configuration
    const margin = { top: 20, right: 250, bottom: 50, left: 80 };
    const width = 1100 - margin.left - margin.right;
    const height = 600 - margin.top - margin.bottom;

    // État de visibilité des catégories
    const categoryVisibility = {};

    // Créer le tooltip si nécessaire
    let tooltip = d3.select(".tooltip");
    if (tooltip.empty()) {
        tooltip = d3.select("body")
            .append("div")
            .attr("class", "tooltip");
    }

    // Charger les données en parallèle
    Promise.all([
        d3.csv("data/faits_national.csv"),
        d3.json("data/taxonomie.json")
    ]).then(([dataFaits, taxonomieData]) => {

        const taxonomie = taxonomieData.categories;

        // Convertir les valeurs en nombres
        dataFaits.forEach(d => {
            d.Annee = +d.Annee;
            d.Total_National = +d.Total_National;
        });

        // Créer le mapping fait -> catégorie
        const faitToCategorie = {};
        const categorieInfo = {};

        for (const [catId, catData] of Object.entries(taxonomie)) {
            categorieInfo[catId] = {
                label: catData.label,
                couleur: catData.couleur
            };
            categoryVisibility[catId] = true; // Toutes visibles par défaut
            catData.faits.forEach(fait => {
                faitToCategorie[fait] = catId;
            });
        }

        // Ajouter la catégorie à chaque fait
        dataFaits.forEach(d => {
            d.categorie = faitToCategorie[d.Fait];
        });

        // Agréger par année et catégorie
        const dataByYearCategory = d3.rollup(
            dataFaits,
            v => d3.sum(v, d => d.Total_National),
            d => d.Annee,
            d => d.categorie
        );

        // Préparer les données pour le graphique
        const categories = Object.keys(categorieInfo);
        const years = Array.from(new Set(dataFaits.map(d => d.Annee))).sort();

        // Utiliser la palette d3.schemeCategory10 pour une meilleure distinguabilité
        const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

        const lineData = categories.map((catId, index) => {
            const values = years.map(year => {
                const val = dataByYearCategory.get(year)?.get(catId) || 0;
                return { year, value: val };
            });

            // Normaliser en base 100 (2002)
            const base2002 = values[0].value;
            const normalizedValues = values.map(v => ({
                year: v.year,
                value: v.value,
                index: base2002 > 0 ? (v.value / base2002) * 100 : 100
            }));

            return {
                categorie: catId,
                label: categorieInfo[catId].label,
                couleur: colorScale(index), // Utiliser d3.schemeCategory10
                values: normalizedValues
            };
        });

        // Créer le SVG
        const svg = d3.select("#chart3")
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Échelles
        const x = d3.scaleLinear()
            .domain(d3.extent(years))
            .range([0, width]);

        const allIndices = lineData.flatMap(d => d.values.map(v => v.index));
        const y = d3.scaleLinear()
            .domain([
                Math.min(d3.min(allIndices), 90),
                Math.max(d3.max(allIndices), 110)
            ])
            .range([height, 0]);

        // Grille
        svg.append("g")
            .attr("class", "grid")
            .call(d3.axisLeft(y)
                .tickSize(-width)
                .tickFormat("")
            );

        // Axes
        svg.append("g")
            .attr("class", "axis x-axis")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x).tickFormat(d3.format("d")));

        svg.append("g")
            .attr("class", "axis y-axis")
            .call(d3.axisLeft(y));

        // Labels des axes
        svg.append("text")
            .attr("transform", `translate(${width / 2},${height + 40})`)
            .style("text-anchor", "middle")
            .style("font-size", "14px")
            .style("font-weight", "bold")
            .text("Année");

        svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", -60)
            .attr("x", -height / 2)
            .style("text-anchor", "middle")
            .style("font-size", "14px")
            .style("font-weight", "bold")
            .text("Indice base 100 (2002)");

        // Ligne de référence à 100
        svg.append("line")
            .attr("class", "reference-line")
            .attr("x1", 0)
            .attr("x2", width)
            .attr("y1", y(100))
            .attr("y2", y(100));

        svg.append("text")
            .attr("class", "reference-text")
            .attr("x", 10)
            .attr("y", y(100) - 5)
            .text("Base 100 (2002)");

        // Générateur de ligne
        const line = d3.line()
            .x(d => x(d.year))
            .y(d => y(d.index));

        // Dessiner les lignes
        const lines = svg.selectAll(".category-line")
            .data(lineData)
            .enter()
            .append("path")
            .attr("class", "category-line")
            .attr("d", d => line(d.values))
            .attr("stroke", d => d.couleur)
            .attr("data-category", d => d.categorie);

        // Fonction pour trouver l'année la plus proche de la position de la souris
        function getClosestYear(mouseX) {
            const year = Math.round(x.invert(mouseX));
            return Math.max(years[0], Math.min(years[years.length - 1], year));
        }

        // Fonction pour mettre à jour le tooltip
        function updateTooltip(event, d) {
            const [mouseX] = d3.pointer(event, svg.node());
            const closestYear = getClosestYear(mouseX);
            const yearData = d.values.find(v => v.year === closestYear);

            if (yearData) {
                const variation = yearData.index - 100;
                const variationClass = variation >= 0 ? 'positive' : 'negative';
                const variationSign = variation >= 0 ? '+' : '';

                tooltip
                    .style("left", (event.pageX + 15) + "px")
                    .style("top", (event.pageY - 10) + "px")
                    .html(`
                        <strong style="color: ${d.couleur}">${d.label}</strong><br/>
                        <span style="color: #888">Année: ${closestYear}</span><br/>
                        Indice: <strong>${yearData.index.toFixed(1)}</strong><br/>
                        <span style="color: ${variation >= 0 ? '#e74c3c' : '#27ae60'}">
                            ${variationSign}${variation.toFixed(1)}% vs 2002
                        </span>
                    `)
                    .classed("show", true);
            }
        }

        // Interactivité des lignes
        lines
            .on("mouseover", function(event, d) {
                // Mettre en évidence la ligne survolée
                lines.classed("dimmed", true);
                d3.select(this).classed("dimmed", false).classed("highlighted", true);

                // Afficher le tooltip
                updateTooltip(event, d);
            })
            .on("mousemove", function(event, d) {
                // Mettre à jour le tooltip pendant le déplacement
                updateTooltip(event, d);
            })
            .on("mouseout", function() {
                lines.classed("dimmed", false).classed("highlighted", false);
                tooltip.classed("show", false);
            });

        // Légende interactive
        const legend = svg.append("g")
            .attr("class", "legend")
            .attr("transform", `translate(${width + 20}, 0)`);

        legend.append("text")
            .attr("class", "legend-title")
            .attr("x", 0)
            .attr("y", 0)
            .text("Catégories (cliquer pour masquer)");

        const legendItems = legend.selectAll(".legend-item")
            .data(lineData)
            .enter()
            .append("g")
            .attr("class", "legend-item")
            .attr("transform", (d, i) => `translate(0, ${i * 25 + 20})`)
            .style("cursor", "pointer")
            .on("click", function(event, d) {
                // Toggle visibilité
                categoryVisibility[d.categorie] = !categoryVisibility[d.categorie];

                // Mettre à jour l'affichage
                d3.select(this).classed("inactive", !categoryVisibility[d.categorie]);

                svg.selectAll(".category-line")
                    .filter(lineD => lineD.categorie === d.categorie)
                    .classed("hidden", !categoryVisibility[d.categorie]);
            })
            .on("mouseover", function(event, d) {
                if (categoryVisibility[d.categorie]) {
                    lines.classed("dimmed", true);
                    svg.selectAll(".category-line")
                        .filter(lineD => lineD.categorie === d.categorie)
                        .classed("dimmed", false)
                        .classed("highlighted", true);
                }
            })
            .on("mouseout", function() {
                lines.classed("dimmed", false).classed("highlighted", false);
            });

        legendItems.append("rect")
            .attr("x", 0)
            .attr("y", -10)
            .attr("width", 18)
            .attr("height", 18)
            .attr("fill", d => d.couleur);

        legendItems.append("text")
            .attr("x", 25)
            .attr("y", 0)
            .attr("dy", "0.32em")
            .text(d => d.label.length > 20 ? d.label.substring(0, 20) + "..." : d.label)
            .style("font-size", "12px");

    }).catch(error => {
        console.error("Erreur lors du chargement des données:", error);
    });
}

// Créer le graphique au chargement de la page
createChart3();
