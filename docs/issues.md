# Known issues and workarounds

## Tiny editor limitations

**Issue:**
Moodle’s Tiny editor automatically strips out certain HTML tags such as `<span>` and `<li>` when they are empty.

**Impact:**
This causes elements like control icons or custom formatting to disappear unexpectedly in your plugin’s UI.

**Workaround:**
To prevent this, insert a non-breaking space (`&nbsp;`) or another HTML entity inside the otherwise-empty tags. This preserves the tags and allows them to render correctly.

```html
<!-- Correct usage -->
<span class="icon">&nbsp;</span>
<li class="item">&nbsp;</li>
```

---


**Issue:** HTML Comments Wrapped in `<p>` Tags in TinyMCE

When inserting a WidgetHub template into TinyMCE that includes HTML comments (e.g. `<!-- Start of Box-Activity -->`), TinyMCE may wrap these comments in `<p>` tags. This only happens to some comments (typically the first one) and not others. Additionally, TinyMCE may insert extra empty `<p>` elements.

```yaml
template: |
  <p><!-- Start of Box-Activity --></p>
  <div class="card">
    <div class="card-body">
      <h4>{{title}}</h4>
      <p>{{description}}</p>
    </div>
  </div>
  <p><!-- End of Box-Activity --></p>
  ```

**Impact:**
- Unwanted `<p>` tags affect layout and spacing.
- Extra whitespace is introduced.
- Code readability is reduced, especially when using source-view plugins.

**Workaround:**
- Avoid using HTML comments inside templates if possible.
- Use `<template>` tags to simulate comments without triggering TinyMCE’s wrapping behavior:

````html
<template data-comment="Start of Box-Activity"></template>
````


## Page scrolls to top when clicking non-editable zones

**Issue:**
When clicking over non-editable areas inside the editor (where the cursor changes to an arrow), the page unexpectedly scrolls back to the top of the document.

**Impact:**
This behavior disrupts the editing workflow, forcing users to manually scroll back to their previous position each time they click outside editable regions.

**Cause:**
The issue is linked to custom CSS rules added via shareCss. In particular, setting html and body elements to height: 100% triggers this problem within the Tiny editor iframe.

**Workaround / Solution:**
Override the conflicting rule by applying the following CSS through iframe's customCss when the related option or checkbox is enabled:

```css
html, body {
 height: initial!important;
}
```

## Image editing inside Tiny editor
**Issue:**
Using the image button within Moodle’s Tiny editor can break the underlying HTML structure of some components.

**Impact:**
Modifying images directly through the Tiny editor interface can get rid of the classes which were originally present in the `<img>` tag.

**Workaround:**
Avoid using the Tiny editor’s image button. Instead:

- Edit image references directly in the HTML code, or

- Use a parameter of type image with its corresponding bindings, as shown in the plugin’s example configuration.

```yml
selectors: "css query to the root of the widget"
parameters: 
  - name: carouselImage
    title: Slide Image
    value: "https://example.com/image.jpg"
    type: image
    bind: attr("src", "img")
```

This will enable a context menu when clicking over the widget and the user will be able to modify the images without breaking the widget.