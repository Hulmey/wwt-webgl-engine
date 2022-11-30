import {
    escapeRegExp,
    expectAllNotVisible,
    expectAllPresent,
    expectAllVisible
} from "../utils";

import { ResearchAppPage, ResearchAppSections } from "../page_objects/researchApp";

import {
    EnhancedPageObject,
    NightwatchBrowser,
    NightwatchTests,
} from "nightwatch";

type appTests = NightwatchTests & {
    app: ResearchAppPage;
}

const tests: appTests = {

    // Kinda kludgy, but this makes things work TypeScript-wise
    // We need to do this since the value get initialized in the `before` method
    app: null as unknown as (EnhancedPageObject & ResearchAppPage),

    before: function (browser: NightwatchBrowser): void {
        browser.globals.waitForConditionTimeout = 30000;
        this.app = browser.page.researchApp();
    },

    // Navigate to the page
    // and wait for the app and WWT component to be visible
    'Navigation and loading': function () {
        this.app
            .navigate()
            .waitForReady();
    },

    // Test the initial configuration of the research app
    // This consists of verifying that the appropriate elements
    // are displayed, and that any initial values are correct
    'Initial configuration': function () {
        const app = this.app;
        const sections = app.section as ResearchAppSections;
        const displayPanel = sections.displayPanel;
        const controls = sections.controls;

        app.expect.title().to.equal(app.props.title);
        expectAllPresent(app, [
            "@displayPanel",
            "@controls",
            "@tools",
        ]);

        displayPanel.expect.element("@coordinateDisplay").to.be.present;
        displayPanel.expect.element("@coordinateDisplay").text.to.equal(displayPanel.props.initialCoordinateText);

        const controlItems = [
            "@toolChooser",
            "@zoomIn",
            "@zoomOut",
            "@fullScreen",
        ];
        expectAllPresent(controls, controlItems);
        controls.expect.elements("@controlItem").count.to.equal(controlItems.length);
    },

    // Test the functionality of the background chooser
    'Background selection': async function (browser: NightwatchBrowser) {
        const app = this.app;
        const sections = app.section as ResearchAppSections;
        const controls = sections.controls;
        const tools = sections.tools;

        // Open the tool chooser
        // Verify that the popover and the two buttons display
        controls.click("@toolChooser");
        expectAllPresent(app, [
            "@toolMenu",
            "@backgroundButton",
            "@catalogButton",
        ]);

        // Select the background chooser
        app.click("@backgroundButton");
        expectAllPresent(tools, [
            "@backgroundSelectionContainer",
            "@backgroundSelectionTitle",
        ]);

        // Verify that the label and the initial choice are correct
        tools.expect.element("@backgroundSelectionTitle").text.to.equal("Background imagery:");
        tools.expect.element("@selectedBackgroundText").text.to.equal("DSS");

        // Open the list of options
        // Check that the count is correct
        tools.click("@backgroundSelectionToggle");
        app.expect.element("@toolMenu").to.not.be.visible;
        tools.expect.element("@backgroundDropdown").to.be.present;
        browser.perform(async () => {
            tools.expect.elements("@backgroundDropdownOption").count.to.equal(await app.backgroundCount());
        });

        // Verify that the first catalog in the list has the correct name and description
        const [firstBackgroundOption, firstBackgroundName, firstBackgroundDescription] = [
            "@backgroundDropdownOption",
            "@backgroundDropdownOptionName",
            "@backgroundDropdownOptionDescription"
        ].map(selector => ({ selector: selector, index: 0 }));
        expectAllPresent(tools, [firstBackgroundOption, firstBackgroundName, firstBackgroundDescription]);
        tools.expect.element(firstBackgroundName).text.to.equal(tools.props.firstBackgroundName);
        tools.expect.element(firstBackgroundDescription).text.to.equal(tools.props.firstBackgroundDescription);

    },

    'HiPS catalog selection': function (browser: NightwatchBrowser) {
        const app = this.app;
        const sections = app.section as ResearchAppSections;
        const controls = sections.controls;
        const tools = sections.tools;
        const displayPanel = sections.displayPanel;

        // Open the tool chooser
        // Verify that the popover and the two buttons display
        controls.click("@toolChooser");
        expectAllPresent(app, [
            "@toolMenu",
            "@backgroundButton",
            "@imageryButton",
            "@catalogButton",
            "@loadWtmlButton",
        ]);

        // Select the catalog chooser
        app.click("@catalogButton");
        expectAllPresent(tools, [
            "@catalogSelectionContainer",
            "@catalogSelectionTitle",
        ]);
        tools.expect.element("@catalogSelectionTitle").text.to.equal("Add catalog:");

        // Open the list of options
        // Check that the count is correct
        tools.click("@catalogSelectionToggle");
        app.expect.element("@toolMenu").to.not.be.visible;
        tools.expect.element("@catalogDropdown").to.be.present;
        browser.perform(async () => {
            tools.expect.elements("@catalogDropdownOption").count.to.equal(await app.hipsCount());
        });

        // Open the catalog list
        // Verify that the first option has the correct name
        // Then select it
        const [firstCatalogOption, firstCatalogName] = [
            "@catalogDropdownOption",
            "@catalogDropdownOptionName"
        ].map(selector => ({ selector: selector, index: 0 }));
        expectAllPresent(tools, [firstCatalogOption, firstCatalogName]);
        tools.expect.element(firstCatalogName).text.to.equal(tools.props.firstCatalogName);
        tools.click(firstCatalogOption);

        // Check that the catalog displays in the panel
        // with the correct name
        const firstCatalogTitle = { selector: "@catalogTitle", index: 0 };
        const firstCatalogButtons = [
            "@catalogVisibilityButton",
            "@catalogDeleteButton",
        ].map(selector => ({ selector: selector, index: 0 }));
        displayPanel.expect.elements("@catalogItem").count.to.equal(1);
        expectAllPresent(displayPanel, firstCatalogButtons);
        displayPanel.expect.element(firstCatalogTitle).text.to.match(tools.props.firstCatalogRegex);

        // To start, the visibility and delete button should not be visible
        expectAllNotVisible(displayPanel, firstCatalogButtons);

        // If we click on catalog title, check that the UI container becomes
        // visible. The buttons should appear as well.
        const toClick = firstCatalogTitle;
        const firstCatalogDetail = { selector: "@catalogDetailContainer", index: 0 };
        displayPanel.click(toClick);
        expectAllVisible(displayPanel, firstCatalogButtons.concat([firstCatalogDetail]));

        // If we click it again, check that it goes away
        displayPanel.click(toClick);
        displayPanel.expect.element(firstCatalogDetail).to.not.be.present;

        // Check that the catalog goes away if we click the delete button
        displayPanel.click(firstCatalogButtons[1]);
        displayPanel.expect.elements("@catalogItem").count.to.equal(0);
    },

    'PHAT FITS': function (browser: NightwatchBrowser) {
        const app = this.app;
        const sections = app.section as ResearchAppSections;
        const controls = sections.controls;
        const tools = sections.tools;
        const displayPanel = sections.displayPanel;

        // Load the PHAT WTML file
        controls.click("@toolChooser");
        app.click("@loadWtmlButton");
        tools.updateValue("@wtmlUrlInput", tools.props.phatWtmlUrl);
        tools.sendKeys("@wtmlUrlInput", browser.Keys.ENTER);

        // Wait for the WTML loaded notification to go away
        app.waitForElementPresent("@notification", 3000);
        app.waitForElementNotPresent("@notification", 7000);

        // Check that the appropriate imagery layers now exist
        const phatLayerRegExps = tools.props.phatLayerNames.map((name: string) => new RegExp(`${escapeRegExp(name)}(\\s+)?`));
        controls.click("@toolChooser");
        app.click("@imageryButton");
        tools.click("@imagerySelectionToggle");
        tools.expect.elements("@imageryDropdownOption").count.to.equal(tools.props.phatImageryCount);
        for (let i = 0; i < tools.props.phatImageryCount; i++) {
            tools.expect.element({ selector: "@imageryDropdownOptionName", index: i }).text.to.match(phatLayerRegExps[i]);
        }

        // Select the first PHAT imagery layer
        tools.click({ selector: "@imageryDropdownOption", index: 0 });

        // Check that the layer displays in the panel with the correct name
        displayPanel.expect.elements("@imageryItem").count.to.equal(1);
        displayPanel.expect.element({ selector: "@imageryTitle", index: 0 }).text.to.match(phatLayerRegExps[0]);

        // Initially, none of the icon buttons should be visible
        const buttons = [
            "@imageryGotoButton",
            "@imageryVisibilityButton",
            "@imageryDeleteButton"
        ].map((selector) => ({ selector: selector, index: 0 }));
        expectAllNotVisible(displayPanel, buttons);

        // We should have already moved to the correct position
        displayPanel.expect.element("@coordinateDisplay").text.to.equal(displayPanel.props.phatLayerCoordinates);

        // If we click on the name, the detail container should open
        // Also, the buttons should be visible
        displayPanel.click("@imageryTitle");
        expectAllVisible(displayPanel, buttons);
        displayPanel.expect.element({ selector: "@imageryDetailContainer", index: 0 }).to.be.visible;

        // If we click the title again, the detail container should go away
        displayPanel.click("@imageryTitle");
        displayPanel.expect.element({ selector: "@imageryDetailContainer", index: 0 }).to.not.be.present;

        // If we click the delete button, the layer should be removed from the display panel
        displayPanel.click(buttons[2]);
        displayPanel.expect.elements("@imageryItem").count.to.equal(0);

    },

    after: function (browser: NightwatchBrowser) {
        browser.end();
    }
}

module.exports = tests;
