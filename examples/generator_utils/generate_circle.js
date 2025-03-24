
/**
 * Generates evenly distributed points along the perimeter of a circle.
 *
 * @param {number} circleCenterX - The x-coordinate of the circle's center.
 * @param {number} circleCenterY - The y-coordinate of the circle's center.
 * @param {number} radius - The radius of the circle.
 * @param {number} numberOfPoints - The number of points to generate along the circle's perimeter.
 * @returns {Object} An object containing:
 *   - {Array<Object>} clockwiseListOfPoints: An array of points with x and y coordinates.
 *   - {number} top: The topmost y-coordinate of the bounding box.
 *   - {number} left: The leftmost x-coordinate of the bounding box.
 *   - {number} width: The width of the bounding box.
 *   - {number} height: The height of the bounding box.
 *
 * @example
 * ```js
 * const result = generateCirclePoints({circleCenterX: 0, circleCenterY: 0, radius: 10, numberOfPoints: 4});
 * console.log(result.clockwiseListOfPoints);
 * // Output: [ { x: 10, y: 0 }, { x: 0, y: 10 }, { x: -10, y: 0 }, { x: 0, y: -10 } ]
 * console.log(result.top, result.left, result.width, result.height);
 * // Output: -10 -10 20 20
 * ```
 */
export function generateCirclePoints({circleCenterX, circleCenterY, radius, numberOfPoints}) {
    const clockwiseListOfPoints = [];
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    for (let i = 0; i < numberOfPoints; i++) {
        const angle = (2 * Math.PI / numberOfPoints) * i;
        const x = circleCenterX + radius * Math.cos(angle);
        const y = circleCenterY + radius * Math.sin(angle);
        clockwiseListOfPoints.push({ x, y });

        // Update bounding box
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
    }

    const top = minY;
    const left = minX;
    const width = maxX - minX;
    const height = maxY - minY;

    return { clockwiseListOfPoints, top, left, width, height };
}