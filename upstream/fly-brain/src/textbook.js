// The manuscript is pre-rendered by scripts/build_textbook.mjs.
const $ = id => document.getElementById(id);
const tocEl = $('toc'), landingTocEl = $('landing-toc');
const landingEl = $('landing'), readerEl = $('reader');
const contentEl = $('content'), progressEl = $('progress');
const card = $('toc-card'), menuButton = $('menu-btn');
const root = document.documentElement;
let savedScroll = 0, navigating = false;

// Native dialog supplies focus containment, Escape, and an inert background.
// Fix the body while open so touch scrolling cannot move the reading position.
function openContents() {
  if (card.open) return;
  savedScroll = window.scrollY;
  root.style.setProperty('--locked-scroll', `${-savedScroll}px`);
  root.classList.add('toc-open');
  card.showModal();
  menuButton.setAttribute('aria-expanded', 'true');
  const active = tocEl.querySelector('[aria-current="page"]');
  if (active) active.scrollIntoView({ block: 'center' });
  else card.querySelector('.toc-body').scrollTop = 0;
}
menuButton.onclick = openContents;
$('toc-close').onclick = () => card.close();
card.addEventListener('click', e => {
  if (e.target !== card) return;
  const r = card.getBoundingClientRect();
  if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) card.close();
});
card.addEventListener('close', () => {
  root.classList.remove('toc-open');
  root.style.removeProperty('--locked-scroll');
  menuButton.setAttribute('aria-expanded', 'false');
  window.scrollTo(0, navigating ? 0 : savedScroll);
  if (navigating) $('chap-title').focus({ preventScroll: true });
  else menuButton.focus({ preventScroll: true });
  navigating = false;
});
// A link to the current chapter produces no hashchange, but should still dismiss.
tocEl.addEventListener('click', e => {
  const link = e.target.closest('a');
  if (link?.hash === location.hash) card.close();
});

// Resolve assets against Vite's base, including deployment below /fly-brain/.
const B = import.meta.env.BASE_URL;
document.querySelectorAll('[data-base]').forEach(el => {
  const value = B + el.dataset.base;
  if (el.tagName === 'IMG') el.src = value; else el.href = value;
});
const cover = document.querySelector('[data-cover-sizes]');
cover.srcset = `${B}textbook-cover-small.webp 400w, ${B}textbook-cover.webp 1060w`;
cover.sizes = '(max-width: 600px) 160px, (max-width: 900px) 220px, 300px';

async function init() {
  const res = await fetch(B + 'data/textbook.json');
  if (!res.ok) throw new Error(`Textbook request failed: ${res.status}`);
  const { parts, chapters } = await res.json();
  const chapterBySlug = new Map(chapters.map(ch => [ch.slug, ch]));

  tocEl.innerHTML = parts.map((p, i) => `
    <div class="toc-part">${i + 1}. ${p.name}</div>
    ${p.chapters.map(s => {
      const ch = chapterBySlug.get(s);
      return `<a class="toc-row" href="#${s}" data-slug="${s}">${ch.title}</a>`;
    }).join('')}`).join('');

  landingTocEl.innerHTML = parts.map((p, i) => `
    <h3 class="part-head">${i + 1}. ${p.name} <a class="part-arrow" href="#${p.chapters[0]}" aria-label="Read ${p.name}">&#8599;</a></h3>
    <div class="chap-card">
      ${p.chapters.map(s => {
        const ch = chapterBySlug.get(s);
        return `<a class="chap-row" href="#${s}"><span class="row-arrow" aria-hidden="true">&#8599;</span><span>${ch.title}</span></a>`;
      }).join('')}
    </div>`).join('');
  menuButton.disabled = false;

  function route() {
    const slug = location.hash.slice(1);
    const ch = chapterBySlug.get(slug);
    if (card.open) {
      navigating = true;
      card.close();
    }
    if (!ch) {
      landingEl.hidden = false; readerEl.hidden = true;
      $('crumb-part').textContent = ''; $('crumb-chap').textContent = '';
      progressEl.innerHTML = '';
      document.title = 'Compiling the Fly Brain';
      if (slug === 'book-contents') {
        $('book-contents').scrollIntoView();
        $('book-contents').focus({ preventScroll: true });
      }
      return;
    }
    landingEl.hidden = true; readerEl.hidden = false;
    const idx = chapters.indexOf(ch);
    $('crumb-part').textContent = ch.part;
    $('crumb-chap').textContent = ch.title;
    $('mobile-part').textContent = ch.part;

    const part = parts[ch.partIndex];
    progressEl.innerHTML = part.chapters.map(s =>
      `<a class="seg${s === ch.slug ? ' cur' : ''}" href="#${s}" aria-label="${chapterBySlug.get(s).title}"${s === ch.slug ? ' aria-current="page"' : ''}></a>`).join('');

    const app = ch.slug.match(/^([A-Z])-/);
    $('chap-label').textContent = app ? `Appendix ${app[1]}` : `Chapter ${idx + 1}`;
    $('chap-title').textContent = ch.title;
    contentEl.innerHTML = ch.html.replace(/^\s*<h1[^>]*>[\s\S]*?<\/h1>/, '');
    tocEl.querySelectorAll('.toc-row').forEach(a => {
      const active = a.dataset.slug === ch.slug;
      a.classList.toggle('active', active);
      if (active) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });

    const prev = chapters[idx - 1], next = chapters[idx + 1];
    $('prevnext').hidden = !next;
    $('next-label').innerHTML = next ? `<b>Next chapter</b><br/>${next.title}` : '';
    if (next) $('next-btn').href = `#${next.slug}`;
    $('prevrow').hidden = !prev;
    $('prev').textContent = prev ? `← ${prev.title}` : '';
    if (prev) $('prev').href = `#${prev.slug}`;

    document.title = `${ch.title} — Compiling the Fly Brain`;
    window.scrollTo(0, 0);
  }
  addEventListener('hashchange', route);
  route();
}

init().catch(error => {
  console.error(error);
  landingTocEl.innerHTML = '<div class="book-status" role="alert"><p>The chapters could not be loaded. Check your connection and try again.</p><button class="act" id="retry-book">Try again</button></div>';
  $('retry-book').onclick = () => location.reload();
});
