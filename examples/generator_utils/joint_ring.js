import { makeRing, getDistance } from "./make_ring.js"
import { pointsToFunction } from 'https://esm.sh/gh/jeff-hykin/good-js@1.14.6.0/source/flattened/points_to_function.js'

export function makeJointRing({ distance=700, ringArgs, minWeight, }) {
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
    for (let eachSource of ring1.nodes) {
        for (let eachTarget of ring2.nodes) {
            const distanceAsIfRingsWereOverlayed = getDistance({
                node1Id: eachSource.id,
                node2Id: eachTarget.id,
                nodeIdToIndex: {...ring1.nodeIdToIndex, ...ring2.nodeIdToIndex},
                // this only works because node2Id is the one being compared against
                nodes: ring2.nodes, 
            })

            edges.push({
                id: `${eachSource.id}-${eachTarget.id}`,
                "from": eachTarget.id,
                "to": eachSource.id,
                "strength": distanceToStrength(distanceAsIfRingsWereOverlayed),
            })
        }
    }

    // flip roles
    for (let eachSource of ring2.nodes) {
        for (let eachTarget of ring1.nodes) {
            const distanceAsIfRingsWereOverlayed = getDistance({
                node1Id: eachSource.id,
                node2Id: eachTarget.id,
                nodeIdToIndex: {...ring2.nodeIdToIndex, ...ring1.nodeIdToIndex},
                // this only works because node2Id is the one being compared against
                nodes: ring1.nodes, 
            })

            edges.push({
                id: `${eachSource.id}-${eachTarget.id}`,
                "from": eachTarget.id,
                "to": eachSource.id,
                "strength": distanceToStrength(distanceAsIfRingsWereOverlayed),
            })
        }
    }

    return {
        nodes: [...ring1.nodes, ...ring2.nodes],
        edges: [...ring1.edges, ...ring2.edges, ...edges],
    }
}