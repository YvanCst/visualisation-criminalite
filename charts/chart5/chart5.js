// Graphique 5 : Comparaison multi-départements (spaghetti plot)
// Affiche tous les départements simultanément pour identifier les comportements atypiques

function createChart5() {
    // Configuration
    const CONFIG = {
        margin: { top: 40, right: 120, bottom: 60, left: 80 },
        width: 1000,
        height: 500,
        transitionDuration: 500,
        colors: {
            national: '#e74c3c',
            departement: '#3498db',
            departementMuted: '#bdc3c7',
            highlight: '#2980b9'
        },
        opacityMuted: 0.15,
        opacityHover: 1,
        strokeWidthNormal: 1.5,
        strokeWidthNational: 3,
        strokeWidthHover: 3
    };

    // Noms des départements
    const nomsDepartements = {
        '1': 'Ain', '2': 'Aisne', '3': 'Allier', '4': 'Alpes-de-Haute-Provence',
        '5': 'Hautes-Alpes', '6': 'Alpes-Maritimes', '7': 'Ardèche', '8': 'Ardennes',
        '9': 'Ariège', '10': 'Aube', '11': 'Aude', '12': 'Aveyron',
        '13': 'Bouches-du-Rhône', '14': 'Calvados', '15': 'Cantal', '16': 'Charente',
        '17': 'Charente-Maritime', '18': 'Cher', '19': 'Corrèze', '21': 'Côte-d\'Or',
        '22': 'Côtes-d\'Armor', '23': 'Creuse', '24': 'Dordogne', '25': 'Doubs',
        '26': 'Drôme', '27': 'Eure', '28': 'Eure-et-Loir', '29': 'Finistère',
        '2A': 'Corse-du-Sud', '2B': 'Haute-Corse', '30': 'Gard', '31': 'Haute-Garonne',
        '32': 'Gers', '33': 'Gironde', '34': 'Hérault', '35': 'Ille-et-Vilaine',
        '36': 'Indre', '37': 'Indre-et-Loire', '38': 'Isère', '39': 'Jura',
        '40': 'Landes', '41': 'Loir-et-Cher', '42': 'Loire', '43': 'Haute-Loire',
        '44': 'Loire-Atlantique', '45': 'Loiret', '46': 'Lot', '47': 'Lot-et-Garonne',
        '48': 'Lozère', '49': 'Maine-et-Loire', '50': 'Manche', '51': 'Marne',
        '52': 'Haute-Marne', '53': 'Mayenne', '54': 'Meurthe-et-Moselle', '55': 'Meuse',
        '56': 'Morbihan', '57': 'Moselle', '58': 'Nièvre', '59': 'Nord',
        '60': 'Oise', '61': 'Orne', '62': 'Pas-de-Calais', '63': 'Puy-de-Dôme',
        '64': 'Pyrénées-Atlantiques', '65': 'Hautes-Pyrénées', '66': 'Pyrénées-Orientales',
        '67': 'Bas-Rhin', '68': 'Haut-Rhin', '69': 'Rhône', '70': 'Haute-Saône',
        '71': 'Saône-et-Loire', '72': 'Sarthe', '73': 'Savoie', '74': 'Haute-Savoie',
        '75': 'Paris', '76': 'Seine-Maritime', '77': 'Seine-et-Marne', '78': 'Yvelines',
        '79': 'Deux-Sèvres', '80': 'Somme', '81': 'Tarn', '82': 'Tarn-et-Garonne',
        '83': 'Var', '84': 'Vaucluse', '85': 'Vendée', '86': 'Vienne',
        '87': 'Haute-Vienne', '88': 'Vosges', '89': 'Yonne', '90': 'Territoire de Belfort',
        '91': 'Essonne', '92': 'Hauts-de-Seine', '93': 'Seine-Saint-Denis',
        '94': 'Val-de-Marne', '95': 'Val-d\'Oise'
    };

    function getNomDepartement(code) {
        return nomsDepartements[code] || code;
    }

    // État de l'application
    let currentDataType = "TOTAL";
    let highlightedDept = null;

    // Données chargées
    let dataComplet, dataNational, taxonomie;
    let allDepartements = [];

    // Éléments SVG
    let svg, xScale, yScale, line, chartWidth, chartHeight;

    // Créer la structure HTML
    const container = d3.select("#chart5");

    // Tooltip
    let tooltip = container.append("div")
        .attr("class", "chart5-tooltip");

    // Contrôles
    const controls = container.append("div")
        .attr("class", "controls");

    const groupFait = controls.append("div")
        .attr("class", "control-group");

    groupFait.append("label")
        .attr("for", "chart5-select-fait")
        .text("Type de fait :");

    const selectFait = groupFait.append("select")
        .attr("id", "chart5-select-fait");

    // Info box
    const infoBox = controls.append("div")
        .attr("class", "control-group info-box")
        .html('<span class="info-icon">ℹ</span> Survolez une courbe pour identifier le département. La ligne rouge représente la moyenne nationale.');

    // Conteneur du graphique
    const chartContainer = container.append("div")
        .attr("class", "chart-container")
        .attr("id", "chart5-container");

    // Panneau d'info sur le département survolé
    const hoverInfo = container.append("div")
        .attr("class", "hover-info")
        .attr("id", "chart5-hover-info");

    // Charger les données
    Promise.all([
        d3.csv("data/faits_complet.csv"),
        d3.csv("data/faits_national.csv"),
        d3.json("data/taxonomie.json")
    ]).then(([dataComp, dataNat, taxo]) => {

        dataComplet = dataComp;
        dataNational = dataNat;
        taxonomie = taxo.categories;

        // Convertir les valeurs en nombres
        dataComplet.forEach(d => {
            d.Annee = +d.Annee;
            d.Valeur = +d.Valeur;
        });

        dataNational.forEach(d => {
            d.Annee = +d.Annee;
            d.Total_National = +d.Total_National;
        });

        // Extraire les départements uniques
        allDepartements = [...new Set(dataComplet.map(d => d.Departement))].sort((a, b) => {
            const numA = parseInt(a);
            const numB = parseInt(b);
            if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
            return a.localeCompare(b);
        });

        // Peupler le sélecteur de faits
        populateSelectFait();

        // Initialiser le graphique
        initChart();

        // Bindre les événements
        bindEvents();

        // Dessiner le graphique initial
        updateChart();

    }).catch(error => {
        console.error("Erreur lors du chargement des données:", error);
        chartContainer.html('<div class="loading">Erreur de chargement des données</div>');
    });

    // Peupler le sélecteur de faits
    function populateSelectFait() {
        selectFait.append("option")
            .attr("value", "TOTAL")
            .text("TOTAL (tous les faits)");

        for (const [catId, catData] of Object.entries(taxonomie)) {
            const optgroup = selectFait.append("optgroup")
                .attr("label", catData.label);

            optgroup.append("option")
                .attr("value", `CAT:${catId}`)
                .text(`▸ ${catData.label} (agrégé)`);

            catData.faits.sort().forEach(fait => {
                optgroup.append("option")
                    .attr("value", `FAIT:${fait}`)
                    .text(fait);
            });
        }
    }

    // Initialiser le graphique SVG
    function initChart() {
        const containerNode = chartContainer.node();
        const containerWidth = containerNode.clientWidth || CONFIG.width;

        chartWidth = containerWidth - CONFIG.margin.left - CONFIG.margin.right;
        chartHeight = CONFIG.height - CONFIG.margin.top - CONFIG.margin.bottom;

        svg = chartContainer.append("svg")
            .attr("width", containerWidth)
            .attr("height", CONFIG.height)
            .append("g")
            .attr("transform", `translate(${CONFIG.margin.left},${CONFIG.margin.top})`);

        // Échelles
        xScale = d3.scaleLinear()
            .domain([2002, 2010])
            .range([0, chartWidth]);

        yScale = d3.scaleLinear()
            .range([chartHeight, 0]);

        // Générateur de ligne
        line = d3.line()
            .x(d => xScale(d.annee))
            .y(d => yScale(d.indice))
            .curve(d3.curveMonotoneX);

        // Grille
        svg.append("g")
            .attr("class", "grid grid-y");

        // Axes
        svg.append("g")
            .attr("class", "axis axis-x")
            .attr("transform", `translate(0,${chartHeight})`);

        svg.append("g")
            .attr("class", "axis axis-y");

        // Labels des axes
        svg.append("text")
            .attr("class", "axis-label axis-label-y")
            .attr("transform", "rotate(-90)")
            .attr("y", -60)
            .attr("x", -chartHeight / 2)
            .attr("text-anchor", "middle")
            .text("Indice (base 100 en 2002)");

        svg.append("text")
            .attr("class", "axis-label")
            .attr("y", chartHeight + 45)
            .attr("x", chartWidth / 2)
            .attr("text-anchor", "middle")
            .text("Année");

        // Groupes pour les lignes
        svg.append("g").attr("class", "dept-lines-group");
        svg.append("g").attr("class", "national-line-group");

        // Ligne de référence à 100
        svg.append("line")
            .attr("class", "reference-line-100")
            .attr("x1", 0)
            .attr("x2", chartWidth)
            .attr("stroke", "#aaa")
            .attr("stroke-dasharray", "4,4")
            .attr("stroke-width", 1)
            .attr("opacity", 0.5);
    }

    // Bindre les événements
    function bindEvents() {
        selectFait.on("change", function() {
            currentDataType = this.value;
            updateChart();
        });
    }

    // Obtenir les données nationales pour un fait
    function getNationalData(selection) {
        let data;

        if (selection === "TOTAL") {
            const grouped = d3.rollup(
                dataNational,
                v => d3.sum(v, d => d.Total_National),
                d => d.Annee
            );
            data = Array.from(grouped, ([annee, valeur]) => ({ annee, valeur }));
        } else if (selection.startsWith("CAT:")) {
            const catId = selection.replace("CAT:", "");
            const faitsCategorie = taxonomie[catId].faits;
            const filtered = dataNational.filter(d => faitsCategorie.includes(d.Fait));
            const grouped = d3.rollup(
                filtered,
                v => d3.sum(v, d => d.Total_National),
                d => d.Annee
            );
            data = Array.from(grouped, ([annee, valeur]) => ({ annee, valeur }));
        } else if (selection.startsWith("FAIT:")) {
            const faitNom = selection.replace("FAIT:", "");
            data = dataNational
                .filter(d => d.Fait === faitNom)
                .map(d => ({ annee: d.Annee, valeur: d.Total_National }));
        } else {
            return [];
        }

        return normalizeToBase100(data.sort((a, b) => a.annee - b.annee));
    }

    // Obtenir les données d'un département pour un fait
    function getDeptData(selection, departement) {
        let data;

        if (selection === "TOTAL") {
            const filtered = dataComplet.filter(d => d.Departement === departement);
            const grouped = d3.rollup(
                filtered,
                v => d3.sum(v, d => d.Valeur),
                d => d.Annee
            );
            data = Array.from(grouped, ([annee, valeur]) => ({ annee, valeur }));
        } else if (selection.startsWith("CAT:")) {
            const catId = selection.replace("CAT:", "");
            const faitsCategorie = taxonomie[catId].faits;
            const filtered = dataComplet.filter(d =>
                d.Departement === departement && faitsCategorie.includes(d.Fait)
            );
            const grouped = d3.rollup(
                filtered,
                v => d3.sum(v, d => d.Valeur),
                d => d.Annee
            );
            data = Array.from(grouped, ([annee, valeur]) => ({ annee, valeur }));
        } else if (selection.startsWith("FAIT:")) {
            const faitNom = selection.replace("FAIT:", "");
            data = dataComplet
                .filter(d => d.Fait === faitNom && d.Departement === departement)
                .map(d => ({ annee: d.Annee, valeur: d.Valeur }));
        } else {
            return null;
        }

        data = data.sort((a, b) => a.annee - b.annee);

        // Vérifier qu'on a des données valides
        if (data.length === 0 || data[0].valeur === 0) {
            return null;
        }

        return normalizeToBase100(data);
    }

    // Normaliser les données en base 100
    function normalizeToBase100(data) {
        if (!data || data.length === 0) return null;

        const base = data.find(d => d.annee === 2002)?.valeur;
        if (!base || base === 0) return null;

        return data.map(d => ({
            annee: d.annee,
            valeur: d.valeur,
            indice: (d.valeur / base) * 100
        }));
    }

    // Calculer la variation 2002-2010
    function getVariation(data) {
        if (!data || data.length < 2) return null;
        const first = data.find(d => d.annee === 2002);
        const last = data.find(d => d.annee === 2010);
        if (!first || !last) return null;
        return ((last.valeur - first.valeur) / first.valeur) * 100;
    }

    // Mise à jour du graphique
    function updateChart() {
        // Préparer les données de tous les départements
        const deptDataArray = [];

        allDepartements.forEach(dept => {
            const data = getDeptData(currentDataType, dept);
            if (data) {
                deptDataArray.push({
                    departement: dept,
                    nom: getNomDepartement(dept),
                    data: data,
                    variation: getVariation(data)
                });
            }
        });

        // Données nationales
        const nationalData = getNationalData(currentDataType);

        // Calculer le domaine Y (avec marge)
        let yMin = Infinity, yMax = -Infinity;

        deptDataArray.forEach(d => {
            d.data.forEach(point => {
                if (point.indice < yMin) yMin = point.indice;
                if (point.indice > yMax) yMax = point.indice;
            });
        });

        if (nationalData) {
            nationalData.forEach(point => {
                if (point.indice < yMin) yMin = point.indice;
                if (point.indice > yMax) yMax = point.indice;
            });
        }

        // Ajouter une marge de 10%
        const yPadding = (yMax - yMin) * 0.1;
        yMin = Math.max(0, yMin - yPadding);
        yMax = yMax + yPadding;

        yScale.domain([yMin, yMax]);

        // Mettre à jour la ligne de référence à 100
        svg.select(".reference-line-100")
            .attr("y1", yScale(100))
            .attr("y2", yScale(100));

        // Transition
        const t = d3.transition().duration(CONFIG.transitionDuration);

        // Mettre à jour les axes
        svg.select(".axis-x")
            .transition(t)
            .call(d3.axisBottom(xScale).ticks(9).tickFormat(d3.format("d")));

        svg.select(".axis-y")
            .transition(t)
            .call(d3.axisLeft(yScale).ticks(8).tickFormat(d => d.toFixed(0)));

        svg.select(".grid-y")
            .transition(t)
            .call(d3.axisLeft(yScale)
                .ticks(8)
                .tickSize(-chartWidth)
                .tickFormat(""));

        // Dessiner les lignes des départements
        const deptLinesGroup = svg.select(".dept-lines-group");

        // Bindre les données
        const deptLines = deptLinesGroup.selectAll(".dept-line")
            .data(deptDataArray, d => d.departement);

        // Exit
        deptLines.exit()
            .transition(t)
            .attr("opacity", 0)
            .remove();

        // Enter
        const deptLinesEnter = deptLines.enter()
            .append("path")
            .attr("class", "dept-line")
            .attr("fill", "none")
            .attr("stroke", CONFIG.colors.departementMuted)
            .attr("stroke-width", CONFIG.strokeWidthNormal)
            .attr("opacity", 0);

        // Update + Enter
        deptLinesEnter.merge(deptLines)
            .on("mouseenter", function(event, d) {
                handleDeptHover(d, true);
            })
            .on("mouseleave", function(event, d) {
                handleDeptHover(d, false);
            })
            .on("mousemove", function(event, d) {
                updateTooltipPosition(event);
            })
            .transition(t)
            .attr("d", d => line(d.data))
            .attr("opacity", CONFIG.opacityMuted);

        // Dessiner la ligne nationale (par-dessus)
        const nationalLineGroup = svg.select(".national-line-group");
        nationalLineGroup.selectAll(".national-line").remove();
        nationalLineGroup.selectAll(".national-dot").remove();

        if (nationalData) {
            nationalLineGroup.append("path")
                .datum(nationalData)
                .attr("class", "national-line")
                .attr("fill", "none")
                .attr("stroke", CONFIG.colors.national)
                .attr("stroke-width", CONFIG.strokeWidthNational)
                .attr("opacity", 0)
                .attr("d", line)
                .transition(t)
                .attr("opacity", 1);

            // Points pour la ligne nationale
            nationalLineGroup.selectAll(".national-dot")
                .data(nationalData)
                .enter()
                .append("circle")
                .attr("class", "national-dot")
                .attr("cx", d => xScale(d.annee))
                .attr("cy", d => yScale(d.indice))
                .attr("r", 4)
                .attr("fill", CONFIG.colors.national)
                .attr("opacity", 0)
                .on("mouseenter", function(event, d) {
                    showNationalTooltip(event, d);
                })
                .on("mouseleave", function() {
                    hideTooltip();
                })
                .transition(t)
                .attr("opacity", 1);
        }

        // Mettre à jour l'info de survol (reset)
        updateHoverInfo(null);
    }

    // Gérer le survol d'un département
    function handleDeptHover(deptData, isHovering) {
        const t = d3.transition().duration(150);

        if (isHovering) {
            highlightedDept = deptData.departement;

            // Mettre en évidence la ligne survolée
            svg.selectAll(".dept-line")
                .transition(t)
                .attr("opacity", d => d.departement === deptData.departement ? CONFIG.opacityHover : CONFIG.opacityMuted * 0.5)
                .attr("stroke", d => d.departement === deptData.departement ? CONFIG.colors.highlight : CONFIG.colors.departementMuted)
                .attr("stroke-width", d => d.departement === deptData.departement ? CONFIG.strokeWidthHover : CONFIG.strokeWidthNormal);

            // Remonter la ligne survolée au premier plan
            svg.select(".dept-lines-group")
                .selectAll(".dept-line")
                .filter(d => d.departement === deptData.departement)
                .raise();

            // Afficher le tooltip
            showDeptTooltip(deptData);

            // Mettre à jour l'info panel
            updateHoverInfo(deptData);

        } else {
            highlightedDept = null;

            // Réinitialiser toutes les lignes
            svg.selectAll(".dept-line")
                .transition(t)
                .attr("opacity", CONFIG.opacityMuted)
                .attr("stroke", CONFIG.colors.departementMuted)
                .attr("stroke-width", CONFIG.strokeWidthNormal);

            // Cacher le tooltip
            hideTooltip();

            // Reset l'info panel
            updateHoverInfo(null);
        }
    }

    // Afficher le tooltip pour un département
    function showDeptTooltip(deptData) {
        const variation = deptData.variation;
        const variationText = variation !== null
            ? `${variation >= 0 ? '+' : ''}${variation.toFixed(1)}%`
            : 'N/A';
        const variationClass = variation >= 0 ? 'positive' : 'negative';

        tooltip.html(`
            <div class="tooltip-dept">${deptData.departement} - ${deptData.nom}</div>
            <div class="tooltip-variation ${variationClass}">${variationText}</div>
            <div class="tooltip-hint">Évolution 2002-2010</div>
        `);
        tooltip.classed("visible", true);
    }

    // Afficher le tooltip pour la ligne nationale
    function showNationalTooltip(event, d) {
        tooltip.html(`
            <div class="tooltip-dept">France (national)</div>
            <div class="tooltip-year">${d.annee}</div>
            <div class="tooltip-value">Indice: ${d.indice.toFixed(1)}</div>
            <div class="tooltip-hint">${d3.format(",.0f")(d.valeur)} faits</div>
        `);
        tooltip.classed("visible", true);
        updateTooltipPosition(event);
    }

    // Mettre à jour la position du tooltip
    function updateTooltipPosition(event) {
        const containerRect = chartContainer.node().getBoundingClientRect();
        let left = event.clientX - containerRect.left + 15;
        let top = event.clientY - containerRect.top - 10;

        const tooltipNode = tooltip.node();
        const tooltipWidth = tooltipNode.offsetWidth;
        const tooltipHeight = tooltipNode.offsetHeight;

        if (left + tooltipWidth > containerRect.width) {
            left = event.clientX - containerRect.left - tooltipWidth - 15;
        }
        if (top + tooltipHeight > containerRect.height) {
            top = event.clientY - containerRect.top - tooltipHeight - 10;
        }
        if (top < 0) top = 10;
        if (left < 0) left = 10;

        tooltip.style("left", left + "px").style("top", top + "px");
    }

    // Cacher le tooltip
    function hideTooltip() {
        tooltip.classed("visible", false);
    }

    // Mettre à jour le panneau d'information
    function updateHoverInfo(deptData) {
        if (!deptData) {
            hoverInfo.html(`
                <div class="hover-info-placeholder">
                    Survolez une courbe pour voir les détails du département
                </div>
            `);
            return;
        }

        const variation = deptData.variation;
        const variationText = variation !== null
            ? `${variation >= 0 ? '+' : ''}${variation.toFixed(1)}%`
            : 'N/A';
        const variationClass = variation >= 0 ? 'hausse' : 'baisse';

        const valeur2002 = deptData.data.find(d => d.annee === 2002)?.valeur || 'N/A';
        const valeur2010 = deptData.data.find(d => d.annee === 2010)?.valeur || 'N/A';

        hoverInfo.html(`
            <div class="hover-info-title">${deptData.departement} - ${deptData.nom}</div>
            <div class="hover-info-stats">
                <div class="stat">
                    <span class="stat-label">2002</span>
                    <span class="stat-value">${d3.format(",.0f")(valeur2002)}</span>
                </div>
                <div class="stat">
                    <span class="stat-label">2010</span>
                    <span class="stat-value">${d3.format(",.0f")(valeur2010)}</span>
                </div>
                <div class="stat ${variationClass}">
                    <span class="stat-label">Évolution</span>
                    <span class="stat-value">${variationText}</span>
                </div>
            </div>
        `);
    }
}

// Créer le graphique au chargement
createChart5();
