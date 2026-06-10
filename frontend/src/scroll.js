const svg = document.querySelector('svg.squiggle')
const path = svg.querySelector('path')
const arrow = document.querySelector('.arrow');
const nodes = Array.from(document.querySelectorAll('.path-node'));
let buffer = false;

function getDocumentHeight() {
  return Math.max(
    document.body.scrollHeight,
    document.documentElement.scrollHeight
  );
}

svg.style.visibility = 'visible';

function getDocumentWidth() {
  return Math.max(
    document.body.scrollWidth,
    document.documentElement.scrollWidth,
    window.innerWidth
  );
}

function getNodePoint(node, index) {
  const rect = node.getBoundingClientRect();
  const docWidth = getDocumentWidth();
  const lineGap = Math.min(72, Math.max(34, window.innerWidth * 0.055));
  const isRightPanel = node.classList.contains('about-panel') || node.classList.contains('projects-panel');
  const rawX = isRightPanel
    ? rect.left + window.scrollX - lineGap
    : rect.right + window.scrollX + lineGap;
  const padding = Math.min(120, docWidth * 0.12);
  const x = Math.max(padding, Math.min(docWidth - padding, rawX));
  const yOffset = index === 0 ? rect.height * 0.25 : rect.height * 0.52;

  return {
    x,
    y: rect.top + window.scrollY + yOffset
  };
}

function buildResponsivePath() {
  const docWidth = getDocumentWidth();
  const docHeight = getDocumentHeight();
  svg.setAttribute('viewBox', `0 0 ${docWidth} ${docHeight}`);
  svg.style.width = `${docWidth}px`;
  svg.style.height = `${docHeight}px`;

  const points = nodes.map(getNodePoint);
  if (points.length < 2) return;

  const commands = [`M ${points[0].x} ${Math.max(0, points[0].y)}`];
  for (let i = 1; i < points.length; i++) {
    const previous = points[i - 1];
    const current = points[i];
    const midY = previous.y + (current.y - previous.y) * 0.54;
    const corner = Math.min(64, Math.abs(current.x - previous.x) * 0.18, Math.abs(current.y - previous.y) * 0.18);
    commands.push(`V ${midY - corner}`);
    commands.push(`Q ${previous.x} ${midY} ${previous.x + Math.sign(current.x - previous.x) * corner} ${midY}`);
    commands.push(`H ${current.x - Math.sign(current.x - previous.x) * corner}`);
    commands.push(`Q ${current.x} ${midY} ${current.x} ${midY + corner}`);
    commands.push(`V ${current.y}`);
  }

  const last = points[points.length - 1];
  commands.push(`V ${Math.min(docHeight - window.innerHeight * 0.08, last.y + window.innerHeight * 0.34)}`);
  commands.push(`H ${docWidth * 0.55}`);
  path.setAttribute('d', commands.join(' '));
}

const scroll = () => {
  const totalDistance = Math.max(1, getDocumentHeight() - window.innerHeight);
  let percentage = window.scrollY / totalDistance
  if (percentage >= 0.99) percentage = 1;
  if (percentage < 0) percentage = 0;

  const pathLength = path.getTotalLength()

  path.style.strokeDasharray = `${pathLength}`
  path.style.strokeDashoffset = `${pathLength * (1 - percentage)}`

  const maxScroll =  window.innerHeight / 10;
  const opacity = 1 - (window.scrollY / maxScroll);
  arrow.style.opacity = Math.max(opacity, 0);
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

buildResponsivePath();
updateScroll(); 
window.addEventListener('scroll', updateScroll);
window.addEventListener('resize', () => {
  buildResponsivePath();
  updateScroll();
});
window.addEventListener('load', () => {
  buildResponsivePath();
  updateScroll();
});
