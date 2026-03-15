# Security Architecture and Best Practices

WidgetHub is designed with a "defense-in-depth" philosophy. Version 1.5.0 introduces multiple layers of security to ensure that while the plugin provides powerful customization, it maintains the integrity of your Moodle environment.

## Administrative Governance (Manage Capability)

The `tiny_widgethub:manage` capability is a powerful administrative tool that allows designated users to define the behavior and structure of widgets. Like other administrative capabilities in Moodle, this should be assigned to trusted individuals who understand the site's content guidelines.

### Secure Customization Principles

WidgetHub provides a robust sandbox environment for custom logic. To maintain a secure and stable environment, administrators should follow these professional guidelines:

1. **Trusted Resource Loading**: When using the `requires` property to load external libraries, ensure they originate from trusted, high-availability CDNs or your own secure infrastructure.
2. **Standardized Bindings**: Prefer using the built-in, predefined parameter bindings. These are optimized for security and performance. Custom JavaScript bindings should be reserved for unique requirements and reviewed by a technical lead.
3. **Optimized Logic**: The `filter` and `bind` properties allow for precise UI interactions. While the plugin sandboxes these executions, keeping logic simple and focused improves both security and maintainability.

### Choosing the Right Template Engine

WidgetHub supports various template engines to balance flexibility and security:

*   **Mustache (Recommended)**: The industry standard for "logic-less" templates. It is safe by design because it focuses on data display rather than execution.
    *   *Tip*: Always use double curly braces `{{foo}}` to ensure automatic HTML escaping. Use triple braces `{{{foo}}}` only when you explicitly intend to render pre-sanitized HTML.
*   **Liquid**: A safe and flexible engine that supports simple conditional logic and loops without allowing arbitrary code execution.
*   **EJS**: An advanced engine for complex dynamic requirements. Due to its power, it should be used in scenarios where high-level logic is necessary and should be reviewed according to your organization's script development standards.

---

## Editor Integration (View Capability)

For standard content creators (typically those with the `teacher` role), the user experience is streamlined and protected. Users with the `tiny_widgethub:view` capability can interact with widgets but cannot modify their underlying logic or structural definitions.

### Automated Content Protection

WidgetHub prioritizes "Security by Default" for all content creators:

*   **Automatic Sanitization**: All data entered into widget parameters is automatically escaped and sanitized before it is rendered in the editor.
*   **Layered Validation**: In addition to WidgetHub's internal protections, TinyMCE and Moodle's core security layers perform secondary sanitization upon saving. This multi-stage process ensures that even if a user attempts to paste complex or malformed code, the final output remains safe for all users.
*   **Consistent Experience**: By automating these security checks, the plugin allows creators to focus on building engaging content without needing to worry about the underlying technical safety of the markup.

---

## Summary of Recommendations

| Feature | Best Practice |
| :--- | :--- |
| **Capabilities** | Apply the Principle of Least Privilege by assigning management roles only to necessary staff. |
| **Templates** | Default to **Mustache** for standard content for maximum safety. |
| **External JS** | Use the `requires` property only with verified and trusted sources. |
| **User Input** | Trust the automated sanitization, but encourage creators to use clear, standard text for parameters. |
