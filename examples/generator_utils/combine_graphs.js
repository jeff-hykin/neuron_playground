export function combineGraphs(graphs) {
    const nodes = []
    const edges = []
    for (let eachGraph of graphs) {
        nodes.push(...eachGraph.nodes)
        edges.push(...eachGraph.edges)
    }
    return { nodes, edges }
}