import { Elemental, passAlongProps, html } from "./imports/elemental.js"
import InfiniteCanvas from "./main/infinite_canvas.js"
import Button from "./main/button.js"

function downloadCanvasState(canvas) {
    const jsonString = canvas.saveToJSON()
    const blob = new Blob([jsonString], { type: "application/json" })
    const url = URL.createObjectURL(blob)

    const a = document.createElement("a")
    a.href = url
    a.download = `canvas-state-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
}

function loadCanvasState(infCanvas) {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json'
    input.onchange = (event) => {
        const file = event.target.files[0]
        if (file) {
            const reader = new FileReader()
            reader.onload = (e) => {
                const jsonData = JSON.parse(e.target.result)
                infCanvas.load(jsonData)
            }
            reader.readAsText(file)
        }
    }
    input.click()
}

function createSettingsPanel({onValueChange, numericInputs, children}) {
    const settingsPanel = document.createElement('div')
    settingsPanel.style.position = 'fixed'
    settingsPanel.style.left = '-200px'
    settingsPanel.style.top = '0'
    settingsPanel.style.width = '200px'
    settingsPanel.style.height = '100%'
    settingsPanel.style.backgroundColor = '#f8f8f8'
    settingsPanel.style.boxShadow = '2px 0 5px rgba(0,0,0,0.3)'
    settingsPanel.style.transition = 'left 0.3s ease'
    settingsPanel.style.padding = '20px'
    settingsPanel.style.display = 'flex'
    settingsPanel.style.flexDirection = 'column'
    settingsPanel.style.alignItems = 'center'

    const settingsIcon = document.createElement('div')
    settingsIcon.textContent = '⚙️'
    settingsIcon.style.fontSize = '24px'
    settingsIcon.style.marginBottom = '20px'
    settingsIcon.style.position = 'absolute'
    settingsIcon.style.right = '10px'
    settingsIcon.style.top = '5px'
    settingsPanel.appendChild(settingsIcon)

    settingsPanel.onmouseover = () => {
        settingsPanel.style.left = '0'
    }

    settingsPanel.onmouseout = () => {
        settingsPanel.style.left = '-200px'
    }

    const createInputField = ({labelText, defaultValue, stepValue = 1}) => {
        const container = document.createElement('div')
        const label = document.createElement('label')
        label.textContent = labelText
        const input = document.createElement('input')
        input.type = 'number'
        input.value = defaultValue
        input.step = stepValue
        input.style.width = '100%'
        input.style.marginBottom = '10px'
        input.style.padding = '5px'
        input.style.border = '1px solid #ccc'
        input.style.borderRadius = '4px'
        input.onchange = () => onValueChange({labelText, value: input.value})
        container.appendChild(label)
        container.appendChild(input)
        return container
    }

    settingsPanel.appendChild(html`<div height="2rem" padding-bottom="1rem">Settings</div>`)
    for (let each of numericInputs) {
        settingsPanel.appendChild(createInputField(each))
    }

    const usageInstructions = `
        <strong>How do I use it?</strong>
        <ul>
            <li>Right click to add a neuron</li>
            <li>Click and drag to move a neuron around or pan around the canvas</li>
            <li>Scroll to zoom in and out</li>
            <li>Shift-click one neuron, then shift-click another neuron to create a connection between them.</li>
            <li>Click a connection to change its weight (it can be negative, expected values are between -1 and 1)</li>
            <li>Click a neuron to make it spike/fire</li>
            <li>Click the "Next" button to step the simulation forward one step and see the results</li>
            <li>You can make pretty advanced networks by saving, editing the JSON of the save file, and loading it back in</li>
        </ul>
    `

    const instructionsDiv = document.createElement('div')
    instructionsDiv.style.marginTop = '20px'
    instructionsDiv.style.padding = '10px'
    instructionsDiv.style.backgroundColor = '#f0f0f0'
    instructionsDiv.style.border = '1px solid #ccc'
    instructionsDiv.style.borderRadius = '4px'
    instructionsDiv.style.fontSize = '12px'
    instructionsDiv.style.lineHeight = '1.5'
    instructionsDiv.innerHTML = usageInstructions

    settingsPanel.appendChild(instructionsDiv)

    return settingsPanel
}

// Create instance when the page loads
window.addEventListener("load", () => {
    const footer = html`<div style="height: 3rem; overflow: auto;position: fixed; left: 0; bottom: 0; width: 100vw; text-align: center; background: transparent; opacity: 0.6;">
        © 2025 Jeff Hykin<br>
        Code: <a href="https://github.com/jeff-hykin/neuron_playground">
            https://github.com/jeff-hykin/neuron_playground
        </a>
    </div>`
    const infoPanel = html`<div style="height: 5rem; overflow: auto;position: fixed; right: 0; bottom: 0; width: 200px; background: transparent;">[info area]</div>`
    const infCanvas = new InfiniteCanvas({ onNodeHovered: (node)=>{
        infoPanel.innerHTML = `Node ID: ${node.id}<br>Energy: ${node.energy.toFixed(2)}<br>Energy Decay Rate: ${node.energyDecayRate}`
    }})

    const settingsPanel = createSettingsPanel({
        onValueChange: ({labelText, value}) => {
            switch (labelText) {
                case 'Node Radius':
                    infCanvas.nodeNetwork.defaultNodeData.radius = value-0
                    infCanvas.nodeNetwork.nodes.forEach(node => node.radius = value-0)
                    break;
                case 'Energy Decay Rate':
                    infCanvas.nodeNetwork.defaultNodeData.energyDecayRate = value-0
                    infCanvas.nodeNetwork.nodes.forEach(node => node.energyDecayRate = value-0)
                    break;
                case 'Stable Energy Level':
                    infCanvas.nodeNetwork.defaultNodeData.stableEnergyLevel = value-0
                    infCanvas.nodeNetwork.nodes.forEach(node => node.stableEnergyLevel = value-0)
                    break;
                case 'Energy After Firing':
                    infCanvas.nodeNetwork.defaultNodeData.energyAfterFiring = value-0
                    infCanvas.nodeNetwork.nodes.forEach(node => node.energyAfterFiring = value-0)
                    break;
                default:
                    break;
            }
        },
        numericInputs: [
            {labelText: 'Node Radius', defaultValue: infCanvas.nodeNetwork.defaultNodeData.radius},
            {labelText: 'Energy Decay Rate', defaultValue: infCanvas.nodeNetwork.defaultNodeData.energyDecayRate},
            {labelText: 'Stable Energy Level', defaultValue: infCanvas.nodeNetwork.defaultNodeData.stableEnergyLevel, stepValue: 0.1},
            {labelText: 'Energy After Firing', defaultValue: infCanvas.nodeNetwork.defaultNodeData.energyAfterFiring, stepValue: 0.1},
        ],
    })

    document.body = html`<body style="margin: 0; overflow: hidden; background: #f0f0f0; font-family: Helvetica, Arial, sans-serif;">
        ${infCanvas.element}
        <div style="position: fixed; top: 20px; right: 20px; gap: 2rem; display: flex;">
            ${Button({ children: "Save", onClick: () => downloadCanvasState(infCanvas) })}
            ${Button({ children: "Load", onClick: () => loadCanvasState(infCanvas) })}
            ${Button({ children: "Back", onClick: () => { infCanvas.nodeNetwork.back(); infCanvas.draw(); } })}
            ${Button({ children: "Next", onClick: () => infCanvas.next() })}
        </div>
        ${settingsPanel}
        ${infoPanel}
        ${footer}
        <h1 style="position: fixed; top: 20px; left: 4rem; font-size: 1.5rem; font-weight: bold; margin: 0; z-index: -1;">
            Neuron Playground
        </h1>
    </body>`
    
    // hardcoded for now
    infCanvas.load({
        "nodes": [
            {
                "color": "#98df8a",
                "spikeThreshold": 1,
                "energy": 0.1,
                "energyDecayRate": 0.1,
                "stableEnergyLevel": 0.1,
                "energyAfterFiring": 0,
                "radius": 25,
                "isFiringNext": false,
                "pulse": false,
                "x": 460,
                "y": 272,
                "id": "lightGreen_1_1"
            },
            {
                "color": "#98df8a",
                "spikeThreshold": 1,
                "energy": 0.1,
                "energyDecayRate": 0.1,
                "stableEnergyLevel": 0.1,
                "energyAfterFiring": 0,
                "radius": 25,
                "isFiringNext": false,
                "pulse": false,
                "x": 419.8076211353316,
                "y": 422,
                "id": "lightGreen_1_2"
            },
            {
                "color": "#98df8a",
                "spikeThreshold": 1,
                "energy": 0.1,
                "energyDecayRate": 0.1,
                "stableEnergyLevel": 0.1,
                "energyAfterFiring": 0,
                "radius": 25,
                "isFiringNext": false,
                "pulse": false,
                "x": 310,
                "y": 531.8076211353316,
                "id": "lightGreen_1_3"
            },
            {
                "color": "#98df8a",
                "spikeThreshold": 1,
                "energy": 0.1,
                "energyDecayRate": 0.1,
                "stableEnergyLevel": 0.1,
                "energyAfterFiring": 0,
                "radius": 25,
                "isFiringNext": false,
                "pulse": false,
                "x": 160.00000000000003,
                "y": 572,
                "id": "lightGreen_1_4"
            },
            {
                "color": "#98df8a",
                "spikeThreshold": 1,
                "energy": 0.1,
                "energyDecayRate": 0.1,
                "stableEnergyLevel": 0.1,
                "energyAfterFiring": 0,
                "radius": 25,
                "isFiringNext": false,
                "pulse": false,
                "x": 10.000000000000057,
                "y": 531.8076211353316,
                "id": "lightGreen_1_5"
            },
            {
                "color": "#98df8a",
                "spikeThreshold": 1,
                "energy": 0.1,
                "energyDecayRate": 0.1,
                "stableEnergyLevel": 0.1,
                "energyAfterFiring": 0,
                "radius": 25,
                "isFiringNext": false,
                "pulse": false,
                "x": -99.80762113533154,
                "y": 422.0000000000001,
                "id": "lightGreen_1_6"
            },
            {
                "color": "#98df8a",
                "spikeThreshold": 1,
                "energy": 0.1,
                "energyDecayRate": 0.1,
                "stableEnergyLevel": 0.1,
                "energyAfterFiring": 0,
                "radius": 25,
                "isFiringNext": false,
                "pulse": false,
                "x": -140,
                "y": 272.00000000000006,
                "id": "lightGreen_1_7"
            },
            {
                "color": "#98df8a",
                "spikeThreshold": 1,
                "energy": 0.1,
                "energyDecayRate": 0.1,
                "stableEnergyLevel": 0.1,
                "energyAfterFiring": 0,
                "radius": 25,
                "isFiringNext": false,
                "pulse": false,
                "x": -99.80762113533166,
                "y": 122.00000000000009,
                "id": "lightGreen_1_8"
            },
            {
                "color": "#98df8a",
                "spikeThreshold": 1,
                "energy": 0.1,
                "energyDecayRate": 0.1,
                "stableEnergyLevel": 0.1,
                "energyAfterFiring": 0,
                "radius": 25,
                "isFiringNext": false,
                "pulse": false,
                "x": 9.999999999999858,
                "y": 12.192378864668513,
                "id": "lightGreen_1_9"
            },
            {
                "color": "#98df8a",
                "spikeThreshold": 1,
                "energy": 0.1,
                "energyDecayRate": 0.1,
                "stableEnergyLevel": 0.1,
                "energyAfterFiring": 0,
                "radius": 25,
                "isFiringNext": false,
                "pulse": false,
                "x": 159.99999999999994,
                "y": -28,
                "id": "lightGreen_1_10"
            },
            {
                "color": "#98df8a",
                "spikeThreshold": 1,
                "energy": 0.1,
                "energyDecayRate": 0.1,
                "stableEnergyLevel": 0.1,
                "energyAfterFiring": 0,
                "radius": 25,
                "isFiringNext": false,
                "pulse": false,
                "x": 309.9999999999998,
                "y": 12.192378864668285,
                "id": "lightGreen_1_11"
            },
            {
                "color": "#98df8a",
                "spikeThreshold": 1,
                "energy": 0.1,
                "energyDecayRate": 0.1,
                "stableEnergyLevel": 0.1,
                "energyAfterFiring": 0,
                "radius": 25,
                "isFiringNext": false,
                "pulse": false,
                "x": 419.8076211353315,
                "y": 121.99999999999986,
                "id": "lightGreen_1_12"
            },
            {
                "color": "#ffbf80",
                "spikeThreshold": 1,
                "energy": 0.1,
                "energyDecayRate": 0.1,
                "stableEnergyLevel": 0.1,
                "energyAfterFiring": 0,
                "radius": 25,
                "isFiringNext": false,
                "pulse": false,
                "x": 535.3215694261523,
                "y": 212.55490328471228,
                "id": "lightOrange_2_1"
            },
            {
                "color": "#ffbf80",
                "spikeThreshold": 1,
                "energy": 0.1,
                "energyDecayRate": 0.1,
                "stableEnergyLevel": 0.1,
                "energyAfterFiring": 0,
                "radius": 25,
                "isFiringNext": false,
                "pulse": false,
                "x": 514.7605620689367,
                "y": 408.1798208272141,
                "id": "lightOrange_2_2"
            },
            {
                "color": "#ffbf80",
                "spikeThreshold": 1,
                "energy": 0.1,
                "energyDecayRate": 0.1,
                "stableEnergyLevel": 0.1,
                "energyAfterFiring": 0,
                "radius": 25,
                "isFiringNext": false,
                "pulse": false,
                "x": 399.14174859893825,
                "y": 567.315465353649,
                "id": "lightOrange_2_3"
            },
            {
                "color": "#ffbf80",
                "spikeThreshold": 1,
                "energy": 0.1,
                "energyDecayRate": 0.1,
                "stableEnergyLevel": 0.1,
                "energyAfterFiring": 0,
                "radius": 25,
                "isFiringNext": false,
                "pulse": false,
                "x": 219.44509671528775,
                "y": 647.3215694261523,
                "id": "lightOrange_2_4"
            },
            {
                "color": "#ffbf80",
                "spikeThreshold": 1,
                "energy": 0.1,
                "energyDecayRate": 0.1,
                "stableEnergyLevel": 0.1,
                "energyAfterFiring": 0,
                "radius": 25,
                "isFiringNext": false,
                "pulse": false,
                "x": 23.82017917278597,
                "y": 626.7605620689367,
                "id": "lightOrange_2_5"
            },
            {
                "color": "#ffbf80",
                "spikeThreshold": 1,
                "energy": 0.1,
                "energyDecayRate": 0.1,
                "stableEnergyLevel": 0.1,
                "energyAfterFiring": 0,
                "radius": 25,
                "isFiringNext": false,
                "pulse": false,
                "x": -135.31546535364885,
                "y": 511.1417485989383,
                "id": "lightOrange_2_6"
            },
            {
                "color": "#ffbf80",
                "spikeThreshold": 1,
                "energy": 0.1,
                "energyDecayRate": 0.1,
                "stableEnergyLevel": 0.1,
                "energyAfterFiring": 0,
                "radius": 25,
                "isFiringNext": false,
                "pulse": false,
                "x": -215.32156942615234,
                "y": 331.4450967152878,
                "id": "lightOrange_2_7"
            },
            {
                "color": "#ffbf80",
                "spikeThreshold": 1,
                "energy": 0.1,
                "energyDecayRate": 0.1,
                "stableEnergyLevel": 0.1,
                "energyAfterFiring": 0,
                "radius": 25,
                "isFiringNext": false,
                "pulse": false,
                "x": -194.76056206893668,
                "y": 135.820179172786,
                "id": "lightOrange_2_8"
            },
            {
                "color": "#ffbf80",
                "spikeThreshold": 1,
                "energy": 0.1,
                "energyDecayRate": 0.1,
                "stableEnergyLevel": 0.1,
                "energyAfterFiring": 0,
                "radius": 25,
                "isFiringNext": false,
                "pulse": false,
                "x": -79.14174859893836,
                "y": -23.31546535364879,
                "id": "lightOrange_2_9"
            },
            {
                "color": "#ffbf80",
                "spikeThreshold": 1,
                "energy": 0.1,
                "energyDecayRate": 0.1,
                "stableEnergyLevel": 0.1,
                "energyAfterFiring": 0,
                "radius": 25,
                "isFiringNext": false,
                "pulse": false,
                "x": 100.5549032847122,
                "y": -103.32156942615234,
                "id": "lightOrange_2_10"
            },
            {
                "color": "#ffbf80",
                "spikeThreshold": 1,
                "energy": 0.1,
                "energyDecayRate": 0.1,
                "stableEnergyLevel": 0.1,
                "energyAfterFiring": 0,
                "radius": 25,
                "isFiringNext": false,
                "pulse": false,
                "x": 296.1798208272138,
                "y": -82.76056206893679,
                "id": "lightOrange_2_11"
            },
            {
                "color": "#ffbf80",
                "spikeThreshold": 1,
                "energy": 0.1,
                "energyDecayRate": 0.1,
                "stableEnergyLevel": 0.1,
                "energyAfterFiring": 0,
                "radius": 25,
                "isFiringNext": false,
                "pulse": false,
                "x": 455.3154653536488,
                "y": 32.858251401061636,
                "id": "lightOrange_2_12"
            },
            {
                "color": "#aec7e8",
                "spikeThreshold": 1,
                "energy": 0.1,
                "energyDecayRate": 0.1,
                "stableEnergyLevel": 0.1,
                "energyAfterFiring": 0,
                "radius": 25,
                "isFiringNext": false,
                "pulse": false,
                "x": 599.6647868072318,
                "y": 136.74145039314018,
                "id": "lightBlue_3_1"
            },
            {
                "color": "#aec7e8",
                "spikeThreshold": 1,
                "energy": 0.1,
                "energyDecayRate": 0.1,
                "stableEnergyLevel": 0.1,
                "energyAfterFiring": 0,
                "radius": 25,
                "isFiringNext": false,
                "pulse": false,
                "x": 608.390149327962,
                "y": 374.6950533650376,
                "id": "lightBlue_3_2"
            },
            {
                "color": "#aec7e8",
                "spikeThreshold": 1,
                "energy": 0.1,
                "energyDecayRate": 0.1,
                "stableEnergyLevel": 0.1,
                "energyAfterFiring": 0,
                "radius": 25,
                "isFiringNext": false,
                "pulse": false,
                "x": 496.96973344219424,
                "y": 585.1315997211021,
                "id": "lightBlue_3_3"
            },
            {
                "color": "#aec7e8",
                "spikeThreshold": 1,
                "energy": 0.1,
                "energyDecayRate": 0.1,
                "stableEnergyLevel": 0.1,
                "energyAfterFiring": 0,
                "radius": 25,
                "isFiringNext": false,
                "pulse": false,
                "x": 295.2585496068599,
                "y": 711.6647868072318,
                "id": "lightBlue_3_4"
            },
            {
                "color": "#aec7e8",
                "spikeThreshold": 1,
                "energy": 0.1,
                "energyDecayRate": 0.1,
                "stableEnergyLevel": 0.1,
                "energyAfterFiring": 0,
                "radius": 25,
                "isFiringNext": false,
                "pulse": false,
                "x": 57.304946634962505,
                "y": 720.390149327962,
                "id": "lightBlue_3_5"
            },
            {
                "color": "#aec7e8",
                "spikeThreshold": 1,
                "energy": 0.1,
                "energyDecayRate": 0.1,
                "stableEnergyLevel": 0.1,
                "energyAfterFiring": 0,
                "radius": 25,
                "isFiringNext": false,
                "pulse": false,
                "x": -153.13159972110202,
                "y": 608.9697334421944,
                "id": "lightBlue_3_6"
            },
            {
                "color": "#aec7e8",
                "spikeThreshold": 1,
                "energy": 0.1,
                "energyDecayRate": 0.1,
                "stableEnergyLevel": 0.1,
                "energyAfterFiring": 0,
                "radius": 25,
                "isFiringNext": false,
                "pulse": false,
                "x": -279.66478680723185,
                "y": 407.2585496068599,
                "id": "lightBlue_3_7"
            },
            {
                "color": "#aec7e8",
                "spikeThreshold": 1,
                "energy": 0.1,
                "energyDecayRate": 0.1,
                "stableEnergyLevel": 0.1,
                "energyAfterFiring": 0,
                "radius": 25,
                "isFiringNext": false,
                "pulse": false,
                "x": -288.39014932796204,
                "y": 169.30494663496253,
                "id": "lightBlue_3_8"
            },
            {
                "color": "#aec7e8",
                "spikeThreshold": 1,
                "energy": 0.1,
                "energyDecayRate": 0.1,
                "stableEnergyLevel": 0.1,
                "energyAfterFiring": 0,
                "radius": 25,
                "isFiringNext": false,
                "pulse": false,
                "x": -176.9697334421944,
                "y": -41.13159972110196,
                "id": "lightBlue_3_9"
            },
            {
                "color": "#aec7e8",
                "spikeThreshold": 1,
                "energy": 0.1,
                "energyDecayRate": 0.1,
                "stableEnergyLevel": 0.1,
                "energyAfterFiring": 0,
                "radius": 25,
                "isFiringNext": false,
                "pulse": false,
                "x": 24.74145039314007,
                "y": -167.6647868072318,
                "id": "lightBlue_3_10"
            },
            {
                "color": "#aec7e8",
                "spikeThreshold": 1,
                "energy": 0.1,
                "energyDecayRate": 0.1,
                "stableEnergyLevel": 0.1,
                "energyAfterFiring": 0,
                "radius": 25,
                "isFiringNext": false,
                "pulse": false,
                "x": 262.6950533650372,
                "y": -176.3901493279621,
                "id": "lightBlue_3_11"
            },
            {
                "color": "#aec7e8",
                "spikeThreshold": 1,
                "energy": 0.1,
                "energyDecayRate": 0.1,
                "stableEnergyLevel": 0.1,
                "energyAfterFiring": 0,
                "radius": 25,
                "isFiringNext": false,
                "pulse": false,
                "x": 473.13159972110196,
                "y": -64.96973344219441,
                "id": "lightBlue_3_12"
            },
            {
                "color": "#ff9896",
                "spikeThreshold": 1,
                "energy": 0.1,
                "energyDecayRate": 0.1,
                "stableEnergyLevel": 0.1,
                "energyAfterFiring": 0,
                "radius": 25,
                "isFiringNext": false,
                "pulse": false,
                "x": 651.8081035203222,
                "y": 49.00944120491542,
                "id": "lightRed_4_1"
            },
            {
                "color": "#ff9896",
                "spikeThreshold": 1,
                "energy": 0.1,
                "energyDecayRate": 0.1,
                "stableEnergyLevel": 0.1,
                "energyAfterFiring": 0,
                "radius": 25,
                "isFiringNext": false,
                "pulse": false,
                "x": 697.4135908331883,
                "y": 324.78856303953035,
                "id": "lightRed_4_2"
            },
            {
                "color": "#ff9896",
                "spikeThreshold": 1,
                "energy": 0.1,
                "energyDecayRate": 0.1,
                "stableEnergyLevel": 0.1,
                "energyAfterFiring": 0,
                "radius": 25,
                "isFiringNext": false,
                "pulse": false,
                "x": 599.0195404807919,
                "y": 586.4230320381037,
                "id": "lightRed_4_3"
            },
            {
                "color": "#ff9896",
                "spikeThreshold": 1,
                "energy": 0.1,
                "energyDecayRate": 0.1,
                "stableEnergyLevel": 0.1,
                "energyAfterFiring": 0,
                "radius": 25,
                "isFiringNext": false,
                "pulse": false,
                "x": 382.99055879508455,
                "y": 763.8081035203222,
                "id": "lightRed_4_4"
            },
            {
                "color": "#ff9896",
                "spikeThreshold": 1,
                "energy": 0.1,
                "energyDecayRate": 0.1,
                "stableEnergyLevel": 0.1,
                "energyAfterFiring": 0,
                "radius": 25,
                "isFiringNext": false,
                "pulse": false,
                "x": 107.21143696046973,
                "y": 809.4135908331883,
                "id": "lightRed_4_5"
            },
            {
                "color": "#ff9896",
                "spikeThreshold": 1,
                "energy": 0.1,
                "energyDecayRate": 0.1,
                "stableEnergyLevel": 0.1,
                "energyAfterFiring": 0,
                "radius": 25,
                "isFiringNext": false,
                "pulse": false,
                "x": -154.42303203810343,
                "y": 711.019540480792,
                "id": "lightRed_4_6"
            },
            {
                "color": "#ff9896",
                "spikeThreshold": 1,
                "energy": 0.1,
                "energyDecayRate": 0.1,
                "stableEnergyLevel": 0.1,
                "energyAfterFiring": 0,
                "radius": 25,
                "isFiringNext": false,
                "pulse": false,
                "x": -331.8081035203221,
                "y": 494.9905587950847,
                "id": "lightRed_4_7"
            },
            {
                "color": "#ff9896",
                "spikeThreshold": 1,
                "energy": 0.1,
                "energyDecayRate": 0.1,
                "stableEnergyLevel": 0.1,
                "energyAfterFiring": 0,
                "radius": 25,
                "isFiringNext": false,
                "pulse": false,
                "x": -377.4135908331883,
                "y": 219.21143696046988,
                "id": "lightRed_4_8"
            },
            {
                "color": "#ff9896",
                "spikeThreshold": 1,
                "energy": 0.1,
                "energyDecayRate": 0.1,
                "stableEnergyLevel": 0.1,
                "energyAfterFiring": 0,
                "radius": 25,
                "isFiringNext": false,
                "pulse": false,
                "x": -279.019540480792,
                "y": -42.42303203810343,
                "id": "lightRed_4_9"
            },
            {
                "color": "#ff9896",
                "spikeThreshold": 1,
                "energy": 0.1,
                "energyDecayRate": 0.1,
                "stableEnergyLevel": 0.1,
                "energyAfterFiring": 0,
                "radius": 25,
                "isFiringNext": false,
                "pulse": false,
                "x": -62.99055879508475,
                "y": -219.8081035203221,
                "id": "lightRed_4_10"
            },
            {
                "color": "#ff9896",
                "spikeThreshold": 1,
                "energy": 0.1,
                "energyDecayRate": 0.1,
                "stableEnergyLevel": 0.1,
                "energyAfterFiring": 0,
                "radius": 25,
                "isFiringNext": false,
                "pulse": false,
                "x": 212.78856303952983,
                "y": -265.4135908331883,
                "id": "lightRed_4_11"
            },
            {
                "color": "#ff9896",
                "spikeThreshold": 1,
                "energy": 0.1,
                "energyDecayRate": 0.1,
                "stableEnergyLevel": 0.1,
                "energyAfterFiring": 0,
                "radius": 25,
                "isFiringNext": false,
                "pulse": false,
                "x": 474.42303203810343,
                "y": -167.01954048079205,
                "id": "lightRed_4_12"
            },
            {
                "color": "#d62728",
                "spikeThreshold": 1,
                "energy": 0.1,
                "energyDecayRate": 0.1,
                "stableEnergyLevel": 0.1,
                "energyAfterFiring": 0,
                "radius": 25,
                "isFiringNext": false,
                "pulse": false,
                "x": 720.1025913903497,
                "y": -147.86317666332076,
                "id": "red_5_1"
            },
            {
                "color": "#d62728",
                "spikeThreshold": 1,
                "energy": 0.1,
                "energyDecayRate": 0.1,
                "stableEnergyLevel": 0.1,
                "energyAfterFiring": 0,
                "radius": 25,
                "isFiringNext": false,
                "pulse": false,
                "x": 854.9946612011985,
                "y": 188.4391185911054,
                "id": "red_5_2"
            },
            {
                "color": "#d62728",
                "spikeThreshold": 1,
                "energy": 0.1,
                "energyDecayRate": 0.1,
                "stableEnergyLevel": 0.1,
                "energyAfterFiring": 0,
                "radius": 25,
                "isFiringNext": false,
                "pulse": false,
                "x": 803.6634727992443,
                "y": 547.1314845378777,
                "id": "red_5_3"
            },
            {
                "color": "#d62728",
                "spikeThreshold": 1,
                "energy": 0.1,
                "energyDecayRate": 0.1,
                "stableEnergyLevel": 0.1,
                "energyAfterFiring": 0,
                "radius": 25,
                "isFiringNext": false,
                "pulse": false,
                "x": 579.8631766633208,
                "y": 832.1025913903497,
                "id": "red_5_4"
            },
            {
                "color": "#d62728",
                "spikeThreshold": 1,
                "energy": 0.1,
                "energyDecayRate": 0.1,
                "stableEnergyLevel": 0.1,
                "energyAfterFiring": 0,
                "radius": 25,
                "isFiringNext": false,
                "pulse": false,
                "x": 243.56088140889466,
                "y": 966.9946612011985,
                "id": "red_5_5"
            },
            {
                "color": "#d62728",
                "spikeThreshold": 1,
                "energy": 0.1,
                "energyDecayRate": 0.1,
                "stableEnergyLevel": 0.1,
                "energyAfterFiring": 0,
                "radius": 25,
                "isFiringNext": false,
                "pulse": false,
                "x": -115.13148453787755,
                "y": 915.6634727992445,
                "id": "red_5_6"
            },
            {
                "color": "#d62728",
                "spikeThreshold": 1,
                "energy": 0.1,
                "energyDecayRate": 0.1,
                "stableEnergyLevel": 0.1,
                "energyAfterFiring": 0,
                "radius": 25,
                "isFiringNext": false,
                "pulse": false,
                "x": -400.10259139034974,
                "y": 691.8631766633207,
                "id": "red_5_7"
            },
            {
                "color": "#d62728",
                "spikeThreshold": 1,
                "energy": 0.1,
                "energyDecayRate": 0.1,
                "stableEnergyLevel": 0.1,
                "energyAfterFiring": 0,
                "radius": 25,
                "isFiringNext": false,
                "pulse": false,
                "x": -534.9946612011985,
                "y": 355.5608814088947,
                "id": "red_5_8"
            },
            {
                "color": "#d62728",
                "spikeThreshold": 1,
                "energy": 0.1,
                "energyDecayRate": 0.1,
                "stableEnergyLevel": 0.1,
                "energyAfterFiring": 0,
                "radius": 25,
                "isFiringNext": false,
                "pulse": false,
                "x": -483.66347279924446,
                "y": -3.1314845378774976,
                "id": "red_5_9"
            },
            {
                "color": "#d62728",
                "spikeThreshold": 1,
                "energy": 0.1,
                "energyDecayRate": 0.1,
                "stableEnergyLevel": 0.1,
                "energyAfterFiring": 0,
                "radius": 25,
                "isFiringNext": false,
                "pulse": false,
                "x": -259.86317666332104,
                "y": -288.1025913903495,
                "id": "red_5_10"
            },
            {
                "color": "#d62728",
                "spikeThreshold": 1,
                "energy": 0.1,
                "energyDecayRate": 0.1,
                "stableEnergyLevel": 0.1,
                "energyAfterFiring": 0,
                "radius": 25,
                "isFiringNext": false,
                "pulse": false,
                "x": 76.43911859110464,
                "y": -422.99466120119837,
                "id": "red_5_11"
            },
            {
                "color": "#d62728",
                "spikeThreshold": 1,
                "energy": 0.1,
                "energyDecayRate": 0.1,
                "stableEnergyLevel": 0.1,
                "energyAfterFiring": 0,
                "radius": 25,
                "isFiringNext": false,
                "pulse": false,
                "x": 435.13148453787716,
                "y": -371.6634727992446,
                "id": "red_5_12"
            },
            {
                "color": "#1f77b4",
                "spikeThreshold": 1,
                "energy": 0.1,
                "energyDecayRate": 0.1,
                "stableEnergyLevel": 0.1,
                "energyAfterFiring": 0,
                "radius": 25,
                "isFiringNext": false,
                "pulse": false,
                "x": 738.0990081342331,
                "y": -251.6425658731497,
                "id": "blue_6_1"
            },
            {
                "color": "#1f77b4",
                "spikeThreshold": 1,
                "energy": 0.1,
                "energyDecayRate": 0.1,
                "stableEnergyLevel": 0.1,
                "energyAfterFiring": 0,
                "radius": 25,
                "isFiringNext": false,
                "pulse": false,
                "x": 922.4697098834076,
                "y": 107.56173951810263,
                "id": "blue_6_2"
            },
            {
                "color": "#1f77b4",
                "spikeThreshold": 1,
                "energy": 0.1,
                "energyDecayRate": 0.1,
                "stableEnergyLevel": 0.1,
                "energyAfterFiring": 0,
                "radius": 25,
                "isFiringNext": false,
                "pulse": false,
                "x": 902.5372686161305,
                "y": 510.8271440102578,
                "id": "blue_6_3"
            },
            {
                "color": "#1f77b4",
                "spikeThreshold": 1,
                "energy": 0.1,
                "energyDecayRate": 0.1,
                "stableEnergyLevel": 0.1,
                "energyAfterFiring": 0,
                "radius": 25,
                "isFiringNext": false,
                "pulse": false,
                "x": 683.6425658731497,
                "y": 850.0990081342331,
                "id": "blue_6_4"
            },
            {
                "color": "#1f77b4",
                "spikeThreshold": 1,
                "energy": 0.1,
                "energyDecayRate": 0.1,
                "stableEnergyLevel": 0.1,
                "energyAfterFiring": 0,
                "radius": 25,
                "isFiringNext": false,
                "pulse": false,
                "x": 324.4382604818975,
                "y": 1034.4697098834076,
                "id": "blue_6_5"
            },
            {
                "color": "#1f77b4",
                "spikeThreshold": 1,
                "energy": 0.1,
                "energyDecayRate": 0.1,
                "stableEnergyLevel": 0.1,
                "energyAfterFiring": 0,
                "radius": 25,
                "isFiringNext": false,
                "pulse": false,
                "x": -78.82714401025765,
                "y": 1014.5372686161305,
                "id": "blue_6_6"
            },
            {
                "color": "#1f77b4",
                "spikeThreshold": 1,
                "energy": 0.1,
                "energyDecayRate": 0.1,
                "stableEnergyLevel": 0.1,
                "energyAfterFiring": 0,
                "radius": 25,
                "isFiringNext": false,
                "pulse": false,
                "x": -418.09900813423315,
                "y": 795.6425658731497,
                "id": "blue_6_7"
            },
            {
                "color": "#1f77b4",
                "spikeThreshold": 1,
                "energy": 0.1,
                "energyDecayRate": 0.1,
                "stableEnergyLevel": 0.1,
                "energyAfterFiring": 0,
                "radius": 25,
                "isFiringNext": false,
                "pulse": false,
                "x": -602.4697098834075,
                "y": 436.43826048189754,
                "id": "blue_6_8"
            },
            {
                "color": "#1f77b4",
                "spikeThreshold": 1,
                "energy": 0.1,
                "energyDecayRate": 0.1,
                "stableEnergyLevel": 0.1,
                "energyAfterFiring": 0,
                "radius": 25,
                "isFiringNext": false,
                "pulse": false,
                "x": -582.5372686161305,
                "y": 33.1728559897424,
                "id": "blue_6_9"
            },
            {
                "color": "#1f77b4",
                "spikeThreshold": 1,
                "energy": 0.1,
                "energyDecayRate": 0.1,
                "stableEnergyLevel": 0.1,
                "energyAfterFiring": 0,
                "radius": 25,
                "isFiringNext": false,
                "pulse": false,
                "x": -363.6425658731497,
                "y": -306.09900813423315,
                "id": "blue_6_10"
            },
            {
                "color": "#1f77b4",
                "spikeThreshold": 1,
                "energy": 0.1,
                "energyDecayRate": 0.1,
                "stableEnergyLevel": 0.1,
                "energyAfterFiring": 0,
                "radius": 25,
                "isFiringNext": false,
                "pulse": false,
                "x": -4.438260481898254,
                "y": -490.4697098834073,
                "id": "blue_6_11"
            },
            {
                "color": "#1f77b4",
                "spikeThreshold": 1,
                "energy": 0.1,
                "energyDecayRate": 0.1,
                "stableEnergyLevel": 0.1,
                "energyAfterFiring": 0,
                "radius": 25,
                "isFiringNext": false,
                "pulse": false,
                "x": 398.82714401025794,
                "y": -470.5372686161305,
                "id": "blue_6_12"
            },
            {
                "color": "#ff7f0e",
                "spikeThreshold": 1,
                "energy": 0.1,
                "energyDecayRate": 0.1,
                "stableEnergyLevel": 0.1,
                "energyAfterFiring": 0,
                "radius": 25,
                "isFiringNext": false,
                "pulse": false,
                "x": 747.031274183525,
                "y": -356.4857063851706,
                "id": "orange_7_1"
            },
            {
                "color": "#ff7f0e",
                "spikeThreshold": 1,
                "energy": 0.1,
                "energyDecayRate": 0.1,
                "stableEnergyLevel": 0.1,
                "energyAfterFiring": 0,
                "radius": 25,
                "isFiringNext": false,
                "pulse": false,
                "x": 982.6268494514662,
                "y": 21.231049446796902,
                "id": "orange_7_2"
            },
            {
                "color": "#ff7f0e",
                "spikeThreshold": 1,
                "energy": 0.1,
                "energyDecayRate": 0.1,
                "stableEnergyLevel": 0.1,
                "energyAfterFiring": 0,
                "radius": 25,
                "isFiringNext": false,
                "pulse": false,
                "x": 997.8002247367282,
                "y": 466.1411430662954,
                "id": "orange_7_3"
            },
            {
                "color": "#ff7f0e",
                "spikeThreshold": 1,
                "energy": 0.1,
                "energyDecayRate": 0.1,
                "stableEnergyLevel": 0.1,
                "energyAfterFiring": 0,
                "radius": 25,
                "isFiringNext": false,
                "pulse": false,
                "x": 788.4857063851707,
                "y": 859.031274183525,
                "id": "orange_7_4"
            },
            {
                "color": "#ff7f0e",
                "spikeThreshold": 1,
                "energy": 0.1,
                "energyDecayRate": 0.1,
                "stableEnergyLevel": 0.1,
                "energyAfterFiring": 0,
                "radius": 25,
                "isFiringNext": false,
                "pulse": false,
                "x": 410.7689505532031,
                "y": 1094.6268494514661,
                "id": "orange_7_5"
            },
            {
                "color": "#ff7f0e",
                "spikeThreshold": 1,
                "energy": 0.1,
                "energyDecayRate": 0.1,
                "stableEnergyLevel": 0.1,
                "energyAfterFiring": 0,
                "radius": 25,
                "isFiringNext": false,
                "pulse": false,
                "x": -34.141143066295285,
                "y": 1109.800224736728,
                "id": "orange_7_6"
            },
            {
                "color": "#ff7f0e",
                "spikeThreshold": 1,
                "energy": 0.1,
                "energyDecayRate": 0.1,
                "stableEnergyLevel": 0.1,
                "energyAfterFiring": 0,
                "radius": 25,
                "isFiringNext": false,
                "pulse": false,
                "x": -427.03127418352506,
                "y": 900.4857063851707,
                "id": "orange_7_7"
            },
            {
                "color": "#ff7f0e",
                "spikeThreshold": 1,
                "energy": 0.1,
                "energyDecayRate": 0.1,
                "stableEnergyLevel": 0.1,
                "energyAfterFiring": 0,
                "radius": 25,
                "isFiringNext": false,
                "pulse": false,
                "x": -662.6268494514662,
                "y": 522.7689505532032,
                "id": "orange_7_8"
            },
            {
                "color": "#ff7f0e",
                "spikeThreshold": 1,
                "energy": 0.1,
                "energyDecayRate": 0.1,
                "stableEnergyLevel": 0.1,
                "energyAfterFiring": 0,
                "radius": 25,
                "isFiringNext": false,
                "pulse": false,
                "x": -677.8002247367282,
                "y": 77.85885693370477,
                "id": "orange_7_9"
            },
            {
                "color": "#ff7f0e",
                "spikeThreshold": 1,
                "energy": 0.1,
                "energyDecayRate": 0.1,
                "stableEnergyLevel": 0.1,
                "energyAfterFiring": 0,
                "radius": 25,
                "isFiringNext": false,
                "pulse": false,
                "x": -468.4857063851707,
                "y": -315.03127418352506,
                "id": "orange_7_10"
            },
            {
                "color": "#ff7f0e",
                "spikeThreshold": 1,
                "energy": 0.1,
                "energyDecayRate": 0.1,
                "stableEnergyLevel": 0.1,
                "energyAfterFiring": 0,
                "radius": 25,
                "isFiringNext": false,
                "pulse": false,
                "x": -90.76895055320355,
                "y": -550.626849451466,
                "id": "orange_7_11"
            },
            {
                "color": "#ff7f0e",
                "spikeThreshold": 1,
                "energy": 0.1,
                "energyDecayRate": 0.1,
                "stableEnergyLevel": 0.1,
                "energyAfterFiring": 0,
                "radius": 25,
                "isFiringNext": false,
                "pulse": false,
                "x": 354.1411430662952,
                "y": -565.8002247367282,
                "id": "orange_7_12"
            },
            {
                "color": "#2ca02c",
                "spikeThreshold": 1,
                "energy": 0.1,
                "energyDecayRate": 0.1,
                "stableEnergyLevel": 0.1,
                "energyAfterFiring": 0,
                "radius": 25,
                "isFiringNext": false,
                "pulse": false,
                "x": 748.2663249854181,
                "y": -461.1730565754244,
                "id": "green_8_1"
            },
            {
                "color": "#2ca02c",
                "spikeThreshold": 1,
                "energy": 0.1,
                "energyDecayRate": 0.1,
                "stableEnergyLevel": 0.1,
                "energyAfterFiring": 0,
                "radius": 25,
                "isFiringNext": false,
                "pulse": false,
                "x": 1036.0401099159967,
                "y": -68.81332987189404,
                "id": "green_8_2"
            },
            {
                "color": "#2ca02c",
                "spikeThreshold": 1,
                "energy": 0.1,
                "energyDecayRate": 0.1,
                "stableEnergyLevel": 0.1,
                "energyAfterFiring": 0,
                "radius": 25,
                "isFiringNext": false,
                "pulse": false,
                "x": 1089.079654857312,
                "y": 414.86705334057217,
                "id": "green_8_3"
            },
            {
                "color": "#2ca02c",
                "spikeThreshold": 1,
                "energy": 0.1,
                "energyDecayRate": 0.1,
                "stableEnergyLevel": 0.1,
                "energyAfterFiring": 0,
                "radius": 25,
                "isFiringNext": false,
                "pulse": false,
                "x": 893.1730565754244,
                "y": 860.266324985418,
                "id": "green_8_4"
            },
            {
                "color": "#2ca02c",
                "spikeThreshold": 1,
                "energy": 0.1,
                "energyDecayRate": 0.1,
                "stableEnergyLevel": 0.1,
                "energyAfterFiring": 0,
                "radius": 25,
                "isFiringNext": false,
                "pulse": false,
                "x": 500.81332987189427,
                "y": 1148.0401099159967,
                "id": "green_8_5"
            },
            {
                "color": "#2ca02c",
                "spikeThreshold": 1,
                "energy": 0.1,
                "energyDecayRate": 0.1,
                "stableEnergyLevel": 0.1,
                "energyAfterFiring": 0,
                "radius": 25,
                "isFiringNext": false,
                "pulse": false,
                "x": 17.132946659428228,
                "y": 1201.079654857312,
                "id": "green_8_6"
            },
            {
                "color": "#2ca02c",
                "spikeThreshold": 1,
                "energy": 0.1,
                "energyDecayRate": 0.1,
                "stableEnergyLevel": 0.1,
                "energyAfterFiring": 0,
                "radius": 25,
                "isFiringNext": false,
                "pulse": false,
                "x": -428.2663249854179,
                "y": 1005.1730565754245,
                "id": "green_8_7"
            },
            {
                "color": "#2ca02c",
                "spikeThreshold": 1,
                "energy": 0.1,
                "energyDecayRate": 0.1,
                "stableEnergyLevel": 0.1,
                "energyAfterFiring": 0,
                "radius": 25,
                "isFiringNext": false,
                "pulse": false,
                "x": -716.0401099159965,
                "y": 612.8133298718943,
                "id": "green_8_8"
            },
            {
                "color": "#2ca02c",
                "spikeThreshold": 1,
                "energy": 0.1,
                "energyDecayRate": 0.1,
                "stableEnergyLevel": 0.1,
                "energyAfterFiring": 0,
                "radius": 25,
                "isFiringNext": false,
                "pulse": false,
                "x": -769.0796548573121,
                "y": 129.13294665942828,
                "id": "green_8_9"
            },
            {
                "color": "#2ca02c",
                "spikeThreshold": 1,
                "energy": 0.1,
                "energyDecayRate": 0.1,
                "stableEnergyLevel": 0.1,
                "energyAfterFiring": 0,
                "radius": 25,
                "isFiringNext": false,
                "pulse": false,
                "x": -573.1730565754247,
                "y": -316.2663249854179,
                "id": "green_8_10"
            },
            {
                "color": "#2ca02c",
                "spikeThreshold": 1,
                "energy": 0.1,
                "energyDecayRate": 0.1,
                "stableEnergyLevel": 0.1,
                "energyAfterFiring": 0,
                "radius": 25,
                "isFiringNext": false,
                "pulse": false,
                "x": -180.81332987189438,
                "y": -604.0401099159965,
                "id": "green_8_11"
            },
            {
                "color": "#2ca02c",
                "spikeThreshold": 1,
                "energy": 0.1,
                "energyDecayRate": 0.1,
                "stableEnergyLevel": 0.1,
                "energyAfterFiring": 0,
                "radius": 25,
                "isFiringNext": false,
                "pulse": false,
                "x": 302.86705334057206,
                "y": -657.0796548573121,
                "id": "green_8_12"
            }
        ],
        "edges": [
            {
                "groupNameId": "pen-b_epg_1",
                "groupColorId": "lightGreen_1_blue",
                "id": "lightGreen_1_1_blue_6_2",
                "from": "lightGreen_1_1",
                "to": "blue_6_2",
                "strength": 0.5
            },
            {
                "groupNameId": "pen-b_epg_1",
                "groupColorId": "lightGreen_1_lightBlue",
                "id": "lightGreen_1_1_lightBlue_3_2",
                "from": "lightGreen_1_1",
                "to": "lightBlue_3_2",
                "strength": 0.5
            },
            {
                "groupNameId": "pen-b_epg_1",
                "groupColorId": "lightGreen_1_blue",
                "id": "lightGreen_1_2_blue_6_3",
                "from": "lightGreen_1_2",
                "to": "blue_6_3",
                "strength": 0.5
            },
            {
                "groupNameId": "pen-b_epg_1",
                "groupColorId": "lightGreen_1_lightBlue",
                "id": "lightGreen_1_2_lightBlue_3_3",
                "from": "lightGreen_1_2",
                "to": "lightBlue_3_3",
                "strength": 0.5
            },
            {
                "groupNameId": "pen-b_epg_1",
                "groupColorId": "lightGreen_1_blue",
                "id": "lightGreen_1_3_blue_6_4",
                "from": "lightGreen_1_3",
                "to": "blue_6_4",
                "strength": 0.5
            },
            {
                "groupNameId": "pen-b_epg_1",
                "groupColorId": "lightGreen_1_lightBlue",
                "id": "lightGreen_1_3_lightBlue_3_4",
                "from": "lightGreen_1_3",
                "to": "lightBlue_3_4",
                "strength": 0.5
            },
            {
                "groupNameId": "pen-b_epg_1",
                "groupColorId": "lightGreen_1_blue",
                "id": "lightGreen_1_4_blue_6_5",
                "from": "lightGreen_1_4",
                "to": "blue_6_5",
                "strength": 0.5
            },
            {
                "groupNameId": "pen-b_epg_1",
                "groupColorId": "lightGreen_1_lightBlue",
                "id": "lightGreen_1_4_lightBlue_3_5",
                "from": "lightGreen_1_4",
                "to": "lightBlue_3_5",
                "strength": 0.5
            },
            {
                "groupNameId": "pen-b_epg_1",
                "groupColorId": "lightGreen_1_blue",
                "id": "lightGreen_1_5_blue_6_6",
                "from": "lightGreen_1_5",
                "to": "blue_6_6",
                "strength": 0.5
            },
            {
                "groupNameId": "pen-b_epg_1",
                "groupColorId": "lightGreen_1_lightBlue",
                "id": "lightGreen_1_5_lightBlue_3_6",
                "from": "lightGreen_1_5",
                "to": "lightBlue_3_6",
                "strength": 0.5
            },
            {
                "groupNameId": "pen-b_epg_1",
                "groupColorId": "lightGreen_1_blue",
                "id": "lightGreen_1_6_blue_6_7",
                "from": "lightGreen_1_6",
                "to": "blue_6_7",
                "strength": 0.5
            },
            {
                "groupNameId": "pen-b_epg_1",
                "groupColorId": "lightGreen_1_lightBlue",
                "id": "lightGreen_1_6_lightBlue_3_7",
                "from": "lightGreen_1_6",
                "to": "lightBlue_3_7",
                "strength": 0.5
            },
            {
                "groupNameId": "pen-b_epg_1",
                "groupColorId": "lightGreen_1_blue",
                "id": "lightGreen_1_7_blue_6_8",
                "from": "lightGreen_1_7",
                "to": "blue_6_8",
                "strength": 0.5
            },
            {
                "groupNameId": "pen-b_epg_1",
                "groupColorId": "lightGreen_1_lightBlue",
                "id": "lightGreen_1_7_lightBlue_3_8",
                "from": "lightGreen_1_7",
                "to": "lightBlue_3_8",
                "strength": 0.5
            },
            {
                "groupNameId": "pen-b_epg_1",
                "groupColorId": "lightGreen_1_blue",
                "id": "lightGreen_1_8_blue_6_9",
                "from": "lightGreen_1_8",
                "to": "blue_6_9",
                "strength": 0.5
            },
            {
                "groupNameId": "pen-b_epg_1",
                "groupColorId": "lightGreen_1_lightBlue",
                "id": "lightGreen_1_8_lightBlue_3_9",
                "from": "lightGreen_1_8",
                "to": "lightBlue_3_9",
                "strength": 0.5
            },
            {
                "groupNameId": "pen-b_epg_1",
                "groupColorId": "lightGreen_1_blue",
                "id": "lightGreen_1_9_blue_6_10",
                "from": "lightGreen_1_9",
                "to": "blue_6_10",
                "strength": 0.5
            },
            {
                "groupNameId": "pen-b_epg_1",
                "groupColorId": "lightGreen_1_lightBlue",
                "id": "lightGreen_1_9_lightBlue_3_10",
                "from": "lightGreen_1_9",
                "to": "lightBlue_3_10",
                "strength": 0.5
            },
            {
                "groupNameId": "pen-b_epg_1",
                "groupColorId": "lightGreen_1_blue",
                "id": "lightGreen_1_10_blue_6_11",
                "from": "lightGreen_1_10",
                "to": "blue_6_11",
                "strength": 0.5
            },
            {
                "groupNameId": "pen-b_epg_1",
                "groupColorId": "lightGreen_1_lightBlue",
                "id": "lightGreen_1_10_lightBlue_3_11",
                "from": "lightGreen_1_10",
                "to": "lightBlue_3_11",
                "strength": 0.5
            },
            {
                "groupNameId": "pen-b_epg_1",
                "groupColorId": "lightGreen_1_blue",
                "id": "lightGreen_1_11_blue_6_12",
                "from": "lightGreen_1_11",
                "to": "blue_6_12",
                "strength": 0.5
            },
            {
                "groupNameId": "pen-b_epg_1",
                "groupColorId": "lightGreen_1_lightBlue",
                "id": "lightGreen_1_11_lightBlue_3_12",
                "from": "lightGreen_1_11",
                "to": "lightBlue_3_12",
                "strength": 0.5
            },
            {
                "groupNameId": "pen-b_epg_1",
                "groupColorId": "lightGreen_1_blue",
                "id": "lightGreen_1_12_blue_6_1",
                "from": "lightGreen_1_12",
                "to": "blue_6_1",
                "strength": 0.5
            },
            {
                "groupNameId": "pen-b_epg_1",
                "groupColorId": "lightGreen_1_lightBlue",
                "id": "lightGreen_1_12_lightBlue_3_1",
                "from": "lightGreen_1_12",
                "to": "lightBlue_3_1",
                "strength": 0.5
            },
            {
                "groupNameId": "pen_epg_1",
                "groupColorId": "lightOrange_1_blue",
                "id": "lightOrange_2_1_blue_6_2",
                "from": "lightOrange_2_1",
                "to": "blue_6_2",
                "strength": 0.5
            },
            {
                "groupNameId": "pen_epg_1",
                "groupColorId": "lightOrange_1_lightBlue",
                "id": "lightOrange_2_1_lightBlue_3_2",
                "from": "lightOrange_2_1",
                "to": "lightBlue_3_2",
                "strength": 0.5
            },
            {
                "groupNameId": "pen_epg_1",
                "groupColorId": "lightOrange_1_blue",
                "id": "lightOrange_2_2_blue_6_3",
                "from": "lightOrange_2_2",
                "to": "blue_6_3",
                "strength": 0.5
            },
            {
                "groupNameId": "pen_epg_1",
                "groupColorId": "lightOrange_1_lightBlue",
                "id": "lightOrange_2_2_lightBlue_3_3",
                "from": "lightOrange_2_2",
                "to": "lightBlue_3_3",
                "strength": 0.5
            },
            {
                "groupNameId": "pen_epg_1",
                "groupColorId": "lightOrange_1_blue",
                "id": "lightOrange_2_3_blue_6_4",
                "from": "lightOrange_2_3",
                "to": "blue_6_4",
                "strength": 0.5
            },
            {
                "groupNameId": "pen_epg_1",
                "groupColorId": "lightOrange_1_lightBlue",
                "id": "lightOrange_2_3_lightBlue_3_4",
                "from": "lightOrange_2_3",
                "to": "lightBlue_3_4",
                "strength": 0.5
            },
            {
                "groupNameId": "pen_epg_1",
                "groupColorId": "lightOrange_1_blue",
                "id": "lightOrange_2_4_blue_6_5",
                "from": "lightOrange_2_4",
                "to": "blue_6_5",
                "strength": 0.5
            },
            {
                "groupNameId": "pen_epg_1",
                "groupColorId": "lightOrange_1_lightBlue",
                "id": "lightOrange_2_4_lightBlue_3_5",
                "from": "lightOrange_2_4",
                "to": "lightBlue_3_5",
                "strength": 0.5
            },
            {
                "groupNameId": "pen_epg_1",
                "groupColorId": "lightOrange_1_blue",
                "id": "lightOrange_2_5_blue_6_6",
                "from": "lightOrange_2_5",
                "to": "blue_6_6",
                "strength": 0.5
            },
            {
                "groupNameId": "pen_epg_1",
                "groupColorId": "lightOrange_1_lightBlue",
                "id": "lightOrange_2_5_lightBlue_3_6",
                "from": "lightOrange_2_5",
                "to": "lightBlue_3_6",
                "strength": 0.5
            },
            {
                "groupNameId": "pen_epg_1",
                "groupColorId": "lightOrange_1_blue",
                "id": "lightOrange_2_6_blue_6_7",
                "from": "lightOrange_2_6",
                "to": "blue_6_7",
                "strength": 0.5
            },
            {
                "groupNameId": "pen_epg_1",
                "groupColorId": "lightOrange_1_lightBlue",
                "id": "lightOrange_2_6_lightBlue_3_7",
                "from": "lightOrange_2_6",
                "to": "lightBlue_3_7",
                "strength": 0.5
            },
            {
                "groupNameId": "pen_epg_1",
                "groupColorId": "lightOrange_1_blue",
                "id": "lightOrange_2_7_blue_6_8",
                "from": "lightOrange_2_7",
                "to": "blue_6_8",
                "strength": 0.5
            },
            {
                "groupNameId": "pen_epg_1",
                "groupColorId": "lightOrange_1_lightBlue",
                "id": "lightOrange_2_7_lightBlue_3_8",
                "from": "lightOrange_2_7",
                "to": "lightBlue_3_8",
                "strength": 0.5
            },
            {
                "groupNameId": "pen_epg_1",
                "groupColorId": "lightOrange_1_blue",
                "id": "lightOrange_2_8_blue_6_9",
                "from": "lightOrange_2_8",
                "to": "blue_6_9",
                "strength": 0.5
            },
            {
                "groupNameId": "pen_epg_1",
                "groupColorId": "lightOrange_1_lightBlue",
                "id": "lightOrange_2_8_lightBlue_3_9",
                "from": "lightOrange_2_8",
                "to": "lightBlue_3_9",
                "strength": 0.5
            },
            {
                "groupNameId": "pen_epg_1",
                "groupColorId": "lightOrange_1_blue",
                "id": "lightOrange_2_9_blue_6_10",
                "from": "lightOrange_2_9",
                "to": "blue_6_10",
                "strength": 0.5
            },
            {
                "groupNameId": "pen_epg_1",
                "groupColorId": "lightOrange_1_lightBlue",
                "id": "lightOrange_2_9_lightBlue_3_10",
                "from": "lightOrange_2_9",
                "to": "lightBlue_3_10",
                "strength": 0.5
            },
            {
                "groupNameId": "pen_epg_1",
                "groupColorId": "lightOrange_1_blue",
                "id": "lightOrange_2_10_blue_6_11",
                "from": "lightOrange_2_10",
                "to": "blue_6_11",
                "strength": 0.5
            },
            {
                "groupNameId": "pen_epg_1",
                "groupColorId": "lightOrange_1_lightBlue",
                "id": "lightOrange_2_10_lightBlue_3_11",
                "from": "lightOrange_2_10",
                "to": "lightBlue_3_11",
                "strength": 0.5
            },
            {
                "groupNameId": "pen_epg_1",
                "groupColorId": "lightOrange_1_blue",
                "id": "lightOrange_2_11_blue_6_12",
                "from": "lightOrange_2_11",
                "to": "blue_6_12",
                "strength": 0.5
            },
            {
                "groupNameId": "pen_epg_1",
                "groupColorId": "lightOrange_1_lightBlue",
                "id": "lightOrange_2_11_lightBlue_3_12",
                "from": "lightOrange_2_11",
                "to": "lightBlue_3_12",
                "strength": 0.5
            },
            {
                "groupNameId": "pen_epg_1",
                "groupColorId": "lightOrange_1_blue",
                "id": "lightOrange_2_12_blue_6_1",
                "from": "lightOrange_2_12",
                "to": "blue_6_1",
                "strength": 0.5
            },
            {
                "groupNameId": "pen_epg_1",
                "groupColorId": "lightOrange_1_lightBlue",
                "id": "lightOrange_2_12_lightBlue_3_1",
                "from": "lightOrange_2_12",
                "to": "lightBlue_3_1",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_peg_0",
                "groupColorId": "lightBlue_0_red",
                "id": "lightBlue_3_1_red_5_1",
                "from": "lightBlue_3_1",
                "to": "red_5_1",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_peg_0",
                "groupColorId": "lightBlue_0_lightRed",
                "id": "lightBlue_3_1_lightRed_4_1",
                "from": "lightBlue_3_1",
                "to": "lightRed_4_1",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_pen-b_1",
                "groupColorId": "lightBlue_1_green",
                "id": "lightBlue_3_1_green_8_2",
                "from": "lightBlue_3_1",
                "to": "green_8_2",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_pen_1",
                "groupColorId": "lightBlue_1_orange",
                "id": "lightBlue_3_1_orange_7_2",
                "from": "lightBlue_3_1",
                "to": "orange_7_2",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_epg_0",
                "groupColorId": "lightBlue_0_lightBlue",
                "id": "lightBlue_3_1_lightBlue_3_1",
                "from": "lightBlue_3_1",
                "to": "lightBlue_3_1",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_pen-b_-1",
                "groupColorId": "lightBlue_-1_lightGreen",
                "id": "lightBlue_3_1_lightGreen_1_12",
                "from": "lightBlue_3_1",
                "to": "lightGreen_1_12",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_pen_-1",
                "groupColorId": "lightBlue_-1_lightOrange",
                "id": "lightBlue_3_1_lightOrange_2_12",
                "from": "lightBlue_3_1",
                "to": "lightOrange_2_12",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_epg_-1",
                "groupColorId": "lightBlue_-1_blue",
                "id": "lightBlue_3_1_blue_6_12",
                "from": "lightBlue_3_1",
                "to": "blue_6_12",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_peg_0",
                "groupColorId": "lightBlue_0_red",
                "id": "lightBlue_3_2_red_5_2",
                "from": "lightBlue_3_2",
                "to": "red_5_2",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_peg_0",
                "groupColorId": "lightBlue_0_lightRed",
                "id": "lightBlue_3_2_lightRed_4_2",
                "from": "lightBlue_3_2",
                "to": "lightRed_4_2",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_pen-b_1",
                "groupColorId": "lightBlue_1_green",
                "id": "lightBlue_3_2_green_8_3",
                "from": "lightBlue_3_2",
                "to": "green_8_3",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_pen_1",
                "groupColorId": "lightBlue_1_orange",
                "id": "lightBlue_3_2_orange_7_3",
                "from": "lightBlue_3_2",
                "to": "orange_7_3",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_epg_0",
                "groupColorId": "lightBlue_0_lightBlue",
                "id": "lightBlue_3_2_lightBlue_3_2",
                "from": "lightBlue_3_2",
                "to": "lightBlue_3_2",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_pen-b_-1",
                "groupColorId": "lightBlue_-1_lightGreen",
                "id": "lightBlue_3_2_lightGreen_1_1",
                "from": "lightBlue_3_2",
                "to": "lightGreen_1_1",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_pen_-1",
                "groupColorId": "lightBlue_-1_lightOrange",
                "id": "lightBlue_3_2_lightOrange_2_1",
                "from": "lightBlue_3_2",
                "to": "lightOrange_2_1",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_epg_-1",
                "groupColorId": "lightBlue_-1_blue",
                "id": "lightBlue_3_2_blue_6_1",
                "from": "lightBlue_3_2",
                "to": "blue_6_1",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_peg_0",
                "groupColorId": "lightBlue_0_red",
                "id": "lightBlue_3_3_red_5_3",
                "from": "lightBlue_3_3",
                "to": "red_5_3",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_peg_0",
                "groupColorId": "lightBlue_0_lightRed",
                "id": "lightBlue_3_3_lightRed_4_3",
                "from": "lightBlue_3_3",
                "to": "lightRed_4_3",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_pen-b_1",
                "groupColorId": "lightBlue_1_green",
                "id": "lightBlue_3_3_green_8_4",
                "from": "lightBlue_3_3",
                "to": "green_8_4",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_pen_1",
                "groupColorId": "lightBlue_1_orange",
                "id": "lightBlue_3_3_orange_7_4",
                "from": "lightBlue_3_3",
                "to": "orange_7_4",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_epg_0",
                "groupColorId": "lightBlue_0_lightBlue",
                "id": "lightBlue_3_3_lightBlue_3_3",
                "from": "lightBlue_3_3",
                "to": "lightBlue_3_3",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_pen-b_-1",
                "groupColorId": "lightBlue_-1_lightGreen",
                "id": "lightBlue_3_3_lightGreen_1_2",
                "from": "lightBlue_3_3",
                "to": "lightGreen_1_2",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_pen_-1",
                "groupColorId": "lightBlue_-1_lightOrange",
                "id": "lightBlue_3_3_lightOrange_2_2",
                "from": "lightBlue_3_3",
                "to": "lightOrange_2_2",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_epg_-1",
                "groupColorId": "lightBlue_-1_blue",
                "id": "lightBlue_3_3_blue_6_2",
                "from": "lightBlue_3_3",
                "to": "blue_6_2",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_peg_0",
                "groupColorId": "lightBlue_0_red",
                "id": "lightBlue_3_4_red_5_4",
                "from": "lightBlue_3_4",
                "to": "red_5_4",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_peg_0",
                "groupColorId": "lightBlue_0_lightRed",
                "id": "lightBlue_3_4_lightRed_4_4",
                "from": "lightBlue_3_4",
                "to": "lightRed_4_4",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_pen-b_1",
                "groupColorId": "lightBlue_1_green",
                "id": "lightBlue_3_4_green_8_5",
                "from": "lightBlue_3_4",
                "to": "green_8_5",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_pen_1",
                "groupColorId": "lightBlue_1_orange",
                "id": "lightBlue_3_4_orange_7_5",
                "from": "lightBlue_3_4",
                "to": "orange_7_5",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_epg_0",
                "groupColorId": "lightBlue_0_lightBlue",
                "id": "lightBlue_3_4_lightBlue_3_4",
                "from": "lightBlue_3_4",
                "to": "lightBlue_3_4",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_pen-b_-1",
                "groupColorId": "lightBlue_-1_lightGreen",
                "id": "lightBlue_3_4_lightGreen_1_3",
                "from": "lightBlue_3_4",
                "to": "lightGreen_1_3",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_pen_-1",
                "groupColorId": "lightBlue_-1_lightOrange",
                "id": "lightBlue_3_4_lightOrange_2_3",
                "from": "lightBlue_3_4",
                "to": "lightOrange_2_3",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_epg_-1",
                "groupColorId": "lightBlue_-1_blue",
                "id": "lightBlue_3_4_blue_6_3",
                "from": "lightBlue_3_4",
                "to": "blue_6_3",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_peg_0",
                "groupColorId": "lightBlue_0_red",
                "id": "lightBlue_3_5_red_5_5",
                "from": "lightBlue_3_5",
                "to": "red_5_5",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_peg_0",
                "groupColorId": "lightBlue_0_lightRed",
                "id": "lightBlue_3_5_lightRed_4_5",
                "from": "lightBlue_3_5",
                "to": "lightRed_4_5",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_pen-b_1",
                "groupColorId": "lightBlue_1_green",
                "id": "lightBlue_3_5_green_8_6",
                "from": "lightBlue_3_5",
                "to": "green_8_6",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_pen_1",
                "groupColorId": "lightBlue_1_orange",
                "id": "lightBlue_3_5_orange_7_6",
                "from": "lightBlue_3_5",
                "to": "orange_7_6",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_epg_0",
                "groupColorId": "lightBlue_0_lightBlue",
                "id": "lightBlue_3_5_lightBlue_3_5",
                "from": "lightBlue_3_5",
                "to": "lightBlue_3_5",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_pen-b_-1",
                "groupColorId": "lightBlue_-1_lightGreen",
                "id": "lightBlue_3_5_lightGreen_1_4",
                "from": "lightBlue_3_5",
                "to": "lightGreen_1_4",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_pen_-1",
                "groupColorId": "lightBlue_-1_lightOrange",
                "id": "lightBlue_3_5_lightOrange_2_4",
                "from": "lightBlue_3_5",
                "to": "lightOrange_2_4",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_epg_-1",
                "groupColorId": "lightBlue_-1_blue",
                "id": "lightBlue_3_5_blue_6_4",
                "from": "lightBlue_3_5",
                "to": "blue_6_4",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_peg_0",
                "groupColorId": "lightBlue_0_red",
                "id": "lightBlue_3_6_red_5_6",
                "from": "lightBlue_3_6",
                "to": "red_5_6",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_peg_0",
                "groupColorId": "lightBlue_0_lightRed",
                "id": "lightBlue_3_6_lightRed_4_6",
                "from": "lightBlue_3_6",
                "to": "lightRed_4_6",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_pen-b_1",
                "groupColorId": "lightBlue_1_green",
                "id": "lightBlue_3_6_green_8_7",
                "from": "lightBlue_3_6",
                "to": "green_8_7",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_pen_1",
                "groupColorId": "lightBlue_1_orange",
                "id": "lightBlue_3_6_orange_7_7",
                "from": "lightBlue_3_6",
                "to": "orange_7_7",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_epg_0",
                "groupColorId": "lightBlue_0_lightBlue",
                "id": "lightBlue_3_6_lightBlue_3_6",
                "from": "lightBlue_3_6",
                "to": "lightBlue_3_6",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_pen-b_-1",
                "groupColorId": "lightBlue_-1_lightGreen",
                "id": "lightBlue_3_6_lightGreen_1_5",
                "from": "lightBlue_3_6",
                "to": "lightGreen_1_5",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_pen_-1",
                "groupColorId": "lightBlue_-1_lightOrange",
                "id": "lightBlue_3_6_lightOrange_2_5",
                "from": "lightBlue_3_6",
                "to": "lightOrange_2_5",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_epg_-1",
                "groupColorId": "lightBlue_-1_blue",
                "id": "lightBlue_3_6_blue_6_5",
                "from": "lightBlue_3_6",
                "to": "blue_6_5",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_peg_0",
                "groupColorId": "lightBlue_0_red",
                "id": "lightBlue_3_7_red_5_7",
                "from": "lightBlue_3_7",
                "to": "red_5_7",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_peg_0",
                "groupColorId": "lightBlue_0_lightRed",
                "id": "lightBlue_3_7_lightRed_4_7",
                "from": "lightBlue_3_7",
                "to": "lightRed_4_7",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_pen-b_1",
                "groupColorId": "lightBlue_1_green",
                "id": "lightBlue_3_7_green_8_8",
                "from": "lightBlue_3_7",
                "to": "green_8_8",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_pen_1",
                "groupColorId": "lightBlue_1_orange",
                "id": "lightBlue_3_7_orange_7_8",
                "from": "lightBlue_3_7",
                "to": "orange_7_8",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_epg_0",
                "groupColorId": "lightBlue_0_lightBlue",
                "id": "lightBlue_3_7_lightBlue_3_7",
                "from": "lightBlue_3_7",
                "to": "lightBlue_3_7",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_pen-b_-1",
                "groupColorId": "lightBlue_-1_lightGreen",
                "id": "lightBlue_3_7_lightGreen_1_6",
                "from": "lightBlue_3_7",
                "to": "lightGreen_1_6",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_pen_-1",
                "groupColorId": "lightBlue_-1_lightOrange",
                "id": "lightBlue_3_7_lightOrange_2_6",
                "from": "lightBlue_3_7",
                "to": "lightOrange_2_6",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_epg_-1",
                "groupColorId": "lightBlue_-1_blue",
                "id": "lightBlue_3_7_blue_6_6",
                "from": "lightBlue_3_7",
                "to": "blue_6_6",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_peg_0",
                "groupColorId": "lightBlue_0_red",
                "id": "lightBlue_3_8_red_5_8",
                "from": "lightBlue_3_8",
                "to": "red_5_8",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_peg_0",
                "groupColorId": "lightBlue_0_lightRed",
                "id": "lightBlue_3_8_lightRed_4_8",
                "from": "lightBlue_3_8",
                "to": "lightRed_4_8",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_pen-b_1",
                "groupColorId": "lightBlue_1_green",
                "id": "lightBlue_3_8_green_8_9",
                "from": "lightBlue_3_8",
                "to": "green_8_9",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_pen_1",
                "groupColorId": "lightBlue_1_orange",
                "id": "lightBlue_3_8_orange_7_9",
                "from": "lightBlue_3_8",
                "to": "orange_7_9",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_epg_0",
                "groupColorId": "lightBlue_0_lightBlue",
                "id": "lightBlue_3_8_lightBlue_3_8",
                "from": "lightBlue_3_8",
                "to": "lightBlue_3_8",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_pen-b_-1",
                "groupColorId": "lightBlue_-1_lightGreen",
                "id": "lightBlue_3_8_lightGreen_1_7",
                "from": "lightBlue_3_8",
                "to": "lightGreen_1_7",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_pen_-1",
                "groupColorId": "lightBlue_-1_lightOrange",
                "id": "lightBlue_3_8_lightOrange_2_7",
                "from": "lightBlue_3_8",
                "to": "lightOrange_2_7",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_epg_-1",
                "groupColorId": "lightBlue_-1_blue",
                "id": "lightBlue_3_8_blue_6_7",
                "from": "lightBlue_3_8",
                "to": "blue_6_7",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_peg_0",
                "groupColorId": "lightBlue_0_red",
                "id": "lightBlue_3_9_red_5_9",
                "from": "lightBlue_3_9",
                "to": "red_5_9",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_peg_0",
                "groupColorId": "lightBlue_0_lightRed",
                "id": "lightBlue_3_9_lightRed_4_9",
                "from": "lightBlue_3_9",
                "to": "lightRed_4_9",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_pen-b_1",
                "groupColorId": "lightBlue_1_green",
                "id": "lightBlue_3_9_green_8_10",
                "from": "lightBlue_3_9",
                "to": "green_8_10",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_pen_1",
                "groupColorId": "lightBlue_1_orange",
                "id": "lightBlue_3_9_orange_7_10",
                "from": "lightBlue_3_9",
                "to": "orange_7_10",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_epg_0",
                "groupColorId": "lightBlue_0_lightBlue",
                "id": "lightBlue_3_9_lightBlue_3_9",
                "from": "lightBlue_3_9",
                "to": "lightBlue_3_9",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_pen-b_-1",
                "groupColorId": "lightBlue_-1_lightGreen",
                "id": "lightBlue_3_9_lightGreen_1_8",
                "from": "lightBlue_3_9",
                "to": "lightGreen_1_8",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_pen_-1",
                "groupColorId": "lightBlue_-1_lightOrange",
                "id": "lightBlue_3_9_lightOrange_2_8",
                "from": "lightBlue_3_9",
                "to": "lightOrange_2_8",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_epg_-1",
                "groupColorId": "lightBlue_-1_blue",
                "id": "lightBlue_3_9_blue_6_8",
                "from": "lightBlue_3_9",
                "to": "blue_6_8",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_peg_0",
                "groupColorId": "lightBlue_0_red",
                "id": "lightBlue_3_10_red_5_10",
                "from": "lightBlue_3_10",
                "to": "red_5_10",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_peg_0",
                "groupColorId": "lightBlue_0_lightRed",
                "id": "lightBlue_3_10_lightRed_4_10",
                "from": "lightBlue_3_10",
                "to": "lightRed_4_10",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_pen-b_1",
                "groupColorId": "lightBlue_1_green",
                "id": "lightBlue_3_10_green_8_11",
                "from": "lightBlue_3_10",
                "to": "green_8_11",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_pen_1",
                "groupColorId": "lightBlue_1_orange",
                "id": "lightBlue_3_10_orange_7_11",
                "from": "lightBlue_3_10",
                "to": "orange_7_11",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_epg_0",
                "groupColorId": "lightBlue_0_lightBlue",
                "id": "lightBlue_3_10_lightBlue_3_10",
                "from": "lightBlue_3_10",
                "to": "lightBlue_3_10",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_pen-b_-1",
                "groupColorId": "lightBlue_-1_lightGreen",
                "id": "lightBlue_3_10_lightGreen_1_9",
                "from": "lightBlue_3_10",
                "to": "lightGreen_1_9",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_pen_-1",
                "groupColorId": "lightBlue_-1_lightOrange",
                "id": "lightBlue_3_10_lightOrange_2_9",
                "from": "lightBlue_3_10",
                "to": "lightOrange_2_9",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_epg_-1",
                "groupColorId": "lightBlue_-1_blue",
                "id": "lightBlue_3_10_blue_6_9",
                "from": "lightBlue_3_10",
                "to": "blue_6_9",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_peg_0",
                "groupColorId": "lightBlue_0_red",
                "id": "lightBlue_3_11_red_5_11",
                "from": "lightBlue_3_11",
                "to": "red_5_11",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_peg_0",
                "groupColorId": "lightBlue_0_lightRed",
                "id": "lightBlue_3_11_lightRed_4_11",
                "from": "lightBlue_3_11",
                "to": "lightRed_4_11",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_pen-b_1",
                "groupColorId": "lightBlue_1_green",
                "id": "lightBlue_3_11_green_8_12",
                "from": "lightBlue_3_11",
                "to": "green_8_12",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_pen_1",
                "groupColorId": "lightBlue_1_orange",
                "id": "lightBlue_3_11_orange_7_12",
                "from": "lightBlue_3_11",
                "to": "orange_7_12",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_epg_0",
                "groupColorId": "lightBlue_0_lightBlue",
                "id": "lightBlue_3_11_lightBlue_3_11",
                "from": "lightBlue_3_11",
                "to": "lightBlue_3_11",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_pen-b_-1",
                "groupColorId": "lightBlue_-1_lightGreen",
                "id": "lightBlue_3_11_lightGreen_1_10",
                "from": "lightBlue_3_11",
                "to": "lightGreen_1_10",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_pen_-1",
                "groupColorId": "lightBlue_-1_lightOrange",
                "id": "lightBlue_3_11_lightOrange_2_10",
                "from": "lightBlue_3_11",
                "to": "lightOrange_2_10",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_epg_-1",
                "groupColorId": "lightBlue_-1_blue",
                "id": "lightBlue_3_11_blue_6_10",
                "from": "lightBlue_3_11",
                "to": "blue_6_10",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_peg_0",
                "groupColorId": "lightBlue_0_red",
                "id": "lightBlue_3_12_red_5_12",
                "from": "lightBlue_3_12",
                "to": "red_5_12",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_peg_0",
                "groupColorId": "lightBlue_0_lightRed",
                "id": "lightBlue_3_12_lightRed_4_12",
                "from": "lightBlue_3_12",
                "to": "lightRed_4_12",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_pen-b_1",
                "groupColorId": "lightBlue_1_green",
                "id": "lightBlue_3_12_green_8_1",
                "from": "lightBlue_3_12",
                "to": "green_8_1",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_pen_1",
                "groupColorId": "lightBlue_1_orange",
                "id": "lightBlue_3_12_orange_7_1",
                "from": "lightBlue_3_12",
                "to": "orange_7_1",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_epg_0",
                "groupColorId": "lightBlue_0_lightBlue",
                "id": "lightBlue_3_12_lightBlue_3_12",
                "from": "lightBlue_3_12",
                "to": "lightBlue_3_12",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_pen-b_-1",
                "groupColorId": "lightBlue_-1_lightGreen",
                "id": "lightBlue_3_12_lightGreen_1_11",
                "from": "lightBlue_3_12",
                "to": "lightGreen_1_11",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_pen_-1",
                "groupColorId": "lightBlue_-1_lightOrange",
                "id": "lightBlue_3_12_lightOrange_2_11",
                "from": "lightBlue_3_12",
                "to": "lightOrange_2_11",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_epg_-1",
                "groupColorId": "lightBlue_-1_blue",
                "id": "lightBlue_3_12_blue_6_11",
                "from": "lightBlue_3_12",
                "to": "blue_6_11",
                "strength": 0.5
            },
            {
                "groupNameId": "peg_pen-b_1",
                "groupColorId": "lightRed_1_green",
                "id": "lightRed_4_1_green_8_2",
                "from": "lightRed_4_1",
                "to": "green_8_2",
                "strength": 0.5
            },
            {
                "groupNameId": "peg_epg_0",
                "groupColorId": "lightRed_0_lightBlue",
                "id": "lightRed_4_1_lightBlue_3_1",
                "from": "lightRed_4_1",
                "to": "lightBlue_3_1",
                "strength": 0.5
            },
            {
                "groupNameId": "peg_pen-b_-1",
                "groupColorId": "lightRed_-1_lightGreen",
                "id": "lightRed_4_1_lightGreen_1_12",
                "from": "lightRed_4_1",
                "to": "lightGreen_1_12",
                "strength": 0.5
            },
            {
                "groupNameId": "peg_pen-b_1",
                "groupColorId": "lightRed_1_green",
                "id": "lightRed_4_2_green_8_3",
                "from": "lightRed_4_2",
                "to": "green_8_3",
                "strength": 0.5
            },
            {
                "groupNameId": "peg_epg_0",
                "groupColorId": "lightRed_0_lightBlue",
                "id": "lightRed_4_2_lightBlue_3_2",
                "from": "lightRed_4_2",
                "to": "lightBlue_3_2",
                "strength": 0.5
            },
            {
                "groupNameId": "peg_pen-b_-1",
                "groupColorId": "lightRed_-1_lightGreen",
                "id": "lightRed_4_2_lightGreen_1_1",
                "from": "lightRed_4_2",
                "to": "lightGreen_1_1",
                "strength": 0.5
            },
            {
                "groupNameId": "peg_pen-b_1",
                "groupColorId": "lightRed_1_green",
                "id": "lightRed_4_3_green_8_4",
                "from": "lightRed_4_3",
                "to": "green_8_4",
                "strength": 0.5
            },
            {
                "groupNameId": "peg_epg_0",
                "groupColorId": "lightRed_0_lightBlue",
                "id": "lightRed_4_3_lightBlue_3_3",
                "from": "lightRed_4_3",
                "to": "lightBlue_3_3",
                "strength": 0.5
            },
            {
                "groupNameId": "peg_pen-b_-1",
                "groupColorId": "lightRed_-1_lightGreen",
                "id": "lightRed_4_3_lightGreen_1_2",
                "from": "lightRed_4_3",
                "to": "lightGreen_1_2",
                "strength": 0.5
            },
            {
                "groupNameId": "peg_pen-b_1",
                "groupColorId": "lightRed_1_green",
                "id": "lightRed_4_4_green_8_5",
                "from": "lightRed_4_4",
                "to": "green_8_5",
                "strength": 0.5
            },
            {
                "groupNameId": "peg_epg_0",
                "groupColorId": "lightRed_0_lightBlue",
                "id": "lightRed_4_4_lightBlue_3_4",
                "from": "lightRed_4_4",
                "to": "lightBlue_3_4",
                "strength": 0.5
            },
            {
                "groupNameId": "peg_pen-b_-1",
                "groupColorId": "lightRed_-1_lightGreen",
                "id": "lightRed_4_4_lightGreen_1_3",
                "from": "lightRed_4_4",
                "to": "lightGreen_1_3",
                "strength": 0.5
            },
            {
                "groupNameId": "peg_pen-b_1",
                "groupColorId": "lightRed_1_green",
                "id": "lightRed_4_5_green_8_6",
                "from": "lightRed_4_5",
                "to": "green_8_6",
                "strength": 0.5
            },
            {
                "groupNameId": "peg_epg_0",
                "groupColorId": "lightRed_0_lightBlue",
                "id": "lightRed_4_5_lightBlue_3_5",
                "from": "lightRed_4_5",
                "to": "lightBlue_3_5",
                "strength": 0.5
            },
            {
                "groupNameId": "peg_pen-b_-1",
                "groupColorId": "lightRed_-1_lightGreen",
                "id": "lightRed_4_5_lightGreen_1_4",
                "from": "lightRed_4_5",
                "to": "lightGreen_1_4",
                "strength": 0.5
            },
            {
                "groupNameId": "peg_pen-b_1",
                "groupColorId": "lightRed_1_green",
                "id": "lightRed_4_6_green_8_7",
                "from": "lightRed_4_6",
                "to": "green_8_7",
                "strength": 0.5
            },
            {
                "groupNameId": "peg_epg_0",
                "groupColorId": "lightRed_0_lightBlue",
                "id": "lightRed_4_6_lightBlue_3_6",
                "from": "lightRed_4_6",
                "to": "lightBlue_3_6",
                "strength": 0.5
            },
            {
                "groupNameId": "peg_pen-b_-1",
                "groupColorId": "lightRed_-1_lightGreen",
                "id": "lightRed_4_6_lightGreen_1_5",
                "from": "lightRed_4_6",
                "to": "lightGreen_1_5",
                "strength": 0.5
            },
            {
                "groupNameId": "peg_pen-b_1",
                "groupColorId": "lightRed_1_green",
                "id": "lightRed_4_7_green_8_8",
                "from": "lightRed_4_7",
                "to": "green_8_8",
                "strength": 0.5
            },
            {
                "groupNameId": "peg_epg_0",
                "groupColorId": "lightRed_0_lightBlue",
                "id": "lightRed_4_7_lightBlue_3_7",
                "from": "lightRed_4_7",
                "to": "lightBlue_3_7",
                "strength": 0.5
            },
            {
                "groupNameId": "peg_pen-b_-1",
                "groupColorId": "lightRed_-1_lightGreen",
                "id": "lightRed_4_7_lightGreen_1_6",
                "from": "lightRed_4_7",
                "to": "lightGreen_1_6",
                "strength": 0.5
            },
            {
                "groupNameId": "peg_pen-b_1",
                "groupColorId": "lightRed_1_green",
                "id": "lightRed_4_8_green_8_9",
                "from": "lightRed_4_8",
                "to": "green_8_9",
                "strength": 0.5
            },
            {
                "groupNameId": "peg_epg_0",
                "groupColorId": "lightRed_0_lightBlue",
                "id": "lightRed_4_8_lightBlue_3_8",
                "from": "lightRed_4_8",
                "to": "lightBlue_3_8",
                "strength": 0.5
            },
            {
                "groupNameId": "peg_pen-b_-1",
                "groupColorId": "lightRed_-1_lightGreen",
                "id": "lightRed_4_8_lightGreen_1_7",
                "from": "lightRed_4_8",
                "to": "lightGreen_1_7",
                "strength": 0.5
            },
            {
                "groupNameId": "peg_pen-b_1",
                "groupColorId": "lightRed_1_green",
                "id": "lightRed_4_9_green_8_10",
                "from": "lightRed_4_9",
                "to": "green_8_10",
                "strength": 0.5
            },
            {
                "groupNameId": "peg_epg_0",
                "groupColorId": "lightRed_0_lightBlue",
                "id": "lightRed_4_9_lightBlue_3_9",
                "from": "lightRed_4_9",
                "to": "lightBlue_3_9",
                "strength": 0.5
            },
            {
                "groupNameId": "peg_pen-b_-1",
                "groupColorId": "lightRed_-1_lightGreen",
                "id": "lightRed_4_9_lightGreen_1_8",
                "from": "lightRed_4_9",
                "to": "lightGreen_1_8",
                "strength": 0.5
            },
            {
                "groupNameId": "peg_pen-b_1",
                "groupColorId": "lightRed_1_green",
                "id": "lightRed_4_10_green_8_11",
                "from": "lightRed_4_10",
                "to": "green_8_11",
                "strength": 0.5
            },
            {
                "groupNameId": "peg_epg_0",
                "groupColorId": "lightRed_0_lightBlue",
                "id": "lightRed_4_10_lightBlue_3_10",
                "from": "lightRed_4_10",
                "to": "lightBlue_3_10",
                "strength": 0.5
            },
            {
                "groupNameId": "peg_pen-b_-1",
                "groupColorId": "lightRed_-1_lightGreen",
                "id": "lightRed_4_10_lightGreen_1_9",
                "from": "lightRed_4_10",
                "to": "lightGreen_1_9",
                "strength": 0.5
            },
            {
                "groupNameId": "peg_pen-b_1",
                "groupColorId": "lightRed_1_green",
                "id": "lightRed_4_11_green_8_12",
                "from": "lightRed_4_11",
                "to": "green_8_12",
                "strength": 0.5
            },
            {
                "groupNameId": "peg_epg_0",
                "groupColorId": "lightRed_0_lightBlue",
                "id": "lightRed_4_11_lightBlue_3_11",
                "from": "lightRed_4_11",
                "to": "lightBlue_3_11",
                "strength": 0.5
            },
            {
                "groupNameId": "peg_pen-b_-1",
                "groupColorId": "lightRed_-1_lightGreen",
                "id": "lightRed_4_11_lightGreen_1_10",
                "from": "lightRed_4_11",
                "to": "lightGreen_1_10",
                "strength": 0.5
            },
            {
                "groupNameId": "peg_pen-b_1",
                "groupColorId": "lightRed_1_green",
                "id": "lightRed_4_12_green_8_1",
                "from": "lightRed_4_12",
                "to": "green_8_1",
                "strength": 0.5
            },
            {
                "groupNameId": "peg_epg_0",
                "groupColorId": "lightRed_0_lightBlue",
                "id": "lightRed_4_12_lightBlue_3_12",
                "from": "lightRed_4_12",
                "to": "lightBlue_3_12",
                "strength": 0.5
            },
            {
                "groupNameId": "peg_pen-b_-1",
                "groupColorId": "lightRed_-1_lightGreen",
                "id": "lightRed_4_12_lightGreen_1_11",
                "from": "lightRed_4_12",
                "to": "lightGreen_1_11",
                "strength": 0.5
            },
            {
                "groupNameId": "peg_epg_0",
                "groupColorId": "red_0_blue",
                "id": "red_5_1_blue_6_1",
                "from": "red_5_1",
                "to": "blue_6_1",
                "strength": 0.5
            },
            {
                "groupNameId": "peg_pen-b_1",
                "groupColorId": "red_1_green",
                "id": "red_5_1_green_8_2",
                "from": "red_5_1",
                "to": "green_8_2",
                "strength": 0.5
            },
            {
                "groupNameId": "peg_pen-b_-1",
                "groupColorId": "red_-1_lightGreen",
                "id": "red_5_1_lightGreen_1_12",
                "from": "red_5_1",
                "to": "lightGreen_1_12",
                "strength": 0.5
            },
            {
                "groupNameId": "peg_epg_0",
                "groupColorId": "red_0_blue",
                "id": "red_5_2_blue_6_2",
                "from": "red_5_2",
                "to": "blue_6_2",
                "strength": 0.5
            },
            {
                "groupNameId": "peg_pen-b_1",
                "groupColorId": "red_1_green",
                "id": "red_5_2_green_8_3",
                "from": "red_5_2",
                "to": "green_8_3",
                "strength": 0.5
            },
            {
                "groupNameId": "peg_pen-b_-1",
                "groupColorId": "red_-1_lightGreen",
                "id": "red_5_2_lightGreen_1_1",
                "from": "red_5_2",
                "to": "lightGreen_1_1",
                "strength": 0.5
            },
            {
                "groupNameId": "peg_epg_0",
                "groupColorId": "red_0_blue",
                "id": "red_5_3_blue_6_3",
                "from": "red_5_3",
                "to": "blue_6_3",
                "strength": 0.5
            },
            {
                "groupNameId": "peg_pen-b_1",
                "groupColorId": "red_1_green",
                "id": "red_5_3_green_8_4",
                "from": "red_5_3",
                "to": "green_8_4",
                "strength": 0.5
            },
            {
                "groupNameId": "peg_pen-b_-1",
                "groupColorId": "red_-1_lightGreen",
                "id": "red_5_3_lightGreen_1_2",
                "from": "red_5_3",
                "to": "lightGreen_1_2",
                "strength": 0.5
            },
            {
                "groupNameId": "peg_epg_0",
                "groupColorId": "red_0_blue",
                "id": "red_5_4_blue_6_4",
                "from": "red_5_4",
                "to": "blue_6_4",
                "strength": 0.5
            },
            {
                "groupNameId": "peg_pen-b_1",
                "groupColorId": "red_1_green",
                "id": "red_5_4_green_8_5",
                "from": "red_5_4",
                "to": "green_8_5",
                "strength": 0.5
            },
            {
                "groupNameId": "peg_pen-b_-1",
                "groupColorId": "red_-1_lightGreen",
                "id": "red_5_4_lightGreen_1_3",
                "from": "red_5_4",
                "to": "lightGreen_1_3",
                "strength": 0.5
            },
            {
                "groupNameId": "peg_epg_0",
                "groupColorId": "red_0_blue",
                "id": "red_5_5_blue_6_5",
                "from": "red_5_5",
                "to": "blue_6_5",
                "strength": 0.5
            },
            {
                "groupNameId": "peg_pen-b_1",
                "groupColorId": "red_1_green",
                "id": "red_5_5_green_8_6",
                "from": "red_5_5",
                "to": "green_8_6",
                "strength": 0.5
            },
            {
                "groupNameId": "peg_pen-b_-1",
                "groupColorId": "red_-1_lightGreen",
                "id": "red_5_5_lightGreen_1_4",
                "from": "red_5_5",
                "to": "lightGreen_1_4",
                "strength": 0.5
            },
            {
                "groupNameId": "peg_epg_0",
                "groupColorId": "red_0_blue",
                "id": "red_5_6_blue_6_6",
                "from": "red_5_6",
                "to": "blue_6_6",
                "strength": 0.5
            },
            {
                "groupNameId": "peg_pen-b_1",
                "groupColorId": "red_1_green",
                "id": "red_5_6_green_8_7",
                "from": "red_5_6",
                "to": "green_8_7",
                "strength": 0.5
            },
            {
                "groupNameId": "peg_pen-b_-1",
                "groupColorId": "red_-1_lightGreen",
                "id": "red_5_6_lightGreen_1_5",
                "from": "red_5_6",
                "to": "lightGreen_1_5",
                "strength": 0.5
            },
            {
                "groupNameId": "peg_epg_0",
                "groupColorId": "red_0_blue",
                "id": "red_5_7_blue_6_7",
                "from": "red_5_7",
                "to": "blue_6_7",
                "strength": 0.5
            },
            {
                "groupNameId": "peg_pen-b_1",
                "groupColorId": "red_1_green",
                "id": "red_5_7_green_8_8",
                "from": "red_5_7",
                "to": "green_8_8",
                "strength": 0.5
            },
            {
                "groupNameId": "peg_pen-b_-1",
                "groupColorId": "red_-1_lightGreen",
                "id": "red_5_7_lightGreen_1_6",
                "from": "red_5_7",
                "to": "lightGreen_1_6",
                "strength": 0.5
            },
            {
                "groupNameId": "peg_epg_0",
                "groupColorId": "red_0_blue",
                "id": "red_5_8_blue_6_8",
                "from": "red_5_8",
                "to": "blue_6_8",
                "strength": 0.5
            },
            {
                "groupNameId": "peg_pen-b_1",
                "groupColorId": "red_1_green",
                "id": "red_5_8_green_8_9",
                "from": "red_5_8",
                "to": "green_8_9",
                "strength": 0.5
            },
            {
                "groupNameId": "peg_pen-b_-1",
                "groupColorId": "red_-1_lightGreen",
                "id": "red_5_8_lightGreen_1_7",
                "from": "red_5_8",
                "to": "lightGreen_1_7",
                "strength": 0.5
            },
            {
                "groupNameId": "peg_epg_0",
                "groupColorId": "red_0_blue",
                "id": "red_5_9_blue_6_9",
                "from": "red_5_9",
                "to": "blue_6_9",
                "strength": 0.5
            },
            {
                "groupNameId": "peg_pen-b_1",
                "groupColorId": "red_1_green",
                "id": "red_5_9_green_8_10",
                "from": "red_5_9",
                "to": "green_8_10",
                "strength": 0.5
            },
            {
                "groupNameId": "peg_pen-b_-1",
                "groupColorId": "red_-1_lightGreen",
                "id": "red_5_9_lightGreen_1_8",
                "from": "red_5_9",
                "to": "lightGreen_1_8",
                "strength": 0.5
            },
            {
                "groupNameId": "peg_epg_0",
                "groupColorId": "red_0_blue",
                "id": "red_5_10_blue_6_10",
                "from": "red_5_10",
                "to": "blue_6_10",
                "strength": 0.5
            },
            {
                "groupNameId": "peg_pen-b_1",
                "groupColorId": "red_1_green",
                "id": "red_5_10_green_8_11",
                "from": "red_5_10",
                "to": "green_8_11",
                "strength": 0.5
            },
            {
                "groupNameId": "peg_pen-b_-1",
                "groupColorId": "red_-1_lightGreen",
                "id": "red_5_10_lightGreen_1_9",
                "from": "red_5_10",
                "to": "lightGreen_1_9",
                "strength": 0.5
            },
            {
                "groupNameId": "peg_epg_0",
                "groupColorId": "red_0_blue",
                "id": "red_5_11_blue_6_11",
                "from": "red_5_11",
                "to": "blue_6_11",
                "strength": 0.5
            },
            {
                "groupNameId": "peg_pen-b_1",
                "groupColorId": "red_1_green",
                "id": "red_5_11_green_8_12",
                "from": "red_5_11",
                "to": "green_8_12",
                "strength": 0.5
            },
            {
                "groupNameId": "peg_pen-b_-1",
                "groupColorId": "red_-1_lightGreen",
                "id": "red_5_11_lightGreen_1_10",
                "from": "red_5_11",
                "to": "lightGreen_1_10",
                "strength": 0.5
            },
            {
                "groupNameId": "peg_epg_0",
                "groupColorId": "red_0_blue",
                "id": "red_5_12_blue_6_12",
                "from": "red_5_12",
                "to": "blue_6_12",
                "strength": 0.5
            },
            {
                "groupNameId": "peg_pen-b_1",
                "groupColorId": "red_1_green",
                "id": "red_5_12_green_8_1",
                "from": "red_5_12",
                "to": "green_8_1",
                "strength": 0.5
            },
            {
                "groupNameId": "peg_pen-b_-1",
                "groupColorId": "red_-1_lightGreen",
                "id": "red_5_12_lightGreen_1_11",
                "from": "red_5_12",
                "to": "lightGreen_1_11",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_epg_0",
                "groupColorId": "blue_0_blue",
                "id": "blue_6_1_blue_6_1",
                "from": "blue_6_1",
                "to": "blue_6_1",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_pen-b_1",
                "groupColorId": "blue_1_green",
                "id": "blue_6_1_green_8_2",
                "from": "blue_6_1",
                "to": "green_8_2",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_pen_1",
                "groupColorId": "blue_1_orange",
                "id": "blue_6_1_orange_7_2",
                "from": "blue_6_1",
                "to": "orange_7_2",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_epg_0",
                "groupColorId": "blue_0_lightBlue",
                "id": "blue_6_1_lightBlue_3_1",
                "from": "blue_6_1",
                "to": "lightBlue_3_1",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_peg_0",
                "groupColorId": "blue_0_red",
                "id": "blue_6_1_red_5_1",
                "from": "blue_6_1",
                "to": "red_5_1",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_peg_0",
                "groupColorId": "blue_0_lightRed",
                "id": "blue_6_1_lightRed_4_1",
                "from": "blue_6_1",
                "to": "lightRed_4_1",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_pen-b_-1",
                "groupColorId": "blue_-1_lightGreen",
                "id": "blue_6_1_lightGreen_1_12",
                "from": "blue_6_1",
                "to": "lightGreen_1_12",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_pen_-1",
                "groupColorId": "blue_-1_lightOrange",
                "id": "blue_6_1_lightOrange_2_12",
                "from": "blue_6_1",
                "to": "lightOrange_2_12",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_epg_0",
                "groupColorId": "blue_0_blue",
                "id": "blue_6_2_blue_6_2",
                "from": "blue_6_2",
                "to": "blue_6_2",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_pen-b_1",
                "groupColorId": "blue_1_green",
                "id": "blue_6_2_green_8_3",
                "from": "blue_6_2",
                "to": "green_8_3",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_pen_1",
                "groupColorId": "blue_1_orange",
                "id": "blue_6_2_orange_7_3",
                "from": "blue_6_2",
                "to": "orange_7_3",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_epg_0",
                "groupColorId": "blue_0_lightBlue",
                "id": "blue_6_2_lightBlue_3_2",
                "from": "blue_6_2",
                "to": "lightBlue_3_2",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_peg_0",
                "groupColorId": "blue_0_red",
                "id": "blue_6_2_red_5_2",
                "from": "blue_6_2",
                "to": "red_5_2",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_peg_0",
                "groupColorId": "blue_0_lightRed",
                "id": "blue_6_2_lightRed_4_2",
                "from": "blue_6_2",
                "to": "lightRed_4_2",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_pen-b_-1",
                "groupColorId": "blue_-1_lightGreen",
                "id": "blue_6_2_lightGreen_1_1",
                "from": "blue_6_2",
                "to": "lightGreen_1_1",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_pen_-1",
                "groupColorId": "blue_-1_lightOrange",
                "id": "blue_6_2_lightOrange_2_1",
                "from": "blue_6_2",
                "to": "lightOrange_2_1",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_epg_0",
                "groupColorId": "blue_0_blue",
                "id": "blue_6_3_blue_6_3",
                "from": "blue_6_3",
                "to": "blue_6_3",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_pen-b_1",
                "groupColorId": "blue_1_green",
                "id": "blue_6_3_green_8_4",
                "from": "blue_6_3",
                "to": "green_8_4",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_pen_1",
                "groupColorId": "blue_1_orange",
                "id": "blue_6_3_orange_7_4",
                "from": "blue_6_3",
                "to": "orange_7_4",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_epg_0",
                "groupColorId": "blue_0_lightBlue",
                "id": "blue_6_3_lightBlue_3_3",
                "from": "blue_6_3",
                "to": "lightBlue_3_3",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_peg_0",
                "groupColorId": "blue_0_red",
                "id": "blue_6_3_red_5_3",
                "from": "blue_6_3",
                "to": "red_5_3",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_peg_0",
                "groupColorId": "blue_0_lightRed",
                "id": "blue_6_3_lightRed_4_3",
                "from": "blue_6_3",
                "to": "lightRed_4_3",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_pen-b_-1",
                "groupColorId": "blue_-1_lightGreen",
                "id": "blue_6_3_lightGreen_1_2",
                "from": "blue_6_3",
                "to": "lightGreen_1_2",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_pen_-1",
                "groupColorId": "blue_-1_lightOrange",
                "id": "blue_6_3_lightOrange_2_2",
                "from": "blue_6_3",
                "to": "lightOrange_2_2",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_epg_0",
                "groupColorId": "blue_0_blue",
                "id": "blue_6_4_blue_6_4",
                "from": "blue_6_4",
                "to": "blue_6_4",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_pen-b_1",
                "groupColorId": "blue_1_green",
                "id": "blue_6_4_green_8_5",
                "from": "blue_6_4",
                "to": "green_8_5",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_pen_1",
                "groupColorId": "blue_1_orange",
                "id": "blue_6_4_orange_7_5",
                "from": "blue_6_4",
                "to": "orange_7_5",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_epg_0",
                "groupColorId": "blue_0_lightBlue",
                "id": "blue_6_4_lightBlue_3_4",
                "from": "blue_6_4",
                "to": "lightBlue_3_4",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_peg_0",
                "groupColorId": "blue_0_red",
                "id": "blue_6_4_red_5_4",
                "from": "blue_6_4",
                "to": "red_5_4",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_peg_0",
                "groupColorId": "blue_0_lightRed",
                "id": "blue_6_4_lightRed_4_4",
                "from": "blue_6_4",
                "to": "lightRed_4_4",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_pen-b_-1",
                "groupColorId": "blue_-1_lightGreen",
                "id": "blue_6_4_lightGreen_1_3",
                "from": "blue_6_4",
                "to": "lightGreen_1_3",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_pen_-1",
                "groupColorId": "blue_-1_lightOrange",
                "id": "blue_6_4_lightOrange_2_3",
                "from": "blue_6_4",
                "to": "lightOrange_2_3",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_epg_0",
                "groupColorId": "blue_0_blue",
                "id": "blue_6_5_blue_6_5",
                "from": "blue_6_5",
                "to": "blue_6_5",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_pen-b_1",
                "groupColorId": "blue_1_green",
                "id": "blue_6_5_green_8_6",
                "from": "blue_6_5",
                "to": "green_8_6",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_pen_1",
                "groupColorId": "blue_1_orange",
                "id": "blue_6_5_orange_7_6",
                "from": "blue_6_5",
                "to": "orange_7_6",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_epg_0",
                "groupColorId": "blue_0_lightBlue",
                "id": "blue_6_5_lightBlue_3_5",
                "from": "blue_6_5",
                "to": "lightBlue_3_5",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_peg_0",
                "groupColorId": "blue_0_red",
                "id": "blue_6_5_red_5_5",
                "from": "blue_6_5",
                "to": "red_5_5",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_peg_0",
                "groupColorId": "blue_0_lightRed",
                "id": "blue_6_5_lightRed_4_5",
                "from": "blue_6_5",
                "to": "lightRed_4_5",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_pen-b_-1",
                "groupColorId": "blue_-1_lightGreen",
                "id": "blue_6_5_lightGreen_1_4",
                "from": "blue_6_5",
                "to": "lightGreen_1_4",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_pen_-1",
                "groupColorId": "blue_-1_lightOrange",
                "id": "blue_6_5_lightOrange_2_4",
                "from": "blue_6_5",
                "to": "lightOrange_2_4",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_epg_0",
                "groupColorId": "blue_0_blue",
                "id": "blue_6_6_blue_6_6",
                "from": "blue_6_6",
                "to": "blue_6_6",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_pen-b_1",
                "groupColorId": "blue_1_green",
                "id": "blue_6_6_green_8_7",
                "from": "blue_6_6",
                "to": "green_8_7",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_pen_1",
                "groupColorId": "blue_1_orange",
                "id": "blue_6_6_orange_7_7",
                "from": "blue_6_6",
                "to": "orange_7_7",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_epg_0",
                "groupColorId": "blue_0_lightBlue",
                "id": "blue_6_6_lightBlue_3_6",
                "from": "blue_6_6",
                "to": "lightBlue_3_6",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_peg_0",
                "groupColorId": "blue_0_red",
                "id": "blue_6_6_red_5_6",
                "from": "blue_6_6",
                "to": "red_5_6",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_peg_0",
                "groupColorId": "blue_0_lightRed",
                "id": "blue_6_6_lightRed_4_6",
                "from": "blue_6_6",
                "to": "lightRed_4_6",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_pen-b_-1",
                "groupColorId": "blue_-1_lightGreen",
                "id": "blue_6_6_lightGreen_1_5",
                "from": "blue_6_6",
                "to": "lightGreen_1_5",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_pen_-1",
                "groupColorId": "blue_-1_lightOrange",
                "id": "blue_6_6_lightOrange_2_5",
                "from": "blue_6_6",
                "to": "lightOrange_2_5",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_epg_0",
                "groupColorId": "blue_0_blue",
                "id": "blue_6_7_blue_6_7",
                "from": "blue_6_7",
                "to": "blue_6_7",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_pen-b_1",
                "groupColorId": "blue_1_green",
                "id": "blue_6_7_green_8_8",
                "from": "blue_6_7",
                "to": "green_8_8",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_pen_1",
                "groupColorId": "blue_1_orange",
                "id": "blue_6_7_orange_7_8",
                "from": "blue_6_7",
                "to": "orange_7_8",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_epg_0",
                "groupColorId": "blue_0_lightBlue",
                "id": "blue_6_7_lightBlue_3_7",
                "from": "blue_6_7",
                "to": "lightBlue_3_7",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_peg_0",
                "groupColorId": "blue_0_red",
                "id": "blue_6_7_red_5_7",
                "from": "blue_6_7",
                "to": "red_5_7",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_peg_0",
                "groupColorId": "blue_0_lightRed",
                "id": "blue_6_7_lightRed_4_7",
                "from": "blue_6_7",
                "to": "lightRed_4_7",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_pen-b_-1",
                "groupColorId": "blue_-1_lightGreen",
                "id": "blue_6_7_lightGreen_1_6",
                "from": "blue_6_7",
                "to": "lightGreen_1_6",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_pen_-1",
                "groupColorId": "blue_-1_lightOrange",
                "id": "blue_6_7_lightOrange_2_6",
                "from": "blue_6_7",
                "to": "lightOrange_2_6",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_epg_0",
                "groupColorId": "blue_0_blue",
                "id": "blue_6_8_blue_6_8",
                "from": "blue_6_8",
                "to": "blue_6_8",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_pen-b_1",
                "groupColorId": "blue_1_green",
                "id": "blue_6_8_green_8_9",
                "from": "blue_6_8",
                "to": "green_8_9",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_pen_1",
                "groupColorId": "blue_1_orange",
                "id": "blue_6_8_orange_7_9",
                "from": "blue_6_8",
                "to": "orange_7_9",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_epg_0",
                "groupColorId": "blue_0_lightBlue",
                "id": "blue_6_8_lightBlue_3_8",
                "from": "blue_6_8",
                "to": "lightBlue_3_8",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_peg_0",
                "groupColorId": "blue_0_red",
                "id": "blue_6_8_red_5_8",
                "from": "blue_6_8",
                "to": "red_5_8",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_peg_0",
                "groupColorId": "blue_0_lightRed",
                "id": "blue_6_8_lightRed_4_8",
                "from": "blue_6_8",
                "to": "lightRed_4_8",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_pen-b_-1",
                "groupColorId": "blue_-1_lightGreen",
                "id": "blue_6_8_lightGreen_1_7",
                "from": "blue_6_8",
                "to": "lightGreen_1_7",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_pen_-1",
                "groupColorId": "blue_-1_lightOrange",
                "id": "blue_6_8_lightOrange_2_7",
                "from": "blue_6_8",
                "to": "lightOrange_2_7",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_epg_0",
                "groupColorId": "blue_0_blue",
                "id": "blue_6_9_blue_6_9",
                "from": "blue_6_9",
                "to": "blue_6_9",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_pen-b_1",
                "groupColorId": "blue_1_green",
                "id": "blue_6_9_green_8_10",
                "from": "blue_6_9",
                "to": "green_8_10",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_pen_1",
                "groupColorId": "blue_1_orange",
                "id": "blue_6_9_orange_7_10",
                "from": "blue_6_9",
                "to": "orange_7_10",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_epg_0",
                "groupColorId": "blue_0_lightBlue",
                "id": "blue_6_9_lightBlue_3_9",
                "from": "blue_6_9",
                "to": "lightBlue_3_9",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_peg_0",
                "groupColorId": "blue_0_red",
                "id": "blue_6_9_red_5_9",
                "from": "blue_6_9",
                "to": "red_5_9",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_peg_0",
                "groupColorId": "blue_0_lightRed",
                "id": "blue_6_9_lightRed_4_9",
                "from": "blue_6_9",
                "to": "lightRed_4_9",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_pen-b_-1",
                "groupColorId": "blue_-1_lightGreen",
                "id": "blue_6_9_lightGreen_1_8",
                "from": "blue_6_9",
                "to": "lightGreen_1_8",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_pen_-1",
                "groupColorId": "blue_-1_lightOrange",
                "id": "blue_6_9_lightOrange_2_8",
                "from": "blue_6_9",
                "to": "lightOrange_2_8",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_epg_0",
                "groupColorId": "blue_0_blue",
                "id": "blue_6_10_blue_6_10",
                "from": "blue_6_10",
                "to": "blue_6_10",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_pen-b_1",
                "groupColorId": "blue_1_green",
                "id": "blue_6_10_green_8_11",
                "from": "blue_6_10",
                "to": "green_8_11",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_pen_1",
                "groupColorId": "blue_1_orange",
                "id": "blue_6_10_orange_7_11",
                "from": "blue_6_10",
                "to": "orange_7_11",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_epg_0",
                "groupColorId": "blue_0_lightBlue",
                "id": "blue_6_10_lightBlue_3_10",
                "from": "blue_6_10",
                "to": "lightBlue_3_10",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_peg_0",
                "groupColorId": "blue_0_red",
                "id": "blue_6_10_red_5_10",
                "from": "blue_6_10",
                "to": "red_5_10",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_peg_0",
                "groupColorId": "blue_0_lightRed",
                "id": "blue_6_10_lightRed_4_10",
                "from": "blue_6_10",
                "to": "lightRed_4_10",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_pen-b_-1",
                "groupColorId": "blue_-1_lightGreen",
                "id": "blue_6_10_lightGreen_1_9",
                "from": "blue_6_10",
                "to": "lightGreen_1_9",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_pen_-1",
                "groupColorId": "blue_-1_lightOrange",
                "id": "blue_6_10_lightOrange_2_9",
                "from": "blue_6_10",
                "to": "lightOrange_2_9",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_epg_0",
                "groupColorId": "blue_0_blue",
                "id": "blue_6_11_blue_6_11",
                "from": "blue_6_11",
                "to": "blue_6_11",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_pen-b_1",
                "groupColorId": "blue_1_green",
                "id": "blue_6_11_green_8_12",
                "from": "blue_6_11",
                "to": "green_8_12",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_pen_1",
                "groupColorId": "blue_1_orange",
                "id": "blue_6_11_orange_7_12",
                "from": "blue_6_11",
                "to": "orange_7_12",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_epg_0",
                "groupColorId": "blue_0_lightBlue",
                "id": "blue_6_11_lightBlue_3_11",
                "from": "blue_6_11",
                "to": "lightBlue_3_11",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_peg_0",
                "groupColorId": "blue_0_red",
                "id": "blue_6_11_red_5_11",
                "from": "blue_6_11",
                "to": "red_5_11",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_peg_0",
                "groupColorId": "blue_0_lightRed",
                "id": "blue_6_11_lightRed_4_11",
                "from": "blue_6_11",
                "to": "lightRed_4_11",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_pen-b_-1",
                "groupColorId": "blue_-1_lightGreen",
                "id": "blue_6_11_lightGreen_1_10",
                "from": "blue_6_11",
                "to": "lightGreen_1_10",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_pen_-1",
                "groupColorId": "blue_-1_lightOrange",
                "id": "blue_6_11_lightOrange_2_10",
                "from": "blue_6_11",
                "to": "lightOrange_2_10",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_epg_0",
                "groupColorId": "blue_0_blue",
                "id": "blue_6_12_blue_6_12",
                "from": "blue_6_12",
                "to": "blue_6_12",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_pen-b_1",
                "groupColorId": "blue_1_green",
                "id": "blue_6_12_green_8_1",
                "from": "blue_6_12",
                "to": "green_8_1",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_pen_1",
                "groupColorId": "blue_1_orange",
                "id": "blue_6_12_orange_7_1",
                "from": "blue_6_12",
                "to": "orange_7_1",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_epg_0",
                "groupColorId": "blue_0_lightBlue",
                "id": "blue_6_12_lightBlue_3_12",
                "from": "blue_6_12",
                "to": "lightBlue_3_12",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_peg_0",
                "groupColorId": "blue_0_red",
                "id": "blue_6_12_red_5_12",
                "from": "blue_6_12",
                "to": "red_5_12",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_peg_0",
                "groupColorId": "blue_0_lightRed",
                "id": "blue_6_12_lightRed_4_12",
                "from": "blue_6_12",
                "to": "lightRed_4_12",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_pen-b_-1",
                "groupColorId": "blue_-1_lightGreen",
                "id": "blue_6_12_lightGreen_1_11",
                "from": "blue_6_12",
                "to": "lightGreen_1_11",
                "strength": 0.5
            },
            {
                "groupNameId": "epg_pen_-1",
                "groupColorId": "blue_-1_lightOrange",
                "id": "blue_6_12_lightOrange_2_11",
                "from": "blue_6_12",
                "to": "lightOrange_2_11",
                "strength": 0.5
            },
            {
                "groupNameId": "pen_epg_-1",
                "groupColorId": "orange_-1_blue",
                "id": "orange_7_1_blue_6_12",
                "from": "orange_7_1",
                "to": "blue_6_12",
                "strength": 0.5
            },
            {
                "groupNameId": "pen_epg_-1",
                "groupColorId": "orange_-1_lightBlue",
                "id": "orange_7_1_lightBlue_3_12",
                "from": "orange_7_1",
                "to": "lightBlue_3_12",
                "strength": 0.5
            },
            {
                "groupNameId": "pen_epg_-1",
                "groupColorId": "orange_-1_blue",
                "id": "orange_7_2_blue_6_1",
                "from": "orange_7_2",
                "to": "blue_6_1",
                "strength": 0.5
            },
            {
                "groupNameId": "pen_epg_-1",
                "groupColorId": "orange_-1_lightBlue",
                "id": "orange_7_2_lightBlue_3_1",
                "from": "orange_7_2",
                "to": "lightBlue_3_1",
                "strength": 0.5
            },
            {
                "groupNameId": "pen_epg_-1",
                "groupColorId": "orange_-1_blue",
                "id": "orange_7_3_blue_6_2",
                "from": "orange_7_3",
                "to": "blue_6_2",
                "strength": 0.5
            },
            {
                "groupNameId": "pen_epg_-1",
                "groupColorId": "orange_-1_lightBlue",
                "id": "orange_7_3_lightBlue_3_2",
                "from": "orange_7_3",
                "to": "lightBlue_3_2",
                "strength": 0.5
            },
            {
                "groupNameId": "pen_epg_-1",
                "groupColorId": "orange_-1_blue",
                "id": "orange_7_4_blue_6_3",
                "from": "orange_7_4",
                "to": "blue_6_3",
                "strength": 0.5
            },
            {
                "groupNameId": "pen_epg_-1",
                "groupColorId": "orange_-1_lightBlue",
                "id": "orange_7_4_lightBlue_3_3",
                "from": "orange_7_4",
                "to": "lightBlue_3_3",
                "strength": 0.5
            },
            {
                "groupNameId": "pen_epg_-1",
                "groupColorId": "orange_-1_blue",
                "id": "orange_7_5_blue_6_4",
                "from": "orange_7_5",
                "to": "blue_6_4",
                "strength": 0.5
            },
            {
                "groupNameId": "pen_epg_-1",
                "groupColorId": "orange_-1_lightBlue",
                "id": "orange_7_5_lightBlue_3_4",
                "from": "orange_7_5",
                "to": "lightBlue_3_4",
                "strength": 0.5
            },
            {
                "groupNameId": "pen_epg_-1",
                "groupColorId": "orange_-1_blue",
                "id": "orange_7_6_blue_6_5",
                "from": "orange_7_6",
                "to": "blue_6_5",
                "strength": 0.5
            },
            {
                "groupNameId": "pen_epg_-1",
                "groupColorId": "orange_-1_lightBlue",
                "id": "orange_7_6_lightBlue_3_5",
                "from": "orange_7_6",
                "to": "lightBlue_3_5",
                "strength": 0.5
            },
            {
                "groupNameId": "pen_epg_-1",
                "groupColorId": "orange_-1_blue",
                "id": "orange_7_7_blue_6_6",
                "from": "orange_7_7",
                "to": "blue_6_6",
                "strength": 0.5
            },
            {
                "groupNameId": "pen_epg_-1",
                "groupColorId": "orange_-1_lightBlue",
                "id": "orange_7_7_lightBlue_3_6",
                "from": "orange_7_7",
                "to": "lightBlue_3_6",
                "strength": 0.5
            },
            {
                "groupNameId": "pen_epg_-1",
                "groupColorId": "orange_-1_blue",
                "id": "orange_7_8_blue_6_7",
                "from": "orange_7_8",
                "to": "blue_6_7",
                "strength": 0.5
            },
            {
                "groupNameId": "pen_epg_-1",
                "groupColorId": "orange_-1_lightBlue",
                "id": "orange_7_8_lightBlue_3_7",
                "from": "orange_7_8",
                "to": "lightBlue_3_7",
                "strength": 0.5
            },
            {
                "groupNameId": "pen_epg_-1",
                "groupColorId": "orange_-1_blue",
                "id": "orange_7_9_blue_6_8",
                "from": "orange_7_9",
                "to": "blue_6_8",
                "strength": 0.5
            },
            {
                "groupNameId": "pen_epg_-1",
                "groupColorId": "orange_-1_lightBlue",
                "id": "orange_7_9_lightBlue_3_8",
                "from": "orange_7_9",
                "to": "lightBlue_3_8",
                "strength": 0.5
            },
            {
                "groupNameId": "pen_epg_-1",
                "groupColorId": "orange_-1_blue",
                "id": "orange_7_10_blue_6_9",
                "from": "orange_7_10",
                "to": "blue_6_9",
                "strength": 0.5
            },
            {
                "groupNameId": "pen_epg_-1",
                "groupColorId": "orange_-1_lightBlue",
                "id": "orange_7_10_lightBlue_3_9",
                "from": "orange_7_10",
                "to": "lightBlue_3_9",
                "strength": 0.5
            },
            {
                "groupNameId": "pen_epg_-1",
                "groupColorId": "orange_-1_blue",
                "id": "orange_7_11_blue_6_10",
                "from": "orange_7_11",
                "to": "blue_6_10",
                "strength": 0.5
            },
            {
                "groupNameId": "pen_epg_-1",
                "groupColorId": "orange_-1_lightBlue",
                "id": "orange_7_11_lightBlue_3_10",
                "from": "orange_7_11",
                "to": "lightBlue_3_10",
                "strength": 0.5
            },
            {
                "groupNameId": "pen_epg_-1",
                "groupColorId": "orange_-1_blue",
                "id": "orange_7_12_blue_6_11",
                "from": "orange_7_12",
                "to": "blue_6_11",
                "strength": 0.5
            },
            {
                "groupNameId": "pen_epg_-1",
                "groupColorId": "orange_-1_lightBlue",
                "id": "orange_7_12_lightBlue_3_11",
                "from": "orange_7_12",
                "to": "lightBlue_3_11",
                "strength": 0.5
            },
            {
                "groupNameId": "pen-b_epg_-1",
                "groupColorId": "green_-1_blue",
                "id": "green_8_1_blue_6_12",
                "from": "green_8_1",
                "to": "blue_6_12",
                "strength": 0.5
            },
            {
                "groupNameId": "pen-b_epg_-1",
                "groupColorId": "green_-1_lightBlue",
                "id": "green_8_1_lightBlue_3_12",
                "from": "green_8_1",
                "to": "lightBlue_3_12",
                "strength": 0.5
            },
            {
                "groupNameId": "pen-b_epg_-1",
                "groupColorId": "green_-1_blue",
                "id": "green_8_2_blue_6_1",
                "from": "green_8_2",
                "to": "blue_6_1",
                "strength": 0.5
            },
            {
                "groupNameId": "pen-b_epg_-1",
                "groupColorId": "green_-1_lightBlue",
                "id": "green_8_2_lightBlue_3_1",
                "from": "green_8_2",
                "to": "lightBlue_3_1",
                "strength": 0.5
            },
            {
                "groupNameId": "pen-b_epg_-1",
                "groupColorId": "green_-1_blue",
                "id": "green_8_3_blue_6_2",
                "from": "green_8_3",
                "to": "blue_6_2",
                "strength": 0.5
            },
            {
                "groupNameId": "pen-b_epg_-1",
                "groupColorId": "green_-1_lightBlue",
                "id": "green_8_3_lightBlue_3_2",
                "from": "green_8_3",
                "to": "lightBlue_3_2",
                "strength": 0.5
            },
            {
                "groupNameId": "pen-b_epg_-1",
                "groupColorId": "green_-1_blue",
                "id": "green_8_4_blue_6_3",
                "from": "green_8_4",
                "to": "blue_6_3",
                "strength": 0.5
            },
            {
                "groupNameId": "pen-b_epg_-1",
                "groupColorId": "green_-1_lightBlue",
                "id": "green_8_4_lightBlue_3_3",
                "from": "green_8_4",
                "to": "lightBlue_3_3",
                "strength": 0.5
            },
            {
                "groupNameId": "pen-b_epg_-1",
                "groupColorId": "green_-1_blue",
                "id": "green_8_5_blue_6_4",
                "from": "green_8_5",
                "to": "blue_6_4",
                "strength": 0.5
            },
            {
                "groupNameId": "pen-b_epg_-1",
                "groupColorId": "green_-1_lightBlue",
                "id": "green_8_5_lightBlue_3_4",
                "from": "green_8_5",
                "to": "lightBlue_3_4",
                "strength": 0.5
            },
            {
                "groupNameId": "pen-b_epg_-1",
                "groupColorId": "green_-1_blue",
                "id": "green_8_6_blue_6_5",
                "from": "green_8_6",
                "to": "blue_6_5",
                "strength": 0.5
            },
            {
                "groupNameId": "pen-b_epg_-1",
                "groupColorId": "green_-1_lightBlue",
                "id": "green_8_6_lightBlue_3_5",
                "from": "green_8_6",
                "to": "lightBlue_3_5",
                "strength": 0.5
            },
            {
                "groupNameId": "pen-b_epg_-1",
                "groupColorId": "green_-1_blue",
                "id": "green_8_7_blue_6_6",
                "from": "green_8_7",
                "to": "blue_6_6",
                "strength": 0.5
            },
            {
                "groupNameId": "pen-b_epg_-1",
                "groupColorId": "green_-1_lightBlue",
                "id": "green_8_7_lightBlue_3_6",
                "from": "green_8_7",
                "to": "lightBlue_3_6",
                "strength": 0.5
            },
            {
                "groupNameId": "pen-b_epg_-1",
                "groupColorId": "green_-1_blue",
                "id": "green_8_8_blue_6_7",
                "from": "green_8_8",
                "to": "blue_6_7",
                "strength": 0.5
            },
            {
                "groupNameId": "pen-b_epg_-1",
                "groupColorId": "green_-1_lightBlue",
                "id": "green_8_8_lightBlue_3_7",
                "from": "green_8_8",
                "to": "lightBlue_3_7",
                "strength": 0.5
            },
            {
                "groupNameId": "pen-b_epg_-1",
                "groupColorId": "green_-1_blue",
                "id": "green_8_9_blue_6_8",
                "from": "green_8_9",
                "to": "blue_6_8",
                "strength": 0.5
            },
            {
                "groupNameId": "pen-b_epg_-1",
                "groupColorId": "green_-1_lightBlue",
                "id": "green_8_9_lightBlue_3_8",
                "from": "green_8_9",
                "to": "lightBlue_3_8",
                "strength": 0.5
            },
            {
                "groupNameId": "pen-b_epg_-1",
                "groupColorId": "green_-1_blue",
                "id": "green_8_10_blue_6_9",
                "from": "green_8_10",
                "to": "blue_6_9",
                "strength": 0.5
            },
            {
                "groupNameId": "pen-b_epg_-1",
                "groupColorId": "green_-1_lightBlue",
                "id": "green_8_10_lightBlue_3_9",
                "from": "green_8_10",
                "to": "lightBlue_3_9",
                "strength": 0.5
            },
            {
                "groupNameId": "pen-b_epg_-1",
                "groupColorId": "green_-1_blue",
                "id": "green_8_11_blue_6_10",
                "from": "green_8_11",
                "to": "blue_6_10",
                "strength": 0.5
            },
            {
                "groupNameId": "pen-b_epg_-1",
                "groupColorId": "green_-1_lightBlue",
                "id": "green_8_11_lightBlue_3_10",
                "from": "green_8_11",
                "to": "lightBlue_3_10",
                "strength": 0.5
            },
            {
                "groupNameId": "pen-b_epg_-1",
                "groupColorId": "green_-1_blue",
                "id": "green_8_12_blue_6_11",
                "from": "green_8_12",
                "to": "blue_6_11",
                "strength": 0.5
            },
            {
                "groupNameId": "pen-b_epg_-1",
                "groupColorId": "green_-1_lightBlue",
                "id": "green_8_12_lightBlue_3_11",
                "from": "green_8_12",
                "to": "lightBlue_3_11",
                "strength": 0.5
            }
        ]
    })
})