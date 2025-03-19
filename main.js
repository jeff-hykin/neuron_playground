import { Elemental, passAlongProps } from "./imports/elemental.js"
import InfiniteCanvas from "./main/infinite_canvas.js"

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

// Create instance when the page loads
window.addEventListener("load", () => {
    const canvas = new InfiniteCanvas()
    const saveButton = createButton({ children: "Save", onClick: () => downloadCanvasState(canvas) })
    document.body.appendChild(canvas.element)
    document.body.appendChild(saveButton)
})