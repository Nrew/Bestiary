# Security Policy

## Supported Versions

Security fixes are applied to the latest released version and the `main` branch.
Older releases are not supported unless a GitHub release note says otherwise.

## Reporting a Vulnerability

Please report suspected vulnerabilities privately by opening a GitHub security advisory for this repository. If advisories are unavailable, open a minimal issue that states you have a security report without including exploit details.

Useful details include:

- Bestiary version and operating system.
- The affected feature or file type.
- Reproduction steps using non-sensitive sample data.
- Whether local files outside Bestiary's app-data directory are affected.

Do not include private campaign data, real secrets, or full local filesystem paths unless they are essential to the report.

## Security Scope

Bestiary is an offline desktop app. The released app should not require network access or telemetry to function. Reports involving local file handling, import/export, image processing, rich-text sanitization, and Tauri command permissions are in scope.

## Content Security Policy Notes

The application CSP (`tauri.conf.json`) includes `style-src 'self' 'unsafe-inline'`. This is an intentional compatibility exception for inline style attributes emitted by UI and editor primitives in the desktop webview. The exception should stay narrow: scripts remain limited by `script-src 'self'`, fonts by `font-src 'self'`, and image/connect sources by their explicit Tauri asset and IPC directives.

Do not remove or broaden this CSP exception without verifying the affected UI components and rerunning the release checks.
