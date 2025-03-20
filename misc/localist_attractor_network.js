#!/usr/bin/env -S deno run --allow-all
export const activationFunctions = {
    step(x) {
        return x > 0 ? 1 : 0
    },
    sigmoid(x) {
        return 1 / (1 + Math.exp(-x))
    },
    tanh(x) {
        return Math.tanh(x)
    },
}

export class LocalistAttractorNetwork {
    constructor({neuronIds, edges, activationFunction=activationFunctions.sigmoid}) {
        this.neuronIds = neuronIds // List of neuron IDs
        this.edges = edges // List of edges with weights {from, to, weight}
        this.activationFunction = activationFunction // Set the custom activation function

        // init with 0
        this.neuronValues = Object.fromEntries(this.neuronIds.map(each=>[each,0]))

        // weight matrix
        this.weights = {}
        for (const neuron of this.neuronIds) {
            this.weights[neuron] = {}
            for (const targetNeuron of this.neuronIds) {
                this.weights[neuron][targetNeuron] = 0 // No connection initially
            }
        }

        for (const edge of this.edges) {
            this.weights[edge.from][edge.to] = edge.weight
        }
    }

    // Update function to compute the new state of the neurons
    update() {
        const newNeuronValues = {}

        for (const neuron of this.neuronIds) {
            // Compute the weighted sum of the inputs
            let sum = 0
            for (const inputNeuron of this.neuronIds) {
                sum += this.weights[inputNeuron][neuron] * this.neuronValues[inputNeuron]
            }

            newNeuronValues[neuron] = this.activationFunction(sum)
        }

        this.neuronValues = { ...newNeuronValues }
        return this
    }
}

// 
// 
// Example usage:
// 
// 
if (import.meta.main) {
    const neuronIds = [1, 2, 3]
    const edges = [
        { from: 1, to: 2, weight: 1 },
        { from: 2, to: 3, weight: 1 },
        { from: 3, to: 1, weight: 1 },
        { from: 1, to: 3, weight: -1 }, // Negative weight to create a potential for instability
    ]
    // Create a new localist attractor network with the step activation function
    const network = new LocalistAttractorNetwork({neuronIds, edges, activationFunction: activationFunctions.sigmoid})

    // Initial neuron values (could be random or set)
    network.neuronValues = {
        1: 1,
        2: 0,
        3: 0,
    }

    // Perform an update and print the new neuron values
    console.log("Initial Neuron Values:", network.neuronValues)
    const updatedValues = network.update().neuronValues
    console.log("Updated Neuron Values:", updatedValues)
}