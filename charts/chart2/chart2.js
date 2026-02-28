// Graphique 2 : Contribution des catégories à la variation totale (2002-2010)

function createChart2() {
    // Configuration
    const margin = { top: 20, right: 100, bottom: 50, left: 250 };
    const width = 1000 - margin.left - margin.right;
    const height = 700 - margin.top - margin.bottom;

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
            catData.faits.forEach(fait => {
                faitToCategorie[fait] = catId;
            });
        }

        // Ajouter la catégorie à chaque fait
        dataFaits.forEach(d => {
            d.categorie = faitToCategorie[d.Fait];
        });

        // Agréger par année et catégorie
        const data2002 = dataFaits.filter(d => d.Annee === 2002);
        const data2010 = dataFaits.filter(d => d.Annee === 2010);

        const totauxParCategorie2002 = d3.rollup(
            data2002,
            v => d3.sum(v, d => d.Total_National),
            d => d.categorie
        );

        const totauxParCategorie2010 = d3.rollup(
            data2010,
            v => d3.sum(v, d => d.Total_National),
            d => d.categorie
        );

        // Calculer la variation totale
        const total2002 = d3.sum(data2002, d => d.Total_National);
        const total2010 = d3.sum(data2010, d => d.Total_National);
        const variationTotale = total2010 - total2002;

        // Calculer les contributions
        const contributions = [];
        for (const [catId, info] of Object.entries(categorieInfo)) {
            const val2002 = totauxParCategorie2002.get(catId) || 0;
            const val2010 = totauxParCategorie2010.get(catId) || 0;
            const variationCategorie = val2010 - val2002;
            const contributionPct = (variationCategorie / variationTotale) * 100;

            contributions.push({
                categorie: catId,
                label: info.label,
                contribution: contributionPct,
                variation: variationCategorie,
                couleur: info.couleur
            });
        }

        // Trier par contribution absolue décroissante
        contributions.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));

        // Créer le SVG
        const svg = d3.select("#chart2")
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Échelles
        const x = d3.scaleLinear()
            .domain([
                d3.min(contributions, d => d.contribution) * 1.1,
                d3.max(contributions, d => d.contribution) * 1.1
            ])
            .range([0, width]);

        const y = d3.scaleBand()
            .domain(contributions.map(d => d.label))
            .range([0, height])
            .padding(0.2);

        // Axes
        svg.append("g")
            .attr("class", "axis x-axis")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x).tickFormat(d => d.toFixed(0) + "%"));

        svg.append("g")
            .attr("class", "axis y-axis")
            .call(d3.axisLeft(y));

        // Labels des axes
        svg.append("text")
            .attr("transform", `translate(${width / 2},${height + 40})`)
            .style("text-anchor", "middle")
            .style("font-size", "14px")
            .style("font-weight", "bold")
            .text("Contribution à la variation totale (%)");

        // Ligne de référence à 0
        svg.append("line")
            .attr("x1", x(0))
            .attr("x2", x(0))
            .attr("y1", 0)
            .attr("y2", height)
            .attr("stroke", "black")
            .attr("stroke-width", 2);

        // Ligne de référence à 100%
        if (x.domain()[1] > 100) {
            svg.append("line")
                .attr("class", "reference-line")
                .attr("x1", x(100))
                .attr("x2", x(100))
                .attr("y1", 0)
                .attr("y2", height);

            svg.append("text")
                .attr("class", "reference-text")
                .attr("x", x(100))
                .attr("y", -5)
                .attr("text-anchor", "middle")
                .text("100%");
        }

        // Grille
        svg.append("g")
            .attr("class", "grid")
            .attr("opacity", 0.3)
            .call(d3.axisBottom(x)
                .tickSize(height)
                .tickFormat("")
            )
            .call(g => g.select(".domain").remove());

        // Barres
        svg.selectAll(".bar")
            .data(contributions)
            .enter()
            .append("rect")
            .attr("class", d => d.contribution > 0 ? "bar-positive" : "bar-negative")
            .attr("x", d => d.contribution > 0 ? x(0) : x(d.contribution))
            .attr("y", d => y(d.label))
            .attr("width", d => Math.abs(x(d.contribution) - x(0)))
            .attr("height", y.bandwidth())
            .on("mouseover", (event, d) => {
                tooltip
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 28) + "px")
                    .html(`
                        <strong>${d.label}</strong><br/>
                        Contribution: ${d.contribution > 0 ? '+' : ''}${d.contribution.toFixed(1)}%<br/>
                        Variation: ${d.variation.toLocaleString('fr-FR')} faits
                    `)
                    .classed("show", true);
            })
            .on("mouseout", () => {
                tooltip.classed("show", false);
            });

        // Annotations (pourcentages)
        svg.selectAll(".bar-label")
            .data(contributions)
            .enter()
            .append("text")
            .attr("class", d => {
                const absWidth = Math.abs(x(d.contribution) - x(0));
                return absWidth > 50 ? "bar-label" : "bar-label-outside";
            })
            .attr("x", d => {
                const absWidth = Math.abs(x(d.contribution) - x(0));
                if (absWidth > 50) {
                    // À l'intérieur de la barre
                    return d.contribution > 0
                        ? x(d.contribution) - 5
                        : x(d.contribution) + 5;
                } else {
                    // À l'extérieur de la barre
                    return d.contribution > 0
                        ? x(d.contribution) + 5
                        : x(d.contribution) - 5;
                }
            })
            .attr("y", d => y(d.label) + y.bandwidth() / 2)
            .attr("dy", "0.35em")
            .attr("text-anchor", d => {
                const absWidth = Math.abs(x(d.contribution) - x(0));
                if (absWidth > 50) {
                    return d.contribution > 0 ? "end" : "start";
                } else {
                    return d.contribution > 0 ? "start" : "end";
                }
            })
            .text(d => (d.contribution > 0 ? '+' : '') + d.contribution.toFixed(1) + '%');

        // Légende
        const legend = svg.append("g")
            .attr("class", "legend")
            .attr("transform", `translate(${width - 220}, ${height - 80})`);

        // Fond de la légende
        legend.append("rect")
            .attr("class", "legend-box")
            .attr("x", -10)
            .attr("y", -10)
            .attr("width", 230)
            .attr("height", 70)
            .attr("rx", 5);

        // Élément 1 : Contribue à la baisse
        legend.append("rect")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", 20)
            .attr("height", 20)
            .attr("fill", "#2ECC71")
            .attr("opacity", 0.85)
            .attr("stroke", "black")
            .attr("stroke-width", 1);

        legend.append("text")
            .attr("x", 30)
            .attr("y", 15)
            .text("Contribue à la baisse")
            .style("font-size", "13px");

        // Élément 2 : Réduit la baisse
        legend.append("rect")
            .attr("x", 0)
            .attr("y", 30)
            .attr("width", 20)
            .attr("height", 20)
            .attr("fill", "#E74C3C")
            .attr("opacity", 0.85)
            .attr("stroke", "black")
            .attr("stroke-width", 1);

        legend.append("text")
            .attr("x", 30)
            .attr("y", 45)
            .text("Réduit la baisse (hausse)")
            .style("font-size", "13px");

    }).catch(error => {
        console.error("Erreur lors du chargement des données:", error);
    });
}

// Créer le graphique au chargement de la page
createChart2();
