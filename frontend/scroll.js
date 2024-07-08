const svg = document.querySelector('svg.squiggle')
const path = svg.querySelector('path')
let buffer = false;

const scroll = () => {
  const distance = window.scrollY
  const totalDistance = svg.clientHeight - window.innerHeight

  const percentage = distance / totalDistance

  const pathLength = path.getTotalLength()

  path.style.strokeDasharray = `${pathLength}`
  path.style.strokeDashoffset = `${pathLength * (1 - percentage)}`
}
const updateScroll = () => {
  if (!buffer) {
    window.requestAnimationFrame(() => {
      scroll();
      buffer = false;
    });
    buffer = true;
  }
};

updateScroll(); 
window.addEventListener('scroll', updateScroll);