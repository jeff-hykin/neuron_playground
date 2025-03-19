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

// Create instance when the page loads
window.addEventListener("load", () => {
    const canvas = new InfiniteCanvas()
    document.body = html`<body style="margin: 0; overflow: hidden; background: #f0f0f0;">
        ${canvas.element}
        <div style="position: fixed; top: 20px; right: 20px; gap: 2rem; display: flex;">
            ${Button({ children: "Save", onClick: () => downloadCanvasState(canvas) })}
            ${Button({ children: "Load", onClick: () => loadCanvasState(canvas) })}
            ${Button({ children: "Next", onClick: () => canvas.next() })}
        </div>
    </body>`
})