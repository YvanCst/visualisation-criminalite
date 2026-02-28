// Graphique 1 : Évolution interactive des faits criminels (2002-2010)

function createChart1() {
    // Configuration
    const CONFIG = {
        margin: { top: 40, right: 40, bottom: 60, left: 80 },
        width: 900,
        height: 450,
        transitionDuration: 500,
        colors: {
            primary: '#3498db',
            dept: '#e74c3c',
            reference: '#95a5a6'
        }
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
    let currentDepartement = "TOUS";
    let currentMode = "absolu";

    // Données chargées
    let dataComplet, dataNational, taxonomie;

    // Éléments SVG
    let svg, xScale, yScale, line, chartWidth, chartHeight;

    // Créer le tooltip si nécessaire
    let tooltip = d3.select("#chart1 .tooltip");
    if (tooltip.empty()) {
        tooltip = d3.select("#chart1")
            .append("div")
            .attr("class", "tooltip");
    }

    // Créer la structure HTML des contrôles
    const container = d3.select("#chart1");

    const controls = container.append("div")
        .attr("class", "controls");

    // Groupe 1 : Sélecteur de type de fait
    const groupFait = controls.append("div")
        .attr("class", "control-group");

    groupFait.append("label")
        .attr("for", "chart1-select-fait")
        .text("Type de fait :");

    const selectFait = groupFait.append("select")
        .attr("id", "chart1-select-fait");

    // Groupe 2 : Sélecteur de département
    const groupDept = controls.append("div")
        .attr("class", "control-group");

    groupDept.append("label")
        .attr("for", "chart1-select-dept")
        .text("Département :");

    const selectDept = groupDept.append("select")
        .attr("id", "chart1-select-dept");

    // Groupe 3 : Toggle mode (caché par défaut)
    const toggleGroup = controls.append("div")
        .attr("class", "control-group toggle-group")
        .attr("id", "chart1-toggle-container")
        .style("display", "none");

    toggleGroup.append("label")
        .text("Mode de comparaison :");

    const toggleButtons = toggleGroup.append("div")
        .attr("class", "toggle-buttons");

    const btnAbsolu = toggleButtons.append("button")
        .attr("class", "toggle-btn active")
        .attr("data-mode", "absolu")
        .attr("title", "Valeurs brutes du département uniquement")
        .text("Valeurs absolues");

    const btnIndice = toggleButtons.append("button")
        .attr("class", "toggle-btn")
        .attr("data-mode", "indice")
        .attr("title", "Évolution relative (2002 = 100) avec référence nationale")
        .text("Indices base 100");

    // Conteneur du graphique
    const chartContainer = container.append("div")
        .attr("class", "chart-container")
        .attr("id", "chart1-container");

    // Légende
    const legend = container.append("div")
        .attr("class", "legend")
        .attr("id", "chart1-legend");

    // Charger les données en parallèle
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

        // Extraire les départements uniques et les trier
        const departements = [...new Set(dataComplet.map(d => d.Departement))].sort((a, b) => {
            const numA = parseInt(a);
            const numB = parseInt(b);
            if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
            return a.localeCompare(b);
        });

        // Peupler le sélecteur de faits
        populateSelectFait();

        // Peupler le sélecteur de départements
        selectDept.append("option")
            .attr("value", "TOUS")
            .text("Tous (niveau national)");

        departements.forEach(code => {
            selectDept.append("option")
                .attr("value", code)
                .text(`${code} - ${getNomDepartement(code)}`);
        });

        // Initialiser le graphique SVG
        initChart();

        // Bindre les événements
        bindEvents();

        // Dessiner le graphique initial
        updateChart();

    }).catch(error => {
        console.error("Erreur lors du chargement des données:", error);
        chartContainer.html('<div class="loading">Erreur de chargement des données</div>');
    });

    // Peupler le sélecteur de faits avec structure hiérarchique
    function populateSelectFait() {
        selectFait.append("option")
            .attr("value", "TOTAL")
            .text("TOTAL (tous les faits)");

        for (const [catId, catData] of Object.entries(taxonomie)) {
            const optgroup = selectFait.append("optgroup")
                .attr("label", catData.label);

            // Option pour la catégorie agrégée
            optgroup.append("option")
                .attr("value", `CAT:${catId}`)
                .text(`▸ ${catData.label} (agrégé)`);

            // Options pour chaque fait
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
            .y(d => yScale(d.valeur))
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
            .text("Nombre de faits");

        svg.append("text")
            .attr("class", "axis-label")
            .attr("y", chartHeight + 45)
            .attr("x", chartWidth / 2)
            .attr("text-anchor", "middle")
            .text("Année");

        // Groupes pour les éléments du graphique
        svg.append("g").attr("class", "line-group");
        svg.append("g").attr("class", "dots-group");
    }

    // Bindre les événements
    function bindEvents() {
        selectFait.on("change", function() {
            currentDataType = this.value;
            updateChart();
        });

        selectDept.on("change", function() {
            currentDepartement = this.value;

            if (currentDepartement === "TOUS") {
                toggleGroup.style("display", "none");
                currentMode = "absolu";
            } else {
                toggleGroup.style("display", null);
            }

            updateChart();
        });

        btnAbsolu.on("click", function() {
            setMode("absolu");
        });

        btnIndice.on("click", function() {
            setMode("indice");
        });
    }

    // Changer le mode de comparaison
    function setMode(mode) {
        currentMode = mode;

        toggleButtons.selectAll(".toggle-btn").classed("active", false);
        toggleButtons.select(`[data-mode="${mode}"]`).classed("active", true);

        updateChart();
    }

    // Obtenir les données nationales filtrées
    function getChartData(selection) {
        if (selection === "TOTAL") {
            const grouped = d3.rollup(
                dataNational,
                v => d3.sum(v, d => d.Total_National),
                d => d.Annee
            );
            return Array.from(grouped, ([annee, valeur]) => ({ annee, valeur }))
                .sort((a, b) => a.annee - b.annee);
        }

        if (selection.startsWith("CAT:")) {
            const catId = selection.replace("CAT:", "");
            const faitsCategorie = taxonomie[catId].faits;
            const filtered = dataNational.filter(d => faitsCategorie.includes(d.Fait));
            const grouped = d3.rollup(
                filtered,
                v => d3.sum(v, d => d.Total_National),
                d => d.Annee
            );
            return Array.from(grouped, ([annee, valeur]) => ({ annee, valeur }))
                .sort((a, b) => a.annee - b.annee);
        }

        if (selection.startsWith("FAIT:")) {
            const faitNom = selection.replace("FAIT:", "");
            return dataNational
                .filter(d => d.Fait === faitNom)
                .map(d => ({ annee: d.Annee, valeur: d.Total_National }))
                .sort((a, b) => a.annee - b.annee);
        }

        return [];
    }

    // Obtenir les données départementales filtrées
    function getChartDataDept(selection, departement) {
        if (selection === "TOTAL") {
            const filtered = dataComplet.filter(d => d.Departement === departement);
            const grouped = d3.rollup(
                filtered,
                v => d3.sum(v, d => d.Valeur),
                d => d.Annee
            );
            return Array.from(grouped, ([annee, valeur]) => ({ annee, valeur }))
                .sort((a, b) => a.annee - b.annee);
        }

        if (selection.startsWith("CAT:")) {
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
            return Array.from(grouped, ([annee, valeur]) => ({ annee, valeur }))
                .sort((a, b) => a.annee - b.annee);
        }

        if (selection.startsWith("FAIT:")) {
            const faitNom = selection.replace("FAIT:", "");
            return dataComplet
                .filter(d => d.Fait === faitNom && d.Departement === departement)
                .map(d => ({ annee: d.Annee, valeur: d.Valeur }))
                .sort((a, b) => a.annee - b.annee);
        }

        return [];
    }

    // Convertir en indices base 100
    function convertToIndice(data, anneeBase = 2002) {
        const valeurBase = data.find(d => d.annee === anneeBase)?.valeur;

        if (!valeurBase || valeurBase === 0) {
            return data.map(d => ({ ...d, valeur: 0 }));
        }

        return data.map(d => ({
            annee: d.annee,
            valeur: (d.valeur / valeurBase) * 100,
            valeurOriginale: d.valeur
        }));
    }

    // Obtenir le titre pour la sélection
    function getSelectionTitle(selection) {
        if (selection === "TOTAL") return "Total de la criminalité";
        if (selection.startsWith("CAT:")) {
            const catId = selection.replace("CAT:", "");
            return taxonomie[catId].label;
        }
        if (selection.startsWith("FAIT:")) {
            return selection.replace("FAIT:", "");
        }
        return "";
    }

    // Obtenir la couleur pour la sélection
    function getSelectionColor(selection) {
        if (selection === "TOTAL") return CONFIG.colors.primary;
        if (selection.startsWith("CAT:")) {
            const catId = selection.replace("CAT:", "");
            return taxonomie[catId].couleur;
        }
        if (selection.startsWith("FAIT:")) {
            const faitNom = selection.replace("FAIT:", "");
            for (const [catId, catData] of Object.entries(taxonomie)) {
                if (catData.faits.includes(faitNom)) {
                    return catData.couleur;
                }
            }
        }
        return CONFIG.colors.primary;
    }

    // Mise à jour du graphique
    function updateChart() {
        const title = getSelectionTitle(currentDataType);
        const color = getSelectionColor(currentDataType);

        let dataPrimary, dataReference = null;
        let titlePrimary, titleReference = null;
        let yAxisLabel = "Nombre de faits";
        let isIndiceMode = false;

        if (currentDepartement === "TOUS") {
            dataPrimary = getChartData(currentDataType);
            titlePrimary = `${title} (France)`;
        } else {
            dataPrimary = getChartDataDept(currentDataType, currentDepartement);
            titlePrimary = `${title} (${currentDepartement} - ${getNomDepartement(currentDepartement)})`;

            if (currentMode === "indice") {
                isIndiceMode = true;
                dataReference = getChartData(currentDataType);

                dataPrimary = convertToIndice(dataPrimary);
                dataReference = convertToIndice(dataReference);

                titlePrimary = `${currentDepartement} - ${getNomDepartement(currentDepartement)}`;
                titleReference = "France (référence)";
                yAxisLabel = "Indice (base 100 en 2002)";
            }
        }

        if (!dataPrimary || dataPrimary.length === 0) {
            console.warn("Aucune donnée pour la sélection:", currentDataType, currentDepartement);
            return;
        }

        // Calculer le domaine Y
        let yMax = d3.max(dataPrimary, d => d.valeur);
        let yMin = 0;

        if (dataReference) {
            yMax = Math.max(yMax, d3.max(dataReference, d => d.valeur));
            if (isIndiceMode) {
                yMin = Math.min(
                    d3.min(dataPrimary, d => d.valeur),
                    d3.min(dataReference, d => d.valeur)
                );
                yMin = Math.max(0, yMin - 10);
            }
        }
        yScale.domain([yMin, yMax * 1.1]);

        // Mettre à jour le label de l'axe Y
        svg.select(".axis-label-y").text(yAxisLabel);

        // Transition
        const t = d3.transition().duration(CONFIG.transitionDuration);

        // Mettre à jour les axes
        svg.select(".axis-x")
            .transition(t)
            .call(d3.axisBottom(xScale).ticks(9).tickFormat(d3.format("d")));

        svg.select(".axis-y")
            .transition(t)
            .call(d3.axisLeft(yScale)
                .ticks(8)
                .tickFormat(isIndiceMode ? d => d.toFixed(0) : d3.format(",.0f")));

        svg.select(".grid-y")
            .transition(t)
            .call(d3.axisLeft(yScale)
                .ticks(8)
                .tickSize(-chartWidth)
                .tickFormat(""));

        // Nettoyer les groupes existants
        const lineGroup = svg.select(".line-group");
        const dotsGroup = svg.select(".dots-group");

        lineGroup.selectAll(".line").remove();
        dotsGroup.selectAll(".dot").remove();

        // Ligne de référence à 100 pour le mode indice
        svg.selectAll(".reference-line-100").remove();
        if (isIndiceMode) {
            svg.append("line")
                .attr("class", "reference-line-100")
                .attr("x1", 0)
                .attr("x2", chartWidth)
                .attr("y1", yScale(100))
                .attr("y2", yScale(100))
                .attr("stroke", "#aaa")
                .attr("stroke-dasharray", "4,4")
                .attr("stroke-width", 1)
                .attr("opacity", 0.7);
        }

        // Si on a une référence nationale, la dessiner en premier
        if (dataReference) {
            const pathRef = lineGroup.append("path")
                .datum(dataReference)
                .attr("class", "line line-reference")
                .attr("stroke", CONFIG.colors.reference)
                .attr("d", line);

            // Animation
            const lengthRef = pathRef.node().getTotalLength();
            pathRef.attr("stroke-dasharray", lengthRef + " " + lengthRef)
                .attr("stroke-dashoffset", lengthRef)
                .transition(t)
                .attr("stroke-dashoffset", 0)
                .on("end", function() {
                    d3.select(this).attr("stroke-dasharray", "8, 4");
                });

            // Points de référence
            dotsGroup.selectAll(".dot-reference")
                .data(dataReference)
                .enter()
                .append("circle")
                .attr("class", "dot dot-reference")
                .attr("r", 0)
                .attr("cx", d => xScale(d.annee))
                .attr("cy", d => yScale(d.valeur))
                .attr("fill", "white")
                .attr("stroke", CONFIG.colors.reference)
                .attr("stroke-width", 2)
                .on("mouseover", function(event, d) {
                    showTooltip(event, d, titleReference, CONFIG.colors.reference, isIndiceMode);
                    d3.select(this).transition().duration(100).attr("r", 5);
                })
                .on("mouseout", function() {
                    hideTooltip();
                    d3.select(this).transition().duration(100).attr("r", 3);
                })
                .transition(t)
                .attr("r", 3);
        }

        // Ligne principale
        const colorPrimary = currentDepartement === "TOUS" ? color : CONFIG.colors.dept;

        const pathPrimary = lineGroup.append("path")
            .datum(dataPrimary)
            .attr("class", "line line-primary")
            .attr("stroke", colorPrimary)
            .attr("d", line);

        // Animation de la ligne principale
        const lengthPrimary = pathPrimary.node().getTotalLength();
        pathPrimary.attr("stroke-dasharray", lengthPrimary + " " + lengthPrimary)
            .attr("stroke-dashoffset", lengthPrimary)
            .transition(t)
            .attr("stroke-dashoffset", 0)
            .on("end", function() {
                d3.select(this).attr("stroke-dasharray", null);
            });

        // Points principaux
        dotsGroup.selectAll(".dot-primary")
            .data(dataPrimary)
            .enter()
            .append("circle")
            .attr("class", "dot dot-primary")
            .attr("r", 0)
            .attr("cx", d => xScale(d.annee))
            .attr("cy", d => yScale(d.valeur))
            .attr("fill", "white")
            .attr("stroke", colorPrimary)
            .on("mouseover", function(event, d) {
                showTooltip(event, d, titlePrimary, colorPrimary, isIndiceMode);
                d3.select(this).transition().duration(100).attr("r", 7);
            })
            .on("mouseout", function() {
                hideTooltip();
                d3.select(this).transition().duration(100).attr("r", 5);
            })
            .transition(t)
            .attr("r", 5);

        // Mettre à jour la légende
        updateLegend(titlePrimary, colorPrimary, titleReference, CONFIG.colors.reference, isIndiceMode);
    }

    // Afficher le tooltip
    function showTooltip(event, d, title, color, isIndiceMode = false) {
        const formatNumber = d3.format(",.0f");

        let valueDisplay;
        if (isIndiceMode) {
            valueDisplay = `<div class="tooltip-value" style="color: ${color}">${d.valeur.toFixed(1)}</div>`;
            if (d.valeurOriginale !== undefined) {
                valueDisplay += `<div class="tooltip-original">(${formatNumber(d.valeurOriginale)} faits)</div>`;
            }
        } else {
            valueDisplay = `<div class="tooltip-value" style="color: ${color}">${formatNumber(d.valeur)} faits</div>`;
        }

        tooltip.html(`
            <div class="tooltip-title">${title}</div>
            <div class="tooltip-year">${d.annee}</div>
            ${valueDisplay}
        `);

        tooltip.classed("visible", true);

        // Positionner le tooltip
        const containerRect = chartContainer.node().getBoundingClientRect();
        const mouseX = event.clientX - containerRect.left;
        const mouseY = event.clientY - containerRect.top;

        let left = mouseX + 15;
        let top = mouseY - 15;

        const tooltipNode = tooltip.node();
        const tooltipWidth = tooltipNode.offsetWidth;
        const tooltipHeight = tooltipNode.offsetHeight;

        if (left + tooltipWidth > containerRect.width) {
            left = mouseX - tooltipWidth - 15;
        }
        if (top + tooltipHeight > containerRect.height) {
            top = mouseY - tooltipHeight - 15;
        }
        if (top < 0) top = 10;
        if (left < 0) left = 10;

        tooltip.style("left", left + "px").style("top", top + "px");
    }

    // Cacher le tooltip
    function hideTooltip() {
        tooltip.classed("visible", false);
    }

    // Mettre à jour la légende
    function updateLegend(titlePrimary, colorPrimary, titleReference = null, colorReference = null, isIndiceMode = false) {
        legend.html("");

        const item1 = legend.append("div").attr("class", "legend-item");
        item1.append("div")
            .attr("class", "legend-line")
            .style("background-color", colorPrimary);
        item1.append("span").text(titlePrimary);

        if (titleReference) {
            const item2 = legend.append("div").attr("class", "legend-item");
            item2.append("div")
                .attr("class", "legend-line dashed")
                .style("--dash-color", colorReference);
            item2.append("span").text(titleReference);
        }

        if (isIndiceMode) {
            const itemInfo = legend.append("div").attr("class", "legend-item legend-info");
            itemInfo.append("span")
                .attr("class", "legend-note")
                .text("Base 100 = année 2002");
        }
    }
}

// Créer le graphique au chargement de la page
createChart1();
