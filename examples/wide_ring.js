#!/usr/bin/env -S deno run --allow-all
import { pointsToFunction } from "https://esm.sh/gh/jeff-hykin/good-js@1.14.6.0/source/flattened/points_to_function.js"
const nodes = [
    [
        "1742763333050",
        {
            x: 189,
            y: 163,
            id: "1742763333050",
            pulse: false,
            spikeThreshold: 1,
            energy: 0.1,
            energyDecayRate: 0.1,
            isFiringNext: false,
            stableEnergyLevel: 0.1,
            energyAfterFiring: 0,
            radius: 25,
        },
    ],
    [
        "1742763334445",
        {
            x: 300,
            y: 157,
            id: "1742763334445",
            pulse: false,
            spikeThreshold: 1,
            energy: 0.1,
            energyDecayRate: 0.1,
            isFiringNext: false,
            stableEnergyLevel: 0.1,
            energyAfterFiring: 0,
            radius: 25,
        },
    ],
    [
        "1742763335579",
        {
            x: 410,
            y: 161,
            id: "1742763335579",
            pulse: false,
            spikeThreshold: 1,
            energy: 0.1,
            energyDecayRate: 0.1,
            isFiringNext: false,
            stableEnergyLevel: 0.1,
            energyAfterFiring: 0,
            radius: 25,
        },
    ],
    [
        "1742763338136",
        {
            x: 486,
            y: 234,
            id: "1742763338136",
            pulse: false,
            spikeThreshold: 1,
            energy: 0.1,
            energyDecayRate: 0.1,
            isFiringNext: false,
            stableEnergyLevel: 0.1,
            energyAfterFiring: 0,
            radius: 25,
        },
    ],
    [
        "1742763339436",
        {
            x: 490,
            y: 325,
            id: "1742763339436",
            pulse: false,
            spikeThreshold: 1,
            energy: 0.1,
            energyDecayRate: 0.1,
            isFiringNext: false,
            stableEnergyLevel: 0.1,
            energyAfterFiring: 0,
            radius: 25,
        },
    ],
    [
        "1742763341070",
        {
            x: 485,
            y: 439,
            id: "1742763341070",
            pulse: false,
            spikeThreshold: 1,
            energy: 0.1,
            energyDecayRate: 0.1,
            isFiringNext: false,
            stableEnergyLevel: 0.1,
            energyAfterFiring: 0,
            radius: 25,
        },
    ],
    [
        "1742763343520",
        {
            x: 413,
            y: 503,
            id: "1742763343520",
            pulse: false,
            spikeThreshold: 1,
            energy: 0.1,
            energyDecayRate: 0.1,
            isFiringNext: false,
            stableEnergyLevel: 0.1,
            energyAfterFiring: 0,
            radius: 25,
        },
    ],
    [
        "1742763344642",
        {
            x: 300,
            y: 507,
            id: "1742763344642",
            pulse: false,
            spikeThreshold: 1,
            energy: 0.1,
            energyDecayRate: 0.1,
            isFiringNext: false,
            stableEnergyLevel: 0.1,
            energyAfterFiring: 0,
            radius: 25,
        },
    ],
    [
        "1742763345610",
        {
            x: 192,
            y: 505,
            id: "1742763345610",
            pulse: false,
            spikeThreshold: 1,
            energy: 0.1,
            energyDecayRate: 0.1,
            isFiringNext: false,
            stableEnergyLevel: 0.1,
            energyAfterFiring: 0,
            radius: 25,
        },
    ],
    [
        "1742763354346",
        {
            x: 119,
            y: 437,
            id: "1742763354346",
            pulse: false,
            spikeThreshold: 1,
            energy: 0.1,
            energyDecayRate: 0.1,
            isFiringNext: false,
            stableEnergyLevel: 0.1,
            energyAfterFiring: 0,
            radius: 25,
        },
    ],
    [
        "1742763355372",
        {
            x: 122,
            y: 334,
            id: "1742763355372",
            pulse: false,
            spikeThreshold: 1,
            energy: 0.1,
            energyDecayRate: 0.1,
            isFiringNext: false,
            stableEnergyLevel: 0.1,
            energyAfterFiring: 0,
            radius: 25,
        },
    ],
    [
        "1742763356388",
        {
            x: 122,
            y: 240,
            id: "1742763356388",
            pulse: false,
            spikeThreshold: 1,
            energy: 0.1,
            energyDecayRate: 0.1,
            isFiringNext: false,
            stableEnergyLevel: 0.1,
            energyAfterFiring: 0,
            radius: 25,
        },
    ],
]
const edges = [["node1-node5", { from: "node1", to: "node5", strength: -0.7 }]]

const wrapAroundGet = (number, list) => list[((number % list.length) + list.length) % list.length]
// this is incredibly brute force but it doesn't matter
function getDistance({ node1Id, node2Id, nodeIdToIndex, nodesCopy }) {
    // positive direction
    var i = nodeIdToIndex[node1Id] - 1
    let positiveDistance = -1
    for (var _ of nodesCopy) {
        i++
        positiveDistance++
        if (wrapAroundGet(i, nodesCopy)[1].id == node2Id) {
            break
        }
    }
    // negative direction
    var i = nodeIdToIndex[node1Id] + 1
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
function makeRing({ maxWeight, minWeight, neutralDistance = 0.8, startX = 160, startY = 272, radius = 25, namespace = "ring", energyDecayRate = 0.1, }) {
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
        each.energyDecayRate = energyDecayRate
        each.id = `${namespace}_${namespaceInc}_${index + 1}`
        nodesCopy[index] = [each.id, each]
        nodeIdToIndex[each.id] = index
    }

    // self (getDistance 0)= weight 1 (excitatory)
    // neutral getDistance (ex: two neurons away) = weight 0, (ignore)
    // far away (large getDistance) = inhibitory weight (negative)
    const maxDistance = Math.ceil(nodesCopy.length / 2)
    const distanceToStrength = pointsToFunction({
        xValues: [0, neutralDistance, maxDistance],
        yValues: [maxWeight, 0, minWeight],
        areSorted: true,
        method: "linearInterpolation", // would probably be more accurate to use some other curve but this should be close enough for now
    })
    const edges = []
    for (let [sourceNodeId, sourceNode] of nodesCopy) {
        for (let [targetNodeId, targetNode] of nodesCopy) {
            edges.push([
                `${sourceNodeId}-${targetNodeId}`,
                {
                    from: sourceNodeId,
                    to: targetNodeId,
                    strength: distanceToStrength(getDistance({ node1Id: sourceNodeId, node2Id: targetNodeId, nodeIdToIndex, nodesCopy })),
                },
            ])
        }
    }

    return { nodes: nodesCopy, edges, nodeIdToIndex }
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
        makeRing({
            // energyDecayRate: 0.43333333333333335, // same as excitatory weight for nearest neighbor (given a neutral distance of 1.5)
            // energyDecayRate: 0.7, 
            // maxWeight: 1.3,
            // minWeight: -1.6,
            startX: 160,
            startY: 272,
            radius: 25,
            namespace: "ring",
            
            neutralDistance: 1.8,
            maxWeight: 1,
            minWeight: -0.8,
        }),
        null,
        4
    ),
    path: `${FileSystem.thisFolder}/wide_ring.json`,
})
