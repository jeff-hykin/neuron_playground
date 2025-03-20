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
    resetPotential: -80.0 * mV,
    excitatorySynapticConstant: 1 / (5.0 * ms * Math.exp(-1)),
    inhibitorySynapticConstant: 1 / (5.0 * ms * Math.exp(-1)),
}

const constNameHelper = constants
export function calculateMembranePotentialChange({
    membranePotential,
    inhibitoryPresynapticTimeDelays,
    excitatoryPresynapticTimeDelays,
    constants=constNameHelper,
}) {
    const {
        thresholdPotential,
        membraneCapacitance,
        inhibitoryReversalPotential,
        excitatoryReversalPotential,
        restingPotential,
        refactoryPeriod,
        inhibitorySynapticTimeConstant,
        excitatorySynapticTimeConstant,
        membraneTimeConstant,
        leakReversalPotential,
        resetPotential,
        membranePotential,
        excitatorySynapticConstant,
        inhibitorySynapticConstant,
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
    /**
     * Constructs a LeakyIntegrateAndFireNeuron object.
     *
     * @param {number} id - The unique identifier for this neuron.
     * @param {number} angle - The angle parameter associated with the neuron.
     * @param {number} [dt=1] - The time step for updating the neuron (in ms).
     * @param {number} [noiseMean=0] - The mean of the Gaussian noise added to the membrane potential.
     * @param {number} [noiseStd=1] - The standard deviation of the Gaussian noise.
     */
    constructor(id, angle, dt = 1, noiseMean = 0, noiseStd = 1) {
        // Initial parameters
        this.id = id
        this.timeStep = dt * ms
        this.externalCurrent = 0.0
        this.membranePotential = -80.0 * mV // Reset potential
        this.timeSinceLastSpike = 200.0 * ms

        // Outgoing synapses
        this.synapses = { inhibitory: {}, excitatory: {} }
        this.inhibitoryPresynapticTimeDelays = []
        this.excitatoryPresynapticTimeDelays = []
        this.noiseMean = noiseMean
        this.noiseStd = noiseStd
        this.angle = angle

        Object.assign(this, constants)
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