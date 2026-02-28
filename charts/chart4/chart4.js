// Graphique 4 : Comparaison de la répartition des catégories (2002 vs 2010)

function createChart4() {
    // Configuration
    const width = 450;
    const height = 450;
    const radius = Math.min(width, height) / 2 - 40;

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

        // Agréger par catégorie pour 2002 et 2010
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

        // Calculer les totaux
        const total2002 = d3.sum(data2002, d => d.Total_National);
        const total2010 = d3.sum(data2010, d => d.Total_National);

        // Préparer les données pour les pie charts
        const pieData2002 = [];
        const pieData2010 = [];

        for (const [catId, info] of Object.entries(categorieInfo)) {
            const val2002 = totauxParCategorie2002.get(catId) || 0;
            const val2010 = totauxParCategorie2010.get(catId) || 0;

            pieData2002.push({
                categorie: catId,
                label: info.label,
                value: val2002,
                percentage: (val2002 / total2002) * 100,
                couleur: info.couleur
            });

            pieData2010.push({
                categorie: catId,
                label: info.label,
                value: val2010,
                percentage: (val2010 / total2010) * 100,
                couleur: info.couleur
            });
        }

        // Trier par valeur décroissante
        pieData2002.sort((a, b) => b.value - a.value);
        pieData2010.sort((a, b) => b.value - a.value);

        // Créer les conteneurs
        const chartContainer = d3.select("#chart4");

        // Fonction pour créer un pie chart
        function createPieChart(data, year, total, container) {
            const pieContainer = container.append("div")
                .attr("class", "pie-container");

            pieContainer.append("div")
                .attr("class", "pie-title")
                .text(`Répartition en ${year}`);

            pieContainer.append("div")
                .attr("class", "pie-subtitle")
                .text(`(${total.toLocaleString('fr-FR')} faits constatés)`);

            const svg = pieContainer.append("svg")
                .attr("width", width)
                .attr("height", height)
                .append("g")
                .attr("transform", `translate(${width / 2},${height / 2})`);

            // Générateur de pie
            const pie = d3.pie()
                .value(d => d.value)
                .sort(null);

            // Générateur d'arc
            const arc = d3.arc()
                .innerRadius(0)
                .outerRadius(radius);

            // Générateur d'arc pour les labels (légèrement plus loin)
            const labelArc = d3.arc()
                .innerRadius(radius * 0.6)
                .outerRadius(radius * 0.6);

            // Dessiner les secteurs
            const slices = svg.selectAll(".pie-slice")
                .data(pie(data))
                .enter()
                .append("path")
                .attr("class", "pie-slice")
                .attr("d", arc)
                .attr("fill", d => d.data.couleur)
                .attr("data-category", d => d.data.categorie);

            // Ajouter les labels pour les grandes catégories (≥5%)
            svg.selectAll(".pie-label")
                .data(pie(data).filter(d => d.data.percentage >= 5))
                .enter()
                .append("text")
                .attr("class", "pie-label")
                .attr("transform", d => `translate(${labelArc.centroid(d)})`)
                .attr("text-anchor", "middle")
                .text(d => `${d.data.percentage.toFixed(1)}%`);

            // Interactivité
            slices
                .on("mouseover", function(event, d) {
                    const category = d.data.categorie;

                    // Mettre en évidence les deux secteurs correspondants
                    d3.selectAll(".pie-slice")
                        .classed("dimmed", true)
                        .filter(sliceD => sliceD.data.categorie === category)
                        .classed("dimmed", false)
                        .classed("highlighted", true);

                    // Récupérer les données des deux années
                    const data2002Item = pieData2002.find(item => item.categorie === category);
                    const data2010Item = pieData2010.find(item => item.categorie === category);

                    const evolution = data2010Item.value - data2002Item.value;
                    const evolutionPct = ((data2010Item.value - data2002Item.value) / data2002Item.value) * 100;

                    tooltip
                        .style("left", (event.pageX + 10) + "px")
                        .style("top", (event.pageY - 28) + "px")
                        .html(`
                            <strong>${d.data.label}</strong><br/>
                            <strong>2002:</strong> ${data2002Item.value.toLocaleString('fr-FR')} faits (${data2002Item.percentage.toFixed(1)}%)<br/>
                            <strong>2010:</strong> ${data2010Item.value.toLocaleString('fr-FR')} faits (${data2010Item.percentage.toFixed(1)}%)<br/>
                            <strong>Évolution:</strong> ${evolution > 0 ? '+' : ''}${evolution.toLocaleString('fr-FR')} (${evolutionPct > 0 ? '+' : ''}${evolutionPct.toFixed(1)}%)
                        `)
                        .classed("show", true);
                })
                .on("mouseout", function() {
                    d3.selectAll(".pie-slice")
                        .classed("dimmed", false)
                        .classed("highlighted", false);
                    tooltip.classed("show", false);
                });

            // Légende pour les petites catégories (<5%)
            const smallCategories = data.filter(d => d.percentage < 5);
            if (smallCategories.length > 0) {
                const legend = pieContainer.append("div")
                    .attr("class", "category-legend");

                legend.append("div")
                    .attr("class", "category-legend-title")
                    .text("Catégories < 5%");

                smallCategories.forEach(cat => {
                    const item = legend.append("div")
                        .attr("class", "category-legend-item");

                    item.append("div")
                        .attr("class", "category-legend-color")
                        .style("background-color", cat.couleur);

                    item.append("span")
                        .text(`${cat.label} (${cat.percentage.toFixed(1)}%)`);
                });
            }
        }

        // Créer les deux pie charts
        createPieChart(pieData2002, 2002, total2002, chartContainer);
        createPieChart(pieData2010, 2010, total2010, chartContainer);

    }).catch(error => {
        console.error("Erreur lors du chargement des données:", error);
    });
}

// Créer le graphique au chargement de la page
createChart4();
