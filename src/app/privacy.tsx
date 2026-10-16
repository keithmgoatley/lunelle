/** Plain-English privacy page. */
import React from 'react';
import { Card, Label, Screen, T } from '../ui/components';

const SECTIONS: [string, string][] = [
  ['the short version', 'Your cycle data never leaves this phone unless you choose to export it. There are no accounts, no servers, no cloud sync, no analytics, no ads and no tracking. Lunelle makes no network requests of its own.'],
  ['where data lives', 'Everything is stored in a small database inside the app’s private storage on this iPhone.'],
  ['encryption', 'Every entry is encrypted with AES-256-GCM before it’s written. The key is generated randomly on this phone and kept in the iOS Keychain, and is set to never sync to iCloud or leave this device. Someone who copies the database file only sees scrambled data.'],
  ['app lock', 'Turn on app lock in Settings to require Face ID or your passcode whenever Lunelle opens or comes back from the background.'],
  ['reminders', 'Reminders are scheduled by iOS on this phone. Their wording is deliberately discreet, so a lock-screen banner never mentions periods or fertility.'],
  ['export & import', 'You can export a full JSON backup or CSV spreadsheets at any time and import them later. Exported files are not encrypted, so keep them somewhere you trust. You choose where they go through the iOS share sheet.'],
  ['deleting', '“Delete all data” in Settings permanently erases the database and destroys the encryption key. Nothing can be recovered afterwards, by us or anyone else, because we never had a copy.'],
  ['testing in expo go', 'While you test inside Expo Go, the app’s code is loaded from the development server. Your logged data still stays on the phone and is never sent there.'],
  ['health note', 'Predictions are estimates based on what you log. They are not medical advice and must never be used as contraception. If you have severe or unusual symptoms, please see a doctor.'],
];

export default function Privacy() {
  return (
    <Screen padTop={false}>
      {SECTIONS.map(([h, b], i) => (
        <Card key={h} delay={i * 40}>
          <Label>{h}</Label>
          <T size={13}>{b}</T>
        </Card>
      ))}
    </Screen>
  );
}
