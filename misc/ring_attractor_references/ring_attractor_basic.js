import { LeakyIntegrateAndFireNeuron } from "../neuron_model_references/LeakyIntegrateAndFireNeuron.js"

/**
 * RingAttractor class simulates a network of neurons arranged in a ring.
 * It models the dynamics of these neurons and their synaptic connections.
 */
export class RingAttractor {
    /**
     * Creates an instance of the RingAttractor model.
     *
     * @param {number} [numOfNeurons=256] - Number of neurons in the ring.
     * @param {number} [noise=2.0e-3] - Noise level applied to neurons' membrane potential.
     * @param {Array.<number>} [weights=[0.050, 0.100, 0.050, 0.250]] - Array of synaptic weight values for inhibitory and excitatory synapses.
     * @param {number} [fixedPointsNumber=0] - Number of fixed points to be used in the attractor model.
     * @param {number} [time=1000] - Simulation time (in ms).
     * @param {boolean} [plot=false] - Whether to plot the results after simulation.
     */
    constructor({
        numOfNeurons = 256,
        noise = 2.0e-3,
        weights = [0.050, 0.100, 0.050, 0.250],
        fixedPointsNumber = 0,
        time = 1000,
        plot = false,
    }) {
        this.numOfNeurons = numOfNeurons
        this.noise = noise
        this.weights = weights
        this.fixedPointsNumber = fixedPointsNumber
        this.time = time
        this.plot = plot

        this.neurons = []
        for (let i = 0; i < numOfNeurons; i++) {
            this.neurons.push(new LeakyIntegrateAndFireNeuron({
                id: i,
                angle: (360.0 / numOfNeurons) * i,
                noiseMean: 0,
                noiseStd: this.noise,
            }))
        }

        this.fixedPointWidth = 3 // Width of fixed point regions
        this.midPoint = Math.floor(numOfNeurons / 2) // Middle point of the ring
        this.fixedPoints = this.getFixedPoints()

        // Constants for synapse range
        this.synapseInhibitoryRangeStart = 5
        this.synapseInhibitoryRangeEnd = 12
        this.synapseExcitatoryRangeStart = 1
        this.synapseExcitatoryRangeEnd = 5

        this.connectWithFixedPoints()
        this.flushed = true
        this.rawData = null
        this.spikes = null
    }
    
    simulate() {
        if (!this.flushed) {
            console.warn("Simulation has not been flushed!");
        }

        const potentials = []
        for (let i = 0; i < this.numOfNeurons; i++) {
            potentials.push([])
        }

        for (let t = 0; t < this.time; t++) {
            console.log("\n\nTime = ", t)
            for (const neuron of this.neurons) {
                if (t === 0 && neuron.id >= 31 && neuron.id <= 35) {
                    neuron.membranePotential = -0.0001 // Set initial potential for certain neurons
                }
                neuron.step()
                potentials[neuron.id].push(neuron.membranePotential)
            }
        }

        this.processPotentials(potentials)
        const divergence = 0 // Placeholder for potential future calculations like KL divergence

        if (this.plot) {
            this.plotPotentials(divergence)
        }

        return divergence
    }
    
    /**
     * @param {Array.<Array.<number>>} potentials - Membrane potential values of all neurons.
     */
    processPotentials(potentials) {
        const data = new Map()
        
        for (let i = 0; i < potentials.length; i++) {
            data.set(this.neurons[i].angle, potentials[i])
        }
        
        const spikes = new Map()

        for (const [idx, pot] of data) {
            spikes.set(idx, pot.map(value => (value === 0 ? 1 : 0)))
        }

        this.rawData = data
        this.spikes = spikes
        this.flushed = false
    }
    
    /**
     * @returns {Array.<number>} - Array of fixed point indices.
     */
    getFixedPoints() {
        if (this.fixedPointsNumber === 0) {
            return []
        }

        if (this.fixedPointsNumber === 1) {
            const fixedPoints = []
            for (let i = 0; i < this.fixedPointWidth; i++) {
                fixedPoints.push(i)
            }
            return fixedPoints
        }

        const index = []
        for (let i = 0; i < this.numOfNeurons; i++) {
            index.push(i)
        }
        
        const interval = Math.floor(this.numOfNeurons / this.fixedPointsNumber)
        const dist = index.map(i => i % interval)
        const low = Math.floor(interval / 2 - this.fixedPointWidth / 2)
        const high = Math.floor(interval / 2 + this.fixedPointWidth / 2)

        const fixedPoints = []
        for (let i = 0; i < index.length; i++) {
            if (dist[i] >= low && dist[i] <= high) {
                fixedPoints.push(index[i])
            }
        }

        return fixedPoints
    }
    
    /**
     * Connects neurons in the attractor to the fixed points.
     */
    connectWithFixedPoints() {
        for (const neuron of this.neurons) {
            if (this.fixedPoints.includes(neuron.id)) {
                // inhibitory
                for (let index = this.synapseInhibitoryRangeStart; index < this.synapseInhibitoryRangeEnd; index++) {
                    const targetNeuron = this.neurons[(neuron.id + index) % this.numOfNeurons]
                    neuron.synapses.inhibitory[targetNeuron] = this.weights[3]
                    neuron.synapses.inhibitory[this.neurons[neuron.id - index]] = this.weights[3]
                }
                // excitatory
                for (let index = this.synapseExcitatoryRangeStart; index < this.synapseExcitatoryRangeEnd; index++) {
                    const targetNeuron = this.neurons[(neuron.id + index) % this.numOfNeurons]
                    neuron.synapses.excitatory[targetNeuron] = this.weights[2]
                    neuron.synapses.excitatory[this.neurons[neuron.id - index]] = this.weights[2]
                }
            } else {
                // inhibitory
                for (let index = this.synapseInhibitoryRangeStart; index < this.synapseInhibitoryRangeEnd; index++) {
                    const targetNeuron = this.neurons[(neuron.id + index) % this.numOfNeurons]
                    neuron.synapses.inhibitory[targetNeuron] = this.weights[1]
                    neuron.synapses.inhibitory[this.neurons[neuron.id - index]] = this.weights[1]
                }
                // excitatory
                for (let index = this.synapseExcitatoryRangeStart; index < this.synapseExcitatoryRangeEnd; index++) {
                    const targetNeuron = this.neurons[(neuron.id + index) % this.numOfNeurons]
                    neuron.synapses.excitatory[targetNeuron] = this.weights[0]
                    neuron.synapses.excitatory[this.neurons[neuron.id - index]] = this.weights[0]
                }
            }
        }
    }
}