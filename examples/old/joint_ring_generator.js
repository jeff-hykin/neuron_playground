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
            "isFiringNext": false,
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
            "isFiringNext": false,
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
            "isFiringNext": false,
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
            "isFiringNext": false,
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
            "isFiringNext": false,
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
            "isFiringNext": false,
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
            "isFiringNext": false,
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
            "isFiringNext": false,
            "stableEnergyLevel": 0.1,
            "energyAfterFiring": 0
        }
    ],
]
const edges = [
    [ "node1-node5", { "from": "node1", "to": "node5", "strength": -0.7 } ],
]

const wrapAroundGet = (number, list) => list[((number % list.length) + list.length) % list.length]
// this is incredibly brute force but it doesn't matter
function getDistance({node1Id, node2Id, nodeIdToIndex, nodesCopy}) {
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

let namespaceInc = 0
function makeRing({maxWeight, minWeight, neutralDistance=0.8, startX=160, startY=272, radius=25, namespace="ring"}) {
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
    
    // self (getDistance 0)= weight 1 (excitatory)
    // neutral getDistance (ex: two neurons away) = weight 0, (ignore)
    // far away (large getDistance) = inhibitory weight (negative)
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
                    "strength": distanceToStrength(
                        getDistance({ node1Id: sourceNodeId, node2Id: targetNodeId, nodeIdToIndex, nodesCopy }),
                    )
                }
            ])
        }
    }

    return { nodes: nodesCopy, edges, nodeIdToIndex }
}

function makeJointRing({distance=700, ringArgs, minWeight, }) {
    const ring1 = makeRing(ringArgs)
    const ring2 = makeRing({...ringArgs, startX: ringArgs.startX + distance})
    
    const maxDistance = Math.ceil(ring1.nodes.length/2)
    
    // these connections are purely inhibitory
    const distanceToStrength = pointsToFunction({
        xValues: [  0, maxDistance ],
        yValues: [  0, minWeight   ],
        areSorted: true,
        method: "linearInterpolation", // would probably be more accurate to use some other curve but this should be close enough for now
    })
    
    const edges = []
    for (let [sourceNodeId, eachSource] of ring1.nodes) {
        for (let [targetNodeId, eachTarget] of ring2.nodes) {
            const distanceAsIfRingsWereOverlayed = getDistance({
                node1Id: sourceNodeId,
                node2Id: targetNodeId,
                nodeIdToIndex: {...ring1.nodeIdToIndex, ...ring2.nodeIdToIndex},
                // this only works because node2Id is the one being compared against
                nodesCopy: ring2.nodes, 
            })

            edges.push([
                `${sourceNodeId}-${targetNodeId}`,
                {
                    "from": targetNodeId,
                    "to": sourceNodeId,
                    "strength": distanceToStrength(distanceAsIfRingsWereOverlayed),
                }
            ])
        }
    }

    // flip roles
    for (let [sourceNodeId, eachSource] of ring2.nodes) {
        for (let [targetNodeId, eachTarget] of ring1.nodes) {
            const distanceAsIfRingsWereOverlayed = getDistance({
                node1Id: sourceNodeId,
                node2Id: targetNodeId,
                nodeIdToIndex: {...ring2.nodeIdToIndex, ...ring1.nodeIdToIndex},
                // this only works because node2Id is the one being compared against
                nodesCopy: ring1.nodes, 
            })

            edges.push([
                `${sourceNodeId}-${targetNodeId}`,
                {
                    "from": targetNodeId,
                    "to": sourceNodeId,
                    "strength": distanceToStrength(distanceAsIfRingsWereOverlayed),
                }
            ])
        }
    }

    return {
        nodes: [...ring1.nodes, ...ring2.nodes],
        edges: [...ring1.edges, ...ring2.edges, ...edges],
    }
}

// makeJointRing({distance: 700, maxWeight: 1, minWeight: -0.8, startX: 160, startY: 272, radius: 25, namespace: "ring"})
// const ring1 = makeRing({maxWeight: 1, minWeight: -0.8, startX: 160, startY: 272, radius: 25, namespace: "ring"})
// const ring2 = makeRing({maxWeight: 1, minWeight: -0.8, startX: 860, startY: 272, radius: 25, namespace: "ring"})
// const combined = {
//     nodes: [...ring1.nodes, ...ring2.nodes],
//     edges: [...ring1.edges, ...ring2.edges],
// }

import { FileSystem, glob } from "https://deno.land/x/quickr@0.7.6/main/file_system.js"
await FileSystem.write({
    data: JSON.stringify(
        makeJointRing({
            distance: 700,
            minWeight: -0.2,
            ringArgs: {
                maxWeight: 1.3,
                minWeight: -0.6,
                startX: 160,
                startY: 272,
                radius: 25,
                namespace: "ring"
            },
        }),
        null,
        4
    ),
    path: `${FileSystem.thisFolder}/joint_rings.json`,
})