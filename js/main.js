(function() {
  /*********************************
   * SCATTER PLOT CODE
   *********************************/
  let scatterData = [];
  let currentScatterData = [];

  // Mapping object for friendly axis labels

    const metricLabels = {
      poverty_perc: "Poverty Percentage",
      education_less_than_high_school_percent: "Less Than High School (%)",
      median_household_income: "Median Household Income",
      urban_rural_status: "Urban Rural Status",
      elderly_percentage: "Elderly Percentage",
      number_of_hospitals: "Number of Hospitals",
      number_of_primary_care_physicians: "Number of Primary Care Physicians",
      percent_no_heath_insurance: "Percent No Health Insurance"
      // ... etc.
    };
    
  

  const stateNames = {
    "AL": "Alabama", "AK": "Alaska", "AZ": "Arizona", "AR": "Arkansas",
    "CA": "California", "CO": "Colorado", "CT": "Connecticut", "DE": "Delaware",
    "FL": "Florida", "GA": "Georgia", "HI": "Hawaii", "ID": "Idaho",
    "IL": "Illinois", "IN": "Indiana", "IA": "Iowa", "KS": "Kansas",
    "KY": "Kentucky", "LA": "Louisiana", "ME": "Maine", "MD": "Maryland",
    "MA": "Massachusetts", "MI": "Michigan", "MN": "Minnesota", "MS": "Mississippi",
    "MO": "Missouri", "MT": "Montana", "NE": "Nebraska", "NV": "Nevada",
    "NH": "New Hampshire", "NJ": "New Jersey", "NM": "New Mexico", "NY": "New York",
    "NC": "North Carolina", "ND": "North Dakota", "OH": "Ohio", "OK": "Oklahoma",
    "OR": "Oregon", "PA": "Pennsylvania", "RI": "Rhode Island", "SC": "South Carolina",
    "SD": "South Dakota", "TN": "Tennessee", "TX": "Texas", "UT": "Utah",
    "VT": "Vermont", "VA": "Virginia", "WA": "Washington", "WV": "West Virginia",
    "WI": "Wisconsin", "WY": "Wyoming"
  };

  function parseStateFromDisplayName(name) {
    name = name.replace(/^"|"$/g, '');
    const m = name.match(/\(([^)]+)\)/);
    return m ? m[1].trim().toUpperCase() : null;
  }

  function getRegionFromAbbrev(abbr) {
    if (!abbr) return null;
    const west = ["AK","AZ","CA","HI","ID","MT","NV","NM","OR","UT","WA","WY"],
          ne = ["CT","DE","DC","ME","MD","MA","NH","NJ","NY","PA","PR","RI","VT","VI","VA","WV"],
          mw = ["IL","IN","IA","KS","MI","MN","MO","NE","ND","OH","SD","WI"],
          south = ["AL","AR","GA","KY","LA","MS","NC","SC","TN","VA","WV"];
    if (west.includes(abbr)) return "West";
    if (ne.includes(abbr)) return "Northeast";
    if (mw.includes(abbr)) return "Midwest";
    if (south.includes(abbr)) return "South";
    return null;
  }

  const stateColorScale = d3.scaleOrdinal(d3.schemeCategory10);

  // Load CSV data, then render all charts
  d3.csv("preprocessed_national_health_data.csv").then(data => {
    data.forEach(d => {
      // Convert relevant fields to numbers
      d.poverty_perc = +d.poverty_perc;
      d.education_less_than_high_school_percent = +d.education_less_than_high_school_percent;
      d.median_household_income = +d.median_household_income;
      d.urban_rural_status = +d.urban_rural_status;
      d.elderly_percentage = +d.elderly_percentage;
      d.number_of_hospitals = +d.number_of_hospitals;
      d.number_of_primary_care_physicians = +d.number_of_primary_care_physicians;
      d.percent_no_heath_insurance = +d.percent_no_heath_insurance;

      d.state = parseStateFromDisplayName(d.display_name);
      d.region = getRegionFromAbbrev(d.state);
      if (d.cnty_fips) {
        d.cnty_fips = d.cnty_fips.padStart(5, "0");
      }
    });

    scatterData = data;
    currentScatterData = data;
    renderScatterPlot(scatterData);
    renderMap();
    renderCountyBarChart(data);
  });

  // Region and state filter event listeners
  d3.select("#region-select").on("change", updateScatterPlot);
  d3.select("#state-filter").on("input", updateScatterPlot);

  function updateScatterPlot() {
    const regionSel = d3.select("#region-select").node().value;
    const stateInput = d3.select("#state-filter").node().value.trim().toUpperCase();
    let filtered = (regionSel === "All")
      ? scatterData
      : scatterData.filter(d => d.region === regionSel);

    if (stateInput) {
      filtered = filtered.filter(d => {
        if (stateInput.length === 2) return d.state === stateInput;
        const full = stateNames[d.state] ? stateNames[d.state].toUpperCase() : "";
        return full.includes(stateInput);
      });
    }
    currentScatterData = filtered;
    renderScatterPlot(filtered);
  }

  // Listen for changes in the x-axis and y-axis dropdowns to re-render scatter
  d3.select("#x-axis-select").on("change", function() {
    renderScatterPlot(currentScatterData);
  });
  d3.select("#y-axis-select").on("change", function() {
    renderScatterPlot(currentScatterData);
  });

  function renderScatterPlot(data) {
    d3.select("#scatter-chart").selectAll("*").remove();

    if (!data.length) {
      d3.select("#scatter-chart").append("p")
         .text("No data for this region/state combination.");
      return;
    }

    // Get the selected metrics from the dropdowns
    const xMetric = d3.select("#x-axis-select").property("value") || "poverty_perc";
    const yMetric = d3.select("#y-axis-select").property("value") || "education_less_than_high_school_percent";

    // Look up friendly labels (fallback to raw column name if not found)
    const xLabel = metricLabels[xMetric] || xMetric;
    const yLabel = metricLabels[yMetric] || yMetric;

    // Chart dimensions
    const margin = { top: 40, right: 10, bottom: 60, left: 70 },
          w = 900 - margin.left - margin.right,
          h = 500 - margin.top - margin.bottom;

    const svg = d3.select("#scatter-chart")
      .append("svg")
      .attr("width", w + margin.left + margin.right)
      .attr("height", h + margin.top + margin.bottom);

    const chartArea = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    chartArea.append("defs").append("clipPath")
      .attr("id", "scatterClip")
      .append("rect")
      .attr("width", w)
      .attr("height", h);

    const scatterGroup = chartArea.append("g")
      .attr("clip-path", "url(#scatterClip)");

    // x-scale
    const xVals = data.map(d => d[xMetric]),
          xMin = d3.min(xVals), xMax = d3.max(xVals),
          xBuf = (xMax - xMin) * 0.1;
    const x = d3.scaleLinear()
      .domain([xMin - xBuf, xMax + xBuf])
      .range([0, w]);

    // y-scale
    const yVals = data.map(d => d[yMetric]),
          yMin = d3.min(yVals), yMax = d3.max(yVals),
          yBuf = (yMax - yMin) * 0.1;
    const y = d3.scaleLinear()
      .domain([yMin - yBuf, yMax + yBuf])
      .range([h, 0]);

    // Axes
    const xAxis = d3.axisBottom(x),
          yAxis = d3.axisLeft(y);

    const xAxisGroup = chartArea.append("g")
      .attr("transform", `translate(0,${h})`)
      .call(xAxis);
    const yAxisGroup = chartArea.append("g")
      .call(yAxis);

    const tooltip = d3.select("body").append("div")
      .attr("class", "tooltip");

    scatterGroup.selectAll(".dot")
      .data(data)
      .join("circle")
      .attr("class", "dot")
      .attr("cx", d => x(d[xMetric]))
      .attr("cy", d => y(d[yMetric]))
      .attr("r", 3)
      .attr("fill", d => stateColorScale(d.state))
      .on("mouseover", (event, d) => {
        tooltip.style("opacity", 1).html(d.display_name);
      })
      .on("mousemove", (event) => {
        tooltip.style("left", (event.pageX + 10) + "px")
               .style("top", (event.pageY - 20) + "px");
      })
      .on("mouseout", () => { tooltip.style("opacity", 0); });

    // Axis labels with friendly text
    chartArea.append("text")
      .attr("x", w / 2)
      .attr("y", h + 40)
      .style("text-anchor", "middle")
      .text(xLabel);

    chartArea.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", -50)
      .attr("x", -h / 2)
      .style("text-anchor", "middle")
      .text(yLabel);

    // Zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([1, 10])
      .translateExtent([[0, 0], [w, h]])
      .on("zoom", event => {
        const newX = event.transform.rescaleX(x),
              newY = event.transform.rescaleY(y);
        scatterGroup.selectAll(".dot")
          .attr("cx", d => newX(d[xMetric]))
          .attr("cy", d => newY(d[yMetric]));
        xAxisGroup.call(d3.axisBottom(newX));
        yAxisGroup.call(d3.axisLeft(newY));
      });
    svg.call(zoom);
  }

  /*********************************
   * MAP CODE
   *********************************/
  function renderMap() {
    d3.select("#map-container").selectAll("*").remove();

    const mapWidth = 900,
          mapHeight = 450;
    const svgMap = d3.select("#map-container")
      .append("svg")
      .attr("width", mapWidth)
      .attr("height", mapHeight);

    const tooltipMap = d3.select("body").append("div")
      .attr("class", "tooltip");

    const projection = d3.geoAlbersUsa()
      .translate([mapWidth / 2, mapHeight / 2])
      .scale(500);

    const path = d3.geoPath().projection(projection);

    const mapMetricSelect = d3.select("#map-metric-select");
    let mapMetric = mapMetricSelect.node().value;

    mapMetricSelect.on("change", function() {
      mapMetric = this.value;
      renderMap();
    });

    const colorScalePoverty = d3.scaleSequential(d3.interpolateReds);
    const vibrantBlues = t => {
      let baseColor = d3.hsl(d3.interpolateBlues(t));
      baseColor.s = Math.min(1, baseColor.s * 1.5);
      baseColor.l = baseColor.l * 0.9;
      return baseColor.toString();
    };
    const colorScaleEdu = d3.scaleSequential(vibrantBlues);
    const colorScaleBoth = d3.scaleSequential(d3.interpolatePurples);

    d3.csv("preprocessed_national_health_data.csv").then(csvData => {
      csvData.forEach(d => {
        d.poverty_perc = +d.poverty_perc;
        d.education_less_than_high_school_percent = +d.education_less_than_high_school_percent;
        if (d.cnty_fips) {
          d.cnty_fips = d.cnty_fips.padStart(5, "0");
        }
      });

      const dataLookup = {};
      csvData.forEach(d => { dataLookup[d.cnty_fips] = d; });

      let metricValues, colorScaleUsed;
      if (mapMetric === "education_less_than_high_school_percent") {
        colorScaleUsed = colorScaleEdu;
        metricValues = csvData.map(d => d.education_less_than_high_school_percent)
                             .filter(v => !isNaN(v));
      } else if (mapMetric === "both") {
        colorScaleUsed = colorScaleBoth;
        metricValues = csvData.map(d => (d.poverty_perc + d.education_less_than_high_school_percent) / 2);
      } else {
        colorScaleUsed = colorScalePoverty;
        metricValues = csvData.map(d => d.poverty_perc)
                             .filter(v => !isNaN(v));
      }
      const minVal = d3.min(metricValues),
            maxVal = d3.max(metricValues);
      colorScaleUsed.domain([minVal, maxVal]);

      d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3/counties-10m.json").then(usData => {
        const counties = topojson.feature(usData, usData.objects.counties).features;
        const mapGroup = svgMap.append("g")
          .attr("class", "map-group");

        mapGroup.selectAll("path")
          .data(counties)
          .join("path")
          .attr("d", path)
          .attr("fill", d => {
            const fips = d.id;
            const row = dataLookup[fips];
            if (!row) return "#ccc";
            if (mapMetric === "both") {
              const avg = (row.poverty_perc + row.education_less_than_high_school_percent) / 2;
              return colorScaleUsed(avg);
            } else if (mapMetric === "education_less_than_high_school_percent") {
              return colorScaleUsed(row.education_less_than_high_school_percent);
            } else {
              return colorScaleUsed(row.poverty_perc);
            }
          })
          .attr("stroke", "#999")
          .attr("stroke-width", 0.5)
          .on("mouseover", function(event, d) {
            d3.select(this)
              .transition()
              .duration(200)
              .attr("stroke", "#000")
              .attr("stroke-width", 2);
            this._overlay = mapGroup.append("path")
              .attr("class", "hover-overlay")
              .attr("d", d3.select(this).attr("d"))
              .attr("fill", "rgba(255,255,0,0.3)")
              .attr("pointer-events", "none");
            const fips = d.id;
            const row = dataLookup[fips];
            if (row) {
              if (mapMetric === "both") {
                tooltipMap.style("opacity", 1)
                  .html(`<strong>${row.display_name}</strong><br/>
                         Poverty: ${row.poverty_perc}%<br/>
                         Less Than HS Education: ${row.education_less_than_high_school_percent}%`);
              } else if (mapMetric === "poverty_perc") {
                tooltipMap.style("opacity", 1)
                  .html(`<strong>${row.display_name}</strong><br/>
                         Poverty: ${row.poverty_perc}%`);
              } else {
                tooltipMap.style("opacity", 1)
                  .html(`<strong>${row.display_name}</strong><br/>
                         Less Than HS Education: ${row.education_less_than_high_school_percent}%`);
              }
            }
          })
          .on("mousemove", (event) => {
            tooltipMap.style("left", (event.pageX + 10) + "px")
                      .style("top", (event.pageY - 20) + "px");
          })
          .on("mouseout", function() {
            d3.select(this)
              .transition()
              .duration(200)
              .attr("stroke", "#999")
              .attr("stroke-width", 0.5);
            if (this._overlay) {
              this._overlay.remove();
              this._overlay = null;
            }
            tooltipMap.style("opacity", 0);
          });

        const zoomMap = d3.zoom()
          .scaleExtent([1, 8])
          .translateExtent([[0, 0], [mapWidth, mapHeight]])
          .on("zoom", (event) => {
            mapGroup.attr("transform", event.transform);
          });

        svgMap.call(zoomMap);
      });
    });
  }

  /*********************************
   * COUNTY-LEVEL BAR CHART CODE
   *********************************/
  function renderCountyBarChart(data) {
    // Populate the state dropdown
    const uniqueStates = Array.from(new Set(data.map(d => d.state))).sort();
    const stateSelect = d3.select("#county-state-select");
    stateSelect.selectAll("option.state-option").remove();

    uniqueStates.forEach(state => {
      stateSelect.append("option")
        .attr("class", "state-option")
        .attr("value", state)
        .text(stateNames[state] ? stateNames[state] + " (" + state + ")" : state);
    });

    const metricSelect = d3.select("#county-metric-select");

    function updateCountyBarChart(selectedState, selectedMetric) {
      const filtered = data.filter(d => d.state === selectedState);
      d3.select("#county-bar-chart").html("");

      if (!filtered.length) {
        d3.select("#county-bar-chart")
          .append("p")
          .text("No data available for the selected state.");
        return;
      }

      // Sort data: for "both", sort by sum; otherwise, sort by selected metric
      if (selectedMetric === "both") {
        filtered.sort((a, b) =>
          d3.descending(a.poverty_perc + a.education_less_than_high_school_percent,
                        b.poverty_perc + b.education_less_than_high_school_percent));
      } else {
        filtered.sort((a, b) => d3.descending(a[selectedMetric], b[selectedMetric]));
      }

      // Bar chart dimensions
      const rowHeight = 35;
      const margin = { top: 20, right: 20, bottom: 50, left: 230 },
            width = 900 - margin.left - margin.right,
            height = filtered.length * rowHeight;

      const svg = d3.select("#county-bar-chart")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      // Set x-scale domain based on the metric
      let maxValue;
      if (selectedMetric === "both") {
        maxValue = 30;
      } else {
        maxValue = d3.max(filtered, d => d[selectedMetric]);
      }
      const x = d3.scaleLinear()
        .domain([0, maxValue])
        .range([0, width]);

      const y = d3.scaleBand()
        .domain(filtered.map(d => d.display_name))
        .range([0, height])
        .padding(0.2);

      // Background bars
      svg.selectAll(".bar-bg")
        .data(filtered)
        .enter()
        .append("rect")
        .attr("class", "bar-bg")
        .attr("x", 0)
        .attr("y", d => y(d.display_name))
        .attr("width", x(maxValue))
        .attr("height", y.bandwidth())
        .attr("fill", "#e0e0e0");

      if (selectedMetric === "both") {
        const subY = d3.scaleBand()
          .domain(["poverty", "education"])
          .range([0, y.bandwidth()])
          .paddingInner(0.1);

        const countyGroups = svg.selectAll(".county-group")
          .data(filtered)
          .enter()
          .append("g")
          .attr("class", "county-group")
          .attr("transform", d => `translate(0, ${y(d.display_name)})`);

        // Poverty bar
        countyGroups.append("rect")
          .attr("class", "bar-poverty")
          .attr("x", 0)
          .attr("y", subY("poverty"))
          .attr("width", d => x(Math.min(d.poverty_perc, 30)))
          .attr("height", subY.bandwidth())
          .attr("fill", "#d13b42");

        // Education bar
        countyGroups.append("rect")
          .attr("class", "bar-education")
          .attr("x", 0)
          .attr("y", subY("education"))
          .attr("width", d => x(Math.min(d.education_less_than_high_school_percent, 30)))
          .attr("height", subY.bandwidth())
          .attr("fill", "#46b0d4");

        // Poverty label
        countyGroups.append("text")
          .attr("class", "label-poverty")
          .attr("x", d => x(Math.min(d.poverty_perc, 30)) - 5)
          .attr("y", subY("poverty") + subY.bandwidth() / 2)
          .attr("dy", ".35em")
          .attr("text-anchor", "end")
          .attr("fill", "white")
          .text(d => d.poverty_perc.toFixed(1) + "%");

        // Education label
        countyGroups.append("text")
          .attr("class", "label-education")
          .attr("x", d => x(Math.min(d.education_less_than_high_school_percent, 30)) - 5)
          .attr("y", subY("education") + subY.bandwidth() / 2)
          .attr("dy", ".35em")
          .attr("text-anchor", "end")
          .attr("fill", "white")
          .text(d => d.education_less_than_high_school_percent.toFixed(1) + "%");

      } else {
        // Single metric color logic
        const barColor = selectedMetric === "poverty_perc" ? "#d13b42" : 
                         selectedMetric === "median_household_income" ? "#2ca02c" : 
                         selectedMetric === "education_less_than_high_school_percent" ? "#46b0d4" :
                         selectedMetric === "urban_rural_status" ? "#bcbd22" : 
                         selectedMetric === "elderly_percentage" ? "#17becf" : 
                         selectedMetric === "number_of_hospitals" ? "#aec7e8" : 
                         selectedMetric === "number_of_primary_care_physicians" ? "#ff7f0e" : 
                         selectedMetric === "percent_no_heath_insurance" ? "#c5b0d5" :
                         "#46b0d4"; // fallback

        svg.selectAll(".bar-fg")
          .data(filtered)
          .enter()
          .append("rect")
          .attr("class", "bar-fg")
          .attr("x", 0)
          .attr("y", d => y(d.display_name))
          .attr("width", d => x(Math.min(d[selectedMetric], maxValue)))
          .attr("height", y.bandwidth())
          .attr("fill", barColor);

        svg.selectAll(".label")
          .data(filtered)
          .enter()
          .append("text")
          .attr("class", "label")
          .attr("x", d => x(Math.min(d[selectedMetric], maxValue)) - 5)
          .attr("y", d => y(d.display_name) + y.bandwidth() / 2)
          .attr("dy", ".35em")
          .attr("text-anchor", "end")
          .attr("fill", "white")
          .text(d => d[selectedMetric].toFixed(1) + "%");
      }

      // Y-axis
      svg.append("g")
        .attr("class", "y-axis")
        .call(d3.axisLeft(y));

      svg.append("text")
        .attr("class", "y-axis-label")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left + 10)
        .attr("x", -height / 2)
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .style("font-size", "20px")
        .text("State Counties");

      // X-axis
      svg.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(x));

      svg.append("text")
        .attr("class", "x-axis-label")
        .attr("x", width / 2)
        .attr("y", height + 45)
        .style("text-anchor", "middle")
        .text("Percentage");
    }

    // Event handlers for county bar chart
    stateSelect.on("change", function() {
      const selectedState = this.value;
      const selectedMetric = metricSelect.property("value") || "poverty_perc";
      updateCountyBarChart(selectedState, selectedMetric);
    });

    metricSelect.on("change", function() {
      const selectedMetric = this.value;
      const selectedState = stateSelect.property("value") || uniqueStates[0];
      updateCountyBarChart(selectedState, selectedMetric);
    });

    // Initial bar chart
    if (uniqueStates.length > 0) {
      stateSelect.property("value", uniqueStates[0]);
      const defaultMetric = metricSelect.property("value") || "poverty_perc";
      updateCountyBarChart(uniqueStates[0], defaultMetric);
    }
  }
})();
