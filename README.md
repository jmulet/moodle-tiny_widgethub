# WidgetHub

Create, share and use fully customizable widget components in the tiny editor.

# Creating widgets

The following sections will walk through the process of creating new widgets by using the yaml API.
We shall start with a basic example and, progressively, we will continue showing more advanced cases.

## Example 1. A basic example

The basic contents of a yaml file defining a widget are 

````yml
# An unique identifier
key: tut_greeter
name: (Tutorial 1) a simple greeter
category: tutorials
instructions: (Optional) A detail explanation
# (Optional) defaults to 'mustache' although you can also use 'ejs' depending on the type of template used
engine: mustache
# Write your HTML with or without parameters. In mustache, parameters are written within double brakets {{..}}
# Therefore what is a parameter that we must define below
template: |
  <p>Hello {{what}}</p>
parameters:
  - name: what
    title: What to greet?
    value: World!
    # (Optional) further explanation of this parameter
    tooltip: For example, World! or my friend...
    # (Optional) can be edited?
    editable: true
    # (Optional) is hidden?
    hidden: false
author: Your name <your.email@com>
version: 1.0.0 
````

To use it, you have to register this widget into your Moodle instance. Go to administration settings and search 'widget'. The search result will be under the URL /admin/category.php?category=tiny_widgethub

Click on the link <img src="./img/create_new_widget.png" style="height:25px; vertical-align: bottom;">



Paste the yaml code above into the Yaml Editor 

 <img src="./img/widget_new_form.png" style="max-width:400px; vertical-align: bottom;">

and press the button Save changes. You will see the brand new widget registered.

<img src="./img/list_widgets.png" style="max-width:400px; vertical-align: bottom;">

Now open a Moodle activity that uses the tiny editor and click on the WidgetHub button. You should see a dialog with a section named "TUTORIALS" and a widget button within. Click on the (Tutorial 1) button.

<img src="./img/category_buttons_modal.png" style="max-width:300px; vertical-align: bottom;">

Since the widget contains parameters, a second modal dialog appears with a form to modify the template parameters.

<img src="./img/parameters_modal.png" style="max-width:300px; vertical-align: bottom;">

Click on the "Accept" button and you the result will appear in the Tiny editor

<img src="./img/tiny_result1.png" style="max-width:300px; vertical-align: bottom;">

### Example 2. Conditionals in templates

In this example we will create a widget that conditionally sets a bold style to the text passed as parameter

````yml
# An unique identifier
key: tut_conditionals1
name: (Tutorial 2) conditionals in templates
category: tutorials
template: |
  <p{{#useBold}} style="font-weight: bold"{{/useBold}}>{{txt}}</p>
parameters:
  - name: txt
    title: Your text
    value: Lorem ipsum
  - name: useBold
    title: should text be in bold face?
    value: true
author: Your name <your.email@com>
version: 1.0.0 
````

For more information, [this reference](https://www.elated.com/res/File/articles/development/easy-html-templates-with-mustache/sections-conditional.html) explain how to conditionally render parts of the Mustache template.

### Example 3. Select options in templates

What about choosing a class from a list of options? Let's do it!

````yml
# An unique identifier
key: tut_select1
name: (Tutorial 3) list of options
category: tutorials
template: |
  <p><span class="badge bg-{{severity}}">Content</span></p>
parameters:
  - name: severity
    title: Type of badge
    # by default takes the first option
    value: primary
    options:
      - primary
      - success
      - warning
      # You may want to use a custom label and value
      - {l: 'Be careful', v: 'danger'}
author: Your name <your.email@com>
version: 1.0.0 
````

You can show or hide certain parameters in the form depending on the values of other parameters. For that purpose, we use the keyword `when` to tell when the parameter must be rendered.

Assume that we want to decide whether use a badge or not, and if so, choose among one type.

````yml
key: tut_select1
name: (Tutorial 3) list of options
category: tutorials
template: |
  <p><span{{#useBadge}} class="badge bg-{{severity}}"{{/useBadge}}>Content</span></p>
parameters:
  - name: useBadge
    title: Do you want to display a badge?
    value: true
  - name: severity
    title: Type of badge
    value: primary
    # When to render this control?
    when: useBadge === true
    options:
      - primary
      - success
      - warning
      - {l: 'Be careful', v: 'danger'}
author: Your name <your.email@com>
version: 1.1.0 
````

### Example 4. Using loops in the template

Since mustache is a logic free template system, some features are difficult to achieve. To overcome this limitation, we can use [`ejs`](https://ejs.co/) as an alternative template system. As you will see, it provides more flexibility.

Let's assume that we want to create a table of `n` rows and `m` columns. That's the way we do it


````yml
key: tut_loops1
name: (Tutorial 4) loops1
category: tutorials
engine: ejs
template: |
  <p></p>
  <table class="table table-striped">
  <thead>
    <tr>
        <% for(let j=1; j<=m; j++) { %>
            <th> Title {{j}} </th>
        <% } %>
    </tr>
  </thead>
  <tbody>
   <% for(let i=1; i<=n; i++) {%>
    <tr>
        <% for(let j=1; j<=m; j++) { %>
            <td> Item <%= i%> - <%= j%> </td>
        <% } %>
    </tr>
    <% } %>
  <tbody>
  </table>
  <p></p>
parameters:
  - name: n
    title: Number of rows
    value: 5
    min: 1
  - name: m
    title: Number of columns
    value: 3
    min: 1
author: Your name <your.email@com>
version: 1.1.0 
````



You can even use it with cases that you are using other markup than HTML. For instance, image that you want a shortcut to insert a matrix in Mathjax. 

````yml
key: tut_loops2
name: (Tutorial 4) loops2
category: tutorials
engine: ejs
# As you can see we can use the ternary operator in JavaScript
# to simplify an if statement: j===1 ? '' : ' & '
template: |
  <p></p>
  \[A=\(\begin{matrix} 
    <% for(let i=1; i<=n; i++) { %>
        <% for(let j=1; j<=m; j++) { %>
          <%= j===1 ? '' : ' & ' %> 
           a_{<%= i%>,<%= j%>}
        <% } %>  \\
    <% } %>
    \end{matrix}\)\]
  <p></p>
parameters:
  - name: n
    title: Number of rows
    value: 5
    min: 1
  - name: m
    title: Number of columns
    value: 3
    min: 1
author: Your name <your.email@com>
version: 1.1.0 
````

### Example 5. Widgets that require id's

For every id that you need, create a parameter visibility hidden and having the special value $RND to ensure that every instance will have a different id.

````yml
parameters:
  - name: id1
    value: $RND
    hidden: true
````


### Example 6. Introduction to bindings