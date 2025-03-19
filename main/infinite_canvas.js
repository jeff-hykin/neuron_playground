function energyToHue(energy) {
    // Clamp energy between 0 and 1
    const clampedEnergy = Math.max(0, Math.min(1, energy))

    // Map energy to a hue value (240 = blue, 0 = red)
    const hue = 240 - clampedEnergy * 240

    // Return the HSL color string
    return `hsl(${hue}, 100%, 50%)`
}

export default class InfiniteCanvas {
    constructor() {
        this.nodes = new Map()
        this.edges = new Map()
        this.selectedNode = null
        this.draggingNode = null
        this.edgeStartNode = null // Track the first node when creating an edge
        this.offset = { x: 0, y: 0 }
        this.scale = 1
        this.nodeRadius = 25
        this.edgeStrength = 1
        this.isDragging = false
        this.dragStartPos = null
        this.isPanning = false
        this.panStartPos = null

        // Colors
        this.pulseColor = "#ffcccb" // Light red for pulse
        this.edgeCreationColor = "#0066ff" // Blue for edge creation
        this.normalColor = "#000000" // Black for normal state

        // Create canvas and context
        this.element = document.createElement("canvas")
        this.ctx = this.element.getContext("2d")

        // Set canvas size
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
        this.element.width = window.innerWidth
        this.element.height = window.innerHeight
    }

    handleMouseDown(e) {
        const isRightClick = e.button === 2
        // right-click is handled by contextmenu (don't use it for panning)
        if (isRightClick) {
            return
        }
        
        const pos = this.getMousePos(e)
        const nodeId = this.findNodeIdAtPosition(pos)

        if (nodeId) {
            if (e.shiftKey) {
                // Edge creation mode with shift
                if (this.edgeStartNode === null) {
                    // First shift-click - start edge creation
                    this.edgeStartNode = nodeId
                } else if (this.edgeStartNode !== nodeId) {
                    // Second shift-click - create edge
                    this.createEdge(this.edgeStartNode, nodeId)
                    this.edgeStartNode = null
                }
            } else {
                // Normal click - pulse and start potential drag
                this.draggingNode = nodeId
                this.isDragging = false
                this.dragStartPos = pos

                // Pulse effect
                this.pulseNode(this.nodes.get(nodeId))
            }
        } else {
            // Start panning
            this.isPanning = true
            this.panStartPos = { x: e.clientX, y: e.clientY }
        }
    }

    handleMouseMove(e) {
        const pos = this.getMousePos(e)

        if (this.draggingNode) {
            // Only start dragging if mouse has moved a bit
            if (!this.isDragging) {
                const dx = pos.x - this.dragStartPos.x
                const dy = pos.y - this.dragStartPos.y
                if (dx * dx + dy * dy > 5) {
                    // Small threshold to start drag
                    this.isDragging = true
                }
            }

            if (this.isDragging) {
                const nodeData = this.nodes.get(this.draggingNode)
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
        if (!this.isDragging && !e.shiftKey) {
            const pos = this.getMousePos(e)
            const node = this.findNodeIdAtPosition(pos)
            if (!node) {
                // Clicked on empty space - cancel edge creation
                this.edgeStartNode = null
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
        const scaleFactor = delta > 0 ? 0.9 : 1.1
        this.scale *= scaleFactor
        this.scale = Math.max(0.1, Math.min(5, this.scale))
    }

    handleContextMenu(e) {
        e.preventDefault()
        const pos = this.getMousePos(e)
        this.createNode(pos.x, pos.y)
    }

    getMousePos(e) {
        const rect = this.element.getBoundingClientRect()
        return {
            x: (e.clientX - rect.left - this.offset.x) / this.scale,
            y: (e.clientY - rect.top - this.offset.y) / this.scale,
        }
    }

    createNode(x, y) {
        const id = Date.now().toString()
        this.nodes.set(id, {
            x,
            y,
            pulse: false,
            spikeThreshold: 1,
            energy: 0.1,
            energyDecayRate: 0.1,
            isFiring: false,
            stableEnergyLevel: 0.1,
            energyAfterFiring: 0,
        })
        return id
    }

    createEdge(fromId, toId, strength = 1) {
        const edgeId = `${fromId}-${toId}`
        this.edges.set(edgeId, {
            from: fromId,
            to: toId,
            strength: strength,
        })
        return edgeId
    }

    findNodeIdAtPosition(pos) {
        for (const [id, node] of this.nodes) {
            const dx = pos.x - node.x
            const dy = pos.y - node.y
            if (dx * dx + dy * dy <= this.nodeRadius * this.nodeRadius) {
                return id
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

        // Draw edges
        for (const edge of this.edges.values()) {
            const fromNode = this.nodes.get(edge.from)
            const toNode = this.nodes.get(edge.to)

            this.ctx.beginPath()
            this.ctx.moveTo(fromNode.x, fromNode.y)
            this.ctx.lineTo(toNode.x, toNode.y)
            this.ctx.strokeStyle = "#666"
            this.ctx.lineWidth = 2
            this.ctx.stroke()

            // Draw strength value
            const midX = (fromNode.x + toNode.x) / 2
            const midY = (fromNode.y + toNode.y) / 2
            this.ctx.fillStyle = "#000"
            this.ctx.font = "12px Arial"
            this.ctx.fillText(edge.strength.toFixed(1), midX, midY)
        }

        // Draw nodes
        for (const [id, node] of this.nodes) {
            this.ctx.beginPath()
            this.ctx.arc(node.x, node.y, this.nodeRadius, 0, Math.PI * 2)
            this.ctx.fillStyle = energyToHue(node.energy) // Set fill color based on energy
            this.ctx.fill()

            // Determine node border color based on state
            if (id === this.edgeStartNode) {
                this.ctx.strokeStyle = this.edgeCreationColor // Blue for edge creation
            } else if (node.pulse) {
                this.ctx.strokeStyle = this.pulseColor // Light red for pulse
            } else {
                this.ctx.strokeStyle = this.normalColor // Black for normal state
            }

            this.ctx.lineWidth = node.pulse ? 4 : 2
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
            nodes: Array.from(this.nodes.entries()),
            edges: Array.from(this.edges.entries()),
        })
    }

    loadFromJSON(jsonString) {
        const data = JSON.parse(jsonString)
        this.nodes = new Map(data.nodes)
        this.edges = new Map(data.edges)
    }

    load(data) {
        // Clear existing nodes and edges
        this.nodes.clear()
        this.edges.clear()

        // Load new nodes and edges from the provided data
        for (const [id, nodeData] of data.nodes) {
            this.nodes.set(id, nodeData)
        }

        for (const [id, edgeData] of data.edges) {
            this.edges.set(id, edgeData)
        }
    }

    pulseNode(node) {
        if (!node.isPulsing) {  // Check if the node is already pulsing
            node.isPulsing = true
            node.pulse = true
            setTimeout(() => {
                node.pulse = false
                node.isPulsing = false
            }, 200)
        }
    }

    next() {
        const nodes = Array.from(this.nodes.values())
        const amountToAddForEach = {}

        // Collect energy from fired nodes
        for (let eachNode of nodes) {
            if (eachNode.isFiring) {
                for (const edge of this.edges.values()) {
                    if (edge.from === eachNode.id) {
                        const targetNode = this.nodes.get(edge.to)
                        if (targetNode) {
                            amountToAddForEach[targetNode.id] = amountToAddForEach[targetNode.id] || 0
                            amountToAddForEach[targetNode.id] += edge.strength
                        }
                    }
                }
            }
        }

        // Reset nodes that just fired
        for (let eachNode of nodes) {
            if (eachNode.isFiring) {
                eachNode.energy = eachNode.energyAfterFiring
                eachNode.isFiring = false
                // Animate that it's firing
                this.pulseNode(eachNode)
            }
        }

        // Add the amountToAddForEach to the nodes
        for (const [key, value] of Object.entries(amountToAddForEach)) {
            const node = this.nodes.get(key)
            if (node) {
                node.energy += value
            }
        }

        // Discover what new nodes are firing
        for (let eachNode of nodes) {
            if (eachNode.energy >= eachNode.spikeThreshold) {
                eachNode.isFiring = true
            }
        }

        // Account for decay
        for (let eachNode of nodes) {
            if (!eachNode.isFiring) {
                eachNode.energy -= eachNode.energyDecayRate
                if (eachNode.energy < eachNode.stableEnergyLevel) {
                    eachNode.energy = eachNode.stableEnergyLevel
                }
            }
        }

        // Update color based on energy
        for (let eachNode of nodes) {
            eachNode.fill = energyToHue(eachNode.energy)
        }

        // Redraw the canvas
        this.draw()
    }
}
