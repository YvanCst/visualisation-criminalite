/**
 * Pie Chart Animé - Évolution de la composition par année
 */

(function() {
    // Configuration
    const width = 500;
    const height = 500;
    const outerRadius = Math.min(width, height) / 2 - 20;
    const innerRadius = outerRadius * 0.55; // Donut chart pour afficher l'année au centre

    // Variables globales
    let dataByYear = {};
    let categorieInfo = {};
    let currentYear = 2002;
    let isPlaying = false;
    let animationInterval = null;

    // Éléments DOM
    const tooltip = d3.select("#tooltip");

    // Formateur de nombres
    const formatNumber = d3.format(",");

    // Générateurs
    const pie = d3.pie()
        .value(d => d.value)
        .sort(null)
        .padAngle(0.01);

    const arc = d3.arc()
        .innerRadius(innerRadius)
        .outerRadius(outerRadius);

    const arcHover = d3.arc()
        .innerRadius(innerRadius)
        .outerRadius(outerRadius + 10);

    const labelArc = d3.arc()
        .innerRadius(outerRadius * 0.75)
        .outerRadius(outerRadius * 0.75);

    // Créer le SVG
    const svg = d3.select("#pie-chart")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${width / 2},${height / 2})`);

    // Groupe pour les slices
    const slicesGroup = svg.append("g").attr("class", "slices");
    const labelsGroup = svg.append("g").attr("class", "labels");

    // Chargement des données
    Promise.all([
        d3.csv("data/faits_national.csv"),
        d3.json("data/taxonomie.json")
    ]).then(([dataFaits, taxonomieData]) => {
        const taxonomie = taxonomieData.categories;

        // Convertir les valeurs
        dataFaits.forEach(d => {
            d.Annee = +d.Annee;
            d.Total_National = +d.Total_National;
        });

        // Créer le mapping fait -> catégorie
        const faitToCategorie = {};

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
        const years = [2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009, 2010];

        years.forEach(year => {
            const yearData = dataFaits.filter(d => d.Annee === year);
            const totauxParCategorie = d3.rollup(
                yearData,
                v => d3.sum(v, d => d.Total_National),
                d => d.categorie
            );
            const total = d3.sum(yearData, d => d.Total_National);

            const pieData = [];
            for (const [catId, info] of Object.entries(categorieInfo)) {
                const value = totauxParCategorie.get(catId) || 0;
                pieData.push({
                    categorie: catId,
                    label: info.label,
                    value: value,
                    percentage: (value / total) * 100,
                    couleur: info.couleur
                });
            }

            // Trier par valeur décroissante (pour cohérence)
            pieData.sort((a, b) => b.value - a.value);

            dataByYear[year] = {
                data: pieData,
                total: total
            };
        });

        // Créer la légende
        createLegend();

        // Dessiner le graphique initial
        updateChart(2002, false);

        // Event listeners
        setupEventListeners();

    }).catch(error => {
        console.error("Erreur lors du chargement des données:", error);
    });

    // Créer la légende
    function createLegend() {
        const legend = d3.select("#pie-legend");
        const categories = Object.entries(categorieInfo);

        categories.forEach(([catId, info]) => {
            const item = legend.append("div")
                .attr("class", "legend-item")
                .attr("data-category", catId);

            item.append("div")
                .attr("class", "legend-color")
                .style("background-color", info.couleur);

            item.append("span")
                .attr("class", "legend-label")
                .text(info.label);

            item.append("span")
                .attr("class", "legend-value")
                .attr("id", `legend-value-${catId}`);

            // Interactivité légende
            item.on("mouseover", function() {
                highlightCategory(catId, true);
            }).on("mouseout", function() {
                highlightCategory(catId, false);
            });
        });
    }

    // Mettre à jour le graphique
    function updateChart(year, animate = true) {
        currentYear = year;
        const yearData = dataByYear[year];

        // Mettre à jour les infos centrales
        d3.select("#year-display").text(year);
        d3.select("#total-display").text(formatNumber(yearData.total) + " faits");

        // Mettre à jour le slider
        d3.select("#year-slider").property("value", year);
        d3.select("#slider-value").text(year);

        // Mettre à jour la légende
        yearData.data.forEach(d => {
            d3.select(`#legend-value-${d.categorie}`)
                .text(`(${d.percentage.toFixed(1)}%)`);
        });

        // Calculer les arcs
        const arcs = pie(yearData.data);

        // Mise à jour des slices
        const slices = slicesGroup.selectAll(".pie-slice")
            .data(arcs, d => d.data.categorie);

        // Enter
        const slicesEnter = slices.enter()
            .append("path")
            .attr("class", "pie-slice")
            .attr("fill", d => d.data.couleur)
            .attr("d", arc)
            .each(function(d) { this._current = d; });

        // Update
        const slicesUpdate = slices.merge(slicesEnter);

        if (animate) {
            slicesUpdate.transition()
                .duration(500)
                .attrTween("d", arcTween);
        } else {
            slicesUpdate.attr("d", arc)
                .each(function(d) { this._current = d; });
        }

        // Interactivité
        slicesUpdate
            .on("mouseover", function(event, d) {
                d3.select(this).transition().duration(200).attr("d", arcHover);
                highlightCategory(d.data.categorie, true);
                showTooltip(event, d.data);
            })
            .on("mousemove", function(event) {
                moveTooltip(event);
            })
            .on("mouseout", function(event, d) {
                d3.select(this).transition().duration(200).attr("d", arc);
                highlightCategory(d.data.categorie, false);
                hideTooltip();
            });

        // Labels (uniquement pour les grandes catégories >= 5%)
        const labels = labelsGroup.selectAll(".pie-label")
            .data(arcs.filter(d => d.data.percentage >= 5), d => d.data.categorie);

        labels.enter()
            .append("text")
            .attr("class", "pie-label")
            .attr("text-anchor", "middle")
            .attr("dy", "0.35em")
            .merge(labels)
            .transition()
            .duration(animate ? 500 : 0)
            .attr("transform", d => `translate(${labelArc.centroid(d)})`)
            .text(d => `${d.data.percentage.toFixed(1)}%`);

        labels.exit().remove();
    }

    // Animation d'interpolation des arcs
    function arcTween(d) {
        const i = d3.interpolate(this._current, d);
        this._current = i(1);
        return t => arc(i(t));
    }

    // Highlight d'une catégorie
    function highlightCategory(catId, highlight) {
        if (highlight) {
            slicesGroup.selectAll(".pie-slice")
                .classed("dimmed", d => d.data.categorie !== catId);

            d3.selectAll(".legend-item")
                .classed("dimmed", function() {
                    return d3.select(this).attr("data-category") !== catId;
                });
        } else {
            slicesGroup.selectAll(".pie-slice").classed("dimmed", false);
            d3.selectAll(".legend-item").classed("dimmed", false);
        }
    }

    // Tooltip
    function showTooltip(event, data) {
        // Comparer avec 2002
        const data2002 = dataByYear[2002].data.find(d => d.categorie === data.categorie);
        const evolution = data.value - data2002.value;
        const evolutionPct = ((data.value / data2002.value - 1) * 100);

        let html = `<strong>${data.label}</strong><br>`;
        html += `<br><b>${currentYear}:</b> ${formatNumber(data.value)} faits`;
        html += `<br><b>Part:</b> ${data.percentage.toFixed(1)}%`;

        if (currentYear !== 2002) {
            html += `<br><br><b>vs 2002:</b>`;
            const sign = evolution >= 0 ? "+" : "";
            html += `<br>${sign}${formatNumber(evolution)} faits`;
            html += ` (${sign}${evolutionPct.toFixed(1)}%)`;
        }

        tooltip.html(html).classed("show", true);
        moveTooltip(event);
    }

    function moveTooltip(event) {
        tooltip
            .style("left", (event.pageX + 15) + "px")
            .style("top", (event.pageY - 10) + "px");
    }

    function hideTooltip() {
        tooltip.classed("show", false);
    }

    // Event listeners
    function setupEventListeners() {
        // Slider
        d3.select("#year-slider").on("input", function() {
            const year = +this.value;
            updateChart(year);
        });

        // Bouton play
        d3.select("#play-btn").on("click", function() {
            if (isPlaying) {
                stopAnimation();
            } else {
                startAnimation();
            }
        });

        // Bouton reset
        d3.select("#reset-btn").on("click", function() {
            stopAnimation();
            updateChart(2002);
        });
    }

    // Animation
    function startAnimation() {
        isPlaying = true;
        d3.select("#play-btn")
            .text("⏸ Pause")
            .classed("playing", true);

        // Si on est à la fin, recommencer
        if (currentYear >= 2010) {
            currentYear = 2002;
            updateChart(currentYear);
        }

        animationInterval = setInterval(() => {
            if (currentYear < 2010) {
                currentYear++;
                updateChart(currentYear);
            } else {
                stopAnimation();
            }
        }, 1000);
    }

    function stopAnimation() {
        isPlaying = false;
        d3.select("#play-btn")
            .text("▶ Lecture")
            .classed("playing", false);

        if (animationInterval) {
            clearInterval(animationInterval);
            animationInterval = null;
        }
    }

})();
