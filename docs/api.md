# WidgetHub. YAML specification

Optional keywords are marked with **[ ]**.

| **Key**               | **Type**                              | **Description**                                                                                           |
|-----------------------|---------------------------------------|-----------------------------------------------------------------------------------------------------------|
| **`[plugin_release]`**             | `string`                             | (Optional) The version of the Widgethub plugin required. The minimum required version of the Widgethub plugin, specified using comparison operators. Supported formats include >=1.4, >1.4, 1.4 or =1.4.                                         |
| **`key`**             | `string`                             | A unique identifier for the widget.                                                                      |
| **`name`**            | `string`                             | The name displayed on the button for selecting the widget.                                                |
| **`[order]`**           | `string`                              | (Optional) If present, the name used to sort the widget alphabetically otherwise the `name` property is used      |
| **`category`**        | `string`                             | The category in which the widget appears.                                                                |
| **`[instructions]`**  | `string`                             | (Optional) Detailed explanation of the widget’s purpose and usage.                                       |
| **`[selectors]`**     | `string` or `string[]` |  (Optional) Required if the widget uses bindings. Defines the CSS selector that identifies the widget root. If an array is used, the remaining selectors apply to the descendants of the root element. |
| **`[engine]`**        | `'mustache'` or `'ejs'`                 | (Optional) Defaults to `mustache`. Specifies the template engine used to render the template.             |
| **`template`**        | `string`                             | HTML markup interpolated and rendered in the Tiny Editor. It cannot be used together with filter.                                                | 
| **`filter`**        | `string`                             | The code defining the filter. The global variables are `text` and `editor` refering to the initial HTML content and the Tiny editor API respectively. The filter must return an array of two elements `[result: text / boolean, message: string]`. It cannot be used together with template.                                             |
| **`[unwrap]`**        | `string`                             | (Optional) A query selector for elements to extract from the `selectors` element. Use `'*'` for all.      |
| **`[parameters]`**    | `Parameter[]`                        | (Optional) Defines variables used in the template. It is required if the template uses placeholders.  
| **`[I18n]`**    | `Object`                        | (Optional) Un object of objects that specify the translation of strings into several languages. The key used to identify the current language must be `_lang`.   
| **`[insertquery]`**    | `string`                        | (Optional) It is a css query that identifies the part of the template in which the selected content in the Tiny editor must be inserted.
   | **`[scope]`**    | `string`                        | (Optional) A regular expression to restrict the pages in which the widget is recommended. E.g., setting page-mod-* only the pages with body id that starts with page-mod- will be suitable.
| **`[autocomplete]`**    | `string`                        | The key of a parameter that will be used to create variants in the autocomplete popup. The autocomplete popoup appears when writting @ followed by at least three letters. It will show those widgets whose name matches with the search.
| **`[contextmenu]`**   | `ContextMenu`                        | (Optional) Configures a context menu                                                                   |
| **`[contexttoolbar]`**| `boolean`                            | (Optional) Whether to display a context toolbar instead of a context menu.                               |
| **`[for]`**          | `string`                             | A comma separated list of user **ids** that are allowed to use this widget. If the list starts with `-` then the list represents the users that are not allowed to use the widget.
| **`[forids]`**          | `string`                             | It is an alias of the `for` property.
| **`[forusernames]`**          | `string`                             | A comma separated list of **usernames** that are allowed to use this widget. If the list starts with `-` then the list represents the usernames that are not allowed to use the widget.
| **`[forroles]`**          | `string`                             | A comma separated list of **user roles**, e.g. `editingteacher, student, ...`, which are allowed to use this widget. If the list starts with `-` then the list represents the users roles that are not allowed to use the widget.
| **`[formatch]`**          | `AND` or `OR`                             | Defaults to `AND` and it represents the boolean operation that is applied when multiple for-rules are specified.   
| **`[requires]`**          | `string`                             | The URL of the JavaScript file required for this widget to function. The script will be added to the end of the page in a dedicated JavaScript widget area. This feature requires the selectors property to be defined.
| **`[hidden]`**          | `boolean`                             |   Whether the widget must be shown or not.                                                 
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
| **`[tip]`**       | `string`                             | (Optional) Simply a shortcut for `tooltip`                                               |
**`[partial]`**       | `string`                             | (Optional) A string with double trailing and leading undercore. This variable must be defined into the `partials` widget.        |
| **`value`**           | `any`                                | Default value for the parameter. If he type is 'select', then the value must match one of the options.                                                                        |
| **`[type]`**          | `'textfield' or 'textarea' or 'numeric' or 'select' or 'autocomplete' or 'checkbox' or 'color' or 'repeatable'` | (Optional) In some cases, type can be inferred from `value` or other parameters.                                         |
| **`options`**         | `string[]` or `{l: string, v: string}[]` | Options for `select` type.                                                                |
| **`[min]`**           | `number`                             | (Optional) Minimum value for numeric controls or the minimum number of items in repeatable parameters (defaults to 1).                                                           |
| **`[max]`**           | `number`                             | (Optional) Maximum value for numeric controls or the maximum number of items in repeatable parameters.                                                           |
| **`[bind]`**          | `string` or `{get: () => any, set: (value: any) => void}` | (Optional) Binding configuration for parameter values. In repeatable parameters (since v1.4), you can either use the `item_selector` keyword or the format `{get: () => object[], set: (value: object[]) => void}`.   |
| **`[item_selector]`**      | `string` | (Optional) (Since v1.4) In repeatable parameters, it specifies a **css query** that provides a list of DOM elements mapping the list items.    |
 **`[transform]`**          | `string` | (Optional) Applies a pipe of transform functions to the value obtained from the user form. See below for the list of available transform functions.                         
| **`[when]`**          | `string` | (Optional) A Javascript expression to programatically determine when this control must be shown. The expression can contain the keys of other parameters or the special key `SELECT_MODE` which is set to `selection` when there exists a selection in the Tiny editor and to `insert` otherwise.                          
| **`[hidden]`**          | `boolean` | (Optional) Whether the control is hidden or visible.                            
| **`[editable]`**          | `boolean` | (Optional) Whether the control can be edited or not.                       |
 **`[for]`**          | `string` | (Optional) A comma separated user ids that are allowed to see this parameter control. It defaults to everybody `*`.                          |

---

## Transform functions

- **toUpperCase**: Converts the string to upper case.
- **toLowerCase**: Converts the string to lower case.
- **trim**: Removes leading and trailing spaces.
- **ytId**: Extracts the YouTube id from an URL.
- **vimeoId**: Extracts the vimeo id from an URL.
- **serveGDrive**: It converts the share link of a Google Drive file into an URL that can be download.
- **removeHTML**: Returns only the text content.
- **encodeHTML**: It replaces the symbols &, <, >, etc. by the corresponding HTML entities.
- **escapeQuotes**: Replaces all " instances into '.

Transform functions can be combined into a pipe, e.g. `trim | toUpperCase`, first trims the spaces and then converts the string to upper case.