import { pointsToFunction } from "https://esm.sh/gh/jeff-hykin/good-js@1.14.6.0/source/flattened/points_to_function.js"
import { generateCirclePoints } from "./generate_circle_points.js"
import { zipLong } from 'https://esm.sh/gh/jeff-hykin/good-js@1.14.6.0/source/flattened/zip_long.js'
import { wrapAroundGet, getDistance, makeCircleOfNodes } from "./make_circle_of_nodes.js"

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
    namespace = "ring",
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
    const { nodes: newNodes, edges, nodeIdToIndex } = makeCircleOfNodes({ nodes, circleCenterX, circleCenterY, ringRadius, neutralDistance, radius, namespace, defaultNodeData })

    // self (getDistance 0)= weight 1 (excitatory)
    // neutral getDistance (ex: two neurons away) = weight 0, (ignore)
    // far away (large getDistance) = inhibitory weight (negative)
    const maxDistance = Math.ceil(newNodes.length / 2)
    const distanceToStrength = pointsToFunction({
        xValues: [         0, neutralDistance, maxDistance ],
        yValues: [ maxWeight,               0,   minWeight ],
        areSorted: true,
        method: "linearInterpolation", // would probably be more accurate to use some other curve but this should be close enough for now
    })
    for (let sourceNode of newNodes) {
        for (let targetNode of newNodes) {
            edges.push({
                id: `${sourceNode.id}-${targetNode.id}`,
                from: sourceNode.id,
                to: targetNode.id,
                strength: distanceToStrength(getDistance({ node1Id: sourceNode.id, node2Id: targetNode.id, nodeIdToIndex, nodes: newNodes })),
            })
        }
    }
    
    return { nodes: newNodes, edges, nodeIdToIndex }
}
