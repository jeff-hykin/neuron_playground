#!/usr/bin/env -S deno run --allow-all
import { pointsToFunction } from "https://esm.sh/gh/jeff-hykin/good-js@1.14.6.0/source/flattened/points_to_function.js"
import { makeCircleOfNodes, wrapAroundGet, getDistance } from "./generator_utils/make_circle_of_nodes.js"
import { makeJointRing } from "./generator_utils/joint_ring.js"
import { generateCirclePoints } from "./generator_utils/generate_circle_points.js"
import { zipShort } from 'https://esm.sh/gh/jeff-hykin/good-js@1.14.6.0/source/flattened/zip_short.js'
import { shallowSortObject } from 'https://esm.sh/gh/jeff-hykin/good-js@1.14.6.0/source/flattened/shallow_sort_object.js'
import { makeBig8Nodes } from "./generator_utils/make_big_8_nodes.js"
import { combineGraphs } from "./generator_utils/combine_graphs.js"

// start with largest circle
const green = "#2ca02c"
const orange = "#ff7f0e"
const blue = "#1f77b4"
const red = "#d62728"
const lightRed = "#ff9896"
const lightBlue = "#aec7e8"
const lightOrange = "#ffbf80"
const lightGreen = "#98df8a"

// const lightYellow = "#FFEE8A"
// const yellow = "#ffde16"
const nameToColor = {
    // these are in order outer-to-innner
    green,
    orange,
    blue,
    red,
    lightRed,
    lightBlue,
    lightOrange,
    lightGreen,
}
const colorToName = Object.fromEntries(Object.entries(nameToColor).map(([k,v])=>[v,k]))
const colorToSeismicName = {
    blue: "EPG-L",
    lightBlue: "EPG-R",

    orange: "PENa-L",
    lightOrange: "PENa-R",

    green: "PENb-L",
    lightGreen: "PENb-R",

    red: "PEG-L",
    lightRed: "PEG-R",
}
const seismicEdgeWeightGroupNames = [
    "d7_d7_contra",
    "d7_d7_ipsi",
    "d7_pen_contra",
    "d7_pen_ipsi",
    "d7_pen-b_contra",
    "d7_pen-b_ipsi",
    "epg_d7_contra",
    "epg_d7_ipsi",
    "epg_epg_contra",
    "epg_epg_ipsi",
    "epg_peg_contra",
    "epg_peg_ipsi",
    "epg_pen_contra",
    "epg_pen_ipsi",
    "epg_pen-b_contra",
    "epg_pen-b_ipsi",
    "peg_epg_contra",
    "peg_epg_ipsi",
    "peg_pen-b_contra",
    "peg_pen-b_ipsi",
    "pen_epg_contra",
    "pen_epg_ipsi",
    "pen-b_epg_contra",
    "pen-b_epg_ipsi",
]
const thisEdgeWeightGroupNames = [
    "epg_epg_-1",
    "epg_epg_0",
    "epg_peg_0",
    "epg_pen_-1",
    "epg_pen_1",
    "epg_pen-b_-1",
    "epg_pen-b_1",
    "peg_epg_0",
    "peg_pen-b_-1",
    "peg_pen-b_1",
    "pen_epg_-1",
    "pen_epg_1",
    "pen-b_epg_-1",
    "pen-b_epg_1",
]
const seismicSingularNames = [
    "epg",
    "pen",
    "pen-b",
    "peg",
    "d7",
]
const fromEdgeColorToPresynapticType = {
    blue: "epg",
    lightBlue: "epg",
    orange: "pen",
    lightOrange: "pen",
    green: "pen-b",
    lightGreen: "pen-b",
    red: "peg",
    lightRed: "peg",
    [blue]: "epg",
    [lightBlue]: "epg",
    [orange]: "pen",
    [lightOrange]: "pen",
    [green]: "pen-b",
    [lightGreen]: "pen-b",
    [red]: "peg",
    [lightRed]: "peg",
}
const {nodes, circlesByColor} = makeBig8Nodes({
    nameToColor,
    numberOfNodes: 12,
    circleCenterX:160,
    circleCenterY:272,
    innerCircleRadius: 300,
    radiusIncreaseSize: 80,
    angleOffsetIncrementDegrees: -10,
    hasCenterGap: true,
    defaultNodeData: {
        spikeThreshold: 1,
        energy: 0.1,
        energyDecayRate: 0.1,
        stableEnergyLevel: 0.1,
        energyAfterFiring: 0,
        radius: 25,
        isFiringNext: false,
        pulse: false,
    },
})

// 
// edge generator
// 
    const greenNodes = circlesByColor[green].nodes
    const blueNodes = circlesByColor[blue].nodes
    const orangeNodes = circlesByColor[orange].nodes
    const redNodes = circlesByColor[red].nodes
    const lightRedNodes = circlesByColor[lightRed].nodes
    const lightBlueNodes = circlesByColor[lightBlue].nodes
    const lightOrangeNodes = circlesByColor[lightOrange].nodes
    const lightGreenNodes = circlesByColor[lightGreen].nodes
    let index // bigger index => more clockwise
    
    const makeEdge = ({fromColor, offset, toColor, strength, }) => {
        const eachSource = circlesByColor[fromColor].nodes[index]
        const eachTarget = wrapAroundGet(index+offset, circlesByColor[toColor].nodes)
        circlesByColor[fromColor].edges.push({
            groupNameId: `${fromEdgeColorToPresynapticType[fromColor]}_${fromEdgeColorToPresynapticType[toColor]}_${offset}`,
            groupColorId: `${colorToName[fromColor]}_${offset}_${colorToName[toColor]}`,
            id: `${eachSource.id}_${eachTarget.id}`,
            from: eachSource.id,
            to: eachTarget.id,
            strength,
        })
    }

    // 
    // outgoing from green
    // 
    index = -1
    for (let eachGreen of greenNodes) {
        index++
        makeEdge({fromColor: green, toColor: blue, offset: (-1), strength: 0.5 })
        makeEdge({fromColor: green, toColor: lightBlue, offset: (-1), strength: 0.5 })
    }
    
    // 
    // outgoing from orange
    // 
    index = -1
    for (let eachOrange of orangeNodes) {
        index++
        makeEdge({fromColor: orange, toColor: blue, offset: (-1), strength: 0.5 })
        makeEdge({fromColor: orange, toColor: lightBlue, offset: (-1), strength: 0.5 })
    }
    
    // 
    // outgoing from blue
    // 
    index = -1
    for (let eachBlue of blueNodes) {
        index++
        makeEdge({fromColor: blue, toColor: blue, offset: (+0), strength: 0.5 })
        makeEdge({fromColor: blue, toColor: green, offset: (+1), strength: 0.5 })
        makeEdge({fromColor: blue, toColor: orange, offset: (+1), strength: 0.5 })
        makeEdge({fromColor: blue, toColor: lightBlue, offset: (+0), strength: 0.5 })
        makeEdge({fromColor: blue, toColor: red, offset: (+0), strength: 0.5 })
        makeEdge({fromColor: blue, toColor: lightRed, offset: (+0), strength: 0.5 })
        makeEdge({fromColor: blue, toColor: lightGreen, offset: (-1), strength: 0.5 })
        makeEdge({fromColor: blue, toColor: lightOrange, offset: (-1), strength: 0.5 })
    }
    
    // 
    // outgoing from red
    // 
    index = -1
    for (let eachRed of redNodes) {
        index++
        makeEdge({fromColor: red, toColor: blue, offset: (+0), strength: 0.5 })
        makeEdge({fromColor: red, toColor: green, offset: (+1), strength: 0.5 })
        makeEdge({fromColor: red, toColor: lightGreen, offset: (-1), strength: 0.5 })
    }
    
    // 
    // outgoing from lightRed
    // 
    index = -1
    for (let eachLightRed of lightRedNodes) {
        index++
        makeEdge({fromColor: lightRed, toColor: green, offset: (+1), strength: 0.5 })
        makeEdge({fromColor: lightRed, toColor: lightBlue, offset: (+0), strength: 0.5 })
        makeEdge({fromColor: lightRed, toColor: lightGreen, offset: (-1), strength: 0.5 })
    }
    
    // 
    // outgoing from lightBlue
    // 
    index = -1
    for (let eachLightBlue of lightBlueNodes) {
        index++
        makeEdge({fromColor: lightBlue, toColor: red, offset: (+0), strength: 0.5 })
        makeEdge({fromColor: lightBlue, toColor: lightRed, offset: (+0), strength: 0.5 })
        makeEdge({fromColor: lightBlue, toColor: green, offset: (+1), strength: 0.5 })
        makeEdge({fromColor: lightBlue, toColor: orange, offset: (+1), strength: 0.5 })
        makeEdge({fromColor: lightBlue, toColor: lightBlue, offset: (+0), strength: 0.5 })
        makeEdge({fromColor: lightBlue, toColor: lightGreen, offset: (-1), strength: 0.5 })
        makeEdge({fromColor: lightBlue, toColor: lightOrange, offset: (-1), strength: 0.5 })
        makeEdge({fromColor: lightBlue, toColor: blue, offset: (-1), strength: 0.5 })
    }
    
    // 
    // outgoing from lightOrange
    // 
    index = -1
    for (let eachLightOrange of lightOrangeNodes) {
        index++
        makeEdge({fromColor: lightOrange, toColor: blue, offset: (+1), strength: 0.5 })
        makeEdge({fromColor: lightOrange, toColor: lightBlue, offset: (+1), strength: 0.5 })
    }
    
    // 
    // outgoing from lightGreen
    // 
    index = -1
    for (let eachLightGreen of lightGreenNodes) {
        index++
        makeEdge({fromColor: lightGreen, toColor: blue, offset: (+1), strength: 0.5 })
        makeEdge({fromColor: lightGreen, toColor: lightBlue, offset: (+1), strength: 0.5 })
    }

const graph = combineGraphs(Object.values(circlesByColor))

import { FileSystem, glob } from "https://deno.land/x/quickr@0.7.6/main/file_system.js"
await FileSystem.write({
    data: JSON.stringify(
        graph,
        null,
        4
    ),
    path: `${FileSystem.thisFolder}/${FileSystem.sync.info(FileSystem.thisFile).name.replace(/_generator$/,"")}.json`,
})
