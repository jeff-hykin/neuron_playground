#!/usr/bin/env -S deno run --allow-all
import { pointsToFunction } from "https://esm.sh/gh/jeff-hykin/good-js@1.14.6.0/source/flattened/points_to_function.js"
import { wrapAroundGet, getDistance } from "./generator_utils/make_circle_of_nodes.js"
import { makeRing } from "./generator_utils/make_ring.js"
import { makeJointRing } from "./generator_utils/joint_ring.js"
import { generateCirclePoints } from "./generator_utils/generate_circle_points.js"
import { zipShort } from 'https://esm.sh/gh/jeff-hykin/good-js@1.14.6.0/source/flattened/zip_short.js'

const graph = makeRing({
    numberOfNodes: 127,
    // energyDecayRate: 0.43333333333333335, // same as excitatory weight for nearest neighbor (given a neutral distance of 1.5)
    // energyDecayRate: 0.7, 
    // maxWeight: 1.3,
    // minWeight: -1.6,
    startX: 160,
    startY: 272,
    ringRadius: 1200,
    namespace: "ring",
    gaussianDecaySigma: 5,
    
    neutralDistance: 1.2, // the width of the active area is also its resistance to anchoring (at least in this model)
    maxWeight: 1,
    minWeight: -0.3,
})

import { FileSystem, glob } from "https://deno.land/x/quickr@0.7.6/main/file_system.js"
await FileSystem.write({
    data: JSON.stringify(
        graph,
        null,
        4
    ),
    path: `${FileSystem.thisFolder}/${FileSystem.sync.info(FileSystem.thisFile).name.replace(/_generator$/,"")}.json`,
})
