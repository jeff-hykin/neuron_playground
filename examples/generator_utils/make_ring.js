import { pointsToFunction } from "https://esm.sh/gh/jeff-hykin/good-js@1.14.6.0/source/flattened/points_to_function.js"
import { generateCirclePoints } from "./generate_circle_points.js"
import { zipLong } from "https://esm.sh/gh/jeff-hykin/good-js@1.14.6.0/source/flattened/zip_long.js"
import { wrapAroundGet, getDistance, makeCircleOfNodes } from "./make_circle_of_nodes.js"

function gaussianDecay(distance, sigma) {
    return Math.exp(-Math.pow(distance, 2) / (2 * Math.pow(sigma, 2))) // Gaussian decay equation
}

// Exponential Decay Function
function exponentialDecay(distance, lambda) {
    return Math.exp(-distance / lambda) // Exponential decay equation
}

let namespaceIncrementor = 0
export function makeRing({
    maxWeight,
    minWeight,
    numberOfNodes = null,
    nodes = [],
    startX = 160,
    startY = 272,
    ringRadius = 180,
    neutralDistance = 0.8,
    gaussianDecaySigma = null,
    exponentialDecayLambda = null,
    namespace = "ring",
    defaultEdgeData = {
        strengthNoiseParameters: {
            mean: 0,
            std: 0.1,
        },
    },
    defaultNodeData = {
        spikeThreshold: 1,
        energy: 0.1,
        energyDecayRate: 0.1,
        stableEnergyLevel: 0.1,
        energyAfterFiring: 0,
        radius: 25,
        isFiringNext: false,
        pulse: false,
    },
}) {
    namespaceIncrementor++
    const circleCenterX = startX + ringRadius + defaultNodeData.radius
    const circleCenterY = startY + ringRadius + defaultNodeData.radius
    const { nodes: newNodes, edges, nodeIdToIndex } = makeCircleOfNodes({ numberOfNodes, nodes, circleCenterX, circleCenterY, ringRadius, neutralDistance, namespace, defaultNodeData })

    // self (getDistance 0)= weight 1 (excitatory)
    // neutral getDistance (ex: two neurons away) = weight 0, (ignore)
    // far away (large getDistance) = inhibitory weight (negative)
    const maxDistance = Math.ceil(newNodes.length / 2)
    const maxGaussianDecay = gaussianDecay(0, gaussianDecaySigma)
    const maxExponentialDecay = exponentialDecay(0, exponentialDecayLambda)
    let distanceToStrength
    if (gaussianDecaySigma) {
        distanceToStrength = (distance)=>{
            if (distance === 0) {
                return maxWeight
            }
            return (gaussianDecay(distance, gaussianDecaySigma)-maxGaussianDecay) + maxWeight/2
        }
    } else if (exponentialDecayLambda) {
        distanceToStrength = (distance)=>(exponentialDecay(distance, exponentialDecayLambda)-maxExponentialDecay) + maxWeight/2
    } else {
        distanceToStrength = pointsToFunction({
            xValues: [0, neutralDistance, maxDistance],
            yValues: [maxWeight, 0, minWeight],
            areSorted: true,
            method: "linearInterpolation", // would probably be more accurate to use some other curve but this should be close enough for now
        })
    }
    for (let sourceNode of newNodes) {
        for (let targetNode of newNodes) {
            edges.push({
                id: `${sourceNode.id}-${targetNode.id}`,
                from: sourceNode.id,
                to: targetNode.id,
                strength: distanceToStrength(getDistance({ node1Id: sourceNode.id, node2Id: targetNode.id, nodeIdToIndex, nodes: newNodes })),
                ...defaultEdgeData,
            })
        }
    }

    return { nodes: newNodes, edges, nodeIdToIndex }
}
