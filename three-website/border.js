(function() {
    const borderElement = document.getElementById('border');
    const loading = '/ L O A D I N G /'
    const bchar = {
        tL: '┌',
        tR: '┐',
        bL: '└',
        bR: '┘',
        h: '─',
        v: '│'
    };

    class BorderDrawer {
        constructor(gridHeight, gridWidth) {
            this.height = gridHeight;
            this.width = gridWidth;
            this.grid = this.initializeBorderGrid();
            this.prog = 0;
            this.textIndex = 0;
        }

        initializeBorderGrid() {
            return Array.from({ length: this.height + 2 }, () =>
                Array.from({ length: this.width + 2 }, () => ' ')
            );
        }

        drawBorder() {
            const halfWidth = Math.floor((this.width + 2) / 2);
            if (this.prog <= halfWidth) {
                if (halfWidth - this.prog === 0) this.grid[this.height + 1][halfWidth - this.prog] = bchar.bL;
                else this.grid[this.height + 1][halfWidth - this.prog] = bchar.h;
                if (halfWidth + this.prog === this.width + 2) this.grid[this.height + 1][halfWidth + this.prog + 2] = bchar.bR;
                else this.grid[this.height + 1][halfWidth + this.prog] = bchar.h;
            } else if (this.prog <= halfWidth + this.height) {
                const offset = this.prog - halfWidth;
                this.grid[this.height + 1 - offset][0] = bchar.v;
                this.grid[this.height + 1 - offset][this.width + 2] = bchar.v;

            } else if (this.prog <= this.width + this.height - 6) {
                const offset = this.prog - (halfWidth + this.height + 1);
                const offsetR = this.width + 2 - offset;
                if (offset === 0) this.grid[0][offset] = bchar.tL;
                else this.grid[0][offset] = bchar.h;
                if (offsetR === this.width + 2) this.grid[0][offsetR] = bchar.tR;
                else this.grid[0][offsetR] = bchar.h;
            } else if (this.prog <= this.width + this.height + 3) {
                const offset = this.prog - (halfWidth + this.height + 1);
                const offsetR = this.width + 2 - offset;
                this.grid[0][offset] = loading[this.textIndex];
                this.grid[0][offsetR] = loading[loading.length - this.textIndex - 1];
                this.textIndex++
            }
            this.prog++;
            this.render();
        }

        render() {
            const formattedBorder = this.grid.map(row => row.join('')).join('\n');
            borderElement.textContent = formattedBorder;
        }
    }

    const borderDrawer = new BorderDrawer(15, 34);
    setInterval(() => borderDrawer.drawBorder(), 20);
})();
