import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

import { joinWaitlist } from './waitlist';

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- waitlist form → Supabase (see src/waitlist.ts) ---------- */
const form = document.querySelector<HTMLFormElement>('#waitlist');
const microcopy = document.querySelector<HTMLParagraphElement>('.microcopy');
const microDefault = microcopy?.textContent ?? '';

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (form.classList.contains('is-done')) return;

  const email = form.querySelector<HTMLInputElement>('#email');
  const button = form.querySelector<HTMLButtonElement>('button');
  const honeypot = form.querySelector<HTMLInputElement>('input[name="company"]');
  if (!email || !button) return;

  const settle = (done: boolean, label: string, micro?: string) => {
    button.textContent = label;
    form.classList.toggle('is-done', done);
    if (microcopy) microcopy.textContent = micro ?? microDefault;
  };

  // hidden honeypot filled → almost certainly a bot; fake success, drop it
  if (honeypot?.value) {
    settle(true, 'You’re on the list ✦', 'We’ll email you the moment ajmo goes live.');
    email.value = '';
    return;
  }

  if (!email.value || !email.checkValidity()) {
    email.focus();
    return;
  }

  const original = button.textContent ?? 'Notify me at launch';
  button.disabled = true;
  form.classList.remove('is-error');
  button.textContent = 'Adding…';

  const result = await joinWaitlist(email.value);

  if (result === 'ok' || result === 'duplicate') {
    settle(true, 'You’re on the list ✦', 'We’ll email you the moment ajmo goes live.');
    email.value = '';
  } else if (result === 'invalid') {
    button.disabled = false;
    button.textContent = original;
    email.focus();
  } else {
    button.disabled = false;
    form.classList.add('is-error');
    button.textContent = 'Try again';
    if (microcopy) microcopy.textContent = 'Something went wrong — please try again.';
  }
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
    // header CTA: smooth-scroll to the waitlist instead of a native jump
    // (Lenis would fight the browser's instant anchor scroll)
    document.querySelector('.nav-cta')?.addEventListener('click', (e) => {
      e.preventDefault();
      lenis.scrollTo('#cta');
    });
    // debug/test hook
    (window as unknown as { __lenis: Lenis }).__lenis = lenis;
  }

  /* Scene 1 — pinned hero:
     beat 1 — the headline fades out while the phone surfaces to a floating
     mockup that fully fits the viewport (margins on every side, never
     cropped); beat 2 — a short hold; beat 3 — the phone slides straight down
     and tucks under the rising lime panel (which has a plain straight edge). */
  const phone = document.querySelector<HTMLElement>('.hero-phone')!;
  /* offsetTop/offsetHeight ignore transforms — stable across refreshes */
  const centerY = () => window.innerHeight / 2 - (phone.offsetTop + phone.offsetHeight / 2);
  /* fit the whole device inside the viewport height (leaves side + top/bottom
     margins) so it reads as a floating mockup, not an edge-to-edge screen. */
  const fitScale = () => (window.innerHeight * 0.86) / phone.offsetHeight;
  gsap
    .timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: '#hero',
        start: 'top top',
        end: 'bottom bottom',
        scrub: true,
        invalidateOnRefresh: true,
      },
    })
    /* fast fade: the phone PNG carries an opaque dark box, so the headline
       must be gone before the rising phone overlaps it */
    .to('.hero .ghost-pill, .scroll-pill', { opacity: 0, duration: 0.06 }, 0)
    .to('.hero-title', { opacity: 0, y: -60, duration: 0.08 }, 0)
    .to(
      phone,
      {
        y: centerY,
        scale: fitScale,
        transformOrigin: '50% 50%',
        duration: 0.32,
      },
      0.03,
    )
    /* dead time: hold the surfaced phone before the lime arrives */
    .to({}, { duration: 0.2 }, 0.35)
    /* the phone drifts gently down while the rising lime panel covers it from
       below (lime sits above the hero in z). Keeping the drift small means the
       phone stays high and is eaten by the lime, instead of racing down and
       exposing a big dark band above it — no diagonal, no fade. */
    .to(
      phone,
      {
        y: () => centerY() + window.innerHeight * 0.16,
        ease: 'power1.in',
        duration: 0.45,
      },
      0.55,
    );

  /* Scene 2 — headline shrinks, posters fly from the edges into a deck
     behind the text (storyboard row B). */
  const limeScrub = { trigger: '#lime', start: 'top top', end: 'bottom bottom', scrub: true };

  gsap
    .timeline({ defaults: { ease: 'none' }, scrollTrigger: limeScrub })
    .fromTo('.lime-title', { scale: 1.12 }, { scale: 0.62, duration: 1 }, 0)
    /* the headline dissolves as the posters pile on top of it */
    .to('.lime-title', { opacity: 0, duration: 0.4 }, 0.45);

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

  /* Scene 3 — word cycle: the lime highlight steps through the words with
     scroll progress (accent color per the DS token). */
  const words = gsap.utils.toArray<HTMLElement>('.word');
  ScrollTrigger.create({
    trigger: '#words',
    start: 'top top',
    end: 'bottom bottom',
    onUpdate(self) {
      const idx = Math.min(words.length - 1, Math.floor(self.progress * words.length));
      words.forEach((w, i) => w.classList.toggle('is-active', i === idx));
    },
  });

  /* Scene 4 — Jeton-style triangle wipe: a tiny lime triangle at the bottom
     center grows in every direction — apex climbs past the top while the
     base corners spread beyond the sides — inverting background and type
     via the clipped duplicate layer. */
  const overlay = document.querySelector<HTMLElement>('.cities-overlay');
  if (overlay) {
    gsap.fromTo(
      overlay,
      {
        clipPath: () => {
          const w = overlay.offsetWidth;
          const s = overlay.offsetHeight;
          return `polygon(${w / 2 - 14}px ${s}px, ${w / 2}px ${s - 16}px, ${w / 2 + 14}px ${s}px)`;
        },
      },
      {
        /* apex at -0.5s and base at ±1.6w keep the sloped sides outside the
           section's top corners → full coverage at progress 1 */
        clipPath: () => {
          const w = overlay.offsetWidth;
          const s = overlay.offsetHeight;
          return `polygon(${w / 2 - 1.6 * w}px ${s}px, ${w / 2}px ${-0.5 * s}px, ${w / 2 + 1.6 * w}px ${s}px)`;
        },
        ease: 'none',
        scrollTrigger: {
          trigger: '.cities',
          start: 'top 70%',
          end: 'top 5%',
          scrub: true,
          invalidateOnRefresh: true,
        },
      },
    );
  }
  gsap.from('.cities > .cities-inner > *', {
    y: 60,
    opacity: 0,
    stagger: 0.12,
    duration: 0.8,
    ease: 'power3.out',
    scrollTrigger: { trigger: '.cities', start: 'top 75%' },
  });

  /* Scene 5 — CTA reveal; phone drifts in from the right. */
  gsap.from('.cta-title, .cta-form > *', {
    y: 50,
    opacity: 0,
    stagger: 0.1,
    duration: 0.7,
    ease: 'power3.out',
    scrollTrigger: { trigger: '.cta', start: 'top 70%' },
  });
  /* (CTA phone has no scroll animation — it just sits in the layout.) */

  /* Footer — the giant wordmark rises up from below and fades in on enter.
     IntersectionObserver + CSS transition (not ScrollTrigger) so it can
     never get stuck invisible near the very bottom of the page. */
  const giant = document.querySelector<HTMLElement>('.wordmark-giant');
  if (giant) {
    giant.style.opacity = '0';
    giant.style.transform = 'translateY(45%)';
    giant.style.transition = 'opacity 0.9s ease, transform 1s cubic-bezier(0.2, 0.7, 0.2, 1)';
    new IntersectionObserver(
      (entries, obs) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            giant.style.opacity = '1';
            giant.style.transform = 'none';
            obs.disconnect();
          }
        }
      },
      { threshold: 0.25 },
    ).observe(giant);
  }

  /* Layout can settle after module init (late fonts, viewport chrome) —
     re-measure every trigger once the dust settles. */
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
  window.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });

  // debug/test hook
  (window as unknown as { __st: (r?: boolean) => unknown }).__st = (r) => {
    if (r) ScrollTrigger.refresh();
    return ScrollTrigger.getAll().map((t) => ({
      trg: (t.trigger as HTMLElement)?.className || (t.trigger as HTMLElement)?.id,
      start: Math.round(t.start),
      end: Math.round(t.end),
      p: Number(t.progress.toFixed(2)),
    }));
  };
} else {
  /* Reduced motion: word cycle still needs a readable resting state. */
  document.querySelector('.word[data-step="1"]')?.classList.add('is-active');
}
