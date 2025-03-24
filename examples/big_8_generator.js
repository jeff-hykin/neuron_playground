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
    circleCenterX:160,
    circleCenterY:272,
    innerCircleRadius: 180,
    radiusIncreaseSize: 100,
    angleOffsetIncrementDegrees: 6,
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
