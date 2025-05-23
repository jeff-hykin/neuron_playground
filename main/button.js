import { Elemental, passAlongProps } from "../imports/elemental.js"

export default function createButton({ ...props }) {
    const button = document.createElement("button")
    button.style.padding = "8px 16px"
    button.style.backgroundColor = "#0066ff"
    button.style.color = "white"
    button.style.border = "none"
    button.style.borderRadius = "4px"
    button.style.cursor = "pointer"

    passAlongProps(button, props)
    return button
}
