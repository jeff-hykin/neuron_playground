import colors from "./colors.js"
import { lightenColor, interpolateColor } from "./colors.js"
// import { randomNormal } from 'https://esm.sh/gh/jeff-hykin/good-js@1.14.7.0/source/flattened/random_normal.js'
import { randomNormal } from 'https://esm.sh/gh/jeff-hykin/good-js@42aa6e1/source/flattened/random_normal.js'
import { showErrorToast } from "../imports/good_component.js"

const { red, blue, orange, yellow, purple, green, white, black, gray } = colors

function energyToHue(energy) {
    // Clamp energy between 0 and 1
    const clampedEnergy = Math.max(0, Math.min(1, energy / 0.9))

    // Interpolate between red and blue based on energy
    return interpolateColor(blue, red, clampedEnergy)
}

// Utility function to calculate the distance from a point to a line segment
function pointToSegmentDistance(point, v, w) {
    const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2
    if (l2 === 0) return Math.hypot(point.x - v.x, point.y - v.y)
    let t = ((point.x - v.x) * (w.x - v.x) + (point.y - v.y) * (w.y - v.y)) / l2
    t = Math.max(0, Math.min(1, t))
    const projection = { x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y) }
    return Math.hypot(point.x - projection.x, point.y - projection.y)
}

function drawArrowhead({ ctx, x, y, angle, size, thickness, color = black }) {
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x - size * Math.cos(angle - Math.PI / 6), y - size * Math.sin(angle - Math.PI / 6))
    ctx.lineTo(x - size * Math.cos(angle + Math.PI / 6), y - size * Math.sin(angle + Math.PI / 6))
    ctx.lineTo(x, y)
    ctx.closePath()
    ctx.strokeStyle = color
    ctx.fillStyle = color
    ctx.lineWidth = thickness
    ctx.fill()
    ctx.stroke()
}

function drawArcThroughPoints(ctx, x1, y1, x2, y2, x3, y3) {
    // Calculate the midpoints of the lines
    const midX1 = (x1 + x2) / 2
    const midY1 = (y1 + y2) / 2
    const midX2 = (x2 + x3) / 2
    const midY2 = (y2 + y3) / 2

    // Calculate the slopes of the lines
    const slope1 = (y2 - y1) / (x2 - x1)
    const slope2 = (y3 - y2) / (x3 - x2)

    // Calculate the perpendicular slopes
    const perpSlope1 = -1 / slope1
    const perpSlope2 = -1 / slope2

    // Calculate the center of the circle (circumcenter)
    const centerX = (perpSlope1 * midX1 - perpSlope2 * midX2 + midY2 - midY1) / (perpSlope1 - perpSlope2)
    const centerY = perpSlope1 * (centerX - midX1) + midY1

    // Calculate the radius
    const radius = Math.hypot(centerX - x1, centerY - y1)

    // Calculate start and end angles
    const startAngle = Math.atan2(y1 - centerY, x1 - centerX)
    const endAngle = Math.atan2(y3 - centerY, x3 - centerX)

    // Draw the arc
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, startAngle, endAngle)
    ctx.stroke()
}

// Helper function to interpolate color based on edge strength
function strengthToColor(strength) {
    if (strength < -1) {
        return strength = -1
    }
    if (strength > 1) {
        return strength = 1
    }
    if (strength <= 0) {
        return interpolateColor(red, blue, (strength + 1) ** 2 / 1)
    } else {
        return interpolateColor(green, blue, 1 - strength)
    }
}

/**
 * Represents a network of nodes and edges.
 * @class
 */
class NodeNetwork {
    /**
     * Creates an instance of NodeNetwork.
     * @param {Object} params - The parameters for the network.
     * @param {Object} params.defaultNodeData - Default data for nodes.
     * @param {number} params.defaultNodeData.spikeThreshold - The energy level a node must reach to trigger a spike. Example: 1.
     * @param {number} params.defaultNodeData.energy - The current energy level of the node. Example: 0.1.
     * @param {number} params.defaultNodeData.energyDecayRate - The rate at which a node's energy decreases over time if it is not firing. Example: 0.1.
     * @param {boolean} params.defaultNodeData.isFiringNext - A flag indicating whether the node is set to fire in the next cycle. Example: false.
     * @param {number} params.defaultNodeData.stableEnergyLevel - The minimum energy level a node can have due to decay. Example: 0.1.
     * @param {number} params.defaultNodeData.energyAfterFiring - The energy level a node is set to after it fires. Example: 0.
     * @param {Object} params.defaultEdgeData - Default data for edges.
     */
    constructor({ defaultNodeData = {
        pulse: false,
        spikeThreshold: 1,
        energy: 0.1,
        energyDecayRate: 0.1,
        isFiringNext: false,
        stableEnergyLevel: 0.1,
        energyAfterFiring: 0,
        radius: 25,
    }, defaultEdgeData={
        edgeStrength: 1,
        strengthNoiseParameters: {
            mean: 0,
            std: 0.1,
        },
    } }) {
        this.nodes = []
        this.edges = []
        this.defaultNodeData = defaultNodeData
        this.defaultEdgeData = defaultEdgeData
        this.stateBuffer = [] // Buffer to store the last 100 states
    }

    saveState() {
        const state = {
            nodes: this.nodes.map(node => ({ ...node })),
            edges: this.edges.map(edge => ({ ...edge })),
        }
        this.stateBuffer.push(state)
        if (this.stateBuffer.length > 100) {
            this.stateBuffer.shift() // Remove the oldest state if buffer exceeds 100
        }
    }

    back() {
        if (this.stateBuffer.length > 0) {
            const previousState = this.stateBuffer.pop()
            this.nodes = previousState.nodes
            this.edges = previousState.edges
        }
    }

    /**
     * Creates a new node in the network.
     * @param {Object} nodeData - The data for the new node.
     * @param {number} nodeData.x - The x-coordinate of the node.
     * @param {number} nodeData.y - The y-coordinate of the node.
     * @param {number} [nodeData.spikeThreshold=1] - The energy level a node must reach to trigger a spike.
     * @param {number} [nodeData.energy=0.1] - The current energy level of the node.
     * @param {number} [nodeData.energyDecayRate=0.1] - The rate at which a node's energy decreases over time if it is not firing.
     * @param {boolean} [nodeData.isFiringNext=false] - A flag indicating whether the node is set to fire in the next cycle.
     * @param {number} [nodeData.stableEnergyLevel=0.1] - The minimum energy level a node can have due to decay.
     * @param {number} [nodeData.energyAfterFiring=0] - The energy level a node is set to after it fires.
     * @param {Object} [nodeData.other] - Additional data for the node.
     * @returns {string} The ID of the newly created node.
     */
    newNode({ x, y, ...other }) {
        const id = Date.now().toString()
        this.nodes.push({
            x,
            y,
            id,
            ...this.defaultNodeData,
            ...other,
        })
        return id
    }

    /**
     * Creates a new edge between two nodes.
     * @param {Object} edgeData - The data for the new edge.
     * @param {string} edgeData.fromId - The ID of the starting node.
     * @param {string} edgeData.toId - The ID of the ending node.
     * @param {number} [edgeData.strength=1] - The strength of the edge.
     * @returns {string} The ID of the newly created edge.
     */
    newEdge({ fromId, toId, strength = 1 }) {
        const edgeId = `${fromId}-${toId}`
        this.edges.push({
            id: `${fromId}-${toId}`,
            from: fromId,
            to: toId,
            strength: strength,
            ...this.defaultEdgeData,
        })
        return edgeId
    }

    manuallySpike(nodeId) {
        const node = this.nodes.find(node => node.id === nodeId)
        if (node) {
            node.energy = node.spikeThreshold
            node.isFiringNext = true
        }
    }

    next() {
        this.saveState() // Save the current state before proceeding
        const amountToAddForEach = {}

        // Collect energy from fired nodes
        for (let eachNode of this.nodes) {
            if (eachNode.isFiringNext) {
                for (const edge of this.edges) {
                    if (edge.from === eachNode.id) {
                        const targetNode = this.nodes.find(node => node.id === edge.to)
                        if (targetNode) {
                            amountToAddForEach[targetNode.id] = amountToAddForEach[targetNode.id] || 0
                            let strength = edge.strength 
                            if (edge.strengthNoiseParameters) {
                                const noise = randomNormal(edge.strengthNoiseParameters)
                                strength += noise
                            }
                            amountToAddForEach[targetNode.id] += strength
                        }
                    }
                }
            }
        }

        // Reset nodes that just fired
        for (let eachNode of this.nodes) {
            if (eachNode.isFiringNext) {
                eachNode.energy = eachNode.energyAfterFiring
                eachNode.isFiringNext = false
            }
        }

        // Add the amountToAddForEach to the nodes
        for (const [key, value] of Object.entries(amountToAddForEach)) {
            const node = this.nodes.find(node => node.id === key)
            if (node) {
                node.energy += value
            }
        }

        // Discover what new nodes are firing
        for (let eachNode of this.nodes) {
            if (eachNode.energy >= eachNode.spikeThreshold) {
                eachNode.isFiringNext = true
            }
        }

        // Account for decay
        for (let eachNode of this.nodes) {
            if (!eachNode.isFiringNext) {
                eachNode.energy -= eachNode.energyDecayRate
                if (eachNode.energy < eachNode.stableEnergyLevel) {
                    eachNode.energy = eachNode.stableEnergyLevel
                }
            }
        }
    }

    load(data) {
        // 
        // validation
        // 
            if (!(data.nodes instanceof Array) || !(data.edges instanceof Array)) {
                throw new Error("Invalid data format. Expected an object with 'nodes' and 'edges' properties that are both arrays.")
            }
            if (data.nodes.length == 0) {
                throw new Error("Invalid data format. Expected at least one node.")
            }

            // detect and support old format (TODO: eventually remove once all the examples are updated)
            if (data.nodes.some(each=>each instanceof Array) || data.edges.some(each=>each instanceof Array)) {
                if (data.nodes.every(each=>each instanceof Array) && data.edges.every(each=>each instanceof Array)) {
                    data.nodes = data.nodes.map(each=>each[1])
                    data.edges = data.edges.map(each=>each[1])
                }
            }

            const warnings = []
            const nodeIds = new Set()
            const edgeIds = new Set()

            // Check for duplicate node IDs
            for (let index = 0; index < data.nodes.length; index++) {
                const node = data.nodes[index]
                if (nodeIds.has(node.id)) {
                    warnings.push(`Duplicate node ID '${node.id}' found at index ${index}`)
                } else {
                    nodeIds.add(node.id)
                }
            }

            // Check for duplicate edge IDs
            for (let index = 0; index < data.edges.length; index++) {
                const edge = data.edges[index]
                const edgeId = `${edge.from}-${edge.to}`
                if (edgeIds.has(edgeId)) {
                    warnings.push(`Duplicate edge ID '${edgeId}' found at index ${index}`)
                } else {
                    edgeIds.add(edgeId)
                }
            }

        // Clear existing nodes and edges
        this.nodes.length = 0
        this.edges.length = 0

        // Load new nodes and edges from the provided data
        for (const nodeData of data.nodes) {
            this.nodes.push({ ...this.defaultNodeData, ...nodeData })
        }

        for (const edgeData of data.edges) {
            this.edges.push(edgeData)
        }

        return warnings
    }
}

export default class InfiniteCanvas {
    /**
     * @param {Object} options - Configuration options for the canvas.
     * @param {Function} [options.onNodeHovered] - Callback function to be called when a node is hovered.
     */
    constructor({ onNodeHovered } = {}) {
        // 
        // configurable data
        // 
        this.edgeThickness = 5
        this.dragThreshold = 5
        this.scaleMin = 0.1
        this.scaleMax = 5
        this.scaleFactorIncrease = 1.01
        this.scaleFactorDecrease = 0.99
        this.pulseDuration = 200
        this.strokeStyleEdge = gray
        this.strokeStyleNormal = black
        this.strokeStylePulse = lightenColor(red, 0.3)
        this.strokeStyleEdgeCreation = blue
        this.strokeWidthNormal = 2
        this.strokeWidthPulse = 4
        this.defaultEdgeStrength = 1
        this.arrowLength = 15 // Increased length of the arrowhead
        this.arrowWidth = 8 // Increased width of the arrowhead
        this.normalColor = black // Black for normal state
        this.strokeStyleIncomingEdge = red // Red for incoming edges
        this.strokeStyleOutgoingEdge = blue // Blue for outgoing edges
        
        // core data
        this.nodeNetwork = new NodeNetwork({})
        
        // internal state
        this.selectedNode = null
        this.draggingNode = null
        this.edgeStartNode = null // Track the first node when creating an edge
        this.offset = { x: 0, y: 0 }
        this.scale = 1
        this.isDragging = false
        this.dragStartPos = null
        this.isPanning = false
        this.panStartPos = null
        this.mouseDownInfo = null // Shared variable to store mouse down event info
        this.lastHoveredNodeId = null // Track the last-hovered node
        this.onNodeHovered = onNodeHovered // Callback for node hover
        
        this.internalParameters = {
            selfEdgeStartAngle: -2.807285748448284,
            selfEdgeEndAngle: 1.7585218457865455,
        }
        
        // Canvas
        this.element = document.createElement("canvas")
        this.ctx = this.element.getContext("2d")
        this.resizeCanvas()
        window.addEventListener("resize", () => this.resizeCanvas())

        // Event listeners
        this.element.addEventListener("mousedown", this.handleMouseDown.bind(this))
        this.element.addEventListener("mousemove", this.handleMouseMove.bind(this))
        this.element.addEventListener("mouseup", this.handleMouseUp.bind(this))
        this.element.addEventListener("wheel", this.handleWheel.bind(this))
        this.element.addEventListener("contextmenu", this.handleContextMenu.bind(this))

        // Animation frame
        this.animate()
    }

    resizeCanvas() {
        const ratio = window.devicePixelRatio || 1;
        this.element.width = window.innerWidth * ratio;
        this.element.height = window.innerHeight * ratio;
        this.element.style.width = window.innerWidth + 'px';
        this.element.style.height = window.innerHeight + 'px';
        this.ctx.scale(ratio, ratio);
    }

    handleMouseDown(event) {
        const shiftWasPressed = event.shiftKey
        const isRightClick = event.button === 2
        const pos = this.getMousePos(event)
        const hoveredNodeId = this.findNodeIdAtPosition(pos)
        const hoveredEdgeId = this.findEdgeAtPosition(pos)
        this.mouseDownInfo = {
            shiftWasPressed,
            isRightClick,
            pos,
            hoveredNodeId,
            hoveredEdgeId,
        }

        // right-click is handled by contextmenu (don't use it for panning)
        if (isRightClick) {
            return
        }

        if (hoveredNodeId) {
            if (event.shiftKey) {
                // Edge creation mode with shift
                if (this.edgeStartNode === null) {
                    // First shift-click - start edge creation
                    this.edgeStartNode = hoveredNodeId
                } else {
                    // Second shift-click - create edge
                    this.nodeNetwork.newEdge({ fromId: this.edgeStartNode, toId: hoveredNodeId, })
                    this.edgeStartNode = null
                }
            } else {
                // Normal click - pulse and start potential drag
                this.draggingNode = hoveredNodeId
                this.isDragging = false
                this.dragStartPos = pos
            }
        } else if (hoveredEdgeId) {
            const edge = this.nodeNetwork.edges.find(e => e.from === hoveredEdgeId.split('-')[0] && e.to === hoveredEdgeId.split('-')[1])
            const newStrength = parseFloat(globalThis.prompt(`Edge weight: ${edge.strength}\nPress okay to acknowledge, or enter replacement value`))
            // if is number
            if (newStrength - 0 === newStrength) {
                edge.strength = newStrength
            }
        } else {
            // Start panning
            this.isPanning = true
            this.panStartPos = { x: event.clientX, y: event.clientY }
        }
    }

    handleMouseMove(e) {
        const pos = this.getMousePos(e)
        const hoveredNodeId = this.findNodeIdAtPosition(pos)
        if (hoveredNodeId !== this.lastHoveredNodeId) {
            this.lastHoveredNodeId = hoveredNodeId || this.lastHoveredNodeId
            if (this.lastHoveredNodeId && this.onNodeHovered) {
                const node = this.nodeNetwork.nodes.find(n => n.id === this.lastHoveredNodeId)
                if (node) {
                    this.onNodeHovered(node)
                }
            }
        }

        if (this.draggingNode) {
            // Only start dragging if mouse has moved a bit
            if (!this.isDragging) {
                const dx = pos.x - this.dragStartPos.x
                const dy = pos.y - this.dragStartPos.y
                if (dx * dx + dy * dy > this.dragThreshold) {
                    // Small threshold to start drag
                    this.isDragging = true
                }
            }

            if (this.isDragging) {
                const nodeData = this.nodeNetwork.nodes.find(n => n.id === this.draggingNode)
                nodeData.x = pos.x
                nodeData.y = pos.y
            }
        } else if (this.isPanning) {
            // Calculate the offset change
            const dx = e.clientX - this.panStartPos.x
            const dy = e.clientY - this.panStartPos.y

            // Update the offset
            this.offset.x += dx
            this.offset.y += dy

            // Update the start position
            this.panStartPos = { x: e.clientX, y: e.clientY }

            // Redraw the canvas
            this.draw()
        }
    }

    handleMouseUp(e) {
        const mouseDownInfo = this.mouseDownInfo
        this.mouseDownInfo = null // Clear the shared variable

        if (!this.isDragging && mouseDownInfo) {
            const wasNormalNodeClick = mouseDownInfo.hoveredNodeId && !mouseDownInfo.shiftWasPressed
            if (wasNormalNodeClick) {
                const nodeId = mouseDownInfo.hoveredNodeId
                // Manually spike the node if it was not dragged
                this.nodeNetwork.manuallySpike(nodeId)
            }
        }
        this.draggingNode = null
        this.isDragging = false
        this.isPanning = false
        this.dragStartPos = null
        this.panStartPos = null
    }

    handleWheel(e) {
        e.preventDefault()
        const delta = e.deltaY
        const scaleFactor = delta > 0 ? this.scaleFactorDecrease : this.scaleFactorIncrease

        // Calculate the center of the canvas, accounting for devicePixelRatio
        const ratio = window.devicePixelRatio || 1
        const centerX = (this.element.width / 2 / ratio - this.offset.x) / this.scale
        const centerY = (this.element.height / 2 / ratio - this.offset.y) / this.scale

        // Apply the scale
        this.scale *= scaleFactor
        this.scale = Math.max(this.scaleMin, Math.min(this.scaleMax, this.scale))

        // Adjust the offset to keep the center in place
        this.offset.x = this.element.width / 2 / ratio - centerX * this.scale
        this.offset.y = this.element.height / 2 / ratio - centerY * this.scale
    }

    handleContextMenu(e) {
        e.preventDefault()
        const pos = this.getMousePos(e)
        this.nodeNetwork.newNode({ x: pos.x, y: pos.y, defaultNodeData: this.defaultNodeData })
    }

    getMousePos(e) {
        const rect = this.element.getBoundingClientRect()
        return {
            x: (e.clientX - rect.left - this.offset.x) / this.scale,
            y: (e.clientY - rect.top - this.offset.y) / this.scale,
        }
    }

    findNodeIdAtPosition(pos) {
        for (const node of this.nodeNetwork.nodes) {
            const dx = pos.x - node.x
            const dy = pos.y - node.y
            if (dx * dx + dy * dy <= node.radius * node.radius) {
                return node.id
            }
        }
        return null
    }

    findEdgeAtPosition(pos) {
        const threshold = this.edgeThickness * 1.3
        for (const edge of this.nodeNetwork.edges) {
            const fromNode = this.nodeNetwork.nodes.find(node => node.id === edge.from)
            const toNode = this.nodeNetwork.nodes.find(node => node.id === edge.to)

            if (edge.from === edge.to) {
                // Self-edge as an arc
                const node = this.nodeNetwork.nodes.find(node => node.id === edge.from)
                const centerX = node.x + node.radius
                const centerY = node.y - node.radius
                const radius = node.radius
                const startAngle = this.internalParameters.selfEdgeStartAngle
                const endAngle = this.internalParameters.selfEdgeEndAngle

                // Calculate the angle of the point relative to the arc's center
                const angle = Math.atan2(pos.y - centerY, pos.x - centerX)

                // Check if the point is within the arc's angle range
                if (angle >= startAngle && angle <= endAngle) {
                    // Calculate the distance from the point to the arc's center
                    const distToCenter = Math.hypot(pos.x - centerX, pos.y - centerY)

                    // Check if the distance is close to the arc's radius
                    if (Math.abs(distToCenter - radius) < threshold) {
                        return `${edge.from}-${edge.to}`
                    }
                }
            } else {
                // Normal edge as a line
                const dist = pointToSegmentDistance(pos, { x: fromNode.x, y: fromNode.y }, { x: toNode.x, y: toNode.y })
                if (dist < threshold) {
                    return `${edge.from}-${edge.to}`
                }
            }
        }
        return null
    }

    draw() {
        this.ctx.clearRect(0, 0, this.element.width, this.element.height)

        // Apply transformations
        this.ctx.save()
        this.ctx.translate(this.offset.x, this.offset.y)
        this.ctx.scale(this.scale, this.scale)

        // Draw edges for the last-hovered node
        if (this.lastHoveredNodeId) {
            for (const edge of this.nodeNetwork.edges) {
                const fromNode = this.nodeNetwork.nodes.find(node => node.id === edge.from)
                const toNode = this.nodeNetwork.nodes.find(node => node.id === edge.to)

                if (edge.from === edge.to) {
                    if (this.lastHoveredNodeId === edge.from) {
                        this.ctx.beginPath()
                        const node = this.nodeNetwork.nodes.find(node => node.id === edge.from)
                        const [x, y] = [node.x + node.radius, node.y - node.radius]
                        this.ctx.arc(x, y, node.radius, this.internalParameters.selfEdgeStartAngle, this.internalParameters.selfEdgeEndAngle)
                        this.ctx.lineWidth = this.edgeThickness
                        this.ctx.strokeStyle = strengthToColor(edge.strength)
                        this.ctx.stroke()

                        drawArrowhead({
                            ctx: this.ctx,
                            x: node.x + node.radius * 0.5,
                            y: node.y - node.radius * 1.55,
                            angle: -0.4 + Math.PI * 2,
                            size: this.arrowLength,
                            thickness: this.edgeThickness * 0.5,
                            color: strengthToColor(edge.strength),
                        })
                    }
                } else if (edge.from === this.lastHoveredNodeId || edge.to === this.lastHoveredNodeId) {
                    // Normal edge drawing
                    this.ctx.beginPath()
                    this.ctx.moveTo(fromNode.x, fromNode.y)
                    this.ctx.lineTo(toNode.x, toNode.y)
                    this.ctx.strokeStyle = strengthToColor(edge.strength)
                    this.ctx.lineWidth = this.edgeThickness
                    this.ctx.stroke()

                    // Draw arrowhead
                    const angle = Math.atan2(toNode.y - fromNode.y, toNode.x - fromNode.x)
                    const arrowStartX = toNode.x - toNode.radius * 1.1 * Math.cos(angle)
                    const arrowStartY = toNode.y - toNode.radius * 1.1 * Math.sin(angle)

                    drawArrowhead({
                        ctx: this.ctx,
                        x: arrowStartX,
                        y: arrowStartY,
                        angle: angle,
                        size: this.arrowLength,
                        thickness: this.edgeThickness,
                        color: strengthToColor(edge.strength),
                    })
                }
            }
        }

        // Draw nodes
        for (const node of this.nodeNetwork.nodes) {
            this.ctx.beginPath()
            this.ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2)
            this.ctx.fillStyle = node.color || energyToHue(node.energy) // Set fill color based on energy
            this.ctx.fill()

            // Determine node border color based on state
            if (node.id === this.edgeStartNode) {
                this.ctx.strokeStyle = this.strokeStyleEdgeCreation
            } else if (node.pulse) {
                this.ctx.strokeStyle = this.strokeStylePulse
                // briefly override fill color to show pulse
                this.ctx.fillStyle = energyToHue(node.energy)
            } else {
                this.ctx.strokeStyle = this.strokeStyleNormal
            }

            this.ctx.lineWidth = node.pulse ? this.strokeWidthPulse : this.strokeWidthNormal
            this.ctx.stroke()
        }

        this.ctx.restore()
    }

    animate() {
        this.draw()
        requestAnimationFrame(() => this.animate())
    }

    saveToJSON() {
        return JSON.stringify({
            nodes: this.nodeNetwork.nodes.map(node => ({ ...node })),
            edges: this.nodeNetwork.edges.map(edge => ({ ...edge })),
        })
    }

    load(data) {
        let stuffToReport = []
        try {
            const stuffToReport = this.nodeNetwork.load(data)
        } catch (error) {
            stuffToReport = [error?.stack||error.message]
        }
        for (let each of stuffToReport) {
            showErrorToast(each)
            console.debug(`data is:`,data)
        }
    }

    next() {
        this.nodeNetwork.next()
        this.draw()
    }
}
