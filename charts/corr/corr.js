// Task 3: Correlation heatmap + detail view

const CONFIG = {
    heatmap: {
        margin: { top: 120, right: 20, bottom: 20, left: 180 },
        minCellSize: 6,
        maxCellSize: 14
    },
    topPairsCount: 12,
    scatter: {
        margin: { top: 20, right: 20, bottom: 50, left: 60 }
    }
};

const state = {
    mode: "share",
    selectedCategories: new Set(),
    selectedPair: null
};

const tooltip = d3.select("#corr-tooltip");

d3.json("data/corr_matrix.json").then((data) => {
    const facts = data.facts;
    const factIndex = new Map(facts.map((fact, idx) => [fact, idx]));
    const categories = data.categories;
    const categoryOrder = data.categoryOrder || Object.keys(categories);
    const factCategory = data.factCategory;

    const modeLabels = {
        share: "Part du département",
        raw: "Brut",
        logshare: "Log(1+part)"
    };

    const factsByCategory = {};
    categoryOrder.forEach((catId) => {
        factsByCategory[catId] = [];
    });

    facts.forEach((fact) => {
        const catId = factCategory[fact] || "AUTRES";
        if (!factsByCategory[catId]) {
            factsByCategory[catId] = [];
        }
        factsByCategory[catId].push(fact);
    });

    Object.values(factsByCategory).forEach((list) => {
        list.sort(d3.ascending);
    });

    data.observations.forEach((obs) => {
        const total = d3.sum(obs.values);
        obs.total = total;
        obs.shareValues = obs.values.map((value) => (total ? value / total : 0));
        obs.logshareValues = obs.shareValues.map((value) => Math.log1p(value));
    });

    initControls(data.meta.modes || Object.keys(data.matrices));
    renderAll();

    window.addEventListener("resize", () => {
        renderAll();
    });

    function initControls(modes) {
        const modeSelect = d3.select("#norm-mode");
        modeSelect
            .selectAll("option")
            .data(modes)
            .enter()
            .append("option")
            .attr("value", (d) => d)
            .text((d) => modeLabels[d] || d);

        modeSelect.property("value", state.mode);
        modeSelect.on("change", function () {
            state.mode = this.value;
            renderAll();
        });

        const filters = d3.select("#cat-filters");
        categoryOrder.forEach((catId) => {
            const cat = categories[catId];
            state.selectedCategories.add(catId);
            const label = filters.append("label").attr("class", "cat-chip");
            label
                .append("input")
                .attr("type", "checkbox")
                .attr("value", catId)
                .property("checked", true)
                .on("change", () => updateSelectedCategories());
            label
                .append("span")
                .attr("class", "cat-swatch")
                .style("background", cat.color);
            label.append("span").text(cat.label);
        });

        d3.select("#select-all").on("click", () => {
            d3.selectAll("#cat-filters input").property("checked", true);
            updateSelectedCategories();
        });

        d3.select("#select-none").on("click", () => {
            d3.selectAll("#cat-filters input").property("checked", false);
            updateSelectedCategories();
        });
    }

    function updateSelectedCategories() {
        const next = new Set();
        d3.selectAll("#cat-filters input").each(function () {
            if (this.checked) {
                next.add(this.value);
            }
        });
        state.selectedCategories = next;
        renderAll();
    }

    function getFactsOrdered() {
        const ordered = [];
        categoryOrder.forEach((catId) => {
            if (!state.selectedCategories.has(catId)) {
                return;
            }
            const list = factsByCategory[catId] || [];
            ordered.push(...list);
        });
        return ordered;
    }

    function renderAll() {
        const orderedFacts = getFactsOrdered();
        const topPairs = computeTopPairs(orderedFacts);
        ensureSelectedPair(orderedFacts, topPairs);
        renderHeatmap(orderedFacts);
        renderTopPairs(topPairs);
        renderDetail();
    }

    function computeTopPairs(orderedFacts) {
        const matrix = data.matrices[state.mode];
        const pairs = [];

        for (let i = 0; i < orderedFacts.length; i++) {
            const factA = orderedFacts[i];
            const idxA = factIndex.get(factA);
            for (let j = i + 1; j < orderedFacts.length; j++) {
                const factB = orderedFacts[j];
                const idxB = factIndex.get(factB);
                const corr = matrix[idxA][idxB];
                pairs.push({ a: factA, b: factB, corr });
            }
        }

        pairs.sort((a, b) => Math.abs(b.corr) - Math.abs(a.corr));
        return pairs.slice(0, CONFIG.topPairsCount);
    }

    function ensureSelectedPair(orderedFacts, topPairs) {
        if (!topPairs.length) {
            state.selectedPair = null;
            return;
        }

        if (!state.selectedPair) {
            state.selectedPair = { a: topPairs[0].a, b: topPairs[0].b };
            return;
        }

        const available = new Set(orderedFacts);
        if (!available.has(state.selectedPair.a) || !available.has(state.selectedPair.b)) {
            state.selectedPair = { a: topPairs[0].a, b: topPairs[0].b };
        }
    }

    function renderHeatmap(orderedFacts) {
        const container = d3.select("#corr-heatmap");
        container.selectAll("*").remove();

        if (!orderedFacts.length) {
            container.append("div").attr("class", "empty-state").text("Aucune catégorie sélectionnée.");
            return;
        }

        const matrix = data.matrices[state.mode];
        const n = orderedFacts.length;
        const containerWidth = Math.max(600, container.node().clientWidth || 600);
        const margin = CONFIG.heatmap.margin;
        const cellSize = Math.max(
            CONFIG.heatmap.minCellSize,
            Math.min(CONFIG.heatmap.maxCellSize, Math.floor((containerWidth - margin.left - margin.right) / n))
        );
        const width = margin.left + margin.right + cellSize * n;
        const height = margin.top + margin.bottom + cellSize * n;

        const color = d3.scaleSequential(d3.interpolateRdBu).domain([1, -1]);

        const svg = container
            .append("svg")
            .attr("width", width)
            .attr("height", height);

        const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

        const cellData = [];
        for (let i = 0; i < n; i++) {
            const factA = orderedFacts[i];
            const idxA = factIndex.get(factA);
            for (let j = 0; j < n; j++) {
                const factB = orderedFacts[j];
                const idxB = factIndex.get(factB);
                cellData.push({
                    i,
                    j,
                    a: factA,
                    b: factB,
                    corr: matrix[idxA][idxB]
                });
            }
        }

        const formatCorr = d3.format("+.2f");
        const cells = g
            .selectAll("rect")
            .data(cellData)
            .enter()
            .append("rect")
            .attr("class", (d) => (isSelectedPair(d.a, d.b) ? "cell selected" : "cell"))
            .attr("x", (d) => d.j * cellSize)
            .attr("y", (d) => d.i * cellSize)
            .attr("width", cellSize)
            .attr("height", cellSize)
            .attr("fill", (d) => color(d.corr))
            .on("mouseover", (event, d) => {
                cells.classed("highlight", (c) => c.i === d.i || c.j === d.j);
                xLabels.classed("highlight", (_, idx) => idx === d.j);
                yLabels.classed("highlight", (_, idx) => idx === d.i);
                tooltip
                    .html(
                        `<strong>${d.a}</strong><br>${d.b}<br>Corrélation: ${formatCorr(d.corr)}`
                    )
                    .style("left", `${event.pageX + 12}px`)
                    .style("top", `${event.pageY - 12}px`)
                    .classed("show", true);
            })
            .on("mouseout", () => {
                cells.classed("highlight", false);
                xLabels.classed("highlight", false);
                yLabels.classed("highlight", false);
                tooltip.classed("show", false);
            })
            .on("click", (_, d) => {
                state.selectedPair = { a: d.a, b: d.b };
                renderHeatmap(orderedFacts);
                renderTopPairs(computeTopPairs(orderedFacts));
                renderDetail();
            });

        const labelStep = Math.max(1, Math.ceil(n / 18));

        const yLabels = svg
            .append("g")
            .attr("class", "y-labels")
            .attr("transform", `translate(${margin.left - 6},${margin.top})`)
            .selectAll("text")
            .data(orderedFacts)
            .enter()
            .append("text")
            .attr("class", "axis-label")
            .attr("x", -8)
            .attr("y", (_, i) => i * cellSize + cellSize * 0.7)
            .attr("text-anchor", "end")
            .attr("fill", (d) => categories[factCategory[d]].color)
            .text((d, i) => (i % labelStep === 0 ? truncateLabel(d, 26) : ""));

        const xLabels = svg
            .append("g")
            .attr("class", "x-labels")
            .attr("transform", `translate(${margin.left},${margin.top - 8})`)
            .selectAll("text")
            .data(orderedFacts)
            .enter()
            .append("text")
            .attr("class", "axis-label")
            .attr("transform", (_, i) => `translate(${i * cellSize + cellSize * 0.5},0) rotate(-65)`)
            .attr("text-anchor", "end")
            .attr("fill", (d) => categories[factCategory[d]].color)
            .text((d, i) => (i % labelStep === 0 ? truncateLabel(d, 26) : ""));

        renderLegend(color);
    }

    function renderLegend(color) {
        const legend = d3.select("#corr-legend");
        legend.selectAll("*").remove();

        const label = legend.append("span").text("Corrélation");
        label.style("font-weight", "600");

        const width = 200;
        const height = 10;
        const svg = legend.append("svg").attr("width", width).attr("height", 24);
        const defs = svg.append("defs");
        const gradient = defs
            .append("linearGradient")
            .attr("id", "corr-gradient")
            .attr("x1", "0%")
            .attr("x2", "100%")
            .attr("y1", "0%")
            .attr("y2", "0%");

        gradient.append("stop").attr("offset", "0%").attr("stop-color", color(1));
        gradient.append("stop").attr("offset", "50%").attr("stop-color", color(0));
        gradient.append("stop").attr("offset", "100%").attr("stop-color", color(-1));

        svg.append("rect").attr("width", width).attr("height", height).attr("fill", "url(#corr-gradient)");

        svg
            .append("text")
            .attr("x", 0)
            .attr("y", 22)
            .attr("font-size", 10)
            .text("-1");
        svg
            .append("text")
            .attr("x", width / 2)
            .attr("y", 22)
            .attr("text-anchor", "middle")
            .attr("font-size", 10)
            .text("0");
        svg
            .append("text")
            .attr("x", width)
            .attr("y", 22)
            .attr("text-anchor", "end")
            .attr("font-size", 10)
            .text("+1");
    }

    function renderTopPairs(pairs) {
        const container = d3.select("#corr-top");
        container.selectAll("*").remove();

        if (!pairs.length) {
            container.append("div").attr("class", "empty-state").text("Pas de corrélations à afficher.");
            return;
        }

        const color = d3.scaleSequential(d3.interpolateRdBu).domain([1, -1]);
        const formatCorr = d3.format("+.2f");

        const items = container
            .selectAll(".pair-item")
            .data(pairs, (d) => `${d.a}|${d.b}`)
            .enter()
            .append("div")
            .attr("class", (d) => (isSelectedPair(d.a, d.b) ? "pair-item active" : "pair-item"))
            .on("click", (_, d) => {
                state.selectedPair = { a: d.a, b: d.b };
                renderHeatmap(getFactsOrdered());
                renderTopPairs(pairs);
                renderDetail();
            });

        items.append("span").attr("class", "pair-color").style("background", (d) => color(d.corr));
        items
            .append("span")
            .attr("class", "pair-text")
            .text((d) => `${truncateLabel(d.a, 22)} × ${truncateLabel(d.b, 22)}`);
        items
            .append("span")
            .attr("class", "pair-value")
            .text((d) => formatCorr(d.corr));
    }

    function renderDetail() {
        const container = d3.select("#corr-detail");
        container.selectAll("*").remove();

        if (!state.selectedPair) {
            container.append("div").attr("class", "empty-state").text("Sélectionnez une paire.");
            return;
        }

        const factA = state.selectedPair.a;
        const factB = state.selectedPair.b;
        const idxA = factIndex.get(factA);
        const idxB = factIndex.get(factB);
        const matrix = data.matrices[state.mode];
        const corrValue = matrix[idxA][idxB];

        const formatCorr = d3.format("+.2f");
        const formatValue = state.mode === "raw" ? d3.format(",.0f") : d3.format(".4f");

        const points = data.observations.map((obs) => {
            const source =
                state.mode === "raw" ? obs.values : state.mode === "logshare" ? obs.logshareValues : obs.shareValues;
            return {
                x: source[idxA],
                y: source[idxB],
                dept: obs.dept,
                year: obs.year
            };
        });

        container
            .append("div")
            .attr("class", "pair-info")
            .text(`Corrélation ${formatCorr(corrValue)} • ${factA} × ${factB}`);

        const width = Math.max(320, container.node().clientWidth || 320);
        const innerWidth = width - CONFIG.scatter.margin.left - CONFIG.scatter.margin.right;
        const innerHeight = 260;

        const svg = container
            .append("svg")
            .attr("width", width)
            .attr("height", innerHeight + CONFIG.scatter.margin.top + CONFIG.scatter.margin.bottom);

        const g = svg
            .append("g")
            .attr("transform", `translate(${CONFIG.scatter.margin.left},${CONFIG.scatter.margin.top})`);

        const xDomain = safeExtent(points.map((d) => d.x));
        const yDomain = safeExtent(points.map((d) => d.y));

        const xScale = d3.scaleLinear().domain(xDomain).nice().range([0, innerWidth]);
        const yScale = d3.scaleLinear().domain(yDomain).nice().range([innerHeight, 0]);

        g.append("g")
            .attr("class", "grid")
            .call(d3.axisLeft(yScale).tickSize(-innerWidth).tickFormat(""));

        g.append("g")
            .attr("class", "axis")
            .attr("transform", `translate(0,${innerHeight})`)
            .call(d3.axisBottom(xScale).ticks(5));

        g.append("g").attr("class", "axis").call(d3.axisLeft(yScale).ticks(5));

        g.append("text")
            .attr("class", "axis-label")
            .attr("x", innerWidth / 2)
            .attr("y", innerHeight + 36)
            .attr("text-anchor", "middle")
            .text(truncateLabel(factA, 32));

        g.append("text")
            .attr("class", "axis-label")
            .attr("transform", "rotate(-90)")
            .attr("x", -innerHeight / 2)
            .attr("y", -42)
            .attr("text-anchor", "middle")
            .text(truncateLabel(factB, 32));

        g.selectAll("circle")
            .data(points)
            .enter()
            .append("circle")
            .attr("cx", (d) => xScale(d.x))
            .attr("cy", (d) => yScale(d.y))
            .attr("r", 3)
            .attr("fill", "#3498db")
            .attr("opacity", 0.55)
            .on("mouseover", (event, d) => {
                tooltip
                    .html(
                        `Département: ${d.dept}<br>Année: ${d.year}<br>${factA}: ${formatValue(
                            d.x
                        )}<br>${factB}: ${formatValue(d.y)}`
                    )
                    .style("left", `${event.pageX + 12}px`)
                    .style("top", `${event.pageY - 12}px`)
                    .classed("show", true);
            })
            .on("mouseout", () => {
                tooltip.classed("show", false);
            });

        drawRegressionLine(points, xScale, yScale, g);
    }

    function drawRegressionLine(points, xScale, yScale, container) {
        const n = points.length;
        if (!n) {
            return;
        }

        let sumX = 0;
        let sumY = 0;
        points.forEach((p) => {
            sumX += p.x;
            sumY += p.y;
        });
        const meanX = sumX / n;
        const meanY = sumY / n;

        let numerator = 0;
        let denominator = 0;
        points.forEach((p) => {
            const dx = p.x - meanX;
            numerator += dx * (p.y - meanY);
            denominator += dx * dx;
        });

        if (denominator === 0) {
            return;
        }

        const slope = numerator / denominator;
        const intercept = meanY - slope * meanX;
        const xExtent = xScale.domain();
        const yStart = intercept + slope * xExtent[0];
        const yEnd = intercept + slope * xExtent[1];

        container
            .append("line")
            .attr("x1", xScale(xExtent[0]))
            .attr("y1", yScale(yStart))
            .attr("x2", xScale(xExtent[1]))
            .attr("y2", yScale(yEnd))
            .attr("stroke", "#2c3e50")
            .attr("stroke-width", 1)
            .attr("opacity", 0.7);
    }

    function isSelectedPair(a, b) {
        if (!state.selectedPair) {
            return false;
        }
        const sa = state.selectedPair.a;
        const sb = state.selectedPair.b;
        return (a === sa && b === sb) || (a === sb && b === sa);
    }

    function truncateLabel(label, maxLength) {
        if (label.length <= maxLength) {
            return label;
        }
        return `${label.slice(0, maxLength - 3)}...`;
    }

    function safeExtent(values) {
        let min = d3.min(values);
        let max = d3.max(values);
        if (min === max) {
            const padding = min === 0 ? 1 : Math.abs(min * 0.1);
            min -= padding;
            max += padding;
        }
        return [min, max];
    }
}).catch((error) => {
    console.error("Erreur lors du chargement des données:", error);
    d3.select("#corr-heatmap").html('<div class="empty-state">Erreur de chargement des données</div>');
});
