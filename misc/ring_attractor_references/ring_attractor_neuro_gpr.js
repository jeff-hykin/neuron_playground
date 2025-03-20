// roughly translated, not tested, from: https://github.com/cognav/NeuroGPR/blob/main/src/model/cann.py

/**
 * Calculates the minimum value for each dimension across all data points.
 * @param {Array} data - Input data array.
 * @returns {Array} - Array containing the minimum value for each dimension.
 */
function calculateMin(data) {
    return data.reduce((minVals, row) => row.map((val, idx) => Math.min(val, minVals[idx])), Array(data[0].length).fill(Infinity))
}

/**
 * Calculates the maximum value for each dimension across all data points.
 * @param {Array} data - Input data array.
 * @returns {Array} - Array containing the maximum value for each dimension.
 */
function calculateMax(data) {
    return data.reduce((maxVals, row) => row.map((val, idx) => Math.max(val, maxVals[idx])), Array(data[0].length).fill(-Infinity))
}

/**
 * @note 
 *   this function probably doesn't work. Its a stand-in for `odeint` from scipy.integrate
 *   this placeholder is GPT-generated
 *   according to GPT Implementing scipy's odeint is "quite challenging" so not only is this probably borked,
 *   its also going to be a pain for me (or you) to implement in JS
 * 
 * Simple numerical integration method using Euler's method.
 * Used to integrate the neuron's state equation over time.
 * @param {Object} params - The parameters for the integration.
 * @param {Function} params.func - The function representing the differential equation.
 * @param {Array} params.initialState - Initial state of the system.
 * @param {Array} params.timeSteps - Array of time steps for integration.
 * @param {Array} params.args - Additional arguments required for the equation.
 * @returns {Array} - The state of the system at each time step.
 */
function odeIntegrator({func, initialState, timeSteps, args}) {
    const deltaT = timeSteps[1] - timeSteps[0]
    let state = [...initialState]
    const result = [state]

    for (let i = 1; i < timeSteps.length; i++) {
        const deltaState = func({state, time: timeSteps[i], ...args})
        for (let j = 0; j < state.length; j++) {
            state[j] += deltaState[j] * deltaT
        }
        result.push([...state])
    }

    return result
}

/**
 * Neuron dynamics function that calculates the change in membrane potential over time.
 * This function follows the network model equations for the continuous attractor dynamics.
 * @param {Object} params - The parameters for the neuron dynamics.
 * @param {Array} params.state - The current state of the neurons (membrane potentials).
 * @param {number} params.time - The current time step.
 * @param {Array} params.weights - The weight matrix representing connectivity between neurons.
 * @param {Array} params.externalStimulus - The external stimulus applied to the neurons.
 * @param {number} params.tau - The time constant for the neuron dynamics.
 * @param {number} params.inhibitoryInput - The inhibitory input applied to the neurons.
 * @param {number} params.couplingStrength - The coupling strength between neurons.
 * @param {number} params.deltaT - The time step for the integration.
 * @returns {Array} - The change in neuron states (membrane potentials).
 */
function neuronDynamics({state, time, weights, externalStimulus, tau, inhibitoryInput, couplingStrength, deltaT}) {
    const numNeurons = weights.length
    const squaredRates = state.map((val) => Math.pow(val, 2))
    const normalizationFactor = squaredRates.reduce((sum, row) => sum + row.reduce((rowSum, val) => rowSum + val, 0), 0)

    const rate = squaredRates.map((row) => row.map((val, idx) => val / normalizationFactor))
    const recurrentInput = weights.map((row) => row.reduce((sum, weight, idx) => sum + weight * rate[idx], 0))

    // Equation for the rate of change in the membrane potential
    return state.map((val, idx) => ((-val + recurrentInput[idx] + externalStimulus[idx] + inhibitoryInput) * deltaT) / tau)
}

/**
 * Continuous Attractor Neural Network (CANN) implementation.
 * This class represents a ring attractor network where neurons are arranged in a ring-like topology.
 * Each neuron is influenced by the inputs from its neighbors and stimuli in the environment.
 * The network exhibits continuous attractor dynamics, where neuron activity forms a "bump" that
 * can be shifted or rotated across the ring.
 *
 * The update method integrates the network dynamics over time.
 */
export class ContinuousAttractorNeuralNetwork {
    /**
     * Constructor for the CANN model.
     * @param {Array} data - The input data used to initialize the stimulus (time-series input).
     * @param {number} numNeurons - The number of neurons in the network.
     * @param {number} timeConstant - Time constant for membrane dynamics (default 0.02).
     * @param {number} inhibitoryInput - Inhibitory input to neurons (default -0.1).
     * @param {number} inputDuration - Duration of the external stimulus (default 0.5).
     * @param {number} timeStep - Time step for numerical integration (default 0.05).
     * @param {number} stimulusAmplitude - Amplitude of the stimulus (default 20).
     * @param {number} couplingStrength - Coupling strength between neurons (default 1).
     */
    constructor(data, numNeurons = 128, timeConstant = 0.02, inhibitoryInput = -0.1, inputDuration = 0.5, timeStep = 0.05, stimulusAmplitude = 20, couplingStrength = 1) {
        this.numNeurons = numNeurons
        this.timeConstant = timeConstant
        this.inhibitoryInput = inhibitoryInput
        this.inputDuration = inputDuration
        this.timeStep = timeStep
        this.stimulusAmplitude = stimulusAmplitude
        this.couplingStrength = couplingStrength

        this.numTimeSteps = data.length + 1 // Number of time windows
        this.numUnits = data[0].length // Number of dimensions in the data
        this.minInput = calculateMin(data) // Minimum value across the data
        this.maxInput = calculateMax(data) // Maximum value across the data
        this.inputRange = this.maxInput - this.minInput // Range of input values

        // Neuron centers are evenly distributed across the input range
        this.neuronCenters = Array.from({ length: numNeurons }, (_, i) => this.minInput + (this.inputRange * i) / (numNeurons - 1))

        // Initialize the weight matrix with a Gaussian connection between neurons
        this.weights = Array.from({ length: numNeurons }, () => Array(numNeurons).fill(0))
        this.width = 0.5 // Width of the Gaussian function
        this.synapticStrength = 8 // Base synaptic strength
        this.neuronActivity = [Array(numNeurons).fill(0)] // Initial activity of neurons
        this.rateResponse = [Array(numNeurons).fill(0)] // Initial rate response of neurons

        // Populate the weight matrix with Gaussian connections between neurons
        for (let i = 0; i < this.numNeurons; i++) {
            for (let j = 0; j < this.numNeurons; j++) {
                const distance = Math.pow((i - j) / this.width, 2)
                this.weights[i][j] = (this.synapticStrength * Math.exp(-0.5 * distance)) / (Math.sqrt(2 * Math.PI) * this.width)
            }
        }
    }

    /**
     * Reverse transforms the input data into the original space based on min/max normalization.
     * @param {Array} x - Normalized input data.
     * @returns {Array} - Transformed data.
     */
    reverseTransformData(x) {
        const xMin = calculateMin(x)
        const xMax = calculateMax(x)
        const xRange = xMax - xMin
        return x.map((row, i) => row.map((val, j) => ((val - xMin[j]) / (1e-11 + xRange[j])) * this.inputRange + this.minInput[j]))
    }

    /**
     * Generates the stimulus at a given time step based on the position in the ring.
     * The Gaussian bump is centered around the position of the neuron in the network.
     * @param {Array} position - The position at which to generate the stimulus.
     * @returns {Array} - Array representing the stimulus response for each neuron.
     */
    getStimulus(position) {
        return position.map((xi) => {
            return this.neuronCenters.map((center) => Math.exp(-Math.pow((xi - center) / 0.5, 2)))
        })
    }

    /**
     * Update the network dynamics by iterating over the input data and integrating the network's differential equations.
     * @param {Array} inputData - The input data to be processed by the network.
     * @param {boolean} trajectoryMode - Whether to return the full trajectory of neuron activity.
     * @returns {Array} - The updated output from the network.
     */
    updateNetwork(inputData, trajectoryMode = false) {
        const sequenceLength = inputData.length
        const sequenceDim = inputData[0].length
        let activity = Array.from({ length: this.numNeurons }, () => Array(sequenceDim).fill(0))
        let activityRecord = Array.from({ length: sequenceLength }, () =>
            Array(this.numNeurons)
                .fill(0)
                .map(() => Array(sequenceDim).fill(0))
        )
        let output

        for (let i = 0; i < sequenceLength; i++) {
            let currentStimulus
            if (i === 0) {
                currentStimulus = this.getStimulus(inputData[0])
            } else {
                currentStimulus = this.getStimulus(inputData[i - 1])
            }

            const timeSteps = Array.from({ length: Math.floor(this.inputDuration / this.timeStep) }, (_, i) => this.inputDuration * i + this.inputDuration * i)

            // Integrating the network dynamics using Euler's method
            const updatedActivity = odeIntegrator({
                func: neuronDynamics,
                initialState: activity.flat(),
                timeSteps,
                args: {
                    weights: this.weights,
                    externalStimulus: currentStimulus,
                    tau: this.timeConstant,
                    inhibitoryInput: this.inhibitoryInput,
                    couplingStrength: this.couplingStrength,
                    deltaT: this.timeStep,
                },
            })
            activity = updatedActivity[updatedActivity.length - 1].map((_, idx) => updatedActivity.map((row) => row[idx]))

            const rateSquared = activity.map((row) => row.map((val) => Math.pow(val, 2)))
            const normalizationFactor = rateSquared.map((row) => row.map((val, idx) => 1.0 + 0.5 * this.couplingStrength * row.reduce((sum, val) => sum + Math.pow(val, 2), 0)))

            activityRecord[i] = rateSquared.map((row, idx) => row.map((val, j) => val / normalizationFactor[idx][j]))
            output = rateSquared.map((row, idx) => row.map((val, j) => val / normalizationFactor[idx][j]))
        }

        if (trajectoryMode) {
            output = activityRecord
        }

        return output
    }
}



// const data = [
//     [0.1, 0.2, 0.3],
//     [0.2, 0.3, 0.4],
//     [0.3, 0.4, 0.5],
//     // Add more data points
// ];

// const cann = new CANN(data);

// // Update the network
// const result = cann.update(data);
// console.log(result);
