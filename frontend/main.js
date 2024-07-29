let elements;
let text = [];

document.addEventListener("DOMContentLoaded", function () {
    // Apply Splitting to the text elements
    Splitting();

    // Select the elements you want to animate
    elements = document.querySelectorAll("[data-splitting]");
    elements.forEach((element) => text.push(element.textContent.replace(/\s+/g, '')))
    
    // Define transition characters
    const transitionChars = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', '!', '@', '#', '$', '&', '*', '(', ')', '-', '_', '+', '=', '/', '[', ']', '{', '}', ';', ':', '<', '>', ',', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    const amph = 30;
    const elen = 200;
    const div = 6;
    const off = 1.9;
    const yoff = -100;
    let elementTop;

    function updateTextOnScroll() {
        const scrollY = window.scrollY;
        const windowHeight = window.innerHeight;
        const offset = windowHeight / off; 
        elements.forEach((element, i) => {
            const chars = element.querySelectorAll(".char");
            if (i < 3) elementTop = element.getBoundingClientRect().top + scrollY;
            else elementTop = element.getBoundingClientRect().top + scrollY + yoff;
            const elementHeight = element.offsetHeight;
            const length = text[i].length;

            if (element.classList.contains('animate')) {
                if (elementTop < (scrollY + windowHeight) && (elementTop + elementHeight) > scrollY) {
                    if (!element.classList.contains('fin-animate')) animateTextOverTime(element, i, div);
                }
                return;
            }

            chars.forEach((char, index) => {
                const charPosition = elementTop + (index / chars.length) * elementHeight;
                const relativePosition = scrollY + windowHeight - offset;
                
                const scrollPercentage = Math.max(0, Math.min(1, amph*(relativePosition - charPosition)/ windowHeight));
                const numCharsToShow = Math.floor(scrollPercentage * (chars.length+elen)) - elen;
                if (index < numCharsToShow) {
                    char.style.visibility = "visible"
                    char.style.color = 'var(--c4)';
                    char.textContent = text[i][index]
                }
                else if (index < numCharsToShow + elen && index < length) {
                    char.style.visibility = "visible"
                    char.style.color = 'var(--c3)';
                    char.textContent = transitionChars[Math.floor(Math.random() * transitionChars.length)];
                } 
                else char.style.visibility = "hidden"
                
            });
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
                    char.style.color = 'var(--c4)';
                    char.textContent = text[index][charIndex];
                } else if (charIndex < num + elen && charIndex < length) {
                    char.style.visibility = "visible";
                    char.style.color = 'var(--c3)';
                    char.textContent = transitionChars[Math.floor(Math.random() * transitionChars.length)];
                } else {
                    char.style.visibility = "hidden";
                }
            });

            if (num >= length) {
                clearInterval(interval);
            }
        }, 10); 
    }

    // Throttle function to limit how often updateTextOnScroll is called
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

    // Set up throttled scroll event listener
    window.addEventListener('scroll', throttle(updateTextOnScroll, 10)); 
    updateTextOnScroll(); // Initial call to set text based on initial scroll position
});
