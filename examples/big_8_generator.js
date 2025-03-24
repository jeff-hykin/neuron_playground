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

    // 
    // outgoing from green
    // 
    index = -1
    for (let eachGreen of greenNodes) {
        index++
        // 
        // green to blue (-1)
        // 
        const eachBlue = wrapAroundGet(index-1, blueNodes)
        circlesByColor[green].edges.push({
            id: `${eachGreen.id}_${eachBlue.id}`,
            from: eachGreen.id,
            to: eachBlue.id,
            strength: 0.5,
        })
        // 
        // green to lightBlue (-1)
        // 
        const eachLightBlue = wrapAroundGet(index-1, lightBlueNodes)
        circlesByColor[green].edges.push({
            id: `${eachGreen.id}_${eachLightBlue.id}`,
            from: eachGreen.id,
            to: eachLightBlue.id,
            strength: 0.5,
        })
    }
    
    // 
    // outgoing from orange
    // 
    index = -1
    for (let eachOrange of orangeNodes) {
        index++
        // 
        // orange to blue (-1)
        // 
        const eachBlue = wrapAroundGet(index-1, blueNodes)
        circlesByColor[orange].edges.push({
            id: `${eachOrange.id}_${eachBlue.id}`,
            from: eachOrange.id,
            to: eachBlue.id,
            strength: 0.5,
        })
        // 
        // orange to lightBlue (-1)
        // 
        const eachLightBlue = wrapAroundGet(index-1, lightBlueNodes)
        circlesByColor[lightBlue].edges.push({
            id: `${eachOrange.id}_${eachLightBlue.id}`,
            from: eachOrange.id,
            to: eachLightBlue.id,
            strength: 0.5,
        })
    }
    
    // 
    // outgoing from blue
    // 
    index = -1
    for (let eachBlue of blueNodes) {
        index++
        // 
        // blue to blue (+0)
        // 
        circlesByColor[blue].edges.push({
            id: `${eachBlue.id}_${eachBlue.id}`,
            from: eachBlue.id,
            to: eachBlue.id,
            strength: 0.5,
        })
        // 
        // blue to green (+1)
        // 
        const eachGreen = wrapAroundGet(index+1, greenNodes)
        circlesByColor[blue].edges.push({
            id: `${eachBlue.id}_${eachGreen.id}`,
            from: eachBlue.id,
            to: eachGreen.id,
            strength: 0.5,
        })
        // 
        // blue to orange (+1)
        // 
        const eachOrange = wrapAroundGet(index+1, orangeNodes)
        circlesByColor[blue].edges.push({
            id: `${eachBlue.id}_${eachOrange.id}`,
            from: eachBlue.id,
            to: eachOrange.id,
            strength: 0.5,
        })
        // 
        // blue to lightBlue (+0)
        // 
        const eachLightBlue = wrapAroundGet(index+0, lightBlueNodes)
        circlesByColor[blue].edges.push({
            id: `${eachBlue.id}_${eachLightBlue.id}`,
            from: eachBlue.id,
            to: eachLightBlue.id,
            strength: 0.5,
        })
        // 
        // blue to red (+0)
        // 
        const eachRed = wrapAroundGet(index+0, redNodes)
        circlesByColor[blue].edges.push({
            id: `${eachBlue.id}_${eachRed.id}`,
            from: eachBlue.id,
            to: eachRed.id,
            strength: 0.5,
        })
        // 
        // blue to lightRed (+0)
        // 
        const eachLightRed = wrapAroundGet(index+0, lightRedNodes)
        circlesByColor[blue].edges.push({
            id: `${eachBlue.id}_${eachLightRed.id}`,
            from: eachBlue.id,
            to: eachLightRed.id,
            strength: 0.5,
        })
        // 
        // blue to lightGreen (-1)
        // 
        const eachLightGreen = wrapAroundGet(index-1, lightGreenNodes)
        circlesByColor[blue].edges.push({
            id: `${eachBlue.id}_${eachLightGreen.id}`,
            from: eachBlue.id,
            to: eachLightGreen.id,
            strength: 0.5,
        })
        // 
        // blue to lightOrange (-1)
        // 
        const eachLightOrange = wrapAroundGet(index-1, lightOrangeNodes)
        circlesByColor[blue].edges.push({
            id: `${eachBlue.id}_${eachLightOrange.id}`,
            from: eachBlue.id,
            to: eachLightOrange.id,
            strength: 0.5,
        })
    }
    
    // 
    // outgoing from red
    // 
    index = -1
    for (let eachRed of redNodes) {
        index++
        // 
        // red to blue (+0)
        // 
        const eachBlue = wrapAroundGet(index+0, blueNodes)
        circlesByColor[red].edges.push({
            id: `${eachRed.id}_${eachBlue.id}`,
            from: eachRed.id,
            to: eachBlue.id,
            strength: 0.5,
        })
        // 
        // red to green (+1)
        // 
        const eachGreen = wrapAroundGet(index+1, greenNodes)
        circlesByColor[red].edges.push({
            id: `${eachRed.id}_${eachGreen.id}`,
            from: eachRed.id,
            to: eachGreen.id,
            strength: 0.5,
        })
        // 
        // red to lightGreen (-1)
        // 
        const eachLightGreen = wrapAroundGet(index-1, lightGreenNodes)
        circlesByColor[red].edges.push({
            id: `${eachRed.id}_${eachLightGreen.id}`,
            from: eachRed.id,
            to: eachLightGreen.id,
            strength: 0.5,
        })
    }
    
    // 
    // outgoing from lightRed
    // 
    index = -1
    for (let eachLightRed of lightRedNodes) {
        index++
        // 
        // lightRed to green (+1)
        // 
        const eachGreen = wrapAroundGet(index+1, greenNodes)
        circlesByColor[lightRed].edges.push({
            id: `${eachLightRed.id}_${eachGreen.id}`,
            from: eachLightRed.id,
            to: eachGreen.id,
            strength: 0.5,
        })
        // 
        // lightRed to lightBlue (+0)
        // 
        const eachLightBlue = wrapAroundGet(index+0, lightBlueNodes)
        circlesByColor[lightRed].edges.push({
            id: `${eachLightRed.id}_${eachLightBlue.id}`,
            from: eachLightRed.id,
            to: eachLightBlue.id,
            strength: 0.5,
        })
        // 
        // lightRed to lightGreen (-1)
        // 
        const eachLightGreen = wrapAroundGet(index-1, lightGreenNodes)
        circlesByColor[lightRed].edges.push({
            id: `${eachLightRed.id}_${eachLightGreen.id}`,
            from: eachLightRed.id,
            to: eachLightGreen.id,
            strength: 0.5,
        })
    }
    
    // 
    // outgoing from lightBlue
    // 
    index = -1
    for (let eachLightBlue of lightBlueNodes) {
        index++
        // 
        // lightBlue to red (+0)
        // 
        const eachRed = wrapAroundGet(index+0, redNodes)
        circlesByColor[lightBlue].edges.push({
            id: `${eachLightBlue.id}_${eachRed.id}`,
            from: eachLightBlue.id,
            to: eachRed.id,
            strength: 0.5,
        })
        // 
        // lightBlue to lightRed (+0)
        // 
        const eachLightRed = wrapAroundGet(index+0, lightRedNodes)
        circlesByColor[lightBlue].edges.push({
            id: `${eachLightBlue.id}_${eachLightRed.id}`,
            from: eachLightBlue.id,
            to: eachLightRed.id,
            strength: 0.5,
        })
        // 
        // lightBlue to green (+1)
        // 
        const eachGreen = wrapAroundGet(index+1, greenNodes)
        circlesByColor[lightBlue].edges.push({
            id: `${eachLightBlue.id}_${eachGreen.id}`,
            from: eachLightBlue.id,
            to: eachGreen.id,
            strength: 0.5,
        })
        // 
        // lightBlue to orange (+1)
        // 
        const eachOrange = wrapAroundGet(index+1, orangeNodes)
        circlesByColor[lightBlue].edges.push({
            id: `${eachLightBlue.id}_${eachOrange.id}`,
            from: eachLightBlue.id,
            to: eachOrange.id,
            strength: 0.5,
        })
        // 
        // lightBlue to lightBlue (+0)
        // 
        circlesByColor[lightBlue].edges.push({
            id: `${eachLightBlue.id}_${eachLightBlue.id}`,
            from: eachLightBlue.id,
            to: eachLightBlue.id,
            strength: 0.5,
        })
        // 
        // lightBlue to lightGreen (-1)
        // 
        const eachLightGreen = wrapAroundGet(index-1, lightGreenNodes)
        circlesByColor[lightBlue].edges.push({
            id: `${eachLightBlue.id}_${eachLightGreen.id}`,
            from: eachLightBlue.id,
            to: eachLightGreen.id,
            strength: 0.5,
        })
        // 
        // lightBlue to lightOrange (-1)
        // 
        const eachLightOrange = wrapAroundGet(index-1, lightOrangeNodes)
        circlesByColor[lightBlue].edges.push({
            id: `${eachLightBlue.id}_${eachLightOrange.id}`,
            from: eachLightBlue.id,
            to: eachLightOrange.id,
            strength: 0.5,
        })
        // 
        // lightBlue to blue (-1)
        // 
        const eachBlue = wrapAroundGet(index-1, blueNodes)
        circlesByColor[lightBlue].edges.push({
            id: `${eachLightBlue.id}_${eachBlue.id}`,
            from: eachLightBlue.id,
            to: eachBlue.id,
            strength: 0.5,
        })
    }
    
    // 
    // outgoing from lightOrange
    // 
    index = -1
    for (let eachLightOrange of lightOrangeNodes) {
        index++
        // 
        // lightOrange to blue (+1)
        // 
        const eachBlue = wrapAroundGet(index+1, blueNodes)
        circlesByColor[lightOrange].edges.push({
            id: `${eachLightOrange.id}_${eachBlue.id}`,
            from: eachLightOrange.id,
            to: eachBlue.id,
            strength: 0.5,
        })
        // 
        // lightOrange to lightBlue (+1)
        // 
        const eachLightBlue = wrapAroundGet(index+1, lightBlueNodes)
        circlesByColor[lightOrange].edges.push({
            id: `${eachLightOrange.id}_${eachLightBlue.id}`,
            from: eachLightOrange.id,
            to: eachLightBlue.id,
            strength: 0.5,
        })
    }
    
    // 
    // outgoing from lightGreen
    // 
    index = -1
    for (let eachLightGreen of lightGreenNodes) {
        index++
        // 
        // lightGreen to blue (+1)
        // 
        const eachBlue = wrapAroundGet(index+1, blueNodes)
        circlesByColor[lightGreen].edges.push({
            id: `${eachLightGreen.id}_${eachBlue.id}`,
            from: eachLightGreen.id,
            to: eachBlue.id,
            strength: 0.5,
        })

        // 
        // lightGreen to lightBlue (+1)
        // 
        const eachLightBlue = wrapAroundGet(index+1, lightBlueNodes)
        circlesByColor[lightGreen].edges.push({
            id: `${eachLightGreen.id}_${eachLightBlue.id}`,
            from: eachLightGreen.id,
            to: eachLightBlue.id,
            strength: 0.5,
        })
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
