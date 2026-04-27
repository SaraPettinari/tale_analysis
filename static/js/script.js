uploaded_files = null;
let showRobotClouds = true;

function getNumericEdgeValue(label) {
    if (typeof label === 'number') {
        return label;
    }
    else if (typeof label !== 'string') {
        return 0;
    }

    const parsedValue = parseFloat(String(label).replace(/[^0-9.]/g, ''));
    return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function getEdgeWidth(edge) {
    if (edge.width != null) {
        return edge.width;
    }

    const numericValue = getNumericEdgeValue(edge.label);
    if (numericValue <= 0) {
        return 2;
    }

    return Math.min(Math.max(2 + numericValue / 10, 2), 10);
}

function getEdgeStyle(edge) {
    let style = 'stroke-width: ' + getEdgeWidth(edge) + 'px;';

    if (edge.dashes) {
        style += ' stroke-dasharray: 6,4;';
    }

    return style;
}

function getMarkerIdFromPath(pathSelection) {
    const markerUrl = pathSelection.attr('marker-end');
    if (!markerUrl) {
        return null;
    }

    const markerMatch = markerUrl.match(/#([^)]+)\)?$/);
    return markerMatch ? markerMatch[1] : null;
}

function setArrowheadColor(svgGroup, pathSelection, color) {
    const markerId = getMarkerIdFromPath(pathSelection);
    if (!markerId) {
        return;
    }

    svgGroup.select(`#${markerId} path`)
        .style('fill', color)
        .style('stroke', color);
}

function setEdgeColor(svgGroup, pathSelection, color) {
    pathSelection.style('stroke', color);
    setArrowheadColor(svgGroup, pathSelection, color);
}

function resetEdgeStyles(svgGroup) {
    svgGroup.selectAll('g.edgePath path').each(function () {
        setEdgeColor(svgGroup, d3.select(this), '#999');
    });
}

function tuneArrowheads(svgGroup) {
    svgGroup.selectAll('marker')
        .attr('markerUnits', 'userSpaceOnUse')
        .attr('markerWidth', 20)
        .attr('markerHeight', 20)
        .attr('viewBox', '0 0 10 10')
        .attr('refX', 8)
        .attr('refY', 5)
        .attr('orient', 'auto');

    svgGroup.selectAll('marker path')
        .style('fill', '#999')
        .style('stroke', '#999');
}

function renderRobotClouds(svgGroup, g) {
    svgGroup.selectAll('.robot-cloud').remove();

    if (!showRobotClouds) {
        return;
    }

    g.nodes().forEach(function (nodeId) {
        const node = g.node(nodeId);

        if (!node || !node.resources || node.resources.length === 0) {
            return;
        }

        const resourceLabel = node.resources.join(', ');
        const cloudGroup = svgGroup.append('g')
            .attr('class', 'robot-cloud')
            .attr('transform', `translate(${node.x}, ${node.y - (node.height / 2) - 18})`)
            .style('pointer-events', 'none');

        const text = cloudGroup.append('text')
            .attr('class', 'robot-cloud-text')
            .attr('text-anchor', 'middle')
            .attr('dy', '0.35em')
            .text(resourceLabel);

        const textBox = text.node().getBBox();

        cloudGroup.insert('rect', 'text')
            .attr('class', 'robot-cloud-bg')
            .attr('x', textBox.x - 8)
            .attr('y', textBox.y - 4)
            .attr('width', textBox.width + 16)
            .attr('height', textBox.height + 8)
            .attr('rx', 12)
            .attr('ry', 12);
    });
}

function updateRobotToggleButton() {
    const toggleButton = document.getElementById('robot-toggle-button');

    if (!toggleButton) {
        return;
    }

    toggleButton.classList.toggle('active', showRobotClouds);
    toggleButton.setAttribute('aria-pressed', String(showRobotClouds));
    toggleButton.setAttribute('title', showRobotClouds ? 'Hide Robot IDs' : 'Show Robot IDs');
}


function generate_dagre(data) {
    console.log('graph', data)

    var g = new dagre.graphlib.Graph({
        multigraph: true,
        compound: true,
        multiedgesep: 10,
        multiranksep: 60
    });

    // Set an object for the graph label
    g.setGraph({ rankdir: 'LR', nodesep: 40, ranksep: 100 });

    // Default to assigning a new object as a label for each new edge.
    g.setDefaultEdgeLabel(function () { return {}; });

    dagre.layout(g);

    for (n in data.nodes) {
        node = data.nodes[n]
        if (node.label != null) {
            node.label = node.label.replaceAll("_", " ")
            if (node.count) {
                node.label = node.label + "\n(" + node.count + ")"
            }
        }

        console.log(node)
        if (!node.color) {
            node.color = '{background: #e6e3e3e3}'
        }

        g.setNode(node.id, {
            label: node.label,
            labelStyle: "font-size: 20px; text-align: center;",
            color: node.color.background,
            energy_consumption: node.energy_consumption,
            resources: node.resources,
        });
    }

    g.nodes().forEach(function (v) {
        var node = g.node(v);

        node.rx = node.ry = 12;

        node.height = 60;

        if (node.label === 'start') {
            node.shape = 'circle';
            node.r = 30; // Radius of the circle
            node.width = node.height = 30;
        } else if (node.label === 'end') {
            node.shape = 'rect';
            node.width = node.height = 30;
        }
        else {
            node.shape = 'rect';
        }
        node.style = 'fill: ' + node.color;

    });

    for (e in data.edges) {
        edge = data.edges[e]
        edge_label = edge.label

        g.setEdge(edge.from, edge.to, {
            label: edge_label,
            name: edge.from + '-' + edge_label + '-' + edge.to,
            curve: d3.curveBasis,
            style: getEdgeStyle(edge),
            labelpos: 'c', // label position to center
            labeloffset: -15, // y offset to decrease edge-label separation
        })
    }

    console.log('g', g)
    const svg = d3.select('#graph-container').append('svg');
    let currentSvgGroup = svg.append('g');

    let initialZoomState;

    // Create a zoom behavior
    const zoom = d3.zoom().on('zoom', (event) => {
        currentSvgGroup.attr('transform', event.transform);
    });

    // Apply zoom to the SVG container
    svg.call(zoom);

    initialZoomState = d3.zoomTransform(svg.node());


    // Render the graph
    function renderGraph(svgGroup) {
        const render = new dagreD3.render();
        render(svgGroup, g);
        tuneArrowheads(svgGroup);
        renderRobotClouds(svgGroup, g);
        updateRobotToggleButton();
        addOnFunctionalities(svgGroup, g)
        addBatteryBubbles(svgGroup, g);
    }

    renderGraph(currentSvgGroup);

    // Change the graph direction
    d3.select('#toggle-button').on('click', function () {

        const currentDirection = g.graph().rankdir; // Get the current direction

        // Toggle the direction
        const newDirection = currentDirection === 'TB' ? 'LR' : 'TB';

        const currentZoomState = d3.zoomTransform(svg.node());

        // Update the graph with the new direction
        g.setGraph({ rankdir: newDirection, nodesep: 25 });
        dagre.layout(g);


        // Render the updated graph
        svg.selectAll('*').remove(); // Clear the existing SVG content
        currentSvgGroup = svg.append('g');

        // Create a zoom behavior
        const zoomChange = d3.zoom().on('zoom', (event) => {
            currentSvgGroup.attr('transform', event.transform);
        });

        // Apply zoom to the SVG container
        svg.call(zoomChange);

        renderGraph(currentSvgGroup);

    });

    d3.select('#robot-toggle-button').on('click', function () {
        showRobotClouds = !showRobotClouds;
        renderRobotClouds(currentSvgGroup, g);
        updateRobotToggleButton();
    });
}

/**
 * Graph interactions handler
 * @param {*} svgGroup 
 * @param {*} g 
 */
function addOnFunctionalities(svgGroup, g) {
    // Add unique IDs to the edge paths during rendering
    svgGroup.selectAll('g.edgePath path')
        .attr('id', (edgeId) => g.edge(edgeId).name)
        .on('mouseenter', function () {
            setEdgeColor(svgGroup, d3.select(this), '#5001b8');
        })
        .on('mouseleave', function () {
            setEdgeColor(svgGroup, d3.select(this), '#999');
        });

    // Handle double click on nodes
    svgGroup.selectAll('g.node')
        .on('dblclick', function (event, nodeId) {
            // Reset the style of all edges
            event.stopPropagation(); // Prevent click event from triggering as well

            // Reset the style of all edges
            resetEdgeStyles(svgGroup);

            // Highlight outgoing edges from the double-clicked node
            g.outEdges(nodeId).forEach(edge => {
                const edgePath = svgGroup.select(`g.edgePath path[id="${g.edge(edge).name}"]`);
                setEdgeColor(svgGroup, edgePath, '#E55451');
            });
            // Highlight incoming edges from the double-clicked node
            g.inEdges(nodeId).forEach(edge => {
                const edgePath = svgGroup.select(`g.edgePath path[id="${g.edge(edge).name}"]`);
                setEdgeColor(svgGroup, edgePath, 'lightgreen');
            });
        });

    const contextMenu = d3.select('#context-menu');
    const contextMenuOptions = contextMenu.selectAll('.context-menu-option');

    // Handle right-click on nodes to show the context menu
    svgGroup.selectAll('g.node')
        .on('contextmenu', function (event, nodeId) {
            document.getElementById("activity_id").setAttribute("value", nodeId)

            event.preventDefault(); // Prevent the default context menu
            event.stopPropagation(); // Stop propagation to prevent triggering other click events

            // Position the context menu next to the node
            contextMenu.style('left', event.layerX + 5 + 'px');
            contextMenu.style('top', event.layerY + 'px');

            // Show the context menu
            contextMenu.style('display', 'block');
            console.log(contextMenu)

            // Handle context menu option clicks
            contextMenuOptions.on('click', function (optionId) {
                // Perform actions based on the selected option
                var option = optionId.srcElement.id

                option = option.replace('-menu', '')

                // Hide the context menu
                contextMenu.style('display', 'none');

                // Trigger the backend
                document.getElementById(option).setAttribute("value", true)
                console.log(document.getElementById(option))
                document.getElementById("see_" + option + "_graph").click();
            });
        });

    // Hide the context menu on document click
    d3.select(document).on('click', function () {
        contextMenu.style('display', 'none');
        resetEdgeStyles(svgGroup);

    });
}

// TODO fix
function downloadGraph() {
    const svg = d3.select('#graph-container svg');

    // Clone the SVG element
    const clonedSvg = svg.node().cloneNode(true);

    // Append the cloned SVG to the document
    document.body.appendChild(clonedSvg);

    // Download SVG
    const svgData = new XMLSerializer().serializeToString(clonedSvg);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'graph.svg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Remove the cloned SVG from the document
    document.body.removeChild(clonedSvg);
}

function showScatterHandler(responseText) {
    var activity = responseText

    var data = [
        {
            x: activity.x,
            y: activity.y,
            type: 'scatter',
            mode: 'markers'
        }
    ];

    var layout = {
        xaxis: {
            range: [0, 10]
        },
        yaxis: {
            range: [0, 10]
        },
        title: activity
    };

    Plotly.newPlot('scatter', data, layout);
}



function show3DScatter() {
    if (this.responseText) {
        const scatterDiv = document.getElementById("scatter3d");
        scatterDiv.innerHTML = '<object data="gui/scatter3D.html"  width="1400"  height="1400"></object>';
    }
}

function printResponse() {
    if (this.responseText) {
        // Print exported filename
        var response = JSON.parse(this.responseText);
        file_name = response.saved_as;

        var p = document.getElementById("generated_xes_name");
        p.innerHTML = '<div class="banner">  <span class="closebtn" onclick="this.parentElement.style.display=\'none\';">&times;</span> ' +
            "<strong> Your file has been saved as: </strong>" + file_name + "</div>"

    }
}


function showHide(div) {
    var x = document.getElementById(div);
    if (x.style.visibility == 'hidden') {
        x.style.visibility = 'visible';
    } else {
        x.style.visibility = 'hidden';
    }
}

function deleteRow(t) {
    var row = t.parentNode.parentNode.parentNode;
    console.log(row)
    document.getElementById("files-table").deleteRow(row.rowIndex);
}



function checkToggle() {
    var divtoggle = document.getElementById("space_div")
    if (divtoggle != null) {
        const toggle = document.querySelector('.toggle');

        toggle.addEventListener('click', () => {
            console.log('sono qui :)')
        });
    }
}

setInterval(checkToggle, 5000);

function addBatteryBubbles(svgGroup, g) {
    svgGroup.selectAll('g.node').each(function (nodeId) {
        const node = g.node(nodeId);
        console.log('node', node)
        if (node.energy_consumption) {

            let rounded = (node.energy_consumption).toFixed(2);  
            let consumption = parseFloat(rounded);  

            const batteryLevel = consumption || 0; // Default battery % if not provided
            const nodeHeight = node.height || 40;

            // Attach battery to each node's group
            const nodeGroup = d3.select(this);

            const barWidth = 60;
            const barHeight = 10;

            // Background bar (gray)
            nodeGroup.append('rect')
                .attr('x', -barWidth / 2)
                .attr('y', nodeHeight / 2 + 5) // Positioned below the node
                .attr('width', barWidth)
                .attr('height', barHeight)
                .attr('fill', '#ddd')
                .attr('stroke', '#666')
                .attr('rx', 4) // Rounded corners
                .attr('ry', 4)
                .style('filter', 'drop-shadow(1px 1px 2px rgba(0,0,0,0.3))'); // Subtle shadow

            // Battery fill
            nodeGroup.append('rect')
                .attr('x', -barWidth / 2)
                .attr('y', nodeHeight / 2 + 5)
                .attr('width', (barWidth * batteryLevel) / 100)
                .attr('height', barHeight)
                .attr('rx', 4)
                .attr('ry', 4)
                .attr('class', `battery-bar battery-bar-fill ${batteryLevel < 20 ? 'low' : batteryLevel > 60 ? 'high' : 'medium'}`)
                ;

            // % text under the bar
            nodeGroup.append('text')
                .attr('x', 0)
                .attr('y', nodeHeight / 2 + barHeight + 18)
                .attr('text-anchor', 'middle')
                .text(`${batteryLevel}%`);
        }
    });
}
