const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => t * (2 - t),
    direction: 'vertical',
    smooth: true,
  });

const raf = (time) => {
  lenis.raf(time);
  scroll();
  requestAnimationFrame(raf);
};

requestAnimationFrame(raf);

lenis.on('scroll', scroll);