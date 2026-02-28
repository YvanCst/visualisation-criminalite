/**
 * Carte de France - Départements colorés par cluster
 */

function createMap(data, geoData, onDepartementSelect) {
    const CONFIG = {
        width: 520,
        height: 580,
        transitionDuration: 300
    };

    // Sélection et nettoyage
    const container = d3.select("#map-chart");
    container.selectAll("*").remove();

    // SVG
    const svg = container.append("svg")
        .attr("viewBox", `0 0 ${CONFIG.width} ${CONFIG.height}`)
        .attr("preserveAspectRatio", "xMidYMid meet");

    // Tooltip
    const tooltip = d3.select("#tooltip");

    // Mapping cluster -> couleur
    const clusterColors = {};
    data.clusters.forEach(c => {
        clusterColors[c.id] = c.couleur;
    });

    // Mapping code département (GeoJSON '01' -> ACP '1')
    function normalizeCode(code) {
        if (code === '2A' || code === '2B') return code;
        return String(parseInt(code, 10));
    }

    // Index des départements par code
    const deptByCode = {};
    data.departements.forEach(d => {
        deptByCode[d.code] = d;
    });

    // Projection pour la France métropolitaine
    const projection = d3.geoConicConformal()
        .center([2.454071, 46.279229])
        .scale(2800)
        .translate([CONFIG.width / 2, CONFIG.height / 2 - 30]);

    const path = d3.geoPath().projection(projection);

    // État de sélection
    let selectedDepartements = [];
    const MAX_SELECTION = 4;

    // Dessiner les départements
    const departments = svg.selectAll(".dept-path")
        .data(geoData.features)
        .enter()
        .append("path")
        .attr("class", "dept-path")
        .attr("d", path)
        .attr("fill", d => {
            const code = normalizeCode(d.properties.code);
            const dept = deptByCode[code];
            return dept ? clusterColors[dept.cluster] : "#ccc";
        })
        .attr("stroke", "#fff")
        .attr("stroke-width", 0.5)
        .attr("data-code", d => normalizeCode(d.properties.code));

    // Interactions
    departments
        .on("mouseover", function(event, d) {
            const code = normalizeCode(d.properties.code);
            const dept = deptByCode[code];

            d3.select(this)
                .attr("stroke", "#333")
                .attr("stroke-width", 2)
                .raise();

            if (dept) {
                const cluster = data.clusters.find(c => c.id === dept.cluster);
                tooltip
                    .style("opacity", 1)
                    .style("left", (event.pageX + 15) + "px")
                    .style("top", (event.pageY - 10) + "px")
                    .html(`
                        <div class="tooltip-title">${dept.code} - ${dept.nom}</div>
                        <div class="tooltip-row">
                            <span class="tooltip-label">Cluster:</span>
                            <span class="tooltip-value">${cluster.nom}</span>
                        </div>
                    `);
            }
        })
        .on("mousemove", function(event) {
            tooltip
                .style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 10) + "px");
        })
        .on("mouseout", function(event, d) {
            const code = normalizeCode(d.properties.code);
            const isSelected = selectedDepartements.some(dept => dept.code === code);

            d3.select(this)
                .attr("stroke", isSelected ? "#333" : "#fff")
                .attr("stroke-width", isSelected ? 2 : 0.5);

            tooltip.style("opacity", 0);
        })
        .on("click", function(event, d) {
            const code = normalizeCode(d.properties.code);
            const dept = deptByCode[code];
            if (!dept) return;

            const isCtrl = event.ctrlKey || event.metaKey;
            const alreadySelected = selectedDepartements.findIndex(sd => sd.code === code);

            if (alreadySelected !== -1) {
                // Déselectionner
                selectedDepartements.splice(alreadySelected, 1);
            } else if (isCtrl && selectedDepartements.length < MAX_SELECTION) {
                // Ajouter à la sélection multiple
                selectedDepartements.push(dept);
            } else {
                // Nouvelle sélection simple
                selectedDepartements = [dept];
            }

            // Mettre à jour les styles
            updateSelection();

            // Callback
            if (onDepartementSelect) {
                onDepartementSelect(selectedDepartements);
            }
        });

    // Mettre à jour l'affichage de la sélection
    function updateSelection() {
        departments
            .attr("stroke", function(d) {
                const code = normalizeCode(d.properties.code);
                return selectedDepartements.some(dept => dept.code === code) ? "#333" : "#fff";
            })
            .attr("stroke-width", function(d) {
                const code = normalizeCode(d.properties.code);
                return selectedDepartements.some(dept => dept.code === code) ? 2 : 0.5;
            });
    }

    // API publique
    return {
        setSelection: function(depts) {
            selectedDepartements = Array.isArray(depts) ? depts : [];
            updateSelection();
        },
        getSelection: function() {
            return selectedDepartements;
        },
        highlightDepartement: function(code) {
            departments.each(function(d) {
                const deptCode = normalizeCode(d.properties.code);
                if (deptCode === code) {
                    d3.select(this)
                        .attr("stroke", "#ff6b6b")
                        .attr("stroke-width", 3)
                        .raise();
                }
            });
        },
        clearHighlight: function() {
            updateSelection();
        }
    };
}
