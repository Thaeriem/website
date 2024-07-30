const svg = document.querySelector('svg.squiggle')
const path = svg.querySelector('path')
let buffer = false;
const documentHeight = Math.max(
  document.body.scrollHeight, 
  document.documentElement.scrollHeight
);
const offset = 2.5 * window.innerHeight;
const amph = 0.3;
const thr = 350;
const totalDistance = documentHeight - offset;
svg.style.visibility = 'visible';

const scroll = () => {
  let distance = window.scrollY
  if (distance >= thr) distance = (distance - thr)*amph + thr;

  let percentage = distance / totalDistance
  if (percentage >= 0.99) percentage = 1;

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