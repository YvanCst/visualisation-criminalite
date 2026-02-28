/**
 * Main - Coordination des visualisations ACP
 */

(function() {
    // Variables globales pour les charts
    let scatterPlot = null;
    let radarChart = null;
    let mapChart = null;
    let radarChartMap = null;
    let data = null;
    let geoData = null;
    let currentView = 'acp';

    // Chargement des données
    Promise.all([
        d3.json("data/acp_results.json"),
        d3.json("../geo_data/departements.geojson")
    ]).then(function([loadedData, loadedGeoData]) {
        data = loadedData;
        geoData = loadedGeoData;

        // Afficher les infos de variance
        d3.select("#variance-info").text(
            `PC1: ${data.variance.PC1}% + PC2: ${data.variance.PC2}% = ${data.variance.cumulative_2}%`
        );

        // Créer le scatter plot avec les deux callbacks
        scatterPlot = createScatterPlot(data, onDepartementsSelect, onClustersSelect);

        // Créer le radar chart pour la vue ACP
        radarChart = createRadarChart(data);

        // Peupler les outliers
        populateOutliers();

        // Bind des contrôles du radar (vue ACP)
        bindRadarControls();

        // Bind des onglets de vue
        bindViewTabs();

    }).catch(function(error) {
        console.error("Erreur lors du chargement des données:", error);
        d3.select("#scatter-chart").append("p")
            .style("color", "red")
            .text("Erreur lors du chargement des données ACP");
    });

    // Gestion des onglets de vue
    function bindViewTabs() {
        d3.selectAll(".view-tab").on("click", function() {
            const view = d3.select(this).attr("data-view");
            if (view === currentView) return;

            // Mise à jour de l'onglet actif
            d3.selectAll(".view-tab").classed("active", false);
            d3.select(this).classed("active", true);

            // Afficher/masquer les vues
            d3.select("#view-acp").classed("hidden", view !== "acp");
            d3.select("#view-map").classed("hidden", view !== "map");

            currentView = view;

            // Initialiser la carte au premier affichage
            if (view === "map" && !mapChart) {
                initMapView();
            }
        });
    }

    // Initialiser la vue carte
    function initMapView() {
        // Créer la carte
        mapChart = createMap(data, geoData, onMapDepartementSelect);

        // Créer le radar chart pour la vue carte
        radarChartMap = createRadarChart(data, "#radar-chart-map", "#radar-title-map");

        // Créer la légende de la carte
        createMapLegend();

        // Bind du contrôle show-national pour la carte
        d3.select("#show-national-map").on("change", function() {
            if (radarChartMap) {
                radarChartMap.setShowNational(this.checked);
            }
        });
    }

    // Créer la légende pour la carte
    function createMapLegend() {
        const legend = d3.select("#map-legend");
        legend.selectAll("*").remove();

        data.clusters.forEach(cluster => {
            const item = legend.append("div")
                .attr("class", "legend-item");

            item.append("span")
                .attr("class", "legend-color")
                .style("background-color", cluster.couleur);

            item.append("span")
                .attr("class", "legend-label")
                .text(`${cluster.nom} (${cluster.n_departements})`);
        });
    }

    // Callback quand un département est sélectionné sur la carte
    function onMapDepartementSelect(depts) {
        const departementsArray = Array.isArray(depts) ? depts : (depts ? [depts] : []);

        if (radarChartMap) {
            radarChartMap.setDepartements(departementsArray);
        }
        updateInfoPanelDepartements(departementsArray);
    }

    // Callback quand des départements sont sélectionnés
    function onDepartementsSelect(depts) {
        const departementsArray = Array.isArray(depts) ? depts : (depts ? [depts] : []);

        if (radarChart) {
            radarChart.setDepartements(departementsArray);
        }
        updateInfoPanelDepartements(departementsArray);
    }

    // Callback quand des clusters sont sélectionnés
    function onClustersSelect(clusterIds) {
        const clustersArray = Array.isArray(clusterIds) ? clusterIds : (clusterIds !== undefined ? [clusterIds] : []);

        if (radarChart) {
            radarChart.setClusters(clustersArray);
        }
        updateInfoPanelClusters(clustersArray);
    }

    // Mise à jour du panneau d'information pour les départements
    function updateInfoPanelDepartements(depts) {
        const content = d3.select("#info-content");

        if (!depts || depts.length === 0) {
            showDefaultInfo();
            return;
        }

        if (depts.length === 1) {
            const dept = depts[0];
            const cluster = data.clusters.find(c => c.id === dept.cluster);

            const ecarts = [];
            data.categories.forEach(cat => {
                const valDept = dept.profil[cat.id];
                const valNat = data.profil_national[cat.id];
                const ecart = valDept - valNat;
                ecarts.push({
                    label: cat.label,
                    couleur: cat.couleur,
                    valeur: valDept,
                    ecart: ecart
                });
            });

            ecarts.sort((a, b) => Math.abs(b.ecart) - Math.abs(a.ecart));

            let html = `
                <div style="margin-bottom: 10px;">
                    <strong>${dept.code} - ${dept.nom}</strong>
                    ${dept.outlier ? '<span style="color: #f39c12; margin-left: 10px;">⚠ Cas particulier</span>' : ''}
                </div>
                <div style="display: flex; gap: 20px; margin-bottom: 10px;">
                    <span><strong>Cluster:</strong> <span style="color: ${cluster.couleur}">${cluster.nom}</span></span>
                    <span><strong>Distance au centre:</strong> ${dept.distance_centre.toFixed(2)}</span>
                </div>
                <div style="margin-bottom: 5px;"><strong>Écarts significatifs au profil national :</strong></div>
                <div class="dept-info">
            `;

            ecarts.slice(0, 5).forEach(e => {
                const sign = e.ecart >= 0 ? "+" : "";
                const colorClass = e.ecart >= 0 ? "positive" : "negative";
                if (Math.abs(e.ecart) > 0.5) {
                    html += `
                        <div class="dept-info-item">
                            <span class="dept-info-label" style="color: ${e.couleur}">${e.label}</span>
                            <span class="dept-info-value ${colorClass}">${sign}${e.ecart.toFixed(1)}%</span>
                        </div>
                    `;
                }
            });

            html += `</div>`;
            content.html(html);

        } else {
            let html = `
                <div style="margin-bottom: 10px;">
                    <strong>Comparaison de ${depts.length} départements</strong>
                    <span style="color: #888; margin-left: 10px; font-size: 12px;">Cliquez sur un département pour le retirer</span>
                </div>
                <div class="comparison-grid">
            `;

            depts.forEach(dept => {
                const cluster = data.clusters.find(c => c.id === dept.cluster);
                html += `
                    <div class="comparison-item" data-code="${dept.code}" style="border-left: 4px solid ${cluster.couleur}; padding-left: 10px; margin-bottom: 10px; cursor: pointer;">
                        <div><strong>${dept.code} - ${dept.nom}</strong></div>
                        <div style="font-size: 12px; color: #666;">${cluster.nom}</div>
                    </div>
                `;
            });

            html += `</div>`;

            if (depts.length === 2) {
                const dept1 = depts[0];
                const dept2 = depts[1];

                html += `<div style="margin-top: 15px;"><strong>Principales différences :</strong></div>`;
                html += `<div class="dept-info">`;

                const differences = data.categories.map(cat => ({
                    label: cat.label,
                    couleur: cat.couleur,
                    diff: dept1.profil[cat.id] - dept2.profil[cat.id],
                    val1: dept1.profil[cat.id],
                    val2: dept2.profil[cat.id]
                })).sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));

                differences.slice(0, 4).forEach(d => {
                    if (Math.abs(d.diff) > 1) {
                        html += `
                            <div class="dept-info-item">
                                <span class="dept-info-label" style="color: ${d.couleur}">${d.label}</span>
                                <span class="dept-info-value">${dept1.code}: ${d.val1.toFixed(1)}% vs ${dept2.code}: ${d.val2.toFixed(1)}%</span>
                            </div>
                        `;
                    }
                });

                html += `</div>`;
            }

            content.html(html);

            content.selectAll(".comparison-item").on("click", function() {
                const code = d3.select(this).attr("data-code");
                if (scatterPlot) {
                    const newSelection = scatterPlot.getSelection().filter(d => d.code !== code);
                    scatterPlot.clearSelection();
                    newSelection.forEach(d => scatterPlot.addToSelection(d.code));
                    onDepartementsSelect(newSelection);
                }
            });
        }
    }

    // Mise à jour du panneau d'information pour les clusters
    function updateInfoPanelClusters(clusterIds) {
        const content = d3.select("#info-content");

        if (!clusterIds || clusterIds.length === 0) {
            showDefaultInfo();
            return;
        }

        if (clusterIds.length === 1) {
            const cluster = data.clusters.find(c => c.id === clusterIds[0]);

            let html = `
                <div style="margin-bottom: 10px;">
                    <strong style="color: ${cluster.couleur}">Cluster : ${cluster.nom}</strong>
                    <span style="margin-left: 10px; color: #666;">(${cluster.n_departements} départements)</span>
                </div>
                <div style="margin-bottom: 10px;"><strong>Écarts au profil national :</strong></div>
                <div class="dept-info">
            `;

            // Trier les écarts par valeur absolue
            const ecarts = Object.entries(cluster.ecarts_national)
                .map(([catId, ecart]) => {
                    const cat = data.categories.find(c => c.id === catId);
                    return {
                        id: catId,
                        label: cat ? cat.label : catId,
                        couleur: cat ? cat.couleur : '#666',
                        ecart: ecart,
                        valeur: cluster.profil_moyen[catId]
                    };
                })
                .sort((a, b) => Math.abs(b.ecart) - Math.abs(a.ecart));

            ecarts.forEach(e => {
                if (Math.abs(e.ecart) > 0.5) {
                    const sign = e.ecart >= 0 ? "+" : "";
                    const colorClass = e.ecart >= 0 ? "positive" : "negative";
                    html += `
                        <div class="dept-info-item">
                            <span class="dept-info-label" style="color: ${e.couleur}">${e.label}</span>
                            <span class="dept-info-value ${colorClass}">${e.valeur.toFixed(1)}% (${sign}${e.ecart.toFixed(1)}%)</span>
                        </div>
                    `;
                }
            });

            html += `</div>`;
            content.html(html);

        } else {
            // Comparaison de plusieurs clusters
            let html = `
                <div style="margin-bottom: 10px;">
                    <strong>Comparaison de ${clusterIds.length} clusters</strong>
                </div>
                <div class="comparison-grid">
            `;

            clusterIds.forEach(clusterId => {
                const cluster = data.clusters.find(c => c.id === clusterId);
                html += `
                    <div class="comparison-item" style="border-left: 4px solid ${cluster.couleur}; padding-left: 10px;">
                        <div><strong>${cluster.nom}</strong></div>
                        <div style="font-size: 12px; color: #666;">${cluster.n_departements} départements</div>
                    </div>
                `;
            });

            html += `</div>`;

            // Principales différences entre les clusters
            if (clusterIds.length === 2) {
                const cluster1 = data.clusters.find(c => c.id === clusterIds[0]);
                const cluster2 = data.clusters.find(c => c.id === clusterIds[1]);

                html += `<div style="margin-top: 15px;"><strong>Principales différences :</strong></div>`;
                html += `<div class="dept-info">`;

                const differences = data.categories.map(cat => ({
                    label: cat.label,
                    couleur: cat.couleur,
                    diff: cluster1.profil_moyen[cat.id] - cluster2.profil_moyen[cat.id],
                    val1: cluster1.profil_moyen[cat.id],
                    val2: cluster2.profil_moyen[cat.id]
                })).sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));

                differences.slice(0, 5).forEach(d => {
                    if (Math.abs(d.diff) > 0.5) {
                        html += `
                            <div class="dept-info-item">
                                <span class="dept-info-label" style="color: ${d.couleur}">${d.label}</span>
                                <span class="dept-info-value">C1: ${d.val1.toFixed(1)}% vs C2: ${d.val2.toFixed(1)}%</span>
                            </div>
                        `;
                    }
                });

                html += `</div>`;
            }

            content.html(html);
        }
    }

    // Afficher les infos par défaut
    function showDefaultInfo() {
        const content = d3.select("#info-content");
        content.html(`
            <p>Cliquez sur un département ou un cluster pour afficher son profil.</p>
            <p style="color: #888; font-size: 12px;">Astuce : Ctrl+clic pour comparer jusqu'à 4 départements ou 3 clusters</p>
            <p class="info-stats">
                <strong>Variance expliquée :</strong> <span id="variance-info">${data.variance.cumulative_2}%</span>
            </p>
        `);
    }

    // Peupler la liste des outliers
    function populateOutliers() {
        const outliers = data.departements.filter(d => d.outlier);
        const container = d3.select("#outliers-list");

        if (outliers.length === 0) {
            container.html("<p>Aucun cas particulier détecté.</p>");
            return;
        }

        outliers.sort((a, b) => b.distance_centre - a.distance_centre);

        outliers.forEach(dept => {
            const cluster = data.clusters.find(c => c.id === dept.cluster);

            const badge = container.append("div")
                .attr("class", "outlier-badge")
                .attr("data-code", dept.code);

            badge.append("div")
                .attr("class", "cluster-dot")
                .style("background-color", cluster.couleur);

            badge.append("span")
                .text(`${dept.code} - ${dept.nom}`);

            badge.on("click", function(event) {
                const isCtrlClick = event.ctrlKey || event.metaKey;

                if (isCtrlClick && scatterPlot) {
                    const newSelection = scatterPlot.addToSelection(dept.code);
                    onDepartementsSelect(newSelection);
                } else {
                    if (scatterPlot) {
                        scatterPlot.selectDepartement(dept.code);
                    }
                    onDepartementsSelect([dept]);
                }
            });
        });
    }

    // Bind des contrôles du radar
    function bindRadarControls() {
        d3.select("#show-national").on("change", function() {
            if (radarChart) {
                radarChart.setShowNational(this.checked);
            }
        });

    }

})();
