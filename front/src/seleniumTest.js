const { Builder, By, Key, until } = require('selenium-webdriver');

(async function example() {
  let driver = await new Builder().forBrowser('chrome').build();
  try {
    // Navigate to the application URL
    await driver.get('http://34.199.154.104:3000/'); // Replace with your app's URL

    // Wait until the login form is displayed
    await driver.wait(until.elementLocated(By.css('.login-container')), 10000);
    console.log('Login form is displayed');

    // Enter username and password
    await driver.findElement(By.css('input[placeholder="Username"]')).sendKeys('admin');
    await driver.findElement(By.css('input[placeholder="Password"]')).sendKeys('password!');
    console.log('Entered username and password');

    // Click the login button
    await driver.findElement(By.css('button')).click();
    console.log('Clicked the login button');

    // Wait for the login to complete and check if the error message is not displayed
    await driver.sleep(1000); // Wait for a second to allow the login process to complete
    let errorMessage = await driver.findElements(By.css('.error'));
    if (errorMessage.length > 0) {
      let errorText = await errorMessage[0].getText();
      console.log('Error message:', errorText);
      throw new Error('Login failed with valid credentials');
    }

    console.log('Login successful with valid credentials');

    // Test invalid login
    await driver.findElement(By.css('input[placeholder="Username"]')).clear();
    await driver.findElement(By.css('input[placeholder="Password"]')).clear();
    await driver.findElement(By.css('input[placeholder="Username"]')).sendKeys('invalidUser');
    await driver.findElement(By.css('input[placeholder="Password"]')).sendKeys('invalidPass');
    await driver.findElement(By.css('button')).click();
    console.log('Clicked the login button with invalid credentials');

    // Wait for the error message to be displayed
    await driver.wait(until.elementLocated(By.css('.error')), 10000);
    let errorText = await driver.findElement(By.css('.error')).getText();
    if (errorText !== 'Invalid username or password') {
      throw new Error(`Expected error message to be 'Invalid username or password' but was '${errorText}'`);
    }

    console.log('Error message displayed for invalid login');

    // Test bypass login
    await driver.findElement(By.css('button:nth-of-type(2)')).click(); // Click the second button (Bypass Login)
    console.log('Clicked the bypass login button');

    // Wait for the login to complete and check if the error message is not displayed
    await driver.sleep(1000); // Wait for a second to allow the login process to complete
    errorMessage = await driver.findElements(By.css('.error'));
    if (errorMessage.length > 0) {
      let errorText = await errorMessage[0].getText();
      console.log('Error message:', errorText);
      throw new Error('Bypass login failed');
    }

    console.log('Bypass login successful');
  } finally {
    // Quit the driver
    await driver.quit();
  }
})();