#!/usr/bin/env -S deno run --allow-all
import { pointsToFunction } from 'https://esm.sh/gh/jeff-hykin/good-js@1.14.6.0/source/flattened/points_to_function.js'
import stringForBiggerSixJson from "./bigger_six.json.binaryified.js"
import { shallowSortObject } from 'https://esm.sh/gh/jeff-hykin/good-js@1.14.6.0/source/flattened/shallow_sort_object.js'
const network = JSON.parse(stringForBiggerSixJson)

const ringSize = 8
let tempNodes = network.nodes.map(each=>each[1])
let rings = [
    tempNodes.slice(0, ringSize), // counterclockwise (yellow)
    tempNodes.slice(ringSize, ringSize * 2), // orange 2
    tempNodes.slice(ringSize * 2, ringSize * 3), // green 2
    tempNodes.slice(ringSize * 3, ringSize * 4), // green 1
    tempNodes.slice(ringSize * 4, ringSize * 5), // orange 1
    tempNodes.slice(ringSize * 5, ringSize * 6), // clockwise (blue)
]

const lightYellow = "#FFEE8A"
const lightGreen = "#98df8a"
const lightOrange = "#ffbf80"
const orange = "#ff7f0e"
const green = "#2ca02c"
const blue = "#1f77b4"

const lightBlue = "#aec7e8"
const yellow = "#ffde16"
const red = "#d62728"
const lightRed = "#ff9896"

rings[0].map(each=>each.color = lightYellow)
rings[1].map(each=>each.color = lightGreen)
rings[2].map(each=>each.color = lightOrange)
rings[3].map(each=>each.color = orange)
rings[4].map(each=>each.color = green)
rings[5].map(each=>each.color = blue)

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
    nodes: rings.flat().map(each=>[each.id, shallowSortObject(each)]),
    edges: edges.map(each=>[`${each.from}_${each.to}`, shallowSortObject(each)]),
}




import { FileSystem, glob } from "https://deno.land/x/quickr@0.7.6/main/file_system.js"
await FileSystem.write({
    data: JSON.stringify(
        newNetwork,
        null,
        4
    ),
    path: `${FileSystem.thisFolder}/bigger_six_new.json`,
})