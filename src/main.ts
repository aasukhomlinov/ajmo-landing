import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- waitlist form (backend TODO: Supabase table + edge function) ---------- */
const form = document.querySelector<HTMLFormElement>('#waitlist');
form?.addEventListener('submit', (e) => {
  e.preventDefault();
  const email = form.querySelector<HTMLInputElement>('#email');
  if (!email?.value || !email.checkValidity()) {
    email?.focus();
    return;
  }
  form.classList.add('is-done');
  const button = form.querySelector<HTMLButtonElement>('button');
  if (button) button.textContent = 'You’re on the list ✦';
  email.value = '';
});

/* ---------- scroll choreography (spec: Figma “D2 · Scroll Storyboard”) ---------- */
/* `?static` disables smooth scroll (screenshot tooling / debugging);
   ScrollTrigger works fine on native scroll. */
const staticScroll = new URLSearchParams(location.search).has('static');

if (!prefersReducedMotion) {
  gsap.registerPlugin(ScrollTrigger);

  if (!staticScroll) {
    const lenis = new Lenis({ lerp: 0.12 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
    // Lenis re-asserts its own scroll target every frame, which kills native
    // keyboard scrolling — route the keys through lenis.scrollTo instead.
    window.addEventListener('keydown', (e) => {
      if (e.defaultPrevented || (e.target as HTMLElement).matches('input, textarea, select')) return;
      const page = window.innerHeight * 0.9;
      const jump: Record<string, number> = {
        PageDown: page, PageUp: -page, ArrowDown: 120, ArrowUp: -120,
        ' ': e.shiftKey ? -page : page,
      };
      if (e.key === 'Home') lenis.scrollTo(0);
      else if (e.key === 'End') lenis.scrollTo(document.body.scrollHeight);
      else if (e.key in jump) lenis.scrollTo(lenis.targetScroll + jump[e.key]);
      else return;
      e.preventDefault();
    });
    // debug/test hook
    (window as unknown as { __lenis: Lenis }).__lenis = lenis;
  }

  /* Scene 1 → 2 — hero sits sticky under the lime wipe; its content dives as
     the wipe approaches (storyboard row A + D). */
  gsap
    .timeline({
      scrollTrigger: { trigger: '#lime', start: 'top bottom', end: 'top top', scrub: true },
    })
    .to('.hero-title', { y: -70, opacity: 0.3, ease: 'none' }, 0)
    .to('.hero .badge', { opacity: 0, ease: 'none' }, 0)
    .to('.hero-phone', { y: 140, scale: 0.88, ease: 'none' }, 0)
    .to('.scroll-pill', { opacity: 0, ease: 'none' }, 0);

  /* the wipe edge itself flattens as the lime section lands */
  gsap.to('#lime', {
    clipPath: 'polygon(0 0vw, 100% 0, 100% 100%, 0 100%)',
    ease: 'none',
    scrollTrigger: { trigger: '#lime', start: 'top 60%', end: 'top top', scrub: true },
  });

  /* Scene 2 — headline shrinks, posters fly from the edges into a deck
     behind the text (storyboard row B). */
  const limeScrub = { trigger: '#lime', start: 'top top', end: 'bottom bottom', scrub: true };

  gsap.fromTo(
    '.lime-title',
    { scale: 1.12 },
    { scale: 0.62, ease: 'none', scrollTrigger: limeScrub },
  );

  const pin = document.querySelector<HTMLElement>('.lime-pin');
  document.querySelectorAll<HTMLElement>('.poster').forEach((poster, i) => {
    if (!pin) return;
    const deckRotations = [-6, 5, -3, 4, -2, 2];
    gsap.to(poster, {
      x: () => {
        const p = poster.getBoundingClientRect();
        const c = pin.getBoundingClientRect();
        return c.left + c.width / 2 - (p.left + p.width / 2) + gsap.utils.wrap([-14, 10, -6, 12, 0, 6], i);
      },
      y: () => {
        const p = poster.getBoundingClientRect();
        const c = pin.getBoundingClientRect();
        return c.top + c.height * 0.56 - (p.top + p.height / 2) + gsap.utils.wrap([-10, 8, -4, 10, 2, 0], i);
      },
      rotation: deckRotations[i % deckRotations.length],
      scale: 0.82,
      ease: 'none',
      scrollTrigger: { ...limeScrub, invalidateOnRefresh: true },
    });
  });

  /* Scene 3 — word cycle: each word takes the lime highlight in turn. */
  const words = gsap.utils.toArray<HTMLElement>('.word');
  words.forEach((word, i) => {
    ScrollTrigger.create({
      trigger: '#words',
      start: () => `top+=${(i / words.length) * 100}% top`,
      end: () => `top+=${((i + 1) / words.length) * 100}% top`,
      onToggle: (self) => word.classList.toggle('is-active', self.isActive),
    });
    gsap.from(word, {
      yPercent: 40,
      opacity: 0,
      scrollTrigger: { trigger: '#words', start: 'top 70%', end: 'top 20%', scrub: true },
      delay: i * 0.05,
    });
  });

  /* Scene 4 — chevron parallax + cities reveal (storyboard row C). */
  gsap.from('.chevron', {
    scaleY: 0.4,
    transformOrigin: 'top',
    ease: 'none',
    scrollTrigger: { trigger: '.cities', start: 'top bottom', end: 'top 40%', scrub: true },
  });
  gsap.from('.cities-inner > *', {
    y: 60,
    opacity: 0,
    stagger: 0.12,
    duration: 0.8,
    ease: 'power3.out',
    scrollTrigger: { trigger: '.cities-inner', start: 'top 75%' },
  });

  /* Scene 5 — CTA reveal; phone drifts in from the right. */
  gsap.from('.cta-copy > *', {
    y: 50,
    opacity: 0,
    stagger: 0.1,
    duration: 0.7,
    ease: 'power3.out',
    scrollTrigger: { trigger: '.cta', start: 'top 70%' },
  });
  gsap.from('.cta-phone', {
    x: 120,
    rotation: 4,
    opacity: 0,
    duration: 1,
    ease: 'power3.out',
    scrollTrigger: { trigger: '.cta', start: 'top 65%' },
  });

  /* Footer — the giant wordmark rises into view (Jeton-style closer). */
  gsap.from('.wordmark-giant', {
    yPercent: 45,
    ease: 'none',
    scrollTrigger: { trigger: '.footer', start: 'top bottom', end: 'bottom bottom', scrub: true },
  });
} else {
  /* Reduced motion: word cycle still needs a readable resting state. */
  document.querySelector('.word[data-step="1"]')?.classList.add('is-active');
}
