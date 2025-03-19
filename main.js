import { Elemental, passAlongProps, html } from "./imports/elemental.js"
import InfiniteCanvas from "./main/infinite_canvas.js"
import createButton from "./main/button.js"

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

// Create instance when the page loads
window.addEventListener("load", () => {
    const canvas = new InfiniteCanvas()
    const saveButton = createButton({ children: "Save", onClick: () => downloadCanvasState(canvas) })
    const loadButton = createButton({ children: "Load", onClick: () => loadCanvasState(canvas) })

    const buttonContainer = html`<div style="position: fixed; top: 20px; right: 20px; gap: 2rem; display: flex;">
        ${saveButton}
        ${loadButton}
    </div>`

    document.body.appendChild(canvas.element)
    document.body.appendChild(buttonContainer)
})