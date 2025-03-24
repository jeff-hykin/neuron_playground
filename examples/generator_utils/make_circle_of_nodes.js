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
export function makeCircleOfNodes({
    numberOfNodes = null,
    nodes = [],
    circleCenterX = 160,
    circleCenterY = 272,
    ringRadius = 180,
    namespace = "circle",
    angleOffsetDegrees = 0,
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
    numberOfNodes = numberOfNodes || nodes.length
    const { clockwiseListOfPoints, _top, _left, _width, _height } = generateCirclePoints({ circleCenterX, circleCenterY, radius: ringRadius, numberOfPoints: numberOfNodes, angleOffsetDegrees })
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

    return { nodes: newNodes, edges: [], nodeIdToIndex }
}
