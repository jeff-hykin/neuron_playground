import { pointsToFunction } from "https://esm.sh/gh/jeff-hykin/good-js@1.14.6.0/source/flattened/points_to_function.js"
import { generateCirclePoints } from "./generate_circle_points.js"
import { zipLong } from 'https://esm.sh/gh/jeff-hykin/good-js@1.14.6.0/source/flattened/zip_long.js'
export const wrapAroundGet = (number, list) => list[((number % list.length) + list.length) % list.length]

// this is incredibly brute force but it doesn't matter
export function getDistance({ node1Id, node2Id, nodeIdToIndex, nodes }) {
    // positive direction
    var i = nodeIdToIndex[node1Id] - 1
    let positiveDistance = -1
    for (var _ of nodes) {
        i++
        positiveDistance++
        if (wrapAroundGet(i, nodes).id == node2Id) {
            break
        }
    }
    // negative direction
    var i = nodeIdToIndex[node1Id] + 1
    let negativeDistance = -1
    for (var _ of nodes) {
        i--
        negativeDistance++
        if (wrapAroundGet(i, nodes).id == node2Id) {
            break
        }
    }
    return Math.min(negativeDistance, positiveDistance)
}

let namespaceIncrementor = 0
export function makeRing({
    maxWeight,
    minWeight,
    numberOfNodes = null,
    nodes = [],
    startX = 160,
    startY = 272,
    ringRadius = 150,
    neutralDistance = 0.8,
    radius = 25,
    namespace = "ring",
    energyDecayRate = 0.1,
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
    // generate x,y values
    const circleCenterX = startX + ringRadius + defaultNodeData.radius
    const circleCenterY = startY + ringRadius + defaultNodeData.radius
    numberOfNodes = numberOfNodes || nodes.length
    const { clockwiseListOfPoints, _top, _left, _width, _height } = generateCirclePoints({ circleCenterX, circleCenterY, radius: ringRadius, numberOfPoints: numberOfNodes })
    // create nodes
    const nodesCopy = structuredClone(nodes)
    const realNodes = []
    // old format was [ [nodeId, nodeData], ... ] new format is just [nodeData, ...]
    for (let each of nodesCopy) {
        if (each instanceof Array) {
            realNodes.push(each[1])
        } else {
            realNodes.push(each)
        }
    }
    // normalize
    let index = -1
    const nodeIdToIndex = {}
    const newNodes = []
    for (let [nodeData, pointData] of zipLong(realNodes, clockwiseListOfPoints)) {
        index++
        const id = `${namespace}_${namespaceIncrementor}_${index + 1}`
        newNodes.push({
            ...defaultNodeData,
            ...nodeData,
            ...pointData,
            id,
        })
        nodeIdToIndex[id] = index
    }
    console.debug(`newNodes is:`,newNodes)
    console.debug(`clockwiseListOfPoints is:`,clockwiseListOfPoints)

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
    const edges = []
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
