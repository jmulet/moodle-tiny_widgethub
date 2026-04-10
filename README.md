# WidgetHub

- Design, use and customize widget components seamlessly within the Tiny Editor.
- Use Bootstrap components easily.

> [!IMPORTANT]
> This plugin needs a Moodle theme based on Boost since some widgets rely on Bootstrap.

> [!WARNING]
> **Backup Recommended**: It is strongly recommended to backup your custom widgets before updating to version 1.5.x to safeguard your data integrity during the migration.

<div class="alert alert-info d-flex align-items-center" role="alert" style="gap: 0.5rem;">
   
  <div>
    <a href="https://chatgpt.com/g/g-694018e49b888191b04b90e7c7a77a59-widgethub-for-tinymce-gpt-beta"
       target="_blank" rel="noopener noreferrer" style="text-decoration: none; font-weight: 500; color: inherit;">
      NEW WidgetHub GPT (Beta):

      🔗 Your AI assistant for building awesome widgets effortlessly.

      Feedback is welcome • Credits: Andreas Giesen
    </a>
  </div>
</div>    

## Features

Users can:

1. Choose a widget.
2. Customize its appearance.
3. Insert it into the Tiny editor.

Later, at any time, the component can be reconfigured using context menus provided by the Tiny editor.

<img src="./img/widgethub_usage.gif" width="400" style="margin:auto;max-width:400px">


### New Grid View

The widget picker now features a **Grid View** mode, offering a more visual and compact way to browse available widgets.

<img src="./img/gridview.png" width="400" style="margin:auto;max-width:400px">

- **Toggle View**: Users can easily switch between the traditional List View and the new Grid View using the toggle button in the modal header.
- **Visual Icons**: In Grid View, widgets are represented by their icons, making it easier to identify them at a glance. Icons are defined in the widget's YAML file through the `icon` property.
- **Persistent Preference**: The selected view mode is saved in the user's local storage, so it remembers your preference for future sessions.
- **Default Configuration**: Administrators can set the default view mode via the `widgetpicker.viewmode` configuration option.



## Learn more

- [Examples: Learn how to customize and create widgets.](docs/examples.md)
- [Yaml API reference.](docs/api.md)
- [Known issues and workarounds.](docs/issues.md)
- [Security architecture and best practices.](docs/security.md)

## Migration from Moodle 4.x to Moodle 5.0

> [!IMPORTANT]
> To ensure Bootstrap components that rely on JavaScript function correctly in both Moodle 4.x and Moodle 5.0, we recommend using both `data-xxx` and `data-bs-xxx` attributes in your widget templates. While this makes the templates slightly more verbose, it eliminates the need for custom JavaScript to handle attribute differences.

For widgets already present on a page, you can automatically add the missing `data-bs-xxx` attributes. Refer to the `oninit.refactor.bs5` configuration option below for details.

## Configuration

Administrators can manage widget definitions by customizing existing ones, creating new ones, or removing unwanted widgets. To access these options, simply type `widget` in the search field of the administrator area.

<div class="alert alert-danger d-flex align-items-center" role="alert" style="gap: 0.5rem;">
  <i class="fa fa-exclamation-triangle fa-2x"></i>
  <div class="alert-content">
    <p><strong>Security Warning:</strong> Core widgets provided with this plugin are reviewed and considered secure. However, this plugin also allows Moodle managers to create and install custom or third-party widgets. This flexibility provides powerful functionality but also introduces potential security risks.</p>
    <p>Always carefully review and validate any third-party or custom widget before using it. Do not grant untrusted users (for example, users with the Student role) permission to insert or manage widgets. If a widget template allows arbitrary HTML input, malicious users could inject harmful code, including Cross-Site Scripting (XSS) attacks, potentially compromising user data and system security.</p>
    <p>For more information read the <a href="docs/security.md">security section</a> in the documentation.</p>
  </div>
</div>

The options available are:

<img src="./img/settings.png" width="400" style="margin:auto;max-width:400px">

- **share_css**: When this checkbox is selected, all styles from the Moodle site will automatically be available within the editor's iFrame. Additional styles can be added via the administration page of your theme.


- **additionalcss**: If you prefer to keep the styles in the editor isolated from Moodle styles, add the desired styles in this textarea to make them available in the editor. URLs within comment blocks will automatically be translated into a CSS `link` tag in the editor iFrame.


- **cfg**: This allows additional configuration using the syntax `property=value`, with one configuration per line:  
  
  - *disable.plugin.pages*: A **comma-separated** list of body IDs where the plugin will not be loaded.  

  - *disable.plugin.pages.regex*: A **regular expression** matching those body IDs where the plugin will not be loaded.  

  - *enable.contextmenu.level*: Enable (`1`) or disable (`0`) context menus used by the plugin.

  - *category.order=misc:a1,deprecated:z1*: Overrides the default alphabetical category ordering. Provide a comma-separated string using the format `categoryName:sortingName`. The `sortingName` is used to determine the sort order among the listed categories. Categories not included in this list will maintain their default alphabetical order.

  - *oninit.refactor.bs5* - Set to `1` to enable or `0` to disable automatic refactoring of Bootstrap 5 `data-bs-xxx` attributes when the editor opens. Default: `0` (disabled).

  - *jsBaseUrl* - If specified, this **base URL** will be prepended to the `requires` property in the widget definition — *unless* `requires` already starts with `http`, in which case the base URL will be ignored. This feature is useful for dynamically changing the location of the JavaScript assets required by the widgets.
  **CAUTION**: You must only include trusted sources from trusted origins (preferably from your own site); otherwise, you may introduce security vulnerabilities.

  - *tiny.iframe.jquery.url* The jQuery version that should be injected into the editor's iFrame. It defaults to your site's version and "none" for Moodle 5.x. If the value is "none", no jQuery will be injected. Please note that Bootstrap 4.x requires jQuery to work properly. Provide your own (on-premises) URL if you want to use a different version. 
 
  - *tiny.iframe.jsbootstrap.url* The version of the JavaScript Bootstrap bundle that should be injected into the editor's iFrame. It defaults to "https://cdn.jsdelivr.net/npm/bootstrap@4.6.2/dist/js/bootstrap.bundle.min.js" for Moodle 4.x and "https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/js/bootstrap.bundle.min.js" for Moodle 5.x. If the value is "none", no Bootstrap JavaScript bundle will be injected. Provide your own (on-premises) URL if you want to use a different version or avoid being tracked by a CDN. Disabling this option makes editing widgets that rely on Bootstrap's JavaScript components more difficult.

  - *tiny.contextmenu.iframes=1* Enable (`1`) or disable (`0`) right clicks on iFrames that trigger context menus. Interaction with iframes, like YouTube videos, can be temporarily enabled by clicking on the iframe while holding Alt/Option key.

  - *widgetpicker.viewmode=grid* Set the default view mode for the widget picker. Can be `grid` or `list`. Default: `grid`.

**Insert Behavior Configuration**
 This section defines the general behavior configuration for all insert mechanisms in the plugin.

**Behavior Modes**
Each insert mechanism can be configured with one of the following modes:

| Mode | Description |
|------|--------------|
| **none** | Disables the insert mechanism entirely. |
| **default** | Inserts widget with default values. |
| **lastused** | Inserts widget using the last used values. |
| **ctrlclick** | Inserts widget with default values normally, and last used values when holding **Ctrl/Cmd** while clicking. |



- Configuration Options

  - **`insert.splitbutton.behavior=lastused`**  
    Controls the behavior of the *Split Button* in the TinyMCE toolbar.  
    **Options:** `none` | `default` | `lastused`

  - **`insert.recentlyused.behavior=lastused`**  
    Controls the behavior of the *Recently Used* badges displayed under the search text field.  
    **Options:** `none` | `default` | `lastused` | `ctrlclick`

  - **`insert.autocomplete.behavior=lastused`**  
    Controls the *Autocompletion* feature behavior.  
    **Options:** `none` | `default` | `lastused`

  - **`insert.autocomplete.symbol=@`**  
    Defines the symbol that triggers the autocompletion menu.  
    This option has no effect if `insert.autocomplete.behavior=none`.

  - **`insert.quickbutton.behavior=ctrlclick`**  
    Controls the behavior of the *Quick Button* (that with a ray icon) next to the main widget button.  
    **Options:** `none` | `default` | `lastused` | `ctrlclick`

The capability 'tiny/widgethub:viewplugin' allows you to set the plugin visibility for any role. Keep in mind that, by default, the Student role is prevented from using the plugin.

 > [!IMPORTANT]
> **Widget Updates**: Starting with version 1.5.0, widget definitions are no longer updated automatically when the plugin is updated. This ensures that any custom modifications or fine-tuning you've made to the widgets are preserved. Administrators must manually update widgets via the management page ("Update widgets" button) if they wish to install newer versions.

<img src="./img/update_widgets.png" width="400" style="margin:auto;max-width:400px">
 
## How to build

### Generate AMD modules

In order to generate the compiled code in `/amd/build` from sources in `/amd/src`, you need to execute the command

```
npx grunt amd
```

### Generate YAML editor dependency

Please refer to the documentation in `libs/codemirror`.


## Thanks

This plugin was originally inspired by the plugin [Snippet](https://moodle.org/plugins/atto_snippet) by Justin Hunt.

A version of this plugin for the Atto editor has been used at [IEDIB](https://iedib.net/) for several years.
The modified version of this plugin, including the extensions and widgets used at IEDIB, is available at the repository [IEDIB/moodle-tiny_ibwidgethub](https://github.com/IEDIB/moodle-tiny_ibwidgethub).


Icons by [Fontawesome 6.4](https://fontawesome.com/icons/file-code?f=classic&s=light).
