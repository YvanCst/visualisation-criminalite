/**
 * Radar Chart - Profil criminel d'un ou plusieurs départements
 */

function createRadarChart(data, containerSelector = "#radar-chart", titleSelector = "#radar-title") {
    const CONFIG = {
        margin: { top: 60, right: 120, bottom: 60, left: 120 },
        width: 540,
        height: 440,
        levels: 5,
        maxValue: 50,
        labelFactor: 1.25,
        dotRadius: 4,
        transitionDuration: 400
    };

    const width = CONFIG.width - CONFIG.margin.left - CONFIG.margin.right;
    const height = CONFIG.height - CONFIG.margin.top - CONFIG.margin.bottom;
    const radius = Math.min(width, height) / 2;

    // Sélection et nettoyage
    const container = d3.select(containerSelector);
    container.selectAll("*").remove();

    // SVG
    const svg = container.append("svg")
        .attr("viewBox", `0 0 ${CONFIG.width} ${CONFIG.height}`)
        .attr("preserveAspectRatio", "xMidYMid meet")
        .append("g")
        .attr("transform", `translate(${CONFIG.width / 2},${CONFIG.height / 2})`);

    // Tooltip
    const tooltip = d3.select("#tooltip");

    // Axes (catégories)
    const categories = data.categories;
    const angleSlice = (Math.PI * 2) / categories.length;

    // Échelle radiale
    const rScale = d3.scaleLinear()
        .domain([0, CONFIG.maxValue])
        .range([0, radius]);

    // Grille circulaire
    const gridGroup = svg.append("g").attr("class", "grid");

    for (let level = 1; level <= CONFIG.levels; level++) {
        const levelFactor = radius * (level / CONFIG.levels);

        gridGroup.append("circle")
            .attr("class", "radar-grid")
            .attr("r", levelFactor);

        gridGroup.append("text")
            .attr("x", 5)
            .attr("y", -levelFactor + 3)
            .attr("font-size", "9px")
            .attr("fill", "#999")
            .text((CONFIG.maxValue * level / CONFIG.levels).toFixed(0) + "%");
    }

    // Axes radiaux
    const axisGroup = svg.append("g").attr("class", "axes");

    categories.forEach((cat, i) => {
        const angle = angleSlice * i - Math.PI / 2;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;

        axisGroup.append("line")
            .attr("class", "radar-axis")
            .attr("x1", 0)
            .attr("y1", 0)
            .attr("x2", x)
            .attr("y2", y);

        const labelX = Math.cos(angle) * radius * CONFIG.labelFactor;
        const labelY = Math.sin(angle) * radius * CONFIG.labelFactor;

        let textAnchor = "middle";
        if (labelX > 10) textAnchor = "start";
        else if (labelX < -10) textAnchor = "end";

        axisGroup.append("text")
            .attr("class", "radar-axis-label")
            .attr("x", labelX)
            .attr("y", labelY)
            .attr("text-anchor", textAnchor)
            .attr("dominant-baseline", "middle")
            .attr("fill", cat.couleur)
            .style("cursor", "default")
            .text(cat.label.length > 15 ? cat.label.substring(0, 15) + "..." : cat.label)
            .on("mouseover", function(event) {
                tooltip
                    .style("opacity", 1)
                    .html(`<div class="tooltip-title">${cat.label}</div>`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 10) + "px");
            })
            .on("mousemove", function(event) {
                tooltip
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 10) + "px");
            })
            .on("mouseout", function() {
                tooltip.style("opacity", 0);
            });
    });

    // Groupe pour les zones
    const areasGroup = svg.append("g").attr("class", "areas");

    // Fonction pour créer le générateur de ligne radiale
    function createRadarLine() {
        return d3.lineRadial()
            .radius(d => rScale(d.value))
            .angle((d, i) => angleSlice * i)
            .curve(d3.curveLinearClosed);
    }

    // Fonction pour calculer les points d'un profil
    function getRadarPoints(profile) {
        return categories.map((cat, i) => {
            const value = profile[cat.id] || 0;
            const angle = angleSlice * i - Math.PI / 2;
            return {
                x: Math.cos(angle) * rScale(value),
                y: Math.sin(angle) * rScale(value),
                value: value,
                category: cat
            };
        });
    }

    // État interne
    let currentDepartements = [];
    let showNational = true;

    // Couleurs pour multi-sélection (si même cluster)
    const multiColors = ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728"];

    // Dessiner le profil national
    function drawNationalProfile() {
        areasGroup.selectAll(".radar-area.national").remove();

        if (showNational) {
            const points = getRadarPoints(data.profil_national);

            areasGroup.append("path")
                .attr("class", "radar-area national")
                .datum(points)
                .attr("d", createRadarLine())
                .attr("fill", "#999")
                .attr("stroke", "#666");
        }
    }

    // Dessiner les profils des départements
    function drawDepartementsProfiles() {
        // Supprimer les anciens
        areasGroup.selectAll(".radar-area.departement").remove();
        areasGroup.selectAll(".radar-point").remove();

        if (currentDepartements.length === 0) return;

        // Dessiner chaque département
        currentDepartements.forEach((dept, index) => {
            const cluster = data.clusters.find(c => c.id === dept.cluster);
            // Utiliser la couleur du cluster, ou une couleur distincte si plusieurs du même cluster
            let color = cluster ? cluster.couleur : multiColors[index];

            // Si plusieurs départements, ajuster l'opacité et utiliser des couleurs distinctes
            const opacity = currentDepartements.length > 1 ? 0.25 : 0.35;
            const strokeWidth = currentDepartements.length > 1 ? 2.5 : 2;

            const points = getRadarPoints(dept.profil);

            // Zone
            const area = areasGroup.append("path")
                .attr("class", `radar-area departement dept-${dept.code}`)
                .datum(points)
                .attr("fill", color)
                .attr("stroke", color)
                .attr("stroke-width", strokeWidth)
                .attr("fill-opacity", 0)
                .attr("stroke-opacity", 0);

            area.transition()
                .duration(CONFIG.transitionDuration)
                .attr("d", createRadarLine())
                .attr("fill-opacity", opacity)
                .attr("stroke-opacity", 1);

            // Points
            points.forEach((pt) => {
                areasGroup.append("circle")
                    .attr("class", `radar-point dept-${dept.code}`)
                    .attr("cx", pt.x)
                    .attr("cy", pt.y)
                    .attr("r", CONFIG.dotRadius)
                    .attr("fill", color)
                    .attr("opacity", 0)
                    .transition()
                    .delay(CONFIG.transitionDuration / 2)
                    .duration(200)
                    .attr("opacity", 1);
            });
        });
    }

    // Mise à jour du titre
    function updateTitle() {
        const titleEl = d3.select(titleSelector);

        if (currentDepartements.length === 0) {
            titleEl.text("Sélectionnez un département")
                .classed("selected", false);
        } else if (currentDepartements.length === 1) {
            const dept = currentDepartements[0];
            titleEl.text(`${dept.code} - ${dept.nom}`)
                .classed("selected", true);
        } else {
            const names = currentDepartements.map(d => d.code).join(", ");
            titleEl.text(`Comparaison : ${names}`)
                .classed("selected", true);
        }
    }

    // Mise à jour complète
    function update() {
        drawNationalProfile();
        drawDepartementsProfiles();
        updateTitle();
    }

    // État initial
    drawNationalProfile();

    // État pour le mode clusters
    let currentClusters = [];

    // Dessiner les profils des clusters sélectionnés
    function drawClustersProfiles() {
        areasGroup.selectAll(".radar-area.cluster-profile").remove();
        areasGroup.selectAll(".radar-point.cluster-point").remove();

        if (currentClusters.length === 0) return;

        currentClusters.forEach((clusterId, index) => {
            const cluster = data.clusters.find(c => c.id === clusterId);
            if (!cluster) return;

            const color = cluster.couleur;
            const opacity = currentClusters.length > 1 ? 0.3 : 0.4;
            const strokeWidth = currentClusters.length > 1 ? 2.5 : 2;

            const points = getRadarPoints(cluster.profil_moyen);

            // Zone
            const area = areasGroup.append("path")
                .attr("class", `radar-area cluster-profile cluster-${clusterId}`)
                .datum(points)
                .attr("fill", color)
                .attr("stroke", color)
                .attr("stroke-width", strokeWidth)
                .attr("fill-opacity", 0)
                .attr("stroke-opacity", 0);

            area.transition()
                .duration(CONFIG.transitionDuration)
                .attr("d", createRadarLine())
                .attr("fill-opacity", opacity)
                .attr("stroke-opacity", 1);

            // Points
            points.forEach((pt) => {
                areasGroup.append("circle")
                    .attr("class", `radar-point cluster-point cluster-${clusterId}`)
                    .attr("cx", pt.x)
                    .attr("cy", pt.y)
                    .attr("r", CONFIG.dotRadius)
                    .attr("fill", color)
                    .attr("opacity", 0)
                    .transition()
                    .delay(CONFIG.transitionDuration / 2)
                    .duration(200)
                    .attr("opacity", 1);
            });
        });
    }

    // Mise à jour du titre pour les clusters
    function updateTitleForClusters() {
        const titleEl = d3.select(titleSelector);

        if (currentClusters.length === 0) {
            titleEl.text("Sélectionnez un département ou cluster")
                .classed("selected", false);
        } else if (currentClusters.length === 1) {
            const cluster = data.clusters.find(c => c.id === currentClusters[0]);
            titleEl.text(`Cluster : ${cluster.nom}`)
                .classed("selected", true);
        } else {
            const names = currentClusters.map(id => {
                const c = data.clusters.find(cl => cl.id === id);
                return c ? `C${id + 1}` : id;
            }).join(" vs ");
            titleEl.text(`Comparaison : ${names}`)
                .classed("selected", true);
        }
    }

    // Mise à jour pour mode clusters
    function updateClusters() {
        drawNationalProfile();
        drawClustersProfiles();
        updateTitleForClusters();
    }

    // API publique
    return {
        setDepartements: function(depts) {
            currentDepartements = Array.isArray(depts) ? depts : (depts ? [depts] : []);
            currentClusters = []; // Effacer la sélection clusters
            update();
        },
        setDepartement: function(dept) {
            this.setDepartements(dept ? [dept] : []);
        },
        addDepartement: function(dept) {
            if (dept && currentDepartements.length < 4) {
                if (!currentDepartements.some(d => d.code === dept.code)) {
                    currentDepartements.push(dept);
                    update();
                }
            }
        },
        removeDepartement: function(code) {
            currentDepartements = currentDepartements.filter(d => d.code !== code);
            update();
        },
        clearDepartements: function() {
            currentDepartements = [];
            update();
        },
        // Nouvelles méthodes pour les clusters
        setClusters: function(clusterIds) {
            currentClusters = Array.isArray(clusterIds) ? clusterIds : (clusterIds !== undefined ? [clusterIds] : []);
            currentDepartements = []; // Effacer la sélection départements
            // Nettoyer les éléments départements
            areasGroup.selectAll(".radar-area.departement").remove();
            areasGroup.selectAll(".radar-point:not(.cluster-point)").remove();
            updateClusters();
        },
        clearClusters: function() {
            currentClusters = [];
            areasGroup.selectAll(".radar-area.cluster-profile").remove();
            areasGroup.selectAll(".radar-point.cluster-point").remove();
        },
        setShowNational: function(show) {
            showNational = show;
            if (currentClusters.length > 0) {
                updateClusters();
            } else {
                update();
            }
        },
        getDepartements: function() {
            return currentDepartements;
        },
        getClusters: function() {
            return currentClusters;
        },
        clear: function() {
            currentDepartements = [];
            currentClusters = [];
            areasGroup.selectAll(".radar-area.departement").remove();
            areasGroup.selectAll(".radar-area.cluster-profile").remove();
            areasGroup.selectAll(".radar-point").remove();
            drawNationalProfile();
            d3.select(titleSelector).text("Sélectionnez un département ou cluster").classed("selected", false);
        }
    };
}
