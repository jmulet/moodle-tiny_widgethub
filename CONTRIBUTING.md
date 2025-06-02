
# Contributing to moodle-tiny_widgethub

Thank you for your interest in contributing to the **moodle-tiny_widgethub** plugin! Your contributions help improve the plugin and expand the variety of widgets available for the Moodle community.

Please review this guide carefully before submitting pull requests or issues.

## 🧩 Contributing to Widgets

To contribute widgets:

Each contributor will host their own widgets in a public repository. This gives you full control over your widgets, including how and when you update them.

Your repository will include an index.yml file listing the widgets you want to share with the community, each pointing to the downloadable URL of its corresponding widget.yml definition. The contributor will simply inform me of the URL of their index.yml file. Below is an example of the content of such a file.
```
- name: Bootstrap alert boxes
  url: https://raw.githubusercontent.com/jmulet/moodle-tiny_widgethub/main/repository/bs-alert.yml
- name: Bootstrap badges
  url: https://raw.githubusercontent.com/jmulet/moodle-tiny_widgethub/main/repository/bs-badge.yml
```
** Make sure that all URL provide access to downloadable raw files.**

This setup is more dynamic than incorporating widgets directly into the main repository, as it avoids the need to create a new release every time a widget is added or updated.

---

## 🔧 Branch Strategy

- **master**: Protected. This branch holds the latest stable, released code. No direct commits or pull requests should target this branch.
- **develop**: All contributions must target this branch. Please base your changes on `develop`.

---

## 🛠️ How to Contribute

### 1. Fork the Repository
Start by [forking the repository](https://github.com/jmulet/moodle-tiny_widgethub/fork) to your GitHub account.

### 2. Clone Your Fork
```bash
git clone https://github.com/jmulet/moodle-tiny_widgethub.git
cd moodle-tiny_widgethub
```

### 3. Create a Feature or Fix Branch
Always branch off from `develop`.

```bash
git checkout develop
git pull origin develop
git checkout -b your-feature-branch
```

### 4. Make Your Changes
Follow Moodle's general [coding style guidelines](https://moodledev.io/general/development/policies/codingstyle) and ensure your changes do not break existing functionality.

---



## ✅ Pull Requests

When ready:

1. Push your changes to your fork.
2. Open a **Pull Request to the `develop` branch** of the main repo.
3. Clearly explain your changes and why they are useful.
4. Reference any related issues (e.g., `Closes #12`).

**Note**: PRs targeting `master` will be automatically closed.

---

## 📦 Plugin Structure

Please do not modify core files like `version.php` unless requested by a maintainer or working on an official release.

---

## 💬 Questions or Issues?

If you encounter a bug or have questions, please:
- Search the [issue tracker](https://github.com/jmulet/moodle-tiny_widgethub/issues).
- If it’s new, [open an issue](https://github.com/jmulet/moodle-tiny_widgethub/issues/new).

---

## 🙏 Thanks

Thanks for helping to improve `moodle-tiny_widgethub`! Contributions, especially new widgets, help grow this project for everyone in the Moodle community.
