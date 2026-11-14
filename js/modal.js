// ==========================================================================
// FULLSCREEN MODAL VIEWER WITH THUMBNAIL STRIP & CLICK-TO-PLAY VIDEO
// ==========================================================================

import { getCurrentLang, TRANSLATIONS } from "./i18n.js?v=2.0";

export function toWebThumb(url) {
  if (!url || typeof url !== "string") return url;
  const nfc = url.normalize("NFC");
  if (nfc.startsWith("media/")) {
    return nfc.replace(/^media\//, "media_web/thumb/");
  }
  return nfc;
}

export function toWebDisplay(url) {
  if (!url || typeof url !== "string") return url;
  const nfc = url.normalize("NFC");
  if (nfc.startsWith("media/")) {
    return nfc.replace(/^media\//, "media_web/display/");
  }
  return nfc;
}

class MediaModal {
  constructor() {
    if (typeof document === "undefined") return;
    this.modalEl = document.getElementById("mediaModal");
    if (!this.modalEl) return;

    this.titleEl = document.getElementById("modalTitle");
    this.metaEl = document.getElementById("modalMeta");
    this.roleEl = document.getElementById("modalRole");
    this.overviewEl = document.getElementById("modalOverview");
    this.viewportEl = document.getElementById("modalViewport");
    this.thumbStripEl = document.getElementById("modalThumbStrip");
    this.counterEl = document.getElementById("modalCounter");
    this.subBrandBarEl = document.getElementById("modalSubBrandBar");
    this.closeBtn = document.getElementById("modalCloseBtn");
    this.prevBtn = document.getElementById("modalPrevBtn");
    this.nextBtn = document.getElementById("modalNextBtn");

    this.currentMediaList = [];
    this.currentIndex = 0;
    this.currentData = null;
    this.currentBrandFilter = "all";
    this.currentTypeFilter = "all";

    this.bindEvents();
  }

  bindEvents() {
    this.closeBtn?.addEventListener("click", () => this.close());
    
    // Click outside container to close
    this.modalEl.addEventListener("click", (e) => {
      if (e.target === this.modalEl) this.close();
    });

    this.prevBtn?.addEventListener("click", () => this.prev());
    this.nextBtn?.addEventListener("click", () => this.next());

    // Keyboard support
    window.addEventListener("keydown", (e) => {
      if (!this.modalEl.classList.contains("open")) return;
      if (e.key === "Escape") this.close();
      if (e.key === "ArrowLeft") this.prev();
      if (e.key === "ArrowRight") this.next();
    });
  }

  open(data, startIndex = 0) {
    this.currentData = data;
    this.currentMediaList = data.media || [];
    this.currentIndex = Math.max(0, Math.min(startIndex, this.currentMediaList.length - 1));
    this.currentBrandFilter = "all";
    this.currentTypeFilter = "all";

    const lang = getCurrentLang();
    const t = TRANSLATIONS[lang] || TRANSLATIONS.vi;

    // Header info
    const title = typeof data.title === "object" ? data.title[lang] || data.title.vi : data.title;
    const role = typeof data.role === "object" ? data.role[lang] || data.role.vi : data.role;
    const desc = data.overview 
      ? (typeof data.overview === "object" ? data.overview[lang] || data.overview.vi : data.overview)
      : (data.desc ? (typeof data.desc === "object" ? data.desc[lang] || data.desc.vi : data.desc) : "");

    const companyOrLoc = data.company || data.location || "";
    const year = data.year || "";

    if (this.titleEl) this.titleEl.textContent = title;
    if (this.metaEl) this.metaEl.textContent = `${companyOrLoc} • ${year}`.trim();
    if (this.roleEl) this.roleEl.textContent = role ? `${t.modal_role_label} ${role}` : "";
    if (this.overviewEl) this.overviewEl.textContent = desc;

    this.renderSubBrandTabs(data);
    this.renderThumbnails();
    this.displayCurrentMedia();

    this.modalEl.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  renderSubBrandTabs(data) {
    if (!this.subBrandBarEl) return;
    
    const hasSubBrands = data.subBrands && data.subBrands.length > 1;
    const hasBothTypes = data.media && data.media.some(m => m.type === "image") && data.media.some(m => m.type === "video");

    if (!hasSubBrands && !hasBothTypes) {
      this.subBrandBarEl.style.display = "none";
      this.subBrandBarEl.innerHTML = "";
      return;
    }

    const lang = getCurrentLang();
    this.subBrandBarEl.style.display = "flex";
    this.subBrandBarEl.style.flexDirection = "column";
    this.subBrandBarEl.style.gap = "0.6rem";
    this.subBrandBarEl.innerHTML = "";

    const applyFilter = () => {
      this.currentMediaList = data.media.filter(m => {
        const matchBrand = this.currentBrandFilter === "all" || m.brand === this.currentBrandFilter;
        const matchType = this.currentTypeFilter === "all" || m.type === this.currentTypeFilter;
        return matchBrand && matchType;
      });
      this.currentIndex = 0;
      this.renderThumbnails();
      this.displayCurrentMedia();
    };

    // Sub-brand buttons group (Row 1)
    if (hasSubBrands) {
      const brandGroup = document.createElement("div");
      brandGroup.style.display = "flex";
      brandGroup.style.gap = "0.5rem";
      brandGroup.style.alignItems = "center";
      brandGroup.style.overflowX = "auto";
      brandGroup.style.scrollbarWidth = "thin";
      brandGroup.style.paddingBottom = "2px";

      data.subBrands.forEach((sb) => {
        const btn = document.createElement("button");
        btn.className = `subbrand-tab-btn ${sb.id === this.currentBrandFilter ? "active" : ""}`;
        const count = sb.id === "all" ? data.media.length : data.media.filter(m => m.brand === sb.id).length;
        const name = sb.name[lang] || sb.name.vi;
        btn.textContent = `${name} (${count})`;

        btn.addEventListener("click", () => {
          brandGroup.querySelectorAll(".subbrand-tab-btn").forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
          this.currentBrandFilter = sb.id;
          applyFilter();
        });
        brandGroup.appendChild(btn);
      });
      this.subBrandBarEl.appendChild(brandGroup);
    }

    // Media type filter group (Row 2: All / Photo / Video)
    if (hasBothTypes) {
      const typeGroup = document.createElement("div");
      typeGroup.style.display = "flex";
      typeGroup.style.gap = "0.5rem";
      typeGroup.style.alignItems = "center";
      if (hasSubBrands) {
        typeGroup.style.borderTop = "1px solid var(--border-light)";
        typeGroup.style.paddingTop = "0.5rem";
      }

      const types = [
        { id: "all", label: lang === "vi" ? "Tất cả định dạng" : "All Media" },
        { id: "image", label: lang === "vi" ? "📷 Photo" : "📷 Photo" },
        { id: "video", label: lang === "vi" ? "🎬 Video" : "🎬 Video" }
      ];

      types.forEach(t => {
        const btn = document.createElement("button");
        btn.className = `subbrand-tab-btn ${t.id === this.currentTypeFilter ? "active" : ""}`;
        btn.textContent = t.label;

        btn.addEventListener("click", () => {
          typeGroup.querySelectorAll(".subbrand-tab-btn").forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
          this.currentTypeFilter = t.id;
          applyFilter();
        });
        typeGroup.appendChild(btn);
      });
      this.subBrandBarEl.appendChild(typeGroup);
    }
  }

  close() {
    this.modalEl.classList.remove("open");
    document.body.style.overflow = "";
    
    // Pause any playing video inside viewport
    const activeVideo = this.viewportEl.querySelector("video");
    if (activeVideo) {
      activeVideo.pause();
      activeVideo.src = "";
    }
    const activeIframe = this.viewportEl.querySelector("iframe");
    if (activeIframe) {
      activeIframe.src = "";
    }
    this.viewportEl.innerHTML = "";
  }

  prev() {
    if (this.currentMediaList.length <= 1) return;
    this.currentIndex = (this.currentIndex - 1 + this.currentMediaList.length) % this.currentMediaList.length;
    this.displayCurrentMedia();
    this.updateThumbnails();
  }

  next() {
    if (this.currentMediaList.length <= 1) return;
    this.currentIndex = (this.currentIndex + 1) % this.currentMediaList.length;
    this.displayCurrentMedia();
    this.updateThumbnails();
  }

  displayCurrentMedia() {
    if (!this.currentMediaList || this.currentMediaList.length === 0) {
      this.viewportEl.innerHTML = `<div style="color:#aaa;text-align:center;">Chưa có tệp media được hiển thị</div>`;
      if (this.counterEl) this.counterEl.textContent = "0 / 0";
      return;
    }

    const item = this.currentMediaList[this.currentIndex];
    this.viewportEl.innerHTML = "";

    if (item.type === "youtube" || item.youtubeId) {
      const iframe = document.createElement("iframe");
      iframe.src = `https://www.youtube-nocookie.com/embed/${item.youtubeId}?autoplay=1&rel=0`;
      iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
      iframe.allowFullscreen = true;
      iframe.style.width = "100%";
      iframe.style.height = "100%";
      iframe.style.aspectRatio = "16/9";
      iframe.style.maxHeight = "80vh";
      iframe.style.border = "none";
      this.viewportEl.appendChild(iframe);
    } else if (item.type === "video") {
      const video = document.createElement("video");
      video.src = encodeURI(item.url);
      video.controls = true;
      video.playsInline = true;
      // Mandate: DO NOT autoplay video; only play when user clicks
      video.autoplay = false;
      video.preload = "metadata";
      video.style.maxHeight = "100%";
      video.style.maxWidth = "100%";
      this.viewportEl.appendChild(video);
    } else {
      const img = document.createElement("img");
      const webDisplayUrl = toWebDisplay(item.url);
      img.src = encodeURI(webDisplayUrl);
      img.onerror = function() {
        this.onerror = null;
        if (!item.url.startsWith("media/")) {
          this.src = encodeURI(item.url);
        }
      };
      img.alt = item.name || "Portfolio image";
      img.loading = "lazy";
      this.viewportEl.appendChild(img);
    }

    if (this.counterEl) {
      this.counterEl.textContent = `${this.currentIndex + 1} / ${this.currentMediaList.length}`;
    }

    // Scroll active thumbnail into view
    this.scrollActiveThumbIntoView();

    // Preload next and previous images for instant switching
    this.preloadAdjacentMedia();
  }

  preloadAdjacentMedia() {
    if (!this.currentMediaList || this.currentMediaList.length <= 1) return;
    const len = this.currentMediaList.length;
    const nextIdx = (this.currentIndex + 1) % len;
    const prevIdx = (this.currentIndex - 1 + len) % len;

    [nextIdx, prevIdx].forEach(idx => {
      const media = this.currentMediaList[idx];
      if (media && media.type !== "video" && media.type !== "youtube" && !media.youtubeId) {
        const preloadImg = new Image();
        preloadImg.src = encodeURI(toWebDisplay(media.url));
      }
    });
  }

  renderThumbnails() {
    if (!this.thumbStripEl) return;
    this.thumbStripEl.innerHTML = "";

    if (this.currentMediaList.length <= 1) {
      this.thumbStripEl.style.display = "none";
      return;
    }
    this.thumbStripEl.style.display = "flex";

    this.currentMediaList.forEach((media, idx) => {
      const item = document.createElement("div");
      item.className = `thumb-item ${idx === this.currentIndex ? "active" : ""}`;
      item.dataset.index = idx;

      if (media.type === "youtube" || media.youtubeId) {
        item.innerHTML = `
          <div style="width:100%;height:100%;background:#181818;display:flex;align-items:center;justify-content:center;color:#e62117;font-size:1.3rem;">
            ▶
          </div>
          <span class="thumb-video-badge" style="background:#cc0000;">YOUTUBE</span>
        `;
      } else if (media.type === "video") {
        item.innerHTML = `
          <div style="width:100%;height:100%;background:#222;display:flex;align-items:center;justify-content:center;color:#fff;">
            ▶
          </div>
          <span class="thumb-video-badge">VIDEO</span>
        `;
      } else {
        const thumbImg = document.createElement("img");
        const webThumbUrl = toWebThumb(media.url);
        thumbImg.src = encodeURI(webThumbUrl);
        thumbImg.onerror = function() {
          this.onerror = null;
          if (!media.url.startsWith("media/")) {
            this.src = encodeURI(media.url);
          }
        };
        thumbImg.alt = media.name || "";
        thumbImg.loading = "lazy";
        item.appendChild(thumbImg);
      }

      item.addEventListener("click", () => {
        this.currentIndex = idx;
        this.displayCurrentMedia();
        this.updateThumbnails();
      });

      this.thumbStripEl.appendChild(item);
    });
  }

  updateThumbnails() {
    const thumbs = this.thumbStripEl.querySelectorAll(".thumb-item");
    thumbs.forEach((th, idx) => {
      th.classList.toggle("active", idx === this.currentIndex);
    });
    this.scrollActiveThumbIntoView();
  }

  scrollActiveThumbIntoView() {
    const active = this.thumbStripEl.querySelector(".thumb-item.active");
    if (active) {
      active.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }
}

export const modalViewer = new MediaModal();
