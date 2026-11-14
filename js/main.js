// ==========================================================================
// MAIN CONTROLLER: PAGE LOGIC, ROUTING & RENDERING
// ==========================================================================

import { PROJECTS, ALBUMS } from "./data.js?v=2.3";
import { getCurrentLang, setLanguage, applyTranslations } from "./i18n.js?v=2.3";
import { modalViewer, toWebThumb, toWebDisplay } from "./modal.js?v=2.3";

document.addEventListener("DOMContentLoaded", () => {
  initLanguage();
  initMobileMenu();

  const page = document.body.dataset.page;
  if (page === "home") {
    renderHome();
  } else if (page === "portfolio") {
    renderPortfolio();
  } else if (page === "photography") {
    renderPhotography();
    initBookingForm();
  } else if (page === "contact") {
    // Contact page is static, just applies translations
  }
});

// --------------------------------------------------------------------------
// 1. Language & Mobile Menu
// --------------------------------------------------------------------------

function initLanguage() {
  const current = getCurrentLang();
  applyTranslations(current);

  const toggleBtn = document.getElementById("langToggleBtn");
  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      const nextLang = getCurrentLang() === "vi" ? "en" : "vi";
      setLanguage(nextLang);
      
      // Re-render current page elements to refresh dynamic project titles
      const page = document.body.dataset.page;
      if (page === "home") renderHome();
      else if (page === "portfolio") renderPortfolio();
      else if (page === "photography") renderPhotography();
    });
  }
}

function initMobileMenu() {
  const toggle = document.getElementById("mobileToggleBtn");
  const overlay = document.getElementById("mobileOverlay");
  if (!toggle || !overlay) return;

  toggle.addEventListener("click", () => {
    const isOpen = overlay.classList.toggle("open");
    toggle.textContent = isOpen ? "✕" : "☰";
  });
}

function renderCoverHtml(proj, title) {
  if (proj.coverType === "video") {
    return `
      <video src="${encodeURI(proj.cover)}#t=1" preload="metadata" muted playsinline style="width:100%;height:100%;object-fit:cover;"></video>
      <div class="card-play-icon">▶</div>
    `;
  }
  const displayUrl = toWebDisplay(proj.cover);
  return `
    <img src="${encodeURI(displayUrl)}" alt="${title}" loading="lazy" onerror="this.onerror=null;" />
    ${proj.media.some(m => m.type === "video") ? '<div class="card-play-icon">▶</div>' : ''}
  `;
}

// --------------------------------------------------------------------------
// 2. Home Page Rendering
// --------------------------------------------------------------------------

function renderHome() {
  const lang = getCurrentLang();
  const featuredContainer = document.getElementById("homeFeaturedGrid");
  if (!featuredContainer) return;

  featuredContainer.innerHTML = "";
  // Display first 4 featured projects
  const featured = PROJECTS.slice(0, 4);

  featured.forEach(proj => {
    const title = proj.title[lang] || proj.title.vi;
    const role = proj.role[lang] || proj.role.vi;
    const categoryLabel = proj.category === "commercial" ? "Commercial" : "Personal";

    const card = document.createElement("article");
    card.className = "project-card";
    card.innerHTML = `
      <div class="card-thumb-wrapper">
        ${renderCoverHtml(proj, title)}
      </div>
      <div class="card-body">
        <div class="card-meta">
          <span>${proj.company}</span>
          <span class="tag-badge">${categoryLabel}</span>
        </div>
        <h3 class="card-title">${title}</h3>
        <p class="card-role">${role}</p>
        <p class="card-desc">${proj.overview[lang] || proj.overview.vi}</p>
      </div>
    `;

    card.addEventListener("click", () => {
      // Direct navigation to portfolio page with modal open
      window.location.href = `portfolio.html?project=${proj.id}`;
    });

    featuredContainer.appendChild(card);
  });

  // Sync Photography Preview covers dynamically from ALBUMS data
  const indAlb = ALBUMS.find(a => a.category === "individual");
  const cplAlb = ALBUMS.find(a => a.category === "couple");
  const frdAlb = ALBUMS.find(a => a.category === "friends");
  const sptAlb = ALBUMS.find(a => a.category === "sports");

  if (indAlb && document.getElementById("previewImgInd")) document.getElementById("previewImgInd").src = encodeURI(toWebDisplay(indAlb.cover));
  if (cplAlb && document.getElementById("previewImgCpl")) document.getElementById("previewImgCpl").src = encodeURI(toWebDisplay(cplAlb.cover));
  if (frdAlb && document.getElementById("previewImgFrd")) document.getElementById("previewImgFrd").src = encodeURI(toWebDisplay(frdAlb.cover));
  if (sptAlb && document.getElementById("previewImgSpt")) document.getElementById("previewImgSpt").src = encodeURI(toWebDisplay(sptAlb.cover));
}

// --------------------------------------------------------------------------
// 3. Portfolio Page Rendering
// --------------------------------------------------------------------------

let currentPortfolioFilter = "all";

function renderPortfolio() {
  const lang = getCurrentLang();
  const grid = document.getElementById("portfolioGrid");
  const filterButtons = document.querySelectorAll(".filter-btn[data-filter]");
  if (!grid) return;

  // Filter click handlers
  filterButtons.forEach(btn => {
    btn.onclick = () => {
      filterButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentPortfolioFilter = btn.dataset.filter;
      renderPortfolioItems();
    };
  });

  function renderPortfolioItems() {
    grid.innerHTML = "";
    const filtered = PROJECTS.filter(p => {
      if (currentPortfolioFilter === "all") return true;
      return p.category === currentPortfolioFilter;
    });

    filtered.forEach(proj => {
      const title = proj.title[lang] || proj.title.vi;
      const role = proj.role[lang] || proj.role.vi;
      const categoryLabel = proj.category === "commercial" ? "Commercial" : "Personal";

      const card = document.createElement("article");
      card.className = "project-card";
      card.id = `project-${proj.id}`;
      card.innerHTML = `
        <div class="card-thumb-wrapper">
          ${renderCoverHtml(proj, title)}
        </div>
        <div class="card-body">
          <div class="card-meta">
            <span>${proj.company} • ${proj.year}</span>
            <span class="tag-badge">${categoryLabel}</span>
          </div>
          <h3 class="card-title">${title}</h3>
          <p class="card-role">${role}</p>
          <p class="card-desc">${proj.overview[lang] || proj.overview.vi}</p>
        </div>
      `;

      card.addEventListener("click", () => {
        modalViewer.open(proj);
      });

      grid.appendChild(card);
    });
  }

  renderPortfolioItems();

  // Check query param or hash to open modal immediately if navigated from Home
  const urlParams = new URLSearchParams(window.location.search);
  const targetId = urlParams.get("project") || window.location.hash.replace("#", "");
  if (targetId) {
    const found = PROJECTS.find(p => p.id === targetId);
    if (found) {
      setTimeout(() => modalViewer.open(found), 250);
    }
  }
}

// --------------------------------------------------------------------------
// 4. Photography Page Rendering
// --------------------------------------------------------------------------

let currentPhotoFilter = "all";

function renderPhotography() {
  const lang = getCurrentLang();
  const grid = document.getElementById("photoGrid");
  const filterButtons = document.querySelectorAll(".filter-btn[data-photo-filter]");
  if (!grid) return;

  filterButtons.forEach(btn => {
    btn.onclick = () => {
      filterButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentPhotoFilter = btn.dataset.photoFilter;
      renderPhotoItems();
    };
  });

  function renderPhotoItems() {
    grid.innerHTML = "";
    const filtered = ALBUMS.filter(alb => {
      if (currentPhotoFilter === "all") return true;
      return alb.category === currentPhotoFilter;
    });

    const countUnit = lang === "vi" ? "ảnh" : "photos";

    filtered.forEach(alb => {
      const desc = alb.desc[lang] || alb.desc.vi;
      const card = document.createElement("article");
      card.className = "album-card";
      card.innerHTML = `
        <div class="album-thumb-wrapper">
          <img src="${encodeURI(toWebDisplay(alb.cover))}" alt="${alb.title}" loading="lazy" onerror="this.onerror=null;" />
          <span class="album-count-badge">${alb.media.length} ${countUnit}</span>
        </div>
        <div class="album-body">
          <h3 class="album-title">${alb.title}</h3>
          <div class="album-meta">
            <span>${alb.location}</span>
            <span>${alb.year}</span>
          </div>
        </div>
      `;

      card.addEventListener("click", () => {
        modalViewer.open(alb);
      });

      grid.appendChild(card);
    });
  }

  renderPhotoItems();

  // Check URL query param for category filter
  const urlParams = new URLSearchParams(window.location.search);
  const catParam = urlParams.get("category");
  if (catParam) {
    const targetBtn = document.querySelector(`.filter-btn[data-photo-filter="${catParam}"]`);
    if (targetBtn) targetBtn.click();
  }
}

// --------------------------------------------------------------------------
// 5. Booking Form & Package Selection Handler
// --------------------------------------------------------------------------

function initBookingForm() {
  const form = document.getElementById("photoBookingForm");
  const packageSelect = document.getElementById("packageSelect");
  const selectPkgButtons = document.querySelectorAll(".select-pkg-btn");
  const bookingAlert = document.getElementById("bookingAlert");
  const bookingSection = document.getElementById("booking");

  // "Chọn Gói Này" button click -> select package in dropdown and scroll smoothly to form
  selectPkgButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const pkgVal = btn.dataset.pkgVal;
      if (packageSelect && pkgVal) {
        packageSelect.value = pkgVal;
      }
      if (bookingSection) {
        bookingSection.scrollIntoView({ behavior: "smooth" });
        const nameInput = document.getElementById("bookingName");
        if (nameInput) setTimeout(() => nameInput.focus(), 600);
      }
    });
  });

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const fullName = form.fullName ? form.fullName.value.trim() : "";
    const phoneZalo = form.phoneZalo ? form.phoneZalo.value.trim() : "";
    const selectedPkgText = packageSelect ? packageSelect.options[packageSelect.selectedIndex].text : "";
    const shootDate = form.shootDate && form.shootDate.value ? form.shootDate.value : "Chưa xác định";
    const locationConcept = form.locationConcept && form.locationConcept.value.trim() ? form.locationConcept.value.trim() : "Tư vấn thêm cùng Duy";
    const notes = form.notes && form.notes.value.trim() ? form.notes.value.trim() : "";

    const message = [
      `[ĐẶT LỊCH CHỤP ẢNH - DUCDII PORTFOLIO]`,
      `• Họ và tên: ${fullName}`,
      `• SĐT / Zalo: ${phoneZalo}`,
      `• Gói quan tâm: ${selectedPkgText}`,
      `• Ngày dự kiến: ${shootDate}`,
      `• Địa điểm / Concept: ${locationConcept}`,
      notes ? `• Ghi chú thêm: ${notes}` : ""
    ].filter(Boolean).join("\n");

    // Copy to clipboard for easy pasting into Zalo
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(message);
      }
    } catch (err) {
      console.warn("Clipboard write failed:", err);
    }

    // Display confirmation alert
    if (bookingAlert) {
      bookingAlert.style.display = "block";
    }

    // Direct deep link to Duy's Zalo
    const zaloUrl = "https://zalo.me/0774420603";
    setTimeout(() => {
      window.open(zaloUrl, "_blank");
    }, 700);
  });
}
