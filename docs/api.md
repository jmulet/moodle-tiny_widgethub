# WidgetHub. YAML File Specification

Optional keywords are marked with **[ ]**.

| **Key**               | **Type**                              | **Description**                                                                                           |
|-----------------------|---------------------------------------|-----------------------------------------------------------------------------------------------------------|
| **`key`**             | `string`                             | A unique identifier for the widget.                                                                      |
| **`name`**            | `string`                             | The name displayed on the button for selecting the widget.                                                |
| **`category`**        | `string`                             | The category in which the widget appears.                                                                |
| **`[instructions]`**  | `string`                             | (Optional) Detailed explanation of the widget’s purpose and usage.                                       |
| **`[selectors]`**     | `string` | `string[]`                  | (Optional) Required if the widget uses bindings. Defines the CSS selector that identifies the widget root.|
| **`[engine]`**        | `'mustache'` | `'ejs'`                 | (Optional) Defaults to `mustache`. Specifies the template engine used to render the template.             |
| **`template`**        | `string`                             | HTML markup interpolated and rendered in the Tiny Editor.                                                 |
| **`[unwrap]`**        | `string`                             | (Optional) A query selector for elements to extract from the `selectors` element. Use `'*'` for all.      |
| **`[parameters]`**    | `Parameter[]`                        | (Optional) Defines variables used in the template. It is required if the template uses placeholders.     |
| **`[contextmenu]`**   | `ContextMenu`                        | (Optional) Configures a context menu                                                                   |
| **`[contexttoolbar]`**| `boolean`                            | (Optional) Whether to display a context toolbar instead of a context menu.                               |
| **`author`**          | `string`                             | Author in the format: `Your Name <your@email.com>`.                                                      |
| **`version`**         | `string`                             | Widget version in `major.minor.revision` format.                                                         |

---

The type ContextMenu is defined by

| **Key**               | **Type**                              | **Description**                                                                                           |
|-----------------------|---------------------------------------|-----------------------------------------------------------------------------------------------------------|
| **`predicate`**     | `string`                             | CSS query for elements triggering the context menu.                                                        |
| **`actions`**       | `array`                              | Actions such as  `moveup`, `movedown`, `moveleft`, `moveright`, `clone`, `delete`                          |

---  

The `selectors` field is mandatory if the widget includes parameters with bindings. This field establishes a relationship between the HTML markup and the corresponding widget. For example, `selectors: a[data-toggle="popover"]` targets all anchor tags with the `data-toggle="popover"` attribute. If an array of selectors is specified, the subsequent conditions are evaluated against the children of the element matched by the first selector. For instance, `selectors: ['a[data-toggle="popover"]', 'i.fas']` matches anchor tags that contain an `i` element with the `fas` class.


The type `Parameter` consists of these fields

| **Key**               | **Type**                              | **Description**                                                                                           |
|------------------------|---------------------------------------|----------------------------------------------------------------------------------------------------------|
| **`name`**           | `string`                              | The name of the parameter used in the template {{name}} or <%= name %>. If the name starts with `_` then it is saved in localStorage and restablished on future usage.                          |
| **`title`**           | `string`                             | A human-readable name for the parameter.                                                                 |
| **`[tooltip]`**       | `string`                             | (Optional) Additional information about the parameter.                                                   |
| **`value`**           | `any`                                | Default value for the parameter.                                                                         |
| **`[type]`**          | `'textfield' or 'textarea' or 'numeric' or 'select' or 'checkbox' or 'color'` | (Optional) Input type inferred from `value` or other parameters.                                         |
| **`options`**         | `string[]` or `{l: string, v: string}[]` | Options for `select` or `checkbox` types.                                                                |
| **`[min]`**           | `number`                             | (Optional) Minimum value for numeric controls.                                                           |
| **`[max]`**           | `number`                             | (Optional) Maximum value for numeric controls.                                                           |
| **`[bind]`**          | `string` | `{get: string, set: string}` | (Optional) Binding configuration for parameter values.                                                   |

---

