#!/usr/bin/env -S deno run --allow-all
import { pointsToFunction } from 'https://esm.sh/gh/jeff-hykin/good-js@1.14.6.0/source/flattened/points_to_function.js'
const nodes = [
    [
        "node1",
        {
            "x": 224-160,
            "y": 206-272,
            "id": "node1",
            "pulse": false,
            "spikeThreshold": 1,
            "energy": 0.1,
            "energyDecayRate": 0.1,
            "isFiring": false,
            "stableEnergyLevel": 0.1,
            "energyAfterFiring": 0
        }
    ],
    [
        "node2",
        {
            "x": 160-160,
            "y": 272-272,
            "id": "node2",
            "pulse": false,
            "spikeThreshold": 1,
            "energy": 0.1,
            "energyDecayRate": 0.1,
            "isFiring": false,
            "stableEnergyLevel": 0.1,
            "energyAfterFiring": 0
        }
    ],
    [
        "node3",
        {
            "x": 167-160,
            "y": 361-272,
            "id": "node3",
            "pulse": false,
            "spikeThreshold": 1,
            "energy": 0.1,
            "energyDecayRate": 0.1,
            "isFiring": false,
            "stableEnergyLevel": 0.1,
            "energyAfterFiring": 0
        }
    ],
    [
        "node4",
        {
            "x": 225-160,
            "y": 417-272,
            "id": "node4",
            "pulse": false,
            "spikeThreshold": 1,
            "energy": 0.1,
            "energyDecayRate": 0.1,
            "isFiring": false,
            "stableEnergyLevel": 0.1,
            "energyAfterFiring": 0
        }
    ],
    [
        "node5",
        {
            "x": 308-160,
            "y": 418-272,
            "id": "node5",
            "pulse": false,
            "spikeThreshold": 1,
            "energy": 0.1,
            "energyDecayRate": 0.1,
            "isFiring": false,
            "stableEnergyLevel": 0.1,
            "energyAfterFiring": 0
        }
    ],
    [
        "node6",
        {
            "x": 356-160,
            "y": 354-272,
            "id": "node6",
            "pulse": false,
            "spikeThreshold": 1,
            "energy": 0.1,
            "energyDecayRate": 0.1,
            "isFiring": false,
            "stableEnergyLevel": 0.1,
            "energyAfterFiring": 0
        }
    ],
    [
        "node7",
        {
            "x": 362-160,
            "y": 273-272,
            "id": "node7",
            "pulse": false,
            "spikeThreshold": 1,
            "energy": 0.1,
            "energyDecayRate": 0.1,
            "isFiring": false,
            "stableEnergyLevel": 0.1,
            "energyAfterFiring": 0
        }
    ],
    [
        "node8",
        {
            "x": 306-160,
            "y": 207-272,
            "id": "node8",
            "pulse": false,
            "spikeThreshold": 1,
            "energy": 0.1,
            "energyDecayRate": 0.1,
            "isFiring": false,
            "stableEnergyLevel": 0.1,
            "energyAfterFiring": 0
        }
    ],
]
const edges = [
    [ "node1-node5", { "from": "node1", "to": "node5", "strength": -0.7 } ],
    [ "node1-node4", { "from": "node1", "to": "node4", "strength": -0.5 } ],
    [ "node1-node3", { "from": "node1", "to": "node3", "strength": -0.1 } ],
    [ "node1-node2", { "from": "node1", "to": "node2", "strength":  0.6 } ],
    [ "node1-node1", { "from": "node1", "to": "node1", "strength":  1.0 } ],
    [ "node1-node8", { "from": "node1", "to": "node8", "strength":  0.6 } ],
    [ "node1-node7", { "from": "node1", "to": "node7", "strength": -0.1 } ],
    [ "node1-node6", { "from": "node1", "to": "node6", "strength": -0.5 } ]
]

const wrapAroundGet = (number, list) => list[((number % list.length) + list.length) % list.length]
let namespaceInc = 0
function makeRing({maxWeight, minWeight, neutralDistance=1.8, startX=160, startY=272, radius=25, namespace="ring"}) {
    namespaceInc++
    const nodesCopy = structuredClone(nodes)
    // normalize
    let index = -1
    const nodeIdToIndex = {}
    for (let [nodeId, each] of nodesCopy) {
        index++
        each.x += startX
        each.y += startY
        each.radius = radius
        each.id = `${namespace}_${namespaceInc}_${index+1}`
        nodesCopy[index] = [each.id, each]
        nodeIdToIndex[each.id] = index
    }
    // this is incredibly brute force but it doesn't matter
    function distance(node1Id, node2Id) {
        // positive direction
        var i=nodeIdToIndex[node1Id]-1
        let positiveDistance = -1
        for (var _ of nodesCopy) {
            i++
            positiveDistance++
            if (wrapAroundGet(i, nodesCopy)[1].id == node2Id) {
                break
            }
        }
        // negative direction
        var i=nodeIdToIndex[node1Id]+1
        let negativeDistance = -1
        for (var _ of nodesCopy) {
            i--
            negativeDistance++
            if (wrapAroundGet(i, nodesCopy)[1].id == node2Id) {
                break
            }
        }
        return Math.min(negativeDistance, positiveDistance)
    }
    
    // self (distance 0)= weight 1 (excitatory)
    // neutral distance (ex: two neurons away) = weight 0, (ignore)
    // far away (large distance) = inhibitory weight (negative)
    const maxDistance = Math.ceil(nodesCopy.length/2)
    const distanceToStrength = pointsToFunction({
        xValues: [         0, neutralDistance, maxDistance ],
        yValues: [ maxWeight,               0, minWeight   ],
        areSorted: true,
        method: "linearInterpolation", // would probably be more accurate to use some other curve but this should be close enough for now
    })
    const edges = []
    for (let [sourceNodeId, sourceNode] of nodesCopy) {
        for (let [targetNodeId, targetNode] of nodesCopy) {
            edges.push([
                `${sourceNodeId}-${targetNodeId}`,
                {
                    "from": sourceNodeId,
                    "to": targetNodeId,
                    "strength": distanceToStrength(distance(sourceNodeId, targetNodeId)),
                }
            ])
        }
    }

    return { nodes: nodesCopy, edges }
}


const ring1 = makeRing({maxWeight: 1, minWeight: -0.8, startX: 160, startY: 272, radius: 25, namespace: "ring"})
const ring2 = makeRing({maxWeight: 1, minWeight: -0.8, startX: 860, startY: 272, radius: 25, namespace: "ring"})
const combined = {
    nodes: [...ring1.nodes, ...ring2.nodes],
    edges: [...ring1.edges, ...ring2.edges],
}

console.log(JSON.stringify(combined, null, 4))