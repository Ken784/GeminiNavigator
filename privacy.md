# Privacy Policy

**Last Updated:** [Date]

## Overview

Gemini Navigator ("we", "our", or "the extension") is committed to protecting your privacy. This privacy policy explains what data we collect, how we use it, and your rights regarding your data.

## Data Collection

### What Data We Collect

The extension collects the following data from the Google Gemini website (`https://gemini.google.com/*`):

1. **Conversation Text Content**: Text content from your conversations with Gemini, specifically:
   - User query text (messages you send to Gemini)
   - Conversation titles
   - Text extracted from conversation elements in the DOM

2. **Page Metadata**: 
   - Page title information
   - DOM structure related to conversations

### How We Collect Data

Data is collected locally in your browser through:
- **DOM Reading**: The extension reads conversation elements directly from the Gemini webpage's DOM structure
- **Title Monitoring**: Monitoring the page title element to detect conversation title changes

## Data Usage

The collected data is used exclusively for the following purposes:

1. **Tab Title Synchronization**: To update your Chrome browser tab title with the current conversation title
2. **Navigation Index Generation**: To create a clickable sidebar index of your conversation items
3. **User Experience Enhancement**: To provide smooth navigation and prevent title rollback issues

## Data Storage

### Current Implementation

Currently, all data processing happens **in real-time** and **in memory only**. The extension:
- Does not permanently store conversation content
- Does not save data to disk or external servers
- Processes data only while you are actively using the Gemini website

### Storage Permission

The extension requests the `storage` permission for potential future enhancements such as:
- Caching conversation metadata for improved performance
- Storing user preferences (e.g., sidebar visibility state)
- Maintaining state consistency across page refreshes

**Note**: As of the current version, the storage API is not actively used. If we implement storage features in the future, we will update this privacy policy accordingly.

## Data Transmission

**We do NOT transmit any data to external servers.**

- All data processing occurs locally in your browser
- No conversation content is sent to third-party servers
- No analytics or tracking data is collected or transmitted
- The extension operates entirely offline after installation

## Data Sharing

**We do NOT share your data with anyone.**

- No third-party services receive your data
- No advertising networks have access to your information
- No data is sold or monetized

## Scope of Access

The extension only operates on:
- **Single Domain**: `https://gemini.google.com/*`
- **No Other Websites**: The extension does not access, read, or modify any other websites you visit

## Your Rights

You have the right to:

1. **Disable the Extension**: You can disable or uninstall the extension at any time through Chrome's extension management page (`chrome://extensions/`)
2. **No Data Retention**: Since we don't permanently store your data, disabling the extension immediately stops all data collection
3. **Transparency**: This privacy policy provides full disclosure of our data practices

## Security

- All data processing happens locally in your browser's secure environment
- The extension uses Chrome's built-in security mechanisms
- No external network connections are made for data transmission

## Changes to This Privacy Policy

We may update this privacy policy from time to time. We will notify users of any material changes by:
- Updating the "Last Updated" date at the top of this policy
- Posting a notice in the extension's release notes (if applicable)

## Contact

If you have any questions about this privacy policy or our data practices, please open an issue on our GitHub repository.

## Compliance

This extension complies with:
- Chrome Web Store Developer Program Policies
- General Data Protection Regulation (GDPR) principles
- California Consumer Privacy Act (CCPA) requirements

---

**Summary**: Gemini Navigator processes your conversation text locally in your browser to provide navigation features. No data leaves your device or is shared with anyone.

