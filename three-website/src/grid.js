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
        this.width = Math.max(...targetGrid.map(row => row.length));
        this.height = targetGrid.length;

        this.currentGrid = this.rand(this.height, this.width);
        this.statusGrid = this.initStatus();
        this.ascii = {
            ordered: `abcdefghijklmnopqrstuvwxyz[\]^_\`ABCDEFGHIJKLMNOPQRSTUVWXYZ{}~0123456789!"#$%&'()*+,.:;<=>?@`
        };
        this.points = this.initPoints();
        this.morphnum = 0;
        this.resolveTimes = Array(this.height).fill(false);
        this.currentLineToResolve = 0;
    }

    rand(rows, cols) {
        return Array.from({ length: rows }, () =>
            Array.from({ length: cols }, () => getRandomVisibleAscii())
        );
    }

    initStatus() {
        return Array.from({ length: this.height }, () =>
            Array.from({ length: this.width }, () => false) 
        );
    }

    initPoints() {
        return Array.from({ length: this.height }, () =>
            Math.floor(Math.random() * this.ascii.ordered.length)
        );
    }

    setSpaces() {
        this.statusGrid.forEach((row, y) => {
            row.forEach((_, x) => {
                if (x < targetGrid[y].length) {
                    if (targetGrid[y][x] === ' ') {
                        this.currentGrid[y][x] = ' ';
                        this.statusGrid[y][x] = true;
                    }
                }
                else this.statusGrid[y][x] = true;
            });
        });
    }

    orderedMorph() {
        this.currentGrid.forEach((row, y) => {
            row.forEach((cell, x) => {
                if (this.targetGrid[y][x] === ' ') {
                    return;
                }

                if (!this.statusGrid[y][x]) {
                    const divisor = this.ascii.ordered.length;
                    const startIndex = this.points[y];
                    const shift = (startIndex + this.morphnum + x) % divisor;
                    this.currentGrid[y][x] = this.ascii.ordered[shift];

                    if (this.resolveTimes[y] && this.currentGrid[y][x] === this.targetGrid[y][x]) {
                        this.statusGrid[y][x] = true;  
                    }
                }
            });
        });

        this.morphnum++;
    }

    updateGrid() {
        this.currentLineToResolve = parseInt(document.getElementById("grid").dataset["row"])
        for (let i = 0; i < this.currentLineToResolve; i++) {
            if (i < this.height) this.resolveTimes[i] = true;
        }
        this.setSpaces();
        this.orderedMorph();
        this.render();
    }
    checkGrid() {
        let check = true;
        for (let i = 0; i < this.statusGrid.length; i++) {
            for (let j = 0; j < this.statusGrid[i].length; j++) {
                const status = this.statusGrid[i][j];
                if (!status) check = false;
            }
        }
        return check;
    }

    render() {
        const outputGrid = this.currentGrid.map((row, y) =>
            row.slice(0, this.targetGrid[y] ? this.targetGrid[y].length : this.width)
                .concat(Array(this.width - row.length).fill(' '))
        );

        const formattedGrid = outputGrid
            .map((row, y) => row.slice(0, this.targetGrid[y].length).join(''))
            .join('\n');

        if (this.checkGrid()) {
            const button = document.getElementById('start')
            const border = document.getElementById('border2')
            if (button) button.style.display = 'block';
            if (border) border.style.display = 'block';
            clearInterval(interval);

        }

        gridElement.textContent = formattedGrid;
    }
}

const targetGrid = [
    "LOADED OrthographicCamera",
    "LOADED WebGLRenderer",
    "LOADED MapControls",
    "LOADED GLTFLoader",
    "LOADED islandModel",
    "LOADED cloudModel",
    "LOADED boatModel",
    "LOADED debrisModel",
].map(row => row.split(''));

const morphingGrid = new MorphingGrid(targetGrid);
const interval = setInterval(() => morphingGrid.updateGrid(), 30);
