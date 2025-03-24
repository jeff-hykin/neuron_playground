#!/usr/bin/env -S deno run --allow-all
import { pointsToFunction } from "https://esm.sh/gh/jeff-hykin/good-js@1.14.6.0/source/flattened/points_to_function.js"
import { makeCircleOfNodes, wrapAroundGet, getDistance } from "./make_circle_of_nodes.js"
import { makeJointRing } from "./joint_ring.js"
import { generateCirclePoints } from "./generate_circle_points.js"
import { zipShort } from 'https://esm.sh/gh/jeff-hykin/good-js@1.14.6.0/source/flattened/zip_short.js'
import { shallowSortObject } from 'https://esm.sh/gh/jeff-hykin/good-js@1.14.6.0/source/flattened/shallow_sort_object.js'
import { combineGraphs } from "./combine_graphs.js"

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

export function makeBig8Nodes({ 
    numberOfNodes=8,
    nameToColor={
        // these are in order outer-to-innner
        green,
        orange,
        blue,
        red,
        lightRed,
        lightBlue,
        lightOrange,
        lightGreen,
    },
    circleCenterX=160,
    circleCenterY=272,
    innerCircleRadius = 180,
    radiusIncreaseSize = 100,
    angleOffsetIncrementDegrees = 6,
    angleOffsetIncrementDecay = 0.9,
    hasCenterGap = true,
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
    const circleColors = Object.values(nameToColor)
    const circlesByColor = {}
    
    // loop inner-to-outer
    let index = -1
    let workingRadius = innerCircleRadius-radiusIncreaseSize
    let angleOffsetDegrees = -angleOffsetIncrementDegrees
    for (let [eachColorName, eachColor] of Object.entries(nameToColor).toReversed()) {
        index++
        workingRadius += radiusIncreaseSize
        angleOffsetDegrees += angleOffsetIncrementDegrees
        angleOffsetIncrementDegrees *= angleOffsetIncrementDecay
        
        // put a gap in the middle
        if (hasCenterGap && (index == Math.ceil(circleColors.length/2))) {
            workingRadius += radiusIncreaseSize
            angleOffsetDegrees += angleOffsetIncrementDegrees
            angleOffsetIncrementDegrees *= angleOffsetIncrementDecay
        }

        const circle = makeCircleOfNodes({
            numberOfNodes,
            ringRadius: workingRadius,
            namespace: eachColorName,
            circleCenterX: circleCenterX,
            circleCenterY: circleCenterY,
            angleOffsetDegrees,
            defaultNodeData: {
                color: eachColor,
                spikeThreshold: 1,
                energy: 0.1,
                energyDecayRate: 0.1,
                stableEnergyLevel: 0.1,
                energyAfterFiring: 0,
                radius: 25,
                isFiringNext: false,
                pulse: false,
                ...defaultNodeData,
                color: eachColor,
            },
        })
        circlesByColor[eachColor] = circle
        // sort keys
        for (let each of circle.nodes) {
            shallowSortObject(each)
        }
    }
    const graph = combineGraphs(Object.values(circlesByColor))

    return { nodes:graph.nodes, circlesByColor,}
}