// helper
function randomNormal(mean, std) {
    const u1 = Math.random()
    const u2 = Math.random()
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
    return mean + z0 * std
}

// units
const mV = 1e-3 // Millivolts
const nF = 1e-9 // Nanofarads
const ms = 1e-3 // Milliseconds

export const constants = {
    thresholdPotential: -48.0 * mV,
    membraneCapacitance: 1.0 * nF,
    inhibitoryReversalPotential: -70.0 * mV,
    excitatoryReversalPotential: 0.0 * mV,
    restingPotential: -70.0 * mV,
    refactoryPeriod: 2.0 * ms,
    inhibitorySynapticTimeConstant: 5.0 * ms,
    excitatorySynapticTimeConstant: 5.0 * ms,
    membraneTimeConstant: 5.0 * ms,
    leakReversalPotential: -70.0 * mV,
    excitatorySynapticConstant: 1 / (5.0 * ms * Math.exp(-1)),
    inhibitorySynapticConstant: 1 / (5.0 * ms * Math.exp(-1)),
}

const constNameHelper = constants

/**
 * Calculates the change in the membrane potential of a neuron based on various currents.
 * This includes the leak current, inhibitory current, and excitatory current.
 * The calculation is based on the Leaky Integrate-and-Fire (LIF) neuron model.
 *
 * @param {Object} params - The parameters required for the calculation.
 * @param {number} params.membranePotential - The current membrane potential of the neuron (in volts).
 * @param {Array.<[number, number]>} params.inhibitoryPresynapticTimeDelays - An array of tuples where each tuple contains a time delay (in ms) and the weight of an inhibitory synapse.
 * @param {Array.<[number, number]>} params.excitatoryPresynapticTimeDelays - An array of tuples where each tuple contains a time delay (in ms) and the weight of an excitatory synapse.
 * @param {number} params.constants.membraneCapacitance - The membrane capacitance of the neuron (in Farads).
 * @param {number} params.constants.membraneTimeConstant - The membrane time constant of the neuron (in seconds).
 * @param {number} params.constants.leakReversalPotential - The reversal potential for the leak current (in volts).
 * @param {number} params.constants.inhibitorySynapticConstant - A constant that scales the inhibitory synaptic conductance.
 * @param {number} params.constants.inhibitorySynapticTimeConstant - The time constant for inhibitory synaptic decay (in ms).
 * @param {number} params.constants.inhibitoryReversalPotential - The reversal potential for inhibitory synapses (in volts).
 * @param {number} params.constants.excitatorySynapticConstant - A constant that scales the excitatory synaptic conductance.
 * @param {number} params.constants.excitatorySynapticTimeConstant - The time constant for excitatory synaptic decay (in ms).
 * @param {number} params.constants.excitatoryReversalPotential - The reversal potential for excitatory synapses (in volts).
 * 
 * @returns {number} The change in membrane potential (in volts) based on the currents.
 */
export function calculateMembranePotentialChange({
    membranePotential,
    inhibitoryPresynapticTimeDelays,
    excitatoryPresynapticTimeDelays,
    constants=constNameHelper,
}) {
    const {
        membraneCapacitance,
        membraneTimeConstant,
        leakReversalPotential,
        inhibitorySynapticConstant,
        inhibitorySynapticTimeConstant,
        inhibitoryReversalPotential,
        excitatorySynapticConstant,
        excitatorySynapticTimeConstant,
        excitatoryReversalPotential,
    } = constants

    // calculateLeakCurrent
    const leakCurrent = (membraneCapacitance / membraneTimeConstant) * (membranePotential - leakReversalPotential)

    // 
    // inhibitoryCurrent
    // 
    let inhibitoryCurrent = 0.0
    for (const [timeDelay, weight] of inhibitoryPresynapticTimeDelays) {
        const inhibitorySynapticConductance = inhibitorySynapticConstant * timeDelay * Math.exp(-timeDelay / inhibitorySynapticTimeConstant)
        inhibitoryCurrent += inhibitorySynapticConductance * (membranePotential - inhibitoryReversalPotential) * weight * 1e-6
    }

    // 
    // excitatoryCurrent
    //
    let excitatoryCurrent = 0.0
    for (const [timeDelay, weight] of excitatoryPresynapticTimeDelays) {
        const excitatorySynapticConductance = excitatorySynapticConstant * timeDelay * Math.exp(-timeDelay / excitatorySynapticTimeConstant)
        excitatoryCurrent += excitatorySynapticConductance * (membranePotential - excitatoryReversalPotential) * weight * 1e-6
    }

    return (-leakCurrent - inhibitoryCurrent - excitatoryCurrent) / membraneCapacitance
}

/**
 * A class representing a Leaky Integrate-and-Fire Neuron (LIF Neuron).
 * This neuron model simulates the dynamics of membrane potential and synaptic inputs.
 */
export class LeakyIntegrateAndFireNeuron {
    // LeakyIntegrateAndFireNeuron (LIF) downsides:
        // 1. No refractory period
        // 2. No waveform output
        // 3. No neurotransmitters
    // alterntaive models (according to GPT):
        // Hodgkin-Huxley (HH) Model:
        //     Pros: More biologically realistic, simulates detailed action potentials and ion channel dynamics.
        //     Cons: Computationally expensive and complex, requires more parameters and detailed biophysical knowledge.
        //     Benefit: Used for modeling individual neurons with high fidelity, especially when investigating specific cellular mechanisms.
        // Izhikevich Model:
        //     Pros: More biologically realistic than LIF, capable of simulating a wide range of firing patterns (including bursting and chaotic behaviors). Still relatively simple compared to HH.
        //     Cons: Requires more parameters to capture a broader range of dynamics. May not capture all biophysical mechanisms as accurately as HH.
        //     Benefit: Provides a good balance between simplicity and biological realism. Great for simulating networks with rich spiking patterns.
        // FitzHugh-Nagumo Model:
        //     Pros: Simpler than HH but still captures basic neuron spiking and excitability dynamics.
        //     Cons: Still abstract and does not capture all aspects of real neurons.
        //     Benefit: Useful for studying basic neuronal excitability and bistability.

    /**
     * Constructs a LeakyIntegrateAndFireNeuron object.
     *
     * @param {Object} params - 
     * @param {number} params.id - The unique identifier for this neuron.
     * @param {Object} params.otherData - Any additional info for the neuron.
     * @param {number} [params.dt=1] - The time step for updating the neuron (in ms).
     * @param {number} [params.noiseMean=0] - The mean of the Gaussian noise added to the membrane potential.
     * @param {number} [params.noiseStd=1] - The standard deviation of the Gaussian noise.
     */
    constructor({id, dt = 1, otherData={}, noiseMean = 0, noiseStd = 1}) {
        Object.assign(this, constants)

        // Initial parameters
        this.id = id
        this.timeStep = dt * ms
        this.externalCurrent = 0.0
        this.membranePotential = -80.0 * mV
        this.timeSinceLastSpike = 200.0 * ms
        
        // constant
        this.resetPotential = -80.0 * mV

        // Outgoing synapses
        this.synapses = { inhibitory: {}, excitatory: {} }
        this.inhibitoryPresynapticTimeDelays = []
        this.excitatoryPresynapticTimeDelays = []
        this.noiseMean = noiseMean
        this.noiseStd = noiseStd
        this.otherData = otherData
    }
    
    /**
     * Updates the neuron's state based on its membrane potential and inputs.
     */
    step() {
        // If the neuron spiked, hyperpolarize it
        if (this.membranePotential === 0.0) {
            this.membranePotential = this.resetPotential
        // If membrane potential is above threshold, reset potential and start refractory period
        } else if (this.membranePotential >= this.thresholdPotential) {
            this.membranePotential = 0.0
            this.timeSinceLastSpike = 0
        // else, update the membrane potential using Euler's method
        } else {
            const noise = randomNormal(this.noiseMean, this.noiseStd)
            const membranePotentialChange = calculateMembranePotentialChange({
                membranePotential: this.membranePotential,
                inhibitoryPresynapticTimeDelays: this.inhibitoryPresynapticTimeDelays,
                excitatoryPresynapticTimeDelays: this.excitatoryPresynapticTimeDelays,
                constants: this,
            })

            this.membranePotential += membranePotentialChange * this.timeStep + noise
        }

        // Send time delays to connected neurons after the refractory period
        if (this.timeSinceLastSpike > this.refactoryPeriod) {
            for (const [neuron, weight] of Object.entries(this.synapses.inhibitory)) {
                neuron.inhibitoryPresynapticTimeDelays.push([this.timeSinceLastSpike, weight])
            }
            for (const [neuron, weight] of Object.entries(this.synapses.excitatory)) {
                neuron.excitatoryPresynapticTimeDelays.push([this.timeSinceLastSpike, weight])
            }
        }

        this.timeSinceLastSpike += this.timeStep

        // Clear time delays for the next cycle
        this.inhibitoryPresynapticTimeDelays = []
        this.excitatoryPresynapticTimeDelays = []
    }
}