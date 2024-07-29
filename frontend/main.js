let elements;
let text = [];


document.addEventListener("DOMContentLoaded", function () {
    // Apply Splitting to the text elements
    Splitting();

    // Select the elements you want to animate
    elements = document.querySelectorAll("[data-splitting]");
    elements.forEach((element) => text.push(element.textContent))
    
    // Define transition characters
    const transitionChars = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', ' '];

    function updateTextOnScroll() {
        const scrollY = window.scrollY;
        const windowHeight = window.innerHeight;
        const offset = windowHeight / 3; 

        elements.forEach((element) => {
            const chars = element.querySelectorAll(".char");
            const elementTop = element.getBoundingClientRect().top + scrollY;
            const elementHeight = element.offsetHeight;

            chars.forEach((char, index) => {
                const charPosition = elementTop + (index / chars.length) * elementHeight;
                const relativePosition = scrollY + windowHeight - offset;
                
                const scrollPercentage = Math.max(0, Math.min(1, (relativePosition - charPosition) / windowHeight));
                const totalChars = transitionChars.length;

                // Calculate number of characters to show based on scroll percentage
                const numCharsToShow = Math.floor(scrollPercentage * (chars.length + totalChars));
                
                let newText = '';
                for (let i = 0; i < numCharsToShow; i++) {
                    newText += transitionChars[i % transitionChars.length];
                }

                // Add remaining characters from the original text if not enough characters in transitionChars
                if (numCharsToShow > transitionChars.length) {
                    newText = newText.substring(0, chars.length) + element.textContent.substring(newText.length);
                }

                // Set the character text and style
                char.textContent = newText[index] || '';
                // char.style.opacity = scrollPercentage;
            });
        });
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
    window.addEventListener('scroll', throttle(updateTextOnScroll, 100)); // Adjust the 100ms as needed
    updateTextOnScroll(); // Initial call to set text based on initial scroll position
});
