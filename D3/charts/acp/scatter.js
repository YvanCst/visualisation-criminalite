/**
 * Scatter Plot ACP - Projection des départements sur PC1/PC2
 */

function createScatterPlot(data, onDepartementSelect, onClusterSelect) {
    const CONFIG = {
        margin: { top: 30, right: 30, bottom: 50, left: 60 },
        width: 500,
        height: 450,
        pointRadius: 7,
        pointRadiusHover: 10,
        transitionDuration: 300,
        showLabels: false,
        showVectors: true,
        vectorScale: 0.8
    };

    const width = CONFIG.width - CONFIG.margin.left - CONFIG.margin.right;
    const height = CONFIG.height - CONFIG.margin.top - CONFIG.margin.bottom;

    // Sélection et nettoyage
    const container = d3.select("#scatter-chart");
    container.selectAll("*").remove();

    // SVG
    const svg = container.append("svg")
        .attr("viewBox", `0 0 ${CONFIG.width} ${CONFIG.height}`)
        .attr("preserveAspectRatio", "xMidYMid meet")
        .append("g")
        .attr("transform", `translate(${CONFIG.margin.left},${CONFIG.margin.top})`);

    // Tooltip
    const tooltip = d3.select("#tooltip");

    // Calcul des échelles avec padding
    const xExtent = d3.extent(data.departements, d => d.pc1);
    const yExtent = d3.extent(data.departements, d => d.pc2);
    const xPadding = (xExtent[1] - xExtent[0]) * 0.1;
    const yPadding = (yExtent[1] - yExtent[0]) * 0.1;

    const xScale = d3.scaleLinear()
        .domain([xExtent[0] - xPadding, xExtent[1] + xPadding])
        .range([0, width]);

    const yScale = d3.scaleLinear()
        .domain([yExtent[0] - yPadding, yExtent[1] + yPadding])
        .range([height, 0]);

    // Mapping cluster -> couleur
    const clusterColors = {};
    data.clusters.forEach(c => {
        clusterColors[c.id] = c.couleur;
    });

    // Lignes des axes (à 0)
    svg.append("line")
        .attr("class", "axis-line")
        .attr("x1", xScale(xExtent[0] - xPadding))
        .attr("x2", xScale(xExtent[1] + xPadding))
        .attr("y1", yScale(0))
        .attr("y2", yScale(0));

    svg.append("line")
        .attr("class", "axis-line")
        .attr("x1", xScale(0))
        .attr("x2", xScale(0))
        .attr("y1", yScale(yExtent[0] - yPadding))
        .attr("y2", yScale(yExtent[1] + yPadding));

    // Axes
    const xAxis = d3.axisBottom(xScale).ticks(8);
    const yAxis = d3.axisLeft(yScale).ticks(8);

    svg.append("g")
        .attr("class", "axis x-axis")
        .attr("transform", `translate(0,${height})`)
        .call(xAxis);

    svg.append("g")
        .attr("class", "axis y-axis")
        .call(yAxis);

    // Labels des axes
    svg.append("text")
        .attr("class", "axis-label")
        .attr("x", width / 2)
        .attr("y", height + 40)
        .attr("text-anchor", "middle")
        .text(`PC1 (${data.variance.PC1}%)`);

    svg.append("text")
        .attr("class", "axis-label")
        .attr("x", -height / 2)
        .attr("y", -45)
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .text(`PC2 (${data.variance.PC2}%)`);

    // Vecteurs des variables (loadings)
    if (CONFIG.showVectors) {
        const vectorGroup = svg.append("g").attr("class", "vectors");

        const maxLoading = d3.max(data.categories, d =>
            Math.sqrt(d.pc1_loading ** 2 + d.pc2_loading ** 2)
        );
        const vectorScaleFactor = Math.min(width, height) * CONFIG.vectorScale / 2 / maxLoading;

        svg.append("defs").append("marker")
            .attr("id", "arrowhead")
            .attr("viewBox", "0 -5 10 10")
            .attr("refX", 8)
            .attr("refY", 0)
            .attr("markerWidth", 6)
            .attr("markerHeight", 6)
            .attr("orient", "auto")
            .append("path")
            .attr("d", "M0,-5L10,0L0,5")
            .attr("fill", "#666");

        data.categories.forEach(cat => {
            const x2 = cat.pc1_loading * vectorScaleFactor;
            const y2 = -cat.pc2_loading * vectorScaleFactor;

            vectorGroup.append("line")
                .attr("class", "variable-arrow")
                .attr("x1", xScale(0))
                .attr("y1", yScale(0))
                .attr("x2", xScale(0) + x2)
                .attr("y2", yScale(0) + y2)
                .attr("stroke", cat.couleur)
                .attr("marker-end", "url(#arrowhead)")
                .attr("opacity", 0.6);

            const labelOffset = 1.15;
            vectorGroup.append("text")
                .attr("class", "variable-label")
                .attr("x", xScale(0) + x2 * labelOffset)
                .attr("y", yScale(0) + y2 * labelOffset)
                .attr("text-anchor", "middle")
                .attr("fill", cat.couleur)
                .text(cat.label.split(" ")[0]);
        });
    }

    // Points des départements
    const points = svg.selectAll(".dept-point")
        .data(data.departements)
        .enter()
        .append("circle")
        .attr("class", "dept-point")
        .attr("cx", d => xScale(d.pc1))
        .attr("cy", d => yScale(d.pc2))
        .attr("r", CONFIG.pointRadius)
        .attr("fill", d => clusterColors[d.cluster])
        .attr("opacity", 0.8)
        .attr("data-code", d => d.code);

    // Labels des départements
    if (CONFIG.showLabels) {
        svg.selectAll(".dept-label")
            .data(data.departements)
            .enter()
            .append("text")
            .attr("class", "dept-label")
            .attr("x", d => xScale(d.pc1))
            .attr("y", d => yScale(d.pc2) - 10)
            .text(d => d.code);
    }

    // État de sélection
    let selectedDepartements = [];
    let selectedClusters = [];
    let hiddenClusters = new Set();
    const MAX_SELECTION = 4;

    // Fonction pour mettre à jour la visibilité des points
    function updatePointsVisibility() {
        points.classed("hidden", d => hiddenClusters.has(d.cluster));
    }

    // Fonction pour effacer la sélection des départements
    function clearDeptSelection() {
        selectedDepartements = [];
        points.classed("selected", false);
    }

    // Fonction pour effacer la sélection des clusters
    function clearClusterSelection() {
        selectedClusters = [];
        legend.selectAll(".legend-item").classed("selected", false);
    }

    // Interactions sur les points
    points
        .on("mouseover", function(event, d) {
            if (hiddenClusters.has(d.cluster)) return;

            const cluster = data.clusters.find(c => c.id === d.cluster);

            d3.select(this)
                .transition()
                .duration(150)
                .attr("r", CONFIG.pointRadiusHover);

            tooltip
                .style("opacity", 1)
                .style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 10) + "px")
                .html(`
                    <div class="tooltip-title">${d.code} - ${d.nom}</div>
                    <div class="tooltip-row">
                        <span class="tooltip-label">Cluster:</span>
                        <span class="tooltip-value">${cluster.nom}</span>
                    </div>
                    <div class="tooltip-row">
                        <span class="tooltip-label">PC1:</span>
                        <span class="tooltip-value">${d.pc1.toFixed(2)}</span>
                    </div>
                    <div class="tooltip-row">
                        <span class="tooltip-label">PC2:</span>
                        <span class="tooltip-value">${d.pc2.toFixed(2)}</span>
                    </div>
                    ${d.outlier ? '<div style="color: #f39c12; margin-top: 5px;">⚠ Cas particulier</div>' : ''}
                    <div style="color: #aaa; margin-top: 5px; font-size: 11px;">Ctrl+clic pour comparer</div>
                `);
        })
        .on("mouseout", function(event, d) {
            d3.select(this)
                .transition()
                .duration(150)
                .attr("r", CONFIG.pointRadius);

            tooltip.style("opacity", 0);
        })
        .on("click", function(event, d) {
            if (hiddenClusters.has(d.cluster)) return;

            // Clic sur un département = on passe en mode départements
            clearClusterSelection();

            const isCtrlClick = event.ctrlKey || event.metaKey;
            const isAlreadySelected = selectedDepartements.some(dept => dept.code === d.code);

            if (isCtrlClick) {
                if (isAlreadySelected) {
                    selectedDepartements = selectedDepartements.filter(dept => dept.code !== d.code);
                    d3.select(this).classed("selected", false);
                } else if (selectedDepartements.length < MAX_SELECTION) {
                    selectedDepartements.push(d);
                    d3.select(this).classed("selected", true);
                }
            } else {
                if (isAlreadySelected && selectedDepartements.length === 1) {
                    selectedDepartements = [];
                    d3.select(this).classed("selected", false);
                } else {
                    selectedDepartements = [d];
                    points.classed("selected", false);
                    d3.select(this).classed("selected", true);
                }
            }

            if (onDepartementSelect) {
                onDepartementSelect(selectedDepartements);
            }
        });

    // Légende des clusters
    const legend = d3.select("#scatter-legend");
    legend.selectAll("*").remove();

    data.clusters.forEach(cluster => {
        const item = legend.append("div")
            .attr("class", "legend-item")
            .attr("data-cluster", cluster.id);

        // Bouton œil pour visibilité
        const eyeBtn = item.append("span")
            .attr("class", "legend-eye")
            .attr("title", "Masquer/Afficher")
            .html("👁");

        // Couleur du cluster
        item.append("div")
            .attr("class", "legend-color")
            .style("background-color", cluster.couleur);

        // Nom du cluster (cliquable pour sélection)
        item.append("span")
            .attr("class", "legend-text")
            .text(`${cluster.nom} (${cluster.n_departements})`);

        // Interaction œil : toggle visibilité
        eyeBtn.on("click", function(event) {
            event.stopPropagation();
            const clusterId = cluster.id;

            if (hiddenClusters.has(clusterId)) {
                hiddenClusters.delete(clusterId);
                d3.select(this).classed("eye-off", false).html("👁");
            } else {
                hiddenClusters.add(clusterId);
                d3.select(this).classed("eye-off", true).html("👁‍🗨");
            }
            updatePointsVisibility();
        });

        // Interaction sur l'item (hors œil) : sélection cluster
        item.on("click", function(event) {
            // Ignorer si le clic vient du bouton œil
            if (event.target.classList.contains("legend-eye")) return;

            // Clic sur cluster = on passe en mode clusters
            clearDeptSelection();

            const clusterId = cluster.id;
            const isCtrlClick = event.ctrlKey || event.metaKey;
            const isAlreadySelected = selectedClusters.includes(clusterId);

            if (isCtrlClick) {
                if (isAlreadySelected) {
                    selectedClusters = selectedClusters.filter(id => id !== clusterId);
                    d3.select(this).classed("selected", false);
                } else if (selectedClusters.length < 3) {
                    selectedClusters.push(clusterId);
                    d3.select(this).classed("selected", true);
                }
            } else {
                if (isAlreadySelected && selectedClusters.length === 1) {
                    selectedClusters = [];
                    d3.select(this).classed("selected", false);
                } else {
                    selectedClusters = [clusterId];
                    legend.selectAll(".legend-item").classed("selected", false);
                    d3.select(this).classed("selected", true);
                }
            }

            if (onClusterSelect) {
                onClusterSelect(selectedClusters);
            }
        });
    });

    // API publique
    return {
        selectDepartement: function(code) {
            clearClusterSelection();
            const dept = data.departements.find(d => d.code === code);
            if (dept) {
                selectedDepartements = [dept];
                points.classed("selected", false);
                points.filter(d => d.code === code).classed("selected", true);
            }
        },
        addToSelection: function(code) {
            const dept = data.departements.find(d => d.code === code);
            if (dept && selectedDepartements.length < MAX_SELECTION) {
                if (!selectedDepartements.some(d => d.code === code)) {
                    selectedDepartements.push(dept);
                    points.filter(d => d.code === code).classed("selected", true);
                }
            }
            return selectedDepartements;
        },
        clearSelection: function() {
            clearDeptSelection();
            clearClusterSelection();
        },
        getSelection: function() {
            return selectedDepartements;
        },
        getClusterSelection: function() {
            return selectedClusters;
        },
        selectCluster: function(clusterId) {
            clearDeptSelection();
            selectedClusters = [clusterId];
            legend.selectAll(".legend-item").classed("selected", false);
            legend.selectAll(".legend-item")
                .filter(function() { return +d3.select(this).attr("data-cluster") === clusterId; })
                .classed("selected", true);
        },
        highlightCluster: function(clusterId) {
            points.classed("dimmed", d => d.cluster !== clusterId);
        },
        resetHighlight: function() {
            points.classed("dimmed", false);
        }
    };
}
