import { Elemental, passAlongProps } from "../imports/elemental.js"

export default function createButton({ ...props }) {
    const button = document.createElement("button")
    button.style.position = "fixed"
    button.style.top = "20px"
    button.style.right = "20px"
    button.style.padding = "8px 16px"
    button.style.backgroundColor = "#0066ff"
    button.style.color = "white"
    button.style.border = "none"
    button.style.borderRadius = "4px"
    button.style.cursor = "pointer"
    button.style.zIndex = "1000"

    passAlongProps(button, props)
    return button
}
