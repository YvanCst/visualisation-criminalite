/**
 * Sankey Diagram - Transformation de la criminalité 2002 → 2010
 * Pour la tâche 3
 */

(function() {
    // Dimensions
    const margin = { top: 20, right: 180, bottom: 20, left: 180 };
    const width = 1000 - margin.left - margin.right;
    const height = 520 - margin.top - margin.bottom;

    // Tooltip
    const tooltip = d3.select("#tooltip");

    // Formateur de nombres
    const formatNumber = d3.format(",");

    // Chargement des données
    d3.json("data/sankey_data.json").then(function(data) {
        // Mise à jour des statistiques
        updateStats(data.stats);

        // Création du SVG
        const svg = d3.select("#sankey-chart")
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Séparer les nœuds par côté
        const leftNodes = data.nodes.filter(n => n.side === "left");
        const rightNodes = data.nodes.filter(n => n.side === "right");

        // Calculer les positions Y pour chaque côté
        const nodeWidth = 20;
        const nodePadding = 12;

        // Total des valeurs pour chaque côté
        const leftTotal = d3.sum(leftNodes, d => d.value);

        // Échelle pour convertir les valeurs en hauteurs
        const heightScale = (height - (Math.max(leftNodes.length, rightNodes.length) - 1) * nodePadding) / leftTotal;

        // Positionner les nœuds de gauche
        let yPos = 0;
        leftNodes.forEach((node) => {
            node.x0 = 0;
            node.x1 = nodeWidth;
            node.y0 = yPos;
            node.height = node.value * heightScale;
            node.y1 = yPos + node.height;
            yPos = node.y1 + nodePadding;
        });

        // Positionner les nœuds de droite (même échelle)
        yPos = 0;
        rightNodes.forEach((node) => {
            node.x0 = width - nodeWidth;
            node.x1 = width;
            node.y0 = yPos;
            node.height = node.value * heightScale;
            node.y1 = yPos + node.height;
            yPos = node.y1 + nodePadding;
        });

        // Créer un index pour accéder aux nœuds par ID
        const nodeById = {};
        data.nodes.forEach(n => nodeById[n.id] = n);

        // Calculer les positions de départ/arrivée des liens
        const sourceOffsets = {};
        const targetOffsets = {};
        data.nodes.forEach(n => {
            sourceOffsets[n.id] = 0;
            targetOffsets[n.id] = 0;
        });

        // Trier les liens pour un meilleur rendu visuel
        data.links.sort((a, b) => {
            const sourceA = nodeById[data.nodes[a.source].id];
            const sourceB = nodeById[data.nodes[b.source].id];
            return sourceA.y0 - sourceB.y0;
        });

        // Calculer les chemins des liens
        const processedLinks = data.links.map(link => {
            const sourceNode = data.nodes[link.source];
            const targetNode = data.nodes[link.target];

            const linkHeight = link.value * heightScale;

            const sourceY = sourceNode.y0 + sourceOffsets[sourceNode.id];
            const targetY = targetNode.y0 + targetOffsets[targetNode.id];

            sourceOffsets[sourceNode.id] += linkHeight;
            targetOffsets[targetNode.id] += linkHeight;

            return {
                source: sourceNode,
                target: targetNode,
                value: link.value,
                color: link.color,
                width: linkHeight,
                y0: sourceY + linkHeight / 2,
                y1: targetY + linkHeight / 2
            };
        });

        // Dessiner les liens
        const links = svg.append("g")
            .attr("class", "sankey-links")
            .selectAll("path")
            .data(processedLinks)
            .join("path")
            .attr("class", "sankey-link")
            .attr("d", d => {
                const x0 = d.source.x1;
                const x1 = d.target.x0;
                const xi = (x0 + x1) / 2;

                return `M${x0},${d.y0}
                        C${xi},${d.y0} ${xi},${d.y1} ${x1},${d.y1}`;
            })
            .attr("stroke", d => d.color)
            .attr("stroke-width", d => Math.max(1, d.width))
            .attr("fill", "none")
            .attr("stroke-opacity", 0.4)
            .on("mouseover", function(event, d) {
                highlightLink(d, true, this);
                showLinkTooltip(event, d);
            })
            .on("mousemove", function(event) {
                moveTooltip(event);
            })
            .on("mouseout", function(event, d) {
                highlightLink(d, false, this);
                hideTooltip();
            });

        // Dessiner les nœuds
        const nodes = svg.append("g")
            .attr("class", "sankey-nodes")
            .selectAll("g")
            .data(data.nodes)
            .join("g")
            .attr("class", "sankey-node")
            .on("mouseover", function(event, d) {
                highlightNode(d, true, processedLinks);
                showNodeTooltip(event, d);
            })
            .on("mousemove", function(event) {
                moveTooltip(event);
            })
            .on("mouseout", function(event, d) {
                highlightNode(d, false, processedLinks);
                hideTooltip();
            });

        // Rectangles des nœuds
        nodes.append("rect")
            .attr("x", d => d.x0)
            .attr("y", d => d.y0)
            .attr("height", d => Math.max(1, d.y1 - d.y0))
            .attr("width", d => d.x1 - d.x0)
            .attr("fill", d => d.color)
            .attr("stroke", d => d3.color(d.color).darker(0.5))
            .attr("stroke-width", 1)
            .attr("rx", 2)
            .attr("ry", 2);

        // Labels des nœuds
        nodes.append("text")
            .attr("class", "node-label")
            .attr("x", d => d.side === "left" ? d.x0 - 10 : d.x1 + 10)
            .attr("y", d => (d.y0 + d.y1) / 2)
            .attr("dy", "-0.3em")
            .attr("text-anchor", d => d.side === "left" ? "end" : "start")
            .text(d => d.name)
            .style("font-size", "12px")
            .style("font-weight", "500");

        // Valeurs des nœuds
        nodes.append("text")
            .attr("class", "node-value")
            .attr("x", d => d.side === "left" ? d.x0 - 10 : d.x1 + 10)
            .attr("y", d => (d.y0 + d.y1) / 2)
            .attr("dy", "1.1em")
            .attr("text-anchor", d => d.side === "left" ? "end" : "start")
            .text(d => {
                const sign = d.type === "baisse" ? "-" : "+";
                return `${sign}${formatNumber(d.value)}`;
            })
            .style("font-size", "11px")
            .style("font-weight", "bold")
            .attr("fill", d => {
                if (d.type === "baisse") return "#c0392b";
                if (d.type === "hausse") return "#27ae60";
                return "#2980b9";
            });

        // Fonctions de highlight
        function highlightNode(node, highlight, allLinks) {
            if (highlight) {
                nodes.classed("dimmed", true);
                links.classed("dimmed", true);

                nodes.filter(n => n.id === node.id).classed("dimmed", false).classed("highlighted", true);

                links.filter(l => l.source.id === node.id || l.target.id === node.id)
                    .classed("dimmed", false)
                    .classed("highlighted", true)
                    .attr("stroke-opacity", 0.7);

                const connectedIds = new Set();
                allLinks.forEach(l => {
                    if (l.source.id === node.id) connectedIds.add(l.target.id);
                    if (l.target.id === node.id) connectedIds.add(l.source.id);
                });

                nodes.filter(n => connectedIds.has(n.id)).classed("dimmed", false);
            } else {
                nodes.classed("dimmed", false).classed("highlighted", false);
                links.classed("dimmed", false).classed("highlighted", false).attr("stroke-opacity", 0.4);
            }
        }

        function highlightLink(link, highlight, element) {
            if (highlight) {
                nodes.classed("dimmed", true);
                links.classed("dimmed", true);

                d3.select(element).classed("dimmed", false).classed("highlighted", true).attr("stroke-opacity", 0.7);

                nodes.filter(n => n.id === link.source.id || n.id === link.target.id)
                    .classed("dimmed", false)
                    .classed("highlighted", true);
            } else {
                nodes.classed("dimmed", false).classed("highlighted", false);
                links.classed("dimmed", false).classed("highlighted", false).attr("stroke-opacity", 0.4);
            }
        }

        // Fonctions de tooltip
        function showNodeTooltip(event, d) {
            let html = `<strong>${d.name}</strong><br>`;

            if (d.type === "baisse") {
                html += `<span style="color: #e74c3c;">↓ -${formatNumber(d.value)} faits</span><br>`;
                html += `<br><b>2002:</b> ${formatNumber(d.total_2002)} (${d.pct_2002}%)`;
                html += `<br><b>2010:</b> ${formatNumber(d.total_2010)} (${d.pct_2010}%)`;
                const pctChange = ((d.total_2010 / d.total_2002 - 1) * 100).toFixed(1);
                html += `<br><br><em>Variation: ${pctChange}%</em>`;
            } else if (d.type === "hausse") {
                html += `<span style="color: #2ecc71;">↑ +${formatNumber(d.value)} faits</span><br>`;
                html += `<br><b>2002:</b> ${formatNumber(d.total_2002)} (${d.pct_2002}%)`;
                html += `<br><b>2010:</b> ${formatNumber(d.total_2010)} (${d.pct_2010}%)`;
                const pctChange = ((d.total_2010 / d.total_2002 - 1) * 100).toFixed(1);
                html += `<br><br><em>Variation: +${pctChange}%</em>`;
            } else {
                html += `<span style="color: #3498db;">Solde net: -${formatNumber(d.value)}</span><br>`;
                html += `<br>La criminalité globale a baissé`;
                html += `<br>de <b>16.1%</b> entre 2002 et 2010.`;
            }

            tooltip.html(html).classed("show", true);
            moveTooltip(event);
        }

        function showLinkTooltip(event, d) {
            const html = `
                <strong>${d.source.name}</strong><br>
                → <strong>${d.target.name}</strong><br>
                <br>
                Flux: ${formatNumber(Math.round(d.value))} faits
            `;

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

    }).catch(function(error) {
        console.error("Erreur lors du chargement des données:", error);
        d3.select("#sankey-chart")
            .append("p")
            .style("color", "red")
            .style("text-align", "center")
            .text("Erreur lors du chargement des données du Sankey");
    });

    // Mise à jour des statistiques
    function updateStats(stats) {
        d3.select("#stat-baisses").text("-" + formatNumber(stats.total_baisses));
        d3.select("#stat-hausses").text("+" + formatNumber(stats.total_hausses));
        d3.select("#stat-net").text("-" + formatNumber(stats.baisse_nette) + " (" + stats.variation_pct + "%)");
    }

})();
