# DaemonForge Enfusion Script (DF_Enscript)

[![Discord](https://img.shields.io/badge/Submit%20Feedback-7289DA?logo=discord&logoColor=white&label=&style=flat)](https://discord.gg/SkUkPv4)

> **This is a fork of [yuvalino/enscript](https://github.com/yuvalino/enscript).**
> All original credit goes to [yuvalino](https://github.com/yuvalino) for creating the base extension.
> This fork adds expanded diagnostics (type checking, duplicate variable detection, argument validation, etc.) and other improvements maintained by [DaemonForge](https://github.com/DaemonForge).

DaemonForge Enfusion Script is a VSCode extension for DayZ modders that indexes enfusion-script and provides advanced IDE features including syntax highlighting, jump to definition, hover, diagnostics, and more.

## 🔧 Initial setup

The extension works out of the box for the opened project, but additional setup is required to also index the vanilla enscript codebase.

Find your extracted scripts folder (usually `P:\scripts`) and add it to user settings:

![settings](https://raw.githubusercontent.com/DaemonForge/dfenscript/refs/heads/main/media/settings.jpg)

**Important:** Reload the window after saving!

### (YouTube) VSCode Enfusion Script Quickstart Guide
[![VSCode Enfusion Script Quickstart Guide](https://img.youtube.com/vi/uIuiJoe-B30/0.jpg)](https://www.youtube.com/watch?v=uIuiJoe-B30 "VSCode Enfusion Script Quickstart Guide")

## 🧩 Extension

1. **Syntax Highlighting:** Syntax highlighting for EnScript language!

![syntax](https://raw.githubusercontent.com/DaemonForge/dfenscript/refs/heads/main/media/syntax.jpg)

### DayZ `config.cpp` / `mod.cpp` basic highlighting

This extension now includes a separate lightweight language mode for DayZ config-style `config.cpp` and `mod.cpp` files.

- It provides basic highlighting for class blocks, key/value assignments, arrays, strings, numbers, comments, and preprocessor lines.
- It also provides lightweight warnings for common config mistakes (especially AI-generated ones), such as doubled backslashes in paths, mixed slash styles, accidental absolute Windows paths, and suspicious assignment/class declaration forms.
- It is intentionally minimal and isolated from the EnScript language server features.
- It only auto-associates files named `config.cpp` and `mod.cpp`, so regular C++ projects are not affected.

2. **Hover & Jump to Definition:** Indexed symbols have their own hover and may be Ctrl+Click'ed to jump to definition.

![definition.gif](https://raw.githubusercontent.com/DaemonForge/dfenscript/refs/heads/main/media/definition.gif)

3. **Workspace Symbols**: Supports convenient symbol definition search.

![definition.gif](https://raw.githubusercontent.com/DaemonForge/dfenscript/refs/heads/main/media/workspaceSymbols.gif)

4. **Function Chain Resolution:** Full chain resolution across modded classes and included files.

![Function Chain Resolution](https://raw.githubusercontent.com/DaemonForge/dfenscript/refs/heads/main/media/FunctionChainResolutionIncludedModded.gif)

## 🔍 Diagnostics

5. **Type Checking on Functions:** Argument types are validated against function signatures.

![Type Checking on Functions](https://raw.githubusercontent.com/DaemonForge/dfenscript/refs/heads/main/media/TypeCheckingOnFunctions.png)

6. **Type Warnings:** Detects type mismatches in assignments and expressions.

![Type Warnings](https://raw.githubusercontent.com/DaemonForge/dfenscript/refs/heads/main/media/TypeWarnings.png)

7. **Primitive Type Mismatch Errors:** Catches incorrect primitive type usage.

![Primitive Type Mismatch Error](https://raw.githubusercontent.com/DaemonForge/dfenscript/refs/heads/main/media/PrimitiveTypeMismatchError.png)

8. **Unknown Methods:** Flags calls to methods that don't exist on the resolved type.

![Unknown Methods](https://raw.githubusercontent.com/DaemonForge/dfenscript/refs/heads/main/media/UnknownMethods.png)

9. **Casting Warnings:** Warns about unsafe or unnecessary casts.

![Casting Warnings](https://raw.githubusercontent.com/DaemonForge/dfenscript/refs/heads/main/media/CastingWarnings.png)

10. **Missing Override Warning:** Detects methods that override a parent but are missing the `override` keyword.

![Missing Override Warning](https://raw.githubusercontent.com/DaemonForge/dfenscript/refs/heads/main/media/MissingOverrideWarning.png)

11. **Override Without Parent Warning:** Flags `override` on methods that don't actually override anything.

![Override Without Parent Warning](https://raw.githubusercontent.com/DaemonForge/dfenscript/refs/heads/main/media/OverrideWhenOneNotNeededWarning.png)

12. **Ternary Operator Errors:** Catches use of the ternary operator (`? :`), which is not supported in Enforce Script.

![Ternary Operators Error](https://raw.githubusercontent.com/DaemonForge/dfenscript/refs/heads/main/media/TernaryOperatorsError.png)

13. **Cross-Module Errors:** Detects when a type is used from the wrong module level.

![Wrong Module](https://raw.githubusercontent.com/DaemonForge/dfenscript/refs/heads/main/media/WrongModule.png)
