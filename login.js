const fs = require('fs');
const puppeteer = require('puppeteer');
const axios = require('axios');

// 读取 Telegram 机器人信息
const TG_BOT_TOKEN = process.env.TG_BOT_TOKEN;
const TG_USER_ID = process.env.TG_USER_ID;

/**
 * 发送 Telegram 消息
 */
async function sendTelegramMessage(message) {
    if (!TG_BOT_TOKEN || !TG_USER_ID) {
        console.warn('⚠️ 未设置 Telegram 机器人信息，无法发送通知');
        return;
    }

    const url = `https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`;
    try {
        await axios.post(url, {
            chat_id: TG_USER_ID,
            text: message,
            parse_mode: 'Markdown',
        });
        console.log('📢 已发送 Telegram 通知');
    } catch (error) {
        console.error('❌ 发送 Telegram 消息失败:', error.response ? error.response.data : error.message);
    }
}

/**
 * 将时间格式化为 YYYY-MM-DD HH:mm:ss
 */
function formatToISO(date) {
    return date.toISOString().replace('T', ' ').replace('Z', '').replace(/\.\d{3}Z/, '');
}

/**
 * 延迟等待函数
 */
async function delayTime(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 读取并解析 JSON 文件
 */
function loadAccounts() {
    try {
        const accountsJson = fs.readFileSync('accounts.json', 'utf-8').trim();
        if (!accountsJson) throw new Error('accounts.json 文件为空');
        return JSON.parse(accountsJson);
    } catch (error) {
        console.error('❌ 解析 accounts.json 失败:', error.message);
        process.exit(1);
    }
}

(async () => {
    const accounts = loadAccounts();

    for (const account of accounts) {
        const { username, password } = account;

        console.log(`🚀 正在尝试登录账号：${username}`);

        // 启动 Puppeteer
        const browser = await puppeteer.launch({
            headless: false,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });

        const page = await browser.newPage();

        try {
            await page.goto('https://webhostmost.com/login', { waitUntil: 'networkidle2' });

            // 输入用户名
            const usernameInput = await page.$('#inputEmail');
            if (usernameInput) {
                await usernameInput.click({ clickCount: 3 });
                await usernameInput.press('Backspace');
                await page.type('#inputEmail', username);
            } else {
                throw new Error('❌ 无法找到用户名输入框');
            }

            // 输入密码
            await page.type('#inputPassword', password);

            // 点击登录按钮
            const loginButton = await page.$('#login');
            if (loginButton) {
                await loginButton.click();
            } else {
                throw new Error('❌ 无法找到登录按钮');
            }

            // 等待页面跳转
            await page.waitForNavigation({ waitUntil: 'networkidle2' });

            // 检查是否登录成功
            const logoutLogo = await page.$('#Secondary_Navbar-Account');
            if (!logoutLogo) {
                throw new Error('❌ 登录失败，请检查账号和密码是否正确');
            }

            const nowUtc = formatToISO(new Date());
            const nowBeijing = formatToISO(new Date(new Date().getTime() + 8 * 60 * 60 * 1000));
            const successMessage = `✅ *账号 ${username} 登录成功！*\n🕒 北京时间: ${nowBeijing}\n🌎 UTC时间: ${nowUtc}`;
            console.log(successMessage);

            // 发送 Telegram 通知
            await sendTelegramMessage(successMessage);

            // 随机等待 5~13 秒，模拟真人操作
            const delay1 = Math.floor(Math.random() * 8000) + 5000;
            await delayTime(delay1);

            // 退出登录
            await logoutLogo.click();
            const logoutButton = await page.$('#Secondary_Navbar-Account-Logout');
            if (logoutButton) {
                await logoutButton.click();
                console.log(`🔹 账号 ${username} 已成功登出`);
            } else {
                throw new Error('❌ 无法找到登出按钮');
            }
        } catch (error) {
            const errorMessage = `❌ *账号 ${username} 登录失败！*\n🔻 错误信息: ${error.message}`;
            console.error(errorMessage);

            // 发送 Telegram 失败通知
            await sendTelegramMessage(errorMessage);
        } finally {
            await page.close();
            await browser.close();

            // 随机等待 1~8 秒，避免被网站检测
            const delay2 = Math.floor(Math.random() * 8000) + 1000;
            await delayTime(delay2);
        }
    }

    console.log('🎉 所有账号登录完成！');
})();
