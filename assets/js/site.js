/*
 * Inclusion Axis Foundation — progressive enhancement.
 *
 * Three independent modules, each written so the page stays fully usable if
 * JavaScript is unavailable, blocked or fails:
 *
 *   1. Header navigation   — collapses to a menu button on small screens.
 *   2. Accessibility panel — visitor-controlled text size, spacing, link
 *                            underlines, high contrast and motion.
 *   3. Decorative effects  — sticky-header shadow and scroll reveal.
 *
 * The markup ships in its "everything visible" state; this script only takes
 * things away once it is confirmed to be running.
 */
(function () {
  "use strict";

  /* Cross-browser MediaQueryList listener. */
  function listen(mql, handler) {
    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", handler);
    } else if (typeof mql.addListener === "function") {
      mql.addListener(handler);
    }
  }

  /* ------------------------------------------------------------------ *
   * 1. Header navigation
   * ------------------------------------------------------------------ */
  (function initNav() {
    var DESKTOP = window.matchMedia("(min-width: 68.0625em)");
    var toggle = document.querySelector(".nav-toggle");
    var nav = document.getElementById("primary-navigation");

    if (!toggle || !nav) return;

    toggle.hidden = false;

    function setExpanded(isOpen) {
      toggle.setAttribute("aria-expanded", String(isOpen));
      nav.hidden = !isOpen;
    }

    function syncToViewport() {
      if (DESKTOP.matches) {
        nav.hidden = false;
        toggle.setAttribute("aria-expanded", "false");
      } else if (toggle.getAttribute("aria-expanded") !== "true") {
        nav.hidden = true;
      }
    }

    toggle.addEventListener("click", function () {
      setExpanded(toggle.getAttribute("aria-expanded") !== "true");
    });

    document.addEventListener("keydown", function (event) {
      if (event.key !== "Escape") return;
      if (!DESKTOP.matches && toggle.getAttribute("aria-expanded") === "true") {
        setExpanded(false);
        toggle.focus();
      }
    });

    document.addEventListener("focusin", function (event) {
      if (
        !DESKTOP.matches &&
        toggle.getAttribute("aria-expanded") === "true" &&
        !nav.contains(event.target) &&
        event.target !== toggle
      ) {
        setExpanded(false);
      }
    });

    listen(DESKTOP, syncToViewport);
    syncToViewport();
  })();

  /* ------------------------------------------------------------------ *
   * 2. Accessibility preferences
   *
   * Preferences become data-* attributes on <html> and are mirrored to
   * localStorage. The panel is plain radio buttons and checkboxes inside
   * labelled fieldsets, so it works with a keyboard and a screen reader
   * without any custom ARIA widget pattern.
   * ------------------------------------------------------------------ */
  (function initPrefs() {
    var STORAGE_KEY = "iaf-prefs";
    var root = document.documentElement;
    var toggle = document.querySelector(".prefs-toggle");
    var panel = document.getElementById("accessibility-preferences");

    /* Defaults match the attribute-free state of the stylesheet. */
    var DEFAULTS = {
      textsize: "normal",
      spacing: "normal",
      underline: "off",
      contrast: "normal",
      motion: "on"
    };

    function read() {
      try {
        var raw = window.localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
      } catch (e) {
        return {};
      }
    }

    function write(prefs) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
      } catch (e) {
        /* Private browsing or storage disabled: the setting still applies to
           this page view, which is better than not applying at all. */
      }
    }

    function setAttr(name, value, defaultValue) {
      if (!value || value === defaultValue) {
        root.removeAttribute(name);
      } else {
        root.setAttribute(name, value);
      }
    }

    function apply(prefs) {
      setAttr("data-textsize", prefs.textsize, DEFAULTS.textsize);
      setAttr("data-spacing", prefs.spacing, DEFAULTS.spacing);
      setAttr("data-underline", prefs.underline, DEFAULTS.underline);
      setAttr("data-contrast", prefs.contrast, DEFAULTS.contrast);
      setAttr("data-motion", prefs.motion === "off" ? "off" : "", "");
    }

    function current() {
      var stored = read();
      var prefs = {};
      Object.keys(DEFAULTS).forEach(function (key) {
        prefs[key] = stored[key] || DEFAULTS[key];
      });
      return prefs;
    }

    var prefs = current();
    apply(prefs);

    if (!toggle || !panel) return;

    toggle.hidden = false;
    panel.hidden = true;
    toggle.setAttribute("aria-expanded", "false");

    var status = panel.querySelector(".prefs__status");
    var inputs = panel.querySelectorAll("input[data-pref]");
    var resetBtn = panel.querySelector(".prefs__reset");
    var closeBtn = panel.querySelector(".prefs__close");

    function announce(message) {
      if (status) status.textContent = message;
    }

    function syncControls() {
      Array.prototype.forEach.call(inputs, function (input) {
        input.checked = prefs[input.getAttribute("data-pref")] === input.value;
      });
    }

    Array.prototype.forEach.call(inputs, function (input) {
      input.addEventListener("change", function () {
        var key = input.getAttribute("data-pref");
        if (input.type === "checkbox") {
          prefs[key] = input.checked
            ? input.value
            : input.getAttribute("data-off");
        } else {
          prefs[key] = input.value;
        }
        apply(prefs);
        write(prefs);
        announce("Setting saved.");
      });
    });

    if (resetBtn) {
      resetBtn.addEventListener("click", function () {
        Object.keys(DEFAULTS).forEach(function (key) {
          prefs[key] = DEFAULTS[key];
        });
        apply(prefs);
        write(prefs);
        syncControls();
        announce("All display settings reset to their defaults.");
      });
    }

    function setOpen(isOpen) {
      toggle.setAttribute("aria-expanded", String(isOpen));
      panel.hidden = !isOpen;
      if (isOpen) {
        announce("");
        var first = panel.querySelector("input");
        if (first) first.focus();
      }
    }

    toggle.addEventListener("click", function () {
      setOpen(toggle.getAttribute("aria-expanded") !== "true");
    });

    if (closeBtn) {
      closeBtn.addEventListener("click", function () {
        setOpen(false);
        toggle.focus();
      });
    }

    panel.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        setOpen(false);
        toggle.focus();
      }
    });

    syncControls();
  })();

  /* ------------------------------------------------------------------ *
   * 3. Decorative effects
   * ------------------------------------------------------------------ */
  (function initEffects() {
    var header = document.querySelector(".site-header");

    if (header) {
      var onScroll = function () {
        header.classList.toggle("is-scrolled", window.scrollY > 8);
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
    }

    var targets = document.querySelectorAll(".reveal");
    if (!targets.length || !("IntersectionObserver" in window)) return;

    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    function motionIsOff() {
      return (
        reduceMotion.matches ||
        document.documentElement.getAttribute("data-motion") === "off"
      );
    }

    if (motionIsOff()) return;

    document.documentElement.classList.add("js-reveal");

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.04 }
    );

    Array.prototype.forEach.call(targets, function (el) {
      observer.observe(el);
    });

    function disableReveal() {
      if (!motionIsOff()) return;
      observer.disconnect();
      document.documentElement.classList.remove("js-reveal");
      Array.prototype.forEach.call(targets, function (el) {
        el.classList.add("is-visible");
      });
    }

    listen(reduceMotion, disableReveal);

    var motionInput = document.querySelector('input[data-pref="motion"]');
    if (motionInput) motionInput.addEventListener("change", disableReveal);
  })();
})();
