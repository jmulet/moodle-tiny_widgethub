# Security considerations

Version 1.5.0 of the WidgetHub plugin includes enhanced security measures. However, no web technology is completely risk-free. Users should carefully review the widgets they use and rely on multiple layers of security to mitigate risks associated with untrusted code.

## The `manager` role
Those Moodle roles which have the capability `moodle/widgethub:manage` will be able to create, edit and delete widgets. This flexibility provides powerful functionality but also may introduce security risks. While core widgets are considered safe, widget managers must not blindly trust custom or third-party widgets or arbitrary code.

According to the principle of least privilege, access to the `moodle/widgethub:manage` capability should be restricted to only those users who require it to perform their duties. Avoid using Moodle’s administrator account for routine widget management tasks. While this may seem like common sense, it is important to emphasise it. If a user account were to be compromised, applying the least privilege principle helps minimise potential damage and reduces security risks.

**Where these attacks can be launched from?**

Attacks can be launched from javascript code that is inserted within the widget definition. Tiny WidgetHub plugin sandboxes any user-provided code to mitigate risks, but this is not foolproof. Widget managers must still carefully review all widget definitions.

In particular, you must take into account the potential attack vectors:

- The `requires` property can point to an arbitrary URL with JavaScript code.

- The `filter` property can include arbitrary JavaScript interacting with the editor iframe DOM.

- The `bind` property can include arbitrary JavaScript interacting with the editor iframe DOM.

- The `template` HTML code may contain executable logic depending on the engine used.

You should also audit the `template` HTML code that is included within the widget definition.

- While `ejs` template engine is extremely powerful, it can run arbitrary js code and can be used to inject malicious code. Keep this in mind and ask yourself if you really need this engine.

- In the `mustache` engine, avoid using triple curly braces `{{{ }}}` to render variables, as they output unescaped content by default. Although TinyMCE and Moodle sanitize DOM content on save, it is best practice to avoid inserting unescaped content in the first place. This makes it easier for subsequent security layers to protect your site.

```yml
    engine: 'mustache'
    template: |
       <p>This parameter interpolation {{foo}} is safe.</p>
       <p>However, you should avoid this {{{foo}}} since arbitrary HTML could be injected into the page.</p>    
```


### Recommendations

If you need to include external js code, use the `requires` or `filter` property in the widget definition and point to a trusted origin only.

When defining parameter bindings, always prefer predefined bindings, as they are safer by design. If it is necessary, the `bind` object property should only be used with thoroughly reviewed and trusted code to avoid introducing security vulnerabilities.

Please note taht this code 

```yml
    parameters:
        - name: foo
          title: A parameter
          value: false
          bind: hasClass('foo')
```

is safer than

```yml
    parameters:
        - name: foo
          title: A parameter
          value: false
          bind: 
            getValue: (elem) => elem.classList.contains('foo')
            setValue: (elem, v) => {/* Malicious code could go here */}
```

**Template engine guidelines:**

- Prefer `mustache` over `ejs` whenever possible. Mustache is logic-less and safer by design.

- Use double curly braces `{{ }}` in Mustache to automatically escape content; avoid triple curly braces `{{{ }}}`.

- Use `liquid` engine if simple conditional or looping logic is required. Avoid `ejs` unless advanced dynamic behavior is absolutely necessary.

## The `view` role
Moodle roles with the capability `moodle/widgethub:view` will be able to insert widgets in the editor. In most cases this will be content creators using roles such as `teacher`.

The security risks here are the same mentioned above but in this case the user can only insert widgets, not create or edit them. 

In the process of inserting a widget, the user can provide values for the parameters of the widget. These values can be arbitrary HTML code, which, if not escaped and sanitized properly, can be used to inject malicious code into the page. 

For example, if a widget has a parameter `title` and the user provides the value `<script>alert('XSS')</script>`, the widget will be inserted into the page with the title `<script>alert('XSS')</script>`. When the page is loaded, the script will be executed and the user will see an alert box with the message "XSS". 

To mitigate this risk, the `widgethub` plugin will automatically escape and sanitize all parameter values when inserting the widget into the editor. In addition TinyMCE and Moodle will also sanitize the content when saving it. This helps prevent injection of malicious code through widget parameters. Nevertheless, it is a good practice to teach content creators about the risks of injecting malicious code into the page.


