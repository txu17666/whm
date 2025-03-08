const fs = require('fs');
const puppeteer = require('puppeteer');
function formatToISO(date) {
    return date.toISOString().replace('T', ' ').replace('Z', '').replace(/\.\d{3}Z/, '');
}

async function delayTime(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
    const accountsJson = fs.readFileSync('accounts.json', 'utf-8');
    const accounts = JSON.parse(accountsJson);

    for (const account of accounts) {
        const {username, password} = account;

        const browser = await puppeteer.launch({headless: false});  // 打开带UI的浏览器
        const page = await browser.newPage();  // 创建一个新页面

        try {
            await page.goto('https://webhostmost.com/login');  // 访问网址

            const usernameInput = await page.$('#inputEmail');  // 查找输入框
            if (usernameInput) {
                await usernameInput.click({clickCount: 3}); // 选中输入框的内容
                await usernameInput.press('Backspace'); // 删除原来的值
            }
            await page.type('#inputEmail', username);
            await page.type('#inputPassword', password);

            const loginButton = await page.$('#login');
            if (loginButton) {
                await loginButton.click();
            } else {
                throw new Error('无法找到登录按钮');
            }

            // 等待登录成功（如果有跳转页面的话）
            await page.waitForNavigation();
            const logoutLogo = await page.$('#Secondary_Navbar-Account');
            if (logoutLogo) {
                await logoutLogo.click();
            } else {
                throw new Error('无法找到登出logo按钮');
            }
            const delay1 = Math.floor(Math.random() * 8000) + 5000; // 随机延时1秒到8秒之间
            await delayTime(delay1);

            const logoutButton = await page.$('#Secondary_Navbar-Account-Logout');
            if (logoutButton) {
                // 获取当前的UTC时间和北京时间
                await logoutButton.click();
                const nowUtc = formatToISO(new Date());// UTC时间
                console.log(nowUtc);
                const nowBeijing = formatToISO(new Date(new Date().getTime() + 8 * 60 * 60 * 1000)); // 北京时间东8区，用算术来搞
                console.log(nowBeijing);
                console.log(`账号 ${username} 于北京时间 ${nowBeijing}（UTC时间 ${nowUtc}）登录成功！`);
            } else {
                console.error(`账号 ${username} 登录失败，请检查账号和密码是否正确。`);
            }
        } catch (error) {
            console.error(`账号 ${username} 登录时出现错误: ${error}`);
        } finally {
            // 关闭页面和浏览器
            await page.close();
            await browser.close();

            // 用户之间添加随机延时
            const delay2 = Math.floor(Math.random() * 8000) + 1000; // 随机延时1秒到8秒之间
            await delayTime(delay2);
        }
    }

    console.log('所有账号登录完成！');
})();
