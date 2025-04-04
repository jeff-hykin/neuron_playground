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

function loadCanvasState(canvas) {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json'
    input.onchange = (event) => {
        const file = event.target.files[0]
        if (file) {
            const reader = new FileReader()
            reader.onload = (e) => {
                const jsonData = JSON.parse(e.target.result)
                canvas.load(jsonData)
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
    const infoPanel = html`<div style="height: 5rem; overflow: auto;position: fixed; right: 0; bottom: 0; width: 200px; background: transparent;">[info area]</div>`
    const canvas = new InfiniteCanvas({ onNodeHovered: (node)=>{
        infoPanel.innerHTML = `Node ID: ${node.id}<br>Energy: ${node.energy.toFixed(2)}<br>Energy Decay Rate: ${node.energyDecayRate}`
    }})

    const settingsPanel = createSettingsPanel({
        onValueChange: ({labelText, value}) => {
            switch (labelText) {
                case 'Node Radius':
                    canvas.nodeNetwork.defaultNodeData.radius = value-0
                    canvas.nodeNetwork.nodes.forEach(node => node.radius = value-0)
                    break;
                case 'Energy Decay Rate':
                    canvas.nodeNetwork.defaultNodeData.energyDecayRate = value-0
                    canvas.nodeNetwork.nodes.forEach(node => node.energyDecayRate = value-0)
                    break;
                case 'Stable Energy Level':
                    canvas.nodeNetwork.defaultNodeData.stableEnergyLevel = value-0
                    canvas.nodeNetwork.nodes.forEach(node => node.stableEnergyLevel = value-0)
                    break;
                case 'Energy After Firing':
                    canvas.nodeNetwork.defaultNodeData.energyAfterFiring = value-0
                    canvas.nodeNetwork.nodes.forEach(node => node.energyAfterFiring = value-0)
                    break;
                default:
                    break;
            }
        },
        numericInputs: [
            {labelText: 'Node Radius', defaultValue: canvas.nodeNetwork.defaultNodeData.radius},
            {labelText: 'Energy Decay Rate', defaultValue: canvas.nodeNetwork.defaultNodeData.energyDecayRate},
            {labelText: 'Stable Energy Level', defaultValue: canvas.nodeNetwork.defaultNodeData.stableEnergyLevel, stepValue: 0.1},
            {labelText: 'Energy After Firing', defaultValue: canvas.nodeNetwork.defaultNodeData.energyAfterFiring, stepValue: 0.1},
        ],
    })

    document.body = html`<body style="margin: 0; overflow: hidden; background: #f0f0f0; font-family: Helvetica, Arial, sans-serif;">
        ${canvas.element}
        <div style="position: fixed; top: 20px; right: 20px; gap: 2rem; display: flex;">
            ${Button({ children: "Save", onClick: () => downloadCanvasState(canvas) })}
            ${Button({ children: "Load", onClick: () => loadCanvasState(canvas) })}
            ${Button({ children: "Back", onClick: () => { canvas.nodeNetwork.back(); canvas.draw(); } })}
            ${Button({ children: "Next", onClick: () => canvas.next() })}
        </div>
        ${settingsPanel}
        ${infoPanel}
    </body>`
})