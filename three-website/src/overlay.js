let elements;
let text = [];

document.addEventListener("DOMContentLoaded", function () {
    Splitting();

    elements = document.querySelectorAll("[data-splitting]");
    elements.forEach((element) => text.push(element.textContent.replace(/\s+/g, '')))
    
    const transitionChars = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', '!', '@', '#', '$', '&', '*', '(', ')', '-', '_', '+', '=', '/', '[', ']', '{', '}', ';', ':', '<', '>', ',', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    const amph = 30;
    const elen = 200;
    const div = 6;
    const off = 1.9;
    const yoff = -100;
    let elementTop;

    function animateDriver() {
        const scrollY = window.scrollY;
        const windowHeight = window.innerHeight;
        elements.forEach((element, i) => {
            const chars = element.querySelectorAll(".char");
            if (i < 3) elementTop = element.getBoundingClientRect().top + scrollY;
            else elementTop = element.getBoundingClientRect().top + scrollY + yoff;
            const elementHeight = element.offsetHeight;
            const length = text[i].length;
            if (!element.classList.contains('fin-animate')) animateTextOverTime(element, i, div);
        });
    }

    function animateTextOverTime(element, index, div) {
        element.classList.add('fin-animate')
        const chars = element.querySelectorAll(".char");
        const length = text[index].length;
        let charlen = 0;

        const interval = setInterval(() => {
            charlen++;
            const num = Math.floor(charlen / div);

            chars.forEach((char, charIndex) => {
                if (charIndex < num) {
                    char.style.visibility = "visible";
                    char.style.color = 'var(--c1)';
                    char.textContent = text[index][charIndex];
                } else if (charIndex < num + elen && charIndex < length) {
                    char.style.visibility = "visible";
                    char.style.color = 'var(--c2)';
                    char.textContent = transitionChars[Math.floor(Math.random() * transitionChars.length)];
                } else char.style.visibility = "hidden";
            });

            if (num >= length) clearInterval(interval);
        }, 10); 
    }

    function throttle(fn, wait) {
        let isThrottled = false;
        return function(...args) {
            if (isThrottled) return;
            fn.apply(this, args);
            isThrottled = true;
            setTimeout(() => {
                isThrottled = false;
            }, wait);
        };
    }
    
    const scene = document.getElementById('scene');
    const tinterval = setInterval(() => {
        if (scene.style.display != '') {
            animateDriver();
            clearInterval(tinterval);
        }
    }, 10);
});
