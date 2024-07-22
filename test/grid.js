const gridElement = document.getElementById('grid');

function randomString(length = 5) {
    let result = [];
    for (let i = 0; i < length; i++) {
        result.push(getRandomVisibleAscii());
    }
    return result.join('');
}

function getRandomVisibleAscii() {
    const min = 32;
    const max = 126;
    const asciiCode = Math.floor(Math.random() * (max - min + 1)) + min;
    return String.fromCharCode(asciiCode);
}

class MorphingGrid {
    constructor(targetGrid) {
        this.targetGrid = targetGrid;
        this.gridWidth = Math.max(...targetGrid.map(row => row.length));
        this.gridHeight = targetGrid.length;

        // Ensure currentGrid has the same dimensions as targetGrid
        this.currentGrid = this.randomizeGrid(this.gridHeight, this.gridWidth);
        this.statusGrid = this.initializeStatusGrid();
        this.ascii = {
            ordered: `abcdefghijklmnopqrstuvwxyz[\]^_\`ABCDEFGHIJKLMNOPQRSTUVWXYZ{|}~0123456789!"#$%&'()*+,-./:;<=>?@`,
            byDensity: `@MW#B8&%GgQqOoDdKkXxZzNnHhRrEeFfPpAaUuVvYyTtSsCcIiLlJj7?]/\[}{|)(><+=_*^~";:-,\`'.`
        };
        this.startingPoints = this.initializeStartingPoints();
        this.orderedMorphCurrent = 0;

        // Track when each line should start resolving
        this.resolveTimes = Array(this.gridHeight).fill(false);

        // Adjust the gridElement style to fit the grid
        gridElement.style.whiteSpace = 'pre'; // Maintain spaces and new lines
        gridElement.style.fontFamily = 'monospace'; // Ensure even character spacing

        // Add click event listener to resolve next line
        this.currentLineToResolve = 0;
        gridElement.addEventListener('click', () => {
            if (this.currentLineToResolve < this.gridHeight) {
                this.resolveTimes[this.currentLineToResolve] = true;
                this.currentLineToResolve++;
            }
        });
    }

    randomizeGrid(rows, cols) {
        return Array.from({ length: rows }, () =>
            Array.from({ length: cols }, () => getRandomVisibleAscii())
        );
    }

    initializeStatusGrid() {
        return Array.from({ length: this.gridHeight }, () =>
            Array.from({ length: this.gridWidth }, () => false)  // false means not done
        );
    }

    initializeStartingPoints() {
        return Array.from({ length: this.gridHeight }, () =>
            Math.floor(Math.random() * this.ascii.ordered.length)
        );
    }

    setSpaces() {
        this.targetGrid.forEach((row, y) => {
            row.forEach((cell, x) => {
                if (cell === ' ') {
                    this.currentGrid[y][x] = ' ';
                    this.statusGrid[y][x] = true;  // Mark as done
                }
            });
        });
    }

    orderedMorph() {
        this.currentGrid.forEach((row, y) => {
            row.forEach((cell, x) => {
                if (this.targetGrid[y][x] === ' ') {
                    return;
                }

                // Check if the line is ready to resolve and the character is not yet resolved
                if (!this.statusGrid[y][x]) {
                    const divisor = this.ascii.ordered.length;
                    const startIndex = this.startingPoints[y];
                    const shift = (startIndex + this.orderedMorphCurrent + x) % divisor;
                    this.currentGrid[y][x] = this.ascii.ordered[shift];

                    // Check if current cell matches target cell
                    if (this.resolveTimes[y] && this.currentGrid[y][x] === this.targetGrid[y][x]) {
                        this.statusGrid[y][x] = true;  // Mark as done
                    }
                }
            });
        });

        this.orderedMorphCurrent++;
    }

    updateGrid() {
        this.setSpaces();
        this.orderedMorph();
        this.render();
    }

    render() {
        // Ensure the output grid fits the target size
        const outputGrid = this.currentGrid.map((row, y) =>
            row.slice(0, this.targetGrid[y] ? this.targetGrid[y].length : this.gridWidth)
                .concat(Array(this.gridWidth - row.length).fill(' ')) // Pad with spaces
        );

        // Adjust the output grid to avoid cutting off targetGrid characters
        const formattedGrid = outputGrid
            .map((row, y) => row.slice(0, this.targetGrid[y].length).join(''))
            .join('\n');

        gridElement.textContent = formattedGrid;
    }
}

const targetGrid = [
    "Hello World",
    "This is a test",
    "Morphing Grid",
    "Adjust the animation",
    "to fit your needs",
].map(row => row.split(''));

// Initialize the MorphingGrid with the target grid
const morphingGrid = new MorphingGrid(targetGrid);
setInterval(() => morphingGrid.updateGrid(), 50);
