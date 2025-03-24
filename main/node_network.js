import { randomNormal } from "https://esm.sh/gh/jeff-hykin/good-js@42aa6e1/source/flattened/random_normal.js"

function createGaussianFunction(mean, stdev) {
    return function (x) {
        return Math.exp(-(Math.pow(x - mean, 2) / (2 * Math.pow(stdev, 2))))
    }
}

/**
 * Represents a network of nodes and edges.
 * @class
 */
export default class NodeNetwork {
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
    constructor({
        defaultNodeData = {
            pulse: false,
            spikeThreshold: 1,
            energy: 0.1,
            energyDecayRate: 0.1,
            isFiringNext: false,
            stableEnergyLevel: 0.1,
            energyAfterFiring: 0,
            radius: 25,
        },
        defaultEdgeData = {
            edgeStrength: 1,
            strengthNoiseParameters: {
                mean: 0,
                std: 0.1,
            },
        },
    }) {
        this.nodes = []
        this.edges = []
        this.defaultNodeData = defaultNodeData
        this.defaultEdgeData = defaultEdgeData
        this.stateBuffer = [] // Buffer to store the last 100 states
    }

    saveState() {
        const state = {
            nodes: this.nodes.map((node) => ({ ...node })),
            edges: this.edges.map((edge) => ({ ...edge })),
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
        const node = this.nodes.find((node) => node.id === nodeId)
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
                        const targetNode = this.nodes.find((node) => node.id === edge.to)
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
            const node = this.nodes.find((node) => node.id === key)
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
        if (data.nodes.some((each) => each instanceof Array) || data.edges.some((each) => each instanceof Array)) {
            if (data.nodes.every((each) => each instanceof Array) && data.edges.every((each) => each instanceof Array)) {
                data.nodes = data.nodes.map((each) => each[1])
                data.edges = data.edges.map((each) => each[1])
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
