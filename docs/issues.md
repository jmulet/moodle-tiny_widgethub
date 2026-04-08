# Troubleshooting and Editorial Guidelines

This document outlines common behaviors observed when using WidgetHub within Moodle's TinyMCE editor and provides technical workarounds to ensure a consistent user experience.

---

## 🏗️ Structural Integrity

### HTML Element Stripping
**Behavior:** TinyMCE automatically removes certain HTML tags (like `<span>` or `<li>`) if they do not contain visible text or children.  
**Impact:** Control icons, badges, or list items used for layout might disappear unexpectedly.

**Recommended Solution:**
Insert a non-breaking space (`&nbsp;`) or a zero-width space inside the element to ensure it is treated as "contentful" by the editor.

```html
<!-- Recommended -->
<span class="icon-placeholder">&nbsp;</span>
<li class="empty-layout-row">&nbsp;</li>
```

### Comment Wrapping in `<p>` Tags
**Behavior:** When a template contains HTML comments (e.g., `<!-- label -->`), TinyMCE may attempt to "correct" the markup by wrapping the comment in a paragraph tag.  
**Impact:** This can introduce unwanted vertical whitespace and disrupt CSS grid or flex layouts.

**Recommended Solution:**
Avoid using standard HTML comments for structural labeling. Instead, use a `<template>` tag with a data attribute, which is ignored by the renderer but visible in the source code.

```html
<!-- Use this instead of <!-- label --> -->
<template data-comment="Widget Boundary Marker"></template>
```

---

## 🎨 Layout and Interaction

### Unexpected Page Scrolling
**Behavior:** Clicking on non-editable zones (non-editable blocks) within a widget may occasionally cause the browser to scroll to the top of the page.  
**Cause:** This typically occurs when global CSS rules (like `height: 100%` on `html` or `body`) conflict with the TinyMCE iframe's internal calculation.

**Recommended Solution:**
Ensure that your widget's custom CSS resets the height for the editor environment.

```css
/* Add this to your widget's CSS if scrolling issues occur */
html, body {
  height: initial !important;
}
```

---

## 🖼️ Media Handling

### Maintaining Image Attributes
**Behavior:** Using the standard TinyMCE "Image" button to modify images inside a widget can sometimes strip away custom CSS classes or data attributes required by your widget's logic.  
**Impact:** The image may lose its styling (e.g., rounded corners, shadows) or break its responsive behavior.

**Recommended Solution:**
Leverage WidgetHub's **Image Parameters**. By defining your `src` as a parameter and using a binding, you allow users to change images via the WidgetHub context menu, which preserves all underlying HTML attributes.

```yaml
# Highly Recommended configuration
selectors: ".my-widget-container"
parameters: 
  - name: widgetImage
    title: "Change Image"
    type: image
    bind: attr("src", "img.main-photo")
```

---

## 💡 Pro-Tips for Widget Developers

1.  **Use Semantic Classes**: Always use specific classes for your widget elements to avoid collisions with Moodle's core styles.
2.  **Define Non-Editable Regions**: If your widget has a complex layout, use the `contenteditable="false"` attribute on structural containers to prevent users from accidentally breaking the HTML. However, be aware of some TinyMCE limitations with non-editable blocks: users may have difficulty placing the cursor immediately before or after the widget, copy/paste behavior may not work as expected inside non-editable areas, and nested `contenteditable="true"` regions within a `contenteditable="false"` container can cause unpredictable behavior in some browsers. Always test thoroughly and consider adding empty `<p><br></p>` elements before and after your widget template to ensure the cursor has a place to land.
3.  **Test in Fullscreen**: Always verify your widget's behavior in the TinyMCE fullscreen mode, as this changes how coordinate-based interactions (like popups) behave.

---

## Chrome related issues with context menus

### Symptom: Disappearing Menus and Unwanted Scrolling
**Behavior:** In Google Chrome, right-clicking on a widget can trigger an unexpected jump in the page scroll. This sudden movement often causes the context menu to lose focus and disappear instantly before any action can be taken.

**Causes:**
The issue is frequently linked to how Chrome handles layout shifts when TinyMCE injects dynamic content (like a context menu) into the DOM. This can conflict with scroll anchoring or fractional scroll calculations, especially in nested iframe scenarios typical of Moodle.

**Technical Workarounds:**

1.  **TinyMCE Fullscreen Mode:**
    Content creators who experience this behavior should switch the editor to **fullscreen mode**. In this mode, the editor handles positioning and scroll offsets differently, often bypassing the coordinate-tracking conflict present in the standard embedded view.

2.  **Chrome Experimental Features (Browser-Level Fix):**
    A more permanent fix can often be achieved by adjusting Chrome's internal scroll management flags.
    - Navigate to `chrome://flags/` in your Chrome browser.
    - Search for **Scroll Anchoring** (`#enable-scroll-anchoring`) or experimental features related to **Scroll Position** or **Layout Stability**.
    - Activating or toggling these flags (e.g., ensuring "Scroll Anchoring" is active or experimenting with "Experimental Web Platform features") can stabilize the viewport when the menu opens, preventing focus loss.

> [!NOTE]
> Since these are browser-level issues that may affect content editors. The final rendered content viewed by students remains unaffected.

