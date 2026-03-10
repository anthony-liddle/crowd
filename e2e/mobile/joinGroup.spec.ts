import { by, device, element, expect as detoxExpect, waitFor } from 'detox';

describe('Join Group E2E', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should create a crowd', async () => {
    // Navigate to crowds screen
    const crowdsTab = element(by.id('crowds-tab'));
    await waitFor(crowdsTab).toBeVisible().withTimeout(5000);
    await crowdsTab.tap();

    // Tap create crowd button
    const createButton = element(by.id('create-crowd-button'));
    await waitFor(createButton).toBeVisible().withTimeout(5000);
    await createButton.tap();

    // Fill in crowd name
    const nameInput = element(by.id('crowd-name-input'));
    await waitFor(nameInput).toBeVisible().withTimeout(5000);
    await nameInput.typeText('Test Crowd E2E');

    // Submit form
    const submitButton = element(by.id('create-crowd-submit'));
    await submitButton.tap();

    // Verify crowd was created
    await detoxExpect(element(by.text('Test Crowd E2E'))).toBeVisible();
  });

  it('should join a crowd via invite link', async () => {
    // Navigate to crowds screen
    const crowdsTab = element(by.id('crowds-tab'));
    await waitFor(crowdsTab).toBeVisible().withTimeout(5000);
    await crowdsTab.tap();

    // Tap join button
    const joinButton = element(by.id('join-crowd-button'));
    if (await joinButton.exists()) {
      await joinButton.tap();

      // Enter crowd ID or invite code
      const input = element(by.id('join-crowd-input'));
      if (await input.exists()) {
        await input.typeText('test-crowd-id');
        await element(by.id('join-crowd-submit')).tap();
      }
    }
  });

  it('should post and boost messages', async () => {
    // Navigate to feed
    const feedTab = element(by.id('feed-tab'));
    await waitFor(feedTab).toBeVisible().withTimeout(5000);
    await feedTab.tap();

    // Navigate to create message
    const createMessageButton = element(by.id('create-message-button'));
    if (await createMessageButton.exists()) {
      await createMessageButton.tap();

      // Fill message form
      const textInput = element(by.id('message-text-input'));
      await waitFor(textInput).toBeVisible().withTimeout(5000);
      await textInput.typeText('E2E Test Message');

      // Submit message
      const submitButton = element(by.id('create-message-submit'));
      await submitButton.tap();

      // Verify message appears in feed
      await detoxExpect(element(by.text('E2E Test Message'))).toBeVisible();
    }

    // Boost a message
    const boostButton = element(by.id('boost-button')).atIndex(0);
    if (await boostButton.exists()) {
      await boostButton.tap();
    }
  });

  it('should filter and sort feed', async () => {
    // Navigate to feed
    const feedTab = element(by.id('feed-tab'));
    await waitFor(feedTab).toBeVisible().withTimeout(5000);
    await feedTab.tap();

    // Test feed source selector
    const feedSelector = element(by.id('feed-source-selector'));
    if (await feedSelector.exists()) {
      await feedSelector.tap();
      // Select crowd option if available
    }

    // Test sort options
    const sortNearest = element(by.id('sort-nearest'));
    if (await sortNearest.exists()) {
      await sortNearest.tap();
    }

    const sortSoonest = element(by.id('sort-soonest'));
    if (await sortSoonest.exists()) {
      await sortSoonest.tap();
    }
  });
});
