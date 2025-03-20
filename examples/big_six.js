#!/usr/bin/env -S deno run --allow-all
import { pointsToFunction } from 'https://esm.sh/gh/jeff-hykin/good-js@1.14.6.0/source/flattened/points_to_function.js'
import stringForBigSixFullyConnectedJson from "./big_six_fully_connected.json.binaryified.js"
const network = JSON.parse(stringForBigSixFullyConnectedJson)

let rings = [
    [], // counterclockwise (yellow)
    [], // orange 2
    [], // green 2
    [], // green 1
    [], // orange 1
    [], // clockwise (blue)
]
let index = -1
for (let [_, each] of network.nodes) {
    index++
    rings[index % rings.length].push(each)
}

let ringIndex = -1
for (let eachRing of rings) {
    ringIndex++
    let neuronIndex = -1
    for (let eachNeuron of eachRing) { 
        neuronIndex++
        const incomingEdges = network.edges.filter(([edgeId, eachEdge]) => eachEdge.to == eachNeuron.id)
        const outgoingEdges = network.edges.filter(([edgeId, eachEdge]) => eachEdge.from == eachNeuron.id)
        eachNeuron.id = `ring_${ringIndex}_${neuronIndex}`
        for (let [id, eachEdge] of incomingEdges) {
            eachEdge.to = eachNeuron.id
        }
        for (let [id, eachEdge] of outgoingEdges) {
            eachEdge.from = eachNeuron.id
        }
    }
}
const edges = network.edges.map(each=>each[1])

const getEdges = (neuronId)=>{
    return {
        incoming: edges.filter((eachEdge) => eachEdge.to == neuronId),
        outgoing: edges.filter((eachEdge) => eachEdge.from == neuronId),
    }
}
// 
// 
// do whatever you want with the network here (rings and edges)
// 
//
    // rings.clockwise = rings[5]
    // rings.counterClockwise = rings[0]
    // for (let eachNeuron of rings.clockwise) {
    //     const {incoming, outgoing} = getEdges(eachNeuron.id)
    //     incoming.strength = 0.5
    //     outgoing.strength = 0.5
    // }


// 
// end
// 
const newNetwork = {
    nodes: rings.flat().map(each=>[each.id, each]),
    edges: edges.map(each=>[`${each.from}_${each.to}`, each]),
}




import { FileSystem, glob } from "https://deno.land/x/quickr@0.7.6/main/file_system.js"
await FileSystem.write({
    data: JSON.stringify(
        newNetwork,
        null,
        4
    ),
    path: `${FileSystem.thisFolder}/new_big_six.json`,
})