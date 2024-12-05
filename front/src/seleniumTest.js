const { Builder, By, Key, until } = require('selenium-webdriver');

(async function example() {
  let driver = await new Builder().forBrowser('chrome').build();
  try {
    // Navigate to the application URL
    await driver.get('http://34.199.154.104:3000/'); 

    

  } finally {
    // Quit the driver
    await driver.quit();
  }
})();